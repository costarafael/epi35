# Proposta de Refatoração dos Controllers

## 1. Introdução

Este documento apresenta uma análise e proposta de refatoração para dois dos controladores mais extensos do sistema:
- `RelatoriosController` (673 linhas)
- `FichasEpiController` (630 linhas)

A análise identifica problemas de código e propõe soluções para melhorar a manutenibilidade, legibilidade e organização do código, seguindo princípios de arquitetura limpa e responsabilidade única.

**IMPORTANTE**: Esta refatoração mantém 100% de compatibilidade com as APIs existentes e preserva a arquitetura Clean Architecture atual, com use cases permanecendo como única fonte de lógica de negócio.

## 2. Análise dos Problemas

### 2.1 Problemas Comuns aos Dois Controllers

1. **Excesso de responsabilidades**: Ambos os controladores gerenciam múltiplos domínios relacionados, mas distintos.
2. **Muitas dependências injetadas**: Os controladores dependem de múltiplos casos de uso.
3. **Métodos muito extensos**: Muitos métodos contêm lógica complexa que deveria estar em camadas de serviço.
4. **Mistura de camadas**: Alguns controladores realizam operações de transformação e formatação de dados que deveriam estar em serviços.

### 2.2 Problemas Específicos do RelatoriosController

1. **Lógica de negócios no controlador**: Operações como cálculos de datas, filtragem e formatação de dados estão diretamente no controlador.
2. **Mistura de domínios**: Um único controlador gerencia relatórios de estoque, fichas, conformidade, uso, movimentações, saúde do sistema e auditoria.

### 2.3 Problemas Específicos do FichasEpiController

1. **Sobrecarga de funcionalidades**: O controlador gerencia fichas, entregas, devoluções e cancelamentos.
2. **Validações complexas no controlador**: Algumas validações estão embutidas nos decoradores @Body.

## 3. Proposta de Refatoração

### 3.1 Princípios Gerais da Refatoração

1. **Princípio de Responsabilidade Única**: Cada controlador deve gerenciar apenas um domínio ou aspecto do sistema.
2. **Manter APIs Consistentes**: As rotas e formatos de resposta devem permanecer inalterados para compatibilidade com o frontend.
3. **Extrair Lógica de Negócios**: Mover lógica de transformação e formatação de dados para serviços específicos.
4. **Reutilizar Código**: Criar helpers e serviços compartilhados para operações comuns.

### 3.2 Refatoração do RelatoriosController

#### 3.2.1 Novos Controllers Propostos

1. **DashboardController** (`@Controller('relatorios')`):
   - `GET /relatorios/dashboard`
   - `GET /relatorios/dashboard/estatisticas-entregas`
   - `GET /relatorios/dashboard/vencimentos-proximos`

2. **RelatorioConformidadeController** (`@Controller('relatorios/conformidade')`):
   - `GET /relatorios/conformidade`

3. **RelatorioUsoController** (`@Controller('relatorios/uso')`):
   - `GET /relatorios/uso-epis`

4. **RelatorioMovimentacoesController** (`@Controller('relatorios/movimentacoes')`):
   - `GET /relatorios/movimentacoes`

5. **RelatorioSaudeController** (`@Controller('relatorios/saude')`):
   - `GET /relatorios/saude-sistema`

6. **RelatorioDescartesController** (`@Controller('relatorios/descartes')`):
   - `GET /relatorios/descartes`
   - `GET /relatorios/descartes/estatisticas`

7. **RelatorioAuditoriaController** (`@Controller('relatorios/auditoria')`):
   - `GET /relatorios/auditoria`

#### 3.2.2 Novos Serviços Propostos

**PRINCÍPIO**: Os serviços são responsáveis apenas por formatação e utilitários. Use cases permanecem como única fonte de lógica de negócio.

1. **DashboardFormatterService**:
   - `calcularPeriodoAnalise(filtros): { dataInicio, dataFim }`
   - `formatarIndicadoresGerais(dados): { ... }`
   - `formatarEstatisticasEntregas(dados): { ... }`
   - `formatarVencimentosProximos(dados): { ... }`
   - `formatarDashboard(dadosUseCase): DashboardOutput`

2. **RelatorioFormatterService**:
   - `formatarRelatorioConformidade(dados): { ... }`
   - `formatarRelatorioUso(dados): { ... }`
   - `formatarRelatorioMovimentacoes(dados): { ... }`
   - `aplicarPaginacao(dados, filtros): PaginatedResult`

