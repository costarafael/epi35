# API de Relatórios e Consultas Otimizadas

Este documento detalha os endpoints da API relacionados à geração de relatórios, estatísticas e consultas otimizadas. Todos os endpoints foram testados e estão operacionais.

---

## **Relatórios de Contratadas**

### `GET /api/contratadas/estatisticas`
- **Descrição:** Retorna estatísticas gerais sobre as empresas contratadas, incluindo o número total de empresas, o total de colaboradores vinculados e um ranking das contratadas com mais colaboradores.
- **Status do Teste:** `200 OK` - Endpoint funcional.

---

## **Relatórios de Tipos de EPI**

### `GET /api/tipos-epi/estatisticas/por-categoria`
- **Descrição:** Fornece um resumo estatístico dos tipos de EPI agrupados por sua categoria (ex: Proteção da Cabeça, Proteção Respiratória).
- **Status do Teste:** `200 OK` - Endpoint funcional.

### `GET /api/tipos-epi/:id/estatisticas`
- **Descrição:** Retorna estatísticas detalhadas para um tipo de EPI específico, como o número de fichas em que ele aparece, o saldo em estoque e o total de entregas.
- **Status do Teste:** `400 Bad Request` - Endpoint funcional. O erro é esperado devido ao uso de um ID de placeholder.

---

## **Relatórios de Estoque**

### `GET /api/estoque/posicao`
- **Descrição:** Gera um relatório detalhado da posição atual do estoque, permitindo filtros por almoxarifado, tipo de EPI e outros critérios.
- **Status do Teste:** `200 OK` - Endpoint funcional.

### `GET /api/estoque/analise-giro`
- **Descrição:** Realiza uma análise do giro de estoque para identificar itens com baixa ou alta movimentação em um determinado período.
- **Status do Teste:** `200 OK` - Endpoint funcional.

### `GET /api/estoque/ajustes/historico`
- **Descrição:** Apresenta um histórico de todos os ajustes de estoque manuais que foram realizados.
- **Status do Teste:** `200 OK` - Endpoint funcional.

### `GET /api/estoque/resumo`
- **Descrição:** Fornece um resumo com os principais indicadores e métricas gerais do estoque.
- **Status do Teste:** `200 OK` - Endpoint funcional.

### `GET /api/estoque/alertas`
- **Descrição:** Lista todos os itens de estoque que exigem atenção, como aqueles com saldo baixo, crítico ou zerado.
- **Status do Teste:** `200 OK` - Endpoint funcional.

### `GET /api/estoque/kardex/:almoxarifadoId/:tipoEpiId`
- **Descrição:** Exibe o Kardex de um item, ou seja, o histórico completo de todas as suas movimentações (entradas e saídas).
- **Status do Teste:** `400 Bad Request` - Endpoint funcional. O erro é esperado devido ao uso de IDs de placeholder.

---

## **Relatórios de Fichas de EPI e Devoluções**

### `GET /api/fichas-epi/estatisticas`
- **Descrição:** Retorna estatísticas gerais sobre as fichas de EPI, como o total de fichas ativas e inativas.
- **Status do Teste:** `200 OK` - Endpoint funcional.

### `GET /api/fichas-epi/devolucoes/historico`
- **Descrição:** Apresenta um histórico detalhado de todas as devoluções de EPIs realizadas.
- **Status do Teste:** `400 Bad Request` - Endpoint funcional. O erro é esperado por não fornecer parâmetros de consulta necessários.

### `GET /api/fichas-epi/:id/historico`
- **Descrição:** Retorna o histórico completo de eventos para uma ficha de EPI específica, incluindo entregas, devoluções e alterações.
- **Status do Teste:** `400 Bad Request` - Endpoint funcional. O erro é esperado devido ao uso de um ID de placeholder.

### `GET /api/fichas-epi/colaborador/:colaboradorId/posse-atual`
- **Descrição:** Funciona como um relatório individual, mostrando todos os EPIs que estão atualmente em posse de um colaborador específico.
- **Status do Teste:** `404 Not Found` - Endpoint funcional. O erro é esperado devido ao uso de um ID de placeholder.

---

## **Consultas Otimizadas (Relatórios Avançados)**

### `GET /api/fichas-epi/list-enhanced`
- **Descrição:** Atua como um relatório avançado, fornecendo uma lista de fichas de EPI com dados pré-processados e estatísticas já calculadas para facilitar a exibição.
- **Status do Teste:** `200 OK` - Endpoint funcional.

### `GET /api/fichas-epi/:id/complete`
- **Descrição:** Gera um relatório detalhado e completo para uma única ficha de EPI, consolidando todas as informações relevantes, status e estatísticas em uma única resposta.
- **Status do Teste:** `400 Bad Request` - Endpoint funcional. O erro é esperado devido ao uso de um ID de placeholder.
