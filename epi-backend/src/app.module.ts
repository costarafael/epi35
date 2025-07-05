import { Module } from '@nestjs/common';
import { ConfigModule } from './infrastructure/config/config.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RepositoryModule } from './infrastructure/repositories/repository.module';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RepositoryModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}