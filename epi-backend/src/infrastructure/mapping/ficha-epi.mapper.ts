import { FichaEpiOutput } from '../../presentation/dto/schemas/ficha-epi.schemas';
import { StatusFichaEPI } from '../../domain/enums';
import { mapTo } from './mapper.util';

/**
 * ✅ OTIMIZAÇÃO: FichaEPI Mapper
 * 
 * Centraliza mapeamentos de ficha EPI eliminando código duplicado.
 * Type-safe e performático.
 */

// Mapper para ficha EPI (Prisma → DTO)
export const mapFichaEpiToOutput = (ficha: any): FichaEpiOutput => mapTo(ficha, (source) => ({
  id: source.id,
  colaboradorId: source.colaboradorId,
  status: source.status as StatusFichaEPI,
  dataEmissao: source.createdAt, // Usando createdAt como dataEmissao
  createdAt: source.createdAt,
  colaborador: {
    nome: source.colaborador?.nome || 'N/A',
    cpf: source.colaborador?.cpf || 'N/A',
    matricula: source.colaborador?.matricula || undefined,
  },
}));