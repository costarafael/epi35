import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RelatorioEpisAnaliseQuarentenaInput {
  status?: 'AGUARDANDO_INSPECAO' | 'QUARENTENA';
  almoxarifadoId?: string;
  tipoEpiId?: string;
  dataInicio?: Date; // Data de entrada em análise
  dataFim?: Date;
  incluirHistoricoMovimentacao?: boolean;
  limit?: number;
  offset?: number;
}

export interface RelatorioEpisAnaliseQuarentenaOutput {
  estoqueItemId: string;
  tipoEpi: {
    id: string;
    nomeEquipamento: string;
    numeroCa: string;
    vidaUtilDias: number;
    descricao?: string;
  };
  almoxarifado: {
    id: string;
    nome: string;
    unidadeNegocio: {
      nome: string;
      codigo: string;
    };
  };
  quantidade: number;
  status: string;
  dataEntradaAnalise: Date;
  diasEmAnalise: number;
  valorUnitario?: number;
  valorTotalAnalise?: number;
  ultimaMovimentacao?: {
    id: string;
    tipo: string;
    responsavel: string;
    data: Date;
  };
}

@Injectable()
export class RelatorioEpisAnaliseQuarentenaUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: RelatorioEpisAnaliseQuarentenaInput = {}): Promise<RelatorioEpisAnaliseQuarentenaOutput[]> {
    const whereClause: any = {
      status: input.status ? input.status : { in: ['AGUARDANDO_INSPECAO', 'QUARENTENA'] },
    };

    if (input.almoxarifadoId) {
      whereClause.almoxarifadoId = input.almoxarifadoId;
    }

    if (input.tipoEpiId) {
      whereClause.tipoEpiId = input.tipoEpiId;
    }

    const hoje = new Date();

