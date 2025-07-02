#!/bin/bash
# FASE 11.4: VALIDAÇÃO DE PRODUÇÃO
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
./claude-flow memory store "fase_atual" "Executando Fase 11.4 - Validação de Produção"

# ========================================
# FASE 11.4: VALIDAÇÃO DE PRODUÇÃO
# ========================================

log "🔍 Fase 11.4: Realizando validação de produção"
./claude-flow sparc run qa-expert "Perform comprehensive production readiness validation:

PRODUCTION VALIDATION:
1. Security Validation:
   - OWASP Top 10 vulnerability assessment
   - Security headers verification
   - Rate limiting effectiveness testing
   - Input validation robustness testing
   - Authentication/authorization testing
   - Secrets management verification

2. Performance Validation:
   - Load testing under production conditions
   - Stress testing to identify breaking points
   - Endurance testing for memory leaks
   - Database query performance validation
   - Cache effectiveness verification
   - API response time validation

3. Reliability Validation:
   - Failover testing
   - Resilience to component failures
   - Database connection handling
   - Error recovery procedures
   - Graceful degradation verification
   - Circuit breaker implementation testing

4. Scalability Validation:
   - Horizontal scaling verification
   - Resource utilization under load
   - Connection pooling effectiveness
   - Database scaling validation
   - Cache scaling verification
   - Kubernetes autoscaling testing

5. Compliance Validation:
   - Audit trail completeness
   - Data retention policy compliance
   - Access control verification
   - Logging completeness
   - Data protection verification

VALIDATION REPORT:
- Comprehensive validation findings
- Risk assessment
- Remediation recommendations
- Performance baseline establishment
- Production readiness certification"

sleep 60

log "🎉 FASE 11.4 CONCLUÍDA!"
exit 0
