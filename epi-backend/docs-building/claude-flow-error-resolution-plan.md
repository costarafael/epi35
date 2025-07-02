# 🤖 Plano de Resolução Paralela de Erros - Claude-Flow Strategy

## 📊 STATUS ATUAL (02/07/2025)

**Progresso**: 547 → 493 erros de compilação (54 corrigidos, ~10% concluído)
**Estratégia**: Resolução paralela conservadora com claude-flow para acelerar sem conflitos

---

## 🎯 ESTRATÉGIA CLAUDE-FLOW: ABORDAGEM CONSERVADORA

### Princípios de Segurança para Paralelização:

1. **Separação por Domínio**: Agentes trabalham em diferentes domínios funcionais
2. **Isolamento de Arquivos**: Cada agente trabalha em conjunto específico de arquivos
3. **Memória Compartilhada**: Usar Memory Bank para coordenar padrões de correção
4. **Validação Contínua**: Build intermediário a cada grupo de correções

---

## 📁 GRUPOS DE ERROS IDENTIFICADOS (Análise de 493 erros restantes)

### **GRUPO 1: Use Cases de Fichas** 🏷️
**Arquivos**: `src/application/use-cases/fichas/*.ts`
**Problemas**: Schema fundamental de FichaEPI mudou (múltiplas → única por colaborador)
**Agente SPARC**: `architect` + `coder`
**Conflito**: ❌ BAIXO (arquivos isolados do domínio fichas)

### **GRUPO 2: Use Cases de Estoque** 📦
**Arquivos**: `src/application/use-cases/estoque/*.ts` (restantes)
**Problemas**: MovimentacaoEstoque entity, static methods, enum values
**Agente SPARC**: `coder` + `refactor`
**Conflito**: ❌ BAIXO (arquivos isolados do domínio estoque)

### **GRUPO 3: Queries e Relatórios** 📊
**Arquivos**: `src/application/use-cases/queries/*.ts`
**Problemas**: Campos removidos, includes incorretos, orderBy inválidos
**Agente SPARC**: `coder` + `reviewer`
**Conflito**: ❌ BAIXO (arquivos isolados de queries)

### **GRUPO 4: Controllers e DTOs** 🌐
**Arquivos**: `src/presentation/**/*.ts`
**Problemas**: DTOs com estrutura antiga, validações Zod desatualizadas
**Agente SPARC**: `coder` + `tdd`
**Conflito**: ⚠️ MÉDIO (pode afetar interfaces públicas)

### **GRUPO 5: Repositories e Interfaces** 🔧
**Arquivos**: `src/domain/interfaces/**/*.ts`, `src/infrastructure/**/*.ts`
**Problemas**: Interfaces desatualizadas, implementações Prisma incorretas
**Agente SPARC**: `architect` + `coder`
**Conflito**: 🔴 ALTO (afeta outros grupos)

### **GRUPO 6: Tests de Integração** 🧪
**Arquivos**: `test/**/*.ts` (exceto já corrigidos)
**Problemas**: Schema antigo em seeds, includes incorretos, assertions inválidas
**Agente SPARC**: `tdd` + `integration`
**Conflito**: ❌ BAIXO (arquivos isolados de teste)

---

## 🚀 PLANO DE EXECUÇÃO CLAUDE-FLOW

### **FASE 1: Preparação do Ambiente** (5 min)
```bash
# Inicializar claude-flow com configurações SPARC
./claude-flow init --sparc

# Armazenar padrões de correção na memória compartilhada
./claude-flow memory store "migration_patterns" "$(cat CLAUDE.md | grep -A 50 'PADRÕES DE CORREÇÃO')"

# Armazenar lista de arquivos por grupo
./claude-flow memory store "files_group_1" "src/application/use-cases/fichas/"
./claude-flow memory store "files_group_2" "src/application/use-cases/estoque/"
./claude-flow memory store "files_group_3" "src/application/use-cases/queries/"
```

### **FASE 2: Execução Paralela CONSERVADORA** (30-45 min)

#### **Wave 1**: Grupos de BAIXO conflito (paralelo)
```bash
# Executar 3 agentes em paralelo - grupos independentes
./claude-flow swarm "Fix all compilation errors in fichas use cases following migration patterns" \
  --strategy development \
  --max-agents 2 \
  --parallel \
  --files "src/application/use-cases/fichas/" \
  --memory-key "migration_patterns"

./claude-flow swarm "Fix all compilation errors in queries and reports following migration patterns" \
  --strategy development \
  --max-agents 2 \
  --parallel \
  --files "src/application/use-cases/queries/" \
  --memory-key "migration_patterns"

./claude-flow swarm "Fix all compilation errors in integration tests following migration patterns" \
  --strategy development \
  --max-agents 2 \
  --parallel \
  --files "test/" \
  --memory-key "migration_patterns"
```

