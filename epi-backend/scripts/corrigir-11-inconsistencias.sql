-- Script SQL para corrigir as 11 inconsistências específicas reportadas
-- Este script aplica os ajustes recomendados no relatório

-- ⚠️ IMPORTANTE: Execute este script para corrigir as inconsistências atuais
-- ⚠️ Para prevenção futura, execute o script "executar-seed-producao.sql"

BEGIN;

-- Aplicar ajustes conforme relatório de inconsistências
-- Formato: UPDATE estoque_itens SET quantidade = quantidade + ajuste WHERE id = 'ID_ITEM';

-- 🔸 Avental de Raspa de Couro (2 itens)
UPDATE estoque_itens SET quantidade = quantidade + 1 WHERE id = 'I7PAYN';
UPDATE estoque_itens SET quantidade = quantidade + 1 WHERE id = 'I6STND';

-- 🔸 Botina de Segurança com Bico de Aço (1 item)
UPDATE estoque_itens SET quantidade = quantidade + 26 WHERE id = 'IFQAXH';

-- 🔸 Capacete de Segurança Classe A (2 itens)
UPDATE estoque_itens SET quantidade = quantidade + 35 WHERE id = 'ISTGUK';
UPDATE estoque_itens SET quantidade = quantidade + 35 WHERE id = 'I9EGE3';

-- 🔸 Respirador Semifacial (2 itens)
UPDATE estoque_itens SET quantidade = quantidade + 61 WHERE id = 'I4VYTB';
UPDATE estoque_itens SET quantidade = quantidade + 61 WHERE id = 'IHHDB6';

-- 🔸 Roupa de Aproximação ao Calor (2 itens)
UPDATE estoque_itens SET quantidade = quantidade + 23 WHERE id = 'IZ4KJC';
UPDATE estoque_itens SET quantidade = quantidade + 23 WHERE id = 'ICCEG7';

-- 🔸 Cinto de Segurança Tipo Paraquedista (2 itens)
UPDATE estoque_itens SET quantidade = quantidade - 1 WHERE id = 'IV6Q8U';
UPDATE estoque_itens SET quantidade = quantidade - 1 WHERE id = 'I65NJ4';

-- Verificar se todos os ajustes foram aplicados
SELECT 
    'AJUSTES APLICADOS' as status,
    COUNT(*) as itens_atualizados,
    'Inconsistências específicas corrigidas' as descricao
FROM estoque_itens 
WHERE id IN (
    'I7PAYN', 'I6STND', 'IFQAXH', 'ISTGUK', 'I9EGE3', 
    'I4VYTB', 'IHHDB6', 'IZ4KJC', 'ICCEG7', 'IV6Q8U', 'I65NJ4'
);

COMMIT;

-- VERIFICAÇÃO FINAL - Testar se as inconsistências foram resolvidas
SELECT 
    ei.id,
    te.nome_equipamento,
    te.numero_ca,
    ei.quantidade as estoque_atual,
    COALESCE(SUM(
        CASE 
            WHEN me.tipo_movimentacao LIKE '%ENTRADA%' OR me.tipo_movimentacao LIKE '%AJUSTE_POSITIVO%' THEN me.quantidade_movida
            WHEN me.tipo_movimentacao LIKE '%SAIDA%' OR me.tipo_movimentacao LIKE '%AJUSTE_NEGATIVO%' THEN -me.quantidade_movida
            ELSE 0
        END
    ), 0) as saldo_kardex,
    (ei.quantidade - COALESCE(SUM(
        CASE 
            WHEN me.tipo_movimentacao LIKE '%ENTRADA%' OR me.tipo_movimentacao LIKE '%AJUSTE_POSITIVO%' THEN me.quantidade_movida
            WHEN me.tipo_movimentacao LIKE '%SAIDA%' OR me.tipo_movimentacao LIKE '%AJUSTE_NEGATIVO%' THEN -me.quantidade_movida
            ELSE 0
        END
    ), 0)) as diferenca,
    CASE 
        WHEN ei.quantidade = COALESCE(SUM(
            CASE 
                WHEN me.tipo_movimentacao LIKE '%ENTRADA%' OR me.tipo_movimentacao LIKE '%AJUSTE_POSITIVO%' THEN me.quantidade_movida
                WHEN me.tipo_movimentacao LIKE '%SAIDA%' OR me.tipo_movimentacao LIKE '%AJUSTE_NEGATIVO%' THEN -me.quantidade_movida
                ELSE 0
            END
        ), 0) THEN '✅ CONSISTENTE'
        ELSE '❌ AINDA INCONSISTENTE'
    END as status
FROM estoque_itens ei
LEFT JOIN tipos_epi te ON te.id = ei.tipo_epi_id
LEFT JOIN movimentacao_estoque me ON me.estoque_item_id = ei.id
WHERE ei.id IN (
    'I7PAYN', 'I6STND', 'IFQAXH', 'ISTGUK', 'I9EGE3', 
    'I4VYTB', 'IHHDB6', 'IZ4KJC', 'ICCEG7', 'IV6Q8U', 'I65NJ4'
)
GROUP BY ei.id, ei.quantidade, te.nome_equipamento, te.numero_ca
ORDER BY ei.id;