import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StatusEntregaItem } from '../../../domain/enums';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';

export interface CancelarDevolucaoInput {
  entregaId: string;
  itensParaCancelar: string[]; // IDs dos itens que terão a devolução cancelada
  motivo: string;
  usuarioId: string;
}

export interface CancelamentoDevolucaoOutput {
  entregaId: string;
  itensCancelados: {
    itemId: string;
    tipoEpiId: string;
    statusAnterior: StatusEntregaItem;
    novoStatus: StatusEntregaItem;
    numeroSerie?: string;
    lote?: string;
  }[];
  movimentacoesEstorno: {
    id: string;
    tipoEpiId: string;
    quantidade: number;
  }[];
  statusEntregaAtualizado: string;
  dataCancelamento: Date;
}

@Injectable()
export class CancelarDevolucaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CancelarDevolucaoInput): Promise<CancelamentoDevolucaoOutput> {
    // Validar entrada
    this.validarInput(input);

    // Buscar entrega com detalhes
    const entregaCompleta = await this.obterEntregaComDetalhes(input.entregaId);

    // Validar se os itens podem ter a devolução cancelada
    await this.validarItensPodeTerDevolucaoCancelada(entregaCompleta, input.itensParaCancelar);

    // Cancelar devolução em transação
    return await this.prisma.$transaction(async (tx) => {
      const itensCancelados = [];
      const movimentacoesEstorno = [];

      // Processar cada item
      for (const itemId of input.itensParaCancelar) {
        const item = entregaCompleta.itens.find((i: any) => i.id === itemId);
        
        // Registrar histórico antes da alteração
        await this.registrarHistoricoCancelamento(
          entregaCompleta,
          item,
          input,
          tx,
        );

        // Reverter status do item para ENTREGUE
        const statusAnterior = item.status as StatusEntregaItem;
        
        await tx.entregaItem.update({
          where: { id: itemId },
          data: {
            status: 'ENTREGUE',
            dataDevolucao: null,
            motivoDevolucao: null,
          },
        });

        itensCancelados.push({
          itemId: item.id,
          tipoEpiId: item.tipoEpiId,
          statusAnterior,
          novoStatus: StatusEntregaItem.ENTREGUE,
          numeroSerie: item.numeroSerie,
          lote: item.lote,
        });

        // Estornar movimentação de entrada (se houve)
        if (statusAnterior !== StatusEntregaItem.PERDIDO) {
          const estorno = await this.estornarMovimentacaoEntrada(
            entregaCompleta,
            item,
            input.usuarioId,
            tx,
          );

          if (estorno) {
            movimentacoesEstorno.push({
              id: estorno.id,
              tipoEpiId: item.tipoEpiId,
              quantidade: 1,
            });

            // Remover do estoque
            await this.removerDoEstoque(
              entregaCompleta.fichaEpi.almoxarifadoId,
              item.tipoEpiId,
              statusAnterior,
              tx,
            );
          }
        }
      }

      // Recalcular status da entrega
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
        itensCancelados,
        movimentacoesEstorno,
        statusEntregaAtualizado: novoStatusEntrega,
        dataCancelamento: new Date(),
      };
    });
  }

  async validarCancelamentoDevolucaoPermitido(
    entregaId: string,
    itemIds: string[],
  ): Promise<{
    permitido: boolean;
    motivo?: string;
    itensValidos: string[];
    itensInvalidos: { itemId: string; motivo: string }[];
    prazoPendente: boolean;
  }> {
    const entrega = await this.obterEntregaComDetalhes(entregaId);

    if (entrega.status === 'CANCELADA') {
      return {
        permitido: false,
        motivo: 'Entrega está cancelada',
        itensValidos: [],
        itensInvalidos: itemIds.map(id => ({ itemId: id, motivo: 'Entrega cancelada' })),
        prazoPendente: false,
      };
    }

    const itensValidos = [];
    const itensInvalidos = [];
    let prazoPendente = false;

    for (const itemId of itemIds) {
      const item = entrega.itens.find((i: any) => i.id === itemId);
      
      if (!item) {
        itensInvalidos.push({ itemId, motivo: 'Item não encontrado na entrega' });
        continue;
      }

      if (!['DEVOLVIDO', 'PERDIDO', 'DANIFICADO'].includes(item.status)) {
        itensInvalidos.push({ 
          itemId, 
          motivo: `Item não foi devolvido. Status atual: ${item.status}` 
        });
        continue;
      }

      // Verificar prazo para cancelamento de devolução (72 horas)
      if (item.dataDevolucao) {
        const agora = new Date();
        const dataLimite = new Date(item.dataDevolucao);
        dataLimite.setHours(dataLimite.getHours() + 72);

        if (agora > dataLimite) {
          itensInvalidos.push({ 
            itemId, 
            motivo: 'Prazo para cancelamento de devolução expirado (72 horas)' 
          });
          prazoPendente = true;
          continue;
        }
      }

      itensValidos.push(itemId);
    }

    return {
      permitido: itensValidos.length > 0,
      motivo: itensValidos.length === 0 ? 'Nenhum item válido para cancelamento' : undefined,
      itensValidos,
      itensInvalidos,
      prazoPendente,
    };
  }

  async obterHistoricoCancelamentosDevolucao(
    colaboradorId?: string,
    tipoEpiId?: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<{
    cancelamentos: {
      entregaId: string;
      itemId: string;
      colaboradorNome: string;
      tipoEpiNome: string;
      dataEntrega: Date;
      dataDevolucaoOriginal: Date;
      dataCancelamentoDevolucao: Date;
      motivoCancelamento: string;
      statusAnterior: string;
      numeroSerie?: string;
      lote?: string;
    }[];
    estatisticas: {
      totalCancelamentos: number;
      cancelamentosPorTipo: { tipoEpiNome: string; quantidade: number }[];
      motivosFrequentes: { motivo: string; quantidade: number }[];
      tempoMedioParaCancelamento: number; // em horas
    };
  }> {
    // Buscar no histórico
    const historicos = await this.prisma.historicoFicha.findMany({
      where: {
        acao: 'CANCELAMENTO_DEVOLUCAO',
        ...(dataInicio || dataFim ? {
          createdAt: {
            ...(dataInicio && { gte: dataInicio }),
            ...(dataFim && { lte: dataFim }),
          },
        } : {}),
      },
      include: {
        fichaEpi: {
          include: {
            colaborador: {
              select: { nome: true },
            },
            tipoEpi: {
              select: { nome: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cancelamentos = historicos
      .filter(h => {
        if (colaboradorId && h.fichaEpi.colaboradorId !== colaboradorId) return false;
        if (tipoEpiId && h.fichaEpi.tipoEpiId !== tipoEpiId) return false;
        return true;
      })
      .map(historico => {
        const detalhes = historico.detalhes as any;
        
        const tempoParaCancelamento = detalhes.dataDevolucaoOriginal && historico.createdAt
          ? Math.floor((historico.createdAt.getTime() - new Date(detalhes.dataDevolucaoOriginal).getTime()) / (1000 * 60 * 60))
          : 0;

        return {
          entregaId: detalhes.entregaId,
          itemId: detalhes.itemId,
          colaboradorNome: historico.fichaEpi.colaborador.nome,
          tipoEpiNome: historico.fichaEpi.tipoEpi.nome,
          dataEntrega: new Date(detalhes.dataEntrega),
          dataDevolucaoOriginal: new Date(detalhes.dataDevolucaoOriginal),
          dataCancelamentoDevolucao: historico.createdAt,
          motivoCancelamento: detalhes.motivo,
          statusAnterior: detalhes.statusAnterior,
          numeroSerie: detalhes.numeroSerie,
          lote: detalhes.lote,
          tempoParaCancelamento,
        };
      });

    // Calcular estatísticas
    const estatisticas = this.calcularEstatisticasCancelamentosDevolucao(cancelamentos);

    return { cancelamentos, estatisticas };
  }

  private validarInput(input: CancelarDevolucaoInput): void {
    if (!input.entregaId) {
      throw new BusinessError('ID da entrega é obrigatório');
    }

    if (!input.itensParaCancelar || input.itensParaCancelar.length === 0) {
      throw new BusinessError('Lista de itens para cancelar devolução é obrigatória');
    }

    if (!input.motivo || input.motivo.trim().length === 0) {
      throw new BusinessError('Motivo do cancelamento é obrigatório');
    }

    if (!input.usuarioId) {
      throw new BusinessError('Usuário é obrigatório');
    }
  }

  private async obterEntregaComDetalhes(entregaId: string): Promise<any> {
    const entrega = await this.prisma.entrega.findUnique({
      where: { id: entregaId },
      include: {
        itens: true,
        colaborador: {
          select: { nome: true },
        },
        fichaEpi: {
          include: {
            tipoEpi: {
              select: { nome: true },
            },
            almoxarifado: {
              select: { id: true, nome: true },
            },
          },
        },
      },
    });

    if (!entrega) {
      throw new NotFoundError('Entrega', entregaId);
    }

    return entrega;
  }

  private async validarItensPodeTerDevolucaoCancelada(
    entrega: any,
    itemIds: string[],
  ): Promise<void> {
    for (const itemId of itemIds) {
      const item = entrega.itens.find((i: any) => i.id === itemId);
      
      if (!item) {
        throw new BusinessError(`Item ${itemId} não encontrado na entrega`);
      }

      if (!['DEVOLVIDO', 'PERDIDO', 'DANIFICADO'].includes(item.status)) {
        throw new BusinessError(
          `Item ${itemId} não foi devolvido. Status atual: ${item.status}`,
        );
      }

      // Verificar prazo para cancelamento (72 horas)
      if (item.dataDevolucao) {
        const agora = new Date();
        const dataLimite = new Date(item.dataDevolucao);
        dataLimite.setHours(dataLimite.getHours() + 72);

        if (agora > dataLimite) {
          throw new BusinessError(
            `Prazo para cancelamento de devolução expirado para o item ${itemId}. Limite: 72 horas após devolução.`,
          );
        }
      }
    }
  }

  private async registrarHistoricoCancelamento(
    entrega: any,
    item: any,
    input: CancelarDevolucaoInput,
    tx: any,
  ): Promise<void> {
    await tx.historicoFicha.create({
      data: {
        fichaEpiId: entrega.fichaEpiId,
        acao: 'CANCELAMENTO_DEVOLUCAO',
        detalhes: {
          entregaId: entrega.id,
          itemId: item.id,
          motivo: input.motivo,
          dataEntrega: entrega.dataEntrega,
          dataDevolucaoOriginal: item.dataDevolucao,
          statusAnterior: item.status,
          numeroSerie: item.numeroSerie,
          lote: item.lote,
          usuarioId: input.usuarioId,
        },
        usuarioId: input.usuarioId,
      },
    });
  }

  private async estornarMovimentacaoEntrada(
    entrega: any,
    item: any,
    usuarioId: string,
    tx: any,
  ): Promise<any | null> {
    // Buscar movimentação de entrada relacionada à devolução
    const movimentacaoEntrada = await tx.movimentacaoEstoque.findFirst({
      where: {
        almoxarifadoId: entrega.fichaEpi.almoxarifadoId,
        tipoEpiId: item.tipoEpiId,
        tipoMovimentacao: 'ENTRADA',
        observacoes: { contains: entrega.colaborador.nome },
        createdAt: {
          gte: new Date(item.dataDevolucao.getTime() - 60000), // 1 minuto antes
          lte: new Date(item.dataDevolucao.getTime() + 3600000), // 1 hora depois
        },
      },
    });

    if (!movimentacaoEntrada) {
      return null; // Não encontrou movimentação para estornar
    }

    // Obter saldo atual
    const ultimaMovimentacao = await tx.movimentacaoEstoque.findFirst({
      where: {
        almoxarifadoId: entrega.fichaEpi.almoxarifadoId,
        tipoEpiId: item.tipoEpiId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const saldoAnterior = ultimaMovimentacao?.saldoPosterior || 0;

    // Criar movimentação de estorno (saída)
    return await tx.movimentacaoEstoque.create({
      data: {
        almoxarifadoId: entrega.fichaEpi.almoxarifadoId,
        tipoEpiId: item.tipoEpiId,
        tipoMovimentacao: 'ESTORNO',
        quantidade: 1,
        saldoAnterior,
        saldoPosterior: saldoAnterior - 1,
        usuarioId,
        observacoes: `Estorno por cancelamento de devolução - ${entrega.colaborador.nome}${
          item.numeroSerie ? ` (S/N: ${item.numeroSerie})` : ''
        }`,
        movimentacaoEstornoId: movimentacaoEntrada.id,
      },
    });
  }

  private async removerDoEstoque(
    almoxarifadoId: string,
    tipoEpiId: string,
    statusAnterior: StatusEntregaItem,
    tx: any,
  ): Promise<void> {
    // Determinar status do estoque baseado no status anterior do item
    const statusEstoque = statusAnterior === StatusEntregaItem.DANIFICADO 
      ? 'AGUARDANDO_INSPECAO' 
      : 'DISPONIVEL';

    // Remover do estoque
    const estoqueAtualizado = await tx.estoqueItem.updateMany({
      where: {
        almoxarifadoId,
        tipoEpiId,
        status: statusEstoque,
        quantidade: { gt: 0 },
      },
      data: {
        quantidade: { decrement: 1 },
      },
    });

    if (estoqueAtualizado.count === 0) {
      throw new BusinessError(
        `Erro ao remover item do estoque. Status: ${statusEstoque}`,
      );
    }
  }

  private async calcularNovoStatusEntrega(entregaId: string, tx: any): Promise<string> {
    const itens = await tx.entregaItem.findMany({
      where: { entregaId },
      select: { status: true },
    });

    const itensEntregues = itens.filter((i: any) => i.status === 'ENTREGUE').length;
    const itensDevolvidos = itens.filter((i: any) => 
      ['DEVOLVIDO', 'PERDIDO', 'DANIFICADO'].includes(i.status)
    ).length;

    if (itensEntregues === 0) {
      return 'DEVOLVIDA_TOTAL';
    } else if (itensDevolvidos > 0) {
      return 'DEVOLVIDA_PARCIAL';
    } else {
      return 'ATIVA';
    }
  }

  private calcularEstatisticasCancelamentosDevolucao(cancelamentos: any[]): any {
    const totalCancelamentos = cancelamentos.length;

    // Agrupar por tipo de EPI
    const cancelamentosPorTipo = cancelamentos.reduce((acc, c) => {
      const tipo = c.tipoEpiNome;
      const existing = acc.find((item: any) => item.tipoEpiNome === tipo);
      if (existing) {
        existing.quantidade++;
      } else {
        acc.push({ tipoEpiNome: tipo, quantidade: 1 });
      }
      return acc;
    }, []);

    // Agrupar por motivo
    const motivosFrequentes = cancelamentos.reduce((acc, c) => {
      const motivo = c.motivoCancelamento;
      const existing = acc.find((item: any) => item.motivo === motivo);
      if (existing) {
        existing.quantidade++;
      } else {
        acc.push({ motivo, quantidade: 1 });
      }
      return acc;
    }, []).sort((a: any, b: any) => b.quantidade - a.quantidade);

    // Tempo médio para cancelamento após devolução
    const tempoMedioParaCancelamento = cancelamentos.length > 0
      ? cancelamentos.reduce((sum, c) => sum + c.tempoParaCancelamento, 0) / cancelamentos.length
      : 0;

    return {
      totalCancelamentos,
      cancelamentosPorTipo: cancelamentosPorTipo.sort((a: any, b: any) => b.quantidade - a.quantidade),
      motivosFrequentes,
      tempoMedioParaCancelamento,
    };
  }
}