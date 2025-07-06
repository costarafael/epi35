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
import { RelatorioDescartesUseCase } from '../../../application/use-cases/queries/relatorio-descartes.use-case';
import {
  RelatorioDescartesFiltersSchema,
  RelatorioDescartesFilters,
} from '../../dto/schemas/relatorio-descartes.schemas';
import { SuccessResponse } from '../../dto/schemas/common.schemas';

@ApiTags('relatorios')
@ApiBearerAuth()
@Controller('relatorios/descartes')
export class RelatorioDescartesController {
  constructor(
    private readonly relatorioDescartesUseCase: RelatorioDescartesUseCase,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Relatório de descartes',
    description: 'Lista todos os descartes de EPIs com filtros avançados e estatísticas',
  })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'tipoEpiId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'contratadaId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'responsavelId', required: false, type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Relatório de descartes gerado com sucesso' })
  async relatorioDescartes(
    @Query(new ZodValidationPipe(RelatorioDescartesFiltersSchema)) 
    filtros: RelatorioDescartesFilters,
  ): Promise<SuccessResponse> {
    const relatorio = await this.relatorioDescartesUseCase.execute(filtros);

    return {
      success: true,
      data: relatorio,
      message: 'Relatório de descartes gerado com sucesso',
    };
  }

  @Get('estatisticas')
  @ApiOperation({ 
    summary: 'Estatísticas de descartes',
    description: 'Retorna estatísticas resumidas sobre descartes dos últimos 30 dias',
  })
  @ApiResponse({ status: 200, description: 'Estatísticas de descartes obtidas com sucesso' })
  async estatisticasDescartes(): Promise<SuccessResponse> {
    const estatisticas = await this.relatorioDescartesUseCase.obterEstatisticasDescarte();

    return {
      success: true,
      data: estatisticas,
      message: 'Estatísticas de descartes obtidas com sucesso',
    };
  }
}