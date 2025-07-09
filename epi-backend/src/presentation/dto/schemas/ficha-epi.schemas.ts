import { z } from 'zod';
import {
  IdSchema,
  PaginationSchema,
  ObservacoesSchema,
  SearchSchema,
  StatusFichaEPISchema,
} from './common.schemas';

// EPI Card schemas
export const CriarFichaEpiSchema = z.object({
  colaboradorId: IdSchema,
  status: StatusFichaEPISchema.optional(),
});

// Use case schemas for criar-ficha-epi
export const CriarFichaEpiUseCaseInputSchema = z.object({
  colaboradorId: IdSchema,
  status: StatusFichaEPISchema.optional(),
});

export const FichaEpiUseCaseOutputSchema = z.object({
  id: IdSchema,
  colaboradorId: IdSchema,
  status: StatusFichaEPISchema,
  dataEmissao: z.date(),
  createdAt: z.date(),
  devolucaoPendente: z.boolean(), // ✅ NOVA FLAG: indica se há itens em atraso de devolução
  colaborador: z.object({
    nome: z.string(),
    cpf: z.string(),
    matricula: z.string().optional(),
  }),
  // ✅ NOVAS INFORMAÇÕES SOLICITADAS
  contratada: z.object({
    id: IdSchema,
    nome: z.string(),
    cnpj: z.string(),
  }).optional(),
  episInfo: z.object({
    totalEpisComColaborador: z.number(), // Total de EPIs COM_COLABORADOR
    episExpirados: z.number(), // EPIs com prazo vencido
    proximaDataVencimento: z.date().optional(), // Próxima data de vencimento
    diasAteProximoVencimento: z.number().optional(), // Dias até o próximo vencimento
    tiposEpisAtivos: z.array(z.object({
      tipoEpiId: IdSchema,
      tipoEpiNome: z.string(),
      quantidade: z.number(),
    })), // Tipos de EPI ativos com o colaborador
  }),
});

export const FichaFiltersSchema = z.object({
  colaboradorId: IdSchema.optional(),
  status: StatusFichaEPISchema.optional(),
  colaboradorNome: z.string().optional(),
  ativo: z.union([
    z.boolean(),
    z.string().transform(val => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
      throw new Error(`Invalid boolean value: ${val}`);
    })
  ]).optional(),
  devolucaoPendente: z.union([
    z.boolean(),
    z.string().transform(val => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
      throw new Error(`Invalid boolean value: ${val}`);
    })
  ]).optional(), // ✅ NOVO FILTRO: mostrar apenas fichas com devolução em atraso
});

export const AtualizarStatusFichaSchema = z.object({
  motivo: z.string().max(500).optional(),
});

export const FiltrosFichaEpiSchema = z.object({
  colaboradorId: IdSchema.optional(),
  contratadaId: IdSchema.optional(),
  status: StatusFichaEPISchema.optional(),
  colaboradorNome: z.string().optional(),
  devolucaoPendente: z.union([
    z.boolean(),
    z.string().transform(val => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
      throw new Error(`Invalid boolean value: ${val}`);
    })
  ]).optional(), // ✅ NOVO FILTRO: para API controller
}).merge(SearchSchema).merge(PaginationSchema);

// Delivery schemas - Single Source of Truth
export const ItemEntregaSchema = z.object({
  numeroSerie: z.string().max(50).optional(),
  estoqueItemOrigemId: IdSchema, // Required to match use case interface
  // Removed: lote, dataFabricacao (not in v3.5 schema)
});

export const CriarEntregaSchema = z.object({
  fichaEpiId: IdSchema,
  quantidade: z.number().int().positive('Quantidade deve ser positiva'),
  itens: z.array(ItemEntregaSchema),
  assinaturaColaborador: z.string().optional(),
  observacoes: ObservacoesSchema,
  usuarioId: IdSchema, // Added for use case compatibility
}).refine((data) => data.itens.length === data.quantidade, {
  message: 'Número de itens deve corresponder à quantidade',
});

// Use case input/output schemas - Single Source of Truth
export const CriarEntregaUseCaseInputSchema = CriarEntregaSchema;

