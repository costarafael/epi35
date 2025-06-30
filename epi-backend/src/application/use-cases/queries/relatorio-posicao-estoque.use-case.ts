import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IEstoqueRepository } from '../../../domain/interfaces/repositories/estoque-repository.interface';
import { StatusEstoqueItem } from '../../../domain/enums';

export interface RelatorioEstoqueFilters {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  unidadeNegocioId?: string;
  apenasComSaldo?: boolean;
  apenasAbaixoMinimo?: boolean;
}

export interface ItemPosicaoEstoque {
  tipoEpiId: string;
  tipoEpiNome: string;
  tipoEpiCodigo: string;
  almoxarifadoId: string;
  almoxarifadoNome: string;
  almoxarifadoCodigo: string;
  unidadeNegocioNome: string;
  saldoDisponivel: number;
  saldoReservado: number;
  saldoAguardandoInspecao: number;
  saldoTotal: number;
  valorUnitario?: number;
  valorTotal?: number;
  estoqueMinimo?: number;
  situacao: 'NORMAL' | 'BAIXO' | 'CRITICO' | 'ZERO';
  diasEstoque?: number;
  ultimaMovimentacao?: Date;
}

export interface ResumoEstoque {
  totalItens: number;
  valorTotalEstoque: number;
  itensBaixoEstoque: number;
  itensEstoqueCritico: number;
  itensSemEstoque: number;
  porAlmoxarifado: {
    almoxarifadoNome: string;
    totalItens: number;
    valorTotal: number;
  }[];
  porTipoEpi: {
    tipoEpiNome: string;
    quantidadeTotal: number;
    valorTotal: number;
  }[];
}

