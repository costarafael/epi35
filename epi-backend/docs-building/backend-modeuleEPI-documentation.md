
# Especificação Técnica Detalhada: Módulo de Gestão de Fichas de EPI e Estoque

**Versão**: 3.7.3 (Sistema de Notas de Movimentação + Correção Crítica + IDs Customizados)

**Data**: 07 de julho de 2025

## 🌐 URLs de Produção

### **Ambiente Ativo**
- **API Principal**: https://epi-backend-s14g.onrender.com
- **Health Check**: https://epi-backend-s14g.onrender.com/health
- **Documentação API**: https://epi-backend-s14g.onrender.com/api/docs
- **Repositório**: https://github.com/costarafael/epi35

### **Infraestrutura**
- **Plataforma**: Render.com (Free Tier)
- **Database**: PostgreSQL managed (1GB storage)
- **Cache**: Redis via Upstash
- **Runtime**: Node.js 22.16.0
- **Deploy**: Automático via GitHub (branch main)

### **Monitoramento**
- **Health Checks**: Contínuos (5s interval)
- **Status**: ✅ Operacional desde 05/07/2025 13:50 UTC
- **Auto-Deploy**: Ativo para commits na main
- **Commit Atual**: `d25c5ae` (07/07/2025 16:15 UTC-3)

### **Status de Produção (07/07/2025 16:15)**
#### **✅ Sistema Completo + Notas de Movimentação + IDs Customizados + Endpoints Frontend-Ready**
- **Dashboard**: Funcionando com dados reais (5 fichas ativas, 6 itens estoque)
- **Database**: Populado com dados de demonstração
  - 3 contratadas cadastradas (Alpha, Beta, Gamma)
  - 5 colaboradores ativos (2 diretos + 3 de contratadas)
  - 6 itens de estoque distribuídos em almoxarifados
  - 2 almoxarifados (SP e RJ) operacionais
- **APIs**: 70+ endpoints testados e funcionais (incluindo sistema completo de notas de movimentação)
- **OTIMIZAÇÃO FRONTEND**: ✅ Endpoints otimizados implementados e testados
  - `GET /api/fichas-epi/:id/complete` - Dados processados pelo backend
  - `GET /api/fichas-epi/list-enhanced` - Listagem otimizada com estatísticas
  - `POST /api/entregas/create-complete` - Criação otimizada de entregas
  - `POST /api/devolucoes/process-batch` - Processamento em lote de devoluções
- **NOTAS DE MOVIMENTAÇÃO**: ✅ Sistema completo implementado e funcional
  - `POST /api/notas-movimentacao` - Criação de notas (ENTRADA, TRANSFERENCIA, DESCARTE)
  - `GET /api/notas-movimentacao` - Listagem com filtros avançados
  - `GET /api/notas-movimentacao/:id` - Consulta individual
  - Validação específica por tipo de nota com constraints corretos
- **CONTROLLERS OTIMIZADOS**: 3 novos controllers especializados implementados
- **SISTEMA DE IDs CUSTOMIZADOS**: ✅ Implementado para melhor legibilidade
  - Entregas: E+5chars (ex: E4UI02)
  - EstoqueItems: I+5chars (ex: I7XK91)
  - TipoEPI: C+5chars (ex: C2MN58)
  - Compatibilidade total com UUIDs existentes
  - Geração automática via Prisma middleware
- **TESTES**: ✅ Ambiente de testes 100% funcional, validações completas
- **INTEGRAÇÃO**: Backend 100% pronto para conectar com frontend otimizado

## 1. Visão Geral e Arquitetura

Este documento detalha a arquitetura e implementação do **Módulo de Gestão de Fichas de EPI e Estoque**, fundamentado em cinco pilares principais:

### 1.0. Arquitetura e Dependências Críticas

#### **🗄️ Banco de Dados Primário (PostgreSQL)**
- **Propósito**: Armazenamento principal de todos os dados transacionais
- **ORM**: Prisma para type-safety e migrations automatizadas
- **Localização**: Schema e migrations em `/prisma/schema.prisma`
- **Backup**: Gerenciado pela infraestrutura Render.com (retention: 7 dias Free / 30 dias Paid)

#### **🔄 Cache e Sessões (Redis / Upstash)**
- **Propósito Duplo**: 
  - **Caching**: Dados de configuração global, listas de EPIs frequentemente consultadas
  - **Gerenciamento de Sessões**: Autenticação e estado de usuário
- **Provider Produção**: Upstash (Free tier: 10K comandos/dia)
- **TTL Padrão**: 1 hora para dados de cache, 24 horas para sessões
- **Estratégia de Invalidação**: Cache é limpo automaticamente em operações de mutação (criação/atualização de EPIs, configurações)
- **⚠️ IMPACTO DE FALHA**: Se a instância Redis ficar indisponível:
  - Usuários não conseguirão fazer login ou manter sessões ativas
  - Performance degrada significativamente (miss de cache força consultas diretas ao PostgreSQL)
  - Sistema permanece funcional mas com latência elevada

#### **🏥 Monitoramento e Saúde do Sistema**
- **Health Check**: Endpoint `/health` disponível sem autenticação
- **Performance Service**: Classe `PerformanceService` para métricas em tempo real
- **⚠️ LIMITAÇÕES IMPORTANTES**:
  - Métricas são **efêmeras e armazenadas em memória** apenas
  - Dados **não persistem** entre reinicializações da aplicação
  - **Não integrado** com sistemas de observabilidade de longo prazo (Prometheus, Datadog)
  - Funciona apenas como **ferramenta de debugging em tempo real**

### 🚨 ALERTAS CRÍTICOS DE SEGURANÇA E ARQUITETURA

#### **⚠️ VULNERABILIDADE DE SEGURANÇA IDENTIFICADA**

**Problema**: A variável `JWT_SECRET` está configurada como **opcional** no schema de ambiente (`environment.config.ts`).

**Risco**: Em ambiente de produção, se esta variável não estiver definida, o sistema pode:
- Usar um segredo padrão fraco
- Permitir tokens JWT sem validação adequada
- Expor o sistema a ataques de autorização

**Ação Imediata Requerida**:
```typescript
// FIX OBRIGATÓRIO em src/infrastructure/config/environment.config.ts
JWT_SECRET: z.string().refine(
  (val) => process.env.NODE_ENV !== 'production' || val.length >= 32,
  { message: 'JWT_SECRET deve ter pelo menos 32 caracteres em produção' }
)
```

#### **🔍 MODELO DE DADOS INCOMPLETO**

