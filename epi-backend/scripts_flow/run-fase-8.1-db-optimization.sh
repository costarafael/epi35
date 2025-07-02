#!/bin/bash
# FASE 8.1: ANÁLISE E OTIMIZAÇÃO DE QUERIES DO BANCO
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
./claude-flow memory store "fase_atual" "Executando Fase 8.1 - Otimização de Queries do Banco"

# ========================================
# FASE 8.1: ANÁLISE E OTIMIZAÇÃO DE QUERIES DO BANCO
# ========================================

log "⚡ Fase 8.1: Analisando e otimizando queries do banco"
./claude-flow sparc run performance-optimizer "Analyze and optimize all database queries, especially for reports and critical operations:

CRITICAL QUERIES TO OPTIMIZE:
1. Relatório Kardex (movimentacoes_estoque with complex joins)
2. Relatório de conformidade (complex joins with colaboradores)
3. Saldo de estoque queries (estoque_itens aggregations)
4. Entregas and devoluções with status calculations
5. Vencimentos próximos (date calculations)

OPTIMIZATION TASKS:
- Add missing database indexes from section 3.4 of docs-building/backend-modeuleEPI-documentation.md
- Optimize N+1 queries with proper Prisma includes
- Add query result caching where appropriate
- Run EXPLAIN ANALYZE on critical queries
- Optimize JOIN patterns in complex reports
- Add database-level performance monitoring
- Create query performance benchmarks

INDEX CREATION:
- Implement all recommended indexes from docs
- Add composite indexes for specific query patterns
- Create partial indexes for filtered queries
- Monitor index usage and effectiveness

PERFORMANCE SCRIPTS:
- Create scripts/database/performance-indexes.sql
- Create database analysis tools
- Add query benchmarking utilities"

sleep 45

log "🎉 FASE 8.1 CONCLUÍDA!"
exit 0
