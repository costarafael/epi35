# **Guia de Desenvolvimento e Arquitetura: Módulo de Gestão de EPI v3.5**

Este documento serve como a fonte central da verdade para o desenvolvimento do backend do Módulo de Gestão de EPI. Ele estabelece os princípios de arquitetura, padrões de código, comandos essenciais e guias de implementação que devem ser seguidos para garantir a qualidade, manutenibilidade e performance do sistema.

## 1\. Guia Rápido e Padrões Essenciais

### 1.1. Fontes da Verdade

| Recurso | Localização | Descrição |
| :--- | :--- | :--- |
| **Produção** | `https://epi-backend-s14g.onrender.com` | URL base da API em produção. |
| **Documentação API** | `/api/docs` | Swagger UI com todos os endpoints e schemas. |
| **Health Check** | `/health` | Endpoint de monitoramento do status da aplicação. |
| **Repositório** | `https://github.com/costarafael/epi35` | Repositório principal do projeto (branch `main`). |
| **Containers** | `epi_db_dev_v35:5435` (Dev), `epi_db_test_v35:5436` (Teste) | Nomes e portas dos containers Docker. |

### 1.2. Validações Obrigatórias (Checklist Pré-Commit)

Antes de cada `commit`, o agente deve executar e validar os seguintes passos:

1.  **Compilar o Projeto**:

    ```bash
    npm run build
    ```

      * **Critério de Aceite**: 0 erros de compilação do TypeScript.

2.  **Iniciar Ambiente de Teste**:

    ```bash
    npm run docker:test
    ```

      * **Critério de Aceite**: Containers Docker de teste (`db_test`, `redis`) devem estar ativos e sem erros.

3.  **Resetar o Banco de Testes**:

    ```bash
    npm run prisma:test:reset
    ```

      * **Critério de Aceite**: Garante um ambiente limpo para testes, evitando contaminação de dados.

4.  **Executar Testes de Integração**:

    ```bash
    npm run test:integration
    ```

      * **Critério de Aceite**: 100% de aprovação nos testes do Core Business (Fichas, Entregas, Devoluções, Estoque).

5.  **🚨 Validação de Dados Reais**:

      * **Critério de Aceite**: Confirmar que NENHUM mock foi introduzido no código (exceto headers da aplicação).
      * **Verificação**: Todos os dados devem vir de fontes reais (PostgreSQL, Redis).
      * **Ação em caso de falha**: Identificar e corrigir problemas de conectividade ou consulta na fonte.

### 1.3. Stack Tecnológica

| Componente | Tecnologia | Padrão de Uso |
| :--- | :--- | :--- |
| **Framework** | NestJS | Estrutura principal da aplicação. |
| **Linguagem** | TypeScript | Tipagem estrita obrigatória. |
| **Banco de Dados** | PostgreSQL | Persistência dos dados relacionais. |
| **ORM** | Prisma | Interface com o banco de dados. |
| **Validação** | Zod | Single Source of Truth para DTOs e tipos. |
| **Testes** | Vitest | Framework para testes unitários e de integração. |
| **Cache** | Redis (Upstash) | Cache para configurações e sessões. |
| **Containers** | Docker | Padronização dos ambientes de dev e teste. |

## 2\. Arquitetura e Princípios de Design

A arquitetura do sistema segue os princípios da **Clean Architecture**, com uma separação clara de responsabilidades em camadas: `Presentation` -\> `Application` -\> `Domain` -\> `Infrastructure`.

