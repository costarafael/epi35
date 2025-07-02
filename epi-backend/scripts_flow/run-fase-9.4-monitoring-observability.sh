#!/bin/bash
# FASE 9.4: MONITORAMENTO E OBSERVABILIDADE
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
./claude-flow memory store "fase_atual" "Executando Fase 9.4 - Monitoramento e Observabilidade"

# ========================================
# FASE 9.4: MONITORAMENTO E OBSERVABILIDADE
# ========================================

log "🔧 Fase 9.4: Configurando monitoramento e observabilidade"
./claude-flow sparc run devops-automator "Implement comprehensive monitoring and observability stack:

MONITORING STACK:
1. Prometheus Configuration:
   - Metrics collection from application
   - Database metrics scraping
   - Redis metrics monitoring
   - System metrics collection
   - Custom business metrics

2. Grafana Dashboards:
   - Application performance dashboard
   - Database performance monitoring
   - Business metrics visualization
   - System resource monitoring
   - Alert status dashboard

3. Logging Configuration:
   - Structured logging with correlation IDs
   - Log aggregation with proper retention
   - Error tracking and alerting
   - Security event logging
   - Performance log analysis

ALERTING SETUP:
- Critical error rate alerts
- High response time alerts
- Database connection alerts
- Memory usage alerts
- Custom business rule violations

OBSERVABILITY FEATURES:
- Distributed tracing setup
- Performance profiling
- Error tracking integration
- User session monitoring
- API usage analytics"

sleep 45

log "🎉 FASE 9.4 CONCLUÍDA!"
exit 0
