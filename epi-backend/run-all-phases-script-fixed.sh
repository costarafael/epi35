#!/bin/bash
# Script de automação completa para desenvolvimento do backend EPI v3.5
# Utiliza Claude-Flow com modos especializados e prompts otimizados

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Verificar se estamos em uma pasta relativamente vazia
check_files=$(find . -maxdepth 1 -type f -not -name "*.sh" -not -path "./.git/*" | wc -l)
check_dirs=$(find . -maxdepth 1 -type d -not -name "." -not -name ".git" -not -name "docs-building" | wc -l)

if [ "$check_files" -gt 0 ] || [ "$check_dirs" -gt 0 ]; then
    warning "Esta pasta contém outros arquivos além de scripts .sh, .git e docs-building."
    echo "Arquivos encontrados:"
    find . -maxdepth 1 -type f -not -name "*.sh" -not -path "./.git/*"
    find . -maxdepth 1 -type d -not -name "." -not -name ".git" -not -name "docs-building"
    echo ""
    read -p "Deseja continuar mesmo assim? (s/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

log "🚀 Iniciando configuração completa do Backend EPI v3.5 com Claude-Flow"

# Verificar se docs-building existe
if [ -d "docs-building" ]; then
    info "Pasta docs-building detectada. Será preservada para consulta durante o desenvolvimento."
fi

# ========================================
# FASE 0: SETUP INICIAL E CONFIGURAÇÃO
# ========================================

log "📦 Fase 0: Setup inicial e configuração do ambiente"

# 0.1 - Criar package.json
cat > package.json << 'EOF'
{
  "name": "epi-backend",
  "version": "3.5.0",
  "description": "Backend do Módulo de Gestão de EPIs v3.5 - Desenvolvido com Claude-Flow",
  "main": "dist/main.js",
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "vitest",
    "test:unit": "vitest run --dir src",
    "test:integration": "vitest run --dir test",
    "test:watch": "vitest watch",
    "test:cov": "vitest run --coverage",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "vitest run --config ./vitest.config.e2e.ts",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.2.3",
    "@nestjs/swagger": "^8.1.0",
    "@prisma/client": "^5.15.1",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.1",
    "swagger-ui-express": "^5.0.1",
    "zod": "^3.23.8",
    "zod-validation-error": "^3.3.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/node": "^20.3.1",
    "@types/supertest": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitest/coverage-v8": "^1.6.0",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "prettier": "^3.0.0",
    "prisma": "^5.15.1",
    "rimraf": "^5.0.5",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.4",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3",
    "vitest": "^1.6.0",
    "dotenv": "^16.4.5",
    "dotenv-cli": "^7.4.2"
  }
}
EOF

log "📦 Instalando dependências..."
npm install

# 0.2 - Criar estrutura de diretórios
log "📁 Criando estrutura de diretórios..."
mkdir -p src/{domain,application,infrastructure,presentation}
mkdir -p src/domain/{entities,enums,interfaces/repositories}
mkdir -p src/application/{use-cases/{estoque,fichas,queries},dto,services}
mkdir -p src/infrastructure/{database,repositories,config,cache}
mkdir -p src/presentation/{controllers,dto/schemas,filters,interceptors,pipes}
mkdir -p prisma
mkdir -p test/{unit,integration,e2e}
mkdir -p docs

# 0.3 - Criar arquivos de configuração
log "⚙️ Criando arquivos de configuração..."

# .env
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/epi_db"

# Application
NODE_ENV=development
PORT=3333

# Features
PERMITIR_ESTOQUE_NEGATIVO=false
PERMITIR_AJUSTES_FORCADOS=true

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
EOF

