import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface ControleVencimentosInput {
  colaboradorId?: string;
  tipoEpiId?: string;
  almoxarifadoId?: string;
  diasAntecedencia?: number; // Dias de antecedência para alertas (padrão: 30)
  incluirVencidos?: boolean;
  incluirProximosVencimento?: boolean;
  apenasVencidos?: boolean;
  dataReferencia?: Date; // Data de referência para cálculos (padrão: hoje)
  limit?: number;
  offset?: number;
}

export interface ControleVencimentosOutput {
  entregaItemId: string;
  colaborador: {
    id: string;
    nome: string;
    cpf: string;
    matricula: string;
    setor: string;
    cargo: string;
  };
  tipoEpi: {
    id: string;
    nomeEquipamento: string;
    numeroCa: string;
    vidaUtilDias: number;
  };
  almoxarifado: {
    id: string;
    nome: string;
  };
  dataEntrega: Date;
  dataLimiteDevolucao: Date;
  diasParaVencimento: number; // Negativo se já vencido
  statusVencimento: 'VENCIDO' | 'VENCE_HOJE' | 'VENCE_EM_BREVE' | 'DENTRO_PRAZO';
  diasPosse: number;
  prioridade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
}

@Injectable()
export class ControleVencimentosUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: ControleVencimentosInput = {}): Promise<ControleVencimentosOutput[]> {
    const dataReferencia = input.dataReferencia || new Date();
    const diasAntecedencia = input.diasAntecedencia || 30;

    const whereClause: any = {
      status: 'COM_COLABORADOR',
      dataLimiteDevolucao: {
        not: null,
      },
    };

    if (input.colaboradorId) {
      whereClause.entrega = {
        fichaEpi: {
          colaboradorId: input.colaboradorId,
        },
      };
    }

    if (input.tipoEpiId) {
      whereClause.estoqueItemOrigem = {
        tipoEpiId: input.tipoEpiId,
      };
    }

    if (input.almoxarifadoId) {
      whereClause.estoqueItemOrigem = {
        ...whereClause.estoqueItemOrigem,
        almoxarifadoId: input.almoxarifadoId,
      };
    }

    // Aplicar filtros de data baseados no tipo de busca
    if (input.apenasVencidos) {
      whereClause.dataLimiteDevolucao.lt = dataReferencia;
    } else if (input.incluirVencidos && input.incluirProximosVencimento) {
      // Buscar vencidos e próximos ao vencimento
      const dataLimiteSuperior = new Date(dataReferencia);
      dataLimiteSuperior.setDate(dataLimiteSuperior.getDate() + diasAntecedencia);
      whereClause.dataLimiteDevolucao.lte = dataLimiteSuperior;
    } else if (input.incluirProximosVencimento) {
      // Apenas próximos ao vencimento (não vencidos)
      const dataLimiteSuperior = new Date(dataReferencia);
      dataLimiteSuperior.setDate(dataLimiteSuperior.getDate() + diasAntecedencia);
      whereClause.dataLimiteDevolucao = {
        gte: dataReferencia,
        lte: dataLimiteSuperior,
      };
    }

