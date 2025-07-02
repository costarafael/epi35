# Documentação dos Testes de Integração - EPI Backend

Este documento detalha a estrutura e o propósito dos testes de integração do projeto EPI-Backend. O objetivo é fornecer uma visão clara sobre o que cada teste valida, facilitando a manutenção e a expansão da suíte de testes.

## 1. Estrutura e Configuração dos Testes

Os testes de integração são projetados para validar os casos de uso da aplicação de ponta a ponta, interagindo com um banco de dados de teste real para garantir que a lógica de negócio, o acesso a dados e as integrações entre componentes funcionem como esperado.

### 1.1. Arquivos de Setup (`/test/setup`)

- **`integration-test-setup.ts`**: Este arquivo é o coração da configuração dos testes de integração. Ele é responsável por:
  - Inicializar o ambiente de teste do NestJS, carregando os módulos, provedores (casos de uso, repositórios) e serviços necessários para cada teste.
  - Fornecer uma instância do `PrismaService` configurada para o banco de dados de teste.
  - Disponibilizar uma função (`createTestSetup`) que cria um ambiente de teste isolado para cada suíte de testes, garantindo que não haja interferência entre elas.
  - Oferecer uma função (`resetTestData`) para limpar o banco de dados e repovoá-lo com dados do seed antes de cada teste, garantindo um estado inicial consistente.

### 1.2. Serviço de Banco de Dados (`/test/database`)

- **`test-database.service.ts`**: Este serviço encapsula a lógica de gerenciamento do banco de dados de teste. Suas principais responsabilidades são:
  - Conectar-se ao banco de dados de teste especificado na variável de ambiente `DATABASE_TEST_URL`.
  - Fornecer métodos para limpar as tabelas do banco de dados (`reset`) e para executar o seed (`seed`).
  - Garantir que os testes sempre rodem sobre um conjunto de dados conhecido e controlado.

### 1.3. Dados de Teste (Seeds) (`/test/seeds`)

- **`test-seed.ts`**: Contém a massa de dados (seed) que é inserida no banco de dados antes da execução dos testes. Estes dados incluem:
  - Usuários com diferentes perfis.
  - Almoxarifados e Unidades de Negócio.
  - Tipos de EPI (Capacetes, Luvas, etc.).
  - Colaboradores.
  - Itens de estoque com quantidades iniciais.
  - Fichas de EPI e entregas pré-existentes.

  O uso de um seed de dados realistas é crucial para simular cenários complexos e garantir que os testes cubram casos de uso próximos da realidade da aplicação.

---

## 2. Descrição dos Testes de Integração

A seguir, uma descrição detalhada de cada arquivo de teste, agrupado por funcionalidade, refletindo as últimas alterações no schema do banco de dados.

### 2.1. Funcionalidades de Estoque (`/test/integration/estoque`)

#### `cancelar-nota-movimentacao.integration.spec.ts` (194 linhas)
- **Objetivo**: Validar o cancelamento de notas de movimentação de estoque.
- **Cenários Cobertos**:
  - **Sucesso**: Cancela uma nota com status `RASCUNHO` ou `PENDENTE`.
  - **Falha (Status Inválido)**: Retorna erro ao tentar cancelar notas `CONCLUIDA` ou `CANCELADA`, utilizando o `StatusNotaMovimentacaoEnum`.
  - **Falha (Não Encontrado)**: Garante que o sistema retorna um erro ao tentar cancelar uma nota com ID inexistente.

#### `concluir-nota-movimentacao.integration.spec.ts` (636 linhas)
- **Objetivo**: Testar a conclusão de notas e seu impacto no estoque, usando os novos tipos de movimentação.
- **Cenários Cobertos**:
  - **Sucesso (Diversos Tipos)**: Conclui notas para diferentes tipos do `TipoMovimentacaoEnum` (ex: `ENTRADA_NOTA_FISCAL`, `SAIDA_AJUSTE_INVENTARIO`) e verifica se o saldo do `EstoqueItem` correspondente é atualizado corretamente.
  - **Falha (Estoque Insuficiente)**: Previne a conclusão de uma nota de saída que deixaria o saldo do `EstoqueItem` negativo.
  - **Falha (Status Inválido)**: Impede a conclusão de notas que não estejam com o status `PENDENTE`.

