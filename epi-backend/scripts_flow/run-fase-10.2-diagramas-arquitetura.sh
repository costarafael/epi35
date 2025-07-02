#!/bin/bash
# FASE 10.2: DIAGRAMAS DE ARQUITETURA
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
./claude-flow memory store "fase_atual" "Executando Fase 10.2 - Diagramas de Arquitetura"

# ========================================
# FASE 10.2: DIAGRAMAS DE ARQUITETURA
# ========================================

log "📊 Fase 10.2: Criando diagramas de arquitetura"
./claude-flow sparc run architect-epi "Create detailed architecture diagrams and documentation:

DIAGRAMS TO CREATE:
1. System Architecture Overview:
   - Clean Architecture layers visualization
   - Module dependencies and boundaries
   - Data flow between layers
   - External dependencies and integrations

2. Database Entity Relationship Diagram:
   - All 13 tables with relationships
   - Constraints and indexes visualization
   - Data flow and transaction boundaries
   - Critical business rules representation

3. Business Process Flow Diagrams:
   - Nota de movimentação complete lifecycle
   - Entrega process with signature requirement
   - Devolução process with partial returns
   - Estorno generation for cancellations
   - Concurrent operation scenarios

4. API Flow Diagrams:
   - Request/response flow through layers
   - Validation and error handling paths
   - Transaction management visualization
   - Cache and performance optimization points

DOCUMENTATION FORMATS:
- Mermaid diagrams for easy maintenance
- PlantUML for complex sequence diagrams
- ASCII diagrams for simple flows
- Markdown documentation with embedded diagrams"

sleep 60

log "🎉 FASE 10.2 CONCLUÍDA!"
exit 0
