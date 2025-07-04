import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TipoMovimentacao } from '@domain/enums';

export interface RelatorioDescartesInput {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  contratadaId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  responsavelId?: string;
}

export interface ItemDescarteOutput {
  id: string;
  dataDescarte: Date;
  almoxarifado: {
    id: string;
    nome: string;
    unidadeNegocio: {
      nome: string;
      codigo: string;
    };
  };
  tipoEpi: {
    id: string;
    nomeEquipamento: string;
    numeroCa: string;
    vidaUtilDias: number;
  };
  quantidadeDescartada: number;
  responsavel: {
    id: string;
    nome: string;
    email: string;
  };
  notaDescarte?: {
    id: string;
    numeroDocumento: string;
    observacoes?: string;
  };
  motivoDescarte?: string;
  valorUnitario?: number;
  valorTotalDescartado?: number;
}

export interface RelatorioDescartesOutput {
  itens: ItemDescarteOutput[];
  resumo: {
    totalItensDescartados: number;
    quantidadeTotalDescartada: number;
    valorTotalDescartado: number;
    descartesPorAlmoxarifado: Array<{
      almoxarifadoNome: string;
      quantidadeDescartada: number;
      valorDescartado: number;
    }>;
    descartesPorTipoEpi: Array<{
      tipoEpiNome: string;
      quantidadeDescartada: number;
      valorDescartado: number;
    }>;
    descartesPorPeriodo: Array<{
      mes: string;
      quantidadeDescartada: number;
      valorDescartado: number;
    }>;
  };
  dataGeracao: Date;
}

@Injectable()
export class RelatorioDescartesUseCase {
  constructor(
    private readonly prismaService: PrismaService,
  ) {}