3. **RelatorioUtilsService**:
   - `validarFiltrosComuns(filtros): void`
   - `aplicarFiltrosData(query, filtros): QueryBuilder`

### 3.3 Refatoração do FichasEpiController

#### 3.3.1 Novos Controllers Propostos

1. **FichasController** (`@Controller('fichas-epi')`):
   - `POST /fichas-epi` (criar ficha)
   - `POST /fichas-epi/criar-ou-ativar`
   - `GET /fichas-epi` (listar fichas)
   - `GET /fichas-epi/estatisticas`
   - `GET /fichas-epi/:id`
   - `PUT /fichas-epi/:id/ativar`
   - `PUT /fichas-epi/:id/inativar`
   - `PUT /fichas-epi/:id/suspender`

2. **EntregasController** (`@Controller('entregas')`):
   - `POST /fichas-epi/:id/entregas` (mantém compatibilidade)
   - `POST /entregas/validar`
   - `GET /fichas-epi/:id/entregas` (mantém compatibilidade)
   - `GET /colaboradores/:colaboradorId/entregas`
   - `GET /colaboradores/:colaboradorId/posse-atual`

3. **DevolucoesController** (`@Controller('devolucoes')`):
   - `POST /entregas/:entregaId/devolucao` (mantém compatibilidade)
   - `POST /entregas/:entregaId/devolucao/validar` (mantém compatibilidade)
   - `POST /entregas/:entregaId/devolucao/cancelar` (mantém compatibilidade)
   - `GET /entregas/:entregaId/devolucao/validar-cancelamento` (mantém compatibilidade)
   - `GET /devolucoes/historico`
   - `GET /devolucoes/cancelamentos/historico`

#### 3.3.2 Novos Serviços Propostos

**PRINCÍPIO**: Validators apenas para validação de formato de DTOs. Lógica de negócio permanece nos use cases.

1. **FichaFormatterService**:
   - `formatarFichaOutput(fichaData): FichaOutput`
   - `formatarListaFichas(fichas, filtros): PaginatedFichas`

2. **EntregaFormatterService**:
   - `formatarEntregaOutput(entregaData): EntregaOutput`
   - `formatarListaEntregas(entregas): EntregaListOutput`

3. **DevolucaoFormatterService**:
   - `formatarDevolucaoOutput(devolucaoData): DevolucaoOutput`
   - `formatarHistoricoDevolucoes(historico): HistoricoOutput`

4. **DTOValidatorService** (opcional):
   - `validarFormatoCriarFicha(dto): void`
   - `validarFormatoCriarEntrega(dto): void`
   - `validarFormatoProcessarDevolucao(dto): void`

## 4. Impacto nos Use Cases

### 4.1 Manutenção dos Use Cases

A refatoração proposta **não altera a implementação dos casos de uso existentes**. Todos os use cases atuais continuarão funcionando exatamente da mesma forma:

- `RelatorioPosicaoEstoqueUseCase`
- `RelatorioDescartesUseCase`
- `CriarFichaEpiUseCase`
- `CriarTipoEpiUseCase`
- `ProcessarDevolucaoUseCase`
- `CancelarDevolucaoUseCase`
- `CriarEntregaFichaUseCase`

**IMPORTANTE**: Use cases permanecem como única fonte de lógica de negócio. Formatters apenas transformam dados para apresentação.

### 4.2 Redução de Dependências

Cada novo controlador precisará apenas dos casos de uso específicos para suas funcionalidades, o que melhora a coesão e reduz acoplamento.

**Exemplo de Injeção Correta**:
```typescript
// ✅ Controller injeta use cases + formatters
constructor(
  private readonly criarFichaUseCase: CriarFichaEpiUseCase,
  private readonly fichaFormatter: FichaFormatterService
) {}

// ❌ Evitar: Formatter injetando use cases
// private readonly prisma: PrismaService // Formatters não acessam DB diretamente
```

## 5. Impacto nas APIs

### 5.1 Compatibilidade com o Frontend

A refatoração proposta **mantém todas as rotas e formatos de resposta inalterados**. O frontend continuará interagindo com as mesmas APIs, sem necessidade de modificações.

### 5.2 Melhorias na Documentação

A refatoração permitirá uma documentação Swagger mais organizada e específica para cada domínio.

## 6. Organização de Módulos

### 6.1 Estrutura de Módulos Proposta

