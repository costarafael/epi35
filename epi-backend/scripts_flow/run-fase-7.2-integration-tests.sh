#!/bin/bash
# FASE 7.2: TESTES DE INTEGRAÇÃO
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
./claude-flow memory store "fase_atual" "Executando Fase 7.2 - Testes de Integração"

# ========================================
# FASE 7.2: TESTES DE INTEGRAÇÃO
# ========================================

log "🧪 Fase 7.2: Enhancing existing integration tests"
./claude-flow swarm "Enhance and expand existing integration test suite that already uses real database:

CURRENT STATE ANALYSIS:
- Integration tests exist: test/integration/fichas/, test/integration/estoque/, test/integration/queries/
- TestDatabaseService working with PostgreSQL + Docker 
- Seed data comprehensive with 12 collaborators, 5 EPI types, 2 warehouses
- Test infrastructure using real transactions and rollback

INTEGRATION TESTS TO ENHANCE/ADD:
1. Missing flows in existing modules:
   - Transferencia nota: origem and destino movements validation
   - Concurrent nota operations with different almoxarifados
   - Complex estoque scenarios with PERMITIR_ESTOQUE_NEGATIVO

2. Additional cross-module scenarios:
   - Simultaneous entregas affecting same estoque_item
   - Bulk operations performance testing
   - Database constraint violation handling

3. Edge cases not yet covered:
   - System configuration changes (PERMITIR_ESTOQUE_NEGATIVO toggle)
   - Large dataset scenarios (1000+ records)
   - Complex date range validations

REQUIREMENTS:
- Enhance existing TestDatabaseService if needed
- Use existing seed data and extend when necessary
- Follow existing test structure in test/integration/
- Ensure all tests use real PostgreSQL database
- Focus on scenarios NOT yet covered by existing 71 integration tests

PRIORITY: Fill gaps in coverage rather than duplicate existing comprehensive tests" --strategy testing --max-agents 4 --parallel

sleep 60

log "🎉 FASE 7.2 CONCLUÍDA!"
exit 0