  async execute(input: RelatorioDescartesInput = {}): Promise<RelatorioDescartesOutput> {
    const whereClause: any = {
      tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
    };

    // Filtros por data
    if (input.dataInicio || input.dataFim) {
      whereClause.dataMovimentacao = {};
      if (input.dataInicio) {
        whereClause.dataMovimentacao.gte = input.dataInicio;
      }
      if (input.dataFim) {
        whereClause.dataMovimentacao.lte = input.dataFim;
      }
    }

    // Filtro por responsável
    if (input.responsavelId) {
      whereClause.responsavelId = input.responsavelId;
    }

    // Filtros via relacionamentos
    if (input.almoxarifadoId) {
      whereClause.estoqueItem = {
        almoxarifadoId: input.almoxarifadoId,
      };
    }

    if (input.tipoEpiId) {
      whereClause.estoqueItem = {
        ...whereClause.estoqueItem,
        tipoEpiId: input.tipoEpiId,
      };
    }

    // Filtro por contratada (via movimentações relacionadas a colaboradores)
    if (input.contratadaId) {
      // Para descartes, não há relacionamento direto com colaboradores
      // Este filtro pode ser útil para descartes de EPIs devolvidos por colaboradores de uma contratada específica
      // Implementação pode ser adicionada futuramente se necessário
    }

    const movimentacoes = await this.prismaService.movimentacaoEstoque.findMany({
      where: whereClause,
      include: {
        estoqueItem: {
          include: {
            almoxarifado: {
              include: {
                unidadeNegocio: {
                  select: {
                    nome: true,
                    codigo: true,
                  },
                },
              },
            },
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
        responsavel: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        notaMovimentacao: {
          select: {
            id: true,
            numeroDocumento: true,
            observacoes: true,
          },
        },
      },
      orderBy: {
        dataMovimentacao: 'desc',
      },
    });

    const itens: ItemDescarteOutput[] = movimentacoes.map(mov => ({
      id: mov.id,
      dataDescarte: mov.dataMovimentacao,
      almoxarifado: {
        id: mov.estoqueItem.almoxarifado.id,
        nome: mov.estoqueItem.almoxarifado.nome,
        unidadeNegocio: {
          nome: mov.estoqueItem.almoxarifado.unidadeNegocio.nome,
          codigo: mov.estoqueItem.almoxarifado.unidadeNegocio.codigo,
        },
      },
      tipoEpi: mov.estoqueItem.tipoEpi,
      quantidadeDescartada: mov.quantidadeMovida,
      responsavel: mov.responsavel,
      notaDescarte: mov.notaMovimentacao ? {
        id: mov.notaMovimentacao.id,
        numeroDocumento: mov.notaMovimentacao.numeroDocumento,
        observacoes: mov.notaMovimentacao.observacoes || undefined,
      } : undefined,
      motivoDescarte: mov.notaMovimentacao?.observacoes || undefined,
      valorUnitario: mov.estoqueItem.custoUnitario ? Number(mov.estoqueItem.custoUnitario) : undefined,
      valorTotalDescartado: mov.estoqueItem.custoUnitario 
        ? mov.quantidadeMovida * Number(mov.estoqueItem.custoUnitario)
        : undefined,
    }));

    // Calcular resumo
    const resumo = await this.calcularResumo(movimentacoes);

    return {
      itens,
      resumo,
      dataGeracao: new Date(),
    };
  }

  private async calcularResumo(movimentacoes: any[]): Promise<RelatorioDescartesOutput['resumo']> {
    const totalItensDescartados = movimentacoes.length;
    const quantidadeTotalDescartada = movimentacoes.reduce((acc, mov) => acc + mov.quantidadeMovida, 0);
    
    let valorTotalDescartado = 0;
    const descartesPorAlmoxarifado = new Map<string, { quantidadeDescartada: number; valorDescartado: number }>();
    const descartesPorTipoEpi = new Map<string, { quantidadeDescartada: number; valorDescartado: number }>();
    const descartesPorPeriodo = new Map<string, { quantidadeDescartada: number; valorDescartado: number }>();

    movimentacoes.forEach(mov => {
      const valorItem = mov.estoqueItem.custoUnitario ? mov.quantidadeMovida * Number(mov.estoqueItem.custoUnitario) : 0;
      valorTotalDescartado += valorItem;

      // Por almoxarifado
      const almoxarifadoNome = mov.estoqueItem.almoxarifado.nome;
      if (!descartesPorAlmoxarifado.has(almoxarifadoNome)) {
        descartesPorAlmoxarifado.set(almoxarifadoNome, { quantidadeDescartada: 0, valorDescartado: 0 });
      }
      const dadosAlmoxarifado = descartesPorAlmoxarifado.get(almoxarifadoNome)!;
      dadosAlmoxarifado.quantidadeDescartada += mov.quantidadeMovida;
      dadosAlmoxarifado.valorDescartado += valorItem;

      // Por tipo de EPI
      const tipoEpiNome = mov.estoqueItem.tipoEpi.nomeEquipamento;
      if (!descartesPorTipoEpi.has(tipoEpiNome)) {
        descartesPorTipoEpi.set(tipoEpiNome, { quantidadeDescartada: 0, valorDescartado: 0 });
      }
      const dadosTipoEpi = descartesPorTipoEpi.get(tipoEpiNome)!;
      dadosTipoEpi.quantidadeDescartada += mov.quantidadeMovida;
      dadosTipoEpi.valorDescartado += valorItem;

      // Por período (mês/ano)
      const dataDescarte = new Date(mov.dataMovimentacao);
      const mesAno = `${dataDescarte.getFullYear()}-${String(dataDescarte.getMonth() + 1).padStart(2, '0')}`;
      if (!descartesPorPeriodo.has(mesAno)) {
        descartesPorPeriodo.set(mesAno, { quantidadeDescartada: 0, valorDescartado: 0 });
      }
      const dadosPeriodo = descartesPorPeriodo.get(mesAno)!;
      dadosPeriodo.quantidadeDescartada += mov.quantidadeMovida;
      dadosPeriodo.valorDescartado += valorItem;
    });

    return {
      totalItensDescartados,
      quantidadeTotalDescartada,
      valorTotalDescartado,
      descartesPorAlmoxarifado: Array.from(descartesPorAlmoxarifado.entries()).map(([almoxarifadoNome, dados]) => ({
        almoxarifadoNome,
        ...dados,
      })),
      descartesPorTipoEpi: Array.from(descartesPorTipoEpi.entries()).map(([tipoEpiNome, dados]) => ({
        tipoEpiNome,
        ...dados,
      })),
      descartesPorPeriodo: Array.from(descartesPorPeriodo.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mes, dados]) => ({
          mes,
          ...dados,
        })),
    };
  }

