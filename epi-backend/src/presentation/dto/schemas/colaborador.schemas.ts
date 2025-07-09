import { z } from 'zod';
import { IdSchema } from './common.schemas';

// Schema para validação de CPF
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;

export const CPFSchema = z.string()
  .min(1, 'CPF é obrigatório')
  .transform(val => val.replace(/\D/g, '')) // Remove caracteres não numéricos
  .refine(val => val.length === 11, 'CPF deve ter 11 dígitos')
  .refine(val => {
    // Validação básica de CPF
    if (/^(\d)\1{10}$/.test(val)) return false; // Todos os dígitos iguais
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(val.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(val.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(val.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(val.charAt(10));
  }, 'CPF inválido');

// Schemas de entrada
export const CriarColaboradorSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .transform(val => val.trim()),
  cpf: CPFSchema,
  matricula: z.string()
    .max(50, 'Matrícula deve ter no máximo 50 caracteres')
    .optional()
    .transform(val => val?.trim()),
  cargo: z.string()
    .max(100, 'Cargo deve ter no máximo 100 caracteres')
    .optional()
    .transform(val => val?.trim()),
  setor: z.string()
    .max(100, 'Setor deve ter no máximo 100 caracteres')
    .optional()
    .transform(val => val?.trim()),
  contratadaId: IdSchema, // Obrigatório - colaborador sempre vinculado a contratada
});

export const AtualizarColaboradorSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .transform(val => val.trim())
    .optional(),
  matricula: z.string()
    .max(50, 'Matrícula deve ter no máximo 50 caracteres')
    .optional()
    .transform(val => val?.trim()),
  cargo: z.string()
    .max(100, 'Cargo deve ter no máximo 100 caracteres')
    .optional()
    .transform(val => val?.trim()),
  setor: z.string()
    .max(100, 'Setor deve ter no máximo 100 caracteres')
    .optional()
    .transform(val => val?.trim()),
  ativo: z.boolean().optional(),
});

export const FiltrosColaboradorSchema = z.object({
  nome: z.string().optional(),
  cpf: z.string().optional(),
  contratadaId: IdSchema.optional(),
  cargo: z.string().optional(),
  setor: z.string().optional(),
  ativo: z.boolean().optional(),
  semFicha: z.boolean().optional(), // Filtrar apenas colaboradores sem ficha EPI
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Schemas de resposta
export const ColaboradorResponseSchema = z.object({
  id: IdSchema,
  nome: z.string(),
  cpf: z.string(),
  cpfFormatado: z.string(),
  matricula: z.string().nullable(),
  cargo: z.string().nullable(),
  setor: z.string().nullable(),
  ativo: z.boolean(),
  contratadaId: IdSchema,
  unidadeNegocioId: IdSchema,
  createdAt: z.date(),
  contratada: z.object({
    id: IdSchema,
    nome: z.string(),
    cnpj: z.string(),
  }).optional(),
});

// Types
export type CriarColaboradorRequest = z.infer<typeof CriarColaboradorSchema>;
export type AtualizarColaboradorRequest = z.infer<typeof AtualizarColaboradorSchema>;
export type FiltrosColaborador = z.infer<typeof FiltrosColaboradorSchema>;
export type ColaboradorResponse = z.infer<typeof ColaboradorResponseSchema>;