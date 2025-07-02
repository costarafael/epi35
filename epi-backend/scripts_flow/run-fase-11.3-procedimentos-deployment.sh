#!/bin/bash
# FASE 11.3: PROCEDIMENTOS DE DEPLOYMENT
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
./claude-flow memory store "fase_atual" "Executando Fase 11.3 - Procedimentos de Deployment"

# ========================================
# FASE 11.3: PROCEDIMENTOS DE DEPLOYMENT
# ========================================

log "🚀 Fase 11.3: Criando procedimentos de deployment"
./claude-flow sparc run devops-automator "Create comprehensive production deployment procedures:

DEPLOYMENT PROCEDURES:
1. Blue-Green Deployment Strategy:
   - Detailed implementation steps
   - Traffic switching mechanism
   - Health validation requirements
   - Rollback procedures
   - Zero-downtime deployment process

2. Database Migration Procedures:
   - Safe migration execution process
   - Backward compatibility requirements
   - Data validation steps
   - Rollback procedures for failed migrations
   - Large dataset migration handling

3. Production Deployment Checklist:
   - Pre-deployment verification steps
   - Environment validation
   - Security verification
   - Performance baseline validation
   - Backup verification
   - Stakeholder sign-off requirements

4. Rollback Procedures:
   - Automated rollback triggers
   - Manual rollback process
   - Data integrity verification
   - Communication procedures
   - Post-rollback validation

5. Release Management:
   - Version tagging procedures
   - Release notes generation
   - Change log maintenance
   - Artifact management
   - Release approval process

AUTOMATION SCRIPTS:
- Deployment automation scripts
- Health check validation scripts
- Database migration scripts
- Rollback automation scripts
- Release management scripts"

sleep 60

log "🎉 FASE 11.3 CONCLUÍDA!"
exit 0