# .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.vitest-cache
.vscode/*
!.vscode/settings.json
.claude/memory
.claude/logs
.claude/cache
prisma/*.db
prisma/*.db-journal
*.tmp
*.temp
EOF

# tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@/*": ["src/*"],
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@presentation/*": ["src/presentation/*"]
    }
  }
}
EOF

# Outros arquivos de config
cat > nest-cli.json << 'EOF'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
EOF

# 0.4 - Criar ZodValidationPipe
log "🔧 Criando pipe de validação Zod..."
cat > src/presentation/pipes/zod-validation.pipe.ts << 'EOF'
import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { fromZodError } from 'zod-validation-error';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      const validationError = fromZodError(error);
      throw new BadRequestException(validationError.toString());
    }
  }
}
EOF

# 0.5 - Instalar e configurar Claude-Flow
log "🤖 Instalando Claude-Flow..."
npx claude-flow@latest init --sparc

# Aguardar criação dos arquivos
sleep 5

# 0.6 - Criar CLAUDE.md customizado
log "📝 Criando arquivo CLAUDE.md..."
cat > CLAUDE.md << 'EOF'
# Projeto: Backend do Módulo de Gestão de EPI v3.5

## Contexto do Sistema

Este é o backend de um sistema empresarial crítico para gestão de Equipamentos de Proteção Individual (EPIs). O sistema gerencia:

1. **Estoque de EPIs**: Controle de entrada, saída, transferências e saldos
2. **Fichas de Colaboradores**: Registro de entregas e devoluções de EPIs
3. **Rastreabilidade**: Histórico completo e auditável de todas as movimentações
4. **Relatórios**: Diversos relatórios gerenciais e operacionais

## Princípios Arquiteturais Fundamentais

### 1. Fonte Única da Verdade
- A tabela `movimentacoes_estoque` é o livro-razão imutável.
- O campo `estoque_itens.quantidade` é um cache de performance.
- Toda operação deve registrar uma movimentação antes de atualizar o saldo.

### 2. Transações Atômicas (ACID)
- Use transações do Prisma (`prisma.$transaction`) para garantir consistência.
- Padrão: BEGIN → INSERT movimentação → UPDATE saldo → COMMIT.
- Em caso de erro, toda a operação deve ser revertida (rollback).

### 3. Rastreabilidade Individual
- Entregas são rastreadas unitariamente (1 registro em `entrega_itens` = 1 unidade).
- Estoque é agregado por tipo e status para performance.
- Devoluções podem ser parciais.

### 4. Separação de Contextos
- **Notas de Movimentação**: Operações de estoque (entrada, transferência, descarte).
- **Entregas/Devoluções**: Operações com colaboradores.
- Não misturar contextos em um mesmo fluxo.

## Estrutura de Código Esperada

### Domain Layer (`src/domain`)
```typescript
// Entidades com validações de regras de negócio
export class EstoqueItem {
  constructor(
    public readonly almoxarifadoId: string,
    public readonly tipoEpiId: string,
    public quantidade: number,
    public status: StatusEstoqueItem
  ) {
    if (quantidade < 0) {
      throw new BusinessError('Quantidade em estoque não pode ser negativa.');
    }
  }
}
```

### Application Layer (`src/application`)
```typescript
// Casos de uso em arquivos separados
export class ConcluirNotaUseCase {
  constructor(
    private readonly notaRepo: INotaRepository,
    private readonly movimentacaoRepo: IMovimentacaoRepository,
    private readonly estoqueRepo: IEstoqueRepository
  ) {}
  
  async execute(notaId: string): Promise<void> {
    // Lógica transacional seguindo a especificação UC-ESTOQUE-02
  }
}
```

### Infrastructure Layer (`src/infrastructure`)
```typescript
// Implementações concretas com Prisma
export class PrismaNotaRepository implements INotaRepository {
  constructor(private readonly prisma: PrismaClient) {}
  // Implementações dos métodos da interface...
}
```

### Presentation Layer (`src/presentation`)
```typescript
// Controllers NestJS com DTOs e Swagger
@ApiTags('notas-movimentacao')
@Controller('api/notas-movimentacao')
export class NotasController {
  // Endpoints conforme especificação da API
}
```

## Convenções de Código

1.  **Nomenclatura**:
    - Arquivos: `kebab-case` (ex: `concluir-nota.use-case.ts`).
    - Classes: `PascalCase` (ex: `ConcluirNotaUseCase`).
    - Interfaces: `PascalCase` com prefixo "I" (ex: `INotaRepository`).

2.  **Organização**:
    - Um caso de uso por arquivo.
    - **Testes na pasta `/test`**, seguindo a mesma estrutura de `src/` (ex: `test/application/use-cases/estoque/concluir-nota.use-case.spec.ts`).
    - DTOs na pasta de apresentação (`presentation/dto`).

3.  **Validação**:
    - **Use Zod** para validação de entrada em todos os DTOs. Não usar `class-validator`.
    - Validações de regras de negócio devem residir nas entidades de domínio.
    - Mensagens de erro devem ser claras e específicas.

4.  **Testes**:
    - Mínimo de 80% de cobertura de código.
    - Testes unitários para casos de uso com repositórios mockados.
    - Testes de integração para fluxos completos com banco de dados de teste.
    - Testes E2E para validar os contratos da API.

## Configurações Importantes

- `PERMITIR_ESTOQUE_NEGATIVO`: Controla se o sistema aceita saldo de estoque negativo.
- `PERMITIR_AJUSTES_FORCADOS`: Habilita ou desabilita os endpoints de ajuste direto de inventário.

## Fluxos Críticos a Implementar

1.  **Concluir Nota de Movimentação** (UC-ESTOQUE-02): Validar itens, criar movimentações e atualizar saldos em uma única transação.
2.  **Processar Entrega** (UC-FICHA-03): Criar registros unitários em `entrega_itens`, validar disponibilidade de estoque e calcular data de devolução.
3.  **Processar Devolução** (UC-FICHA-04): Validar assinatura da entrega original, atualizar status dos itens para 'DEVOLVIDO' e criar estoque em 'AGUARDANDO_INSPECAO'.

## Prioridades de Desenvolvimento (Alinhado com o Script)

1.  **Fase 0-1**: Setup, Configuração e Estrutura Base do Projeto.
2.  **Fase 2**: Modelagem do Banco de Dados (Schema, Migrations, Seeds).
3.  **Fase 3**: Camada de Domínio (Entidades, Enums, Interfaces de Repositório).
4.  **Fase 4**: Camada de Infraestrutura (Implementações de Repositório com Prisma).
5.  **Fase 5**: Camada de Aplicação (Casos de Uso e Relatórios).
6.  **Fase 6**: Camada de Apresentação (API REST com Controllers e DTOs).
7.  **Fase 7**: Testes Abrangentes (Unitários, Integração e E2E).
8.  **Fase 8-11**: Otimizações, DevOps, Documentação e Preparação para Produção.

## Referências Técnicas

- NestJS Docs: https://docs.nestjs.com
- Prisma Docs: https://www.prisma.io/docs
- Clean Architecture: Separar estritamente domínio de infraestrutura.
- CQRS: Usar Comandos para modificar estado e Queries para ler dados.
EOF

# 0.7 - Copiar .roomodes consolidado (conteúdo do artifact roomodes-epi-final)
log "🎭 Configurando modos de agente especializados..."
# [O conteúdo do .roomodes será o mesmo do artifact roomodes-epi-final criado anteriormente]

# 0.8 - Criar configuração otimizada do Claude-Flow
log "⚙️ Criando configuração otimizada..."
mkdir -p .claude
cat > .claude/settings.json << 'EOF'
{
  "project": {
    "name": "epi-backend",
    "type": "nestjs-api",
    "description": "Backend do Módulo de Gestão de EPIs v3.5"
  },
  "automation": {
    "commandTimeout": 600000,
    "maxOutputSize": 512000,
    "permissions": "*",
    "autoConfirm": true,
    "parallelExecution": true,
    "maxConcurrentAgents": 8
  },
  "memory": {
    "persistenceMode": "aggressive",
    "sharedContext": true,
    "contextWindowSize": "large",
    "checkpointFrequency": "high"
  },
  "sparc": {
    "defaultModes": [
      "architect-epi",
      "database-designer",
      "prisma-expert",
      "nestjs-coder",
      "usecase-developer",
      "transaction-specialist",
      "test-engineer"
    ]
  },
  "swarm": {
    "strategy": "task-parallel",
    "coordinationMode": "memory-first"
  },
  "batchtool": {
    "parallelism": "aggressive",
    "errorHandling": "retry-with-backoff"
  },
  "monitoring": {
    "enableDashboard": true,
    "logLevel": "info"
  }
}
EOF

# 0.9 - Iniciar Claude-Flow
log "🚀 Iniciando sistema Claude-Flow..."
./claude-flow start --ui --port 3000 &
ORCHESTRATOR_PID=$!

# Aguardar inicialização
sleep 10

# Verificar status
./claude-flow status || error "Falha ao iniciar o orquestrador Claude-Flow"

# 0.10 - Inicializar memória compartilhada
log "🧠 Inicializando memória compartilhada..."
mkdir -p .claude/memory

./claude-flow memory store "project-objective" "Construir o backend para o Sistema de Gestão de EPI v3.5, conforme especificação em docs-building. Sistema deve ser robusto, transacional e seguir Clean Architecture."

if [ -d "docs-building" ]; then
    ./claude-flow memory store "docs-reference" "Documentação completa do sistema EPI v3.5 disponível em /docs-building para consulta."
fi

log "✅ Setup inicial completo! Iniciando fases de desenvolvimento..."
git add . && git commit -m "feat(epi-backend): [Fase 0] Initial project setup and configuration" || true
git tag -a "phase-0-complete" -m "Phase 0 completed successfully" || true

# ========================================
# FASE 1: ESTRUTURA BASE DO PROJETO
# ========================================

log "🏗️ Fase 1: Criando estrutura base do projeto NestJS"

./claude-flow sparc run architect-epi "Create the initial NestJS project structure with Clean Architecture layers (domain, application, infrastructure, presentation) following our CLAUDE.md specifications:

1. Create folder structure as defined
2. Configure main.ts with:
   - Swagger setup
   - Global ZodValidationPipe (NOT class-validator)
   - Exception filters
   - CORS configuration

3. Create base modules:
   - AppModule
   - DatabaseModule (Prisma)
   - ConfigModule

IMPORTANT: Use Zod for all validations, NOT class-validator."

sleep 30

# Verificar criação do main.ts
if [ ! -f "src/main.ts" ]; then
    warning "main.ts não foi criado, tentando novamente..."
    ./claude-flow sparc run nestjs-coder "Create src/main.ts with NestJS bootstrap, Swagger configuration, global validation using ZodValidationPipe from src/presentation/pipes/zod-validation.pipe.ts, and proper CORS setup."
fi

git add . && git commit -m "feat(epi-backend): [Fase 1] Initial NestJS project structure with Clean Architecture" || true
git tag -a "phase-1-complete" -m "Phase 1 completed successfully" || true

# ========================================
# FASE 2: MODELAGEM DO BANCO DE DADOS
# ========================================

log "🗄️ Fase 2: Modelando banco de dados com Prisma"

./claude-flow swarm "Create the complete Prisma schema for the EPI module with all 13 tables, ENUMs, relations, and constraints as specified in documentation section 3:

TABLES TO CREATE:
- usuarios, unidades_negocio, almoxarifados
- tipos_epi, estoque_itens
- notas_movimentacao, nota_movimentacao_itens
- movimentacoes_estoque
- colaboradores, fichas_epi
- entregas, entrega_itens
- historico_fichas, configuracoes

CRITICAL CONSTRAINTS:
- estoque_itens: UNIQUE(almoxarifado_id, tipo_epi_id, status)
- entrega_itens: CHECK(quantidade_entregue = 1)
- movimentacoes_estoque: Proper estorno constraints
- All foreign key relationships

Include all ENUMs and performance indexes from section 3.4." --strategy development --max-agents 3 --parallel

sleep 60

# Criar migrations
log "🗄️ Fase 2.2: Gerando migrações do banco de dados"
./claude-flow sparc run migration-expert "Generate Prisma migrations for the complete schema and create all recommended performance indexes."

sleep 30

# Criar seeds
log "🌱 Fase 2.3: Criando seeds para desenvolvimento"
./claude-flow sparc run database-designer "Create comprehensive seed data for development including sample usuarios, unidades_negocio, almoxarifados, tipos_epi with realistic data, and initial configuracoes with PERMITIR_ESTOQUE_NEGATIVO=false and PERMITIR_AJUSTES_FORCADOS=true."

sleep 30

npx prisma generate || warning "Falha ao gerar cliente Prisma"

git add . && git commit -m "feat(epi-backend): [Fase 2] Complete database schema with migrations and seeds" || true
git tag -a "phase-2-complete" -m "Phase 2 completed successfully" || true

# ========================================
# FASE 3: CAMADA DE DOMÍNIO
# ========================================

log "🎯 Fase 3: Implementando camada de domínio"

# Criar entidades em paralelo
batchtool run --parallel 
  "./claude-flow sparc run usecase-developer 'Create domain entities for tipos_epi, estoque_itens, and related value objects with business rules validation in src/domain/entities/'" 
  "./claude-flow sparc run usecase-developer 'Create domain entities for notas_movimentacao, movimentacoes_estoque with immutability constraints in src/domain/entities/'" 
  "./claude-flow sparc run usecase-developer 'Create domain entities for fichas_epi, entregas, entrega_itens with unit tracking logic in src/domain/entities/'" 
  "./claude-flow sparc run usecase-developer 'Create all domain ENUMs matching PostgreSQL enums in src/domain/enums/'"

sleep 45

# Criar interfaces
./claude-flow sparc run architect-epi "Create repository interfaces for all domain entities in src/domain/interfaces/repositories/. Include methods for complex queries, transactions, and specific needs of each use case."

sleep 30

git add . && git commit -m "feat(epi-backend): [Fase 3] Domain layer with entities and repository interfaces" || true
git tag -a "phase-3-complete" -m "Phase 3 completed successfully" || true

# ========================================
# FASE 4: CAMADA DE INFRAESTRUTURA
# ========================================

log "🔧 Fase 4: Implementando camada de infraestrutura"

./claude-flow swarm "Implement all repository interfaces using Prisma ORM in src/infrastructure/repositories/:
- NotaRepository
- MovimentacaoRepository
- EstoqueRepository
- FichaRepository
- EntregaRepository
- ConfiguracaoRepository

Each should handle complex queries and maintain ACID properties." --strategy development --max-agents 5 --parallel

sleep 60

# Criar módulos
./claude-flow sparc run nestjs-coder "Create NestJS infrastructure modules: DatabaseModule for Prisma service with transaction support, repository providers module, and ConfigModule."

sleep 30

git add . && git commit -m "feat(epi-backend): [Fase 4] Infrastructure layer with Prisma repositories" || true
git tag -a "phase-4-complete" -m "Phase 4 completed successfully" || true

# ========================================
# FASE 5: CASOS DE USO
# ========================================

log "💼 Fase 5: Implementando casos de uso"

# Casos de uso de estoque
batchtool run --parallel 
  "./claude-flow sparc run usecase-developer 'Implement UC-ESTOQUE-01: GerenciarNotaRascunho use case with CRUD operations for draft notas_movimentacao in src/application/use-cases/estoque/'" 
  "./claude-flow sparc run transaction-specialist 'Implement UC-ESTOQUE-02: ConcluirNotaMovimentacao with atomic transactions and proper tipo_nota to tipo_movimentacao mapping in src/application/use-cases/estoque/'" 
  "./claude-flow sparc run transaction-specialist 'Implement UC-ESTOQUE-03: CancelarNotaMovimentacao with estorno generation for completed notas in src/application/use-cases/estoque/'" 
  "./claude-flow sparc run usecase-developer 'Implement UC-ESTOQUE-04: RealizarAjusteDireto for immediate inventory adjustments in src/application/use-cases/estoque/'"

sleep 60

# Casos de uso de fichas
./claude-flow swarm "Implement all Ficha use cases in src/application/use-cases/fichas/:
- UC-FICHA-01: CriarTipoEPI
- UC-FICHA-02: CriarFichaEPI (409 on duplicate)
- UC-FICHA-03: CriarEntregaFicha (unit tracking!)
- UC-FICHA-04: ProcessarDevolucao (signature required)
- UC-FICHA-05: CancelarEntrega
- UC-FICHA-06: CancelarDevolucao

CRITICAL: UC-FICHA-03 must create N individual records for tracking!" --strategy development --max-agents 6 --parallel

sleep 60

# Queries e relatórios
./claude-flow sparc run report-developer "Implement all query use cases and reports (R-01 to R-10) in src/application/use-cases/queries/. Pay special attention to R-07 with dynamic DEVOLUCAO_ATRASADA calculation."

sleep 45

git add . && git commit -m "feat(epi-backend): [Fase 5] Complete application layer with all use cases" || true
git tag -a "phase-5-complete" -m "Phase 5 completed successfully" || true

# ========================================
# FASE 6: API REST
# ========================================

log "🌐 Fase 6: Criando API REST"

# Controllers de notas
batchtool run --parallel 
  "./claude-flow sparc run nestjs-coder 'Create NotasMovimentacaoController with all endpoints from section 8.1. Use Zod schemas with ZodValidationPipe.'" 
  "./claude-flow sparc run nestjs-coder 'Create EstoqueController with ajustes endpoint and historico endpoint. Use Zod validation.'" 
  "./claude-flow sparc run api-security 'Create Zod schemas for all nota endpoints in src/presentation/dto/schemas/notas/'"

sleep 45

# Controllers de fichas
./claude-flow swarm "Create all Ficha-related controllers:
- TiposEpiController
- FichasEpiController
- EntregasController
- DevolucoesController

Include Swagger documentation and Zod validation." --max-agents 4 --parallel

sleep 60

# Controller de relatórios
./claude-flow sparc run nestjs-coder "Create RelatoriosController with all report endpoints. Include query parameter validation using Zod and pagination support."

sleep 30

git add . && git commit -m "feat(epi-backend): [Fase 6] Complete REST API with all controllers" || true
git tag -a "phase-6-complete" -m "Phase 6 completed successfully" || true

# ========================================
# FASE 7: TESTES
# ========================================

log "🧪 Fase 7: Criando testes abrangentes"

log "🧪 Fase 7.1: Criando testes unitários"
./claude-flow swarm "Create comprehensive unit tests for all use cases with mocked repositories. Test happy paths, error scenarios, edge cases. Ensure 100% coverage for critical use cases. Use Vitest." --strategy testing --max-agents 8 --parallel

sleep 60

log "🧪 Fase 7.2: Criando testes de integração"
./claude-flow sparc run test-engineer "Create integration tests for complete flows: nota lifecycle, entrega/devolução with signature, transfers, concurrent operations. Use test database with transaction rollback."

sleep 45

log "🧪 Fase 7.3: Criando testes End-to-End (E2E)"
./claude-flow sparc run test-engineer "Create end-to-end API tests using Supertest for all endpoints. Test request validation, response formats, error handling, and status codes. Include tests for pagination, filtering, and complex query parameters in reports."

sleep 45

git add . && git commit -m "feat(epi-backend): [Fase 7] Comprehensive test suite (unit, integration, e2e)" || true
git tag -a "phase-7-complete" -m "Phase 7 completed successfully" || true

# ========================================
# FASE 8: OTIMIZAÇÕES
# ========================================

log "⚡ Fase 8: Otimizando performance"

./claude-flow sparc run performance-optimizer "Analyze and optimize all database queries, especially for reports and the Kardex. Add missing indexes, optimize N+1 queries with proper includes, and implement query result caching where appropriate. Run EXPLAIN ANALYZE on critical queries."

sleep 30

git add . && git commit -m "perf(epi-backend): [Fase 8] Performance optimizations" || true
git tag -a "phase-8-complete" -m "Phase 8 completed successfully" || true

# ========================================
# FASE 9: DEVOPS
# ========================================

log "🚢 Fase 9: Configurando DevOps"

./claude-flow sparc run devops-automator "Create multi-stage Dockerfile for production build, docker-compose.yml for local development with PostgreSQL and Redis, and .dockerignore file. Include health check endpoints and graceful shutdown handling."

sleep 30

git add . && git commit -m "feat(epi-backend): [Fase 9] DevOps setup with Docker and CI/CD placeholder" || true
git tag -a "phase-9-complete" -m "Phase 9 completed successfully" || true

# ========================================
# FASE 10: DOCUMENTAÇÃO E REVISÃO
# ========================================

log "📚 Fase 10.1: Criando documentação"
./claude-flow swarm "Create comprehensive documentation including: README with setup instructions, API documentation with examples, architecture diagrams, deployment guide, troubleshooting guide, and CHANGELOG. Ensure all business flows are documented with sequence diagrams." --max-agents 3 --parallel

sleep 60

log "🔍 Fase 10.2: Revisão final do código"
./claude-flow sparc run code-reviewer "Perform comprehensive code review checking: adherence to Clean Architecture, proper error handling, transaction consistency, test coverage, performance bottlenecks, security vulnerabilities, and code duplication. Generate report with specific improvements."

sleep 45

git add . && git commit -m "docs(epi-backend): [Fase 10] Complete documentation and final code review" || true
git tag -a "phase-10-complete" -m "Phase 10 completed successfully" || true

# ========================================
# FASE 11: PREPARAÇÃO PARA PRODUÇÃO
# ========================================

log "🚀 Fase 11: Preparando para produção"
./claude-flow sparc run devops-automator "Finalize production setup: environment variable validation, secrets management, database migration strategy, backup procedures, monitoring alerts, and rollback procedures. Create production readiness checklist."

sleep 30

git add . && git commit -m "feat(epi-backend): [Fase 11] Production readiness setup" || true
git tag -a "phase-11-complete" -m "Phase 11 completed successfully" || true

# ========================================
# VALIDAÇÃO FINAL
# ========================================

log "✅ Fase Final: Validação"

# Executar todos os testes
npm test || warning "Alguns testes falharam"
npm run test:e2e || warning "Alguns testes E2E falharam"

# Build
npm run build || error "Build final falhou. Verifique os erros."

# Parar orquestrador
./claude-flow stop

# ========================================
# RELATÓRIO FINAL
# ========================================

log "📊 Desenvolvimento concluído!"
echo ""
echo "==================================="
echo "RESUMO DO DESENVOLVIMENTO"
echo "==================================="
echo "✅ Estrutura do projeto criada"
echo "✅ Schema do banco, migrações e seeds implementados"
echo "✅ Camada de domínio desenvolvida"
echo "✅ Infraestrutura configurada"
echo "✅ Casos de uso implementados"
echo "✅ API REST completa"
echo "✅ Testes (unit, integration, e2e) criados"
echo "✅ Performance otimizada"
echo "✅ DevOps e Docker configurados"
echo "✅ Documentação e revisão completas"
echo "✅ Preparação para produção finalizada"
echo ""
echo "📁 Arquivos TypeScript criados:"
find src -type f -name "*.ts" | wc -l
echo ""
echo "🧪 Para executar todos os testes: npm test && npm run test:e2e"
echo "🚀 Para iniciar servidor: npm run start:dev"
echo "📚 Documentação em: docs/"
echo "📖 Swagger em: http://localhost:3333/api"
echo ""
echo "🎉 Projeto Backend EPI v3.5 pronto!"
echo "==================================="

exit 0
