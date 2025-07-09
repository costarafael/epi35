---
title: EPI Backend API v3.5.0
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - python: Python
language_clients:
  - shell: ""
  - http: ""
  - javascript: ""
  - python: ""
toc_footers: []
includes: []
search: true
highlight_theme: darkula
headingLevel: 2

---

<!-- Generator: Widdershins v4.0.1 -->

<h1 id="epi-backend-api">EPI Backend API v3.5.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

Backend do Módulo de Gestão de EPIs v3.5 - API para gestão de equipamentos de proteção individual

Base URLs:

# Authentication

- HTTP Authentication, scheme: bearer 

<h1 id="epi-backend-api-tipos-epi">tipos-epi</h1>

Gestão de tipos de EPI

## Criar novo tipo de EPI

<a id="opIdTiposEpiController_criarTipoEpi"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/tipos-epi \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/tipos-epi HTTP/1.1

Content-Type: application/json
Accept: application/json

```

```javascript
const inputBody = '{
  "nomeEquipamento": "Capacete de Segurança",
  "numeroCa": "CA-12345",
  "categoria": "PROTECAO_CABECA",
  "descricao": "Capacete de segurança em polietileno",
  "vidaUtilDias": 365,
  "status": "ATIVO"
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/tipos-epi',
{
  method: 'POST',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/tipos-epi', headers = headers)

print(r.json())

```

`POST /api/tipos-epi`

Cria um novo tipo de EPI no catálogo do sistema

> Body parameter

```json
{
  "nomeEquipamento": "Capacete de Segurança",
  "numeroCa": "CA-12345",
  "categoria": "PROTECAO_CABECA",
  "descricao": "Capacete de segurança em polietileno",
  "vidaUtilDias": 365,
  "status": "ATIVO"
}
```

<h3 id="criar-novo-tipo-de-epi-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|object|true|Dados do tipo de EPI a ser criado|
|» nomeEquipamento|body|string|true|Nome do equipamento de proteção|
|» numeroCa|body|string|true|Número do Certificado de Aprovação|
|» categoria|body|string|true|none|
|» descricao|body|string|false|Descrição detalhada do equipamento|
|» vidaUtilDias|body|number|false|Vida útil em dias|
|» status|body|string|false|none|

#### Enumerated Values

|Parameter|Value|
|---|---|
|» categoria|PROTECAO_CABECA|
|» categoria|PROTECAO_OLHOS_FACE|
|» categoria|PROTECAO_AUDITIVA|
|» categoria|PROTECAO_RESPIRATORIA|
|» categoria|PROTECAO_MAOS_BRACOS|
|» categoria|PROTECAO_PES_PERNAS|
|» categoria|PROTECAO_TRONCO|
|» categoria|PROTECAO_CORPO_INTEIRO|
|» categoria|PROTECAO_QUEDAS|
|» status|ATIVO|
|» status|DESCONTINUADO|

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nomeEquipamento": "string",
    "numeroCa": "string",
    "categoria": "string",
    "descricao": "string",
    "vidaUtilDias": 0,
    "status": "string",
    "createdAt": "2019-08-24T14:15:22Z"
  },
  "message": "string"
}
```

<h3 id="criar-novo-tipo-de-epi-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Tipo de EPI criado com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Número CA já existe|None|

<h3 id="criar-novo-tipo-de-epi-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nomeEquipamento|string|false|none|none|
|»» numeroCa|string|false|none|none|
|»» categoria|string|false|none|none|
|»» descricao|string¦null|false|none|none|
|»» vidaUtilDias|number¦null|false|none|none|
|»» status|string|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Listar tipos de EPI

<a id="opIdTiposEpiController_listarTiposEpi"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/tipos-epi \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/tipos-epi HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/tipos-epi',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/tipos-epi', headers = headers)

print(r.json())

```

`GET /api/tipos-epi`

Lista todos os tipos de EPI com filtros opcionais e paginação

<h3 id="listar-tipos-de-epi-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|number|false|Itens por página (padrão: 10, máximo: 100)|
|page|query|number|false|Número da página (padrão: 1)|
|busca|query|string|false|Buscar por nome do equipamento ou número CA|
|status|query|string|false|Filtrar por status do tipo de EPI|
|categoria|query|string|false|Filtrar por categoria de proteção|
|ativo|query|boolean|false|Filtrar por status ativo (true) ou inativo (false)|

#### Enumerated Values

|Parameter|Value|
|---|---|
|status|ATIVO|
|status|DESCONTINUADO|
|categoria|PROTECAO_CABECA|
|categoria|PROTECAO_OLHOS_FACE|
|categoria|PROTECAO_AUDITIVA|
|categoria|PROTECAO_RESPIRATORIA|
|categoria|PROTECAO_MAOS_BRACOS|
|categoria|PROTECAO_PES_PERNAS|
|categoria|PROTECAO_TRONCO|
|categoria|PROTECAO_CORPO_INTEIRO|
|categoria|PROTECAO_QUEDAS|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
        "nomeEquipamento": "string",
        "numeroCa": "string",
        "categoria": "string",
        "descricao": "string",
        "vidaUtilDias": 0,
        "status": "string",
        "createdAt": "2019-08-24T14:15:22Z"
      }
    ],
    "pagination": {
      "page": 0,
      "limit": 0,
      "total": 0,
      "totalPages": 0,
      "hasNextPage": true,
      "hasPreviousPage": true
    }
  }
}
```

<h3 id="listar-tipos-de-epi-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de tipos de EPI retornada com sucesso|Inline|

<h3 id="listar-tipos-de-epi-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» items|[object]|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» nomeEquipamento|string|false|none|none|
|»»» numeroCa|string|false|none|none|
|»»» categoria|string|false|none|none|
|»»» descricao|string¦null|false|none|none|
|»»» vidaUtilDias|number¦null|false|none|none|
|»»» status|string|false|none|none|
|»»» createdAt|string(date-time)|false|none|none|
|»» pagination|object|false|none|none|
|»»» page|number|false|none|none|
|»»» limit|number|false|none|none|
|»»» total|number|false|none|none|
|»»» totalPages|number|false|none|none|
|»»» hasNextPage|boolean|false|none|none|
|»»» hasPreviousPage|boolean|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Obter tipo de EPI por ID

<a id="opIdTiposEpiController_obterTipoEpi"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/tipos-epi/{id} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/tipos-epi/{id} HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/tipos-epi/{id}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/tipos-epi/{id}', headers = headers)

print(r.json())

```

`GET /api/tipos-epi/{id}`

Retorna os detalhes de um tipo de EPI específico

<h3 id="obter-tipo-de-epi-por-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID do tipo de EPI|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nomeEquipamento": "string",
    "numeroCa": "string",
    "categoria": "string",
    "descricao": "string",
    "vidaUtilDias": 0,
    "status": "string",
    "createdAt": "2019-08-24T14:15:22Z"
  }
}
```

<h3 id="obter-tipo-de-epi-por-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Tipo de EPI encontrado|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Tipo de EPI não encontrado|None|

<h3 id="obter-tipo-de-epi-por-id-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nomeEquipamento|string|false|none|none|
|»» numeroCa|string|false|none|none|
|»» categoria|string|false|none|none|
|»» descricao|string¦null|false|none|none|
|»» vidaUtilDias|number¦null|false|none|none|
|»» status|string|false|none|none|
|»» createdAt|string(date-time)|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Atualizar tipo de EPI

<a id="opIdTiposEpiController_atualizarTipoEpi"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /api/tipos-epi/{id} \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
PUT /api/tipos-epi/{id} HTTP/1.1

Content-Type: application/json
Accept: application/json

```

```javascript
const inputBody = '{
  "nomeEquipamento": "Capacete de Segurança Atualizado",
  "numeroCa": "CA-54321",
  "categoria": "PROTECAO_CABECA",
  "descricao": "Descrição atualizada",
  "vidaUtilDias": 730,
  "status": "ATIVO"
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/tipos-epi/{id}',
{
  method: 'PUT',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.put('/api/tipos-epi/{id}', headers = headers)

print(r.json())

```

`PUT /api/tipos-epi/{id}`

Atualiza completamente um tipo de EPI existente

> Body parameter

```json
{
  "nomeEquipamento": "Capacete de Segurança Atualizado",
  "numeroCa": "CA-54321",
  "categoria": "PROTECAO_CABECA",
  "descricao": "Descrição atualizada",
  "vidaUtilDias": 730,
  "status": "ATIVO"
}
```

<h3 id="atualizar-tipo-de-epi-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID do tipo de EPI|
|body|body|object|true|Dados atualizados do tipo de EPI|
|» nomeEquipamento|body|string|false|none|
|» numeroCa|body|string|false|none|
|» categoria|body|string|false|none|
|» descricao|body|string|false|none|
|» vidaUtilDias|body|number|false|none|
|» status|body|string|false|none|

#### Enumerated Values

|Parameter|Value|
|---|---|
|» status|ATIVO|
|» status|DESCONTINUADO|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nomeEquipamento": "string",
    "numeroCa": "string",
    "categoria": "string",
    "descricao": "string",
    "vidaUtilDias": 0,
    "status": "string",
    "createdAt": "2019-08-24T14:15:22Z"
  },
  "message": "string"
}
```

<h3 id="atualizar-tipo-de-epi-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Tipo de EPI atualizado com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Tipo de EPI não encontrado|None|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Número CA já existe|None|

<h3 id="atualizar-tipo-de-epi-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nomeEquipamento|string|false|none|none|
|»» numeroCa|string|false|none|none|
|»» categoria|string|false|none|none|
|»» descricao|string¦null|false|none|none|
|»» vidaUtilDias|number¦null|false|none|none|
|»» status|string|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Ativar tipo de EPI

<a id="opIdTiposEpiController_ativarTipoEpi"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /api/tipos-epi/{id}/ativar \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
PATCH /api/tipos-epi/{id}/ativar HTTP/1.1

Content-Type: application/json
Accept: application/json

```

```javascript
const inputBody = '{
  "motivo": "Tipo de EPI reativado por necessidade operacional"
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/tipos-epi/{id}/ativar',
{
  method: 'PATCH',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.patch('/api/tipos-epi/{id}/ativar', headers = headers)

print(r.json())

```

`PATCH /api/tipos-epi/{id}/ativar`

Ativa um tipo de EPI descontinuado

> Body parameter

```json
{
  "motivo": "Tipo de EPI reativado por necessidade operacional"
}
```

<h3 id="ativar-tipo-de-epi-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID do tipo de EPI|
|body|body|object|false|Dados opcionais para ativação|
|» motivo|body|string|false|Motivo da ativação|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nomeEquipamento": "string",
    "numeroCa": "string",
    "categoria": "string",
    "descricao": "string",
    "vidaUtilDias": 0,
    "status": "ATIVO",
    "createdAt": "2019-08-24T14:15:22Z"
  },
  "message": "string"
}
```

<h3 id="ativar-tipo-de-epi-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Tipo de EPI ativado com sucesso|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Tipo de EPI não encontrado|None|

<h3 id="ativar-tipo-de-epi-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nomeEquipamento|string|false|none|none|
|»» numeroCa|string|false|none|none|
|»» categoria|string|false|none|none|
|»» descricao|string¦null|false|none|none|
|»» vidaUtilDias|number¦null|false|none|none|
|»» status|string|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Inativar tipo de EPI

<a id="opIdTiposEpiController_inativarTipoEpi"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /api/tipos-epi/{id}/inativar \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
PATCH /api/tipos-epi/{id}/inativar HTTP/1.1

Content-Type: application/json
Accept: application/json

```

```javascript
const inputBody = '{
  "motivo": "Tipo de EPI descontinuado pelo fabricante"
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/tipos-epi/{id}/inativar',
{
  method: 'PATCH',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.patch('/api/tipos-epi/{id}/inativar', headers = headers)

print(r.json())

```

`PATCH /api/tipos-epi/{id}/inativar`

Inativa um tipo de EPI, descontinuando seu uso

> Body parameter

```json
{
  "motivo": "Tipo de EPI descontinuado pelo fabricante"
}
```

<h3 id="inativar-tipo-de-epi-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID do tipo de EPI|
|body|body|object|false|Dados opcionais para inativação|
|» motivo|body|string|false|Motivo da inativação|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nomeEquipamento": "string",
    "numeroCa": "string",
    "categoria": "string",
    "descricao": "string",
    "vidaUtilDias": 0,
    "status": "DESCONTINUADO",
    "createdAt": "2019-08-24T14:15:22Z"
  },
  "message": "string"
}
```

<h3 id="inativar-tipo-de-epi-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Tipo de EPI inativado com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Não é possível inativar: existe estoque para este tipo de EPI|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Tipo de EPI não encontrado|None|

<h3 id="inativar-tipo-de-epi-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nomeEquipamento|string|false|none|none|
|»» numeroCa|string|false|none|none|
|»» categoria|string|false|none|none|
|»» descricao|string¦null|false|none|none|
|»» vidaUtilDias|number¦null|false|none|none|
|»» status|string|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Estatísticas do tipo de EPI

<a id="opIdTiposEpiController_obterEstatisticasTipoEpi"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/tipos-epi/{id}/estatisticas \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/tipos-epi/{id}/estatisticas HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/tipos-epi/{id}/estatisticas',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/tipos-epi/{id}/estatisticas', headers = headers)

print(r.json())

```

`GET /api/tipos-epi/{id}/estatisticas`

Retorna estatísticas detalhadas sobre um tipo de EPI específico

<h3 id="estatísticas-do-tipo-de-epi-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID do tipo de EPI|

> Example responses

> 200 Response

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

<h3 id="estatísticas-do-tipo-de-epi-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Estatísticas do tipo de EPI|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Tipo de EPI não encontrado|None|

<h3 id="estatísticas-do-tipo-de-epi-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» totalFichas|number|false|none|none|
|»» fichasAtivas|number|false|none|none|
|»» totalEstoque|number|false|none|none|
|»» estoqueDisponivel|number|false|none|none|
|»» totalEntregas|number|false|none|none|
|»» entregasAtivas|number|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Estatísticas por categoria

<a id="opIdTiposEpiController_obterEstatisticasPorCategoria"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/tipos-epi/estatisticas/por-categoria \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/tipos-epi/estatisticas/por-categoria HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/tipos-epi/estatisticas/por-categoria',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/tipos-epi/estatisticas/por-categoria', headers = headers)

print(r.json())

```

`GET /api/tipos-epi/estatisticas/por-categoria`

Retorna estatísticas agrupadas por categoria de EPI

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": [
    {
      "categoria": "PROTECAO_CABECA",
      "tiposAtivos": 5,
      "estoqueDisponivel": 120,
      "totalItens": 150
    }
  ]
}
```

<h3 id="estatísticas-por-categoria-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Estatísticas por categoria de EPI|Inline|

<h3 id="estatísticas-por-categoria-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|[object]|false|none|none|
|»» categoria|string|false|none|none|
|»» tiposAtivos|number|false|none|none|
|»» estoqueDisponivel|number|false|none|none|
|»» totalItens|number|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

<h1 id="epi-backend-api-colaboradores">colaboradores</h1>

Gestão de colaboradores

## Criar novo colaborador

<a id="opIdColaboradoresController_criarColaborador"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/colaboradores \
  -H 'Accept: application/json'

```

