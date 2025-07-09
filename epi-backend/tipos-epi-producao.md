# Tipos de EPI Cadastrados no Sistema (PRODUÇÃO)

**Data de Geração:** 09/07/2025  
**Fonte:** Banco de dados de produção no Render  
**URL:** https://epi-backend-s14g.onrender.com  
**Total de Tipos:** 6  

## Tabela de Tipos de EPI

| ID | Nome do Equipamento | Número CA | Categoria | Descrição | Vida Útil (Dias) | Status | Data de Criação |
|---|---|---|---|---|---|---|---|
| `e844cf76-11c3-4fb9-9299-345ce2aa577e` | Capacete de Segurança | CA-12345 | PROTECAO_CABECA | Capacete de segurança classe A | 1800 | ATIVO | 05/07/2025 |
| `82b9909a-13eb-46a1-9ece-34debb8e7b84` | Luva de Segurança | CA-34567 | PROTECAO_CABECA | Luva de segurança em couro | 360 | ATIVO | 05/07/2025 |
| `f64ab07b-00a3-46d4-a3de-448063e010eb` | Óculos de Proteção | CA-23456 | PROTECAO_CABECA | Óculos de proteção contra impactos | 720 | ATIVO | 05/07/2025 |
| `039663` | Roupa de Astronauta | 0001 | PROTECAO_CLIMATICA | Para ir a Lua. | 2 | ATIVO | 09/07/2025 |
| `ACC9E5` | TESTE | 1112 | PROTECAO_CABECA | ASDF | 123 | ATIVO | 08/07/2025 |
| `7d2684dd-0a09-43fc-8406-4d729ecfcc9f` | Teste CAT 01 | 111 | PROTECAO_RESPIRATORIA | Desc. Basica do equipamento | 2 | ATIVO | 07/07/2025 |

## Detalhes dos Tipos de EPI

### 1. Capacete de Segurança
- **ID:** `e844cf76-11c3-4fb9-9299-345ce2aa577e`
- **Número CA:** CA-12345
- **Categoria:** PROTECAO_CABECA
- **Vida Útil:** 1800 dias (≈ 5 anos)
- **Status:** ATIVO

### 2. Luva de Segurança
- **ID:** `82b9909a-13eb-46a1-9ece-34debb8e7b84`
- **Número CA:** CA-34567
- **Categoria:** PROTECAO_CABECA
- **Vida Útil:** 360 dias (≈ 1 ano)
- **Status:** ATIVO

### 3. Óculos de Proteção
- **ID:** `f64ab07b-00a3-46d4-a3de-448063e010eb`
- **Número CA:** CA-23456
- **Categoria:** PROTECAO_CABECA
- **Vida Útil:** 720 dias (≈ 2 anos)
- **Status:** ATIVO

### 4. Roupa de Astronauta
- **ID:** `039663`
- **Número CA:** 0001
- **Categoria:** PROTECAO_CLIMATICA
- **Vida Útil:** 2 dias
- **Status:** ATIVO

### 5. TESTE
- **ID:** `ACC9E5`
- **Número CA:** 1112
- **Categoria:** PROTECAO_CABECA
- **Vida Útil:** 123 dias
- **Status:** ATIVO

### 6. Teste CAT 01
- **ID:** `7d2684dd-0a09-43fc-8406-4d729ecfcc9f`
- **Número CA:** 111
- **Categoria:** PROTECAO_RESPIRATORIA
- **Vida Útil:** 2 dias
- **Status:** ATIVO

## Distribuição por Categoria

| Categoria | Quantidade | EPIs |
|---|---|---|
| PROTECAO_CABECA | 4 | Capacete de Segurança, Luva de Segurança, Óculos de Proteção, TESTE |
| PROTECAO_CLIMATICA | 1 | Roupa de Astronauta |
| PROTECAO_RESPIRATORIA | 1 | Teste CAT 01 |

## Observações

- **Todos os EPIs** estão com status **ATIVO**
- **Categorias Diversas:** 3 categorias diferentes
- **Vida Útil Variada:** De 2 dias até 1800 dias
- **IDs Mistos:** Alguns UUIDs e alguns IDs customizados (039663, ACC9E5)
- **Datas de Criação:** Entre 05/07/2025 e 09/07/2025

## Endpoint Utilizado

```bash
GET https://epi-backend-s14g.onrender.com/api/tipos-epi
```

**Resposta completa da API de Produção:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "e844cf76-11c3-4fb9-9299-345ce2aa577e",
        "nomeEquipamento": "Capacete de Segurança",
        "numeroCa": "CA-12345",
        "categoria": "PROTECAO_CABECA",
        "descricao": "Capacete de segurança classe A",
        "vidaUtilDias": 1800,
        "status": "ATIVO",
        "createdAt": "2025-07-05T21:26:26.771Z"
      },
      {
        "id": "82b9909a-13eb-46a1-9ece-34debb8e7b84",
        "nomeEquipamento": "Luva de Segurança",
        "numeroCa": "CA-34567",
        "categoria": "PROTECAO_CABECA",
        "descricao": "Luva de segurança em couro",
        "vidaUtilDias": 360,
        "status": "ATIVO",
        "createdAt": "2025-07-05T21:26:26.771Z"
      },
      {
        "id": "f64ab07b-00a3-46d4-a3de-448063e010eb",
        "nomeEquipamento": "Óculos de Proteção",
        "numeroCa": "CA-23456",
        "categoria": "PROTECAO_CABECA",
        "descricao": "Óculos de proteção contra impactos",
        "vidaUtilDias": 720,
        "status": "ATIVO",
        "createdAt": "2025-07-05T21:26:26.771Z"
      },
      {
        "id": "039663",
        "nomeEquipamento": "Roupa de Astronauta",
        "numeroCa": "0001",
        "categoria": "PROTECAO_CLIMATICA",
        "descricao": "Para ir a Lua.",
        "vidaUtilDias": 2,
        "status": "ATIVO",
        "createdAt": "2025-07-09T13:38:53.614Z"
      },
      {
        "id": "ACC9E5",
        "nomeEquipamento": "TESTE",
        "numeroCa": "1112",
        "categoria": "PROTECAO_CABECA",
        "descricao": "ASDF",
        "vidaUtilDias": 123,
        "status": "ATIVO",
        "createdAt": "2025-07-08T04:10:51.416Z"
      },
      {
        "id": "7d2684dd-0a09-43fc-8406-4d729ecfcc9f",
        "nomeEquipamento": "Teste CAT 01",
        "numeroCa": "111",
        "categoria": "PROTECAO_RESPIRATORIA",
        "descricao": "Desc. Basica do equipamento",
        "vidaUtilDias": 2,
        "status": "ATIVO",
        "createdAt": "2025-07-07T03:29:19.771Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 6,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```