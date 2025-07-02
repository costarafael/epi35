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

## CONTAINERS CORRETOS
  Containers corretos:
  - Banco dev: epi_db_dev_v35 (porta 5435)
  - Banco teste: epi_db_test_v35 (porta 5436)
  - Redis: epi_redis (porta 6379)

## FONTE DA VERDADE PARA O SCHEMA E REGRAS DE NEGÓCIO
  
  /Users/rafaelaredes/Documents/DataLife-EPI/datalife-epi35/epi-backend/docs-building/backend-modeuleEPI-documentation.md

## 🔄 MUDANÇAS ESTRUTURAIS REALIZADAS (02/07/2025)

### ⚠️ ATENÇÃO: BREAKING CHANGES IMPLEMENTADAS

**O schema foi COMPLETAMENTE REESCRITO** para alinhar com a documentação oficial. Qualquer código implementado antes desta data pode ter incompatibilidades.

### 📋 PRINCIPAIS MUDANÇAS NO SCHEMA:

#### **1. ENUMs Completamente Reformulados:**
```
ANTES (schema antigo):
- StatusUsuario: ATIVO, INATIVO, BLOQUEADO
- TipoMovimentacao: ENTRADA, SAIDA, TRANSFERENCIA, AJUSTE, DESCARTE, ESTORNO
- StatusEstoqueItem: DISPONIVEL, RESERVADO, AGUARDANDO_INSPECAO, DESCARTADO

AGORA (conforme documentação):
- StatusTipoEpiEnum: ATIVO, DESCONTINUADO
- TipoMovimentacaoEnum: ENTRADA_NOTA, SAIDA_ENTREGA, ENTRADA_DEVOLUCAO, etc. (16 valores específicos)
- StatusEstoqueItemEnum: DISPONIVEL, AGUARDANDO_INSPECAO, QUARENTENA
- StatusEntregaEnum: PENDENTE_ASSINATURA, ASSINADA, CANCELADA
- StatusEntregaItemEnum: COM_COLABORADOR, DEVOLVIDO
- StatusFichaEnum: ATIVA, INATIVA
```

#### **2. Tabela `usuarios` Simplificada:**
```
REMOVIDOS: senha, status, updatedAt
MANTIDOS: id, nome, email, createdAt
```

#### **3. Tabela `tipos_epi` Reestruturada:**
```
ANTES: nome, codigo, ca, validadeMeses, diasAvisoVencimento, exigeAssinaturaEntrega, ativo
AGORA: nomeEquipamento, numeroCa, descricao, vidaUtilDias, status (enum)

⚠️ BREAKING CHANGES:
- "nome" → "nomeEquipamento"
- "codigo" → REMOVIDO
- "ca" → "numeroCa" 
- "validadeMeses" → "vidaUtilDias" (meses × 30)
- "ativo" → "status" (enum)
- REMOVIDOS: diasAvisoVencimento, exigeAssinaturaEntrega
```

#### **4. Tabela `fichas_epi` ESTRUTURA FUNDAMENTAL ALTERADA:**
```
ANTES (múltiplas fichas por colaborador):
- colaboradorId, tipoEpiId, almoxarifadoId
- @@unique([colaboradorId, tipoEpiId, almoxarifadoId])

AGORA (uma ficha por colaborador):
- colaboradorId UNIQUE
- dataEmissao, status
- @@unique([colaboradorId])

⚠️ IMPACT: Toda lógica de fichas precisa ser reescrita!
```

#### **5. Tabela `movimentacoes_estoque` Reestruturada:**
```
ANTES: almoxarifadoId, tipoEpiId, quantidade, saldoAnterior, saldoPosterior
AGORA: estoqueItemId, quantidadeMovida, movimentacaoOrigemId

⚠️ BREAKING CHANGES:
- Movimentações agora referenciam `estoqueItemId` (não almoxarifado + tipo)
- "quantidade" → "quantidadeMovida"
- REMOVIDOS: saldoAnterior, saldoPosterior, observacoes
- ADICIONADO: movimentacaoOrigemId (para estornos)
```

#### **6. Tabela `entregas` Nova Estrutura:**
```
ADICIONADOS: almoxarifadoId, responsavelId, linkAssinatura, dataAssinatura
ALTERADOS: status (novo enum), colaboradorId → responsavelId
REMOVIDOS: dataVencimento, assinaturaColaborador
```

#### **7. Tabela `entrega_itens` Simplificada:**
```
ANTES: tipoEpiId, numeroSerie, lote, motivoDevolucao
AGORA: estoqueItemOrigemId, dataLimiteDevolucao

⚠️ BREAKING CHANGES:
- "tipoEpiId" → via "estoqueItemOrigemId.tipoEpi"
- REMOVIDOS: numeroSerie, lote, motivoDevolucao
```

