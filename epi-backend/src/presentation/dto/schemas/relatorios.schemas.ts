import { z } from 'zod';
import {
  IdSchema,
} from './common.schemas';

// General report filters
export const FiltrosRelatorioGeralSchema = z.object({
  unidadeNegocioId: IdSchema.optional(),
  almoxarifadoId: IdSchema.optional(),
  colaboradorId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
  contratadaId: IdSchema.optional(),
  formato: z.enum(['JSON', 'CSV', 'PDF']).default('JSON'),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

// Dashboard filters
export const FiltrosDashboardSchema = z.object({
  unidadeNegocioId: IdSchema.optional(),
  almoxarifadoId: IdSchema.optional(),
  contratadaId: IdSchema.optional(),
  periodo: z.enum(['ULTIMO_MES', 'ULTIMO_TRIMESTRE', 'ULTIMO_SEMESTRE', 'ULTIMO_ANO']).default('ULTIMO_MES'),
});

// Compliance report filters
export const FiltrosRelatorioConformidadeSchema = z.object({
  unidadeNegocioId: IdSchema.optional(),
  colaboradorId: IdSchema.optional(),
  contratadaId: IdSchema.optional(),
  incluirVencidos: z.coerce.boolean().default(true),
  incluirProximosVencimento: z.coerce.boolean().default(true),
  diasAvisoVencimento: z.number().int().min(1).max(365).default(30),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

// Usage report filters
export const FiltrosRelatorioUsoSchema = z.object({
  colaboradorId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
  unidadeNegocioId: IdSchema.optional(),
  contratadaId: IdSchema.optional(),
  incluirDevolvidos: z.coerce.boolean().default(true),
  incluirPerdidos: z.coerce.boolean().default(false),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

// Movement report filters
export const FiltrosRelatorioMovimentacaoSchema = z.object({
  almoxarifadoId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
  tipoMovimentacao: z.enum(['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE', 'DESCARTE', 'ESTORNO']).optional(),
  usuarioId: IdSchema.optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// System health filters
export const FiltrosSaudesistemaSchema = z.object({
  incluirAlertas: z.coerce.boolean().default(true),
  incluirEstatisticas: z.coerce.boolean().default(true),
  incluirPerformance: z.coerce.boolean().default(false),
});

// Response schemas
export const IndicadorDashboardSchema = z.object({
  titulo: z.string(),
  valor: z.union([z.string(), z.number()]),
  unidade: z.string().optional(),
  variacao: z.object({
    percentual: z.number(),
    tipo: z.enum(['positiva', 'negativa', 'neutra']),
    periodo: z.string(),
  }).optional(),
  meta: z.number().optional(),
  cor: z.enum(['verde', 'amarelo', 'vermelho', 'azul', 'cinza']).optional(),
});

export const DashboardResponseSchema = z.object({
  indicadoresGerais: z.array(IndicadorDashboardSchema),
  estoqueAlertas: z.object({
    totalAlertas: z.number(),
    alertasCriticos: z.number(),
    alertasBaixo: z.number(),
    alertasZero: z.number(),
    itensProblemagicos: z.array(z.object({
      tipoEpiNome: z.string(),
      almoxarifadoNome: z.string(),
      situacao: z.string(),
      saldo: z.number(),
    })),
  }),
  entregasRecentes: z.object({
    totalHoje: z.number(),
    totalSemana: z.number(),
    totalMes: z.number(),
    entregasPendentes: z.number(),
  }),
  vencimentosProximos: z.object({
    vencendoHoje: z.number(),
    vencendo7Dias: z.number(),
    vencendo30Dias: z.number(),
    itensVencendo: z.array(z.object({
      colaboradorNome: z.string(),
      tipoEpiNome: z.string(),
      dataVencimento: z.date(),
      diasRestantes: z.number(),
    })),
  }),
  performance: z.object({
    tempoMedioEntrega: z.number(),
    taxaDevolucaoDanificado: z.number(),
    taxaCumprimentoPrazo: z.number(),
    custoMedioEpi: z.number(),
  }),
  dataAtualizacao: z.date(),
});

export const ItemRelatorioConformidadeSchema = z.object({
  colaboradorId: IdSchema,
  colaboradorNome: z.string(),
  colaboradorMatricula: z.string().optional(),
  unidadeNegocio: z.string(),
  tipoEpiId: IdSchema,
  tipoEpiNome: z.string(),
  tipoEpiCodigo: z.string(),
  possuiFicha: z.boolean(),
  statusFicha: z.string().optional(),
  possuiEntrega: z.boolean(),
  dataUltimaEntrega: z.date().optional(),
  dataVencimento: z.date().optional(),
  diasParaVencimento: z.number().optional(),
  statusConformidade: z.enum(['CONFORME', 'VENCIDO', 'PROXIMO_VENCIMENTO', 'SEM_ENTREGA', 'SEM_FICHA']),
  observacoes: z.string().optional(),
});

export const RelatorioConformidadeResponseSchema = z.object({
  itens: z.array(ItemRelatorioConformidadeSchema),
  resumo: z.object({
    totalColaboradores: z.number(),
    colaboradoresConformes: z.number(),
    colaboradoresVencidos: z.number(),
    colaboradoresProximoVencimento: z.number(),
    colaboradoresSemEntrega: z.number(),
    colaboradoresSemFicha: z.number(),
    percentualConformidade: z.number(),
  }),
  dataGeracao: z.date(),
  parametros: z.object({
    diasAvisoVencimento: z.number(),
    dataInicio: z.date().optional(),
    dataFim: z.date().optional(),
  }),
});

export const ItemRelatorioUsoSchema = z.object({
  colaboradorId: IdSchema,
  colaboradorNome: z.string(),
  tipoEpiId: IdSchema,
  tipoEpiNome: z.string(),
  dataEntrega: z.date(),
  dataDevolucao: z.date().optional(),
  diasUso: z.number(),
  motivoDevolucao: z.string().optional(),
  condicaoItem: z.enum(['BOM', 'DANIFICADO', 'PERDIDO', 'EM_USO']),
  numeroSerie: z.string().optional(),
  lote: z.string().optional(),
  custoEstimado: z.number().optional(),
});

export const RelatorioUsoResponseSchema = z.object({
  itens: z.array(ItemRelatorioUsoSchema),
  estatisticas: z.object({
    totalEntregas: z.number(),
    totalDevolvidos: z.number(),
    totalPerdidos: z.number(),
    totalEmUso: z.number(),
    tempoMedioUso: z.number(),
    taxaPerda: z.number(),
    taxaDanificacao: z.number(),
    custoTotalPerdas: z.number(),
  }),
  dataGeracao: z.date(),
});

export const ItemRelatorioMovimentacaoSchema = z.object({
  id: IdSchema,
  data: z.date(),
  almoxarifadoNome: z.string(),
  tipoEpiNome: z.string(),
  tipoMovimentacao: z.string(),
  quantidade: z.number(),
  saldoAnterior: z.number(),
  saldoPosterior: z.number(),
  usuarioNome: z.string(),
  observacoes: z.string().optional(),
  documento: z.string().optional(),
});

export const RelatorioMovimentacaoResponseSchema = z.object({
  movimentacoes: z.array(ItemRelatorioMovimentacaoSchema),
  resumo: z.object({
    totalMovimentacoes: z.number(),
    totalEntradas: z.number(),
    totalSaidas: z.number(),
    saldoInicialPeriodo: z.number(),
    saldoFinalPeriodo: z.number(),
    variacao: z.number(),
  }),
  dataGeracao: z.date(),
});

export const SaudeSistemaResponseSchema = z.object({
  status: z.enum(['SAUDAVEL', 'ATENCAO', 'CRITICO']),
  alertas: z.array(z.object({
    tipo: z.enum(['ESTOQUE', 'VENCIMENTO', 'SISTEMA', 'USUARIO']),
    severidade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']),
    titulo: z.string(),
    descricao: z.string(),
    dataDeteccao: z.date(),
    resolvido: z.boolean(),
    acaoRecomendada: z.string().optional(),
  })),
  estatisticas: z.object({
    totalUsuarios: z.number(),
    usuariosAtivos: z.number(),
    totalFichas: z.number(),
    fichasAtivas: z.number(),
    totalEstoque: z.number(),
    itensAlerta: z.number(),
    operacoesUltimas24h: z.number(),
  }),
  performance: z.object({
    tempoMedioResposta: z.number(),
    utilizacaoMemoria: z.number(),
    utilizacaoCpu: z.number(),
    conexoesBanco: z.number(),
    operacoesPorMinuto: z.number(),
  }).optional(),
  dataVerificacao: z.date(),
});

export const AuditoriaOperacaoSchema = z.object({
  id: IdSchema,
  data: z.date(),
  usuarioId: IdSchema,
  usuarioNome: z.string(),
  acao: z.string(),
  recurso: z.string(),
  recursoId: z.string().optional(),
  detalhes: z.record(z.any()),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  status: z.enum(['SUCESSO', 'ERRO', 'NEGADO']),
  tempoExecucao: z.number().optional(),
});

export const RelatorioAuditoriaResponseSchema = z.object({
  operacoes: z.array(AuditoriaOperacaoSchema),
  resumo: z.object({
    totalOperacoes: z.number(),
    operacoesSucesso: z.number(),
    operacoesErro: z.number(),
    operacoesNegadas: z.number(),
    usuariosUnicos: z.number(),
    acoesFrequentes: z.array(z.object({
      acao: z.string(),
      quantidade: z.number(),
    })),
  }),
  dataGeracao: z.date(),
});

// Type exports
export type FiltrosRelatorioGeral = z.infer<typeof FiltrosRelatorioGeralSchema>;
export type FiltrosDashboard = z.infer<typeof FiltrosDashboardSchema>;
export type FiltrosRelatorioConformidade = z.infer<typeof FiltrosRelatorioConformidadeSchema>;
export type FiltrosRelatorioUso = z.infer<typeof FiltrosRelatorioUsoSchema>;
export type FiltrosRelatorioMovimentacao = z.infer<typeof FiltrosRelatorioMovimentacaoSchema>;
export type FiltrosSaudesistema = z.infer<typeof FiltrosSaudesistemaSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
export type RelatorioConformidadeResponse = z.infer<typeof RelatorioConformidadeResponseSchema>;
export type RelatorioUsoResponse = z.infer<typeof RelatorioUsoResponseSchema>;
export type RelatorioMovimentacaoResponse = z.infer<typeof RelatorioMovimentacaoResponseSchema>;
export type SaudeSistemaResponse = z.infer<typeof SaudeSistemaResponseSchema>;
export type RelatorioAuditoriaResponse = z.infer<typeof RelatorioAuditoriaResponseSchema>;