import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotFoundError } from '../../../domain/exceptions/business.exception';
import { PaginationOptions, PaginatedResult, createPaginatedResult } from '../../../domain/interfaces/common/pagination.interface';
// ✅ Import tipos do Zod (Single Source of Truth)
import { 
  FiltrosHistoricoFicha, 
  ItemHistoricoFicha, 
  HistoricoFichaResponse 
} from '../../../presentation/dto/schemas/ficha-epi.schemas';

@Injectable()
export class ObterHistoricoFichaUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    fichaId: string, 
    filtros: FiltrosHistoricoFicha = {},
    paginacao?: PaginationOptions
  ): Promise<HistoricoFichaResponse> {
    // Verificar se a ficha existe
    const ficha = await this.prisma.fichaEPI.findUnique({
      where: { id: fichaId },
      include: {
        colaborador: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            matricula: true,
          },
        },
      },
    });

    if (!ficha) {
      throw new NotFoundError('Ficha de EPI', fichaId);
    }

    // Construir histórico a partir de múltiplas fontes
    const historico = await this.construirHistoricoCompleto(fichaId, filtros);

    // Aplicar filtros
    let historicoFiltrado = this.aplicarFiltros(historico, filtros);

    // Aplicar paginação se solicitada
    if (paginacao) {
      const { page = 1, limit = 50 } = paginacao;
      const skip = (page - 1) * limit;
      historicoFiltrado = historicoFiltrado.slice(skip, skip + limit);
    }

    // Calcular estatísticas
    const estatisticas = await this.calcularEstatisticas(fichaId);

    return {
      fichaId,
      colaborador: {
        id: ficha.colaborador.id,
        nome: ficha.colaborador.nome,
        cpf: ficha.colaborador.cpf,
        matricula: ficha.colaborador.matricula,
      },
      historico: historicoFiltrado,
      estatisticas,
    };
  }

  private async construirHistoricoCompleto(
    fichaId: string, 
    filtros: FiltrosHistoricoFicha
  ): Promise<ItemHistoricoFicha[]> {
    const historico: ItemHistoricoFicha[] = [];

    // 1. Criação da ficha
    const criacao = await this.obterEventoCriacao(fichaId);
    if (criacao) historico.push(criacao);

    // 2. Histórico explícito da tabela HistoricoFicha
    const historicoExplicito = await this.obterHistoricoExplicito(fichaId);
    historico.push(...historicoExplicito);

    // 3. Entregas realizadas
    const entregas = await this.obterEventosEntregas(fichaId);
    historico.push(...entregas);

    // 4. Devoluções processadas
    const devolucoes = await this.obterEventosDevolucoes(fichaId);
    historico.push(...devolucoes);

    // 5. Itens vencidos (atraso)
    const itensVencidos = await this.obterEventosItensVencidos(fichaId);
    historico.push(...itensVencidos);

    // 6. Cancelamentos
    const cancelamentos = await this.obterEventosCancelamentos(fichaId);
    historico.push(...cancelamentos);

    // Ordenar por data (mais recente primeiro)
    return historico.sort((a, b) => b.dataAcao.getTime() - a.dataAcao.getTime());
  }

  private async obterEventoCriacao(fichaId: string): Promise<ItemHistoricoFicha | null> {
    const ficha = await this.prisma.fichaEPI.findUnique({
      where: { id: fichaId },
      select: {
        id: true,
        createdAt: true,
        colaborador: {
          select: { nome: true },
        },
      },
    });

    if (!ficha) return null;

    return {
      id: `criacao-${fichaId}`,
      fichaEpiId: fichaId,
      tipoAcao: 'CRIACAO',
      descricao: `Ficha de EPI criada para ${ficha.colaborador.nome}`,
      dataAcao: ficha.createdAt,
      responsavel: undefined, // Sistema
      detalhes: {
        statusNovo: 'ATIVA',
      },
    };
  }

  private async obterHistoricoExplicito(fichaId: string): Promise<ItemHistoricoFicha[]> {
    const registros = await this.prisma.historicoFicha.findMany({
      where: { fichaEpiId: fichaId },
      orderBy: { dataAcao: 'desc' },
    });

    return registros.map(registro => ({
      id: registro.id,
      fichaEpiId: fichaId,
      tipoAcao: this.mapearAcaoParaTipo(registro.acao),
      descricao: this.gerarDescricaoAcao(registro.acao, registro.detalhes),
      dataAcao: registro.dataAcao,
      responsavel: undefined, // TODO: buscar responsável se necessário
      detalhes: registro.detalhes as any,
    }));
  }

  private async obterEventosEntregas(fichaId: string): Promise<ItemHistoricoFicha[]> {
    const entregas = await this.prisma.entrega.findMany({
      where: { fichaEpiId: fichaId },
      include: {
        responsavel: {
          select: { id: true, nome: true },
        },
        itens: {
          include: {
            estoqueItem: {
              include: {
                tipoEpi: {
                  select: { nomeEquipamento: true },
                },
              },
            },
          },
        },
      },
      orderBy: { dataEntrega: 'desc' },
    });

    const eventos: ItemHistoricoFicha[] = [];

    for (const entrega of entregas) {
      // Identificar tipos únicos de EPI na entrega
      const tiposUnicos = new Set<string>();
      const nomesEquipamentos: string[] = [];

      entrega.itens.forEach(item => {
        const tipoEpiId = item.estoqueItem?.tipoEpi?.nomeEquipamento;
        if (tipoEpiId && !tiposUnicos.has(tipoEpiId)) {
          tiposUnicos.add(tipoEpiId);
          nomesEquipamentos.push(tipoEpiId);
        }
      });

      // Gerar descrição adequada para múltiplos tipos de EPI
      const descricaoTipos = nomesEquipamentos.length > 1 
        ? `Múltiplos EPIs (${nomesEquipamentos.join(', ')})` 
        : (nomesEquipamentos[0] || 'EPI');

      // Evento de entrega
      eventos.push({
        id: `entrega-${entrega.id}`,
        fichaEpiId: fichaId,
        tipoAcao: 'ENTREGA',
        descricao: `Entrega realizada - ${entrega.itens.length} item(ns) de ${descricaoTipos}`,
        dataAcao: entrega.dataEntrega,
        responsavel: {
          id: entrega.responsavel.id,
          nome: entrega.responsavel.nome,
        },
        detalhes: {
          entregaId: entrega.id,
          tipoEpiNome: descricaoTipos,
          quantidade: entrega.itens.length,
          itens: entrega.itens.map(item => ({
            numeroSerie: undefined, // TODO: implementar quando houver
            dataLimiteDevolucao: item.dataLimiteDevolucao,
          })),
        },
      });

      // Evento de assinatura se houver
      if (entrega.status === 'ASSINADA' && entrega.dataAssinatura) {
        eventos.push({
          id: `assinatura-${entrega.id}`,
          fichaEpiId: fichaId,
          tipoAcao: 'EDICAO',
          descricao: `Entrega assinada pelo colaborador`,
          dataAcao: entrega.dataAssinatura,
          responsavel: undefined, // Colaborador
          detalhes: {
            entregaId: entrega.id,
            statusAnterior: 'PENDENTE_ASSINATURA',
            statusNovo: 'ASSINADA',
          },
        });
      }
    }

    return eventos;
  }

  private async obterEventosDevolucoes(fichaId: string): Promise<ItemHistoricoFicha[]> {
    // Buscar movimentações de devolução
    const movimentacoesDevolucao = await this.prisma.movimentacaoEstoque.findMany({
      where: {
        tipoMovimentacao: 'ENTRADA_DEVOLUCAO',
        entrega: {
          fichaEpiId: fichaId,
        },
      },
      include: {
        responsavel: {
          select: { id: true, nome: true },
        },
        entrega: {
          include: {
            itens: {
              include: {
                estoqueItem: {
                  include: {
                    tipoEpi: {
                      select: { nomeEquipamento: true },
                    },
                  },
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
      orderBy: { dataMovimentacao: 'desc' },
    });

    return movimentacoesDevolucao.map(mov => ({
      id: `devolucao-${mov.id}`,
      fichaEpiId: fichaId,
      tipoAcao: 'DEVOLUCAO',
      descricao: `Devolução processada - ${mov.quantidadeMovida} item(ns) de ${mov.estoqueItem.tipoEpi.nomeEquipamento}`,
      dataAcao: mov.dataMovimentacao,
      responsavel: {
        id: mov.responsavel.id,
        nome: mov.responsavel.nome,
      },
      detalhes: {
        entregaId: mov.entregaId || undefined,
        tipoEpiNome: mov.estoqueItem.tipoEpi.nomeEquipamento,
        quantidade: mov.quantidadeMovida,
      },
    }));
  }

  private async obterEventosItensVencidos(fichaId: string): Promise<ItemHistoricoFicha[]> {
    const hoje = new Date();
    const itensVencidos = await this.prisma.entregaItem.findMany({
      where: {
        entrega: { fichaEpiId: fichaId },
        status: 'COM_COLABORADOR',
        dataLimiteDevolucao: {
          lt: hoje,
          not: null,
        },
      },
      include: {
        entrega: {
          select: { dataEntrega: true },
        },
        estoqueItem: {
          include: {
            tipoEpi: {
              select: { nomeEquipamento: true },
            },
          },
        },
      },
    });

    return itensVencidos.map(item => ({
      id: `vencido-${item.id}`,
      fichaEpiId: fichaId,
      tipoAcao: 'ITEM_VENCIDO',
      descricao: `Item vencido - ${item.estoqueItem.tipoEpi.nomeEquipamento} (venceu em ${item.dataLimiteDevolucao?.toLocaleDateString('pt-BR')})`,
      dataAcao: item.dataLimiteDevolucao || hoje,
      responsavel: undefined, // Sistema
      detalhes: {
        tipoEpiNome: item.estoqueItem.tipoEpi.nomeEquipamento,
        quantidade: 1,
      },
    }));
  }

  private async obterEventosCancelamentos(fichaId: string): Promise<ItemHistoricoFicha[]> {
    // Buscar movimentações de estorno que indicam cancelamentos
    const estornos = await this.prisma.movimentacaoEstoque.findMany({
      where: {
        tipoMovimentacao: {
          in: ['ESTORNO_SAIDA_ENTREGA', 'ESTORNO_ENTRADA_DEVOLUCAO'],
        },
        entrega: {
          fichaEpiId: fichaId,
        },
      },
      include: {
        responsavel: {
          select: { id: true, nome: true },
        },
        estoqueItem: {
          include: {
            tipoEpi: {
              select: { nomeEquipamento: true },
            },
          },
        },
        movimentacaoOrigem: true,
      },
      orderBy: { dataMovimentacao: 'desc' },
    });

    return estornos.map(estorno => ({
      id: `cancelamento-${estorno.id}`,
      fichaEpiId: fichaId,
      tipoAcao: 'CANCELAMENTO',
      descricao: `${estorno.tipoMovimentacao === 'ESTORNO_SAIDA_ENTREGA' ? 'Entrega cancelada' : 'Devolução cancelada'} - ${estorno.quantidadeMovida} item(ns) de ${estorno.estoqueItem.tipoEpi.nomeEquipamento}`,
      dataAcao: estorno.dataMovimentacao,
      responsavel: {
        id: estorno.responsavel.id,
        nome: estorno.responsavel.nome,
      },
      detalhes: {
        tipoEpiNome: estorno.estoqueItem.tipoEpi.nomeEquipamento,
        quantidade: estorno.quantidadeMovida,
      },
    }));
  }

  private aplicarFiltros(historico: ItemHistoricoFicha[], filtros: FiltrosHistoricoFicha): ItemHistoricoFicha[] {
    let resultado = [...historico];

    if (filtros.tipoAcao) {
      resultado = resultado.filter(item => item.tipoAcao === filtros.tipoAcao);
    }

    if (filtros.dataInicio) {
      resultado = resultado.filter(item => item.dataAcao >= filtros.dataInicio!);
    }

    if (filtros.dataFim) {
      resultado = resultado.filter(item => item.dataAcao <= filtros.dataFim!);
    }

    return resultado;
  }

  private async calcularEstatisticas(fichaId: string) {
    const [entregas, devolucoes, cancelamentos, itensAtivos, itensVencidos] = await Promise.all([
      // Total de entregas
      this.prisma.entrega.count({
        where: { fichaEpiId: fichaId },
      }),
      // Total de devoluções
      this.prisma.movimentacaoEstoque.count({
        where: {
          tipoMovimentacao: 'ENTRADA_DEVOLUCAO',
          entrega: { fichaEpiId: fichaId },
        },
      }),
      // Total de cancelamentos
      this.prisma.movimentacaoEstoque.count({
        where: {
          tipoMovimentacao: {
            in: ['ESTORNO_SAIDA_ENTREGA', 'ESTORNO_ENTRADA_DEVOLUCAO'],
          },
          entrega: { fichaEpiId: fichaId },
        },
      }),
      // Itens ativos com o colaborador
      this.prisma.entregaItem.count({
        where: {
          entrega: { fichaEpiId: fichaId },
          status: 'COM_COLABORADOR',
        },
      }),
      // Itens vencidos
      this.prisma.entregaItem.count({
        where: {
          entrega: { fichaEpiId: fichaId },
          status: 'COM_COLABORADOR',
          dataLimiteDevolucao: {
            lt: new Date(),
            not: null,
          },
        },
      }),
    ]);

    // Data da última atividade
    const ultimaAtividade = await this.prisma.movimentacaoEstoque.findFirst({
      where: {
        entrega: { fichaEpiId: fichaId },
      },
      orderBy: { dataMovimentacao: 'desc' },
      select: { dataMovimentacao: true },
    });

    const totalEventos = entregas + devolucoes + cancelamentos + 1; // +1 para criação

    return {
      totalEventos,
      totalEntregas: entregas,
      totalDevolucoes: devolucoes,
      totalCancelamentos: cancelamentos,
      itensAtivos,
      itensVencidos,
      dataUltimaAtividade: ultimaAtividade?.dataMovimentacao,
    };
  }

  private mapearAcaoParaTipo(acao: string): ItemHistoricoFicha['tipoAcao'] {
    switch (acao.toLowerCase()) {
      case 'suspensao':
      case 'ativacao':
      case 'inativacao':
        return 'ALTERACAO_STATUS';
      case 'cancelamento':
        return 'CANCELAMENTO';
      default:
        return 'EDICAO';
    }
  }

  private gerarDescricaoAcao(acao: string, detalhes: any): string {
    switch (acao.toLowerCase()) {
      case 'suspensao':
        return `Ficha suspensa${detalhes?.motivo ? ` - ${detalhes.motivo}` : ''}`;
      case 'ativacao':
        return 'Ficha ativada';
      case 'inativacao':
        return 'Ficha inativada';
      case 'cancelamento':
        return `Operação cancelada${detalhes?.motivo ? ` - ${detalhes.motivo}` : ''}`;
      default:
        return `Ação registrada: ${acao}`;
    }
  }
}