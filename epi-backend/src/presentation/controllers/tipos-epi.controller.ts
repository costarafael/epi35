import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { CriarTipoEpiUseCase } from '../../application/use-cases/fichas/criar-tipo-epi.use-case';
import {
  CriarTipoEpiSchema,
  AtualizarTipoEpiSchema,
  FiltrosTiposEpiSchema,
  AlterarStatusTipoEpiSchema,
  TipoEpiResponseSchema,
  TiposEpiListResponseSchema,
  EstatisticasTiposEpiResponseSchema,
  EstatisticasPorCategoriaResponseSchema,
  CriarTipoEpiRequest,
  AtualizarTipoEpiRequest,
  FiltrosTiposEpi,
  AlterarStatusTipoEpiRequest,
  TipoEpiResponse,
  TiposEpiListResponse,
  EstatisticasTiposEpiResponse,
  EstatisticasPorCategoriaResponse,
  CategoriaEPI,
} from '../dto/schemas/tipos-epi.schemas';
import { SuccessResponse, IdParamSchema } from '../dto/schemas/common.schemas';
import { BusinessError, NotFoundError } from '../../domain/exceptions/business.exception';

@ApiTags('tipos-epi')
@ApiBearerAuth()
@Controller('tipos-epi')
export class TiposEpiController {
  constructor(
    private readonly criarTipoEpiUseCase: CriarTipoEpiUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo tipo de EPI',
    description: 'Cria um novo tipo de EPI no catálogo do sistema',
  })
  @ApiBody({
    description: 'Dados do tipo de EPI a ser criado',
    schema: {
      type: 'object',
      properties: {
        nomeEquipamento: {
          type: 'string',
          example: 'Capacete de Segurança',
          description: 'Nome do equipamento de proteção',
        },
        numeroCa: {
          type: 'string',
          example: 'CA-12345',
          description: 'Número do Certificado de Aprovação',
        },
        categoria: {
          type: 'string',
          enum: [
            'PROTECAO_CABECA',
            'PROTECAO_OLHOS_FACE',
            'PROTECAO_AUDITIVA',
            'PROTECAO_RESPIRATORIA',
            'PROTECAO_MAOS_BRACOS',
            'PROTECAO_PES_PERNAS',
            'PROTECAO_TRONCO',
            'PROTECAO_CORPO_INTEIRO',
            'PROTECAO_QUEDAS',
          ],
          example: 'PROTECAO_CABECA',
        },
        descricao: {
          type: 'string',
          example: 'Capacete de segurança em polietileno',
          description: 'Descrição detalhada do equipamento',
        },
        vidaUtilDias: {
          type: 'number',
          example: 365,
          description: 'Vida útil em dias',
        },
        status: {
          type: 'string',
          enum: ['ATIVO', 'DESCONTINUADO'],
          example: 'ATIVO',
          default: 'ATIVO',
        },
      },
      required: ['nomeEquipamento', 'numeroCa', 'categoria'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tipo de EPI criado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nomeEquipamento: { type: 'string' },
            numeroCa: { type: 'string' },
            categoria: { type: 'string' },
            descricao: { type: 'string', nullable: true },
            vidaUtilDias: { type: 'number', nullable: true },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Número CA já existe' })
  async criarTipoEpi(
    @Body(new ZodValidationPipe(CriarTipoEpiSchema))
    body: CriarTipoEpiRequest,
  ): Promise<TipoEpiResponse> {
    try {
      const tipoEpi = await this.criarTipoEpiUseCase.execute(body as any);

      return {
        success: true,
        data: tipoEpi as any,
        message: 'Tipo de EPI criado com sucesso',
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao criar tipo de EPI');
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Listar tipos de EPI',
    description: 'Lista todos os tipos de EPI com filtros opcionais e paginação',
  })
  @ApiQuery({
    name: 'ativo',
    required: false,
    type: Boolean,
    description: 'Filtrar por status ativo (true) ou inativo (false)',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    enum: [
      'PROTECAO_CABECA',
      'PROTECAO_OLHOS_FACE',
      'PROTECAO_AUDITIVA',
      'PROTECAO_RESPIRATORIA',
      'PROTECAO_MAOS_BRACOS',
      'PROTECAO_PES_PERNAS',
      'PROTECAO_TRONCO',
      'PROTECAO_CORPO_INTEIRO',
      'PROTECAO_QUEDAS',
    ],
    description: 'Filtrar por categoria de proteção',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ATIVO', 'DESCONTINUADO'],
    description: 'Filtrar por status do tipo de EPI',
  })
  @ApiQuery({
    name: 'busca',
    required: false,
    type: String,
    description: 'Buscar por nome do equipamento ou número CA',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (padrão: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 10, máximo: 100)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de tipos de EPI retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  nomeEquipamento: { type: 'string' },
                  numeroCa: { type: 'string' },
                  categoria: { type: 'string' },
                  descricao: { type: 'string', nullable: true },
                  vidaUtilDias: { type: 'number', nullable: true },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
                hasNextPage: { type: 'boolean' },
                hasPreviousPage: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  })
  async listarTiposEpi(
    @Query(new ZodValidationPipe(FiltrosTiposEpiSchema))
    filtros: FiltrosTiposEpi,
  ): Promise<TiposEpiListResponse> {
    try {
      const { page = 1, limit = 10, ativo, busca, categoria } = filtros;

      const tiposEpi = await this.criarTipoEpiUseCase.listarTiposEpi(
        ativo,
        busca,
        categoria as any,
      );

      // Aplicar paginação
      const offset = (page - 1) * limit;
      const paginatedItems = tiposEpi.slice(offset, offset + limit);
      const total = tiposEpi.length;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          items: paginatedItems as any,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao listar tipos de EPI');
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter tipo de EPI por ID',
    description: 'Retorna os detalhes de um tipo de EPI específico',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'ID do tipo de EPI',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tipo de EPI encontrado',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nomeEquipamento: { type: 'string' },
            numeroCa: { type: 'string' },
            categoria: { type: 'string' },
            descricao: { type: 'string', nullable: true },
            vidaUtilDias: { type: 'number', nullable: true },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tipo de EPI não encontrado' })
  async obterTipoEpi(
    @Param(new ZodValidationPipe(IdParamSchema))
    params: { id: string },
  ): Promise<TipoEpiResponse> {
    try {
      const tipoEpi = await this.criarTipoEpiUseCase.obterTipoEpi(params.id);

      if (!tipoEpi) {
        throw new NotFoundError('Tipo de EPI não encontrado');
      }

      return {
        success: true,
        data: tipoEpi as any,
      };
    } catch (error) {
      if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao obter tipo de EPI');
    }
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Atualizar tipo de EPI',
    description: 'Atualiza completamente um tipo de EPI existente',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'ID do tipo de EPI',
  })
  @ApiBody({
    description: 'Dados atualizados do tipo de EPI',
    schema: {
      type: 'object',
      properties: {
        nomeEquipamento: { type: 'string', example: 'Capacete de Segurança Atualizado' },
        numeroCa: { type: 'string', example: 'CA-54321' },
        categoria: { type: 'string', example: 'PROTECAO_CABECA' },
        descricao: { type: 'string', example: 'Descrição atualizada' },
        vidaUtilDias: { type: 'number', example: 730 },
        status: { type: 'string', enum: ['ATIVO', 'DESCONTINUADO'] },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tipo de EPI atualizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nomeEquipamento: { type: 'string' },
            numeroCa: { type: 'string' },
            categoria: { type: 'string' },
            descricao: { type: 'string', nullable: true },
            vidaUtilDias: { type: 'number', nullable: true },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tipo de EPI não encontrado' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Número CA já existe' })
  async atualizarTipoEpi(
    @Param(new ZodValidationPipe(IdParamSchema))
    params: { id: string },
    @Body(new ZodValidationPipe(AtualizarTipoEpiSchema))
    body: AtualizarTipoEpiRequest,
  ): Promise<TipoEpiResponse> {
    try {
      const tipoEpiAtualizado = await this.criarTipoEpiUseCase.atualizarTipoEpi(
        params.id,
        body as any,
      );

      return {
        success: true,
        data: tipoEpiAtualizado as any,
        message: 'Tipo de EPI atualizado com sucesso',
      };
    } catch (error) {
      if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao atualizar tipo de EPI');
    }
  }

  @Patch(':id/ativar')
  @ApiOperation({
    summary: 'Ativar tipo de EPI',
    description: 'Ativa um tipo de EPI descontinuado',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'ID do tipo de EPI',
  })
  @ApiBody({
    required: false,
    description: 'Dados opcionais para ativação',
    schema: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          example: 'Tipo de EPI reativado por necessidade operacional',
          description: 'Motivo da ativação',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tipo de EPI ativado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nomeEquipamento: { type: 'string' },
            numeroCa: { type: 'string' },
            categoria: { type: 'string' },
            descricao: { type: 'string', nullable: true },
            vidaUtilDias: { type: 'number', nullable: true },
            status: { type: 'string', example: 'ATIVO' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tipo de EPI não encontrado' })
  async ativarTipoEpi(
    @Param(new ZodValidationPipe(IdParamSchema))
    params: { id: string },
    @Body(new ZodValidationPipe(AlterarStatusTipoEpiSchema))
    _body: AlterarStatusTipoEpiRequest,
  ): Promise<TipoEpiResponse> {
    try {
      const tipoEpiAtivado = await this.criarTipoEpiUseCase.ativarTipoEpi(params.id);

      return {
        success: true,
        data: tipoEpiAtivado as any,
        message: 'Tipo de EPI ativado com sucesso',
      };
    } catch (error) {
      if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao ativar tipo de EPI');
    }
  }

  @Patch(':id/inativar')
  @ApiOperation({
    summary: 'Inativar tipo de EPI',
    description: 'Inativa um tipo de EPI, descontinuando seu uso',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'ID do tipo de EPI',
  })
  @ApiBody({
    required: false,
    description: 'Dados opcionais para inativação',
    schema: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          example: 'Tipo de EPI descontinuado pelo fabricante',
          description: 'Motivo da inativação',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tipo de EPI inativado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nomeEquipamento: { type: 'string' },
            numeroCa: { type: 'string' },
            categoria: { type: 'string' },
            descricao: { type: 'string', nullable: true },
            vidaUtilDias: { type: 'number', nullable: true },
            status: { type: 'string', example: 'DESCONTINUADO' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tipo de EPI não encontrado' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Não é possível inativar: existe estoque para este tipo de EPI',
  })
  async inativarTipoEpi(
    @Param(new ZodValidationPipe(IdParamSchema))
    params: { id: string },
    @Body(new ZodValidationPipe(AlterarStatusTipoEpiSchema))
    _body: AlterarStatusTipoEpiRequest,
  ): Promise<TipoEpiResponse> {
    try {
      const tipoEpiInativado = await this.criarTipoEpiUseCase.inativarTipoEpi(params.id);

      return {
        success: true,
        data: tipoEpiInativado as any,
        message: 'Tipo de EPI inativado com sucesso',
      };
    } catch (error) {
      if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao inativar tipo de EPI');
    }
  }

  @Get(':id/estatisticas')
  @ApiOperation({
    summary: 'Estatísticas do tipo de EPI',
    description: 'Retorna estatísticas detalhadas sobre um tipo de EPI específico',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'ID do tipo de EPI',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas do tipo de EPI',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalFichas: { type: 'number', example: 0 },
            fichasAtivas: { type: 'number', example: 0 },
            totalEstoque: { type: 'number', example: 25 },
            estoqueDisponivel: { type: 'number', example: 20 },
            totalEntregas: { type: 'number', example: 15 },
            entregasAtivas: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tipo de EPI não encontrado' })
  async obterEstatisticasTipoEpi(
    @Param(new ZodValidationPipe(IdParamSchema))
    params: { id: string },
  ): Promise<EstatisticasTiposEpiResponse> {
    try {
      // Verificar se o tipo de EPI existe
      const tipoEpi = await this.criarTipoEpiUseCase.obterTipoEpi(params.id);
      if (!tipoEpi) {
        throw new NotFoundError('Tipo de EPI não encontrado');
      }

      const estatisticas = await this.criarTipoEpiUseCase.obterEstatisticas(params.id);

      return {
        success: true,
        data: estatisticas,
      };
    } catch (error) {
      if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao obter estatísticas do tipo de EPI');
    }
  }

  @Get('estatisticas/por-categoria')
  @ApiOperation({
    summary: 'Estatísticas por categoria',
    description: 'Retorna estatísticas agrupadas por categoria de EPI',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas por categoria de EPI',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              categoria: { type: 'string', example: 'PROTECAO_CABECA' },
              tiposAtivos: { type: 'number', example: 5 },
              estoqueDisponivel: { type: 'number', example: 120 },
              totalItens: { type: 'number', example: 150 },
            },
          },
        },
      },
    },
  })
  async obterEstatisticasPorCategoria(): Promise<EstatisticasPorCategoriaResponse> {
    try {
      const estatisticas = await this.criarTipoEpiUseCase.obterEstatisticasPorCategoria();

      return {
        success: true,
        data: estatisticas,
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao obter estatísticas por categoria');
    }
  }
}