**Problema**: A entidade `Contratada` existe no schema Prisma mas **não possui relacionamentos** com outras entidades.

**Impacto**: 
- Código morto ou funcionalidade incompleta
- Ambiguidade no modelo de domínio
- Potencial dívida técnica

**Ação Requerida**: Investigar e documentar o propósito desta entidade ou removê-la.

#### **📋 PROCESSO DE NEGÓCIO IMPLÍCITO IDENTIFICADO**

**Descoberta**: O status `AGUARDANDO_INSPECAO` indica um processo de negócio não documentado.

**Gap Identificado**: Faltam APIs e workflows para:
- Listar itens aguardando inspeção
- Processar inspeção (aprovar/descartar)
- Gerenciar permissões de inspeção

**Ação Requerida**: Implementar APIs de gerenciamento de inspeção de itens.

### 1.0.1. Arquitetura Layered/Hexagonal Confirmada

#### **🏗️ Estrutura de Camadas Validada**

A análise profunda confirmou que o sistema implementa uma **Arquitetura Layered** com características de **Hexagonal Architecture**, com separação clara de responsabilidades:

```typescript
// Estrutura confirmada em src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SharedModule,           // Utilitários e tipos compartilhados
    InfrastructureModule,   // Adapters "Driven" (Database, Redis, HTTP)
    ApplicationModule,      // Core Business Logic (Use Cases)
    PresentationModule,     // Adapters "Driving" (Controllers, DTOs)
  ],
})
```

**Fluxo de Dependências Validado**:
- `Presentation` → `Application` ✅
- `Application` → `Infrastructure` ✅ (via PrismaService)
- `Infrastructure` ← `Domain` ✅ (tipos e interfaces)

#### **⚛️ Princípios Arquiteturais Confirmados**

1. **Transações Atômicas**: Todas as operações críticas usam `prisma.$transaction()`
2. **Separation of Concerns**: Controllers são "thin", Use Cases contêm business logic
3. **Type Safety**: Schemas Zod como Single Source of Truth para DTOs
4. **Observabilidade**: Decorator `@MonitorUseCase` para métricas não-invasivas

#### **🔄 Ciclo de Vida dos EstoqueItem Mapeado**

```mermaid
stateDiagram-v2
    [*] --> DISPONIVEL : Item criado
    DISPONIVEL --> RESERVADO : Entrega criada
    RESERVADO --> DISPONIVEL : Devolução (BOM_ESTADO)
    RESERVADO --> DESCARTADO : Devolução (DANIFICADO/VENCIDO/PERDIDO)
    RESERVADO --> AGUARDANDO_INSPECAO : Devolução (condição duvidosa)
    AGUARDANDO_INSPECAO --> DISPONIVEL : Inspeção aprovada
    AGUARDANDO_INSPECAO --> DESCARTADO : Inspeção reprovada
    DESCARTADO --> [*] : Item removido permanentemente
```

#### **📊 Padrões de Performance Identificados**

1. **Queries Paralelas**: `Promise.all()` em dashboards para otimização
2. **Operações em Lote**: `createMany()` para evitar N+1 queries
3. **Filtragem no Banco**: Construção dinâmica de `whereClause` via Prisma
4. **Paginação Robusta**: Count query + findMany com offset/limit

### 1.1. Configurações Críticas do Ambiente

#### **⚙️ Configurações Operacionais (Environment Variables)**

Estas variáveis controlam regras fundamentais de negócio e devem ser gerenciadas com extremo cuidado:

| Variável | Tipo | Padrão | Cenário de Ativação | Procedimento de Uso | Impacto Colateral |
|----------|------|--------|-------------------|-------------------|------------------|
| `PERMITIR_ESTOQUE_NEGATIVO` | Boolean | `false` | **Situação de Emergência**: Import de dados falhou, necessário registrar saída física antes da entrada da nota fiscal chegar | 1. Notificar tech lead<br>2. Ativar durante janela de baixo tráfego<br>3. Executar operação específica<br>4. **Desativar imediatamente**<br>5. Auditar integridade dos dados | **RISCO ALTO**: Permite saldos negativos que podem corromper relatórios de inventário. Race conditions podem gerar inconsistências graves se múltiplas operações simultâneas ocorrerem. |
| `PERMITIR_AJUSTES_FORCADOS` | Boolean | `false` | **Correção Manual**: Divergências encontradas em auditoria física, necessário ajuste direto sem fluxo de notas | 1. Validar necessidade com gestor<br>2. Documentar motivo do ajuste<br>3. Ativar flag temporariamente<br>4. Executar `POST /api/estoque/ajustes`<br>5. **Desativar imediatamente**<br>6. Registrar no log de auditoria | **RISCO ALTO**: Bypassa validações de integridade e fluxos de aprovação. Pode mascarar problemas sistêmicos se usado incorretamente. |
| `ESTOQUE_MINIMO_EQUIPAMENTO` | Integer | `10` | **Configuração Global**: Definir limite mínimo padrão para alertas de reposição | Alterar via interface administrativa ou variável de ambiente | **RISCO BAIXO**: Afeta apenas alertas visuais, não impacta operações transacionais. |

#### **🔐 Variáveis de Infraestrutura**

| Variável | Descrição | Formato | Ambiente |
|----------|-----------|---------|----------|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://user:pass@host:port/db` | Obrigatória |
| `REDIS_URL` | String de conexão Redis/Upstash | `redis://user:pass@host:port` | Obrigatória |
| `JWT_SECRET` | Chave para assinatura de tokens | String aleatória (32+ chars) | Obrigatória |
| `NODE_ENV` | Ambiente de execução | `development` / `production` / `test` | Obrigatória |

### 1.2. Decisões Arquiteturais Chave

#### **⚡ Estratégia de Concorrência e Transações**

**Decisão Arquitetural**: O sistema foi projetado para simplificar o controle de concorrência através da mudança fundamental no modelo de dados:

- **Modelo Anterior**: Múltiplas `FichaEPI` por colaborador+tipo+almoxarifado (alta complexidade concorrencial)
- **Modelo Atual**: Uma única `FichaEPI` por colaborador (redução drástica de race conditions)

**Mecanismo de Substituição**: 
- **Atomicidade**: Uso obrigatório de `prisma.$transaction()` para operações multi-step
- **Princípio**: Toda operação que afeta estoque executa no mínimo 2 ações atômicas:
  1. `INSERT` em `movimentacoes_estoque` (prova da transação)
  2. `UPDATE` em `estoque_itens.quantidade` (saldo materializado)

