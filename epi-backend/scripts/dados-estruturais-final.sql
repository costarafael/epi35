-- Script final para criar dados estruturais usando IDs existentes

BEGIN;

-- 1. Criar contratadas
INSERT INTO contratadas (id, nome, cnpj, created_at) VALUES
('CON001', 'Empresa Alpha Ltda', '11222333000181', NOW()),
('CON002', 'Beta Construções S.A.', '44555666000172', NOW()),
('CON003', 'Gamma Serviços Ltda', '77888999000163', NOW()),
('CON004', 'Delta Engenharia Ltda', '22333444000155', NOW()),
('CON005', 'Epsilon Manutenção S.A.', '55666777000146', NOW());

-- 2. Criar tipos de EPI
INSERT INTO tipos_epi (id, nome_equipamento, numero_ca, categoria, vida_util_dias, status, created_at) VALUES
('EPI001', 'Capacete de Segurança', '12345', 'PROTECAO_CABECA', 1800, 'ATIVO', NOW()),
('EPI002', 'Óculos de Proteção', '23456', 'PROTECAO_OLHOS_ROSTO', 1080, 'ATIVO', NOW()),
('EPI003', 'Luva de Couro', '34567', 'PROTECAO_MAOS_BRACCOS', 360, 'ATIVO', NOW()),
('EPI004', 'Botina de Segurança', '45678', 'PROTECAO_PES', 720, 'ATIVO', NOW()),
('EPI005', 'Protetor Auricular', '56789', 'PROTECAO_OUVIDOS', 180, 'ATIVO', NOW()),
('EPI006', 'Máscara Respiratória', '67890', 'PROTECAO_RESPIRATORIA', 360, 'ATIVO', NOW()),
('EPI007', 'Cinto de Segurança', '78901', 'PROTECAO_CABECA', 1080, 'ATIVO', NOW()),
('EPI008', 'Capa de Chuva', '89012', 'PROTECAO_CLIMATICA', 720, 'ATIVO', NOW());

-- 3. Criar colaboradores usando IDs existentes das unidades
INSERT INTO colaboradores (id, nome, cpf, matricula, cargo, setor, contratada_id, unidade_negocio_id, ativo, created_at) VALUES
('COL001', 'João Silva Santos', '12345678901', 'MAT001', 'Operador de Produção', 'Produção', 'CON001', 'd42d0657-4671-4026-ae34-61b74806ad9d', true, NOW()),
('COL002', 'Maria Oliveira Costa', '23456789012', 'MAT002', 'Supervisora de Segurança', 'Segurança', 'CON001', 'd42d0657-4671-4026-ae34-61b74806ad9d', true, NOW()),
('COL003', 'Pedro Souza Lima', '34567890123', 'MAT003', 'Técnico de Manutenção', 'Manutenção', 'CON002', 'd42d0657-4671-4026-ae34-61b74806ad9d', true, NOW()),
('COL004', 'Ana Santos Rocha', '45678901234', 'MAT004', 'Engenheira de Campo', 'Engenharia', 'CON002', '02a80bf6-9fcb-42ea-ad78-7d94ec1e6ff0', true, NOW()),
('COL005', 'Carlos Pereira Dias', '56789012345', 'MAT005', 'Operador de Máquinas', 'Produção', 'CON003', '02a80bf6-9fcb-42ea-ad78-7d94ec1e6ff0', true, NOW()),
('COL006', 'Fernanda Lima Cruz', '67890123456', 'MAT006', 'Soldadora', 'Produção', 'CON003', 'd42d0657-4671-4026-ae34-61b74806ad9d', true, NOW()),
('COL007', 'Roberto Alves Moura', '78901234567', 'MAT007', 'Eletricista Industrial', 'Manutenção', 'CON004', '02a80bf6-9fcb-42ea-ad78-7d94ec1e6ff0', true, NOW()),
('COL008', 'Juliana Rodrigues Teixeira', '89012345678', 'MAT008', 'Inspetora de Qualidade', 'Qualidade', 'CON004', 'd42d0657-4671-4026-ae34-61b74806ad9d', true, NOW()),
('COL009', 'Marcelo Ferreira Barbosa', '90123456789', 'MAT009', 'Mecânico Industrial', 'Manutenção', 'CON005', '02a80bf6-9fcb-42ea-ad78-7d94ec1e6ff0', true, NOW()),
('COL010', 'Camila Martins Nascimento', '01234567890', 'MAT010', 'Técnica de Segurança', 'Segurança', 'CON005', 'd42d0657-4671-4026-ae34-61b74806ad9d', true, NOW());

-- 4. Criar fichas EPI
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
    'Contratadas' as entidade, COUNT(*) as total FROM contratadas
UNION ALL
SELECT '', 'Tipos EPI', COUNT(*) FROM tipos_epi
UNION ALL
SELECT '', 'Colaboradores', COUNT(*) FROM colaboradores
UNION ALL
SELECT '', 'Fichas EPI', COUNT(*) FROM fichas_epi;

SELECT 
    '🎯 ESTRUTURA PRONTA PARA MOVIMENTAÇÕES!' as resultado,
    'Agora podemos executar movimentações via use cases' as proximo_passo;