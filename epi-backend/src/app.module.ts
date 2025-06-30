import { Module } from '@nestjs/common';
import { ConfigModule } from './infrastructure/config/config.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RepositoryModule } from './infrastructure/repositories/repository.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RepositoryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}