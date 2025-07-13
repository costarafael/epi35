# 📋 API Endpoints - Notas de Rascunho
## Documentação Atualizada para Frontend

### 🔧 **CORREÇÕES IMPLEMENTADAS**

✅ **Problema Resolvido**: Valores unitários não sendo salvos  
✅ **Problema Resolvido**: Impossibilidade de concluir notas rascunho  
✅ **Novo Endpoint**: Atualização independente de custos unitários  

---

## 📝 **CRIAÇÃO DE NOTAS**

### 1. Criar Nova Nota
```
POST /api/notas-movimentacao
Content-Type: application/json

{
  "tipo": "ENTRADA|SAIDA|AJUSTE",
  "descricao": "string",
  "almoxarifadoId": "number", // obrigatório para ENTRADA/SAIDA
  "responsavelId": "number" // opcional, usa usuário padrão se não informado
}

Response: 201
{
  "id": "number",
  "numeroDocumento": "string",
  "status": "RASCUNHO", // sempre criado como rascunho
  "tipo": "string",
  "descricao": "string",
  // ... outros campos
}
```

### 2. Buscar Usuário Padrão (se necessário)
```
GET /api/usuarios?limit=1

Response: 200
{
  "data": [
    {
      "id": "number",
      "nome": "string",
      "email": "string"
    }
  ]
}
```

---

## ✏️ **EDIÇÃO DE NOTAS**

### 3. Buscar Nota por ID
```
GET /api/notas-movimentacao/{id}

Response: 200
{
  "id": "number",
  "numeroDocumento": "string",
  "status": "RASCUNHO|CONCLUIDA|CANCELADA",
  "tipo": "string",
  "descricao": "string",
  "itens": [
    {
      "id": "number",
      "tipoEpiId": "number",
      "quantidade": "number",
      "custoUnitario": "number", // ✅ CORRIGIDO: sempre retornado
      "tipoEpi": {
        "id": "number",
        "nome": "string",
        "ca": "string"
      }
    }
  ]
}
```

### 4. Atualizar Nota
```
PUT /api/notas-movimentacao/{id}
Content-Type: application/json

{
  "descricao": "string", // opcional
  "observacoes": "string" // opcional
}

Response: 200 (nota atualizada)
```

### 5. Adicionar Item à Nota
```
POST /api/notas-movimentacao/{id}/itens
Content-Type: application/json

{
  "tipoEpiId": "number",
  "quantidade": "number",
  "custoUnitario": "number" // ✅ CORRIGIDO: persistido corretamente
}

Response: 201
{
  "id": "number",
  "tipoEpiId": "number",
  "quantidade": "number",
  "custoUnitario": "number"
}
```

### 6. Atualizar Quantidade de Item
```
PUT /api/notas-movimentacao/{notaId}/itens/{tipoEpiId}
Content-Type: application/json

{
  "quantidade": "number"
}

Response: 200 (item atualizado)
```

### 7. 🆕 **NOVO**: Atualizar Custo Unitário de Item
```
PUT /api/notas-movimentacao/{notaId}/itens/{tipoEpiId}/custo
Content-Type: application/json

{
  "custoUnitario": "number" // deve ser ≥ 0
}

Response: 200 (custo atualizado)
```

### 8. Remover Item da Nota
```
DELETE /api/notas-movimentacao/{notaId}/itens/{itemId}

Response: 204 (item removido)
```

---

## ✅ **CONCLUSÃO DE NOTAS**

### 9. Concluir Nota
```
POST /api/notas-movimentacao/{id}/concluir
Content-Type: application/json

{
  "validarEstoque": true // opcional, padrão: true
}

Response: 200
{
  "id": "number",
  "status": "CONCLUIDA", // ✅ CORRIGIDO: transição funcionando
  // ... outros campos atualizados
}
```

---

## 📋 **LISTAGEM E CONSULTAS**

### 10. Listar Notas (com filtros)
```
GET /api/notas-movimentacao?page=1&limit=10&status=RASCUNHO

Query Parameters:
- page: number (padrão: 1)
- limit: number (padrão: 10, máx: 100)
- status: RASCUNHO|CONCLUIDA|CANCELADA
- tipo: ENTRADA|SAIDA|AJUSTE
- almoxarifadoId: number
- responsavelId: number
- dataInicio: string (YYYY-MM-DD)
- dataFim: string (YYYY-MM-DD)

Response: 200
{
  "data": [/* array de notas */],
  "total": "number",
  "page": "number",
  "limit": "number",
  "totalPages": "number"
}
```

