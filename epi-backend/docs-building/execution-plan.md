# Plano de Execução Claude-Flow para Backend EPI

## Fase 0: Inicialização e Setup

### 0.1 Criar Diretório e Inicializar Projeto
```bash
mkdir epi-backend
cd epi-backend
npx claude-flow@latest init --sparc
```

### 0.2 Copiar Arquivos de Configuração
Copie os arquivos CLAUDE.md, .roomodes e .claude/settings.json criados anteriormente para o diretório do projeto.

### 0.3 Iniciar o Sistema de Orquestração
```bash
./claude-flow start --ui --port 3000
```

### 0.4 Verificar Status
```bash
./claude-flow status
./claude-flow sparc modes
```

## Fase 1: Setup Inicial e Estrutura Base

### 1.1 Criar Estrutura do Projeto NestJS
```bash
./claude-flow sparc run architect-epi "Create the initial NestJS project structure with Clean Architecture layers (domain, application, infrastructure, presentation) and configure the project with TypeScript, ESLint, Prettier, and all necessary dependencies from our package.json requirements. Set up the basic folder structure according to our CLAUDE.md specifications."
```

### 1.2 Configurar Dependências e Scripts
```bash
./claude-flow sparc run nestjs-coder "Set up package.json with all required dependencies including @nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/config, @nestjs/swagger, @prisma/client, zod, and all dev dependencies. Configure npm scripts for development, build, test, and production."
```

## Fase 2: Modelagem do Banco de Dados

### 2.1 Criar Schema Prisma Completo (Usando Swarm para Paralelização)
```bash
./claude-flow swarm "Create the complete Prisma schema for the EPI module with all 13 tables, ENUMs, relations, and constraints as specified in the documentation section 3. Tables include: usuarios, unidades_negocio, almoxarifados, tipos_epi, estoque_itens, notas_movimentacao, nota_movimentacao_itens, movimentacoes_estoque, colaboradores, fichas_epi, entregas, entrega_itens, historico_fichas, and configuracoes. Ensure all PostgreSQL ENUMs are properly defined and all constraints from section 3.3 are implemented." --strategy development --max-agents 3 --parallel
```

### 2.2 Criar Migrations e Índices
```bash
./claude-flow sparc run migration-expert "Generate Prisma migrations for the complete schema and create all recommended performance indexes from section 3.4 of the documentation. Include indexes for movimentacoes_data, entrega_itens_devolucao, estoque_disponivel, and all foreign key relationships."
```

### 2.3 Criar Seeds para Desenvolvimento
```bash
./claude-flow sparc run database-designer "Create comprehensive seed data for development including sample usuarios, unidades_negocio, almoxarifados, tipos_epi with realistic data, and initial configuracoes with PERMITIR_ESTOQUE_NEGATIVO=false and PERMITIR_AJUSTES_FORCADOS=true."
```

## Fase 3: Camada de Domínio

### 3.1 Criar Entidades de Domínio (BatchTool Paralelo)
```bash
batchtool run --parallel \
  "./claude-flow sparc run usecase-developer 'Create domain entities for tipos_epi, estoque_itens, and related value objects with business rules validation'" \
  "./claude-flow sparc run usecase-developer 'Create domain entities for notas_movimentacao, movimentacoes_estoque with immutability constraints'" \
  "./claude-flow sparc run usecase-developer 'Create domain entities for fichas_epi, entregas, entrega_itens with unit tracking logic'" \
  "./claude-flow sparc run usecase-developer 'Create all domain ENUMs and types matching PostgreSQL enums'"
```

### 3.2 Criar Interfaces de Repositório
```bash
./claude-flow sparc run architect-epi "Create repository interfaces for all domain entities following repository pattern. Include methods for complex queries, transactions, and the specific needs of each use case. Ensure interfaces are in domain layer and independent of infrastructure."
```

## Fase 4: Camada de Infraestrutura

### 4.1 Implementar Repositórios com Prisma (Swarm Mode)
```bash
./claude-flow swarm "Implement all repository interfaces using Prisma ORM with proper transaction handling, error mapping, and query optimization. Repositories to implement: NotaRepository, MovimentacaoRepository, EstoqueRepository, FichaRepository, EntregaRepository, ConfiguracaoRepository. Each should handle complex queries and maintain ACID properties." --strategy development --max-agents 5 --parallel --monitor
```

