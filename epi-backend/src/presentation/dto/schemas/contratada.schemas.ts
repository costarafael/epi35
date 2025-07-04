import { z } from 'zod';

// Schema para validação de CNPJ
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;

export const CNPJSchema = z.string()
  .min(1, 'CNPJ é obrigatório')
  .transform(val => val.replace(/\D/g, '')) // Remove caracteres não numéricos
  .refine(val => val.length === 14, 'CNPJ deve ter 14 dígitos')
  .refine(val => {
    // Validação básica de CNPJ
    if (/^(\d)\1{13}$/.test(val)) return false; // Todos os dígitos iguais
    
    // Validação dos dígitos verificadores
    let sum = 0;
    let multiplier = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(val.charAt(i)) * multiplier;
      multiplier--;
      if (multiplier < 2) multiplier = 9;
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (digit1 !== parseInt(val.charAt(12))) return false;
    
    sum = 0;
    multiplier = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(val.charAt(i)) * multiplier;
      multiplier--;
      if (multiplier < 2) multiplier = 9;
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return digit2 === parseInt(val.charAt(13));
  }, 'CNPJ inválido');

// Schemas de entrada
export const CriarContratadaSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .transform(val => val.trim()),
  cnpj: CNPJSchema,
});

export const AtualizarContratadaSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .transform(val => val.trim())
    .optional(),
  cnpj: CNPJSchema.optional(),
}).refine(data => data.nome !== undefined || data.cnpj !== undefined, {
  message: 'É necessário informar pelo menos um campo para atualização',
});

export const FiltrosContratadaSchema = z.object({
  nome: z.string().optional(),
  cnpj: z.string()
    .transform(val => val.replace(/\D/g, ''))
    .optional(),
});

export const BuscarContratadaSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório para busca')
    .transform(val => val.trim()),
});

// Schemas de saída
export const ContratadaOutputSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  cnpj: z.string(),
  cnpjFormatado: z.string(),
  createdAt: z.date(),
});

export const ContratadaListOutputSchema = z.object({
  contratadas: z.array(ContratadaOutputSchema),
  total: z.number(),
});

export const ContratadaEstatisticasSchema = z.object({
  total: z.number(),
  colaboradoresVinculados: z.number(),
  colaboradoresSemContratada: z.number(),
  topContratadas: z.array(z.object({
    contratada: z.object({
      id: z.string().uuid(),
      nome: z.string(),
      cnpjFormatado: z.string(),
    }),
    totalColaboradores: z.number(),
  })),
});

// Types inferidos dos schemas
export type CriarContratadaRequest = z.infer<typeof CriarContratadaSchema>;
export type AtualizarContratadaRequest = z.infer<typeof AtualizarContratadaSchema>;
export type FiltrosContratada = z.infer<typeof FiltrosContratadaSchema>;
export type BuscarContratada = z.infer<typeof BuscarContratadaSchema>;
export type ContratadaOutput = z.infer<typeof ContratadaOutputSchema>;
export type ContratadaListOutput = z.infer<typeof ContratadaListOutputSchema>;
export type ContratadaEstatisticas = z.infer<typeof ContratadaEstatisticasSchema>;