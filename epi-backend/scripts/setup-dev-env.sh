#!/bin/bash

# Script para configurar ambiente de desenvolvimento completo
# Inicia banco de dados, executa migrations e seed

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Configurando ambiente de desenvolvimento EPI v3.5...${NC}"

# Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker não está rodando. Por favor, inicie o Docker primeiro.${NC}"
    exit 1
fi

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo -e "${YELLOW}📄 Criando arquivo .env...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Arquivo .env criado. Ajuste as configurações se necessário.${NC}"
fi

# Iniciar serviços Docker
echo -e "${BLUE}🐋 Iniciando containers Docker...${NC}"
docker-compose up -d db redis

# Aguardar banco estar pronto
echo -e "${YELLOW}⏳ Aguardando banco de dados...${NC}"
while ! docker exec epi_db_dev_v35 pg_isready -U postgres -d epi_db_v35 > /dev/null 2>&1; do
    echo -e "${YELLOW}   Aguardando...${NC}"
    sleep 2
done

echo -e "${GREEN}✅ Banco de dados está pronto!${NC}"

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Instalando dependências...${NC}"
    npm install
fi

# Gerar cliente Prisma
echo -e "${BLUE}🔧 Gerando cliente Prisma...${NC}"
npm run prisma:generate

# Executar migrations
echo -e "${BLUE}🔄 Executando migrations...${NC}"
npm run prisma:migrate

# Executar seed
echo -e "${BLUE}🌱 Executando seed...${NC}"
npm run prisma:seed

echo -e "${GREEN}"
echo "✅ Ambiente de desenvolvimento configurado com sucesso!"
echo ""
echo "🎯 Próximos passos:"
echo "   • npm run start:dev  - Iniciar servidor em modo desenvolvimento"
echo "   • npm run test:db    - Executar testes com banco real"
echo "   • npm run prisma:studio - Abrir interface visual do banco"
echo ""
echo "🐘 Banco de desenvolvimento: localhost:5435"
echo "🧪 Banco de testes: localhost:5436 (usar npm run docker:test)"
echo "🔴 Redis: localhost:6379"
echo -e "${NC}"