### 2.1. Princípios Fundamentais

  * **Rastreabilidade Unitária Atômica**: Cada item físico de EPI movimentado deve corresponder a um único registro na tabela `EntregaItens`. Para entregas de N itens, devem ser criados N registros em `MovimentacaoEstoque`.

      * **Diretiva**: Operações de saída devem ter `quantidadeMovida: 1` para preservar a rastreabilidade. Use operações em lote (`createMany`) para performance.

  * **Single Source of Truth (SSoT) com Zod**: Interfaces e tipos de DTOs não devem ser definidos manualmente. Eles devem ser derivados dos schemas Zod.

    ```typescript
    // ✅ CORRETO: Tipo derivado do schema
    import { z } from 'zod';
    import { CriarEntregaUseCaseInputSchema } from '...';

    export type CriarEntregaInput = z.infer<typeof CriarEntregaUseCaseInputSchema>;
    ```

  * **Transações Atômicas**: Todas as operações que alteram o estado do banco (e.g., criar entrega, processar devolução) **devem** ser encapsuladas em uma transação Prisma para garantir a consistência dos dados.

    ```typescript
    // ✅ PADRÃO: Uso obrigatório de transações para operações de escrita
    await prisma.$transaction(async (tx) => {
      // 1. Validar estoque
      // 2. Criar movimentação
      // 3. Atualizar saldo
    });
    ```

### 2.2. Migrações de Schema (v3.4 -\> v3.5)

Mudanças estruturais críticas foram implementadas e devem ser compreendidas:

  * **Ficha de EPI Única**: Agora existe apenas **uma ficha por colaborador**, com `colaboradorId` como `UNIQUE`. A lógica de negócio deve primeiro buscar a ficha existente ou criá-la se não existir.
  * **Relacionamento de Movimentação**: `MovimentacaoEstoque` agora se relaciona diretamente com `EstoqueItem` (`estoqueItemId`) em vez de usar `almoxarifadoId` e `tipoEpiId`.
  * **Renomeação de Campos**: Diversos campos foram renomeados para maior clareza (e.g., `TipoEPI.nome` -\> `nomeEquipamento`, `TipoEPI.ca` -\> `numeroCa`). Consulte o `schema.prisma` para a lista completa.

## 3\. Ambiente de Desenvolvimento e Comandos

### 3.1. Comandos Essenciais

| Comando | Descrição |
| :--- | :--- |
| `npm run build` | Compila o projeto TypeScript. |
| `npm run docker:dev` | Inicia os containers Docker para o ambiente de desenvolvimento. |
| `npm run docker:test` | Inicia os containers Docker para o ambiente de testes. |
| `npm run prisma:test:reset` | **(Importante)** Reseta e popula o banco de dados de teste. |
| `npm run test:integration` | Executa todos os testes de integração. |
| `npm run lint` | Analisa o código em busca de erros de estilo e padrões. |
| `./claude-flow start --ui` | Inicia o sistema de agentes com interface. |

### 3.2. Deploy e Produção

