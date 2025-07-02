#!/bin/bash

# Script para executar testes de integração com banco real
# Parte do projeto Backend do Módulo de Gestão de EPI v3.5

set -e

echo "🧪 Executando Testes de Integração com Banco Real"
echo "=============================================="

# Verificar se o Docker está rodando
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker e tente novamente."
    exit 1
fi

# Verificar se as variáveis de ambiente estão corretas
if [ -f .env.test ]; then
    echo "✅ Arquivo .env.test encontrado"
else
    echo "❌ Arquivo .env.test não encontrado. Criando..."
    cat > .env.test << EOF
NODE_ENV=test
DATABASE_URL="postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public"
JWT_SECRET=test-secret-key
PERMITIR_ESTOQUE_NEGATIVO=false
PERMITIR_AJUSTES_FORCADOS=true
EOF
    echo "✅ Arquivo .env.test criado"
fi

# Função para verificar se um container está rodando
check_container() {
    local container_name=$1
    if docker ps --filter "name=$container_name" --filter "status=running" --quiet | grep -q .; then
        echo "✅ Container $container_name está rodando"
        return 0
    else
        echo "❌ Container $container_name não está rodando"
        return 1
    fi
}

# Função para aguardar um serviço ficar disponível
wait_for_service() {
    local service_url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Aguardando $service_name ficar disponível..."
    
    while [ $attempt -le $max_attempts ]; do
        if timeout 5 bash -c "</dev/tcp/localhost/5436" 2>/dev/null; then
            echo "✅ $service_name está disponível"
            return 0
        fi
        
        echo "  Tentativa $attempt/$max_attempts - aguardando..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name não ficou disponível após $max_attempts tentativas"
    return 1
}

# Iniciar containers se necessário
echo ""
echo "📦 Verificando containers Docker..."

if ! check_container "epi_db_test_v35"; then
    echo "🚀 Iniciando containers de teste..."
    docker-compose up -d db_test redis
    
    # Aguardar banco ficar disponível
    wait_for_service "localhost:5436" "Banco de dados de teste"
fi

if ! check_container "epi_redis"; then
    echo "🚀 Iniciando Redis..."
    docker-compose up -d redis
fi

# Verificar se o Prisma está configurado
echo ""
echo "🔧 Verificando configuração do Prisma..."

if ! command -v npx >/dev/null 2>&1; then
    echo "❌ npx não encontrado. Instale Node.js e npm primeiro."
    exit 1
fi

# Executar migrations no banco de teste
echo "📋 Aplicando migrations no banco de teste..."
export DATABASE_URL="postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public"
npx prisma migrate deploy --schema=./prisma/schema.prisma

if [ $? -ne 0 ]; then
    echo "❌ Falha ao aplicar migrations"
    exit 1
fi

echo "✅ Migrations aplicadas com sucesso"

# Executar seed no banco de teste
echo "🌱 Executando seed no banco de teste..."
npm run seed:test

if [ $? -ne 0 ]; then
    echo "❌ Falha ao executar seed"
    exit 1
fi

echo "✅ Seed executado com sucesso"

# Verificar se o build está atualizado
echo ""
echo "🔨 Verificando build do projeto..."
if [ ! -d "dist" ] || [ "$(find src -name '*.ts' -newer dist 2>/dev/null | wc -l)" -gt 0 ]; then
    echo "🔄 Build desatualizado. Executando build..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Falha no build"
        exit 1
    fi
fi

# Executar diferentes tipos de teste
echo ""
echo "🧪 Executando Testes..."

# Função para executar testes com relatório
run_tests() {
    local test_pattern=$1
    local test_name=$2
    local start_time=$(date +%s)
    
    echo ""
    echo "▶️  Executando: $test_name"
    echo "----------------------------------------"
    
    # Executar testes com output detalhado
    if npm run test -- --run "$test_pattern" --reporter=verbose; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "✅ $test_name - Sucesso (${duration}s)"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo "❌ $test_name - Falhou (${duration}s)"
        return 1
    fi
}

# Variável para controlar sucesso geral
overall_success=true

# 1. Executar testes de integração de fichas
if ! run_tests "test/integration/fichas/*.integration.spec.ts" "Testes de Integração - Fichas"; then
    overall_success=false
fi

# 2. Executar testes de integração de estoque
if ! run_tests "test/integration/estoque/*.integration.spec.ts" "Testes de Integração - Estoque"; then
    overall_success=false
fi

# 3. Executar testes de integração de queries/relatórios
if ! run_tests "test/integration/queries/*.integration.spec.ts" "Testes de Integração - Relatórios"; then
    overall_success=false
fi

# 4. Executar todos os testes de integração juntos
if ! run_tests "test/integration/**/*.integration.spec.ts" "Todos os Testes de Integração"; then
    overall_success=false
fi

# 5. Executar testes unitários (com mocks) para comparação
if ! run_tests "test/unit/**/*.spec.ts" "Testes Unitários (com mocks)"; then
    overall_success=false
fi

# Executar health check
echo ""
echo "🏥 Executando Health Check..."
if ! run_tests "test/health-check.spec.ts" "Health Check"; then
    overall_success=false
fi

# Relatório final
echo ""
echo "📊 RELATÓRIO FINAL"
echo "=================================="

if [ "$overall_success" = true ]; then
    echo "🎉 TODOS OS TESTES PASSARAM!"
    echo ""
    echo "✅ Testes de Integração - Fichas"
    echo "✅ Testes de Integração - Estoque" 
    echo "✅ Testes de Integração - Relatórios"
    echo "✅ Testes Unitários"
    echo "✅ Health Check"
    echo ""
    echo "🚀 O banco de dados real está funcionando corretamente!"
    echo "🔄 Todos os casos de uso foram convertidos com sucesso!"
    
    # Estatísticas dos containers
    echo ""
    echo "📈 Estatísticas dos Containers:"
    echo "- Banco de Teste: $(docker ps --filter "name=epi_db_test_v35" --format "table {{.Status}}")"
    echo "- Redis: $(docker ps --filter "name=epi_redis" --format "table {{.Status}}")"
    
    exit 0
else
    echo "❌ ALGUNS TESTES FALHARAM!"
    echo ""
    echo "🔍 Verifique os logs acima para detalhes dos erros."
    echo "🐛 Debug sugerido:"
    echo "  1. Verificar se os containers estão rodando: docker ps"
    echo "  2. Verificar logs do banco: docker logs epi_db_test_v35"
    echo "  3. Verificar conexão: npm run test:db"
    echo "  4. Recriar banco: docker-compose down && docker-compose up -d"
    
    exit 1
fi