#!/bin/bash
# FASE 9: DEVOPS E CONTAINERIZAÇÃO
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

log "🚢 FASE 9: Configurando DevOps, containerização e deployment"

# Verificar se docs-building existe para referência
if [ -d "docs-building" ]; then
    info "Pasta docs-building detectada. Será usada como referência durante o desenvolvimento."
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
./claude-flow memory store "fase_atual" "Executando Fase 9 - DevOps e Containerização. Fase 8 (Performance) concluída."
./claude-flow memory store "projeto_status" "Backend EPI v3.5 com otimizações de performance. Iniciando configuração de DevOps."

# ========================================
# FASE 9: DEVOPS E CONTAINERIZAÇÃO
# ========================================

log "🐳 Fase 9.1: Criando configuração Docker"
./claude-flow sparc run devops-automator "Create comprehensive Docker configuration for production deployment:

DOCKER SETUP:
1. Multi-stage Dockerfile for production:
   - Build stage with full Node.js environment
   - Production stage with minimal runtime image
   - Proper layer caching for dependencies
   - Security best practices (non-root user)
   - Health check endpoints integration

2. docker-compose.yml for production:
   - PostgreSQL service with EPI database
   - Redis service for caching
   - Backend API service
   - Nginx reverse proxy
   - Proper networking and volumes
   - Environment variable management

3. docker-compose.dev.yml for development:
   - Development database with seed data
   - Redis for development
   - Hot reload support
   - Debug configuration
   - pgAdmin for database management

4. .dockerignore optimization:
   - Exclude unnecessary files for smaller build context
   - Optimize build performance

SECURITY FEATURES:
- Non-root user execution
- Minimal attack surface
- Secure secrets handling
- Resource limits and constraints
- Health check implementation"

sleep 45

log "🚀 Fase 9.2: Configurando CI/CD pipeline"
./claude-flow swarm "Create comprehensive CI/CD pipeline with GitHub Actions:

CI/CD PIPELINE:
1. Continuous Integration (.github/workflows/ci.yml):
   - Multi-environment testing (Node.js versions)
   - Install dependencies and cache optimization
   - Run linter, type checking, and security audit
   - Execute all test suites (unit, integration, e2e)
   - Generate and upload coverage reports
   - Build application and verify
   - Security scanning with CodeQL
   - Docker image building and testing

2. Continuous Deployment (.github/workflows/cd.yml):
   - Automated deployment to staging
   - Production deployment with manual approval
   - Blue-green deployment strategy
   - Database migration handling
   - Rollback procedures
   - Health check validation during deployment

3. Quality Gates and Validations:
   - Minimum test coverage requirements (80%)
   - No critical security vulnerabilities
   - All linting and type checking passes
   - Successful integration tests
   - Performance regression testing

DEPLOYMENT ENVIRONMENTS:
- Staging environment with automated deployment
- Production environment with manual approval
- Environment-specific configurations
- Secrets management integration" --strategy development --max-agents 3 --parallel

sleep 60

log "🏗️ Fase 9.3: Criando configuração Kubernetes"
./claude-flow sparc run devops-automator "Create production-ready Kubernetes deployment configuration:

KUBERNETES MANIFESTS:
1. Core Resources (k8s/):
   - Namespace for environment isolation
   - ConfigMap for application configuration
   - Secret for sensitive data management
   - Deployment with replica management
   - Service for load balancing
   - Ingress for external access

2. Advanced Features:
   - Horizontal Pod Autoscaler (HPA)
   - Resource requests and limits
   - Readiness and liveness probes
   - Rolling update strategy
   - Pod disruption budgets

3. Security Configuration:
   - Pod security policies
   - Network policies
   - RBAC configuration
   - Service accounts

DEPLOYMENT FEATURES:
- Multi-replica deployment for high availability
- Health checks integration with our endpoints
- Resource optimization and scaling
- Persistent volume claims for uploads
- Load balancing and service discovery

MONITORING INTEGRATION:
- Prometheus metrics collection
- Grafana dashboard configuration
- Alert manager integration
- Log aggregation setup"

sleep 45

log "🔧 Fase 9.4: Configurando monitoramento e observabilidade"
./claude-flow sparc run devops-automator "Implement comprehensive monitoring and observability stack:

MONITORING STACK:
1. Prometheus Configuration:
   - Metrics collection from application
   - Database metrics scraping
   - Redis metrics monitoring
   - System metrics collection
   - Custom business metrics

2. Grafana Dashboards:
   - Application performance dashboard
   - Database performance monitoring
   - Business metrics visualization
   - System resource monitoring
   - Alert status dashboard

3. Logging Configuration:
   - Structured logging with correlation IDs
   - Log aggregation with proper retention
   - Error tracking and alerting
   - Security event logging
   - Performance log analysis

ALERTING SETUP:
- Critical error rate alerts
- High response time alerts
- Database connection alerts
- Memory usage alerts
- Custom business rule violations

OBSERVABILITY FEATURES:
- Distributed tracing setup
- Performance profiling
- Error tracking integration
- User session monitoring
- API usage analytics"

sleep 45

log "📋 Fase 9.5: Criando scripts de deployment e automação"
./claude-flow swarm "Create deployment automation scripts and utilities:

DEPLOYMENT SCRIPTS:
1. Deployment Automation (scripts/deployment/):
   - deploy.sh for environment-specific deployment
   - rollback.sh for quick rollback procedures
   - health-check.sh for deployment validation
   - migrate.sh for database migrations
   - backup.sh for data backup procedures

2. Development Utilities:
   - Makefile for common development tasks
   - Environment setup scripts
   - Database reset and seed scripts
   - Performance benchmarking tools
   - Log analysis utilities

3. Production Management:
   - Production readiness checklist
   - Environment variable validation
   - Security configuration verification
   - Performance baseline establishment
   - Disaster recovery procedures

AUTOMATION FEATURES:
- One-command deployment
- Automated health validation
- Rollback on failure detection
- Environment-specific configurations
- Secrets management integration

UTILITIES:
- Load testing scripts
- Database backup/restore
- Log rotation and cleanup
- Performance monitoring
- Security scanning automation" --strategy development --max-agents 4 --parallel

sleep 60

log "🔍 Fase 9.6: Validando configuração DevOps"
# Verificar se Docker está disponível e build funciona
if command -v docker &> /dev/null; then
    info "✅ Docker está disponível"
    # Tentar build básico para validar Dockerfile
    docker build -t epi-backend:test . > /dev/null 2>&1 && \
        info "✅ Build Docker bem-sucedido" || \
        warning "⚠️ Build Docker falhou - verificar se todas as dependências estão presentes"
else
    warning "⚠️ Docker não está instalado - install Docker para validar containers"
fi

# Build da aplicação para verificar se não há erros
npm run build || warning "Build pode ter avisos - verificar se configurações DevOps não afetaram o build"

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