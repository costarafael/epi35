import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RelatorioEpisDevolvidosDescartadosInput {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  responsavelId?: string;
  dataInicioDevolucao?: Date;
  dataFimDevolucao?: Date;
  dataInicioDescarte?: Date;
  dataFimDescarte?: Date;
  maxDiasEntreOperacoes?: number; // Máximo de dias entre devolução e descarte
  incluirSemDescarte?: boolean; // Incluir devoluções que ainda não foram descartadas
  limit?: number;
  offset?: number;
}

export interface RelatorioEpisDevolvidosDescartadosOutput {
  estoqueItemId: string;
  tipoEpi: {
    id: string;
    nomeEquipamento: string;
    numeroCa: string;
    vidaUtilDias: number;
  };
  almoxarifado: {
    id: string;
    nome: string;
  };
  devolucao: {
    id: string;
    dataMovimentacao: Date;
    quantidadeDevolvida: number;
    responsavel: {
      id: string;
      nome: string;
      email: string;
    };
  };
  descarte?: {
    id: string;
    dataMovimentacao: Date;
    quantidadeDescartada: number;
    responsavel: {
      id: string;
      nome: string;
      email: string;
    };
    motivoDescarte?: string;
  };
  diasEntreDevolucaoDescarte?: number;
  statusAtual: 'DESCARTADO' | 'AGUARDANDO_DESCARTE' | 'EM_ANALISE';
  valorEstimadoPerdas?: number;
}

@Injectable()
export class RelatorioEpisDevolvidosDescartadosUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: RelatorioEpisDevolvidosDescartadosInput = {}): Promise<RelatorioEpisDevolvidosDescartadosOutput[]> {
    const whereClauseDevolucao: any = {
      tipoMovimentacao: 'ENTRADA_DEVOLUCAO',
    };

    if (input.almoxarifadoId) {
      whereClauseDevolucao.estoqueItem = {
        almoxarifadoId: input.almoxarifadoId,
      };
    }

    if (input.tipoEpiId) {
      whereClauseDevolucao.estoqueItem = {
        ...whereClauseDevolucao.estoqueItem,
        tipoEpiId: input.tipoEpiId,
      };
    }

    if (input.responsavelId) {
      whereClauseDevolucao.responsavelId = input.responsavelId;
    }

    if (input.dataInicioDevolucao || input.dataFimDevolucao) {
      whereClauseDevolucao.dataMovimentacao = {};
      if (input.dataInicioDevolucao) {
        whereClauseDevolucao.dataMovimentacao.gte = input.dataInicioDevolucao;
      }
      if (input.dataFimDevolucao) {
        whereClauseDevolucao.dataMovimentacao.lte = input.dataFimDevolucao;
      }
    }

