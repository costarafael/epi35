import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RelatoriopesquisarFichasTipoEpiInput {
  tipoEpiId?: string;
  tipoEpiIds?: string[];
  colaboradorId?: string;
  statusFicha?: 'ATIVA' | 'INATIVA';
  statusItens?: 'COM_COLABORADOR' | 'DEVOLVIDO';
  almoxarifadoId?: string;
  dataInicioEntrega?: Date;
  dataFimEntrega?: Date;
  incluirItensAtivos?: boolean;
  incluirHistoricoCompleto?: boolean;
  limit?: number;
  offset?: number;
}

export interface RelatoriopesquisarFichasTipoEpiOutput {
  ficha: {
    id: string;
    dataEmissao: Date;
    status: string;
  };
  colaborador: {
    id: string;
    nome: string;
    cpf: string;
    matricula: string;
    cargo: string;
    setor: string;
    unidadeNegocio: {
      nome: string;
      codigo: string;
    };
  };
  tiposEpi: Array<{
    tipoEpi: {
      id: string;
      nomeEquipamento: string;
      numeroCa: string;
      vidaUtilDias: number;
    };
    totalItensEntregues: number;
    itensAtivos: number;
    ultimaEntrega: Date;
    proximaDevolucao?: Date;
  }>;
  resumo: {
    totalTiposEpiDiferentes: number;
    totalItensEntregues: number;
    totalItensAtivos: number;
    totalItensDevolvidos: number;
  };
}

@Injectable()
export class RelatoriopesquisarFichasTipoEpiUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: RelatoriopesquisarFichasTipoEpiInput): Promise<RelatoriopesquisarFichasTipoEpiOutput[]> {
    if (!input.tipoEpiId && !input.tipoEpiIds) {
      throw new Error('É necessário especificar pelo menos um tipo de EPI para busca');
    }

    const tipoEpiIds = input.tipoEpiIds || (input.tipoEpiId ? [input.tipoEpiId] : []);

    const whereClauseFichas: any = {};
    const whereClauseItens: any = {
      estoqueItemOrigem: {
        tipoEpiId: { in: tipoEpiIds },
      },
    };

    if (input.colaboradorId) {
      whereClauseFichas.colaboradorId = input.colaboradorId;
    }

    if (input.statusFicha) {
      whereClauseFichas.status = input.statusFicha;
    }

    if (input.statusItens) {
      whereClauseItens.status = input.statusItens;
    }

    if (input.almoxarifadoId) {
      whereClauseItens.estoqueItemOrigem.almoxarifadoId = input.almoxarifadoId;
    }

    if (input.dataInicioEntrega || input.dataFimEntrega) {
      const whereEntrega: any = {};
      if (input.dataInicioEntrega) {
        whereEntrega.gte = input.dataInicioEntrega;
      }
      if (input.dataFimEntrega) {
        whereEntrega.lte = input.dataFimEntrega;
      }
      whereClauseItens.entrega = { dataEntrega: whereEntrega };
    }

    // Buscar fichas que têm entregas com os tipos de EPI especificados
    const fichas = await this.prismaService.fichaEPI.findMany({
      where: {
        ...whereClauseFichas,
        entregas: {
          some: {
            itens: {
              some: whereClauseItens,
            },
          },
        },
      },
      include: {
        colaborador: {
          include: {
            unidadeNegocio: {
              select: {
                nome: true,
                codigo: true,
              },
            },
          },
        },
        entregas: {
          include: {
            itens: {
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
            },
          },
          orderBy: {
            dataEntrega: 'desc',
          },
        },
      },
      orderBy: [
        { colaborador: { nome: 'asc' } },
        { dataEmissao: 'desc' },
      ],
      take: input.limit || undefined,
      skip: input.offset || undefined,
    });

    // Processar dados para formato de saída
    const resultado: RelatoriopesquisarFichasTipoEpiOutput[] = [];

