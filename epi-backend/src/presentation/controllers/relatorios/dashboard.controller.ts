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
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { RelatorioPosicaoEstoqueUseCase } from '../../../application/use-cases/queries/relatorio-posicao-estoque.use-case';
import { CriarFichaEpiUseCase } from '../../../application/use-cases/fichas/criar-ficha-epi.use-case';
import { CriarTipoEpiUseCase } from '../../../application/use-cases/fichas/criar-tipo-epi.use-case';
import { ProcessarDevolucaoUseCase } from '../../../application/use-cases/fichas/processar-devolucao.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  FiltrosDashboardSchema,
  FiltrosDashboard,
} from '../../dto/schemas/relatorios.schemas';
import { SuccessResponse } from '../../dto/schemas/common.schemas';
import { DashboardFormatterService } from '../../../shared/formatters/dashboard-formatter.service';
import { DATES } from '../../../shared/constants/system.constants';

@ApiTags('relatorios')
@ApiBearerAuth()
@Controller('relatorios')
export class DashboardController {
  constructor(
    private readonly relatorioPosicaoEstoqueUseCase: RelatorioPosicaoEstoqueUseCase,
    private readonly criarFichaEpiUseCase: CriarFichaEpiUseCase,
    private readonly criarTipoEpiUseCase: CriarTipoEpiUseCase,
    private readonly processarDevolucaoUseCase: ProcessarDevolucaoUseCase,
    private readonly prisma: PrismaService,
    private readonly dashboardFormatter: DashboardFormatterService,
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
    // Calcular período usando formatter
    const { dataInicio, dataFim } = this.dashboardFormatter.calcularPeriodoAnalise(filtros);

    // Executar use cases em paralelo
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

    // Formatar dashboard usando formatter (sem lógica de negócio)
    const dashboard = this.dashboardFormatter.formatarDashboard({
      relatorioEstoque,
      estatisticasFichas,
      entregasRecentes,
      vencimentosProximos,
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

  @Get('dashboard/estatisticas-entregas')
  @ApiOperation({ 
    summary: 'Estatísticas de entregas para dashboard',
    description: 'Retorna métricas específicas de entregas do período',
  })
  @ApiQuery({ name: 'unidadeNegocioId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'periodo', required: false, enum: ['ULTIMO_MES', 'ULTIMO_TRIMESTRE', 'ULTIMO_SEMESTRE', 'ULTIMO_ANO'] })
  @ApiResponse({ status: 200, description: 'Estatísticas de entregas obtidas' })
  async obterEstatisticasEntregas(
    @Query(new ZodValidationPipe(FiltrosDashboardSchema)) 
    filtros: FiltrosDashboard,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<any> {
    // Se não foram passadas as datas, calcular período
    if (!dataInicio || !dataFim) {
      const periodo = this.dashboardFormatter.calcularPeriodoAnalise(filtros);
      dataInicio = periodo.dataInicio;
      dataFim = periodo.dataFim;
    }

    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - DATES.DIAS_SEMANA);
    
    const [entregasRecentes, devolucoesRecentes] = await Promise.all([
      // Entregas da última semana
      this.prisma.entrega.findMany({
        where: {
          dataEntrega: {
            gte: inicioSemana,
            lte: hoje,
          },
          ...(filtros.almoxarifadoId && { almoxarifadoId: filtros.almoxarifadoId }),
        },
        include: {
          fichaEpi: {
            include: {
              colaborador: {
                include: {
                  contratada: true,
                },
              },
            },
          },
          almoxarifado: true,
          responsavel: true,
          // entregaItens: true,
        },
        orderBy: {
          dataEntrega: 'desc',
        },
        take: 10,
      }),

      // Devoluções recentes
      this.prisma.movimentacaoEstoque.findMany({
        where: {
          tipoMovimentacao: 'ENTRADA_DEVOLUCAO',
          dataMovimentacao: {
            gte: inicioSemana,
            lte: hoje,
          },
        },
        include: {
          entrega: {
            include: {
              fichaEpi: {
                include: {
                  colaborador: true,
                },
              },
            },
          },
          estoqueItem: {
            include: {
              tipoEpi: true,
            },
          },
        },
        take: 10,
      }),
    ]);

    return {
      totalEntregasSemana: entregasRecentes.length,
      totalDevolucoesSemana: devolucoesRecentes.length,
      entregasDetalhadas: entregasRecentes.map(entrega => ({
        id: entrega.id,
        colaboradorNome: entrega.fichaEpi.colaborador.nome,
        contratadaNome: entrega.fichaEpi.colaborador.contratada?.nome,
        almoxarifadoNome: entrega.almoxarifado.nome,
        responsavelNome: entrega.responsavel.nome,
        totalItens: 0, // Mock - seria necessário query separada
        status: entrega.status,
        dataEntrega: entrega.dataEntrega,
      })),
      devolucoes: devolucoesRecentes.map(devolucao => ({
        colaboradorNome: devolucao.entrega?.fichaEpi.colaborador.nome,
        tipoEpiNome: devolucao.estoqueItem.tipoEpi.nomeEquipamento,
        quantidadeDevolvida: devolucao.quantidadeMovida,
        dataDevolucao: devolucao.dataMovimentacao,
      })),
      tendencias: {
        crescimentoEntregas: 15, // Mock - deveria calcular real
        crescimentoDevolucoes: -5, // Mock - deveria calcular real
      },
    };
  }

  @Get('dashboard/vencimentos-proximos')
  @ApiOperation({ 
    summary: 'Vencimentos próximos para dashboard',
    description: 'Retorna EPIs próximos ao vencimento',
  })
  @ApiQuery({ name: 'unidadeNegocioId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Vencimentos próximos obtidos' })
  async obterVencimentosProximos(
    @Query(new ZodValidationPipe(FiltrosDashboardSchema)) 
    filtros: FiltrosDashboard,
  ): Promise<any> {
    const hoje = new Date();
    const proximos30Dias = new Date(hoje);
    proximos30Dias.setDate(hoje.getDate() + DATES.DIAS_VENCIMENTO_PROXIMO);

    const [itensVencendoEm30Dias, itensJaVencidos] = await Promise.all([
      // Itens vencendo nos próximos 30 dias
      this.prisma.entregaItem.findMany({
        where: {
          status: 'COM_COLABORADOR',
          dataLimiteDevolucao: {
            gte: hoje,
            lte: proximos30Dias,
          },
          entrega: {
            status: 'ASSINADA',
            ...(filtros.almoxarifadoId && { almoxarifadoId: filtros.almoxarifadoId }),
          },
        },
        include: {
          entrega: {
            include: {
              fichaEpi: {
                include: {
                  colaborador: {
                    include: {
                      contratada: true,
                    },
                  },
                },
              },
              almoxarifado: true,
            },
          },
          estoqueItem: {
            include: {
              tipoEpi: true,
            },
          },
        },
        orderBy: {
          dataLimiteDevolucao: 'asc',
        },
        take: 20,
      }),

      // Itens já vencidos
      this.prisma.entregaItem.findMany({
        where: {
          status: 'COM_COLABORADOR',
          dataLimiteDevolucao: {
            lt: hoje,
          },
          entrega: {
            status: 'ASSINADA',
            ...(filtros.almoxarifadoId && { almoxarifadoId: filtros.almoxarifadoId }),
          },
        },
        include: {
          entrega: {
            include: {
              fichaEpi: {
                include: {
                  colaborador: true,
                },
              },
            },
          },
          estoqueItem: {
            include: {
              tipoEpi: true,
            },
          },
        },
        orderBy: {
          dataLimiteDevolucao: 'asc',
        },
        take: 10,
      }),
    ]);

    return {
      totalVencendoEm30Dias: itensVencendoEm30Dias.length,
      totalJaVencidos: itensJaVencidos.length,
      criticidade: itensJaVencidos.length > 10 ? 'ALTA' : 
        itensJaVencidos.length > 5 ? 'MEDIA' : 'BAIXA',
      itensVencendoEm30Dias: itensVencendoEm30Dias.map(item => ({
        entregaItemId: item.id,
        colaboradorNome: item.entrega.fichaEpi.colaborador.nome,
        tipoEpiNome: item.estoqueItem.tipoEpi.nomeEquipamento,
        dataLimiteDevolucao: item.dataLimiteDevolucao,
        diasParaVencimento: Math.ceil(
          (item.dataLimiteDevolucao!.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        ),
        almoxarifadoNome: item.entrega.almoxarifado.nome,
      })),
      itensJaVencidos: itensJaVencidos.map(item => ({
        entregaItemId: item.id,
        colaboradorNome: item.entrega.fichaEpi.colaborador.nome,
        tipoEpiNome: item.estoqueItem.tipoEpi.nomeEquipamento,
        dataLimiteDevolucao: item.dataLimiteDevolucao,
        diasVencido: Math.ceil(
          (hoje.getTime() - item.dataLimiteDevolucao!.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
    };
  }
}