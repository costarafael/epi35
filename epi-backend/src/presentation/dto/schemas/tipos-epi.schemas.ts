import { z } from 'zod';
import {
  IdSchema,
  PaginationSchema,
  SearchSchema,
  SuccessResponseSchema,
} from './common.schemas';

// Enum for EPI Category (matching domain enum)
export const CategoriaEPISchema = z.enum([
  'PROTECAO_CABECA',
  'PROTECAO_OLHOS_ROSTO',
  'PROTECAO_OUVIDOS',
  'PROTECAO_MAOS_BRACCOS',
  'PROTECAO_PES',
  'PROTECAO_RESPIRATORIA',
  'PROTECAO_CLIMATICA',
  'ROUPA_APROXIMACAO',
]);

// Status for EPI Type
export const StatusTipoEPISchema = z.enum(['ATIVO', 'DESCONTINUADO']);

// ✅ CREATE - Criar Tipo EPI Schema
export const CriarTipoEpiSchema = z.object({
  nomeEquipamento: z.string()
    .min(1, 'Nome do equipamento é obrigatório')
    .max(200, 'Nome do equipamento deve ter no máximo 200 caracteres')
    .trim(),
  numeroCa: z.string()
    .min(1, 'Número CA é obrigatório')
    .max(20, 'Número CA deve ter no máximo 20 caracteres')
    .trim(),
  categoria: CategoriaEPISchema,
  descricao: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .trim()
    .optional(),
  vidaUtilDias: z.number()
    .int('Vida útil deve ser um número inteiro')
    .positive('Vida útil deve ser positiva')
    .max(3650, 'Vida útil não pode exceder 10 anos (3650 dias)')
    .optional(),
  status: StatusTipoEPISchema.optional().default('ATIVO'),
});

// ✅ UPDATE - Atualizar Tipo EPI Schema
export const AtualizarTipoEpiSchema = z.object({
  nomeEquipamento: z.string()
    .min(1, 'Nome do equipamento é obrigatório')
    .max(200, 'Nome do equipamento deve ter no máximo 200 caracteres')
    .trim()
    .optional(),
  numeroCa: z.string()
    .min(1, 'Número CA é obrigatório')
    .max(20, 'Número CA deve ter no máximo 20 caracteres')
    .trim()
    .optional(),
  categoria: CategoriaEPISchema.optional(),
  descricao: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .trim()
    .optional()
    .nullable(),
  vidaUtilDias: z.number()
    .int('Vida útil deve ser um número inteiro')
    .positive('Vida útil deve ser positiva')
    .max(3650, 'Vida útil não pode exceder 10 anos (3650 dias)')
    .optional()
    .nullable(),
  status: StatusTipoEPISchema.optional(),
});

// ✅ LIST - Filtros para Listar Tipos EPI
export const FiltrosTiposEpiSchema = z.object({
  ativo: z.coerce.boolean().optional(),
  categoria: CategoriaEPISchema.optional(),
  status: StatusTipoEPISchema.optional(),
  busca: z.string()
    .max(100, 'Busca deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
}).merge(SearchSchema).merge(PaginationSchema);

// ✅ RESPONSE - Tipo EPI Output Schema
export const TipoEpiOutputSchema = z.object({
  id: IdSchema,
  nomeEquipamento: z.string(),
  numeroCa: z.string(),
  categoria: CategoriaEPISchema,
  descricao: z.string().nullable(),
  vidaUtilDias: z.number().nullable(),
  status: StatusTipoEPISchema,
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// ✅ RESPONSE - Lista Paginada de Tipos EPI
export const TiposEpiListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(TipoEpiOutputSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  }),
  message: z.string().optional(),
});

// ✅ RESPONSE - Tipo EPI Individual
export const TipoEpiResponseSchema = SuccessResponseSchema.extend({
  data: TipoEpiOutputSchema,
});

// ✅ STATISTICS - Estatísticas de Tipos EPI
export const EstatisticasTiposEpiSchema = z.object({
  totalFichas: z.number(),
  fichasAtivas: z.number(),
  totalEstoque: z.number(),
  estoqueDisponivel: z.number(),
  totalEntregas: z.number(),
  entregasAtivas: z.number(),
});

export const EstatisticasPorCategoriaSchema = z.object({
  categoria: CategoriaEPISchema,
  tiposAtivos: z.number(),
  estoqueDisponivel: z.number(),
  totalItens: z.number(),
});

export const EstatisticasTiposEpiResponseSchema = SuccessResponseSchema.extend({
  data: EstatisticasTiposEpiSchema,
});

export const EstatisticasPorCategoriaResponseSchema = SuccessResponseSchema.extend({
  data: z.array(EstatisticasPorCategoriaSchema),
});

// ✅ STATUS MANAGEMENT - Ativar/Inativar Tipo EPI
export const AlterarStatusTipoEpiSchema = z.object({
  motivo: z.string()
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .trim()
    .optional(),
});

// ✅ TYPE EXPORTS - Single Source of Truth with z.infer
export type CriarTipoEpiRequest = z.infer<typeof CriarTipoEpiSchema>;
export type AtualizarTipoEpiRequest = z.infer<typeof AtualizarTipoEpiSchema>;
export type FiltrosTiposEpi = z.infer<typeof FiltrosTiposEpiSchema>;
export type TipoEpiOutput = z.infer<typeof TipoEpiOutputSchema>;
export type TiposEpiListResponse = z.infer<typeof TiposEpiListResponseSchema>;
export type TipoEpiResponse = z.infer<typeof TipoEpiResponseSchema>;
export type EstatisticasTiposEpi = z.infer<typeof EstatisticasTiposEpiSchema>;
export type EstatisticasPorCategoria = z.infer<typeof EstatisticasPorCategoriaSchema>;
export type EstatisticasTiposEpiResponse = z.infer<typeof EstatisticasTiposEpiResponseSchema>;
export type EstatisticasPorCategoriaResponse = z.infer<typeof EstatisticasPorCategoriaResponseSchema>;
export type AlterarStatusTipoEpiRequest = z.infer<typeof AlterarStatusTipoEpiSchema>;
export type CategoriaEPI = z.infer<typeof CategoriaEPISchema>;
export type StatusTipoEPI = z.infer<typeof StatusTipoEPISchema>;

// ✅ USE CASE TYPES - Compatibility with existing use case
export type CriarTipoEpiInput = CriarTipoEpiRequest;
export type TipoEpiUseCase = TipoEpiOutput;