  async obterEstatisticasDescarte(): Promise<{
    totalDescartes: number;
    valorTotalDescartado: number;
    mediaMensalDescartes: number;
    tipoEpiMaisDescartado: { nome: string; quantidade: number } | null;
    almoxarifadoComMaisDescartes: { nome: string; quantidade: number } | null;
    ultimosDescartes: Array<{
      dataDescarte: Date;
      tipoEpiNome: string;
      quantidade: number;
      almoxarifadoNome: string;
    }>;
  }> {
    // Últimos 30 dias para estatísticas
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    const descartes = await this.prismaService.movimentacaoEstoque.findMany({
      where: {
        tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
        dataMovimentacao: {
          gte: dataLimite,
        },
      },
      include: {
        estoqueItem: {
          include: {
            tipoEpi: {
              select: {
                nomeEquipamento: true,
              },
            },
            almoxarifado: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataMovimentacao: 'desc',
      },
    });

    const totalDescartes = descartes.length;
    const valorTotalDescartado = descartes.reduce((acc, desc) => {
      const valor = desc.estoqueItem.custoUnitario ? desc.quantidadeMovida * Number(desc.estoqueItem.custoUnitario) : 0;
      return acc + valor;
    }, 0);

    const mediaMensalDescartes = totalDescartes; // Já está considerando 30 dias

    // Tipo EPI mais descartado
    const tipoEpiContadores = new Map<string, number>();
    descartes.forEach(desc => {
      const nome = desc.estoqueItem.tipoEpi.nomeEquipamento;
      tipoEpiContadores.set(nome, (tipoEpiContadores.get(nome) || 0) + desc.quantidadeMovida);
    });
    const tipoEpiMaisDescartado = Array.from(tipoEpiContadores.entries())
      .sort((a, b) => b[1] - a[1])[0] || null;

    // Almoxarifado com mais descartes
    const almoxarifadoContadores = new Map<string, number>();
    descartes.forEach(desc => {
      const nome = desc.estoqueItem.almoxarifado.nome;
      almoxarifadoContadores.set(nome, (almoxarifadoContadores.get(nome) || 0) + desc.quantidadeMovida);
    });
    const almoxarifadoComMaisDescartes = Array.from(almoxarifadoContadores.entries())
      .sort((a, b) => b[1] - a[1])[0] || null;

    // Últimos descartes
    const ultimosDescartes = descartes.slice(0, 10).map(desc => ({
      dataDescarte: desc.dataMovimentacao,
      tipoEpiNome: desc.estoqueItem.tipoEpi.nomeEquipamento,
      quantidade: desc.quantidadeMovida,
      almoxarifadoNome: desc.estoqueItem.almoxarifado.nome,
    }));

    return {
      totalDescartes,
      valorTotalDescartado,
      mediaMensalDescartes,
      tipoEpiMaisDescartado: tipoEpiMaisDescartado ? { nome: tipoEpiMaisDescartado[0], quantidade: tipoEpiMaisDescartado[1] } : null,
      almoxarifadoComMaisDescartes: almoxarifadoComMaisDescartes ? { nome: almoxarifadoComMaisDescartes[0], quantidade: almoxarifadoComMaisDescartes[1] } : null,
      ultimosDescartes,
    };
  }
}