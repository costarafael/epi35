/**
 * System-wide constants for the EPI Management Module
 * 
 * This file centralizes all magic numbers and configuration values
 * used throughout the application to improve maintainability.
 */

export const SYSTEM_CONSTANTS = {
  // Performance Monitoring
  PERFORMANCE: {
    TEMPO_MEDIO_ENTREGA_DEFAULT: 2.5,
    TAXA_DEVOLUCAO_DANIFICADO_DEFAULT: 5.2,
    TAXA_CUMPRIMENTO_PRAZO_DEFAULT: 98.5,
    CUSTO_MEDIO_EPI_DEFAULT: 125.80,
  },

  // Report Configuration
  RELATORIOS: {
    MAX_ITEMS_DASHBOARD: 10,
    DIAS_VENCIMENTO_PROXIMO: 7,
    DIAS_VENCIMENTO_ALERT: 30,
  },

  // Pagination Defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 100,
    MAX_PAGE_SIZE: 1000,
  },

  // Stock Management
  ESTOQUE: {
    QUANTIDADE_UNITARIA: 1, // For unit tracking
    QUANTIDADE_MINIMA_POSITIVA: 0,
  },

  // Performance Metrics
  METRICS: {
    TEMPO_MEDIO_RESPOSTA_MS: 125,
    UTILIZACAO_MEMORIA_PERCENT: 65,
    UTILIZACAO_CPU_PERCENT: 25,
    CONEXOES_BANCO_DEFAULT: 8,
    OPERACOES_POR_MINUTO: 12,
  },

  // Dashboard Health Check
  SAUDE_SISTEMA: {
    TOTAL_USUARIOS_DEFAULT: 25,
    USUARIOS_ATIVOS_DEFAULT: 18,
    TOTAL_FICHAS_DEFAULT: 150,
    FICHAS_ATIVAS_DEFAULT: 142,
    TOTAL_ESTOQUE_DEFAULT: 1250,
    ITENS_ALERTA_DEFAULT: 5,
    OPERACOES_24H_DEFAULT: 45,
  },

  // Date Calculations
  DATES: {
    MILLISECONDS_PER_DAY: 1000 * 60 * 60 * 24,
    DIAS_SEMANA: 7,
    DIAS_VENCIMENTO_PROXIMO: 30,
  },
} as const;

// Export individual constants for easier imports
export const { PERFORMANCE, RELATORIOS, PAGINATION, ESTOQUE, METRICS, SAUDE_SISTEMA, DATES } = SYSTEM_CONSTANTS;