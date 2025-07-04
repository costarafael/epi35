import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IEstoqueRepository } from '../../../domain/interfaces/repositories/estoque-repository.interface';
import { StatusEstoqueItem } from '../../../domain/enums';
import { ConfiguracaoService } from '../../../domain/services/configuracao.service';

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
  situacao: 'NORMAL' | 'BAIXO' | 'ZERO';
  diasEstoque?: number;
  ultimaMovimentacao?: Date;
}

export interface ResumoEstoque {
  totalItens: number;
  valorTotalEstoque: number;
  itensBaixoEstoque: number;
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
    private readonly configuracaoService: ConfiguracaoService,
  ) {}

  async execute(filtros: RelatorioEstoqueFilters = {}): Promise<{
    itens: ItemPosicaoEstoque[];
    resumo: ResumoEstoque;
    dataGeracao: Date;
  }> {
    // Construir query baseada nos filtros
    const whereClause = await this.buildWhereClause(filtros);

    // Buscar dados de estoque com informações relacionadas
    const estoqueData = await this.prisma.estoqueItem.findMany({
      where: whereClause,
      include: {
        tipoEpi: {
          select: {
            id: true,
            nomeEquipamento: true,
            numeroCa: true,
          },
        },
        almoxarifado: {
          select: {
            id: true,
            nome: true,
            // codigo field removed from almoxarifado schema
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
        { tipoEpi: { nomeEquipamento: 'asc' } },
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
    // Primeiro buscar o estoqueItemId que corresponde ao almoxarifado e tipo
    const estoqueItem = await this.prisma.estoqueItem.findFirst({
      where: {
        almoxarifadoId: almoxarifadoId,
        tipoEpiId: tipoEpiId,
      }
    });

    if (!estoqueItem) {
      return { movimentacoes: [], saldoInicial: 0, saldoFinal: 0, totalEntradas: 0, totalSaidas: 0 };
    }

    const whereMovimentacao: any = {
      estoqueItemId: estoqueItem.id,
    };

    if (dataInicio || dataFim) {
      whereMovimentacao.dataMovimentacao = {};
      if (dataInicio) whereMovimentacao.dataMovimentacao.gte = dataInicio;
      if (dataFim) whereMovimentacao.dataMovimentacao.lte = dataFim;
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where: whereMovimentacao,
      include: {
        notaMovimentacao: {
          select: { numeroDocumento: true, observacoes: true },
        },
      },
      orderBy: { dataMovimentacao: 'asc' },
    });

    let saldoInicial = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;

    // Se há filtro de data, calcular saldo inicial
    if (dataInicio) {
      const movimentacoesAnteriores = await this.prisma.movimentacaoEstoque.findMany({
        where: {
          estoqueItemId: estoqueItem.id,
          dataMovimentacao: { lt: dataInicio },
        },
        select: { quantidadeMovida: true, tipoMovimentacao: true },
      });
      
      saldoInicial = movimentacoesAnteriores.reduce((saldo, mov) => {
        if (mov.tipoMovimentacao.includes('ENTRADA')) {
          return saldo + mov.quantidadeMovida;
        } else if (mov.tipoMovimentacao.includes('SAIDA')) {
          return saldo - mov.quantidadeMovida;
        }
        return saldo;
      }, 0);
    }

    let saldoAcumulado = saldoInicial;
    const kardex = movimentacoes.map(mov => {
      const isEntrada = mov.tipoMovimentacao.includes('ENTRADA') || 
        mov.tipoMovimentacao.includes('AJUSTE_POSITIVO');
      const isSaida = mov.tipoMovimentacao.includes('SAIDA') || 
        mov.tipoMovimentacao.includes('AJUSTE_NEGATIVO');

      const entrada = isEntrada ? mov.quantidadeMovida : 0;
      const saida = isSaida ? mov.quantidadeMovida : 0;
      
      saldoAcumulado += entrada - saida;
      totalEntradas += entrada;
      totalSaidas += saida;

      return {
        data: mov.dataMovimentacao,
        documento: mov.notaMovimentacao?.numeroDocumento || `MOV-${mov.id.substring(0, 8)}`,
        tipoMovimentacao: mov.tipoMovimentacao,
        entrada,
        saida,
        saldo: saldoAcumulado,
        observacoes: mov.notaMovimentacao?.observacoes,
      };
    });

    const saldoFinal = saldoAcumulado;

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
    // Primeiro buscar estoqueItemIds do almoxarifado se especificado
    let estoqueItemIds: string[] | undefined;
    if (almoxarifadoId) {
      const itensEstoque = await this.prisma.estoqueItem.findMany({
        where: { almoxarifadoId },
        select: { id: true }
      });
      estoqueItemIds = itensEstoque.map(item => item.id);
    }

    // Filter by SAIDA movements using enum values
    const whereClause: any = {
      tipoMovimentacao: { 
        in: [
          'SAIDA_ENTREGA',
          'SAIDA_TRANSFERENCIA', 
          'SAIDA_DESCARTE',
          'AJUSTE_NEGATIVO'
        ]
      },
      dataMovimentacao: {
        gte: dataInicio,
        lte: dataFim,
      },
    };
    if (estoqueItemIds) {
      whereClause.estoqueItemId = { in: estoqueItemIds };
    }

    const consumoPorTipo = await this.prisma.movimentacaoEstoque.findMany({
      where: whereClause,
      select: {
        estoqueItemId: true,
        quantidadeMovida: true,
      },
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

    // Manual aggregation to replace groupBy
    const consumoMap = new Map<string, number>();
    for (const movimento of consumoPorTipo) {
      // Get the estoqueItem to find the tipoEpiId
      const estoqueItem = await this.prisma.estoqueItem.findUnique({
        where: { id: movimento.estoqueItemId },
        select: { tipoEpiId: true }
      });
      if (estoqueItem) {
        const currentSum = consumoMap.get(estoqueItem.tipoEpiId) || 0;
        consumoMap.set(estoqueItem.tipoEpiId, currentSum + movimento.quantidadeMovida);
      }
    }

    // Get unique tipoEpiIds from both sources
    const tipoEpiIds = new Set([
      ...Array.from(consumoMap.keys()),
      ...estoqueAtual.map(e => e.tipoEpiId)
    ]);

    // Buscar nomes dos tipos de EPI
    const tiposEpi = await this.prisma.tipoEPI.findMany({
      where: {
        id: {
          in: Array.from(tipoEpiIds),
        },
      },
      select: { id: true, nomeEquipamento: true },
    });

    // Calcular análise de giro
    const diasPeriodo = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));

    const analise = tiposEpi.map(tipo => {
      const consumo = consumoMap.get(tipo.id) || 0;
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
        tipoEpiNome: tipo.nomeEquipamento,
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

  private async buildWhereClause(filtros: RelatorioEstoqueFilters): Promise<any> {
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
      // Check if negative stock should be included
      const permitirEstoqueNegativo = await this.configuracaoService.permitirEstoqueNegativo();
      if (permitirEstoqueNegativo) {
        // Include all non-zero values (positive and negative)
        where.quantidade = { not: 0 };
      } else {
        // Only include positive values
        where.quantidade = { gt: 0 };
      }
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
          tipoEpiNome: item.tipoEpi.nomeEquipamento,
          tipoEpiCodigo: item.tipoEpi.numeroCa,
          almoxarifadoId: item.almoxarifadoId,
          almoxarifadoNome: item.almoxarifado.nome,
          almoxarifadoCodigo: '', // codigo field removed from almoxarifado schema
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
        // RESERVADO status removed from schema v3.5
        case StatusEstoqueItem.QUARENTENA:
          grupo.saldoReservado += item.quantidade; // Using reservado field for quarentena items
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
      // Buscar última movimentação para este tipo de EPI e almoxarifado
      const estoqueItem = await this.prisma.estoqueItem.findFirst({
        where: {
          tipoEpiId: item.tipoEpiId,
          almoxarifadoId: item.almoxarifadoId,
        },
      });

      if (estoqueItem) {
        const ultimaMovimentacao = await this.prisma.movimentacaoEstoque.findFirst({
          where: {
            estoqueItemId: estoqueItem.id,
          },
          orderBy: { dataMovimentacao: 'desc' },
          select: { dataMovimentacao: true },
        });
        
        item.ultimaMovimentacao = ultimaMovimentacao?.dataMovimentacao;
      }

      // Calcular situação do estoque
      item.situacao = await this.calcularSituacaoEstoque(item);
    }

    // Filtrar itens abaixo do mínimo se solicitado
    if (filtros.apenasAbaixoMinimo) {
      return itens.filter(item => ['BAIXO', 'ZERO'].includes(item.situacao));
    }

    return itens;
  }

  private async calcularSituacaoEstoque(item: ItemPosicaoEstoque): Promise<'NORMAL' | 'BAIXO' | 'ZERO'> {
    if (item.saldoTotal === 0) {
      return 'ZERO';
    }

    // Usar configuração global de estoque mínimo
    const estoqueMinimo = await this.configuracaoService.obterEstoqueMinimoEquipamento();
    
    if (item.saldoTotal < estoqueMinimo) {
      return 'BAIXO';
    } else {
      return 'NORMAL';
    }
  }

  private calcularResumo(itens: ItemPosicaoEstoque[]): ResumoEstoque {
    const totalItens = itens.length;
    const itensBaixoEstoque = itens.filter(i => i.situacao === 'BAIXO').length;
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
      itensSemEstoque,
      porAlmoxarifado: porAlmoxarifado.sort((a, b) => b.valorTotal - a.valorTotal),
      porTipoEpi: porTipoEpi.sort((a, b) => b.valorTotal - a.valorTotal),
    };
  }
}