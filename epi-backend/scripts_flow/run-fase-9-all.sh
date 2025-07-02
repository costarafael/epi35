#!/bin/bash
# FASE 9: DEVOPS E CONTAINERIZAÇÃO - Script Principal
# Executa todos os scripts da fase 9 em sequência

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

log "⚡ FASE 9: Iniciando execução de todos os scripts de DevOps e Containerização"

# Executar cada script da fase 9 em sequência
log "⚡ Executando Fase 9.1: Configuração Docker"
./run-fase-9.1-docker-config.sh || error "Falha na Fase 9.1"

log "⚡ Executando Fase 9.2: Configuração CI/CD Pipeline"
./run-fase-9.2-cicd-pipeline.sh || error "Falha na Fase 9.2"

log "⚡ Executando Fase 9.3: Configuração Kubernetes"
./run-fase-9.3-kubernetes-config.sh || error "Falha na Fase 9.3"

log "⚡ Executando Fase 9.4: Monitoramento e Observabilidade"
./run-fase-9.4-monitoring-observability.sh || error "Falha na Fase 9.4"

log "⚡ Executando Fase 9.5: Scripts de Deployment e Automação"
./run-fase-9.5-deployment-scripts.sh || error "Falha na Fase 9.5"

log "⚡ Executando Fase 9.6: Validação da Configuração DevOps"
./run-fase-9.6-validate-devops.sh || error "Falha na Fase 9.6"

log "⚡ Executando Fase 9.7: Commit e Relatório"
./run-fase-9.7-commit-and-report.sh || error "Falha na Fase 9.7"

log "🎉 FASE 9 CONCLUÍDA COM SUCESSO!"
echo "Próxima fase: ./run-fase-10-documentacao.sh"

exit 0