```http
POST /api/colaboradores HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('/api/colaboradores',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.post('/api/colaboradores', headers = headers)

print(r.json())

```

`POST /api/colaboradores`

Cria um novo colaborador vinculado a uma contratada

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nome": "João da Silva",
    "cpf": "12345678901",
    "cpfFormatado": "123.456.789-01",
    "matricula": "MAT001",
    "cargo": "Técnico",
    "setor": "Manutenção",
    "ativo": true,
    "contratadaId": "debf22ac-0aa1-48cf-b127-0aca7579a0ed",
    "unidadeNegocioId": "e6c1e2b1-45f8-48f2-a0be-1cc7bc38c178",
    "createdAt": "2019-08-24T14:15:22Z",
    "contratada": {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "nome": "Empresa Contratada LTDA",
      "cnpj": "12345678000190"
    }
  }
}
```

<h3 id="criar-novo-colaborador-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Colaborador criado com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Contratada não encontrada|None|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|CPF já cadastrado|None|

<h3 id="criar-novo-colaborador-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nome|string|false|none|none|
|»» cpf|string|false|none|none|
|»» cpfFormatado|string|false|none|none|
|»» matricula|string¦null|false|none|none|
|»» cargo|string¦null|false|none|none|
|»» setor|string¦null|false|none|none|
|»» ativo|boolean|false|none|none|
|»» contratadaId|string(uuid)|false|none|none|
|»» unidadeNegocioId|string(uuid)|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|»» contratada|object|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» nome|string|false|none|none|
|»»» cnpj|string|false|none|none|

<aside class="success">
This operation does not require authentication
</aside>

## Listar colaboradores

<a id="opIdColaboradoresController_listarColaboradores"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/colaboradores \
  -H 'Accept: application/json'

```

```http
GET /api/colaboradores HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('/api/colaboradores',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('/api/colaboradores', headers = headers)

print(r.json())

```

`GET /api/colaboradores`

Lista colaboradores com filtros opcionais e paginação

<h3 id="listar-colaboradores-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|number|false|Itens por página (padrão: 10, máx: 100)|
|page|query|number|false|Página (padrão: 1)|
|ativo|query|boolean|false|Filtrar por status ativo|
|setor|query|string|false|Filtrar por setor|
|cargo|query|string|false|Filtrar por cargo|
|contratadaId|query|string|false|Filtrar por contratada|
|cpf|query|string|false|Filtrar por CPF|
|nome|query|string|false|Filtrar por nome|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": [
    {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "nome": "string",
      "cpf": "string",
      "cpfFormatado": "string",
      "matricula": "string",
      "cargo": "string",
      "setor": "string",
      "ativo": true,
      "contratada": {
        "nome": "string",
        "cnpj": "string"
      }
    }
  ],
  "pagination": {
    "page": 0,
    "limit": 0,
    "total": 0,
    "totalPages": 0,
    "hasNext": true,
    "hasPrev": true
  }
}
```

<h3 id="listar-colaboradores-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de colaboradores recuperada com sucesso|Inline|

<h3 id="listar-colaboradores-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|[object]|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nome|string|false|none|none|
|»» cpf|string|false|none|none|
|»» cpfFormatado|string|false|none|none|
|»» matricula|string¦null|false|none|none|
|»» cargo|string¦null|false|none|none|
|»» setor|string¦null|false|none|none|
|»» ativo|boolean|false|none|none|
|»» contratada|object|false|none|none|
|»»» nome|string|false|none|none|
|»»» cnpj|string|false|none|none|
|» pagination|object|false|none|none|
|»» page|number|false|none|none|
|»» limit|number|false|none|none|
|»» total|number|false|none|none|
|»» totalPages|number|false|none|none|
|»» hasNext|boolean|false|none|none|
|»» hasPrev|boolean|false|none|none|

<aside class="success">
This operation does not require authentication
</aside>

## Obter colaborador por ID

<a id="opIdColaboradoresController_obterColaborador"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/colaboradores/{id} \
  -H 'Accept: application/json'

```

```http
GET /api/colaboradores/{id} HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('/api/colaboradores/{id}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('/api/colaboradores/{id}', headers = headers)

print(r.json())

```

`GET /api/colaboradores/{id}`

Retorna os detalhes de um colaborador específico

<h3 id="obter-colaborador-por-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string|true|ID do colaborador (UUID)|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nome": "string",
    "cpf": "string",
    "cpfFormatado": "string",
    "matricula": "string",
    "cargo": "string",
    "setor": "string",
    "ativo": true,
    "contratada": {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "nome": "string",
      "cnpj": "string"
    }
  }
}
```

<h3 id="obter-colaborador-por-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Colaborador encontrado|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Colaborador não encontrado|None|

<h3 id="obter-colaborador-por-id-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nome|string|false|none|none|
|»» cpf|string|false|none|none|
|»» cpfFormatado|string|false|none|none|
|»» matricula|string¦null|false|none|none|
|»» cargo|string¦null|false|none|none|
|»» setor|string¦null|false|none|none|
|»» ativo|boolean|false|none|none|
|»» contratada|object|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» nome|string|false|none|none|
|»»» cnpj|string|false|none|none|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="epi-backend-api-notas-movimentacao">notas-movimentacao</h1>

Notas de movimentação de estoque

## Criar nova nota de movimentação em rascunho

<a id="opIdNotasMovimentacaoController_criarNota"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/notas-movimentacao \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/notas-movimentacao HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/notas-movimentacao', headers = headers)

print(r.json())

```

`POST /api/notas-movimentacao`

Cria uma nova nota de movimentação no status RASCUNHO para posterior adição de itens

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "numero": "ENT-2024-000001",
    "tipo": "ENTRADA",
    "status": "RASCUNHO"
  }
}
```

<h3 id="criar-nova-nota-de-movimentação-em-rascunho-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Nota criada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Almoxarifado não encontrado|None|

<h3 id="criar-nova-nota-de-movimentação-em-rascunho-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» numero|string|false|none|none|
|»» tipo|string|false|none|none|
|»» status|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|tipo|ENTRADA|
|tipo|TRANSFERENCIA|
|tipo|DESCARTE|
|tipo|AJUSTE|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Listar notas de movimentação

<a id="opIdNotasMovimentacaoController_listarNotas"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/notas-movimentacao \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/notas-movimentacao HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/notas-movimentacao', headers = headers)

print(r.json())

```

`GET /api/notas-movimentacao`

Lista notas com filtros opcionais e paginação

<h3 id="listar-notas-de-movimentação-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|dataFim|query|string(date)|false|none|
|dataInicio|query|string(date)|false|none|
|status|query|string|false|none|
|tipo|query|string|false|none|
|numero|query|string|false|Filtrar por número da nota|
|limit|query|number|false|Itens por página (padrão: 10, máx: 100)|
|page|query|number|false|Página (padrão: 1)|

#### Enumerated Values

|Parameter|Value|
|---|---|
|status|RASCUNHO|
|status|CONCLUIDA|
|status|CANCELADA|
|tipo|ENTRADA|
|tipo|TRANSFERENCIA|
|tipo|DESCARTE|
|tipo|AJUSTE|

<h3 id="listar-notas-de-movimentação-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de notas recuperada com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Resumo de notas de movimentação

<a id="opIdNotasMovimentacaoController_obterResumoNotas"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/notas-movimentacao/resumo \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/notas-movimentacao/resumo HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/resumo',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/notas-movimentacao/resumo', headers = headers)

print(r.json())

```

`GET /api/notas-movimentacao/resumo`

Lista notas com informações resumidas para exibição em tabelas

<h3 id="resumo-de-notas-de-movimentação-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|dataFim|query|string(date)|false|none|
|dataInicio|query|string(date)|false|none|
|usuarioId|query|string|false|ID do usuário responsável|
|almoxarifadoId|query|string|false|ID do almoxarifado (origem ou destino)|
|status|query|string|false|none|
|tipo|query|string|false|none|
|numero|query|string|false|Filtrar por número da nota|
|limit|query|number|false|Itens por página (padrão: 10, máx: 100)|
|page|query|number|false|Página (padrão: 1)|

#### Enumerated Values

|Parameter|Value|
|---|---|
|status|RASCUNHO|
|status|CONCLUIDA|
|status|CANCELADA|
|tipo|ENTRADA|
|tipo|TRANSFERENCIA|
|tipo|DESCARTE|
|tipo|AJUSTE|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": [
    {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "numero": "ENT-2025-000014",
      "tipo": "ENTRADA",
      "status": "RASCUNHO",
      "responsavel_nome": "Administrador Sistema",
      "almoxarifado_nome": "Almoxarifado RJ",
      "total_itens": 5,
      "valor_total": 1250,
      "data_documento": "2025-07-07",
      "observacoes": "Compra de EPIs"
    }
  ],
  "pagination": {
    "page": 0,
    "limit": 0,
    "total": 0,
    "totalPages": 0,
    "hasNext": true,
    "hasPrev": true
  }
}
```

<h3 id="resumo-de-notas-de-movimentação-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Resumo de notas recuperado com sucesso|Inline|

<h3 id="resumo-de-notas-de-movimentação-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|[object]|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» numero|string|false|none|none|
|»» tipo|string|false|none|none|
|»» status|string|false|none|none|
|»» responsavel_nome|string|false|none|none|
|»» almoxarifado_nome|string|false|none|none|
|»» total_itens|number|false|none|none|
|»» valor_total|number¦null|false|none|none|
|»» data_documento|string(date)|false|none|none|
|»» observacoes|string¦null|false|none|none|
|» pagination|object|false|none|none|
|»» page|number|false|none|none|
|»» limit|number|false|none|none|
|»» total|number|false|none|none|
|»» totalPages|number|false|none|none|
|»» hasNext|boolean|false|none|none|
|»» hasPrev|boolean|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|tipo|ENTRADA|
|tipo|TRANSFERENCIA|
|tipo|DESCARTE|
|tipo|AJUSTE|
|status|RASCUNHO|
|status|CONCLUIDA|
|status|CANCELADA|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Listar notas em rascunho

