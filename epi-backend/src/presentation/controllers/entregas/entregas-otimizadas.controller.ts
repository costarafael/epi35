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
import { CriarEntregaCompletaUseCase } from '../../../application/use-cases/entregas/criar-entrega-completa.use-case';
import {
  CriarEntregaCompletaSchema,
  CriarEntregaCompleta,
  EntregaCompletaResponse,
} from '../../dto/schemas/ficha-epi.schemas';
import { SuccessResponse } from '../../dto/schemas/common.schemas';

@ApiTags('entregas-otimizadas')
@ApiBearerAuth()
@Controller('entregas')
export class EntregasOtimizadasController {
  constructor(
    private readonly criarEntregaCompletaUseCase: CriarEntregaCompletaUseCase,
  ) {}

  @Post('create-complete')
  @ApiOperation({ 
    summary: 'Criar entrega completa otimizada (Frontend Optimized)',
    description: 'Cria uma entrega com processamento completo no backend: expande quantidades em itens individuais, gera IDs únicos, calcula datas de vencimento e atualiza estoque automaticamente',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Entrega criada com sucesso com itens individuais',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            entregaId: { type: 'string', format: 'uuid' },
            itensIndividuais: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid', description: 'ID individual gerado pelo backend' },
                  nomeEquipamento: { type: 'string' },
                  numeroCA: { type: 'string' },
                  dataLimiteDevolucao: { type: 'string', format: 'date', nullable: true, description: 'Calculado pelo backend' },
                },
              },
            },
            totalItens: { type: 'number', description: 'Total de itens individuais criados' },
            statusEntrega: { 
              type: 'string', 
              enum: ['pendente_assinatura', 'assinada', 'cancelada'],
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou estoque insuficiente' })
  @ApiResponse({ status: 404, description: 'Ficha ou responsável não encontrado' })
  async criarEntregaCompleta(
    @Body(new ZodValidationPipe(CriarEntregaCompletaSchema)) 
    criarEntregaDto: CriarEntregaCompleta,
  ): Promise<SuccessResponse> {
    const resultado = await this.criarEntregaCompletaUseCase.execute(criarEntregaDto);

    return {
      success: true,
      data: resultado,
      message: `Entrega criada com sucesso. ${resultado.totalItens} item(s) individual(is) de EPI entregue(s).`,
    };
  }
}