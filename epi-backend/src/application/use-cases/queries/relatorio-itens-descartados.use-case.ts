import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RelatorioItensDescartadosInput {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  responsavelId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  incluirNotaMovimentacao?: boolean;
  limit?: number;
  offset?: number;
}

export interface RelatorioItensDescartadosOutput {
  id: string;
  dataMovimentacao: Date;
  quantidadeMovida: number;
  tipoEpi: {
    id: string;
    nomeEquipamento: string;
    numeroCa: string;
  };
  almoxarifado: {
    id: string;
    nome: string;
    unidadeNegocio: {
      nome: string;
      codigo: string;
    };
  };
  responsavel: {
    id: string;
    nome: string;
    email: string;
  };
  notaMovimentacao?: {
    id: string;
    numeroDocumento: string;
    tipoNota: string;
    observacoes?: string;
  };
  motivoDescarte?: string;
  valorEstimadoPerdas?: number;
}

@Injectable()
export class RelatorioItensDescartadosUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: RelatorioItensDescartadosInput = {}): Promise<RelatorioItensDescartadosOutput[]> {
    const whereClause: any = {
      tipoMovimentacao: 'SAIDA_DESCARTE',
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

    const descartes = await this.prismaService.movimentacaoEstoque.findMany({
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
                unidadeNegocio: {
                  select: {
                    nome: true,
                    codigo: true,
                  },
                },
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
        notaMovimentacao: input.incluirNotaMovimentacao ? {
          select: {
            id: true,
            numeroDocumento: true,
            tipoNota: true,
            observacoes: true,
          },
        } : false,
      },
      orderBy: {
        dataMovimentacao: 'desc',
      },
      take: input.limit || undefined,
      skip: input.offset || undefined,
    });

