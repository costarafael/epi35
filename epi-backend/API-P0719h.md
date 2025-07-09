# **API Técnica - Módulo de Gestão de EPI v3.5**

## **Documentação Técnica Completa**

**Versão:** 3.5
**Data:** 09/07/2025  
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

**✅ NOVO FILTRO (09/07/2025):** Adicionado parâmetro `semFicha` para facilitar a criação de fichas EPI.

**✅ CORREÇÃO APLICADA (09/07/2025):** Parâmetros boolean agora aceitam strings via query parameters.

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
Os parâmetros `ativo` e `semFicha` aceitam tanto boolean quanto string:
- **Valores aceitos para `true`**: `true`, `"true"`, `"TRUE"`, `"1"`
- **Valores aceitos para `false`**: `false`, `"false"`, `"FALSE"`, `"0"`
- **Formato recomendado**: `?semFicha=true&ativo=true`

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
- `status`: Status do item (string: "DISPONIVEL", "AGUARDANDO_INSPECAO", "QUARENTENA", opcional)
- `apenasDisponiveis`: Apenas itens disponíveis (boolean, opcional)
- `apenasComSaldo`: Apenas itens com saldo (boolean, opcional)
- `page`: Página (number)
- `limit`: Itens por página (number)

**Exemplos de Uso:**
- `GET /api/estoque/itens?status=QUARENTENA` - Lista apenas itens em quarentena
- `GET /api/estoque/itens?status=DISPONIVEL` - Lista apenas itens disponíveis
- `GET /api/estoque/itens?status=AGUARDANDO_INSPECAO` - Lista apenas itens aguardando inspeção

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

**Descrição:** Retorna estatísticas gerais das contratadas, colaboradores vinculados e EPIs ativos por contratada.

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

**Campos da Resposta:**
- `total`: Total de contratadas cadastradas no sistema
- `colaboradoresVinculados`: Total de colaboradores vinculados a contratadas
- `colaboradoresSemContratada`: Total de colaboradores sem contratada vinculada
- `topContratadas`: Lista das top 5 contratadas ordenadas por número de colaboradores
  - `contratada.id`: ID único da contratada
  - `contratada.nome`: Nome da empresa contratada
  - `contratada.cnpjFormatado`: CNPJ formatado (XX.XXX.XXX/XXXX-XX)
  - `totalColaboradores`: Número total de colaboradores vinculados à contratada
  - `totalEpisAtivos`: **[NOVO]** Total de EPIs ativos (status COM_COLABORADOR) da contratada

**Exemplo de Uso:**
O campo `totalEpisAtivos` representa a quantidade de equipamentos de proteção individual que estão atualmente com os colaboradores da contratada (status COM_COLABORADOR). Útil para:
- Dashboards de controle de EPIs por empresa
- Relatórios de utilização de equipamentos
- Métricas de distribuição de EPIs por contratada
- Alertas de concentração de equipamentos

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

### **9.2. Listar Notas de Movimentação**
```http
GET /api/notas-movimentacao
```

**Descrição:** Lista notas com filtros opcionais e paginação, incluindo informações expandidas e campos calculados com custos.

**✅ CORREÇÃO APLICADA (09/07/2025):** Endpoint agora retorna corretamente os custos unitários nos itens e valores totais calculados.

**Query Parameters:**
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 10, máximo: 100)
- `numero`: Filtrar por número (string, opcional)
- `tipo`: Filtrar por tipo (enum: ENTRADA, TRANSFERENCIA, DESCARTE, AJUSTE)
- `status`: Filtrar por status (enum: RASCUNHO, CONCLUIDA, CANCELADA)
- `usuarioId`: ID do usuário responsável (string, opcional)
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
      "createdAt": "2025-07-07T14:30:00.000Z",
      
      // Campos expandidos e calculados
      "usuario": {
        "id": "uuid",
        "nome": "Administrador Sistema"
      },
      "almoxarifadoOrigem": null,
      "almoxarifadoDestino": {
        "id": "uuid",
        "nome": "Almoxarifado Central SP"
      },
      "totalItens": 5,
      "valorTotal": 1250.00,
      "_itens": [
        {
          "id": "uuid",
          "tipoEpiId": "uuid",
          "quantidade": 10,
          "custo_unitario": 25.00
        }
      ]
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

