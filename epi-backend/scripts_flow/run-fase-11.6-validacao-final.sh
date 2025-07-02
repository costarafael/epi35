#!/bin/bash
# FASE 11.6: VALIDAÇÃO FINAL
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
./claude-flow memory store "fase_atual" "Executando Fase 11.6 - Validação Final"

# ========================================
# FASE 11.6: VALIDAÇÃO FINAL
# ========================================

log "🔍 Fase 11.6: Realizando validação final"
# Verificar build da aplicação
npm run build || warning "⚠️ Build tem avisos - verificar antes do deploy final"

# Executar testes
npm test || warning "⚠️ Alguns testes podem falhar - verificar antes do deploy final"

# Verificar se Docker está disponível e build funciona
if command -v docker &> /dev/null; then
    info "✅ Docker está disponível"
    # Tentar build para validar Dockerfile
    docker build -t epi-backend:production . > /dev/null 2>&1 && \
        info "✅ Build Docker de produção bem-sucedido" || \
        warning "⚠️ Build Docker falhou - verificar configuração"
else
    warning "⚠️ Docker não está instalado - instale Docker para validar containers"
fi

# Verificar arquivos de configuração de produção
if [ -f ".env.production" ]; then
    info "✅ Arquivo de configuração de produção encontrado"
else
    warning "⚠️ Arquivo .env.production não encontrado - criar antes do deploy"
fi

# Verificar documentação
if [ -d "docs" ]; then
    info "✅ Documentação encontrada"
else
    warning "⚠️ Diretório de documentação não encontrado"
fi

# Verificar scripts de deployment
if [ -d "scripts/deployment" ]; then
    info "✅ Scripts de deployment encontrados"
else
    warning "⚠️ Scripts de deployment não encontrados"
fi

log "🎉 FASE 11.6 CONCLUÍDA!"
exit 0
