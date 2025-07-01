---
type: Page
title: Epi 3.5
description: null
icon: null
createdAt: '2025-06-28T19:49:48.118Z'
creationDate: 2025-06-28 16:49
modificationDate: 2025-06-28 22:53
tags: []
coverImage: null
---

# Especificação Técnica Detalhada: Módulo de Gestão de Fichas de EPI e Estoque

**Versão**: 3.5 (Entrega Corrigida)

**Data**: 28 de junho de 2025
​

**Histórico de Revisão**:

| Versão | Data       | Resumo das Alterações                                                                                                                                                                    |
| :----- | :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.3    | 28/06/2025 | Versão inicial da especificação detalhada.                                                                                                                                               |
| 3.4    | 28/06/2025 | Incorporação de melhorias de rastreabilidade (estornos), esclarecimento de regras de negócio (assinaturas, devoluções) e correção de inconsistências em queries e especificações de API. |
| 3.5    | 28/06/2025 | Correções técnicas: adição tabela usuarios, remoção data_validade_fabricante, remoção controle concorrência, correção constraints e enum DEVOLUCAO_ATRASADA.                             |
|        |            |                                                                                                                                                                                          |

## 1. Visão Geral e Arquitetura

Este documento detalha a arquitetura e implementação do **Módulo de Gestão de Fichas de EPI e Estoque**, fundamentado em cinco pilares principais:

1. **Fonte Única da Verdade**: O saldo de itens é auditável e reconstruível a partir de um livro-razão imutável (`movimentacoes_estoque`).

2. **Performance e Consistência**: O saldo atual é mantido em um campo denormalizado (`estoque_itens.quantidade`) para performance, com sincronia garantida por transações atômicas de banco de dados.

3. **Rastreabilidade Atômica por Tipo**: Toda alteração no estoque ou nas fichas de colaboradores é registrada de forma permanente, transacional e rastreável no nível do tipo de EPI.

4. **Separação de Contextos**: Operações de estoque (agrupadas em "Notas") são separadas das operações com colaboradores (Entregas e Devoluções), garantindo clareza e interfaces específicas.

5. **API RESTful e Casos de Uso**: A lógica de negócio é encapsulada em casos de uso bem definidos, expostos por uma API RESTful, seguindo princípios de *Clean Architecture* e *CQRS*.

### 1.1. Princípio de Design: Fonte da Verdade vs. Saldo Materializado

Para garantir tanto a integridade contábil quanto a alta performance, o sistema adota um padrão de design crucial:

- **A Fonte da Verdade (Auditoria)**: A tabela `movimentacoes_estoque` é o livro-razão sagrado e imutável. Cada linha é a prova de uma transação que ocorreu. Com esta tabela, é possível reconstruir o saldo de qualquer item em qualquer ponto do tempo.

- **O Saldo Materializado (Performance)**: A coluna `estoque_itens.quantidade` é um campo calculado e denormalizado. Seu único propósito é responder instantaneamente à pergunta "Qual o saldo *agora*?".

- **O Mecanismo de Sincronização (Atomicidade)**: A consistência entre o livro-razão e o saldo materializado é garantida pelo uso de **transações atômicas de banco de dados (ACID)**. Toda e qualquer operação de escrita no estoque executa, no mínimo, duas ações dentro de uma única transação:

    1. `INSERT` na tabela `movimentacoes_estoque` (a prova).

    2. `UPDATE` na coluna `estoque_itens.quantidade` (o saldo).

### 1.2. Princípio de Design: Rastreabilidade Individual vs. Agrupamento em Massa

- **Estoque (**`estoque_itens`**)**: Agrupa quantidades por tipo de EPI e status para otimizar performance.

- **Entregas (**`entrega_itens`**)**: Cada registro representa exatamente **uma unidade entregue**, permitindo rastreabilidade individual. Se 2 luvas são entregues, são criados 2 registros separados.

### 1.3. Esclarecimento: Tipos de Nota vs. Tipos de Movimentação

É importante entender a diferença entre os tipos de documento de negócio e os tipos de movimentação no livro-razão:

- **Tipos de Nota** (`tipo_nota_enum`): Representam documentos/operações de negócio (ex: `ENTRADA`, `TRANSFERENCIA`)

- **Tipos de Movimentação** (`tipo_movimentacao_enum`): Representam o impacto específico no estoque registrado no livro-razão (ex: `ENTRADA_NOTA`, `SAIDA_TRANSFERENCIA`)

**Exemplo**: Uma nota do tipo `ENTRADA` gera uma movimentação do tipo `ENTRADA_NOTA` no livro-razão.




> DISCLAIMER: Propositalmente foi retirado dessa versão (e pode ser implementada mais junto com outras melhorias) o tratamento de concorrência quando movimentacoes simultaneas sao solicitadas, controle por lotes e data de validade. Esses pontos, apesar de importantes, não serão implementados até a validação da lógica atual, suas regras e design. O restante parece bem estruturado e suficiente para atender os primeiros projetos e coletar feedbacks antes de novas camadas de complexidade

## 2. Diagrama de Entidade-Relacionamento (ER)

Abaixo está o diagrama de entidades e suas relações (revisado para consistência):

```text
USUARIOS ||--o{ NOTAS_MOVIMENTACAO : "cria"
USUARIOS ||--o{ ENTREGAS : "realiza"
USUARIOS ||--o{ MOVIMENTACOES_ESTOQUE : "executa"
USUARIOS ||--o{ HISTORICO_FICHAS : "registra"
UNIDADES_NEGOCIO ||--o{ ALMOXARIFADOS : "possui"
ALMOXARIFADOS ||--o{ ESTOQUE_ITENS : "contém"
ALMOXARIFADOS ||--o{ NOTAS_MOVIMENTACAO : "registra em"
ALMOXARIFADOS ||--o{ ENTREGAS : "origina"
TIPOS_EPI ||--o{ ESTOQUE_ITENS : "é de um tipo"
ESTOQUE_ITENS ||--|{ MOVIMENTACOES_ESTOQUE : "sofre"
NOTAS_MOVIMENTACAO ||--|{ MOVIMENTACOES_ESTOQUE : "gera"
NOTAS_MOVIMENTACAO ||--o{ NOTA_MOVIMENTACAO_ITENS : "contém"
NOTA_MOVIMENTACAO_ITENS }o--|| ESTOQUE_ITENS : "referencia"
COLABORADORES ||--|| FICHAS_EPI : "possui"
FICHAS_EPI ||--o{ ENTREGAS : "realiza"
FICHAS_EPI ||--o{ HISTORICO_FICHAS : "gera"
ENTREGAS ||--|{ MOVIMENTACOES_ESTOQUE : "gera"
ENTREGAS ||--o{ ENTREGA_ITENS : "contém"
ENTREGA_ITENS }o--|| ESTOQUE_ITENS : "saiu de"
MOVIMENTACOES_ESTOQUE }o--|{ MOVIMENTACOES_ESTOQUE : "é estornado por"
CONFIGURACOES {
    varchar chave PK
    boolean valor
}
```

## 3. Esquema do Banco de Dados (PostgreSQL)

### 3.1. Definição dos Tipos (ENUMs)

