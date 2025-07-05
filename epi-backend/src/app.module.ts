import { Module } from '@nestjs/common';
import { ConfigModule } from './infrastructure/config/config.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RepositoryModule } from './infrastructure/repositories/repository.module';
import { HealthController } from './presentation/controllers/health.controller';
import { ContratadaController } from './presentation/controllers/contratada.controller';
import { EstoqueController } from './presentation/controllers/estoque.controller';
import { FichasEpiController } from './presentation/controllers/fichas-epi.controller';
import { NotasMovimentacaoController } from './presentation/controllers/notas-movimentacao.controller';
import { RelatoriosController } from './presentation/controllers/relatorios.controller';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RepositoryModule,
  ],
  controllers: [
    HealthController,
    ContratadaController,
    EstoqueController,
    FichasEpiController,
    NotasMovimentacaoController,
    RelatoriosController,
  ],
  providers: [],
})
export class AppModule {}