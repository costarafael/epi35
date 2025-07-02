#!/bin/bash
# FASE 11.2: MONITORAMENTO DE PRODUÇÃO
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
./claude-flow memory store "fase_atual" "Executando Fase 11.2 - Monitoramento de Produção"

# ========================================
# FASE 11.2: MONITORAMENTO DE PRODUÇÃO
# ========================================

log "📊 Fase 11.2: Configurando monitoramento de produção"
./claude-flow swarm "Implement comprehensive production monitoring and observability:

PRODUCTION MONITORING:
1. Advanced Metrics Collection:
   - Business KPI metrics
   - SLA compliance metrics
   - Error rate tracking
   - Database performance metrics
   - Cache hit/miss ratio
   - API response time percentiles
   - Resource utilization metrics

2. Production Dashboards:
   - Executive overview dashboard
   - Operations dashboard
   - Performance dashboard
   - Error tracking dashboard
   - Security events dashboard
   - Database health dashboard
   - Custom business metrics dashboard

3. Alerting Configuration:
   - Critical error alerts
   - Performance degradation alerts
   - Security incident alerts
   - Resource exhaustion alerts
   - Database health alerts
   - Business rule violation alerts
   - On-call rotation integration

4. Log Management:
   - Centralized logging configuration
   - Log retention policies
   - Log search and analysis
   - Error correlation
   - Audit trail logging
   - Security event logging
   - Performance logging

OBSERVABILITY ENHANCEMENTS:
- Distributed tracing with sampling
- Service dependency mapping
- User session tracking
- Business transaction monitoring
- Anomaly detection configuration
- Performance baseline establishment
- Health check endpoint enhancements" --strategy development --max-agents 3 --parallel

sleep 60

log "🎉 FASE 11.2 CONCLUÍDA!"
exit 0
