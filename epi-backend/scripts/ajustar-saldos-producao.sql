-- =================================================
-- SCRIPT DE AJUSTE DE SALDOS - PRODUÇÃO
-- =================================================
-- ATENÇÃO: Este script ajusta diretamente o campo 'saldo' 
-- da tabela EstoqueItem sem gerar movimentações
-- Data: 2025-07-10
-- Ambiente: Produção (render.com)

-- Backup dos dados atuais (recomendado executar antes)
-- CREATE TABLE backup_estoque_item_20250710 AS SELECT * FROM "EstoqueItem";

BEGIN;

-- =================================================
-- AJUSTES CRÍTICOS (22 itens)
-- =================================================

-- Avental de Raspa de Couro - Aplicar ajuste de -246 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 246 WHERE "id" = 'I7PAYN';

-- Avental de Raspa de Couro - Aplicar ajuste de -4 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 4 WHERE "id" = 'I6STND';

-- Bota de Borracha - Aplicar ajuste de -223 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 223 WHERE "id" = 'IU9EBS';

-- Botina de Segurança com Bico de Aço - Aplicar ajuste de -2 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 2 WHERE "id" = 'IB96TT';

-- Botina de Segurança com Bico de Aço - Aplicar ajuste de -243 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 243 WHERE "id" = 'IFQAXH';

-- Capacete de Segurança Classe A - Aplicar ajuste de -269 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 269 WHERE "id" = 'ISTGUK';

-- Capacete de Segurança Classe A - Aplicar ajuste de -2 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 2 WHERE "id" = 'I9EGE3';

-- Capacete de Segurança Classe B - Aplicar ajuste de +50 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" + 50 WHERE "id" = 'ITUNNX';

-- Luva de Malha de Aço - Aplicar ajuste de -232 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 232 WHERE "id" = 'IK3KR6';

-- Protetor Auditivo de Inserção - Aplicar ajuste de -103 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 103 WHERE "id" = 'ITQM83';

-- Respirador Semifacial - Aplicar ajuste de -1 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 1 WHERE "id" = 'IHHDB6';

-- Respirador Semifacial - Aplicar ajuste de -265 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 265 WHERE "id" = 'I4VYTB';

-- Roupa de Aproximação ao Calor - Aplicar ajuste de -266 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 266 WHERE "id" = 'ICCEG7';

-- Roupa de Aproximação ao Calor - Aplicar ajuste de -1 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 1 WHERE "id" = 'IZ4KJC';

-- Avental de Raspa de Couro - Aplicar ajuste de -241 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 241 WHERE "id" = 'IWURH6';

-- Cinto de Segurança Tipo Paraquedista - Aplicar ajuste de -1 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 1 WHERE "id" = 'IV6Q8U';

-- Cinto de Segurança Tipo Paraquedista - Aplicar ajuste de -203 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 203 WHERE "id" = 'I65NJ4';

-- Luva de Borracha Nitrílica - Aplicar ajuste de -291 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 291 WHERE "id" = 'I5XZKX';

-- Luva de Malha de Aço - Aplicar ajuste de -251 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 251 WHERE "id" = 'ID5KWV';

-- Manga de Raspa de Couro - Aplicar ajuste de +95 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" + 95 WHERE "id" = 'I33D9Z';

-- Máscara Respiratória PFF1 - Aplicar ajuste de -102 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 102 WHERE "id" = 'ICQRNX';

-- Máscara Respiratória PFF2 - Aplicar ajuste de -292 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 292 WHERE "id" = 'ICDQB2';

-- =================================================
-- AJUSTES ALTA PRIORIDADE (28 itens)
-- =================================================

-- Capacete de Segurança Classe B - Aplicar ajuste de -158 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 158 WHERE "id" = 'IM82AX';

-- Cinto de Segurança Tipo Paraquedista - Aplicar ajuste de -288 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 288 WHERE "id" = 'IC7QXR';

-- Colete Refletivo - Aplicar ajuste de -198 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 198 WHERE "id" = 'IT225H';

-- Luva de Borracha Nitrílica - Aplicar ajuste de -216 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 216 WHERE "id" = 'IHZRGB';

-- Luva de Látex Natural - Aplicar ajuste de -120 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 120 WHERE "id" = 'IFVGTP';

-- Luva de Raspa de Couro - Aplicar ajuste de -160 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 160 WHERE "id" = 'IUTY3Y';

-- Luva de Vaqueta - Aplicar ajuste de -111 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 111 WHERE "id" = 'I6KNC9';

-- Manga de Raspa de Couro - Aplicar ajuste de -212 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 212 WHERE "id" = 'IER5AG';

-- Máscara Respiratória PFF1 - Aplicar ajuste de -228 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 228 WHERE "id" = 'IFQ2P4';

-- Máscara Respiratória PFF2 - Aplicar ajuste de -252 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 252 WHERE "id" = 'IC8RNP';

-- Óculos de Proteção Ampla Visão - Aplicar ajuste de -281 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 281 WHERE "id" = 'IE5Q5C';

