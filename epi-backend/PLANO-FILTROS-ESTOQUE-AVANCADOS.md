# **Plano de Implementação: Filtros Avançados de Estoque com Lógica Condicional**

## **📋 Análise dos Requisitos**

### **Situação Atual**
- Endpoint: `GET /api/estoque/itens`
- Status disponíveis: `DISPONIVEL`, `AGUARDANDO_INSPECAO`, `QUARENTENA`
- Filtros: `status`, `apenasDisponiveis`, `apenasComSaldo`
- Lógica atual: Filtro `status` tem prioridade sobre `apenasDisponiveis`

### **Novos Requisitos**

#### **1. Novo Status: "SEM_ESTOQUE"**
- **Definição**: Itens com quantidade ≤ 0 que NÃO estejam em `QUARENTENA` ou `AGUARDANDO_INSPECAO`
- **Filtro**: `GET /api/estoque/itens?status=SEM_ESTOQUE`

#### **2. Lógica Condicional Baseada na Configuração `PERMITIR_ESTOQUE_NEGATIVO`**

**Cenário A: `PERMITIR_ESTOQUE_NEGATIVO = false` (Padrão)**
- **Tab "Disponível"**: Itens com `status = DISPONIVEL` AND `quantidade > 0`
- **Tab "Sem Estoque"**: Itens com `quantidade ≤ 0` AND `status NOT IN (QUARENTENA, AGUARDANDO_INSPECAO)`
- **Tab "Quarentena"**: Itens com `status = QUARENTENA`
- **Tab "Aguardando Inspeção"**: Itens com `status = AGUARDANDO_INSPECAO`

**Cenário B: `PERMITIR_ESTOQUE_NEGATIVO = true`**
- **Tab "Disponível"**: Itens com `status = DISPONIVEL` (independente da quantidade)
- **Tab "Sem Estoque"**: **NÃO APARECE**
- **Tab "Quarentena"**: Itens com `status = QUARENTENA`
- **Tab "Aguardando Inspeção"**: Itens com `status = AGUARDANDO_INSPECAO`

## **🎯 Objetivos da Implementação**

1. **Adicionar novo status virtual "SEM_ESTOQUE"**
2. **Implementar lógica condicional baseada na configuração**
3. **Manter compatibilidade com filtros existentes**
4. **Atualizar validação e documentação**
5. **Criar testes abrangentes**

## **📁 Arquivos a Modificar**

### **1. Schemas de Validação**
- `src/presentation/dto/schemas/estoque.schemas.ts`
  - Adicionar `SEM_ESTOQUE` ao enum
  - Manter compatibilidade com validação existente

### **2. Use Case Principal**
- `src/application/use-cases/estoque/listar-estoque-itens.use-case.ts`
  - Injetar `ConfiguracaoService`
  - Implementar lógica condicional
  - Criar consultas dinâmicas baseadas na configuração

### **3. Controller**
- `src/presentation/controllers/estoque.controller.ts`
  - Atualizar documentação Swagger
  - Adicionar exemplo de uso do novo status

### **4. Documentação**
- `API-P0719h.md`
  - Documentar novo status
  - Explicar comportamento condicional
  - Adicionar exemplos práticos

## **🔧 Implementação Detalhada**

### **Etapa 1: Atualizar Schemas (estoque.schemas.ts)**

```typescript
// Adicionar SEM_ESTOQUE ao enum
status: z.enum(['DISPONIVEL', 'AGUARDANDO_INSPECAO', 'QUARENTENA', 'SEM_ESTOQUE']).optional(),
```

### **Etapa 2: Modificar Use Case (listar-estoque-itens.use-case.ts)**

#### **2.1 Injeção de Dependência**
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly configuracaoService: ConfiguracaoService
) {}
```

#### **2.2 Lógica de Filtro Condicional**
```typescript
// Obter configuração
const permitirEstoqueNegativo = await this.configuracaoService.permitirEstoqueNegativo();

