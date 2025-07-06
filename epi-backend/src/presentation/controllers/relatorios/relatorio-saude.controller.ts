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
import {
  FiltrosSaudesistemaSchema,
  FiltrosSaudesistema,
} from '../../dto/schemas/relatorios.schemas';
import { SuccessResponse } from '../../dto/schemas/common.schemas';
import { RelatorioFormatterService } from '../../../shared/formatters/relatorio-formatter.service';

@ApiTags('relatorios')
@ApiBearerAuth()
@Controller('relatorios/saude')
export class RelatorioSaudeController {
  constructor(
    private readonly relatorioFormatter: RelatorioFormatterService,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Saúde do sistema',
    description: 'Monitora o status geral do sistema, alertas e performance',
  })
  @ApiQuery({ name: 'incluirAlertas', required: false, type: Boolean })
  @ApiQuery({ name: 'incluirEstatisticas', required: false, type: Boolean })
  @ApiQuery({ name: 'incluirPerformance', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Status do sistema obtido' })
  async obterSaudeSistema(
    @Query(new ZodValidationPipe(FiltrosSaudesistemaSchema)) 
    filtros: FiltrosSaudesistema,
  ): Promise<SuccessResponse> {
    const saudesSistema = this.relatorioFormatter.formatarSaudeSistema({
      incluirAlertas: filtros.incluirAlertas || false,
      incluirEstatisticas: filtros.incluirEstatisticas || false,
      incluirPerformance: filtros.incluirPerformance || false,
    });

    return {
      success: true,
      data: saudesSistema,
    };
  }
}