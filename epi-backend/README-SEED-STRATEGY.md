# 🌱 Nova Estratégia de Seeding - Backend EPI v3.5

## 📋 Visão Geral

A nova estratégia de seeding resolve o problema de **inconsistências entre Read Model e Event Log** que ocorria quando dados eram inseridos diretamente no banco, contornando os use cases e suas validações.

### ❌ Problema Anterior
- Seed criava dados diretamente no banco
- Movimentações criadas sem usar use cases
- Rastreabilidade comprometida
- Saldos inconsistentes entre estoque e kardex
- Dados não refletiam o comportamento real da aplicação

### ✅ Nova Solução
- **Fase 1**: Dados estruturais (sem movimentações)
- **Fase 2**: Movimentações via use cases reais
- **Consistência total** entre desenvolvimento e produção
- **Rastreabilidade unitária** preservada

## 🏗️ Arquitetura da Nova Estratégia

### Fase 1: Seed Base (`prisma/seed-base.ts`)
**Cria apenas dados estruturais:**
- ✅ Contratadas (CNPJs reais)
- ✅ Colaboradores (CPFs válidos)
- ✅ Tipos de EPI (CAs do Ministério do Trabalho)
- ✅ Fichas EPI vazias
- ❌ **Não cria**: Estoque, movimentações, entregas, devoluções

### Fase 2: Script de Movimentações (`scripts/seed-movimentacoes.ts`)
**Usa os use cases reais para criar:**
- 📝 Notas de entrada → `ConcluirNotaMovimentacaoUseCase`
- 📦 Entregas de EPI → `CriarEntregaFichaUseCase`
- 🔄 Devoluções → `ProcessarDevolucaoUseCase`
- ⚖️ Ajustes de inventário → `RealizarAjusteDiretoUseCase`

## 🚀 Comandos Disponíveis

### Comandos Individuais
```bash
# Seed principal (usuários, almoxarifados, configurações)
npm run seed

# Seed base (dados estruturais sem movimentações)
npm run seed:base

# Seed de movimentações (via use cases)
npm run seed:movimentacoes
```

### Comandos Combinados
```bash
# Demo completo (base + movimentações)
npm run seed:demo

# Reset completo com migrações
npm run seed:reset

# Script automatizado completo
./scripts/reset-demo-completo.sh
```

## 📊 Configuração dos Volumes

### Seed Base (`CONFIG` em `seed-base.ts`)
```typescript
const CONFIG = {
  cleanDatabase: true,        // Limpar dados existentes
  empresas: 20,              // Número de contratadas
  colaboradoresPorEmpresa: 10, // Colaboradores por contratada
  percentualSemFicha: 0.5,   // 50% sem ficha EPI
  tiposEpi: 25,              // Tipos de EPI a criar
};
```

### Seed Movimentações (`CONFIG` em `seed-movimentacoes.ts`)
```typescript
const CONFIG = {
  notasEntrada: 15,           // Notas de entrada
  percentualEntregas: 0.3,    // 30% das fichas recebem entregas
  percentualDevolucoes: 0.2,  // 20% das entregas têm devoluções
  itensMinPorNota: 3,         // Min tipos EPI por nota
  itensMaxPorNota: 7,         // Max tipos EPI por nota
  quantidadeMinPorItem: 50,   // Min quantidade por item
  quantidadeMaxPorItem: 200,  // Max quantidade por item
};
```

## 🔍 Validações e Consistência

### Princípios Garantidos
1. **Rastreabilidade Unitária**: Cada item físico = 1 `MovimentacaoEstoque`
2. **Transações Atômicas**: Todas operações em `prisma.$transaction()`
3. **Validações de Negócio**: Respeitadas via use cases
4. **Configurações do Sistema**: `PERMITIR_ESTOQUE_NEGATIVO`, etc.

### Verificação de Integridade
```sql
-- Verificar consistência kardex vs estoque
WITH saldos_kardex AS (
  SELECT 
    ei.id,
    ei.quantidade as saldo_atual,
    COALESCE(SUM(
      CASE 
        WHEN me.tipo_movimentacao LIKE 'ENTRADA%' THEN me.quantidade_movida
        WHEN me.tipo_movimentacao LIKE 'SAIDA%' THEN -me.quantidade_movida
        ELSE 0
      END
    ), 0) as saldo_kardex
  FROM estoque_itens ei
  LEFT JOIN movimentacoes_estoque me ON ei.id = me.estoque_item_id
  WHERE ei.status = 'DISPONIVEL'
  GROUP BY ei.id, ei.quantidade
)
SELECT COUNT(*) as inconsistencias
FROM saldos_kardex 
WHERE saldo_atual != saldo_kardex;
```

## 🔧 Fluxo de Desenvolvimento

### Para Desenvolvimento Local
```bash
# 1. Reset completo automatizado
./scripts/reset-demo-completo.sh

# 2. Ou manual passo a passo
npm run docker:down
npm run docker:up
npm run prisma:deploy
npm run seed:demo
```

### Para Produção/Demo
```bash
# 1. Aplicar migrações
npm run prisma:deploy

# 2. Seed estrutural
npm run seed
npm run seed:base

# 3. Movimentações (se necessário)
npm run seed:movimentacoes
```

## 📈 Resultados Esperados

### Dados Típicos Gerados
- **Contratadas**: 20 empresas reais
- **Colaboradores**: 200 (10 por empresa)
- **Fichas EPI**: ~100 (50% dos colaboradores)
- **Tipos EPI**: 25 equipamentos reais
- **Notas de Entrada**: 15 notas
- **Itens de Estoque**: ~375 (15 notas × 5 tipos médio × 5 almoxarifados)
- **Movimentações**: ~2000+ (entrada + saída + devoluções)
- **Entregas**: ~30 (30% das fichas)
- **Devoluções**: ~6 (20% das entregas)

### Métricas de Qualidade
- ✅ **0 inconsistências** entre kardex e estoque
- ✅ **100% rastreabilidade** unitária
- ✅ **Validações respeitadas** via use cases
- ✅ **Performance adequada** (< 2min execução total)

## 🐛 Troubleshooting

### Erro: "Use case não encontrado"
```bash
# Verificar se a aplicação NestJS está compilada
npm run build
```

### Erro: "Dados base não encontrados"
```bash
# Executar seeds na ordem correta
npm run seed          # 1. Sistema básico
npm run seed:base     # 2. Dados estruturais
npm run seed:movimentacoes  # 3. Movimentações
```

### Inconsistências no kardex
```bash
# Limpar e recriar tudo
npm run docker:down -v
npm run seed:reset
```

## 🎯 Vantagens da Nova Estratégia

1. **Conformidade Total**: Usa mesmos use cases da aplicação
2. **Dados Reais**: Comportamento idêntico à produção
3. **Debugging Fácil**: Erros aparecem durante o seed
4. **Performance Validada**: Testa use cases com volume real
5. **Manutenção Simples**: Reutiliza lógica existente
6. **Flexibilidade**: Execução em fases conforme necessidade

## 📝 Notas de Migração

### De seed-demo.ts para nova estratégia:
1. **Backup dados importantes** (se houver)
2. **Execute reset completo**: `./scripts/reset-demo-completo.sh`
3. **Valide consistência** dos dados gerados
4. **Ajuste configurações** conforme necessário

### Personalização:
- Modifique `CONFIG` nos arquivos de seed
- Ajuste volumes conforme ambiente (dev/staging/prod)
- Adicione novos use cases conforme evolução do sistema