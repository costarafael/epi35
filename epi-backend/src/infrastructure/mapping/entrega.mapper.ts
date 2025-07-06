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
export const mapItemEntregaToOutput = (item: any): ItemEntregaOutput => {
  // 🔍 DEBUG: Log detalhado de cada item individual
  console.log('🔍 [MAPPER ITEM] Mapeando item individual:', {
    itemId: item.id,
    estoqueItemOrigemId: item.estoqueItemOrigemId,
    tipoEpiId: item.estoqueItem?.tipoEpiId,
    tipoEpiNome: item.estoqueItem?.tipoEpi?.nomeEquipamento,
    quantidadeEntregue: item.quantidadeEntregue,
  });

  return mapTo(item, (source) => ({
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
};

// Mapper para entrega completa (Prisma → DTO)
export const mapEntregaToOutput = (entrega: any): EntregaOutput => {
  // 🔍 DEBUG: Log dos itens sendo mapeados
  console.log('🔍 [MAPPER] Mapeando entrega:', {
    entregaId: entrega.id,
    totalItens: entrega.itens?.length || 0,
    itensDetalhes: entrega.itens?.map((item: any, index: number) => ({
      index,
      itemId: item.id,
      estoqueItemId: item.estoqueItemOrigemId,
      tipoEpiId: item.estoqueItem?.tipoEpiId,
      nomeEquipamento: item.estoqueItem?.tipoEpi?.nomeEquipamento,
    })) || [],
  });

  // Para entregas com múltiplos tipos de EPI, agregamos a informação
  const tiposUnicos = new Set();
  const nomesEquipamentos: string[] = [];
  
  if (entrega.itens && entrega.itens.length > 0) {
    entrega.itens.forEach((item: any) => {
      const tipoEpiId = item.estoqueItem?.tipoEpiId;
      const nomeEquipamento = item.estoqueItem?.tipoEpi?.nomeEquipamento;
      
      if (tipoEpiId && !tiposUnicos.has(tipoEpiId)) {
        tiposUnicos.add(tipoEpiId);
        if (nomeEquipamento) {
          nomesEquipamentos.push(nomeEquipamento);
        }
      }
    });
  }

  // 🔍 DEBUG: Log dos tipos únicos encontrados
  console.log('🔍 [MAPPER] Tipos únicos encontrados:', {
    totalTiposUnicos: tiposUnicos.size,
    nomesEquipamentos,
  });

  // Usar o primeiro item para campos que precisam de um valor único
  const primeiroItem = entrega.itens?.[0];

  return mapTo(entrega, (source) => ({
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
    // ✅ CORREÇÃO: Para múltiplos tipos, agregamos os nomes
    tipoEpi: {
      nome: nomesEquipamentos.length > 1 
        ? `Múltiplos EPIs (${nomesEquipamentos.join(', ')})` 
        : (primeiroItem?.estoqueItem?.tipoEpi?.nomeEquipamento || 'N/A'),
      codigo: primeiroItem?.estoqueItem?.tipoEpi?.numeroCa || 'N/A',
      categoria: primeiroItem?.estoqueItem?.tipoEpi?.categoria || 'PROTECAO_CABECA',
      validadeMeses: primeiroItem?.estoqueItem?.tipoEpi?.vidaUtilDias ? 
        Math.round(primeiroItem.estoqueItem.tipoEpi.vidaUtilDias / 30) : undefined,
    },
    almoxarifado: {
      nome: source.almoxarifado?.nome || 'N/A',
      codigo: 'N/A', // Campo código não existe na entidade almoxarifado
    },
  }));
};