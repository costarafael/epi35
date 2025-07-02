#!/bin/bash
# FASE 10: DOCUMENTAÇÃO E REVISÃO DE CÓDIGO - Script Principal
# Executa todos os scripts da fase 10 em sequência

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

log "⚡ FASE 10: Iniciando execução de todos os scripts de Documentação e Revisão de Código"

# Executar cada script da fase 10 em sequência
log "⚡ Executando Fase 10.1: Documentação Técnica Completa"
./run-fase-10.1-documentacao-tecnica.sh || error "Falha na Fase 10.1"

log "⚡ Executando Fase 10.2: Diagramas de Arquitetura"
./run-fase-10.2-diagramas-arquitetura.sh || error "Falha na Fase 10.2"

log "⚡ Executando Fase 10.3: Revisão Completa do Código"
./run-fase-10.3-revisao-codigo.sh || error "Falha na Fase 10.3"

log "⚡ Executando Fase 10.4: Guias Operacionais"
./run-fase-10.4-guias-operacionais.sh || error "Falha na Fase 10.4"

log "⚡ Executando Fase 10.5: Metadados Finais"
./run-fase-10.5-metadados-finais.sh || error "Falha na Fase 10.5"

log "⚡ Executando Fase 10.6: Validação da Documentação"
./run-fase-10.6-validacao-documentacao.sh || error "Falha na Fase 10.6"

log "⚡ Executando Fase 10.7: Commit e Relatório"
./run-fase-10.7-commit-and-report.sh || error "Falha na Fase 10.7"

log "🎉 FASE 10 CONCLUÍDA COM SUCESSO!"
echo "Próxima fase: ./run-fase-11-producao.sh"

exit 0
