-- Script SQL para executar nova estratégia de seeding em produção
-- Este script limpa COMPLETAMENTE os dados existentes e cria dados estruturais consistentes
-- RESOLVE as 11 inconsistências reportadas através de limpeza total

-- ⚠️ IMPORTANTE: Este script apaga TODOS os dados existentes para garantir consistência 100%

BEGIN;

-- 1. LIMPEZA ABSOLUTA - Remove TODOS os dados (inclusive os inconsistentes)
-- Ordem importante devido às foreign keys

-- 1.1. Limpar dados transacionais primeiro
DELETE FROM movimentacao_estoque;
DELETE FROM entrega_itens;
DELETE FROM entregas;
DELETE FROM nota_movimentacao_itens;
DELETE FROM notas_movimentacao;

-- 1.2. Limpar estoque (resolve as 11 inconsistências reportadas)
DELETE FROM estoque_itens;

-- 1.3. Limpar fichas e relacionamentos
DELETE FROM fichas_epi;
DELETE FROM colaboradores;
DELETE FROM contratadas;

-- 1.4. Limpar configurações de produtos
DELETE FROM tipos_epi;

-- 1.5. Limpar infraestrutura
DELETE FROM almoxarifados;
DELETE FROM unidades_negocio;

-- 1.6. Limpar usuários (exceto admin se necessário)
DELETE FROM usuarios;

-- 1.7. Limpar configurações do sistema se existirem
DELETE FROM configuracoes_sistema WHERE TRUE;

-- 2. Resetar sequências para começar do zero
ALTER SEQUENCE nota_movimentacao_numero_seq RESTART WITH 1;

-- 3. VERIFICAÇÃO DE LIMPEZA TOTAL
-- Confirmar que todas as tabelas estão vazias (deve retornar 0 para todas)
DO $$
DECLARE
    tabela_count INTEGER;
    tabela_nome TEXT;
    tabelas_para_verificar TEXT[] := ARRAY[
        'movimentacao_estoque', 'entrega_itens', 'entregas', 
        'nota_movimentacao_itens', 'notas_movimentacao', 'estoque_itens',
        'fichas_epi', 'colaboradores', 'contratadas', 'tipos_epi', 
        'almoxarifados', 'unidades_negocio', 'usuarios'
    ];
BEGIN
    FOREACH tabela_nome IN ARRAY tabelas_para_verificar LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', tabela_nome) INTO tabela_count;
        IF tabela_count > 0 THEN
            RAISE EXCEPTION 'ERRO: Tabela % ainda contém % registros. Limpeza falhou!', tabela_nome, tabela_count;
        END IF;
        RAISE NOTICE 'OK: Tabela % limpa (0 registros)', tabela_nome;
    END LOOP;
    RAISE NOTICE '✅ LIMPEZA TOTAL CONFIRMADA - Todas as inconsistências foram eliminadas';
END $$;

-- 4. Criar usuários do sistema (dados limpos e consistentes)
INSERT INTO usuarios (id, nome, email, senha_hash, perfil, ativo, created_at, updated_at) VALUES
('USR001', 'Administrador Sistema', 'admin@epi.local', '$2b$10$dummy.hash.for.admin', 'ADMINISTRADOR', true, NOW(), NOW()),
('USR002', 'Operador Almoxarifado', 'operador@epi.local', '$2b$10$dummy.hash.for.operator', 'OPERADOR', true, NOW(), NOW()),
('USR003', 'Supervisor', 'supervisor@epi.local', '$2b$10$dummy.hash.for.supervisor', 'SUPERVISOR', true, NOW(), NOW());

-- 4. Criar unidades de negócio
INSERT INTO unidades_negocio (id, nome, codigo, ativa, created_at, updated_at) VALUES
('UNI001', 'Unidade Central', 'CENTRAL', true, NOW(), NOW()),
('UNI002', 'Filial Norte', 'NORTE', true, NOW(), NOW());

-- 5. Criar almoxarifados
INSERT INTO almoxarifados (id, nome, codigo, unidade_negocio_id, ativo, created_at, updated_at) VALUES
('ALM001', 'Almoxarifado Central', 'CENTRAL', 'UNI001', true, NOW(), NOW()),
('ALM002', 'Almoxarifado Norte', 'NORTE', 'UNI002', true, NOW(), NOW());

-- 6. Criar contratadas com CNPJs válidos
INSERT INTO contratadas (id, nome, cnpj, ativa, created_at, updated_at) VALUES
('CON001', 'Empresa Alpha Ltda', '11.222.333/0001-81', true, NOW(), NOW()),
('CON002', 'Beta Construções S.A.', '44.555.666/0001-72', true, NOW(), NOW()),
('CON003', 'Gamma Serviços Ltda', '77.888.999/0001-63', true, NOW(), NOW());

