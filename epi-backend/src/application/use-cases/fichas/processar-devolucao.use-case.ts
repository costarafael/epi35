import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StatusEntregaItem, StatusEstoqueItem } from '../../../domain/enums';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';

export interface ProcessarDevolucaoInput {
  entregaId: string;
  itensParaDevolucao: {
    itemId: string;
    motivoDevolucao?: string;
    condicaoItem: 'BOM' | 'DANIFICADO' | 'PERDIDO';
  }[];
  assinaturaColaborador?: string;
  usuarioId: string;
  observacoes?: string;
}

export interface DevolucaoOutput {
  entregaId: string;
  itensDevolucao: {
    itemId: string;
    tipoEpiId: string;
    numeroSerie?: string;
    lote?: string;
    statusAnterior: StatusEntregaItem;
    novoStatus: StatusEntregaItem;
    motivoDevolucao?: string;
    condicaoItem: string;
  }[];
  movimentacoesEstoque: {
    id: string;
    tipoEpiId: string;
    quantidade: number;
    statusEstoque: StatusEstoqueItem;
  }[];
  statusEntregaAtualizado: string;
  dataProcessamento: Date;
}

@Injectable()
export class ProcessarDevolucaoUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: ProcessarDevolucaoInput): Promise<DevolucaoOutput> {
    // Validar entrada
    await this.validarInput(input);

    // Buscar entrega com detalhes
    const entregaCompleta = await this.obterEntregaComDetalhes(input.entregaId);

    // Validar assinatura se obrigatória
    await this.validarAssinatura(entregaCompleta, input.assinaturaColaborador);

    // Validar se os itens podem ser devolvidos
    await this.validarItensPodeSemDevolvidos(entregaCompleta, input.itensParaDevolucao);

