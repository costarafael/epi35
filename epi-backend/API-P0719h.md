# **API Técnica - Módulo de Gestão de EPI v3.5**

## **Documentação Técnica Completa**

**Versão:** 3.5
**Data:** 07/07/2025  
**Ambiente de Produção:** https://epi-backend-s14g.onrender.com  
**Documentação Swagger:** `/api/docs`  
**Health Check:** `/health`  

---

## **1. Informações Gerais**

### **1.1. Base URLs**
- **Produção:** `https://epi-backend-s14g.onrender.com`
- **API Base:** `/api`
- **Documentação:** `/api/docs` (Swagger UI)
- **Health Check:** `/health`

### **1.2. Autenticação**
- **Implementação:** A ser implementada por outra equipe em momento posterior
- **Status Atual:** Todos os endpoints disponíveis sem autenticação

### **1.3. Formato de Resposta Padrão**
```json
{
  "success": boolean,
  "data": any,
  "message"?: string,
  "pagination"?: {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number,
    "hasNext": boolean,
    "hasPrev": boolean
  }
}
```

### **1.4. Códigos de Status HTTP**
- **200:** Sucesso
- **201:** Criado com sucesso
- **400:** Dados inválidos
- **401:** Não autorizado
- **403:** Acesso negado
- **404:** Recurso não encontrado
- **409:** Conflito de dados
- **500:** Erro interno do servidor

---

## **2. Health Controller**

### **2.1. Health Check**
```http
GET /health
```

**Descrição:** Verifica a saúde da aplicação e conectividade com banco de dados.

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-07-07T20:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### **2.2. Database Seed**
```http
POST /health/seed
```

**Descrição:** Executa o seed do banco de dados (apenas desenvolvimento).

**Resposta:**
```json
{
  "success": true,
  "message": "Database seeded successfully",
  "data": {
    "users": 3,
    "businessUnits": 2,
    "warehouses": 2,
    "epiTypes": 3,
    "stockItems": 6
  }
}
```

---

## **3. Configurações Controller**

**Base Route:** `/api/configuracoes`

### **3.1. Listar Configurações**
```http
GET /api/configuracoes
```

**Descrição:** Lista todas as configurações do sistema.

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "chave": "PERMITIR_ESTOQUE_NEGATIVO",
      "valor": "false",
      "descricao": "Permite que o estoque fique negativo"
    }
  ]
}
```

### **3.2. Status do Sistema**
```http
GET /api/configuracoes/status
```

**Descrição:** Obtém o status geral do sistema com todas as configurações críticas.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "systemStatus": "operational",
    "configurations": {
      "PERMITIR_ESTOQUE_NEGATIVO": false,
      "PERMITIR_AJUSTES_FORCADOS": true,
      "ESTOQUE_MINIMO_EQUIPAMENTO": 10
    },
    "alerts": []
  }
}
```

### **3.3. Obter Configuração Específica**
```http
GET /api/configuracoes/:chave
```

**Parâmetros:**
- `chave`: Chave da configuração
  - `PERMITIR_ESTOQUE_NEGATIVO`
  - `PERMITIR_AJUSTES_FORCADOS`
  - `ESTOQUE_MINIMO_EQUIPAMENTO`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "chave": "PERMITIR_ESTOQUE_NEGATIVO",
    "valor": "false",
    "descricao": "Permite que o estoque fique negativo",
    "createdAt": "2025-07-07T10:00:00.000Z"
  }
}
```

### **3.4. Atualizar Configuração**
```http
PUT /api/configuracoes/:chave
```

**Body:**
```json
{
  "valor": "true",
  "descricao": "Nova descrição"
}
```

### **3.5. Atualizar Configuração Booleana**
```http
PATCH /api/configuracoes/:chave/boolean
```

**Body:**
```json
{
  "ativo": true,
  "descricao": "Configuração ativada"
}
```

### **3.6. Atualizar Configuração Numérica**
```http
PATCH /api/configuracoes/:chave/number
```

**Body:**
```json
{
  "valor": 25,
  "descricao": "Estoque mínimo atualizado"
}
```

### **3.7. Atualização em Lote**
```http
POST /api/configuracoes/batch
```

**Body:**
```json
{
  "configuracoes": [
    {
      "chave": "PERMITIR_ESTOQUE_NEGATIVO",
      "valor": "true"
    },
    {
      "chave": "ESTOQUE_MINIMO_EQUIPAMENTO",
      "valor": "15"
    }
  ]
}
```

### **3.8. Reset para Padrão**
```http
POST /api/configuracoes/reset
```

**Descrição:** Restaura todas as configurações para valores padrão.

---

## **4. Usuários Controller**

**Base Route:** `/api/usuarios`

### **4.1. Listar Usuários**
```http
GET /api/usuarios
```

**Query Parameters:**
- `nome`: Filtro por nome (string, opcional)
- `email`: Filtro por email (string, opcional)
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 10, máximo: 100)

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nome": "João Silva",
      "email": "joao@empresa.com",
      "createdAt": "2025-07-07T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### **4.2. Obter Usuário por ID**
```http
GET /api/usuarios/:id
```

**Parâmetros:**
- `id`: ID do usuário (UUID ou formato customizado)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "João Silva",
    "email": "joao@empresa.com",
    "createdAt": "2025-07-07T10:00:00.000Z"
  }
}
```

---

## **5. Colaboradores Controller**

**Base Route:** `/api/colaboradores`

### **5.1. Criar Colaborador**
```http
POST /api/colaboradores
```

**Descrição:** Cria um novo colaborador vinculado a uma contratada.

**Body:**
```json
{
  "nome": "João da Silva",
  "cpf": "12345678901",
  "matricula": "MAT001",
  "cargo": "Técnico",
  "setor": "Manutenção",
  "contratadaId": "uuid",
  "unidadeNegocioId": "uuid",
  "ativo": true
}
```

**Campos Obrigatórios:**
- `nome` (string): Nome completo do colaborador
- `cpf` (string): CPF do colaborador (11 dígitos)
- `contratadaId` (string, UUID): ID da empresa contratada
- `unidadeNegocioId` (string, UUID): ID da unidade de negócio