```sql
-- Status para um tipo de EPI no catálogo
CREATE TYPE status_tipo_epi_enum AS ENUM ('ATIVO', 'DESCONTINUADO');
-- Status de um item no estoque físico
CREATE TYPE status_estoque_item_enum AS ENUM ('DISPONIVEL', 'AGUARDANDO_INSPECAO', 'QUARENTENA');
-- Tipos de notas de movimentação
CREATE TYPE tipo_nota_enum AS ENUM (
    'ENTRADA', 'TRANSFERENCIA', 'DESCARTE', 'ENTRADA_AJUSTE', 'SAIDA_AJUSTE'
);
-- Status de uma nota de movimentação
CREATE TYPE status_nota_enum AS ENUM ('RASCUNHO', 'CONCLUIDA', 'CANCELADA');
-- Tipos de movimentação no livro-razão
CREATE TYPE tipo_movimentacao_enum AS ENUM (
    -- Movimentações Diretas
    'ENTRADA_NOTA', 'SAIDA_ENTREGA', 'ENTRADA_DEVOLUCAO', 'SAIDA_TRANSFERENCIA',
    'ENTRADA_TRANSFERENCIA', 'SAIDA_DESCARTE', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO',
    -- Movimentações de Estorno/Cancelamento
    'ESTORNO_ENTRADA_NOTA', 'ESTORNO_SAIDA_ENTREGA', 'ESTORNO_ENTRADA_DEVOLUCAO',
    'ESTORNO_SAIDA_DESCARTE', 'ESTORNO_SAIDA_TRANSFERENCIA', 'ESTORNO_ENTRADA_TRANSFERENCIA',
    'ESTORNO_AJUSTE_POSITIVO', 'ESTORNO_AJUSTE_NEGATIVO'
);
-- Status da ficha de EPI geral do colaborador
CREATE TYPE status_ficha_enum AS ENUM ('ATIVA', 'INATIVA');
-- Status do evento de entrega
CREATE TYPE status_entrega_enum AS ENUM ('PENDENTE_ASSINATURA', 'ASSINADA', 'CANCELADA');
-- Status de um item entregue a um colaborador (unitário)
CREATE TYPE status_entrega_item_enum AS ENUM (
    'COM_COLABORADOR',      -- Item está com o colaborador
    'DEVOLVIDO'             -- Item foi devolvido
    -- Nota: DEVOLUCAO_ATRASADA é calculado dinamicamente em queries baseado na data_limite_devolucao
);
```

### 3.2. Definição das Tabelas

| Tabela                    | Propósito                                                              |
| :------------------------ | :--------------------------------------------------------------------- |
| `usuarios`                | Dados básicos dos usuários do sistema (simplificada para este módulo). |
| `unidades_negocio`        | Agrupa almoxarifados por centro de custo ou localização.               |
| `almoxarifados`           | Representa um local físico de armazenamento de EPIs.                   |
| `tipos_epi`               | Catálogo mestre e imutável de todos os tipos de EPIs disponíveis.      |
| `estoque_itens`           | Representa o saldo de um tipo de EPI específico em um almoxarifado.    |
| `notas_movimentacao`      | Agrupa movimentações de estoque em um único documento de negócio.      |
| `nota_movimentacao_itens` | Armazena os itens de uma nota enquanto ela está em rascunho.           |
| `movimentacoes_estoque`   | Livro-razão imutável de todas as transações de estoque.                |
| `colaboradores`           | Dados dos colaboradores (tabela mock para desenvolvimento).            |
| `fichas_epi`              | Registro mestre que vincula um colaborador ao seu histórico de EPIs.   |
| `entregas`                | Registra o evento de uma entrega, agrupando itens entregues.           |
| `entrega_itens`           | **Rastreia cada unidade individual entregue**, sua validade e status.  |
| `historico_fichas`        | Log de eventos legível por humanos sobre uma ficha específica.         |
| `configuracoes`           | Armazena parâmetros globais que alteram o comportamento do sistema.    |

### 3.3. Definição Detalhada das Colunas

#### Tabela: `usuarios`

| Coluna       | Tipo de Dado             | Constraints / Índices          | Descrição                         |
| :----------- | :----------------------- | :----------------------------- | :-------------------------------- |
| `id`         | uuid                     | PK, default uuid_generate_v4() | Identificador único do usuário.   |
| `nome`       | varchar(255)             | NOT NULL                       | Nome completo do usuário.         |
| `email`      | varchar(255)             | UNIQUE, NOT NULL               | Email do usuário (identificação). |
| `created_at` | timestamp with time zone | default now()                  | Data de criação do registro.      |

#### Tabela: `unidades_negocio`

| Coluna       | Tipo de Dado             | Constraints / Índices          | Descrição                                      |
| :----------- | :----------------------- | :----------------------------- | :--------------------------------------------- |
| `id`         | uuid                     | PK, default uuid_generate_v4() | Identificador único da unidade.                |
| `nome`       | varchar(255)             | NOT NULL                       | Nome descritivo da unidade (ex: "Obra Leste"). |
| `codigo`     | varchar(50)              | UNIQUE, NOT NULL               | Código único (ex: "OBRA_LESTE").               |
| `created_at` | timestamp with time zone | default now()                  | Data de criação do registro.                   |

#### Tabela: `almoxarifados`

| Coluna               | Tipo de Dado             | Constraints / Índices     | Descrição                                          |
| :------------------- | :----------------------- | :------------------------ | :------------------------------------------------- |
| `id`                 | uuid                     | PK                        | Identificador único do almoxarifado.               |
| `unidade_negocio_id` | uuid                     | FK -> unidades_negocio.id | Unidade de negócio à qual pertence.                |
| `nome`               | varchar(255)             | NOT NULL                  | Nome do almoxarifado (ex: "Almoxarifado Central"). |
| `is_principal`       | boolean                  | default false             | Indica se é o almoxarifado principal.              |
| `created_at`         | timestamp with time zone | default now()             | Data de criação do registro.                       |

#### Tabela: `tipos_epi`

| Coluna             | Tipo de Dado             | Constraints / Índices     | Descrição                                  |
| :----------------- | :----------------------- | :------------------------ | :----------------------------------------- |
| `id`               | uuid                     | PK                        | Identificador único do tipo de EPI.        |
| `nome_equipamento` | varchar(255)             | NOT NULL                  | Nome do EPI (ex: "Capacete de Segurança"). |
| `numero_ca`        | varchar(50)              | UNIQUE, NOT NULL          | Certificado de Aprovação (CA).             |
| `descricao`        | text                     | NULLABLE                  | Descrição técnica detalhada.               |
| `vida_util_dias`   | integer                  | NULLABLE                  | Vida útil em dias após a entrega.          |
| `status`           | status_tipo_epi_enum     | NOT NULL, default 'ATIVO' | Status do tipo de EPI.                     |
| `created_at`       | timestamp with time zone | default now()             | Data de criação do registro.               |

#### Tabela: `estoque_itens`

| Coluna            | Tipo de Dado             | Constraints / Índices                  | Descrição                                                                     |
| :---------------- | :----------------------- | :------------------------------------- | :---------------------------------------------------------------------------- |
| `id`              | uuid                     | PK                                     | Identificador único do registro de estoque.                                   |
| `almoxarifado_id` | uuid                     | FK -> almoxarifados.id, INDEX          | Almoxarifado onde o estoque está localizado.                                  |
| `tipo_epi_id`     | uuid                     | FK -> tipos_epi.id, INDEX              | Tipo de EPI deste estoque.                                                    |
| `quantidade`      | integer                  | NOT NULL, CHECK (quantidade >= 0)      | **Saldo materializado**. Representa a quantidade atual.                       |
| `custo_unitario`  | numeric(12, 2)           | NULLABLE                               | Custo de aquisição por unidade.                                               |
| `status`          | status_estoque_item_enum | NOT NULL, default 'DISPONIVEL'         | Estado do estoque.                                                            |
| `created_at`      | timestamp with time zone | default now()                          | Data de criação do registro.                                                  |
| **Constraint**    | UNIQUE                   | (almoxarifado_id, tipo_epi_id, status) | Garante unicidade: um registro por tipo de EPI, por almoxarifado, por status. |

#### Tabela: `notas_movimentacao`

