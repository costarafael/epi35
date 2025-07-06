import { Injectable } from '@nestjs/common';
import { CATEGORIA_EPI_LABELS } from '../../domain/enums/categoria-epi.enum';
import { RELATORIOS } from '../constants/system.constants';
import { FiltrosDashboard } from '../../presentation/dto/schemas/relatorios.schemas';

export interface DashboardData {
  relatorioEstoque: any;
  estatisticasFichas: any;
  entregasRecentes: any;
  vencimentosProximos: any;
  episPorCategoria: any;
  filtros: FiltrosDashboard;
  dataInicio: Date;
  dataFim: Date;
}

export interface DashboardOutput {
  indicadoresGerais: Array<{
    titulo: string;
    valor: string | number;
    unidade?: string;
    variacao?: {
      percentual: number;
      tipo: 'positiva' | 'negativa';
      periodo: string;
    };
    cor: 'azul' | 'verde' | 'amarelo' | 'vermelho';
  }>;
  estoqueAlertas: {
    totalAlertas: number;
    alertasCriticos: number;
    alertasBaixo: number;
    alertasZero: number;
    itensProblemagicos: Array<{
      tipoEpiNome: string;
      almoxarifadoNome: string;
      situacao: string;
      saldo: number;
    }>;
  };
  entregasRecentes: any;
  vencimentosProximos: any;
  episPorCategoria: {
    totalCategorias: number;
    categorias: Array<{
      categoria: string;
      nomeCategoria: string;
      tiposAtivos: number;
      estoqueDisponivel: number;
      totalItens: number;
      percentualDisponivel: number;
    }>;
    resumo: {
      totalTiposAtivos: number;
      totalEstoqueDisponivel: number;
      totalItens: number;
      categoriaComMaiorEstoque: string | null;
    };
  };
  dataAtualizacao: Date;
}

@Injectable()
export class DashboardFormatterService {
  /**
   * Calcula período de análise baseado nos filtros
   */
  calcularPeriodoAnalise(filtros: FiltrosDashboard): { dataInicio: Date; dataFim: Date } {
    const dataFim = new Date();
    const dataInicio = new Date();
    
    switch (filtros.periodo) {
      case 'ULTIMO_MES':
        dataInicio.setMonth(dataInicio.getMonth() - 1);
        break;
      case 'ULTIMO_TRIMESTRE':
        dataInicio.setMonth(dataInicio.getMonth() - 3);
        break;
      case 'ULTIMO_SEMESTRE':
        dataInicio.setMonth(dataInicio.getMonth() - 6);
        break;
      case 'ULTIMO_ANO':
        dataInicio.setFullYear(dataInicio.getFullYear() - 1);
        break;
    }

    return { dataInicio, dataFim };
  }

  /**
   * Formata dados completos do dashboard
   */
  formatarDashboard(dados: DashboardData): DashboardOutput {
    return {
      indicadoresGerais: this.formatarIndicadoresGerais(
        dados.estatisticasFichas, 
        dados.relatorioEstoque
      ),
      estoqueAlertas: this.formatarAlertas(dados.relatorioEstoque),
      entregasRecentes: dados.entregasRecentes,
      vencimentosProximos: dados.vencimentosProximos,
      episPorCategoria: this.formatarEpisPorCategoria(dados.episPorCategoria),
      dataAtualizacao: new Date(),
    };
  }

  /**
   * Formata indicadores gerais (métricas principais)
   */
  private formatarIndicadoresGerais(estatisticasFichas: any, relatorioEstoque: any) {
    return [
      {
        titulo: 'Total de Fichas',
        valor: estatisticasFichas.totalFichas,
        unidade: 'fichas',
        cor: 'azul' as const,
      },
      {
        titulo: 'Fichas Ativas',
        valor: estatisticasFichas.fichasAtivas,
        unidade: 'fichas',
        variacao: {
          percentual: estatisticasFichas.totalFichas > 0 
            ? Math.round((estatisticasFichas.fichasAtivas / estatisticasFichas.totalFichas) * 100)
            : 0,
          tipo: 'positiva' as const,
          periodo: 'do total',
        },
        cor: 'verde' as const,
      },
      {
        titulo: 'Itens em Estoque',
        valor: relatorioEstoque.resumo.totalItens,
        unidade: 'itens',
        cor: 'azul' as const,
      },
      {
        titulo: 'Valor Total Estoque',
        valor: `R$ ${relatorioEstoque.resumo.valorTotalEstoque.toLocaleString()}`,
        cor: 'verde' as const,
      },
    ];
  }

  /**
   * Formata alertas de estoque
   */
  private formatarAlertas(relatorioEstoque: any) {
    return {
      totalAlertas: relatorioEstoque.resumo.itensBaixoEstoque + 
        relatorioEstoque.resumo.itensSemEstoque,
      alertasCriticos: 0, // Removido status CRÍTICO
      alertasBaixo: relatorioEstoque.resumo.itensBaixoEstoque,
      alertasZero: relatorioEstoque.resumo.itensSemEstoque,
      itensProblemagicos: relatorioEstoque.itens
        .filter((item: any) => ['BAIXO', 'ZERO'].includes(item.situacao))
        .slice(0, RELATORIOS.MAX_ITEMS_DASHBOARD)
        .map((item: any) => ({
          tipoEpiNome: item.tipoEpiNome,
          almoxarifadoNome: item.almoxarifadoNome,
          situacao: item.situacao,
          saldo: item.saldoTotal,
        })),
    };
  }

  /**
   * Formata estatísticas de EPIs por categoria
   */
  private formatarEpisPorCategoria(episPorCategoria: any[]) {
    const categorias = episPorCategoria.map(item => ({
      categoria: item.categoria,
      nomeCategoria: CATEGORIA_EPI_LABELS[item.categoria],
      tiposAtivos: item.tiposAtivos,
      estoqueDisponivel: item.estoqueDisponivel,
      totalItens: item.totalItens,
      percentualDisponivel: item.totalItens > 0 
        ? Math.round((item.estoqueDisponivel / item.totalItens) * 100)
        : 0,
    }));

    const resumo = {
      totalTiposAtivos: episPorCategoria.reduce((sum, item) => sum + item.tiposAtivos, 0),
      totalEstoqueDisponivel: episPorCategoria.reduce((sum, item) => sum + item.estoqueDisponivel, 0),
      totalItens: episPorCategoria.reduce((sum, item) => sum + item.totalItens, 0),
      categoriaComMaiorEstoque: episPorCategoria.length > 0 
        ? episPorCategoria.reduce((prev, current) => 
            (current.estoqueDisponivel > prev.estoqueDisponivel) ? current : prev, 
            episPorCategoria[0]
          ).categoria
        : null,
    };

    return {
      totalCategorias: episPorCategoria.length,
      categorias,
      resumo,
    };
  }
}