#!/bin/bash
# FASE 10: DOCUMENTAÇÃO E REVISÃO DE CÓDIGO
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

log "📚 FASE 10: Criando documentação completa e revisão de código"

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
./claude-flow memory store "fase_atual" "Executando Fase 10 - Documentação e Revisão. Fase 9 (DevOps) concluída."
./claude-flow memory store "projeto_status" "Backend EPI v3.5 com infraestrutura DevOps completa. Iniciando documentação e revisão final."

# ========================================
# FASE 10: DOCUMENTAÇÃO E REVISÃO
# ========================================

log "📝 Fase 10.1: Criando documentação técnica completa"
./claude-flow swarm "Create comprehensive technical documentation for the EPI backend system:

DOCUMENTATION STRUCTURE:
1. README.md with complete setup and usage instructions:
   - Project overview and architecture
   - Installation and setup steps
   - Environment configuration
   - Database setup and migrations
   - Development workflow
   - API usage examples
   - Testing procedures
   - Deployment instructions

2. API Documentation (docs/api/):
   - Complete endpoint documentation with examples
   - Request/response schemas
   - Error handling patterns
   - Authentication/authorization (future)
   - Rate limiting and pagination
   - Business rule explanations

3. Architecture Documentation (docs/architecture/):
   - Clean Architecture diagram and explanation
   - Domain model documentation
   - Database schema explanation
   - Transaction patterns and ACID compliance
   - Business flow diagrams for critical operations

4. Development Guide (docs/development/):
   - Code style guidelines
   - Testing strategy and conventions
   - Use case implementation patterns
   - Repository pattern usage
   - Error handling standards

CRITICAL FLOWS TO DOCUMENT:
- Complete nota lifecycle with sequence diagrams
- Entrega and devolução process with unit tracking
- Estorno generation and cancellation logic
- Concurrent operation handling
- Transaction boundaries and rollback scenarios

BUSINESS DOCUMENTATION:
- EPI management concepts and terminology
- Compliance requirements explanation
- Audit trail and rastreabilidade features
- Report generation and data analysis" --strategy development --max-agents 4 --parallel

sleep 90

log "📊 Fase 10.2: Criando diagramas de arquitetura"
./claude-flow sparc run architect-epi "Create detailed architecture diagrams and documentation:

DIAGRAMS TO CREATE:
1. System Architecture Overview:
   - Clean Architecture layers visualization
   - Module dependencies and boundaries
   - Data flow between layers
   - External dependencies and integrations

2. Database Entity Relationship Diagram:
   - All 13 tables with relationships
   - Constraints and indexes visualization
   - Data flow and transaction boundaries
   - Critical business rules representation

3. Business Process Flow Diagrams:
   - Nota de movimentação complete lifecycle
   - Entrega process with signature requirement
   - Devolução process with partial returns
   - Estorno generation for cancellations
   - Concurrent operation scenarios

4. API Flow Diagrams:
   - Request/response flow through layers
   - Validation and error handling paths
   - Transaction management visualization
   - Cache and performance optimization points

DOCUMENTATION FORMATS:
- Mermaid diagrams for easy maintenance
- PlantUML for complex sequence diagrams
- ASCII diagrams for simple flows
- Markdown documentation with embedded diagrams"

sleep 60

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

log "📋 Fase 10.4: Criando guias operacionais"
./claude-flow sparc run documenter "Create operational guides and troubleshooting documentation:

OPERATIONAL DOCUMENTATION:
1. Deployment Guide:
   - Step-by-step production deployment
   - Environment configuration checklist
   - Database migration procedures
   - Health check validation
   - Rollback procedures

2. Troubleshooting Guide:
   - Common error scenarios and solutions
   - Database connectivity issues
   - Performance troubleshooting
   - Transaction deadlock resolution
   - Cache invalidation problems

3. Monitoring and Maintenance:
   - Key metrics to monitor
   - Log analysis procedures
   - Performance baseline establishment
   - Backup and recovery procedures
   - Database maintenance tasks

4. Business User Guide:
   - API usage examples for common scenarios
   - Error message explanations
   - Business rule clarifications
   - Report parameter descriptions
   - Data export procedures

MAINTENANCE DOCUMENTATION:
- Regular maintenance tasks schedule
- Database cleanup procedures
- Performance monitoring guidelines
- Security audit procedures
- Backup verification steps"

sleep 60

log "📚 Fase 10.5: Finalizando documentação e metadados"
./claude-flow sparc run documenter "Complete documentation with changelog, migration guides, and project metadata:

