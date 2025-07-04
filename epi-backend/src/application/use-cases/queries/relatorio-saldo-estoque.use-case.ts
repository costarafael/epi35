import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ConfiguracaoService } from '@domain/services/configuracao.service';

export interface RelatorioSaldoEstoqueInput {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  status?: 'DISPONIVEL' | 'AGUARDANDO_INSPECAO' | 'QUARENTENA';
  incluirZerados?: boolean;
}

export interface RelatorioSaldoEstoqueOutput {
  estoqueItemId: string;
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
  quantidade: number;
  status: string;
  custoUnitario?: number;
  valorTotal?: number;
  ultimaMovimentacao?: Date;
}

@Injectable()
export class RelatorioSaldoEstoqueUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configuracaoService: ConfiguracaoService,
  ) {}

  async execute(input: RelatorioSaldoEstoqueInput = {}): Promise<RelatorioSaldoEstoqueOutput[]> {
    const whereClause: any = {};

    if (input.almoxarifadoId) {
      whereClause.almoxarifadoId = input.almoxarifadoId;
    }

    if (input.tipoEpiId) {
      whereClause.tipoEpiId = input.tipoEpiId;
    }

    if (input.status) {
      whereClause.status = input.status;
    }

    if (!input.incluirZerados) {
      whereClause.quantidade = {
        gt: 0,
      };
    } else {
      // When including zeros, check if negative stock should also be included
      const permitirEstoqueNegativo = await this.configuracaoService.permitirEstoqueNegativo();
      if (!permitirEstoqueNegativo) {
        // Only include zero and positive values
        whereClause.quantidade = {
          gte: 0,
        };
      }
      // If negative stock is allowed and incluirZerados is true, include all values (no filter)
    }

    const estoqueItens = await this.prismaService.estoqueItem.findMany({
      where: whereClause,
      include: {
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
        tipoEpi: {
          select: {
            id: true,
            nomeEquipamento: true,
            numeroCa: true,
            vidaUtilDias: true,
          },
        },
        movimentacoes: {
          select: {
            dataMovimentacao: true,
          },
          orderBy: {
            dataMovimentacao: 'desc',
          },
          take: 1,
        },
      },
      orderBy: [
        { almoxarifado: { nome: 'asc' } },
        { tipoEpi: { nomeEquipamento: 'asc' } },
      ],
    });

    return estoqueItens.map(item => ({
      estoqueItemId: item.id,
      almoxarifado: item.almoxarifado,
      tipoEpi: item.tipoEpi,
      quantidade: item.quantidade,
      status: item.status,
      custoUnitario: item.custoUnitario ? Number(item.custoUnitario) : undefined,
      valorTotal: item.custoUnitario ? item.quantidade * Number(item.custoUnitario) : undefined,
      ultimaMovimentacao: item.movimentacoes[0]?.dataMovimentacao || undefined,
    }));
  }

  async obterEstatisticas(input: RelatorioSaldoEstoqueInput = {}): Promise<{
    totalItens: number;
    totalQuantidade: number;
    valorTotalEstoque?: number;
    itensPorStatus: Array<{ status: string; quantidade: number; itens: number }>;
    almoxarifadosComEstoque: number;
    tiposEpiDiferentes: number;
  }> {
    const whereClause: any = {};

    if (input.almoxarifadoId) {
      whereClause.almoxarifadoId = input.almoxarifadoId;
    }

    if (input.tipoEpiId) {
      whereClause.tipoEpiId = input.tipoEpiId;
    }

    if (input.status) {
      whereClause.status = input.status;
    }

    // Apply same negative stock logic as execute method
    if (!input.incluirZerados) {
      whereClause.quantidade = {
        gt: 0,
      };
    } else {
      // When including zeros, check if negative stock should also be included
      const permitirEstoqueNegativo = await this.configuracaoService.permitirEstoqueNegativo();
      if (!permitirEstoqueNegativo) {
        // Only include zero and positive values
        whereClause.quantidade = {
          gte: 0,
        };
      }
      // If negative stock is allowed and incluirZerados is true, include all values (no filter)
    }

    const [totais, estatisticasPorStatus] = await Promise.all([
      this.prismaService.estoqueItem.aggregate({
        where: whereClause,
        _count: {
          id: true,
        },
        _sum: {
          quantidade: true,
          custoUnitario: true,
        },
      }),
      this.prismaService.estoqueItem.groupBy({
        by: ['status'],
        where: whereClause,
        _count: {
          id: true,
        },
        _sum: {
          quantidade: true,
        },
      }),
    ]);

    const [almoxarifados, tiposEpi] = await Promise.all([
      this.prismaService.estoqueItem.groupBy({
        by: ['almoxarifadoId'],
        where: whereClause,
      }),
      this.prismaService.estoqueItem.groupBy({
        by: ['tipoEpiId'],
        where: whereClause,
      }),
    ]);

    return {
      totalItens: totais._count.id || 0,
      totalQuantidade: totais._sum.quantidade || 0,
      valorTotalEstoque: totais._sum.custoUnitario ? Number(totais._sum.custoUnitario) : undefined,
      itensPorStatus: estatisticasPorStatus.map(stat => ({
        status: stat.status,
        quantidade: stat._sum.quantidade || 0,
        itens: stat._count.id || 0,
      })),
      almoxarifadosComEstoque: almoxarifados.length,
      tiposEpiDiferentes: tiposEpi.length,
    };
  }
}