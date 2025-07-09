import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { RelatorioPosicaoEstoqueUseCase } from '../../application/use-cases/queries/relatorio-posicao-estoque.use-case';
import { RelatorioDescartesUseCase } from '../../application/use-cases/queries/relatorio-descartes.use-case';
import { CriarFichaEpiUseCase } from '../../application/use-cases/fichas/criar-ficha-epi.use-case';
import { CriarTipoEpiUseCase } from '../../application/use-cases/fichas/criar-tipo-epi.use-case';
import { ProcessarDevolucaoUseCase } from '../../application/use-cases/fichas/processar-devolucao.use-case';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CATEGORIA_EPI_LABELS } from '../../domain/enums/categoria-epi.enum';
import {
  FiltrosDashboardSchema,
  FiltrosRelatorioConformidadeSchema,
  FiltrosRelatorioUsoSchema,
  FiltrosRelatorioMovimentacaoSchema,
  FiltrosSaudesistemaSchema,
  FiltrosDashboard,
  FiltrosRelatorioConformidade,
  FiltrosRelatorioUso,
  FiltrosRelatorioMovimentacao,
  FiltrosSaudesistema,
} from '../dto/schemas/relatorios.schemas';
import {
  RelatorioDescartesFiltersSchema,
  RelatorioDescartesFilters,
} from '../dto/schemas/relatorio-descartes.schemas';
import { SuccessResponse } from '../dto/schemas/common.schemas';
import { RELATORIOS, METRICS, SAUDE_SISTEMA, DATES } from '../../shared/constants/system.constants';

