#!/bin/bash
# FASE 7.1: TESTES UNITÁRIOS
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
./claude-flow memory store "fase_atual" "Executando Fase 7.1 - Testes Unitários"

# ========================================
# FASE 7.1: TESTES UNITÁRIOS
# ========================================

log "🧪 Fase 7.1: Criando testes unitários complementares"
./claude-flow swarm "Enhance unit tests for critical business logic validation. Work WITH existing integration tests that use real database:

CURRENT STATE ANALYSIS:
- Integration tests already exist: test/integration/fichas/, test/integration/estoque/, test/integration/queries/
- Real database infrastructure functional with PostgreSQL + Docker
- TestDatabaseService and seed data working
- Focus on UNIT tests for pure business logic validation

UNIT TESTS TO CREATE/ENHANCE:
- UC-ESTOQUE-01: GerenciarNotaRascunho (validation logic only)
- UC-ESTOQUE-03: CancelarNotaMovimentacao (business rules)
- UC-ESTOQUE-04: RealizarAjusteDireto (permission validation)
- UC-FICHA: Complex business rules and validation logic
- UC-QUERY: Data transformation and aggregation logic

REQUIREMENTS:
- Use Vitest framework (already configured)
- Focus on pure business logic, NOT repository layer
- Test validation rules and domain logic
- Test edge cases and error scenarios
- Test configuration-dependent behavior (PERMITIR_ESTOQUE_NEGATIVO)
- Create entity factories for domain objects
- Complement (don't duplicate) existing integration tests
- Target: Business logic coverage, not repository mocking

STRUCTURE: test/unit/domain/ and test/unit/use-cases/{module}/
PRIORITY: Business rule validation over infrastructure testing" --strategy testing --max-agents 6 --parallel

sleep 90

log "🎉 FASE 7.1 CONCLUÍDA!"
exit 0