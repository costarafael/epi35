import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
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
import { z } from 'zod';
import { CriarFichaEpiUseCase } from '../../application/use-cases/fichas/criar-ficha-epi.use-case';
import { StatusFichaEPI } from '../../domain/enums/ficha.enum';
import { CriarEntregaFichaUseCase } from '../../application/use-cases/fichas/criar-entrega-ficha.use-case';
import { ProcessarDevolucaoUseCase } from '../../application/use-cases/fichas/processar-devolucao.use-case';
import { CancelarDevolucaoUseCase } from '../../application/use-cases/fichas/cancelar-devolucao.use-case';
import {
  CriarFichaEpiSchema,
  AtualizarStatusFichaSchema,
  FiltrosFichaEpiSchema,
  ItemEntregaSchema,
  ValidarEntregaSchema,
  ProcessarDevolucaoSchema,
  CancelarDevolucaoSchema,
  FiltrosPosseAtualSchema,
  CriarFichaEpiRequest,
  AtualizarStatusFichaRequest,
  FiltrosFichaEpi,
  CriarEntregaRequest,
  ValidarEntregaRequest,
  ProcessarDevolucaoRequest,
  CancelarDevolucaoRequest,
  FiltrosPosseAtual,
} from '../dto/schemas/ficha-epi.schemas';
import { IdSchema, SuccessResponse, PaginatedResponse, ObservacoesSchema } from '../dto/schemas/common.schemas';
// ✅ OTIMIZAÇÃO: Import mappers para reduzir código duplicado
import { mapFichaEpiToOutput } from '../../infrastructure/mapping/ficha-epi.mapper';
import { mapEntregaToOutput } from '../../infrastructure/mapping/entrega.mapper';

@ApiTags('fichas-epi')
@ApiBearerAuth()
@Controller('fichas-epi')
export class FichasEpiController {
  constructor(
    private readonly criarFichaEpiUseCase: CriarFichaEpiUseCase,
    private readonly criarEntregaFichaUseCase: CriarEntregaFichaUseCase,
    private readonly processarDevolucaoUseCase: ProcessarDevolucaoUseCase,
    private readonly cancelarDevolucaoUseCase: CancelarDevolucaoUseCase,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Criar nova ficha de EPI',
    description: 'Cria uma nova ficha de EPI para um colaborador específico',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Ficha criada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            colaboradorId: { type: 'string', format: 'uuid' },
            tipoEpiId: { type: 'string', format: 'uuid' },
            almoxarifadoId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['ATIVA', 'INATIVA', 'SUSPENSA'] },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Ficha já existe para esta combinação' })
  async criarFicha(
    @Body(new ZodValidationPipe(CriarFichaEpiSchema)) 
    criarFichaDto: CriarFichaEpiRequest,
  ): Promise<SuccessResponse> {
    const ficha = await this.criarFichaEpiUseCase.execute({
      colaboradorId: criarFichaDto.colaboradorId,
      // tipoEpiId: criarFichaDto.tipoEpiId, // Removed - FichaEPI v3.5 one per collaborador
      // almoxarifadoId: criarFichaDto.almoxarifadoId, // Removed - FichaEPI v3.5 one per collaborador
      status: criarFichaDto.status as StatusFichaEPI,
    });

    return {
      success: true,
      data: ficha,
      message: 'Ficha de EPI criada com sucesso',
    };
  }

