#!/bin/bash
# FASE 10.1: DOCUMENTAÇÃO TÉCNICA COMPLETA
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
./claude-flow memory store "fase_atual" "Executando Fase 10.1 - Documentação Técnica Completa"

# ========================================
# FASE 10.1: DOCUMENTAÇÃO TÉCNICA COMPLETA
# ========================================

log "📝 Fase 10.1: Criando documentação técnica completa"
./claude-flow swarm "Create comprehensive technical documentation for the EPI backend system:

DOCUMENTATION STRUCTURE:
1. README.md with complete setup and usage instructions:
   - Project overview and architecture
   - Installation and setup steps
   - Environment configuration
   - Database setup and migrations
   - Development workflow
   - API usage examples
   - Testing procedures
   - Deployment instructions

2. API Documentation (docs/api/):
   - Complete endpoint documentation with examples
   - Request/response schemas
   - Error handling patterns
   - Authentication/authorization (future)
   - Rate limiting and pagination
   - Business rule explanations

3. Architecture Documentation (docs/architecture/):
   - Clean Architecture diagram and explanation
   - Domain model documentation
   - Database schema explanation
   - Transaction patterns and ACID compliance
   - Business flow diagrams for critical operations

4. Development Guide (docs/development/):
   - Code style guidelines
   - Testing strategy and conventions
   - Use case implementation patterns
   - Repository pattern usage
   - Error handling standards

CRITICAL FLOWS TO DOCUMENT:
- Complete nota lifecycle with sequence diagrams
- Entrega and devolução process with unit tracking
- Estorno generation and cancellation logic
- Concurrent operation handling
- Transaction boundaries and rollback scenarios

BUSINESS DOCUMENTATION:
- EPI management concepts and terminology
- Compliance requirements explanation
- Audit trail and rastreabilidade features
- Report generation and data analysis" --strategy development --max-agents 4 --parallel

sleep 90

log "🎉 FASE 10.1 CONCLUÍDA!"
exit 0