    for (const ficha of fichas) {
      // Agrupar itens por tipo de EPI
      const tiposEpiMap = new Map<string, {
        tipoEpi: any;
        itens: any[];
        ultimaEntrega: Date;
      }>();

      for (const entrega of ficha.entregas) {
        for (const item of entrega.itens) {
          const tipoEpiId = item.estoqueItemOrigem.tipoEpi.id;
          
          if (!tiposEpiMap.has(tipoEpiId)) {
            tiposEpiMap.set(tipoEpiId, {
              tipoEpi: item.estoqueItemOrigem.tipoEpi,
              itens: [],
              ultimaEntrega: entrega.dataEntrega,
            });
          }

          const tipoData = tiposEpiMap.get(tipoEpiId)!;
          tipoData.itens.push(item);
          
          if (entrega.dataEntrega > tipoData.ultimaEntrega) {
            tipoData.ultimaEntrega = entrega.dataEntrega;
          }
        }
      }

      // Converter para formato de saída
      const tiposEpi = Array.from(tiposEpiMap.values()).map(tipoData => {
        const itensAtivos = tipoData.itens.filter(item => item.status === 'COM_COLABORADOR');
        const proximaDevolucao = itensAtivos
          .map(item => item.dataLimiteDevolucao)
          .filter(data => data)
          .sort((a, b) => a.getTime() - b.getTime())[0];

        return {
          tipoEpi: tipoData.tipoEpi,
          totalItensEntregues: tipoData.itens.length,
          itensAtivos: itensAtivos.length,
          ultimaEntrega: tipoData.ultimaEntrega,
          proximaDevolucao: proximaDevolucao || undefined,
        };
      });

      // Calcular resumo
      const totalItensEntregues = tiposEpi.reduce((sum, tipo) => sum + tipo.totalItensEntregues, 0);
      const totalItensAtivos = tiposEpi.reduce((sum, tipo) => sum + tipo.itensAtivos, 0);

      resultado.push({
        ficha: {
          id: ficha.id,
          dataEmissao: ficha.dataEmissao,
          status: ficha.status,
        },
        colaborador: {
          id: ficha.colaborador.id,
          nome: ficha.colaborador.nome,
          cpf: ficha.colaborador.cpf,
          matricula: ficha.colaborador.matricula,
          cargo: ficha.colaborador.cargo,
          setor: ficha.colaborador.setor,
          unidadeNegocio: ficha.colaborador.unidadeNegocio,
        },
        tiposEpi: tiposEpi.sort((a, b) => 
          a.tipoEpi.nomeEquipamento.localeCompare(b.tipoEpi.nomeEquipamento)
        ),
        resumo: {
          totalTiposEpiDiferentes: tiposEpi.length,
          totalItensEntregues,
          totalItensAtivos,
          totalItensDevolvidos: totalItensEntregues - totalItensAtivos,
        },
      });
    }

