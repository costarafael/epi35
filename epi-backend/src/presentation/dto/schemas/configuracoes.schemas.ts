import { z } from 'zod';
import { SuccessResponseSchema } from './common.schemas';

// ✅ CONFIGURATION KEY ENUM - Chaves conhecidas do sistema
export const ChaveConfiguracaoSchema = z.enum([
  'PERMITIR_ESTOQUE_NEGATIVO',
  'PERMITIR_AJUSTES_FORCADOS', 
  'ESTOQUE_MINIMO_EQUIPAMENTO',
]);

// ✅ CONFIGURATION TYPE ENUM - Tipos de valores suportados
export const TipoConfiguracaoSchema = z.enum([
  'BOOLEAN',
  'NUMBER',
  'STRING',
]);

// ✅ GET - Obter Configuração Schema
export const ObterConfiguracaoParamsSchema = z.object({
  chave: ChaveConfiguracaoSchema,
});

// ✅ UPDATE - Atualizar Configuração Schema
export const AtualizarConfiguracaoSchema = z.object({
  valor: z.string()
    .min(1, 'Valor é obrigatório')
    .max(1000, 'Valor deve ter no máximo 1000 caracteres')
    .trim(),
  descricao: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .optional(),
});

// ✅ BATCH UPDATE - Atualizar Múltiplas Configurações
export const AtualizarConfiguracoesLoteSchema = z.object({
  configuracoes: z.array(
    z.object({
      chave: ChaveConfiguracaoSchema,
      valor: z.string()
        .min(1, 'Valor é obrigatório')
        .max(1000, 'Valor deve ter no máximo 1000 caracteres')
        .trim(),
      descricao: z.string()
        .max(500, 'Descrição deve ter no máximo 500 caracteres')
        .trim()
        .optional(),
    })
  ).min(1, 'Pelo menos uma configuração deve ser fornecida')
   .max(10, 'Máximo de 10 configurações por lote'),
});

// ✅ BOOLEAN UPDATE - Helper para configurações booleanas
export const AtualizarConfiguracaoBooleanSchema = z.object({
  ativo: z.boolean(),
  descricao: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .optional(),
});

// ✅ NUMBER UPDATE - Helper para configurações numéricas
export const AtualizarConfiguracaoNumericaSchema = z.object({
  valor: z.number()
    .int('Valor deve ser um número inteiro')
    .min(0, 'Valor deve ser positivo ou zero')
    .max(999999, 'Valor deve ser menor que 1.000.000'),
  descricao: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .optional(),
});

// ✅ RESPONSE - Configuração Individual
export const ConfiguracaoOutputSchema = z.object({
  chave: ChaveConfiguracaoSchema,
  valor: z.string(),
  valorParsed: z.union([z.boolean(), z.number(), z.string()]),
  tipo: TipoConfiguracaoSchema,
  descricao: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// ✅ RESPONSE - Lista de Configurações
export const ConfiguracoesListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(ConfiguracaoOutputSchema),
  message: z.string().optional(),
});

// ✅ RESPONSE - Configuração Individual
export const ConfiguracaoResponseSchema = SuccessResponseSchema.extend({
  data: ConfiguracaoOutputSchema,
});

// ✅ RESPONSE - Resultado de Atualização
export const AtualizacaoConfiguracaoResponseSchema = SuccessResponseSchema.extend({
  data: z.object({
    configuracao: ConfiguracaoOutputSchema,
    valorAnterior: z.string(),
  }),
});

// ✅ RESPONSE - Resultado de Atualização em Lote
export const AtualizacaoLoteResponseSchema = SuccessResponseSchema.extend({
  data: z.object({
    configuracoes: z.array(ConfiguracaoOutputSchema),
    totalAtualizadas: z.number(),
    falhas: z.array(z.object({
      chave: z.string(),
      erro: z.string(),
    })).optional(),
  }),
});

