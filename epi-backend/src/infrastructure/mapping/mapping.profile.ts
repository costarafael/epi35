import { Injectable } from '@nestjs/common';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { createMap, Mapper, MappingProfile as BaseMappingProfile } from '@automapper/core';

/**
 * ✅ OTIMIZAÇÃO: Mapping Profile
 * 
 * Centraliza todos os mapeamentos entre entidades de domínio e DTOs.
 * Reduz o código boilerplate de mapeamento manual repetitivo.
 * 
 * Padrões implementados:
 * - Entidade → DTO de resposta
 * - DTO de request → Input de use case  
 * - Mapeamentos bidirecionais quando necessário
 */
@Injectable()
export class MappingProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  override get profile(): BaseMappingProfile {
    return (mapper) => {
      // ✅ OTIMIZAÇÃO: Mapeamentos automatizados (a implementar conforme necessário)
      // Entidades → DTOs de resposta serão adicionados conforme demanda
      
      // Exemplo de mapeamento automático:
      // createMap(mapper, EntregaEntity, EntregaResponse);
      // createMap(mapper, FichaEpiEntity, FichaEpiResponse);
      // createMap(mapper, CriarEntregaRequest, CriarEntregaInput);
    };
  }
}