export const ItemEntregaOutputSchema = z.object({
  id: IdSchema,
  tipoEpiId: IdSchema,
  quantidadeEntregue: z.number(),
  numeroSerie: z.string().optional(),
  estoqueItemOrigemId: IdSchema.optional(), // Campo adicionado para rastreabilidade
  lote: z.string().optional(),
  dataFabricacao: z.date().optional(),
  dataLimiteDevolucao: z.date().optional(), // Campo renomeado
  status: z.enum(['COM_COLABORADOR', 'DEVOLVIDO', 'PERDIDO', 'DANIFICADO']),
});

export const EntregaUseCaseOutputSchema = z.object({
  id: IdSchema,
  fichaEpiId: IdSchema,
  colaboradorId: IdSchema,
  dataEntrega: z.date(),
  assinaturaColaborador: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['PENDENTE_ASSINATURA', 'ASSINADA', 'CANCELADA']),
  itens: z.array(ItemEntregaOutputSchema),
  colaborador: z.object({
    nome: z.string(),
    cpf: z.string(),
    matricula: z.string().optional(),
  }),
  tipoEpi: z.object({
    nome: z.string(),
    codigo: z.string(),
    categoria: z.string(),
    validadeMeses: z.number().optional(),
  }),
  almoxarifado: z.object({
    nome: z.string(),
    codigo: z.string(),
  }),
});

export const FiltrosEntregasSchema = z.object({
  colaboradorId: IdSchema.optional(),
  fichaEpiId: IdSchema.optional(),
  status: z.enum(['ATIVA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL', 'CANCELADA']).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
}).merge(PaginationSchema);

export const ValidarEntregaSchema = z.object({
  fichaEpiId: IdSchema,
  quantidade: z.number().int().positive(),
});

// Return schemas
export const ItemDevolucaoSchema = z.object({
  itemId: IdSchema,
  motivoDevolucao: z.string().max(500).optional(),
  destinoItem: z.enum(['QUARENTENA', 'DESCARTE']).default('QUARENTENA'),
});

export const ProcessarDevolucaoSchema = z.object({
  entregaId: IdSchema,
  itensParaDevolucao: z.array(ItemDevolucaoSchema).min(1, 'Lista de itens para devolução é obrigatória'),
  assinaturaColaborador: z.string().optional(),
  usuarioId: IdSchema, // Added for use case compatibility
  observacoes: ObservacoesSchema,
});

// Use case schemas for processar-devolucao
export const ProcessarDevolucaoUseCaseInputSchema = ProcessarDevolucaoSchema;

export const DevolucaoUseCaseOutputSchema = z.object({
  entregaId: IdSchema,
  itensDevolucao: z.array(z.object({
    itemId: IdSchema,
    tipoEpiId: IdSchema,
    numeroSerie: z.string().optional(),
    lote: z.string().optional(),
    statusAnterior: z.string(),
    novoStatus: z.string(),
    motivoDevolucao: z.string().optional(),
    destinoItem: z.string(),
  })),
  movimentacoesEstoque: z.array(z.object({
    id: IdSchema,
    tipoEpiId: IdSchema,
    quantidade: z.number(),
    statusEstoque: z.string(),
  })),
  statusEntregaAtualizado: z.string(),
  dataProcessamento: z.date(),
});

export const CancelarDevolucaoSchema = z.object({
  entregaId: IdSchema,
  itensParaCancelar: z.array(IdSchema).min(1, 'Lista de itens para cancelar devolução é obrigatória'),
  motivo: z.string().min(1, 'Motivo é obrigatório').max(500),
});

export const FiltrosHistoricoDevolucaoSchema = z.object({
  colaboradorId: IdSchema.optional(),
  tipoEpiId: IdSchema.optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
}).merge(PaginationSchema);

export const FiltrosPosseAtualSchema = z.object({
  colaboradorId: IdSchema,
  incluirVencidos: z.union([
    z.boolean(),
    z.string().transform(val => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
      throw new Error(`Invalid boolean value: ${val}`);
    })
  ]).default(false),
  incluirProximosVencimento: z.union([
    z.boolean(),
    z.string().transform(val => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
      throw new Error(`Invalid boolean value: ${val}`);
    })
  ]).default(true),
});