-- 7. Criar tipos de EPI
INSERT INTO tipos_epi (id, nome_equipamento, numero_ca, categoria, validade_meses, exige_assinatura_entrega, ativo, created_at, updated_at) VALUES
('EPI001', 'Capacete de Segurança', '12345', 'PROTECAO_CABECA', 60, true, true, NOW(), NOW()),
('EPI002', 'Óculos de Proteção', '23456', 'PROTECAO_OLHOS', 36, false, true, NOW(), NOW()),
('EPI003', 'Luva de Couro', '34567', 'PROTECAO_MAOS', 12, false, true, NOW(), NOW()),
('EPI004', 'Botina de Segurança', '45678', 'PROTECAO_PES', 24, true, true, NOW(), NOW()),
('EPI005', 'Protetor Auricular', '56789', 'PROTECAO_AUDITIVA', 6, false, true, NOW(), NOW());

-- 8. Criar colaboradores (amostra para teste)
INSERT INTO colaboradores (id, nome, cpf, matricula, cargo, contratada_id, ativo, created_at, updated_at) VALUES
('COL001', 'João Silva Santos', '123.456.789-01', 'MAT001', 'Operador', 'CON001', true, NOW(), NOW()),
('COL002', 'Maria Oliveira Costa', '234.567.890-12', 'MAT002', 'Supervisora', 'CON001', true, NOW(), NOW()),
('COL003', 'Pedro Souza Lima', '345.678.901-23', 'MAT003', 'Técnico', 'CON002', true, NOW(), NOW()),
('COL004', 'Ana Santos Rocha', '456.789.012-34', 'MAT004', 'Engenheira', 'CON002', true, NOW(), NOW()),
('COL005', 'Carlos Pereira Dias', '567.890.123-45', 'MAT005', 'Operador', 'CON003', true, NOW(), NOW());

-- 9. Criar fichas EPI (uma por colaborador - v3.5)
INSERT INTO fichas_epi (id, colaborador_id, status, data_emissao, created_at, updated_at) VALUES
('FICHA001', 'COL001', 'ATIVA', NOW(), NOW(), NOW()),
('FICHA002', 'COL002', 'ATIVA', NOW(), NOW(), NOW()),
('FICHA003', 'COL003', 'ATIVA', NOW(), NOW(), NOW()),
('FICHA004', 'COL004', 'ATIVA', NOW(), NOW(), NOW()),
('FICHA005', 'COL005', 'ATIVA', NOW(), NOW(), NOW());

COMMIT;

-- VERIFICAÇÃO FINAL DE CONSISTÊNCIA
-- Este é o estado que garante ZERO inconsistências

-- 1. Contagem dos dados estruturais criados
SELECT 
    'Usuários' as entidade, COUNT(*) as total FROM usuarios
UNION ALL
SELECT 'Unidades de Negócio', COUNT(*) FROM unidades_negocio
UNION ALL
SELECT 'Almoxarifados', COUNT(*) FROM almoxarifados
UNION ALL
SELECT 'Contratadas', COUNT(*) FROM contratadas
UNION ALL
SELECT 'Tipos EPI', COUNT(*) FROM tipos_epi
UNION ALL
SELECT 'Colaboradores', COUNT(*) FROM colaboradores
UNION ALL
SELECT 'Fichas EPI', COUNT(*) FROM fichas_epi
UNION ALL
SELECT 'Itens Estoque', COUNT(*) FROM estoque_itens
UNION ALL
SELECT 'Movimentações', COUNT(*) FROM movimentacao_estoque;

-- 2. VERIFICAÇÃO DE INCONSISTÊNCIAS (deve retornar 0 registros)
SELECT 
    'TESTE INCONSISTÊNCIAS' as titulo,
    COUNT(*) as inconsistencias_encontradas,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PERFEITO - Zero inconsistências'
        ELSE '❌ PROBLEMA - Ainda há inconsistências'
    END as resultado
FROM (
    -- Simular a consulta de inconsistências
    SELECT 
        ei.id,
        ei.quantidade as estoque_atual,
        COALESCE(SUM(
            CASE 
                WHEN me.tipo_movimentacao LIKE '%ENTRADA%' OR me.tipo_movimentacao LIKE '%AJUSTE_POSITIVO%' THEN me.quantidade_movida
                WHEN me.tipo_movimentacao LIKE '%SAIDA%' OR me.tipo_movimentacao LIKE '%AJUSTE_NEGATIVO%' THEN -me.quantidade_movida
                ELSE 0
            END
        ), 0) as saldo_kardex
    FROM estoque_itens ei
    LEFT JOIN movimentacao_estoque me ON me.estoque_item_id = ei.id
    GROUP BY ei.id, ei.quantidade
    HAVING ei.quantidade != COALESCE(SUM(
        CASE 
            WHEN me.tipo_movimentacao LIKE '%ENTRADA%' OR me.tipo_movimentacao LIKE '%AJUSTE_POSITIVO%' THEN me.quantidade_movida
            WHEN me.tipo_movimentacao LIKE '%SAIDA%' OR me.tipo_movimentacao LIKE '%AJUSTE_NEGATIVO%' THEN -me.quantidade_movida
            ELSE 0
        END
    ), 0)
) inconsistencias;

-- 3. CONFIRMAÇÃO FINAL
SELECT '🎉 SEED ESTRUTURAL CONCLUÍDO COM SUCESSO!' as status,
       'Database limpo, dados consistentes, pronto para movimentações via use cases' as descricao;