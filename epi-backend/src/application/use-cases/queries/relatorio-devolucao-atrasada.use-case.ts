import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RelatorioDevolucaoAtrasadaInput {
  colaboradorId?: string;
  tipoEpiId?: string;
  almoxarifadoId?: string;
  diasAtraso?: number; // Mínimo de dias de atraso
  limit?: number;
  offset?: number;
}

export interface RelatorioDevolucaoAtrasadaOutput {
  fichaId: string;
  colaborador: {
    id: string;
    nome: string;
    matricula: string;
    cpf: string;
    cargo: string;
    setor: string;
  };
  itensAtrasados: Array<{
    entregaItemId: string;
    tipoEpi: {
      id: string;
      nomeEquipamento: string;
      numeroCa: string;
    };
    almoxarifado: {
      nome: string;
    };
    dataLimiteDevolucao: Date;
    diasAtraso: number;
    dataEntrega: Date;
  }>;
  totalItensAtrasados: number;
  maiorAtraso: number;
}

@Injectable()
export class RelatorioDevolucaoAtrasadaUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: RelatorioDevolucaoAtrasadaInput = {}): Promise<RelatorioDevolucaoAtrasadaOutput[]> {
    const hoje = new Date();
    
    // Buscar itens atrasados primeiro
    const whereClauseItens: any = {
      status: 'COM_COLABORADOR',
      dataLimiteDevolucao: {
        not: null,
        lt: hoje,
      },
    };

    if (input.tipoEpiId) {
      whereClauseItens.estoqueItemOrigem = {
        tipoEpiId: input.tipoEpiId,
      };
    }

    if (input.almoxarifadoId) {
      whereClauseItens.estoqueItemOrigem = {
        ...whereClauseItens.estoqueItemOrigem,
        almoxarifadoId: input.almoxarifadoId,
      };
    }