```typescript
// relatorios.module.ts
@Module({
  imports: [ApplicationModule],
  controllers: [
    DashboardController,
    RelatorioConformidadeController,
    RelatorioUsoController,
    RelatorioMovimentacoesController,
    RelatorioSaudeController,
    RelatorioDescartesController,
    RelatorioAuditoriaController,
  ],
  providers: [
    DashboardFormatterService,
    RelatorioFormatterService,
    RelatorioUtilsService,
  ],
})
export class RelatoriosModule {}

// fichas.module.ts
@Module({
  imports: [ApplicationModule],
  controllers: [
    FichasController,
    EntregasController,
    DevolucoesController,
  ],
  providers: [
    FichaFormatterService,
    EntregaFormatterService,
    DevolucaoFormatterService,
    DTOValidatorService,
  ],
})
export class FichasModule {}
```

### 6.2 Exemplo: Implementação do DashboardController

```typescript
// dashboard.controller.ts
@ApiTags('relatorios')
@ApiBearerAuth()
@Controller('relatorios')
export class DashboardController {
  constructor(
    private readonly relatorioPosicaoEstoqueUseCase: RelatorioPosicaoEstoqueUseCase,
    private readonly criarFichaEpiUseCase: CriarFichaEpiUseCase,
    private readonly criarTipoEpiUseCase: CriarTipoEpiUseCase,
    private readonly dashboardFormatter: DashboardFormatterService,
  ) {}

  @Get('dashboard')
  @ApiOperation({...})
  @ApiQuery({...})
  @ApiResponse({...})
  async obterDashboard(
    @Query(new ZodValidationPipe(FiltrosDashboardSchema)) 
    filtros: FiltrosDashboard,
  ): Promise<SuccessResponse> {
    // Calcular período usando formatter
    const { dataInicio, dataFim } = this.dashboardFormatter.calcularPeriodoAnalise(filtros);

    // Executar use cases em paralelo
    const [
      relatorioEstoque,
      estatisticasFichas,
      episPorCategoria,
    ] = await Promise.all([
      this.relatorioPosicaoEstoqueUseCase.execute({
        almoxarifadoId: filtros.almoxarifadoId,
        unidadeNegocioId: filtros.unidadeNegocioId,
      }),
      this.criarFichaEpiUseCase.obterEstatisticas(),
      this.criarTipoEpiUseCase.obterEstatisticasPorCategoria(),
    ]);

    // Formatar dashboard usando formatter (sem lógica de negócio)
    const dashboard = this.dashboardFormatter.formatarDashboard({
      relatorioEstoque,
      estatisticasFichas,
      episPorCategoria,
      filtros,
      dataInicio,
      dataFim,
    });

    return {
      success: true,
      data: dashboard,
    };
  }
}
```

### 6.3 Exemplo: Implementação do DashboardFormatterService

```typescript
// dashboard-formatter.service.ts
@Injectable()
export class DashboardFormatterService {
  calcularPeriodoAnalise(filtros: FiltrosDashboard): { dataInicio: Date, dataFim: Date } {
    const dataFim = new Date();
    const dataInicio = new Date();
    
    switch (filtros.periodo) {
      case 'ULTIMO_MES':
        dataInicio.setMonth(dataInicio.getMonth() - 1);
        break;
      case 'ULTIMO_TRIMESTRE':
        dataInicio.setMonth(dataInicio.getMonth() - 3);
        break;
      case 'ULTIMO_SEMESTRE':
        dataInicio.setMonth(dataInicio.getMonth() - 6);
        break;
      case 'ULTIMO_ANO':
        dataInicio.setFullYear(dataInicio.getFullYear() - 1);
        break;
    }

    return { dataInicio, dataFim };
  }

  formatarDashboard(dados: {
    relatorioEstoque: any,
    estatisticasFichas: any,
    episPorCategoria: any,
    filtros: FiltrosDashboard,
    dataInicio: Date,
    dataFim: Date,
  }): DashboardOutput {
    // Apenas formatação - sem lógica de negócio
    return {
      indicadoresGerais: this.formatarIndicadoresGerais(
        dados.estatisticasFichas, 
        dados.relatorioEstoque
      ),
      estoqueAlertas: this.formatarAlertas(dados.relatorioEstoque),
      episPorCategoria: this.formatarEpisPorCategoria(dados.episPorCategoria),
      dataAtualizacao: new Date(),
      periodo: {
        inicio: dados.dataInicio,
        fim: dados.dataFim,
      },
    };
  }

  // Métodos auxiliares privados apenas para formatação
  private formatarIndicadoresGerais(estatisticasFichas: any, relatorioEstoque: any): any {
    // Apenas transformação de dados
  }

  private formatarAlertas(relatorioEstoque: any): any {
    // Apenas transformação de dados
  }

  private formatarEpisPorCategoria(episPorCategoria: any): any {
    // Apenas transformação de dados
  }
}
```