<a id="opIdNotasMovimentacaoController_listarRascunhos"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/notas-movimentacao/rascunhos \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/notas-movimentacao/rascunhos HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/rascunhos',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/notas-movimentacao/rascunhos', headers = headers)

print(r.json())

```

`GET /api/notas-movimentacao/rascunhos`

Lista apenas as notas no status RASCUNHO do usuário atual

<h3 id="listar-notas-em-rascunho-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Rascunhos recuperados com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Buscar nota por ID

<a id="opIdNotasMovimentacaoController_obterNota"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/notas-movimentacao/{id} \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/notas-movimentacao/{id} HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/{id}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/notas-movimentacao/{id}', headers = headers)

print(r.json())

```

`GET /api/notas-movimentacao/{id}`

Retorna os detalhes completos de uma nota, incluindo itens

<h3 id="buscar-nota-por-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID da nota|

<h3 id="buscar-nota-por-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Nota encontrada|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Nota não encontrada|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Atualizar observações da nota

<a id="opIdNotasMovimentacaoController_atualizarNota"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /api/notas-movimentacao/{id} \
  -H 'Authorization: Bearer {access-token}'

```

```http
PUT /api/notas-movimentacao/{id} HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/{id}',
{
  method: 'PUT',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.put('/api/notas-movimentacao/{id}', headers = headers)

print(r.json())

```

`PUT /api/notas-movimentacao/{id}`

Atualiza apenas as observações de uma nota em rascunho

<h3 id="atualizar-observações-da-nota-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

<h3 id="atualizar-observações-da-nota-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Nota atualizada com sucesso|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Nota não está em rascunho|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Nota não encontrada|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Excluir nota em rascunho

<a id="opIdNotasMovimentacaoController_excluirNota"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /api/notas-movimentacao/{id} \
  -H 'Authorization: Bearer {access-token}'

```

```http
DELETE /api/notas-movimentacao/{id} HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/{id}',
{
  method: 'DELETE',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.delete('/api/notas-movimentacao/{id}', headers = headers)

print(r.json())

```

`DELETE /api/notas-movimentacao/{id}`

Exclui uma nota que está no status RASCUNHO

<h3 id="excluir-nota-em-rascunho-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

<h3 id="excluir-nota-em-rascunho-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Nota excluída com sucesso|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Nota não pode ser excluída|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Nota não encontrada|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Adicionar item à nota

<a id="opIdNotasMovimentacaoController_adicionarItem"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/notas-movimentacao/{id}/itens \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/notas-movimentacao/{id}/itens HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/{id}/itens',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/notas-movimentacao/{id}/itens', headers = headers)

print(r.json())

```

`POST /api/notas-movimentacao/{id}/itens`

Adiciona um novo item a uma nota em rascunho

<h3 id="adicionar-item-à-nota-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

<h3 id="adicionar-item-à-nota-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Item adicionado com sucesso|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos ou nota não editável|None|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Tipo de EPI já adicionado na nota|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Atualizar quantidade do item

<a id="opIdNotasMovimentacaoController_atualizarQuantidadeItem"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /api/notas-movimentacao/{id}/itens/{tipoEpiId} \
  -H 'Authorization: Bearer {access-token}'

```

```http
PUT /api/notas-movimentacao/{id}/itens/{tipoEpiId} HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/{id}/itens/{tipoEpiId}',
{
  method: 'PUT',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.put('/api/notas-movimentacao/{id}/itens/{tipoEpiId}', headers = headers)

print(r.json())

```

`PUT /api/notas-movimentacao/{id}/itens/{tipoEpiId}`

Atualiza a quantidade de um item específico na nota

<h3 id="atualizar-quantidade-do-item-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID da nota|
|tipoEpiId|path|string(uuid)|true|ID do tipo de EPI|

<h3 id="atualizar-quantidade-do-item-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Quantidade atualizada com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Remover item da nota

<a id="opIdNotasMovimentacaoController_removerItem"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /api/notas-movimentacao/{id}/itens/{itemId} \
  -H 'Authorization: Bearer {access-token}'

```

```http
DELETE /api/notas-movimentacao/{id}/itens/{itemId} HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/{id}/itens/{itemId}',
{
  method: 'DELETE',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.delete('/api/notas-movimentacao/{id}/itens/{itemId}', headers = headers)

print(r.json())

```

`DELETE /api/notas-movimentacao/{id}/itens/{itemId}`

Remove um item específico de uma nota em rascunho

<h3 id="remover-item-da-nota-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID da nota|
|itemId|path|string(uuid)|true|ID do item|

<h3 id="remover-item-da-nota-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Item removido com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Concluir nota de movimentação

<a id="opIdNotasMovimentacaoController_concluirNota"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/notas-movimentacao/{id}/concluir \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/notas-movimentacao/{id}/concluir HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/{id}/concluir',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/notas-movimentacao/{id}/concluir', headers = headers)

print(r.json())

```

`POST /api/notas-movimentacao/{id}/concluir`

Processa uma nota em rascunho, criando movimentações e atualizando estoque

<h3 id="concluir-nota-de-movimentação-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "notaConcluida": {},
    "movimentacoesCriadas": [],
    "itensProcessados": []
  }
}
```

<h3 id="concluir-nota-de-movimentação-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Nota concluída com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Nota não pode ser concluída ou estoque insuficiente|None|

<h3 id="concluir-nota-de-movimentação-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» notaConcluida|object|false|none|none|
|»» movimentacoesCriadas|array|false|none|none|
|»» itensProcessados|array|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Cancelar nota de movimentação

<a id="opIdNotasMovimentacaoController_cancelarNota"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/notas-movimentacao/{id}/cancelar \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/notas-movimentacao/{id}/cancelar HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/{id}/cancelar',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/notas-movimentacao/{id}/cancelar', headers = headers)

print(r.json())

```

`POST /api/notas-movimentacao/{id}/cancelar`

Cancela uma nota, gerando estornos se necessário

<h3 id="cancelar-nota-de-movimentação-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

<h3 id="cancelar-nota-de-movimentação-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Nota cancelada com sucesso|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Nota não pode ser cancelada|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Validar se nota pode ser cancelada

<a id="opIdNotasMovimentacaoController_validarCancelamento"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/notas-movimentacao/{id}/validar-cancelamento \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/notas-movimentacao/{id}/validar-cancelamento HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/notas-movimentacao/{id}/validar-cancelamento',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/notas-movimentacao/{id}/validar-cancelamento', headers = headers)

print(r.json())

```

`GET /api/notas-movimentacao/{id}/validar-cancelamento`

Verifica se uma nota pode ser cancelada e retorna informações sobre o impacto

<h3 id="validar-se-nota-pode-ser-cancelada-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

<h3 id="validar-se-nota-pode-ser-cancelada-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Validação realizada|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

<h1 id="epi-backend-api-estoque">estoque</h1>

Consultas de estoque

## Relatório de posição de estoque

<a id="opIdEstoqueController_obterPosicaoEstoque"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/estoque/posicao \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/estoque/posicao HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/posicao',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/estoque/posicao', headers = headers)

print(r.json())

```

`GET /api/estoque/posicao`

Gera relatório detalhado da posição atual do estoque com filtros opcionais

<h3 id="relatório-de-posição-de-estoque-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|apenasAbaixoMinimo|query|boolean|false|Mostrar apenas itens abaixo do estoque mínimo|
|apenasComSaldo|query|boolean|false|Mostrar apenas itens com saldo|
|unidadeNegocioId|query|string(uuid)|false|none|
|tipoEpiId|query|string(uuid)|false|none|
|almoxarifadoId|query|string(uuid)|false|none|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "itens": [],
    "resumo": {},
    "dataGeracao": "2019-08-24T14:15:22Z"
  }
}
```

<h3 id="relatório-de-posição-de-estoque-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Relatório gerado com sucesso|Inline|

<h3 id="relatório-de-posição-de-estoque-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» itens|array|false|none|none|
|»» resumo|object|false|none|none|
|»» dataGeracao|string(date-time)|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Obter kardex de item

<a id="opIdEstoqueController_obterKardex"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/estoque/kardex/{almoxarifadoId}/{tipoEpiId} \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/estoque/kardex/{almoxarifadoId}/{tipoEpiId} HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/kardex/{almoxarifadoId}/{tipoEpiId}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/estoque/kardex/{almoxarifadoId}/{tipoEpiId}', headers = headers)

print(r.json())

```

`GET /api/estoque/kardex/{almoxarifadoId}/{tipoEpiId}`

Retorna o kardex (histórico de movimentações) de um item específico

<h3 id="obter-kardex-de-item-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|almoxarifadoId|path|string|true|ID do almoxarifado (UUID ou ID customizado)|
|tipoEpiId|path|string|true|ID do tipo de EPI (UUID ou ID customizado)|
|dataFim|query|string(date)|false|none|
|dataInicio|query|string(date)|false|none|

<h3 id="obter-kardex-de-item-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Kardex obtido com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Análise de giro de estoque

<a id="opIdEstoqueController_obterAnaliseGiro"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/estoque/analise-giro \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/estoque/analise-giro HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/analise-giro',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/estoque/analise-giro', headers = headers)

print(r.json())

```

`GET /api/estoque/analise-giro`

Analisa o giro de estoque por período para identificar itens com movimentação rápida ou lenta

<h3 id="análise-de-giro-de-estoque-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|periodo|query|string|false|none|
|almoxarifadoId|query|string(uuid)|false|none|

#### Enumerated Values

|Parameter|Value|
|---|---|
|periodo|MENSAL|
|periodo|TRIMESTRAL|
|periodo|SEMESTRAL|
|periodo|ANUAL|

<h3 id="análise-de-giro-de-estoque-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Análise de giro obtida com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Realizar ajuste direto de estoque

<a id="opIdEstoqueController_realizarAjusteDirecto"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/estoque/ajuste-direto \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/estoque/ajuste-direto HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/ajuste-direto',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/estoque/ajuste-direto', headers = headers)

print(r.json())

```

`POST /api/estoque/ajuste-direto`

Executa um ajuste direto na quantidade de um item específico

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "movimentacaoId": "9a265669-d988-4190-ac92-10f8ba3d68eb",
    "tipoEpiId": "f5290c59-c2cc-4868-a32c-ea884f098074",
    "saldoAnterior": 0,
    "saldoPosterior": 0,
    "diferenca": 0,
    "observacoes": "string"
  }
}
```

<h3 id="realizar-ajuste-direto-de-estoque-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Ajuste realizado com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos ou permissão negada|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Almoxarifado ou tipo de EPI não encontrado|None|

<h3 id="realizar-ajuste-direto-de-estoque-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» movimentacaoId|string(uuid)|false|none|none|
|»» tipoEpiId|string(uuid)|false|none|none|
|»» saldoAnterior|number|false|none|none|
|»» saldoPosterior|number|false|none|none|
|»» diferenca|number|false|none|none|
|»» observacoes|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Simular ajuste de estoque

<a id="opIdEstoqueController_simularAjuste"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/estoque/ajuste-direto/simular \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/estoque/ajuste-direto/simular HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/ajuste-direto/simular',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/estoque/ajuste-direto/simular', headers = headers)

print(r.json())

```

`POST /api/estoque/ajuste-direto/simular`

Simula um ajuste de estoque para visualizar o impacto antes da execução

<h3 id="simular-ajuste-de-estoque-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Simulação realizada com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Executar inventário completo

<a id="opIdEstoqueController_executarInventario"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/estoque/inventario \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/estoque/inventario HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/inventario',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/estoque/inventario', headers = headers)

print(r.json())

```

`POST /api/estoque/inventario`

Processa múltiplos ajustes de inventário baseados na contagem física

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "ajustesRealizados": [],
    "totalItensProcessados": 0,
    "totalAjustesPositivos": 0,
    "totalAjustesNegativos": 0,
    "valorTotalAjustes": 0
  }
}
```

<h3 id="executar-inventário-completo-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Inventário processado com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos ou permissão negada|None|

<h3 id="executar-inventário-completo-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» ajustesRealizados|array|false|none|none|
|»» totalItensProcessados|number|false|none|none|
|»» totalAjustesPositivos|number|false|none|none|
|»» totalAjustesNegativos|number|false|none|none|
|»» valorTotalAjustes|number|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Validar divergências de inventário

<a id="opIdEstoqueController_validarDivergenciasInventario"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/estoque/inventario/validar-divergencias \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/estoque/inventario/validar-divergencias HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/inventario/validar-divergencias',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/estoque/inventario/validar-divergencias', headers = headers)

print(r.json())

```

`POST /api/estoque/inventario/validar-divergencias`

Compara contagens de inventário com saldos do sistema e identifica divergências

<h3 id="validar-divergências-de-inventário-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Validação realizada com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Histórico de ajustes de estoque

<a id="opIdEstoqueController_obterHistoricoAjustes"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/estoque/ajustes/historico \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/estoque/ajustes/historico HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/ajustes/historico',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/estoque/ajustes/historico', headers = headers)

print(r.json())

```