    // Buscar todas as devoluções
    const devolucoes = await this.prismaService.movimentacaoEstoque.findMany({
      where: whereClauseDevolucao,
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
            almoxarifado: {
              select: {
                id: true,
                nome: true,
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
      },
      orderBy: {
        dataMovimentacao: 'desc',
      },
    });

    const resultado: RelatorioEpisDevolvidosDescartadosOutput[] = [];

    for (const devolucao of devolucoes) {
      // Buscar descartes posteriores do mesmo item
      const whereClauseDescarte: any = {
        estoqueItemId: devolucao.estoqueItemId,
        tipoMovimentacao: 'SAIDA_DESCARTE',
        dataMovimentacao: {
          gte: devolucao.dataMovimentacao,
        },
      };

      if (input.dataInicioDescarte || input.dataFimDescarte) {
        if (input.dataInicioDescarte && input.dataInicioDescarte > devolucao.dataMovimentacao) {
          whereClauseDescarte.dataMovimentacao.gte = input.dataInicioDescarte;
        }
        if (input.dataFimDescarte) {
          whereClauseDescarte.dataMovimentacao.lte = input.dataFimDescarte;
        }
      }

      const descartes = await this.prismaService.movimentacaoEstoque.findMany({
        where: whereClauseDescarte,
        include: {
          responsavel: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
          notaMovimentacao: {
            select: {
              observacoes: true,
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'asc',
        },
      });

      // Se há descartes, criar correlações
      if (descartes.length > 0) {
        for (const descarte of descartes) {
          const diasEntre = Math.floor(
            (descarte.dataMovimentacao.getTime() - devolucao.dataMovimentacao.getTime()) / 
            (1000 * 60 * 60 * 24)
          );

          // Filtrar por máximo de dias se especificado
          if (input.maxDiasEntreOperacoes && diasEntre > input.maxDiasEntreOperacoes) {
            continue;
          }

          resultado.push({
            estoqueItemId: devolucao.estoqueItemId,
            tipoEpi: devolucao.estoqueItem.tipoEpi,
            almoxarifado: devolucao.estoqueItem.almoxarifado,
            devolucao: {
              id: devolucao.id,
              dataMovimentacao: devolucao.dataMovimentacao,
              quantidadeDevolvida: devolucao.quantidadeMovida,
              responsavel: devolucao.responsavel,
            },
            descarte: {
              id: descarte.id,
              dataMovimentacao: descarte.dataMovimentacao,
              quantidadeDescartada: descarte.quantidadeMovida,
              responsavel: descarte.responsavel,
              motivoDescarte: descarte.notaMovimentacao?.observacoes || undefined,
            },
            diasEntreDevolucaoDescarte: diasEntre,
            statusAtual: 'DESCARTADO',
            valorEstimadoPerdas: devolucao.estoqueItem.valorUnitario 
              ? descarte.quantidadeMovida * devolucao.estoqueItem.valorUnitario 
              : undefined,
          });
        }
      } else if (input.incluirSemDescarte) {
        // Incluir devoluções sem descarte posterior
        const statusAtual = await this.determinarStatusAtual(devolucao.estoqueItemId);
        
        resultado.push({
          estoqueItemId: devolucao.estoqueItemId,
          tipoEpi: devolucao.estoqueItem.tipoEpi,
          almoxarifado: devolucao.estoqueItem.almoxarifado,
          devolucao: {
            id: devolucao.id,
            dataMovimentacao: devolucao.dataMovimentacao,
            quantidadeDevolvida: devolucao.quantidadeMovida,
            responsavel: devolucao.responsavel,
          },
          descarte: undefined,
          diasEntreDevolucaoDescarte: undefined,
          statusAtual,
          valorEstimadoPerdas: undefined,
        });
      }
    }

    // Aplicar paginação
    if (input.limit || input.offset) {
      const start = input.offset || 0;
      const end = input.limit ? start + input.limit : undefined;
      return resultado.slice(start, end);
    }

    return resultado;
  }

  private async determinarStatusAtual(estoqueItemId: string): Promise<'AGUARDANDO_DESCARTE' | 'EM_ANALISE'> {
    const estoqueItem = await this.prismaService.estoqueItem.findUnique({
      where: { id: estoqueItemId },
      select: { status: true },
    });

    return estoqueItem?.status === 'AGUARDANDO_INSPECAO' || estoqueItem?.status === 'QUARENTENA' 
      ? 'EM_ANALISE' 
      : 'AGUARDANDO_DESCARTE';
  }

  async obterEstatisticas(input: RelatorioEpisDevolvidosDescartadosInput = {}): Promise<{
    totalCorrelacoes: number;
    totalItensDevolvidos: number;
    totalItensDescartados: number;
    percentualDescarte: number;
    tempoMedioParaDescarte: number; // em dias
    menorTempoDescarte: number;
    maiorTempoDescarte: number;
    valorTotalPerdas?: number;
    devolucoesSemDescarte: number;
    distribuicaoTempo: {
      ate7Dias: number;
      ate15Dias: number;
      ate30Dias: number;
      mais30Dias: number;
    };
  }> {
    const correlacoes = await this.execute({ ...input, incluirSemDescarte: false });
    const devolucoesSemDescarte = await this.execute({ ...input, incluirSemDescarte: true })
      .then(items => items.filter(item => !item.descarte).length);

    const totalItensDevolvidos = correlacoes.length + devolucoesSemDescarte;
    const totalItensDescartados = correlacoes.length;
    const percentualDescarte = totalItensDevolvidos > 0 
      ? (totalItensDescartados / totalItensDevolvidos) * 100 
      : 0;

    const tempos = correlacoes
      .map(item => item.diasEntreDevolucaoDescarte!)
      .filter(dias => dias !== undefined);

    const tempoMedio = tempos.length > 0 
      ? tempos.reduce((sum, dias) => sum + dias, 0) / tempos.length 
      : 0;

    const valorTotalPerdas = correlacoes
      .map(item => item.valorEstimadoPerdas || 0)
      .reduce((sum, valor) => sum + valor, 0);

    const distribuicaoTempo = {
      ate7Dias: 0,
      ate15Dias: 0,
      ate30Dias: 0,
      mais30Dias: 0,
    };

    for (const tempo of tempos) {
      if (tempo <= 7) distribuicaoTempo.ate7Dias++;
      else if (tempo <= 15) distribuicaoTempo.ate15Dias++;
      else if (tempo <= 30) distribuicaoTempo.ate30Dias++;
      else distribuicaoTempo.mais30Dias++;
    }

    return {
      totalCorrelacoes: correlacoes.length,
      totalItensDevolvidos,
      totalItensDescartados,
      percentualDescarte: Math.round(percentualDescarte * 100) / 100,
      tempoMedioParaDescarte: Math.round(tempoMedio),
      menorTempoDescarte: tempos.length > 0 ? Math.min(...tempos) : 0,
      maiorTempoDescarte: tempos.length > 0 ? Math.max(...tempos) : 0,
      valorTotalPerdas: valorTotalPerdas > 0 ? valorTotalPerdas : undefined,
      devolucoesSemDescarte,
      distribuicaoTempo,
    };
  }

  async obterDevolucoesSemDescarte(diasMinimo: number = 30): Promise<RelatorioEpisDevolvidosDescartadosOutput[]> {
    const devolucoesSemDescarte = await this.execute({ incluirSemDescarte: true })
      .then(items => items.filter(item => !item.descarte));

    const hoje = new Date();
    
    return devolucoesSemDescarte
      .map(item => {
        const diasDesdeDevolucao = Math.floor(
          (hoje.getTime() - item.devolucao.dataMovimentacao.getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        return { ...item, diasDesdeDevolucao };
      })
      .filter(item => item.diasDesdeDevolucao >= diasMinimo)
      .sort((a, b) => b.diasDesdeDevolucao - a.diasDesdeDevolucao) as RelatorioEpisDevolvidosDescartadosOutput[];
  }

  async obterCorrelacoesPorTipo(input: RelatorioEpisDevolvidosDescartadosInput = {}): Promise<Array<{
    tipoEpi: {
      id: string;
      nomeEquipamento: string;
      numeroCa: string;
    };
    totalDevolucoes: number;
    totalDescartes: number;
    percentualDescarte: number;
    tempoMedioDescarte: number;
    valorTotalPerdas?: number;
  }>> {
    const correlacoes = await this.execute(input);

    const tiposMap = new Map<string, {
      tipoEpi: any;
      correlacoes: RelatorioEpisDevolvidosDescartadosOutput[];
    }>();

    // Agrupar por tipo
    for (const correlacao of correlacoes) {
      const tipoId = correlacao.tipoEpi.id;
      if (!tiposMap.has(tipoId)) {
        tiposMap.set(tipoId, {
          tipoEpi: correlacao.tipoEpi,
          correlacoes: [],
        });
      }
      tiposMap.get(tipoId)!.correlacoes.push(correlacao);
    }

    return Array.from(tiposMap.values()).map(tipoData => {
      const totalDescartes = tipoData.correlacoes.filter(c => c.descarte).length;
      const totalDevolucoes = tipoData.correlacoes.length;
      const percentualDescarte = totalDevolucoes > 0 ? (totalDescartes / totalDevolucoes) * 100 : 0;
      
      const tempos = tipoData.correlacoes
        .map(c => c.diasEntreDevolucaoDescarte)
        .filter(dias => dias !== undefined) as number[];
      
      const tempoMedio = tempos.length > 0 
        ? tempos.reduce((sum, dias) => sum + dias, 0) / tempos.length 
        : 0;

      const valorTotal = tipoData.correlacoes
        .map(c => c.valorEstimadoPerdas || 0)
        .reduce((sum, valor) => sum + valor, 0);

      return {
        tipoEpi: {
          id: tipoData.tipoEpi.id,
          nomeEquipamento: tipoData.tipoEpi.nomeEquipamento,
          numeroCa: tipoData.tipoEpi.numeroCa,
        },
        totalDevolucoes,
        totalDescartes,
        percentualDescarte: Math.round(percentualDescarte * 100) / 100,
        tempoMedioDescarte: Math.round(tempoMedio),
        valorTotalPerdas: valorTotal > 0 ? valorTotal : undefined,
      };
    }).sort((a, b) => b.totalDescartes - a.totalDescartes);
  }
}