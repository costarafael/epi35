import { Injectable } from '@nestjs/common';
import { SAUDE_SISTEMA, METRICS } from '../constants/system.constants';

export interface RelatorioConformidadeData {
  itensConformes: number;
  itensNaoConformes: number;
  itensVencidos: number;
  percentualConformidade: number;
  detalhes: any[];
}

export interface RelatorioUsoData {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  totalColaboradores: number;
  colaboradoresAtivos: number;
  entregasRealizadas: number;
  devolucoesRealizadas: number;
  itensEntregues: number;
  itensDevolvidos: number;
  detalhes: any[];
}

export interface RelatorioMovimentacaoData {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  totalMovimentacoes: number;
  totalEntradas: number;
  totalSaidas: number;
  valorMovimentado: number;
  variacao: number;
  detalhes: any[];
}

export interface SaudeSistemaData {
  incluirAlertas: boolean;
  incluirEstatisticas: boolean;
  incluirPerformance: boolean;
}

@Injectable()
export class RelatorioFormatterService {
  /**
   * Formata relatório de conformidade
   */
  formatarRelatorioConformidade(dados: RelatorioConformidadeData) {
    return {
      resumo: {
        itensConformes: dados.itensConformes,
        itensNaoConformes: dados.itensNaoConformes,
        itensVencidos: dados.itensVencidos,
        percentualConformidade: dados.percentualConformidade,
        totalItensAnalisados: dados.itensConformes + dados.itensNaoConformes + dados.itensVencidos,
      },
      detalhes: dados.detalhes,
      dataGeracao: new Date(),
    };
  }

  /**
   * Formata relatório de uso de EPIs
   */
  formatarRelatorioUso(dados: RelatorioUsoData) {
    const taxaUtilizacao = dados.totalColaboradores > 0 
      ? Math.round((dados.colaboradoresAtivos / dados.totalColaboradores) * 100)
      : 0;

    const mediaItensColaborador = dados.colaboradoresAtivos > 0
      ? Math.round(dados.itensEntregues / dados.colaboradoresAtivos)
      : 0;

    return {
      periodo: dados.periodo,
      resumo: {
        totalColaboradores: dados.totalColaboradores,
        colaboradoresAtivos: dados.colaboradoresAtivos,
        taxaUtilizacao,
        entregasRealizadas: dados.entregasRealizadas,
        devolucoesRealizadas: dados.devolucoesRealizadas,
        itensEntregues: dados.itensEntregues,
        itensDevolvidos: dados.itensDevolvidos,
        mediaItensColaborador,
      },
      detalhes: dados.detalhes,
      dataGeracao: new Date(),
    };
  }

  /**
   * Formata relatório de movimentações
   */
  formatarRelatorioMovimentacoes(dados: RelatorioMovimentacaoData) {
    const saldoLiquido = dados.totalEntradas - dados.totalSaidas;
    
    return {
      periodo: dados.periodo,
      resumo: {
        totalMovimentacoes: dados.totalMovimentacoes,
        totalEntradas: dados.totalEntradas,
        totalSaidas: dados.totalSaidas,
        saldoLiquido,
        valorMovimentado: dados.valorMovimentado,
        variacao: dados.variacao,
      },
      detalhes: dados.detalhes,
      dataGeracao: new Date(),
    };
  }

  /**
   * Formata dados de saúde do sistema
   */
  formatarSaudeSistema(filtros: SaudeSistemaData) {
    const alertas = filtros.incluirAlertas ? [
      {
        tipo: 'ESTOQUE' as const,
        severidade: 'MEDIA' as const,
        titulo: 'Itens com estoque baixo',
        descricao: '5 tipos de EPI estão com estoque abaixo do mínimo',
        dataDeteccao: new Date(),
        resolvido: false,
        acaoRecomendada: 'Revisar níveis de estoque e fazer reposição',
      },
    ] : [];

    const estatisticas = filtros.incluirEstatisticas ? {
      totalUsuarios: SAUDE_SISTEMA.TOTAL_USUARIOS_DEFAULT,
      usuariosAtivos: SAUDE_SISTEMA.USUARIOS_ATIVOS_DEFAULT,
      totalFichas: SAUDE_SISTEMA.TOTAL_FICHAS_DEFAULT,
      fichasAtivas: SAUDE_SISTEMA.FICHAS_ATIVAS_DEFAULT,
      totalEstoque: SAUDE_SISTEMA.TOTAL_ESTOQUE_DEFAULT,
      itensAlerta: SAUDE_SISTEMA.ITENS_ALERTA_DEFAULT,
      operacoesUltimas24h: SAUDE_SISTEMA.OPERACOES_24H_DEFAULT,
    } : {};

    const performance = filtros.incluirPerformance ? {
      tempoMedioResposta: METRICS.TEMPO_MEDIO_RESPOSTA_MS,
      utilizacaoMemoria: METRICS.UTILIZACAO_MEMORIA_PERCENT,
      utilizacaoCpu: METRICS.UTILIZACAO_CPU_PERCENT,
      conexoesBanco: METRICS.CONEXOES_BANCO_DEFAULT,
      operacoesPorMinuto: METRICS.OPERACOES_POR_MINUTO,
    } : undefined;

    return {
      status: 'SAUDAVEL' as const,
      alertas,
      estatisticas,
      performance,
      dataVerificacao: new Date(),
    };
  }

  /**
   * Aplica paginação padrão aos resultados
   */
  aplicarPaginacao<T>(dados: T[], page?: number, limit?: number) {
    const currentPage = page || 1;
    const pageSize = limit || 50;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      data: dados.slice(startIndex, endIndex),
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: dados.length,
        totalPages: Math.ceil(dados.length / pageSize),
        hasNext: endIndex < dados.length,
        hasPrev: currentPage > 1,
      },
    };
  }
}