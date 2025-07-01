# Prompts Especializados para Backend EPI v3.5

## 1. Prompts para Transações Complexas

### 1.1. Implementar Transferência Entre Almoxarifados
```bash
./claude-flow sparc run transaction-specialist "Implement the complete transfer flow between almoxarifados in src/application/use-cases/estoque/processar-transferencia.use-case.ts following these exact steps:

PRE-CONDITIONS to check:
- Schema Prisma must have notas_movimentacao table with almoxarifado_destino_id field
- EstoqueRepository interface must exist in domain layer
- MovimentacaoRepository interface must exist in domain layer

IMPLEMENTATION STEPS:
1. Validate source almoxarifado has sufficient stock with status DISPONIVEL
2. Begin database transaction using prisma.$transaction() with isolation level 'Serializable'
3. Create SAIDA_TRANSFERENCIA movement for source almoxarifado
4. Decrease source estoque_itens.quantidade
5. Find or create destination estoque_itens record with status DISPONIVEL
6. Create ENTRADA_TRANSFERENCIA movement for destination
7. Increase destination estoque_itens.quantidade preserving custo_unitario
8. Update nota status to CONCLUIDA
9. Commit transaction or rollback everything on any error

ERROR HANDLING:
- 'Estoque insuficiente no almoxarifado origem'
- 'Almoxarifado destino não encontrado'
- 'Tipo de EPI não disponível no destino'
- 'Transferência para mesmo almoxarifado não permitida'

Include correlation ID in all log messages for debugging."
```

### 1.2. Implementar Entrega com Rastreabilidade Unitária
```bash
./claude-flow sparc run transaction-specialist "Implement the unit tracking delivery system for UC-FICHA-03 in src/application/use-cases/fichas/criar-entrega-ficha.use-case.ts:

CRITICAL REQUIREMENT: Each delivered unit MUST have its own tracking record.

PRE-CONDITIONS:
- entrega_itens table must have CHECK constraint: quantidade_entregue = 1
- FichaRepository, EstoqueRepository, and EntregaRepository interfaces must exist
- CreateEntregaDto schema must be defined with Zod

IMPLEMENTATION:
1. Validate ficha exists and is active
2. Validate all items belong to specified almoxarifado with status DISPONIVEL
3. Create entrega header with status PENDENTE_ASSINATURA
4. For each item type:
   - Validate stock availability
   - For each unit (loop quantidade times):
     * Create individual entrega_itens record with quantidade_entregue = 1
     * Log each unit for auditability
5. Create ONE movement per tipo_epi with total quantity
6. Update stock balance
7. Create history record in historico_fichas

CRITICAL: quantity: 2 creates 2 separate records in entrega_itens, NOT 1 record with quantity 2"
```

### 1.3. Implementar Sistema Completo de Estorno
```bash
./claude-flow sparc run transaction-specialist "Implement the complete estorno (reversal) system for all movement types in src/application/use-cases/estoque/estornar-movimentacao.use-case.ts:

PRE-CONDITIONS:
- Database must have trigger check_nao_estornar_estorno() installed
- All ESTORNO_* enum types must exist in tipo_movimentacao_enum
- MovimentacaoRepository must have methods: findById, findByOrigemId, create

IMPLEMENTATION:
1. Create estorno type mapping:
   - ENTRADA_NOTA → ESTORNO_ENTRADA_NOTA
   - SAIDA_ENTREGA → ESTORNO_SAIDA_ENTREGA
   - etc.

2. Validate movimentacao:
   - Not already an estorno (prevent estorno of estorno)
   - Not previously reversed
   - Has sufficient balance for reversal

3. Create estorno movement:
   - Set movimentacao_origem_id to original ID
   - Reverse the quantity impact
   - Update balances atomically

4. Handle special cases:
   - SAIDA_ENTREGA: Mark entrega_itens as cancelled
   - ENTRADA_DEVOLUCAO: Revert items to COM_COLABORADOR
   - TRANSFERENCIA: Warn about paired movement

CRITICAL: NEVER allow estorno of estorno (database trigger enforces this)"
```

## 2. Prompts para Validações Complexas

### 2.1. Validar Regras de Devolução
```bash
./claude-flow sparc run usecase-developer "Implement devolucao validation for UC-FICHA-04 in src/application/use-cases/fichas/processar-devolucao.use-case.ts with these business rules:

PRE-CONDITIONS:
- EntregaRepository must exist with methods to find by ID and check signature
- EstoqueRepository must support upsert for AGUARDANDO_INSPECAO status
- All entrega_itens must be individually tracked (quantidade_entregue = 1)

IMPLEMENTATION:
1. Validate all items exist and get their details
2. Group items by entrega for validation
3. CRITICAL: Check that original entrega has status ASSINADA
4. Validate all items have status COM_COLABORADOR
5. Group by tipo_epi and almoxarifado for efficiency
6. For each group:
   - Find or create estoque with status AGUARDANDO_INSPECAO
   - Create ENTRADA_DEVOLUCAO movement
   - Update stock balance
   - Update each item status to DEVOLVIDO
7. Create history entries for affected fichas

Handle partial returns where only some units are returned."
```