// ✅ RESPONSE - Status do Sistema
export const StatusSistemaResponseSchema = SuccessResponseSchema.extend({
  data: z.object({
    configuracoes: z.object({
      permitirEstoqueNegativo: z.boolean(),
      permitirAjustesForcados: z.boolean(),
      estoqueMinimoEquipamento: z.number(),
    }),
    versao: z.string(),
    ambiente: z.string(),
    timestamp: z.date(),
  }),
});

// ✅ TYPE EXPORTS - Single Source of Truth com z.infer
export type ChaveConfiguracao = z.infer<typeof ChaveConfiguracaoSchema>;
export type TipoConfiguracao = z.infer<typeof TipoConfiguracaoSchema>;
export type ObterConfiguracaoParams = z.infer<typeof ObterConfiguracaoParamsSchema>;
export type AtualizarConfiguracaoRequest = z.infer<typeof AtualizarConfiguracaoSchema>;
export type AtualizarConfiguracoesLoteRequest = z.infer<typeof AtualizarConfiguracoesLoteSchema>;
export type AtualizarConfiguracaoBooleanRequest = z.infer<typeof AtualizarConfiguracaoBooleanSchema>;
export type AtualizarConfiguracaoNumericaRequest = z.infer<typeof AtualizarConfiguracaoNumericaSchema>;
export type ConfiguracaoOutput = z.infer<typeof ConfiguracaoOutputSchema>;
export type ConfiguracoesListResponse = z.infer<typeof ConfiguracoesListResponseSchema>;
export type ConfiguracaoResponse = z.infer<typeof ConfiguracaoResponseSchema>;
export type AtualizacaoConfiguracaoResponse = z.infer<typeof AtualizacaoConfiguracaoResponseSchema>;
export type AtualizacaoLoteResponse = z.infer<typeof AtualizacaoLoteResponseSchema>;
export type StatusSistemaResponse = z.infer<typeof StatusSistemaResponseSchema>;

// ✅ CONFIGURATION METADATA - Metadados das configurações conhecidas
export const CONFIGURACAO_METADATA: Record<ChaveConfiguracao, {
  tipo: TipoConfiguracao;
  descricaoPadrao: string;
  valorPadrao: string;
  validacao?: (valor: string) => boolean;
}> = {
  PERMITIR_ESTOQUE_NEGATIVO: {
    tipo: 'BOOLEAN',
    descricaoPadrao: 'Permite que o estoque fique negativo durante operações',
    valorPadrao: 'false',
    validacao: (valor) => valor === 'true' || valor === 'false',
  },
  PERMITIR_AJUSTES_FORCADOS: {
    tipo: 'BOOLEAN', 
    descricaoPadrao: 'Permite ajustes diretos no estoque sem movimentação',
    valorPadrao: 'false',
    validacao: (valor) => valor === 'true' || valor === 'false',
  },
  ESTOQUE_MINIMO_EQUIPAMENTO: {
    tipo: 'NUMBER',
    descricaoPadrao: 'Quantidade mínima em estoque para alertas',
    valorPadrao: '10',
    validacao: (valor) => {
      const num = parseInt(valor, 10);
      return !isNaN(num) && num >= 0 && num <= 999999;
    },
  },
};

// ✅ HELPER FUNCTIONS - Funções utilitárias
export function parseConfigurationValue(
  chave: ChaveConfiguracao,
  valor: string
): boolean | number | string {
  const metadata = CONFIGURACAO_METADATA[chave];
  
  switch (metadata.tipo) {
    case 'BOOLEAN':
      return valor === 'true';
    case 'NUMBER':
      return parseInt(valor, 10);
    case 'STRING':
    default:
      return valor;
  }
}

export function validateConfigurationValue(
  chave: ChaveConfiguracao,
  valor: string
): boolean {
  const metadata = CONFIGURACAO_METADATA[chave];
  return metadata.validacao ? metadata.validacao(valor) : true;
}

export function formatConfigurationValue(
  tipo: TipoConfiguracao,
  valor: boolean | number | string
): string {
  switch (tipo) {
    case 'BOOLEAN':
      return String(valor);
    case 'NUMBER':
      return String(valor);
    case 'STRING':
    default:
      return String(valor);
  }
}