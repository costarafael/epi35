-- Corrigir ID da Roupa de Astronauta de '039663' para '03A663'
-- Executar em ambiente de produção

BEGIN;

-- Gerar um novo ID no padrão hexadecimal correto
-- Usaremos '03A663' para manter similaridade com o ID atual
UPDATE tipos_epi 
SET id = '03A663' 
WHERE id = '039663' 
  AND nome_equipamento = 'Roupa de Astronauta'
  AND numero_ca = '0001';

-- Verificar se a atualização foi bem-sucedida
SELECT 
    id,
    nome_equipamento,
    numero_ca,
    categoria,
    created_at
FROM tipos_epi 
WHERE id = '03A663' OR id = '039663'
ORDER BY created_at DESC;

COMMIT;