// ✅ NOVO: Schemas para Histórico Geral da Ficha
export const FiltrosHistoricoFichaSchema = z.object({
  tipoAcao: z.enum(['CRIACAO', 'ENTREGA', 'DEVOLUCAO', 'CANCELAMENTO', 'ALTERACAO_STATUS', 'ITEM_VENCIDO', 'EDICAO']).optional(),
  dataInicio: z.coerce.date().optional(),
  dataFim: z.coerce.date().optional(),
}).merge(PaginationSchema);

export const ItemHistoricoFichaSchema = z.object({
  id: IdSchema,
  fichaEpiId: IdSchema,
  tipoAcao: z.enum(['CRIACAO', 'ENTREGA', 'DEVOLUCAO', 'CANCELAMENTO', 'ALTERACAO_STATUS', 'ITEM_VENCIDO', 'EDICAO']),
  descricao: z.string(),
  dataAcao: z.date(),
  responsavel: z.object({
    id: IdSchema,
    nome: z.string(),
  }).optional(),
  detalhes: z.object({
    // Detalhes específicos por tipo de ação
    entregaId: IdSchema.optional(),
    tipoEpiNome: z.string().optional(),
    quantidade: z.number().optional(),
    itens: z.array(z.object({
      numeroSerie: z.string().optional(),
      dataLimiteDevolucao: z.date().optional(),
    })).optional(),
    statusAnterior: z.string().optional(),
    statusNovo: z.string().optional(),
    motivo: z.string().optional(),
    observacoes: z.string().optional(),
  }).optional(),
});

export const HistoricoFichaResponseSchema = z.object({
  fichaId: IdSchema,
  colaborador: z.object({
    id: IdSchema,
    nome: z.string(),
    cpf: z.string(),
    matricula: z.string().optional(),
  }),
  historico: z.array(ItemHistoricoFichaSchema),
  estatisticas: z.object({
    totalEventos: z.number(),
    totalEntregas: z.number(),
    totalDevolucoes: z.number(),
    totalCancelamentos: z.number(),
    itensAtivos: z.number(),
    itensVencidos: z.number(),
    dataUltimaAtividade: z.date().optional(),
  }),
});

// Response schemas
export const FichaEpiResponseSchema = z.object({
  id: IdSchema,
  colaboradorId: IdSchema,
  status: StatusFichaEPISchema,
  dataEmissao: z.date(),
  createdAt: z.date(),
  colaborador: z.object({
    nome: z.string(),
    cpf: z.string(),
    matricula: z.string().optional(),
  }),
  devolucaoPendente: z.boolean(),
  episInfo: z.object({
    totalEpisComColaborador: z.number(),
    episExpirados: z.number(),
    proximaDataVencimento: z.date().optional(),
    diasAteProximoVencimento: z.number().optional(),
    tiposEpisAtivos: z.array(z.object({
      tipoEpiId: IdSchema,
      tipoEpiNome: z.string(),
      quantidade: z.number(),
    })),
  }),
});

export const ItemEntregaResponseSchema = z.object({
  id: IdSchema,
  tipoEpiId: IdSchema,
  quantidadeEntregue: z.number(),
  numeroSerie: z.string().optional(),
  lote: z.string().optional(),
  dataFabricacao: z.date().optional(),
  dataVencimento: z.date().optional(),
  status: z.enum(['ENTREGUE', 'DEVOLVIDO', 'PERDIDO', 'DANIFICADO']),
});

export const EntregaResponseSchema = z.object({
  id: IdSchema,
  fichaEpiId: IdSchema,
  colaboradorId: IdSchema,
  dataEntrega: z.date(),
  dataVencimento: z.date().optional(),
  assinaturaColaborador: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ATIVA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL', 'CANCELADA']),
  itens: z.array(ItemEntregaResponseSchema),
  colaborador: z.object({
    nome: z.string(),
    cpf: z.string(),
    matricula: z.string().optional(),
  }),
  tipoEpi: z.object({
    nome: z.string(),
    codigo: z.string(),
    validadeMeses: z.number().optional(),
    exigeAssinaturaEntrega: z.boolean(),
  }),
  almoxarifado: z.object({
    nome: z.string(),
    codigo: z.string(),
  }),
});

export const ValidacaoEntregaResponseSchema = z.object({
  permitida: z.boolean(),
  motivo: z.string().optional(),
  fichaAtiva: z.boolean(),
  estoqueDisponivel: z.number(),
  posseAtual: z.number(),
});