| Coluna                    | Tipo de Dado             | Constraints / Índices            | Descrição                                                                                  |
| :------------------------ | :----------------------- | :------------------------------- | :----------------------------------------------------------------------------------------- |
| `id`                      | uuid                     | PK                               | Identificador único da nota.                                                               |
| `almoxarifado_id`         | uuid                     | FK -> almoxarifados.id, NOT NULL | Almoxarifado principal (origem) da operação.                                               |
| `almoxarifado_destino_id` | uuid                     | NULLABLE, FK -> almoxarifados.id | Almoxarifado de destino. Obrigatório apenas para notas do tipo TRANSFERENCIA.              |
| `responsavel_id`          | uuid                     | NOT NULL, FK -> usuarios.id      | ID do usuário do sistema que criou a nota.                                                 |
| `tipo_nota`               | tipo_nota_enum           | NOT NULL                         | Tipo de documento/operação de negócio.                                                     |
| `status`                  | status_nota_enum         | NOT NULL, default 'RASCUNHO'     | Status da nota.                                                                            |
| `numero_documento`        | varchar(255)             | NULLABLE                         | Número da nota fiscal ou código interno.                                                   |
| `data_documento`          | date                     | NOT NULL, default current_date   | Data de emissão do documento/operação.                                                     |
| `observacoes`             | text                     | NULLABLE                         | Observações gerais sobre a nota.                                                           |
| `created_at`              | timestamp with time zone | default now()                    | Data de criação do registro.                                                               |
| **Constraint 1**          | CHECK                    | `chk_transferencia_destino`      | Garante que `almoxarifado_destino_id` só seja preenchido se `tipo_nota` for TRANSFERENCIA. |
| **Constraint 2**          | CHECK                    | `chk_transferencia_diferente`    | Garante que origem e destino sejam diferentes em transferências.                           |

**Definição das Constraints de Integridade:**

```sql
ALTER TABLE notas_movimentacao
ADD CONSTRAINT chk_transferencia_destino
CHECK (
    (tipo_nota = 'TRANSFERENCIA' AND almoxarifado_destino_id IS NOT NULL) OR
    (tipo_nota <> 'TRANSFERENCIA' AND almoxarifado_destino_id IS NULL)
);
ALTER TABLE notas_movimentacao
ADD CONSTRAINT chk_transferencia_diferente
CHECK (
    tipo_nota <> 'TRANSFERENCIA' OR 
    (almoxarifado_id != almoxarifado_destino_id)
);
```

#### Tabela: `nota_movimentacao_itens`

*Propósito: Armazena os detalhes de cada item dentro de uma* `notas_movimentacao` *enquanto ela está no estado* `'RASCUNHO'`*. Esta tabela é a fonte para a criação dos registros em* `movimentacoes_estoque` *quando a nota é concluída.*

| Coluna                 | Tipo de Dado   | Constraints / Índices            | Descrição                                                                                                     |
| :--------------------- | :------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `id`                   | uuid           | PK                               | Identificador único do item da nota.                                                                          |
| `nota_movimentacao_id` | uuid           | FK -> notas_movimentacao.id      | Nota à qual este item pertence.                                                                               |
| `quantidade`           | integer        | NOT NULL, CHECK (quantidade > 0) | Quantidade de unidades a serem movidas.                                                                       |
| `estoque_item_id`      | uuid           | NULLABLE, FK -> estoque_itens.id | Referência ao estoque existente (para saídas/transferências).                                                 |
| `tipo_epi_id`          | uuid           | NULLABLE, FK -> tipos_epi.id     | Tipo de EPI (para novas entradas).                                                                            |
| `custo_unitario`       | numeric(12, 2) | NULLABLE                         | Custo do item (para novas entradas).                                                                          |
| **Constraint**         | **CHECK**      | `chk_item_type`                  | Garante que `estoque_item_id` está preenchido (saídas) OU os campos descritivos estão preenchidos (entradas). |

**Definição da Constraint:**

```sql
ALTER TABLE nota_movimentacao_itens
ADD CONSTRAINT chk_item_type
CHECK (
    (estoque_item_id IS NOT NULL AND tipo_epi_id IS NULL) OR
    (estoque_item_id IS NULL AND tipo_epi_id IS NOT NULL)
);
```

#### Tabela: `movimentacoes_estoque` (Revisada)

| Coluna                   | Tipo de Dado             | Constraints / Índices                        | Descrição                                                                                     |
| :----------------------- | :----------------------- | :------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| `id`                     | uuid                     | PK                                           | Identificador único da movimentação.                                                          |
| `estoque_item_id`        | uuid                     | FK -> estoque_itens.id, INDEX                | Item de estoque afetado.                                                                      |
| `responsavel_id`         | uuid                     | NOT NULL, FK -> usuarios.id                  | ID do usuário que realizou a operação.                                                        |
| `tipo_movimentacao`      | tipo_movimentacao_enum   | NOT NULL, INDEX                              | Natureza da transação física no estoque.                                                      |
| `quantidade_movida`      | integer                  | NOT NULL, CHECK (quantidade_movida > 0)      | Quantidade de itens movidos.                                                                  |
| `nota_movimentacao_id`   | uuid                     | NULLABLE, FK -> notas_movimentacao.id, INDEX | Aponta para a nota que originou a movimentação.                                               |
| `entrega_id`             | uuid                     | NULLABLE, FK -> entregas.id, INDEX           | Aponta para a entrega que originou a movimentação.                                            |
| `movimentacao_origem_id` | uuid                     | NULLABLE, FK -> movimentacoes_estoque.id     | ID da movimentação original (preenchido **apenas** para movimentações de estorno).            |
| `data_movimentacao`      | timestamp with time zone | default now()                                | Data e hora da movimentação.                                                                  |
| **Constraint 1**         | CHECK                    | `chk_movimentacao_origem`                    | Garante que `nota_movimentacao_id` ou `entrega_id` (mas não ambos) seja preenchido.           |
| **Constraint 2**         | CHECK                    | `chk_estorno_origem`                         | Garante que `movimentacao_origem_id` seja preenchido se, e somente se, o tipo for de estorno. |
| **Constraint 3**         | CHECK                    | `chk_nao_estornar_estorno`                   | Impede que movimentações de estorno sejam estornadas.                                         |

**Definição das Constraints de Integridade:**

```sql
ALTER TABLE movimentacoes_estoque
ADD CONSTRAINT chk_movimentacao_origem
CHECK (
    (nota_movimentacao_id IS NOT NULL AND entrega_id IS NULL) OR
    (nota_movimentacao_id IS NULL AND entrega_id IS NOT NULL)
);
ALTER TABLE movimentacoes_estoque
ADD CONSTRAINT chk_estorno_origem
CHECK (
    (tipo_movimentacao IN (
        'ESTORNO_ENTRADA_NOTA', 'ESTORNO_SAIDA_ENTREGA', 'ESTORNO_ENTRADA_DEVOLUCAO',
        'ESTORNO_SAIDA_DESCARTE', 'ESTORNO_SAIDA_TRANSFERENCIA', 'ESTORNO_ENTRADA_TRANSFERENCIA',
        'ESTORNO_AJUSTE_POSITIVO', 'ESTORNO_AJUSTE_NEGATIVO'
    ) AND movimentacao_origem_id IS NOT NULL) OR
    (tipo_movimentacao NOT IN (
        'ESTORNO_ENTRADA_NOTA', 'ESTORNO_SAIDA_ENTREGA', 'ESTORNO_ENTRADA_DEVOLUCAO',
        'ESTORNO_SAIDA_DESCARTE', 'ESTORNO_SAIDA_TRANSFERENCIA', 'ESTORNO_ENTRADA_TRANSFERENCIA',
        'ESTORNO_AJUSTE_POSITIVO', 'ESTORNO_AJUSTE_NEGATIVO'
    ) AND movimentacao_origem_id IS NULL)
);
-- Constraint para impedir estorno de estorno via trigger
CREATE OR REPLACE FUNCTION check_nao_estornar_estorno()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movimentacao_origem_id IS NOT NULL THEN
        -- Verifica se a movimentação original é um estorno
        IF EXISTS (
            SELECT 1 FROM movimentacoes_estoque 
            WHERE id = NEW.movimentacao_origem_id 
            AND tipo_movimentacao LIKE 'ESTORNO_%'
        ) THEN
            RAISE EXCEPTION 'Não é possível estornar uma movimentação de estorno';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_nao_estornar_estorno
    BEFORE INSERT ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION check_nao_estornar_estorno();
```

