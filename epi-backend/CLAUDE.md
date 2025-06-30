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