    // Processar devolução em transação
    return await this.prisma.$transaction(async (tx) => {
      const itensDevolucao = [];
      const movimentacoesEstoque = [];

      // Processar cada item
      for (const itemInput of input.itensParaDevolucao) {
        const item = entregaCompleta.itens.find(i => i.id === itemInput.itemId);
        
        // Atualizar status do item
        const novoStatus = this.determinarNovoStatusItem(itemInput.condicaoItem);
        
        await tx.entregaItem.update({
          where: { id: itemInput.itemId },
          data: {
            status: novoStatus,
            dataDevolucao: new Date(),
            motivoDevolucao: itemInput.motivoDevolucao,
          },
        });

        itensDevolucao.push({
          itemId: item.id,
          tipoEpiId: item.tipoEpiId,
          numeroSerie: item.numeroSerie,
          lote: item.lote,
          statusAnterior: item.status as StatusEntregaItem,
          novoStatus,
          motivoDevolucao: itemInput.motivoDevolucao,
          condicaoItem: itemInput.condicaoItem,
        });

        // Criar movimentação de entrada se item não foi perdido
        if (itemInput.condicaoItem !== 'PERDIDO') {
          const movimentacao = await this.criarMovimentacaoEntrada(
            entregaCompleta,
            item,
            itemInput.condicaoItem,
            input.usuarioId,
            tx,
          );

          movimentacoesEstoque.push({
            id: movimentacao.id,
            tipoEpiId: item.tipoEpiId,
            quantidade: 1,
            statusEstoque: itemInput.condicaoItem === 'DANIFICADO' 
              ? StatusEstoqueItem.AGUARDANDO_INSPECAO 
              : StatusEstoqueItem.DISPONIVEL,
          });

          // Atualizar estoque
          await this.atualizarEstoque(
            entregaCompleta.fichaEpi.almoxarifadoId,
            item.tipoEpiId,
            itemInput.condicaoItem,
            tx,
          );
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

    const itensValidos = [];
    const itensInvalidos = [];

    for (const itemId of itemIds) {
      const item = entrega.itens.find(i => i.id === itemId);
      
      if (!item) {
        itensInvalidos.push({ itemId, motivo: 'Item não encontrado na entrega' });
        continue;
      }

      if (item.status !== 'ENTREGUE') {
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
    colaboradorId?: string,
    tipoEpiId?: string,
    dataInicio?: Date,
    dataFim?: Date,
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
      status: { in: ['DEVOLVIDO', 'DANIFICADO', 'PERDIDO'] },
    };

    if (colaboradorId) {
      where.entrega = { colaboradorId };
    }

    if (tipoEpiId) {
      where.tipoEpiId = tipoEpiId;
    }

    if (dataInicio || dataFim) {
      where.dataDevolucao = {};
      if (dataInicio) where.dataDevolucao.gte = dataInicio;
      if (dataFim) where.dataDevolucao.lte = dataFim;
    }

    const itens = await this.prisma.entregaItem.findMany({
      where,
      include: {
        entrega: {
          include: {
            colaborador: {
              select: { nome: true },
            },
          },
        },
        tipoEpi: {
          select: { nome: true },
        },
      },
      orderBy: { dataDevolucao: 'desc' },
    });

    const devolucoes = itens.map(item => {
      const diasUso = item.dataDevolucao && item.entrega.dataEntrega
        ? Math.floor((item.dataDevolucao.getTime() - item.entrega.dataEntrega.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        entregaId: item.entregaId,
        colaboradorNome: item.entrega.colaborador.nome,
        tipoEpiNome: item.tipoEpi.nome,
        dataEntrega: item.entrega.dataEntrega,
        dataDevolucao: item.dataDevolucao!,
        diasUso,
        motivoDevolucao: item.motivoDevolucao,
        condicaoItem: this.mapearCondicaoItem(item.status as any),
        numeroSerie: item.numeroSerie,
        lote: item.lote,
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

  private async validarInput(input: ProcessarDevolucaoInput): Promise<void> {
    if (!input.entregaId) {
      throw new BusinessError('ID da entrega é obrigatório');
    }

    if (!input.itensParaDevolucao || input.itensParaDevolucao.length === 0) {
      throw new BusinessError('Lista de itens para devolução é obrigatória');
    }

    if (!input.usuarioId) {
      throw new BusinessError('Usuário é obrigatório');
    }

    // Validar condições dos itens
    for (const item of input.itensParaDevolucao) {
      if (!['BOM', 'DANIFICADO', 'PERDIDO'].includes(item.condicaoItem)) {
        throw new BusinessError(
          `Condição do item inválida: ${item.condicaoItem}. Use: BOM, DANIFICADO ou PERDIDO`,
        );
      }
    }
  }

  private async obterEntregaComDetalhes(entregaId: string): Promise<any> {
    const entrega = await this.prisma.entrega.findUnique({
      where: { id: entregaId },
      include: {
        itens: true,
        colaborador: {
          select: { nome: true, cpf: true },
        },
        fichaEpi: {
          include: {
            tipoEpi: {
              select: {
                nome: true,
                exigeAssinaturaEntrega: true,
              },
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

  private async validarAssinatura(entrega: any, assinatura?: string): Promise<void> {
    if (entrega.fichaEpi.tipoEpi.exigeAssinaturaEntrega && !assinatura) {
      throw new BusinessError(
        'Assinatura do colaborador é obrigatória para devolução deste tipo de EPI',
      );
    }
  }

  private async validarItensPodeSemDevolvidos(
    entrega: any,
    itens: { itemId: string }[],
  ): Promise<void> {
    for (const itemInput of itens) {
      const item = entrega.itens.find((i: any) => i.id === itemInput.itemId);
      
      if (!item) {
        throw new BusinessError(`Item ${itemInput.itemId} não encontrado na entrega`);
      }

      if (item.status !== 'ENTREGUE') {
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
        return StatusEntregaItem.DEVOLVIDO;
      case 'PERDIDO':
        return StatusEntregaItem.PERDIDO;
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
    // Obter saldo anterior
    const saldoAnterior = await tx.movimentacaoEstoque
      .findFirst({
        where: {
          almoxarifadoId: entrega.fichaEpi.almoxarifadoId,
          tipoEpiId: item.tipoEpiId,
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((mov: any) => mov?.saldoPosterior || 0);

    const observacoes = `Devolução de ${entrega.colaborador.nome} - ${condicaoItem}${
      item.numeroSerie ? ` (S/N: ${item.numeroSerie})` : ''
    }${item.lote ? ` (Lote: ${item.lote})` : ''}`;

    return await tx.movimentacaoEstoque.create({
      data: {
        almoxarifadoId: entrega.fichaEpi.almoxarifadoId,
        tipoEpiId: item.tipoEpiId,
        tipoMovimentacao: 'ENTRADA',
        quantidade: 1,
        saldoAnterior,
        saldoPosterior: saldoAnterior + 1,
        usuarioId,
        observacoes,
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
        quantidade: { increment: 1 },
      },
    });

    // Se não existe, criar novo registro de estoque
    if (estoqueAtualizado.count === 0) {
      await tx.estoqueItem.create({
        data: {
          almoxarifadoId,
          tipoEpiId,
          quantidade: 1,
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

  private mapearCondicaoItem(status: StatusEntregaItem): string {
    switch (status) {
      case StatusEntregaItem.DEVOLVIDO:
        return 'BOM';
      case StatusEntregaItem.PERDIDO:
        return 'PERDIDO';
      case StatusEntregaItem.DANIFICADO:
        return 'DANIFICADO';
      default:
        return 'DESCONHECIDO';
    }
  }
}