### 🔧 CONFIGURAÇÕES DE BANCO CORRIGIDAS:

```bash
# ANTES (configuração incorreta):
DATABASE_URL="postgresql://postgres:postgres@localhost:5437/epi_gemini_db"
REDIS_URL=redis://localhost:6380

# AGORA (containers EPI corretos):
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/epi_db_v35"
REDIS_URL=redis://localhost:6379

# CONTAINERS CORRETOS:
- Banco dev: epi_db_dev_v35 (porta 5435)
- Banco teste: epi_db_test_v35 (porta 5436) 
- Redis: epi_redis (porta 6379)
```

### 📁 ARQUIVOS QUE PRECISAM SER REVISADOS:

#### **Use Cases com BREAKING CHANGES:**
```
❌ CRÍTICO - Reescrever completamente:
- src/application/use-cases/fichas/criar-ficha-epi.use-case.ts
- src/application/use-cases/fichas/criar-entrega-ficha.use-case.ts
- src/application/use-cases/fichas/processar-devolucao.use-case.ts

⚠️ AJUSTAR campos:
- src/application/use-cases/estoque/*.ts (tipoMovimentacao)
- src/application/use-cases/queries/*.ts (campos de join)
```

#### **Entities & Interfaces para Atualizar:**
```
- src/domain/entities/ficha-epi.entity.ts
- src/domain/entities/movimentacao-estoque.entity.ts
- src/domain/interfaces/repositories/*.ts
- src/presentation/dto/schemas/*.ts
```

#### **Arquivos já Corrigidos:** ✅
```
- prisma/schema.prisma ✅
- prisma/seed.ts ✅
- test/seeds/test-seed.ts ✅
- test/database/test-database.service.ts ✅
- test/setup/integration-test-setup.ts ✅
- .env ✅
```

### 🎯 PADRÕES DE MIGRAÇÃO PARA USE CASES:

#### **Fichas EPI (Nova Lógica):**
```typescript
// ANTES (múltiplas fichas):
const ficha = await prisma.fichaEPI.findFirst({
  where: { colaboradorId, tipoEpiId, almoxarifadoId }
});

// AGORA (uma ficha por colaborador):
const ficha = await prisma.fichaEPI.findUnique({
  where: { colaboradorId }
});
```

#### **Movimentações (Nova Referência):**
```typescript
// ANTES:
await prisma.movimentacaoEstoque.create({
  data: { almoxarifadoId, tipoEpiId, quantidade }
});

// AGORA:
await prisma.movimentacaoEstoque.create({
  data: { estoqueItemId, quantidadeMovida }
});
```

#### **Tipos EPI (Campos Renomeados):**
```typescript
// ANTES:
const tipo = await prisma.tipoEPI.findFirst({ where: { ca } });

// AGORA:
const tipo = await prisma.tipoEPI.findFirst({ where: { numeroCa } });
```

### ⚠️ RESQUÍCIOS CONHECIDOS A CORRIGIR:

1. **Use cases com `almoxarifadoId` em fichas** → remover
2. **Queries com campos antigos** (`ca` → `numeroCa`, etc.)
3. **DTOs com estrutura antiga** de fichas
4. **Dependências circulares** em módulos de teste
5. **Interfaces não atualizadas** para novo schema

## 🛠️ GUIA DE MIGRAÇÃO PARA AGENTES IA

### ✅ PADRÕES DE CORREÇÃO COMPROVADOS (02/07/2025)

Durante a correção de **547 → 493 erros de compilação**, foram identificados padrões sistemáticos de migração que devem ser seguidos por todos os agentes:

#### **1. Migração de MovimentacaoEstoque Entity:**
```typescript
// ❌ ERRO COMUM: Tentar acessar campos do schema antigo
movimentacao.almoxarifadoId  // CAMPO NÃO EXISTE MAIS
movimentacao.tipoEpiId       // CAMPO NÃO EXISTE MAIS  
movimentacao.quantidade      // CAMPO NÃO EXISTE MAIS
movimentacao.saldoAnterior   // CAMPO NÃO EXISTE MAIS

// ✅ CORREÇÃO: Buscar via repository
const estoqueItem = await this.estoqueRepository.findById(movimentacao.estoqueItemId);
const almoxarifadoId = estoqueItem.almoxarifadoId;
const tipoEpiId = estoqueItem.tipoEpiId;
const quantidade = movimentacao.quantidadeMovida; // Nome correto
```

