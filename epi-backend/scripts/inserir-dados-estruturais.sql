-- Script para inserir dados estruturais com estrutura correta
-- Executar após a limpeza total

BEGIN;

-- 1. Criar usuários do sistema
INSERT INTO usuarios (id, nome, email, created_at) VALUES
('USR001', 'Administrador Sistema', 'admin@epi.local', NOW()),
('USR002', 'Operador Almoxarifado', 'operador@epi.local', NOW()),
('USR003', 'Supervisor', 'supervisor@epi.local', NOW());

-- 2. Criar unidades de negócio
INSERT INTO unidades_negocio (id, nome, codigo, created_at) VALUES
('UNI001', 'Unidade Central', 'CENTRAL', NOW()),
('UNI002', 'Filial Norte', 'NORTE', NOW());

-- 3. Criar almoxarifados
INSERT INTO almoxarifados (id, nome, unidade_negocio_id, is_principal, created_at) VALUES
('ALM001', 'Almoxarifado Central', 'UNI001', true, NOW()),
('ALM002', 'Almoxarifado Norte', 'UNI002', false, NOW());

-- 4. Criar contratadas
INSERT INTO contratadas (id, nome, cnpj, ativa, created_at) VALUES
('CON001', 'Empresa Alpha Ltda', '11.222.333/0001-81', true, NOW()),
('CON002', 'Beta Construções S.A.', '44.555.666/0001-72', true, NOW()),
('CON003', 'Gamma Serviços Ltda', '77.888.999/0001-63', true, NOW()),
('CON004', 'Delta Engenharia Ltda', '22.333.444/0001-55', true, NOW()),
('CON005', 'Epsilon Manutenção S.A.', '55.666.777/0001-46', true, NOW());

-- 5. Criar tipos de EPI
INSERT INTO tipos_epi (id, nome_equipamento, numero_ca, categoria, validade_meses, exige_assinatura_entrega, ativo, created_at) VALUES
('EPI001', 'Capacete de Segurança', '12345', 'PROTECAO_CABECA', 60, true, true, NOW()),
('EPI002', 'Óculos de Proteção', '23456', 'PROTECAO_OLHOS_ROSTO', 36, false, true, NOW()),
('EPI003', 'Luva de Couro', '34567', 'PROTECAO_MAOS_BRACCOS', 12, false, true, NOW()),
('EPI004', 'Botina de Segurança', '45678', 'PROTECAO_PES', 24, true, true, NOW()),
('EPI005', 'Protetor Auricular', '56789', 'PROTECAO_OUVIDOS', 6, false, true, NOW()),
('EPI006', 'Máscara Respiratória', '67890', 'PROTECAO_RESPIRATORIA', 12, true, true, NOW()),
('EPI007', 'Cinto de Segurança', '78901', 'PROTECAO_CABECA', 36, true, true, NOW()),
('EPI008', 'Capa de Chuva', '89012', 'PROTECAO_CLIMATICA', 24, false, true, NOW());

-- 6. Criar colaboradores
INSERT INTO colaboradores (id, nome, cpf, matricula, cargo, contratada_id, unidade_negocio_id, ativo, created_at) VALUES
('COL001', 'João Silva Santos', '123.456.789-01', 'MAT001', 'Operador de Produção', 'CON001', 'UNI001', true, NOW()),
('COL002', 'Maria Oliveira Costa', '234.567.890-12', 'MAT002', 'Supervisora de Segurança', 'CON001', 'UNI001', true, NOW()),
('COL003', 'Pedro Souza Lima', '345.678.901-23', 'MAT003', 'Técnico de Manutenção', 'CON002', 'UNI001', true, NOW()),
('COL004', 'Ana Santos Rocha', '456.789.012-34', 'MAT004', 'Engenheira de Campo', 'CON002', 'UNI002', true, NOW()),
('COL005', 'Carlos Pereira Dias', '567.890.123-45', 'MAT005', 'Operador de Máquinas', 'CON003', 'UNI002', true, NOW()),
('COL006', 'Fernanda Lima Cruz', '678.901.234-56', 'MAT006', 'Soldadora', 'CON003', 'UNI001', true, NOW()),
('COL007', 'Roberto Alves Moura', '789.012.345-67', 'MAT007', 'Eletricista Industrial', 'CON004', 'UNI002', true, NOW()),
('COL008', 'Juliana Rodrigues Teixeira', '890.123.456-78', 'MAT008', 'Inspetora de Qualidade', 'CON004', 'UNI001', true, NOW()),
('COL009', 'Marcelo Ferreira Barbosa', '901.234.567-89', 'MAT009', 'Mecânico Industrial', 'CON005', 'UNI002', true, NOW()),
('COL010', 'Camila Martins Nascimento', '012.345.678-90', 'MAT010', 'Técnica de Segurança', 'CON005', 'UNI001', true, NOW());

-- 7. Criar fichas EPI (uma por colaborador)
INSERT INTO fichas_epi (id, colaborador_id, status, data_emissao, created_at) VALUES
('FICHA001', 'COL001', 'ATIVA', NOW(), NOW()),
('FICHA002', 'COL002', 'ATIVA', NOW(), NOW()),
('FICHA003', 'COL003', 'ATIVA', NOW(), NOW()),
('FICHA004', 'COL004', 'ATIVA', NOW(), NOW()),
('FICHA005', 'COL005', 'ATIVA', NOW(), NOW()),
('FICHA006', 'COL006', 'ATIVA', NOW(), NOW()),
('FICHA007', 'COL007', 'ATIVA', NOW(), NOW()),
('FICHA008', 'COL008', 'ATIVA', NOW(), NOW()),
('FICHA009', 'COL009', 'ATIVA', NOW(), NOW()),
('FICHA010', 'COL010', 'ATIVA', NOW(), NOW());

COMMIT;

-- Verificação final
SELECT 
    '✅ DADOS ESTRUTURAIS CRIADOS' as status,
    'Usuários' as entidade, COUNT(*) as total FROM usuarios
UNION ALL
SELECT '', 'Unidades', COUNT(*) FROM unidades_negocio
UNION ALL
SELECT '', 'Almoxarifados', COUNT(*) FROM almoxarifados
UNION ALL
SELECT '', 'Contratadas', COUNT(*) FROM contratadas
UNION ALL
SELECT '', 'Tipos EPI', COUNT(*) FROM tipos_epi
UNION ALL
SELECT '', 'Colaboradores', COUNT(*) FROM colaboradores
UNION ALL
SELECT '', 'Fichas EPI', COUNT(*) FROM fichas_epi
UNION ALL
SELECT '', 'Itens Estoque', COUNT(*) FROM estoque_itens
UNION ALL
SELECT '', 'Movimentações', COUNT(*) FROM movimentacoes_estoque;

SELECT '🎉 SEED ESTRUTURAL CONCLUÍDO!' as resultado,
       'Database limpo e dados consistentes criados' as descricao;