`GET /api/estoque/ajustes/historico`

Lista o histórico de ajustes realizados com filtros opcionais

<h3 id="histórico-de-ajustes-de-estoque-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|number|false|Itens por página (padrão: 10, máx: 100)|
|page|query|number|false|Página (padrão: 1)|
|dataFim|query|string(date)|false|none|
|dataInicio|query|string(date)|false|none|
|tipoEpiId|query|string(uuid)|false|none|
|almoxarifadoId|query|string(uuid)|false|none|

<h3 id="histórico-de-ajustes-de-estoque-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Histórico obtido com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Resumo geral do estoque

<a id="opIdEstoqueController_obterResumoEstoque"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/estoque/resumo \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/estoque/resumo HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/resumo',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/estoque/resumo', headers = headers)

print(r.json())

```

`GET /api/estoque/resumo`

Retorna indicadores e métricas gerais do estoque

<h3 id="resumo-geral-do-estoque-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|almoxarifadoId|query|string(uuid)|false|none|
|unidadeNegocioId|query|string(uuid)|false|none|

<h3 id="resumo-geral-do-estoque-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Resumo obtido com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Alertas de estoque

<a id="opIdEstoqueController_obterAlertasEstoque"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/estoque/alertas \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/estoque/alertas HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/alertas',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/estoque/alertas', headers = headers)

print(r.json())

```

`GET /api/estoque/alertas`

Lista itens que requerem atenção (estoque baixo, crítico ou zerado)

<h3 id="alertas-de-estoque-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|almoxarifadoId|query|string(uuid)|false|none|
|unidadeNegocioId|query|string(uuid)|false|none|
|severidade|query|string|false|none|

#### Enumerated Values

|Parameter|Value|
|---|---|
|severidade|BAIXO|
|severidade|CRITICO|
|severidade|ZERO|

<h3 id="alertas-de-estoque-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Alertas obtidos com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Listar itens de estoque

<a id="opIdEstoqueController_listarEstoqueItens"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/estoque/itens \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/estoque/itens HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/itens',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/estoque/itens', headers = headers)

print(r.json())

```

`GET /api/estoque/itens`

Lista itens de estoque com filtros opcionais e paginação

<h3 id="listar-itens-de-estoque-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|number|false|Itens por página (padrão: 50, máx: 100)|
|page|query|number|false|Página (padrão: 1)|
|apenasComSaldo|query|boolean|false|Apenas itens com saldo > 0|
|apenasDisponiveis|query|boolean|false|Apenas itens disponíveis|
|tipoEpiId|query|string(uuid)|false|Filtrar por tipo de EPI|
|almoxarifadoId|query|string(uuid)|false|Filtrar por almoxarifado|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 0,
      "limit": 0,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

<h3 id="listar-itens-de-estoque-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de itens de estoque|Inline|

<h3 id="listar-itens-de-estoque-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» items|array|false|none|none|
|»» pagination|object|false|none|none|
|»»» page|number|false|none|none|
|»»» limit|number|false|none|none|
|»»» total|number|false|none|none|
|»»» totalPages|number|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Listar almoxarifados

<a id="opIdEstoqueController_listarAlmoxarifados"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/estoque/almoxarifados \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/estoque/almoxarifados HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/estoque/almoxarifados',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/estoque/almoxarifados', headers = headers)

print(r.json())

```

`GET /api/estoque/almoxarifados`

Lista almoxarifados com filtros opcionais

<h3 id="listar-almoxarifados-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|incluirContadores|query|boolean|false|Incluir contagem de itens|
|unidadeNegocioId|query|string(uuid)|false|Filtrar por unidade de negócio|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": [
    {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "nome": "string",
      "isPrincipal": true,
      "unidadeNegocioId": "e6c1e2b1-45f8-48f2-a0be-1cc7bc38c178",
      "createdAt": "2019-08-24T14:15:22Z",
      "unidadeNegocio": {
        "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
        "nome": "string",
        "codigo": "string"
      },
      "_count": {
        "estoqueItens": 0
      }
    }
  ]
}
```

<h3 id="listar-almoxarifados-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de almoxarifados|Inline|

<h3 id="listar-almoxarifados-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|[object]|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nome|string|false|none|none|
|»» isPrincipal|boolean|false|none|none|
|»» unidadeNegocioId|string(uuid)|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|»» unidadeNegocio|object|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» nome|string|false|none|none|
|»»» codigo|string|false|none|none|
|»» _count|object|false|none|none|
|»»» estoqueItens|number|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

<h1 id="epi-backend-api-relatorios">relatorios</h1>

Relatórios gerenciais

## Dashboard principal

<a id="opIdDashboardController_obterDashboard"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/relatorios/dashboard \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/relatorios/dashboard HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/relatorios/dashboard',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/relatorios/dashboard', headers = headers)

print(r.json())

```

`GET /api/relatorios/dashboard`

Retorna indicadores gerais, alertas e métricas para o painel principal

<h3 id="dashboard-principal-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|periodo|query|string|false|none|
|almoxarifadoId|query|string(uuid)|false|none|
|unidadeNegocioId|query|string(uuid)|false|none|

#### Enumerated Values

|Parameter|Value|
|---|---|
|periodo|ULTIMO_MES|
|periodo|ULTIMO_TRIMESTRE|
|periodo|ULTIMO_SEMESTRE|
|periodo|ULTIMO_ANO|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "indicadoresGerais": [],
    "estoqueAlertas": {},
    "entregasRecentes": {},
    "vencimentosProximos": {},
    "episPorCategoria": {},
    "dataAtualizacao": "2019-08-24T14:15:22Z"
  }
}
```

<h3 id="dashboard-principal-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Dashboard carregado com sucesso|Inline|

<h3 id="dashboard-principal-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» indicadoresGerais|array|false|none|none|
|»» estoqueAlertas|object|false|none|none|
|»» entregasRecentes|object|false|none|none|
|»» vencimentosProximos|object|false|none|none|
|»» episPorCategoria|object|false|none|none|
|»» dataAtualizacao|string(date-time)|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Estatísticas de entregas para dashboard

<a id="opIdDashboardController_obterEstatisticasEntregas"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/relatorios/dashboard/estatisticas-entregas \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/relatorios/dashboard/estatisticas-entregas HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/relatorios/dashboard/estatisticas-entregas',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/relatorios/dashboard/estatisticas-entregas', headers = headers)

print(r.json())

```

`GET /api/relatorios/dashboard/estatisticas-entregas`

Retorna métricas específicas de entregas do período

<h3 id="estatísticas-de-entregas-para-dashboard-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|periodo|query|string|false|none|
|almoxarifadoId|query|string(uuid)|false|none|
|unidadeNegocioId|query|string(uuid)|false|none|

#### Enumerated Values

|Parameter|Value|
|---|---|
|periodo|ULTIMO_MES|
|periodo|ULTIMO_TRIMESTRE|
|periodo|ULTIMO_SEMESTRE|
|periodo|ULTIMO_ANO|

<h3 id="estatísticas-de-entregas-para-dashboard-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Estatísticas de entregas obtidas|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Vencimentos próximos para dashboard

<a id="opIdDashboardController_obterVencimentosProximos"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/relatorios/dashboard/vencimentos-proximos \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/relatorios/dashboard/vencimentos-proximos HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/relatorios/dashboard/vencimentos-proximos',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/relatorios/dashboard/vencimentos-proximos', headers = headers)

print(r.json())

```

`GET /api/relatorios/dashboard/vencimentos-proximos`

Retorna EPIs próximos ao vencimento

<h3 id="vencimentos-próximos-para-dashboard-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|almoxarifadoId|query|string(uuid)|false|none|
|unidadeNegocioId|query|string(uuid)|false|none|

<h3 id="vencimentos-próximos-para-dashboard-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Vencimentos próximos obtidos|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Relatório de descartes

<a id="opIdRelatorioDescartesController_relatorioDescartes"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/relatorios/descartes \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/relatorios/descartes HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/relatorios/descartes',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/relatorios/descartes', headers = headers)

print(r.json())

```

`GET /api/relatorios/descartes`

Lista todos os descartes de EPIs com filtros avançados e estatísticas

<h3 id="relatório-de-descartes-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|responsavelId|query|string(uuid)|false|none|
|dataFim|query|string(date)|false|none|
|dataInicio|query|string(date)|false|none|
|contratadaId|query|string(uuid)|false|none|
|tipoEpiId|query|string(uuid)|false|none|
|almoxarifadoId|query|string(uuid)|false|none|

<h3 id="relatório-de-descartes-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Relatório de descartes gerado com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Estatísticas de descartes

<a id="opIdRelatorioDescartesController_estatisticasDescartes"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/relatorios/descartes/estatisticas \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/relatorios/descartes/estatisticas HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/relatorios/descartes/estatisticas',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/relatorios/descartes/estatisticas', headers = headers)

print(r.json())

```

`GET /api/relatorios/descartes/estatisticas`

Retorna estatísticas resumidas sobre descartes dos últimos 30 dias

<h3 id="estatísticas-de-descartes-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Estatísticas de descartes obtidas com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Saúde do sistema

<a id="opIdRelatorioSaudeController_obterSaudeSistema"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/relatorios/saude \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/relatorios/saude HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/relatorios/saude',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/relatorios/saude', headers = headers)

print(r.json())

```

`GET /api/relatorios/saude`

Monitora o status geral do sistema, alertas e performance

<h3 id="saúde-do-sistema-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|incluirPerformance|query|boolean|false|none|
|incluirEstatisticas|query|boolean|false|none|
|incluirAlertas|query|boolean|false|none|

<h3 id="saúde-do-sistema-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Status do sistema obtido|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Relatório de movimentações

<a id="opIdRelatorioMovimentacoesController_relatorioMovimentacoes"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/relatorios/movimentacoes \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/relatorios/movimentacoes HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/relatorios/movimentacoes',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/relatorios/movimentacoes', headers = headers)

print(r.json())

```

`GET /api/relatorios/movimentacoes`

Lista todas as movimentações de estoque com filtros detalhados para auditoria

<h3 id="relatório-de-movimentações-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|number|false|Itens por página (padrão: 10, máx: 100)|
|page|query|number|false|Página (padrão: 1)|
|dataFim|query|string(date)|false|Data final do período|
|dataInicio|query|string(date)|false|Data inicial do período|
|usuarioId|query|string(uuid)|false|Filtrar por responsável|
|tipoMovimentacao|query|string|false|Filtrar por tipo de movimentação específico|
|tipoEpiId|query|string(uuid)|false|Filtrar por tipo de EPI|
|almoxarifadoId|query|string(uuid)|false|Filtrar por almoxarifado|

#### Enumerated Values

|Parameter|Value|
|---|---|
|tipoMovimentacao|ENTRADA_NOTA|
|tipoMovimentacao|SAIDA_ENTREGA|
|tipoMovimentacao|ENTRADA_DEVOLUCAO|
|tipoMovimentacao|SAIDA_TRANSFERENCIA|
|tipoMovimentacao|ENTRADA_TRANSFERENCIA|
|tipoMovimentacao|SAIDA_DESCARTE|
|tipoMovimentacao|AJUSTE_POSITIVO|
|tipoMovimentacao|AJUSTE_NEGATIVO|
|tipoMovimentacao|ESTORNO_ENTRADA_NOTA|
|tipoMovimentacao|ESTORNO_SAIDA_ENTREGA|
|tipoMovimentacao|ESTORNO_ENTRADA_DEVOLUCAO|
|tipoMovimentacao|ESTORNO_SAIDA_DESCARTE|
|tipoMovimentacao|ESTORNO_SAIDA_TRANSFERENCIA|
|tipoMovimentacao|ESTORNO_ENTRADA_TRANSFERENCIA|
|tipoMovimentacao|ESTORNO_AJUSTE_POSITIVO|
|tipoMovimentacao|ESTORNO_AJUSTE_NEGATIVO|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "movimentacoes": [
      {
        "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
        "data": "2019-08-24T14:15:22Z",
        "almoxarifadoNome": "string",
        "tipoEpiNome": "string",
        "tipoMovimentacao": "string",
        "quantidade": 0,
        "usuarioNome": "string",
        "observacoes": "string",
        "documento": "string"
      }
    ],
    "resumo": {
      "totalMovimentacoes": 0,
      "totalEntradas": 0,
      "totalSaidas": 0,
      "saldoInicialPeriodo": 0,
      "saldoFinalPeriodo": 0,
      "variacao": 0
    },
    "dataGeracao": "2019-08-24T14:15:22Z"
  },
  "message": "string"
}
```

