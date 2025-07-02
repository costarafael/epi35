#!/bin/bash
# FASE 10.3: REVISÃO COMPLETA DO CÓDIGO
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
./claude-flow memory store "fase_atual" "Executando Fase 10.3 - Revisão Completa do Código"

# ========================================
# FASE 10.3: REVISÃO COMPLETA DO CÓDIGO
# ========================================

log "🔍 Fase 10.3: Realizando revisão completa do código"
./claude-flow sparc run code-reviewer "Perform comprehensive code review and quality analysis:

CODE REVIEW AREAS:
1. Clean Architecture Compliance:
   - Proper layer separation and dependencies
   - Domain logic isolation from infrastructure
   - Repository pattern implementation
   - Use case encapsulation and single responsibility

2. Business Logic Validation:
   - Critical transaction handling (ACID compliance)
   - Estoque negative validation logic
   - Unit tracking in entregas and devoluções
   - Signature requirement enforcement
   - Date calculations and vencimento logic

3. Error Handling and Validation:
   - Consistent error responses and status codes
   - Proper Zod schema validation
   - Business rule exception handling
   - Database constraint violation handling
   - Transaction rollback scenarios

4. Performance and Optimization:
   - N+1 query prevention
   - Proper Prisma includes usage
   - Index utilization in complex queries
   - Cache implementation effectiveness
   - Memory leak prevention

5. Security Considerations:
   - Input sanitization and validation
   - SQL injection prevention
   - Sensitive data handling
   - Audit trail completeness
   - Configuration security

DELIVERABLES:
- Code review report with specific recommendations
- Security assessment findings
- Performance optimization suggestions
- Technical debt identification
- Compliance verification checklist"

sleep 75

log "🎉 FASE 10.3 CONCLUÍDA!"
exit 0
