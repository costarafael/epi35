import { z } from 'zod';
import {
  IdSchema,
  PaginationSchema,
  ObservacoesSchema,
  SearchSchema,
  StatusFichaEPISchema,
} from './common.schemas';

// EPI Card schemas
export const CriarFichaEpiSchema = z.object({
  colaboradorId: IdSchema,
  tipoEpiId: IdSchema,
  almoxarifadoId: IdSchema,
  status: StatusFichaEPISchema.optional(),
});

export const AtualizarStatusFichaSchema = z.object({
  motivo: z.string().max(500).optional(),
});

export const FiltrosFichaEpiSchema = z.object({
  colaboradorId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
  almoxarifadoId: IdSchema.optional(),
  status: StatusFichaEPISchema.optional(),
  colaboradorNome: z.string().optional(),
  tipoEpiNome: z.string().optional(),
}).merge(SearchSchema).merge(PaginationSchema);

// Delivery schemas
export const ItemEntregaSchema = z.object({
  numeroSerie: z.string().max(50).optional(),
  lote: z.string().max(50).optional(),
  dataFabricacao: z.coerce.date().optional(),
});

export const CriarEntregaSchema = z.object({
  fichaEpiId: IdSchema,
  quantidade: z.number().int().positive('Quantidade deve ser positiva'),
  itens: z.array(ItemEntregaSchema),
  assinaturaColaborador: z.string().optional(),
  observacoes: ObservacoesSchema,
}).refine((data) => data.itens.length === data.quantidade, {
  message: 'Número de itens deve corresponder à quantidade',
});

export const FiltrosEntregasSchema = z.object({
  colaboradorId: IdSchema.optional(),
  fichaEpiId: IdSchema.optional(),
  status: z.enum(['ATIVA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL', 'CANCELADA']).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
}).merge(PaginationSchema);

export const ValidarEntregaSchema = z.object({
  fichaEpiId: IdSchema,
  quantidade: z.number().int().positive(),
});

// Return schemas
export const ItemDevolucaoSchema = z.object({
  itemId: IdSchema,
  motivoDevolucao: z.string().max(500).optional(),
  condicaoItem: z.enum(['BOM', 'DANIFICADO', 'PERDIDO']),
});

export const ProcessarDevolucaoSchema = z.object({
  entregaId: IdSchema,
  itensParaDevolucao: z.array(ItemDevolucaoSchema).min(1, 'Lista de itens para devolução é obrigatória'),
  assinaturaColaborador: z.string().optional(),
  observacoes: ObservacoesSchema,
});

export const CancelarDevolucaoSchema = z.object({
  entregaId: IdSchema,
  itensParaCancelar: z.array(IdSchema).min(1, 'Lista de itens para cancelar devolução é obrigatória'),
  motivo: z.string().min(1, 'Motivo é obrigatório').max(500),
});

export const FiltrosHistoricoDevolucaoSchema = z.object({
  colaboradorId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
}).merge(PaginationSchema);

export const FiltrosPosseAtualSchema = z.object({
  colaboradorId: IdSchema,
  incluirVencidos: z.coerce.boolean().default(false),
  incluirProximosVencimento: z.coerce.boolean().default(true),
});

// Response schemas
export const FichaEpiResponseSchema = z.object({
  id: IdSchema,
  colaboradorId: IdSchema,
  tipoEpiId: IdSchema,
  almoxarifadoId: IdSchema,
  status: StatusFichaEPISchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  colaborador: z.object({
    nome: z.string(),
    cpf: z.string(),
    matricula: z.string().optional(),
  }),
  tipoEpi: z.object({
    nome: z.string(),
    codigo: z.string(),
    exigeAssinaturaEntrega: z.boolean(),
  }),
  almoxarifado: z.object({
    nome: z.string(),
    codigo: z.string(),
  }),
});

export const ItemEntregaResponseSchema = z.object({
  id: IdSchema,
  tipoEpiId: IdSchema,
  quantidadeEntregue: z.number(),
  numeroSerie: z.string().optional(),
  lote: z.string().optional(),
  dataFabricacao: z.date().optional(),
  dataVencimento: z.date().optional(),
  status: z.enum(['ENTREGUE', 'DEVOLVIDO', 'PERDIDO', 'DANIFICADO']),
});

export const EntregaResponseSchema = z.object({
  id: IdSchema,
  fichaEpiId: IdSchema,
  colaboradorId: IdSchema,
  dataEntrega: z.date(),
  dataVencimento: z.date().optional(),
  assinaturaColaborador: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ATIVA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL', 'CANCELADA']),
  itens: z.array(ItemEntregaResponseSchema),
  colaborador: z.object({
    nome: z.string(),
    cpf: z.string(),
    matricula: z.string().optional(),
  }),
  tipoEpi: z.object({
    nome: z.string(),
    codigo: z.string(),
    validadeMeses: z.number().optional(),
    exigeAssinaturaEntrega: z.boolean(),
  }),
  almoxarifado: z.object({
    nome: z.string(),
    codigo: z.string(),
  }),
});

export const ValidacaoEntregaResponseSchema = z.object({
  permitida: z.boolean(),
  motivo: z.string().optional(),
  fichaAtiva: z.boolean(),
  estoqueDisponivel: z.number(),
  posseAtual: z.number(),
});

