#!/bin/bash

# =================================================
# SCRIPT DE EXECUÇÃO - AJUSTE DE SALDOS PRODUÇÃO
# =================================================
# Este script executa o ajuste de saldos no banco de produção
# Ambiente: render.com
# Data: 2025-07-10

set -e  # Parar em caso de erro

echo "🚀 Iniciando ajuste de saldos no banco de produção..."
echo "📊 Total de ajustes: 50 (22 críticos + 28 alta prioridade)"
echo ""

# Configurações do banco
DB_HOST="dpg-d1k5abqdbo4c73f2aglg-a.oregon-postgres.render.com"
DB_USER="epi_user"
DB_NAME="epi_production"
DB_PASSWORD="0xtXAokE33jzWTzmQGBMDZe8aUjfYCHY"

# Verificar se o arquivo SQL existe
SCRIPT_PATH="./ajustar-saldos-producao.sql"
if [[ ! -f "$SCRIPT_PATH" ]]; then
    echo "❌ Erro: Arquivo $SCRIPT_PATH não encontrado!"
    exit 1
fi

echo "✅ Arquivo SQL encontrado: $SCRIPT_PATH"
echo ""

# Confirmar execução
echo "⚠️  ATENÇÃO: Este script irá modificar o banco de PRODUÇÃO!"
echo "📋 Dados do banco:"
echo "   - Host: $DB_HOST"
echo "   - Database: $DB_NAME"
echo "   - User: $DB_USER"
echo ""

read -p "🔄 Deseja continuar? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operação cancelada pelo usuário."
    exit 1
fi

echo ""
echo "📦 Criando backup da tabela EstoqueItem..."

# Criar backup da tabela
BACKUP_SQL="CREATE TABLE backup_estoque_item_$(date +%Y%m%d_%H%M%S) AS SELECT * FROM \"EstoqueItem\";"

export PGPASSWORD=$DB_PASSWORD
echo "$BACKUP_SQL" | psql -h $DB_HOST -U $DB_USER $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Backup criado com sucesso!"
else
    echo "❌ Erro ao criar backup. Abortando..."
    exit 1
fi

echo ""
echo "🔧 Executando script de ajuste de saldos..."

# Executar o script principal
export PGPASSWORD=$DB_PASSWORD
psql -h $DB_HOST -U $DB_USER $DB_NAME -f $SCRIPT_PATH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Script executado com sucesso!"
    echo "🎉 Ajuste de saldos concluído!"
    echo ""
    echo "📋 Próximos passos recomendados:"
    echo "   1. Verificar os relatórios de estoque"
    echo "   2. Executar novamente o relatório de inconsistências"
    echo "   3. Verificar se o kardex está consistente"
    echo ""
else
    echo "❌ Erro durante a execução do script!"
    echo "🔄 Verifique os logs acima para mais detalhes."
    exit 1
fi

echo "🏁 Processo finalizado."