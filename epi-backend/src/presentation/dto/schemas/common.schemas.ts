import { z } from 'zod';

// Common validation schemas
export const IdSchema = z.string().uuid('ID deve ser um UUID válido');

export const IdParamSchema = z.object({
  id: IdSchema,
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const DateRangeSchema = z.object({
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
}).refine(
  (data) => !data.dataInicio || !data.dataFim || data.dataInicio <= data.dataFim,
  { message: 'Data de início deve ser anterior à data de fim' }
);

export const SearchSchema = z.object({
  busca: z.string().min(1).optional(),
  ativo: z.coerce.boolean().optional(),
});

// Response schemas
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

export const PaginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// Common field validations
export const NomeSchema = z.string().min(1, 'Nome é obrigatório').max(255);
export const CodigoSchema = z.string().min(1, 'Código é obrigatório').max(50);
export const ObservacoesSchema = z.string().max(1000).optional();
export const CPFSchema = z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos');
export const CASchema = z.string().max(20).optional();

// Status enums
export const StatusUsuarioSchema = z.enum(['ATIVO', 'INATIVO', 'BLOQUEADO']);
export const StatusEstoqueItemSchema = z.enum(['DISPONIVEL', 'RESERVADO', 'AGUARDANDO_INSPECAO', 'DESCARTADO']);
export const TipoMovimentacaoSchema = z.enum(['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE', 'DESCARTE', 'ESTORNO']);
export const StatusNotaMovimentacaoSchema = z.enum(['RASCUNHO', 'CONCLUIDA', 'CANCELADA']);
export const TipoNotaMovimentacaoSchema = z.enum(['ENTRADA', 'TRANSFERENCIA', 'DESCARTE', 'AJUSTE']);
export const StatusEntregaSchema = z.enum(['ATIVA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL', 'CANCELADA']);
export const StatusEntregaItemSchema = z.enum(['ENTREGUE', 'DEVOLVIDO', 'PERDIDO', 'DANIFICADO']);
export const StatusFichaEPISchema = z.enum(['ATIVA', 'INATIVA', 'SUSPENSA']);

export type Pagination = z.infer<typeof PaginationSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type Search = z.infer<typeof SearchSchema>;
export type SuccessResponse<T = any> = {
  success: true;
  data: T;
  message?: string;
};
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type PaginatedResponse<T = any> = {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};