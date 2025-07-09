-- Correção final do ID da Roupa de Astronauta
-- Executar após configurar o IP no Access Control do Render

BEGIN;

-- 1. Verificar estado atual
SELECT 'ANTES DA CORREÇÃO:' as status, id, nome_equipamento, numero_ca, categoria 
FROM tipos_epi 
WHERE id = '039663' OR nome_equipamento = 'Roupa de Astronauta';

-- 2. Verificar se não há conflito com o novo ID
SELECT 'VERIFICANDO CONFLITO:' as status, id, nome_equipamento 
FROM tipos_epi 
WHERE id = '03A663';

-- 3. Fazer a correção do ID
UPDATE tipos_epi 
SET id = '03A663' 
WHERE id = '039663' 
  AND nome_equipamento = 'Roupa de Astronauta'
  AND numero_ca = '0001';

-- 4. Verificar resultado
SELECT 'APÓS CORREÇÃO:' as status, id, nome_equipamento, numero_ca, categoria 
FROM tipos_epi 
WHERE id = '03A663';

-- 5. Confirmar que o ID antigo não existe mais
SELECT 'VERIFICAR ID ANTIGO:' as status, COUNT(*) as quantidade 
FROM tipos_epi 
WHERE id = '039663';

COMMIT;