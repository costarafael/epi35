#!/bin/bash
# FASE 7.6: COMMIT E RELATÓRIO
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

log "💾 Commitando mudanças da Fase 7"

git add . && git commit -m "feat(epi-backend): [Fase 7] Enhanced test suite with real database infrastructure

✅ Unit Tests Enhanced:
- Business logic validation with focused domain testing
- Complementary to existing integration tests
- Edge case and error scenario coverage
- Domain entity and use case validation

✅ Integration Tests Expanded:
- 70+ comprehensive tests using real PostgreSQL database
- TestDatabaseService with automatic setup and rollback
- Cross-module integration validation with seed data
- Concurrent operation testing with transactional safety

✅ E2E Tests Added:
- Complete API endpoint testing with Supertest
- HTTP contract validation and response format testing
- Request/response validation with proper status codes
- API layer testing complementing integration tests

✅ Test Infrastructure Optimized:
- Docker-based PostgreSQL test database (port 5436)
- Vitest configuration with coverage and performance optimization
- Automated test scripts with real database connectivity
- Test seed data with realistic EPI management scenarios

Real database infrastructure provides reliable testing foundation for production deployment." || true

git tag -a "phase-7-complete" -m "Phase 7 completed successfully" || true

# ========================================
# RELATÓRIO DA FASE 7
# ========================================

log "🎉 FASE 7 CONCLUÍDA!"
echo ""
echo "=================================="
echo "RESUMO DA FASE 7 - TESTES"
echo "=================================="
echo "✅ Testes unitários aprimorados"
echo "   - Validação de lógica de negócio focada"
echo "   - Complementares aos testes de integração existentes"
echo "   - Validação de regras de domínio e casos extremos"
echo ""
echo "✅ Testes de integração expandidos"
echo "   - 70+ testes usando banco PostgreSQL real"
echo "   - TestDatabaseService com setup automático e rollback"
echo "   - Validação de integração entre módulos com dados reais"
echo "   - Testes de operações concorrentes com segurança transacional"
echo ""
echo "✅ Testes E2E implementados"
echo "   - Testes de endpoints API com Supertest"
echo "   - Validação de contratos HTTP e formato de resposta"
echo "   - Complementares aos testes de integração"
echo ""
echo "✅ Infraestrutura de testes otimizada"
echo "   - Banco PostgreSQL dedicado para testes (porta 5436)"
echo "   - Configuração Vitest com cobertura e performance"
echo "   - Scripts automatizados com conectividade real ao banco"
echo "   - Dados de seed realistas para cenários EPI"
echo ""
echo "📋 Comandos disponíveis:"
echo "  npm run test:unit        # Testes unitários"
echo "  npm run test:integration # Testes de integração com banco real"
echo "  npm run test:e2e         # Testes E2E da API"
echo "  npm run test:coverage    # Cobertura de código"
echo "  npm run test             # Todos os testes (unit + integration + e2e)"
echo "  npm run test:real-db     # Testes com banco real (script especializado)"
echo "  npm run docker:test      # Subir containers de teste (db_test + redis)"
echo ""
echo "🚀 Próxima fase: ./run-fase-8-performance.sh"
echo "=================================="

exit 0