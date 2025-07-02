#!/bin/bash
# FASE 11.1: CONFIGURAÇÃO DE SEGURANÇA PARA PRODUÇÃO
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
./claude-flow memory store "fase_atual" "Executando Fase 11.1 - Configuração de Segurança para Produção"

# ========================================
# FASE 11.1: CONFIGURAÇÃO DE SEGURANÇA PARA PRODUÇÃO
# ========================================

log "🔒 Fase 11.1: Configurando segurança para produção"
./claude-flow sparc run security-expert "Implement comprehensive production security configuration:

SECURITY CONFIGURATION:
1. Security Headers Implementation:
   - Helmet.js configuration for Node.js
   - Content-Security-Policy setup
   - X-XSS-Protection headers
   - X-Content-Type-Options: nosniff
   - Strict-Transport-Security (HSTS)
   - Referrer-Policy configuration
   - Feature-Policy/Permissions-Policy

2. Rate Limiting and Brute Force Protection:
   - API rate limiting middleware
   - Login attempt throttling
   - IP-based request limiting
   - Distributed rate limiting with Redis

3. Input Validation Enhancement:
   - Zod schema validation hardening
   - Sanitization of all inputs
   - Content type validation
   - File upload security controls
   - SQL injection prevention

4. Secrets Management:
   - Environment variable security
   - Vault integration for secrets
   - Rotation policy documentation
   - Production secrets separation

5. Security Scanning Integration:
   - Dependency vulnerability scanning
   - SAST integration in CI/CD
   - OWASP Top 10 compliance checks
   - Container security scanning

SECURITY DOCUMENTATION:
- Security best practices guide
- Incident response procedures
- Security configuration checklist
- Vulnerability management process"

sleep 60

log "🎉 FASE 11.1 CONCLUÍDA!"
exit 0