### 2.2. Implementar Cálculo Dinâmico de Devolução Atrasada
```bash
./claude-flow sparc run report-developer "Implement dynamic late return calculation for R-07 report:

CRITICAL: DEVOLUCAO_ATRASADA is NEVER stored as an ENUM value, always computed dynamically.

1. Status is calculated at query time using SQL CASE:
   CASE 
     WHEN ei.status = 'COM_COLABORADOR' 
     AND ei.data_limite_devolucao IS NOT NULL
     AND ei.data_limite_devolucao < CURRENT_DATE 
     THEN true 
     ELSE false 
   END as devolucao_atrasada

2. Create efficient composite index:
   CREATE INDEX idx_devolucao_atrasada 
   ON entrega_itens(status, data_limite_devolucao) 
   WHERE status = 'COM_COLABORADOR'

3. For API responses, add computed field
4. Consider timezone handling for accurate date comparison
5. Never store this as an ENUM value - it changes daily!"
```

## 3. Prompts para Otimizações

### 3.1. Otimizar Consulta Kardex (Histórico de Movimentações)
```bash
./claude-flow sparc run performance-optimizer "Optimize the Kardex (movement history) query for high-volume scenarios in src/application/use-cases/queries/kardex.query.ts:

CURRENT PERFORMANCE ISSUES:
- Slow queries when estoque_item has >10k movements
- N+1 queries when loading related data
- No pagination causing memory issues
- Missing indexes on foreign keys

OPTIMIZATION REQUIREMENTS:
1. Add compound index on (estoque_item_id, data_movimentacao DESC)
2. Implement cursor-based pagination instead of offset
3. Use selective field loading (no SELECT *)
4. Execute main query with limited includes
5. Calculate running balance efficiently in memory
6. Cache hot items statistics for 5 minutes
7. Use raw SQL for complex aggregations
8. Return paginated result with next cursor

Target: <100ms response time for 10k movements with pagination"
```

### 3.2. Implementar Cache Inteligente de Saldos
```bash
./claude-flow sparc run performance-optimizer "Implement intelligent caching strategy for stock balances in src/infrastructure/cache/balance-cache.service.ts:

REQUIREMENTS:
- Cache current balance with configurable TTL
- Automatic invalidation on any movement
- Support for multiple cache backends (Redis/Memory)
- Monitoring and metrics
- Graceful fallback on cache failure

IMPLEMENTATION:
1. Create BalanceCacheService with Redis and memory fallback
2. Implement get/set/invalidate methods
3. Track hot items and extend their TTL
4. Implement bulk invalidation for transfers
5. Add metrics: hits, misses, invalidations, errors
6. Create MovementCacheInterceptor to invalidate after movements
7. Implement cache warming for frequently accessed items

Never serve stale balance data for critical operations."
```

## 4. Prompts para Desenvolvimento Completo

### 4.1. Criar Estrutura Base do Projeto
```bash
./claude-flow sparc run architect-epi "Create the initial NestJS project structure with Clean Architecture layers (domain, application, infrastructure, presentation) following our CLAUDE.md specifications:

1. Create folder structure:
   - src/domain/{entities,enums,interfaces}
   - src/application/{use-cases,dto,services}
   - src/infrastructure/{database,repositories,config}
   - src/presentation/{controllers,dto,pipes,filters}

2. Configure main.ts with:
   - Swagger setup
   - Global ZodValidationPipe (NOT class-validator)
   - Exception filters
   - CORS configuration

3. Create base modules:
   - AppModule
   - DatabaseModule (Prisma)
   - ConfigModule

IMPORTANT: Use Zod for all validations, NOT class-validator."
```

### 4.2. Implementar Schema Completo do Banco
```bash
./claude-flow swarm "Create the complete Prisma schema for the EPI module with all 13 tables, ENUMs, relations, and constraints as specified in documentation section 3:

TABLES TO CREATE:
- usuarios, unidades_negocio, almoxarifados
- tipos_epi, estoque_itens
- notas_movimentacao, nota_movimentacao_itens
- movimentacoes_estoque
- colaboradores, fichas_epi
- entregas, entrega_itens
- historico_fichas, configuracoes

CRITICAL CONSTRAINTS:
- estoque_itens: UNIQUE(almoxarifado_id, tipo_epi_id, status)
- entrega_itens: CHECK(quantidade_entregue = 1)
- movimentacoes_estoque: Proper estorno constraints
- All foreign key relationships

Include all ENUMs and performance indexes from section 3.4." --strategy development --max-agents 3 --parallel
```

