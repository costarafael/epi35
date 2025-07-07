import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { ProcessarDevolucoesBatchUseCase } from '../../../application/use-cases/devolucoes/processar-devolucoes-batch.use-case';
import {
  ProcessarDevolucoesBatchSchema,
  ProcessarDevolucoesBatch,
  DevolucoesBatchResponse,
} from '../../dto/schemas/ficha-epi.schemas';
import { SuccessResponse } from '../../dto/schemas/common.schemas';

@ApiTags('devolucoes-otimizadas')
@ApiBearerAuth()
@Controller('devolucoes')
export class DevolucoesOtimizadasController {
  constructor(
    private readonly processarDevolucoesBatchUseCase: ProcessarDevolucoesBatchUseCase,
  ) {}

  @Post('process-batch')
  @ApiOperation({ 
    summary: 'Processar devoluções em lote (Frontend Optimized)',
    description: 'Processa múltiplas devoluções simultaneamente com atualização automática de estoque e histórico',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Devoluções processadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            processadas: { type: 'number', description: 'Número de devoluções processadas com sucesso' },
            erros: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Lista de erros encontrados durante o processamento',
            },
            fichasAtualizadas: { 
              type: 'array', 
              items: { type: 'string', format: 'uuid' },
              description: 'IDs das fichas que foram atualizadas',
            },
            estoqueAtualizado: { type: 'boolean', description: 'Indica se o estoque foi atualizado' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async processarDevolucoesBatch(
    @Body(new ZodValidationPipe(ProcessarDevolucoesBatchSchema)) 
    processarDto: ProcessarDevolucoesBatch,
  ): Promise<SuccessResponse> {
    const resultado = await this.processarDevolucoesBatchUseCase.execute(processarDto);

    const message = resultado.erros.length > 0
      ? `${resultado.processadas} devolução(ões) processada(s) com ${resultado.erros.length} erro(s)`
      : `${resultado.processadas} devolução(ões) processada(s) com sucesso`;

    return {
      success: true,
      data: resultado,
      message,
    };
  }
}