export const ItemDevolucaoResponseSchema = z.object({
  itemId: IdSchema,
  tipoEpiId: IdSchema,
  numeroSerie: z.string().optional(),
  lote: z.string().optional(),
  statusAnterior: z.string(),
  novoStatus: z.string(),
  motivoDevolucao: z.string().optional(),
  destinoItem: z.string(),
});

export const DevolucaoResponseSchema = z.object({
  entregaId: IdSchema,
  itensDevolucao: z.array(ItemDevolucaoResponseSchema),
  movimentacoesEstoque: z.array(z.object({
    id: IdSchema,
    tipoEpiId: IdSchema,
    quantidade: z.number(),
    statusEstoque: z.string(),
  })),
  statusEntregaAtualizado: z.string(),
  dataProcessamento: z.date(),
});

export const ValidacaoDevolucaoResponseSchema = z.object({
  permitida: z.boolean(),
  motivo: z.string().optional(),
  itensValidos: z.array(IdSchema),
  itensInvalidos: z.array(z.object({
    itemId: IdSchema,
    motivo: z.string(),
  })),
});

export const CancelamentoDevolucaoResponseSchema = z.object({
  entregaId: IdSchema,
  itensCancelados: z.array(z.object({
    itemId: IdSchema,
    tipoEpiId: IdSchema,
    statusAnterior: z.string(),
    novoStatus: z.string(),
    numeroSerie: z.string().optional(),
    lote: z.string().optional(),
  })),
  movimentacoesEstorno: z.array(z.object({
    id: IdSchema,
    tipoEpiId: IdSchema,
    quantidade: z.number(),
  })),
  statusEntregaAtualizado: z.string(),
  dataCancelamento: z.date(),
});

export const PosseAtualResponseSchema = z.object({
  tipoEpiId: IdSchema,
  tipoEpiNome: z.string(),
  tipoEpiCodigo: z.string(),
  quantidadePosse: z.number(),
  dataUltimaEntrega: z.date(),
  dataVencimento: z.date().optional(),
  diasUso: z.number(),
  status: z.enum(['ATIVO', 'VENCIDO', 'PROXIMO_VENCIMENTO']),
  itensAtivos: z.array(z.object({
    itemId: IdSchema,
    numeroSerie: z.string().optional(),
    lote: z.string().optional(),
    dataEntrega: z.date(),
    dataVencimento: z.date().optional(),
  })),
});

export const HistoricoDevolucaoResponseSchema = z.object({
  devolucoes: z.array(z.object({
    entregaId: IdSchema,
    colaboradorNome: z.string(),
    tipoEpiNome: z.string(),
    dataEntrega: z.date(),
    dataDevolucao: z.date(),
    diasUso: z.number(),
    motivoDevolucao: z.string().optional(),
    destinoItem: z.string(),
    numeroSerie: z.string().optional(),
    lote: z.string().optional(),
  })),
  estatisticas: z.object({
    totalDevolucoes: z.number(),
    itensEmBomEstado: z.number(),
    itensDanificados: z.number(),
    itensPerdidos: z.number(),
    tempoMedioUso: z.number(),
  }),
});

export const EstatisticasFichasResponseSchema = z.object({
  totalFichas: z.number(),
  fichasAtivas: z.number(),
  fichasInativas: z.number(),
  fichasSuspensas: z.number(),
  porTipoEpi: z.array(z.object({
    tipoEpiNome: z.string(),
    quantidade: z.number(),
  })),
  porColaborador: z.array(z.object({
    colaboradorNome: z.string(),
    quantidade: z.number(),
  })),
});