#### Tabela: `colaboradores`

*Tabela mock para desenvolvimento. Estrutura mínima sugerida:*

| Coluna | Tipo de Dado | Constraints | Descrição                          |
| :----- | :----------- | :---------- | :--------------------------------- |
| `id`   | uuid         | PK          | Identificador único do colaborador |
| `nome` | varchar(255) | NOT NULL    | Nome do colaborador                |

#### Tabela: `fichas_epi`

| Coluna           | Tipo de Dado             | Constraints / Índices          | Descrição                                          |
| :--------------- | :----------------------- | :----------------------------- | :------------------------------------------------- |
| `id`             | uuid                     | PK                             | Identificador único da ficha.                      |
| `colaborador_id` | uuid                     | FK -> colaboradores.id, UNIQUE | Colaborador associado (uma ficha por colaborador). |
| `data_emissao`   | date                     | NOT NULL, default current_date | Data de criação da ficha.                          |
| `status`         | status_ficha_enum        | NOT NULL, default 'ATIVA'      | Status geral da ficha.                             |
| `created_at`     | timestamp with time zone | default now()                  | Data de criação do registro.                       |

#### Tabela: `entregas`

| Coluna            | Tipo de Dado             | Constraints / Índices                   | Descrição                                   |
| :---------------- | :----------------------- | :-------------------------------------- | :------------------------------------------ |
| `id`              | uuid                     | PK                                      | Identificador único do evento de entrega.   |
| `ficha_epi_id`    | uuid                     | FK -> fichas_epi.id, INDEX              | Ficha à qual a entrega pertence.            |
| `almoxarifado_id` | uuid                     | FK -> almoxarifados.id, NOT NULL, INDEX | Almoxarifado de onde a entrega se originou. |
| `responsavel_id`  | uuid                     | NOT NULL, FK -> usuarios.id             | ID do usuário que realizou a entrega.       |
| `data_entrega`    | timestamp with time zone | default now()                           | Data e hora da entrega.                     |
| `status`          | status_entrega_enum      | NOT NULL, default 'PENDENTE_ASSINATURA' | Status da entrega.                          |
| `link_assinatura` | text                     | NULLABLE                                | URL para documento de assinatura digital.   |
| `data_assinatura` | timestamp with time zone | NULLABLE                                | Data e hora da assinatura coletada.         |

#### Tabela: `entrega_itens` (Revisada)

| Coluna                   | Tipo de Dado             | Constraints / Índices               | Descrição                                                  |
| :----------------------- | :----------------------- | :---------------------------------- | :--------------------------------------------------------- |
| `id`                     | uuid                     | PK                                  | Identificador único da unidade entregue.                   |
| `entrega_id`             | uuid                     | FK -> entregas.id, INDEX            | Evento de entrega que gerou este item.                     |
| `estoque_item_origem_id` | uuid                     | FK -> estoque_itens.id              | Item de estoque de onde a unidade saiu.                    |
| `quantidade_entregue`    | integer                  | NOT NULL, default 1                 | **Sempre 1** - cada registro representa uma única unidade. |
| `data_limite_devolucao`  | date                     | NULLABLE                            | Data limite para devolução da unidade.                     |
| `status`                 | status_entrega_item_enum | NOT NULL, default 'COM_COLABORADOR' | Estado atual da unidade.                                   |
| `created_at`             | timestamp with time zone | default now()                       | Data de criação do registro.                               |
| **Constraint**           | CHECK                    | `chk_quantidade_unitaria`           | Garante que `quantidade_entregue` seja sempre 1.           |

**Definição da Constraint de Quantidade Unitária:**

```sql
ALTER TABLE entrega_itens
ADD CONSTRAINT chk_quantidade_unitaria
CHECK (quantidade_entregue = 1);
```

#### Tabela: `historico_fichas`

| Coluna           | Tipo de Dado             | Constraints / Índices       | Descrição                                                 |
| :--------------- | :----------------------- | :-------------------------- | :-------------------------------------------------------- |
| `id`             | uuid                     | PK                          | Identificador único do registro de histórico.             |
| `ficha_epi_id`   | uuid                     | FK -> fichas_epi.id, INDEX  | Ficha relacionada ao evento.                              |
| `responsavel_id` | uuid                     | NOT NULL, FK -> usuarios.id | ID do usuário que gerou o evento.                         |
| `acao`           | text                     | NOT NULL                    | Descrição legível da ação (ex: "Entrega #123 Realizada"). |
| `detalhes`       | jsonb                    | NULLABLE                    | JSON com dados contextuais do evento.                     |
| `data_acao`      | timestamp with time zone | default now()               | Data e hora do evento.                                    |

#### Tabela: `configuracoes`

| Coluna      | Tipo de Dado | Constraints / Índices | Descrição                                                              |
| :---------- | :----------- | :-------------------- | :--------------------------------------------------------------------- |
| `chave`     | varchar(255) | PK                    | Identificador único da configuração (ex: 'PERMITIR_ESTOQUE_NEGATIVO'). |
| `valor`     | boolean      | NOT NULL              | Valor booleano da configuração.                                        |
| `descricao` | text         | NULLABLE              | Descrição do que a configuração afeta.                                 |

### 3.4. Índices Recomendados para Performance

Para garantir a performance de relatórios e consultas, a criação dos seguintes índices é recomendada:

```sql
-- Para otimizar a geração de relatórios de movimentação (Kardex)
CREATE INDEX idx_movimentacoes_data ON movimentacoes_estoque (data_movimentacao);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes_estoque (tipo_movimentacao);
-- Para otimizar a busca por EPIs com devolução atrasada (Relatório R-07)
CREATE INDEX idx_entrega_itens_devolucao ON entrega_itens (data_limite_devolucao);
CREATE INDEX idx_entrega_itens_status ON entrega_itens (status);
-- Para otimizar consultas de disponibilidade no estoque
CREATE INDEX idx_estoque_itens_status ON estoque_itens (status);
-- Para otimizar JOINs frequentes
CREATE INDEX idx_notas_movimentacao_status ON notas_movimentacao (status);
CREATE INDEX idx_notas_movimentacao_tipo ON notas_movimentacao (tipo_nota);
CREATE INDEX idx_entregas_status ON entregas (status);
-- Índices compostos para queries específicas
CREATE INDEX idx_estoque_disponivel ON estoque_itens (almoxarifado_id, tipo_epi_id, status) 
WHERE status = 'DISPONIVEL';
CREATE INDEX idx_itens_com_colaborador ON entrega_itens (status, data_limite_devolucao) 
WHERE status = 'COM_COLABORADOR';
-- Índice para rastreabilidade de estornos
CREATE INDEX idx_movimentacao_origem ON movimentacoes_estoque (movimentacao_origem_id);
-- Índices para Foreign Keys
CREATE INDEX idx_usuarios_email ON usuarios (email);
CREATE INDEX idx_movimentacoes_responsavel ON movimentacoes_estoque (responsavel_id);
CREATE INDEX idx_entregas_responsavel ON entregas (responsavel_id);
CREATE INDEX idx_historico_responsavel ON historico_fichas (responsavel_id);
```

## 4. Relação Entre Eventos e Registros (Tabela da Verdade)