<h3 id="relatório-de-movimentações-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Relatório de movimentações gerado com sucesso|Inline|

<h3 id="relatório-de-movimentações-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» movimentacoes|[object]|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» data|string(date-time)|false|none|none|
|»»» almoxarifadoNome|string|false|none|none|
|»»» tipoEpiNome|string|false|none|none|
|»»» tipoMovimentacao|string|false|none|none|
|»»» quantidade|number|false|none|none|
|»»» usuarioNome|string|false|none|none|
|»»» observacoes|string|false|none|none|
|»»» documento|string|false|none|none|
|»» resumo|object|false|none|none|
|»»» totalMovimentacoes|number|false|none|none|
|»»» totalEntradas|number|false|none|none|
|»»» totalSaidas|number|false|none|none|
|»»» saldoInicialPeriodo|number|false|none|none|
|»»» saldoFinalPeriodo|number|false|none|none|
|»»» variacao|number|false|none|none|
|»» dataGeracao|string(date-time)|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

<h1 id="epi-backend-api-health">Health</h1>

## HealthController_checkHealth

<a id="opIdHealthController_checkHealth"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /health

```

```http
GET /health HTTP/1.1

```

```javascript

fetch('/health',
{
  method: 'GET'

})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests

r = requests.get('/health')

print(r.json())

```

`GET /health`

<h3 id="healthcontroller_checkhealth-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|None|

<aside class="success">
This operation does not require authentication
</aside>

## HealthController_runSeed

<a id="opIdHealthController_runSeed"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/health/seed

```

```http
POST /api/health/seed HTTP/1.1

```

```javascript

fetch('/api/health/seed',
{
  method: 'POST'

})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests

r = requests.post('/api/health/seed')

print(r.json())

```

`POST /api/health/seed`

<h3 id="healthcontroller_runseed-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|none|None|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="epi-backend-api-contratadas">contratadas</h1>

## Criar nova contratada

<a id="opIdContratadaController_criarContratada"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/contratadas \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/contratadas HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/contratadas',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/contratadas', headers = headers)

print(r.json())

```

`POST /api/contratadas`

Cria uma nova empresa contratada no sistema

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nome": "Empresa Contratada LTDA",
    "cnpj": "12345678000190",
    "cnpjFormatado": "12.345.678/0001-90",
    "createdAt": "2019-08-24T14:15:22Z"
  }
}
```

<h3 id="criar-nova-contratada-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Contratada criada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|CNPJ já cadastrado|None|

<h3 id="criar-nova-contratada-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nome|string|false|none|none|
|»» cnpj|string|false|none|none|
|»» cnpjFormatado|string|false|none|none|
|»» createdAt|string(date-time)|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Listar contratadas

<a id="opIdContratadaController_listarContratadas"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/contratadas \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/contratadas HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/contratadas',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/contratadas', headers = headers)

print(r.json())

```

`GET /api/contratadas`

Lista todas as contratadas com filtros opcionais

<h3 id="listar-contratadas-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|cnpj|query|string|false|Filtrar por CNPJ|
|nome|query|string|false|Filtrar por nome|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "contratadas": [
      {
        "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
        "nome": "string",
        "cnpj": "string",
        "cnpjFormatado": "string",
        "createdAt": "2019-08-24T14:15:22Z"
      }
    ],
    "total": 0
  }
}
```

<h3 id="listar-contratadas-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de contratadas|Inline|

<h3 id="listar-contratadas-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» contratadas|[object]|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» nome|string|false|none|none|
|»»» cnpj|string|false|none|none|
|»»» cnpjFormatado|string|false|none|none|
|»»» createdAt|string(date-time)|false|none|none|
|»» total|number|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Obter estatísticas das contratadas

<a id="opIdContratadaController_obterEstatisticas"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/contratadas/estatisticas \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/contratadas/estatisticas HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/contratadas/estatisticas',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/contratadas/estatisticas', headers = headers)

print(r.json())

```

`GET /api/contratadas/estatisticas`

Retorna estatísticas gerais das contratadas e colaboradores vinculados

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "total": 0,
    "colaboradoresVinculados": 0,
    "colaboradoresSemContratada": 0,
    "topContratadas": [
      {
        "contratada": {
          "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
          "nome": "string",
          "cnpjFormatado": "string"
        },
        "totalColaboradores": 0
      }
    ]
  }
}
```

<h3 id="obter-estatísticas-das-contratadas-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Estatísticas das contratadas|Inline|

<h3 id="obter-estatísticas-das-contratadas-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» total|number|false|none|none|
|»» colaboradoresVinculados|number|false|none|none|
|»» colaboradoresSemContratada|number|false|none|none|
|»» topContratadas|[object]|false|none|none|
|»»» contratada|object|false|none|none|
|»»»» id|string(uuid)|false|none|none|
|»»»» nome|string|false|none|none|
|»»»» cnpjFormatado|string|false|none|none|
|»»» totalColaboradores|number|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Buscar contratadas por nome

<a id="opIdContratadaController_buscarPorNome"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/contratadas/buscar?nome=string \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/contratadas/buscar?nome=string HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/contratadas/buscar?nome=string',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/contratadas/buscar', params={
  'nome': 'string'
}, headers = headers)

print(r.json())

```

`GET /api/contratadas/buscar`

Busca contratadas por nome (limitado a 10 resultados)

<h3 id="buscar-contratadas-por-nome-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|nome|query|string|true|Nome para busca|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": [
    {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "nome": "string",
      "cnpj": "string",
      "cnpjFormatado": "string",
      "createdAt": "2019-08-24T14:15:22Z"
    }
  ]
}
```

<h3 id="buscar-contratadas-por-nome-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Resultados da busca|Inline|

<h3 id="buscar-contratadas-por-nome-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|[object]|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nome|string|false|none|none|
|»» cnpj|string|false|none|none|
|»» cnpjFormatado|string|false|none|none|
|»» createdAt|string(date-time)|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Obter contratada por ID

<a id="opIdContratadaController_obterContratada"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/contratadas/{id} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/contratadas/{id} HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/contratadas/{id}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/contratadas/{id}', headers = headers)

print(r.json())

```

`GET /api/contratadas/{id}`

Retorna os dados de uma contratada específica

<h3 id="obter-contratada-por-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID da contratada|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nome": "string",
    "cnpj": "string",
    "cnpjFormatado": "string",
    "createdAt": "2019-08-24T14:15:22Z"
  }
}
```

<h3 id="obter-contratada-por-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Dados da contratada|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Contratada não encontrada|None|

<h3 id="obter-contratada-por-id-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nome|string|false|none|none|
|»» cnpj|string|false|none|none|
|»» cnpjFormatado|string|false|none|none|
|»» createdAt|string(date-time)|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Atualizar contratada

<a id="opIdContratadaController_atualizarContratada"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /api/contratadas/{id} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
PUT /api/contratadas/{id} HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/contratadas/{id}',
{
  method: 'PUT',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.put('/api/contratadas/{id}', headers = headers)

print(r.json())

```

`PUT /api/contratadas/{id}`

Atualiza os dados de uma contratada existente

<h3 id="atualizar-contratada-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID da contratada|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "nome": "string",
    "cnpj": "string",
    "cnpjFormatado": "string",
    "createdAt": "2019-08-24T14:15:22Z"
  }
}
```

<h3 id="atualizar-contratada-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Contratada atualizada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Contratada não encontrada|None|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|CNPJ já cadastrado|None|

<h3 id="atualizar-contratada-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nome|string|false|none|none|
|»» cnpj|string|false|none|none|
|»» cnpjFormatado|string|false|none|none|
|»» createdAt|string(date-time)|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Excluir contratada

<a id="opIdContratadaController_excluirContratada"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /api/contratadas/{id} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
DELETE /api/contratadas/{id} HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/contratadas/{id}',
{
  method: 'DELETE',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.delete('/api/contratadas/{id}', headers = headers)

print(r.json())

```

`DELETE /api/contratadas/{id}`

Exclui uma contratada do sistema (apenas se não houver colaboradores vinculados)

<h3 id="excluir-contratada-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID da contratada|

> Example responses

> 200 Response

```json
{
  "success": true,
  "message": "Contratada excluída com sucesso"
}
```

<h3 id="excluir-contratada-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Contratada excluída com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Não é possível excluir contratada com colaboradores vinculados|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Contratada não encontrada|None|

<h3 id="excluir-contratada-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

<h1 id="epi-backend-api-configuracoes">configuracoes</h1>

## Listar todas as configurações

<a id="opIdConfiguracoesController_listarConfiguracoes"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/configuracoes \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/configuracoes HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/configuracoes',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/configuracoes', headers = headers)

print(r.json())

```

`GET /api/configuracoes`

Lista todas as configurações do sistema com seus valores atuais

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": [
    {
      "chave": "PERMITIR_ESTOQUE_NEGATIVO",
      "valor": "false",
      "valorParsed": false,
      "tipo": "BOOLEAN",
      "descricao": "Permite que o estoque fique negativo durante operações",
      "createdAt": "2019-08-24T14:15:22Z",
      "updatedAt": "2019-08-24T14:15:22Z"
    }
  ],
  "message": "Configurações listadas com sucesso"
}
```

<h3 id="listar-todas-as-configurações-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de configurações retornada com sucesso|Inline|

<h3 id="listar-todas-as-configurações-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|[object]|false|none|none|
|»» chave|string|false|none|none|
|»» valor|string|false|none|none|
|»» valorParsed|any|false|none|none|

*oneOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|boolean|false|none|none|

*xor*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|number|false|none|none|

*xor*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|string|false|none|none|

*continued*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» tipo|string|false|none|none|
|»» descricao|string¦null|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|»» updatedAt|string(date-time)¦null|false|none|none|
|» message|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|chave|PERMITIR_ESTOQUE_NEGATIVO|
|chave|PERMITIR_AJUSTES_FORCADOS|
|chave|ESTOQUE_MINIMO_EQUIPAMENTO|
|tipo|BOOLEAN|
|tipo|NUMBER|
|tipo|STRING|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Obter status do sistema

<a id="opIdConfiguracoesController_obterStatusSistema"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/configuracoes/status \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/configuracoes/status HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/configuracoes/status',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/configuracoes/status', headers = headers)

print(r.json())

```

`GET /api/configuracoes/status`

Retorna o status atual das principais configurações do sistema

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "configuracoes": {
      "permitirEstoqueNegativo": false,
      "permitirAjustesForcados": false,
      "estoqueMinimoEquipamento": 10
    },
    "versao": "3.5.5",
    "ambiente": "production",
    "timestamp": "2019-08-24T14:15:22Z"
  }
}
```

<h3 id="obter-status-do-sistema-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Status do sistema retornado com sucesso|Inline|

<h3 id="obter-status-do-sistema-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» configuracoes|object|false|none|none|
|»»» permitirEstoqueNegativo|boolean|false|none|none|
|»»» permitirAjustesForcados|boolean|false|none|none|
|»»» estoqueMinimoEquipamento|number|false|none|none|
|»» versao|string|false|none|none|
|»» ambiente|string|false|none|none|
|»» timestamp|string(date-time)|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Obter configuração específica

<a id="opIdConfiguracoesController_obterConfiguracao"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/configuracoes/{chave} \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/configuracoes/{chave} HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/configuracoes/{chave}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/configuracoes/{chave}', headers = headers)

print(r.json())

```

`GET /api/configuracoes/{chave}`

Retorna os detalhes de uma configuração específica

<h3 id="obter-configuração-específica-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|chave|path|string|true|Chave da configuração|

#### Enumerated Values

|Parameter|Value|
|---|---|
|chave|PERMITIR_ESTOQUE_NEGATIVO|
|chave|PERMITIR_AJUSTES_FORCADOS|
|chave|ESTOQUE_MINIMO_EQUIPAMENTO|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "chave": "PERMITIR_ESTOQUE_NEGATIVO",
    "valor": "false",
    "valorParsed": false,
    "tipo": "BOOLEAN",
    "descricao": "string",
    "createdAt": "2019-08-24T14:15:22Z",
    "updatedAt": "2019-08-24T14:15:22Z"
  }
}
```

<h3 id="obter-configuração-específica-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Configuração encontrada|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Chave de configuração inválida|None|

<h3 id="obter-configuração-específica-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» chave|string|false|none|none|
|»» valor|string|false|none|none|
|»» valorParsed|boolean|false|none|none|
|»» tipo|string|false|none|none|
|»» descricao|string¦null|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|»» updatedAt|string(date-time)¦null|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Atualizar configuração

<a id="opIdConfiguracoesController_atualizarConfiguracao"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /api/configuracoes/{chave} \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
PUT /api/configuracoes/{chave} HTTP/1.1

Content-Type: application/json
Accept: application/json

```