    return resultado;
  }

  async obterEstatisticas(input: RelatoriopesquisarFichasTipoEpiInput): Promise<{
    totalFichasEncontradas: number;
    totalColaboradoresDiferentes: number;
    totalItensEntregues: number;
    totalItensAtivos: number;
    fichasPorStatus: Array<{ status: string; quantidade: number }>;
    tiposEpiMaisUtilizados: Array<{
      tipoEpi: { id: string; nomeEquipamento: string; numeroCa: string };
      totalFichas: number;
      totalItens: number;
    }>;
  }> {
    if (!input.tipoEpiId && !input.tipoEpiIds) {
      throw new Error('É necessário especificar pelo menos um tipo de EPI para busca');
    }

    const resultados = await this.execute(input);

    const fichasPorStatus = new Map<string, number>();
    const tiposEpiMap = new Map<string, { 
      tipoEpi: any; 
      totalFichas: number; 
      totalItens: number; 
    }>();

    let totalItensEntregues = 0;
    let totalItensAtivos = 0;
    const colaboradoresUnicos = new Set<string>();

    for (const resultado of resultados) {
      colaboradoresUnicos.add(resultado.colaborador.id);
      totalItensEntregues += resultado.resumo.totalItensEntregues;
      totalItensAtivos += resultado.resumo.totalItensAtivos;

      // Agrupar por status da ficha
      const status = resultado.ficha.status;
      fichasPorStatus.set(status, (fichasPorStatus.get(status) || 0) + 1);

      // Agrupar por tipos de EPI
      for (const tipoInfo of resultado.tiposEpi) {
        const tipoId = tipoInfo.tipoEpi.id;
        if (!tiposEpiMap.has(tipoId)) {
          tiposEpiMap.set(tipoId, {
            tipoEpi: tipoInfo.tipoEpi,
            totalFichas: 0,
            totalItens: 0,
          });
        }
        const tipoData = tiposEpiMap.get(tipoId)!;
        tipoData.totalFichas++;
        tipoData.totalItens += tipoInfo.totalItensEntregues;
      }
    }

    return {
      totalFichasEncontradas: resultados.length,
      totalColaboradoresDiferentes: colaboradoresUnicos.size,
      totalItensEntregues,
      totalItensAtivos,
      fichasPorStatus: Array.from(fichasPorStatus.entries()).map(([status, quantidade]) => ({
        status,
        quantidade,
      })),
      tiposEpiMaisUtilizados: Array.from(tiposEpiMap.values())
        .sort((a, b) => b.totalItens - a.totalItens)
        .map(tipo => ({
          tipoEpi: {
            id: tipo.tipoEpi.id,
            nomeEquipamento: tipo.tipoEpi.nomeEquipamento,
            numeroCa: tipo.tipoEpi.numeroCa,
          },
          totalFichas: tipo.totalFichas,
          totalItens: tipo.totalItens,
        })),
    };
  }

  async obterColaboradoresSemEpiEspecifico(tipoEpiId: string): Promise<Array<{
    colaborador: {
      id: string;
      nome: string;
      matricula: string;
      setor: string;
    };
    fichaStatus: string;
    possuiOutrosEpis: boolean;
  }>> {
    // Buscar colaboradores com fichas ativas
    const colaboradoresComFichas = await this.prismaService.colaborador.findMany({
      where: {
        fichaEpi: {
          status: 'ATIVA',
        },
      },
      include: {
        fichaEpi: {
          select: {
            id: true,
            status: true,
            entregas: {
              select: {
                itens: {
                  select: {
                    estoqueItemOrigem: {
                      select: {
                        tipoEpiId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Filtrar colaboradores que NÃO têm o tipo de EPI específico
    const colaboradoresSemEpi = colaboradoresComFichas.filter(colaborador => {
      if (!colaborador.fichaEpi) return true;

      const tiposEpiDoColaborador = new Set<string>();
      for (const entrega of colaborador.fichaEpi.entregas) {
        for (const item of entrega.itens) {
          tiposEpiDoColaborador.add(item.estoqueItemOrigem.tipoEpiId);
        }
      }

      return !tiposEpiDoColaborador.has(tipoEpiId);
    });

    return colaboradoresSemEpi.map(colaborador => ({
      colaborador: {
        id: colaborador.id,
        nome: colaborador.nome,
        matricula: colaborador.matricula,
        setor: colaborador.setor,
      },
      fichaStatus: colaborador.fichaEpi?.status || 'SEM_FICHA',
      possuiOutrosEpis: colaborador.fichaEpi ? 
        colaborador.fichaEpi.entregas.some(e => e.itens.length > 0) : false,
    }));
  }

  async obterHistoricoCompletoTipoEpi(tipoEpiId: string): Promise<Array<{
    colaborador: {
      nome: string;
      matricula: string;
    };
    dataEntrega: Date;
    quantidadeEntregue: number;
    status: string;
    almoxarifadoOrigem: string;
    dataLimiteDevolucao?: Date;
    diasPosse?: number;
  }>> {
    const historico = await this.prismaService.entregaItem.findMany({
      where: {
        estoqueItemOrigem: {
          tipoEpiId: tipoEpiId,
        },
      },
      include: {
        entrega: {
          include: {
            fichaEpi: {
              include: {
                colaborador: {
                  select: {
                    nome: true,
                    matricula: true,
                  },
                },
              },
            },
          },
        },
        estoqueItemOrigem: {
          include: {
            almoxarifado: {
              select: {
                nome: true,
              },
            },
          },
        },
      },
      orderBy: {
        entrega: {
          dataEntrega: 'desc',
        },
      },
    });

    const hoje = new Date();

    return historico.map(item => {
      const diasPosse = item.status === 'COM_COLABORADOR' && item.dataLimiteDevolucao
        ? Math.floor((hoje.getTime() - item.entrega.dataEntrega.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        colaborador: item.entrega.fichaEpi.colaborador,
        dataEntrega: item.entrega.dataEntrega,
        quantidadeEntregue: 1, // Cada registro é uma unidade
        status: item.status,
        almoxarifadoOrigem: item.estoqueItemOrigem.almoxarifado.nome,
        dataLimiteDevolucao: item.dataLimiteDevolucao || undefined,
        diasPosse,
      };
    });
  }
}