// Type exports - Single Source of Truth with z.infer
export type CriarFichaEpiRequest = z.infer<typeof CriarFichaEpiSchema>;
export type AtualizarStatusFichaRequest = z.infer<typeof AtualizarStatusFichaSchema>;
export type FiltrosFichaEpi = z.infer<typeof FiltrosFichaEpiSchema>;
export type CriarEntregaRequest = z.infer<typeof CriarEntregaSchema>;
export type FiltrosEntregas = z.infer<typeof FiltrosEntregasSchema>;
export type ValidarEntregaRequest = z.infer<typeof ValidarEntregaSchema>;
export type ProcessarDevolucaoRequest = z.infer<typeof ProcessarDevolucaoSchema>;
export type CancelarDevolucaoRequest = z.infer<typeof CancelarDevolucaoSchema>;
export type FiltrosHistoricoDevolucao = z.infer<typeof FiltrosHistoricoDevolucaoSchema>;
export type FiltrosPosseAtual = z.infer<typeof FiltrosPosseAtualSchema>;
export type FichaEpiResponse = z.infer<typeof FichaEpiResponseSchema>;
export type EntregaResponse = z.infer<typeof EntregaResponseSchema>;
export type ValidacaoEntregaResponse = z.infer<typeof ValidacaoEntregaResponseSchema>;
export type DevolucaoResponse = z.infer<typeof DevolucaoResponseSchema>;
export type ValidacaoDevolucaoResponse = z.infer<typeof ValidacaoDevolucaoResponseSchema>;
export type CancelamentoDevolucaoResponse = z.infer<typeof CancelamentoDevolucaoResponseSchema>;
export type PosseAtualResponse = z.infer<typeof PosseAtualResponseSchema>;
export type HistoricoDevolucaoResponse = z.infer<typeof HistoricoDevolucaoResponseSchema>;
export type EstatisticasFichasResponse = z.infer<typeof EstatisticasFichasResponseSchema>;

// ✅ NEW: Use case types from Zod schemas - Single Source of Truth
export type CriarEntregaInput = z.infer<typeof CriarEntregaUseCaseInputSchema>;
export type EntregaOutput = z.infer<typeof EntregaUseCaseOutputSchema>;
export type ItemEntregaOutput = z.infer<typeof ItemEntregaOutputSchema>;

// ✅ NEW: Processar Devolução types from Zod schemas 
export type ProcessarDevolucaoInput = z.infer<typeof ProcessarDevolucaoUseCaseInputSchema>;
export type DevolucaoOutput = z.infer<typeof DevolucaoUseCaseOutputSchema>;

// ✅ NEW: Criar Ficha EPI types from Zod schemas
export type CriarFichaEpiInput = z.infer<typeof CriarFichaEpiUseCaseInputSchema>;
export type FichaEpiOutput = z.infer<typeof FichaEpiUseCaseOutputSchema>;
export type FichaFilters = z.infer<typeof FichaFiltersSchema>;

// ✅ NEW: Histórico Geral da Ficha types from Zod schemas
export type FiltrosHistoricoFicha = z.infer<typeof FiltrosHistoricoFichaSchema>;
export type ItemHistoricoFicha = z.infer<typeof ItemHistoricoFichaSchema>;
export type HistoricoFichaResponse = z.infer<typeof HistoricoFichaResponseSchema>;

// ✅ NEW: Schemas para Assinatura de Entrega
export const AssinarEntregaSchema = z.object({
  assinaturaColaborador: z.string().optional(),
  observacoes: z.string().max(500).optional(),
});

export const AssinarEntregaUseCaseInputSchema = z.object({
  entregaId: IdSchema,
  assinaturaColaborador: z.string().optional(),
  observacoes: z.string().max(500).optional(),
});

export const AssinarEntregaUseCaseOutputSchema = z.object({
  id: IdSchema,
  status: z.literal('ASSINADA'),
  dataAssinatura: z.date(),
  assinaturaColaborador: z.string().optional(),
  observacoes: z.string().optional(),
  fichaEpiId: IdSchema,
  almoxarifadoId: IdSchema,
  responsavelId: IdSchema,
  dataEntrega: z.date(),
  linkAssinatura: z.string().optional(),
});

// ✅ NEW: Assinatura de Entrega types from Zod schemas
export type AssinarEntregaRequest = z.infer<typeof AssinarEntregaSchema>;
export type AssinarEntregaInput = z.infer<typeof AssinarEntregaUseCaseInputSchema>;
export type AssinarEntregaOutput = z.infer<typeof AssinarEntregaUseCaseOutputSchema>;

// ========================================
// 🚀 NOVOS SCHEMAS PARA ENDPOINTS OTIMIZADOS
// ========================================

// Schema para display de status (cores semânticas para UI)
export const StatusDisplaySchema = z.object({
  cor: z.enum(['green', 'red', 'yellow', 'gray']),
  label: z.string(),
});