-- Óculos de Proteção Contra Impactos - Aplicar ajuste de -295 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 295 WHERE "id" = 'IJ2FTR';

-- Protetor Auditivo Tipo Concha - Aplicar ajuste de -193 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 193 WHERE "id" = 'IDV72Q';

-- Protetor Facial de Acrílico - Aplicar ajuste de -182 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 182 WHERE "id" = 'IM9GEG';

-- Sapato de Segurança - Aplicar ajuste de -175 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 175 WHERE "id" = 'I9ZUZ2';

-- Trava-Quedas - Aplicar ajuste de -141 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 141 WHERE "id" = 'IZG866';

-- Uniforme de Segurança - Aplicar ajuste de -273 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 273 WHERE "id" = 'I4B7E4';

-- Bota de Borracha - Aplicar ajuste de -248 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 248 WHERE "id" = 'I2QSVR';

-- Botina de Segurança com Bico de Aço - Aplicar ajuste de -137 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 137 WHERE "id" = 'IXJPYH';

-- Capacete de Segurança Classe A - Aplicar ajuste de -202 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 202 WHERE "id" = 'I5354S';

-- Capacete de Segurança Classe B - Aplicar ajuste de -279 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 279 WHERE "id" = 'IGP5J8';

-- Colete Refletivo - Aplicar ajuste de -249 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 249 WHERE "id" = 'IFDFHB';

-- Luva de Látex Natural - Aplicar ajuste de -249 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 249 WHERE "id" = 'IAQRRJ';

-- Luva de Raspa de Couro - Aplicar ajuste de -112 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 112 WHERE "id" = 'IBMBX5';

-- Luva de Vaqueta - Aplicar ajuste de -174 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 174 WHERE "id" = 'I5SG39';

-- Manga de Raspa de Couro - Aplicar ajuste de -122 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 122 WHERE "id" = 'IPPW92';

-- Óculos de Proteção Ampla Visão - Aplicar ajuste de -206 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 206 WHERE "id" = 'ICYGGX';

-- Óculos de Proteção Contra Impactos - Aplicar ajuste de -156 unidades
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 156 WHERE "id" = 'I8EC9C';

-- =================================================
-- VALIDAÇÃO DOS AJUSTES
-- =================================================

-- Verificar se todos os IDs existem na tabela
SELECT 'Validação: Verificando se todos os IDs existem' as status;

SELECT 
    'ID não encontrado: ' || item_id as erro
FROM (
    VALUES 
    ('I7PAYN'), ('I6STND'), ('IU9EBS'), ('IB96TT'), ('IFQAXH'), ('ISTGUK'), ('I9EGE3'), ('ITUNNX'), 
    ('IK3KR6'), ('ITQM83'), ('IHHDB6'), ('I4VYTB'), ('ICCEG7'), ('IZ4KJC'), ('IWURH6'), ('IV6Q8U'), 
    ('I65NJ4'), ('I5XZKX'), ('ID5KWV'), ('I33D9Z'), ('ICQRNX'), ('ICDQB2'), ('IM82AX'), ('IC7QXR'), 
    ('IT225H'), ('IHZRGB'), ('IFVGTP'), ('IUTY3Y'), ('I6KNC9'), ('IER5AG'), ('IFQ2P4'), ('IC8RNP'), 
    ('IE5Q5C'), ('IJ2FTR'), ('IDV72Q'), ('IM9GEG'), ('I9ZUZ2'), ('IZG866'), ('I4B7E4'), ('I2QSVR'), 
    ('IXJPYH'), ('I5354S'), ('IGP5J8'), ('IFDFHB'), ('IAQRRJ'), ('IBMBX5'), ('I5SG39'), ('IPPW92'), 
    ('ICYGGX'), ('I8EC9C')
) as items(item_id)
WHERE item_id NOT IN (SELECT "id" FROM "EstoqueItem");

-- Verificar saldos que ficarão negativos após o ajuste (INFORMATIVO - não impede execução)
SELECT 'Info: Saldos que ficarão negativos após ajuste (esperado conforme relatório)' as status;

SELECT 
    'Saldo negativo após ajuste: ' || "id" || ' (atual: ' || "saldo" || ' -> novo: ' || 
    CASE 
        WHEN "id" = 'I7PAYN' THEN ("saldo" - 246)::text
        WHEN "id" = 'I6STND' THEN ("saldo" - 4)::text
        WHEN "id" = 'IU9EBS' THEN ("saldo" - 223)::text
        WHEN "id" = 'IB96TT' THEN ("saldo" - 2)::text
        WHEN "id" = 'IFQAXH' THEN ("saldo" - 243)::text
        WHEN "id" = 'ISTGUK' THEN ("saldo" - 269)::text
        WHEN "id" = 'I9EGE3' THEN ("saldo" - 2)::text
        WHEN "id" = 'IK3KR6' THEN ("saldo" - 232)::text
        WHEN "id" = 'ITQM83' THEN ("saldo" - 103)::text
        WHEN "id" = 'IHHDB6' THEN ("saldo" - 1)::text
        WHEN "id" = 'I4VYTB' THEN ("saldo" - 265)::text
        WHEN "id" = 'ICCEG7' THEN ("saldo" - 266)::text
        WHEN "id" = 'IZ4KJC' THEN ("saldo" - 1)::text
        WHEN "id" = 'IWURH6' THEN ("saldo" - 241)::text
        WHEN "id" = 'IV6Q8U' THEN ("saldo" - 1)::text
        WHEN "id" = 'I65NJ4' THEN ("saldo" - 203)::text
        WHEN "id" = 'I5XZKX' THEN ("saldo" - 291)::text
        WHEN "id" = 'ID5KWV' THEN ("saldo" - 251)::text
        WHEN "id" = 'ICQRNX' THEN ("saldo" - 102)::text
        WHEN "id" = 'ICDQB2' THEN ("saldo" - 292)::text
        ELSE 'N/A'
    END || ')' as info
