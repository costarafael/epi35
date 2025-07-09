-- SQL para excluir o item "Roupa de Astronauta" com ID incorreto
-- Executar APENAS após conectar no banco do Render

BEGIN;

-- 1. Verificar se o item existe
SELECT 
    id,
    nome_equipamento,
    numero_ca,
    categoria,
    created_at
FROM tipos_epi 
WHERE id = '039663';

-- 2. Verificar se há dependências (estoque, movimentações, etc.)
SELECT 
    'estoque_itens' as tabela,
    COUNT(*) as quantidade
FROM estoque_itens 
WHERE tipo_epi_id = '039663'
UNION ALL
SELECT 
    'movimentacoes_estoque' as tabela,
    COUNT(*) as quantidade
FROM movimentacoes_estoque me
JOIN estoque_itens ei ON me.estoque_item_id = ei.id
WHERE ei.tipo_epi_id = '039663'
UNION ALL
SELECT 
    'nota_movimentacao_itens' as tabela,
    COUNT(*) as quantidade
FROM nota_movimentacao_itens
WHERE tipo_epi_id = '039663';

-- 3. Se NÃO houver dependências, excluir o item
-- DESCOMENTE a linha abaixo APENAS se não houver dependências
-- DELETE FROM tipos_epi WHERE id = '039663';

-- 4. Verificar se foi excluído
SELECT 
    id,
    nome_equipamento,
    numero_ca
FROM tipos_epi 
WHERE id = '039663';

-- Se não retornar nada, foi excluído com sucesso
-- Se retornar o item, significa que há dependências

COMMIT;