import { z } from 'zod';
import {
  IdSchema,
  TipoNotaMovimentacaoSchema,
  StatusNotaMovimentacaoSchema,
  ObservacoesSchema,
} from './common.schemas';

// Request schemas
export const CriarNotaMovimentacaoSchema = z.object({
  tipo: TipoNotaMovimentacaoSchema,
  almoxarifadoOrigemId: IdSchema.optional(),
  almoxarifadoDestinoId: IdSchema.optional(),
  observacoes: ObservacoesSchema,
}).refine((data) => {
  // Validações específicas por tipo
  switch (data.tipo) {
    case 'ENTRADA':
      return data.almoxarifadoDestinoId && !data.almoxarifadoOrigemId;
    case 'TRANSFERENCIA':
      return data.almoxarifadoOrigemId && data.almoxarifadoDestinoId && 
             data.almoxarifadoOrigemId !== data.almoxarifadoDestinoId;
    case 'DESCARTE':
      return data.almoxarifadoOrigemId && !data.almoxarifadoDestinoId;
    case 'AJUSTE':
      return data.almoxarifadoDestinoId;
    default:
      return false;
  }
}, {
  message: 'Almoxarifados obrigatórios não informados ou configuração inválida para o tipo de nota',
});

export const AdicionarItemNotaSchema = z.object({
  tipoEpiId: IdSchema,
  quantidade: z.number().int().positive('Quantidade deve ser positiva'),
  observacoes: ObservacoesSchema,
});

export const AtualizarQuantidadeItemSchema = z.object({
  tipoEpiId: IdSchema,
  quantidade: z.number().int().positive('Quantidade deve ser positiva'),
});

export const AtualizarNotaSchema = z.object({
  observacoes: ObservacoesSchema,
});

export const ConcluirNotaSchema = z.object({
  validarEstoque: z.boolean().default(true),
});

export const CancelarNotaSchema = z.object({
  motivo: z.string().min(1, 'Motivo é obrigatório').max(500),
  gerarEstorno: z.boolean().default(true),
});

export const FiltrosNotaMovimentacaoSchema = z.object({
  numero: z.string().optional(),
  tipo: TipoNotaMovimentacaoSchema.optional(),
  status: StatusNotaMovimentacaoSchema.optional(),
  almoxarifadoOrigemId: IdSchema.optional(),
  almoxarifadoDestinoId: IdSchema.optional(),
  usuarioId: IdSchema.optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Response schemas
export const NotaMovimentacaoItemResponseSchema = z.object({
  id: IdSchema,
  tipoEpiId: IdSchema,
  quantidade: z.number(),
  quantidadeProcessada: z.number(),
  observacoes: z.string().nullable(),
  tipoEpi: z.object({
    nome: z.string(),
    codigo: z.string(),
  }),
});

export const NotaMovimentacaoResponseSchema = z.object({
  id: IdSchema,
  numero: z.string(),
  tipo: TipoNotaMovimentacaoSchema,
  almoxarifadoOrigemId: z.string().nullable(),
  almoxarifadoDestinoId: z.string().nullable(),
  usuarioId: IdSchema,
  observacoes: z.string().nullable(),
  status: StatusNotaMovimentacaoSchema,
  dataConclusao: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  itens: z.array(NotaMovimentacaoItemResponseSchema).optional(),
  almoxarifadoOrigem: z.object({
    nome: z.string(),
    codigo: z.string(),
  }).nullable().optional(),
  almoxarifadoDestino: z.object({
    nome: z.string(),
    codigo: z.string(),
  }).nullable().optional(),
  usuario: z.object({
    nome: z.string(),
    email: z.string(),
  }).optional(),
});

export const ProcessamentoNotaResponseSchema = z.object({
  notaConcluida: NotaMovimentacaoResponseSchema,
  movimentacoesCriadas: z.array(z.object({
    id: IdSchema,
    tipoEpiId: IdSchema,
    quantidade: z.number(),
    saldoAnterior: z.number(),
    saldoPosterior: z.number(),
  })),
  itensProcessados: z.array(z.object({
    tipoEpiId: IdSchema,
    quantidade: z.number(),
    movimentacaoCreated: z.boolean(),
    estoqueAtualizado: z.boolean(),
  })),
});

export const CancelamentoNotaResponseSchema = z.object({
  notaCancelada: NotaMovimentacaoResponseSchema,
  estornosGerados: z.array(z.object({
    movimentacaoOriginalId: IdSchema,
    movimentacaoEstornoId: IdSchema,
    tipoEpiId: IdSchema,
    quantidade: z.number(),
    saldoAnterior: z.number(),
    saldoPosterior: z.number(),
  })),
  estoqueAjustado: z.boolean(),
});

export const ResumoNotaMovimentacaoSchema = z.object({
  id: IdSchema,
  numero: z.string(),
  tipo: TipoNotaMovimentacaoSchema,
  status: StatusNotaMovimentacaoSchema,
  responsavel_nome: z.string(),
  almoxarifado_nome: z.string(),
  total_itens: z.number(),
  valor_total: z.number().nullable(),
  data_documento: z.string(),
  observacoes: z.string().nullable(),
});

export const FiltrosResumoNotaMovimentacaoSchema = z.object({
  numero: z.string().optional(),
  tipo: TipoNotaMovimentacaoSchema.optional(),
  status: StatusNotaMovimentacaoSchema.optional(),
  almoxarifadoId: z.string().min(1).optional(),
  usuarioId: z.string().min(1).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
}).strict(false);

// Type exports
export type CriarNotaMovimentacaoRequest = z.infer<typeof CriarNotaMovimentacaoSchema>;
export type AdicionarItemNotaRequest = z.infer<typeof AdicionarItemNotaSchema>;
export type AtualizarQuantidadeItemRequest = z.infer<typeof AtualizarQuantidadeItemSchema>;
export type AtualizarNotaRequest = z.infer<typeof AtualizarNotaSchema>;
export type ConcluirNotaRequest = z.infer<typeof ConcluirNotaSchema>;
export type CancelarNotaRequest = z.infer<typeof CancelarNotaSchema>;
export type FiltrosNotaMovimentacao = z.infer<typeof FiltrosNotaMovimentacaoSchema>;
export type NotaMovimentacaoResponse = z.infer<typeof NotaMovimentacaoResponseSchema>;
export type ProcessamentoNotaResponse = z.infer<typeof ProcessamentoNotaResponseSchema>;
export type CancelamentoNotaResponse = z.infer<typeof CancelamentoNotaResponseSchema>;
export type ResumoNotaMovimentacao = z.infer<typeof ResumoNotaMovimentacaoSchema>;
export type FiltrosResumoNotaMovimentacao = z.infer<typeof FiltrosResumoNotaMovimentacaoSchema>;