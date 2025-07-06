import { z } from 'zod';
import {
  IdSchema,
  ObservacoesSchema,
} from './common.schemas';

// Stock position filters
export const FiltrosEstoqueSchema = z.object({
  almoxarifadoId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
  unidadeNegocioId: IdSchema.optional(),
  apenasComSaldo: z.coerce.boolean().default(false),
  apenasAbaixoMinimo: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Direct adjustment schemas
export const AjusteDirectoSchema = z.object({
  almoxarifadoId: IdSchema,
  tipoEpiId: IdSchema,
  novaQuantidade: z.number().int().min(0, 'Quantidade não pode ser negativa'),
  motivo: z.string().min(1, 'Motivo é obrigatório').max(500),
  validarPermissao: z.boolean().default(true),
});

export const ItemInventarioSchema = z.object({
  tipoEpiId: IdSchema,
  quantidadeContada: z.number().int().min(0, 'Quantidade não pode ser negativa'),
  motivo: z.string().max(500).optional(),
});

export const InventarioSchema = z.object({
  almoxarifadoId: IdSchema,
  ajustes: z.array(ItemInventarioSchema).min(1, 'Lista de ajustes não pode estar vazia'),
  observacoes: ObservacoesSchema,
});

export const SimulacaoAjusteSchema = z.object({
  almoxarifadoId: IdSchema,
  tipoEpiId: IdSchema,
  novaQuantidade: z.number().int().min(0, 'Quantidade não pode ser negativa'),
});

export const FiltrosHistoricoAjustesSchema = z.object({
  almoxarifadoId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const ContagemInventarioSchema = z.object({
  tipoEpiId: IdSchema,
  quantidadeContada: z.number().int().min(0),
});

export const ValidacaoDivergenciasSchema = z.object({
  almoxarifadoId: IdSchema,
  contagens: z.array(ContagemInventarioSchema).min(1, 'Lista de contagens não pode estar vazia'),
});

// Kardex filters
export const FiltrosKardexSchema = z.object({
  almoxarifadoId: IdSchema,
  tipoEpiId: IdSchema,
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
});

export const FiltrosAnaliseGiroSchema = z.object({
  almoxarifadoId: IdSchema.optional(),
  periodo: z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']).default('TRIMESTRAL'),
});

// Response schemas
export const ItemPosicaoEstoqueResponseSchema = z.object({
  tipoEpiId: IdSchema,
  tipoEpiNome: z.string(),
  tipoEpiCodigo: z.string(),
  almoxarifadoId: IdSchema,
  almoxarifadoNome: z.string(),
  almoxarifadoCodigo: z.string(),
  unidadeNegocioNome: z.string(),
  saldoDisponivel: z.number(),
  saldoReservado: z.number(),
  saldoAguardandoInspecao: z.number(),
  saldoTotal: z.number(),
  valorUnitario: z.number().optional(),
  valorTotal: z.number().optional(),
  estoqueMinimo: z.number().optional(),
  situacao: z.enum(['NORMAL', 'BAIXO', 'ZERO']),
  diasEstoque: z.number().optional(),
  ultimaMovimentacao: z.date().optional(),
});

export const ResumoEstoqueResponseSchema = z.object({
  totalItens: z.number(),
  valorTotalEstoque: z.number(),
  itensBaixoEstoque: z.number(),
  itensEstoqueCritico: z.number(),
  itensSemEstoque: z.number(),
  porAlmoxarifado: z.array(z.object({
    almoxarifadoNome: z.string(),
    totalItens: z.number(),
    valorTotal: z.number(),
  })),
  porTipoEpi: z.array(z.object({
    tipoEpiNome: z.string(),
    quantidadeTotal: z.number(),
    valorTotal: z.number(),
  })),
});

export const RelatorioEstoqueResponseSchema = z.object({
  itens: z.array(ItemPosicaoEstoqueResponseSchema),
  resumo: ResumoEstoqueResponseSchema,
  dataGeracao: z.date(),
});

export const ResultadoAjusteResponseSchema = z.object({
  movimentacaoId: IdSchema,
  tipoEpiId: IdSchema,
  saldoAnterior: z.number(),
  saldoPosterior: z.number(),
  diferenca: z.number(),
  observacoes: z.string(),
});

export const ResultadoInventarioResponseSchema = z.object({
  ajustesRealizados: z.array(ResultadoAjusteResponseSchema),
  totalItensProcessados: z.number(),
  totalAjustesPositivos: z.number(),
  totalAjustesNegativos: z.number(),
  valorTotalAjustes: z.number(),
});

export const SimulacaoAjusteResponseSchema = z.object({
  saldoAtual: z.number(),
  novaQuantidade: z.number(),
  diferenca: z.number(),
  tipoAjuste: z.enum(['positivo', 'negativo', 'neutro']),
  impactoFinanceiro: z.number().optional(),
});

export const ItemHistoricoAjusteResponseSchema = z.object({
  id: IdSchema,
  data: z.date(),
  almoxarifadoId: IdSchema,
  tipoEpiId: IdSchema,
  quantidade: z.number(),
  saldoAnterior: z.number(),
  saldoPosterior: z.number(),
  diferenca: z.number(),
  usuarioId: IdSchema,
  observacoes: z.string(),
});

export const HistoricoAjustesResponseSchema = z.object({
  ajustes: z.array(ItemHistoricoAjusteResponseSchema),
  resumo: z.object({
    totalAjustes: z.number(),
    ajustesPositivos: z.number(),
    ajustesNegativos: z.number(),
    somaAjustesPositivos: z.number(),
    somaAjustesNegativos: z.number(),
  }),
});

export const DivergenciaInventarioResponseSchema = z.object({
  tipoEpiId: IdSchema,
  saldoSistema: z.number(),
  quantidadeContada: z.number(),
  diferenca: z.number(),
  percentualDivergencia: z.number(),
});

export const ValidacaoDivergenciasResponseSchema = z.object({
  divergencias: z.array(DivergenciaInventarioResponseSchema),
  resumo: z.object({
    totalItens: z.number(),
    itensSemDivergencia: z.number(),
    itensComDivergencia: z.number(),
    maiorDivergencia: z.number(),
    menorDivergencia: z.number(),
  }),
});

export const KardexItemResponseSchema = z.object({
  data: z.date(),
  documento: z.string(),
  tipoMovimentacao: z.string(),
  entrada: z.number(),
  saida: z.number(),
  saldo: z.number(),
  observacoes: z.string().optional(),
});

export const KardexResponseSchema = z.object({
  movimentacoes: z.array(KardexItemResponseSchema),
  saldoInicial: z.number(),
  saldoFinal: z.number(),
  totalEntradas: z.number(),
  totalSaidas: z.number(),
});

export const AnaliseGiroItemResponseSchema = z.object({
  tipoEpiId: IdSchema,
  tipoEpiNome: z.string(),
  estoqueAtual: z.number(),
  consumoMedio: z.number(),
  giroEstoque: z.number(),
  diasEstoque: z.number(),
  classificacao: z.enum(['RAPIDO', 'MEDIO', 'LENTO', 'PARADO']),
  recomendacao: z.string(),
});

export const AnaliseGiroResponseSchema = z.object({
  analise: z.array(AnaliseGiroItemResponseSchema),
  periodoAnalise: z.object({
    inicio: z.date(),
    fim: z.date(),
  }),
});

// Type exports
export type FiltrosEstoque = z.infer<typeof FiltrosEstoqueSchema>;
export type AjusteDirectoRequest = z.infer<typeof AjusteDirectoSchema>;
export type InventarioRequest = z.infer<typeof InventarioSchema>;
export type SimulacaoAjusteRequest = z.infer<typeof SimulacaoAjusteSchema>;
export type FiltrosHistoricoAjustes = z.infer<typeof FiltrosHistoricoAjustesSchema>;
export type ValidacaoDivergenciasRequest = z.infer<typeof ValidacaoDivergenciasSchema>;
export type FiltrosKardex = z.infer<typeof FiltrosKardexSchema>;
export type FiltrosAnaliseGiro = z.infer<typeof FiltrosAnaliseGiroSchema>;
export type RelatorioEstoqueResponse = z.infer<typeof RelatorioEstoqueResponseSchema>;
export type ResultadoAjusteResponse = z.infer<typeof ResultadoAjusteResponseSchema>;
export type ResultadoInventarioResponse = z.infer<typeof ResultadoInventarioResponseSchema>;
export type SimulacaoAjusteResponse = z.infer<typeof SimulacaoAjusteResponseSchema>;
export type HistoricoAjustesResponse = z.infer<typeof HistoricoAjustesResponseSchema>;
export type ValidacaoDivergenciasResponse = z.infer<typeof ValidacaoDivergenciasResponseSchema>;
export type KardexResponse = z.infer<typeof KardexResponseSchema>;
export type AnaliseGiroResponse = z.infer<typeof AnaliseGiroResponseSchema>;

// ===== NOVOS SCHEMAS PARA LISTAGEM =====

// Schemas para listagem de estoque-itens
export const ListarEstoqueItensQuerySchema = z.object({
  almoxarifadoId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
  apenasDisponiveis: z.coerce.boolean().default(false),
  apenasComSaldo: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const EstoqueItemResponseSchema = z.object({
  id: IdSchema,
  almoxarifadoId: IdSchema,
  tipoEpiId: IdSchema,
  quantidade: z.number(),
  status: z.string(),
  createdAt: z.date(),
  almoxarifado: z.object({
    id: IdSchema,
    nome: z.string(),
    unidadeNegocioId: IdSchema,
    unidadeNegocio: z.object({
      id: IdSchema,
      nome: z.string(),
      codigo: z.string(),
    }),
  }),
  tipoEpi: z.object({
    id: IdSchema,
    nomeEquipamento: z.string(),
    numeroCa: z.string(),
    descricao: z.string().optional(),
    categoriaEpi: z.string().optional(),
  }),
});

export const ListarEstoqueItensResponseSchema = z.object({
  items: z.array(EstoqueItemResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Schemas para listagem de almoxarifados
export const ListarAlmoxarifadosQuerySchema = z.object({
  unidadeNegocioId: IdSchema.optional(),
  incluirContadores: z.coerce.boolean().default(false),
});

export const AlmoxarifadoResponseSchema = z.object({
  id: IdSchema,
  nome: z.string(),
  isPrincipal: z.boolean(),
  unidadeNegocioId: IdSchema,
  createdAt: z.date(),
  unidadeNegocio: z.object({
    id: IdSchema,
    nome: z.string(),
    codigo: z.string(),
  }),
  _count: z.object({
    estoqueItens: z.number(),
  }).optional(),
});

// Type exports para novos schemas
export type ListarEstoqueItensQuery = z.infer<typeof ListarEstoqueItensQuerySchema>;
export type EstoqueItemResponse = z.infer<typeof EstoqueItemResponseSchema>;
export type ListarEstoqueItensResponse = z.infer<typeof ListarEstoqueItensResponseSchema>;
export type ListarAlmoxarifadosQuery = z.infer<typeof ListarAlmoxarifadosQuerySchema>;
export type AlmoxarifadoResponse = z.infer<typeof AlmoxarifadoResponseSchema>;