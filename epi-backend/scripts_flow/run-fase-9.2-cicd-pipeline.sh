#!/bin/bash
# FASE 9.2: CONFIGURAÇÃO CI/CD PIPELINE
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
./claude-flow memory store "fase_atual" "Executando Fase 9.2 - Configuração CI/CD Pipeline"

# ========================================
# FASE 9.2: CONFIGURAÇÃO CI/CD PIPELINE
# ========================================

log "🚀 Fase 9.2: Configurando CI/CD pipeline"
./claude-flow swarm "Create comprehensive CI/CD pipeline with GitHub Actions:

CI/CD PIPELINE:
1. Continuous Integration (.github/workflows/ci.yml):
   - Multi-environment testing (Node.js versions)
   - Install dependencies and cache optimization
   - Run linter, type checking, and security audit
   - Execute all test suites (unit, integration, e2e)
   - Generate and upload coverage reports
   - Build application and verify
   - Security scanning with CodeQL
   - Docker image building and testing

2. Continuous Deployment (.github/workflows/cd.yml):
   - Automated deployment to staging
   - Production deployment with manual approval
   - Blue-green deployment strategy
   - Database migration handling
   - Rollback procedures
   - Health check validation during deployment

3. Quality Gates and Validations:
   - Minimum test coverage requirements (80%)
   - No critical security vulnerabilities
   - All linting and type checking passes
   - Successful integration tests
   - Performance regression testing

DEPLOYMENT ENVIRONMENTS:
- Staging environment with automated deployment
- Production environment with manual approval
- Environment-specific configurations
- Secrets management integration" --strategy development --max-agents 3 --parallel

sleep 60

log "🎉 FASE 9.2 CONCLUÍDA!"
exit 0
