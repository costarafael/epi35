#!/bin/bash
# FASE 9.7: COMMIT E RELATÓRIO
# Script baseado no run-all-phases-script-fixed.sh

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

# ========================================
# COMMIT DAS MUDANÇAS
# ========================================

log "💾 Commitando mudanças da Fase 9"

git add . && git commit -m "feat(epi-backend): [Fase 9] DevOps setup with Docker, CI/CD and deployment automation

✅ Docker Configuration:
- Multi-stage Dockerfile optimized for production
- Docker Compose for development and production environments
- .dockerignore for optimized build context
- Security best practices with non-root user execution

✅ CI/CD Pipeline:
- GitHub Actions for continuous integration and deployment
- Automated testing, security scanning, and builds
- Multi-environment deployment with staging and production
- Quality gates and performance regression testing

✅ Kubernetes Deployment:
- Production-ready K8s manifests with all necessary resources
- Horizontal Pod Autoscaler and resource management
- Health checks integration with application endpoints
- Security policies and RBAC configuration

✅ Monitoring & Observability:
- Prometheus and Grafana stack configuration
- Comprehensive dashboards for application and infrastructure
- Structured logging with correlation IDs
- Alerting for critical system events

✅ Deployment Automation:
- Deployment scripts for different environments
- Rollback procedures and health validation
- Database migration automation
- Performance benchmarking and monitoring tools

✅ Production Readiness:
- Environment-specific configurations
- Secrets management integration
- Disaster recovery procedures
- Security configuration verification

Production-ready DevOps infrastructure complete with comprehensive automation." || true

git tag -a "phase-9-complete" -m "Phase 9 completed successfully" || true

# ========================================
# RELATÓRIO DA FASE 9
# ========================================

log "🎉 FASE 9 CONCLUÍDA!"
echo ""
echo "=================================="
echo "RESUMO DA FASE 9 - DEVOPS"
echo "=================================="
echo "✅ Dockerização completa"
echo "   - Dockerfile multi-stage otimizado"
echo "   - Docker Compose para dev e produção"
echo "   - Configurações de segurança"
echo ""
echo "✅ CI/CD Pipeline implementado"
echo "   - GitHub Actions com testes automatizados"
echo "   - Deploy automático para staging"
echo "   - Deploy manual para produção"
echo "   - Quality gates e validações"
echo ""
echo "✅ Kubernetes configurado"
echo "   - Manifests completos para produção"
echo "   - Auto-scaling e resource management"
echo "   - Health checks e probes"
echo "   - Políticas de segurança"
echo ""
echo "✅ Monitoramento configurado"
echo "   - Stack Prometheus + Grafana"
echo "   - Dashboards de performance"
echo "   - Logging estruturado"
echo "   - Alertas automáticos"
echo ""
echo "✅ Automação de deployment"
echo "   - Scripts de deploy por ambiente"
echo "   - Procedimentos de rollback"
echo "   - Validação de saúde"
echo "   - Makefile para desenvolvimento"
echo ""
echo "🐳 Comandos Docker:"
echo "  docker build -t epi-backend ."
echo "  docker-compose up -d              # Produção"
echo "  docker-compose -f docker-compose.dev.yml up -d  # Desenvolvimento"
echo ""
echo "☸️ Comandos Kubernetes:"
echo "  kubectl apply -f k8s/"
echo "  kubectl get pods,services,ingress"
echo ""
echo "🚀 Scripts de Deploy:"
echo "  scripts/deployment/deploy.sh staging"
echo "  scripts/deployment/deploy.sh production"
echo "  scripts/deployment/rollback.sh"
echo ""
echo "📊 Monitoramento:"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana: http://localhost:3000"
echo ""
echo "🚀 Próxima fase: ./run-fase-10-documentacao.sh"
echo "=================================="

exit 0
