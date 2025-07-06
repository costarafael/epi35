# Proposta de Refatoração: CriarEntregaFichaUseCase

## 1. Análise do Problema

O caso de uso `CriarEntregaFichaUseCase` apresenta aproximadamente 589 linhas de código com várias responsabilidades misturadas, o que dificulta sua manutenção e entendimento. Abaixo estão os principais problemas identificados:

### 1.1 Problemas Identificados:

1. **Múltiplas Responsabilidades**:
   - Criação de entregas
   - Listagem de entregas (por colaborador e por ficha)
   - Consultas de posse atual
   - Validações diversas
   - Movimentação de estoque

2. **Métodos Extensos**:
   - Métodos como `criarItensEntrega` e `movimentarEstoque` são muito longos
   - Lógica complexa diretamente no caso de uso

3. **Acoplamento Alto**:
   - Forte dependência do PrismaService
   - Manipulações diretas do banco de dados dentro do caso de uso
   - Baixa utilização de repositories ou serviços de domínio

4. **Falta de Modularidade**:
   - Diferentes aspectos do domínio tratados no mesmo arquivo
   - Difícil testabilidade de partes específicas da lógica

### 1.2 Impacto no Projeto:

- Dificuldade para manter e estender o código
- Maior propensão a bugs quando alterações são feitas
- Curva de aprendizado íngreme para novos desenvolvedores
- Dificuldade em testar unitariamente

## 2. Proposta de Refatoração

A proposta de refatoração mantém 100% de compatibilidade com a API existente, melhorando a organização interna sem alterar interfaces externas.

### 2.1 Princípios Norteadores:

1. **Separação de Responsabilidades**: Dividir o caso de uso em componentes menores com responsabilidades bem definidas
2. **Domain-Driven Design**: Criar serviços de domínio que encapsulem regras de negócio específicas
3. **Manter Compatibilidade**: Preservar as interfaces públicas e comportamentos existentes
4. **Testabilidade**: Facilitar testes unitários através de componentes menores e bem definidos

### 2.2 Nova Estrutura Proposta:

#### 2.2.1 Casos de Uso:

1. **CriarEntregaFichaUseCase**: Versão simplificada focada apenas na criação de entregas
2. **ConsultaEntregasFichaUseCase**: Responsável apenas por consultas e listagens
3. **ConsultaPosseAtualUseCase**: Consultas específicas de posse atual

#### 2.2.2 Serviços de Domínio:

1. **EstoqueDomainService**: Encapsula regras de negócio relacionadas ao estoque
2. **EntregaDomainService**: Encapsula regras de negócio relacionadas a entregas
3. **FichaValidationService**: Encapsula validações relacionadas a fichas

#### 2.2.3 Repositories:

1. **EntregaRepository**: Operações relacionadas a entregas
2. **EstoqueRepository**: Operações relacionadas ao estoque
3. **FichaRepository**: Operações relacionadas às fichas EPI

## 3. Exemplos de Implementação

### 3.1 Exemplo do CriarEntregaFichaUseCase Refatorado

```typescript
@Injectable()
export class CriarEntregaFichaUseCase {
  constructor(
    private readonly entregaDomainService: EntregaDomainService,
    private readonly estoqueDomainService: EstoqueDomainService,
    private readonly fichaValidationService: FichaValidationService,
    private readonly entregaRepository: IEntregaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CriarEntregaInput): Promise<EntregaOutput> {
    // Validar dados de entrada
    await this.fichaValidationService.validarCriacaoEntrega(input);

    // Executar entrega em transação
    return await this.prisma.$transaction(async (tx) => {
      // Criar entrega e itens
      const entrega = await this.entregaDomainService.criarEntregaComItens(input, tx);
      
      // Movimentar estoque
      await this.estoqueDomainService.movimentarSaidaEstoque(
        entrega.id, 
        input.itens, 
        input.usuarioId, 
        tx
      );

      // Retornar entrega completa
      return await this.entregaRepository.obterEntregaCompleta(entrega.id, tx);
    });
  }

  // Métodos existentes permanecem para manter compatibilidade com API
  async obterEntregasPorColaborador(
    colaboradorId: string,
    filtros: FiltrosEntregas,
  ): Promise<PaginatedOutput<EntregaSummarizedOutput>> {
    return this.entregaRepository.obterEntregasPorColaborador(colaboradorId, filtros);
  }

  // Outros métodos públicos mantidos para compatibilidade
  // ...
}
```

### 3.2 Exemplo do EntregaDomainService

```typescript
@Injectable()
export class EntregaDomainService {
  constructor(
    @Inject('IFichaRepository') private fichaRepository: IFichaRepository,
  ) {}

  async criarEntregaComItens(input: CriarEntregaInput, tx: PrismaTransaction): Promise<Entrega> {
    const ficha = await this.fichaRepository.obterFichaComDetalhes(input.fichaEpiId, tx);
    
    if (!ficha) {
      throw new BusinessError('Ficha EPI não encontrada');
    }

    // Obter almoxarifado da origem
    const estoqueItem = await tx.estoqueItem.findUnique({
      where: { id: input.itens[0].estoqueItemOrigemId },
      select: { almoxarifadoId: true },
    });

    if (!estoqueItem) {
      throw new BusinessError('Item de estoque não encontrado');
    }

    // Criar entrega
    const entrega = await tx.entrega.create({
      data: {
        fichaEpiId: input.fichaEpiId,
        almoxarifadoId: estoqueItem.almoxarifadoId,
        responsavelId: input.usuarioId,
        status: 'PENDENTE_ASSINATURA',
      },
    });

    // Criar itens de entrega
    await this.criarItensEntrega(entrega.id, input, ficha, tx);

    return entrega;
  }

  private async criarItensEntrega(
    entregaId: string, 
    input: CriarEntregaInput, 
    ficha: any, 
    tx: PrismaTransaction
  ): Promise<void> {
    // Implementação do método criarItensEntrega dividido em submétodos
    // ...
  }
}
```

