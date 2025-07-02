#!/bin/bash
# FASE 9.1: CONFIGURAÇÃO DOCKER
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
./claude-flow memory store "fase_atual" "Executando Fase 9.1 - Configuração Docker"

# ========================================
# FASE 9.1: CONFIGURAÇÃO DOCKER
# ========================================

log "🐳 Fase 9.1: Criando configuração Docker"
./claude-flow sparc run devops-automator "Create comprehensive Docker configuration for production deployment:

DOCKER SETUP:
1. Multi-stage Dockerfile for production:
   - Build stage with full Node.js environment
   - Production stage with minimal runtime image
   - Proper layer caching for dependencies
   - Security best practices (non-root user)
   - Health check endpoints integration

2. docker-compose.yml for production:
   - PostgreSQL service with EPI database
   - Redis service for caching
   - Backend API service
   - Nginx reverse proxy
   - Proper networking and volumes
   - Environment variable management

3. docker-compose.dev.yml for development:
   - Development database with seed data
   - Redis for development
   - Hot reload support
   - Debug configuration
   - pgAdmin for database management

4. .dockerignore optimization:
   - Exclude unnecessary files for smaller build context
   - Optimize build performance

SECURITY FEATURES:
- Non-root user execution
- Minimal attack surface
- Secure secrets handling
- Resource limits and constraints
- Health check implementation"

sleep 45

log "🎉 FASE 9.1 CONCLUÍDA!"
exit 0