O deploy é automatizado via GitHub Actions para o Render.com a cada `commit` na branch `main`.

  * **Configuração de Build**:
    ```yaml
    # render.yaml
    buildCommand: cd epi-backend && npm ci && npm run build && npx prisma generate
    startCommand: cd epi-backend && node dist/src/main.js
    healthCheckPath: /health
    ```
  * **Variáveis de Ambiente**: As variáveis críticas (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`) são gerenciadas pelo Render. As configurações operacionais (`PERMITIR_ESTOQUE_NEGATIVO`, etc.) são gerenciadas via API de Configurações.

## 4\. Padrões de Código e Guia de Implementação

### 4.1. Otimização de Performance

  * **Padrão de Batch Unitário**: Para evitar o anti-padrão N+1 em escritas, utilize `createMany` para criar múltiplos registros de movimentação de uma só vez, mantendo a rastreabilidade unitária.

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

  * **Mapeadores Customizados (Mappers)**: Para conversões de DTOs, utilize o sistema de mapeamento customizado, que é type-safe e centralizado. Evite lógicas de mapeamento complexas dentro dos controllers ou use cases.

  * **Monitoramento de Performance**: Use o decorator `@MonitorUseCase` em métodos de use case para registrar automaticamente o tempo de execução.

    ```typescript
    // ✅ PADRÃO: Monitoramento de performance
    import { MonitorUseCase } from 'src/shared/decorators/monitor-performance.decorator';

    @MonitorUseCase('criar-entrega')
    async execute(input: CriarEntregaInput): Promise<EntregaOutput> {
      // ... lógica do use case
    }
    ```

### 4.2. Estrutura de Módulos e Controllers

A aplicação é modularizada para promover o **Princípio da Responsabilidade Única (SRP)**.

  * **Estrutura**: Controllers massivos foram refatorados em módulos e controllers específicos por domínio.
    ```
    src/presentation/
    ├── modules/
    │   ├── relatorios.module.ts
    │   └── fichas.module.ts
    ├── controllers/
    │   ├── relatorios/
    │   │   ├── dashboard.controller.ts
    │   │   └── ...
    │   └── fichas/
    │       ├── fichas.controller.ts
    │       ├── entregas.controller.ts
    │       └── ...
    ```
  * **Diretiva**: Novas funcionalidades devem ser organizadas em seus respectivos módulos e controllers, mantendo-os pequenos e focados.

## 5\. Política de Dados Reais e Produção

### 5.1. **🚨 PROIBIÇÃO ABSOLUTA DE MOCKS**

**DIRETIVA CRÍTICA**: O sistema está sendo preparado para **produção real**. Por isso:

- **❌ JAMAIS criar mocks de dados** (exceto os headers da aplicação)
- **❌ JAMAIS simular respostas** de banco de dados ou APIs
- **❌ JAMAIS usar dados fictícios** em place de consultas reais

### 5.2. **✅ PADRÃO OBRIGATÓRIO: Dados Reais**

**Todos os dados devem vir de fontes reais**:
- **Database**: PostgreSQL via Prisma
- **Cache**: Redis para configurações
- **APIs**: Endpoints reais com validação completa

### 5.3. **🔧 Resolução de Problemas de Dados**

**Quando há dificuldade para obter dados reais**, a ação correta é:

1. **Identificar a causa raiz**:
   ```bash
   # Verificar conexão com banco
   npm run prisma:studio
   
   # Testar queries específicas
   npm run test:integration -- --grep "nome-do-teste"
   
   # Verificar logs do container
   docker logs epi_db_dev_v35
   ```

2. **Corrigir na fonte**:
   - **Schema Problem**: Ajustar `schema.prisma` e rodar migration
   - **Query Problem**: Corrigir use case ou repository
   - **Connection Problem**: Verificar `DATABASE_URL` e containers
   - **Data Problem**: Usar seed script ou criar dados via API

3. **Nunca mascarar com mocks**:
   ```typescript
   // ❌ PROIBIDO
   const mockData = { id: 'fake-123', nome: 'Mock User' };
   
   // ✅ CORRETO
   const realData = await this.prisma.user.findUnique({ where: { id } });
   if (!realData) {
     throw new NotFoundError('User', id);
   }
   ```

### 5.4. **🎯 Preparação para Produção Real**

**Todas as implementações devem considerar**:
- **Dados reais de colaboradores, EPIs e movimentações**
- **Volumes de produção** (milhares de registros)
- **Cenários de erro reais** (conexão perdida, dados inconsistentes)
- **Performance com dados reais** (não dados de teste pequenos)

**PRINCÍPIO**: Se não funciona com dados reais, não está pronto para produção.

## 6\. Análise Avançada com Deep Code Reasoning

Para investigações complexas que excedem a análise de código padrão, utilize o servidor **MCP (Model Context Protocol)** `deep-code-reasoning`. Ele atua como um pair developer com memória e capacidade de análise aprofundada.

**Diretiva**: Invoque essas ferramentas apenas quando a causa de um problema não for imediatamente aparente após a análise inicial e a execução de testes.

| Comando da Ferramenta | Cenário de Uso Ideal no Projeto | Exemplo de Solicitação |
| :--- | :--- | :--- |
| **`escalate_analysis`** | Um teste de integração falha com um erro de banco de dados (e.g., violação de constraint) e a causa não é óbvia no código do teste ou do use case. | \> "O teste em `criar-entrega-ficha.spec.ts` está falhando com um erro de chave estrangeira. Use **`escalate_analysis`** para inspecionar o fluxo completo, desde o controller até as operações do Prisma, e identificar a inconsistência." |
| **`trace_execution_path`** | Para documentar ou depurar um fluxo de negócio complexo, como o processo de devolução, que envolve múltiplas validações e operações de escrita. | \> "Preciso entender o fluxo de devolução de EPI. Use **`trace_execution_path`** a partir do endpoint de devolução e mapeie todas as chamadas de serviço, validações e operações de DB até o `COMMIT` da transação." |
| **`cross_system_impact`** | Antes de realizar uma mudança estrutural no `schema.prisma` (e.g., adicionar um campo a uma tabela importante como `EstoqueItem`). | \> "Planejo adicionar o campo `localizacao` à entidade `Almoxarifado`. Use **`cross_system_impact`** para listar todos os arquivos (use cases, DTOs, testes, relatórios) que serão afetados por esta mudança." |
| **`performance_bottleneck`** | Um relatório ou endpoint está lento em produção, e há suspeita de um problema de N+1 query ou computação ineficiente. | \> "O `relatorio-saldo-estoque` está lento. Use **`performance_bottleneck`** para analisar o use case e as queries do Prisma para identificar a causa da lentidão." |
| **`hypothesis_test`** | Para validar uma teoria de correção de bug sem implementar o código completo. | \> "Minha hipótese é que o bug no cálculo de saldo pode ser resolvido alterando a ordem das movimentações no `groupBy` do Prisma. Use **`hypothesis_test`** para validar se essa mudança na query corrige o resultado no `relatorio-saldo-estoque.use-case.ts`." |
| **`start_conversation`** | Para abordar um problema de refatoração fundamental e complexo, como a migração de uma lógica de negócio central. | \> "Vamos resolver a migração das Fichas de EPI. Use **`start_conversation`** para uma análise interativa. Minha primeira pergunta é: 'Qual a melhor estratégia para refatorar o `criar-entrega-ficha.use-case.ts` para que ele encontre ou crie a ficha única antes de adicionar os itens?'" |

-----

## Anexo: Log de Mudanças Recentes (v3.5.x)

  * **`06/07/2025`**:

      * **Correção**: Descrição do histórico para entregas com múltiplos tipos de EPI foi corrigida para exibir todos os tipos corretamente.
      * **Correção**: Mapeamento de entregas com múltiplos tipos de EPI foi corrigido para não agrupar itens diferentes sob o mesmo tipo.
      * **Feature**: API de Usuários (`/api/usuarios`) implementada com filtros e paginação para suportar a criação de entregas.
      * **Feature**: Endpoints de Estoque (`/api/estoque/itens`, `/api/estoque/almoxarifados`) implementados.
      * **Feature**: Implementação do Histórico Geral de Fichas EPI (`/api/fichas-epi/:fichaId/historico`), rastreando todas as ações.
      * **Feature**: Implementação do Sistema de Gerenciamento de Configurações (`/api/configuracoes`) para controle dinâmico de regras de negócio.
      * **Refatoração**: Controllers `RelatoriosController` e `FichasEpiController` foram modularizados para melhorar a manutenibilidade, sem breaking changes.

  * **`05/07/2025`**:

      * **Deploy**: Backend implantado em produção no Render.com com todos os endpoints e configurações validados.
      * **Correção**: Rotas da API corrigidas para remover prefixo duplicado (`/api/api/` -\> `/api/`).
      * **Correção**: Validação matemática de CNPJ implementada na entidade `Contratada`.

  * **`04/07/2025`**:

      * **Otimização**: Anti-padrão N+1 resolvido com operações de batch (`createMany`) em entregas e devoluções.
      * **Otimização**: Implementado SSoT com Zod, eliminando \~80% de interfaces duplicadas.
      * **Correção**: Resolvido bug crítico de contaminação de dados nos testes, removendo dados transacionais do script de seed.
      * **Validação**: Testes do core business atingiram 100% de cobertura e aprovação.
      * **📋 Política**: Implementada **PROIBIÇÃO ABSOLUTA DE MOCKS** para preparação de produção real - todos os dados devem vir de fontes reais (PostgreSQL/Redis).