    const itensEmAnalise = await this.prismaService.estoqueItem.findMany({
      where: whereClause,
      include: {
        tipoEpi: {
          select: {
            id: true,
            nomeEquipamento: true,
            numeroCa: true,
            vidaUtilDias: true,
            descricao: true,
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
        movimentacoes: input.incluirHistoricoMovimentacao ? {
          select: {
            id: true,
            tipoMovimentacao: true,
            dataMovimentacao: true,
            responsavel: {
              select: {
                nome: true,
              },
            },
          },
          orderBy: {
            dataMovimentacao: 'desc',
          },
          take: 1,
        } : false,
      },
      orderBy: [
        { createdAt: 'desc' },
        { tipoEpi: { nomeEquipamento: 'asc' } },
      ],
      take: input.limit || undefined,
      skip: input.offset || undefined,
    });

    // Filtrar por período se especificado (baseado na data de atualização)
    let itensFiltrados = itensEmAnalise;
    if (input.dataInicio || input.dataFim) {
      itensFiltrados = itensEmAnalise.filter(item => {
        const dataAnalise = item.createdAt; // updatedAt field removed from schema v3.5
        if (input.dataInicio && dataAnalise < input.dataInicio) return false;
        if (input.dataFim && dataAnalise > input.dataFim) return false;
        return true;
      });
    }

    return itensFiltrados.map(item => {
      const dataEntradaAnalise = item.createdAt; // updatedAt field removed from schema v3.5
      const diasEmAnalise = Math.floor((hoje.getTime() - dataEntradaAnalise.getTime()) / (1000 * 60 * 60 * 24));
      const ultimaMovimentacao = input.incluirHistoricoMovimentacao ? item.movimentacoes?.[0] : undefined;

      return {
        estoqueItemId: item.id,
        tipoEpi: item.tipoEpi,
        almoxarifado: item.almoxarifado,
        quantidade: item.quantidade,
        status: item.status,
        dataEntradaAnalise,
        diasEmAnalise,
        valorUnitario: item.custoUnitario ? Number(item.custoUnitario) : undefined, // Field renamed from valorUnitario to custoUnitario
        valorTotalAnalise: item.custoUnitario ? item.quantidade * Number(item.custoUnitario) : undefined,
        ultimaMovimentacao: ultimaMovimentacao ? {
          id: ultimaMovimentacao.id,
          tipo: ultimaMovimentacao.tipoMovimentacao,
          responsavel: (ultimaMovimentacao as any).responsavel?.nome || 'N/A',
          data: ultimaMovimentacao.dataMovimentacao,
        } : undefined,
      };
    });
  }

  async obterEstatisticas(input: RelatorioEpisAnaliseQuarentenaInput = {}): Promise<{
    totalItensAnalise: number;
    totalQuantidadeAnalise: number;
    tiposEpisDiferentes: number;
    almoxarifadosComAnalise: number;
    valorTotalAnalise?: number;
    itensPorStatus: Array<{ status: string; quantidade: number; itens: number }>;
    tempoMedioAnalise: number; // em dias
    itensAnaliseProongada: number; // mais de 30 dias
    distribuicaoTempo: {
      ate7Dias: number;
      ate15Dias: number;
      ate30Dias: number;
      mais30Dias: number;
    };
  }> {
    const itens = await this.execute(input);

    const statusMap = new Map<string, { quantidade: number; itens: number }>();
    const tiposEpiUnicos = new Set<string>();
    const almoxarifadosUnicos = new Set<string>();
    
    let totalQuantidade = 0;
    let valorTotal = 0;
    let somaDiasAnalise = 0;
    let itensAnaliseProongada = 0;
    
    const distribuicaoTempo = {
      ate7Dias: 0,
      ate15Dias: 0,
      ate30Dias: 0,
      mais30Dias: 0,
    };

    for (const item of itens) {
      // Agrupar por status
      const statusData = statusMap.get(item.status) || { quantidade: 0, itens: 0 };
      statusData.quantidade += item.quantidade;
      statusData.itens += 1;
      statusMap.set(item.status, statusData);

      // Coletar estatísticas
      tiposEpiUnicos.add(item.tipoEpi.id);
      almoxarifadosUnicos.add(item.almoxarifado.id);
      totalQuantidade += item.quantidade;
      
      if (item.valorTotalAnalise) {
        valorTotal += item.valorTotalAnalise;
      }

      somaDiasAnalise += item.diasEmAnalise;

      if (item.diasEmAnalise > 30) {
        itensAnaliseProongada++;
      }

      // Distribuição por tempo
      if (item.diasEmAnalise <= 7) {
        distribuicaoTempo.ate7Dias++;
      } else if (item.diasEmAnalise <= 15) {
        distribuicaoTempo.ate15Dias++;
      } else if (item.diasEmAnalise <= 30) {
        distribuicaoTempo.ate30Dias++;
      } else {
        distribuicaoTempo.mais30Dias++;
      }
    }

    const tempoMedio = itens.length > 0 ? somaDiasAnalise / itens.length : 0;

    return {
      totalItensAnalise: itens.length,
      totalQuantidadeAnalise: totalQuantidade,
      tiposEpisDiferentes: tiposEpiUnicos.size,
      almoxarifadosComAnalise: almoxarifadosUnicos.size,
      valorTotalAnalise: valorTotal > 0 ? valorTotal : undefined,
      itensPorStatus: Array.from(statusMap.entries()).map(([status, data]) => ({
        status,
        quantidade: data.quantidade,
        itens: data.itens,
      })),
      tempoMedioAnalise: Math.round(tempoMedio),
      itensAnaliseProongada,
      distribuicaoTempo,
    };
  }

  async obterItensAnaliseProongada(diasMinimo: number = 30): Promise<RelatorioEpisAnaliseQuarentenaOutput[]> {
    const itens = await this.execute({ incluirHistoricoMovimentacao: true });
    
    return itens
      .filter(item => item.diasEmAnalise >= diasMinimo)
      .sort((a, b) => b.diasEmAnalise - a.diasEmAnalise);
  }

  async obterItensPorTipo(input: RelatorioEpisAnaliseQuarentenaInput = {}): Promise<Array<{
    tipoEpi: {
      id: string;
      nomeEquipamento: string;
      numeroCa: string;
    };
    totalItensAnalise: number;
    totalQuantidadeAnalise: number;
    itensPorStatus: Array<{ status: string; quantidade: number }>;
    tempoMedioAnalise: number;
    valorTotalAnalise?: number;
  }>> {
    const itens = await this.execute(input);

    const tiposMap = new Map<string, {
      tipoEpi: any;
      itens: RelatorioEpisAnaliseQuarentenaOutput[];
    }>();

    // Agrupar por tipo
    for (const item of itens) {
      const tipoId = item.tipoEpi.id;
      if (!tiposMap.has(tipoId)) {
        tiposMap.set(tipoId, {
          tipoEpi: item.tipoEpi,
          itens: [],
        });
      }
      tiposMap.get(tipoId)!.itens.push(item);
    }

    // Calcular estatísticas por tipo
    return Array.from(tiposMap.values()).map(tipoData => {
      const statusMap = new Map<string, number>();
      let somaDias = 0;
      let valorTotal = 0;
      let totalQuantidade = 0;

      for (const item of tipoData.itens) {
        statusMap.set(item.status, (statusMap.get(item.status) || 0) + item.quantidade);
        somaDias += item.diasEmAnalise;
        totalQuantidade += item.quantidade;
        if (item.valorTotalAnalise) {
          valorTotal += item.valorTotalAnalise;
        }
      }

      return {
        tipoEpi: {
          id: tipoData.tipoEpi.id,
          nomeEquipamento: tipoData.tipoEpi.nomeEquipamento,
          numeroCa: tipoData.tipoEpi.numeroCa,
        },
        totalItensAnalise: tipoData.itens.length,
        totalQuantidadeAnalise: totalQuantidade,
        itensPorStatus: Array.from(statusMap.entries()).map(([status, quantidade]) => ({
          status,
          quantidade,
        })),
        tempoMedioAnalise: Math.round(somaDias / tipoData.itens.length),
        valorTotalAnalise: valorTotal > 0 ? valorTotal : undefined,
      };
    }).sort((a, b) => b.totalQuantidadeAnalise - a.totalQuantidadeAnalise);
  }

  async obterHistoricoMovimentacao(estoqueItemId: string): Promise<Array<{
    data: Date;
    tipoMovimentacao: string;
    quantidade: number;
    responsavel: string;
    statusAnterior?: string;
    statusPosterior?: string;
  }>> {
    const movimentacoes = await this.prismaService.movimentacaoEstoque.findMany({
      where: {
        estoqueItemId,
      },
      include: {
        responsavel: {
          select: {
            nome: true,
          },
        },
      },
      orderBy: {
        dataMovimentacao: 'asc',
      },
    });

    return movimentacoes.map(mov => ({
      data: mov.dataMovimentacao,
      tipoMovimentacao: mov.tipoMovimentacao,
      quantidade: mov.quantidadeMovida,
      responsavel: mov.responsavel.nome,
      statusAnterior: undefined, // Seria necessário lógica adicional para rastrear mudanças de status
      statusPosterior: undefined,
    }));
  }

  async liberarItemAnalise(estoqueItemId: string, novoStatus: 'DISPONIVEL' | 'QUARENTENA', responsavelId: string): Promise<void> {
    // Este método seria implementado para alterar o status do item após análise
    // Por enquanto, apenas uma estrutura de exemplo
    await this.prismaService.estoqueItem.update({
      where: { id: estoqueItemId },
      data: { 
        status: novoStatus,
        // updatedAt field removed from schema v3.5
      },
    });

    // Registrar movimentação
    await this.prismaService.movimentacaoEstoque.create({
      data: {
        estoqueItemId,
        tipoMovimentacao: novoStatus === 'DISPONIVEL' ? 'ENTRADA_NOTA' : 'ENTRADA_NOTA', // Use valid enum values from TipoMovimentacaoEnum
        quantidadeMovida: 0, // Sem movimentação de quantidade, apenas mudança de status
        dataMovimentacao: new Date(),
        responsavelId,
      },
    });
  }
}