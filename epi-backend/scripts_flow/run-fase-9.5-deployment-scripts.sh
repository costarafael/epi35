#!/bin/bash
# FASE 9.5: SCRIPTS DE DEPLOYMENT E AUTOMAÇÃO
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
./claude-flow memory store "fase_atual" "Executando Fase 9.5 - Scripts de Deployment e Automação"

# ========================================
# FASE 9.5: SCRIPTS DE DEPLOYMENT E AUTOMAÇÃO
# ========================================

log "📋 Fase 9.5: Criando scripts de deployment e automação"
./claude-flow swarm "Create deployment automation scripts and utilities:

DEPLOYMENT SCRIPTS:
1. Deployment Automation (scripts/deployment/):
   - deploy.sh for environment-specific deployment
   - rollback.sh for quick rollback procedures
   - health-check.sh for deployment validation
   - migrate.sh for database migrations
   - backup.sh for data backup procedures

2. Development Utilities:
   - Makefile for common development tasks
   - Environment setup scripts
   - Database reset and seed scripts
   - Performance benchmarking tools
   - Log analysis utilities

3. Production Management:
   - Production readiness checklist
   - Environment variable validation
   - Security configuration verification
   - Performance baseline establishment
   - Disaster recovery procedures

AUTOMATION FEATURES:
- One-command deployment
- Automated health validation
- Rollback on failure detection
- Environment-specific configurations
- Secrets management integration

UTILITIES:
- Load testing scripts
- Database backup/restore
- Log rotation and cleanup
- Performance monitoring
- Security scanning automation" --strategy development --max-agents 4 --parallel

sleep 60

log "🎉 FASE 9.5 CONCLUÍDA!"
exit 0
