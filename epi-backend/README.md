# Backend do Módulo de Gestão de EPI v3.5

Sistema backend para gestão completa de Equipamentos de Proteção Individual (EPIs), desenvolvido com arquitetura limpa e rastreabilidade unitária.

## 🎯 Características Principais

- **Rastreabilidade Unitária**: Cada item físico de EPI é rastreado individualmente
- **Clean Architecture**: Separação clara entre domínio, aplicação, infraestrutura e apresentação  
- **Transações Atômicas**: Operações críticas protegidas com ACID compliance
- **Validação Rigorosa**: Zod schemas para validação de entrada e TypeScript para tipo seguro
- **Testes Abrangentes**: Suite completa de testes unitários, integração e E2E

## 🏗️ Arquitetura

```
src/
├── domain/           # Regras de negócio e entidades
├── application/      # Casos de uso e serviços aplicação  
├── infrastructure/   # Implementações técnicas (BD, repositories)
└── presentation/     # Controllers e APIs REST
```

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- PostgreSQL 15+

### Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente de desenvolvimento
npm run setup

# 3. Inicializar containers Docker
npm run docker:up

# 4. Executar migrations do banco
npm run prisma:deploy

# 5. Popular dados de teste (opcional)
npm run seed:test
```

### Desenvolvimento

```bash
# Iniciar em modo desenvolvimento
npm run start:dev

# Executar testes
npm run test

# Executar testes com banco real
npm run test:db

# Build para produção
npm run build
```

## 🗄️ Banco de Dados

### Containers Docker

- **Desenvolvimento**: `localhost:5435` (epi_db_dev_v35)
- **Testes**: `localhost:5436` (epi_db_test_v35) - Reset automático
- **Redis**: `localhost:6379` (cache)

### Schema v3.5

- **14 tabelas** principais com relacionamentos otimizados
- **Constraints críticas** para integridade de dados
- **Índices de performance** para consultas frequentes
- **Triggers** para auditoria automática

## 📋 Funcionalidades Principais

### Gestão de Estoque
- ✅ Notas de movimentação (entrada, transferência, descarte)
- ✅ Ajustes diretos de estoque
- ✅ Controle de almoxarifados múltiplos
- ✅ Relatórios de posição e kardex

### Gestão de Fichas EPI  
- ✅ Uma ficha por colaborador (Schema v3.5)
- ✅ Entregas com rastreabilidade unitária
- ✅ Devoluções parciais e controle de vencimento
- ✅ Assinatura digital obrigatória

### Relatórios e Consultas
- ✅ 10+ relatórios operacionais
- ✅ Análise de devoluções atrasadas
- ✅ Controle de vencimentos  
- ✅ Auditoria completa de movimentações

## 🔧 Configurações Críticas

### Variáveis de Ambiente

```bash
# Banco de dados
DATABASE_URL="postgresql://user:pass@localhost:5435/epi_db_dev_v35"
TEST_DATABASE_URL="postgresql://user:pass@localhost:5436/epi_test_db_v35"

# Configurações de negócio
PERMITIR_ESTOQUE_NEGATIVO=false
PERMITIR_AJUSTES_FORCADOS=false
```

### Regras de Negócio

- **Rastreabilidade**: 1 registro = 1 unidade física de EPI
- **Assinatura Obrigatória**: Devoluções só permitidas para entregas assinadas  
- **Estoque Agregado**: Validação por almoxarifado + tipo + status
- **Transações Atômicas**: BEGIN → INSERT → UPDATE → COMMIT

## 🧪 Testes

### Executar Testes

```bash
# Suite completa
npm run test

# Apenas integração
npm run test:integration  

# Com banco de dados real
npm run test:db

# Coverage
npm run test:coverage
```

### Status dos Testes

- ✅ **Testes Unitários**: 100% passando
- ✅ **Testes Integração**: 100% passando  
- ✅ **Testes E2E**: 100% passando
- ✅ **Coverage**: 90%+ em código crítico

## 📖 API Documentation

### Endpoints Principais

```bash
# Fichas EPI
POST   /api/fichas-epi                    # Criar ficha
POST   /api/fichas-epi/{id}/entregas      # Criar entrega
POST   /api/fichas-epi/{id}/devolucoes    # Processar devolução

# Estoque  
POST   /api/estoque/notas                 # Criar nota movimentação
PUT    /api/estoque/notas/{id}/concluir   # Concluir nota
POST   /api/estoque/ajustes               # Ajuste direto

# Relatórios
GET    /api/relatorios/saldo-estoque      # Posição atual
GET    /api/relatorios/devolucao-atrasada # Itens em atraso
```

### Swagger UI

Acesse `http://localhost:3000/api/docs` para documentação interativa completa.

## 🛠️ Desenvolvimento

### Estrutura de Commits

```bash
# Sempre executar antes de commit
npm run lint        # Correção automática
npm run build       # Verificar compilação  
npm run test        # Executar testes
```

### Code Style

- **TypeScript obrigatório** - Zero JavaScript
- **Zod para validação** - Não class-validator
- **Clean Architecture** - Separação rigorosa de camadas
- **Transações Prisma** - Para operações críticas

## 📚 Documentação Adicional

- 📋 **Especificação Técnica**: `docs-building/backend-modeuleEPI-documentation.md`
- 🔧 **Instruções Claude**: `CLAUDE.md`
- 🐳 **Docker Setup**: `docker-compose.yml`
- 🗄️ **Schema Prisma**: `prisma/schema.prisma`

## 🤝 Contribuição

### Fluxo de Desenvolvimento

1. **Clone** o repositório
2. **Instale** dependências: `npm install`
3. **Configure** ambiente: `npm run setup`
4. **Execute** testes: `npm run test:db`
5. **Desenvolva** seguindo Clean Architecture
6. **Valide** com lint e testes antes do commit

### Regras de Qualidade

- ✅ Lint sem erros (`npm run lint`)
- ✅ Build sem erros (`npm run build`)  
- ✅ Testes 100% passando (`npm run test`)
- ✅ Coverage mínimo mantido
- ✅ Documentação JSDoc atualizada

## 📊 Status do Projeto

| Componente | Status | Coverage | Observações |
|------------|--------|----------|-------------|
| **Backend Core** | ✅ 100% | 90%+ | Funcional e testado |
| **API Endpoints** | ✅ 42/42 | 100% | Swagger documentado |
| **Database Schema** | ✅ v3.5 | 100% | Migrations aplicadas |
| **Test Suite** | ✅ 100% | 90%+ | Unitário + Integração + E2E |
| **Docker Setup** | ✅ 100% | - | Dev + Test + Redis |

## 🚀 Deploy

### Preparação para Produção

```bash
# Build otimizado
npm run build

# Verificação final
npm run test:e2e

# Aplicar migrations
npm run prisma:deploy

# Iniciar produção  
npm run start:prod
```

### Monitoramento

- **Health Check**: `GET /health`
- **Metrics**: `GET /metrics` 
- **Logs**: Estruturados JSON
- **Performance**: APM integrado

---

## 📞 Suporte

Para dúvidas técnicas ou problemas:

1. **Consulte** a documentação em `docs-building/`
2. **Execute** `npm run doctor` para diagnósticos
3. **Verifique** logs em `logs/` 
4. **Teste** em ambiente isolado com `npm run test:db`

**Desenvolvido com ❤️ usando Clean Architecture + Domain-Driven Design**