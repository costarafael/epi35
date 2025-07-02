#!/bin/bash
# FASE 11.5: CI/CD AVANÇADO
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
./claude-flow memory store "fase_atual" "Executando Fase 11.5 - CI/CD Avançado"

# ========================================
# FASE 11.5: CI/CD AVANÇADO
# ========================================

log "🔄 Fase 11.5: Configurando CI/CD avançado"
./claude-flow swarm "Implement advanced CI/CD pipeline for production:

ADVANCED CI/CD PIPELINE:
1. Enhanced CI Pipeline (.github/workflows/ci-advanced.yml):
   - Matrix testing across Node.js versions
   - Parallel test execution for speed
   - Test splitting and optimization
   - Code coverage enforcement
   - Security scanning integration
   - Performance regression testing
   - Database migration testing
   - Integration test with real dependencies

2. Production CD Pipeline (.github/workflows/cd-production.yml):
   - Blue-green deployment automation
   - Canary deployment capability
   - Automated smoke testing
   - Progressive traffic shifting
   - Automated rollback on failure
   - Production validation steps
   - Approval workflows for critical changes
   - Post-deployment verification

3. Release Management Automation:
   - Semantic versioning enforcement
   - Changelog generation
   - Release notes automation
   - Git tag management
   - Artifact versioning and storage
   - Release approval workflow
   - Hotfix process automation

4. Quality Gates:
   - Stricter code coverage requirements (90%)
   - Performance baseline enforcement
   - Security vulnerability blocking
   - Accessibility compliance
   - Code quality metrics enforcement
   - Documentation completeness check
   - API contract validation

INTEGRATION FEATURES:
- Slack/Teams notification integration
- JIRA ticket automation
- Status page integration
- Deployment tracking dashboard
- Audit trail for deployments
- Compliance reporting automation" --strategy development --max-agents 3 --parallel

sleep 60

log "🎉 FASE 11.5 CONCLUÍDA!"
exit 0