```javascript
const inputBody = '{
  "valor": "true",
  "descricao": "Permite estoque negativo para operações emergenciais"
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/configuracoes/{chave}',
{
  method: 'PUT',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.put('/api/configuracoes/{chave}', headers = headers)

print(r.json())

```

`PUT /api/configuracoes/{chave}`

Atualiza o valor de uma configuração específica

> Body parameter

```json
{
  "valor": "true",
  "descricao": "Permite estoque negativo para operações emergenciais"
}
```

<h3 id="atualizar-configuração-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|chave|path|string|true|Chave da configuração|
|body|body|object|true|Dados da configuração a ser atualizada|
|» valor|body|string|true|Valor da configuração (string, será convertido conforme o tipo)|
|» descricao|body|string|false|Descrição opcional da configuração|

#### Enumerated Values

|Parameter|Value|
|---|---|
|chave|PERMITIR_ESTOQUE_NEGATIVO|
|chave|PERMITIR_AJUSTES_FORCADOS|
|chave|ESTOQUE_MINIMO_EQUIPAMENTO|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "configuracao": {
      "chave": "PERMITIR_ESTOQUE_NEGATIVO",
      "valor": "true",
      "valorParsed": true,
      "tipo": "BOOLEAN",
      "descricao": "string",
      "createdAt": "2019-08-24T14:15:22Z",
      "updatedAt": "2019-08-24T14:15:22Z"
    },
    "valorAnterior": "false"
  },
  "message": "Configuração atualizada com sucesso"
}
```

<h3 id="atualizar-configuração-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Configuração atualizada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos ou valor incompatível com o tipo|None|

<h3 id="atualizar-configuração-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» configuracao|object|false|none|none|
|»»» chave|string|false|none|none|
|»»» valor|string|false|none|none|
|»»» valorParsed|boolean|false|none|none|
|»»» tipo|string|false|none|none|
|»»» descricao|string¦null|false|none|none|
|»»» createdAt|string(date-time)|false|none|none|
|»»» updatedAt|string(date-time)|false|none|none|
|»» valorAnterior|string|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Atualizar configuração booleana

<a id="opIdConfiguracoesController_atualizarConfiguracaoBoolean"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /api/configuracoes/{chave}/boolean \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
PATCH /api/configuracoes/{chave}/boolean HTTP/1.1

Content-Type: application/json
Accept: application/json

```

```javascript
const inputBody = '{
  "ativo": true,
  "descricao": "Habilitado para operações emergenciais"
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/configuracoes/{chave}/boolean',
{
  method: 'PATCH',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.patch('/api/configuracoes/{chave}/boolean', headers = headers)

print(r.json())

```

`PATCH /api/configuracoes/{chave}/boolean`

Atualiza uma configuração booleana de forma simplificada

> Body parameter

```json
{
  "ativo": true,
  "descricao": "Habilitado para operações emergenciais"
}
```

<h3 id="atualizar-configuração-booleana-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|chave|path|string|true|Chave da configuração booleana|
|body|body|object|true|Valor booleano da configuração|
|» ativo|body|boolean|true|Valor booleano da configuração|
|» descricao|body|string|false|Descrição opcional da configuração|

#### Enumerated Values

|Parameter|Value|
|---|---|
|chave|PERMITIR_ESTOQUE_NEGATIVO|
|chave|PERMITIR_AJUSTES_FORCADOS|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "configuracao": {
      "chave": "PERMITIR_ESTOQUE_NEGATIVO",
      "valor": "true",
      "valorParsed": true,
      "tipo": "BOOLEAN",
      "descricao": "string",
      "createdAt": "2019-08-24T14:15:22Z",
      "updatedAt": "2019-08-24T14:15:22Z"
    },
    "valorAnterior": "false"
  },
  "message": "Configuração atualizada com sucesso"
}
```

<h3 id="atualizar-configuração-booleana-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Configuração booleana atualizada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Configuração não é do tipo booleano|None|

<h3 id="atualizar-configuração-booleana-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» configuracao|object|false|none|none|
|»»» chave|string|false|none|none|
|»»» valor|string|false|none|none|
|»»» valorParsed|boolean|false|none|none|
|»»» tipo|string|false|none|none|
|»»» descricao|string¦null|false|none|none|
|»»» createdAt|string(date-time)|false|none|none|
|»»» updatedAt|string(date-time)|false|none|none|
|»» valorAnterior|string|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Atualizar configuração numérica

<a id="opIdConfiguracoesController_atualizarConfiguracaoNumerica"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /api/configuracoes/{chave}/number \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
PATCH /api/configuracoes/{chave}/number HTTP/1.1

Content-Type: application/json
Accept: application/json

```

```javascript
const inputBody = '{
  "valor": 15,
  "descricao": "Estoque mínimo ajustado para operação sazonal"
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/configuracoes/{chave}/number',
{
  method: 'PATCH',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.patch('/api/configuracoes/{chave}/number', headers = headers)

print(r.json())

```

`PATCH /api/configuracoes/{chave}/number`

Atualiza uma configuração numérica de forma simplificada

> Body parameter

```json
{
  "valor": 15,
  "descricao": "Estoque mínimo ajustado para operação sazonal"
}
```

<h3 id="atualizar-configuração-numérica-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|chave|path|string|true|Chave da configuração numérica|
|body|body|object|true|Valor numérico da configuração|
|» valor|body|number|true|Valor numérico da configuração|
|» descricao|body|string|false|Descrição opcional da configuração|

#### Enumerated Values

|Parameter|Value|
|---|---|
|chave|ESTOQUE_MINIMO_EQUIPAMENTO|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "configuracao": {
      "chave": "ESTOQUE_MINIMO_EQUIPAMENTO",
      "valor": "15",
      "valorParsed": 15,
      "tipo": "NUMBER",
      "descricao": "string",
      "createdAt": "2019-08-24T14:15:22Z",
      "updatedAt": "2019-08-24T14:15:22Z"
    },
    "valorAnterior": "10"
  },
  "message": "Configuração atualizada com sucesso"
}
```

<h3 id="atualizar-configuração-numérica-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Configuração numérica atualizada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Configuração não é do tipo numérico ou valor inválido|None|

<h3 id="atualizar-configuração-numérica-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» configuracao|object|false|none|none|
|»»» chave|string|false|none|none|
|»»» valor|string|false|none|none|
|»»» valorParsed|number|false|none|none|
|»»» tipo|string|false|none|none|
|»»» descricao|string¦null|false|none|none|
|»»» createdAt|string(date-time)|false|none|none|
|»»» updatedAt|string(date-time)|false|none|none|
|»» valorAnterior|string|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Atualizar múltiplas configurações

<a id="opIdConfiguracoesController_atualizarConfiguracoesLote"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/configuracoes/batch \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/configuracoes/batch HTTP/1.1

Content-Type: application/json
Accept: application/json

```

```javascript
const inputBody = '{
  "configuracoes": [
    {
      "chave": "PERMITIR_ESTOQUE_NEGATIVO",
      "valor": "true",
      "descricao": "Configuração atualizada em lote"
    }
  ]
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/configuracoes/batch',
{
  method: 'POST',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/configuracoes/batch', headers = headers)

print(r.json())

```

`POST /api/configuracoes/batch`

Atualiza várias configurações em uma única operação

> Body parameter

```json
{
  "configuracoes": [
    {
      "chave": "PERMITIR_ESTOQUE_NEGATIVO",
      "valor": "true",
      "descricao": "Configuração atualizada em lote"
    }
  ]
}
```

<h3 id="atualizar-múltiplas-configurações-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|object|true|Lista de configurações a serem atualizadas|
|» configuracoes|body|[object]|true|none|
|»» chave|body|string|true|none|
|»» valor|body|string|true|none|
|»» descricao|body|string|false|none|

#### Enumerated Values

|Parameter|Value|
|---|---|
|»» chave|PERMITIR_ESTOQUE_NEGATIVO|
|»» chave|PERMITIR_AJUSTES_FORCADOS|
|»» chave|ESTOQUE_MINIMO_EQUIPAMENTO|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "configuracoes": [
      {
        "chave": "string",
        "valor": "string",
        "valorParsed": true,
        "tipo": "string",
        "descricao": "string",
        "createdAt": "2019-08-24T14:15:22Z",
        "updatedAt": "2019-08-24T14:15:22Z"
      }
    ],
    "totalAtualizadas": 2,
    "falhas": [
      {
        "chave": "string",
        "erro": "string"
      }
    ]
  },
  "message": "Configurações atualizadas em lote"
}
```

<h3 id="atualizar-múltiplas-configurações-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Configurações atualizadas (parcial ou totalmente)|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos na requisição|None|

<h3 id="atualizar-múltiplas-configurações-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» configuracoes|[object]|false|none|none|
|»»» chave|string|false|none|none|
|»»» valor|string|false|none|none|
|»»» valorParsed|any|false|none|none|

*oneOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|boolean|false|none|none|

*xor*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|number|false|none|none|

*xor*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|string|false|none|none|

*continued*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» tipo|string|false|none|none|
|»»» descricao|string¦null|false|none|none|
|»»» createdAt|string(date-time)|false|none|none|
|»»» updatedAt|string(date-time)|false|none|none|
|»» totalAtualizadas|number|false|none|none|
|»» falhas|[object]|false|none|none|
|»»» chave|string|false|none|none|
|»»» erro|string|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Resetar configurações para valores padrão

<a id="opIdConfiguracoesController_resetarConfiguracoes"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/configuracoes/reset \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/configuracoes/reset HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/configuracoes/reset',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/configuracoes/reset', headers = headers)

print(r.json())

```

`POST /api/configuracoes/reset`

Reseta todas as configurações para seus valores padrão do sistema

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": [
    {
      "chave": "string",
      "valor": "string",
      "valorParsed": true,
      "tipo": "string",
      "descricao": "string",
      "createdAt": "2019-08-24T14:15:22Z",
      "updatedAt": "2019-08-24T14:15:22Z"
    }
  ],
  "message": "Configurações resetadas para valores padrão"
}
```

<h3 id="resetar-configurações-para-valores-padrão-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Configurações resetadas com sucesso|Inline|

<h3 id="resetar-configurações-para-valores-padrão-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|[object]|false|none|none|
|»» chave|string|false|none|none|
|»» valor|string|false|none|none|
|»» valorParsed|any|false|none|none|

*oneOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|boolean|false|none|none|

*xor*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|number|false|none|none|

*xor*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|string|false|none|none|

*continued*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» tipo|string|false|none|none|
|»» descricao|string¦null|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|»» updatedAt|string(date-time)|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

<h1 id="epi-backend-api-usu-rios">Usuários</h1>

## Listar usuários

<a id="opIdUsuariosController_listarUsuarios"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/usuarios \
  -H 'Accept: application/json'

```

```http
GET /api/usuarios HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('/api/usuarios',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('/api/usuarios', headers = headers)

print(r.json())

```

`GET /api/usuarios`

Lista usuários do sistema com paginação e filtros opcionais por nome e email

<h3 id="listar-usuários-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|any|false|Itens por página (padrão: 50, máximo: 100)|
|page|query|any|false|Número da página (padrão: 1)|
|email|query|any|false|Filtro por email (busca parcial case-insensitive)|
|nome|query|any|false|Filtro por nome (busca parcial case-insensitive)|

> Example responses

> 200 Response

```json
{
  "items": [
    {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "nome": "string",
      "email": "user@example.com",
      "createdAt": "2019-08-24T14:15:22Z"
    }
  ],
  "pagination": {
    "page": 0,
    "limit": 0,
    "total": 0,
    "totalPages": 0
  }
}
```

<h3 id="listar-usuários-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de usuários retornada com sucesso|Inline|

<h3 id="listar-usuários-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» items|[object]|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» nome|string|false|none|none|
|»» email|string(email)|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|» pagination|object|false|none|none|
|»» page|number|false|none|none|
|»» limit|number|false|none|none|
|»» total|number|false|none|none|
|»» totalPages|number|false|none|none|

<aside class="success">
This operation does not require authentication
</aside>

## Obter usuário por ID

<a id="opIdUsuariosController_obterUsuario"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/usuarios/{id} \
  -H 'Accept: application/json'

```

```http
GET /api/usuarios/{id} HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json'
};