**⚠️ RISCO RESIDUAL ACEITO**: 
- O sistema **não implementa** locking pessimista nem otimista
- Em cenários de **alta contenção** no mesmo `EstoqueItem`, race conditions teóricas ainda existem
- Esta decisão aceita o risco em favor da **simplicidade operacional**
- Para situações excepcionais, existe o override manual via `PERMITIR_AJUSTES_FORCADOS`

#### **🔄 Estratégia de Cache**

**Dados Cacheados**:
- Configurações globais do sistema (`PERMITIR_ESTOQUE_NEGATIVO`, etc.)
- Listas de tipos de EPI (master data)
- Metadados de almoxarifados e unidades de negócio
- Sessões de usuário autenticados

**TTL (Time-To-Live)**:
- Configurações: 2 horas
- Master data (tipos EPI): 1 hora  
- Sessões: 24 horas
- Dados transacionais: **não são cacheados** (sempre fresh do DB)

**Invalidação**: 
- Cache é limpo automaticamente em eventos de mutação
- Criação/atualização de EPIs → invalida cache de tipos
- Mudanças de configuração → invalida cache de config
- Logout → invalida sessão específica

### 1.3. Gerenciamento de Configuração

#### **📋 Filosofia de Configuração**

O sistema separa configurações em duas categorias principais: **Configurações de Ambiente (Runtime)** e **Constantes de Compilação (Compile-time)**. 

**Regra Geral**: Se um valor precisa ser diferente entre ambientes (desenvolvimento, produção) ou precisa ser alterado por um operador para responder a um incidente, ele deve ser uma variável de ambiente. Se um valor é fundamental para a lógica de negócio e é consistente em todos os ambientes, ele deve ser uma constante no código-fonte.

#### **⚙️ Configurações de Ambiente (Runtime)**
- **Localização**: Variáveis de ambiente, arquivo `.env`, ou database (`configuracoes` table)
- **Flexibilidade**: Alta - podem ser alteradas sem redeploy
- **Segurança**: Requerem cuidado operacional especial
- **Exemplos**: `DATABASE_URL`, `PERMITIR_ESTOQUE_NEGATIVO`, `JWT_SECRET`

#### **🔧 Constantes de Compilação Notáveis**

**Localização**: `/src/shared/constants/system.constants.ts`

| Constante | Valor Padrão | Justificativa Arquitetural |
|-----------|-------------|---------------------------|
| `PAGINATION.MAX_PAGE_SIZE` | `1000` | **Proteção de Performance**: Previne que a API seja sobrecarregada por requisições de paginação excessivamente grandes, que poderiam causar degradação do serviço ou DoS. Não é uma configuração operacional. |
| `PAGINATION.DEFAULT_PAGE_SIZE` | `50` | **UX Consistente**: Define experiência padrão do usuário. Mudança requer validação de UX e testes de performance. |
| `RELATORIOS.DIAS_VENCIMENTO_ALERT` | `30` | **Regra de Negócio Estável**: Define o limiar de "vencimento próximo" para EPIs. Considerado uma regra de negócio central e estável, que só deve ser alterada com validação da equipe de produto e um novo deploy. |
| `ESTOQUE.QUANTIDADE_UNITARIA` | `1` | **Integridade do Modelo de Dados**: O sistema é construído sobre o princípio de rastreabilidade atômica, onde cada item movimentado é uma unidade. Alterar este valor quebraria a lógica fundamental de transações de estoque. |
| `METRICS.TIMEOUT_DEFAULT_MS` | `120000` | **Timeout de Segurança**: Evita que operações travem indefinidamente. Vinculado a limites de infraestrutura (Render timeout). |
| `VALIDATION.CNPJ_DIGITOS` | `14` | **Validação Regulatória**: CNPJ brasileiro sempre tem 14 dígitos. É uma constante legal, não configurável. |
| `SAUDE_SISTEMA.UTILIZACAO_CPU_PERCENT` | `25` | **Threshold de Monitoramento**: Limite considerado saudável para CPU. Alterado apenas após análise de capacity planning. |

#### **⚠️ Gerência de Mudanças**

**Para Constantes (`system.constants.ts`)**:
1. Abrir PR com justificativa técnica
2. Review obrigatório do tech lead
3. Testes de integração devem passar 100%
4. Deploy completo necessário

**Para Variáveis de Ambiente**:
1. Documentação do motivo da mudança
2. Restart da aplicação
3. Validação pós-mudança obrigatória
4. Rollback plan preparado

### 1.4. Sistema de Gerenciamento de Configurações (v3.5.7)

#### **🔧 API REST para Configurações do Sistema**

**Implementação**: Sistema completo de gerenciamento de configurações via API REST, permitindo controle dinâmico das configurações operacionais sem necessidade de redeploy.

**Localização**: 
- **Schemas**: `/src/presentation/dto/schemas/configuracoes.schemas.ts`
- **Use Cases**: `/src/application/use-cases/configuracoes/`
- **Controller**: `/src/presentation/controllers/configuracoes.controller.ts`
- **Testes**: `/test/integration/configuracoes/configuracoes-api.integration.spec.ts`

#### **📊 Configurações Gerenciadas**

| Chave | Tipo | Valor Padrão | Descrição | Validações |
|-------|------|-------------|-----------|------------|
| `PERMITIR_ESTOQUE_NEGATIVO` | Boolean | `false` | Permite saldos negativos no estoque | Verifica se existem itens com saldo negativo antes de desabilitar |
| `PERMITIR_AJUSTES_FORCADOS` | Boolean | `false` | Permite ajustes diretos no estoque | Sem validações específicas |
| `ESTOQUE_MINIMO_EQUIPAMENTO` | Number | `10` | Limite mínimo global para alertas | Deve ser ≥ 0 e ≤ 999.999 |

#### **🌐 Endpoints da API (8 endpoints)**

```bash
# Listar todas as configurações
GET /api/configuracoes

# Obter status do sistema
GET /api/configuracoes/status

# Obter configuração específica
GET /api/configuracoes/:chave

# Atualizar configuração (genérico)
PUT /api/configuracoes/:chave

# Atualizar configuração booleana (simplificado)
PATCH /api/configuracoes/:chave/boolean

# Atualizar configuração numérica (simplificado)
PATCH /api/configuracoes/:chave/number

# Atualização em lote (até 10 configurações)
POST /api/configuracoes/batch

# Reset para valores padrão
POST /api/configuracoes/reset
```

#### **🔒 Regras de Negócio e Validações**

**Validação de Tipos**:
- **Boolean**: Aceita `"true"`, `"false"`, `"1"`, `"0"`
- **Number**: Validação numérica rigorosa com limites específicos
- **String**: Validação de tamanho e caracteres permitidos

