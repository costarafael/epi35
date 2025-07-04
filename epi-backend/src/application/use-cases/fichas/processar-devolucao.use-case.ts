import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StatusEntregaItem, StatusEstoqueItem } from '../../../domain/enums';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';
import { ESTOQUE } from '../../../shared/constants/system.constants';
// ✅ OTIMIZAÇÃO: Import tipos do Zod (Single Source of Truth)
import { ProcessarDevolucaoInput, DevolucaoOutput } from '../../../presentation/dto/schemas/ficha-epi.schemas';

/**
 * UC-FICHA-04: Processar Devolução de EPIs
 * 
 * Processa devoluções parciais ou totais de EPIs entregues aos colaboradores.
 * Implementa validação obrigatória de assinatura e controle de condição dos itens.
 * 
 * Regras de Negócio Críticas:
 * - Devolução só permitida para entregas ASSINADAS (validação obrigatória)
 * - Itens em condição DANIFICADO/PERDIDO vão para status QUARENTENA
 * - Itens em condição BOM retornam como DISPONIVEL
 * - Movimentações unitárias para rastreabilidade atômica
 * - Transação garantindo consistência entre entrega e estoque
 * 
 * @example
 * ```typescript
 * const devolucao = await useCase.execute({
 *   entregaId: "entrega-123",
 *   itensParaDevolucao: [
 *     { itemId: "item-1", condicaoItem: "BOM" },
 *     { itemId: "item-2", condicaoItem: "DANIFICADO" }
 *   ]
 * });
 * ```
 */

// ✅ OTIMIZAÇÃO: Interfaces removidas - usando tipos do Zod (Single Source of Truth)
// ProcessarDevolucaoInput e DevolucaoOutput agora vêm de ../../../presentation/dto/schemas/ficha-epi.schemas

