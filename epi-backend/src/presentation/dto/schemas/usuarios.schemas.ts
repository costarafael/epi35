import { z } from 'zod';
import { IdSchema } from './common.schemas';

// ===== SCHEMAS DE LISTAGEM =====

export const ListarUsuariosQuerySchema = z.object({
  nome: z.string().optional(),
  email: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const UsuarioResponseSchema = z.object({
  id: IdSchema,
  nome: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

export const ListarUsuariosResponseSchema = z.object({
  items: z.array(UsuarioResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// ===== SCHEMAS DE CRIAÇÃO =====

export const CriarUsuarioRequestSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  email: z.string().email('Email deve ser válido').max(255),
});

// ===== SCHEMAS DE ATUALIZAÇÃO =====

export const AtualizarUsuarioRequestSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255).optional(),
  email: z.string().email('Email deve ser válido').max(255).optional(),
});

// ===== TYPE EXPORTS =====

export type ListarUsuariosQuery = z.infer<typeof ListarUsuariosQuerySchema>;
export type UsuarioResponse = z.infer<typeof UsuarioResponseSchema>;
export type ListarUsuariosResponse = z.infer<typeof ListarUsuariosResponseSchema>;
export type CriarUsuarioRequest = z.infer<typeof CriarUsuarioRequestSchema>;
export type AtualizarUsuarioRequest = z.infer<typeof AtualizarUsuarioRequestSchema>;