#### `gerenciar-nota-rascunho.integration.spec.ts` (253 linhas)
- **Objetivo**: Testar a criação e manipulação de notas de movimentação em `RASCUNHO`.
- **Cenários Cobertos**:
  - **Sucesso**: Cria uma nota em `RASCUNHO`, adiciona e remove itens, validando a estrutura da nota e seus itens.
  - **Falha**: Impede a alteração de notas que já não estão mais em `RASCUNHO`.

#### `realizar-ajuste-direto.integration.spec.ts` (206 linhas)
- **Objetivo**: Testar a criação de movimentações de ajuste de inventário.
- **Cenários Cobertos**:
  - **Sucesso**: Cria movimentações de `ENTRADA_AJUSTE_INVENTARIO` e `SAIDA_AJUSTE_INVENTARIO`, validando a correta atualização do saldo no `EstoqueItem`.
  - **Falha (Estoque Insuficiente)**: Retorna erro ao tentar criar um ajuste de saída que negativaria o estoque.
  - **Validação**: Garante que uma justificativa é fornecida para o ajuste.

### 2.2. Funcionalidades de Fichas e Entregas (`/test/integration/fichas`)

#### `criar-ficha-epi.integration.spec.ts` (591 linhas)
- **Objetivo**: Testar a nova lógica de criação de Ficha de EPI (uma por colaborador).
- **Cenários Cobertos**:
  - **Sucesso**: Cria uma única ficha de EPI para um colaborador, com status `ATIVA` do `StatusFichaEnum`.
  - **Falha (Duplicidade)**: Impede a criação de uma segunda ficha para um colaborador que já possui uma, conforme a nova regra de negócio (`colaboradorId` é `UNIQUE`).
  - **Sucesso (Ativação/Inativação)**: Testa a alteração de status da ficha entre `ATIVA` e `INATIVA`.

#### `criar-entrega-ficha.integration.spec.ts` (353 linhas)
- **Objetivo**: Validar o novo fluxo de registro de entrega de EPIs.
- **Cenários Cobertos**:
  - **Sucesso**: Cria um registro de `Entrega` e seus `EntregaItem`, associando-os a um `estoqueItemId` específico.
  - **Sucesso (Status e Vencimento)**: Define o status inicial como `PENDENTE_ASSINATURA` (`StatusEntregaEnum`) e calcula a `dataLimiteDevolucao` com base na `vidaUtilDias` do Tipo de EPI.
  - **Falha (Estoque Insuficiente)**: Retorna erro se o `EstoqueItem` de origem não tiver saldo `DISPONIVEL`.
  - **Validação**: Verifica a existência do `responsavelId` e `colaboradorId` antes de criar a entrega.

#### `processar-devolucao.integration.spec.ts` (706 linhas)
- **Objetivo**: Testar o fluxo de devolução de EPIs, alinhado ao novo schema.
- **Cenários Cobertos**:
  - **Sucesso (Devolução Total/Parcial)**: Processa a devolução de um `EntregaItem`, alterando seu status para `DEVOLVIDO` (`StatusEntregaItemEnum`).
  - **Sucesso (Movimentação de Devolução)**: Gera uma nova movimentação do tipo `ENTRADA_DEVOLUCAO`.
  - **Sucesso (Atualização de Estoque)**: Incrementa o saldo de um `EstoqueItem` com status `AGUARDANDO_INSPECAO` (`StatusEstoqueItemEnum`).
  - **Falha**: Impede a devolução de um item que já foi devolvido ou cuja quantidade é inválida.