### 4.3. Implementar Todos os Casos de Uso
```bash
./claude-flow swarm "Implement all use cases for the EPI module in src/application/use-cases/:

ESTOQUE USE CASES:
- UC-ESTOQUE-01: GerenciarNotaRascunho (CRUD operations)
- UC-ESTOQUE-02: ConcluirNotaMovimentacao (atomic transactions)
- UC-ESTOQUE-03: CancelarNotaMovimentacao (with estorno)
- UC-ESTOQUE-04: RealizarAjusteDireto (if PERMITIR_AJUSTES_FORCADOS)

FICHA USE CASES:
- UC-FICHA-01: CriarTipoEPI
- UC-FICHA-02: CriarFichaEPI (409 on duplicate)
- UC-FICHA-03: CriarEntregaFicha (unit tracking!)
- UC-FICHA-04: ProcessarDevolucao (signature required)
- UC-FICHA-05: CancelarEntrega
- UC-FICHA-06: CancelarDevolucao

QUERY USE CASES:
- UC-QUERY-01: VisualizarHistoricoFicha
- UC-QUERY-02: VisualizarKardex

Ensure all follow business rules and create proper historico_fichas entries." --strategy development --max-agents 6 --parallel
```

## 5. Prompts para Testes e Validação

### 5.1. Criar Suite Completa de Testes
```bash
./claude-flow swarm "Create comprehensive unit tests for all use cases with mocked repositories:

TEST REQUIREMENTS:
- Test happy paths, error scenarios, edge cases
- 100% coverage for critical use cases (ConcluirNota, ProcessarEntrega)
- Use Vitest with test factories
- Test transactional integrity
- Mock Prisma transactions properly

CRITICAL TEST SCENARIOS:
- Stock going negative when not allowed
- Return without signature
- Estorno of estorno attempt
- Concurrent transfers
- Partial deliveries and returns

Create tests alongside code files with .spec.ts extension." --strategy testing --max-agents 8 --parallel
```

### 5.2. Validar Implementação vs Especificação
```bash
./claude-flow sparc run code-reviewer "Validate the implementation against the original EPI specification v3.5:

1. Check all use cases are implemented:
   - [ ] UC-ESTOQUE-01 to UC-ESTOQUE-04
   - [ ] UC-FICHA-01 to UC-FICHA-06
   - [ ] UC-QUERY-01 and UC-QUERY-02

2. Verify all API endpoints match section 8 specification

3. Confirm all business rules are enforced:
   - [ ] Atomic transactions for all stock operations
   - [ ] Unit tracking (1 record = 1 unit) in entrega_itens
   - [ ] Signature required for returns
   - [ ] Dynamic calculation of DEVOLUCAO_ATRASADA
   - [ ] Estorno prevention (no reversal of reversal)
   - [ ] PERMITIR_ESTOQUE_NEGATIVO configuration

4. Validate Zod is used for all validations (NOT class-validator)

Generate detailed compliance report with any deviations."
```

## 6. Scripts de Automação e Monitoramento

### 6.1. Monitor de Agentes em Tempo Real
```bash
# Script monitor-agents-epi.sh
#!/bin/bash
while true; do
    clear
    echo "📊 Status do Sistema EPI - Claude-Flow"
    echo "====================================="
    
    echo -e "\n🟢 Status Geral:"
    ./claude-flow status
    
    echo -e "\n🤖 Agentes Ativos:"
    ./claude-flow agent list --verbose
    
    echo -e "\n🧠 Memória Compartilhada:"
    ./claude-flow memory query "epi" --limit 5
    
    echo -e "\n📋 Tarefas em Execução:"
    ./claude-flow task list --status running
    
    sleep 3
done
```

### 6.2. Recuperação Inteligente de Falhas
```bash
# Script smart-recovery-epi.sh
#!/bin/bash

echo "🔧 Iniciando recuperação inteligente do EPI..."

# 1. Salvar estado atual
./claude-flow memory dump > memory-backup-$(date +%s).json

# 2. Identificar agentes travados
STUCK_AGENTS=$(./claude-flow agent list --status stuck --format json | jq -r '.[].id')

# 3. Terminar agentes travados
for agent in $STUCK_AGENTS; do
    echo "Terminando agente travado: $agent"
    ./claude-flow agent terminate $agent
done

# 4. Identificar último checkpoint
LAST_CHECKPOINT=$(./claude-flow memory query "checkpoint" --latest)
echo "Último checkpoint: $LAST_CHECKPOINT"

# 5. Resetar para estado estável
git stash
git reset --hard $(git tag -l "phase-*-complete" | tail -1)

# 6. Reiniciar sistema
./claude-flow stop
sleep 5
./claude-flow start --ui --port 3000

# 7. Continuar do checkpoint
./claude-flow swarm "Continue EPI development from checkpoint: $LAST_CHECKPOINT" \
  --strategy recovery \
  --max-agents 3 \
  --memory-restore memory-backup-latest.json
```