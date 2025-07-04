import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StatusEntrega, StatusEntregaItem } from '../../../domain/enums';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';

export interface CancelarEntregaInput {
  entregaId: string;
  motivo: string;
  usuarioId: string;
}

export interface CancelamentoOutput {
  entregaId: string;
  statusAnterior: StatusEntrega;
  motivoCancelamento: string;
  itensAfetados: {
    itemId: string;
    estoqueItemOrigemId: string;
  }[];
  movimentacoesEstorno: {
    id: string;
    tipoEpiId: string;
    quantidade: number;
  }[];
  dataCancelamento: Date;
}

@Injectable()
export class CancelarEntregaUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CancelarEntregaInput): Promise<CancelamentoOutput> {
    // Validar entrada
    this.validarInput(input);

    // Buscar entrega com detalhes
    const entregaCompleta = await this.obterEntregaComDetalhes(input.entregaId);

    // Validar se pode ser cancelada
    this.validarPodeCancelar(entregaCompleta);

    // Cancelar em transação
    return await this.prisma.$transaction(async (tx) => {
      // Registrar histórico antes de cancelar
      await this.registrarHistoricoCancelamento(entregaCompleta, input, tx);

      // Estornar movimentações de estoque
      const movimentacoesEstorno = await this.estornarMovimentacoes(
        entregaCompleta,
        input.usuarioId,
        tx,
      );

      // Cancelar todos os itens da entrega
      await tx.entregaItem.updateMany({
        where: {
          entregaId: input.entregaId,
          status: StatusEntregaItem.COM_COLABORADOR,
        },
        data: {
          status: StatusEntregaItem.DEVOLVIDO,
        },
      });

      // Cancelar a entrega
      const statusAnterior = entregaCompleta.status as StatusEntrega;
      await tx.entrega.update({
        where: { id: input.entregaId },
        data: {
          status: StatusEntrega.CANCELADA,
        },
      });

      return {
        entregaId: input.entregaId,
        statusAnterior,
        motivoCancelamento: input.motivo,
        itensAfetados: entregaCompleta.itens
          .filter((item: any) => item.status === StatusEntregaItem.COM_COLABORADOR)
          .map((item: any) => ({
            itemId: item.id,
            estoqueItemOrigemId: item.estoqueItemOrigemId,
          })),
        movimentacoesEstorno,
        dataCancelamento: new Date(),
      };
    });
  }

  async validarCancelamentoPermitido(entregaId: string): Promise<{
    podeSerCancelada: boolean;
    motivo?: string;
    itensEntregues: number;
    itensDevolvidos: number;
    statusAtual: string;
  }> {
    const entrega = await this.obterEntregaComDetalhes(entregaId);

    const itensEntregues = entrega.itens.filter((i: any) => i.status === StatusEntregaItem.COM_COLABORADOR).length;
    const itensDevolvidos = entrega.itens.filter((i: any) => 
      i.status === StatusEntregaItem.DEVOLVIDO
    ).length;

    if (entrega.status === StatusEntrega.CANCELADA) {
      return {
        podeSerCancelada: false,
        motivo: 'Entrega já está cancelada',
        itensEntregues,
        itensDevolvidos,
        statusAtual: entrega.status,
      };
    }

    if (itensDevolvidos > 0) {
      return {
        podeSerCancelada: false,
        motivo: 'Não é possível cancelar: existem itens já devolvidos',
        itensEntregues,
        itensDevolvidos,
        statusAtual: entrega.status,
      };
    }

    // Verificar prazo para cancelamento (ex: 24 horas)
    const agora = new Date();
    const dataLimite = new Date(entrega.dataEntrega);
    dataLimite.setHours(dataLimite.getHours() + 24);

    if (agora > dataLimite) {
      return {
        podeSerCancelada: false,
        motivo: 'Prazo para cancelamento expirado (24 horas após a entrega)',
        itensEntregues,
        itensDevolvidos,
        statusAtual: entrega.status,
      };
    }

    return {
      podeSerCancelada: true,
      itensEntregues,
      itensDevolvidos,
      statusAtual: entrega.status,
    };
  }

  async obterHistoricoCancelamentos(
    colaboradorId?: string,
    almoxarifadoId?: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<{
    cancelamentos: {
      entregaId: string;
      colaboradorNome: string;
      tipoEpiNome: string;
      dataEntrega: Date;
      dataCancelamento: Date;
      motivoCancelamento: string;
      quantidadeItens: number;
      tempoAtesCancelamento: number; // em horas
    }[];
    estatisticas: {
      totalCancelamentos: number;
      cancelamentosPorTipo: { tipoEpiNome: string; quantidade: number }[];
      motivosFrequentes: { motivo: string; quantidade: number }[];
      tempoMedioCancelamento: number; // em horas
    };
  }> {
    const where: any = {
      status: 'CANCELADA',
    };

    if (colaboradorId) {
      where.colaboradorId = colaboradorId;
    }

    if (almoxarifadoId) {
      where.almoxarifadoId = almoxarifadoId;
    }

    if (dataInicio || dataFim) {
      where.dataEntrega = {};
      if (dataInicio) where.dataEntrega.gte = dataInicio;
      if (dataFim) where.dataEntrega.lte = dataFim;
    }

    const entregas = await this.prisma.entrega.findMany({
      where,
      include: {
        responsavel: {
          select: { nome: true },
        },
        almoxarifado: {
          select: { nome: true },
        },
        itens: {
          select: { id: true },
        },
      },
      orderBy: { dataEntrega: 'desc' },
    });

    const cancelamentos = entregas.map(entrega => {
      const tempoAtesCancelamento = Math.floor(
        (entrega.dataEntrega.getTime() - entrega.dataEntrega.getTime()) / (1000 * 60 * 60),
      );

      return {
        entregaId: entrega.id,
        colaboradorNome: entrega.responsavel.nome,
        tipoEpiNome: entrega.almoxarifado.nome, // Aproximação - sem acesso direto ao tipo EPI
        dataEntrega: entrega.dataEntrega,
        dataCancelamento: entrega.dataEntrega, // Aproximação
        motivoCancelamento: 'Cancelado',
        quantidadeItens: entrega.itens.length,
        tempoAtesCancelamento,
      };
    });

    // Calcular estatísticas
    const estatisticas = this.calcularEstatisticasCancelamentos(cancelamentos);

    return { cancelamentos, estatisticas };
  }

  private validarInput(input: CancelarEntregaInput): void {
    if (!input.entregaId) {
      throw new BusinessError('ID da entrega é obrigatório');
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
        responsavel: {
          select: { nome: true },
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

  private validarPodeCancelar(entrega: any): void {
    if (entrega.status === StatusEntrega.CANCELADA) {
      throw new BusinessError('Entrega já está cancelada');
    }

    // Verificar se há itens já devolvidos
    const itensDevolvidos = entrega.itens.filter((item: any) => 
      item.status === StatusEntregaItem.DEVOLVIDO
    );

    if (itensDevolvidos.length > 0) {
      throw new BusinessError(
        `Não é possível cancelar: ${itensDevolvidos.length} item(ns) já foi(ram) devolvido(s)`,
      );
    }

    // Verificar prazo para cancelamento (24 horas)
    const agora = new Date();
    const dataLimite = new Date(entrega.dataEntrega);
    dataLimite.setHours(dataLimite.getHours() + 24);

    if (agora > dataLimite) {
      throw new BusinessError(
        'Prazo para cancelamento expirado. Cancelamentos são permitidos apenas até 24 horas após a entrega.',
      );
    }
  }

  private async registrarHistoricoCancelamento(
    entrega: any,
    input: CancelarEntregaInput,
    tx: any,
  ): Promise<void> {
    await tx.historicoFicha.create({
      data: {
        fichaEpiId: entrega.fichaEpiId,
        acao: 'CANCELAMENTO_ENTREGA',
        detalhes: {
          entregaId: entrega.id,
          motivo: input.motivo,
          dataOriginalEntrega: entrega.dataEntrega,
          quantidadeItens: entrega.itens.length,
          usuarioId: input.usuarioId,
        },
      },
    });
  }

  private async estornarMovimentacoes(
    entrega: any,
    usuarioId: string,
    tx: any,
  ): Promise<{ id: string; tipoEpiId: string; quantidade: number }[]> {
    // Buscar movimentações relacionadas à entrega
    const movimentacoes = await tx.movimentacaoEstoque.findMany({
      where: {
        almoxarifadoId: entrega.fichaEPI.almoxarifadoId,
        observacoes: { contains: entrega.colaborador.nome },
        tipoMovimentacao: 'SAIDA',
        createdAt: {
          gte: new Date(entrega.dataEntrega.getTime() - 60000), // 1 minuto antes
          lte: new Date(entrega.dataEntrega.getTime() + 3600000), // 1 hora depois
        },
      },
    });

    const estornos = [];

    for (const movimentacao of movimentacoes) {
      // Obter saldo atual
      const ultimaMovimentacao = await tx.movimentacaoEstoque.findFirst({
        where: {
          almoxarifadoId: movimentacao.almoxarifadoId,
          tipoEpiId: movimentacao.tipoEpiId,
        },
        orderBy: { createdAt: 'desc' },
      });

      const saldoAnterior = ultimaMovimentacao?.saldoPosterior || 0;

      // Criar movimentação de estorno (entrada)
      const estorno = await tx.movimentacaoEstoque.create({
        data: {
          almoxarifadoId: movimentacao.almoxarifadoId,
          tipoEpiId: movimentacao.tipoEpiId,
          tipoMovimentacao: 'ESTORNO',
          quantidade: movimentacao.quantidade,
          saldoAnterior,
          saldoPosterior: saldoAnterior + movimentacao.quantidade,
          usuarioId,
          observacoes: `Estorno por cancelamento da entrega para ${entrega.colaborador.nome}`,
          movimentacaoEstornoId: movimentacao.id,
        },
      });

      // Atualizar estoque
      await tx.estoqueItem.updateMany({
        where: {
          almoxarifadoId: movimentacao.almoxarifadoId,
          tipoEpiId: movimentacao.tipoEpiId,
          status: 'DISPONIVEL',
        },
        data: {
          quantidade: { increment: movimentacao.quantidade },
        },
      });

      estornos.push({
        id: estorno.id,
        tipoEpiId: movimentacao.tipoEpiId,
        quantidade: movimentacao.quantidade,
      });
    }

    return estornos;
  }

  private extrairMotivoCancelamento(observacoes?: string): string {
    if (!observacoes) return 'Não informado';

    const match = observacoes.match(/CANCELADO:\s*(.+)/);
    return match ? match[1].trim() : 'Não informado';
  }

  private calcularEstatisticasCancelamentos(cancelamentos: any[]): any {
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

    // Tempo médio até cancelamento
    const tempoMedioCancelamento = cancelamentos.length > 0
      ? cancelamentos.reduce((sum, c) => sum + c.tempoAtesCancelamento, 0) / cancelamentos.length
      : 0;

    return {
      totalCancelamentos,
      cancelamentosPorTipo: cancelamentosPorTipo.sort((a: any, b: any) => b.quantidade - a.quantidade),
      motivosFrequentes,
      tempoMedioCancelamento,
    };
  }
}