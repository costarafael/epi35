import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { RelatorioPosicaoEstoqueUseCase } from '../../application/use-cases/queries/relatorio-posicao-estoque.use-case';
import { RealizarAjusteDirectoUseCase } from '../../application/use-cases/estoque/realizar-ajuste-direto.use-case';
import { ListarEstoqueItensUseCase } from '../../application/use-cases/estoque/listar-estoque-itens.use-case';
import { ListarAlmoxarifadosUseCase } from '../../application/use-cases/estoque/listar-almoxarifados.use-case';
import {
  FiltrosEstoqueSchema,
  AjusteDirectoSchema,
  InventarioSchema,
  SimulacaoAjusteSchema,
  FiltrosHistoricoAjustesSchema,
  ValidacaoDivergenciasSchema,
  FiltrosKardexSchema,
  FiltrosAnaliseGiroSchema,
  FiltrosEstoque,
  AjusteDirectoRequest,
  InventarioRequest,
  SimulacaoAjusteRequest,
  FiltrosHistoricoAjustes,
  ValidacaoDivergenciasRequest,
  FiltrosKardex,
  FiltrosAnaliseGiro,
  ListarEstoqueItensQuerySchema,
  ListarEstoqueItensQuery,
  ListarAlmoxarifadosQuerySchema,
  ListarAlmoxarifadosQuery,
} from '../dto/schemas/estoque.schemas';
import { IdSchema, SuccessResponse } from '../dto/schemas/common.schemas';

@ApiTags('estoque')
@ApiBearerAuth()
@Controller('estoque')
export class EstoqueController {
  constructor(
    private readonly relatorioPosicaoEstoqueUseCase: RelatorioPosicaoEstoqueUseCase,
    private readonly realizarAjusteDirectoUseCase: RealizarAjusteDirectoUseCase,
    private readonly listarEstoqueItensUseCase: ListarEstoqueItensUseCase,
    private readonly listarAlmoxarifadosUseCase: ListarAlmoxarifadosUseCase,
  ) {}

