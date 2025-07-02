#!/bin/bash
# FASE 8.3: IMPLEMENTAÇÃO DE MONITORAMENTO DE PERFORMANCE
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
./claude-flow memory store "fase_atual" "Executando Fase 8.3 - Implementação de Monitoramento de Performance"

# ========================================
# FASE 8.3: IMPLEMENTAÇÃO DE MONITORAMENTO DE PERFORMANCE
# ========================================

log "⚡ Fase 8.3: Implementando monitoramento de performance"
./claude-flow swarm "Implement comprehensive performance monitoring and observability:

MONITORING FEATURES:
- Response time logging for all endpoints
- Database query execution time tracking
- Memory usage and GC performance monitoring
- Concurrent request handling metrics
- Health check endpoints for each service layer

METRICS COLLECTION:
- Request/response metrics per endpoint
- Database connection pool monitoring
- Cache hit/miss ratios tracking
- Business metrics (entregas per day, etc.)
- Error rate tracking by endpoint and use case

HEALTH CHECKS:
- Basic health endpoint (/health)
- Detailed health with database connectivity (/health/detailed)
- Readiness probe for Kubernetes (/health/readiness)
- Liveness probe for Kubernetes (/health/liveness)
- Custom business logic health validation

PERFORMANCE TOOLS:
- Slow query detection and alerting
- API endpoint performance benchmarking
- Memory leak detection
- Performance regression detection

IMPLEMENTATION:
- Create src/infrastructure/metrics/metrics.service.ts
- Performance interceptor for request timing
- Health controller with comprehensive checks
- Metrics collection middleware" --strategy development --max-agents 4 --parallel

sleep 60

log "🎉 FASE 8.3 CONCLUÍDA!"
exit 0
