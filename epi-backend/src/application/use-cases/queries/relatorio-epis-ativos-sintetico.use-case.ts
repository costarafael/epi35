import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RelatorioEpisAtivosSinteticoInput {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  dataInicioEntrega?: Date;
  dataFimEntrega?: Date;
}

export interface RelatorioEpisAtivosSinteticoOutput {
  tipoEpi: {
    id: string;
    nomeEquipamento: string;
    numeroCa: string;
    vidaUtilDias: number;
  };
  quantidadeComColaboradores: number;
  almoxarifados: Array<{
    id: string;
    nome: string;
    quantidadeComColaboradores: number;
  }>;
}

@Injectable()
export class RelatorioEpisAtivosSinteticoUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: RelatorioEpisAtivosSinteticoInput = {}): Promise<RelatorioEpisAtivosSinteticoOutput[]> {
    const whereClauseItens: any = {
      status: 'COM_COLABORADOR',
    };

    const whereClauseEntregas: any = {};

    if (input.almoxarifadoId) {
      whereClauseItens.estoqueItemOrigem = {
        almoxarifadoId: input.almoxarifadoId,
      };
    }

    if (input.tipoEpiId) {
      whereClauseItens.estoqueItemOrigem = {
        ...whereClauseItens.estoqueItemOrigem,
        tipoEpiId: input.tipoEpiId,
      };
    }

    if (input.dataInicioEntrega || input.dataFimEntrega) {
      whereClauseEntregas.dataEntrega = {};
      if (input.dataInicioEntrega) {
        whereClauseEntregas.dataEntrega.gte = input.dataInicioEntrega;
      }
      if (input.dataFimEntrega) {
        whereClauseEntregas.dataEntrega.lte = input.dataFimEntrega;
      }
      whereClauseItens.entrega = whereClauseEntregas;
    }