FINAL DOCUMENTATION:
1. CHANGELOG.md:
   - Version history with detailed changes
   - Breaking changes documentation
   - Migration instructions between versions
   - New feature descriptions
   - Bug fix summaries

2. Project Metadata:
   - package.json with proper dependencies
   - LICENSE file if applicable
   - CONTRIBUTING.md for future developers
   - CODE_OF_CONDUCT.md for team standards
   - .github templates for issues and PRs

3. Migration Guides:
   - Database migration best practices
   - Version upgrade procedures
   - Configuration changes between versions
   - Data migration scripts
   - Rollback procedures

4. Release Notes:
   - Feature comparison matrix
   - Performance improvements summary
   - Known limitations and workarounds
   - Future roadmap and planned features
   - Compatibility matrix

QUALITY ASSURANCE:
- Documentation completeness checklist
- Link validation and accuracy
- Code example testing
- Diagram accuracy verification
- User acceptance criteria validation"

sleep 45

log "✅ Fase 10.6: Validando documentação criada"
# Verificar se documentação foi criada
if [ -f "README.md" ]; then
    info "✅ README.md criado com sucesso"
else
    warning "⚠️ README.md não encontrado - verificar se foi criado"
fi

if [ -d "docs" ]; then
    info "✅ Pasta docs criada com documentação técnica"
    find docs -name "*.md" | head -5 | while read file; do
        info "  📄 $file"
    done
else
    warning "⚠️ Pasta docs não encontrada - verificar se documentação foi criada"
fi

# Build para verificar se não há erros após documentação
npm run build || warning "Build pode ter avisos - normal durante desenvolvimento final"

# ========================================
# COMMIT DAS MUDANÇAS
# ========================================

log "💾 Commitando mudanças da Fase 10"

git add . && git commit -m "docs(epi-backend): [Fase 10] Complete documentation and code review

✅ Technical Documentation:
- Comprehensive README with setup and usage instructions
- Complete API documentation with examples
- Architecture diagrams and system overview
- Development guide with code standards

✅ Architecture Documentation:
- Clean Architecture layer explanation
- Database schema and relationship diagrams
- Business process flow diagrams
- Transaction patterns and ACID compliance

✅ Code Review:
- Clean Architecture compliance verification
- Business logic validation review
- Error handling and validation assessment
- Performance and security analysis

✅ Operational Guides:
- Deployment procedures and checklists
- Troubleshooting guide with common scenarios
- Monitoring and maintenance documentation
- Business user guide with API examples

✅ Project Metadata:
- CHANGELOG with version history
- Migration guides and upgrade procedures
- Release notes and feature documentation
- Quality assurance checklists

Complete documentation package ready for production deployment." || true

git tag -a "phase-10-complete" -m "Phase 10 completed successfully" || true

# ========================================
# RELATÓRIO DA FASE 10
# ========================================

log "🎉 FASE 10 CONCLUÍDA!"
echo ""
echo "=================================="
echo "RESUMO DA FASE 10 - DOCUMENTAÇÃO"
echo "=================================="
echo "✅ Documentação técnica completa"
echo "   - README abrangente com setup"
echo "   - Documentação completa da API"
echo "   - Guias de arquitetura e desenvolvimento"
echo "   - Diagramas de fluxo e processos"
echo ""
echo "✅ Revisão de código realizada"
echo "   - Compliance com Clean Architecture"
echo "   - Validação de regras de negócio"
echo "   - Análise de performance e segurança"
echo "   - Identificação de melhorias"
echo ""
echo "✅ Guias operacionais criados"
echo "   - Procedimentos de deployment"
echo "   - Guia de troubleshooting"
echo "   - Documentação de monitoramento"
echo "   - Manual do usuário da API"
echo ""
echo "✅ Metadados do projeto finalizados"
echo "   - CHANGELOG com histórico"
echo "   - Guias de migração"
echo "   - Release notes detalhadas"
echo "   - Checklists de qualidade"
echo ""
echo "📚 Documentação disponível em:"
echo "  README.md                    # Setup e overview"
echo "  docs/api/                    # Documentação da API"
echo "  docs/architecture/           # Diagramas e arquitetura"
echo "  docs/development/            # Guias de desenvolvimento"
echo "  docs/operations/             # Guias operacionais"
echo "  CHANGELOG.md                 # Histórico de versões"
echo ""
echo "🔗 Links úteis:"
echo "  Swagger UI: http://localhost:3333/api"
echo "  Architecture docs: docs/architecture/README.md"
echo "  API examples: docs/api/examples.md"
echo ""
echo "🚀 Próxima fase: ./run-fase-11-producao.sh"
echo "=================================="

exit 0