**Novos Campos:**
- `usuario`: Informações do responsável pela nota
- `almoxarifadoOrigem`/`almoxarifadoDestino`: Detalhes dos almoxarifados
- `totalItens`: Quantidade total de itens na nota
- `valorTotal`: Valor total calculado (quantidade × custo unitário)
- `_itens`: Lista resumida dos itens com custos

### **9.3. Resumo de Notas de Movimentação** ⭐ **[NOVO]**
```http
GET /api/notas-movimentacao/resumo
```

**Descrição:** Lista notas com informações resumidas otimizadas para exibição em tabelas e dashboards.

**Query Parameters:**
- `page`: Página (number, padrão: 1)
- `limit`: Itens por página (number, padrão: 10, máximo: 100)
- `numero`: Filtrar por número da nota (string, opcional)
- `tipo`: Filtrar por tipo (enum: ENTRADA, TRANSFERENCIA, DESCARTE, AJUSTE)
- `status`: Filtrar por status (enum: RASCUNHO, CONCLUIDA, CANCELADA)
- `almoxarifadoId`: ID do almoxarifado (origem ou destino, string, opcional)
- `usuarioId`: ID do usuário responsável (string, opcional)
- `dataInicio`: Data inicial (date, opcional)
- `dataFim`: Data final (date, opcional)

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

**Características do Endpoint Resumo:**
- **Performance otimizada** para listagens grandes
- **Campos padronizados** para exibição em tabelas
- **Filtro por almoxarifado** (origem ou destino)
- **Valores calculados** (total de itens, valor total)
- **Formato de data** simplificado (YYYY-MM-DD)

### **9.4. Listar Rascunhos**
```http
GET /api/notas-movimentacao/rascunhos
```

**Descrição:** Lista apenas as notas no status RASCUNHO do usuário atual.

### **8.4. Obter Nota por ID**
```http
GET /api/notas-movimentacao/:id
```

**Descrição:** Retorna os detalhes completos de uma nota, incluindo itens com custos unitários.

