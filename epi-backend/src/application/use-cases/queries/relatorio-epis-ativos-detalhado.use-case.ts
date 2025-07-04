import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RelatorioEpisAtivosDetalhadoInput {
  colaboradorId?: string;
  tipoEpiId?: string;
  almoxarifadoId?: string;
  incluirDevolvidos?: boolean;
  apenasAtrasados?: boolean;
  limit?: number;
  offset?: number;
}

export interface RelatorioEpisAtivosDetalhadoOutput {
  entregaItemId: string;
  colaborador: {
    id: string;
    nome: string;
    cpf: string;
    matricula: string;
    cargo: string;
    setor: string;
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
  dataLimiteDevolucao?: Date;
  status: string;
  devolucaoAtrasada: boolean;
  diasAtraso?: number;
  diasPosse: number;
}

@Injectable()
export class RelatorioEpisAtivosDetalhadoUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(input: RelatorioEpisAtivosDetalhadoInput = {}): Promise<RelatorioEpisAtivosDetalhadoOutput[]> {
    const whereClause: any = {};
    
    if (!input.incluirDevolvidos) {
      whereClause.status = 'COM_COLABORADOR';
    }

    if (input.colaboradorId) {
      whereClause.entrega = {
        fichaEpi: {
          colaboradorId: input.colaboradorId,
        },
      };
    }

    if (input.tipoEpiId) {
      whereClause.estoqueItem = {
        tipoEpiId: input.tipoEpiId,
      };
    }

    if (input.almoxarifadoId) {
      whereClause.estoqueItem = {
        ...whereClause.estoqueItem,
        almoxarifadoId: input.almoxarifadoId,
      };
    }

    const hoje = new Date();

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
                    cargo: true,
                    setor: true,
                  },
                },
              },
            },
          },
        },
        estoqueItem: {
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
      orderBy: [
        { entrega: { fichaEpi: { colaborador: { nome: 'asc' } } } },
        { estoqueItem: { tipoEpi: { nomeEquipamento: 'asc' } } },
      ],
      take: input.limit || undefined,
      skip: input.offset || undefined,
    });

    const resultado = itens.map(item => {
      const dataLimiteDevolucao = item.dataLimiteDevolucao;
      const devolucaoAtrasada = dataLimiteDevolucao ? dataLimiteDevolucao < hoje && item.status === 'COM_COLABORADOR' : false;
      const diasAtraso = devolucaoAtrasada && dataLimiteDevolucao 
        ? Math.floor((hoje.getTime() - dataLimiteDevolucao.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;
      const diasPosse = Math.floor((hoje.getTime() - item.entrega.dataEntrega.getTime()) / (1000 * 60 * 60 * 24));

      return {
        entregaItemId: item.id,
        colaborador: item.entrega.fichaEpi.colaborador,
        tipoEpi: item.estoqueItem.tipoEpi,
        almoxarifado: item.estoqueItem.almoxarifado,
        dataEntrega: item.entrega.dataEntrega,
        dataLimiteDevolucao: dataLimiteDevolucao || undefined,
        status: item.status,
        devolucaoAtrasada,
        diasAtraso,
        diasPosse,
      };
    });

    // Filtrar apenas atrasados se solicitado
    if (input.apenasAtrasados) {
      return resultado.filter(item => item.devolucaoAtrasada);
    }

    return resultado;
  }

  async obterEstatisticas(input: RelatorioEpisAtivosDetalhadoInput = {}): Promise<{
    totalColaboradoresComEpis: number;
    totalItensAtivos: number;
    tiposEpisDiferentes: number;
    itensAtrasados: number;
    mediaDiasPosse: number;
    mediaDiasAtraso: number;
    distribuicaoPorStatus: Array<{ status: string; quantidade: number }>;
  }> {
    const itens = await this.execute(input);

    const colaboradoresUnicos = new Set(itens.map(item => item.colaborador.id));
    const tiposEpiUnicos = new Set(itens.map(item => item.tipoEpi.id));
    const itensAtrasados = itens.filter(item => item.devolucaoAtrasada);
    
    const statusMap = new Map<string, number>();
    let somaDiasPosse = 0;
    let somaDiasAtraso = 0;

    for (const item of itens) {
      statusMap.set(item.status, (statusMap.get(item.status) || 0) + 1);
      somaDiasPosse += item.diasPosse;
      if (item.diasAtraso) {
        somaDiasAtraso += item.diasAtraso;
      }
    }

    return {
      totalColaboradoresComEpis: colaboradoresUnicos.size,
      totalItensAtivos: itens.length,
      tiposEpisDiferentes: tiposEpiUnicos.size,
      itensAtrasados: itensAtrasados.length,
      mediaDiasPosse: itens.length > 0 ? Math.round(somaDiasPosse / itens.length) : 0,
      mediaDiasAtraso: itensAtrasados.length > 0 ? Math.round(somaDiasAtraso / itensAtrasados.length) : 0,
      distribuicaoPorStatus: Array.from(statusMap.entries()).map(([status, quantidade]) => ({
        status,
        quantidade,
      })),
    };
  }

  async obterItensProximosVencimento(diasAntecedencia: number = 30): Promise<RelatorioEpisAtivosDetalhadoOutput[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);

    const itens = await this.execute({
      incluirDevolvidos: false, // Apenas itens ativos
    });

    return itens.filter(item => 
      item.dataLimiteDevolucao && 
      item.dataLimiteDevolucao <= dataLimite &&
      !item.devolucaoAtrasada
    ).sort((a, b) => 
      (a.dataLimiteDevolucao?.getTime() || 0) - (b.dataLimiteDevolucao?.getTime() || 0)
    );
  }

  async obterItensPorColaborador(colaboradorId: string): Promise<{
    colaborador: {
      id: string;
      nome: string;
      matricula: string;
      setor: string;
    };
    itensAtivos: RelatorioEpisAtivosDetalhadoOutput[];
    itensDevolvidos: RelatorioEpisAtivosDetalhadoOutput[];
    resumo: {
      totalItensAtivos: number;
      totalItensDevolvidos: number;
      itensAtrasados: number;
      proximasDevolucoes: Date[];
    };
  }> {
    const [itensAtivos, itensDevolvidos] = await Promise.all([
      this.execute({ colaboradorId, incluirDevolvidos: false }),
      this.execute({ colaboradorId, incluirDevolvidos: true }).then(items => 
        items.filter(item => item.status === 'DEVOLVIDO')
      ),
    ]);

    const colaborador = itensAtivos[0]?.colaborador || itensDevolvidos[0]?.colaborador;
    if (!colaborador) {
      throw new Error(`Colaborador não encontrado ou sem EPIs: ${colaboradorId}`);
    }

    const itensAtrasados = itensAtivos.filter(item => item.devolucaoAtrasada).length;
    const proximasDevolucoes = itensAtivos
      .map(item => item.dataLimiteDevolucao)
      .filter(data => data)
      .sort((a, b) => a!.getTime() - b!.getTime()) as Date[];

    return {
      colaborador: {
        id: colaborador.id,
        nome: colaborador.nome,
        matricula: colaborador.matricula,
        setor: colaborador.setor,
      },
      itensAtivos,
      itensDevolvidos,
      resumo: {
        totalItensAtivos: itensAtivos.length,
        totalItensDevolvidos: itensDevolvidos.length,
        itensAtrasados,
        proximasDevolucoes: proximasDevolucoes.slice(0, 5), // Próximas 5 devolucoes
      },
    };
  }
}