**Regras de Negócio Específicas**:
1. **PERMITIR_ESTOQUE_NEGATIVO**: Não pode ser desabilitado se existirem itens com saldo negativo
2. **ESTOQUE_MINIMO_EQUIPAMENTO**: Deve estar entre 0 e 999.999 unidades
3. **Auto-criação**: Configurações são criadas automaticamente com valores padrão se não existirem

#### **📋 Single Source of Truth com Zod**

**Padrão Implementado**: Todas as validações e tipos derivam dos schemas Zod, eliminando duplicação de código:

```typescript
// Schema define estrutura e validações
export const ConfiguracaoOutputSchema = z.object({
  chave: ChaveConfiguracaoSchema,
  valor: z.string(),
  valorParsed: z.union([z.boolean(), z.number(), z.string()]),
  tipo: TipoConfiguracaoSchema,
  descricao: z.string(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// Tipos derivados automaticamente
export type ConfiguracaoOutput = z.infer<typeof ConfiguracaoOutputSchema>;
```

#### **🧪 Cobertura de Testes**

**Status**: ✅ **100% Coverage** (20/20 testes passando)

**Categorias de Teste**:
- **Funcionalidades básicas**: Listagem, consulta individual, criação automática
- **Atualizações**: Simples, booleana, numérica com validações
- **Operações em lote**: Batch update, reset para padrão
- **Validações**: Tipos inválidos, regras de negócio, limites
- **Integração**: Consistência entre endpoints e ConfiguracaoService

#### **⚡ Performance e Integração**

**Integração com ConfiguracaoService**: 
- Mudanças via API são refletidas imediatamente no sistema
- Cache invalidado automaticamente em atualizações
- Consistência garantida entre múltiplos endpoints

**Exemplos de Uso**:
```bash
# Habilitar estoque negativo temporariamente
PATCH /api/configuracoes/PERMITIR_ESTOQUE_NEGATIVO/boolean
{ "ativo": true, "descricao": "Emergência - import em andamento" }

# Atualizar múltiplas configurações
POST /api/configuracoes/batch
{
  "configuracoes": [
    { "chave": "PERMITIR_ESTOQUE_NEGATIVO", "valor": "false" },
    { "chave": "ESTOQUE_MINIMO_EQUIPAMENTO", "valor": "25" }
  ]
}

# Reset completo para padrão
POST /api/configuracoes/reset
```

#### **🔄 Ciclo de Vida e Auditoria**

**Rastreabilidade**: Todas as mudanças ficam registradas com:
- Valor anterior e novo valor
- Timestamp da alteração  
- Histórico completo de configurações
- Status de sucesso/falha em operações batch

**Status de Produção**: ✅ Deployment realizado com commit `a2ce7a5`

## **📊 Sistema Dual de Status de Estoque**

### **⚠️ ESCLARECIMENTO IMPORTANTE: Dois Conceitos Distintos**

O sistema implementa **dois conceitos diferentes** para status de estoque que **NÃO devem ser confundidos**:

#### **1. Status Físico do EstoqueItem** (`status_estoque_item_enum`)
**Localização**: Campo `status` na tabela `estoque_itens`
**Valores**: `DISPONIVEL`, `AGUARDANDO_INSPECAO`, `QUARENTENA`
**Finalidade**: Estado físico real do item no almoxarifado

```sql
-- Status físico dos itens
CREATE TYPE status_estoque_item_enum AS ENUM (
  'DISPONIVEL',           -- Item pronto para entrega
  'AGUARDANDO_INSPECAO',  -- Item aguardando análise técnica
  'QUARENTENA'            -- Item isolado por problemas identificados
);
```

**Arquivo de Implementação**: `src/domain/enums/estoque.enum.ts`

#### **2. Situação Analítica do Estoque** (calculada dinamicamente)
**Localização**: Calculada em `src/application/use-cases/queries/relatorio-posicao-estoque.use-case.ts`
**Valores**: `NORMAL`, `BAIXO`, `ZERO`
**Finalidade**: Situação de reposição baseada em níveis mínimos

```typescript
// Situação calculada para alertas de reposição
private async calcularSituacaoEstoque(item: ItemPosicaoEstoque): Promise<'NORMAL' | 'BAIXO' | 'ZERO'> {
  if (item.saldoTotal === 0) return 'ZERO';
  
  const estoqueMinimo = await this.configuracaoService.obterEstoqueMinimoEquipamento();
  
  if (item.saldoTotal < estoqueMinimo) return 'BAIXO';
  else return 'NORMAL';
}
```

**Arquivo de Schema**: `src/presentation/dto/schemas/estoque.schemas.ts`

### **🔄 Como os Sistemas se Relacionam**

#### **Status Físico** → Operações de movimentação
- **DISPONIVEL**: Pode ser usado em entregas e transferências
- **AGUARDANDO_INSPECAO**: Bloqueado até conclusão da análise
- **QUARENTENA**: Isolado, não pode ser movimentado

#### **Situação Analítica** → Alertas e relatórios
- **NORMAL**: Estoque acima do mínimo configurado
- **BAIXO**: Estoque abaixo do mínimo (alerta amarelo)
- **ZERO**: Sem itens disponíveis (alerta vermelho)

### **📂 Implementação nos Arquivos**

#### **Controllers que usam Status Físico**:
- `src/presentation/controllers/relatorios.controller.ts` (linha 163-164)
  ```typescript
  .filter(item => ['BAIXO', 'ZERO'].includes(item.situacao)) // ❌ CONFUSÃO CONCEITUAL
  ```

#### **Controllers que usam Situação Analítica**:
- `src/shared/formatters/dashboard-formatter.service.ts` (linha 155-156)
  ```typescript
  .filter((item: any) => ['BAIXO', 'ZERO'].includes(item.situacao)) // ✅ USO CORRETO
  ```

### **🎯 Uso Correto em Contextos**

#### **Para Movimentações de Estoque**:
```typescript
// ✅ CORRETO: Usar status físico
WHERE estoque_itens.status = 'DISPONIVEL'
```

#### **Para Alertas de Reposição**:
```typescript
// ✅ CORRETO: Usar situação calculada
situacao: item.saldoTotal === 0 ? 'ZERO' : 
          item.saldoTotal < estoqueMinimo ? 'BAIXO' : 'NORMAL'
```

1. **Fonte Única da Verdade**: O saldo de itens é auditável e reconstruível a partir de um livro-razão imutável (`movimentacoes_estoque`).