| Evento de Negócio         | Gera `nota_movimentacao`?                  | `tipo_movimentacao` Resultante                                                   | Origem da Movimentação                    |
| :------------------------ | :----------------------------------------- | :------------------------------------------------------------------------------- | :---------------------------------------- |
| Compra de EPIs            | ✅ Sim (`ENTRADA`)                          | `ENTRADA_NOTA`                                                                   | `nota_movimentacao_id`                    |
| Devolução do Colaborador  | ❌ Não                                      | `ENTRADA_DEVOLUCAO`                                                              | `entrega_id` (da entrega original)        |
| Entrega ao Colaborador    | ❌ Não                                      | `SAIDA_ENTREGA`                                                                  | `entrega_id`                              |
| Transferência Interna     | ✅ Sim (`TRANSFERENCIA`)                    | `SAIDA_TRANSFERENCIA`, `ENTRADA_TRANSFERENCIA`                                   | `nota_movimentacao_id`                    |
| Descarte de Itens         | ✅ Sim (`DESCARTE`)                         | `SAIDA_DESCARTE`                                                                 | `nota_movimentacao_id`                    |
| Ajuste de Estoque         | ✅ Sim (`ENTRADA_AJUSTE` ou `SAIDA_AJUSTE`) | `AJUSTE_POSITIVO` ou `AJUSTE_NEGATIVO`                                           | `nota_movimentacao_id`                    |
| Cancelamento de Entrega   | ❌ Não                                      | `ESTORNO_SAIDA_ENTREGA`                                                          | `entrega_id` (da entrega cancelada)       |
| Cancelamento de Devolução | ❌ Não                                      | `ESTORNO_ENTRADA_DEVOLUCAO`                                                      | `entrega_id` (da entrega original)        |
| Cancelamento de Nota      | ❌ Não                                      | Movimentações de estorno (ex: `ESTORNO_ENTRADA_NOTA`, `ESTORNO_AJUSTE_POSITIVO`) | `nota_movimentacao_id` (da nota original) |

## 5. Lógica de Negócio e Casos de Uso (Revisado)

### 5.1. Casos de Uso de Estoque (Notas)

**UC-ESTOQUE-01: Gerenciar Nota em Rascunho**

- **Descrição**: Cria e gerencia registros em `notas_movimentacao` com status `'RASCUNHO'`. Esta é uma funcionalidade de usabilidade que permite que usuários criem notas e as completem posteriormente.

- **Funcionalidades Incluídas**:

    - Criar nova nota em rascunho

    - Adicionar itens à nota (com validação em tempo real)

    - Remover itens da nota

    - Atualizar dados gerais da nota

    - Validar disponibilidade de estoque ao adicionar itens

- **Validações em Tempo Real**: Ao adicionar um item à nota, o sistema verifica se há estoque suficiente (se `PERMITIR_ESTOQUE_NEGATIVO = false`) e alerta o usuário imediatamente.

- **Pós-condição**: Nota permanece em `'RASCUNHO'` sem impacto no estoque real até ser concluída.

**UC-ESTOQUE-02: Concluir Nota de Movimentação**

- **Descrição**: Percorre todos os registros em `nota_movimentacao_itens` associados à nota. Para cada item, cria a movimentação de estoque correspondente e atualiza o saldo.

- **Mapeamento** `tipo_nota` **->** `tipo_movimentacao`:

    - `ENTRADA`: Gera `ENTRADA_NOTA`. Cria novo registro em `estoque_itens` se não existir para o (almoxarifado, tipo_epi, status='DISPONIVEL').

    - `SAIDA_AJUSTE`: Gera `AJUSTE_NEGATIVO`.

    - `DESCARTE`: Gera `SAIDA_DESCARTE`.

    - `TRANSFERENCIA`: Gera `SAIDA_TRANSFERENCIA` (origem) e `ENTRADA_TRANSFERENCIA` (destino, sempre status='DISPONIVEL').

    - `ENTRADA_AJUSTE`: Gera `AJUSTE_POSITIVO`.

- **Lógica de Transferência**:

    - No almoxarifado de origem: Busca `estoque_itens` com status='DISPONIVEL'

    - No almoxarifado de destino: Busca ou cria `estoque_itens` com status='DISPONIVEL'

    - Preserva `custo_unitario` do item original

- **Regras de Validação Final**:

    - Se `PERMITIR_ESTOQUE_NEGATIVO = false`, valida novamente cada item antes de concluir

    - Se algum item não tem estoque suficiente, retorna erro detalhado com lista de problemas

    - Operação é atômica: ou todos os itens são processados ou nenhum

- **Pós-condição**: Nota alterada para `'CONCLUIDA'`, estoque atualizado, movimentações registradas.

**UC-ESTOQUE-03: Cancelar Nota de Movimentação**

- **Pré-condição**: A nota existe.

- **Passos**:

    1. Verifica o status atual da nota.

    2. **Se** `'RASCUNHO'`: Altera status para `'CANCELADA'` (sem impacto no estoque).

    3. **Se** `'CONCLUIDA'`:

        - Consulta movimentações via `nota_movimentacao_id`

        - Gera estornos correspondentes (ex: `ESTORNO_ENTRADA_NOTA`)

        - Para transferências: gera dois estornos (origem e destino)

        - Preenche `movimentacao_origem_id` nos registros de estorno

        - Atualiza saldos em transação atômica

        - Altera status para `'CANCELADA'`

    4. **Se** `'CANCELADA'`: Retorna erro.

**UC-ESTOQUE-04: Realizar Ajuste Direto**

- **Descrição**: Permite ajuste imediato no estoque sem passar pelo fluxo de rascunho. Usado para correções rápidas.

- **Pré-condição**: `PERMITIR_AJUSTES_FORCADOS = true`

- **Passos**:

    1. Cria nota do tipo apropriado (`ENTRADA_AJUSTE` ou `SAIDA_AJUSTE`)

    2. Adiciona o item à nota

    3. Conclui a nota imediatamente

    4. Gera movimentação `AJUSTE_POSITIVO` ou `AJUSTE_NEGATIVO`

### 5.2. Casos de Uso da Ficha de EPI

**UC-FICHA-01: Criar Tipo de EPI**: Inserção na tabela `tipos_epi`.

**UC-FICHA-02: Criar Ficha de EPI do Colaborador**:

- **Pré-condição**: Recebe um `colaborador_id`.

- **Passos**:

    1. Verifica se já existe ficha para o colaborador

    2. **Se existe**: Retorna erro 409 com ID da ficha existente

    3. **Se não existe**: Cria ficha e registra no histórico

- **Pós-condição**: Nova ficha criada e vinculada ao colaborador.

**UC-FICHA-03: Criar Entrega na Ficha de EPI**

- **Regras de Negócio (Revisadas e Esclarecidas)**:

    1. **Validação de Almoxarifado**: Todos os `estoque_item_id` devem pertencer ao `almoxarifado_id` informado

    2. **Validação de Status**: Só pode entregar itens com `status = 'DISPONIVEL'`

    3. **Validação de Saldo**: Se `PERMITIR_ESTOQUE_NEGATIVO = false`, verifica saldo suficiente

    4. **Cálculo de Validade**: Se `tipos_epi.vida_util_dias` existe, calcula `data_limite_devolucao` como `data_entrega + vida_util_dias`. O usuário pode editar esta data no momento da entrega.

    5. **Criação Unitária e Lógica da API**: A API recebe uma lista de itens com um campo `quantidade`. Para cada item dessa lista, o sistema **deve iterar sobre a** `quantidade` **e criar um registro individual e unitário na tabela** `entrega_itens`. Por exemplo, uma requisição para entregar 2 luvas (`quantidade: 2`) resultará na criação de **2 registros** separados em `entrega_itens`, ambos com `quantidade_entregue = 1`. Isso é fundamental para a rastreabilidade atômica de cada unidade.

- **Passos**:

    1. Cria registro em `entregas`

    2. Para cada unidade a ser entregue:

        - Cria um registro em `entrega_itens` com `quantidade_entregue = 1`

        - Gera movimentação `SAIDA_ENTREGA` (quantidade total)

    3. Atualiza saldo do `estoque_itens`

