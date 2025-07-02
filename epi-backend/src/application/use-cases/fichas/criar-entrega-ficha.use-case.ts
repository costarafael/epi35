import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IEstoqueRepository } from '../../../domain/interfaces/repositories/estoque-repository.interface';
import { IMovimentacaoRepository } from '../../../domain/interfaces/repositories/movimentacao-repository.interface';
// Removidas importações não utilizadas
import { StatusEstoqueItem, StatusEntrega, StatusEntregaItem } from '../../../domain/enums';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';

export interface CriarEntregaInput {
  fichaEpiId: string;
  quantidade: number;
  itens: {
    numeroSerie?: string;
    // Removidos campos lote e dataFabricacao conforme alinhamento do schema
  }[];
  assinaturaColaborador?: string;
  observacoes?: string;
  usuarioId: string;
}

export interface EntregaOutput {
  id: string;
  fichaEpiId: string;
  colaboradorId: string;
  dataEntrega: Date;
  dataVencimento?: Date;
  assinaturaColaborador?: string;
  observacoes?: string;
  status: StatusEntrega;
  itens: {
    id: string;
    tipoEpiId: string;
    quantidadeEntregue: number;
    numeroSerie?: string;
    estoqueItemOrigemId?: string; // Campo adicionado para rastreabilidade
    lote?: string;
    dataFabricacao?: Date;
    dataLimiteDevolucao?: Date; // Campo renomeado
    status: StatusEntregaItem;
  }[];
  colaborador: {
    nome: string;
    cpf: string;
    matricula?: string;
  };
  tipoEpi: {
    nome: string;
    codigo: string;
    validadeMeses?: number;
    exigeAssinaturaEntrega: boolean;
  };
  almoxarifado: {
    nome: string;
    codigo: string;
  };
}

@Injectable()
export class CriarEntregaFichaUseCase {
  constructor(
    @Inject('IEstoqueRepository')
    private readonly estoqueRepository: IEstoqueRepository,
    @Inject('IMovimentacaoRepository')
    private readonly movimentacaoRepository: IMovimentacaoRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CriarEntregaInput): Promise<EntregaOutput> {
    // Validar dados de entrada
    await this.validarInput(input);

    // Buscar dados da ficha com detalhes
    const fichaComDetalhes = await this.obterFichaComDetalhes(input.fichaEpiId);

    // Validar disponibilidade de estoque
    await this.validarDisponibilidadeEstoque(fichaComDetalhes, input.quantidade);

    // Validar assinatura se obrigatória
    this.validarAssinatura(fichaComDetalhes.tipoEpi, input.assinaturaColaborador);

    // Executar entrega em transação
    return await this.prisma.$transaction(async (tx) => {
      // Criar entrega
      const entrega = await this.criarEntrega(fichaComDetalhes, input, tx);

      // Criar itens de entrega (comum a ambos os fluxos)
      await this.criarItensEntrega(entrega.id, fichaComDetalhes.tipoEpi, input, tx);

      // Movimentar estoque (saída)
      await this.movimentarEstoque(fichaComDetalhes, input, tx);

      // Buscar entrega completa para retorno
      return await this.obterEntregaCompleta(entrega.id, tx);
    });
  }

  async obterEntrega(id: string): Promise<EntregaOutput | null> {
    return await this.obterEntregaCompleta(id);
  }