    return descartes.map(descarte => ({
      id: descarte.id,
      dataMovimentacao: descarte.dataMovimentacao,
      quantidadeMovida: descarte.quantidadeMovida,
      tipoEpi: descarte.estoqueItem.tipoEpi,
      almoxarifado: descarte.estoqueItem.almoxarifado,
      responsavel: descarte.responsavel,
      notaMovimentacao: descarte.notaMovimentacao || undefined,
      motivoDescarte: descarte.notaMovimentacao?.observacoes || undefined,
      valorEstimadoPerdas: descarte.estoqueItem.valorUnitario 
        ? descarte.quantidadeMovida * descarte.estoqueItem.valorUnitario 
        : undefined,
    }));
  }

  async obterEstatisticas(input: RelatorioItensDescartadosInput = {}): Promise<{
    totalMovimentacoesDescarte: number;
    totalItensDescartados: number;
    almoxarifadosComDescarte: number;
    tiposEpisDescartados: number;
    responsaveisDiferentes: number;
    valorTotalPerdas?: number;
    periodoAnalise?: { inicio: Date; fim: Date };
    primeiroDescarte?: Date;
    ultimoDescarte?: Date;
  }> {
    const whereClause: any = {
      tipoMovimentacao: 'SAIDA_DESCARTE',
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
      datas,
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
      this.prismaService.movimentacaoEstoque.aggregate({
        where: whereClause,
        _min: { dataMovimentacao: true },
        _max: { dataMovimentacao: true },
      }),
    ]);

    return {
      totalMovimentacoesDescarte: totais._count.id || 0,
      totalItensDescartados: totais._sum.quantidadeMovida || 0,
      almoxarifadosComDescarte: almoxarifados.length,
      tiposEpisDescartados: tiposEpi.length,
      responsaveisDiferentes: responsaveis.length,
      valorTotalPerdas: undefined, // Seria calculado se tivéssemos valores unitários
      periodoAnalise: (input.dataInicio || input.dataFim) ? {
        inicio: input.dataInicio || new Date(0),
        fim: input.dataFim || new Date(),
      } : undefined,
      primeiroDescarte: datas._min.dataMovimentacao || undefined,
      ultimoDescarte: datas._max.dataMovimentacao || undefined,
    };
  }

  async obterDescartePorTipo(input: RelatorioItensDescartadosInput = {}): Promise<Array<{
    tipoEpi: {
      id: string;
      nomeEquipamento: string;
      numeroCa: string;
    };
    totalMovimentacoes: number;
    totalQuantidadeDescartada: number;
    primeiroDescarte: Date;
    ultimoDescarte: Date;
    valorEstimadoPerdas?: number;
  }>> {
    const whereClause: any = {
      tipoMovimentacao: 'SAIDA_DESCARTE',
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
      by: ['estoqueItemId'],
      where: whereClause,
      _count: { id: true },
      _sum: { quantidadeMovida: true },
      _min: { dataMovimentacao: true },
      _max: { dataMovimentacao: true },
    });

    const estoqueItemIds = agrupamentos.map(g => g.estoqueItemId);
    
    const estoqueItens = await this.prismaService.estoqueItem.findMany({
      where: { id: { in: estoqueItemIds } },
      include: {
        tipoEpi: {
          select: {
            id: true,
            nomeEquipamento: true,
            numeroCa: true,
          },
        },
      },
    });

    const resultado = new Map<string, any>();

    for (const agrupamento of agrupamentos) {
      const estoqueItem = estoqueItens.find(ei => ei.id === agrupamento.estoqueItemId);
      if (!estoqueItem) continue;

      const tipoEpiId = estoqueItem.tipoEpi.id;
      
      if (!resultado.has(tipoEpiId)) {
        resultado.set(tipoEpiId, {
          tipoEpi: estoqueItem.tipoEpi,
          totalMovimentacoes: 0,
          totalQuantidadeDescartada: 0,
          primeiroDescarte: agrupamento._min.dataMovimentacao!,
          ultimoDescarte: agrupamento._max.dataMovimentacao!,
          valorEstimadoPerdas: 0,
        });
      }

      const item = resultado.get(tipoEpiId);
      item.totalMovimentacoes += agrupamento._count.id;
      item.totalQuantidadeDescartada += agrupamento._sum.quantidadeMovida || 0;
      
      if (agrupamento._min.dataMovimentacao! < item.primeiroDescarte) {
        item.primeiroDescarte = agrupamento._min.dataMovimentacao!;
      }
      if (agrupamento._max.dataMovimentacao! > item.ultimoDescarte) {
        item.ultimoDescarte = agrupamento._max.dataMovimentacao!;
      }
    }

    return Array.from(resultado.values()).sort((a, b) => 
      b.totalQuantidadeDescartada - a.totalQuantidadeDescartada
    );
  }

  async obterDescartePorResponsavel(input: RelatorioItensDescartadosInput = {}): Promise<Array<{
    responsavel: {
      id: string;
      nome: string;
      email: string;
    };
    totalMovimentacoes: number;
    totalQuantidadeDescartada: number;
    primeiroDescarte: Date;
    ultimoDescarte: Date;
  }>> {
    const whereClause: any = {
      tipoMovimentacao: 'SAIDA_DESCARTE',
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
    
    const responsaveis = await this.prismaService.usuario.findMany({
      where: { id: { in: responsavelIds } },
      select: {
        id: true,
        nome: true,
        email: true,
      },
    });

    return agrupamentos.map(agrupamento => {
      const responsavel = responsaveis.find(r => r.id === agrupamento.responsavelId)!;
      
      return {
        responsavel,
        totalMovimentacoes: agrupamento._count.id,
        totalQuantidadeDescartada: agrupamento._sum.quantidadeMovida || 0,
        primeiroDescarte: agrupamento._min.dataMovimentacao!,
        ultimoDescarte: agrupamento._max.dataMovimentacao!,
      };
    }).sort((a, b) => 
      b.totalQuantidadeDescartada - a.totalQuantidadeDescartada
    );
  }
}