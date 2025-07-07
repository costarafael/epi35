import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { ObterFichaCompletaUseCase } from '../../../application/use-cases/fichas/obter-ficha-completa.use-case';
import { ListarFichasEnhancedUseCase } from '../../../application/use-cases/fichas/listar-fichas-enhanced.use-case';
import {
  FichaCompleta,
  FichaListEnhanced,
  FichaListQuery,
  FichaListQuerySchema,
} from '../../dto/schemas/ficha-epi.schemas';
import { SuccessResponse, IdSchema } from '../../dto/schemas/common.schemas';

@ApiTags('fichas-otimizadas')
@ApiBearerAuth()
@Controller('fichas-epi')
export class FichasOtimizadasController {
  constructor(
    private readonly obterFichaCompletaUseCase: ObterFichaCompletaUseCase,
    private readonly listarFichasEnhancedUseCase: ListarFichasEnhancedUseCase,
  ) {}

  @Get(':id/complete')
  @ApiOperation({ 
    summary: 'Obter ficha completa otimizada (Frontend Optimized)',
    description: 'Retorna dados completos da ficha EPI com processamento no backend: status calculado, display objects, histórico formatado, colaborador com iniciais e CPF mascarado, equipamentos com status de vencimento calculado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da ficha EPI',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Ficha completa com dados processados pelo backend',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            ficha: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                status: { 
                  type: 'string', 
                  enum: ['ativa', 'inativa', 'vencida', 'pendente_devolucao'],
                  description: 'Status calculado pelo backend'
                },
                statusDisplay: {
                  type: 'object',
                  properties: {
                    cor: { type: 'string', enum: ['green', 'red', 'yellow', 'gray'] },
                    label: { type: 'string', example: 'Ativa' },
                  },
                },
                colaborador: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    nome: { type: 'string' },
                    cpf: { type: 'string', description: 'CPF formatado' },
                    cpfDisplay: { type: 'string', example: '123.456.***-01', description: 'CPF mascarado' },
                    matricula: { type: 'string', nullable: true },
                    cargo: { type: 'string', nullable: true },
                    empresa: { type: 'string', nullable: true },
                    iniciais: { type: 'string', example: 'AB', description: 'Iniciais para avatar' },
                  },
                },
              },
            },
            equipamentosEmPosse: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  nomeEquipamento: { type: 'string' },
                  numeroCA: { type: 'string' },
                  categoria: { type: 'string' },
                  dataEntrega: { type: 'string', format: 'date' },
                  dataLimiteDevolucao: { type: 'string', format: 'date', nullable: true },
                  statusVencimento: { 
                    type: 'string', 
                    enum: ['dentro_prazo', 'vencendo', 'vencido'],
                    description: 'Status calculado pelo backend'
                  },
                  statusVencimentoDisplay: {
                    type: 'object',
                    properties: {
                      texto: { type: 'string', example: 'No prazo' },
                      cor: { type: 'string', enum: ['green', 'yellow', 'red'] },
                      diasRestantes: { type: 'number' },
                      statusDetalhado: { type: 'string', enum: ['dentro_prazo', 'vencendo', 'vencido'] },
                    },
                  },
                  diasParaVencimento: { type: 'number' },
                  podeDevolver: { type: 'boolean' },
                  entregaId: { type: 'string', format: 'uuid' },
                  itemEntregaId: { type: 'string', format: 'uuid' },
                },
              },
            },
            devolucoes: { type: 'array', items: { type: 'object' } },
            entregas: { type: 'array', items: { type: 'object' } },
            historico: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  data: { type: 'string', format: 'date-time' },
                  dataFormatada: { type: 'string', example: '15/01/2024 às 10:30' },
                  tipo: { type: 'string', enum: ['entrega', 'devolucao', 'assinatura', 'cancelamento'] },
                  tipoDisplay: {
                    type: 'object',
                    properties: {
                      label: { type: 'string', example: 'Entrega' },
                      tipo: { type: 'string' },
                      cor: { type: 'string', enum: ['green', 'orange', 'blue', 'red'] },
                    },
                  },
                  acao: { type: 'string' },
                  responsavel: { type: 'string', nullable: true },
                  mudancaStatus: { type: 'string', example: 'Disponível → Com Colaborador', nullable: true },
                  detalhes: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      resumo: { type: 'string', example: '3x Capacete (CA 12345)' },
                      dados: {
                        type: 'object',
                        properties: {
                          quantidade: { type: 'number' },
                          equipamento: { type: 'string' },
                          numeroCA: { type: 'string' },
                          categoria: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            estatisticas: {
              type: 'object',
              properties: {
                totalEpisAtivos: { type: 'number' },
                totalEpisVencidos: { type: 'number' },
                proximoVencimento: { type: 'string', format: 'date', nullable: true },
                diasProximoVencimento: { type: 'number', nullable: true },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  async obterFichaCompleta(
    @Param('id', new ZodValidationPipe(IdSchema)) fichaId: string,
  ): Promise<SuccessResponse> {
    const resultado = await this.obterFichaCompletaUseCase.execute({ fichaId });

    return {
      success: true,
      data: resultado,
      message: 'Ficha completa carregada com sucesso com dados processados pelo backend.',
    };
  }

  @Get('list-enhanced')
  @ApiOperation({ 
    summary: 'Listar fichas otimizada (Frontend Optimized)',
    description: 'Lista fichas com dados pré-processados pelo backend: status calculado, estatísticas por ficha, filtros avançados',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de fichas com dados processados',
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
                  colaborador: {
                    type: 'object',
                    properties: {
                      nome: { type: 'string' },
                      matricula: { type: 'string', nullable: true },
                      cargo: { type: 'string', nullable: true },
                      empresa: { type: 'string', nullable: true },
                    },
                  },
                  status: { 
                    type: 'string', 
                    enum: ['ativa', 'inativa', 'vencida', 'pendente_devolucao'],
                    description: 'Status calculado pelo backend'
                  },
                  statusDisplay: {
                    type: 'object',
                    properties: {
                      cor: { type: 'string', enum: ['green', 'red', 'yellow', 'gray'] },
                      label: { type: 'string' },
                    },
                  },
                  totalEpisAtivos: { type: 'number', description: 'Pré-calculado pelo backend' },
                  totalEpisVencidos: { type: 'number', description: 'Pré-calculado pelo backend' },
                  proximoVencimento: { type: 'string', format: 'date', nullable: true },
                  ultimaAtualizacao: { type: 'string', format: 'date-time' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async listarFichasEnhanced(
    @Query(new ZodValidationPipe(FichaListQuerySchema)) query: FichaListQuery,
  ): Promise<SuccessResponse> {
    const resultado = await this.listarFichasEnhancedUseCase.execute(query);

    return {
      success: true,
      data: resultado,
      message: 'Lista de fichas carregada com dados pré-processados pelo backend.',
    };
  }
}