  async listarEntregasColaborador(
    colaboradorId: string,
    status?: StatusEntrega,
  ): Promise<EntregaOutput[]> {
    const where: any = { colaboradorId };
    if (status) {
      where.status = status;
    }

    const entregas = await this.prisma.entrega.findMany({
      where,
      include: {
        itens: true,
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
          },
        },
        fichaEpi: {
          include: {
            tipoEpi: {
              select: {
                id: true,
                nome: true,
                codigo: true,
                validadeMeses: true,
                exigeAssinaturaEntrega: true,
              },
            },
            almoxarifado: {
              select: {
                nome: true,
                codigo: true,
              },
            },
          },
        },
      },
      orderBy: { dataEntrega: 'desc' },
    });

    return entregas.map(this.mapEntregaToOutput);
  }

  async listarEntregasPorFicha(fichaEpiId: string): Promise<EntregaOutput[]> {
    const entregas = await this.prisma.entrega.findMany({
      where: { fichaEpiId },
      include: {
        itens: true,
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
          },
        },
        fichaEpi: {
          include: {
            tipoEpi: {
              select: {
                id: true,
                nome: true,
                codigo: true,
                validadeMeses: true,
                exigeAssinaturaEntrega: true,
              },
            },
            almoxarifado: {
              select: {
                nome: true,
                codigo: true,
              },
            },
          },
        },
      },
      orderBy: { dataEntrega: 'desc' },
    });

    return entregas.map(this.mapEntregaToOutput);
  }

  async obterPosseAtual(colaboradorId: string): Promise<{
    tipoEpiId: string;
    tipoEpiNome: string;
    tipoEpiCodigo: string;
    quantidadePosse: number;
    dataUltimaEntrega: Date;
    dataVencimento?: Date;
    diasUso: number;
    status: 'ATIVO' | 'VENCIDO' | 'PROXIMO_VENCIMENTO';
    itensAtivos: {
      itemId: string;
      numeroSerie?: string;
      lote?: string;
      dataEntrega: Date;
      dataVencimento?: Date;
    }[];
  }[]> {
    const itensAtivos = await this.prisma.entregaItem.findMany({
      where: {
        entrega: { colaboradorId },
        status: 'ENTREGUE',
      },
      include: {
        entrega: {
          select: {
            id: true,
            dataEntrega: true,
            dataVencimento: true,
          },
        },
        tipoEpi: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            diasAvisoVencimento: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Agrupar por tipo de EPI
    const posseAgrupada = new Map();

    for (const item of itensAtivos) {
      const tipoEpiId = item.tipoEpiId;
      
      if (!posseAgrupada.has(tipoEpiId)) {
        posseAgrupada.set(tipoEpiId, {
          tipoEpiId,
          tipoEpiNome: item.tipoEpi.nome,
          tipoEpiCodigo: item.tipoEpi.codigo,
          quantidadePosse: 0,
          dataUltimaEntrega: new Date(0),
          dataVencimento: null,
          itensAtivos: [],
        });
      }

      const grupo = posseAgrupada.get(tipoEpiId);
      grupo.quantidadePosse++;
      
      if (item.entrega.dataEntrega > grupo.dataUltimaEntrega) {
        grupo.dataUltimaEntrega = item.entrega.dataEntrega;
        grupo.dataVencimento = item.dataVencimento || item.entrega.dataVencimento;
      }

      grupo.itensAtivos.push({
        itemId: item.id,
        numeroSerie: item.numeroSerie,
        lote: item.lote,
        dataEntrega: item.entrega.dataEntrega,
        dataVencimento: item.dataVencimento,
      });
    }

    // Calcular status e dias de uso
    const hoje = new Date();
    const resultado = Array.from(posseAgrupada.values()).map(grupo => {
      const diasUso = Math.floor(
        (hoje.getTime() - grupo.dataUltimaEntrega.getTime()) / (1000 * 60 * 60 * 24),
      );

      let status: 'ATIVO' | 'VENCIDO' | 'PROXIMO_VENCIMENTO' = 'ATIVO';

      if (grupo.dataVencimento) {
        if (hoje > grupo.dataVencimento) {
          status = 'VENCIDO';
        } else {
          const diasParaVencimento = Math.floor(
            (grupo.dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
          );
          
          // Usar dias de aviso do tipo EPI (30 por padrão)
          const diasAviso = 30;
          if (diasParaVencimento <= diasAviso) {
            status = 'PROXIMO_VENCIMENTO';
          }
        }
      }

      return {
        ...grupo,
        diasUso,
        status,
      };
    });

    return resultado;
  }

  async validarEntregaPermitida(
    fichaEpiId: string,
    quantidade: number,
  ): Promise<{
    permitida: boolean;
    motivo?: string;
    fichaAtiva: boolean;
    estoqueDisponivel: number;
    posseAtual: number;
  }> {
    const fichaComDetalhes = await this.obterFichaComDetalhes(fichaEpiId);

    // Verificar se ficha está ativa
    if (fichaComDetalhes.status !== 'ATIVA') {
      return {
        permitida: false,
        motivo: `Ficha está ${fichaComDetalhes.status.toLowerCase()}`,
        fichaAtiva: false,
        estoqueDisponivel: 0,
        posseAtual: 0,
      };
    }

    // Verificar estoque disponível
    const estoqueDisponivel = await this.estoqueRepository.verificarDisponibilidade(
      fichaComDetalhes.almoxarifadoId,
      fichaComDetalhes.tipoEpiId,
      quantidade,
    );

    const saldoEstoque = await this.obterSaldoEstoque(
      fichaComDetalhes.almoxarifadoId,
      fichaComDetalhes.tipoEpiId,
    );

    // Verificar posse atual
    const posseAtual = await this.obterQuantidadePosseAtual(
      fichaComDetalhes.colaboradorId,
      fichaComDetalhes.tipoEpiId,
    );

    if (!estoqueDisponivel) {
      return {
        permitida: false,
        motivo: `Estoque insuficiente. Disponível: ${saldoEstoque}`,
        fichaAtiva: true,
        estoqueDisponivel: saldoEstoque,
        posseAtual,
      };
    }

    return {
      permitida: true,
      fichaAtiva: true,
      estoqueDisponivel: saldoEstoque,
      posseAtual,
    };
  }

  private async validarInput(input: CriarEntregaInput): Promise<void> {
    if (!input.fichaEpiId) {
      throw new BusinessError('Ficha de EPI é obrigatória');
    }

    if (!input.quantidade || input.quantidade <= 0) {
      throw new BusinessError('Quantidade deve ser positiva');
    }

    if (!input.usuarioId) {
      throw new BusinessError('Usuário é obrigatório');
    }

    // Validar que a quantidade de itens corresponde à quantidade
    if (input.itens.length !== input.quantidade) {
      throw new BusinessError(
        `Número de itens (${input.itens.length}) deve corresponder à quantidade (${input.quantidade})`,
      );
    }
  }

  private async obterFichaComDetalhes(fichaEpiId: string): Promise<any> {
    const ficha = await this.prisma.fichaEPI.findUnique({
      where: { id: fichaEpiId },
      include: {
        colaborador: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            matricula: true,
            ativo: true,
          },
        },
        tipoEpi: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            validadeMeses: true,
            diasAvisoVencimento: true,
            exigeAssinaturaEntrega: true,
            ativo: true,
          },
        },
        almoxarifado: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            ativo: true,
          },
        },
      },
    });

    if (!ficha) {
      throw new NotFoundError('Ficha de EPI', fichaEpiId);
    }

    if (ficha.status !== 'ATIVA') {
      throw new BusinessError(`Ficha está ${ficha.status.toLowerCase()}`);
    }

    if (!ficha.colaborador.ativo) {
      throw new BusinessError('Colaborador está inativo');
    }

    if (!ficha.tipoEpi.ativo) {
      throw new BusinessError('Tipo de EPI está inativo');
    }

    if (!ficha.almoxarifado.ativo) {
      throw new BusinessError('Almoxarifado está inativo');
    }

    return ficha;
  }

  private async validarDisponibilidadeEstoque(ficha: any, quantidade: number): Promise<void> {
    const disponibilidade = await this.estoqueRepository.verificarDisponibilidade(
      ficha.almoxarifadoId,
      ficha.tipoEpiId,
      quantidade,
    );

    if (!disponibilidade) {
      const saldo = await this.obterSaldoEstoque(ficha.almoxarifadoId, ficha.tipoEpiId);
      throw new BusinessError(
        `Estoque insuficiente. Solicitado: ${quantidade}, Disponível: ${saldo}`,
      );
    }
  }

  private validarAssinatura(tipoEpi: any, assinatura?: string): void {
    if (tipoEpi.exigeAssinaturaEntrega && !assinatura) {
      throw new BusinessError('Assinatura do colaborador é obrigatória para este tipo de EPI');
    }
  }

  private async criarEntrega(ficha: any, input: CriarEntregaInput, tx: any): Promise<any> {
    // Calcular data de vencimento
    let dataVencimento: Date | null = null;
    if (ficha.tipoEpi.validadeMeses) {
      dataVencimento = new Date();
      dataVencimento.setMonth(dataVencimento.getMonth() + ficha.tipoEpi.validadeMeses);
    }

    return await tx.entrega.create({
      data: {
        fichaEpiId: input.fichaEpiId,
        colaboradorId: ficha.colaboradorId,
        dataEntrega: new Date(),
        dataVencimento,
        assinaturaColaborador: input.assinaturaColaborador,
        observacoes: input.observacoes,
        status: 'ATIVA',
      },
    });
  }

  private async criarItensEntrega(
    entregaId: string,
    tipoEpi: any,
    input: CriarEntregaInput,
    tx: any,
  ): Promise<any[]> {
    const itens = [];

    for (const itemInput of input.itens) {
      // Calcular data de devolução sugerida com base no diasAvisoVencimento
      let dataLimiteDevolucao: Date | null = null;
      
      if (tipoEpi.diasAvisoVencimento) {
        dataLimiteDevolucao = new Date();
        dataLimiteDevolucao.setDate(dataLimiteDevolucao.getDate() + tipoEpi.diasAvisoVencimento);
      }

      const item = await tx.entregaItem.create({
        data: {
          entregaId,
          tipoEpiId: tipoEpi.id,
          quantidadeEntregue: 1, // Sempre 1 para rastreabilidade unitária
          numeroSerie: itemInput.numeroSerie,
          estoqueItemOrigemId: itemInput.estoqueItemOrigemId, // Campo adicionado para rastreabilidade
          dataLimiteDevolucao,
          status: 'COM_COLABORADOR', // Corrigido para o novo valor do enum
        },
      });

      itens.push(item);
    }

    return itens;
  }

  private async movimentarEstoque(ficha: any, input: CriarEntregaInput, tx: any): Promise<void> {
    // Obter saldo anterior
    const saldoAnterior = await this.movimentacaoRepository.obterUltimaSaldo(
      ficha.almoxarifadoId,
      ficha.tipoEpiId,
    );

    // Criar movimentação de saída
    await tx.movimentacaoEstoque.create({
      data: {
        almoxarifadoId: ficha.almoxarifadoId,
        tipoEpiId: ficha.tipoEpiId,
        tipoMovimentacao: 'SAIDA',
        quantidade: input.quantidade,
        saldoAnterior,
        saldoPosterior: saldoAnterior - input.quantidade,
        usuarioId: input.usuarioId,
        observacoes: `Entrega para ${ficha.colaborador.nome} (${ficha.colaborador.matricula || ficha.colaborador.cpf})`,
      },
    });

    // Atualizar estoque
    await tx.estoqueItem.update({
      where: {
        almoxarifadoId_tipoEpiId_status: {
          almoxarifadoId: ficha.almoxarifadoId,
          tipoEpiId: ficha.tipoEpiId,
          status: 'DISPONIVEL',
        },
      },
      data: {
        quantidade: { decrement: input.quantidade },
      },
    });
  }

  private async obterEntregaCompleta(entregaId: string, tx?: any): Promise<EntregaOutput> {
    const prismaClient = tx || this.prisma;

    const entrega = await prismaClient.entrega.findUnique({
      where: { id: entregaId },
      include: {
        itens: true,
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
          },
        },
        fichaEpi: {
          include: {
            tipoEpi: {
              select: {
                id: true,
                nome: true,
                codigo: true,
                validadeMeses: true,
                exigeAssinaturaEntrega: true,
              },
            },
            almoxarifado: {
              select: {
                nome: true,
                codigo: true,
              },
            },
          },
        },
      },
    });

    if (!entrega) {
      throw new NotFoundError('Entrega', entregaId);
    }

    return this.mapEntregaToOutput(entrega);
  }

  private async obterSaldoEstoque(almoxarifadoId: string, tipoEpiId: string): Promise<number> {
    const estoque = await this.estoqueRepository.findByAlmoxarifadoAndTipo(
      almoxarifadoId,
      tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
    );

    return estoque?.quantidade || 0;
  }

  private async obterQuantidadePosseAtual(
    colaboradorId: string,
    tipoEpiId: string,
  ): Promise<number> {
    const result = await this.prisma.entregaItem.count({
      where: {
        tipoEpiId,
        entrega: { colaboradorId },
        status: 'ENTREGUE',
      },
    });

    return result;
  }

  private mapEntregaToOutput(entrega: any): EntregaOutput {
    return {
      id: entrega.id,
      fichaEpiId: entrega.fichaEpiId,
      colaboradorId: entrega.colaboradorId,
      dataEntrega: entrega.dataEntrega,
      dataVencimento: entrega.dataVencimento,
      assinaturaColaborador: entrega.assinaturaColaborador,
      observacoes: entrega.observacoes,
      status: entrega.status as StatusEntrega,
      itens: entrega.itens.map((item: any) => ({
        id: item.id,
        tipoEpiId: item.tipoEpiId,
        quantidadeEntregue: item.quantidadeEntregue,
        numeroSerie: item.numeroSerie,
        estoqueItemOrigemId: item.estoqueItemOrigemId, // Campo adicionado para rastreabilidade
        lote: item.lote,
        dataFabricacao: item.dataFabricacao,
        dataLimiteDevolucao: item.dataLimiteDevolucao, // Campo renomeado
        status: item.status as StatusEntregaItem,
      })),
      colaborador: {
        nome: entrega.colaborador.nome,
        cpf: entrega.colaborador.cpf,
        matricula: entrega.colaborador.matricula,
      },
      tipoEpi: {
        nome: entrega.fichaEpi.tipoEpi.nome,
        codigo: entrega.fichaEpi.tipoEpi.codigo,
        validadeMeses: entrega.fichaEpi.tipoEpi.validadeMeses,
        exigeAssinaturaEntrega: entrega.fichaEpi.tipoEpi.exigeAssinaturaEntrega,
      },
      almoxarifado: {
        nome: entrega.fichaEpi.almoxarifado.nome,
        codigo: entrega.fichaEpi.almoxarifado.codigo,
      },
    };
  }
}