@ApiTags('relatorios')
@ApiBearerAuth()
@Controller('relatorios')
export class RelatoriosController {
  constructor(
    private readonly relatorioPosicaoEstoqueUseCase: RelatorioPosicaoEstoqueUseCase,
    private readonly relatorioDescartesUseCase: RelatorioDescartesUseCase,
    private readonly criarFichaEpiUseCase: CriarFichaEpiUseCase,
    private readonly criarTipoEpiUseCase: CriarTipoEpiUseCase,
    private readonly processarDevolucaoUseCase: ProcessarDevolucaoUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ 
    summary: 'Dashboard principal',
    description: 'Retorna indicadores gerais, alertas e métricas para o painel principal',
  })
  @ApiQuery({ name: 'unidadeNegocioId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'periodo', required: false, enum: ['ULTIMO_MES', 'ULTIMO_TRIMESTRE', 'ULTIMO_SEMESTRE', 'ULTIMO_ANO'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard carregado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            indicadoresGerais: { type: 'array' },
            estoqueAlertas: { type: 'object' },
            entregasRecentes: { type: 'object' },
            vencimentosProximos: { type: 'object' },
            episPorCategoria: { type: 'object' },
            dataAtualizacao: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async obterDashboard(
    @Query(new ZodValidationPipe(FiltrosDashboardSchema)) 
    filtros: FiltrosDashboard,
  ): Promise<SuccessResponse> {
    // Calcular período de análise
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

    // Executar consultas em paralelo
    const [
      relatorioEstoque,
      estatisticasFichas,
      entregasRecentes,
      vencimentosProximos,
      episPorCategoria,
    ] = await Promise.all([
      this.relatorioPosicaoEstoqueUseCase.execute({
        almoxarifadoId: filtros.almoxarifadoId,
        unidadeNegocioId: filtros.unidadeNegocioId,
      }),
      this.criarFichaEpiUseCase.obterEstatisticas(),
      this.obterEstatisticasEntregas(filtros, dataInicio, dataFim),
      this.obterVencimentosProximos(filtros),
      this.criarTipoEpiUseCase.obterEstatisticasPorCategoria(),
    ]);

    // Montar dashboard
    const dashboard = {
      indicadoresGerais: [
        {
          titulo: 'Total de Fichas',
          valor: estatisticasFichas.totalFichas,
          unidade: 'fichas',
          cor: 'azul' as const,
        },
        {
          titulo: 'Fichas Ativas',
          valor: estatisticasFichas.fichasAtivas,
          unidade: 'fichas',
          variacao: {
            percentual: estatisticasFichas.totalFichas > 0 
              ? Math.round((estatisticasFichas.fichasAtivas / estatisticasFichas.totalFichas) * 100)
              : 0,
            tipo: 'positiva' as const,
            periodo: 'do total',
          },
          cor: 'verde' as const,
        },
        {
          titulo: 'Itens em Estoque',
          valor: relatorioEstoque.resumo.totalItens,
          unidade: 'itens',
          cor: 'azul' as const,
        },
        {
          titulo: 'Valor Total Estoque',
          valor: `R$ ${relatorioEstoque.resumo.valorTotalEstoque.toLocaleString()}`,
          cor: 'verde' as const,
        },
      ],
      estoqueAlertas: {
        totalAlertas: relatorioEstoque.resumo.itensBaixoEstoque + 
          relatorioEstoque.resumo.itensSemEstoque,
        alertasCriticos: 0, // Removido status CRÍTICO
        alertasBaixo: relatorioEstoque.resumo.itensBaixoEstoque,
        alertasZero: relatorioEstoque.resumo.itensSemEstoque,
        itensProblemagicos: relatorioEstoque.itens
          .filter(item => ['BAIXO', 'ZERO'].includes(item.situacao))
          .slice(0, RELATORIOS.MAX_ITEMS_DASHBOARD)
          .map(item => ({
            tipoEpiNome: item.tipoEpiNome,
            almoxarifadoNome: item.almoxarifadoNome,
            situacao: item.situacao,
            saldo: item.saldoTotal,
          })),
      },
      entregasRecentes,
      vencimentosProximos,
      episPorCategoria: {
        totalCategorias: episPorCategoria.length,
        categorias: episPorCategoria.map(item => ({
          categoria: item.categoria,
          nomeCategoria: CATEGORIA_EPI_LABELS[item.categoria],
          tiposAtivos: item.tiposAtivos,
          estoqueDisponivel: item.estoqueDisponivel,
          totalItens: item.totalItens,
          percentualDisponivel: item.totalItens > 0 
            ? Math.round((item.estoqueDisponivel / item.totalItens) * 100)
            : 0,
        })),
        resumo: {
          totalTiposAtivos: episPorCategoria.reduce((sum, item) => sum + item.tiposAtivos, 0),
          totalEstoqueDisponivel: episPorCategoria.reduce((sum, item) => sum + item.estoqueDisponivel, 0),
          totalItens: episPorCategoria.reduce((sum, item) => sum + item.totalItens, 0),
          categoriaComMaiorEstoque: episPorCategoria.reduce((prev, current) => 
            (current.estoqueDisponivel > prev.estoqueDisponivel) ? current : prev, 
            episPorCategoria[0] || { categoria: null, estoqueDisponivel: 0 }
          ).categoria,
        },
      },
      dataAtualizacao: new Date(),
    };

    return {
      success: true,
      data: dashboard,
    };
  }

  @Get('conformidade')
  @ApiOperation({ 
    summary: 'Relatório de conformidade',
    description: 'Lista colaboradores e seu status de conformidade com EPIs obrigatórios',
  })
  @ApiQuery({ name: 'unidadeNegocioId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'colaboradorId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'incluirVencidos', required: false, type: Boolean })
  @ApiQuery({ name: 'incluirProximosVencimento', required: false, type: Boolean })
  @ApiQuery({ name: 'diasAvisoVencimento', required: false, type: Number })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiResponse({ status: 200, description: 'Relatório de conformidade gerado' })
  async relatorioConformidade(
    @Query(new ZodValidationPipe(FiltrosRelatorioConformidadeSchema)) 
    filtros: FiltrosRelatorioConformidade,
  ): Promise<SuccessResponse> {
    // Para demonstração, retornar estrutura básica
    // Em implementação real, seria feita consulta complexa no banco
    const relatorio = {
      itens: [],
      resumo: {
        totalColaboradores: 0,
        colaboradoresConformes: 0,
        colaboradoresVencidos: 0,
        colaboradoresProximoVencimento: 0,
        colaboradoresSemEntrega: 0,
        colaboradoresSemFicha: 0,
        percentualConformidade: 0,
      },
      dataGeracao: new Date(),
      parametros: {
        diasAvisoVencimento: filtros.diasAvisoVencimento,
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
      },
    };

    return {
      success: true,
      data: relatorio,
      message: 'Relatório de conformidade gerado com sucesso',
    };
  }

  @Get('uso-epis')
  @ApiOperation({ 
    summary: 'Relatório de uso de EPIs',
    description: 'Analisa padrões de uso, tempo médio e condições de devolução',
  })
  @ApiQuery({ name: 'colaboradorId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'unidadeNegocioId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'incluirDevolvidos', required: false, type: Boolean })
  @ApiQuery({ name: 'incluirPerdidos', required: false, type: Boolean })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiResponse({ status: 200, description: 'Relatório de uso gerado' })
  async relatorioUsoEpis(
    @Query(new ZodValidationPipe(FiltrosRelatorioUsoSchema)) 
    filtros: FiltrosRelatorioUso,
  ): Promise<SuccessResponse> {
    const historico = await this.processarDevolucaoUseCase.obterHistoricoDevolucoes(
      filtros.colaboradorId,
      filtros.tipoEpiId,
      filtros.dataInicio,
      filtros.dataFim,
    );

    const relatorio = {
      itens: historico.devolucoes.map(dev => ({
        colaboradorId: dev.entregaId,
        colaboradorNome: dev.colaboradorNome,
        tipoEpiId: dev.entregaId,
        tipoEpiNome: dev.tipoEpiNome,
        dataEntrega: dev.dataEntrega,
        dataDevolucao: dev.dataDevolucao,
        diasUso: dev.diasUso,
        motivoDevolucao: dev.motivoDevolucao,
        destinoItem: dev.destinoItem as any,
        numeroSerie: dev.numeroSerie,
        lote: dev.lote,
        custoEstimado: 0,
      })),
      estatisticas: {
        totalEntregas: historico.estatisticas.totalDevolucoes,
        totalDevolvidos: historico.estatisticas.itensQuarentena,
        totalPerdidos: historico.estatisticas.itensDescarte,
        totalEmUso: 0,
        tempoMedioUso: historico.estatisticas.tempoMedioUso,
        taxaPerda: historico.estatisticas.totalDevolucoes > 0 
          ? (historico.estatisticas.itensDescarte / historico.estatisticas.totalDevolucoes) * 100 
          : 0,
        taxaDanificacao: historico.estatisticas.totalDevolucoes > 0 
          ? (historico.estatisticas.itensOutros / historico.estatisticas.totalDevolucoes) * 100 
          : 0,
        custoTotalPerdas: 0,
      },
      dataGeracao: new Date(),
    };

    return {
      success: true,
      data: relatorio,
      message: 'Relatório de uso de EPIs gerado com sucesso',
    };
  }

  @Get('movimentacoes')
  @ApiOperation({ 
    summary: 'Relatório de movimentações',
    description: 'Lista todas as movimentações de estoque com filtros detalhados',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'tipoMovimentacao', required: false, enum: ['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE', 'DESCARTE', 'ESTORNO'] })
  @ApiQuery({ name: 'usuarioId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Relatório de movimentações gerado' })
  async relatorioMovimentacoes(
    @Query(new ZodValidationPipe(FiltrosRelatorioMovimentacaoSchema)) 
    filtros: FiltrosRelatorioMovimentacao,
  ): Promise<SuccessResponse> {
    // Construir filtros para consulta
    const where: any = {};
    
    if (filtros.almoxarifadoId) {
      where.estoqueItem = { almoxarifadoId: filtros.almoxarifadoId };
    }
    if (filtros.tipoEpiId) {
      where.estoqueItem = { ...where.estoqueItem, tipoEpiId: filtros.tipoEpiId };
    }
    if (filtros.tipoMovimentacao) where.tipoMovimentacao = filtros.tipoMovimentacao;
    if (filtros.usuarioId) where.responsavelId = filtros.usuarioId;
    
    if (filtros.dataInicio || filtros.dataFim) {
      where.dataMovimentacao = {};
      if (filtros.dataInicio) where.dataMovimentacao.gte = filtros.dataInicio;
      if (filtros.dataFim) where.dataMovimentacao.lte = filtros.dataFim;
    }

    // Buscar movimentações
    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      include: {
        estoqueItem: {
          include: {
            almoxarifado: { select: { nome: true } },
            tipoEpi: { select: { nomeEquipamento: true } },
          },
        },
        responsavel: { select: { nome: true } },
        notaMovimentacao: { select: { numeroDocumento: true, observacoes: true } },
      },
      orderBy: { dataMovimentacao: 'desc' },
      skip: (Number(filtros.page) - 1) * Number(filtros.limit),
      take: Number(filtros.limit),
    });

    // Calcular resumo
    const resumoQuery = await this.prisma.movimentacaoEstoque.groupBy({
      by: ['tipoMovimentacao'],
      where,
      _count: { id: true },
      _sum: { quantidadeMovida: true },
    });

    const relatorio = {
      movimentacoes: movimentacoes.map(mov => ({
        id: mov.id,
        data: mov.dataMovimentacao,
        almoxarifadoNome: mov.estoqueItem?.almoxarifado?.nome || 'N/A',
        tipoEpiNome: mov.estoqueItem?.tipoEpi?.nomeEquipamento || 'N/A',
        tipoMovimentacao: mov.tipoMovimentacao,
        quantidade: mov.quantidadeMovida,
        saldoAnterior: 0, // Field removed from schema
        saldoPosterior: 0, // Field removed from schema
        usuarioNome: mov.responsavel?.nome || 'Sistema',
        observacoes: mov.notaMovimentacao?.observacoes || undefined, // observacoes moved to notaMovimentacao
        documento: mov.notaMovimentacao?.numeroDocumento,
      })),
      resumo: {
        totalMovimentacoes: movimentacoes.length,
        totalEntradas: resumoQuery
          .filter(r => ['ENTRADA_NOTA', 'ENTRADA_DEVOLUCAO', 'ENTRADA_TRANSFERENCIA', 'AJUSTE_POSITIVO'].includes(r.tipoMovimentacao))
          .reduce((sum, r) => sum + (r._sum.quantidadeMovida || 0), 0),
        totalSaidas: resumoQuery
          .filter(r => ['SAIDA_ENTREGA', 'SAIDA_TRANSFERENCIA', 'SAIDA_DESCARTE', 'AJUSTE_NEGATIVO'].includes(r.tipoMovimentacao))
          .reduce((sum, r) => sum + (r._sum.quantidadeMovida || 0), 0),
        saldoInicialPeriodo: 0,
        saldoFinalPeriodo: 0,
        variacao: 0,
      },
      dataGeracao: new Date(),
    };

    return {
      success: true,
      data: relatorio,
      message: 'Relatório de movimentações gerado com sucesso',
    };
  }

  @Get('saude-sistema')
  @ApiOperation({ 
    summary: 'Saúde do sistema',
    description: 'Monitora o status geral do sistema, alertas e performance',
  })
  @ApiQuery({ name: 'incluirAlertas', required: false, type: Boolean })
  @ApiQuery({ name: 'incluirEstatisticas', required: false, type: Boolean })
  @ApiQuery({ name: 'incluirPerformance', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Status do sistema obtido' })
  async obterSaudeSistema(
    @Query(new ZodValidationPipe(FiltrosSaudesistemaSchema)) 
    filtros: FiltrosSaudesistema,
  ): Promise<SuccessResponse> {
    // Para demonstração - em produção seria conectado a sistemas de monitoramento
    const saudesSistema = {
      status: 'SAUDAVEL' as const,
      alertas: filtros.incluirAlertas ? [
        {
          tipo: 'ESTOQUE' as const,
          severidade: 'MEDIA' as const,
          titulo: 'Itens com estoque baixo',
          descricao: '5 tipos de EPI estão com estoque abaixo do mínimo',
          dataDeteccao: new Date(),
          resolvido: false,
          acaoRecomendada: 'Revisar níveis de estoque e fazer reposição',
        },
      ] : [],
      estatisticas: filtros.incluirEstatisticas ? {
        totalUsuarios: SAUDE_SISTEMA.TOTAL_USUARIOS_DEFAULT,
        usuariosAtivos: SAUDE_SISTEMA.USUARIOS_ATIVOS_DEFAULT,
        totalFichas: SAUDE_SISTEMA.TOTAL_FICHAS_DEFAULT,
        fichasAtivas: SAUDE_SISTEMA.FICHAS_ATIVAS_DEFAULT,
        totalEstoque: SAUDE_SISTEMA.TOTAL_ESTOQUE_DEFAULT,
        itensAlerta: SAUDE_SISTEMA.ITENS_ALERTA_DEFAULT,
        operacoesUltimas24h: SAUDE_SISTEMA.OPERACOES_24H_DEFAULT,
      } : {},
      performance: filtros.incluirPerformance ? {
        tempoMedioResposta: METRICS.TEMPO_MEDIO_RESPOSTA_MS,
        utilizacaoMemoria: METRICS.UTILIZACAO_MEMORIA_PERCENT,
        utilizacaoCpu: METRICS.UTILIZACAO_CPU_PERCENT,
        conexoesBanco: METRICS.CONEXOES_BANCO_DEFAULT,
        operacoesPorMinuto: METRICS.OPERACOES_POR_MINUTO,
      } : undefined,
      dataVerificacao: new Date(),
    };

    return {
      success: true,
      data: saudesSistema,
    };
  }

  @Get('descartes')
  @ApiOperation({ 
    summary: 'Relatório de descartes',
    description: 'Lista todos os descartes de EPIs com filtros avançados e estatísticas',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'contratadaId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'responsavelId', required: false, type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Relatório de descartes gerado com sucesso' })
  async relatorioDescartes(
    @Query(new ZodValidationPipe(RelatorioDescartesFiltersSchema)) 
    filtros: RelatorioDescartesFilters,
  ): Promise<SuccessResponse> {
    const relatorio = await this.relatorioDescartesUseCase.execute(filtros);

    return {
      success: true,
      data: relatorio,
      message: 'Relatório de descartes gerado com sucesso',
    };
  }

  @Get('descartes/estatisticas')
  @ApiOperation({ 
    summary: 'Estatísticas de descartes',
    description: 'Retorna estatísticas resumidas sobre descartes dos últimos 30 dias',
  })
  @ApiResponse({ status: 200, description: 'Estatísticas de descartes obtidas com sucesso' })
  async estatisticasDescartes(): Promise<SuccessResponse> {
    const estatisticas = await this.relatorioDescartesUseCase.obterEstatisticasDescarte();

    return {
      success: true,
      data: estatisticas,
      message: 'Estatísticas de descartes obtidas com sucesso',
    };
  }

  @Get('auditoria')
  @ApiOperation({ 
    summary: 'Relatório de auditoria',
    description: 'Lista operações do sistema para auditoria e compliance',
  })
  @ApiQuery({ name: 'usuarioId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'acao', required: false, type: String })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiResponse({ status: 200, description: 'Relatório de auditoria gerado' })
  async relatorioAuditoria(
    @Query('usuarioId') _usuarioId?: string,
    @Query('acao') _acao?: string,
    @Query('dataInicio') _dataInicio?: string,
    @Query('dataFim') _dataFim?: string,
  ): Promise<SuccessResponse> {
    // Para demonstração - em produção seria conectado ao sistema de auditoria
    const relatorio = {
      operacoes: [],
      resumo: {
        totalOperacoes: 0,
        operacoesSucesso: 0,
        operacoesErro: 0,
        operacoesNegadas: 0,
        usuariosUnicos: 0,
        acoesFrequentes: [],
      },
      dataGeracao: new Date(),
    };

    return {
      success: true,
      data: relatorio,
      message: 'Relatório de auditoria gerado com sucesso (funcionalidade em desenvolvimento)',
    };
  }

  private async obterEstatisticasEntregas(
    filtros: FiltrosDashboard, 
    _dataInicio: Date, 
    _dataFim: Date,
  ): Promise<any> {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - 7);
    
    const inicioMes = new Date(hoje);
    inicioMes.setMonth(hoje.getMonth() - 1);

    // Buscar estatísticas de entregas
    const [totalHoje, totalSemana, totalMes] = await Promise.all([
      this.prisma.entrega.count({
        where: {
          dataEntrega: {
            gte: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
          },
          ...(filtros.almoxarifadoId && { 
            almoxarifadoId: filtros.almoxarifadoId 
          }),
        },
      }),
      this.prisma.entrega.count({
        where: {
          dataEntrega: { gte: inicioSemana },
          ...(filtros.almoxarifadoId && { 
            almoxarifadoId: filtros.almoxarifadoId 
          }),
        },
      }),
      this.prisma.entrega.count({
        where: {
          dataEntrega: { gte: inicioMes },
          ...(filtros.almoxarifadoId && { 
            almoxarifadoId: filtros.almoxarifadoId 
          }),
        },
      }),
    ]);

    return {
      totalHoje,
      totalSemana,
      totalMes,
      entregasPendentes: 0,
    };
  }

  private async obterVencimentosProximos(_filtros: FiltrosDashboard): Promise<any> {
    const hoje = new Date();
    const em7Dias = new Date(hoje);
    em7Dias.setDate(hoje.getDate() + 7);
    
    const em30Dias = new Date(hoje);
    em30Dias.setDate(hoje.getDate() + 30);

    // Buscar vencimentos próximos
    const [vencendoHoje, vencendo7Dias, vencendo30Dias] = await Promise.all([
      this.prisma.entregaItem.count({
        where: {
          status: 'COM_COLABORADOR',
          dataLimiteDevolucao: {
            gte: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
            lt: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1),
          },
        },
      }),
      this.prisma.entregaItem.count({
        where: {
          status: 'COM_COLABORADOR',
          dataLimiteDevolucao: {
            gte: hoje,
            lte: em7Dias,
          },
        },
      }),
      this.prisma.entregaItem.count({
        where: {
          status: 'COM_COLABORADOR',
          dataLimiteDevolucao: {
            gte: hoje,
            lte: em30Dias,
          },
        },
      }),
    ]);

    // Buscar itens específicos vencendo
    const itensVencendo = await this.prisma.entregaItem.findMany({
      where: {
        status: 'COM_COLABORADOR',
        dataLimiteDevolucao: {
          gte: hoje,
          lte: em30Dias,
        },
      },
      include: {
        entrega: {
          include: {
            fichaEpi: {
              include: {
                colaborador: { select: { nome: true } },
              },
            },
          },
        },
        estoqueItem: {
          include: {
            tipoEpi: { select: { nomeEquipamento: true } },
          },
        },
      },
      orderBy: { dataLimiteDevolucao: 'asc' },
      take: RELATORIOS.MAX_ITEMS_DASHBOARD,
    });

    return {
      vencendoHoje,
      vencendo7Dias,
      vencendo30Dias,
      itensVencendo: itensVencendo.map(item => ({
        colaboradorNome: item.entrega.fichaEpi.colaborador.nome,
        tipoEpiNome: item.estoqueItem.tipoEpi.nomeEquipamento,
        dataVencimento: item.dataLimiteDevolucao!,
        diasRestantes: Math.floor(
          (item.dataLimiteDevolucao!.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
    };
  }
}