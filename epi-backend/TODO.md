# Lista de Correções Necessárias - Módulo EPI

## Correções no Schema Prisma

### Modelo EntregaItem
1. ✅ Remover campos incorretos já foi feito:
   - ❌ `dataFabricacao`
   - ❌ `dataVencimento`
   - ❌ `lote`

2. ⚠️ Corrigir inconsistência de nomes:
   - Renomear `dataDevolucao` para `dataLimiteDevolucao` para alinhar com a documentação
   
3. ⚠️ Adicionar campo ausente:
   - `estoqueItemOrigemId` para rastrear o item específico do estoque de onde veio o EPI

4. ⚠️ Corrigir Enum StatusEntregaItem:
   - Valor atual incorreto: `ENTREGUE` 
   - Valor documentado correto: `COM_COLABORADOR`
   
5. ⚠️ Corrigir índice:
   - Remover referência ao campo inexistente `dataVencimento` no índice `@@index([status, dataVencimento])`

6. ⚠️ Verificar necessidade de adição de constraint:
   - Garantir que `quantidadeEntregue` seja sempre 1 conforme documentação

### Enum StatusEntregaItem
1. ⚠️ Corrigir valores do enum:
   - Substituir `ENTREGUE` por `COM_COLABORADOR` (padrão)
   - Manter `DEVOLVIDO`

## Impacto no Código Backend

### Use Cases impactados
1. ⚠️ `criar-entrega-ficha.use-case.ts`:
   - Atualizar referências de `dataDevolucao` para `dataLimiteDevolucao`
   - Adicionar lógica para vincular ao `estoqueItemOrigemId`
   - Corrigir uso do enum `StatusEntregaItem.ENTREGUE` para `StatusEntregaItem.COM_COLABORADOR`

2. ⚠️ `devolucao-ficha.use-case.ts` (se existir):
   - Atualizar referências de campos e enums

### Testes impactados
1. ⚠️ Testes de integração:
   - `criar-entrega-ficha.integration.spec.ts`
   - Outros testes que dependem do modelo EntregaItem

### Queries e Relatórios
1. ⚠️ Queries que referenciam os campos:
   - `relatorio-entregas-colaborador.use-case.ts` 
   - `controle-vencimentos.use-case.ts`
   - Outras queries que possam referenciar os campos alterados

### Controllers e DTOs
1. ⚠️ Controllers que usam os dados do modelo EntregaItem:
   - Verificar e atualizar DTOs de entrada/saída
   - Corrigir tipos e validações

### Migrations
1. ⚠️ Criar migration para:
   - Renomear campo `dataDevolucao` para `dataLimiteDevolucao`
   - Adicionar campo `estoqueItemOrigemId`
   - Remover índice incorreto e adicionar índices corretos
   - Manter a integridade dos dados existentes

## Procedimentos Recomendados
1. 🔥 Fazer backup do banco de dados antes de aplicar as migrations
2. ✅ Corrigir o schema.prisma
3. 🔄 Gerar a migration com `npx prisma migrate dev --name correcoes_modelo_entrega_item`
4. 🔄 Ajustar todo o código que faz referência aos campos alterados
5. 🔄 Atualizar o seed.ts para manter consistente com o novo schema
6. 🔄 Atualizar testes de integração e unitários
7. 🔄 Testar toda a funcionalidade de entregas e devoluções após as alterações