### 4.2 Criar Módulos de Infraestrutura
```bash
./claude-flow sparc run nestjs-coder "Create NestJS infrastructure modules for database connection, Prisma service with transaction support, repository providers, and configuration module using @nestjs/config for environment variables."
```

## Fase 5: Casos de Uso Principais (Application Layer)

### 5.1 Implementar Casos de Uso de Estoque (BatchTool)
```bash
batchtool run --parallel \
  "./claude-flow sparc run usecase-developer 'Implement UC-ESTOQUE-01: GerenciarNotaRascunho use case with full CRUD operations for draft notas_movimentacao and real-time stock validation'" \
  "./claude-flow sparc run transaction-specialist 'Implement UC-ESTOQUE-02: ConcluirNotaMovimentacao with atomic transactions, proper tipo_nota to tipo_movimentacao mapping, and stock balance updates'" \
  "./claude-flow sparc run transaction-specialist 'Implement UC-ESTOQUE-03: CancelarNotaMovimentacao with estorno generation and rollback logic for completed notas'" \
  "./claude-flow sparc run usecase-developer 'Implement UC-ESTOQUE-04: RealizarAjusteDireto for immediate inventory adjustments when PERMITIR_AJUSTES_FORCADOS is true'"
```

### 5.2 Implementar Casos de Uso de Fichas (Swarm Mode)
```bash
./claude-flow swarm "Implement all Ficha use cases: UC-FICHA-01 (CriarTipoEPI), UC-FICHA-02 (CriarFichaEPI with uniqueness validation), UC-FICHA-03 (CriarEntregaFicha with unit tracking and atomic stock updates), UC-FICHA-04 (ProcessarDevolucao with signature validation and inspection stock), UC-FICHA-05 (CancelarEntrega with movement reversal), UC-FICHA-06 (CancelarDevolucao with status rollback). Ensure all follow the business rules and create proper historico_fichas entries." --strategy development --max-agents 6 --parallel
```

### 5.3 Implementar Queries e Relatórios
```bash
./claude-flow sparc run report-developer "Implement all query use cases UC-QUERY-01 and UC-QUERY-02, plus all 10 reports (R-01 to R-10) with optimized SQL queries, proper joins, and aggregations. Pay special attention to R-07 (Fichas com Devolução Atrasada) with dynamic status calculation."
```

## Fase 6: API REST (Presentation Layer)

### 6.1 Criar Controllers de Notas (BatchTool)
```bash
batchtool run --parallel \
  "./claude-flow sparc run nestjs-coder 'Create NotasMovimentacaoController with all endpoints from section 8.1: POST (create draft), PUT (update), POST /itens (add items), DELETE /itens (remove items), PUT /concluir, POST /cancelar, GET (list with filters), GET /:id (details)'" \
  "./claude-flow sparc run nestjs-coder 'Create EstoqueController with POST /api/estoque/ajustes endpoint for direct adjustments and GET /api/estoque-itens/:id/historico for movement history'" \
  "./claude-flow sparc run api-security 'Add validation DTOs using Zod for all nota endpoints with proper error handling and status codes'"
```

### 6.2 Criar Controllers de Fichas e Entregas
```bash
./claude-flow swarm "Create all Ficha-related controllers: TiposEpiController (POST create), FichasEpiController (POST create with 409 conflict handling, GET historico), EntregasController (POST create with unit item generation, POST cancelar, GET itens, PUT assinar), DevolucoesController (POST process with signature validation). Include proper Swagger documentation for all endpoints." --max-agents 4 --parallel
```

### 6.3 Criar Controllers de Relatórios
```bash
./claude-flow sparc run nestjs-coder "Create RelatoriosController with all report endpoints from section 8.5: saldo-estoque, movimentacoes-estoque, epis-ativos-sintetico, epis-ativos-detalhado, epis-devolucao-atrasada, itens-descartados, and estornos. Include query parameter validation and pagination support."
```

### 6.4 Configurar Swagger e Documentação
```bash
./claude-flow sparc run documentation-writer "Configure complete Swagger documentation for all API endpoints with request/response examples, error codes, and detailed descriptions. Group endpoints by tags (notas-movimentacao, fichas-epi, entregas, relatorios) and include authentication placeholder."
```

## Fase 7: Testes Abrangentes

### 7.1 Testes Unitários dos Casos de Uso (Swarm Mode)
```bash
./claude-flow swarm "Create comprehensive unit tests for all use cases with mocked repositories. Test happy paths, error scenarios, edge cases, and business rule validations. Ensure 100% coverage for critical use cases like ConcluirNota and ProcessarEntrega. Use Vitest with proper test factories and fixtures." --strategy testing --max-agents 8 --parallel
```