#### **Checkpoint Wave 1**: Validação (5 min)
```bash
# Verificar progresso após Wave 1
npm run build 2>&1 | grep "Found.*error" | tail -1

# Se < 300 erros, continuar. Caso contrário, resolver conflitos manualmente
```

#### **Wave 2**: Grupo de MÉDIO conflito (sequencial)
```bash
# Executar após Wave 1 para evitar conflitos
./claude-flow sparc run coder "Fix all compilation errors in controllers and DTOs in src/presentation/ following migration patterns from memory"
```

#### **Wave 3**: Grupo de ALTO conflito (manual + IA)
```bash
# Executar por último para evitar quebrar dependências
./claude-flow sparc run architect "Analyze and fix all repository interfaces and implementations following migration patterns"
```

---

## 📋 COMANDOS CLAUDE-FLOW ESPECÍFICOS

### **Para Grupo 1 (Fichas)**:
```bash
./claude-flow sparc run architect "Analyze FichaEPI schema changes and plan migration strategy for fichas use cases"

./claude-flow sparc run coder "Fix compilation errors in src/application/use-cases/fichas/ by updating to single-ficha-per-collaborator model"
```

### **Para Grupo 2 (Estoque)**:
```bash
./claude-flow sparc run refactor "Migrate remaining estoque use cases to use estoqueItemId instead of almoxarifadoId+tipoEpiId pattern"

./claude-flow sparc run coder "Update static methods and enum values in estoque use cases following migration patterns"
```

### **Para Grupo 3 (Queries)**:
```bash
./claude-flow sparc run coder "Fix all Prisma queries in reports by updating field names, includes, and orderBy clauses"

./claude-flow sparc run reviewer "Review and test all query corrections for correctness"
```

### **Para Grupo 6 (Tests)**:
```bash
./claude-flow sparc run tdd "Update integration tests to use new schema structure and correct includes"

./claude-flow sparc run integration "Ensure all tests pass with updated schema structure"
```

---

## 🧠 COORDENAÇÃO VIA MEMORY BANK

### **Armazenar Progresso**:
```bash
# Cada agente salva seu progresso
./claude-flow memory store "group1_progress" "Completed: files X, Y, Z. Remaining: A, B"
./claude-flow memory store "group1_patterns" "New patterns discovered: ..."

# Compartilhar descobertas entre agentes
./claude-flow memory store "common_errors" "Error type X found in multiple groups, solution: ..."
```

### **Consultar Estado**:
```bash
# Verificar progresso geral
./claude-flow memory query "progress"

# Verificar padrões descobertos
./claude-flow memory query "patterns"
```

---

## ⚠️ PONTOS DE ATENÇÃO

### **Conflitos Potenciais**:
1. **Interfaces de Repository**: Grupo 5 pode afetar grupos 1-3
2. **Enum Definitions**: Mudanças podem afetar múltiplos grupos
3. **DTO Structures**: Grupo 4 pode afetar controllers e testes

### **Mitigação**:
1. **Checkpoints frequentes**: Build após cada wave
2. **Git commits**: Cada grupo salva progresso independentemente  
3. **Rollback strategy**: Se conflito > benefício, reverter para execução sequencial

### **Fallback Plan**:
```bash
# Se paralelização causar muitos conflitos
./claude-flow stop
git reset --hard HEAD  # Voltar ao estado anterior
# Executar sequencialmente grupo por grupo
```

---

## 🎯 MÉTRICAS DE SUCESSO

### **Objetivos**:
- **Redução**: 493 → <100 erros (80% redução)
- **Tempo**: 30-45 min (vs 2-3 horas sequencial)
- **Qualidade**: Nenhum teste quebrado após correções

### **Monitoramento**:
```bash
# Check contínuo durante execução
watch -n 30 'npm run build 2>&1 | grep "Found.*error" | tail -1'

# Métricas finais
./claude-flow memory get "final_stats"
```

---

## 🚦 COMANDOS DE EXECUÇÃO RÁPIDA

### **Setup Completo**:
```bash
# Preparar ambiente
./claude-flow init --sparc
./claude-flow memory store "migration_patterns" "$(cat CLAUDE.md | grep -A 100 'GUIA DE MIGRAÇÃO')"

# Executar Wave 1 (paralelo conservador)
./claude-flow swarm "Fix fichas use cases compilation errors" --max-agents 2 --files "src/application/use-cases/fichas/" &
./claude-flow swarm "Fix queries compilation errors" --max-agents 2 --files "src/application/use-cases/queries/" &
./claude-flow swarm "Fix test compilation errors" --max-agents 2 --files "test/" &

# Aguardar conclusão e verificar
wait
npm run build 2>&1 | grep "Found.*error"
```

---

**📌 Nota**: Esta estratégia prioriza SEGURANÇA sobre velocidade máxima. Para projetos críticos, prefira grupos menores e mais checkpoints.