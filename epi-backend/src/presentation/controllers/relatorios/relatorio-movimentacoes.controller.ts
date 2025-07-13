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
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  FiltrosRelatorioMovimentacaoSchema,
  FiltrosRelatorioMovimentacao,
} from '../../dto/schemas/relatorios.schemas';
import { SuccessResponse } from '../../dto/schemas/common.schemas';
import { RelatorioMovimentacoesEstoqueUseCase } from '../../../application/use-cases/queries/relatorio-movimentacoes-estoque.use-case';

@ApiTags('relatorios')
@ApiBearerAuth()
@Controller('relatorios')
export class RelatorioMovimentacoesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly relatorioMovimentacoesUseCase: RelatorioMovimentacoesEstoqueUseCase,
  ) {}

  @Get('movimentacoes')
  @ApiOperation({ 
    summary: 'Relatório de movimentações',
    description: 'Lista todas as movimentações de estoque com filtros detalhados para auditoria',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid', description: 'Filtrar por almoxarifado' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, format: 'uuid', description: 'Filtrar por tipo de EPI' })
  @ApiQuery({ 
    name: 'tipoMovimentacao', 
    required: false, 
    enum: [
      'ENTRADA_NOTA', 'SAIDA_ENTREGA', 'ENTRADA_DEVOLUCAO', 'SAIDA_TRANSFERENCIA',
      'ENTRADA_TRANSFERENCIA', 'SAIDA_DESCARTE', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO',
      'ESTORNO_ENTRADA_NOTA', 'ESTORNO_SAIDA_ENTREGA', 'ESTORNO_ENTRADA_DEVOLUCAO',
      'ESTORNO_SAIDA_DESCARTE', 'ESTORNO_SAIDA_TRANSFERENCIA', 'ESTORNO_ENTRADA_TRANSFERENCIA',
      'ESTORNO_AJUSTE_POSITIVO', 'ESTORNO_AJUSTE_NEGATIVO'
    ], 
    description: 'Filtrar por tipo de movimentação específico' 
  })
  @ApiQuery({ name: 'usuarioId', required: false, type: String, format: 'uuid', description: 'Filtrar por responsável' })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date', description: 'Data inicial do período' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date', description: 'Data final do período' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10, máx: 100)' })
  @ApiQuery({ name: 'includeDeliveryData', required: false, type: Boolean, description: 'Incluir dados de entrega (entregaId, colaboradorNome)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Relatório de movimentações gerado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            movimentacoes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  data: { type: 'string', format: 'date-time' },
                  almoxarifadoNome: { type: 'string' },
                  tipoEpiNome: { type: 'string' },
                  tipoMovimentacao: { type: 'string' },
                  quantidade: { type: 'number' },
                  usuarioNome: { type: 'string' },
                  observacoes: { type: 'string' },
                  documento: { type: 'string' },
                  entregaId: { type: 'string' },
                  colaboradorNome: { type: 'string' },
                },
              },
            },
            resumo: {
              type: 'object',
              properties: {
                totalMovimentacoes: { type: 'number' },
                totalEntradas: { type: 'number' },
                totalSaidas: { type: 'number' },
                saldoInicialPeriodo: { type: 'number' },
                saldoFinalPeriodo: { type: 'number' },
                variacao: { type: 'number' },
              },
            },
            dataGeracao: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  async relatorioMovimentacoes(
    @Query(new ZodValidationPipe(FiltrosRelatorioMovimentacaoSchema)) 
    filtros: FiltrosRelatorioMovimentacao,
  ): Promise<SuccessResponse> {
    // Use existing use case with proper relationships
    const movimentacoes = await this.relatorioMovimentacoesUseCase.execute({
      almoxarifadoId: filtros.almoxarifadoId,
      tipoEpiId: filtros.tipoEpiId,
      tipoMovimentacao: filtros.tipoMovimentacao,
      responsavelId: filtros.usuarioId,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      limit: Number(filtros.limit),
      offset: (Number(filtros.page) - 1) * Number(filtros.limit),
    });

    // Calcular resumo usando os dados do use case
    const resumoQuery = movimentacoes.reduce((acc, mov) => {
      const existing = acc.find(item => item.tipoMovimentacao === mov.tipoMovimentacao);
      if (existing) {
        existing._count.id += 1;
        existing._sum.quantidadeMovida += mov.quantidadeMovida;
      } else {
        acc.push({
          tipoMovimentacao: mov.tipoMovimentacao,
          _count: { id: 1 },
          _sum: { quantidadeMovida: mov.quantidadeMovida },
        });
      }
      return acc;
    }, [] as Array<{ tipoMovimentacao: string; _count: { id: number }; _sum: { quantidadeMovida: number } }>);

    const relatorio = {
      movimentacoes: movimentacoes.map(mov => {
        const baseResponse = {
          id: mov.id,
          data: mov.dataMovimentacao,
          almoxarifadoNome: mov.estoqueItem?.almoxarifado?.nome || 'N/A',
          tipoEpiNome: mov.estoqueItem?.tipoEpi?.nomeEquipamento || 'N/A',
          tipoMovimentacao: mov.tipoMovimentacao,
          quantidade: mov.quantidadeMovida,
          usuarioNome: mov.responsavel?.nome || 'Sistema',
          observacoes: mov.notaMovimentacao?.observacoes || undefined,
          documento: mov.notaMovimentacao?.numeroDocumento,
        };

        // Include delivery data when requested
        if (filtros.includeDeliveryData) {
          return {
            ...baseResponse,
            entregaId: mov.entrega?.id || null,
            colaboradorNome: mov.entrega?.fichaEpi?.colaborador?.nome || null,
          };
        }

        return baseResponse;
      }),
      resumo: {
        totalMovimentacoes: movimentacoes.length,
        totalEntradas: resumoQuery
          .filter(r => ['ENTRADA_NOTA', 'ENTRADA_DEVOLUCAO', 'ENTRADA_TRANSFERENCIA', 'AJUSTE_POSITIVO'].includes(r.tipoMovimentacao))
          .reduce((sum, r) => sum + (r._sum.quantidadeMovida || 0), 0),
        totalSaidas: resumoQuery
          .filter(r => ['SAIDA_ENTREGA', 'SAIDA_TRANSFERENCIA', 'SAIDA_DESCARTE', 'AJUSTE_NEGATIVO'].includes(r.tipoMovimentacao))
          .reduce((sum, r) => sum + (r._sum.quantidadeMovida || 0), 0),
        saldoInicialPeriodo: 0,
        saldoFinalPeriodo: 0,
        variacao: 0,
      },
      dataGeracao: new Date(),
    };

    return {
      success: true,
      data: relatorio,
      message: 'Relatório de movimentações gerado com sucesso',
    };
  }
}