#### **2. Static Methods da MovimentacaoEstoque:**
```typescript
// ❌ MÉTODOS ANTIGOS (não existem mais):
MovimentacaoEstoque.createEntrada()
MovimentacaoEstoque.createSaida() 
MovimentacaoEstoque.createAjuste()

// ✅ MÉTODOS CORRETOS:
MovimentacaoEstoque.createEntradaNota()
MovimentacaoEstoque.createSaidaEntrega()
MovimentacaoEstoque.createAjustePositivo()
MovimentacaoEstoque.createAjusteNegativo()

// ✅ ALTERNATIVA: Usar Prisma direto para compatibilidade
await this.prisma.movimentacaoEstoque.create({
  data: {
    estoqueItemId,
    tipoMovimentacao: TipoMovimentacao.ENTRADA_NOTA,
    quantidadeMovida,
    responsavelId,
    notaMovimentacaoId,
    movimentacaoOrigemId: null,
  }
});
```

#### **3. Enum Values Migration:**
```typescript
// ❌ VALORES ANTIGOS:
TipoMovimentacao.ENTRADA      → TipoMovimentacao.ENTRADA_NOTA
TipoMovimentacao.SAIDA        → TipoMovimentacao.SAIDA_ENTREGA  
TipoMovimentacao.TRANSFERENCIA → TipoMovimentacao.SAIDA_TRANSFERENCIA
TipoMovimentacao.AJUSTE       → TipoMovimentacao.AJUSTE_POSITIVO
StatusEntregaItem.ENTREGUE    → StatusEntregaItem.COM_COLABORADOR

// ✅ VERIFICAR ENUM COMPLETO em:
// src/domain/enums/*.ts
```

#### **4. Prisma Queries - Schema Fields:**
```typescript
// ❌ CAMPOS REMOVIDOS em queries:
orderBy: { createdAt: 'desc' }    // Use 'dataMovimentacao'
orderBy: { updatedAt: 'desc' }    // Campo não existe mais
item.numeroSerie                  // Campo removido
item.lote                         // Campo removido  
item.motivoDevolucao              // Campo removido
entrega.observacoes               // Campo removido

// ✅ CAMPOS CORRETOS:
orderBy: { dataMovimentacao: 'desc' }
orderBy: { dataAcao: 'desc' }  // Para HistoricoFicha
```

#### **5. Include Clauses - Relacionamentos:**
```typescript
// ❌ INCLUDES INCORRETOS:
fichaEpi: {
  include: {
    tipoEpi: { ... },      // NÃO EXISTE MAIS em FichaEPI
    almoxarifado: { ... }  // NÃO EXISTE MAIS em FichaEPI
  }
}

// ✅ INCLUDES CORRETOS:
fichaEpi: {
  include: {
    colaborador: { select: { nome: true } }  // Relacionamento válido
  }
}

// ✅ Para acessar dados do EPI, usar via Entrega:
entrega: {
  include: {
    almoxarifado: { ... },  // Existe em Entrega
    responsavel: { ... }    // Existe em Entrega
  }
}
```

#### **6. Repository Method Signatures:**
```typescript
// ❌ MÉTODO QUE NÃO EXISTE:
await this.estoqueRepository.obterQuantidade(almoxarifadoId, tipoEpiId, status);

// ✅ MÉTODOS EXISTENTES:
await this.estoqueRepository.findByAlmoxarifadoAndTipo(almoxarifadoId, tipoEpiId, status);
await this.estoqueRepository.criarOuAtualizar(almoxarifadoId, tipoEpiId, status, quantidade);
```

### 🎯 ESTRATÉGIA DE CORREÇÃO SISTEMÁTICA

**Para QUALQUER arquivo com erros de compilação:**

1. **PRIMEIRO**: Verificar se usa `MovimentacaoEstoque` → aplicar padrões 1-2
2. **SEGUNDO**: Verificar enums → aplicar padrão 3  
3. **TERCEIRO**: Verificar queries Prisma → aplicar padrões 4-5
4. **QUARTO**: Verificar métodos de repository → aplicar padrão 6
5. **QUINTO**: Testar compilação: `npm run build`

### 📚 DOCUMENTAÇÃO DE REFERÊNCIA:

- **Schema oficial**: `/docs-building/backend-modeuleEPI-documentation.md`
- **Migração criada**: `prisma/migrations/20250702120000_schema_inicial_documentacao_oficial/`
- **Containers corretos**: `docker-compose.yml`
- **Progresso de correção**: 547 → 493 erros (54 corrigidos, 10% progresso)