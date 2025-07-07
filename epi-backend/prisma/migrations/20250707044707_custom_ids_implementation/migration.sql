-- ✅ MIGRAÇÃO PARA IDs CUSTOMIZADOS
-- Transforma UUIDs em IDs amigáveis para Entregas, EstoqueItems e TipoEPI

-- 🔧 FUNÇÃO PARA GERAR IDs CUSTOMIZADOS
CREATE OR REPLACE FUNCTION generate_custom_id(prefix VARCHAR(1)) 
RETURNS VARCHAR(6) AS $$
DECLARE
    chars VARCHAR(28) := '23456789ABCDEFGHKMNPQRSTUVWXYZ';
    result VARCHAR(6) := prefix;
    i INTEGER;
BEGIN
    FOR i IN 1..5 LOOP
        result := result || substr(chars, (floor(random() * 28) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 🎯 1. MIGRAÇÃO TipoEPI (C + 5 chars)
-- Adicionar coluna temporária
ALTER TABLE tipos_epi ADD COLUMN new_id VARCHAR(6);

-- Gerar novos IDs customizados
UPDATE tipos_epi SET new_id = generate_custom_id('C');

-- Garantir unicidade
UPDATE tipos_epi SET new_id = generate_custom_id('C') WHERE new_id IN (
    SELECT new_id FROM tipos_epi GROUP BY new_id HAVING COUNT(*) > 1
);

-- Atualizar referências foreign keys
UPDATE estoque_itens SET tipo_epi_id = (
    SELECT new_id FROM tipos_epi WHERE tipos_epi.id = estoque_itens.tipo_epi_id
);

UPDATE nota_movimentacao_itens SET tipo_epi_id = (
    SELECT new_id FROM tipos_epi WHERE tipos_epi.id = nota_movimentacao_itens.tipo_epi_id
);

-- Remover restrições e aplicar novos IDs
ALTER TABLE estoque_itens DROP CONSTRAINT estoque_itens_tipo_epi_id_fkey;
ALTER TABLE nota_movimentacao_itens DROP CONSTRAINT nota_movimentacao_itens_tipo_epi_id_fkey;

-- Alterar tipos de coluna
ALTER TABLE tipos_epi DROP CONSTRAINT tipos_epi_pkey;
ALTER TABLE tipos_epi DROP COLUMN id;
ALTER TABLE tipos_epi RENAME COLUMN new_id TO id;
ALTER TABLE tipos_epi ADD PRIMARY KEY (id);

ALTER TABLE estoque_itens ALTER COLUMN tipo_epi_id TYPE VARCHAR(6);
ALTER TABLE nota_movimentacao_itens ALTER COLUMN tipo_epi_id TYPE VARCHAR(6);

-- Recriar foreign keys
ALTER TABLE estoque_itens ADD CONSTRAINT estoque_itens_tipo_epi_id_fkey 
    FOREIGN KEY (tipo_epi_id) REFERENCES tipos_epi(id);
ALTER TABLE nota_movimentacao_itens ADD CONSTRAINT nota_movimentacao_itens_tipo_epi_id_fkey 
    FOREIGN KEY (tipo_epi_id) REFERENCES tipos_epi(id);

-- 🎯 2. MIGRAÇÃO EstoqueItem (I + 5 chars)
-- Adicionar coluna temporária
ALTER TABLE estoque_itens ADD COLUMN new_id VARCHAR(6);

-- Gerar novos IDs customizados
UPDATE estoque_itens SET new_id = generate_custom_id('I');

-- Garantir unicidade
UPDATE estoque_itens SET new_id = generate_custom_id('I') WHERE new_id IN (
    SELECT new_id FROM estoque_itens GROUP BY new_id HAVING COUNT(*) > 1
);

-- Atualizar referências foreign keys
UPDATE entrega_itens SET estoque_item_origem_id = (
    SELECT new_id FROM estoque_itens WHERE estoque_itens.id = entrega_itens.estoque_item_origem_id
);

UPDATE movimentacoes_estoque SET estoque_item_id = (
    SELECT new_id FROM estoque_itens WHERE estoque_itens.id = movimentacoes_estoque.estoque_item_id
);

UPDATE nota_movimentacao_itens SET estoque_item_id = (
    SELECT new_id FROM estoque_itens WHERE estoque_itens.id = nota_movimentacao_itens.estoque_item_id
);

-- Remover restrições
ALTER TABLE entrega_itens DROP CONSTRAINT entrega_itens_estoque_item_origem_id_fkey;
ALTER TABLE movimentacoes_estoque DROP CONSTRAINT movimentacoes_estoque_estoque_item_id_fkey;
ALTER TABLE nota_movimentacao_itens DROP CONSTRAINT nota_movimentacao_itens_estoque_item_id_fkey;

-- Alterar tipos de coluna
ALTER TABLE estoque_itens DROP CONSTRAINT estoque_itens_pkey;
ALTER TABLE estoque_itens DROP COLUMN id;
ALTER TABLE estoque_itens RENAME COLUMN new_id TO id;
ALTER TABLE estoque_itens ADD PRIMARY KEY (id);

ALTER TABLE entrega_itens ALTER COLUMN estoque_item_origem_id TYPE VARCHAR(6);
ALTER TABLE movimentacoes_estoque ALTER COLUMN estoque_item_id TYPE VARCHAR(6);
ALTER TABLE nota_movimentacao_itens ALTER COLUMN estoque_item_id TYPE VARCHAR(6);

-- Recriar foreign keys
ALTER TABLE entrega_itens ADD CONSTRAINT entrega_itens_estoque_item_origem_id_fkey 
    FOREIGN KEY (estoque_item_origem_id) REFERENCES estoque_itens(id);
ALTER TABLE movimentacoes_estoque ADD CONSTRAINT movimentacoes_estoque_estoque_item_id_fkey 
    FOREIGN KEY (estoque_item_id) REFERENCES estoque_itens(id);
ALTER TABLE nota_movimentacao_itens ADD CONSTRAINT nota_movimentacao_itens_estoque_item_id_fkey 
    FOREIGN KEY (estoque_item_id) REFERENCES estoque_itens(id);

-- 🎯 3. MIGRAÇÃO Entrega (E + 5 chars)
-- Adicionar coluna temporária
ALTER TABLE entregas ADD COLUMN new_id VARCHAR(6);

-- Gerar novos IDs customizados
UPDATE entregas SET new_id = generate_custom_id('E');

-- Garantir unicidade
UPDATE entregas SET new_id = generate_custom_id('E') WHERE new_id IN (
    SELECT new_id FROM entregas GROUP BY new_id HAVING COUNT(*) > 1
);

-- Atualizar referências foreign keys
UPDATE entrega_itens SET entrega_id = (
    SELECT new_id FROM entregas WHERE entregas.id = entrega_itens.entrega_id
);

UPDATE movimentacoes_estoque SET entrega_id = (
    SELECT new_id FROM entregas WHERE entregas.id = movimentacoes_estoque.entrega_id
);

-- Remover restrições
ALTER TABLE entrega_itens DROP CONSTRAINT entrega_itens_entrega_id_fkey;
ALTER TABLE movimentacoes_estoque DROP CONSTRAINT movimentacoes_estoque_entrega_id_fkey;

-- Alterar tipos de coluna
ALTER TABLE entregas DROP CONSTRAINT entregas_pkey;
ALTER TABLE entregas DROP COLUMN id;
ALTER TABLE entregas RENAME COLUMN new_id TO id;
ALTER TABLE entregas ADD PRIMARY KEY (id);

ALTER TABLE entrega_itens ALTER COLUMN entrega_id TYPE VARCHAR(6);
ALTER TABLE movimentacoes_estoque ALTER COLUMN entrega_id TYPE VARCHAR(6);

-- Recriar foreign keys
ALTER TABLE entrega_itens ADD CONSTRAINT entrega_itens_entrega_id_fkey 
    FOREIGN KEY (entrega_id) REFERENCES entregas(id) ON DELETE CASCADE;
ALTER TABLE movimentacoes_estoque ADD CONSTRAINT movimentacoes_estoque_entrega_id_fkey 
    FOREIGN KEY (entrega_id) REFERENCES entregas(id);

-- 🧹 LIMPEZA: Remover função temporária
DROP FUNCTION generate_custom_id(VARCHAR(1));

-- 🔍 VERIFICAÇÃO FINAL
-- Contar registros para verificar integridade
SELECT 'tipos_epi' as tabela, COUNT(*) as total FROM tipos_epi
UNION ALL
SELECT 'estoque_itens' as tabela, COUNT(*) as total FROM estoque_itens
UNION ALL
SELECT 'entregas' as tabela, COUNT(*) as total FROM entregas;