export const ItemDevolucaoResponseSchema = z.object({
  itemId: IdSchema,
  tipoEpiId: IdSchema,
  numeroSerie: z.string().optional(),
  lote: z.string().optional(),
  statusAnterior: z.string(),
  novoStatus: z.string(),
  motivoDevolucao: z.string().optional(),
  condicaoItem: z.string(),
});

export const DevolucaoResponseSchema = z.object({
  entregaId: IdSchema,
  itensDevolucao: z.array(ItemDevolucaoResponseSchema),
  movimentacoesEstoque: z.array(z.object({
    id: IdSchema,
    tipoEpiId: IdSchema,
    quantidade: z.number(),
    statusEstoque: z.string(),
  })),
  statusEntregaAtualizado: z.string(),
  dataProcessamento: z.date(),
});

export const ValidacaoDevolucaoResponseSchema = z.object({
  permitida: z.boolean(),
  motivo: z.string().optional(),
  itensValidos: z.array(IdSchema),
  itensInvalidos: z.array(z.object({
    itemId: IdSchema,
    motivo: z.string(),
  })),
});

export const CancelamentoDevolucaoResponseSchema = z.object({
  entregaId: IdSchema,
  itensCancelados: z.array(z.object({
    itemId: IdSchema,
    tipoEpiId: IdSchema,
    statusAnterior: z.string(),
    novoStatus: z.string(),
    numeroSerie: z.string().optional(),
    lote: z.string().optional(),
  })),
  movimentacoesEstorno: z.array(z.object({
    id: IdSchema,
    tipoEpiId: IdSchema,
    quantidade: z.number(),
  })),
  statusEntregaAtualizado: z.string(),
  dataCancelamento: z.date(),
});

export const PosseAtualResponseSchema = z.object({
  tipoEpiId: IdSchema,
  tipoEpiNome: z.string(),
  tipoEpiCodigo: z.string(),
  quantidadePosse: z.number(),
  dataUltimaEntrega: z.date(),
  dataVencimento: z.date().optional(),
  diasUso: z.number(),
  status: z.enum(['ATIVO', 'VENCIDO', 'PROXIMO_VENCIMENTO']),
  itensAtivos: z.array(z.object({
    itemId: IdSchema,
    numeroSerie: z.string().optional(),
    lote: z.string().optional(),
    dataEntrega: z.date(),
    dataVencimento: z.date().optional(),
  })),
});

export const HistoricoDevolucaoResponseSchema = z.object({
  devolucoes: z.array(z.object({
    entregaId: IdSchema,
    colaboradorNome: z.string(),
    tipoEpiNome: z.string(),
    dataEntrega: z.date(),
    dataDevolucao: z.date(),
    diasUso: z.number(),
    motivoDevolucao: z.string().optional(),
    condicaoItem: z.string(),
    numeroSerie: z.string().optional(),
    lote: z.string().optional(),
  })),
  estatisticas: z.object({
    totalDevolucoes: z.number(),
    itensEmBomEstado: z.number(),
    itensDanificados: z.number(),
    itensPerdidos: z.number(),
    tempoMedioUso: z.number(),
  }),
});

export const EstatisticasFichasResponseSchema = z.object({
  totalFichas: z.number(),
  fichasAtivas: z.number(),
  fichasInativas: z.number(),
  fichasSuspensas: z.number(),
  porTipoEpi: z.array(z.object({
    tipoEpiNome: z.string(),
    quantidade: z.number(),
  })),
  porColaborador: z.array(z.object({
    colaboradorNome: z.string(),
    quantidade: z.number(),
  })),
});

// Type exports
export type CriarFichaEpiRequest = z.infer<typeof CriarFichaEpiSchema>;
export type AtualizarStatusFichaRequest = z.infer<typeof AtualizarStatusFichaSchema>;
export type FiltrosFichaEpi = z.infer<typeof FiltrosFichaEpiSchema>;
export type CriarEntregaRequest = z.infer<typeof CriarEntregaSchema>;
export type FiltrosEntregas = z.infer<typeof FiltrosEntregasSchema>;
export type ValidarEntregaRequest = z.infer<typeof ValidarEntregaSchema>;
export type ProcessarDevolucaoRequest = z.infer<typeof ProcessarDevolucaoSchema>;
export type CancelarDevolucaoRequest = z.infer<typeof CancelarDevolucaoSchema>;
export type FiltrosHistoricoDevolucao = z.infer<typeof FiltrosHistoricoDevolucaoSchema>;
export type FiltrosPosseAtual = z.infer<typeof FiltrosPosseAtualSchema>;
export type FichaEpiResponse = z.infer<typeof FichaEpiResponseSchema>;
export type EntregaResponse = z.infer<typeof EntregaResponseSchema>;
export type ValidacaoEntregaResponse = z.infer<typeof ValidacaoEntregaResponseSchema>;
export type DevolucaoResponse = z.infer<typeof DevolucaoResponseSchema>;
export type ValidacaoDevolucaoResponse = z.infer<typeof ValidacaoDevolucaoResponseSchema>;
export type CancelamentoDevolucaoResponse = z.infer<typeof CancelamentoDevolucaoResponseSchema>;
export type PosseAtualResponse = z.infer<typeof PosseAtualResponseSchema>;
export type HistoricoDevolucaoResponse = z.infer<typeof HistoricoDevolucaoResponseSchema>;
export type EstatisticasFichasResponse = z.infer<typeof EstatisticasFichasResponseSchema>;