#!/bin/bash
# FASE 8: OTIMIZAÇÕES DE PERFORMANCE - Script Principal
# Executa todos os scripts da fase 8 em sequência

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

# Verificar se estamos no diretório correto do projeto
if [ ! -f "package.json" ]; then
    error "package.json não encontrado. Execute este script no diretório raiz do projeto epi-backend."
fi

log "⚡ FASE 8: Iniciando execução de todos os scripts de otimização de performance"

# Executar cada script da fase 8 em sequência
log "⚡ Executando Fase 8.1: Análise e Otimização de Queries do Banco"
./run-fase-8.1-db-optimization.sh || error "Falha na Fase 8.1"

log "⚡ Executando Fase 8.2: Implementação de Sistema de Cache"
./run-fase-8.2-cache-system.sh || error "Falha na Fase 8.2"

log "⚡ Executando Fase 8.3: Implementação de Monitoramento de Performance"
./run-fase-8.3-performance-monitoring.sh || error "Falha na Fase 8.3"

log "⚡ Executando Fase 8.4: Criação de Ferramentas de Análise de Performance"
./run-fase-8.4-analysis-tools.sh || error "Falha na Fase 8.4"

log "⚡ Executando Fase 8.5: Validação das Otimizações Implementadas"
./run-fase-8.5-validate-optimizations.sh || error "Falha na Fase 8.5"

log "⚡ Executando Fase 8.6: Commit e Relatório"
./run-fase-8.6-commit-and-report.sh || error "Falha na Fase 8.6"

log "🎉 FASE 8 CONCLUÍDA COM SUCESSO!"
echo "Próxima fase: ./run-fase-9-devops.sh"

exit 0
