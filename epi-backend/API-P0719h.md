# **API Técnica - Módulo de Gestão de EPI v3.5**

## **Documentação Técnica Completa**

**Versão:** 3.5  
**Data:** 10/07/2025  
**Ambiente de Produção:** https://epi-backend-s14g.onrender.com  
**Documentação Swagger:** `/api/docs`  
**Health Check:** `/health`

---

## **📋 Índice de Navegação**

### **1. [Resumo Executivo & Referência Rápida](#1-resumo-executivo--referência-rápida)**
- 1.1. [Informações Gerais](#11-informações-gerais)
- 1.2. [Formato de Resposta Padrão](#12-formato-de-resposta-padrão)
- 1.3. [Códigos de Status HTTP](#13-códigos-de-status-http)
- 1.4. [Autenticação](#14-autenticação)

### **2. [Gerenciamento de Sistema](#2-gerenciamento-de-sistema)**
- 2.1. [Health Check](#21-health-check)
- 2.2. [Configurações](#22-configurações)
- 2.3. [Saúde do Sistema](#23-saúde-do-sistema)

### **3. [Gerenciamento de Entidades Core](#3-gerenciamento-de-entidades-core)**
- 3.1. [Usuários](#31-usuários)
- 3.2. [Colaboradores](#32-colaboradores)
- 3.3. [Tipos de EPI](#33-tipos-de-epi)
- 3.4. [Contratadas](#34-contratadas)

### **4. [Gerenciamento de Estoque](#4-gerenciamento-de-estoque)**
- 4.1. [Posição de Estoque](#41-posição-de-estoque)
- 4.2. [Itens de Estoque](#42-itens-de-estoque)
- 4.3. [Movimentações](#43-movimentações)
- 4.4. [Notas de Movimentação](#44-notas-de-movimentação)
- 4.5. [Ajustes e Inventário](#45-ajustes-e-inventário)

### **5. [Gerenciamento de Fichas EPI](#5-gerenciamento-de-fichas-epi)**
- 5.1. [Fichas EPI](#51-fichas-epi)
- 5.2. [Entregas](#52-entregas)
- 5.3. [Devoluções](#53-devoluções)
- 5.4. [Histórico](#54-histórico)

### **6. [Relatórios & Analytics](#6-relatórios--analytics)**
- 6.1. [Dashboard Principal](#61-dashboard-principal)
- 6.2. [Relatórios Especializados](#62-relatórios-especializados)
- 6.3. [Análises Avançadas](#63-análises-avançadas)

### **7. [Esquemas & Referências](#7-esquemas--referências)**
- 7.1. [IDs Customizados](#71-ids-customizados)
- 7.2. [Status Enums](#72-status-enums)
- 7.3. [Códigos de Erro](#73-códigos-de-erro)

### **8. [Diretrizes de Implementação](#8-diretrizes-de-implementação)**
- 8.1. [Política de Dados Reais](#81-política-de-dados-reais)
- 8.2. [Rastreabilidade Unitária](#82-rastreabilidade-unitária)
- 8.3. [Performance e Otimização](#83-performance-e-otimização)

---

## **1. Resumo Executivo & Referência Rápida**

### **1.1. Informações Gerais**

**Base URLs:**
- **Produção:** `https://epi-backend-s14g.onrender.com`
- **API Base:** `/api`
- **Documentação:** `/api/docs` (Swagger UI)
- **Health Check:** `/health`

**Stack Tecnológica:**
- **Framework:** NestJS + TypeScript
- **Banco de Dados:** PostgreSQL + Prisma ORM
- **Cache:** Redis (Upstash)
- **Validação:** Zod schemas
- **Testes:** Vitest

### **1.2. Formato de Resposta Padrão**

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

### **1.3. Códigos de Status HTTP**

| Código | Significado |
|--------|-------------|
| **200** | Sucesso |
| **201** | Criado com sucesso |
| **400** | Dados inválidos |
| **401** | Não autorizado |
| **403** | Acesso negado |
| **404** | Recurso não encontrado |
| **409** | Conflito de dados |
| **500** | Erro interno do servidor |

### **1.4. Autenticação**

- **Implementação:** A ser implementada por outra equipe em momento posterior
- **Status Atual:** Todos os endpoints disponíveis sem autenticação

---

## **2. Gerenciamento de Sistema**

### **2.1. Health Check**

#### **2.1.1. Verificar Saúde da Aplicação**
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

#### **2.1.2. Executar Seed do Banco (Desenvolvimento)**
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

### **2.2. Configurações**

**Base Route:** `/api/configuracoes`

#### **2.2.1. Listar Configurações**
```http
GET /api/configuracoes
```

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

#### **2.2.2. Status do Sistema**
```http
GET /api/configuracoes/status
```

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

#### **2.2.3. Obter Configuração Específica**
```http
GET /api/configuracoes/:chave
```

**Chaves Disponíveis:**
- `PERMITIR_ESTOQUE_NEGATIVO`
- `PERMITIR_AJUSTES_FORCADOS`
- `ESTOQUE_MINIMO_EQUIPAMENTO`

#### **2.2.4. Atualizar Configuração**
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

#### **2.2.5. Atualização em Lote**
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

#### **2.2.6. Reset para Padrão**
```http
POST /api/configuracoes/reset
```

**Descrição:** Restaura todas as configurações para valores padrão.

### **2.3. Saúde do Sistema**

#### **2.3.1. Relatório de Saúde Completo**
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

---

## **3. Gerenciamento de Entidades Core**

### **3.1. Usuários**

**Base Route:** `/api/usuarios`

#### **3.1.1. Listar Usuários**
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

#### **3.1.2. Obter Usuário por ID**
```http
GET /api/usuarios/:id
```

**Parâmetros:**
- `id`: ID do usuário (UUID ou formato customizado)

### **3.2. Colaboradores**

**Base Route:** `/api/colaboradores`

#### **3.2.1. Criar Colaborador**
```http
POST /api/colaboradores
```

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

#### **3.2.2. Listar Colaboradores**
```http
GET /api/colaboradores
```

**Query Parameters:**
- `nome`: Filtro por nome (string, opcional)
- `cpf`: Filtro por CPF (string, opcional)
- `contratadaId`: Filtro por contratada (string UUID, opcional)
- `cargo`: Filtro por cargo (string, opcional)
- `setor`: Filtro por setor (string, opcional)
- `ativo`: Filtro por status ativo (boolean/string, opcional)
- `semFicha`: **[NOVO]** Filtro para colaboradores sem ficha EPI ativa (boolean/string, opcional)
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 10, máximo: 100)

**💡 Casos de Uso:**
- **Para criar fichas**: `GET /api/colaboradores?contratadaId=UUID&semFicha=true`
- **Listagem geral**: `GET /api/colaboradores?contratadaId=UUID`

**📋 Validação de Parâmetros Boolean:**
- **Valores aceitos para `true`**: `true`, `"true"`, `"TRUE"`, `"1"`
- **Valores aceitos para `false`**: `false`, `"false"`, `"FALSE"`, `"0"`

#### **3.2.3. Obter Colaborador por ID**
```http
GET /api/colaboradores/:id
```

### **3.3. Tipos de EPI**

**Base Route:** `/api/tipos-epi`

#### **3.3.1. Criar Tipo de EPI**
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

#### **3.3.2. Listar Tipos de EPI**
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

#### **3.3.3. Operações de Status**

**Ativar Tipo de EPI:**
```http
PATCH /api/tipos-epi/:id/ativar
```

**Body:**
```json
{
  "motivo": "Equipamento aprovado para uso"
}
```

**Inativar Tipo de EPI:**
```http
PATCH /api/tipos-epi/:id/inativar
```

#### **3.3.4. Estatísticas do Tipo**
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

### **3.4. Contratadas**

**Base Route:** `/api/contratadas`

#### **3.4.1. Criar Contratada**
```http
POST /api/contratadas
```

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

#### **3.4.2. Listar Contratadas**
```http
GET /api/contratadas
```

**Query Parameters:**
- `nome`: Filtro por nome (string, opcional)
- `cnpj`: Filtro por CNPJ (string, opcional)

#### **3.4.3. Estatísticas de Contratadas**
```http
GET /api/contratadas/estatisticas
```

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
        "totalColaboradores": 45,
        "totalEpisAtivos": 230
      }
    ]
  }
}
```

#### **3.4.4. Buscar Contratadas por Nome**
```http
GET /api/contratadas/buscar
```

**Query Parameters:**
- `nome`: Nome para busca (string, obrigatório)

**Resposta:** Lista limitada a 10 resultados.

#### **3.4.5. Operações CRUD**

**Obter por ID:**
```http
GET /api/contratadas/:id
```

**Atualizar:**
```http
PUT /api/contratadas/:id
```

**Excluir:**
```http
DELETE /api/contratadas/:id
```

**Restrições:** Apenas se não houver colaboradores vinculados.

---

## **4. Gerenciamento de Estoque**

### **4.1. Posição de Estoque**

**Base Route:** `/api/estoque`

#### **4.1.1. Posição de Estoque Atual**
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

#### **4.1.2. Resumo de Estoque**
```http
GET /api/estoque/resumo
```

#### **4.1.3. Alertas de Estoque**
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

### **4.2. Itens de Estoque**

#### **4.2.1. Listar Itens de Estoque** ⭐ **[FILTROS AVANÇADOS]**
```http
GET /api/estoque/itens
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `tipoEpiId`: ID do tipo de EPI (string, opcional)
- `status`: **[NOVO]** Status do item com lógica condicional (enum: "DISPONIVEL", "AGUARDANDO_INSPECAO", "QUARENTENA", "SEM_ESTOQUE", opcional)
- `apenasDisponiveis`: Apenas itens disponíveis (boolean, opcional)
- `apenasComSaldo`: Apenas itens com saldo > 0 (boolean, opcional)
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 50, máx: 100)

**🔄 Lógica Condicional do Filtro `status`:**

**Quando `PERMITIR_ESTOQUE_NEGATIVO = false` (Padrão):**
- `status=DISPONIVEL`: Itens com `status = DISPONIVEL` AND `quantidade > 0`
- `status=SEM_ESTOQUE`: Itens com `quantidade ≤ 0` AND `status NOT IN (QUARENTENA, AGUARDANDO_INSPECAO)`
- `status=QUARENTENA`: Itens com `status = QUARENTENA`
- `status=AGUARDANDO_INSPECAO`: Itens com `status = AGUARDANDO_INSPECAO`

**Quando `PERMITIR_ESTOQUE_NEGATIVO = true`:**
- `status=DISPONIVEL`: Itens com `status = DISPONIVEL` (independente da quantidade)
- `status=SEM_ESTOQUE`: **Funciona normalmente** (mas frontend deve ocultar a tab)
- `status=QUARENTENA`: Itens com `status = QUARENTENA`
- `status=AGUARDANDO_INSPECAO`: Itens com `status = AGUARDANDO_INSPECAO`

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

#### **4.2.2. Configuração dos Filtros de Estoque** ⭐ **[NOVO]**
```http
GET /api/estoque/configuracao-filtros
```

**Descrição:** Retorna as configurações dinâmicas que determinam quais filtros/tabs devem ser exibidos no frontend baseado na configuração `PERMITIR_ESTOQUE_NEGATIVO`.

**Resposta quando `PERMITIR_ESTOQUE_NEGATIVO = false`:**
```json
{
  "success": true,
  "data": {
    "permitirEstoqueNegativo": false,
    "tabsDisponiveis": {
      "disponivel": true,
      "quarentena": true,
      "aguardandoInspecao": true,
      "semEstoque": true
    }
  }
}
```

**Resposta quando `PERMITIR_ESTOQUE_NEGATIVO = true`:**
```json
{
  "success": true,
  "data": {
    "permitirEstoqueNegativo": true,
    "tabsDisponiveis": {
      "disponivel": true,
      "quarentena": true,
      "aguardandoInspecao": true,
      "semEstoque": false
    }
  }
}
```

#### **4.2.3. Listar Almoxarifados**
```http
GET /api/estoque/almoxarifados
```

**Query Parameters:**
- `unidadeNegocioId`: ID da unidade de negócio (string, opcional)
- `incluirContadores`: Incluir contadores de itens (boolean, opcional)

### **4.3. Movimentações**

#### **4.3.1. Kardex de Item**
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

#### **4.3.2. Análise de Giro**
```http
GET /api/estoque/analise-giro
```

**Query Parameters:**
- `almoxarifadoId`: ID do almoxarifado (string, opcional)
- `periodo`: Período de análise (string: "30d", "90d", "180d", "365d")

### **4.4. Notas de Movimentação**

**Base Route:** `/api/notas-movimentacao`

#### **4.4.1. Criar Nota de Movimentação**
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

#### **4.4.2. Listar Notas de Movimentação**
```http
GET /api/notas-movimentacao
```

**Query Parameters:**
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 10, máximo: 100)
- `numero`: Filtrar por número (string, opcional)
- `tipo`: Filtrar por tipo (enum: ENTRADA, TRANSFERENCIA, DESCARTE, AJUSTE)
- `status`: Filtrar por status (enum: RASCUNHO, CONCLUIDA, CANCELADA)
- `usuarioId`: ID do usuário responsável (string, opcional)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)

#### **4.4.3. Resumo de Notas de Movimentação** ⭐ **[NOVO]**
```http
GET /api/notas-movimentacao/resumo
```

**Descrição:** Lista notas com informações resumidas otimizadas para exibição em tabelas e dashboards.

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "numero": "ENT-2025-000014",
      "tipo": "ENTRADA",
      "status": "CONCLUIDA",
      "responsavel_nome": "Administrador Sistema",
      "almoxarifado_nome": "Almoxarifado RJ",
      "total_itens": 5,
      "valor_total": 1250.00,
      "data_documento": "2025-07-07",
      "observacoes": "Compra de EPIs"
    }
  ]
}
```

#### **4.4.4. Gerenciar Itens da Nota**

**Adicionar Item:**
```http
POST /api/notas-movimentacao/:id/itens
```

**Body:**
```json
{
  "tipoEpiId": "uuid",
  "quantidade": 25,
  "custoUnitario": 50.75
}
```

**Atualizar Quantidade:**
```http
PUT /api/notas-movimentacao/:id/itens/:tipoEpiId
```

**Remover Item:**
```http
DELETE /api/notas-movimentacao/:id/itens/:itemId
```

#### **4.4.5. Processar Nota**

**Concluir Nota:**
```http
POST /api/notas-movimentacao/:id/concluir
```

**Body:**
```json
{
  "validarEstoque": true
}
```

**Cancelar Nota:**
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

### **4.5. Ajustes e Inventário**

#### **4.5.1. Ajuste Direto de Estoque**
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

#### **4.5.2. Simular Ajuste**
```http
POST /api/estoque/ajuste-direto/simular
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

#### **4.5.3. Executar Inventário**
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

#### **4.5.4. Histórico de Ajustes**
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

---

## **5. Gerenciamento de Fichas EPI**

### **5.1. Fichas EPI**

**Base Route:** `/api/fichas-epi`

#### **5.1.1. Criar Ficha de EPI**
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

#### **5.1.2. Criar ou Ativar Ficha**
```http
POST /api/fichas-epi/criar-ou-ativar
```

**Descrição:** Cria nova ficha ou ativa ficha existente inativa.

#### **5.1.3. Listar Fichas de EPI**
```http
GET /api/fichas-epi
```

**Query Parameters:**
- `page`: Página (number)
- `limit`: Itens por página (number)
- `colaboradorId`: ID do colaborador (string, opcional)
- `status`: Status da ficha (enum: ATIVA, INATIVA, SUSPENSA)
- `colaboradorNome`: Nome do colaborador (string, opcional)
- `ativo`: Filtrar colaboradores ativos (boolean/string, opcional)
- `devolucaoPendente`: Fichas com devolução pendente (boolean/string, opcional)

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
  ]
}
```

#### **5.1.4. Operações de Status**

**Ativar Ficha:**
```http
PUT /api/fichas-epi/:id/ativar
```

**Inativar Ficha:**
```http
PUT /api/fichas-epi/:id/inativar
```

**Suspender Ficha:**
```http
PUT /api/fichas-epi/:id/suspender
```

**Body:**
```json
{
  "motivo": "Colaborador afastado por acidente"
}
```

#### **5.1.5. Estatísticas de Fichas**
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

#### **5.1.6. Listagem Otimizada (Enhanced)**
```http
GET /api/fichas-epi/list-enhanced
```

**Descrição:** Endpoint otimizado para frontend com dados pré-processados pelo backend.

**Query Parameters:**
- `page`: Página (número, padrão: 1)
- `limit`: Itens por página (número, 1-100, padrão: 20)
- `search`: Busca unificada por nome, matrícula ou CPF (string, opcional)
- `status`: Status da ficha (enum: `ativa`, `inativa`, `vencida`, `pendente_devolucao`, opcional)
- `cargo`: Cargo do colaborador (string, busca por contém, opcional)
- `empresa`: Nome da empresa (string, busca por contém, opcional)
- `empresaId`: ID da empresa (UUID, filtro exato, opcional)
- `vencimentoProximo`: Fichas com vencimento nos próximos 30 dias (boolean, opcional)

**Exemplos:**
```bash
# Busca básica
GET /api/fichas-epi/list-enhanced?page=1&limit=20

# Filtro por empresa (ID - recomendado para frontend)
GET /api/fichas-epi/list-enhanced?empresaId=U123456

# Filtro por empresa (nome - busca flexível)
GET /api/fichas-epi/list-enhanced?empresa=Construtora%20ABC

# Busca unificada por CPF
GET /api/fichas-epi/list-enhanced?search=123.456.789-01

# Múltiplos filtros
GET /api/fichas-epi/list-enhanced?status=ativa&cargo=engenheiro&empresaId=U123456
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "F123456",
        "colaborador": {
          "nome": "Carlos Oliveira",
          "cpf": "12345678901",
          "matricula": "MAT001",
          "cargo": "Engenheiro",
          "empresa": "Construtora ABC Ltda"
        },
        "status": "ativa",
        "statusDisplay": {
          "cor": "green",
          "label": "Ativa"
        },
        "totalEpisAtivos": 3,
        "totalEpisVencidos": 0,
        "proximoVencimento": "2025-08-15",
        "ultimaAtualizacao": "2025-07-10T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 125,
      "page": 1,
      "limit": 20,
      "totalPages": 7
    }
  },
  "message": "Lista de fichas carregada com dados pré-processados pelo backend."
}
```

**Funcionalidades do Endpoint:**
- **Dados Pré-processados**: Status, contadores e displays calculados pelo backend
- **Busca Unificada**: Nome, matrícula e CPF em um único campo
- **Filtros Flexíveis**: Por empresa (ID ou nome), cargo, status
- **Performance Otimizada**: Consultas eficientes com paginação
- **Campo CPF**: Incluído no objeto colaborador da resposta
- **Compatibilidade Frontend**: Estrutura otimizada para exibição direta

### **5.2. Entregas**

#### **5.2.1. Criar Entrega**
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

#### **5.2.2. Validar Entrega**
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

#### **5.2.3. Listar Entregas**

**Por Ficha:**
```http
GET /api/fichas-epi/:fichaId/entregas
```

**Por Colaborador:**
```http
GET /api/fichas-epi/colaborador/:colaboradorId/entregas
```

#### **5.2.4. Posse Atual do Colaborador**
```http
GET /api/fichas-epi/colaborador/:colaboradorId/posse-atual
```

**Query Parameters:**
- `incluirVencidos`: Incluir itens vencidos (boolean/string, padrão: false)
- `incluirProximosVencimento`: Incluir próximos ao vencimento (boolean/string, padrão: true)

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

#### **5.2.5. Assinar Entrega**
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

### **5.3. Devoluções**

#### **5.3.1. Processar Devolução**
```http
POST /api/fichas-epi/:fichaId/devolucoes
```

**Parâmetros:**
- `fichaId`: ID da ficha EPI (UUID)

**Body:**
```json
{
  "entregaId": "uuid",
  "itensParaDevolucao": [
    {
      "itemId": "uuid",
      "motivoDevolucao": "Fim do período de uso",
      "destinoItem": "QUARENTENA"
    }
  ],
  "usuarioId": "uuid",
  "observacoes": "Devolução padrão"
}
```

**🚨 REGRAS CRÍTICAS DE NEGÓCIO:**
- **Validação Obrigatória:** Devolução só é permitida para entregas com status `ASSINADA`
- **Destino Padrão:** Todos os itens devolvidos vão para status `QUARENTENA` (inspeção obrigatória)
- **Rastreabilidade:** Cada devolução cria movimentação unitária (`quantidadeMovida: 1`)
- **Transações Atômicas:** Todas as operações são transacionais para garantir consistência

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
        "numeroSerie": "N/A",
        "lote": "N/A",
        "statusAnterior": "COM_COLABORADOR",
        "novoStatus": "DEVOLVIDO",
        "motivoDevolucao": "Fim do período de uso",
        "destinoItem": "QUARENTENA"
      }
    ],
    "movimentacoesEstoque": [
      {
        "id": "temp-uuid",
        "tipoEpiId": "uuid",
        "quantidade": 1,
        "statusEstoque": "QUARENTENA"
      }
    ],
    "statusEntregaAtualizado": "ASSINADA",
    "dataProcessamento": "2025-07-07T15:00:00.000Z"
  },
  "message": "Devolução processada com sucesso"
}
```

#### **5.3.2. Processamento em Lote**
```http
POST /api/fichas-epi/:fichaId/devolucoes/batch
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

**Motivos Permitidos:**
- `devolução padrão`: Devolução normal
- `danificado`: Item danificado
- `troca`: Troca de equipamento
- `outros`: Outros motivos

### **5.4. Histórico**

#### **5.4.1. Histórico da Ficha**
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
  }
}
```

#### **5.4.2. Histórico Global de Devoluções**
```http
GET /api/fichas-epi/historico-global
```

**Query Parameters:**
- `colaboradorId`: ID do colaborador (string, opcional)
- `tipoEpiId`: ID do tipo de EPI (string, opcional)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 10)

---

## **6. Relatórios & Analytics**

### **6.1. Dashboard Principal**

**Base Route:** `/api/relatorios`

#### **6.1.1. Dashboard Principal**
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

#### **6.1.2. Estatísticas de Entregas**
```http
GET /api/relatorios/dashboard/estatisticas-entregas
```

#### **6.1.3. Vencimentos Próximos**
```http
GET /api/relatorios/dashboard/vencimentos-proximos
```

### **6.2. Relatórios Especializados**

#### **6.2.1. Relatório de Movimentações**
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
  }
}
```

#### **6.2.2. Relatório de Descartes**
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

#### **6.2.3. Estatísticas de Descartes**
```http
GET /api/relatorios/descartes/estatisticas
```

### **6.3. Análises Avançadas**

#### **6.3.1. Relatório de Auditoria**
```http
GET /api/relatorios/auditoria
```

**Query Parameters:**
- `usuarioId`: ID do usuário (string, opcional)
- `acao`: Ação auditada (string, opcional)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)

---

## **7. Esquemas & Referências**

### **7.1. IDs Customizados**

| Tipo | Formato | Exemplo |
|------|---------|---------|
| **Entregas** | `E` + 5 caracteres alfanuméricos | E4U302 |
| **EstoqueItems** | `I` + 5 caracteres alfanuméricos | I7XK91 |
| **TipoEPI** | `C` + 5 caracteres alfanuméricos | C2MN58 |

**Caracteres Permitidos:** 0-9, A-Z (exceto 0, 1, O, I, L)

### **7.2. Status Enums**

#### **StatusEstoqueItem:**
- `DISPONIVEL`: Item disponível para entrega
- `AGUARDANDO_INSPECAO`: Item aguardando inspeção
- `QUARENTENA`: Item em quarentena

#### **StatusFichaEPI:**
- `ATIVA`: Ficha ativa e operacional
- `INATIVA`: Ficha inativa
- `SUSPENSA`: Ficha suspensa temporariamente

#### **StatusEntrega:**
- `PENDENTE_ASSINATURA`: Aguardando assinatura
- `ASSINADA`: Entrega assinada e confirmada
- `CANCELADA`: Entrega cancelada

#### **StatusEntregaItem:**
- `COM_COLABORADOR`: Item com o colaborador
- `DEVOLVIDO`: Item devolvido ao estoque

#### **TipoMovimentacao:**
- `ENTRADA_NOTA`: Entrada via nota de movimentação
- `SAIDA_ENTREGA`: Saída para entrega
- `ENTRADA_DEVOLUCAO`: Entrada por devolução
- `SAIDA_TRANSFERENCIA`: Saída por transferência
- `ENTRADA_TRANSFERENCIA`: Entrada por transferência
- `SAIDA_DESCARTE`: Saída por descarte
- `AJUSTE_POSITIVO`: Ajuste positivo
- `AJUSTE_NEGATIVO`: Ajuste negativo

### **7.3. Códigos de Erro**

#### **7.3.1. Erros de Validação (400)**
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

#### **7.3.2. Recurso Não Encontrado (404)**
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

#### **7.3.3. Regra de Negócio (409)**
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

## **8. Diretrizes de Implementação**

### **8.1. Política de Dados Reais**

#### **🚨 PROIBIÇÃO ABSOLUTA DE MOCKS**
- **❌ JAMAIS criar mocks de dados** (exceto os headers da aplicação)
- **❌ JAMAIS simular respostas** de banco de dados ou APIs
- **❌ JAMAIS usar dados fictícios** em place de consultas reais

#### **✅ PADRÃO OBRIGATÓRIO: Dados Reais**
- **Database**: PostgreSQL via Prisma
- **Cache**: Redis para configurações
- **APIs**: Endpoints reais com validação completa

### **8.2. Rastreabilidade Unitária**

#### **Princípio Fundamental:**
- Cada item físico de EPI movimentado deve corresponder a um único registro na tabela `EntregaItens`
- Para entregas de N itens, devem ser criados N registros em `MovimentacaoEstoque`
- Operações de saída devem ter `quantidadeMovida: 1` para preservar a rastreabilidade

#### **Implementação:**
```typescript
// ✅ PADRÃO OBRIGATÓRIO: Performance com rastreabilidade
const movimentacoesData = itens.map(item => ({
  estoqueItemId: item.estoqueItemOrigemId,
  quantidadeMovida: 1, // Sempre 1 para rastreabilidade
  tipoMovimentacao: 'SAIDA_ENTREGA',
  responsavelId: input.usuarioId,
  entregaId: entrega.id,
}));

await tx.movimentacaoEstoque.createMany({
  data: movimentacoesData,
});
```

### **8.3. Performance e Otimização**

#### **Transações Atômicas:**
- Todas as operações que alteram o estado do banco devem ser encapsuladas em uma transação Prisma
- Garantia de consistência dos dados
- Rollback automático em caso de erro

```typescript
// ✅ PADRÃO: Uso obrigatório de transações para operações de escrita
await prisma.$transaction(async (tx) => {
  // 1. Validar estoque
  // 2. Criar movimentação
  // 3. Atualizar saldo
});
```

#### **Operações em Lote:**
- Utilizar `createMany` para criar múltiplos registros de uma só vez
- Paginação em todas as listagens
- Cache Redis para configurações

#### **Monitoramento:**
```typescript
// ✅ PADRÃO: Monitoramento de performance
import { MonitorUseCase } from 'src/shared/decorators/monitor-performance.decorator';

@MonitorUseCase('criar-entrega')
async execute(input: CriarEntregaInput): Promise<EntregaOutput> {
  // ... lógica do use case
}
```

---

## **🚀 Atualizações Recentes v3.5**

### **📊 Melhorias Implementadas (09/07/2025)**

#### **🆕 Filtros Avançados de Estoque com Lógica Condicional**
- **Sistema inteligente** que adapta comportamento baseado na configuração `PERMITIR_ESTOQUE_NEGATIVO`
- **Endpoint principal**: `GET /api/estoque/itens?status=SEM_ESTOQUE`
- **Configuração dinâmica**: `GET /api/estoque/configuracao-filtros`
- **Status disponíveis**: `DISPONIVEL`, `AGUARDANDO_INSPECAO`, `QUARENTENA`, `SEM_ESTOQUE`

#### **🔧 Correção de Validação de Parâmetros Boolean**
- **Parâmetros boolean** em query parameters agora aceitam strings
- **Endpoints afetados**: `/api/colaboradores`, `/api/fichas-epi` e relacionados
- **Formatos aceitos**: `true`, `"true"`, `"TRUE"`, `"1"` para verdadeiro
- **Compatibilidade** total com query parameters HTTP

#### **📋 Notas de Movimentação Aprimoradas**
- **Novo endpoint**: `GET /api/notas-movimentacao/resumo` - Listagem otimizada
- **Campos expandidos**: `usuario`, `almoxarifadoOrigem`, `almoxarifadoDestino`
- **Campos calculados**: `totalItens`, `valorTotal`
- **Suporte a custos**: Campo `custoUnitario` em todos os itens

#### **📊 Estatísticas Expandidas**
- **Contratadas**: Campo `totalEpisAtivos` para controle de distribuição
- **Devoluções**: Sistema completo com destino QUARENTENA obrigatório
- **Histórico**: Rastreamento detalhado de todas as ações

### **🎯 Preparação para Produção**
- **Dados reais**: Política de proibição absoluta de mocks
- **Transações**: Operações atômicas para consistência
- **Rastreabilidade**: Controle unitário de EPIs
- **Performance**: Operações em lote e cache otimizado

---

## **🆕 Atualizações de Funcionalidades (10/07/2025)**

### **🔍 Busca Unificada Aprimorada**

**Endpoint:** `GET /api/fichas-epi/list-enhanced`

**Parâmetro `search` expandido:**
- ✅ **Nome do colaborador** (busca por contém, case-insensitive)
- ✅ **Matrícula** (busca por contém, case-insensitive)  
- ✅ **CPF** (busca parcial ou completa, remove formatação automaticamente)

**Exemplos de uso:**
```bash
# Busca por nome
GET /api/fichas-epi/list-enhanced?search=Carlos

# Busca por CPF (aceita formatado ou não)
GET /api/fichas-epi/list-enhanced?search=12345678901
GET /api/fichas-epi/list-enhanced?search=123.456.789-01

# Busca por matrícula
GET /api/fichas-epi/list-enhanced?search=MAT001

# Busca por CPF parcial (mínimo 3 dígitos)
GET /api/fichas-epi/list-enhanced?search=123456
```

**Funcionalidades da busca:**
- **Sanitização automática**: Remove pontos, traços e espaços do CPF
- **Busca inteligente**: Procura em todos os campos simultaneamente
- **Mínimo de caracteres**: CPF requer pelo menos 3 dígitos para busca
- **Performance otimizada**: Usa índices do banco para busca rápida

**Resposta:** Mesma estrutura do endpoint `list-enhanced` com dados pré-processados.

### **🏢 Filtro por Empresa Aprimorado**

**Problema resolvido:** Frontend enviando UUID da empresa mas API esperando nome

**Solução implementada:**
- ✅ **Novo parâmetro `empresaId`**: Aceita UUID da empresa para filtro exato
- ✅ **Parâmetro `empresa` mantido**: Continua aceitando nome para busca flexível
- ✅ **Priorização inteligente**: Se `empresaId` for fornecido, usa filtro exato; senão usa busca por nome

**Exemplos de uso:**
```bash
# Filtro exato por ID (recomendado para frontend)
GET /api/fichas-epi/list-enhanced?empresaId=U123456

# Busca flexível por nome (para pesquisa)
GET /api/fichas-epi/list-enhanced?empresa=Construtora

# Combinação com outros filtros
GET /api/fichas-epi/list-enhanced?empresaId=U123456&status=ativa&cargo=engenheiro
```

**Comportamento:**
- **`empresaId`**: Filtro exato por UUID da contratada (mais eficiente)
- **`empresa`**: Busca por texto no nome da contratada (busca flexível)
- **Prioridade**: Se ambos forem enviados, `empresaId` tem prioridade

### **📄 Campo CPF Adicionado**

**Problema resolvido:** Campo CPF estava ausente na resposta do endpoint `list-enhanced`

**Solução implementada:**
- ✅ **Campo `cpf` adicionado**: Agora incluído no objeto `colaborador` de todas as respostas
- ✅ **Compatibilidade mantida**: Estrutura da resposta permanece a mesma
- ✅ **Busca por CPF**: O campo `search` agora permite busca por CPF (formatado ou não)

**Estrutura atualizada:**
```json
{
  "colaborador": {
    "nome": "João Silva",
    "cpf": "12345678901",
    "matricula": "MAT001",
    "cargo": "Técnico",
    "empresa": "Empresa ABC"
  }
}
```

**Funcionalidades do CPF:**
- **Formato**: CPF sem formatação (apenas dígitos)
- **Busca**: Aceita CPF com ou sem formatação na busca
- **Validação**: CPF válido conforme regras brasileiras

---

