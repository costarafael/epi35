-- =================================================
-- COMANDOS INDIVIDUAIS PARA EXECUÇÃO MANUAL
-- =================================================
-- Se a conexão via arquivo não funcionar, execute estes comandos um por um
-- Conecte primeiro ao banco: 
-- PGPASSWORD=0xtXAokE33jzWTzmQGBMDZe8aUjfYCHY psql postgresql://epi_user:0xtXAokE33jzWTzmQGBMDZe8aUjfYCHY@dpg-d1k5abqdbo4c73f2aglg-a.oregon-postgres.render.com/epi_production

-- 1. Criar backup
CREATE TABLE backup_estoque_item_20250710 AS SELECT * FROM "EstoqueItem";

-- 2. Iniciar transação
BEGIN;

-- 3. Executar ajustes críticos (22 itens)
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 246 WHERE "id" = 'I7PAYN';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 4 WHERE "id" = 'I6STND';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 223 WHERE "id" = 'IU9EBS';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 2 WHERE "id" = 'IB96TT';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 243 WHERE "id" = 'IFQAXH';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 269 WHERE "id" = 'ISTGUK';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 2 WHERE "id" = 'I9EGE3';
UPDATE "EstoqueItem" SET "saldo" = "saldo" + 50 WHERE "id" = 'ITUNNX';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 232 WHERE "id" = 'IK3KR6';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 103 WHERE "id" = 'ITQM83';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 1 WHERE "id" = 'IHHDB6';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 265 WHERE "id" = 'I4VYTB';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 266 WHERE "id" = 'ICCEG7';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 1 WHERE "id" = 'IZ4KJC';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 241 WHERE "id" = 'IWURH6';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 1 WHERE "id" = 'IV6Q8U';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 203 WHERE "id" = 'I65NJ4';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 291 WHERE "id" = 'I5XZKX';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 251 WHERE "id" = 'ID5KWV';
UPDATE "EstoqueItem" SET "saldo" = "saldo" + 95 WHERE "id" = 'I33D9Z';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 102 WHERE "id" = 'ICQRNX';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 292 WHERE "id" = 'ICDQB2';

-- 4. Executar ajustes alta prioridade (28 itens)
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 158 WHERE "id" = 'IM82AX';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 288 WHERE "id" = 'IC7QXR';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 198 WHERE "id" = 'IT225H';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 216 WHERE "id" = 'IHZRGB';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 120 WHERE "id" = 'IFVGTP';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 160 WHERE "id" = 'IUTY3Y';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 111 WHERE "id" = 'I6KNC9';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 212 WHERE "id" = 'IER5AG';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 228 WHERE "id" = 'IFQ2P4';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 252 WHERE "id" = 'IC8RNP';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 281 WHERE "id" = 'IE5Q5C';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 295 WHERE "id" = 'IJ2FTR';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 193 WHERE "id" = 'IDV72Q';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 182 WHERE "id" = 'IM9GEG';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 175 WHERE "id" = 'I9ZUZ2';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 141 WHERE "id" = 'IZG866';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 273 WHERE "id" = 'I4B7E4';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 248 WHERE "id" = 'I2QSVR';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 137 WHERE "id" = 'IXJPYH';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 202 WHERE "id" = 'I5354S';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 279 WHERE "id" = 'IGP5J8';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 249 WHERE "id" = 'IFDFHB';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 249 WHERE "id" = 'IAQRRJ';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 112 WHERE "id" = 'IBMBX5';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 174 WHERE "id" = 'I5SG39';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 122 WHERE "id" = 'IPPW92';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 206 WHERE "id" = 'ICYGGX';
UPDATE "EstoqueItem" SET "saldo" = "saldo" - 156 WHERE "id" = 'I8EC9C';

-- 5. Verificar total de ajustes aplicados
SELECT 'Total de ajustes aplicados: ' || COUNT(*) as resultado
FROM "EstoqueItem" 
WHERE "id" IN ('I7PAYN', 'I6STND', 'IU9EBS', 'IB96TT', 'IFQAXH', 'ISTGUK', 'I9EGE3', 'ITUNNX', 'IK3KR6', 'ITQM83', 'IHHDB6', 'I4VYTB', 'ICCEG7', 'IZ4KJC', 'IWURH6', 'IV6Q8U', 'I65NJ4', 'I5XZKX', 'ID5KWV', 'I33D9Z', 'ICQRNX', 'ICDQB2', 'IM82AX', 'IC7QXR', 'IT225H', 'IHZRGB', 'IFVGTP', 'IUTY3Y', 'I6KNC9', 'IER5AG', 'IFQ2P4', 'IC8RNP', 'IE5Q5C', 'IJ2FTR', 'IDV72Q', 'IM9GEG', 'I9ZUZ2', 'IZG866', 'I4B7E4', 'I2QSVR', 'IXJPYH', 'I5354S', 'IGP5J8', 'IFDFHB', 'IAQRRJ', 'IBMBX5', 'I5SG39', 'IPPW92', 'ICYGGX', 'I8EC9C');

-- 6. Finalizar transação
COMMIT;

-- 7. Verificar alguns saldos após ajuste
SELECT "id", "saldo" 
FROM "EstoqueItem" 
WHERE "id" IN ('I7PAYN', 'ITUNNX', 'I33D9Z', 'IB96TT', 'ISTGUK') 
ORDER BY "id";