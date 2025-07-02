#!/bin/bash
# FASE 8.4: CRIAÇÃO DE FERRAMENTAS DE ANÁLISE DE PERFORMANCE
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
./claude-flow memory store "fase_atual" "Executando Fase 8.4 - Criação de Ferramentas de Análise de Performance"

# ========================================
# FASE 8.4: CRIAÇÃO DE FERRAMENTAS DE ANÁLISE DE PERFORMANCE
# ========================================

log "⚡ Fase 8.4: Criando ferramentas de análise de performance"
./claude-flow sparc run performance-optimizer "Create performance analysis tools and scripts:

ANALYSIS TOOLS:
1. Database query analysis scripts
2. API performance benchmarking tools
3. Load testing utilities
4. Performance regression detection
5. Memory usage analysis

SCRIPTS TO CREATE:
- scripts/performance/analyze-queries.sql (PostgreSQL performance analysis)
- scripts/performance/benchmark.sh (API endpoint benchmarking)
- scripts/performance/load-test.js (Load testing with realistic scenarios)
- scripts/performance/memory-analysis.js (Memory leak detection)

BENCHMARKING:
- Endpoint response time testing
- Concurrent request handling
- Database query performance
- Cache effectiveness measurement
- Memory usage under load

REPORTING:
- Performance metrics dashboard
- Query performance reports
- Cache statistics analysis
- System resource utilization
- Performance trend analysis

INTEGRATION:
- CI/CD performance regression testing
- Automated performance alerts
- Performance baseline establishment
- Continuous performance monitoring"

sleep 45

log "🎉 FASE 8.4 CONCLUÍDA!"
exit 0
