import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IEstoqueRepository } from '../../../domain/interfaces/repositories/estoque-repository.interface';
import { IMovimentacaoRepository } from '../../../domain/interfaces/repositories/movimentacao-repository.interface';
import { ConfiguracaoService } from '../../../domain/services/configuracao.service';
import { StatusEstoqueItem, StatusEntrega, StatusEntregaItem } from '../../../domain/enums';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';
import { ESTOQUE, DATES } from '../../../shared/constants/system.constants';
// ✅ OTIMIZAÇÃO: Import tipos do Zod (Single Source of Truth)
import { CriarEntregaInput, EntregaOutput } from '../../../presentation/dto/schemas/ficha-epi.schemas';
// ✅ OTIMIZAÇÃO: Import mapper para reduzir código duplicado
import { mapEntregaToOutput } from '../../../infrastructure/mapping/entrega.mapper';

/**
 * UC-FICHA-03: Criar Entrega na Ficha de EPI
 * 
 * Implementa rastreabilidade unitária criando 1 registro de movimento por unidade física.
 * Cada item de EPI é rastreado individualmente desde o estoque até o colaborador.
 * 
 * Regras de Negócio:
 * - Validação agregada de estoque por estoqueItem
 * - Criação unitária de movimentações (1 movimentação = 1 item físico)
 * - Atualização automática de saldos de estoque
 * - Transação atômica garantindo consistência
 * 
 * @example
 * ```typescript
 * const entrega = await useCase.execute({
 *   fichaEpiId: "123",
 *   quantidade: 2,
 *   itens: [
 *     { estoqueItemOrigemId: "stock-1" },
 *     { estoqueItemOrigemId: "stock-1" }
 *   ],
 *   usuarioId: "user-123"
 * });
 * ```
 */

// ✅ OTIMIZAÇÃO: Interfaces removidas - usando tipos do Zod (Single Source of Truth)
// CriarEntregaInput e EntregaOutput agora vêm de ../../../presentation/dto/schemas/ficha-epi.schemas

@Injectable()
export class CriarEntregaFichaUseCase {
  constructor(
    @Inject('IEstoqueRepository')
    private readonly estoqueRepository: IEstoqueRepository,
    @Inject('IMovimentacaoRepository')
    private readonly movimentacaoRepository: IMovimentacaoRepository,
    private readonly prisma: PrismaService,
    private readonly configuracaoService: ConfiguracaoService,
  ) {}

