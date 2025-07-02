#!/bin/bash
# FASE 10.5: METADADOS FINAIS
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
./claude-flow memory store "fase_atual" "Executando Fase 10.5 - Metadados Finais"

# ========================================
# FASE 10.5: METADADOS FINAIS
# ========================================

log "📋 Fase 10.5: Criando metadados finais"
./claude-flow sparc run metadata-generator "Create comprehensive project metadata and documentation:

METADATA FILES:
1. package.json Enhancements:
   - Complete project metadata
   - Proper versioning (1.0.0)
   - License information
   - Repository links
   - Author and contributor information
   - Keywords for discoverability
   - Script documentation

2. CHANGELOG.md Creation:
   - Complete version history
   - Feature additions by phase
   - Bug fixes and improvements
   - Breaking changes documentation
   - Migration guides where applicable

3. CONTRIBUTING.md Creation:
   - Development workflow
   - Pull request process
   - Coding standards
   - Testing requirements
   - Documentation requirements
   - Issue reporting guidelines

4. LICENSE File:
   - Appropriate open source license
   - Copyright information
   - Usage restrictions if applicable

5. .github/ Templates:
   - Issue templates
   - Pull request templates
   - Security policy
   - Code of conduct

DOCUMENTATION ORGANIZATION:
- Consistent file structure
- Cross-referencing between documents
- Table of contents for navigation
- Version tagging for documentation"

sleep 45

log "🎉 FASE 10.5 CONCLUÍDA!"
exit 0
