import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import {
  DashboardController,
  // RelatorioConformidadeController,
  RelatorioDescartesController,
  RelatorioSaudeController,
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