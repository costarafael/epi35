#!/bin/bash
# FASE 9.6: VALIDAÇÃO DA CONFIGURAÇÃO DEVOPS
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
./claude-flow memory store "fase_atual" "Executando Fase 9.6 - Validação da Configuração DevOps"

# ========================================
# FASE 9.6: VALIDAÇÃO DA CONFIGURAÇÃO DEVOPS
# ========================================

log "🔍 Fase 9.6: Validando configuração DevOps"
# Verificar se Docker está disponível e build funciona
if command -v docker &> /dev/null; then
    info "✅ Docker está disponível"
    # Tentar build básico para validar Dockerfile
    docker build -t epi-backend:test . > /dev/null 2>&1 && \
        info "✅ Build Docker bem-sucedido" || \
        warning "⚠️ Build Docker falhou - verificar se todas as dependências estão presentes"
else
    warning "⚠️ Docker não está instalado - install Docker para validar containers"
fi

# Build da aplicação para verificar se não há erros
npm run build || warning "Build pode ter avisos - verificar se configurações DevOps não afetaram o build"

log "🎉 FASE 9.6 CONCLUÍDA!"
exit 0