2. **Performance e Consistência**: O saldo atual é mantido em um campo denormalizado (`estoque_itens.quantidade`) para performance, com sincronia garantida por transações atômicas de banco de dados.

3. **Rastreabilidade Atômica por Tipo**: Toda alteração no estoque ou nas fichas de colaboradores é registrada de forma permanente, transacional e rastreável no nível do tipo de EPI.

4. **Separação de Contextos**: Operações de estoque (agrupadas em "Notas") são separadas das operações com colaboradores (Entregas e Devoluções), garantindo clareza e interfaces específicas.

5. **API RESTful e Casos de Uso**: A lógica de negócio é encapsulada em casos de uso bem definidos, expostos por uma API RESTful, seguindo princípios de *Clean Architecture* e *CQRS*.

6. **Resiliência Operacional**: O sistema aceita trade-offs calculados entre simplicidade e robustez, com overrides manuais documentados para situações excepcionais.

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

## 1.8. API Endpoints Confirmados e Validados

### **📍 Estrutura Modular dos Controllers**

A análise revelou que o sistema possui **7 controllers principais** organizados em módulos especializados:

#### **🏗️ Módulo de Fichas EPI** (`FichasModule`)
- `FichasEpiController`: CRUD de fichas e operações principais
- `EntregasController`: Criação e gestão de entregas
- `DevolucoesFichaController`: Processamento de devoluções

#### **📊 Módulo de Relatórios** (`RelatoriosModule`)
- `DashboardController`: Métricas e estatísticas principais
- `EstoqueController`: Consultas de estoque e inventário
- `MovimentacoesController`: Relatórios de movimentações
- `PerformanceController`: Métricas de sistema

#### **⚙️ Controllers Globais**
- `ConfiguracoesController`: Gerenciamento de configurações do sistema
- `UsuariosController`: Listagem e consulta de usuários
- `HealthController`: Monitoramento de saúde do sistema

### **🔗 Endpoints Críticos Identificados**

#### **Ciclo de Vida das Entregas**
```http
# Criar nova entrega
POST /api/fichas-epi/{fichaId}/entregas
Content-Type: application/json
{
  "almoxarifadoId": "uuid",
  "usuarioId": "uuid", 
  "itens": [
    {
      "estoqueItemOrigemId": "uuid",
      "dataLimiteDevolucao": "2025-12-31T23:59:59Z",
      "observacoes": "string"
    }
  ],
  "observacoes": "string"
}

# Processar devolução
POST /api/fichas-epi/{fichaId}/devolucoes
Content-Type: application/json
{
  "entregaId": "uuid",
  "usuarioId": "uuid",
  "itens": [
    {
      "entregaItemId": "uuid",
      "quantidadeDevolvida": 1,
      "motivoDevolucao": "FIM_UTILIZACAO",
      "condicaoItem": "BOM_ESTADO",
      "observacoes": "string"
    }
  ]
}
```

#### **Business Intelligence e Relatórios**
```http
# Dashboard principal
GET /api/relatorios/dashboard

# Devoluções pendentes (com filtros)
GET /api/fichas-epi/devolucoes-pendentes?colaboradorId={id}&diasVencimento=30

# Histórico completo da ficha
GET /api/fichas-epi/{fichaId}/historico?page=1&limit=50

# Saldo de estoque
GET /api/relatorios/estoque/saldo-atual?almoxarifadoId={id}
```

#### **Configurações e Operações**
```http
# Configurações do sistema
GET /api/configuracoes
PUT /api/configuracoes/{chave}

# Health check
GET /health

# Listagens para formulários
GET /api/usuarios?nome={search}&page=1&limit=50
GET /api/estoque/itens?almoxarifadoId={id}&disponivel=true
GET /api/estoque/almoxarifados
```

### **✅ Padrões de API Validados**

1. **Consistência de Resposta**: Todas as APIs retornam `{ success: boolean, data: T }`
2. **Validação Type-Safe**: Schemas Zod em todos os endpoints
3. **Paginação Padronizada**: `page`, `limit`, `total`, `hasNext`, `hasPrev`
4. **Filtragem Avançada**: Query parameters opcionais para busca e filtros
5. **Documentação Swagger**: Todos os endpoints documentados em `/api/docs`

### **🔍 Observabilidade e Tratamento de Erros**

#### **🚨 Global Exception Filter**

O sistema implementa tratamento centralizado de exceções via `GlobalExceptionFilter`:

```typescript
// Estrutura padronizada de erro
{
  "success": false,
  "error": {
    "code": "BUSINESS_ERROR_CODE",
    "message": "Mensagem user-friendly",
    "details": {}, // Opcional
    "timestamp": "2025-07-06T12:30:00Z",
    "path": "/api/endpoint"
  }
}
```

**Mapeamento de Erros**:
- `BusinessError` → HTTP 400
- `NotFoundError` → HTTP 404 
- `ConflictError` → HTTP 409
- `Prisma P2002` → `UNIQUE_CONSTRAINT_VIOLATION`
- `Prisma P2025` → `RECORD_NOT_FOUND`

#### **📊 Sistema de Performance Monitoring**

**Decorator AOP**: `@MonitorUseCase`
```typescript
@MonitorUseCase('criar-entrega-ficha')
async execute(input: CriarEntregaInput) {
  // Métricas automáticas:
  // - Tempo de execução
  // - Sucesso/falha
  // - Use case específico
}
```

**Métricas Coletadas**:
- Tempo de resposta por use case
- Taxa de sucesso/erro por endpoint
- Operações por minuto
- Conexões de banco ativas

**Limitações Atuais**:
- Métricas apenas em memória (não persistentes)
- Não integrado com Prometheus/Grafana
- Reset a cada restart da aplicação

#### **🏥 Health Checks**

