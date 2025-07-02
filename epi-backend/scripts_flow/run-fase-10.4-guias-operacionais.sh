#!/bin/bash
# FASE 10.4: GUIAS OPERACIONAIS
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
./claude-flow memory store "fase_atual" "Executando Fase 10.4 - Guias Operacionais"

# ========================================
# FASE 10.4: GUIAS OPERACIONAIS
# ========================================

log "📚 Fase 10.4: Criando guias operacionais"
./claude-flow swarm "Create comprehensive operational guides for the EPI system:

OPERATIONAL GUIDES:
1. System Administration Guide (docs/operations/admin-guide.md):
   - Server requirements and scaling guidelines
   - Database maintenance procedures
   - Backup and restore procedures
   - Performance monitoring and tuning
   - Log management and rotation
   - Security best practices

2. Deployment Guide (docs/operations/deployment-guide.md):
   - Environment setup requirements
   - Docker deployment instructions
   - Kubernetes deployment instructions
   - Database migration procedures
   - Configuration management
   - Rollback procedures

3. Troubleshooting Guide (docs/operations/troubleshooting.md):
   - Common error scenarios and solutions
   - Performance issue diagnosis
   - Database connection troubleshooting
   - API error resolution steps
   - Log analysis techniques
   - Support escalation procedures

4. Disaster Recovery Plan (docs/operations/disaster-recovery.md):
   - Backup verification procedures
   - Recovery time objectives
   - Data integrity verification
   - System restoration steps
   - Failover procedures
   - Business continuity planning

MAINTENANCE PROCEDURES:
- Database index maintenance
- Cache invalidation procedures
- Log rotation and archiving
- Security patch application
- Performance optimization steps
- Data integrity validation" --strategy development --max-agents 3 --parallel

sleep 60

log "🎉 FASE 10.4 CONCLUÍDA!"
exit 0
