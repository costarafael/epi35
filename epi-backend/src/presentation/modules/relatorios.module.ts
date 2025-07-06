import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import {
  DashboardController,
  // RelatorioConformidadeController,
  RelatorioDescartesController,
  RelatorioSaudeController,
  RelatorioMovimentacoesController,
} from '../controllers/relatorios';
import {
  DashboardFormatterService,
  RelatorioFormatterService,
  RelatorioUtilsService,
} from '../../shared/formatters';

@Module({
  imports: [ApplicationModule],
  controllers: [
    DashboardController,
    // RelatorioConformidadeController,
    RelatorioDescartesController,
    RelatorioSaudeController,
    RelatorioMovimentacoesController,
  ],
  providers: [
    DashboardFormatterService,
    RelatorioFormatterService,
    RelatorioUtilsService,
  ],
  exports: [
    DashboardFormatterService,
    RelatorioFormatterService,
    RelatorioUtilsService,
  ],
})
export class RelatoriosModule {}