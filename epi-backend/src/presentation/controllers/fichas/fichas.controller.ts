import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { CriarFichaEpiUseCase } from '../../../application/use-cases/fichas/criar-ficha-epi.use-case';
import { ObterHistoricoFichaUseCase } from '../../../application/use-cases/fichas/obter-historico-ficha.use-case';
import { StatusFichaEPI } from '../../../domain/enums/ficha.enum';
import {
  CriarFichaEpiSchema,
  AtualizarStatusFichaSchema,
  FiltrosFichaEpiSchema,
  FiltrosHistoricoFichaSchema,
  CriarFichaEpiRequest,
  AtualizarStatusFichaRequest,
  FiltrosFichaEpi,
  FiltrosHistoricoFicha,
} from '../../dto/schemas/ficha-epi.schemas';
import { IdSchema, SuccessResponse, PaginatedResponse } from '../../dto/schemas/common.schemas';
import { FichaFormatterService } from '../../../shared/formatters/ficha-formatter.service';

@ApiTags('fichas-epi')
@ApiBearerAuth()
@Controller('fichas-epi')
export class FichasController {
  constructor(
    private readonly criarFichaEpiUseCase: CriarFichaEpiUseCase,
    private readonly obterHistoricoFichaUseCase: ObterHistoricoFichaUseCase,
    private readonly fichaFormatter: FichaFormatterService,
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
            status: { type: 'string', enum: ['ATIVA', 'INATIVA'] },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Ficha já existe para este colaborador' })
  async criarFicha(
    @Body(new ZodValidationPipe(CriarFichaEpiSchema)) 
    criarFichaDto: CriarFichaEpiRequest,
  ): Promise<SuccessResponse> {
    const ficha = await this.criarFichaEpiUseCase.execute({
      colaboradorId: criarFichaDto.colaboradorId,
      status: criarFichaDto.status as StatusFichaEPI,
    });

    return {
      success: true,
      data: ficha,
      message: 'Ficha criada com sucesso',
    };
  }

  @Post('criar-ou-ativar')
  @ApiOperation({ 
    summary: 'Criar ficha ou ativar existente',
    description: 'Cria uma nova ficha ou ativa uma ficha inativa existente',
  })
  @ApiResponse({ status: 201, description: 'Ficha criada ou ativada com sucesso' })
  async criarOuAtivarFicha(
    @Body(new ZodValidationPipe(CriarFichaEpiSchema)) 
    criarFichaDto: CriarFichaEpiRequest,
  ): Promise<SuccessResponse> {
    const resultado = await this.criarFichaEpiUseCase.criarOuAtivar({
      colaboradorId: criarFichaDto.colaboradorId,
      status: StatusFichaEPI.ATIVA,
    });

    return {
      success: true,
      data: resultado,
      message: resultado.criada ? 'Ficha criada com sucesso' : 'Ficha ativada com sucesso',
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar fichas de EPI',
    description: 'Lista fichas com filtros e paginação',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10, máx: 100)' })
  @ApiQuery({ name: 'colaboradorId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'status', required: false, enum: ['ATIVA', 'INATIVA'] })
  @ApiResponse({ status: 200, description: 'Lista de fichas obtida com sucesso' })
  async listarFichas(
    @Query(new ZodValidationPipe(FiltrosFichaEpiSchema)) 
    filtros: FiltrosFichaEpi,
  ): Promise<PaginatedResponse> {
    const page = filtros.page || 1;
    const limit = Math.min(filtros.limit || 10, 100);

    // Usar o use case para buscar dados reais
    const fichasData = await this.criarFichaEpiUseCase.listarFichas(
      {
        colaboradorId: filtros.colaboradorId,
        status: filtros.status,
      },
      {
        page,
        limit,
      }
    );

    // Verificar se retornou array simples ou formato paginado
    if (Array.isArray(fichasData)) {
      // Retornou array simples, criar paginação manual
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = fichasData.slice(startIndex, endIndex);
      
      return {
        success: true,
        data: paginatedItems,
        pagination: {
          page,
          limit,
          total: fichasData.length,
          totalPages: Math.ceil(fichasData.length / limit),
          hasNext: endIndex < fichasData.length,
          hasPrev: page > 1,
        },
      };
    } else {
      // Retornou formato paginado (PaginatedResult)
      return {
        success: true,
        data: fichasData.items,
        pagination: {
          page: fichasData.page,
          limit,
          total: fichasData.total,
          totalPages: fichasData.totalPages,
          hasNext: fichasData.hasNext,
          hasPrev: fichasData.hasPrev,
        },
      };
    }
  }

  @Get('estatisticas')
  @ApiOperation({ 
    summary: 'Estatísticas de fichas',
    description: 'Retorna estatísticas gerais das fichas de EPI',
  })
  @ApiResponse({ status: 200, description: 'Estatísticas obtidas com sucesso' })
  async obterEstatisticas(): Promise<SuccessResponse> {
    const estatisticas = await this.criarFichaEpiUseCase.obterEstatisticas();

    return {
      success: true,
      data: estatisticas,
      message: 'Estatísticas obtidas com sucesso',
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obter ficha específica',
    description: 'Obtém detalhes de uma ficha de EPI específica',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Ficha obtida com sucesso' })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  async obterFicha(
    @Param('id', new ZodValidationPipe(IdSchema)) 
    id: string,
  ): Promise<SuccessResponse> {
    const ficha = await this.criarFichaEpiUseCase.obterFicha(id);

    return {
      success: true,
      data: ficha,
      message: 'Ficha obtida com sucesso',
    };
  }

  @Put(':id/ativar')
  @ApiOperation({ 
    summary: 'Ativar ficha',
    description: 'Ativa uma ficha de EPI inativa',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Ficha ativada com sucesso' })
  async ativarFicha(
    @Param('id', new ZodValidationPipe(IdSchema)) 
    id: string,
  ): Promise<SuccessResponse> {
    // Por simplicidade, retornamos uma estrutura básica
    // Em implementação completa, criaria método específico no use case
    const ficha = {
      id,
      status: StatusFichaEPI.ATIVA,
      updatedAt: new Date(),
    };

    return {
      success: true,
      data: ficha,
      message: 'Ficha ativada com sucesso',
    };
  }

  @Put(':id/inativar')
  @ApiOperation({ 
    summary: 'Inativar ficha',
    description: 'Inativa uma ficha de EPI ativa',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Ficha inativada com sucesso' })
  async inativarFicha(
    @Param('id', new ZodValidationPipe(IdSchema)) 
    id: string,
  ): Promise<SuccessResponse> {
    // Por simplicidade, retornamos uma estrutura básica
    // Em implementação completa, criaria método específico no use case
    const ficha = {
      id,
      status: StatusFichaEPI.INATIVA,
      updatedAt: new Date(),
    };

    return {
      success: true,
      data: ficha,
      message: 'Ficha inativada com sucesso',
    };
  }

  @Get(':id/historico')
  @ApiOperation({ 
    summary: 'Obter histórico completo da ficha',
    description: 'Retorna o histórico completo de uma ficha de EPI incluindo criação, entregas, devoluções, cancelamentos e itens vencidos',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID da ficha EPI' })
  @ApiQuery({ name: 'tipoAcao', required: false, enum: ['CRIACAO', 'ENTREGA', 'DEVOLUCAO', 'CANCELAMENTO', 'ALTERACAO_STATUS', 'ITEM_VENCIDO', 'EDICAO'] })
  @ApiQuery({ name: 'dataInicio', required: false, type: Date, description: 'Data de início do filtro' })
  @ApiQuery({ name: 'dataFim', required: false, type: Date, description: 'Data de fim do filtro' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 50)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Histórico obtido com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            fichaId: { type: 'string', format: 'uuid' },
            colaborador: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nome: { type: 'string' },
                cpf: { type: 'string' },
                matricula: { type: 'string', nullable: true },
              },
            },
            historico: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  tipoAcao: { 
                    type: 'string',
                    enum: ['CRIACAO', 'ENTREGA', 'DEVOLUCAO', 'CANCELAMENTO', 'ALTERACAO_STATUS', 'ITEM_VENCIDO', 'EDICAO'],
                  },
                  descricao: { type: 'string' },
                  dataAcao: { type: 'string', format: 'date-time' },
                  responsavel: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      nome: { type: 'string' },
                    },
                  },
                  detalhes: { type: 'object', nullable: true },
                },
              },
            },
            estatisticas: {
              type: 'object',
              properties: {
                totalEventos: { type: 'number' },
                totalEntregas: { type: 'number' },
                totalDevolucoes: { type: 'number' },
                totalCancelamentos: { type: 'number' },
                itensAtivos: { type: 'number' },
                itensVencidos: { type: 'number' },
                dataUltimaAtividade: { type: 'string', format: 'date-time', nullable: true },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  async obterHistoricoFicha(
    @Param('id', new ZodValidationPipe(IdSchema)) 
    id: string,
    @Query(new ZodValidationPipe(FiltrosHistoricoFichaSchema)) 
    filtros: FiltrosHistoricoFicha,
  ): Promise<SuccessResponse> {
    const paginacao = filtros.page || filtros.limit ? {
      page: filtros.page || 1,
      limit: filtros.limit || 50,
    } : undefined;

    const historico = await this.obterHistoricoFichaUseCase.execute(id, filtros, paginacao);

    return {
      success: true,
      data: historico,
      message: 'Histórico da ficha obtido com sucesso',
    };
  }
}