  /**
   * Executa a criação de uma entrega de EPIs para um colaborador.
   * 
   * @param input - Dados da entrega incluindo fichaEpiId, quantidade e itens específicos
   * @returns Entrega criada com dados completos incluindo rastreabilidade
   * @throws {BusinessError} Quando ficha inativa, estoque insuficiente ou validação falha
   * @throws {NotFoundError} Quando ficha ou item de estoque não encontrado
   */
  async execute(input: CriarEntregaInput): Promise<EntregaOutput> {
    // Validar dados de entrada
    await this.validarInput(input);

    // Buscar dados da ficha com detalhes
    const fichaComDetalhes = await this.obterFichaComDetalhes(input.fichaEpiId);

    // Validar disponibilidade de estoque
    await this.validarDisponibilidadeEstoque(fichaComDetalhes, input.quantidade, input);

    // Validar assinatura se obrigatória
    this.validarAssinatura(input.assinaturaColaborador);

    // Executar entrega em transação
    return await this.prisma.$transaction(async (tx) => {
      // Criar entrega
      const entrega = await this.criarEntrega(fichaComDetalhes, input, tx);

      // Criar itens de entrega (comum a ambos os fluxos)
      await this.criarItensEntrega(entrega.id, input, tx);

      // Movimentar estoque (saída)
      await this.movimentarEstoque(fichaComDetalhes, input, entrega.id, tx);

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
    const where: any = { 
      fichaEpi: { colaboradorId: colaboradorId }
    };
    if (status) {
      where.status = status;
    }

    const entregas = await this.prisma.entrega.findMany({
      where,
      include: {
        itens: true,
        responsavel: {
          select: {
            nome: true,
            email: true,
          },
        },
        almoxarifado: {
          select: {
            nome: true,
          },
        },
        fichaEpi: {
          select: {
            id: true,
            colaboradorId: true,
          },
        },
      },
      orderBy: { dataEntrega: 'desc' },
    });

    return entregas.map(mapEntregaToOutput);
  }

  async listarEntregasPorFicha(fichaEpiId: string): Promise<EntregaOutput[]> {
    const entregas = await this.prisma.entrega.findMany({
      where: { fichaEpiId },
      include: {
        itens: true,
        fichaEpi: {
          select: {
            id: true,
            colaboradorId: true,
          },
        },
      },
      orderBy: { dataEntrega: 'desc' },
    });

    return entregas.map(mapEntregaToOutput);
  }

  async obterPosseAtual(colaboradorId: string): Promise<{
    tipoEpiId: string;
    tipoEpiNome: string;
    tipoEpiCodigo: string;
    quantidadePosse: number;
    dataUltimaEntrega: Date;
      diasUso: number;
    status: 'ATIVO' | 'VENCIDO' | 'PROXIMO_VENCIMENTO';
    itensAtivos: {
      itemId: string;
      numeroSerie?: string;
      lote?: string;
      dataEntrega: Date;
        }[];
  }[]> {
    const itensAtivos = await this.prisma.entregaItem.findMany({
      where: {
        entrega: { 
          fichaEpi: { colaboradorId: colaboradorId }
        },
        status: StatusEntregaItem.COM_COLABORADOR,
      },
      include: {
        entrega: {
          select: {
            id: true,
            dataEntrega: true,
          },
        },
        estoqueItem: {
          include: {
            tipoEpi: {
              select: {
                id: true,
                nomeEquipamento: true,
                numeroCa: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Agrupar por tipo de EPI
    const posseAgrupada = new Map();

    for (const item of itensAtivos) {
      const tipoEpiId = item.estoqueItem.tipoEpi.id;
      
      if (!posseAgrupada.has(tipoEpiId)) {
        posseAgrupada.set(tipoEpiId, {
          tipoEpiId,
          tipoEpiNome: item.estoqueItem.tipoEpi.nomeEquipamento,
          tipoEpiCodigo: item.estoqueItem.tipoEpi.numeroCa,
          quantidadePosse: 0,
          dataUltimaEntrega: new Date(0),
          itensAtivos: [],
        });
      }

      const grupo = posseAgrupada.get(tipoEpiId);
      grupo.quantidadePosse++;
      
      if (item.entrega.dataEntrega > grupo.dataUltimaEntrega) {
        grupo.dataUltimaEntrega = item.entrega.dataEntrega;
      }

      grupo.itensAtivos.push({
        itemId: item.id,
        dataEntrega: item.entrega.dataEntrega,
        dataLimiteDevolucao: item.dataLimiteDevolucao,
      });
    }

    // Calcular status e dias de uso para análise de vida útil
    const hoje = new Date();
    const resultado = Array.from(posseAgrupada.values()).map(grupo => {
      const diasUso = Math.floor(
        (hoje.getTime() - grupo.dataUltimaEntrega.getTime()) / DATES.MILLISECONDS_PER_DAY,
      );

      // Status sempre ATIVO para itens COM_COLABORADOR
      const status: 'ATIVO' = 'ATIVO';

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
    _quantidade: number,
  ): Promise<{
    permitida: boolean;
    motivo?: string;
    fichaAtiva: boolean;
    estoqueDisponivel: number;
    posseAtual: number;
  }> {
    const fichaComDetalhes = await this.obterFichaComDetalhes(fichaEpiId, false);

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

    // Schema v3.5: Buscar estoque total disponível para validação geral
    const estoqueItens = await this.prisma.estoqueItem.findMany({
      where: { status: 'DISPONIVEL' },
      select: { quantidade: true },
    });
    
    const estoqueDisponivel = estoqueItens.reduce((total, item) => total + item.quantidade, 0);
    const posseAtual = await this.obterQuantidadePosseAtual(fichaComDetalhes.colaboradorId);

    if (estoqueDisponivel <= 0) {
      return {
        permitida: false,
        motivo: `Estoque insuficiente. Disponível: ${estoqueDisponivel}`,
        fichaAtiva: true,
        estoqueDisponivel,
        posseAtual,
      };
    }

    return {
      permitida: true,
      fichaAtiva: true,
      estoqueDisponivel,
      posseAtual,
    };
  }

  private async validarInput(_input: CriarEntregaInput): Promise<void> {
    // ✅ OTIMIZAÇÃO: Validações básicas removidas - já validadas pelo Zod schema
    // fichaEpiId obrigatório: validado por IdSchema
    // quantidade positiva: validado por z.number().int().positive()
    // usuarioId obrigatório: validado por IdSchema
    // rastreabilidade unitária: validado por .refine((data) => data.itens.length === data.quantidade)
    
    // Apenas validações de negócio específicas que não podem ser feitas no Zod permanecem aqui
  }

  private async obterFichaComDetalhes(fichaEpiId: string, validarStatus = true): Promise<any> {
    const ficha = await this.prisma.fichaEPI.findUnique({
      where: { id: fichaEpiId },
      include: {
        colaborador: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!ficha) {
      throw new NotFoundError('Ficha de EPI', fichaEpiId);
    }

    if (validarStatus && ficha.status !== 'ATIVA') {
      throw new BusinessError(`Ficha está ${ficha.status.toLowerCase()}`);
    }

    return ficha;
  }

  private async validarDisponibilidadeEstoque(ficha: any, quantidade: number, input?: CriarEntregaInput): Promise<void> {
    // Validação básica de quantidade positiva
    if (quantidade <= 0) {
      throw new BusinessError('Quantidade deve ser positiva');
    }

    // Se input for fornecido, validar estoque específico agregado
    if (input) {
      // Agrupar itens por estoqueItem para validar quantidade total
      const estoqueAgrupado = new Map<string, number>();
      
      for (const itemInput of input.itens) {
        const estoqueItemId = itemInput.estoqueItemOrigemId;
        estoqueAgrupado.set(estoqueItemId, (estoqueAgrupado.get(estoqueItemId) || 0) + 1);
      }

      // Validar cada estoqueItem
      for (const [estoqueItemId, quantidadeSolicitada] of estoqueAgrupado) {
        const estoqueItem = await this.prisma.estoqueItem.findUnique({
          where: { id: estoqueItemId },
          select: { quantidade: true, tipoEpi: { select: { nomeEquipamento: true } } },
        });

        if (!estoqueItem) {
          throw new BusinessError(`EstoqueItem ${estoqueItemId} não encontrado`);
        }

        // Verificar se há estoque suficiente para a quantidade agregada
        if (estoqueItem.quantidade < quantidadeSolicitada) {
          const permitirEstoqueNegativo = await this.configuracaoService.permitirEstoqueNegativo();
          
          if (!permitirEstoqueNegativo) {
            throw new BusinessError(
              `Estoque insuficiente para ${estoqueItem.tipoEpi?.nomeEquipamento}. ` +
              `Disponível: ${estoqueItem.quantidade}, Solicitado: ${quantidadeSolicitada}`
            );
          }
        }
      }
    } else {
      // Validação geral quando input não for fornecido
      const permitirEstoqueNegativo = await this.configuracaoService.permitirEstoqueNegativo();
      
      if (!permitirEstoqueNegativo) {
        console.log('✅ Validação de estoque negativo: configuração verificada');
      }
    }
  }

  private validarAssinatura(_assinatura?: string): void {
    // Schema v3.5: Campo exigeAssinaturaEntrega removido do TipoEPI
    // Assinatura agora é controlada por configuração global do sistema
    // Entregas iniciam como PENDENTE_ASSINATURA e devem ser assinadas posteriormente
  }

  private async criarEntrega(ficha: any, input: CriarEntregaInput, tx: any): Promise<any> {
    // Schema v3.5: Buscar almoxarifado do primeiro item para relacionamento obrigatório
    const estoqueItem = await tx.estoqueItem.findUnique({
      where: { id: input.itens[0].estoqueItemOrigemId },
      select: { almoxarifadoId: true },
    });

    if (!estoqueItem) {
      throw new BusinessError(`EstoqueItem ${input.itens[0].estoqueItemOrigemId} não encontrado`);
    }

    return await tx.entrega.create({
      data: {
        fichaEpiId: input.fichaEpiId,
        almoxarifadoId: estoqueItem.almoxarifadoId, // Schema v3.5: Campo obrigatório
        responsavelId: input.usuarioId, // Schema v3.5: Campo obrigatório 
        status: 'PENDENTE_ASSINATURA', // Status inicial para posterior assinatura
        // Schema v3.5: Removidos colaboradorId, dataVencimento, assinaturaColaborador, observacoes
      },
    });
  }

  private async criarItensEntrega(
    entregaId: string,
    input: CriarEntregaInput,
    tx: any,
  ): Promise<any[]> {
    const itens = [];

    // IMPLEMENTAÇÃO CRÍTICA: Iterar sobre a quantidade e criar registros unitários
    // Conforme especificação: "Para cada item dessa lista, o sistema **deve iterar sobre a**
    // `quantidade` **e criar um registro individual e unitário na tabela** `entrega_itens`"
    for (const itemInput of input.itens) {
      // Buscar dados do estoque para calcular data limite devolução
      const estoqueItem = await tx.estoqueItem.findUnique({
        where: { id: itemInput.estoqueItemOrigemId },
        include: {
          tipoEpi: {
            select: {
              vidaUtilDias: true, // Campo correto no schema v3.5
            },
          },
        },
      });

      if (!estoqueItem) {
        throw new BusinessError(`EstoqueItem ${itemInput.estoqueItemOrigemId} não encontrado`);
      }

      // Calcular data de devolução com base na vida útil (vidaUtilDias)
      let dataLimiteDevolucao: Date | null = null;
      if (estoqueItem.tipoEpi.vidaUtilDias) {
        dataLimiteDevolucao = new Date();
        dataLimiteDevolucao.setDate(dataLimiteDevolucao.getDate() + estoqueItem.tipoEpi.vidaUtilDias);
      }

      // ITERAÇÃO UNITÁRIA: Criar um registro para cada item individual
      // Como cada item no array input.itens já representa uma unidade, criamos 1 registro por item
      const item = await tx.entregaItem.create({
        data: {
          entregaId,
          estoqueItemOrigemId: itemInput.estoqueItemOrigemId, // Campo correto no schema v3.5
          quantidadeEntregue: ESTOQUE.QUANTIDADE_UNITARIA, // Sempre 1 para rastreabilidade unitária
          dataLimiteDevolucao,
          status: 'COM_COLABORADOR', // StatusEntregaItem.COM_COLABORADOR
          // Campos removidos do schema v3.5: numeroSerie, lote, dataFabricacao
        },
      });

      itens.push(item);
    }

    return itens;
  }

  private async movimentarEstoque(ficha: any, input: CriarEntregaInput, entregaId: string, tx: any): Promise<void> {
    // ✅ OTIMIZAÇÃO: Batch operations para eliminar N+1 queries
    
    // 1. Validar todos os estoqueItems em uma única query
    const estoqueItemIds = [...new Set(input.itens.map(i => i.estoqueItemOrigemId))];
    
    const existingStockItems = await tx.estoqueItem.findMany({
      where: { id: { in: estoqueItemIds } },
      select: { id: true },
    });

    // Validar que todos os estoqueItems existem
    const existingIds = new Set(existingStockItems.map(item => item.id));
    const missingIds = estoqueItemIds.filter(id => !existingIds.has(id));
    
    if (missingIds.length > 0) {
      throw new BusinessError(`EstoqueItems não encontrados: ${missingIds.join(', ')}`);
    }

    // 2. Preparar dados para batch insert de movimentações (mantendo rastreabilidade unitária)
    const movimentacoesData = input.itens.map(itemInput => ({
      estoqueItemId: itemInput.estoqueItemOrigemId,
      tipoMovimentacao: 'SAIDA_ENTREGA',
      quantidadeMovida: ESTOQUE.QUANTIDADE_UNITARIA, // ✅ SEMPRE 1 - rastreabilidade unitária preservada
      responsavelId: input.usuarioId,
      entregaId: entregaId,
    }));

    // 3. Criar todas as movimentações em batch
    await tx.movimentacaoEstoque.createMany({
      data: movimentacoesData,
    });

    // 4. Agrupar quantidades para updates de estoque agregados
    const estoqueAgrupado = new Map<string, number>();
    for (const itemInput of input.itens) {
      const currentCount = estoqueAgrupado.get(itemInput.estoqueItemOrigemId) || 0;
      estoqueAgrupado.set(itemInput.estoqueItemOrigemId, currentCount + 1);
    }
    
    // 5. Atualizar estoque de forma agregada (mantendo performance)
    const updatePromises = Array.from(estoqueAgrupado.entries()).map(([estoqueItemId, quantidade]) =>
      tx.estoqueItem.update({
        where: { id: estoqueItemId },
        data: { quantidade: { decrement: quantidade } },
      })
    );

    await Promise.all(updatePromises);
  }

  private async obterEntregaCompleta(entregaId: string, tx?: any): Promise<EntregaOutput> {
    const prismaClient = tx || this.prisma;

    const entrega = await prismaClient.entrega.findUnique({
      where: { id: entregaId },
      include: {
        itens: {
          include: {
            estoqueItem: {
              include: {
                tipoEpi: {
                  select: {
                    id: true,
                    nomeEquipamento: true,
                    numeroCa: true,
                    vidaUtilDias: true,
                  },
                },
              },
            },
          },
        },
        fichaEpi: {
          include: {
            colaborador: {
              select: {
                id: true,
                nome: true,
                cpf: true,
                matricula: true,
              },
            },
          },
        },
        almoxarifado: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!entrega) {
      throw new NotFoundError('Entrega', entregaId);
    }

    return mapEntregaToOutput(entrega);
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
  ): Promise<number> {
    const result = await this.prisma.entregaItem.count({
      where: {
        entrega: { 
          fichaEpi: { colaboradorId: colaboradorId } 
        },
        status: StatusEntregaItem.COM_COLABORADOR,
      },
    });

    return result;
  }

  // ✅ OTIMIZAÇÃO: Mapeamento removido - usando mapper centralizado
  // mapEntregaToOutput agora vem de ../../../infrastructure/mapping/entrega.mapper
}