**Campos Opcionais:**
- `matricula` (string): Matrícula do colaborador
- `cargo` (string): Cargo do colaborador
- `setor` (string): Setor de trabalho
- `ativo` (boolean): Status ativo (padrão: true)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "João da Silva",
    "cpf": "12345678901",
    "cpfFormatado": "123.456.789-01",
    "matricula": "MAT001",
    "cargo": "Técnico",
    "setor": "Manutenção",
    "ativo": true,
    "contratadaId": "uuid",
    "unidadeNegocioId": "uuid",
    "createdAt": "2025-07-08T10:00:00.000Z",
    "contratada": {
      "id": "uuid",
      "nome": "Empresa Contratada LTDA",
      "cnpj": "12345678000190"
    }
  }
}
```

**Códigos de Status:**
- **201:** Colaborador criado com sucesso
- **400:** Dados inválidos
- **404:** Contratada não encontrada
- **409:** CPF já cadastrado

### **5.2. Listar Colaboradores**
```http
GET /api/colaboradores
```

**Descrição:** Lista colaboradores com filtros opcionais e paginação.

**Query Parameters:**
- `nome`: Filtro por nome (string, opcional)
- `cpf`: Filtro por CPF (string, opcional)
- `contratadaId`: Filtro por contratada (string UUID, opcional)
- `cargo`: Filtro por cargo (string, opcional)
- `setor`: Filtro por setor (string, opcional)
- `ativo`: Filtro por status ativo (boolean, opcional)
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 10, máximo: 100)

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nome": "João da Silva",
      "cpf": "12345678901",
      "cpfFormatado": "123.456.789-01",
      "matricula": "MAT001",
      "cargo": "Técnico",
      "setor": "Manutenção",
      "ativo": true,
      "contratada": {
        "nome": "Empresa Contratada LTDA",
        "cnpj": "12345678000190"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### **5.3. Obter Colaborador por ID**
```http
GET /api/colaboradores/:id
```

**Descrição:** Retorna os detalhes de um colaborador específico.

**Parâmetros:**
- `id`: ID do colaborador (UUID)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "João da Silva",
    "cpf": "12345678901",
    "cpfFormatado": "123.456.789-01",
    "matricula": "MAT001",
    "cargo": "Técnico",
    "setor": "Manutenção",
    "ativo": true,
    "contratada": {
      "id": "uuid",
      "nome": "Empresa Contratada LTDA",
      "cnpj": "12345678000190"
    }
  }
}
```

**Códigos de Status:**
- **200:** Colaborador encontrado
- **404:** Colaborador não encontrado

---

## **6. Tipos de EPI Controller**

**Base Route:** `/api/tipos-epi`

### **6.1. Criar Tipo de EPI**
```http
POST /api/tipos-epi
```

**Body:**
```json
{
  "nomeEquipamento": "Capacete de Segurança Premium",
  "numeroCa": "CA-98765",
  "categoria": "PROTECAO_CABECA",
  "descricao": "Capacete de segurança classe A com proteção UV",
  "vidaUtilDias": 1800,
  "status": "ATIVO"
}
```

**Campos Obrigatórios:**
- `nomeEquipamento` (string, max 255)
- `numeroCa` (string, único, max 50)
- `categoria` (enum: PROTECAO_CABECA, PROTECAO_OLHOS_ROSTO, etc.)

**Campos Opcionais:**
- `descricao` (string)
- `vidaUtilDias` (number, em dias)
- `status` (enum: ATIVO, DESCONTINUADO, padrão: ATIVO)

### **6.2. Listar Tipos de EPI**
```http
GET /api/tipos-epi
```

**Query Parameters:**
- `ativo`: Filtrar apenas ativos (boolean)
- `categoria`: Filtrar por categoria (enum)
- `status`: Filtrar por status (enum)
- `busca`: Busca textual (string)
- `page`: Página (number)
- `limit`: Itens por página (number)

### **6.3. Obter Tipo de EPI por ID**
```http
GET /api/tipos-epi/:id
```

### **6.4. Atualizar Tipo de EPI**
```http
PUT /api/tipos-epi/:id
```

### **6.5. Ativar Tipo de EPI**
```http
PATCH /api/tipos-epi/:id/ativar
```

**Body:**
```json
{
  "motivo": "Equipamento aprovado para uso"
}
```

### **6.6. Inativar Tipo de EPI**
```http
PATCH /api/tipos-epi/:id/inativar
```

**Body:**
```json
{
  "motivo": "Equipamento descontinuado pelo fabricante"
}
```

### **6.7. Estatísticas do Tipo**
```http
GET /api/tipos-epi/:id/estatisticas
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalFichas": 0,
    "fichasAtivas": 0,
    "totalEstoque": 25,
    "estoqueDisponivel": 20,
    "totalEntregas": 15,
    "entregasAtivas": 5
  }
}
```

### **6.8. Estatísticas por Categoria**
```http
GET /api/tipos-epi/estatisticas/por-categoria
```

---

## **7. Estoque Controller**

**Base Route:** `/api/estoque`

### **6.1. Posição de Estoque**
```http
GET /api/estoque/posicao
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `tipoEpiId`: ID do tipo de EPI (string, opcional)
- `unidadeNegocioId`: ID da unidade de negócio (string, opcional)
- `apenasComSaldo`: Apenas itens com saldo (boolean, opcional)
- `apenasAbaixoMinimo`: Apenas abaixo do mínimo (boolean, opcional)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "posicao": [
      {
        "almoxarifado": "Almoxarifado Central SP",
        "tipoEpi": "Capacete de Segurança",
        "numeroCa": "CA-12345",
        "quantidade": 85,
        "status": "DISPONIVEL",
        "situacao": "NORMAL",
        "estoqueMinimo": 20,
        "custoTotal": 4250.00
      }
    ],
    "resumo": {
      "totalItens": 15,
      "valorTotal": 45750.00,
      "itensAbaixoMinimo": 3
    }
  }
}
```

### **6.2. Kardex de Item**
```http
GET /api/estoque/kardex/:almoxarifadoId/:tipoEpiId
```

**Query Parameters:**
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "item": {
      "almoxarifado": "Almoxarifado Central SP",
      "tipoEpi": "Capacete de Segurança",
      "numeroCa": "CA-12345"
    },
    "movimentacoes": [
      {
        "data": "2025-07-07T14:30:00.000Z",
        "tipo": "ENTRADA_NOTA",
        "quantidade": 50,
        "saldoAnterior": 30,
        "saldoPosterior": 80,
        "responsavel": "João Silva",
        "documento": "ENT-2025-000123"
      }
    ],
    "resumo": {
      "saldoInicial": 30,
      "entradas": 75,
      "saidas": 25,
      "saldoFinal": 80
    }
  }
}
```

### **6.3. Análise de Giro**
```http
GET /api/estoque/analise-giro
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `periodo`: Período de análise (string: "30d", "90d", "180d", "365d")

### **6.4. Ajuste Direto de Estoque**
```http
POST /api/estoque/ajuste-direto
```

