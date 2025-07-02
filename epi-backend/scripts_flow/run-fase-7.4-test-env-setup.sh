#!/bin/bash
# FASE 7.4: CONFIGURANDO AMBIENTE DE TESTES
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
./claude-flow memory store "fase_atual" "Executando Fase 7.4 - Configuração do Ambiente de Testes"

# ========================================
# FASE 7.4: CONFIGURANDO AMBIENTE DE TESTES
# ========================================

log "🧪 Fase 7.4: Enhancing test environment configuration"
./claude-flow sparc run test-engineer "Enhance existing test environment and add missing configuration:

CURRENT STATE ANALYSIS:
- TestDatabaseService functional with PostgreSQL Docker
- Integration tests using real database with rollback
- Vitest configured and working
- Test seed data comprehensive

CONFIGURATION TO ENHANCE/ADD:
1. vitest.config.ts improvements:
   - Coverage thresholds (80% minimum)
   - Path aliases for cleaner imports
   - Environment variables for test database
   - Test parallelization configuration

2. Test performance optimization:
   - Database connection pooling for tests
   - Parallel test execution settings
   - Test timeout configuration
   - Memory optimization for large test suites

3. Additional test utilities:
   - Test data factories for complex entities
   - Helper functions for common assertions
   - Database snapshot utilities
   - Performance profiling helpers

4. Test reporting and CI integration:
   - Coverage reporting with v8
   - Test result aggregation
   - HTML coverage reports
   - CI-friendly test output formats

PERFORMANCE MONITORING:
- Database query performance in tests
- Test execution time monitoring
- Memory usage tracking
- Test database reset performance

REQUIREMENTS:
- Work WITH existing real database infrastructure
- Enhance current TestDatabaseService if needed
- Maintain compatibility with existing integration tests
- Focus on tooling and configuration, not architecture changes"

sleep 45

log "🎉 FASE 7.4 CONCLUÍDA!"
exit 0