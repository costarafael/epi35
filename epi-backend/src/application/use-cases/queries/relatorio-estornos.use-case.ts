import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RelatorioEstornosInput {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  responsavelId?: string;
  tipoMovimentacaoOriginal?: string;
  dataInicio?: Date;
  dataFim?: Date;
  incluirDetalhesOriginal?: boolean;
  limit?: number;
  offset?: number;
}

export interface RelatorioEstornosOutput {
  id: string;
  dataMovimentacao: Date;
  tipoMovimentacao: string;
  quantidadeMovida: number;
  tipoEpi: {
    id: string;
    nomeEquipamento: string;
    numeroCa: string;
  };
  almoxarifado: {
    id: string;
    nome: string;
  };
  responsavelEstorno: {
    id: string;
    nome: string;
    email: string;
  };
  movimentacaoOriginal: {
    id: string;
    dataMovimentacao: Date;
    tipoMovimentacao: string;
    quantidadeMovida: number;
    responsavel: {
      id: string;
      nome: string;
      email: string;
    };
  };
  diasParaEstorno: number;
  motivoEstorno?: string;
  notaMovimentacao?: {
    numeroDocumento: string;
    observacoes?: string;
  };
}

@Injectable()
export class RelatorioEstornosUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: RelatorioEstornosInput = {}): Promise<RelatorioEstornosOutput[]> {
    const whereClause: any = {
      movimentacaoOrigemId: {
        not: null,
      },
      tipoMovimentacao: {
        contains: 'ESTORNO_',
      },
    };

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

    if (input.responsavelId) {
      whereClause.responsavelId = input.responsavelId;
    }

    if (input.dataInicio || input.dataFim) {
      whereClause.dataMovimentacao = {};
      if (input.dataInicio) {
        whereClause.dataMovimentacao.gte = input.dataInicio;
      }
      if (input.dataFim) {
        whereClause.dataMovimentacao.lte = input.dataFim;
      }
    }