    const itens = await this.prismaService.entregaItem.findMany({
      where: whereClause,
      include: {
        entrega: {
          include: {
            fichaEpi: {
              include: {
                colaborador: {
                  select: {
                    id: true,
                    nome: true,
                    cpf: true,
                    matricula: true,
                    setor: true,
                    cargo: true,
                  },
                },
              },
            },
          },
        },
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
      orderBy: {
        dataLimiteDevolucao: 'asc',
      },
      take: input.limit || undefined,
      skip: input.offset || undefined,
    });

    return itens.map(item => {
      const dataLimiteDevolucao = item.dataLimiteDevolucao!;
      const diasParaVencimento = Math.floor(
        (dataLimiteDevolucao.getTime() - dataReferencia.getTime()) / (1000 * 60 * 60 * 24)
      );
      const diasPosse = Math.floor(
        (dataReferencia.getTime() - item.entrega.dataEntrega.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determinar status de vencimento
      let statusVencimento: 'VENCIDO' | 'VENCE_HOJE' | 'VENCE_EM_BREVE' | 'DENTRO_PRAZO';
      if (diasParaVencimento < 0) {
        statusVencimento = 'VENCIDO';
      } else if (diasParaVencimento === 0) {
        statusVencimento = 'VENCE_HOJE';
      } else if (diasParaVencimento <= 7) {
        statusVencimento = 'VENCE_EM_BREVE';
      } else {
        statusVencimento = 'DENTRO_PRAZO';
      }

      // Determinar prioridade
      let prioridade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
      if (diasParaVencimento < -30) {
        prioridade = 'CRITICA'; // Muito atrasado
      } else if (diasParaVencimento < 0 || diasParaVencimento === 0) {
        prioridade = 'ALTA'; // Vencido ou vence hoje
      } else if (diasParaVencimento <= 7) {
        prioridade = 'MEDIA'; // Vence em uma semana
      } else {
        prioridade = 'BAIXA'; // Ainda tem tempo
      }

      return {
        entregaItemId: item.id,
        colaborador: item.entrega.fichaEpi.colaborador,
        tipoEpi: item.estoqueItemOrigem.tipoEpi,
        almoxarifado: item.estoqueItemOrigem.almoxarifado,
        dataEntrega: item.entrega.dataEntrega,
        dataLimiteDevolucao,
        diasParaVencimento,
        statusVencimento,
        diasPosse,
        prioridade,
      };
    });
  }

  async obterEstatisticas(input: ControleVencimentosInput = {}): Promise<{
    totalItensMonitorados: number;
    itensVencidos: number;
    itensVenceHoje: number;
    itensVenceEmBreve: number; // próximos 7 dias
    itensDentroPrazo: number;
    mediadiasParaVencimento: number;
    distribuicaoPorPrioridade: Array<{ prioridade: string; quantidade: number }>;
    colaboradoresComItensVencidos: number;
    tiposEpiComMaisVencimentos: Array<{
      tipoEpi: { id: string; nomeEquipamento: string; numeroCa: string };
      itensVencidos: number;
      itensProximosVencimento: number;
    }>;
  }> {
    const itens = await this.execute({
      ...input,
      incluirVencidos: true,
      incluirProximosVencimento: true,
    });

    const statusMap = new Map<string, number>();
    const prioridadeMap = new Map<string, number>();
    const colaboradoresVencidos = new Set<string>();
    const tiposEpiMap = new Map<string, { 
      tipoEpi: any; 
      vencidos: number; 
      proximosVencimento: number; 
    }>();

    let somaDiasVencimento = 0;

    for (const item of itens) {
      // Contadores por status
      statusMap.set(item.statusVencimento, (statusMap.get(item.statusVencimento) || 0) + 1);
      
      // Contadores por prioridade
      prioridadeMap.set(item.prioridade, (prioridadeMap.get(item.prioridade) || 0) + 1);
      
      // Colaboradores com itens vencidos
      if (item.statusVencimento === 'VENCIDO') {
        colaboradoresVencidos.add(item.colaborador.id);
      }

      // Tipos de EPI com vencimentos
      const tipoId = item.tipoEpi.id;
      if (!tiposEpiMap.has(tipoId)) {
        tiposEpiMap.set(tipoId, {
          tipoEpi: item.tipoEpi,
          vencidos: 0,
          proximosVencimento: 0,
        });
      }
      const tipoData = tiposEpiMap.get(tipoId)!;
      if (item.statusVencimento === 'VENCIDO') {
        tipoData.vencidos++;
      } else if (item.statusVencimento === 'VENCE_EM_BREVE' || item.statusVencimento === 'VENCE_HOJE') {
        tipoData.proximosVencimento++;
      }

      somaDiasVencimento += item.diasParaVencimento;
    }

    const mediaDias = itens.length > 0 ? somaDiasVencimento / itens.length : 0;

    return {
      totalItensMonitorados: itens.length,
      itensVencidos: statusMap.get('VENCIDO') || 0,
      itensVenceHoje: statusMap.get('VENCE_HOJE') || 0,
      itensVenceEmBreve: statusMap.get('VENCE_EM_BREVE') || 0,
      itensDentroPrazo: statusMap.get('DENTRO_PRAZO') || 0,
      mediadiasParaVencimento: Math.round(mediaDias),
      distribuicaoPorPrioridade: Array.from(prioridadeMap.entries()).map(([prioridade, quantidade]) => ({
        prioridade,
        quantidade,
      })),
      colaboradoresComItensVencidos: colaboradoresVencidos.size,
      tiposEpiComMaisVencimentos: Array.from(tiposEpiMap.values())
        .filter(tipo => tipo.vencidos > 0 || tipo.proximosVencimento > 0)
        .sort((a, b) => (b.vencidos + b.proximosVencimento) - (a.vencidos + a.proximosVencimento))
        .map(tipo => ({
          tipoEpi: {
            id: tipo.tipoEpi.id,
            nomeEquipamento: tipo.tipoEpi.nomeEquipamento,
            numeroCa: tipo.tipoEpi.numeroCa,
          },
          itensVencidos: tipo.vencidos,
          itensProximosVencimento: tipo.proximosVencimento,
        })),
    };
  }

  async obterItensVencidosCriticos(diasMinimo: number = 30): Promise<ControleVencimentosOutput[]> {
    const itens = await this.execute({
      apenasVencidos: true,
      incluirVencidos: true,
    });

    return itens
      .filter(item => Math.abs(item.diasParaVencimento) >= diasMinimo)
      .sort((a, b) => a.diasParaVencimento - b.diasParaVencimento); // Mais vencidos primeiro
  }

  async obterColaboradoresComMaisVencimentos(): Promise<Array<{
    colaborador: {
      id: string;
      nome: string;
      matricula: string;
      setor: string;
    };
    totalItensVencidos: number;
    totalItensProximosVencimento: number;
    itemMaisAtrasado: {
      tipoEpi: string;
      diasAtraso: number;
    };
  }>> {
    const itens = await this.execute({
      incluirVencidos: true,
      incluirProximosVencimento: true,
    });

    const colaboradoresMap = new Map<string, {
      colaborador: any;
      itens: ControleVencimentosOutput[];
    }>();

    // Agrupar por colaborador
    for (const item of itens) {
      const colabId = item.colaborador.id;
      if (!colaboradoresMap.has(colabId)) {
        colaboradoresMap.set(colabId, {
          colaborador: item.colaborador,
          itens: [],
        });
      }
      colaboradoresMap.get(colabId)!.itens.push(item);
    }

    return Array.from(colaboradoresMap.values())
      .map(colabData => {
        const itensVencidos = colabData.itens.filter(item => item.statusVencimento === 'VENCIDO');
        const itensProximos = colabData.itens.filter(item => 
          item.statusVencimento === 'VENCE_HOJE' || item.statusVencimento === 'VENCE_EM_BREVE'
        );

        const itemMaisAtrasado = itensVencidos
          .sort((a, b) => a.diasParaVencimento - b.diasParaVencimento)[0];

        return {
          colaborador: {
            id: colabData.colaborador.id,
            nome: colabData.colaborador.nome,
            matricula: colabData.colaborador.matricula,
            setor: colabData.colaborador.setor,
          },
          totalItensVencidos: itensVencidos.length,
          totalItensProximosVencimento: itensProximos.length,
          itemMaisAtrasado: itemMaisAtrasado ? {
            tipoEpi: itemMaisAtrasado.tipoEpi.nomeEquipamento,
            diasAtraso: Math.abs(itemMaisAtrasado.diasParaVencimento),
          } : { tipoEpi: '', diasAtraso: 0 },
        };
      })
      .filter(colab => colab.totalItensVencidos > 0 || colab.totalItensProximosVencimento > 0)
      .sort((a, b) => b.totalItensVencidos - a.totalItensVencidos);
  }

  async gerarRelatorioVencimentosPorPeriodo(dataInicio: Date, dataFim: Date): Promise<{
    periodo: { inicio: Date; fim: Date };
    vencimentosPorDia: Array<{
      data: Date;
      quantidadeVencimentos: number;
      itens: Array<{
        colaborador: string;
        tipoEpi: string;
        diasAtraso: number;
      }>;
    }>;
    resumo: {
      totalVencimentos: number;
      diaComMaisVencimentos: Date;
      maxVencimentosDia: number;
    };
  }> {
    const vencimentosPorDia = new Map<string, {
      data: Date;
      itens: ControleVencimentosOutput[];
    }>();

    // Iterar por cada dia no período
    const dataAtual = new Date(dataInicio);
    while (dataAtual <= dataFim) {
      const itensVencendoHoje = await this.execute({
        dataReferencia: new Date(dataAtual),
        apenasVencidos: false,
        incluirVencidos: false,
        incluirProximosVencimento: false,
      }).then(items => items.filter(item => item.statusVencimento === 'VENCE_HOJE'));

      if (itensVencendoHoje.length > 0) {
        const dateKey = dataAtual.toISOString().split('T')[0];
        vencimentosPorDia.set(dateKey, {
          data: new Date(dataAtual),
          itens: itensVencendoHoje,
        });
      }

      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    // Converter para formato de saída
    const vencimentos = Array.from(vencimentosPorDia.values()).map(diaData => ({
      data: diaData.data,
      quantidadeVencimentos: diaData.itens.length,
      itens: diaData.itens.map(item => ({
        colaborador: item.colaborador.nome,
        tipoEpi: item.tipoEpi.nomeEquipamento,
        diasAtraso: Math.abs(item.diasParaVencimento),
      })),
    }));

    // Calcular resumo
    const totalVencimentos = vencimentos.reduce((sum, dia) => sum + dia.quantidadeVencimentos, 0);
    const diaComMais = vencimentos.reduce((max, dia) => 
      dia.quantidadeVencimentos > max.quantidadeVencimentos ? dia : max, 
      vencimentos[0] || { data: dataInicio, quantidadeVencimentos: 0 }
    );

    return {
      periodo: { inicio: dataInicio, fim: dataFim },
      vencimentosPorDia: vencimentos.sort((a, b) => a.data.getTime() - b.data.getTime()),
      resumo: {
        totalVencimentos,
        diaComMaisVencimentos: diaComMais.data,
        maxVencimentosDia: diaComMais.quantidadeVencimentos,
      },
    };
  }
}