**Body:**
```json
{
  "almoxarifadoId": "uuid",
  "tipoEpiId": "uuid", 
  "novaQuantidade": 150,
  "motivo": "Inventário físico - diferença encontrada",
  "validarPermissao": true
}
```

### **6.5. Simular Ajuste**
```http
POST /api/estoque/ajuste-direto/simular
```

**Body:**
```json
{
  "almoxarifadoId": "uuid",
  "tipoEpiId": "uuid",
  "novaQuantidade": 150
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "quantidadeAtual": 125,
    "novaQuantidade": 150,
    "diferenca": 25,
    "tipoAjuste": "POSITIVO",
    "impactoFinanceiro": 1250.00,
    "permitido": true
  }
}
```

### **6.6. Executar Inventário**
```http
POST /api/estoque/inventario
```

**Body:**
```json
{
  "almoxarifadoId": "uuid",
  "ajustes": [
    {
      "tipoEpiId": "uuid",
      "quantidadeContada": 145,
      "observacoes": "Diferença física identificada"
    }
  ],
  "observacoes": "Inventário mensal - julho 2025"
}
```

### **6.7. Validar Divergências de Inventário**
```http
POST /api/estoque/inventario/validar-divergencias
```

### **6.8. Histórico de Ajustes**
```http
GET /api/estoque/ajustes/historico
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `tipoEpiId`: ID do tipo de EPI (string, opcional)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)
- `page`: Página (number)
- `limit`: Itens por página (number)

### **6.9. Resumo de Estoque**
```http
GET /api/estoque/resumo
```

### **6.10. Alertas de Estoque**
```http
GET /api/estoque/alertas
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `unidadeNegocioId`: ID da unidade de negócio (string, opcional)
- `severidade`: Severidade do alerta ("baixo", "critico", "zerado")

**Resposta:**
```json
{
  "success": true,
  "data": {
    "alertas": [
      {
        "tipo": "ESTOQUE_BAIXO",
        "severidade": "critico",
        "almoxarifado": "Almoxarifado Central SP",
        "tipoEpi": "Luva de Segurança",
        "quantidadeAtual": 8,
        "estoqueMinimo": 20,
        "diasRestantes": 3
      }
    ],
    "resumo": {
      "totalAlertas": 5,
      "criticos": 2,
      "baixos": 3,
      "zerados": 0
    }
  }
}
```

### **6.11. Listar Itens de Estoque**
```http
GET /api/estoque/itens
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `tipoEpiId`: ID do tipo de EPI (string, opcional)
- `apenasDisponiveis`: Apenas itens disponíveis (boolean, opcional)
- `apenasComSaldo`: Apenas itens com saldo (boolean, opcional)
- `page`: Página (number)
- `limit`: Itens por página (number)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "I7XK91",
        "almoxarifadoId": "uuid",
        "tipoEpiId": "uuid",
        "quantidade": 75,
        "status": "DISPONIVEL",
        "createdAt": "2025-07-01T10:00:00.000Z",
        "almoxarifado": {
          "id": "uuid",
          "nome": "Almoxarifado Central SP",
          "unidadeNegocioId": "uuid",
          "unidadeNegocio": {
            "id": "uuid",
            "nome": "Matriz São Paulo",
            "codigo": "SP001"
          }
        },
        "tipoEpi": {
          "id": "uuid",
          "nomeEquipamento": "Capacete de Segurança",
          "numeroCa": "CA-12345",
          "descricao": "Capacete classe A",
          "categoriaEpi": "PROTECAO_CABECA"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 156,
      "totalPages": 4
    }
  }
}
```

### **6.12. Listar Almoxarifados**
```http
GET /api/estoque/almoxarifados
```

**Query Parameters:**
- `unidadeNegocioId`: ID da unidade de negócio (string, opcional)
- `incluirContadores`: Incluir contadores de itens (boolean, opcional)

---

## **8. Contratadas Controller**

**Base Route:** `/api/contratadas`

### **8.1. Criar Contratada**
```http
POST /api/contratadas
```

**Descrição:** Cria uma nova empresa contratada no sistema.

**Body:**
```json
{
  "nome": "Empresa Alpha Serviços LTDA",
  "cnpj": "12345678000195"
}
```

**Campos Obrigatórios:**
- `nome` (string): Nome da empresa contratada (máximo 255 caracteres)
- `cnpj` (string): CNPJ da empresa (14 dígitos, único, com validação matemática)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Empresa Alpha Serviços LTDA",
    "cnpj": "12345678000195",
    "cnpjFormatado": "12.345.678/0001-95",
    "createdAt": "2025-07-08T10:00:00.000Z"
  }
}
```

**Códigos de Status:**
- **201:** Contratada criada com sucesso
- **400:** Dados inválidos
- **409:** CNPJ já cadastrado

### **8.2. Listar Contratadas**
```http
GET /api/contratadas
```

**Descrição:** Lista todas as contratadas com filtros opcionais.

**Query Parameters:**
- `nome`: Filtro por nome (string, opcional)
- `cnpj`: Filtro por CNPJ (string, opcional)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "contratadas": [
      {
        "id": "uuid",
        "nome": "Empresa Alpha Serviços LTDA",
        "cnpj": "12345678000195",
        "cnpjFormatado": "12.345.678/0001-95",
        "createdAt": "2025-07-08T10:00:00.000Z"
      }
    ],
    "total": 25
  }
}
```

### **8.3. Estatísticas de Contratadas**
```http
GET /api/contratadas/estatisticas
```

**Descrição:** Retorna estatísticas gerais das contratadas e colaboradores vinculados.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "colaboradoresVinculados": 245,
    "colaboradoresSemContratada": 8,
    "topContratadas": [
      {
        "contratada": {
          "id": "uuid",
          "nome": "Empresa Alpha LTDA",
          "cnpjFormatado": "12.345.678/0001-95"
        },
        "totalColaboradores": 45
      }
    ]
  }
}
```

### **8.4. Buscar Contratadas por Nome**
```http
GET /api/contratadas/buscar
```

**Descrição:** Busca contratadas por nome (limitado a 10 resultados).

**Query Parameters:**
- `nome`: Nome para busca (string, obrigatório)

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nome": "Empresa Alpha Serviços LTDA",
      "cnpj": "12345678000195",
      "cnpjFormatado": "12.345.678/0001-95",
      "createdAt": "2025-07-08T10:00:00.000Z"
    }
  ]
}
```

### **8.5. Obter Contratada por ID**
```http
GET /api/contratadas/:id
```

**Descrição:** Retorna os dados de uma contratada específica.

