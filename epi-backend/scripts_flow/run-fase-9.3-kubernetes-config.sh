#!/bin/bash
# FASE 9.3: CONFIGURAÇÃO KUBERNETES
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
./claude-flow memory store "fase_atual" "Executando Fase 9.3 - Configuração Kubernetes"

# ========================================
# FASE 9.3: CONFIGURAÇÃO KUBERNETES
# ========================================

log "🏗️ Fase 9.3: Criando configuração Kubernetes"
./claude-flow sparc run devops-automator "Create production-ready Kubernetes deployment configuration:

KUBERNETES MANIFESTS:
1. Core Resources (k8s/):
   - Namespace for environment isolation
   - ConfigMap for application configuration
   - Secret for sensitive data management
   - Deployment with replica management
   - Service for load balancing
   - Ingress for external access

2. Advanced Features:
   - Horizontal Pod Autoscaler (HPA)
   - Resource requests and limits
   - Readiness and liveness probes
   - Rolling update strategy
   - Pod disruption budgets

3. Security Configuration:
   - Pod security policies
   - Network policies
   - RBAC configuration
   - Service accounts

DEPLOYMENT FEATURES:
- Multi-replica deployment for high availability
- Health checks integration with our endpoints
- Resource optimization and scaling
- Persistent volume claims for uploads
- Load balancing and service discovery

MONITORING INTEGRATION:
- Prometheus metrics collection
- Grafana dashboard configuration
- Alert manager integration
- Log aggregation setup"

sleep 45

log "🎉 FASE 9.3 CONCLUÍDA!"
exit 0
