#!/bin/bash
# FASE 10.6: VALIDAÇÃO DA DOCUMENTAÇÃO
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
./claude-flow memory store "fase_atual" "Executando Fase 10.6 - Validação da Documentação"

# ========================================
# FASE 10.6: VALIDAÇÃO DA DOCUMENTAÇÃO
# ========================================

log "🔍 Fase 10.6: Validando documentação"
# Verificar existência dos arquivos de documentação principais
if [ -d "docs" ]; then
    info "✅ Diretório de documentação encontrado"
    
    # Verificar documentação da API
    if [ -d "docs/api" ]; then
        info "✅ Documentação da API encontrada"
    else
        warning "⚠️ Documentação da API não encontrada"
    fi
    
    # Verificar documentação de arquitetura
    if [ -d "docs/architecture" ]; then
        info "✅ Documentação de arquitetura encontrada"
    else
        warning "⚠️ Documentação de arquitetura não encontrada"
    fi
    
    # Verificar guias operacionais
    if [ -d "docs/operations" ]; then
        info "✅ Guias operacionais encontrados"
    else
        warning "⚠️ Guias operacionais não encontrados"
    fi
else
    warning "⚠️ Diretório de documentação não encontrado - criando estrutura básica"
    mkdir -p docs/api docs/architecture docs/development docs/operations
fi

# Verificar README.md
if [ -f "README.md" ]; then
    info "✅ README.md encontrado"
else
    warning "⚠️ README.md não encontrado - será criado na próxima fase"
fi

# Verificar CHANGELOG.md
if [ -f "CHANGELOG.md" ]; then
    info "✅ CHANGELOG.md encontrado"
else
    warning "⚠️ CHANGELOG.md não encontrado - será criado na próxima fase"
fi

# Verificar metadados do package.json
if [ -f "package.json" ]; then
    # Verificar se tem descrição
    if grep -q '"description":' package.json; then
        info "✅ Descrição no package.json encontrada"
    else
        warning "⚠️ Descrição no package.json não encontrada"
    fi
    
    # Verificar se tem autor
    if grep -q '"author":' package.json; then
        info "✅ Autor no package.json encontrado"
    else
        warning "⚠️ Autor no package.json não encontrado"
    fi
fi

log "🎉 FASE 10.6 CONCLUÍDA!"
exit 0