  @Get('posicao')
  @ApiOperation({ 
    summary: 'Relatório de posição de estoque',
    description: 'Gera relatório detalhado da posição atual do estoque com filtros opcionais',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'unidadeNegocioId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'apenasComSaldo', required: false, type: Boolean, description: 'Mostrar apenas itens com saldo' })
  @ApiQuery({ name: 'apenasAbaixoMinimo', required: false, type: Boolean, description: 'Mostrar apenas itens abaixo do estoque mínimo' })
  @ApiResponse({ 
    status: 200, 
    description: 'Relatório gerado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            itens: { type: 'array' },
            resumo: { type: 'object' },
            dataGeracao: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async obterPosicaoEstoque(
    @Query(new ZodValidationPipe(FiltrosEstoqueSchema)) 
    filtros: FiltrosEstoque,
  ): Promise<SuccessResponse> {
    const relatorio = await this.relatorioPosicaoEstoqueUseCase.execute({
      almoxarifadoId: filtros.almoxarifadoId,
      tipoEpiId: filtros.tipoEpiId,
      unidadeNegocioId: filtros.unidadeNegocioId,
      apenasComSaldo: filtros.apenasComSaldo,
      apenasAbaixoMinimo: filtros.apenasAbaixoMinimo,
    });

    return {
      success: true,
      data: relatorio,
    };
  }

  @Get('kardex/:almoxarifadoId/:tipoEpiId')
  @ApiOperation({ 
    summary: 'Obter kardex de item',
    description: 'Retorna o kardex (histórico de movimentações) de um item específico',
  })
  @ApiParam({ name: 'almoxarifadoId', type: 'string', description: 'ID do almoxarifado (UUID ou ID customizado)' })
  @ApiParam({ name: 'tipoEpiId', type: 'string', description: 'ID do tipo de EPI (UUID ou ID customizado)' })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiResponse({ status: 200, description: 'Kardex obtido com sucesso' })
  async obterKardex(
    @Param('almoxarifadoId', new ZodValidationPipe(IdSchema)) almoxarifadoId: string,
    @Param('tipoEpiId', new ZodValidationPipe(IdSchema)) tipoEpiId: string,
    @Query(new ZodValidationPipe(FiltrosKardexSchema.omit({ almoxarifadoId: true, tipoEpiId: true }))) 
    filtros: Omit<FiltrosKardex, 'almoxarifadoId' | 'tipoEpiId'>,
  ): Promise<SuccessResponse> {
    const kardex = await this.relatorioPosicaoEstoqueUseCase.obterKardexItem(
      almoxarifadoId,
      tipoEpiId,
      filtros.dataInicio,
      filtros.dataFim,
    );

    return {
      success: true,
      data: kardex,
    };
  }

  @Get('analise-giro')
  @ApiOperation({ 
    summary: 'Análise de giro de estoque',
    description: 'Analisa o giro de estoque por período para identificar itens com movimentação rápida ou lenta',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'periodo', required: false, enum: ['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'] })
  @ApiResponse({ status: 200, description: 'Análise de giro obtida com sucesso' })
  async obterAnaliseGiro(
    @Query(new ZodValidationPipe(FiltrosAnaliseGiroSchema)) 
    filtros: FiltrosAnaliseGiro,
  ): Promise<SuccessResponse> {
    const analise = await this.relatorioPosicaoEstoqueUseCase.obterAnaliseGiroEstoque(
      filtros.almoxarifadoId,
      filtros.periodo,
    );

    return {
      success: true,
      data: analise,
    };
  }

  @Post('ajuste-direto')
  @ApiOperation({ 
    summary: 'Realizar ajuste direto de estoque',
    description: 'Executa um ajuste direto na quantidade de um item específico',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Ajuste realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            movimentacaoId: { type: 'string', format: 'uuid' },
            tipoEpiId: { type: 'string', format: 'uuid' },
            saldoAnterior: { type: 'number' },
            saldoPosterior: { type: 'number' },
            diferenca: { type: 'number' },
            observacoes: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou permissão negada' })
  @ApiResponse({ status: 404, description: 'Almoxarifado ou tipo de EPI não encontrado' })
  async realizarAjusteDirecto(
    @Body(new ZodValidationPipe(AjusteDirectoSchema)) 
    ajusteDto: AjusteDirectoRequest,
    @Request() req: any,
  ): Promise<SuccessResponse> {
    const usuarioId = req.user?.id || 'user-temp';

    const resultado = await this.realizarAjusteDirectoUseCase.executarAjusteDirecto({
      almoxarifadoId: ajusteDto.almoxarifadoId,
      tipoEpiId: ajusteDto.tipoEpiId,
      novaQuantidade: ajusteDto.novaQuantidade,
      motivo: ajusteDto.motivo,
      validarPermissao: ajusteDto.validarPermissao,
      usuarioId,
    });

    return {
      success: true,
      data: resultado,
      message: 'Ajuste de estoque realizado com sucesso',
    };
  }

  @Post('ajuste-direto/simular')
  @ApiOperation({ 
    summary: 'Simular ajuste de estoque',
    description: 'Simula um ajuste de estoque para visualizar o impacto antes da execução',
  })
  @ApiResponse({ status: 200, description: 'Simulação realizada com sucesso' })
  async simularAjuste(
    @Body(new ZodValidationPipe(SimulacaoAjusteSchema)) 
    simulacaoDto: SimulacaoAjusteRequest,
  ): Promise<SuccessResponse> {
    const simulacao = await this.realizarAjusteDirectoUseCase.simularAjuste(
      simulacaoDto.almoxarifadoId,
      simulacaoDto.tipoEpiId,
      simulacaoDto.novaQuantidade,
    );

    return {
      success: true,
      data: simulacao,
    };
  }

  @Post('inventario')
  @ApiOperation({ 
    summary: 'Executar inventário completo',
    description: 'Processa múltiplos ajustes de inventário baseados na contagem física',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Inventário processado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            ajustesRealizados: { type: 'array' },
            totalItensProcessados: { type: 'number' },
            totalAjustesPositivos: { type: 'number' },
            totalAjustesNegativos: { type: 'number' },
            valorTotalAjustes: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou permissão negada' })
  async executarInventario(
    @Body(new ZodValidationPipe(InventarioSchema)) 
    inventarioDto: InventarioRequest,
    @Request() req: any,
  ): Promise<SuccessResponse> {
    const usuarioId = req.user?.id || 'user-temp';

    const resultado = await this.realizarAjusteDirectoUseCase.executarInventario({
      almoxarifadoId: inventarioDto.almoxarifadoId,
      ajustes: inventarioDto.ajustes.map(a => ({
        tipoEpiId: a.tipoEpiId,
        quantidadeContada: a.quantidadeContada,
        motivo: a.motivo,
      })),
      observacoes: inventarioDto.observacoes,
      usuarioId,
    });

    return {
      success: true,
      data: resultado,
      message: 'Inventário processado com sucesso',
    };
  }

  @Post('inventario/validar-divergencias')
  @ApiOperation({ 
    summary: 'Validar divergências de inventário',
    description: 'Compara contagens de inventário com saldos do sistema e identifica divergências',
  })
  @ApiResponse({ status: 200, description: 'Validação realizada com sucesso' })
  async validarDivergenciasInventario(
    @Body(new ZodValidationPipe(ValidacaoDivergenciasSchema)) 
    validacaoDto: ValidacaoDivergenciasRequest,
  ): Promise<SuccessResponse> {
    const resultado = await this.realizarAjusteDirectoUseCase.validarDivergenciasInventario(
      validacaoDto.almoxarifadoId,
      validacaoDto.contagens.map(c => ({ tipoEpiId: c.tipoEpiId, quantidadeContada: c.quantidadeContada })),
    );

    return {
      success: true,
      data: resultado,
    };
  }

  @Get('ajustes/historico')
  @ApiOperation({ 
    summary: 'Histórico de ajustes de estoque',
    description: 'Lista o histórico de ajustes realizados com filtros opcionais',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10, máx: 100)' })
  @ApiResponse({ status: 200, description: 'Histórico obtido com sucesso' })
  async obterHistoricoAjustes(
    @Query(new ZodValidationPipe(FiltrosHistoricoAjustesSchema)) 
    filtros: FiltrosHistoricoAjustes,
  ): Promise<SuccessResponse> {
    const historico = await this.realizarAjusteDirectoUseCase.obterHistoricoAjustes(
      filtros.almoxarifadoId,
      filtros.tipoEpiId,
      filtros.dataInicio,
      filtros.dataFim,
    );

    return {
      success: true,
      data: historico,
    };
  }

  @Get('resumo')
  @ApiOperation({ 
    summary: 'Resumo geral do estoque',
    description: 'Retorna indicadores e métricas gerais do estoque',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'unidadeNegocioId', required: false, type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Resumo obtido com sucesso' })
  async obterResumoEstoque(
    @Query('almoxarifadoId') almoxarifadoId?: string,
    @Query('unidadeNegocioId') unidadeNegocioId?: string,
  ): Promise<SuccessResponse> {
    const relatorio = await this.relatorioPosicaoEstoqueUseCase.execute({
      almoxarifadoId,
      unidadeNegocioId,
      apenasComSaldo: false,
      apenasAbaixoMinimo: false,
    });

    // Retornar apenas o resumo para dashboard
    return {
      success: true,
      data: {
        resumo: relatorio.resumo,
        dataGeracao: relatorio.dataGeracao,
        totalItensAnalisados: relatorio.itens.length,
      },
    };
  }

  @Get('alertas')
  @ApiOperation({ 
    summary: 'Alertas de estoque',
    description: 'Lista itens que requerem atenção (estoque baixo, crítico ou zerado)',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'unidadeNegocioId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'severidade', required: false, enum: ['BAIXO', 'CRITICO', 'ZERO'] })
  @ApiResponse({ status: 200, description: 'Alertas obtidos com sucesso' })
  async obterAlertasEstoque(
    @Query('almoxarifadoId') almoxarifadoId?: string,
    @Query('unidadeNegocioId') unidadeNegocioId?: string,
    @Query('severidade') severidade?: 'BAIXO' | 'CRITICO' | 'ZERO',
  ): Promise<SuccessResponse> {
    const relatorio = await this.relatorioPosicaoEstoqueUseCase.execute({
      almoxarifadoId,
      unidadeNegocioId,
      apenasComSaldo: false,
      apenasAbaixoMinimo: true,
    });

    // Filtrar por severidade se especificada
    let itensAlerta = relatorio.itens.filter(item => 
      ['BAIXO', 'CRITICO', 'ZERO'].includes(item.situacao)
    );

    if (severidade) {
      itensAlerta = itensAlerta.filter(item => item.situacao === severidade);
    }

    // Ordenar por severidade (ZERO > CRITICO > BAIXO)
    const ordemSeveridade = { 'ZERO': 3, 'CRITICO': 2, 'BAIXO': 1, 'NORMAL': 0 };
    itensAlerta.sort((a, b) => ordemSeveridade[b.situacao] - ordemSeveridade[a.situacao]);

    return {
      success: true,
      data: {
        alertas: itensAlerta,
        resumo: {
          totalAlertas: itensAlerta.length,
          itensBaixo: itensAlerta.filter(i => i.situacao === 'BAIXO').length,
          itensCritico: 0, // Removido status CRÍTICO
          itensZero: itensAlerta.filter(i => i.situacao === 'ZERO').length,
        },
        dataGeracao: relatorio.dataGeracao,
      },
    };
  }

  @Get('itens')
  @ApiOperation({ 
    summary: 'Listar itens de estoque',
    description: 'Lista itens de estoque com filtros opcionais e paginação',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid', description: 'Filtrar por almoxarifado' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, format: 'uuid', description: 'Filtrar por tipo de EPI' })
  @ApiQuery({ name: 'status', required: false, enum: ['DISPONIVEL', 'AGUARDANDO_INSPECAO', 'QUARENTENA'], description: 'Filtrar por status do item' })
  @ApiQuery({ name: 'apenasDisponiveis', required: false, type: Boolean, description: 'Apenas itens disponíveis' })
  @ApiQuery({ name: 'apenasComSaldo', required: false, type: Boolean, description: 'Apenas itens com saldo > 0' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 50, máx: 100)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de itens de estoque',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  async listarEstoqueItens(
    @Query(new ZodValidationPipe(ListarEstoqueItensQuerySchema)) 
    query: ListarEstoqueItensQuery,
  ): Promise<SuccessResponse> {
    const resultado = await this.listarEstoqueItensUseCase.execute({
      almoxarifadoId: query.almoxarifadoId,
      tipoEpiId: query.tipoEpiId,
      status: query.status,
      apenasDisponiveis: query.apenasDisponiveis,
      apenasComSaldo: query.apenasComSaldo,
      page: query.page,
      limit: query.limit,
    });

    return {
      success: true,
      data: resultado,
    };
  }

  @Get('almoxarifados')
  @ApiOperation({ 
    summary: 'Listar almoxarifados',
    description: 'Lista almoxarifados com filtros opcionais',
  })
  @ApiQuery({ name: 'unidadeNegocioId', required: false, type: String, format: 'uuid', description: 'Filtrar por unidade de negócio' })
  @ApiQuery({ name: 'incluirContadores', required: false, type: Boolean, description: 'Incluir contagem de itens' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de almoxarifados',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              nome: { type: 'string' },
              isPrincipal: { type: 'boolean' },
              unidadeNegocioId: { type: 'string', format: 'uuid' },
              createdAt: { type: 'string', format: 'date-time' },
              unidadeNegocio: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  nome: { type: 'string' },
                  codigo: { type: 'string' },
                },
              },
              _count: {
                type: 'object',
                properties: {
                  estoqueItens: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  async listarAlmoxarifados(
    @Query(new ZodValidationPipe(ListarAlmoxarifadosQuerySchema)) 
    query: ListarAlmoxarifadosQuery,
  ): Promise<SuccessResponse> {
    const almoxarifados = await this.listarAlmoxarifadosUseCase.execute({
      unidadeNegocioId: query.unidadeNegocioId,
      incluirContadores: query.incluirContadores,
    });

    return {
      success: true,
      data: almoxarifados,
    };
  }
}