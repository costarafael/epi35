#!/bin/bash
# FASE 7.3: TESTES END-TO-END (E2E)
# Script baseado no run-all-phases-script-fixed.sh
# Utiliza Claude-Flow com modos especializados e prompts otimizados

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Verificar se estamos no diretório correto do projeto
if [ ! -f "package.json" ]; then
    error "package.json não encontrado. Execute este script no diretório raiz do projeto epi-backend."
fi

if [ ! -f "CLAUDE.md" ]; then
    error "CLAUDE.md não encontrado. Certifique-se de estar no projeto correto."
fi

# Verificar se Claude-Flow está disponível
if [ ! -f "./claude-flow" ]; then
    warning "Claude-Flow não encontrado. Tentando instalar..."
    npx claude-flow@latest init --sparc
    if [ ! -f "./claude-flow" ]; then
        error "Falha ao instalar Claude-Flow. Instale manualmente primeiro."
    fi
fi

# Verificar status do Claude-Flow
log "🤖 Verificando status do Claude-Flow..."
./claude-flow status || {
    warning "Claude-Flow não está rodando. Iniciando..."
    ./claude-flow start --ui --port 3000 &
    sleep 10
}

# Verificar novamente
./claude-flow status || error "Falha ao iniciar o orquestrador Claude-Flow"

# Atualizar memória compartilhada com progresso atual
log "🧠 Atualizando memória compartilhada..."
./claude-flow memory store "fase_atual" "Executando Fase 7.3 - Testes End-to-End"

# ========================================
# FASE 7.3: TESTES END-TO-END (E2E)
# ========================================

log "🧪 Fase 7.3: Creating comprehensive E2E API tests"
./claude-flow sparc run test-engineer "Create comprehensive end-to-end API tests using Supertest:

CURRENT STATE ANALYSIS:
- Integration tests already cover business logic with real database
- Need E2E tests for HTTP API layer validation
- Test actual REST endpoints, not business logic
- Focus on HTTP contract validation and request/response format

API ENDPOINTS TO TEST (test/e2e/):
1. NotasMovimentacaoController:
   - POST /api/notas-movimentacao (create draft)
   - POST /api/notas-movimentacao/{id}/itens (add items)
   - PUT /api/notas-movimentacao/{id}/concluir (complete)
   - POST /api/notas-movimentacao/{id}/cancelar (cancel)
   - GET /api/notas-movimentacao (list with filters)

2. EstoqueController:
   - POST /api/estoque/ajustes (direct adjustments)
   - GET /api/estoque-itens/{id}/historico (kardex)

3. FichasEpiController:
   - POST /api/fichas-epi (create with 409 conflict)
   - POST /api/fichas-epi/{id}/entregas (create delivery)
   - PUT /api/entregas/{id}/assinar (sign delivery)
   - POST /api/devolucoes (process return)

4. RelatoriosController:
   - GET /api/relatorios/* (all report endpoints)
   - Test pagination, filtering, complex queries

E2E VALIDATION FOCUS:
- HTTP status codes and response format
- Request payload validation with Zod DTOs
- API contract compliance (Swagger/OpenAPI)
- Error response format consistency
- HTTP headers and content-type validation
- Authentication/authorization integration (when available)

SETUP:
- Use Supertest with NestJS TestingModule
- Use real database but focus on HTTP layer
- Complement existing integration tests, don't duplicate logic"

sleep 60

log "🎉 FASE 7.3 CONCLUÍDA!"
exit 0