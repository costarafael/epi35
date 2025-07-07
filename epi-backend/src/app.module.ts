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
import { ConfiguracoesController } from './presentation/controllers/configuracoes.controller';
import { UsuariosController } from './presentation/controllers/usuarios.controller';
import { EntregasOtimizadasController } from './presentation/controllers/entregas/entregas-otimizadas.controller';
import { DevolucoesOtimizadasController } from './presentation/controllers/devolucoes/devolucoes-otimizadas.controller';
import { FichasOtimizadasController } from './presentation/controllers/fichas/fichas-otimizadas.controller';

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
    ConfiguracoesController,
    UsuariosController,
    // Novos controllers otimizados para reduzir complexidade do frontend
    EntregasOtimizadasController,
    DevolucoesOtimizadasController,
    FichasOtimizadasController,
    // Os controllers de RelatoriosController e FichasEpiController foram refatorados
    // e agora estão nos módulos RelatoriosModule e FichasModule respectivamente
  ],
  providers: [],
})
export class AppModule {}