### 11. Listar Apenas Rascunhos
```
GET /api/notas-movimentacao/rascunhos

Response: 200
{
  "data": [/* array de notas com status RASCUNHO */]
}
```

---

## 🗑️ **EXCLUSÃO E CANCELAMENTO**

### 12. Excluir Nota
```
DELETE /api/notas-movimentacao/{id}

Condições:
- Apenas notas com status RASCUNHO podem ser excluídas

Response: 204 (nota excluída)
```

### 13. Cancelar Nota
```
POST /api/notas-movimentacao/{id}/cancelar
Content-Type: application/json

{
  "motivo": "string"
}

Response: 200 (nota cancelada)
```

---

## 📊 **DADOS AUXILIARES**

### 14. Buscar Usuários (para filtros)
```
GET /api/usuarios?limit=100

Response: 200
{
  "data": [
    {
      "id": "number",
      "nome": "string",
      "email": "string"
    }
  ]
}
```

### 15. Buscar Almoxarifados (para filtros)
```
GET /api/estoque/almoxarifados

Response: 200
{
  "data": [
    {
      "id": "number",
      "nome": "string",
      "descricao": "string"
    }
  ]
}
```

---

## 🔄 **FLUXO COMPLETO RECOMENDADO**

### Para Resolver os Problemas Identificados:

1. **Criar Rascunho**:
   ```
   POST /api/notas-movimentacao
   ```

2. **Adicionar Itens com Custos**:
   ```
   POST /api/notas-movimentacao/{id}/itens
   {
     "tipoEpiId": 1,
     "quantidade": 10,
     "custoUnitario": 25.50 // ✅ Agora persiste corretamente
   }
   ```

3. **Atualizar Custos Independentemente** (NOVO):
   ```
   PUT /api/notas-movimentacao/{id}/itens/{tipoEpiId}/custo
   {
     "custoUnitario": 30.00 // ✅ Atualiza apenas o custo
   }
   ```

4. **Verificar Persistência**:
   ```
   GET /api/notas-movimentacao/{id}
   // ✅ Todos os custos unitários são retornados
   ```

5. **Concluir Nota**:
   ```
   POST /api/notas-movimentacao/{id}/concluir
   {
     "validarEstoque": true
   }
   // ✅ Transição RASCUNHO → CONCLUIDA funcionando
   ```

---

## 🚨 **TRATAMENTO DE ERROS**

### Códigos de Status HTTP:
- **200**: Operação bem-sucedida
- **201**: Recurso criado
- **204**: Operação bem-sucedida sem conteúdo
- **400**: Dados inválidos ou violação de regra de negócio
- **404**: Recurso não encontrado
- **422**: Entidade não processável (validação)
- **500**: Erro interno do servidor

### Formato de Erro:
```json
{
  "message": "string",
  "error": "string",
  "statusCode": "number",
  "details": {
    // detalhes específicos do erro de validação
  }
}
```

---

## 🎯 **MELHORIAS IMPLEMENTADAS**

### ✅ Correções Aplicadas:
1. **custoUnitario persistindo corretamente** em todos os endpoints
2. **Novo endpoint específico** para atualização de custos unitários
3. **Conversão adequada para Decimal** garantindo precisão monetária
4. **Validação aprimorada** para valores não-negativos
5. **Melhoria na conclusão de notas** RASCUNHO → CONCLUIDA

### 🔧 Recomendações para Frontend:
1. **Use o novo endpoint de custo** para updates independentes
2. **Implemente auto-save** em mudanças de campos críticos
3. **Valide custos unitários** como números não-negativos
4. **Trate erros 400/422** adequadamente na UI
5. **Teste o fluxo completo** de criação → edição → conclusão

---

## 📞 **SUPORTE**

Em caso de dúvidas sobre a implementação dos endpoints, consulte:
- Logs do servidor para debugging
- Validation Report gerado pelo sistema
- Testes de integração disponíveis

**Status**: ✅ **PRODUÇÃO READY** - Todos os problemas identificados foram resolvidos.