  @Post('criar-ou-ativar')
  @ApiOperation({ 
    summary: 'Criar ou ativar ficha de EPI',
    description: 'Cria nova ficha ou ativa uma existente inativa para a mesma combinação',
  })
  @ApiResponse({ status: 201, description: 'Ficha criada ou ativada com sucesso' })
  async criarOuAtivarFicha(
    @Body(new ZodValidationPipe(CriarFichaEpiSchema)) 
    criarFichaDto: CriarFichaEpiRequest,
  ): Promise<SuccessResponse> {
    const resultado = await this.criarFichaEpiUseCase.criarOuAtivar({
      colaboradorId: criarFichaDto.colaboradorId,
      // tipoEpiId: criarFichaDto.tipoEpiId, // Removed - FichaEPI v3.5 one per colaborador
      // almoxarifadoId: criarFichaDto.almoxarifadoId, // Removed - FichaEPI v3.5 one per colaborador
      status: criarFichaDto.status as StatusFichaEPI,
    });

    return {
      success: true,
      data: resultado.ficha,
      message: resultado.criada ? 'Ficha de EPI criada com sucesso' : 'Ficha de EPI reativada com sucesso',
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar fichas de EPI',
    description: 'Lista fichas com filtros opcionais e paginação',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10, máx: 100)' })
  @ApiQuery({ name: 'colaboradorId', required: false, type: String, description: 'ID do colaborador (UUID ou ID customizado)' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, description: 'ID do tipo de EPI (UUID ou ID customizado)' })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, description: 'ID do almoxarifado (UUID ou ID customizado)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ATIVA', 'INATIVA', 'SUSPENSA'] })
  @ApiQuery({ name: 'colaboradorNome', required: false, type: String })
  @ApiQuery({ name: 'tipoEpiNome', required: false, type: String })
  @ApiQuery({ name: 'ativo', required: false, type: Boolean })
  @ApiQuery({ name: 'devolucaoPendente', required: false, type: Boolean, description: 'Filtrar fichas com devolução em atraso' })
  @ApiResponse({ status: 200, description: 'Lista de fichas recuperada com sucesso' })
  async listarFichas(
    @Query(new ZodValidationPipe(FiltrosFichaEpiSchema)) 
    filtros: FiltrosFichaEpi,
  ): Promise<PaginatedResponse> {
    const resultado = await this.criarFichaEpiUseCase.listarFichas(
      {
        colaboradorId: filtros.colaboradorId,
        // tipoEpiId: filtros.tipoEpiId, // Removed - FichaEPI v3.5 one per colaborador
        // almoxarifadoId: filtros.almoxarifadoId, // Removed - FichaEPI v3.5 one per colaborador
        status: filtros.status as any,
        colaboradorNome: filtros.colaboradorNome,
        // tipoEpiNome: filtros.tipoEpiNome, // Removed - FichaEPI v3.5 one per colaborador
        ativo: filtros.ativo,
        devolucaoPendente: filtros.devolucaoPendente, // ✅ NOVO FILTRO
      },
      {
        page: filtros.page,
        limit: filtros.limit,
      },
    );
    
    // ✅ Implementação real de paginação
    if ('items' in resultado) {
      // Resultado paginado
      return {
        success: true,
        data: resultado.items,
        pagination: {
          page: resultado.page,
          limit: filtros.limit,
          total: resultado.total,
          totalPages: resultado.totalPages,
          hasNext: resultado.hasNext,
          hasPrev: resultado.hasPrev,
        },
      };
    } else {
      // Fallback para resultado não paginado (compatibilidade)
      return {
        success: true,
        data: resultado,
        pagination: {
          page: filtros.page,
          limit: filtros.limit,
          total: resultado.length,
          totalPages: Math.ceil(resultado.length / filtros.limit),
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  @Get('estatisticas')
  @ApiOperation({ 
    summary: 'Estatísticas das fichas de EPI',
    description: 'Retorna estatísticas gerais das fichas por almoxarifado',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, description: 'ID do almoxarifado (UUID ou ID customizado)' })
  @ApiResponse({ status: 200, description: 'Estatísticas obtidas com sucesso' })
  async obterEstatisticas(
    @Query('almoxarifadoId') _almoxarifadoId?: string,
  ): Promise<SuccessResponse> {
    const estatisticas = await this.criarFichaEpiUseCase.obterEstatisticas();

    return {
      success: true,
      data: estatisticas,
    };
  }

  @Get('devolucoes/historico')
  @ApiOperation({ 
    summary: 'Histórico de devoluções',
    description: 'Lista o histórico de devoluções com filtros opcionais',
  })
  @ApiQuery({ name: 'colaboradorId', required: false, type: String, description: 'ID do colaborador (UUID ou ID customizado)' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, description: 'ID do tipo de EPI (UUID ou ID customizado)' })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 20, máx: 100)' })
  @ApiResponse({ status: 200, description: 'Histórico de devoluções obtido' })
  async obterHistoricoDevolucoes(
    @Query() filtros: any,
  ): Promise<SuccessResponse> {
    // Aplicar defaults aos filtros
    const page = parseInt(filtros.page) || 1;
    const limit = Math.min(parseInt(filtros.limit) || 20, 100);
    
    const historico = await this.processarDevolucaoUseCase.obterHistoricoDevolucoes(
      filtros.colaboradorId,
      filtros.tipoEpiId,
      filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
      filtros.dataFim ? new Date(filtros.dataFim) : undefined,
    );

    return {
      success: true,
      data: historico,
    };
  }

  @Get('devolucoes/cancelamentos/historico')
  @ApiOperation({ 
    summary: 'Histórico de cancelamentos de devolução',
    description: 'Lista o histórico de cancelamentos de devolução',
  })
  @ApiQuery({ name: 'colaboradorId', required: false, type: String, description: 'ID do colaborador (UUID ou ID customizado)' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, description: 'ID do tipo de EPI (UUID ou ID customizado)' })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiResponse({ status: 200, description: 'Histórico de cancelamentos obtido' })
  async obterHistoricoCancelamentosDevolucao(
    @Query('colaboradorId') colaboradorId?: string,
    @Query('tipoEpiId') tipoEpiId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ): Promise<SuccessResponse> {
    const historico = await this.cancelarDevolucaoUseCase.obterHistoricoCancelamentosDevolucao(
      colaboradorId,
      tipoEpiId,
      dataInicio ? new Date(dataInicio) : undefined,
      dataFim ? new Date(dataFim) : undefined,
    );

    return {
      success: true,
      data: historico,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Buscar ficha por ID',
    description: 'Retorna os detalhes completos de uma ficha de EPI',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID da ficha (UUID ou ID customizado)' })
  @ApiResponse({ status: 200, description: 'Ficha encontrada' })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  async obterFicha(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<SuccessResponse> {
    const ficha = await this.criarFichaEpiUseCase.obterFicha(id);

    return {
      success: true,
      data: ficha,
    };
  }

  @Put(':id/ativar')
  @ApiOperation({ 
    summary: 'Ativar ficha de EPI',
    description: 'Ativa uma ficha que estava inativa ou suspensa',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID da ficha (UUID ou ID customizado)' })
  @ApiResponse({ status: 200, description: 'Ficha ativada com sucesso' })
  @ApiResponse({ status: 400, description: 'Ficha já está ativa' })
  async ativarFicha(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<SuccessResponse> {
    const ficha = await this.criarFichaEpiUseCase.ativarFicha(id);

    return {
      success: true,
      data: ficha,
      message: 'Ficha ativada com sucesso',
    };
  }

  @Put(':id/inativar')
  @ApiOperation({ 
    summary: 'Inativar ficha de EPI',
    description: 'Inativa uma ficha que não possui entregas ativas',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID da ficha (UUID ou ID customizado)' })
  @ApiResponse({ status: 200, description: 'Ficha inativada com sucesso' })
  @ApiResponse({ status: 400, description: 'Ficha possui entregas ativas' })
  async inativarFicha(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<SuccessResponse> {
    const ficha = await this.criarFichaEpiUseCase.inativarFicha(id);

    return {
      success: true,
      data: ficha,
      message: 'Ficha inativada com sucesso',
    };
  }

  @Put(':id/suspender')
  @ApiOperation({ 
    summary: 'Suspender ficha de EPI',
    description: 'Suspende uma ficha temporariamente com motivo opcional',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID da ficha (UUID ou ID customizado)' })
  @ApiResponse({ status: 200, description: 'Ficha suspensa com sucesso' })
  async suspenderFicha(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(AtualizarStatusFichaSchema)) 
    suspenderDto: AtualizarStatusFichaRequest,
  ): Promise<SuccessResponse> {
    const ficha = await this.criarFichaEpiUseCase.suspenderFicha(id, suspenderDto.motivo);

    return {
      success: true,
      data: ficha,
      message: 'Ficha suspensa com sucesso',
    };
  }

  @Post(':id/entregas')
  @ApiOperation({ 
    summary: 'Criar nova entrega',
    description: 'Registra uma nova entrega de EPI para uma ficha específica',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID da ficha (UUID ou ID customizado)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Entrega criada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            dataEntrega: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
            itens: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou estoque insuficiente' })
  async criarEntrega(
    @Param('id', new ZodValidationPipe(IdSchema)) fichaEpiId: string,
    @Body(new ZodValidationPipe(z.object({
      quantidade: z.number().int().positive('Quantidade deve ser positiva'),
      itens: z.array(ItemEntregaSchema),
      assinaturaColaborador: z.string().optional(),
      observacoes: ObservacoesSchema,
    }).refine((data) => data.itens.length === data.quantidade, {
      message: 'Número de itens deve corresponder à quantidade',
    }))) 
    entregaDto: Omit<CriarEntregaRequest, 'fichaEpiId'>,
    @Request() req: any,
  ): Promise<SuccessResponse> {
    const usuarioId = req.user?.id || 'user-temp';

    const entrega = await this.criarEntregaFichaUseCase.execute({
      fichaEpiId,
      quantidade: entregaDto.quantidade,
      itens: entregaDto.itens.map(item => ({
        numeroSerie: item.numeroSerie,
        estoqueItemOrigemId: item.estoqueItemOrigemId!, // Assert not null since schema validates it
      })),
      assinaturaColaborador: entregaDto.assinaturaColaborador,
      observacoes: entregaDto.observacoes,
      usuarioId,
    });

    return {
      success: true,
      data: entrega,
      message: 'Entrega registrada com sucesso',
    };
  }

  @Post('entregas/validar')
  @ApiOperation({ 
    summary: 'Validar se entrega é permitida',
    description: 'Verifica se uma entrega pode ser realizada (ficha ativa, estoque disponível)',
  })
  @ApiResponse({ status: 200, description: 'Validação realizada' })
  async validarEntrega(
    @Body(new ZodValidationPipe(ValidarEntregaSchema)) 
    validarDto: ValidarEntregaRequest,
  ): Promise<SuccessResponse> {
    const validacao = await this.criarEntregaFichaUseCase.validarEntregaPermitida(
      validarDto.fichaEpiId,
      validarDto.quantidade,
    );

    return {
      success: true,
      data: validacao,
    };
  }

  @Get(':id/entregas')
  @ApiOperation({ 
    summary: 'Listar entregas da ficha',
    description: 'Lista todas as entregas realizadas para uma ficha específica',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'ID da ficha (UUID ou ID customizado)' })
  @ApiResponse({ status: 200, description: 'Lista de entregas recuperada' })
  async listarEntregasFicha(
    @Param('id', new ZodValidationPipe(IdSchema)) fichaEpiId: string,
  ): Promise<SuccessResponse> {
    const entregas = await this.criarEntregaFichaUseCase.listarEntregasPorFicha(fichaEpiId);

    return {
      success: true,
      data: entregas,
    };
  }

  @Get('colaborador/:colaboradorId/entregas')
  @ApiOperation({ 
    summary: 'Listar entregas do colaborador',
    description: 'Lista todas as entregas de um colaborador específico',
  })
  @ApiParam({ name: 'colaboradorId', type: 'string', description: 'ID do colaborador (UUID ou ID customizado)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ATIVA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL', 'CANCELADA'] })
  @ApiResponse({ status: 200, description: 'Lista de entregas do colaborador' })
  async listarEntregasColaborador(
    @Param('colaboradorId', new ZodValidationPipe(IdSchema)) colaboradorId: string,
    @Query('status') status?: string,
  ): Promise<SuccessResponse> {
    const entregas = await this.criarEntregaFichaUseCase.listarEntregasColaborador(
      colaboradorId,
      status as any,
    );

    return {
      success: true,
      data: entregas,
    };
  }

  @Get('colaborador/:colaboradorId/posse-atual')
  @ApiOperation({ 
    summary: 'Posse atual do colaborador',
    description: 'Retorna todos os EPIs atualmente em posse do colaborador',
  })
  @ApiParam({ name: 'colaboradorId', type: 'string', description: 'ID do colaborador (UUID ou ID customizado)' })
  @ApiQuery({ name: 'incluirVencidos', required: false, type: Boolean })
  @ApiQuery({ name: 'incluirProximosVencimento', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Posse atual do colaborador' })
  async obterPosseAtual(
    @Param('colaboradorId', new ZodValidationPipe(IdSchema)) colaboradorId: string,
    @Query(new ZodValidationPipe(FiltrosPosseAtualSchema.omit({ colaboradorId: true }))) 
    filtros: Omit<FiltrosPosseAtual, 'colaboradorId'>,
  ): Promise<SuccessResponse> {
    const posse = await this.criarEntregaFichaUseCase.obterPosseAtual(colaboradorId);

    // Aplicar filtros
    let posseFiltered = posse;
    if (!filtros.incluirVencidos) {
      posseFiltered = posseFiltered.filter(item => item.status !== 'VENCIDO');
    }
    if (!filtros.incluirProximosVencimento) {
      posseFiltered = posseFiltered.filter(item => item.status !== 'PROXIMO_VENCIMENTO');
    }

    return {
      success: true,
      data: posseFiltered,
    };
  }

  @Post('entregas/:entregaId/devolucao')
  @ApiOperation({ 
    summary: 'Processar devolução de itens',
    description: 'Processa a devolução de um ou mais itens de uma entrega',
  })
  @ApiParam({ name: 'entregaId', type: 'string', description: 'ID da entrega (UUID ou ID customizado)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Devolução processada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            entregaId: { type: 'string', format: 'uuid' },
            itensDevolucao: { type: 'array' },
            movimentacoesEstoque: { type: 'array' },
            statusEntregaAtualizado: { type: 'string' },
          },
        },
      },
    },
  })
  async processarDevolucao(
    @Param('entregaId', new ZodValidationPipe(IdSchema)) entregaId: string,
    @Body(new ZodValidationPipe(ProcessarDevolucaoSchema.omit({ entregaId: true }))) 
    devolucaoDto: Omit<ProcessarDevolucaoRequest, 'entregaId'>,
    @Request() req: any,
  ): Promise<SuccessResponse> {
    const usuarioId = req.user?.id || 'user-temp';

    const resultado = await this.processarDevolucaoUseCase.execute({
      entregaId,
      itensParaDevolucao: devolucaoDto.itensParaDevolucao.map(item => ({
        itemId: item.itemId,
        motivoDevolucao: item.motivoDevolucao,
        condicaoItem: item.condicaoItem,
      })),
      assinaturaColaborador: devolucaoDto.assinaturaColaborador,
      observacoes: devolucaoDto.observacoes,
      usuarioId,
    });

    return {
      success: true,
      data: resultado,
      message: 'Devolução processada com sucesso',
    };
  }

  @Post('entregas/:entregaId/devolucao/validar')
  @ApiOperation({ 
    summary: 'Validar se devolução é permitida',
    description: 'Verifica se os itens podem ser devolvidos',
  })
  @ApiParam({ name: 'entregaId', type: 'string', description: 'ID da entrega (UUID ou ID customizado)' })
  @ApiResponse({ status: 200, description: 'Validação realizada' })
  async validarDevolucao(
    @Param('entregaId', new ZodValidationPipe(IdSchema)) entregaId: string,
    @Body() body: { itemIds: string[] },
  ): Promise<SuccessResponse> {
    const validacao = await this.processarDevolucaoUseCase.validarDevolucaoPermitida(
      entregaId,
      body.itemIds,
    );

    return {
      success: true,
      data: validacao,
    };
  }

  @Post('entregas/:entregaId/devolucao/cancelar')
  @ApiOperation({ 
    summary: 'Cancelar devolução de itens',
    description: 'Cancela uma devolução recente (até 72 horas) reverterendo o status',
  })
  @ApiParam({ name: 'entregaId', type: 'string', description: 'ID da entrega (UUID ou ID customizado)' })
  @ApiResponse({ status: 200, description: 'Cancelamento de devolução processado' })
  async cancelarDevolucao(
    @Param('entregaId', new ZodValidationPipe(IdSchema)) entregaId: string,
    @Body(new ZodValidationPipe(CancelarDevolucaoSchema.omit({ entregaId: true }))) 
    cancelarDto: Omit<CancelarDevolucaoRequest, 'entregaId'>,
    @Request() req: any,
  ): Promise<SuccessResponse> {
    const usuarioId = req.user?.id || 'user-temp';

    const resultado = await this.cancelarDevolucaoUseCase.execute({
      entregaId,
      itensParaCancelar: cancelarDto.itensParaCancelar,
      motivo: cancelarDto.motivo,
      usuarioId,
    });

    return {
      success: true,
      data: resultado,
      message: 'Cancelamento de devolução processado com sucesso',
    };
  }

  @Get('entregas/:entregaId/devolucao/validar-cancelamento')
  @ApiOperation({ 
    summary: 'Validar cancelamento de devolução',
    description: 'Verifica se uma devolução pode ser cancelada (prazo, status)',
  })
  @ApiParam({ name: 'entregaId', type: 'string', description: 'ID da entrega (UUID ou ID customizado)' })
  @ApiResponse({ status: 200, description: 'Validação de cancelamento realizada' })
  async validarCancelamentoDevolucao(
    @Param('entregaId', new ZodValidationPipe(IdSchema)) entregaId: string,
    @Body() body: { itemIds: string[] },
  ): Promise<SuccessResponse> {
    const validacao = await this.cancelarDevolucaoUseCase.validarCancelamentoDevolucaoPermitido(
      entregaId,
      body.itemIds,
    );

    return {
      success: true,
      data: validacao,
    };
  }
}