fetch('/api/usuarios/{id}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get('/api/usuarios/{id}', headers = headers)

print(r.json())

```

`GET /api/usuarios/{id}`

Retorna as informações de um usuário específico pelo seu ID

<h3 id="obter-usuário-por-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID do usuário|

> Example responses

> 200 Response

```json
{
  "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
  "nome": "string",
  "email": "user@example.com",
  "createdAt": "2019-08-24T14:15:22Z"
}
```

<h3 id="obter-usuário-por-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Usuário encontrado|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Usuário não encontrado|None|

<h3 id="obter-usuário-por-id-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» id|string(uuid)|false|none|none|
|» nome|string|false|none|none|
|» email|string(email)|false|none|none|
|» createdAt|string(date-time)|false|none|none|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="epi-backend-api-entregas-otimizadas">entregas-otimizadas</h1>

## Criar entrega completa otimizada (Frontend Optimized)

<a id="opIdEntregasOtimizadasController_criarEntregaCompleta"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/entregas/create-complete \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/entregas/create-complete HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/entregas/create-complete',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/entregas/create-complete', headers = headers)

print(r.json())

```

`POST /api/entregas/create-complete`

Cria uma entrega com processamento completo no backend: expande quantidades em itens individuais, gera IDs únicos, calcula datas de vencimento e atualiza estoque automaticamente

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "entregaId": "48531af4-7b9b-4196-af29-c9f7850f22d3",
    "itensIndividuais": [
      {
        "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
        "nomeEquipamento": "string",
        "numeroCA": "string",
        "dataLimiteDevolucao": "2019-08-24"
      }
    ],
    "totalItens": 0,
    "statusEntrega": "pendente_assinatura"
  },
  "message": "string"
}
```

<h3 id="criar-entrega-completa-otimizada-(frontend-optimized)-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Entrega criada com sucesso com itens individuais|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos ou estoque insuficiente|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Ficha ou responsável não encontrado|None|

<h3 id="criar-entrega-completa-otimizada-(frontend-optimized)-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» entregaId|string(uuid)|false|none|none|
|»» itensIndividuais|[object]|false|none|none|
|»»» id|string(uuid)|false|none|ID individual gerado pelo backend|
|»»» nomeEquipamento|string|false|none|none|
|»»» numeroCA|string|false|none|none|
|»»» dataLimiteDevolucao|string(date)¦null|false|none|Calculado pelo backend|
|»» totalItens|number|false|none|Total de itens individuais criados|
|»» statusEntrega|string|false|none|none|
|» message|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|statusEntrega|pendente_assinatura|
|statusEntrega|assinada|
|statusEntrega|cancelada|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

<h1 id="epi-backend-api-devolucoes-otimizadas">devolucoes-otimizadas</h1>

## Processar devoluções em lote (Frontend Optimized)

<a id="opIdDevolucoesOtimizadasController_processarDevolucoesBatch"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/devolucoes/process-batch \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/devolucoes/process-batch HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/devolucoes/process-batch',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/devolucoes/process-batch', headers = headers)

print(r.json())

```

`POST /api/devolucoes/process-batch`

Processa múltiplas devoluções simultaneamente com atualização automática de estoque e histórico

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "processadas": 0,
    "erros": [
      "string"
    ],
    "fichasAtualizadas": [
      "497f6eca-6276-4993-bfeb-53cbbbba6f08"
    ],
    "estoqueAtualizado": true
  },
  "message": "string"
}
```

<h3 id="processar-devoluções-em-lote-(frontend-optimized)-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Devoluções processadas com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|

<h3 id="processar-devoluções-em-lote-(frontend-optimized)-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» processadas|number|false|none|Número de devoluções processadas com sucesso|
|»» erros|[string]|false|none|Lista de erros encontrados durante o processamento|
|»» fichasAtualizadas|[string]|false|none|IDs das fichas que foram atualizadas|
|»» estoqueAtualizado|boolean|false|none|Indica se o estoque foi atualizado|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

<h1 id="epi-backend-api-fichas-epi">fichas-epi</h1>

## Obter ficha completa otimizada (Frontend Optimized)

<a id="opIdFichasController_obterFichaCompleta"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/fichas-epi/{id}/complete \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/fichas-epi/{id}/complete HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/{id}/complete',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/fichas-epi/{id}/complete', headers = headers)

print(r.json())

```

`GET /api/fichas-epi/{id}/complete`

Obtém todos os dados de uma ficha em uma única chamada com estatísticas e status calculados no backend

<h3 id="obter-ficha-completa-otimizada-(frontend-optimized)-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "ficha": {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "status": "ativa",
      "colaborador": {
        "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
        "nome": "string",
        "cpf": "string",
        "matricula": "string",
        "cargo": "string",
        "empresa": "string"
      }
    },
    "equipamentosEmPosse": [
      {
        "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
        "nomeEquipamento": "string",
        "numeroCA": "string",
        "categoria": "string",
        "dataEntrega": "2019-08-24",
        "dataLimiteDevolucao": "2019-08-24",
        "statusVencimento": "dentro_prazo",
        "diasParaVencimento": 0,
        "podeDevolver": true,
        "entregaId": "48531af4-7b9b-4196-af29-c9f7850f22d3",
        "itemEntregaId": "4ee7b87f-b63b-439a-b057-042d8da357d4"
      }
    ],
    "historico": [
      {
        "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
        "data": "2019-08-24T14:15:22Z",
        "tipo": "entrega",
        "descricao": "string",
        "responsavel": "string",
        "detalhes": {}
      }
    ],
    "estatisticas": {
      "totalEpisAtivos": 0,
      "totalEpisVencidos": 0,
      "proximoVencimento": "string",
      "diasProximoVencimento": 0
    }
  }
}
```

<h3 id="obter-ficha-completa-otimizada-(frontend-optimized)-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Ficha completa com dados otimizados|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Ficha não encontrada|None|

<h3 id="obter-ficha-completa-otimizada-(frontend-optimized)-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» ficha|object|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» status|string|false|none|Status calculado no backend|
|»»» colaborador|object|false|none|none|
|»»»» id|string(uuid)|false|none|none|
|»»»» nome|string|false|none|none|
|»»»» cpf|string|false|none|none|
|»»»» matricula|string¦null|false|none|none|
|»»»» cargo|string¦null|false|none|none|
|»»»» empresa|string¦null|false|none|none|
|»» equipamentosEmPosse|[object]|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» nomeEquipamento|string|false|none|none|
|»»» numeroCA|string|false|none|none|
|»»» categoria|string|false|none|none|
|»»» dataEntrega|string(date)|false|none|none|
|»»» dataLimiteDevolucao|string(date)¦null|false|none|none|
|»»» statusVencimento|string|false|none|Status de vencimento calculado no backend|
|»»» diasParaVencimento|number|false|none|Dias para vencimento calculado no backend|
|»»» podeDevolver|boolean|false|none|Lógica de negócio calculada no backend|
|»»» entregaId|string(uuid)|false|none|none|
|»»» itemEntregaId|string(uuid)|false|none|none|
|»» historico|[object]|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» data|string(date-time)|false|none|none|
|»»» tipo|string|false|none|none|
|»»» descricao|string|false|none|none|
|»»» responsavel|string¦null|false|none|none|
|»»» detalhes|object¦null|false|none|none|
|»» estatisticas|object|false|none|none|
|»»» totalEpisAtivos|number|false|none|none|
|»»» totalEpisVencidos|number|false|none|none|
|»»» proximoVencimento|string¦null|false|none|none|
|»»» diasProximoVencimento|number¦null|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|status|ativa|
|status|inativa|
|status|vencida|
|status|pendente_devolucao|
|statusVencimento|dentro_prazo|
|statusVencimento|vencendo|
|statusVencimento|vencido|
|tipo|entrega|
|tipo|devolucao|
|tipo|assinatura|
|tipo|cancelamento|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Listagem otimizada de fichas (Frontend Optimized)

<a id="opIdFichasController_listarFichasEnhanced"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/fichas-epi/list-enhanced \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/fichas-epi/list-enhanced HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/list-enhanced',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/fichas-epi/list-enhanced', headers = headers)

print(r.json())

```

`GET /api/fichas-epi/list-enhanced`

Lista fichas com dados pré-processados e estatísticas calculadas no backend para reduzir complexidade do frontend

<h3 id="listagem-otimizada-de-fichas-(frontend-optimized)-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|vencimentoProximo|query|boolean|false|Filtrar fichas com vencimento próximo (30 dias)|
|empresa|query|string|false|Filtro por empresa|
|cargo|query|string|false|Filtro por cargo|
|status|query|string|false|none|
|search|query|string|false|Busca por nome ou matrícula|
|limit|query|number|false|Itens por página (padrão: 20, máx: 100)|
|page|query|number|false|Página (padrão: 1)|

#### Enumerated Values

|Parameter|Value|
|---|---|
|status|ativa|
|status|inativa|
|status|vencida|
|status|pendente_devolucao|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
        "colaborador": {
          "nome": "string",
          "matricula": "string",
          "cargo": "string",
          "empresa": "string"
        },
        "status": "ativa",
        "totalEpisAtivos": 0,
        "totalEpisVencidos": 0,
        "proximoVencimento": "string",
        "ultimaAtualizacao": "2019-08-24T14:15:22Z"
      }
    ],
    "pagination": {
      "total": 0,
      "page": 0,
      "limit": 0,
      "totalPages": 0
    }
  }
}
```

<h3 id="listagem-otimizada-de-fichas-(frontend-optimized)-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista otimizada de fichas com dados pré-processados|Inline|

<h3 id="listagem-otimizada-de-fichas-(frontend-optimized)-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» items|[object]|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» colaborador|object|false|none|none|
|»»»» nome|string|false|none|none|
|»»»» matricula|string¦null|false|none|none|
|»»»» cargo|string¦null|false|none|none|
|»»»» empresa|string¦null|false|none|none|
|»»» status|string|false|none|Status calculado no backend|
|»»» totalEpisAtivos|number|false|none|Total de EPIs ativos (pré-calculado)|
|»»» totalEpisVencidos|number|false|none|Total de EPIs vencidos (pré-calculado)|
|»»» proximoVencimento|string¦null|false|none|Data do próximo vencimento (pré-calculado)|
|»»» ultimaAtualizacao|string(date-time)|false|none|none|
|»» pagination|object|false|none|none|
|»»» total|number|false|none|none|
|»»» page|number|false|none|none|
|»»» limit|number|false|none|none|
|»»» totalPages|number|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|status|ativa|
|status|inativa|
|status|vencida|
|status|pendente_devolucao|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Criar nova ficha de EPI

<a id="opIdFichasController_criarFicha"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/fichas-epi \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/fichas-epi HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/fichas-epi', headers = headers)

print(r.json())

```

`POST /api/fichas-epi`

Cria uma nova ficha de EPI para um colaborador específico

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "colaboradorId": "49b8d1af-bc08-4fa3-a782-de96000adc12",
    "status": "ATIVA"
  }
}
```

<h3 id="criar-nova-ficha-de-epi-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Ficha criada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Ficha já existe para este colaborador|None|

<h3 id="criar-nova-ficha-de-epi-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» colaboradorId|string(uuid)|false|none|none|
|»» status|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|status|ATIVA|
|status|INATIVA|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Listar fichas de EPI

<a id="opIdFichasController_listarFichas"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/fichas-epi \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/fichas-epi HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/fichas-epi', headers = headers)

print(r.json())

```

`GET /api/fichas-epi`

Lista fichas com filtros e paginação

<h3 id="listar-fichas-de-epi-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|status|query|string|false|none|
|colaboradorId|query|string(uuid)|false|none|
|limit|query|number|false|Itens por página (padrão: 10, máx: 100)|
|page|query|number|false|Página (padrão: 1)|

#### Enumerated Values

|Parameter|Value|
|---|---|
|status|ATIVA|
|status|INATIVA|

<h3 id="listar-fichas-de-epi-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de fichas obtida com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Criar ficha ou ativar existente

<a id="opIdFichasController_criarOuAtivarFicha"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/fichas-epi/criar-ou-ativar \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/fichas-epi/criar-ou-ativar HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/criar-ou-ativar',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/fichas-epi/criar-ou-ativar', headers = headers)

print(r.json())

```

`POST /api/fichas-epi/criar-ou-ativar`

Cria uma nova ficha ou ativa uma ficha inativa existente

<h3 id="criar-ficha-ou-ativar-existente-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Ficha criada ou ativada com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Estatísticas de fichas

<a id="opIdFichasController_obterEstatisticas"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/fichas-epi/estatisticas \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/fichas-epi/estatisticas HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/estatisticas',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/fichas-epi/estatisticas', headers = headers)

print(r.json())

```

`GET /api/fichas-epi/estatisticas`

Retorna estatísticas gerais das fichas de EPI

<h3 id="estatísticas-de-fichas-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Estatísticas obtidas com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Histórico de devoluções da ficha

<a id="opIdDevolucoesController_obterHistoricoDevolucoes"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/fichas-epi/historico-global \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/fichas-epi/historico-global HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/historico-global',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/fichas-epi/historico-global', headers = headers)

print(r.json())