## 7. Plano de Implementação

### 7.1 Fases de Implementação

**PRIORIZAÇÃO**: RelatoriosController primeiro (maior impacto), depois FichasEpiController.

1. **Fase 1**: Criar os novos serviços propostos
   - Implementar DashboardFormatterService, RelatorioFormatterService, etc.
   - Implementar FichaFormatterService, EntregaFormatterService, etc.
   - **Não alterar use cases existentes**

2. **Fase 2**: Refatorar RelatoriosController (Target: <200 linhas/controller)
   - Criar DashboardController primeiro (maior tráfego)
   - Mover métodos um a um dos controllers existentes
   - Verificar rotas e respostas para garantir 100% compatibilidade
   - Manter módulos organizados

3. **Fase 3**: Refatorar FichasEpiController
   - Seguir o mesmo processo da Fase 2
   - Especial atenção às rotas de compatibilidade

4. **Fase 4**: Testes e Validação
   - Executar `npm run test:e2e -- --grep="API compatibility"`
   - Verificar performance (±5% da baseline atual)
   - Validar documentação Swagger
   - Confirmar compatibilidade com frontend

### 7.2 Riscos e Mitigação

1. **Risco**: Quebra de compatibilidade com o frontend
   - **Mitigação**: Manter todas as rotas e formatos de resposta idênticos
   - **Validação**: Testes automatizados de contrato de API

2. **Risco**: Introdução de bugs ao mover lógica
   - **Mitigação**: Mover apenas formatação, manter use cases intocados
   - **Validação**: Suite completa de testes de integração

3. **Risco**: Performance impactada
   - **Mitigação**: Benchmark antes/depois (target: ±5%)
   - **Validação**: Monitoramento de métricas em produção

4. **Risco**: Violação dos princípios de Clean Architecture
   - **Mitigação**: Formatters não injetam use cases ou acessam DB
   - **Validação**: Code review obrigatório focando arquitetura

## 8. Métricas de Sucesso

### 8.1 Métricas Técnicas
- **Redução de linhas por controller**: Target <200 linhas (atual: 673 e 630)
- **Cobertura de testes**: Manter 90%+ (atual: 64/71 testes passando)
- **Performance**: ±5% da baseline atual
- **Compatibilidade de API**: 100% dos endpoints mantidos

### 8.2 Métricas de Qualidade
- **Complexidade ciclomática**: Redução de 30%+ por controller
- **Acoplamento**: Redução de dependências injetadas por controller
- **Coesão**: Controllers com responsabilidade única
- **Documentação Swagger**: Organizada por domínio

## 9. Conclusão

A refatoração proposta trará benefícios significativos para a manutenção e evolução do sistema:

1. **Melhor organização do código**: Controllers menores e mais focados (target: <200 linhas)
2. **Maior coesão**: Cada componente com responsabilidades bem definidas
3. **Facilidade para testes**: Unidades menores são mais fáceis de testar
4. **Manutenção simplificada**: Desenvolvedores lidam com menos código por vez
5. **Escalabilidade**: Facilita adicionar novas funcionalidades sem aumentar complexidade
6. **Preservação da Arquitetura**: Clean Architecture mantida, use cases intocados

## 10. Checklist de Validação

### Antes da Implementação
- [ ] Review da proposta pela equipe técnica
- [ ] Definição de baseline de performance
- [ ] Preparação dos testes de compatibilidade

### Durante a Implementação
- [ ] Use cases não foram alterados
- [ ] Formatters não injetam use cases ou PrismaService
- [ ] Rotas mantêm exata compatibilidade
- [ ] Módulos organizados corretamente

### Após a Implementação
- [ ] `npm run test:e2e` com 100% sucesso
- [ ] Performance dentro do target (±5%)
- [ ] Documentação Swagger validada
- [ ] Code review aprovado
- [ ] Deploy em staging testado

**IMPORTANTE**: Esta refatoração respeita os princípios de Clean Architecture e não altera o comportamento externo da API, mantendo 100% de compatibilidade com o frontend existente.
