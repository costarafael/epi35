#!/bin/bash
# FASE 11: PREPARAÇÃO PARA PRODUÇÃO - Script Principal
# Executa todos os scripts da fase 11 em sequência

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

log "⚡ FASE 11: Iniciando execução de todos os scripts de Preparação para Produção"

# Executar cada script da fase 11 em sequência
log "⚡ Executando Fase 11.1: Configuração de Segurança para Produção"
./run-fase-11.1-seguranca-producao.sh || error "Falha na Fase 11.1"

log "⚡ Executando Fase 11.2: Monitoramento de Produção"
./run-fase-11.2-monitoramento-producao.sh || error "Falha na Fase 11.2"

log "⚡ Executando Fase 11.3: Procedimentos de Deployment"
./run-fase-11.3-procedimentos-deployment.sh || error "Falha na Fase 11.3"

log "⚡ Executando Fase 11.4: Validação de Produção"
./run-fase-11.4-validacao-producao.sh || error "Falha na Fase 11.4"

log "⚡ Executando Fase 11.5: CI/CD Avançado"
./run-fase-11.5-cicd-avancado.sh || error "Falha na Fase 11.5"

log "⚡ Executando Fase 11.6: Validação Final"
./run-fase-11.6-validacao-final.sh || error "Falha na Fase 11.6"

log "⚡ Executando Fase 11.7: Commit e Relatório Final"
./run-fase-11.7-commit-and-report.sh || error "Falha na Fase 11.7"

log "🎉 FASE 11 CONCLUÍDA COM SUCESSO!"
echo "PROJETO EPI COMPLETO!"

exit 0