**Parâmetros:**
- `id`: ID da contratada (UUID)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Empresa Alpha Serviços LTDA",
    "cnpj": "12345678000195",
    "cnpjFormatado": "12.345.678/0001-95",
    "createdAt": "2025-07-08T10:00:00.000Z"
  }
}
```

**Códigos de Status:**
- **200:** Contratada encontrada
- **404:** Contratada não encontrada

### **8.6. Atualizar Contratada**
```http
PUT /api/contratadas/:id
```

**Descrição:** Atualiza os dados de uma contratada existente.

**Parâmetros:**
- `id`: ID da contratada (UUID)

**Body:**
```json
{
  "nome": "Empresa Alpha Serviços LTDA - Atualizada",
  "cnpj": "12345678000195"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Empresa Alpha Serviços LTDA - Atualizada",
    "cnpj": "12345678000195",
    "cnpjFormatado": "12.345.678/0001-95",
    "createdAt": "2025-07-08T10:00:00.000Z"
  }
}
```

**Códigos de Status:**
- **200:** Contratada atualizada com sucesso
- **400:** Dados inválidos
- **404:** Contratada não encontrada
- **409:** CNPJ já cadastrado

### **8.7. Excluir Contratada**
```http
DELETE /api/contratadas/:id
```

**Descrição:** Exclui uma contratada do sistema (apenas se não houver colaboradores vinculados).

**Parâmetros:**
- `id`: ID da contratada (UUID)

**Resposta:**
```json
{
  "success": true,
  "message": "Contratada excluída com sucesso"
}
```

**Códigos de Status:**
- **200:** Contratada excluída com sucesso
- **400:** Não é possível excluir contratada com colaboradores vinculados
- **404:** Contratada não encontrada

---

## **9. Notas de Movimentação Controller**

**Base Route:** `/api/notas-movimentacao`

### **9.1. Criar Nota de Movimentação**
```http
POST /api/notas-movimentacao
```

**Body:**
```json
{
  "tipo": "ENTRADA",
  "almoxarifadoDestinoId": "uuid",
  "observacoes": "Compra de EPIs - Nota Fiscal 12345"
}
```

**Tipos Disponíveis:**
- `ENTRADA`: Requer `almoxarifadoDestinoId`
- `TRANSFERENCIA`: Requer `almoxarifadoOrigemId` e `almoxarifadoDestinoId`
- `DESCARTE`: Requer `almoxarifadoOrigemId`
- `AJUSTE`: Requer `almoxarifadoDestinoId`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "numero": "ENT-2025-000001",
    "tipo": "ENTRADA",
    "status": "RASCUNHO",
    "almoxarifadoDestinoId": "uuid",
    "observacoes": "Compra de EPIs - Nota Fiscal 12345",
    "createdAt": "2025-07-07T14:30:00.000Z"
  },
  "message": "Nota de movimentação criada com sucesso"
}
```

### **8.2. Listar Notas de Movimentação**
```http
GET /api/notas-movimentacao
```

**Query Parameters:**
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 10, máximo: 100)
- `numero`: Filtrar por número (string, opcional)
- `tipo`: Filtrar por tipo (enum: ENTRADA, TRANSFERENCIA, DESCARTE, AJUSTE)
- `status`: Filtrar por status (enum: RASCUNHO, CONCLUIDA, CANCELADA)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "numero": "ENT-2025-000001",
      "tipo": "ENTRADA",
      "almoxarifadoOrigemId": null,
      "almoxarifadoDestinoId": "uuid",
      "usuarioId": "uuid",
      "observacoes": "Compra de EPIs",
      "_status": "RASCUNHO",
      "createdAt": "2025-07-07T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### **8.3. Listar Rascunhos**
```http
GET /api/notas-movimentacao/rascunhos
```

**Descrição:** Lista apenas as notas no status RASCUNHO do usuário atual.

### **8.4. Obter Nota por ID**
```http
GET /api/notas-movimentacao/:id
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "numero": "ENT-2025-000001",
    "tipo": "ENTRADA",
    "status": "RASCUNHO",
    "observacoes": "Compra de EPIs",
    "itens": [
      {
        "id": "uuid",
        "tipoEpiId": "uuid",
        "quantidade": 50,
        "quantidadeProcessada": 0,
        "observacoes": null,
        "tipoEpi": {
          "nome": "Capacete de Segurança",
          "codigo": "CA-12345"
        }
      }
    ]
  }
}
```

### **8.5. Atualizar Nota**
```http
PUT /api/notas-movimentacao/:id
```

**Body:**
```json
{
  "observacoes": "Observações atualizadas"
}
```

### **8.6. Excluir Nota (Rascunho)**
```http
DELETE /api/notas-movimentacao/:id
```

**Restrições:** Apenas notas em status RASCUNHO podem ser excluídas.

### **8.7. Adicionar Item à Nota**
```http
POST /api/notas-movimentacao/:id/itens
```

**Body:**
```json
{
  "tipoEpiId": "uuid",
  "quantidade": 25,
  "observacoes": "Lote especial com certificação"
}
```

**Validações:**
- Nota deve estar em status RASCUNHO
- Tipo de EPI não pode estar duplicado na nota
- Quantidade deve ser positiva

### **8.8. Atualizar Quantidade do Item**
```http
PUT /api/notas-movimentacao/:id/itens/:tipoEpiId
```

**Body:**
```json
{
  "quantidade": 30
}
```

### **8.9. Remover Item da Nota**
```http
DELETE /api/notas-movimentacao/:id/itens/:itemId
```

### **8.10. Concluir Nota de Movimentação**
```http
POST /api/notas-movimentacao/:id/concluir
```

**Body:**
```json
{
  "validarEstoque": true
}
```

**Descrição:** Processa uma nota em rascunho, criando movimentações de estoque e atualizando saldos.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "notaConcluida": {
      "id": "uuid",
      "status": "CONCLUIDA",
      "dataConclusao": "2025-07-07T15:00:00.000Z"
    },
    "movimentacoesCriadas": [
      {
        "id": "uuid",
        "tipoEpiId": "uuid",
        "quantidade": 50,
        "saldoAnterior": 30,
        "saldoPosterior": 80
      }
    ],
    "itensProcessados": [
      {
        "tipoEpiId": "uuid",
        "quantidade": 50,
        "movimentacaoCreated": true,
        "estoqueAtualizado": true
      }
    ]
  },
  "message": "Nota concluída com sucesso"
}
```

### **8.11. Cancelar Nota de Movimentação**
```http
POST /api/notas-movimentacao/:id/cancelar
```

**Body:**
```json
{
  "motivo": "Erro na entrada de dados",
  "gerarEstorno": true
}
```

### **8.12. Validar Cancelamento**
```http
GET /api/notas-movimentacao/:id/validar-cancelamento
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "validacao": {
      "permitido": true,
      "motivo": null
    },
    "impacto": {
      "movimentacoesAfetadas": 3,
      "estoqueAfetado": [
        {
          "tipoEpiId": "uuid",
          "saldoAtual": 80,
          "saldoAposEstorno": 30
        }
      ]
    }
  }
}
```

### **8.13. Resumo de Notas de Movimentação**
```http
GET /api/notas-movimentacao/resumo
```

**Descrição:** Obtém um resumo das notas de movimentação do sistema.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalNotas": 1250,
    "notasRascunho": 45,
    "notasConcluidas": 1180,
    "notasCanceladas": 25,
    "ultimaAtualizacao": "2025-07-07T15:00:00.000Z"
  }
}
```