**✅ CORREÇÃO APLICADA (09/07/2025):** Endpoint agora retorna corretamente o campo `custoUnitario` em todos os itens.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "numero": "ENT-2025-000001",
    "tipo": "ENTRADA",
    "almoxarifadoOrigemId": null,
    "almoxarifadoDestinoId": "uuid",
    "usuarioId": "uuid",
    "observacoes": "Compra de EPIs",
    "_status": "RASCUNHO",
    "createdAt": "2025-07-09T19:41:06.690Z",
    "_itens": [
      {
        "id": "uuid",
        "tipoEpiId": "uuid",
        "quantidade": 50,
        "custoUnitario": "45.75",
        "quantidadeProcessada": 0
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

### **9.7. Adicionar Item à Nota**
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

**Campos:**
- `tipoEpiId` (string, UUID, obrigatório): ID do tipo de EPI
- `quantidade` (number, obrigatório): Quantidade do item (deve ser positiva)
- `custoUnitario` (number, opcional): Custo unitário do item (deve ser não-negativo)

**Validações:**
- Nota deve estar em status RASCUNHO
- Tipo de EPI não pode estar duplicado na nota
- Quantidade deve ser positiva
- Custo unitário, se informado, não pode ser negativo

**Resposta:**
```json
{
  "success": true,
  "message": "Item adicionado com sucesso",
  "data": null
}
```

**Códigos de Status:**
- **201:** Item adicionado com sucesso
- **400:** Dados inválidos ou nota não editável
- **409:** Tipo de EPI já adicionado na nota

### **9.8. Atualizar Quantidade do Item**
```http
PUT /api/notas-movimentacao/:id/itens/:tipoEpiId
```

**Body:**
```json
{
  "quantidade": 30
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Quantidade do item atualizada com sucesso",
  "data": null
}
```

### **9.9. Remover Item da Nota**
```http
DELETE /api/notas-movimentacao/:id/itens/:itemId
```

**Resposta:**
```json
{
  "success": true,
  "message": "Item removido com sucesso",
  "data": null
}
```

### **9.10. Concluir Nota de Movimentação**
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

### **9.11. Cancelar Nota de Movimentação**
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

**Resposta:**
```json
{
  "success": true,
  "message": "Nota cancelada com sucesso",
  "data": {
    "notaCancelada": {
      "id": "uuid",
      "status": "CANCELADA"
    },
    "estornosGerados": [
      {
        "movimentacaoOriginalId": "uuid",
        "movimentacaoEstornoId": "uuid",
        "tipoEpiId": "uuid",
        "quantidade": 10,
        "saldoAnterior": 50,
        "saldoPosterior": 40
      }
    ],
    "estoqueAjustado": true
  }
}
```

### **9.12. Validar Cancelamento**
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

---

## **📝 Resumo das Principais Atualizações na API de Notas de Movimentação**

### **🆕 Novos Endpoints:**
- **`GET /api/notas-movimentacao/resumo`**: Listagem otimizada para tabelas e dashboards

### **✨ Melhorias nos Endpoints Existentes:**

#### **1. Listagem Principal (`GET /api/notas-movimentacao`)**
- **Campos expandidos:** `usuario`, `almoxarifadoOrigem`, `almoxarifadoDestino`
- **Campos calculados:** `totalItens`, `valorTotal`
- **Lista de itens:** `_itens` com custo unitário
- **Filtro adicional:** `usuarioId`

#### **2. Adição de Itens (`POST /api/notas-movimentacao/:id/itens`)**
- **Novo campo:** `custoUnitario` (opcional, não-negativo)
- **Validação aprimorada:** Verificação de duplicação de tipos de EPI
- **Cálculo automático:** Valor total baseado em quantidade × custo unitário

#### **3. Respostas Padronizadas**
- **Mensagens consistentes:** Todas as operações retornam mensagens de sucesso
- **Códigos de status claros:** Documentação completa dos códigos de erro
- **Estrutura uniforme:** Padrão `{ success, data, message }` em todas as respostas

### **🔧 Campos Calculados Automáticos:**
- **`totalItens`**: Soma das quantidades de todos os itens
- **`valorTotal`**: Soma de (quantidade × custoUnitario) de todos os itens
- **`responsavel_nome`**: Nome do usuário responsável (endpoint resumo)
- **`almoxarifado_nome`**: Nome do almoxarifado (origem ou destino)
- **`data_documento`**: Data formatada (YYYY-MM-DD) no endpoint resumo

### **🎯 Performance e Usabilidade:**
- **Endpoint `/resumo`** otimizado para listagens grandes
- **Filtros aprimorados** incluindo filtro por almoxarifado (origem ou destino)
- **Paginação consistente** em todos os endpoints
- **Informações expandidas** sem necessidade de chamadas adicionais

---

## **10. Fichas de EPI Controller**

**Base Route:** `/api/fichas-epi`

### **10.1. Criar Ficha de EPI**
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

## **11. Fichas EPI - Entregas**

### **11.1. Criar Entrega**
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

## **12. Fichas EPI - Devoluções**

### **🚨 REGRAS CRÍTICAS DE NEGÓCIO**
- **Validação Obrigatória:** Devolução só é permitida para entregas com status `ASSINADA`
- **Destino Padrão:** Todos os itens devolvidos vão para status `QUARENTENA` (inspeção obrigatória)
- **Rastreabilidade:** Cada devolução cria movimentação unitária (`quantidadeMovida: 1`)
- **Transações Atômicas:** Todas as operações são transacionais para garantir consistência

### **12.1. Processar Devolução**
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

**Destinos Permitidos:**
- `QUARENTENA`: Item vai para inspeção (padrão)
- `DESCARTE`: Item irrecuperável (também vai para quarentena temporariamente)

**Validações Automáticas:**
- Entrega deve estar com status `ASSINADA`
- Itens devem estar com status `COM_COLABORADOR`
- Ficha deve existir e estar ativa

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

**Códigos de Status:**
- **201:** Devolução processada com sucesso
- **400:** Dados inválidos
- **404:** Ficha não encontrada
- **422:** Entrega não assinada ou item já devolvido

### **12.2. Processamento em Lote**
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

### **12.3. Histórico Global de Devoluções**
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

**Resposta:**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### **📝 Resumo das Principais Mudanças no Sistema de Devoluções**

#### **🆕 Novos Recursos:**
- **Destino QUARENTENA como padrão:** Todos os itens devolvidos passam por inspeção
- **Processamento em lote:** Múltiplas devoluções em uma única operação
- **Validação obrigatória de assinatura:** Só permite devolução de entregas assinadas
- **Rastreabilidade atômica:** Cada item tem movimentação unitária

#### **🔧 Melhorias Técnicas:**
- **Transações atômicas:** Consistência garantida entre entrega e estoque
- **Operações em batch:** Performance otimizada para múltiplas devoluções
- **Validações rigorosas:** Regras de negócio implementadas no backend
- **Histórico completo:** Todas as devoluções são registradas no histórico da ficha

#### **🎯 Fluxo de Devolução Atualizado:**
1. **Validação:** Verificar se entrega está assinada
2. **Processamento:** Atualizar status dos itens para `DEVOLVIDO`
3. **Estoque:** Criar movimentação `ENTRADA_DEVOLUCAO` 
4. **Destino:** Todos os itens vão para `QUARENTENA`
5. **Histórico:** Registrar ação no histórico da ficha
6. **Status:** Manter entrega como `ASSINADA` (não altera)

---

## **13. Controllers Otimizados**

### **13.1. Listagem Otimizada de Fichas**
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
- `vencimentoProximo`: Próximo ao vencimento (boolean/string, opcional)

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

## **14. Relatórios Controller**

**Base Route:** `/api/relatorios`

### **14.1. Dashboard Principal**
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

## **15. Códigos de Erro Comuns**

### **15.1. Erros de Validação (400)**
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

## **16. Schemas de Dados Importantes**

### **16.1. ID Customizados**
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

## **17. Observações Importantes**

### **17.1. Política de Dados Reais**
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

Esta documentação cobre todos os endpoints disponíveis na API do Módulo de Gestão de EPI v3.5, fornecendo informações técnicas completas para desenvolvimento e integração.

## **🚀 Atualizações Recentes v3.5**

### **📊 Contratadas Controller**
- **Adicionado:** Campo `totalEpisAtivos` no endpoint `/api/contratadas/estatisticas`
- **Funcionalidade:** Conta EPIs ativos (COM_COLABORADOR) por contratada
- **Uso:** Dashboards, métricas e relatórios de distribuição

### **📋 Notas de Movimentação Controller**
- **Novo endpoint:** `GET /api/notas-movimentacao/resumo` - Listagem otimizada
- **Melhorias:** Campos expandidos, valores calculados e suporte a `custoUnitario`
- **Performance:** Filtros aprimorados e paginação otimizada

### **🔧 Melhorias Gerais**
- **Dados reais:** Política de proibição absoluta de mocks
- **Transações:** Operações atômicas para consistência
- **Rastreabilidade:** Controle unitário de EPIs
- **Documentação:** Exemplos completos e casos de uso

### **🆕 Correção de Validação de Parâmetros Boolean (09/07/2025)**
- **Problema resolvido:** Parâmetros boolean em query parameters agora aceitam strings
- **Endpoints afetados:** `/api/colaboradores`, `/api/fichas-epi` e endpoints relacionados
- **Parâmetros corrigidos:** `ativo`, `semFicha`, `devolucaoPendente`, `incluirVencidos`, `incluirProximosVencimento`, `vencimentoProximo`
- **Formatos aceitos:** 
  - **Para `true`**: `true`, `"true"`, `"TRUE"`, `"1"`
  - **Para `false`**: `false`, `"false"`, `"FALSE"`, `"0"`
- **Exemplo de uso:** `GET /api/colaboradores?semFicha=true&ativo=true`
- **Benefício:** Compatibilidade total com query parameters HTTP que sempre são strings

### **🔍 Novo Filtro de Status para Estoque (09/07/2025)**
- **Endpoint:** `GET /api/estoque/itens?status=QUARENTENA`
- **Funcionalidade:** Filtrar itens de estoque por status específico
- **Status disponíveis:** `DISPONIVEL`, `AGUARDANDO_INSPECAO`, `QUARENTENA`
- **Validação:** Rejeita status inválidos com erro 400
- **Casos de uso:**
  - **Quarentena:** `GET /api/estoque/itens?status=QUARENTENA`
  - **Disponíveis:** `GET /api/estoque/itens?status=DISPONIVEL`
  - **Aguardando inspeção:** `GET /api/estoque/itens?status=AGUARDANDO_INSPECAO`
- **Integração:** Funciona com outros filtros (`almoxarifadoId`, `tipoEpiId`, `apenasComSaldo`)
- **Prioridade:** Filtro `status` tem prioridade sobre `apenasDisponiveis`