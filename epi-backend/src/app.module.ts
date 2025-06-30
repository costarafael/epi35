import { Module } from '@nestjs/common';
import { ConfigModule } from './infrastructure/config/config.module';
import { DatabaseModule } from './infrastructure/database/database.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}