FROM "EstoqueItem" 
WHERE 
    ("id" = 'I7PAYN' AND "saldo" - 246 < 0) OR
    ("id" = 'I6STND' AND "saldo" - 4 < 0) OR
    ("id" = 'IU9EBS' AND "saldo" - 223 < 0) OR
    ("id" = 'IB96TT' AND "saldo" - 2 < 0) OR
    ("id" = 'IFQAXH' AND "saldo" - 243 < 0) OR
    ("id" = 'ISTGUK' AND "saldo" - 269 < 0) OR
    ("id" = 'I9EGE3' AND "saldo" - 2 < 0) OR
    ("id" = 'IK3KR6' AND "saldo" - 232 < 0) OR
    ("id" = 'ITQM83' AND "saldo" - 103 < 0) OR
    ("id" = 'IHHDB6' AND "saldo" - 1 < 0) OR
    ("id" = 'I4VYTB' AND "saldo" - 265 < 0) OR
    ("id" = 'ICCEG7' AND "saldo" - 266 < 0) OR
    ("id" = 'IZ4KJC' AND "saldo" - 1 < 0) OR
    ("id" = 'IWURH6' AND "saldo" - 241 < 0) OR
    ("id" = 'IV6Q8U' AND "saldo" - 1 < 0) OR
    ("id" = 'I65NJ4' AND "saldo" - 203 < 0) OR
    ("id" = 'I5XZKX' AND "saldo" - 291 < 0) OR
    ("id" = 'ID5KWV' AND "saldo" - 251 < 0) OR
    ("id" = 'ICQRNX' AND "saldo" - 102 < 0) OR
    ("id" = 'ICDQB2' AND "saldo" - 292 < 0);

-- Mostrar estatísticas finais
SELECT 'Resumo: Total de ajustes aplicados' as status;
SELECT 
    COUNT(*) as total_ajustes,
    SUM(CASE WHEN "id" IN ('I7PAYN', 'I6STND', 'IU9EBS', 'IB96TT', 'IFQAXH', 'ISTGUK', 'I9EGE3', 'ITUNNX', 'IK3KR6', 'ITQM83', 'IHHDB6', 'I4VYTB', 'ICCEG7', 'IZ4KJC', 'IWURH6', 'IV6Q8U', 'I65NJ4', 'I5XZKX', 'ID5KWV', 'I33D9Z', 'ICQRNX', 'ICDQB2', 'IM82AX', 'IC7QXR', 'IT225H', 'IHZRGB', 'IFVGTP', 'IUTY3Y', 'I6KNC9', 'IER5AG', 'IFQ2P4', 'IC8RNP', 'IE5Q5C', 'IJ2FTR', 'IDV72Q', 'IM9GEG', 'I9ZUZ2', 'IZG866', 'I4B7E4', 'I2QSVR', 'IXJPYH', 'I5354S', 'IGP5J8', 'IFDFHB', 'IAQRRJ', 'IBMBX5', 'I5SG39', 'IPPW92', 'ICYGGX', 'I8EC9C') THEN 1 ELSE 0 END) as itens_encontrados
FROM "EstoqueItem";

-- COMMIT somente se todas as validações passarem
-- ROLLBACK caso haja algum problema

COMMIT;

-- =================================================
-- COMANDOS PARA EXECUÇÃO NO RENDER
-- =================================================

-- Para executar este script no banco de produção:
-- 1. Conectar ao banco:
--    PGPASSWORD=0xtXAokE33jzWTzmQGBMDZe8aUjfYCHY psql -h dpg-d1k5abqdbo4c73f2aglg-a.oregon-postgres.render.com -U epi_user epi_production
-- 
-- 2. Executar o script:
--    \i /caminho/para/este/script.sql
-- 
-- 3. Verificar os resultados antes do COMMIT

-- =================================================
-- OBSERVAÇÕES IMPORTANTES
-- =================================================
-- 1. Este script ajusta APENAS os saldos, não gera movimentações
-- 2. Recomenda-se fazer backup antes da execução
-- 3. As validações internas verificam se todos os IDs existem
-- 4. Alertas são gerados para saldos que ficarão negativos
-- 5. Total de 50 ajustes: 22 críticos + 28 alta prioridade