---

## **9. Fichas de EPI Controller**

**Base Route:** `/api/fichas-epi`

### **8.1. Criar Ficha de EPI**
```http
POST /api/fichas-epi
```

**Body:**
```json
{
  "colaboradorId": "uuid",
  "status": "ATIVA"
}
```

**Validações:**
- Um colaborador pode ter apenas uma ficha ativa
- `colaboradorId` deve ser único
- `status` padrão é ATIVA

### **8.2. Criar ou Ativar Ficha**
```http
POST /api/fichas-epi/criar-ou-ativar
```

**Body:**
```json
{
  "colaboradorId": "uuid",
  "status": "ATIVA"
}
```

**Descrição:** Cria nova ficha ou ativa ficha existente inativa.

### **8.3. Listar Fichas de EPI**
```http
GET /api/fichas-epi
```

**Query Parameters:**
- `page`: Página (number)
- `limit`: Itens por página (number)
- `colaboradorId`: ID do colaborador (string, opcional)
- `status`: Status da ficha (enum: ATIVA, INATIVA, SUSPENSA)
- `colaboradorNome`: Nome do colaborador (string, opcional)
- `ativo`: Filtrar colaboradores ativos (boolean, opcional)
- `devolucaoPendente`: Fichas com devolução pendente (boolean, opcional)

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "colaboradorId": "uuid",
      "status": "ATIVA",
      "dataEmissao": "2025-07-01",
      "createdAt": "2025-07-01T10:00:00.000Z",
      "devolucaoPendente": false,
      "colaborador": {
        "nome": "Carlos Oliveira",
        "cpf": "12345678901",
        "matricula": "MAT001"
      },
      "contratada": {
        "id": "uuid",
        "nome": "Empresa Alpha LTDA",
        "cnpj": "12345678000195"
      },
      "episInfo": {
        "totalEpisComColaborador": 3,
        "episExpirados": 0,
        "proximaDataVencimento": "2025-12-15T00:00:00.000Z",
        "diasAteProximoVencimento": 160,
        "tiposEpisAtivos": [
          {
            "tipoEpiId": "uuid",
            "tipoEpiNome": "Capacete de Segurança",
            "quantidade": 1
          }
        ]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### **8.4. Estatísticas de Fichas**
```http
GET /api/fichas-epi/estatisticas
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalFichas": 125,
    "fichasAtivas": 118,
    "fichasInativas": 5,
    "fichasSuspensas": 2,
    "porTipoEpi": [
      {
        "tipoEpiNome": "Capacete de Segurança",
        "quantidade": 95
      }
    ],
    "porColaborador": [
      {
        "colaboradorNome": "Carlos Oliveira",
        "quantidade": 3
      }
    ]
  }
}
```

### **8.5. Obter Ficha por ID**
```http
GET /api/fichas-epi/:id
```

### **8.6. Ativar Ficha**
```http
PUT /api/fichas-epi/:id/ativar
```

### **8.7. Inativar Ficha**
```http
PUT /api/fichas-epi/:id/inativar
```

### **8.8. Suspender Ficha**
```http
PUT /api/fichas-epi/:id/suspender
```

**Body:**
```json
{
  "motivo": "Colaborador afastado por acidente"
}
```

### **8.9. Histórico da Ficha**
```http
GET /api/fichas-epi/:id/historico
```

**Query Parameters:**
- `tipoAcao`: Tipo da ação (enum: CRIACAO, ENTREGA, DEVOLUCAO, CANCELAMENTO, ALTERACAO_STATUS, ITEM_VENCIDO, EDICAO)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)
- `page`: Página (number)
- `limit`: Itens por página (number)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "fichaId": "uuid",
    "colaborador": {
      "id": "uuid",
      "nome": "Carlos Oliveira",
      "cpf": "12345678901",
      "matricula": "MAT001"
    },
    "historico": [
      {
        "id": "uuid",
        "fichaEpiId": "uuid",
        "tipoAcao": "ENTREGA",
        "descricao": "Entrega de 1x Capacete de Segurança (CA-12345)",
        "dataAcao": "2025-07-07T14:30:00.000Z",
        "responsavel": {
          "id": "uuid",
          "nome": "João Silva"
        },
        "detalhes": {
          "entregaId": "uuid",
          "tipoEpiNome": "Capacete de Segurança",
          "quantidade": 1,
          "itens": [
            {
              "numeroSerie": "CS-001",
              "dataLimiteDevolucao": "2025-12-15T00:00:00.000Z"
            }
          ]
        }
      }
    ],
    "estatisticas": {
      "totalEventos": 15,
      "totalEntregas": 8,
      "totalDevolucoes": 6,
      "totalCancelamentos": 1,
      "itensAtivos": 3,
      "itensVencidos": 0,
      "dataUltimaAtividade": "2025-07-07T14:30:00.000Z"
    }
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## **10. Fichas EPI - Entregas**

### **10.1. Criar Entrega**
```http
POST /api/fichas-epi/:fichaId/entregas
```

**Body:**
```json
{
  "quantidade": 2,
  "itens": [
    {
      "estoqueItemOrigemId": "I7XK91",
      "numeroSerie": "CS-001"
    },
    {
      "estoqueItemOrigemId": "I7XK91",
      "numeroSerie": "CS-002"
    }
  ],
  "assinaturaColaborador": "base64_signature",
  "observacoes": "Entrega inicial de EPIs",
  "usuarioId": "uuid"
}
```