    // Buscar todos os itens ativos com colaboradores
    const itensAtivos = await this.prismaService.entregaItem.findMany({
      where: whereClauseItens,
      include: {
        estoqueItemOrigem: {
          include: {
            tipoEpi: {
              select: {
                id: true,
                nomeEquipamento: true,
                numeroCa: true,
                vidaUtilDias: true,
              },
            },
            almoxarifado: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    // Agrupar por tipo de EPI
    const agrupamentosPorTipo = new Map<string, {
      tipoEpi: any;
      quantidade: number;
      almoxarifados: Map<string, { info: any; quantidade: number }>;
    }>();

    for (const item of itensAtivos) {
      const tipoEpiId = item.estoqueItemOrigem.tipoEpi.id;
      const almoxarifadoId = item.estoqueItemOrigem.almoxarifado.id;

      if (!agrupamentosPorTipo.has(tipoEpiId)) {
        agrupamentosPorTipo.set(tipoEpiId, {
          tipoEpi: item.estoqueItemOrigem.tipoEpi,
          quantidade: 0,
          almoxarifados: new Map(),
        });
      }

      const agrupamento = agrupamentosPorTipo.get(tipoEpiId)!;
      agrupamento.quantidade++;

      if (!agrupamento.almoxarifados.has(almoxarifadoId)) {
        agrupamento.almoxarifados.set(almoxarifadoId, {
          info: item.estoqueItemOrigem.almoxarifado,
          quantidade: 0,
        });
      }

      agrupamento.almoxarifados.get(almoxarifadoId)!.quantidade++;
    }

    // Converter para formato de saída
    const resultado = Array.from(agrupamentosPorTipo.values()).map(agrupamento => ({
      tipoEpi: agrupamento.tipoEpi,
      quantidadeComColaboradores: agrupamento.quantidade,
      almoxarifados: Array.from(agrupamento.almoxarifados.values()).map(alm => ({
        id: alm.info.id,
        nome: alm.info.nome,
        quantidadeComColaboradores: alm.quantidade,
      })),
    }));

    // Ordenar por nome do equipamento
    return resultado.sort((a, b) => 
      a.tipoEpi.nomeEquipamento.localeCompare(b.tipoEpi.nomeEquipamento)
    );
  }

  async obterEstatisticas(input: RelatorioEpisAtivosSinteticoInput = {}): Promise<{
    totalColaboradoresComEpis: number;
    totalItensAtivos: number;
    tiposEpisDiferentes: number;
    almoxarifadosComItensAtivos: number;
    mediaItensPortipoEpi: number;
  }> {
    const whereClause: any = {
      status: 'COM_COLABORADOR',
    };

    if (input.almoxarifadoId) {
      whereClause.estoqueItemOrigem = {
        almoxarifadoId: input.almoxarifadoId,
      };
    }

    if (input.tipoEpiId) {
      whereClause.estoqueItemOrigem = {
        ...whereClause.estoqueItemOrigem,
        tipoEpiId: input.tipoEpiId,
      };
    }

    const [
      totalItens,
      colaboradoresUnicos,
      tiposEpiUnicos,
      almoxarifadosUnicos,
    ] = await Promise.all([
      this.prismaService.entregaItem.count({ where: whereClause }),
      this.prismaService.entregaItem.groupBy({
        by: ['entregaId'],
        where: whereClause,
      }).then(entregas => 
        this.prismaService.entrega.groupBy({
          by: ['fichaEpiId'],
          where: { id: { in: entregas.map(e => e.entregaId) } },
        }).then(fichas =>
          this.prismaService.fichaEPI.groupBy({
            by: ['colaboradorId'],
            where: { id: { in: fichas.map(f => f.fichaEpiId) } },
          })
        )
      ),
      this.prismaService.entregaItem.groupBy({
        by: ['estoqueItemOrigemId'],
        where: whereClause,
      }).then(itens =>
        this.prismaService.estoqueItem.groupBy({
          by: ['tipoEpiId'],
          where: { id: { in: itens.map(i => i.estoqueItemOrigemId) } },
        })
      ),
      this.prismaService.entregaItem.groupBy({
        by: ['estoqueItemOrigemId'],
        where: whereClause,
      }).then(itens =>
        this.prismaService.estoqueItem.groupBy({
          by: ['almoxarifadoId'],
          where: { id: { in: itens.map(i => i.estoqueItemOrigemId) } },
        })
      ),
    ]);

    const totalTipos = tiposEpiUnicos.length;
    const mediaItens = totalTipos > 0 ? totalItens / totalTipos : 0;

    return {
      totalColaboradoresComEpis: colaboradoresUnicos.length,
      totalItensAtivos: totalItens,
      tiposEpisDiferentes: totalTipos,
      almoxarifadosComItensAtivos: almoxarifadosUnicos.length,
      mediaItensPortipoEpi: Math.round(mediaItens * 100) / 100,
    };
  }

  async compararComEstoqueDisponivel(input: RelatorioEpisAtivosSinteticoInput = {}): Promise<Array<{
    tipoEpi: {
      id: string;
      nomeEquipamento: string;
      numeroCa: string;
    };
    quantidadeComColaboradores: number;
    quantidadeDisponivelEstoque: number;
    percentualUtilizacao: number;
    necessidadeReposicao: boolean;
  }>> {
    const episAtivos = await this.execute(input);

    const tipoEpiIds = episAtivos.map(epi => epi.tipoEpi.id);

    const estoqueDisponivel = await this.prismaService.estoqueItem.groupBy({
      by: ['tipoEpiId'],
      where: {
        tipoEpiId: { in: tipoEpiIds },
        status: 'DISPONIVEL',
      },
      _sum: {
        quantidade: true,
      },
    });

    return episAtivos.map(epiAtivo => {
      const estoque = estoqueDisponivel.find(e => e.tipoEpiId === epiAtivo.tipoEpi.id);
      const quantidadeDisponivel = estoque?._sum.quantidade || 0;
      const total = epiAtivo.quantidadeComColaboradores + quantidadeDisponivel;
      const percentualUtilizacao = total > 0 
        ? (epiAtivo.quantidadeComColaboradores / total) * 100 
        : 0;

      return {
        tipoEpi: epiAtivo.tipoEpi,
        quantidadeComColaboradores: epiAtivo.quantidadeComColaboradores,
        quantidadeDisponivelEstoque: quantidadeDisponivel,
        percentualUtilizacao: Math.round(percentualUtilizacao * 100) / 100,
        necessidadeReposicao: quantidadeDisponivel < epiAtivo.quantidadeComColaboradores * 0.2, // Menos de 20% em estoque
      };
    }).sort((a, b) => b.percentualUtilizacao - a.percentualUtilizacao);
  }

  async obterTiposSemItensAtivos(): Promise<Array<{
    tipoEpi: {
      id: string;
      nomeEquipamento: string;
      numeroCa: string;
    };
    quantidadeDisponivelEstoque: number;
  }>> {
    // Buscar tipos com itens ativos
    const tiposComItensAtivos = await this.prismaService.entregaItem.groupBy({
      by: ['estoqueItemOrigemId'],
      where: { status: 'COM_COLABORADOR' },
    }).then(itens =>
      this.prismaService.estoqueItem.groupBy({
        by: ['tipoEpiId'],
        where: { id: { in: itens.map(i => i.estoqueItemOrigemId) } },
      })
    );

    const tipoIdsComItensAtivos = tiposComItensAtivos.map(t => t.tipoEpiId);

    // Buscar tipos sem itens ativos mas com estoque
    const tiposSemItensAtivos = await this.prismaService.tipoEPI.findMany({
      where: {
        id: { notIn: tipoIdsComItensAtivos },
        status: 'ATIVO',
        estoqueItens: {
          some: {
            quantidade: { gt: 0 },
          },
        },
      },
      select: {
        id: true,
        nomeEquipamento: true,
        numeroCa: true,
        estoqueItens: {
          select: {
            quantidade: true,
          },
        },
      },
    });

    return tiposSemItensAtivos.map(tipo => ({
      tipoEpi: {
        id: tipo.id,
        nomeEquipamento: tipo.nomeEquipamento,
        numeroCa: tipo.numeroCa,
      },
      quantidadeDisponivelEstoque: tipo.estoqueItens.reduce((sum, item) => sum + item.quantidade, 0),
    }));
  }
}