// Construir filtro baseado no status e configuração
if (input.status === 'SEM_ESTOQUE') {
  // Itens sem estoque: quantidade <= 0 E status não é QUARENTENA/AGUARDANDO_INSPECAO
  where.quantidade = { lte: 0 };
  where.status = { notIn: ['QUARENTENA', 'AGUARDANDO_INSPECAO'] };
} else if (input.status === 'DISPONIVEL') {
  where.status = 'DISPONIVEL';
  if (!permitirEstoqueNegativo) {
    // Se não permite estoque negativo, filtrar apenas itens com quantidade > 0
    where.quantidade = { gt: 0 };
  }
} else if (input.status) {
  // Outros status específicos (QUARENTENA, AGUARDANDO_INSPECAO)
  where.status = input.status;
}
```

### **Etapa 3: Endpoint de Validação de Configuração**

Criar novo endpoint para o frontend verificar se deve mostrar a tab "Sem Estoque":

```typescript
@Get('configuracao-filtros')
async obterConfiguracaoFiltros(): Promise<SuccessResponse> {
  const permitirEstoqueNegativo = await this.configuracaoService.permitirEstoqueNegativo();
  
  return {
    success: true,
    data: {
      permitirEstoqueNegativo,
      tabsDisponiveis: {
        disponivel: true,
        quarentena: true,
        aguardandoInspecao: true,
        semEstoque: !permitirEstoqueNegativo
      }
    }
  };
}
```

### **Etapa 4: Testes**

#### **4.1 Cenários de Teste**
1. **Com `PERMITIR_ESTOQUE_NEGATIVO = false`**:
   - Status `DISPONIVEL` retorna apenas itens disponíveis com quantidade > 0
   - Status `SEM_ESTOQUE` retorna itens com quantidade ≤ 0 não em quarentena/inspeção
   - Status `QUARENTENA` retorna apenas itens em quarentena
   - Status `AGUARDANDO_INSPECAO` retorna apenas itens aguardando inspeção

2. **Com `PERMITIR_ESTOQUE_NEGATIVO = true`**:
   - Status `DISPONIVEL` retorna todos os itens disponíveis, independente da quantidade
   - Status `SEM_ESTOQUE` funciona normalmente (mesmo que não apareça no frontend)
   - Outros status funcionam normalmente

#### **4.2 Dados de Teste**
```typescript
// Criar itens de teste com diferentes combinações:
// 1. DISPONIVEL com quantidade > 0
// 2. DISPONIVEL com quantidade ≤ 0
// 3. QUARENTENA com quantidade > 0
// 4. QUARENTENA com quantidade ≤ 0
// 5. AGUARDANDO_INSPECAO com quantidade > 0
// 6. AGUARDANDO_INSPECAO com quantidade ≤ 0
```

## **📋 Checklist de Implementação**

### **Fase 1: Preparação**
- [ ] Analisar código atual e dependências
- [ ] Verificar se `ConfiguracaoService` está disponível no módulo de estoque
- [ ] Criar branch específica para a implementação

### **Fase 2: Implementação Core**
- [ ] Atualizar enum no schema de validação
- [ ] Modificar interface do use case
- [ ] Implementar lógica condicional no use case
- [ ] Atualizar injeção de dependências

### **Fase 3: API e Documentação**
- [ ] Atualizar controller com nova documentação
- [ ] Criar endpoint de configuração de filtros
- [ ] Atualizar Swagger documentation
- [ ] Atualizar API-P0719h.md

### **Fase 4: Testes**
- [ ] Criar testes unitários para a nova lógica
- [ ] Criar testes de integração para ambos os cenários
- [ ] Testar com dados reais
- [ ] Validar todas as combinações de filtros

### **Fase 5: Validação Final**
- [ ] Executar todos os testes
- [ ] Verificar performance das queries
- [ ] Validar documentação
- [ ] Testar em ambiente de desenvolvimento

## **🚀 Considerações de Performance**

### **Otimizações de Query**
1. **Índices Sugeridos**:
   ```sql
   -- Índice composto para filtros de status e quantidade
   CREATE INDEX idx_estoque_status_quantidade ON "EstoqueItem" (status, quantidade);
   ```

2. **Query Eficiente para SEM_ESTOQUE**:
   ```sql
   SELECT * FROM "EstoqueItem" 
   WHERE quantidade <= 0 
   AND status NOT IN ('QUARENTENA', 'AGUARDANDO_INSPECAO')
   ORDER BY almoxarifado_id, tipo_epi_id;
   ```

### **Cache de Configuração**
- Implementar cache da configuração `PERMITIR_ESTOQUE_NEGATIVO` no Redis
- TTL de 5 minutos para evitar consultas frequentes ao banco

## **📝 Impacto no Frontend**

### **Comportamento Esperado**
1. **Frontend deve consultar `/api/estoque/configuracao-filtros`** antes de renderizar as tabs
2. **Se `permitirEstoqueNegativo = false`**: Mostrar 4 tabs (Disponível, Quarentena, Aguardando Inspeção, Sem Estoque)
3. **Se `permitirEstoqueNegativo = true`**: Mostrar 3 tabs (Disponível, Quarentena, Aguardando Inspeção)

### **Chamadas da API**
```javascript
// Obter configuração das tabs
GET /api/estoque/configuracao-filtros

// Filtrar por status
GET /api/estoque/itens?status=DISPONIVEL
GET /api/estoque/itens?status=SEM_ESTOQUE
GET /api/estoque/itens?status=QUARENTENA
GET /api/estoque/itens?status=AGUARDANDO_INSPECAO
```

## **🔒 Considerações de Segurança e Consistência**

1. **Validação**: Sempre validar o enum no backend, independente do frontend
2. **Configuração**: Mudanças na configuração devem ser auditadas
3. **Fallback**: Se houver erro ao obter configuração, assumir `permitirEstoqueNegativo = false`
4. **Transações**: Operações que alteram estoque devem considerar a nova lógica

## **📊 Métricas de Sucesso**

1. **Funcionalidade**: Todos os testes passando
2. **Performance**: Queries executando em < 200ms
3. **Documentação**: API documentation atualizada e completa
4. **Compatibilidade**: Filtros existentes continuam funcionando
5. **Configuração**: Comportamento condicional funciona corretamente

---

**Data de Criação**: 09/07/2025  
**Estimativa de Implementação**: 4-6 horas  
**Complexidade**: Média-Alta (devido à lógica condicional)  
**Risco**: Baixo (mudanças são incrementais e bem testadas)