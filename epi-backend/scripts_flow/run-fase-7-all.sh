#!/bin/bash
# FASE 7: TESTES ABRANGENTES - Script Principal
# Executa todos os scripts da fase 7 em sequência

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

log "🧪 FASE 7: Iniciando execução de todos os scripts de testes abrangentes"

# Executar cada script da fase 7 em sequência
log "🧪 Executando Fase 7.1: Testes Unitários"
./run-fase-7.1-unit-tests.sh || error "Falha na Fase 7.1"

log "🧪 Executando Fase 7.2: Testes de Integração"
./run-fase-7.2-integration-tests.sh || error "Falha na Fase 7.2"

log "🧪 Executando Fase 7.3: Testes End-to-End (E2E)"
./run-fase-7.3-e2e-tests.sh || error "Falha na Fase 7.3"

log "🧪 Executando Fase 7.4: Configuração do Ambiente de Testes"
./run-fase-7.4-test-env-setup.sh || error "Falha na Fase 7.4"

log "🧪 Executando Fase 7.5: Validação dos Testes"
./run-fase-7.5-validate-tests.sh || error "Falha na Fase 7.5"

log "🧪 Executando Fase 7.6: Commit e Relatório"
./run-fase-7.6-commit-and-report.sh || error "Falha na Fase 7.6"

log "🎉 FASE 7 CONCLUÍDA COM SUCESSO!"
echo "Próxima fase: ./run-fase-8-performance.sh"

exit 0
