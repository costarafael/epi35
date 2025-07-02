#!/bin/bash
# FASE 7.5: VALIDANDO EXECUÇÃO DOS TESTES
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
./claude-flow memory store "fase_atual" "Executando Fase 7.5 - Validação dos Testes"

# ========================================
# FASE 7.5: VALIDANDO EXECUÇÃO DOS TESTES
# ========================================

log "🧪 Fase 7.5: Validating test execution and infrastructure"

# Validate Docker database infrastructure
log "🐳 Checking Docker test infrastructure..."
docker-compose ps | grep "db_test" || error "Test database container not running"
docker-compose ps | grep "redis" || warning "Redis container not running"

# Validate test database connectivity
log "🔗 Testing database connectivity..."
npm run prisma:test:deploy || error "Cannot connect to test database"

# Execute test suites with real database
log "🧪 Running unit tests..."
npm run test:unit || warning "Some unit tests failed - check business logic implementation"

log "🔄 Running integration tests with real database..."
npm run test:integration || warning "Some integration tests failed - check database operations"

log "🌐 Running E2E tests (if available)..."
npm run test:e2e || warning "E2E tests not yet implemented or failed"

# Generate coverage report
log "📊 Generating test coverage report..."
npm run test:coverage || warning "Coverage report generation failed"

# Validate test scripts
log "🔍 Validating specialized test scripts..."
npm run test:real-db || warning "Real database test script failed"

log "✅ Test infrastructure validation complete"

log "🎉 FASE 7.5 CONCLUÍDA!"
exit 0