```

`GET /api/fichas-epi/historico-global`

Retorna histórico das devoluções de uma ficha específica

<h3 id="histórico-de-devoluções-da-ficha-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|limit|query|number|false|Itens por página (padrão: 10)|
|page|query|number|false|Página (padrão: 1)|
|dataFim|query|string(date)|false|none|
|dataInicio|query|string(date)|false|none|
|tipoEpiId|query|string|false|ID do tipo de EPI|
|colaboradorId|query|string|false|ID do colaborador|

<h3 id="histórico-de-devoluções-da-ficha-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Histórico global obtido com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Obter ficha específica

<a id="opIdFichasController_obterFicha"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/fichas-epi/{id} \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/fichas-epi/{id} HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/{id}',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/fichas-epi/{id}', headers = headers)

print(r.json())

```

`GET /api/fichas-epi/{id}`

Obtém detalhes de uma ficha de EPI específica

<h3 id="obter-ficha-específica-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

<h3 id="obter-ficha-específica-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Ficha obtida com sucesso|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Ficha não encontrada|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Ativar ficha

<a id="opIdFichasController_ativarFicha"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /api/fichas-epi/{id}/ativar \
  -H 'Authorization: Bearer {access-token}'

```

```http
PUT /api/fichas-epi/{id}/ativar HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/{id}/ativar',
{
  method: 'PUT',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.put('/api/fichas-epi/{id}/ativar', headers = headers)

print(r.json())

```

`PUT /api/fichas-epi/{id}/ativar`

Ativa uma ficha de EPI inativa

<h3 id="ativar-ficha-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

<h3 id="ativar-ficha-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Ficha ativada com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Inativar ficha

<a id="opIdFichasController_inativarFicha"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /api/fichas-epi/{id}/inativar \
  -H 'Authorization: Bearer {access-token}'

```

```http
PUT /api/fichas-epi/{id}/inativar HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/{id}/inativar',
{
  method: 'PUT',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.put('/api/fichas-epi/{id}/inativar', headers = headers)

print(r.json())

```

`PUT /api/fichas-epi/{id}/inativar`

Inativa uma ficha de EPI ativa

<h3 id="inativar-ficha-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|none|

<h3 id="inativar-ficha-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Ficha inativada com sucesso|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Obter histórico completo da ficha

<a id="opIdFichasController_obterHistoricoFicha"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/fichas-epi/{id}/historico \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/fichas-epi/{id}/historico HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/{id}/historico',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/fichas-epi/{id}/historico', headers = headers)

print(r.json())

```

`GET /api/fichas-epi/{id}/historico`

Retorna o histórico completo de uma ficha de EPI incluindo criação, entregas, devoluções, cancelamentos e itens vencidos

<h3 id="obter-histórico-completo-da-ficha-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|id|path|string(uuid)|true|ID da ficha EPI|
|limit|query|number|false|Itens por página (padrão: 50)|
|page|query|number|false|Página (padrão: 1)|
|dataFim|query|string(date-time)|false|Data de fim do filtro|
|dataInicio|query|string(date-time)|false|Data de início do filtro|
|tipoAcao|query|string|false|none|

#### Enumerated Values

|Parameter|Value|
|---|---|
|tipoAcao|CRIACAO|
|tipoAcao|ENTREGA|
|tipoAcao|DEVOLUCAO|
|tipoAcao|CANCELAMENTO|
|tipoAcao|ALTERACAO_STATUS|
|tipoAcao|ITEM_VENCIDO|
|tipoAcao|EDICAO|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "fichaId": "6c59dcb0-b520-4d62-8f09-9bb537535306",
    "colaborador": {
      "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
      "nome": "string",
      "cpf": "string",
      "matricula": "string"
    },
    "historico": [
      {
        "id": "string",
        "tipoAcao": "CRIACAO",
        "descricao": "string",
        "dataAcao": "2019-08-24T14:15:22Z",
        "responsavel": {
          "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
          "nome": "string"
        },
        "detalhes": {}
      }
    ],
    "estatisticas": {
      "totalEventos": 0,
      "totalEntregas": 0,
      "totalDevolucoes": 0,
      "totalCancelamentos": 0,
      "itensAtivos": 0,
      "itensVencidos": 0,
      "dataUltimaAtividade": "2019-08-24T14:15:22Z"
    }
  },
  "message": "string"
}
```

<h3 id="obter-histórico-completo-da-ficha-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Histórico obtido com sucesso|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Ficha não encontrada|None|

<h3 id="obter-histórico-completo-da-ficha-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» fichaId|string(uuid)|false|none|none|
|»» colaborador|object|false|none|none|
|»»» id|string(uuid)|false|none|none|
|»»» nome|string|false|none|none|
|»»» cpf|string|false|none|none|
|»»» matricula|string¦null|false|none|none|
|»» historico|[object]|false|none|none|
|»»» id|string|false|none|none|
|»»» tipoAcao|string|false|none|none|
|»»» descricao|string|false|none|none|
|»»» dataAcao|string(date-time)|false|none|none|
|»»» responsavel|object¦null|false|none|none|
|»»»» id|string(uuid)|false|none|none|
|»»»» nome|string|false|none|none|
|»»» detalhes|object¦null|false|none|none|
|»» estatisticas|object|false|none|none|
|»»» totalEventos|number|false|none|none|
|»»» totalEntregas|number|false|none|none|
|»»» totalDevolucoes|number|false|none|none|
|»»» totalCancelamentos|number|false|none|none|
|»»» itensAtivos|number|false|none|none|
|»»» itensVencidos|number|false|none|none|
|»»» dataUltimaAtividade|string(date-time)¦null|false|none|none|
|» message|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|tipoAcao|CRIACAO|
|tipoAcao|ENTREGA|
|tipoAcao|DEVOLUCAO|
|tipoAcao|CANCELAMENTO|
|tipoAcao|ALTERACAO_STATUS|
|tipoAcao|ITEM_VENCIDO|
|tipoAcao|EDICAO|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Criar nova entrega de EPIs

<a id="opIdEntregasController_criarEntrega"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/fichas-epi/{fichaId}/entregas \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/fichas-epi/{fichaId}/entregas HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/{fichaId}/entregas',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/fichas-epi/{fichaId}/entregas', headers = headers)

print(r.json())

```

`POST /api/fichas-epi/{fichaId}/entregas`

Cria uma nova entrega de itens de EPI para uma ficha específica

<h3 id="criar-nova-entrega-de-epis-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|fichaId|path|string(uuid)|true|none|

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "fichaEpiId": "16c3743c-9957-43ac-b0f4-f34d21613a53",
    "status": "PENDENTE_ASSINATURA",
    "dataEntrega": "2019-08-24T14:15:22Z",
    "itens": []
  }
}
```

<h3 id="criar-nova-entrega-de-epis-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Entrega criada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Ficha não encontrada|None|
|422|[Unprocessable Entity](https://tools.ietf.org/html/rfc2518#section-10.3)|Estoque insuficiente|None|

<h3 id="criar-nova-entrega-de-epis-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» fichaEpiId|string(uuid)|false|none|none|
|»» status|string|false|none|none|
|»» dataEntrega|string(date-time)|false|none|none|
|»» itens|array|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|status|PENDENTE_ASSINATURA|
|status|ASSINADA|
|status|CANCELADA|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Listar entregas de uma ficha

<a id="opIdEntregasController_listarEntregas"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /api/fichas-epi/{fichaId}/entregas \
  -H 'Authorization: Bearer {access-token}'

```

```http
GET /api/fichas-epi/{fichaId}/entregas HTTP/1.1

```

```javascript

const headers = {
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/{fichaId}/entregas',
{
  method: 'GET',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Authorization': 'Bearer {access-token}'
}

r = requests.get('/api/fichas-epi/{fichaId}/entregas', headers = headers)

print(r.json())

```

`GET /api/fichas-epi/{fichaId}/entregas`

Lista todas as entregas de uma ficha específica com filtros

<h3 id="listar-entregas-de-uma-ficha-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|fichaId|path|string(uuid)|true|none|
|dataFim|query|string(date)|false|none|
|dataInicio|query|string(date)|false|none|
|status|query|string|false|none|
|limit|query|number|false|Itens por página (padrão: 10)|
|page|query|number|false|Página (padrão: 1)|

#### Enumerated Values

|Parameter|Value|
|---|---|
|status|ATIVA|
|status|DEVOLVIDA_PARCIAL|
|status|DEVOLVIDA_TOTAL|
|status|CANCELADA|

<h3 id="listar-entregas-de-uma-ficha-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Lista de entregas obtida com sucesso|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Ficha não encontrada|None|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Assinar entrega de EPI

<a id="opIdEntregasController_assinarEntrega"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /api/fichas-epi/entregas/{entregaId}/assinar \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
PUT /api/fichas-epi/entregas/{entregaId}/assinar HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/entregas/{entregaId}/assinar',
{
  method: 'PUT',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.put('/api/fichas-epi/entregas/{entregaId}/assinar', headers = headers)

print(r.json())

```

`PUT /api/fichas-epi/entregas/{entregaId}/assinar`

Marca uma entrega como assinada, alterando seu status de PENDENTE_ASSINATURA para ASSINADA

<h3 id="assinar-entrega-de-epi-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|entregaId|path|string(uuid)|true|ID da entrega a ser assinada|

> Example responses

> 200 Response

```json
{
  "success": true,
  "data": {
    "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "status": "ASSINADA",
    "dataAssinatura": "2019-08-24T14:15:22Z",
    "assinaturaColaborador": "string",
    "observacoes": "string",
    "fichaEpiId": "16c3743c-9957-43ac-b0f4-f34d21613a53",
    "almoxarifadoId": "dc4ce91f-1329-4ecd-974f-b882658b1179",
    "responsavelId": "130940c2-9e5a-4e87-accd-050793d2d0e1",
    "createdAt": "2019-08-24T14:15:22Z",
    "updatedAt": "2019-08-24T14:15:22Z"
  },
  "message": "Entrega assinada com sucesso"
}
```

<h3 id="assinar-entrega-de-epi-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Entrega assinada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos ou entrega não pode ser assinada|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Entrega não encontrada|None|

<h3 id="assinar-entrega-de-epi-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» id|string(uuid)|false|none|none|
|»» status|string|false|none|none|
|»» dataAssinatura|string(date-time)|false|none|none|
|»» assinaturaColaborador|string¦null|false|none|none|
|»» observacoes|string¦null|false|none|none|
|»» fichaEpiId|string(uuid)|false|none|none|
|»» almoxarifadoId|string(uuid)|false|none|none|
|»» responsavelId|string(uuid)|false|none|none|
|»» createdAt|string(date-time)|false|none|none|
|»» updatedAt|string(date-time)|false|none|none|
|» message|string|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

## Processar devolução de EPIs

<a id="opIdDevolucoesController_processarDevolucao"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /api/fichas-epi/{fichaId}/devolucoes \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer {access-token}'

```

```http
POST /api/fichas-epi/{fichaId}/devolucoes HTTP/1.1

Accept: application/json

```

```javascript

const headers = {
  'Accept':'application/json',
  'Authorization':'Bearer {access-token}'
};

fetch('/api/fichas-epi/{fichaId}/devolucoes',
{
  method: 'POST',

  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```

```python
import requests
headers = {
  'Accept': 'application/json',
  'Authorization': 'Bearer {access-token}'
}

r = requests.post('/api/fichas-epi/{fichaId}/devolucoes', headers = headers)

print(r.json())

```

`POST /api/fichas-epi/{fichaId}/devolucoes`

Processa a devolução de itens de EPI de uma ficha específica

<h3 id="processar-devolução-de-epis-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|fichaId|path|string(uuid)|true|none|

> Example responses

> 201 Response

```json
{
  "success": true,
  "data": {
    "entregaId": "48531af4-7b9b-4196-af29-c9f7850f22d3",
    "itensDevolucao": [],
    "statusEntregaAtualizado": "string",
    "dataProcessamento": "2019-08-24T14:15:22Z"
  }
}
```

<h3 id="processar-devolução-de-epis-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Devolução processada com sucesso|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Dados inválidos|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Ficha não encontrada|None|
|422|[Unprocessable Entity](https://tools.ietf.org/html/rfc2518#section-10.3)|Entrega não assinada ou item já devolvido|None|

<h3 id="processar-devolução-de-epis-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» success|boolean|false|none|none|
|» data|object|false|none|none|
|»» entregaId|string(uuid)|false|none|none|
|»» itensDevolucao|array|false|none|none|
|»» statusEntregaAtualizado|string|false|none|none|
|»» dataProcessamento|string(date-time)|false|none|none|

<aside class="warning">
To perform this operation, you must be authenticated by means of one of the following methods:
bearer
</aside>

# Schemas