### 7.2 Testes de Integração
```bash
./claude-flow sparc run test-engineer "Create integration tests for complete flows: 1) Full nota lifecycle (create, add items, complete, cancel), 2) Entrega and devolução flow with signature, 3) Transfer between almoxarifados, 4) Concurrent operations handling. Use test database with transaction rollback."
```

### 7.3 Testes de API E2E
```bash
./claude-flow sparc run test-engineer "Create end-to-end API tests using Supertest for all endpoints. Test request validation, response formats, error handling, and status codes. Include tests for pagination, filtering, and complex query parameters in reports."
```

## Fase 8: Performance e Otimizações

### 8.1 Otimizar Queries e Índices
```bash
./claude-flow sparc run performance-optimizer "Analyze and optimize all database queries, especially for reports and the Kardex. Add missing indexes, optimize N+1 queries with proper includes, and implement query result caching where appropriate. Run EXPLAIN ANALYZE on critical queries."
```

### 8.2 Implementar Caching Estratégico
```bash
./claude-flow sparc run performance-optimizer "Implement caching strategy for stock balances, report results, and frequently accessed data. Use Redis or in-memory caching with proper invalidation on updates. Cache configuration data (PERMITIR_ESTOQUE_NEGATIVO) with refresh mechanism."
```

## Fase 9: DevOps e Deployment

### 9.1 Containerização
```bash
./claude-flow sparc run devops-automator "Create multi-stage Dockerfile for production build, docker-compose.yml for local development with PostgreSQL and Redis, and .dockerignore file. Include health check endpoints and graceful shutdown handling."
```

### 9.2 CI/CD Pipeline
```bash
./claude-flow sparc run devops-automator "Create GitHub Actions workflow for CI/CD including: install dependencies, run linter, run all tests with coverage report, build application, build and push Docker image, and deployment configuration. Include branch protection rules."
```

### 9.3 Monitoramento e Observabilidade
```bash
./claude-flow sparc run devops-automator "Implement structured logging with correlation IDs, health check endpoints for Kubernetes, metrics collection for Prometheus, and error tracking setup. Include performance monitoring for critical operations."
```

## Fase 10: Documentação Final e Revisão

### 10.1 Documentação Completa
```bash
./claude-flow swarm "Create comprehensive documentation including: README with setup instructions, API documentation with examples, architecture diagrams, deployment guide, troubleshooting guide, and CHANGELOG. Ensure all business flows are documented with sequence diagrams." --max-agents 3 --parallel
```

### 10.2 Code Review Final
```bash
./claude-flow sparc run code-reviewer "Perform comprehensive code review checking: adherence to Clean Architecture, proper error handling, transaction consistency, test coverage, performance bottlenecks, security vulnerabilities, and code duplication. Generate report with specific improvements."
```

### 10.3 Preparar para Produção
```bash
./claude-flow sparc run devops-automator "Finalize production setup: environment variable validation, secrets management, database migration strategy, backup procedures, monitoring alerts, and rollback procedures. Create production readiness checklist."
```

## Comandos de Monitoramento Durante Execução

### Verificar Status do Sistema
```bash
# Verificar agentes ativos
./claude-flow agent list

# Verificar status geral
./claude-flow status

# Monitorar com dashboard
./claude-flow monitor --dashboard
```

### Consultar Memória Compartilhada
```bash
# Ver o que foi armazenado
./claude-flow memory query "schema"
./claude-flow memory query "use cases"
./claude-flow memory query "test results"
```

### Gerenciar Execução
```bash
# Pausar se necessário
./claude-flow agent terminate [agent-name]

# Reiniciar sistema se instável
./claude-flow stop
./claude-flow start --ui --port 3000
```

## Estratégia de Checkpoints Git

Após cada fase bem-sucedida:
```bash
git add .
git commit -m "feat: [Fase X] Description of completed phase"
git tag -a "phase-X-complete" -m "Phase X completed successfully"
```

## Notas Importantes

1. **Paralelização**: Use Swarm mode para fases com muitas tarefas independentes
2. **BatchTool**: Ideal para tarefas menores que podem rodar em paralelo
3. **Memória**: O sistema salvará automaticamente o progresso no Memory Bank
4. **Recuperação**: Se houver falhas, use checkpoints Git para recuperar
5. **Monitoramento**: Mantenha o dashboard aberto em http://localhost:3000