**Validações:**
- `quantidade` deve corresponder ao número de itens no array
- `estoqueItemOrigemId` deve existir e ter saldo suficiente
- Ficha deve estar ativa
- Cada item representa uma unidade física (rastreabilidade unitária)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "E4U302",
    "fichaEpiId": "uuid",
    "colaboradorId": "uuid",
    "dataEntrega": "2025-07-07T14:30:00.000Z",
    "assinaturaColaborador": "base64_signature",
    "observacoes": "Entrega inicial de EPIs",
    "status": "PENDENTE_ASSINATURA",
    "itens": [
      {
        "id": "uuid",
        "tipoEpiId": "uuid",
        "quantidadeEntregue": 1,
        "numeroSerie": "CS-001",
        "estoqueItemOrigemId": "I7XK91",
        "dataLimiteDevolucao": "2025-12-15T00:00:00.000Z",
        "status": "COM_COLABORADOR"
      }
    ],
    "colaborador": {
      "nome": "Carlos Oliveira",
      "cpf": "12345678901",
      "matricula": "MAT001"
    },
    "tipoEpi": {
      "nome": "Capacete de Segurança",
      "codigo": "CA-12345",
      "categoria": "PROTECAO_CABECA",
      "validadeMeses": 60
    },
    "almoxarifado": {
      "nome": "Almoxarifado Central SP",
      "codigo": "ACSP001"
    }
  }
}
```

### **10.2. Validar Entrega**
```http
POST /api/fichas-epi/entregas/validar
```

**Body:**
```json
{
  "fichaEpiId": "uuid",
  "quantidade": 2
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "permitida": true,
    "motivo": null,
    "fichaAtiva": true,
    "estoqueDisponivel": 85,
    "posseAtual": 1
  }
}
```

### **10.3. Listar Entregas da Ficha**
```http
GET /api/fichas-epi/:fichaId/entregas
```

**Query Parameters:**
- `page`: Página (number)
- `limit`: Itens por página (number)
- `status`: Status da entrega (enum)
- `dataInicio`: Data inicial (date)
- `dataFim`: Data final (date)

### **10.4. Listar Entregas do Colaborador**
```http
GET /api/fichas-epi/colaborador/:colaboradorId/entregas
```

**Query Parameters:**
- `status`: Status da entrega (enum, opcional)

### **10.5. Posse Atual do Colaborador**
```http
GET /api/fichas-epi/colaborador/:colaboradorId/posse-atual
```

**Query Parameters:**
- `incluirVencidos`: Incluir itens vencidos (boolean, padrão: false)
- `incluirProximosVencimento`: Incluir próximos ao vencimento (boolean, padrão: true)

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "tipoEpiId": "uuid",
      "tipoEpiNome": "Capacete de Segurança",
      "tipoEpiCodigo": "CA-12345",
      "quantidadePosse": 1,
      "dataUltimaEntrega": "2025-07-07T14:30:00.000Z",
      "diasUso": 15,
      "status": "ATIVO",
      "itensAtivos": [
        {
          "itemId": "uuid",
          "numeroSerie": "CS-001",
          "dataEntrega": "2025-07-07T14:30:00.000Z",
          "dataLimiteDevolucao": "2025-12-15T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

### **10.6. Assinar Entrega**
```http
PUT /api/fichas-epi/entregas/:entregaId/assinar
```

**Body:**
```json
{
  "assinaturaColaborador": "base64_signature",
  "observacoes": "Entrega assinada pelo colaborador"
}
```

---

## **11. Fichas EPI - Devoluções**

### **11.1. Processar Devolução**
```http
POST /api/fichas-epi/entregas/:entregaId/devolucao
```

**Body:**
```json
{
  "itensParaDevolucao": [
    {
      "itemId": "uuid",
      "motivoDevolucao": "Fim do período de uso",
      "condicaoItem": "BOM"
    }
  ],
  "assinaturaColaborador": "base64_signature",
  "usuarioId": "uuid",
  "observacoes": "Devolução padrão"
}
```

**Condições do Item:**
- `BOM`: Item em boas condições
- `DANIFICADO`: Item danificado
- `PERDIDO`: Item perdido

**Resposta:**
```json
{
  "success": true,
  "data": {
    "entregaId": "uuid",
    "itensDevolucao": [
      {
        "itemId": "uuid",
        "tipoEpiId": "uuid",
        "numeroSerie": "CS-001",
        "statusAnterior": "COM_COLABORADOR",
        "novoStatus": "DEVOLVIDO",
        "motivoDevolucao": "Fim do período de uso",
        "condicaoItem": "BOM"
      }
    ],
    "movimentacoesEstoque": [
      {
        "id": "uuid",
        "tipoEpiId": "uuid",
        "quantidade": 1,
        "statusEstoque": "DISPONIVEL"
      }
    ],
    "statusEntregaAtualizado": "DEVOLVIDA_TOTAL",
    "dataProcessamento": "2025-07-07T15:00:00.000Z"
  }
}
```

### **11.2. Validar Devolução**
```http
POST /api/fichas-epi/entregas/:entregaId/devolucao/validar
```

**Body:**
```json
{
  "itemIds": ["uuid1", "uuid2"]
}
```

### **11.3. Cancelar Devolução**
```http
POST /api/fichas-epi/entregas/:entregaId/devolucao/cancelar
```

**Body:**
```json
{
  "itensParaCancelar": ["uuid1", "uuid2"],
  "motivo": "Erro no processamento da devolução"
}
```

### **11.4. Histórico de Devoluções**
```http
GET /api/fichas-epi/devolucoes/historico
```

**Query Parameters:**
- `colaboradorId`: ID do colaborador (string, opcional)
- `tipoEpiId`: ID do tipo de EPI (string, opcional)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 20, máximo: 100)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "devolucoes": [
      {
        "entregaId": "uuid",
        "colaboradorNome": "Carlos Oliveira",
        "tipoEpiNome": "Capacete de Segurança",
        "dataEntrega": "2025-06-01T10:00:00.000Z",
        "dataDevolucao": "2025-07-07T15:00:00.000Z",
        "diasUso": 36,
        "motivoDevolucao": "Fim do período de uso",
        "condicaoItem": "BOM",
        "numeroSerie": "CS-001"
      }
    ],
    "estatisticas": {
      "totalDevolucoes": 125,
      "itensEmBomEstado": 98,
      "itensDanificados": 22,
      "itensPerdidos": 5,
      "tempoMedioUso": 45
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

---

## **12. Controllers Otimizados**

### **12.1. Listagem Otimizada de Fichas**
```http
GET /api/fichas-epi/list-enhanced
```

**Query Parameters:**
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 20, máximo: 100)
- `search`: Busca textual (string, opcional)
- `status`: Status da ficha (enum, opcional)
- `cargo`: Cargo do colaborador (string, opcional)
- `empresa`: Empresa/contratada (string, opcional)
- `vencimentoProximo`: Próximo ao vencimento (boolean, opcional)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "colaborador": {
          "nome": "Carlos Oliveira",
          "matricula": "MAT001",
          "cargo": "Operador de Produção",
          "empresa": "Empresa Alpha LTDA"
        },
        "status": "ativa",
        "statusDisplay": {
          "cor": "green",
          "label": "Ativa"
        },
        "totalEpisAtivos": 3,
        "totalEpisVencidos": 0,
        "proximoVencimento": "2025-12-15",
        "ultimaAtualizacao": "2025-07-07T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 125,
      "page": 1,
      "limit": 20,
      "totalPages": 7
    }
  }
}
```

