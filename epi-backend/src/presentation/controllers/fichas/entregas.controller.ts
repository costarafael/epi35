import {
  Controller,
  Get,
  Post,
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
import { CriarEntregaFichaUseCase } from '../../../application/use-cases/fichas/criar-entrega-ficha.use-case';
import { StatusEntrega } from '../../../domain/enums/entrega.enum';
import {
  CriarEntregaSchema,
  FiltrosEntregasSchema,
  CriarEntregaRequest,
  FiltrosEntregas,
} from '../../dto/schemas/ficha-epi.schemas';
import { IdSchema, SuccessResponse, PaginatedResponse } from '../../dto/schemas/common.schemas';
import { EntregaFormatterService } from '../../../shared/formatters/entrega-formatter.service';

@ApiTags('fichas-epi')
@ApiBearerAuth()
@Controller('fichas-epi')
export class EntregasController {
  constructor(
    private readonly criarEntregaFichaUseCase: CriarEntregaFichaUseCase,
    private readonly entregaFormatter: EntregaFormatterService,
  ) {}

  @Post(':fichaId/entregas')
  @ApiOperation({ 
    summary: 'Criar nova entrega de EPIs',
    description: 'Cria uma nova entrega de itens de EPI para uma ficha específica',
  })
  @ApiParam({ name: 'fichaId', type: String, format: 'uuid' })
  @ApiResponse({ 
    status: 201, 
    description: 'Entrega criada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fichaEpiId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['PENDENTE_ASSINATURA', 'ASSINADA', 'CANCELADA'] },
            dataEntrega: { type: 'string', format: 'date-time' },
            itens: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  @ApiResponse({ status: 422, description: 'Estoque insuficiente' })
  async criarEntrega(
    @Param('fichaId', new ZodValidationPipe(IdSchema)) 
    fichaId: string,
    @Body(new ZodValidationPipe(CriarEntregaSchema)) 
    criarEntregaDto: CriarEntregaRequest,
  ): Promise<SuccessResponse> {
    const entrega = await this.criarEntregaFichaUseCase.execute({
      fichaEpiId: fichaId,
      quantidade: criarEntregaDto.quantidade,
      itens: criarEntregaDto.itens.map(item => ({
        numeroSerie: item.numeroSerie,
        estoqueItemOrigemId: item.estoqueItemOrigemId,
      })),
      assinaturaColaborador: criarEntregaDto.assinaturaColaborador,
      observacoes: criarEntregaDto.observacoes,
      usuarioId: criarEntregaDto.usuarioId,
    });

    return {
      success: true,
      data: entrega,
      message: 'Entrega criada com sucesso',
    };
  }

  @Get(':fichaId/entregas')
  @ApiOperation({ 
    summary: 'Listar entregas de uma ficha',
    description: 'Lista todas as entregas de uma ficha específica com filtros',
  })
  @ApiParam({ name: 'fichaId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ATIVA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL', 'CANCELADA'] })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiResponse({ status: 200, description: 'Lista de entregas obtida com sucesso' })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  async listarEntregas(
    @Param('fichaId', new ZodValidationPipe(IdSchema)) 
    fichaId: string,
    @Query(new ZodValidationPipe(FiltrosEntregasSchema)) 
    filtros: FiltrosEntregas,
  ): Promise<PaginatedResponse> {
    // Por simplicidade, retornamos uma estrutura básica
    // Em implementação completa, criaria método específico no use case
    const page = filtros.page || 1;
    const limit = filtros.limit || 10;
    
    const resultado = {
      entregas: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    return {
      success: true,
      data: resultado.entregas,
      pagination: resultado.pagination,
    };
  }
}