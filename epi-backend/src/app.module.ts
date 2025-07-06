import { Module } from '@nestjs/common';
import { ConfigModule } from './infrastructure/config/config.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RepositoryModule } from './infrastructure/repositories/repository.module';
import { ApplicationModule } from './application/application.module';
import { RelatoriosModule } from './presentation/modules/relatorios.module';
import { FichasModule } from './presentation/modules/fichas.module';
import { HealthController } from './presentation/controllers/health.controller';
import { ContratadaController } from './presentation/controllers/contratada.controller';
import { EstoqueController } from './presentation/controllers/estoque.controller';
import { NotasMovimentacaoController } from './presentation/controllers/notas-movimentacao.controller';
import { TiposEpiController } from './presentation/controllers/tipos-epi.controller';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RepositoryModule,
    ApplicationModule,
    // Módulos refatorados
    RelatoriosModule,
    FichasModule,
  ],
  controllers: [
    HealthController,
    ContratadaController,
    EstoqueController,
    NotasMovimentacaoController,
    TiposEpiController,
    // Os controllers de RelatoriosController e FichasEpiController foram refatorados
    // e agora estão nos módulos RelatoriosModule e FichasModule respectivamente
  ],
  providers: [],
})
export class AppModule {}