### 3.3 Exemplo do EstoqueDomainService

```typescript
@Injectable()
export class EstoqueDomainService {
  async validarDisponibilidadeEstoque(
    tipoEpiId: string, 
    almoxarifadoId: string,
    quantidade: number,
    tx?: PrismaTransaction,
  ): Promise<void> {
    // Código de validação de estoque
    // ...
  }

  async movimentarSaidaEstoque(
    entregaId: string, 
    itens: any[], 
    usuarioId: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    // Registrar movimentação de saída
    await this.registrarMovimentacoesSaida(entregaId, itens, usuarioId, tx);
    
    // Atualizar quantidades em estoque
    await this.atualizarQuantidadesEstoque(itens, tx);
  }

  private async registrarMovimentacoesSaida(
    entregaId: string,
    itens: any[],
    usuarioId: string,
    tx: PrismaTransaction,
  ): Promise<void> {
    // Implementação detalhada...
  }

  private async atualizarQuantidadesEstoque(
    itens: any[],
    tx: PrismaTransaction,
  ): Promise<void> {
    // Implementação detalhada...
  }
}
```

## 4. Plano de Implementação

A implementação será feita em fases para minimizar riscos e garantir a compatibilidade com a API:

### 4.1 Fase 1: Preparação

1. **Criar Interfaces**: Definir interfaces para os novos serviços e repositories
2. **Preparar Testes**: Criar testes unitários e de integração para verificar compatibilidade
3. **Setup de Métricas**: Estabelecer métricas de performance do sistema atual

### 4.2 Fase 2: Criar Novos Componentes

1. **Implementar Repositories**: Criar implementações concretas dos repositories
2. **Implementar Serviços de Domínio**: Implementar os serviços de domínio propostos
3. **Criar Novos Casos de Uso**: Implementar os casos de uso para consulta separados

### 4.3 Fase 3: Refatorar CriarEntregaFichaUseCase

1. **Refatoração Interna**: Refatorar internamente o caso de uso mantendo a mesma interface pública
2. **Testes de Compatibilidade**: Executar testes para garantir que o comportamento não mudou
3. **Refinamento**: Ajustar conforme necessário para garantir compatibilidade

### 4.4 Fase 4: Consolidação

1. **Testes E2E**: Verificar o sistema como um todo
2. **Comparação de Performance**: Comparar métricas pré e pós-refatoração
3. **Documentação**: Atualizar documentação técnica

## 5. Compatibilidade com API

Para garantir 100% de compatibilidade com a API existente, adotaremos as seguintes estratégias:

1. **Manter Métodos Públicos**: Todos os métodos públicos do caso de uso original serão mantidos
2. **Delegar Implementação**: Internamente, os métodos delegarão a implementação para os novos serviços
3. **Preservar Assinaturas**: Assinaturas e tipos de retorno serão preservados
4. **Testes Rigorosos**: Testes automatizados verificarão a compatibilidade antes de cada merge

## 6. Mitigação de Riscos

1. **Feature Flags**: Implementar feature flags para facilitar rollback se necessário
2. **Implantação Gradual**: Implantar em ambientes de teste antes da produção
3. **Monitoramento**: Implementar monitoramento adicional durante a transição
4. **Pair Programming**: Realizar implementações em duplas para revisar o código em tempo real

## 7. Impacto na Performance

A refatoração pode ter impactos positivos na performance:

1. **Potenciais Melhorias**:
   - Melhor organização pode levar a consultas mais eficientes
   - Possibilidade de implementar cache em serviços específicos
   - Facilidade para otimizações direcionadas

2. **Monitoramento de Performance**:
   - Tempo de resposta das APIs
   - Utilização de memória
   - Número de consultas ao banco de dados

## 8. Checklist de Validação

### 8.1 Antes da Implementação
- [ ] Review de pares da proposta
- [ ] Definição de baselines de performance
- [ ] Preparação de testes unitários e de integração

### 8.2 Durante a Implementação
- [ ] Compatibilidade da API é mantida
- [ ] Testes unitários passam para novos componentes
- [ ] Code reviews realizados para cada componente

### 8.3 Após a Implementação
- [ ] Testes E2E passam com 100% de sucesso
- [ ] Performance está dentro do target (±5%)
- [ ] Documentação atualizada
- [ ] Lições aprendidas documentadas

## 9. Conclusão

A refatoração proposta para o `CriarEntregaFichaUseCase` mantém total compatibilidade com a API existente enquanto melhora significativamente a estrutura interna do código. A abordagem em fases minimiza riscos e permite validação contínua. Ao final, teremos um código mais manutenível, testável e alinhado com os princípios de Clean Architecture.

**IMPORTANTE**: Esta refatoração respeita os princípios de Clean Architecture e não altera o comportamento externo da API, mantendo 100% de compatibilidade com o frontend existente.
