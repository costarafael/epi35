import { EntregaOutput, ItemEntregaOutput } from '../../presentation/dto/schemas/ficha-epi.schemas';
import { StatusEntrega, StatusEntregaItem } from '../../domain/enums';
import { mapTo, mapArrayTo } from './mapper.util';

/**
 * ✅ OTIMIZAÇÃO: Entrega Mapper
 * 
 * Centraliza mapeamentos de entrega eliminando código duplicado.
 * Type-safe e performático.
 */

// Mapper para item de entrega (Prisma → DTO)
export const mapItemEntregaToOutput = (item: any): ItemEntregaOutput => mapTo(item, (source) => ({
  id: source.id,
  tipoEpiId: source.estoqueItem?.tipoEpiId || 'N/A',
  quantidadeEntregue: source.quantidadeEntregue || 1,
  numeroSerie: source.numeroSerie || undefined,
  estoqueItemOrigemId: source.estoqueItemOrigemId || undefined,
  lote: undefined, // Campo removido do schema v3.5
  dataFabricacao: undefined, // Campo removido do schema v3.5
  dataLimiteDevolucao: source.dataLimiteDevolucao || undefined,
  status: source.status as StatusEntregaItem,
}));

// Mapper para entrega completa (Prisma → DTO)
export const mapEntregaToOutput = (entrega: any): EntregaOutput => mapTo(entrega, (source) => ({
  id: source.id,
  fichaEpiId: source.fichaEpiId,
  colaboradorId: source.fichaEpi?.colaboradorId || source.colaboradorId,
  dataEntrega: source.dataEntrega,
  assinaturaColaborador: source.assinaturaColaborador || undefined,
  observacoes: source.observacoes || undefined,
  status: source.status as StatusEntrega,
  itens: mapArrayTo(source.itens || [], mapItemEntregaToOutput),
  colaborador: {
    nome: source.fichaEpi?.colaborador?.nome || 'N/A',
    cpf: source.fichaEpi?.colaborador?.cpf || 'N/A',
    matricula: source.fichaEpi?.colaborador?.matricula || undefined,
  },
  tipoEpi: {
    nome: source.itens?.[0]?.estoqueItem?.tipoEpi?.nomeEquipamento || 'N/A',
    codigo: source.itens?.[0]?.estoqueItem?.tipoEpi?.numeroCa || 'N/A',
    validadeMeses: source.itens?.[0]?.estoqueItem?.tipoEpi?.vidaUtilDias ? 
      Math.round(source.itens[0].estoqueItem.tipoEpi.vidaUtilDias / 30) : undefined,
    exigeAssinaturaEntrega: source.itens?.[0]?.estoqueItem?.tipoEpi?.exigeAssinaturaEntrega || false,
  },
  almoxarifado: {
    nome: source.almoxarifado?.nome || 'N/A',
    codigo: source.almoxarifado?.codigo || 'N/A',
  },
}));