### **12.2. Ficha Completa Otimizada**
```http
GET /api/fichas-epi/:id/complete
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "ficha": {
      "id": "uuid",
      "status": "ativa",
      "statusDisplay": {
        "cor": "green",
        "label": "Ativa"
      },
      "colaborador": {
        "id": "uuid",
        "nome": "Carlos Oliveira",
        "cpf": "123.456.***-01",
        "cpfDisplay": "123.456.***-01",
        "matricula": "MAT001",
        "cargo": "Operador de Produção",
        "empresa": "Empresa Alpha LTDA",
        "iniciais": "CO"
      }
    },
    "equipamentosEmPosse": [
      {
        "id": "uuid",
        "nomeEquipamento": "Capacete de Segurança",
        "numeroCA": "CA-12345",
        "categoria": "PROTECAO_CABECA",
        "dataEntrega": "2025-07-07",
        "dataLimiteDevolucao": "2025-12-15",
        "statusVencimento": "dentro_prazo",
        "statusVencimentoDisplay": {
          "texto": "160 dias restantes",
          "cor": "green",
          "diasRestantes": 160,
          "statusDetalhado": "dentro_prazo"
        },
        "diasParaVencimento": 160,
        "podeDevolver": true,
        "entregaId": "uuid",
        "itemEntregaId": "uuid"
      }
    ],
    "devolucoes": [],
    "entregas": [
      {
        "id": "uuid",
        "numero": "E4U302",
        "dataEntrega": "2025-07-07",
        "status": "assinado",
        "statusDisplay": {
          "cor": "green",
          "label": "Assinado"
        },
        "acoes": ["imprimir"],
        "itens": [
          {
            "id": "uuid",
            "nomeEquipamento": "Capacete de Segurança",
            "numeroCA": "CA-12345",
            "categoria": "PROTECAO_CABECA",
            "quantidade": 1
          }
        ]
      }
    ],
    "historico": [
      {
        "id": "uuid",
        "data": "2025-07-07T14:30:00.000Z",
        "dataFormatada": "07/07/2025 às 14:30",
        "tipo": "entrega",
        "tipoDisplay": {
          "label": "Entrega",
          "tipo": "entrega",
          "cor": "green"
        },
        "acao": "Entrega de EPIs realizada",
        "responsavel": "João Silva",
        "mudancaStatus": "Disponível → Com Colaborador",
        "detalhes": {
          "resumo": "1x Capacete de Segurança (CA-12345)",
          "dados": {
            "quantidade": 1,
            "equipamento": "Capacete de Segurança",
            "numeroCA": "CA-12345",
            "categoria": "PROTECAO_CABECA"
          }
        }
      }
    ],
    "estatisticas": {
      "totalEpisAtivos": 3,
      "totalEpisVencidos": 0,
      "proximoVencimento": "2025-12-15",
      "diasProximoVencimento": 160
    }
  }
}
```

### **12.3. Criar Entrega Completa**
```http
POST /api/entregas/create-complete
```

**Body:**
```json
{
  "fichaEpiId": "uuid",
  "responsavelId": "uuid",
  "equipamentos": [
    {
      "estoqueItemId": "I7XK91",
      "quantidade": 2
    }
  ]
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "entregaId": "E4U302",
    "itensIndividuais": [
      {
        "id": "uuid",
        "nomeEquipamento": "Capacete de Segurança",
        "numeroCA": "CA-12345",
        "dataLimiteDevolucao": "2025-12-15"
      }
    ],
    "totalItens": 2,
    "statusEntrega": "pendente_assinatura"
  }
}
```

### **12.4. Processar Devoluções em Lote**
```http
POST /api/devolucoes/process-batch
```

**Body:**
```json
{
  "devolucoes": [
    {
      "equipamentoId": "uuid",
      "motivo": "devolução padrão",
      "observacoes": "Item em boas condições"
    }
  ]
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "processadas": 5,
    "erros": [],
    "fichasAtualizadas": ["uuid1", "uuid2"],
    "estoqueAtualizado": true
  }
}
```

---

## **13. Relatórios Controller**

**Base Route:** `/api/relatorios`

### **13.1. Dashboard Principal**
```http
GET /api/relatorios/dashboard
```

**Query Parameters:**
- `unidadeNegocioId`: ID da unidade de negócio (string, opcional)
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `periodo`: Período de análise (string: "7d", "30d", "90d", "365d")

**Resposta:**
```json
{
  "success": true,
  "data": {
    "resumoGeral": {
      "totalColaboradores": 245,
      "colaboradoresComEpis": 218,
      "fichasAtivas": 218,
      "episVencidos": 12,
      "epistVencendoEm30Dias": 45
    },
    "estatisticasEntregas": {
      "entregasHoje": 8,
      "entregasUltimos7Dias": 45,
      "entregasUltimos30Dias": 189,
      "mediaEntregasDiarias": 6.3
    },
    "estatisticasDevolucoes": {
      "devolucoesHoje": 3,
      "devolucoesUltimos7Dias": 28,
      "devolucoesUltimos30Dias": 156,
      "mediaTempoUso": 45
    },
    "alertasEstoque": {
      "itensAbaixoMinimo": 8,
      "itensZerados": 2,
      "itensQuarentena": 5
    },
    "topEpisMaisUtilizados": [
      {
        "tipoEpi": "Capacete de Segurança",
        "totalEntregas": 98,
        "colaboradoresUsando": 95
      }
    ],
    "vencimentosProximos": [
      {
        "colaborador": "Carlos Oliveira",
        "tipoEpi": "Luva de Segurança",
        "dataVencimento": "2025-07-20",
        "diasRestantes": 13
      }
    ]
  }
}
```

### **13.2. Estatísticas de Entregas**
```http
GET /api/relatorios/dashboard/estatisticas-entregas
```

### **13.3. Vencimentos Próximos**
```http
GET /api/relatorios/dashboard/vencimentos-proximos
```