@Injectable()
export class ProcessarDevolucaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Executa o processamento de devolução de itens de EPI.
   * 
   * @param input - Dados da devolução incluindo itens e condições
   * @returns Resultado da devolução com movimentações criadas
   * @throws {BusinessError} Quando entrega não assinada ou item não pode ser devolvido
   * @throws {NotFoundError} Quando entrega ou item não encontrado
   */
  async execute(input: ProcessarDevolucaoInput): Promise<DevolucaoOutput> {
    // Validar entrada
    await this.validarInput(input);

    // Buscar entrega com detalhes
    const entregaCompleta = await this.obterEntregaComDetalhes(input.entregaId);

    // Validar assinatura se obrigatória
    await this.validarAssinatura(entregaCompleta, input.assinaturaColaborador);

    // Validar se os itens podem ser devolvidos
    await this.validarItensPodeSemDevolvidos(entregaCompleta, input.itensParaDevolucao as any);

    // Processar devolução em transação
    return await this.prisma.$transaction(async (tx) => {
      // ✅ OTIMIZAÇÃO: Batch operations para eliminar N+1 queries
      
      // 1. Obter detalhes de todos os itens em uma única query
      const itemIds = input.itensParaDevolucao.map(item => item.itemId);
      const itensWithDetails = await tx.entregaItem.findMany({
        where: { id: { in: itemIds } },
        include: {
          estoqueItem: {
            select: { tipoEpiId: true }
          }
        }
      });

      const itensMap = new Map(itensWithDetails.map(item => [item.id, item]));

      // 2. Preparar dados para batch updates
      const itemUpdatesData = input.itensParaDevolucao.map(itemInput => {
        const novoStatus = this.determinarNovoStatusItem(itemInput.condicaoItem);
        return {
          where: { id: itemInput.itemId },
          data: { status: novoStatus },
        };
      });

      // 3. Executar batch updates dos itens
      await Promise.all(
        itemUpdatesData.map(update => 
          tx.entregaItem.update(update)
        )
      );

      // 4. Preparar dados para movimentações e estoque
      const movimentacoesData = [];
      const itensDevolucao = [];
      const movimentacoesEstoque = [];

      for (const itemInput of input.itensParaDevolucao) {
        const item = entregaCompleta.itens.find(i => i.id === itemInput.itemId);
        const itemDetails = itensMap.get(itemInput.itemId);
        const novoStatus = this.determinarNovoStatusItem(itemInput.condicaoItem);

        itensDevolucao.push({
          itemId: item.id,
          tipoEpiId: itemDetails?.estoqueItem?.tipoEpiId || 'N/A',
          numeroSerie: 'N/A',
          lote: 'N/A',
          statusAnterior: item.status as StatusEntregaItem,
          novoStatus,
          motivoDevolucao: itemInput.motivoDevolucao || 'N/A',
          condicaoItem: itemInput.condicaoItem,
        });

        // Criar movimentação de entrada se item não foi perdido
        if (itemInput.condicaoItem !== 'PERDIDO') {
          const statusEstoque = itemInput.condicaoItem === 'DANIFICADO' 
            ? StatusEstoqueItem.AGUARDANDO_INSPECAO 
            : StatusEstoqueItem.DISPONIVEL;

          // Preparar dados da movimentação
          movimentacoesData.push({
            estoqueItemId: item.estoqueItemOrigemId,
            tipoMovimentacao: 'ENTRADA_DEVOLUCAO',
            quantidadeMovida: ESTOQUE.QUANTIDADE_UNITARIA, // ✅ SEMPRE 1 - rastreabilidade unitária preservada
            responsavelId: input.usuarioId,
            entregaId: input.entregaId,
          });


          const tipoEpiId = itemDetails?.estoqueItem?.tipoEpiId;
          movimentacoesEstoque.push({
            id: `temp-${itemInput.itemId}`, // Será atualizado após insert
            tipoEpiId: tipoEpiId || 'N/A',
            quantidade: ESTOQUE.QUANTIDADE_UNITARIA,
            statusEstoque,
          });
        }
      }

      // 5. Criar todas as movimentações em batch
      if (movimentacoesData.length > 0) {
        await tx.movimentacaoEstoque.createMany({
          data: movimentacoesData,
        });
      }

      // 6. Atualizar estoque respeitando a condição de cada item
      for (const itemInput of input.itensParaDevolucao) {
        if (itemInput.condicaoItem !== 'PERDIDO') {
          const itemDetails = itensMap.get(itemInput.itemId);
          const tipoEpiId = itemDetails?.estoqueItem?.tipoEpiId;
          
          if (tipoEpiId) {
            await this.atualizarEstoque(
              entregaCompleta.almoxarifadoId,
              tipoEpiId,
              itemInput.condicaoItem,
              tx,
            );
          }
        }
      }

      // Atualizar status da entrega
      const novoStatusEntrega = await this.calcularNovoStatusEntrega(
        input.entregaId,
        tx,
      );

      await tx.entrega.update({
        where: { id: input.entregaId },
        data: { status: novoStatusEntrega as any },
      });

      return {
        entregaId: input.entregaId,
        itensDevolucao,
        movimentacoesEstoque,
        statusEntregaAtualizado: novoStatusEntrega,
        dataProcessamento: new Date(),
      };
    });
  }

  async validarDevolucaoPermitida(
    entregaId: string,
    itemIds: string[],
  ): Promise<{
    permitida: boolean;
    motivo?: string;
    itensValidos: string[];
    itensInvalidos: { itemId: string; motivo: string }[];
  }> {
    const entrega = await this.obterEntregaComDetalhes(entregaId);

    if (entrega.status === 'CANCELADA') {
      return {
        permitida: false,
        motivo: 'Entrega está cancelada',
        itensValidos: [],
        itensInvalidos: itemIds.map(id => ({ itemId: id, motivo: 'Entrega cancelada' })),
      };
    }

    // VALIDAÇÃO CRÍTICA: Entrega deve estar assinada
    if (entrega.status !== 'ASSINADA') {
      return {
        permitida: false,
        motivo: `Entrega deve estar assinada para permitir devolução. Status atual: ${entrega.status}`,
        itensValidos: [],
        itensInvalidos: itemIds.map(id => ({ 
          itemId: id, 
          motivo: `Entrega não assinada (${entrega.status})` 
        })),
      };
    }

    const itensValidos = [];
    const itensInvalidos = [];

    for (const itemId of itemIds) {
      const item = entrega.itens.find(i => i.id === itemId);
      
      if (!item) {
        itensInvalidos.push({ itemId, motivo: 'Item não encontrado na entrega' });
        continue;
      }

      if (item.status !== 'COM_COLABORADOR') {
        itensInvalidos.push({ 
          itemId, 
          motivo: `Item já está com status ${item.status}` 
        });
        continue;
      }

      itensValidos.push(itemId);
    }

    return {
      permitida: itensValidos.length > 0,
      motivo: itensValidos.length === 0 ? 'Nenhum item válido para devolução' : undefined,
      itensValidos,
      itensInvalidos,
    };
  }

  async obterHistoricoDevolucoes(
    _colaboradorId?: string,
    _tipoEpiId?: string,
    _dataInicio?: Date,
    _dataFim?: Date,
  ): Promise<{
    devolucoes: {
      entregaId: string;
      colaboradorNome: string;
      tipoEpiNome: string;
      dataEntrega: Date;
      dataDevolucao: Date;
      diasUso: number;
      motivoDevolucao?: string;
      condicaoItem: string;
      numeroSerie?: string;
      lote?: string;
    }[];
    estatisticas: {
      totalDevolucoes: number;
      itensEmBomEstado: number;
      itensDanificados: number;
      itensPerdidos: number;
      tempoMedioUso: number;
    };
  }> {
    const where: any = {
      status: 'DEVOLVIDO',
    };

    if (_colaboradorId) {
      where.entrega = { 
        fichaEpi: { 
          colaboradorId: _colaboradorId 
        } 
      };
    }

    // Schema v3.5: tipoEpiId e dataDevolucao foram removidos do schema EntregaItem
    // Filtros por tipo e data precisam ser feitos via relacionamentos

    const itens = await this.prisma.entregaItem.findMany({
      where,
      include: {
        entrega: {
          include: {
            fichaEpi: {
              include: {
                colaborador: {
                  select: { nome: true },
                },
              },
            },
          },
        },
        estoqueItem: {
          include: {
            tipoEpi: {
              select: { nomeEquipamento: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const devolucoes = itens.map(item => {
      const diasUso = 0; // Campo dataDevolucao removido do schema

      return {
        entregaId: item.entregaId,
        colaboradorNome: item.entrega.fichaEpi.colaborador.nome,
        tipoEpiNome: item.estoqueItem.tipoEpi.nomeEquipamento,
        dataEntrega: item.entrega.dataEntrega,
        dataDevolucao: item.createdAt, // Use createdAt as approximation since dataDevolucao was removed
        diasUso,
        motivoDevolucao: 'N/A',
        condicaoItem: this.mapearCondicaoItem(item.status as any),
        numeroSerie: 'N/A',
        lote: 'N/A',
      };
    });

    // Calcular estatísticas
    const totalDevolucoes = devolucoes.length;
    const itensEmBomEstado = devolucoes.filter(d => d.condicaoItem === 'BOM').length;
    const itensDanificados = devolucoes.filter(d => d.condicaoItem === 'DANIFICADO').length;
    const itensPerdidos = devolucoes.filter(d => d.condicaoItem === 'PERDIDO').length;
    
    const tempoMedioUso = devolucoes.length > 0
      ? devolucoes.reduce((sum, d) => sum + d.diasUso, 0) / devolucoes.length
      : 0;

    return {
      devolucoes,
      estatisticas: {
        totalDevolucoes,
        itensEmBomEstado,
        itensDanificados,
        itensPerdidos,
        tempoMedioUso,
      },
    };
  }

  private async validarInput(_input: ProcessarDevolucaoInput): Promise<void> {
    // ✅ OTIMIZAÇÃO: Validações básicas removidas - já validadas pelo Zod schema
    // entregaId obrigatório: validado por IdSchema
    // itensParaDevolucao obrigatório e não vazio: validado por z.array(ItemDevolucaoSchema).min(1)
    // usuarioId obrigatório: validado por IdSchema
    // condicaoItem válidos: validado por z.enum(['BOM', 'DANIFICADO', 'PERDIDO'])
    
    // Apenas validações de negócio específicas que não podem ser feitas no Zod permanecem aqui
  }

  private async obterEntregaComDetalhes(entregaId: string): Promise<any> {
    const entrega = await this.prisma.entrega.findUnique({
      where: { id: entregaId },
      include: {
        itens: true,
        fichaEpi: {
          include: {
            colaborador: {
              select: { nome: true, cpf: true },
            },
          },
        },
        almoxarifado: {
          select: { id: true, nome: true },
        },
      },
    });

    if (!entrega) {
      throw new NotFoundError('Entrega', entregaId);
    }

    return entrega;
  }

  private async validarAssinatura(entrega: any, _assinatura?: string): Promise<void> {
    // UC-FICHA-04 REGRA CRÍTICA: Validação obrigatória de assinatura
    // Conforme especificação oficial: "Uma entrega com status 'PENDENTE_ASSINATURA' é considerada provisória.
    // O sistema deve impor a seguinte regra: **não é permitido processar a devolução (UC-FICHA-04) 
    // de nenhum item pertencente a uma entrega que não esteja com o status** 'ASSINADA'."
    
    if (entrega.status !== 'ASSINADA') {
      throw new BusinessError(
        `Não é possível processar devolução. A entrega deve estar assinada. Status atual: ${entrega.status}`
      );
    }
  }

  private async validarItensPodeSemDevolvidos(
    entrega: any,
    itens: { itemId: string; motivoDevolucao?: string; condicaoItem: 'BOM' | 'DANIFICADO' | 'PERDIDO' }[],
  ): Promise<void> {
    for (const itemInput of itens) {
      const item = entrega.itens.find((i: any) => i.id === itemInput.itemId);
      
      if (!item) {
        throw new BusinessError(`Item ${itemInput.itemId} não encontrado na entrega`);
      }

      if (item.status !== 'COM_COLABORADOR') {
        throw new BusinessError(
          `Item ${itemInput.itemId} não pode ser devolvido. Status atual: ${item.status}`,
        );
      }
    }
  }

  private determinarNovoStatusItem(condicaoItem: string): StatusEntregaItem {
    switch (condicaoItem) {
      case 'BOM':
      case 'DANIFICADO':
      case 'PERDIDO':
        return StatusEntregaItem.DEVOLVIDO;
      default:
        throw new BusinessError(`Condição de item inválida: ${condicaoItem}`);
    }
  }

  private async criarMovimentacaoEntrada(
    entrega: any,
    item: any,
    condicaoItem: string,
    usuarioId: string,
    tx: any,
  ): Promise<any> {
    // Find the correct estoqueItem for this almoxarifado + tipoEpi + status
    const statusEstoque = condicaoItem === 'DANIFICADO' 
      ? 'AGUARDANDO_INSPECAO' 
      : 'DISPONIVEL';

    // Get tipoEpiId from the original entregaItem
    const originalItem = await tx.entregaItem.findUnique({
      where: { id: item.id },
      include: {
        estoqueItem: {
          select: { tipoEpiId: true }
        }
      }
    });

    // Use upsert to ensure the EstoqueItem exists
    const estoqueItem = await tx.estoqueItem.upsert({
      where: {
        almoxarifadoId_tipoEpiId_status: {
          almoxarifadoId: entrega.almoxarifadoId,
          tipoEpiId: originalItem?.estoqueItem.tipoEpiId,
          status: statusEstoque,
        },
      },
      update: {
        quantidade: { increment: ESTOQUE.QUANTIDADE_UNITARIA },
      },
      create: {
        almoxarifadoId: entrega.almoxarifadoId,
        tipoEpiId: originalItem?.estoqueItem.tipoEpiId,
        status: statusEstoque,
        quantidade: ESTOQUE.QUANTIDADE_UNITARIA,
      },
    });

    return await tx.movimentacaoEstoque.create({
      data: {
        estoqueItemId: estoqueItem.id,
        tipoMovimentacao: 'ENTRADA_DEVOLUCAO',
        quantidadeMovida: ESTOQUE.QUANTIDADE_UNITARIA,
        responsavelId: usuarioId,
        entregaId: entrega.id,
      },
    });
  }

  private async atualizarEstoque(
    almoxarifadoId: string,
    tipoEpiId: string,
    condicaoItem: string,
    tx: any,
  ): Promise<void> {
    const statusEstoque = condicaoItem === 'DANIFICADO' 
      ? StatusEstoqueItem.AGUARDANDO_INSPECAO 
      : StatusEstoqueItem.DISPONIVEL;

    // Tentar atualizar estoque existente
    const estoqueAtualizado = await tx.estoqueItem.updateMany({
      where: {
        almoxarifadoId,
        tipoEpiId,
        status: statusEstoque,
      },
      data: {
        quantidade: { increment: ESTOQUE.QUANTIDADE_UNITARIA },
      },
    });

    // Se não existe, criar novo registro de estoque
    if (estoqueAtualizado.count === 0) {
      await tx.estoqueItem.create({
        data: {
          almoxarifadoId,
          tipoEpiId,
          quantidade: ESTOQUE.QUANTIDADE_UNITARIA,
          status: statusEstoque,
        },
      });
    }
  }

  private async calcularNovoStatusEntrega(entregaId: string, tx: any): Promise<string> {
    const itens = await tx.entregaItem.findMany({
      where: { entregaId },
      select: { status: true },
    });

    const itensEntregues = itens.filter((i: any) => i.status === 'COM_COLABORADOR').length;
    const itensDevolvidos = itens.filter((i: any) => i.status === 'DEVOLVIDO').length;

    // Como o schema não tem status específicos para devolução parcial/total,
    // mantemos ASSINADA para entrega com devoluções
    if (itensEntregues === 0) {
      return 'ASSINADA'; // Todos os itens foram devolvidos, mas entrega permanece assinada
    } else if (itensDevolvidos > 0) {
      return 'ASSINADA'; // Devolução parcial, entrega permanece assinada
    } else {
      return 'ASSINADA';
    }
  }

  private mapearCondicaoItem(status: StatusEntregaItem): string {
    switch (status) {
      case StatusEntregaItem.DEVOLVIDO:
        return 'DEVOLVIDO'; // Note: condition detail (BOM/DANIFICADO/PERDIDO) no longer tracked at item level
      case StatusEntregaItem.COM_COLABORADOR:
        return 'EM_POSSE';
      default:
        return 'DESCONHECIDO';
    }
  }
}