// Schema para display de status de vencimento
export const StatusVencimentoDisplaySchema = z.object({
  texto: z.string(),
  cor: z.enum(['green', 'yellow', 'red']),
  diasRestantes: z.number(),
  statusDetalhado: z.enum(['dentro_prazo', 'vencendo', 'vencido']),
});

// Schema para display de tipo (eventos de histórico)
export const TipoDisplaySchema = z.object({
  label: z.string(),
  tipo: z.string(),
  cor: z.enum(['green', 'orange', 'blue', 'red']),
});

// Schema para equipamento em posse (detalhado)
export const EquipamentoEmPosseSchema = z.object({
  id: IdSchema,
  nomeEquipamento: z.string(),
  numeroCA: z.string(),
  categoria: z.string(),
  dataEntrega: z.string(),
  dataLimiteDevolucao: z.string().nullable(),
  statusVencimento: z.enum(['dentro_prazo', 'vencendo', 'vencido']),
  statusVencimentoDisplay: StatusVencimentoDisplaySchema,
  diasParaVencimento: z.number(), // ← Campo necessário para sorting e cálculos
  podeDevolver: z.boolean(),
  entregaId: IdSchema,
  itemEntregaId: IdSchema,
});

// Schema para histórico de ficha
export const HistoricoFichaDetalhadoSchema = z.object({
  id: IdSchema,
  data: z.string(),
  dataFormatada: z.string(), // ← Já formatado pelo backend (15/01/2024 às 10:30)
  tipo: z.enum(['entrega', 'devolucao', 'assinatura', 'cancelamento']),
  tipoDisplay: TipoDisplaySchema, // ← Display estruturado para UI
  acao: z.string(), // ← Descrição da ação
  responsavel: z.string().nullable(),
  mudancaStatus: z.string().nullable(), // ← "Disponível → Com Colaborador" formatado pelo backend
  detalhes: z.object({
    resumo: z.string(), // ← "3x Capacete (CA 12345)" formatado pelo backend
    dados: z.object({
      quantidade: z.number().optional(),
      equipamento: z.string().optional(),
      numeroCA: z.string().optional(),
      categoria: z.string().optional(),
    }).optional(),
  }).nullable(),
});

// Schema para estatísticas da ficha
export const EstatisticasFichaOptimizedSchema = z.object({
  totalEpisAtivos: z.number(),
  totalEpisVencidos: z.number(),
  proximoVencimento: z.string().nullable(),
  diasProximoVencimento: z.number().nullable(),
});

// Schema para colaborador detalhado
export const ColaboradorDetalhadoSchema = z.object({
  id: IdSchema,
  nome: z.string(),
  cpf: z.string(),
  cpfDisplay: z.string(), // CPF formatado/mascarado (123.456.***-01)
  matricula: z.string().nullable(),
  cargo: z.string().nullable(),
  empresa: z.string().nullable(),
  iniciais: z.string(), // Para avatar (ex: "AB")
});

// Schema para ficha completa (endpoint /complete)
export const FichaCompletaSchema = z.object({
  ficha: z.object({
    id: IdSchema,
    status: z.enum(['ativa', 'inativa', 'vencida', 'pendente_devolucao']),
    statusDisplay: StatusDisplaySchema,
    colaborador: ColaboradorDetalhadoSchema,
  }),
  equipamentosEmPosse: z.array(EquipamentoEmPosseSchema),
  devolucoes: z.array(z.object({
    id: IdSchema,
    nomeEquipamento: z.string(),
    numeroCA: z.string(),
    categoria: z.string(),
    quantidade: z.number().int().positive().default(1),
    dataDevolucao: z.string(),
    motivo: z.enum(['devolução padrão', 'danificado', 'troca', 'outros']), // ← Atualizado conforme documentação
    motivoDisplay: z.string(),
    status: z.enum(['processada', 'cancelada']),
    podeProcessar: z.boolean(),
    podeCancelar: z.boolean(),
  })),
  entregas: z.array(z.object({
    id: IdSchema,
    numero: z.string(),
    dataEntrega: z.string(),
    status: z.enum(['pendente_assinatura', 'assinado', 'cancelado']),
    statusDisplay: StatusDisplaySchema,
    acoes: z.array(z.enum(['assinar', 'imprimir', 'editar'])),
    itens: z.array(z.object({
      id: IdSchema,
      nomeEquipamento: z.string(),
      numeroCA: z.string(),
      categoria: z.string(),
      quantidade: z.number().int().positive().default(1),
    })),
  })),
  historico: z.array(HistoricoFichaDetalhadoSchema),
  estatisticas: EstatisticasFichaOptimizedSchema,
});