### **13.6. Relatório de Movimentações**
```http
GET /api/relatorios/movimentacoes
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `tipoEpiId`: ID do tipo de EPI (string, opcional)
- `tipoMovimentacao`: Tipo da movimentação (enum, opcional)
- `usuarioId`: ID do usuário responsável (string, opcional)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)
- `page`: Página (number)
- `limit`: Itens por página (number)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "movimentacoes": [
      {
        "id": "uuid",
        "dataMovimentacao": "2025-07-07T14:30:00.000Z",
        "tipoMovimentacao": "SAIDA_ENTREGA",
        "almoxarifado": "Almoxarifado Central SP",
        "tipoEpi": "Capacete de Segurança",
        "quantidade": 2,
        "responsavel": "João Silva",
        "documento": "E4U302",
        "observacoes": "Entrega para Carlos Oliveira"
      }
    ],
    "resumo": {
      "totalMovimentacoes": 1250,
      "entradas": 450,
      "saidas": 380,
      "ajustes": 20,
      "transferencias": 35,
      "descartes": 15
    }
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "totalPages": 25
  }
}
```

### **13.7. Saúde do Sistema**
```http
GET /api/relatorios/saude-sistema
```

**Query Parameters:**
- `incluirAlertas`: Incluir alertas do sistema (boolean, padrão: true)
- `incluirEstatisticas`: Incluir estatísticas (boolean, padrão: true)
- `incluirPerformance`: Incluir métricas de performance (boolean, padrão: false)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "statusGeral": "saudavel",
    "uptime": "15 dias, 8 horas",
    "ultimaAtualizacao": "2025-07-07T15:00:00.000Z",
    "alertas": [
      {
        "nivel": "warning",
        "categoria": "estoque",
        "mensagem": "8 itens abaixo do estoque mínimo",
        "acao": "Reabastecer estoque"
      }
    ],
    "estatisticas": {
      "totalRegistros": {
        "colaboradores": 245,
        "fichas": 218,
        "entregas": 1520,
        "devolucoes": 1285
      },
      "performance": {
        "tempoMedioResposta": "150ms",
        "requestsUltimas24h": 2450,
        "errosUltimas24h": 3
      }
    },
    "integridade": {
      "bancoDados": "ok",
      "cache": "ok",
      "consistenciaEstoque": "ok"
    }
  }
}
```

### **13.8. Relatório de Descartes**
```http
GET /api/relatorios/descartes
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `tipoEpiId`: ID do tipo de EPI (string, opcional)
- `contratadaId`: ID da contratada (string, opcional)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)
- `responsavelId`: ID do responsável (string, opcional)

### **13.9. Estatísticas de Descartes**
```http
GET /api/relatorios/descartes/estatisticas
```

### **13.10. Relatório de Auditoria**
```http
GET /api/relatorios/auditoria
```

**Query Parameters:**
- `usuarioId`: ID do usuário (string, opcional)
- `acao`: Ação auditada (string, opcional)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)

---

## **14. Códigos de Erro Comuns**

### **14.1. Erros de Validação (400)**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos fornecidos",
    "details": {
      "field": "quantidade",
      "value": -5,
      "constraint": "deve ser positiva"
    }
  }
}
```

### **14.2. Recurso Não Encontrado (404)**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Ficha de EPI não encontrada",
    "details": {
      "resource": "FichaEPI",
      "id": "uuid-invalid"
    }
  }
}
```

### **14.3. Regra de Negócio (409)**
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Estoque insuficiente para realizar a entrega",
    "details": {
      "estoqueDisponivel": 5,
      "quantidadeSolicitada": 10,
      "tipoEpi": "Capacete de Segurança"
    }
  }
}
```

---

## **15. Schemas de Dados Importantes**

### **15.1. ID Customizados**
- **Entregas:** `E` + 5 caracteres alfanuméricos (ex: E4U302)
- **EstoqueItems:** `I` + 5 caracteres alfanuméricos (ex: I7XK91)
- **TipoEPI:** `C` + 5 caracteres alfanuméricos (ex: C2MN58)
- **Caracteres Permitidos:** 0-9, A-Z (exceto 0, 1, O, I, L)

### **15.2. Status Enums**

**StatusEstoqueItem:**
- `DISPONIVEL`: Item disponível para entrega
- `AGUARDANDO_INSPECAO`: Item aguardando inspeção
- `QUARENTENA`: Item em quarentena

**StatusFichaEPI:**
- `ATIVA`: Ficha ativa e operacional
- `INATIVA`: Ficha inativa
- `SUSPENSA`: Ficha suspensa temporariamente

**StatusEntrega:**
- `PENDENTE_ASSINATURA`: Aguardando assinatura
- `ASSINADA`: Entrega assinada e confirmada
- `CANCELADA`: Entrega cancelada

**StatusEntregaItem:**
- `COM_COLABORADOR`: Item com o colaborador
- `DEVOLVIDO`: Item devolvido ao estoque

**TipoMovimentacao:**
- `ENTRADA_NOTA`: Entrada via nota de movimentação
- `SAIDA_ENTREGA`: Saída para entrega
- `ENTRADA_DEVOLUCAO`: Entrada por devolução
- `SAIDA_TRANSFERENCIA`: Saída por transferência
- `ENTRADA_TRANSFERENCIA`: Entrada por transferência
- `SAIDA_DESCARTE`: Saída por descarte
- `AJUSTE_POSITIVO`: Ajuste positivo
- `AJUSTE_NEGATIVO`: Ajuste negativo

### **15.3. Campos de Data**
- **Formato ISO 8601:** `2025-07-07T14:30:00.000Z`
- **Timezone:** UTC
- **Campos de Data:**
  - `createdAt`: Data de criação
  - `updatedAt`: Data de atualização
  - `dataEntrega`: Data da entrega
  - `dataLimiteDevolucao`: Data limite para devolução
  - `dataMovimentacao`: Data da movimentação

---

## **16. Observações Importantes**

### **16.1. Política de Dados Reais**
- **PROIBIÇÃO ABSOLUTA DE MOCKS** (exceto headers da aplicação)
- Todos os dados vêm de fontes reais: PostgreSQL e Redis
- Testes devem usar dados reais do banco de testes

### **16.2. Rastreabilidade Unitária**
- Cada item físico de EPI = 1 registro em `EntregaItens`
- Cada movimentação = quantidade 1
- Preserva histórico completo de cada unidade

### **16.3. Transações Atômicas**
- Todas as operações de escrita são transacionais
- Garantia de consistência dos dados
- Rollback automático em caso de erro

### **16.4. Performance**
- Operações em lote quando possível
- Paginação em todas as listagens
- Cache Redis para configurações

### **16.5. Validação**
- Zod schemas como Single Source of Truth
- Validação de entrada e saída
- Tipos TypeScript derivados dos schemas

---

**Fim da Documentação**

Esta documentação cobre todos os 167 endpoints disponíveis na API do Módulo de Gestão de EPI v3.5, fornecendo informações técnicas completas para desenvolvimento e integração.