**Regra de Negócio Adicional: Assinatura de Entregas**

- Uma entrega com status `'PENDENTE_ASSINATURA'` é considerada provisória. O sistema deve impor a seguinte regra: **não é permitido processar a devolução (UC-FICHA-04) de nenhum item pertencente a uma entrega que não esteja com o status** `'ASSINADA'`. A coleta da assinatura e a atualização do status para `'ASSINADA'` é um pré-requisito para o ciclo de vida de devolução do EPI.

**UC-FICHA-04: Processar Devolução de Itens**

- **Pré-condição Adicional**: A entrega original dos itens a serem devolvidos deve ter o status `'ASSINADA'`.

- **Descrição**: Registra retorno individual de EPIs ao estoque para análise.

- **Passos**:

    1. Recebe lista de IDs de `entrega_itens` a devolver (cada ID = 1 unidade)

    2. Valida que todas as entregas estão com status `'ASSINADA'`

    3. Para cada item:

        - Verifica se status é 'COM_COLABORADOR'

        - Atualiza status para 'DEVOLVIDO'

    4. Agrupa por tipo_epi e almoxarifado para criar movimentações

    5. Busca ou cria `estoque_itens` com `status = 'AGUARDANDO_INSPECAO'`

    6. Cria movimentação `ENTRADA_DEVOLUCAO` com a quantidade total devolvida

    7. Incrementa saldo do estoque em inspeção

- **Pós-condição**: Unidades devolvidas ficam em estoque segregado para análise.

**UC-FICHA-05: Cancelar uma Entrega**:

- Reverte movimentações de estoque

- Altera status da entrega para `'CANCELADA'`

- Remove todos os registros de `entrega_itens` associados

**UC-FICHA-06: Cancelar uma Devolução**

- **Passos**:

    1. Identifica itens afetados pela movimentação de devolução

    2. Reverte status de 'DEVOLVIDO' para 'COM_COLABORADOR'

    3. Gera `ESTORNO_ENTRADA_DEVOLUCAO`. A nova movimentação de estorno terá seu campo `movimentacao_origem_id` preenchido com o ID da movimentação de devolução original.

    4. Ajusta saldos em transação atômica.

### 5.3. Casos de Uso de Visualização (Queries)

**UC-QUERY-01: Visualizar Histórico da Ficha de EPI**: `SELECT * FROM historico_fichas WHERE ficha_epi_id = ? ORDER BY data_acao DESC`.

**UC-QUERY-02: Visualizar Histórico de Movimentação de um Item (Kardex)**: `SELECT * FROM movimentacoes_estoque WHERE estoque_item_id = ? ORDER BY data_movimentacao DESC`.

## 6. Relatórios e Consultas (Revisado)

- **R-01: Saldo de Estoque**: `SELECT * FROM estoque_itens` com filtros por `almoxarifado_id`, `tipo_epi_id`.

- **R-02: Movimentações de Estoque (Kardex)**: `SELECT * FROM movimentacoes_estoque` com filtros por `almoxarifado_id` e período.

- **R-03: EPIs Ativos com Colaboradores (Sintético)**:

    ```sql
    SELECT 
        est.tipo_epi_id,
        te.nome_equipamento,
        COUNT(ei.id) as quantidade_com_colaboradores
    FROM entrega_itens ei
    JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
    JOIN tipos_epi te ON est.tipo_epi_id = te.id
    WHERE ei.status = 'COM_COLABORADOR'
    GROUP BY est.tipo_epi_id, te.nome_equipamento;
    ```

- **R-04: EPIs Ativos com Colaboradores (Detalhado)**:

    ```sql
    SELECT 
        c.nome as colaborador,
        te.nome_equipamento,
        ei.data_limite_devolucao,
        ei.status,
        CASE 
            WHEN ei.status = 'COM_COLABORADOR' AND ei.data_limite_devolucao < CURRENT_DATE 
            THEN true 
            ELSE false 
        END as devolucao_atrasada
    FROM entrega_itens ei
    JOIN entregas e ON ei.entrega_id = e.id
    JOIN fichas_epi f ON e.ficha_epi_id = f.id
    JOIN colaboradores c ON f.colaborador_id = c.id
    JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
    JOIN tipos_epi te ON est.tipo_epi_id = te.id
    WHERE ei.status = 'COM_COLABORADOR'
    ORDER BY c.nome, te.nome_equipamento;
    ```

- **R-05: EPIs Devolvidos e Descartados**: Correlaciona `movimentacoes_estoque` do tipo `ENTRADA_DEVOLUCAO` e `SAIDA_DESCARTE` para o mesmo item de estoque. *Nota: A correlação entre devolução e descarte requer análise temporal dos registros.*

- **R-06: EPIs Devolvidos em Análise/Quarentena**: `SELECT * FROM estoque_itens WHERE status IN ('AGUARDANDO_INSPECAO', 'QUARENTENA')`.

- **R-07: Fichas com Devolução Atrasada (Corrigido)**

    - **Lógica:** Este relatório identifica colaboradores que possuem itens cuja data limite de devolução já passou e que ainda não foram devolvidos. O status de "devolução atrasada" é calculado dinamicamente.

    - **Query Corrigida:**

        ```sql
        SELECT DISTINCT    f.id as ficha_id,    c.nome as colaborador,    te.nome_equipamento,    ei.data_limite_devolucao,    COUNT(ei.id) as quantidade_itens_atrasadosFROM entrega_itens eiJOIN entregas e ON ei.entrega_id = e.idJOIN fichas_epi f ON e.ficha_epi_id = f.idJOIN colaboradores c ON f.colaborador_id = c.idJOIN estoque_itens est ON ei.estoque_item_origem_id = est.idJOIN tipos_epi te ON est.tipo_epi_id = te.idWHERE ei.status = 'COM_COLABORADOR'  AND ei.data_limite_devolucao IS NOT NULL  AND ei.data_limite_devolucao < CURRENT_DATEGROUP BY f.id, c.nome, te.nome_equipamento, ei.data_limite_devolucaoORDER BY ei.data_limite_devolucao ASC, c.nome;
        ```

- **R-08: Pesquisar Fichas por Tipo de EPI**: `SELECT * FROM fichas_epi` com joins para filtrar por `tipo_epi_id`.

- **R-09: Relatório de Itens Descartados**:

    ```sql
    SELECT
        m.data_movimentacao,
        te.nome_equipamento,
        m.quantidade_movida,
        a.nome AS almoxarifado_origem,
        u.nome AS responsavel
    FROM
        movimentacoes_estoque m
    JOIN
        estoque_itens ei ON m.estoque_item_id = ei.id
    JOIN
        tipos_epi te ON ei.tipo_epi_id = te.id
    JOIN
        almoxarifados a ON ei.almoxarifado_id = a.id
    JOIN
        usuarios u ON m.responsavel_id = u.id
    WHERE
        m.tipo_movimentacao = 'SAIDA_DESCARTE'
    ORDER BY
        m.data_movimentacao DESC;
    ```

- **R-10: Relatório de Estornos**:

    ```sql
    SELECT
        m.data_movimentacao,
        m.tipo_movimentacao,
        m.quantidade_movida,
        te.nome_equipamento,
        mo.data_movimentacao as data_movimentacao_original,
        mo.tipo_movimentacao as tipo_movimentacao_original,
        u.nome as responsavel_estorno,
        uo.nome as responsavel_original
    FROM
        movimentacoes_estoque m
    JOIN
        movimentacoes_estoque mo ON m.movimentacao_origem_id = mo.id
    JOIN
        estoque_itens ei ON m.estoque_item_id = ei.id
    JOIN
        tipos_epi te ON ei.tipo_epi_id = te.id
    JOIN
        usuarios u ON m.responsavel_id = u.id
    JOIN
        usuarios uo ON mo.responsavel_id = uo.id
    WHERE
        m.tipo_movimentacao LIKE 'ESTORNO_%'
    ORDER BY
        m.data_movimentacao DESC;
    ```

