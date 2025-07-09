-- Corrigir ID da Roupa de Astronauta de '039663' para '03A663'
BEGIN;

-- Verificar item atual
SELECT 'ANTES:' as status, id, nome_equipamento, numero_ca FROM tipos_epi WHERE id = '039663';

-- Gerar novo ID hexadecimal válido
UPDATE tipos_epi 
SET id = '03A663' 
WHERE id = '039663' 
  AND nome_equipamento = 'Roupa de Astronauta';

-- Verificar alteração
SELECT 'DEPOIS:' as status, id, nome_equipamento, numero_ca FROM tipos_epi WHERE id = '03A663';

COMMIT;