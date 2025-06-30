import { z } from 'zod';

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  PERMITIR_ESTOQUE_NEGATIVO: z.string().transform(Boolean).default('false'),
  PERMITIR_AJUSTES_FORCADOS: z.string().transform(Boolean).default('false'),
  JWT_SECRET: z.string().optional(),
  API_VERSION: z.string().default('v1'),
  CORS_ORIGINS: z.string().default('*'),
  SWAGGER_ENABLED: z.string().transform(Boolean).default('true'),
});

export type EnvironmentConfig = z.infer<typeof environmentSchema>;

export const validateEnvironment = (config: Record<string, unknown>): EnvironmentConfig => {
  const result = environmentSchema.safeParse(config);
  
  if (!result.success) {
    throw new Error(`Environment validation failed: ${result.error.message}`);
  }
  
  return result.data;
};