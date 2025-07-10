#!/bin/bash

# =================================================
# SCRIPT DE RESET COMPLETO PARA DEMO
# =================================================
# Este script recria completamente o ambiente demo
# com dados consistentes usando os use cases

set -e  # Parar em caso de erro

echo "🌱 Iniciando reset completo do ambiente demo..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar se estamos no diretório correto
if [[ ! -f "package.json" ]]; then
    error "Execute este script a partir do diretório raiz do projeto (epi-backend)."
    exit 1
fi

# 1. Parar containers se estiverem rodando
info "1. Parando containers Docker..."
docker-compose down 2>/dev/null || true
log "Containers parados."

# 2. Limpar volumes (opcional - descomente se quiser reset completo)
warning "Limpando volumes Docker (dados serão perdidos)..."
docker-compose down -v 2>/dev/null || true
log "Volumes limpos."

# 3. Subir ambiente de desenvolvimento
info "2. Subindo ambiente de desenvolvimento..."
npm run docker:up
log "Containers iniciados."

# 4. Aguardar banco estar pronto
info "3. Aguardando banco de dados estar pronto..."
sleep 10

# Verificar se o banco está respondendo
for i in {1..30}; do
    if docker exec epi_db_dev_v35 pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; then
        log "Banco de dados está pronto."
        break
    fi
    
    if [ $i -eq 30 ]; then
        error "Banco de dados não ficou pronto em 30 tentativas."
        exit 1
    fi
    
    echo "Aguardando banco... (tentativa $i/30)"
    sleep 2
done

# 5. Aplicar migrações
info "4. Aplicando migrações do banco..."
npm run prisma:deploy
log "Migrações aplicadas."

# 6. Executar seed principal (estrutura básica)
info "5. Executando seed principal (usuários, almoxarifados, configurações)..."
npm run seed
log "Seed principal concluído."

# 7. Executar seed base (contratadas, colaboradores, tipos EPI, fichas vazias)
info "6. Executando seed base (dados estruturais)..."
npm run seed:base
log "Seed base concluído."

# 8. Executar seed de movimentações (via use cases)
info "7. Executando seed de movimentações (via use cases)..."
npm run seed:movimentacoes
log "Seed de movimentações concluído."

# 9. Verificar integridade dos dados
info "8. Verificando integridade dos dados..."

# Contar registros principais
USUARIOS=$(docker exec epi_db_dev_v35 psql -U postgres -d epi_dev_db_v35 -t -c "SELECT COUNT(*) FROM usuarios;" | tr -d ' ')
COLABORADORES=$(docker exec epi_db_dev_v35 psql -U postgres -d epi_dev_db_v35 -t -c "SELECT COUNT(*) FROM colaboradores;" | tr -d ' ')
TIPOS_EPI=$(docker exec epi_db_dev_v35 psql -U postgres -d epi_dev_db_v35 -t -c "SELECT COUNT(*) FROM tipos_epi;" | tr -d ' ')
ESTOQUE_ITENS=$(docker exec epi_db_dev_v35 psql -U postgres -d epi_dev_db_v35 -t -c "SELECT COUNT(*) FROM estoque_itens;" | tr -d ' ')
MOVIMENTACOES=$(docker exec epi_db_dev_v35 psql -U postgres -d epi_dev_db_v35 -t -c "SELECT COUNT(*) FROM movimentacoes_estoque;" | tr -d ' ')
ENTREGAS=$(docker exec epi_db_dev_v35 psql -U postgres -d epi_dev_db_v35 -t -c "SELECT COUNT(*) FROM entregas;" | tr -d ' ')

echo ""
echo "📊 Resumo dos dados criados:"
echo "👥 Usuários: $USUARIOS"
echo "👷 Colaboradores: $COLABORADORES"
echo "🦺 Tipos de EPI: $TIPOS_EPI"
echo "📦 Itens de estoque: $ESTOQUE_ITENS"
echo "🔄 Movimentações: $MOVIMENTACOES"
echo "📤 Entregas: $ENTREGAS"

# 10. Verificar consistência kardex
info "9. Verificando consistência do kardex..."

# Executar verificação de consistência via SQL
INCONSISTENCIAS=$(docker exec epi_db_dev_v35 psql -U postgres -d epi_dev_db_v35 -t -c "
WITH saldos_kardex AS (
  SELECT 
    ei.id,
    ei.quantidade as saldo_atual,
    COALESCE(SUM(
      CASE 
        WHEN me.tipo_movimentacao LIKE 'ENTRADA%' THEN me.quantidade_movida
        WHEN me.tipo_movimentacao LIKE 'SAIDA%' THEN -me.quantidade_movida
        ELSE 0
      END
    ), 0) as saldo_kardex
  FROM estoque_itens ei
  LEFT JOIN movimentacoes_estoque me ON ei.id = me.estoque_item_id
  WHERE ei.status = 'DISPONIVEL'
  GROUP BY ei.id, ei.quantidade
)
SELECT COUNT(*) 
FROM saldos_kardex 
WHERE saldo_atual != saldo_kardex;" | tr -d ' ')

if [ "$INCONSISTENCIAS" = "0" ]; then
    log "Kardex está consistente! ✨"
else
    warning "Encontradas $INCONSISTENCIAS inconsistências no kardex."
fi

# 11. Iniciar aplicação (opcional)
info "10. Ambiente pronto!"
echo ""
echo "🚀 Comandos úteis:"
echo "   - Ver logs: npm run docker:logs"
echo "   - Parar ambiente: npm run docker:down"
echo "   - Prisma Studio: npm run prisma:studio"
echo "   - Executar app: npm run start:dev"
echo ""

# Opção de iniciar a aplicação automaticamente
read -p "🔄 Deseja iniciar a aplicação agora? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info "Iniciando aplicação..."
    npm run start:dev
else
    log "Ambiente demo pronto! Execute 'npm run start:dev' quando quiser iniciar a aplicação."
fi

echo ""
log "🎉 Reset completo do ambiente demo concluído com sucesso!"