import { z } from 'zod';
import { IdSchema } from './common.schemas';

// Input schemas
export const RelatorioDescartesFiltersSchema = z.object({
  almoxarifadoId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
  contratadaId: IdSchema.optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  responsavelId: IdSchema.optional(),
});

// Output schemas
export const ItemDescarteResponseSchema = z.object({
  id: IdSchema,
  dataDescarte: z.date(),
  almoxarifado: z.object({
    id: IdSchema,
    nome: z.string(),
    unidadeNegocio: z.object({
      nome: z.string(),
      codigo: z.string(),
    }),
  }),
  tipoEpi: z.object({
    id: IdSchema,
    nomeEquipamento: z.string(),
    numeroCa: z.string(),
    vidaUtilDias: z.number(),
  }),
  quantidadeDescartada: z.number(),
  responsavel: z.object({
    id: IdSchema,
    nome: z.string(),
    email: z.string(),
  }),
  notaDescarte: z.object({
    id: IdSchema,
    numeroDocumento: z.string(),
    observacoes: z.string().optional(),
  }).optional(),
  motivoDescarte: z.string().optional(),
  valorUnitario: z.number().optional(),
  valorTotalDescartado: z.number().optional(),
});

export const ResumoDescartesResponseSchema = z.object({
  totalItensDescartados: z.number(),
  quantidadeTotalDescartada: z.number(),
  valorTotalDescartado: z.number(),
  descartesPorAlmoxarifado: z.array(z.object({
    almoxarifadoNome: z.string(),
    quantidadeDescartada: z.number(),
    valorDescartado: z.number(),
  })),
  descartesPorTipoEpi: z.array(z.object({
    tipoEpiNome: z.string(),
    quantidadeDescartada: z.number(),
    valorDescartado: z.number(),
  })),
  descartesPorPeriodo: z.array(z.object({
    mes: z.string(),
    quantidadeDescartada: z.number(),
    valorDescartado: z.number(),
  })),
});

export const RelatorioDescartesResponseSchema = z.object({
  itens: z.array(ItemDescarteResponseSchema),
  resumo: ResumoDescartesResponseSchema,
  dataGeracao: z.date(),
});

export const EstatisticasDescarteResponseSchema = z.object({
  totalDescartes: z.number(),
  valorTotalDescartado: z.number(),
  mediaMensalDescartes: z.number(),
  tipoEpiMaisDescartado: z.object({
    nome: z.string(),
    quantidade: z.number(),
  }).nullable(),
  almoxarifadoComMaisDescartes: z.object({
    nome: z.string(),
    quantidade: z.number(),
  }).nullable(),
  ultimosDescartes: z.array(z.object({
    dataDescarte: z.date(),
    tipoEpiNome: z.string(),
    quantidade: z.number(),
    almoxarifadoNome: z.string(),
  })),
});

// Type exports
export type RelatorioDescartesFilters = z.infer<typeof RelatorioDescartesFiltersSchema>;
export type ItemDescarteResponse = z.infer<typeof ItemDescarteResponseSchema>;
export type ResumoDescartesResponse = z.infer<typeof ResumoDescartesResponseSchema>;
export type RelatorioDescartesResponse = z.infer<typeof RelatorioDescartesResponseSchema>;
export type EstatisticasDescarteResponse = z.infer<typeof EstatisticasDescarteResponseSchema>;