    const itensAtrasados = await this.prismaService.entregaItem.findMany({
      where: whereClauseItens,
      include: {
        entrega: {
          include: {
            fichaEpi: {
              include: {
                colaborador: {
                  select: {
                    id: true,
                    nome: true,
                    matricula: true,
                    cpf: true,
                    cargo: true,
                    setor: true,
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
              },
            },
            almoxarifado: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
      orderBy: {
        dataLimiteDevolucao: 'asc',
      },
    });

    // Filtrar por colaborador se especificado
    const itensFiltrados = input.colaboradorId 
      ? itensAtrasados.filter(item => item.entrega.fichaEpi.colaboradorId === input.colaboradorId)
      : itensAtrasados;

    // Agrupar por ficha/colaborador
    const fichasMap = new Map<string, any>();

    for (const item of itensFiltrados) {
      const fichaId = item.entrega.fichaEpiId;
      const diasAtraso = Math.floor((hoje.getTime() - item.dataLimiteDevolucao!.getTime()) / (1000 * 60 * 60 * 24));

      // Aplicar filtro de dias de atraso se especificado
      if (input.diasAtraso && diasAtraso < input.diasAtraso) {
        continue;
      }

      if (!fichasMap.has(fichaId)) {
        fichasMap.set(fichaId, {
          fichaId,
          colaborador: item.entrega.fichaEpi.colaborador,
          itensAtrasados: [],
          totalItensAtrasados: 0,
          maiorAtraso: 0,
        });
      }

      const ficha = fichasMap.get(fichaId);
      ficha.itensAtrasados.push({
        entregaItemId: item.id,
        tipoEpi: item.estoqueItemOrigem.tipoEpi,
        almoxarifado: item.estoqueItemOrigem.almoxarifado,
        dataLimiteDevolucao: item.dataLimiteDevolucao!,
        diasAtraso,
        dataEntrega: item.entrega.dataEntrega,
      });
      ficha.totalItensAtrasados++;
      ficha.maiorAtraso = Math.max(ficha.maiorAtraso, diasAtraso);
    }

    const resultado = Array.from(fichasMap.values());

    // Ordenar por maior atraso e nome do colaborador
    resultado.sort((a, b) => {
      if (a.maiorAtraso !== b.maiorAtraso) {
        return b.maiorAtraso - a.maiorAtraso;
      }
      return a.colaborador.nome.localeCompare(b.colaborador.nome);
    });

    // Aplicar paginação se especificada
    if (input.limit || input.offset) {
      const start = input.offset || 0;
      const end = input.limit ? start + input.limit : undefined;
      return resultado.slice(start, end);
    }

    return resultado;
  }

  async obterEstatisticas(input: RelatorioDevolucaoAtrasadaInput = {}): Promise<{
    totalColaboradoresComAtraso: number;
    totalItensAtrasados: number;
    tiposEpiComAtraso: number;
    mediaDiasAtraso: number;
    maiorAtrasoSistema: number;
    atrasoPorFaixaDias: Array<{
      faixa: string;
      colaboradores: number;
      itens: number;
    }>;
  }> {
    const hoje = new Date();

    const whereClause: any = {
      status: 'COM_COLABORADOR',
      dataLimiteDevolucao: {
        not: null,
        lt: hoje,
      },
    };

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

    const itensAtrasados = await this.prismaService.entregaItem.findMany({
      where: whereClause,
      include: {
        entrega: {
          select: {
            fichaEpi: {
              select: {
                colaboradorId: true,
              },
            },
          },
        },
        estoqueItemOrigem: {
          select: {
            tipoEpiId: true,
          },
        },
      },
    });

    if (itensAtrasados.length === 0) {
      return {
        totalColaboradoresComAtraso: 0,
        totalItensAtrasados: 0,
        tiposEpiComAtraso: 0,
        mediaDiasAtraso: 0,
        maiorAtrasoSistema: 0,
        atrasoPorFaixaDias: [],
      };
    }

    const colaboradoresUnicos = new Set<string>();
    const tiposEpiUnicos = new Set<string>();
    const diasAtraso: number[] = [];
    const faixas = {
      '1-7 dias': 0,
      '8-15 dias': 0,
      '16-30 dias': 0,
      '31-60 dias': 0,
      'Mais de 60 dias': 0,
    };

    for (const item of itensAtrasados) {
      colaboradoresUnicos.add(item.entrega.fichaEpi.colaboradorId);
      tiposEpiUnicos.add(item.estoqueItemOrigem.tipoEpiId);
      
      const dias = Math.floor((hoje.getTime() - item.dataLimiteDevolucao!.getTime()) / (1000 * 60 * 60 * 24));
      diasAtraso.push(dias);

      if (dias <= 7) faixas['1-7 dias']++;
      else if (dias <= 15) faixas['8-15 dias']++;
      else if (dias <= 30) faixas['16-30 dias']++;
      else if (dias <= 60) faixas['31-60 dias']++;
      else faixas['Mais de 60 dias']++;
    }

    const mediaDias = diasAtraso.reduce((sum, dias) => sum + dias, 0) / diasAtraso.length;
    const maiorAtraso = Math.max(...diasAtraso);

    return {
      totalColaboradoresComAtraso: colaboradoresUnicos.size,
      totalItensAtrasados: itensAtrasados.length,
      tiposEpiComAtraso: tiposEpiUnicos.size,
      mediaDiasAtraso: Math.round(mediaDias),
      maiorAtrasoSistema: maiorAtraso,
      atrasoPorFaixaDias: Object.entries(faixas).map(([faixa, itens]) => ({
        faixa,
        colaboradores: 0, // Seria necessário análise mais complexa
        itens,
      })),
    };
  }

  async obterColaboradoresCriticos(diasMinimoAtraso: number = 30): Promise<Array<{
    colaborador: {
      id: string;
      nome: string;
      matricula: string;
      setor: string;
    };
    totalItensAtrasados: number;
    maiorAtraso: number;
    valorEstimadoPrejuizo?: number;
  }>> {
    const resultado = await this.execute({ diasAtraso: diasMinimoAtraso });
    
    return resultado.map(ficha => ({
      colaborador: {
        id: ficha.colaborador.id,
        nome: ficha.colaborador.nome,
        matricula: ficha.colaborador.matricula,
        setor: ficha.colaborador.setor,
      },
      totalItensAtrasados: ficha.totalItensAtrasados,
      maiorAtraso: ficha.maiorAtraso,
      valorEstimadoPrejuizo: undefined, // Seria calculado se tivéssemos valores dos EPIs
    }));
  }
}