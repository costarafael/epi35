#!/bin/bash

# Script para rodar testes com banco de dados real
# Este script inicia o banco de teste, executa os testes e limpa o ambiente

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐋 Iniciando configuração do ambiente de teste...${NC}"

# Função para verificar se o Docker está rodando
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker não está rodando. Por favor, inicie o Docker e tente novamente.${NC}"
        exit 1
    fi
}

# Função para verificar se as imagens Docker estão disponíveis
check_docker_images() {
    echo -e "${YELLOW}🔍 Verificando imagens Docker...${NC}"
    
    if ! docker image ls | grep -q postgres; then
        echo -e "${YELLOW}📥 Baixando imagem PostgreSQL...${NC}"
        docker pull postgres:16-alpine
    fi
    
    if ! docker image ls | grep -q redis; then
        echo -e "${YELLOW}📥 Baixando imagem Redis...${NC}"
        docker pull redis:7-alpine
    fi
}

# Função para aguardar o banco estar pronto
wait_for_db() {
    echo -e "${YELLOW}⏳ Aguardando banco de dados estar pronto...${NC}"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec epi_db_test_v35 pg_isready -U postgres -d epi_test_db_v35 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Banco de dados está pronto!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Tentativa $attempt/$max_attempts...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Timeout: Banco de dados não ficou pronto em tempo hábil${NC}"
    return 1
}

# Função de limpeza
cleanup() {
    echo -e "${YELLOW}🧹 Executando limpeza...${NC}"
    
    if [ "$KEEP_CONTAINERS" != "true" ]; then
        echo -e "${YELLOW}🛑 Parando containers de teste...${NC}"
        docker-compose stop db_test redis 2>/dev/null || true
    else
        echo -e "${BLUE}ℹ️ Mantendo containers rodando (KEEP_CONTAINERS=true)${NC}"
    fi
}

# Função principal
main() {
    # Verificar pré-requisitos
    check_docker
    check_docker_images
    
    # Configurar trap para limpeza
    trap cleanup EXIT
    
    # Iniciar containers de teste
    echo -e "${BLUE}🚀 Iniciando containers de teste...${NC}"
    docker-compose up -d db_test redis
    
    # Aguardar banco estar pronto
    if ! wait_for_db; then
        echo -e "${RED}❌ Falha ao inicializar banco de dados${NC}"
        exit 1
    fi
    
    # Executar migrations
    echo -e "${BLUE}🔄 Aplicando migrations...${NC}"
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public"
    npx prisma migrate deploy
    
    # Determinar tipo de teste
    local test_type="${1:-all}"
    
    case "$test_type" in
        "unit")
            echo -e "${GREEN}🧪 Executando testes unitários...${NC}"
            npm run test:unit
            ;;
        "integration")
            echo -e "${GREEN}🔗 Executando testes de integração...${NC}"
            npm run test:integration
            ;;
        "e2e")
            echo -e "${GREEN}🌐 Executando testes E2E...${NC}"
            npm run test:e2e
            ;;
        "all")
            echo -e "${GREEN}🚀 Executando todos os testes...${NC}"
            npm run test
            ;;
        *)
            echo -e "${RED}❌ Tipo de teste inválido: $test_type${NC}"
            echo -e "${YELLOW}Tipos válidos: unit, integration, e2e, all${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Testes concluídos com sucesso!${NC}"
}

# Mostrar ajuda
show_help() {
    echo "Uso: $0 [tipo_teste]"
    echo ""
    echo "Tipos de teste disponíveis:"
    echo "  unit        - Testes unitários apenas"
    echo "  integration - Testes de integração com banco real"
    echo "  e2e         - Testes end-to-end"
    echo "  all         - Todos os tipos de testes (padrão)"
    echo ""
    echo "Variáveis de ambiente:"
    echo "  KEEP_CONTAINERS=true  - Manter containers rodando após os testes"
    echo ""
    echo "Exemplos:"
    echo "  $0                    # Executar todos os testes"
    echo "  $0 integration        # Executar apenas testes de integração"
    echo "  KEEP_CONTAINERS=true $0 # Manter banco rodando após testes"
}

# Verificar argumentos
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Executar função principal
main "$@"