// Schema para item da listagem de fichas
export const FichaListItemSchema = z.object({
  id: IdSchema,
  colaborador: z.object({
    nome: z.string(),
    matricula: z.string().nullable(),
    cargo: z.string().nullable(),
    empresa: z.string().nullable(),
  }),
  status: z.enum(['ativa', 'inativa', 'vencida', 'pendente_devolucao']),
  statusDisplay: StatusDisplaySchema, // ← Display estruturado
  totalEpisAtivos: z.number(),
  totalEpisVencidos: z.number(),
  proximoVencimento: z.string().nullable(),
  ultimaAtualizacao: z.string(),
});

// Schema para listagem paginada de fichas
export const FichaListEnhancedSchema = z.object({
  items: z.array(FichaListItemSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

// Schema para query parameters da listagem
export const FichaListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ativa', 'inativa', 'vencida', 'pendente_devolucao']).optional(),
  cargo: z.string().optional(),
  empresa: z.string().optional(),
  vencimentoProximo: z.union([
    z.boolean(),
    z.string().transform(val => {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
      throw new Error(`Invalid boolean value: ${val}`);
    })
  ]).optional(),
});

// Schema para criação de entrega completa
export const CriarEntregaCompletaSchema = z.object({
  fichaEpiId: IdSchema,
  responsavelId: IdSchema,
  itens: z.array(z.object({
    estoqueItemId: IdSchema,
    quantidade: z.number().min(1),
  })),
  observacoes: z.string().optional(),
});

// Schema para resposta da criação de entrega
export const EntregaCompletaResponseSchema = z.object({
  entregaId: IdSchema,
  itensIndividuais: z.array(z.object({
    id: IdSchema,
    nomeEquipamento: z.string(),
    numeroCA: z.string(),
    dataLimiteDevolucao: z.string().nullable(),
  })),
  totalItens: z.number(),
  statusEntrega: z.enum(['pendente_assinatura', 'assinada', 'cancelada']),
});

// Schema para processamento de devoluções em lote
export const ProcessarDevolucoesBatchSchema = z.object({
  devolucoes: z.array(z.object({
    equipamentoId: IdSchema,
    motivo: z.enum(['devolução padrão', 'danificado', 'troca', 'outros']), // ← Atualizado conforme documentação
    observacoes: z.string().optional(),
  })),
});

// Schema para resposta do processamento de devoluções
export const DevolucoesBatchResponseSchema = z.object({
  processadas: z.number(),
  erros: z.array(z.string()),
  fichasAtualizadas: z.array(IdSchema),
  estoqueAtualizado: z.boolean(),
});

// ✅ Tipos TypeScript derivados dos schemas
export type EquipamentoEmPosse = z.infer<typeof EquipamentoEmPosseSchema>;
export type HistoricoFichaDetalhado = z.infer<typeof HistoricoFichaDetalhadoSchema>;
export type EstatisticasFichaOptimized = z.infer<typeof EstatisticasFichaOptimizedSchema>;
export type ColaboradorDetalhado = z.infer<typeof ColaboradorDetalhadoSchema>;
export type FichaCompleta = z.infer<typeof FichaCompletaSchema>;
export type FichaListItem = z.infer<typeof FichaListItemSchema>;
export type FichaListEnhanced = z.infer<typeof FichaListEnhancedSchema>;
export type FichaListQuery = z.infer<typeof FichaListQuerySchema>;
export type CriarEntregaCompleta = z.infer<typeof CriarEntregaCompletaSchema>;
export type EntregaCompletaResponse = z.infer<typeof EntregaCompletaResponseSchema>;
export type ProcessarDevolucoesBatch = z.infer<typeof ProcessarDevolucoesBatchSchema>;
export type DevolucoesBatchResponse = z.infer<typeof DevolucoesBatchResponseSchema>;