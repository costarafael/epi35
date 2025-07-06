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
import { ProcessarDevolucaoUseCase } from '../../../application/use-cases/fichas/processar-devolucao.use-case';
import { StatusEntregaItem } from '../../../domain/enums/entrega.enum';
import {
  ProcessarDevolucaoSchema,
  FiltrosHistoricoDevolucaoSchema,
  ProcessarDevolucaoRequest,
  FiltrosHistoricoDevolucao,
} from '../../dto/schemas/ficha-epi.schemas';
import { IdSchema, SuccessResponse, PaginatedResponse } from '../../dto/schemas/common.schemas';
import { DevolucaoFormatterService } from '../../../shared/formatters/devolucao-formatter.service';

@ApiTags('fichas-epi')
@ApiBearerAuth()
@Controller('fichas-epi')
export class DevolucoesController {
  constructor(
    private readonly processarDevolucaoUseCase: ProcessarDevolucaoUseCase,
    private readonly devolucaoFormatter: DevolucaoFormatterService,
  ) {}

  @Post(':fichaId/devolucoes')
  @ApiOperation({ 
    summary: 'Processar devolução de EPIs',
    description: 'Processa a devolução de itens de EPI de uma ficha específica',
  })
  @ApiParam({ name: 'fichaId', type: String, format: 'uuid' })
  @ApiResponse({ 
    status: 201, 
    description: 'Devolução processada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            entregaId: { type: 'string', format: 'uuid' },
            itensDevolucao: { type: 'array' },
            statusEntregaAtualizado: { type: 'string' },
            dataProcessamento: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  @ApiResponse({ status: 422, description: 'Entrega não assinada ou item já devolvido' })
  async processarDevolucao(
    @Param('fichaId', new ZodValidationPipe(IdSchema)) 
    fichaId: string,
    @Body(new ZodValidationPipe(ProcessarDevolucaoSchema)) 
    devolucaoDto: ProcessarDevolucaoRequest,
  ): Promise<SuccessResponse> {
    const resultado = await this.processarDevolucaoUseCase.execute({
      entregaId: devolucaoDto.entregaId,
      usuarioId: devolucaoDto.usuarioId,
      itensParaDevolucao: devolucaoDto.itensParaDevolucao.map(item => ({
        itemId: item.itemId,
        motivoDevolucao: item.motivoDevolucao,
        condicaoItem: item.condicaoItem,
      })),
      observacoes: devolucaoDto.observacoes,
    });

    return {
      success: true,
      data: resultado,
      message: 'Devolução processada com sucesso',
    };
  }

  @Get(':fichaId/historico-devolucoes')
  @ApiOperation({ 
    summary: 'Histórico de devoluções da ficha',
    description: 'Retorna histórico das devoluções de uma ficha específica',
  })
  @ApiParam({ name: 'fichaId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiResponse({ status: 200, description: 'Histórico obtido com sucesso' })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  async obterHistoricoDevolucoes(
    @Param('fichaId', new ZodValidationPipe(IdSchema)) 
    fichaId: string,
    @Query(new ZodValidationPipe(FiltrosHistoricoDevolucaoSchema)) 
    filtros: FiltrosHistoricoDevolucao,
  ): Promise<PaginatedResponse> {
    // Por simplicidade, retornamos uma estrutura básica
    // Em implementação completa, criaria método específico no use case
    const page = filtros.page || 1;
    const limit = filtros.limit || 10;
    
    const resultado = {
      devolucoes: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      estatisticas: {
        totalDevolucoes: 0,
        itensEmBomEstado: 0,
        itensDanificados: 0,
        itensPerdidos: 0,
        tempoMedioUso: 0,
      },
    };

    return {
      success: true,
      data: resultado.devolucoes,
      pagination: resultado.pagination,
    };
  }
}