## 7. Configurações do Sistema

| Chave                       | Valor   | Descrição                                                               | Impacto                                                                                          |
| :-------------------------- | :------ | :---------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| `PERMITIR_ESTOQUE_NEGATIVO` | boolean | Permite ou não que o saldo de `estoque_itens` fique negativo.           | A API deve validar o saldo antes de processar qualquer operação de saída se o valor for `false`. |
| `PERMITIR_AJUSTES_FORCADOS` | boolean | Habilita ou desabilita a funcionalidade de ajuste manual de inventário. | A API deve bloquear os endpoints de ajuste direto se o valor for `false`.                        |

## 8. Especificação da API RESTful (Revisada)

### 8.1. Recursos de Notas de Movimentação

- `POST /api/notas-movimentacao`: Cria nota em `'RASCUNHO'` (UC-ESTOQUE-01).

    - **Corpo**: `{ "tipo_nota": "...", "almoxarifado_id": "...", "almoxarifado_destino_id": "..." }`

- `PUT /api/notas-movimentacao/{notaId}`: Atualiza dados da nota em rascunho (UC-ESTOQUE-01).

- `POST /api/notas-movimentacao/{notaId}/itens`: Adiciona item à nota em rascunho (UC-ESTOQUE-01).

    - **Corpo**: `{ "estoque_item_id": "...", "quantidade": X }` ou `{ "tipo_epi_id": "...", "quantidade": X, "custo_unitario": Y }`

- `DELETE /api/notas-movimentacao/{notaId}/itens/{itemId}`: Remove item da nota em rascunho (UC-ESTOQUE-01).

- `PUT /api/notas-movimentacao/{notaId}/concluir`: Conclui nota (UC-ESTOQUE-02).

- `POST /api/notas-movimentacao/{notaId}/cancelar`: Cancela nota (UC-ESTOQUE-03).

- `GET /api/notas-movimentacao`: Lista notas com filtros.

- `GET /api/notas-movimentacao/{notaId}`: Detalhes de uma nota.

- `GET /api/estoque-itens/{itemId}/historico`: Histórico de movimentação (UC-QUERY-02).

### 8.2. Recursos de Ajustes Diretos

- `POST /api/estoque/ajustes`: Realiza ajuste direto (UC-ESTOQUE-04).

    - **Pré-condição**: `PERMITIR_AJUSTES_FORCADOS = true`

    - **Corpo**: `{ "estoque_item_id": "...", "tipo_ajuste": "POSITIVO|NEGATIVO", "quantidade": X, "motivo": "..." }`

### 8.3. Recursos de Movimentações

- `POST /api/movimentacoes/{movimentacaoId}/estornar`: Estorna uma movimentação concluída.

    - **Descrição**: Verifica se a movimentação é estornável (não é um estorno de estorno) e gera o registro de estorno correspondente, preenchendo o campo `movimentacao_origem_id`.

    - **Validações**:

        - Movimentação existe e não é um estorno

        - Movimentação não foi previamente estornada

        - Há saldo suficiente para o estorno (se aplicável)

    - **Respostas Possíveis**:

        - `200 OK`: Corpo contém o ID da nova movimentação de estorno.

        - `404 Not Found`: O `movimentacaoId` não existe.

        - `409 Conflict`: A movimentação não é estornável, já foi estornada, ou é um estorno.

### 8.4. Recursos de Fichas, Entregas e Devoluções

- `POST /api/tipos-epi`: Cria tipo de EPI (UC-FICHA-01).

- `POST /api/fichas-epi`: Cria ficha de EPI (UC-FICHA-02).

    - **Corpo**: `{ "colaborador_id": "..." }`

    - **Sucesso (201)**: Retorna a ficha criada.

    - **Erro (409)**: `{"message": "Ficha já existe.", "ficha_id": "..."}`

- `GET /api/fichas-epi/{fichaId}/historico`: Histórico da ficha (UC-QUERY-01).

- `POST /api/fichas-epi/{fichaId}/entregas`: Registra entrega (UC-FICHA-03).

    - **Corpo**:

        ```json
        {    "almoxarifado_id": "...",    "itens": [        {            "estoque_item_id": "...",            "quantidade": 2, // O sistema criará 2 registros unitários em 'entrega_itens'            "data_limite_devolucao": "2025-12-31"        }    ]}
        ```

    - **Comportamento**: A API valida a `quantidade` e cria múltiplos registros unitários em `entrega_itens` conforme descrito na regra de negócio (Seção 5.2).

- `POST /api/entregas/{entregaId}/cancelar`: Cancela entrega (UC-FICHA-05).

- `POST /api/devolucoes`: Processa devolução (UC-FICHA-04).

    - **Corpo**:

        ```json
        {     "entrega_item_ids": ["item_001", "item_002", ...]}
        ```

    - **Resposta**: Retorna os IDs das movimentações `ENTRADA_DEVOLUCAO` criadas (agrupadas por tipo/almoxarifado).

- `GET /api/entregas/{entregaId}/itens`: Lista todos os itens unitários de uma entrega.

    - **Resposta**:

        ```json
        {    "entrega_id": "...",    "itens": [        {            "id": "item_001",            "tipo_epi": "Luva de Proteção",            "status": "COM_COLABORADOR",            "data_limite_devolucao": "2025-12-31",            "devolucao_atrasada": false        },        {            "id": "item_002",            "tipo_epi": "Luva de Proteção",            "status": "DEVOLVIDO",            "data_limite_devolucao": "2025-12-31",            "devolucao_atrasada": false        }    ]}
        ```

- `PUT /api/entregas/{entregaId}/assinar`: Atualiza status da entrega para 'ASSINADA'.

    - **Corpo**: `{ "data_assinatura": "2025-06-28T10:00:00Z", "link_assinatura": "https://..." }`

### 8.5. Recursos de Relatórios

- `GET /api/relatorios/saldo-estoque`: Saldo de estoque (R-01).

- `GET /api/relatorios/movimentacoes-estoque`: Movimentações (R-02).

- `GET /api/relatorios/epis-ativos-sintetico`: EPIs ativos sintético (R-03).

- `GET /api/relatorios/epis-ativos-detalhado`: EPIs ativos detalhado (R-04).

- `GET /api/relatorios/epis-devolucao-atrasada`: Fichas com devolução atrasada (R-07).

- `GET /api/relatorios/itens-descartados`: Itens descartados (R-09).

- `GET /api/relatorios/estornos`: Relatório de estornos (R-10).

### 8.6. Recursos de Usuários

- `GET /api/usuarios`: Lista usuários do sistema.

- `GET /api/usuarios/{usuarioId}`: Detalhes de um usuário.

- `POST /api/usuarios`: Cria novo usuário.

    - **Corpo**: `{ "nome": "...", "email": "..." }`

## 9. Anexo A: Fluxos Operacionais Comuns

### 9.1. Como Descartar Itens

**Passos no Sistema**:

1. **Criar Nota de Descarte**: `POST /api/notas-movimentacao` com `{"tipo_nota": "DESCARTE", "almoxarifado_id": "..."}`

2. **Adicionar Itens**: `POST /api/notas-movimentacao/{notaId}/itens` para cada item a descartar

3. **Concluir**: `PUT /api/notas-movimentacao/{notaId}/concluir`

4. **Resultado**: Movimentações `SAIDA_DESCARTE` criadas, saldos decrementados

### 9.2. Como Realizar Transferência Entre Almoxarifados

**Passos no Sistema**:

1. **Criar Nota**: `POST /api/notas-movimentacao` com `{"tipo_nota": "TRANSFERENCIA", "almoxarifado_id": "origem", "almoxarifado_destino_id": "destino"}`