    const estornos = await this.prismaService.movimentacaoEstoque.findMany({
      where: whereClause,
      include: {
        estoqueItem: {
          include: {
            tipoEpi: {
              select: {
                id: true,
                nomeEquipamento: true,
                numeroCa: true,
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
        movimentacaoOrigem: {
          include: {
            responsavel: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        },
        notaMovimentacao: {
          select: {
            numeroDocumento: true,
            observacoes: true,
          },
        },
      },
      orderBy: {
        dataMovimentacao: 'desc',
      },
      take: input.limit || undefined,
      skip: input.offset || undefined,
    });

    // Filtrar por tipo de movimentação original se especificado
    const estornosFiltrados = input.tipoMovimentacaoOriginal
      ? estornos.filter(estorno => 
          estorno.movimentacaoOrigem?.tipoMovimentacao === input.tipoMovimentacaoOriginal
        )
      : estornos;

    return estornosFiltrados.map(estorno => {
      const diasParaEstorno = estorno.movimentacaoOrigem
        ? Math.floor(
            (estorno.dataMovimentacao.getTime() - estorno.movimentacaoOrigem.dataMovimentacao.getTime()) / 
            (1000 * 60 * 60 * 24)
          )
        : 0;

      return {
        id: estorno.id,
        dataMovimentacao: estorno.dataMovimentacao,
        tipoMovimentacao: estorno.tipoMovimentacao,
        quantidadeMovida: estorno.quantidadeMovida,
        tipoEpi: estorno.estoqueItem.tipoEpi,
        almoxarifado: estorno.estoqueItem.almoxarifado,
        responsavelEstorno: estorno.responsavel,
        movimentacaoOriginal: {
          id: estorno.movimentacaoOrigem!.id,
          dataMovimentacao: estorno.movimentacaoOrigem!.dataMovimentacao,
          tipoMovimentacao: estorno.movimentacaoOrigem!.tipoMovimentacao,
          quantidadeMovida: estorno.movimentacaoOrigem!.quantidadeMovida,
          responsavel: estorno.movimentacaoOrigem!.responsavel,
        },
        diasParaEstorno,
        motivoEstorno: estorno.notaMovimentacao?.observacoes || undefined,
        notaMovimentacao: estorno.notaMovimentacao ? {
          numeroDocumento: estorno.notaMovimentacao.numeroDocumento,
          observacoes: estorno.notaMovimentacao.observacoes || undefined,
        } : undefined,
      };
    });
  }

  async obterEstatisticas(input: RelatorioEstornosInput = {}): Promise<{
    totalEstornos: number;
    totalQuantidadeEstornada: number;
    almoxarifadosComEstorno: number;
    tiposEpisEstornados: number;
    responsaveisDiferentes: number;
    tempoMedioParaEstorno: number; // em dias
    menorTempoEstorno: number;
    maiorTempoEstorno: number;
    estornosPorTipoOriginal: Array<{
      tipoMovimentacaoOriginal: string;
      totalEstornos: number;
      quantidadeEstornada: number;
    }>;
    periodoAnalise?: { inicio: Date; fim: Date };
  }> {
    const whereClause: any = {
      movimentacaoOrigemId: {
        not: null,
      },
      tipoMovimentacao: {
        contains: 'ESTORNO_',
      },
    };

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

    if (input.dataInicio || input.dataFim) {
      whereClause.dataMovimentacao = {};
      if (input.dataInicio) {
        whereClause.dataMovimentacao.gte = input.dataInicio;
      }
      if (input.dataFim) {
        whereClause.dataMovimentacao.lte = input.dataFim;
      }
    }

    const [
      totais,
      almoxarifados,
      tiposEpi,
      responsaveis,
      estornosCompletos,
    ] = await Promise.all([
      this.prismaService.movimentacaoEstoque.aggregate({
        where: whereClause,
        _count: { id: true },
        _sum: { quantidadeMovida: true },
      }),
      this.prismaService.movimentacaoEstoque.groupBy({
        by: ['estoqueItemId'],
        where: whereClause,
      }).then(items => 
        this.prismaService.estoqueItem.groupBy({
          by: ['almoxarifadoId'],
          where: { id: { in: items.map(i => i.estoqueItemId) } },
        })
      ),
      this.prismaService.movimentacaoEstoque.groupBy({
        by: ['estoqueItemId'],
        where: whereClause,
      }).then(items => 
        this.prismaService.estoqueItem.groupBy({
          by: ['tipoEpiId'],
          where: { id: { in: items.map(i => i.estoqueItemId) } },
        })
      ),
      this.prismaService.movimentacaoEstoque.groupBy({
        by: ['responsavelId'],
        where: whereClause,
      }),
      this.prismaService.movimentacaoEstoque.findMany({
        where: whereClause,
        select: {
          dataMovimentacao: true,
          movimentacaoOrigem: {
            select: {
              dataMovimentacao: true,
              tipoMovimentacao: true,
              quantidadeMovida: true,
            },
          },
        },
      }),
    ]);

    // Calcular tempos e agrupamentos
    const temposEstorno: number[] = [];
    const estornosPorTipo = new Map<string, { total: number; quantidade: number }>();

    for (const estorno of estornosCompletos) {
      if (estorno.movimentacaoOrigem) {
        const dias = Math.floor(
          (estorno.dataMovimentacao.getTime() - estorno.movimentacaoOrigem.dataMovimentacao.getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        temposEstorno.push(dias);

        const tipoOriginal = estorno.movimentacaoOrigem.tipoMovimentacao;
        const atual = estornosPorTipo.get(tipoOriginal) || { total: 0, quantidade: 0 };
        atual.total += 1;
        atual.quantidade += estorno.movimentacaoOrigem.quantidadeMovida;
        estornosPorTipo.set(tipoOriginal, atual);
      }
    }

    const tempoMedio = temposEstorno.length > 0 
      ? temposEstorno.reduce((sum, tempo) => sum + tempo, 0) / temposEstorno.length 
      : 0;

    return {
      totalEstornos: totais._count.id || 0,
      totalQuantidadeEstornada: totais._sum.quantidadeMovida || 0,
      almoxarifadosComEstorno: almoxarifados.length,
      tiposEpisEstornados: tiposEpi.length,
      responsaveisDiferentes: responsaveis.length,
      tempoMedioParaEstorno: Math.round(tempoMedio),
      menorTempoEstorno: temposEstorno.length > 0 ? Math.min(...temposEstorno) : 0,
      maiorTempoEstorno: temposEstorno.length > 0 ? Math.max(...temposEstorno) : 0,
      estornosPorTipoOriginal: Array.from(estornosPorTipo.entries()).map(([tipo, dados]) => ({
        tipoMovimentacaoOriginal: tipo,
        totalEstornos: dados.total,
        quantidadeEstornada: dados.quantidade,
      })),
      periodoAnalise: (input.dataInicio || input.dataFim) ? {
        inicio: input.dataInicio || new Date(0),
        fim: input.dataFim || new Date(),
      } : undefined,
    };
  }

  async obterEstornosPorResponsavel(input: RelatorioEstornosInput = {}): Promise<Array<{
    responsavel: {
      id: string;
      nome: string;
      email: string;
    };
    totalEstornosRealizados: number;
    totalQuantidadeEstornada: number;
    primeiroEstorno: Date;
    ultimoEstorno: Date;
    tempoMedioParaEstorno: number;
  }>> {
    const whereClause: any = {
      movimentacaoOrigemId: {
        not: null,
      },
      tipoMovimentacao: {
        contains: 'ESTORNO_',
      },
    };

    if (input.almoxarifadoId) {
      whereClause.estoqueItem = {
        almoxarifadoId: input.almoxarifadoId,
      };
    }

    if (input.dataInicio || input.dataFim) {
      whereClause.dataMovimentacao = {};
      if (input.dataInicio) {
        whereClause.dataMovimentacao.gte = input.dataInicio;
      }
      if (input.dataFim) {
        whereClause.dataMovimentacao.lte = input.dataFim;
      }
    }

    const agrupamentos = await this.prismaService.movimentacaoEstoque.groupBy({
      by: ['responsavelId'],
      where: whereClause,
      _count: { id: true },
      _sum: { quantidadeMovida: true },
      _min: { dataMovimentacao: true },
      _max: { dataMovimentacao: true },
    });

    const responsavelIds = agrupamentos.map(g => g.responsavelId);
    
    const [responsaveis, estornosCompletos] = await Promise.all([
      this.prismaService.usuario.findMany({
        where: { id: { in: responsavelIds } },
        select: {
          id: true,
          nome: true,
          email: true,
        },
      }),
      this.prismaService.movimentacaoEstoque.findMany({
        where: {
          ...whereClause,
          responsavelId: { in: responsavelIds },
        },
        select: {
          responsavelId: true,
          dataMovimentacao: true,
          movimentacaoOrigem: {
            select: {
              dataMovimentacao: true,
            },
          },
        },
      }),
    ]);

    return agrupamentos.map(agrupamento => {
      const responsavel = responsaveis.find(r => r.id === agrupamento.responsavelId)!;
      
      // Calcular tempo médio para estorno deste responsável
      const estornosDoResponsavel = estornosCompletos.filter(e => e.responsavelId === agrupamento.responsavelId);
      const tempos = estornosDoResponsavel
        .filter(e => e.movimentacaoOrigem)
        .map(e => Math.floor(
          (e.dataMovimentacao.getTime() - e.movimentacaoOrigem!.dataMovimentacao.getTime()) / 
          (1000 * 60 * 60 * 24)
        ));
      
      const tempoMedio = tempos.length > 0 
        ? tempos.reduce((sum, tempo) => sum + tempo, 0) / tempos.length 
        : 0;

      return {
        responsavel,
        totalEstornosRealizados: agrupamento._count.id,
        totalQuantidadeEstornada: agrupamento._sum.quantidadeMovida || 0,
        primeiroEstorno: agrupamento._min.dataMovimentacao!,
        ultimoEstorno: agrupamento._max.dataMovimentacao!,
        tempoMedioParaEstorno: Math.round(tempoMedio),
      };
    }).sort((a, b) => 
      b.totalQuantidadeEstornada - a.totalQuantidadeEstornada
    );
  }

  async obterEstornosRapidos(maxDias: number = 1): Promise<RelatorioEstornosOutput[]> {
    const estornos = await this.execute({ incluirDetalhesOriginal: true });
    
    return estornos.filter(estorno => estorno.diasParaEstorno <= maxDias);
  }

  async obterEstornosLentos(minDias: number = 30): Promise<RelatorioEstornosOutput[]> {
    const estornos = await this.execute({ incluirDetalhesOriginal: true });
    
    return estornos.filter(estorno => estorno.diasParaEstorno >= minDias);
  }
}