@Injectable()
export class RelatorioPosicaoEstoqueUseCase {
  constructor(
    @Inject('IEstoqueRepository')
    private readonly estoqueRepository: IEstoqueRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(filtros: RelatorioEstoqueFilters = {}): Promise<{
    itens: ItemPosicaoEstoque[];
    resumo: ResumoEstoque;
    dataGeracao: Date;
  }> {
    // Construir query baseada nos filtros
    const whereClause = this.buildWhereClause(filtros);

    // Buscar dados de estoque com informações relacionadas
    const estoqueData = await this.prisma.estoqueItem.findMany({
      where: whereClause,
      include: {
        tipoEpi: {
          select: {
            id: true,
            nome: true,
            codigo: true,
          },
        },
        almoxarifado: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            unidadeNegocio: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
      orderBy: [
        { almoxarifado: { nome: 'asc' } },
        { tipoEpi: { nome: 'asc' } },
        { status: 'asc' },
      ],
    });

    // Agrupar por tipo de EPI e almoxarifado
    const itensAgrupados = this.agruparItensPorTipoEAlmoxarifado(estoqueData);

    // Buscar informações adicionais (última movimentação, consumo médio, etc.)
    const itensComDetalhes = await this.enriquecerComDetalhes(
      itensAgrupados,
      filtros,
    );

    // Calcular resumo
    const resumo = this.calcularResumo(itensComDetalhes);

    return {
      itens: itensComDetalhes,
      resumo,
      dataGeracao: new Date(),
    };
  }

  async obterKardexItem(
    almoxarifadoId: string,
    tipoEpiId: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<{
    movimentacoes: {
      data: Date;
      documento: string;
      tipoMovimentacao: string;
      entrada: number;
      saida: number;
      saldo: number;
      observacoes?: string;
    }[];
    saldoInicial: number;
    saldoFinal: number;
    totalEntradas: number;
    totalSaidas: number;
  }> {
    const whereMovimentacao: any = {
      almoxarifadoId,
      tipoEpiId,
    };

    if (dataInicio || dataFim) {
      whereMovimentacao.createdAt = {};
      if (dataInicio) whereMovimentacao.createdAt.gte = dataInicio;
      if (dataFim) whereMovimentacao.createdAt.lte = dataFim;
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where: whereMovimentacao,
      include: {
        notaMovimentacao: {
          select: { numero: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let saldoInicial = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;

    // Se há filtro de data, calcular saldo inicial
    if (dataInicio) {
      const movimentacaoAnterior = await this.prisma.movimentacaoEstoque.findFirst({
        where: {
          almoxarifadoId,
          tipoEpiId,
          createdAt: { lt: dataInicio },
        },
        orderBy: { createdAt: 'desc' },
      });
      saldoInicial = movimentacaoAnterior?.saldoPosterior || 0;
    }

    const kardex = movimentacoes.map(mov => {
      const isEntrada = ['ENTRADA', 'AJUSTE'].includes(mov.tipoMovimentacao) && 
        mov.saldoPosterior > mov.saldoAnterior;
      const isSaida = ['SAIDA', 'TRANSFERENCIA', 'DESCARTE'].includes(mov.tipoMovimentacao) ||
        (mov.tipoMovimentacao === 'AJUSTE' && mov.saldoPosterior < mov.saldoAnterior);

      const entrada = isEntrada ? mov.quantidade : 0;
      const saida = isSaida ? mov.quantidade : 0;

      totalEntradas += entrada;
      totalSaidas += saida;

      return {
        data: mov.createdAt,
        documento: mov.notaMovimentacao?.numero || `MOV-${mov.id.substring(0, 8)}`,
        tipoMovimentacao: mov.tipoMovimentacao,
        entrada,
        saida,
        saldo: mov.saldoPosterior,
        observacoes: mov.observacoes,
      };
    });

    const saldoFinal = movimentacoes.length > 0 
      ? movimentacoes[movimentacoes.length - 1].saldoPosterior 
      : saldoInicial;

    return {
      movimentacoes: kardex,
      saldoInicial,
      saldoFinal,
      totalEntradas,
      totalSaidas,
    };
  }

  async obterAnaliseGiroEstoque(
    almoxarifadoId?: string,
    periodo: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' = 'TRIMESTRAL',
  ): Promise<{
    analise: {
      tipoEpiId: string;
      tipoEpiNome: string;
      estoqueAtual: number;
      consumoMedio: number;
      giroEstoque: number;
      diasEstoque: number;
      classificacao: 'RAPIDO' | 'MEDIO' | 'LENTO' | 'PARADO';
      recomendacao: string;
    }[];
    periodoAnalise: { inicio: Date; fim: Date };
  }> {
    // Calcular período de análise
    const dataFim = new Date();
    const dataInicio = new Date();
    
    switch (periodo) {
      case 'MENSAL':
        dataInicio.setMonth(dataInicio.getMonth() - 1);
        break;
      case 'TRIMESTRAL':
        dataInicio.setMonth(dataInicio.getMonth() - 3);
        break;
      case 'SEMESTRAL':
        dataInicio.setMonth(dataInicio.getMonth() - 6);
        break;
      case 'ANUAL':
        dataInicio.setFullYear(dataInicio.getFullYear() - 1);
        break;
    }

    // Buscar consumo no período
    const consumoPorTipo = await this.prisma.movimentacaoEstoque.groupBy({
      by: ['tipoEpiId'],
      where: {
        ...(almoxarifadoId && { almoxarifadoId }),
        tipoMovimentacao: 'SAIDA',
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      _sum: { quantidade: true },
    });

    // Buscar estoque atual
    const estoqueAtual = await this.prisma.estoqueItem.groupBy({
      by: ['tipoEpiId'],
      where: {
        ...(almoxarifadoId && { almoxarifadoId }),
        status: StatusEstoqueItem.DISPONIVEL as any,
      },
      _sum: { quantidade: true },
    });

    // Buscar nomes dos tipos de EPI
    const tiposEpi = await this.prisma.tipoEPI.findMany({
      where: {
        id: {
          in: [...consumoPorTipo.map(c => c.tipoEpiId), ...estoqueAtual.map(e => e.tipoEpiId)],
        },
      },
      select: { id: true, nome: true },
    });

    // Calcular análise de giro
    const diasPeriodo = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    
    const analise = tiposEpi.map(tipo => {
      const consumo = consumoPorTipo.find(c => c.tipoEpiId === tipo.id)?._sum.quantidade || 0;
      const estoque = estoqueAtual.find(e => e.tipoEpiId === tipo.id)?._sum.quantidade || 0;
      
      const consumoMedio = consumo / diasPeriodo;
      const giroEstoque = estoque > 0 ? consumo / estoque : 0;
      const diasEstoque = consumoMedio > 0 ? estoque / consumoMedio : 999;

      let classificacao: 'RAPIDO' | 'MEDIO' | 'LENTO' | 'PARADO';
      let recomendacao: string;

      if (consumoMedio === 0) {
        classificacao = 'PARADO';
        recomendacao = 'Item sem movimento. Avaliar necessidade.';
      } else if (diasEstoque <= 30) {
        classificacao = 'RAPIDO';
        recomendacao = 'Giro alto. Monitorar para evitar ruptura.';
      } else if (diasEstoque <= 90) {
        classificacao = 'MEDIO';
        recomendacao = 'Giro adequado. Manter níveis atuais.';
      } else {
        classificacao = 'LENTO';
        recomendacao = 'Giro baixo. Considerar redução de estoque.';
      }

      return {
        tipoEpiId: tipo.id,
        tipoEpiNome: tipo.nome,
        estoqueAtual: estoque,
        consumoMedio: Math.round(consumoMedio * 100) / 100,
        giroEstoque: Math.round(giroEstoque * 100) / 100,
        diasEstoque: Math.round(diasEstoque),
        classificacao,
        recomendacao,
      };
    }).sort((a, b) => b.giroEstoque - a.giroEstoque);

    return {
      analise,
      periodoAnalise: { inicio: dataInicio, fim: dataFim },
    };
  }

  private buildWhereClause(filtros: RelatorioEstoqueFilters): any {
    const where: any = {};

    if (filtros.almoxarifadoId) {
      where.almoxarifadoId = filtros.almoxarifadoId;
    }

    if (filtros.tipoEpiId) {
      where.tipoEpiId = filtros.tipoEpiId;
    }

    if (filtros.unidadeNegocioId) {
      where.almoxarifado = {
        unidadeNegocioId: filtros.unidadeNegocioId,
      };
    }

    if (filtros.apenasComSaldo) {
      where.quantidade = { gt: 0 };
    }

    return where;
  }

  private agruparItensPorTipoEAlmoxarifado(estoqueData: any[]): ItemPosicaoEstoque[] {
    const grupos = new Map<string, ItemPosicaoEstoque>();

    for (const item of estoqueData) {
      const chave = `${item.almoxarifadoId}-${item.tipoEpiId}`;
      
      if (!grupos.has(chave)) {
        grupos.set(chave, {
          tipoEpiId: item.tipoEpiId,
          tipoEpiNome: item.tipoEpi.nome,
          tipoEpiCodigo: item.tipoEpi.codigo,
          almoxarifadoId: item.almoxarifadoId,
          almoxarifadoNome: item.almoxarifado.nome,
          almoxarifadoCodigo: item.almoxarifado.codigo,
          unidadeNegocioNome: item.almoxarifado.unidadeNegocio.nome,
          saldoDisponivel: 0,
          saldoReservado: 0,
          saldoAguardandoInspecao: 0,
          saldoTotal: 0,
          situacao: 'ZERO',
        });
      }

      const grupo = grupos.get(chave)!;
      
      switch (item.status) {
        case StatusEstoqueItem.DISPONIVEL:
          grupo.saldoDisponivel += item.quantidade;
          break;
        case StatusEstoqueItem.RESERVADO:
          grupo.saldoReservado += item.quantidade;
          break;
        case StatusEstoqueItem.AGUARDANDO_INSPECAO:
          grupo.saldoAguardandoInspecao += item.quantidade;
          break;
      }
      
      grupo.saldoTotal = grupo.saldoDisponivel + grupo.saldoReservado + grupo.saldoAguardandoInspecao;
    }

    return Array.from(grupos.values());
  }

  private async enriquecerComDetalhes(
    itens: ItemPosicaoEstoque[],
    filtros: RelatorioEstoqueFilters,
  ): Promise<ItemPosicaoEstoque[]> {
    // Para cada item, buscar última movimentação e calcular situação
    for (const item of itens) {
      // Buscar última movimentação
      const ultimaMovimentacao = await this.prisma.movimentacaoEstoque.findFirst({
        where: {
          almoxarifadoId: item.almoxarifadoId,
          tipoEpiId: item.tipoEpiId,
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      item.ultimaMovimentacao = ultimaMovimentacao?.createdAt;

      // Calcular situação do estoque
      item.situacao = this.calcularSituacaoEstoque(item);
    }

    // Filtrar itens abaixo do mínimo se solicitado
    if (filtros.apenasAbaixoMinimo) {
      return itens.filter(item => ['BAIXO', 'CRITICO', 'ZERO'].includes(item.situacao));
    }

    return itens;
  }

  private calcularSituacaoEstoque(item: ItemPosicaoEstoque): 'NORMAL' | 'BAIXO' | 'CRITICO' | 'ZERO' {
    if (item.saldoTotal === 0) {
      return 'ZERO';
    }

    // Lógica simples para demonstração - em produção seria baseada em estoque mínimo
    if (item.saldoTotal <= 5) {
      return 'CRITICO';
    } else if (item.saldoTotal <= 20) {
      return 'BAIXO';
    } else {
      return 'NORMAL';
    }
  }

  private calcularResumo(itens: ItemPosicaoEstoque[]): ResumoEstoque {
    const totalItens = itens.length;
    const itensBaixoEstoque = itens.filter(i => i.situacao === 'BAIXO').length;
    const itensEstoqueCritico = itens.filter(i => i.situacao === 'CRITICO').length;
    const itensSemEstoque = itens.filter(i => i.situacao === 'ZERO').length;

    // Agrupar por almoxarifado
    const porAlmoxarifado = itens.reduce((acc, item) => {
      const existing = acc.find(a => a.almoxarifadoNome === item.almoxarifadoNome);
      if (existing) {
        existing.totalItens++;
        existing.valorTotal += item.valorTotal || 0;
      } else {
        acc.push({
          almoxarifadoNome: item.almoxarifadoNome,
          totalItens: 1,
          valorTotal: item.valorTotal || 0,
        });
      }
      return acc;
    }, [] as any[]);

    // Agrupar por tipo de EPI
    const porTipoEpi = itens.reduce((acc, item) => {
      const existing = acc.find(t => t.tipoEpiNome === item.tipoEpiNome);
      if (existing) {
        existing.quantidadeTotal += item.saldoTotal;
        existing.valorTotal += item.valorTotal || 0;
      } else {
        acc.push({
          tipoEpiNome: item.tipoEpiNome,
          quantidadeTotal: item.saldoTotal,
          valorTotal: item.valorTotal || 0,
        });
      }
      return acc;
    }, [] as any[]);

    return {
      totalItens,
      valorTotalEstoque: itens.reduce((sum, item) => sum + (item.valorTotal || 0), 0),
      itensBaixoEstoque,
      itensEstoqueCritico,
      itensSemEstoque,
      porAlmoxarifado: porAlmoxarifado.sort((a, b) => b.valorTotal - a.valorTotal),
      porTipoEpi: porTipoEpi.sort((a, b) => b.valorTotal - a.valorTotal),
    };
  }
}