2. **Adicionar Itens**: Adicionar `estoque_item_id` do almoxarifado de origem

3. **Concluir**: Sistema cria automaticamente:

    - `SAIDA_TRANSFERENCIA` no almoxarifado origem

    - `ENTRADA_TRANSFERENCIA` no almoxarifado destino (status='DISPONIVEL')

### 9.3. Como Ajustar Estoque Rapidamente

**Pré-condição**: `PERMITIR_AJUSTES_FORCADOS = true`

**Passos**:

- `POST /api/estoque/ajustes` com dados do ajuste

- Sistema cria nota, adiciona item e conclui automaticamente

- Gera movimentação `AJUSTE_POSITIVO` ou `AJUSTE_NEGATIVO`

### 9.4. Como Realizar Entrega com Múltiplas Unidades

**Exemplo**: Entregar 2 luvas e 1 capacete

**Passos**:

1. `POST /api/fichas-epi/{fichaId}/entregas`:

    ```json
    {
        "almoxarifado_id": "ALM-001",
        "itens": [
            {
                "estoque_item_id": "EST-LUVA-001",
                "quantidade": 2,
                "data_limite_devolucao": "2025-12-31"
            },
            {
                "estoque_item_id": "EST-CAP-001",
                "quantidade": 1,
                "data_limite_devolucao": "2026-01-15"
            }
        ]
    }
    ```

2. **Sistema cria automaticamente**:

    - 1 registro em `entregas`

    - 3 registros em `entrega_itens` (2 luvas + 1 capacete)

    - 2 movimentações em `movimentacoes_estoque` (1 por tipo de EPI)

### 9.5. Como Devolver Parcialmente

**Exemplo**: Devolver apenas 1 das 2 luvas

**Passos**:

1. `GET /api/entregas/{entregaId}/itens` para listar todos os itens unitários

2. `POST /api/devolucoes`:

    ```json
    {
        "entrega_item_ids": ["item_luva_001"]
    }
    ```

3. **Resultado**:

    - `item_luva_001`: status = 'DEVOLVIDO'

    - `item_luva_002`: status = 'COM_COLABORADOR' (permanece)

    - 1 movimentação `ENTRADA_DEVOLUCAO` com quantidade 1

### 9.6. Como Coletar Assinatura de Entrega

**Passos**:

1. Entrega é criada com status `'PENDENTE_ASSINATURA'`

2. `PUT /api/entregas/{entregaId}/assinar`:

    ```json
    {
        "data_assinatura": "2025-06-28T10:00:00Z",
        "link_assinatura": "https://documento-assinado.com/123"
    }
    ```

3. **Resultado**: Status alterado para `'ASSINADA'`, habilitando devoluções futuras

### 9.7. Como Estornar uma Movimentação

**Passos**:

1. `POST /api/movimentacoes/{movimentacaoId}/estornar`

2. **Sistema verifica**:

    - Se a movimentação não é já um estorno (impede estorno de estorno)

    - Se é estornável (regras de negócio específicas)

    - Se não foi previamente estornada

3. **Resultado**:

    - Nova movimentação de estorno criada

    - Campo `movimentacao_origem_id` preenchido

    - Saldos ajustados em transação atômica

### 9.8. Como Identificar Devoluções Atrasadas

**Método 1: Via Relatório**

- `GET /api/relatorios/epis-devolucao-atrasada`

**Método 2: Via Query Manual**

```sql
SELECT ei.*, 
       CASE WHEN ei.data_limite_devolucao < CURRENT_DATE THEN true ELSE false END as atrasada
FROM entrega_itens ei 
WHERE ei.status = 'COM_COLABORADOR' 
  AND ei.data_limite_devolucao IS NOT NULL;
```

### 9.9. Fluxo Completo: Da Compra ao Descarte

**Cenário**: Comprar luvas, entregar a colaborador, receber devolução, descartar

1. **Compra**:

    - Criar nota `ENTRADA`

    - Adicionar 10 luvas

    - Concluir nota → `ENTRADA_NOTA`

2. **Entrega**:

    - `POST /api/fichas-epi/{fichaId}/entregas` com 2 luvas

    - Sistema cria 2 registros unitários → `SAIDA_ENTREGA`

3. **Assinatura**:

    - `PUT /api/entregas/{entregaId}/assinar`

4. **Devolução Parcial**:

    - `POST /api/devolucoes` com 1 luva

    - Status: AGUARDANDO_INSPECAO → `ENTRADA_DEVOLUCAO`

5. **Descarte da Luva Devolvida**:

    - Criar nota `DESCARTE`

    - Adicionar a luva do estoque em inspeção

    - Concluir → `SAIDA_DESCARTE`

**Resultado Final**:

- 7 luvas disponíveis no estoque

- 1 luva ainda com colaborador

- 2 luvas descartadas

- Histórico completo rastreável








# Stack tecnologócia



Analisando o `package.json` e considerando as necessidades específicas do **Módulo de EPI**, aqui estão as dependências **essenciais** que precisaremos:

## **🔧 Dependências de Produção Essenciais**

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",        // Framework base - Controllers, Services, Guards
    "@nestjs/core": "^10.0.0",          // Core do NestJS - DI, Modules  
    "@nestjs/platform-express": "^10.0.0", // HTTP platform
    "@nestjs/config": "^3.2.3",         // Para configurações (PERMITIR_ESTOQUE_NEGATIVO, etc.)
    "@nestjs/swagger": "^8.1.0",        // Documentação automática da API
    "@prisma/client": "^5.15.1",        // ORM para PostgreSQL
    "reflect-metadata": "^0.2.0",       // Decorators e metadata
    "rxjs": "^7.8.1",                   // Programação reativa do NestJS
    "swagger-ui-express": "^5.0.1",     // Interface do Swagger
    "zod": "^3.23.8",                   // Validação robusta de dados
    "zod-validation-error": "^3.3.0"    // Formatação de erros de validação
  }
}
```

## **🛠️ Dependências de Desenvolvimento Essenciais**

```json
{
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",           // CLI para comandos do NestJS
    "@nestjs/testing": "^10.0.0",       // Framework de testes
    "@types/express": "^4.17.17",       // Types do Express
    "@types/node": "^20.3.1",           // Types do Node.js
    "typescript": "^5.1.3",             // Linguagem TypeScript
    "prisma": "^5.15.1",                // CLI do Prisma (migrations, schema)
    "dotenv": "^16.4.5",                // Variáveis de ambiente
    "eslint": "^8.42.0",                // Linting
    "prettier": "^3.0.0",               // Formatação de código
    "vitest": "^1.6.0",                 // Framework de testes rápido
    "@vitest/coverage-v8": "^1.6.0"     // Coverage de testes
  }
}
```

## **📋 Justificativas das Escolhas**

### **✅ Por que essas são essenciais:**

**1. NestJS Core** (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)

- Framework que oferece arquitetura modular

- Suporte nativo a Clean Architecture (Cases de Uso, Controllers, Services)

- Injeção de dependência robusta

**2. Prisma** (`@prisma/client`, `prisma`)

- ORM type-safe para PostgreSQL

- Migrations automáticas para nossas 13 tabelas

- Query builder que mapeia perfeitamente nosso schema

**3. Zod** (`zod`, `zod-validation-error`)

- Validação rigorosa dos payloads da API

- Type inference automática

- Essencial para endpoints como `POST /api/fichas-epi/{fichaId}/entregas`

**4. Swagger** (`@nestjs/swagger`, `swagger-ui-express`)

- Documentação automática da API

- Facilita integração com frontend

- Especifica contratos de nossa API RESTful

**5. Config** (`@nestjs/config`)

- Gerencia configurações como `PERMITIR_ESTOQUE_NEGATIVO`

- Diferentes ambientes (dev, prod, qa)

