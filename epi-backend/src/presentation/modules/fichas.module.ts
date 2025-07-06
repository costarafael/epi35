import { Module } from '@nestjs/common';
import { ApplicationModule } from '../../application/application.module';
import {
  FichasController,
  EntregasController,
  DevolucoesController,
} from '../controllers/fichas';
import {
  FichaFormatterService,
  EntregaFormatterService,
  DevolucaoFormatterService,
} from '../../shared/formatters';

@Module({
  imports: [ApplicationModule],
  controllers: [
    FichasController,
    EntregasController,
    DevolucoesController,
  ],
  providers: [
    FichaFormatterService,
    EntregaFormatterService,
    DevolucaoFormatterService,
  ],
  exports: [
    FichaFormatterService,
    EntregaFormatterService,
    DevolucaoFormatterService,
  ],
})
export class FichasModule {}