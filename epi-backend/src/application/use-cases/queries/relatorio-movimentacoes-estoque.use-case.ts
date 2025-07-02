import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RelatorioMovimentacoesEstoqueInput {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  estoqueItemId?: string;
  tipoMovimentacao?: string;
  responsavelId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  limit?: number;
  offset?: number;
}

export interface RelatorioMovimentacoesEstoqueOutput {
  id: string;
  dataMovimentacao: Date;
  tipoMovimentacao: string;
  quantidadeMovida: number;
  estoqueItem: {
    id: string;
    quantidade: number;
    almoxarifado: {
      id: string;
      nome: string;
    };
    tipoEpi: {
      id: string;
      nomeEquipamento: string;
      numeroCa: string;
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
  };
  entrega?: {
    id: string;
    status: string;
    fichaEpi: {
      colaborador: {
        nome: string;
        matricula: string;
      };
    };
  };
  movimentacaoOrigem?: {
    id: string;
    tipoMovimentacao: string;
    dataMovimentacao: Date;
  };
}

@Injectable()
export class RelatorioMovimentacoesEstoqueUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: RelatorioMovimentacoesEstoqueInput = {}): Promise<RelatorioMovimentacoesEstoqueOutput[]> {
    const whereClause: any = {};

    if (input.estoqueItemId) {
      whereClause.estoqueItemId = input.estoqueItemId;
    } else {
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
    }

    if (input.tipoMovimentacao) {
      whereClause.tipoMovimentacao = input.tipoMovimentacao;
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

    const movimentacoes = await this.prismaService.movimentacaoEstoque.findMany({
      where: whereClause,
      include: {
        estoqueItem: {
          include: {
            almoxarifado: {
              select: {
                id: true,
                nome: true,
              },
            },
            tipoEpi: {
              select: {
                id: true,
                nomeEquipamento: true,
                numeroCa: true,
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
            tipoNota: true,
          },
        },
        entrega: {
          select: {
            id: true,
            status: true,
            fichaEpi: {
              select: {
                colaborador: {
                  select: {
                    nome: true,
                    matricula: true,
                  },
                },
              },
            },
          },
        },
        movimentacaoOrigem: {
          select: {
            id: true,
            tipoMovimentacao: true,
            dataMovimentacao: true,
          },
        },
      },
      orderBy: {
        dataMovimentacao: 'desc',
      },
      take: input.limit || undefined,
      skip: input.offset || undefined,
    });

    return movimentacoes;
  }

  async obterKardexItem(estoqueItemId: string, dataInicio?: Date, dataFim?: Date): Promise<{
    estoqueItem: {
      id: string;
      quantidade: number;
      almoxarifado: { nome: string };
      tipoEpi: { nomeEquipamento: string; numeroCa: string };
    };
    movimentacoes: Array<{
      data: Date;
      tipo: string;
      entrada: number;
      saida: number;
      saldo: number;
      documento?: string;
      responsavel: string;
    }>;
    saldoAnterior: number;
    saldoFinal: number;
  }> {
    const whereClause: any = { estoqueItemId };

    if (dataInicio || dataFim) {
      whereClause.dataMovimentacao = {};
      if (dataInicio) {
        whereClause.dataMovimentacao.gte = dataInicio;
      }
      if (dataFim) {
        whereClause.dataMovimentacao.lte = dataFim;
      }
    }

    const [estoqueItem, movimentacoes] = await Promise.all([
      this.prismaService.estoqueItem.findUnique({
        where: { id: estoqueItemId },
        include: {
          almoxarifado: { select: { nome: true } },
          tipoEpi: { select: { nomeEquipamento: true, numeroCa: true } },
        },
      }),
      this.prismaService.movimentacaoEstoque.findMany({
        where: whereClause,
        include: {
          responsavel: { select: { nome: true } },
          notaMovimentacao: { select: { numeroDocumento: true } },
          entrega: { select: { id: true } },
        },
        orderBy: { dataMovimentacao: 'asc' },
      }),
    ]);

    if (!estoqueItem) {
      throw new Error(`Item de estoque não encontrado: ${estoqueItemId}`);
    }

    let saldoCorrente = 0;
    const kardexMovimentacoes = movimentacoes.map(mov => {
      const isEntrada = mov.tipoMovimentacao.startsWith('ENTRADA');
      const entrada = isEntrada ? mov.quantidadeMovida : 0;
      const saida = !isEntrada ? mov.quantidadeMovida : 0;
      
      saldoCorrente += entrada - saida;

      return {
        data: mov.dataMovimentacao,
        tipo: mov.tipoMovimentacao,
        entrada,
        saida,
        saldo: saldoCorrente,
        documento: mov.notaMovimentacao?.numeroDocumento || mov.entrega?.id,
        responsavel: mov.responsavel.nome,
      };
    });

    return {
      estoqueItem,
      movimentacoes: kardexMovimentacoes,
      saldoAnterior: 0,
      saldoFinal: saldoCorrente,
    };
  }

  async obterEstatisticas(input: RelatorioMovimentacoesEstoqueInput = {}): Promise<{
    totalMovimentacoes: number;
    movimentacoesPorTipo: Array<{ tipo: string; quantidade: number; total: number }>;
    responsaveisAtivos: number;
    periodoAnalisado?: { inicio: Date; fim: Date };
  }> {
    const whereClause: any = {};

    if (input.almoxarifadoId || input.tipoEpiId) {
      whereClause.estoqueItem = {};
      if (input.almoxarifadoId) {
        whereClause.estoqueItem.almoxarifadoId = input.almoxarifadoId;
      }
      if (input.tipoEpiId) {
        whereClause.estoqueItem.tipoEpiId = input.tipoEpiId;
      }
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

    const [total, porTipo, responsaveis] = await Promise.all([
      this.prismaService.movimentacaoEstoque.count({ where: whereClause }),
      this.prismaService.movimentacaoEstoque.groupBy({
        by: ['tipoMovimentacao'],
        where: whereClause,
        _count: { id: true },
        _sum: { quantidadeMovida: true },
      }),
      this.prismaService.movimentacaoEstoque.groupBy({
        by: ['responsavelId'],
        where: whereClause,
      }),
    ]);

    return {
      totalMovimentacoes: total,
      movimentacoesPorTipo: porTipo.map(stat => ({
        tipo: stat.tipoMovimentacao,
        quantidade: stat._sum.quantidadeMovida || 0,
        total: stat._count.id,
      })),
      responsaveisAtivos: responsaveis.length,
      periodoAnalisado: (input.dataInicio || input.dataFim) ? {
        inicio: input.dataInicio || new Date(0),
        fim: input.dataFim || new Date(),
      } : undefined,
    };
  }
}