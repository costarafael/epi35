#!/bin/bash
# FASE 8.2: IMPLEMENTAÇÃO DE SISTEMA DE CACHE
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
./claude-flow memory store "fase_atual" "Executando Fase 8.2 - Implementação de Sistema de Cache"

# ========================================
# FASE 8.2: IMPLEMENTAÇÃO DE SISTEMA DE CACHE
# ========================================

log "⚡ Fase 8.2: Implementando sistema de cache"
./claude-flow sparc run performance-optimizer "Implement comprehensive caching strategy:

CACHING SYSTEM:
1. In-memory cache service with TTL and eviction policies
2. Cache decorators for automatic query caching (@Cacheable)
3. Cache invalidation patterns (@InvalidateCache)
4. Redis integration for distributed caching
5. Configuration-based cache settings

CACHE TARGETS:
- Estoque saldos for frequently accessed data
- Configuration values (PERMITIR_ESTOQUE_NEGATIVO)
- Report results with appropriate TTL
- User session data
- Static reference data (tipos_epi, almoxarifados)

IMPLEMENTATION:
- Create src/infrastructure/cache/cache.service.ts
- Implement cache decorators
- Add cache middleware
- Cache invalidation on data updates
- Cache hit/miss ratio monitoring

FEATURES:
- Configurable TTL per cache entry
- Maximum cache size limits
- Automatic cleanup of expired entries
- Cache statistics and monitoring"

sleep 45

log "🎉 FASE 8.2 CONCLUÍDA!"
exit 0
