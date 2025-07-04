import { Module } from '@nestjs/common';
import { AutomapperModule } from '@automapper/nestjs';
import { classes } from '@automapper/classes';
import { MappingProfile } from './mapping.profile';

/**
 * ✅ OTIMIZAÇÃO: AutoMapper Module
 * 
 * Configuração do AutoMapper para reduzir mapeamentos manuais repetitivos.
 * Centraliza as configurações de mapeamento entre entidades e DTOs.
 */
@Module({
  imports: [
    AutomapperModule.forRoot({
      strategyInitializer: classes(),
    }),
  ],
  providers: [MappingProfile],
  exports: [AutomapperModule],
})
export class AppAutomapperModule {}