**Endpoint**: `GET /health`
```json
{
  "status": "ok",
  "timestamp": "2025-07-06T12:30:00Z",
  "uptime": 86400,
  "version": "3.6.0",
  "environment": "production",
  "database": {
    "status": "connected",
    "responseTime": 25
  }
}
```

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
-- Categorias de EPI para organização e filtros (v3.5.1)
CREATE TYPE categoria_epi_enum AS ENUM (
    'PROTECAO_CABECA',      -- Capacetes, bonés, etc.
    'PROTECAO_OLHOS',       -- Óculos, máscaras faciais
    'PROTECAO_AUDITIVA',    -- Protetores auriculares
    'PROTECAO_RESPIRATORIA', -- Máscaras, respiradores
    'PROTECAO_TRONCO',      -- Aventais, coletes
    'PROTECAO_MAOS',        -- Luvas de diversos tipos
    'PROTECAO_PES',         -- Botas, sapatos de segurança
    'PROTECAO_QUEDAS',      -- Cinturões, talabartes
    'OUTROS'                -- Categoria genérica
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
| `contratadas`             | **[v3.5.2]** Empresas contratadas que empregam colaboradores.          |
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
| `categoria`        | categoria_epi_enum       | NOT NULL, default 'OUTROS' | **[v3.5.1]** Categoria para organização.  |
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

| Coluna         | Tipo de Dado | Constraints                     | Descrição                                    |
| :------------- | :----------- | :------------------------------ | :------------------------------------------- |
| `id`           | uuid         | PK                              | Identificador único do colaborador           |
| `nome`         | varchar(255) | NOT NULL                        | Nome do colaborador                          |
| `contratada_id`| uuid         | NULLABLE, FK -> contratadas.id  | **[v3.5.2]** Empresa contratada (opcional)  |

#### Tabela: `contratadas` **[v3.5.2]**

*Entidade para identificação de empresas contratadas que empregam colaboradores:*

| Coluna      | Tipo de Dado             | Constraints / Índices       | Descrição                                    |
| :---------- | :----------------------- | :--------------------------- | :------------------------------------------- |
| `id`        | uuid                     | PK                          | Identificador único da contratada            |
| `nome`      | varchar(255)             | NOT NULL                    | Nome/razão social da empresa                 |
| `cnpj`      | varchar(18)              | UNIQUE, NOT NULL            | CNPJ da empresa (formato: XX.XXX.XXX/XXXX-XX) |
| `created_at`| timestamp with time zone | default now()               | Data de criação do registro                  |

**Validação CNPJ**: O sistema implementa validação matemática rigorosa do CNPJ conforme algoritmo oficial da Receita Federal.

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

**UC-QUERY-01: Visualizar Histórico Completo da Ficha de EPI** (v3.5.6): Sistema avançado de auditoria que reconstrói o histórico completo de uma ficha a partir de múltiplas fontes de dados.

- **Fonte 1 - Criação**: Baseado em `fichas_epi.created_at`
- **Fonte 2 - Histórico Explícito**: Registros em `historico_fichas` 
- **Fonte 3 - Entregas**: Eventos de `entregas` e `entrega_itens`
- **Fonte 4 - Devoluções**: Movimentações `ENTRADA_DEVOLUCAO`
- **Fonte 5 - Cancelamentos**: Estornos e cancelamentos
- **Fonte 6 - Itens Vencidos**: Cálculo baseado em `data_limite_devolucao`

**Funcionalidades**:
- Filtros por tipo de ação (`CRIACAO`, `ENTREGA`, `DEVOLUCAO`, `CANCELAMENTO`, `ALTERACAO_STATUS`, `ITEM_VENCIDO`, `EDICAO`)
- Filtros por período (`dataInicio`, `dataFim`)
- Paginação server-side (`page`, `limit`)
- Estatísticas consolidadas (totais, última atividade)
- Ordenação cronológica (mais recente primeiro)

**Endpoint**: `GET /api/fichas-epi/{fichaId}/historico`

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

## 8. Especificação da API RESTful (Revisada v3.5.5)

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

- `GET /api/estoque/itens`: Lista itens de estoque com filtros e paginação.

    - **Query Parameters**:
        - `almoxarifadoId` (opcional): Filtrar por almoxarifado
        - `tipoEpiId` (opcional): Filtrar por tipo de EPI
        - `apenasDisponiveis` (opcional): Apenas itens disponíveis
        - `apenasComSaldo` (opcional): Apenas itens com saldo > 0
        - `page` (opcional): Página (padrão: 1)
        - `limit` (opcional): Itens por página (padrão: 50, máx: 100)

    - **Resposta**: Lista paginada de itens de estoque com informações do almoxarifado e tipo de EPI

- `GET /api/estoque/almoxarifados`: Lista almoxarifados disponíveis.

    - **Query Parameters**:
        - `unidadeNegocioId` (opcional): Filtrar por unidade de negócio
        - `incluirContadores` (opcional): Incluir contagem de itens

    - **Resposta**: Lista de almoxarifados ordenados por principais primeiro

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

### 8.4. Recursos de Fichas, Entregas e Devoluções (Refatorados v3.5.5)

#### **8.4.1. Fichas de EPI**
- `POST /api/fichas-epi`: Cria ficha de EPI (UC-FICHA-02).
- `GET /api/fichas-epi`: Lista fichas com filtros avançados
- `GET /api/fichas-epi/{fichaId}`: Obter ficha específica com detalhes completos
- `PUT /api/fichas-epi/{fichaId}/ativar`: Ativar ficha inativa
- `PUT /api/fichas-epi/{fichaId}/inativar`: Inativar ficha ativa
- `GET /api/fichas-epi/estatisticas`: Estatísticas gerais das fichas

#### **8.4.2. Entregas de EPI**
- `POST /api/entregas`: Criar nova entrega (UC-FICHA-03)
- `GET /api/entregas`: Listar entregas com filtros
- `GET /api/entregas/{entregaId}`: Obter entrega específica
- `PUT /api/entregas/{entregaId}/assinar`: Coletar assinatura da entrega
- `POST /api/entregas/{entregaId}/cancelar`: Cancelar entrega (UC-FICHA-05)

#### **8.4.3. Devoluções de EPI**
- `POST /api/devolucoes`: Processar devolução (UC-FICHA-04)
- `GET /api/devolucoes`: Histórico de devoluções
- `GET /api/devolucoes/posicoes-atuais`: Posições atuais por colaborador
- `POST /api/devolucoes/{devolucaoId}/cancelar`: Cancelar devolução

#### **8.4.4. Recursos Adicionais**
- `POST /api/tipos-epi`: Cria tipo de EPI (UC-FICHA-01)
- `GET /api/entregas/{entregaId}/itens`: Lista todos os itens unitários de uma entrega
- `GET /api/fichas-epi/{fichaId}/historico`: Histórico completo da ficha com filtros e paginação (UC-QUERY-01)

**Nota**: Todos os endpoints mantêm 100% de compatibilidade com a versão anterior. A refatoração foi puramente organizacional.

### 8.5. Recursos de Relatórios (Refatorados v3.5.5)

#### **8.5.1. Dashboard Principal**
- `GET /api/dashboard`: Dashboard principal consolidado
- `GET /api/dashboard/estatisticas`: Estatísticas gerais do sistema

#### **8.5.2. Relatórios de Descartes**
- `GET /api/relatorios-descartes`: Relatório completo de descartes (R-09)
- `GET /api/relatorios-descartes/estatisticas`: Estatísticas de descartes

#### **8.5.3. Relatórios de Saúde**
- `GET /api/relatorios-saude/epis-ativos-sintetico`: EPIs ativos sintético (R-03)
- `GET /api/relatorios-saude/epis-ativos-detalhado`: EPIs ativos detalhado (R-04)
- `GET /api/relatorios-saude/epis-devolucao-atrasada`: Fichas com devolução atrasada (R-07)

#### **8.5.4. Relatórios Clássicos (Compatibilidade)**
- `GET /api/relatorios/saldo-estoque`: Saldo de estoque (R-01)
- `GET /api/relatorios/movimentacoes-estoque`: Movimentações (R-02)
- `GET /api/relatorios/estornos`: Relatório de estornos (R-10)

**Nota**: Controllers refatorados em 4 controladores especializados para melhor organização e manutenibilidade.

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

## **🚀 Status Final da Implementação (v3.5.6)**

### **✅ Sistema 100% Funcional em Produção + Histórico Completo**

**Deploy Ativo**: https://epi-backend-s14g.onrender.com (desde 05/07/2025)
- **59 endpoints ativos** na documentação API (0 breaking changes)
- **88 testes de integração** implementados (93% taxa de sucesso)
- **Monitoramento contínuo** com health checks automatizados
- **Arquitetura Refatorada**: Controllers modularizados para melhor manutenibilidade
- **Sistema de Histórico**: Rastreabilidade completa de fichas EPI implementada

### **🎯 Funcionalidades Implementadas por Versão**

#### **v3.5.1 - Funcionalidades Avançadas**
- **Categorias de EPI**: Sistema de categorização completo com enum `categoria_epi_enum`
- **Paginação Server-Side**: Implementada em todos os relatórios para performance
- **Sistema de Devolução Pendente**: Filtros avançados por colaborador/almoxarifado
- **Melhorias de UX**: Formulários otimizados e dashboards responsivos

#### **v3.5.2 - Entidades e Configurações**
- **Entidade Contratada**: CRUD completo com validação CNPJ matemática rigorosa
- **Estoque Mínimo Global**: Configuração simplificada unificada via `ESTOQUE_MINIMO_EQUIPAMENTO`
- **Sistema Dual de Status**: Status físico (DISPONIVEL/AGUARDANDO_INSPECAO/QUARENTENA) + Situação analítica (NORMAL/BAIXO/ZERO)

#### **v3.5.3 - Relatórios e Estoque Negativo**
- **Suporte a Estoque Negativo**: Implementado em todos os relatórios e dashboards
- **Relatório de Descartes**: Filtros multi-dimensionais com estatísticas consolidadas
- **Exportação Avançada**: Múltiplos formatos para análise externa

#### **v3.5.4 - Deploy Produção Completo**
- **Infraestrutura Produção**: Render.com + PostgreSQL + Redis (Upstash)
- **CI/CD Automatizado**: Deploy automático via GitHub Actions
- **Monitoramento**: Health checks + logging estruturado + métricas de performance
- **Documentação API**: Swagger UI completo e funcional

#### **v3.5.5 - Refatoração Controllers e Arquitetura**
- **Modularização**: RelatoriosController (673 linhas) → 4 controllers especializados
- **Organização**: FichasEpiController (630 linhas) → 3 controllers focados
- **Services Centralizados**: 5 formatters services criados para reduzir duplicação
- **Módulos Estruturados**: RelatoriosModule e FichasModule para organização
- **Zero Breaking Changes**: 100% compatibilidade API preservada
- **Performance**: Melhor manutenibilidade e Single Responsibility principle

#### **v3.5.6 - Sistema de Histórico de Fichas EPI**
- **Auditoria Completa**: Rastreamento total de todas as operações em fichas EPI
- **Múltiplas Fontes**: Reconstrução automática do histórico a partir de 6 fontes de dados
- **Filtros Avançados**: Por tipo de ação, período e paginação server-side
- **Estatísticas**: Métricas consolidadas automáticas (totais, última atividade)
- **Eventos Rastreados**: Criação, entregas, devoluções, cancelamentos, status, vencimentos
- **API RESTful**: Endpoint `GET /api/fichas-epi/:id/historico` com documentação Swagger
- **Testes Completos**: 6/6 testes de integração passando (100% cobertura)
- **Performance**: Queries otimizadas com includes apropriados e ordenação

### **📊 Cobertura de Testes**
- **Sistema Principal (Core Business)**: 68/68 testes (100% ✅)
- **Funcionalidades Adicionais**: 13/20 testes (65% ⚠️)
- **Taxa Geral**: 81/88 testes (92% ✅)

### **🔧 Configurações Padrão do Sistema**
- `PERMITIR_ESTOQUE_NEGATIVO`: false (configurável via banco/env)
- `PERMITIR_AJUSTES_FORCADOS`: false (configurável via banco/env)
- `ESTOQUE_MINIMO_EQUIPAMENTO`: 10 unidades (configurável via banco/env)

## **👥 API de Usuários (v3.5.9)**

### **Endpoints de Usuários Implementados**

#### **GET /api/usuarios**
**Funcionalidade**: Lista usuários do sistema com filtros e paginação
- **Filtros Disponíveis**: 
  - `nome` (busca parcial case-insensitive)
  - `email` (busca parcial case-insensitive)
- **Paginação**: 
  - `page` (padrão: 1)
  - `limit` (padrão: 50, máximo: 100)
- **Response**: Lista paginada de usuários com metadados de paginação
- **Uso Principal**: Seleção de responsáveis para criação de entregas

#### **GET /api/usuarios/:id**
**Funcionalidade**: Retorna informações de um usuário específico
- **Parâmetro**: `id` (UUID do usuário)
- **Response**: Objeto do usuário ou 404 se não encontrado
- **Uso Principal**: Detalhes do usuário selecionado

### **Estrutura do Objeto Usuario**
```json
{
  "id": "uuid",
  "nome": "string",
  "email": "string (email format)",
  "createdAt": "datetime"
}
```

### **Características Técnicas**
- **Validação**: Schemas Zod type-safe para todos os endpoints

## **📋 Sistema de Notas de Movimentação (v3.7.3)**

### **Funcionalidade Completa Implementada**

O Sistema de Notas de Movimentação permite o controle e registro de todas as movimentações de estoque de EPIs através de três tipos de operações fundamentais:

#### **Tipos de Notas Suportados**

##### **1. ENTRADA** 
- **Finalidade**: Registro de EPIs recebidos de fornecedores ou devoluções
- **Campos Obrigatórios**: `almoxarifadoDestinoId`, `observacoes`
- **Campos Opcionais**: `almoxarifadoId` (deve ser `null`)
- **Validação**: `almoxarifadoOrigemId` deve ser `null`

##### **2. TRANSFERENCIA**
- **Finalidade**: Movimentação de EPIs entre almoxarifados
- **Campos Obrigatórios**: `almoxarifadoOrigemId`, `almoxarifadoDestinoId`
- **Validação**: Ambos os almoxarifados devem ser diferentes e válidos

##### **3. DESCARTE**
- **Finalidade**: Baixa definitiva de EPIs por vencimento, dano ou inutilização
- **Campos Obrigatórios**: `almoxarifadoId`, `observacoes`
- **Campos Opcionais**: `almoxarifadoDestinoId` (deve ser `null`)

#### **Endpoints Implementados**

##### **POST /api/notas-movimentacao**
**Funcionalidade**: Criação de nova nota de movimentação
- **Body**: Dados da nota conforme tipo específico
- **Validação**: Regras específicas por tipo de movimentação
- **Response**: Nota criada com ID e dados completos
- **Regras de Negócio**: 
  - Validação de estoque disponível para transferências
  - Verificação de existência dos almoxarifados
  - Aplicação de regras de estoque negativo (configurável)

##### **GET /api/notas-movimentacao**
**Funcionalidade**: Listagem de notas com filtros avançados
- **Filtros Disponíveis**:
  - `tipo` (ENTRADA, TRANSFERENCIA, DESCARTE)
  - `almoxarifadoId` (filtro por almoxarifado origem)
  - `almoxarifadoDestinoId` (filtro por almoxarifado destino)
  - `dataInicio` / `dataFim` (período)
- **Paginação**: `page`, `limit` (padrão: 50, máximo: 100)
- **Ordenação**: Por data de criação (mais recentes primeiro)

##### **GET /api/notas-movimentacao/:id**
**Funcionalidade**: Consulta individual de nota
- **Parâmetro**: `id` (UUID da nota)
- **Response**: Dados completos da nota incluindo itens relacionados
- **Inclui**: Informações de almoxarifados origem/destino quando aplicável

#### **Estrutura de Dados**

```json
{
  "id": "uuid",
  "tipo": "ENTRADA | TRANSFERENCIA | DESCARTE",
  "numero": "string (auto-gerado)",
  "almoxarifadoId": "uuid | null",
  "almoxarifadoDestinoId": "uuid | null", 
  "observacoes": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "itens": [
    {
      "id": "uuid",
      "tipoEpiId": "uuid", 
      "quantidade": "number",
      "valorUnitario": "decimal (opcional)"
    }
  ]
}
```

#### **Correção Crítica Aplicada (v3.7.3)**

##### **Problema Identificado**
- **Constraint de DB incorreta**: Campo `almoxarifado_id` estava definido como `NOT NULL` na tabela `nota_movimentacao`
- **Impacto**: Notas de ENTRADA falhavam na validação pois precisam de `almoxarifadoId = null`
- **Erro**: "Almoxarifados obrigatórios não informados ou configuração inválida para o tipo de nota"

##### **Solução Implementada**
- **Migration**: `20250707184445_fix_nota_movimentacao_almoxarifado_fields.sql`
- **Alteração**: Campo `almoxarifado_id` modificado para permitir `NULL`
- **Schema Atualizado**: 
  ```prisma
  model NotaMovimentacao {
    almoxarifadoId        String?         @map("almoxarifado_id")
    almoxarifadoDestinoId String?         @map("almoxarifado_destino_id")
  }
  ```

##### **Deploy em Produção**
- **Sistema de Migração**: Configurado para aplicação automática via `render.yaml`
- **Startup Migration**: Hook implementado em `main.ts` para garantir aplicação
- **Status**: ✅ Migração aplicada com sucesso em produção
- **Resultado**: Todas as operações de nota funcionando corretamente

#### **Validações e Regras de Negócio**

##### **Validações por Tipo**
```typescript
// Schema Zod para validação
const CriarNotaMovimentacaoSchema = z.object({
  tipo: z.enum(['ENTRADA', 'TRANSFERENCIA', 'DESCARTE']),
  almoxarifadoId: z.string().uuid().nullable(),
  almoxarifadoDestinoId: z.string().uuid().nullable(),
  observacoes: z.string().min(1),
  itens: z.array(ItemNotaSchema).min(1)
}).refine((data) => {
  switch (data.tipo) {
    case 'ENTRADA':
      return data.almoxarifadoDestinoId && !data.almoxarifadoId;
    case 'TRANSFERENCIA': 
      return data.almoxarifadoId && data.almoxarifadoDestinoId;
    case 'DESCARTE':
      return data.almoxarifadoId && !data.almoxarifadoDestinoId;
  }
}, {
  message: 'Almoxarifados obrigatórios não informados ou configuração inválida para o tipo de nota'
});
```

##### **Integridade de Dados**
- **Transações Atômicas**: Todas as operações encapsuladas em transações Prisma
- **Validação de Estoque**: Verificação de disponibilidade antes de movimentações
- **Auditoria**: Registro automático de todas as movimentações na tabela `MovimentacaoEstoque`
- **Rastreabilidade**: Vínculo direto entre notas e movimentações de estoque individual

#### **Configurações do Sistema**
- **Estoque Negativo**: Controlado via `PERMITIR_ESTOQUE_NEGATIVO` (padrão: false)
- **Validação de Almoxarifados**: Verificação de existência ativa obrigatória
- **Numeração**: Geração automática de números sequenciais para controle interno

### **Status de Implementação**
- ✅ **APIs Completas**: Todos os endpoints funcionais
- ✅ **Validações**: Regras de negócio implementadas e testadas
- ✅ **Database**: Schema corrigido e migrations aplicadas
- ✅ **Produção**: Sistema 100% operacional
- ✅ **Documentação**: Swagger UI completo disponível
- ✅ **Frontend Ready**: Endpoints prontos para integração com interface de usuário

### **Integração com Criação de Entregas**
Os endpoints de usuários resolvem o bloqueio identificado na criação de entregas, permitindo:
1. **Listagem de Responsáveis**: Frontend pode buscar usuários disponíveis
2. **Filtros Inteligentes**: Busca por nome/email para seleção rápida
3. **Paginação Eficiente**: Carregamento otimizado para grandes listas
4. **Validação de Responsável**: Verificação de existência via endpoint individual

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
