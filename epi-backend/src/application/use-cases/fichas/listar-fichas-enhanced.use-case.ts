import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { MonitorUseCase } from 'src/shared/decorators/monitor-performance.decorator';
import {
  FichaListEnhanced,
  FichaListQuery,
  FichaListItem,
} from 'src/presentation/dto/schemas/ficha-epi.schemas';

@Injectable()
export class ListarFichasEnhancedUseCase {
  constructor(private readonly prisma: PrismaService) {}

  @MonitorUseCase('listar-fichas-enhanced')
  async execute(filters: FichaListQuery): Promise<FichaListEnhanced> {
    const { page, limit, search, status, cargo, empresa, vencimentoProximo } = filters;
    
    const skip = (page - 1) * limit;
    const hoje = new Date();

    // Construir where clause
    const whereClause: any = {
      colaborador: {
        ativo: true,
      },
    };

    // Filtro por busca (nome, matrícula)
    if (search) {
      whereClause.colaborador.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { matricula: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtro por cargo
    if (cargo) {
      whereClause.colaborador.cargo = { contains: cargo, mode: 'insensitive' };
    }

    // Filtro por empresa
    if (empresa) {
      whereClause.colaborador.contratada = {
        nome: { contains: empresa, mode: 'insensitive' },
      };
    }

    // Buscar fichas com dados relacionados
    const [fichas, total] = await Promise.all([
      this.prisma.fichaEPI.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          colaborador: {
            include: {
              contratada: true,
            },
          },
          entregas: {
            include: {
              itens: {
                where: {
                  status: 'COM_COLABORADOR',
                },
                include: {
                  estoqueItem: {
                    include: {
                      tipoEpi: true,
                    },
                  },
                },
              },
            },
            where: {
              status: {
                in: ['PENDENTE_ASSINATURA', 'ASSINADA'],
              },
            },
          },
        },
      }),
      this.prisma.fichaEPI.count({ where: whereClause }),
    ]);

    // Processar cada ficha
    const items: FichaListItem[] = [];
    
    for (const ficha of fichas) {
      const processedItem = await this.processarFichaParaLista(ficha, hoje);
      
      // Aplicar filtros pós-processamento
      if (status && processedItem.status !== status) {
        continue;
      }
      
      if (vencimentoProximo && !this.temVencimentoProximo(processedItem, hoje)) {
        continue;
      }
      
      items.push(processedItem);
    }

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  private async processarFichaParaLista(ficha: any, hoje: Date): Promise<FichaListItem> {
    // Calcular status da ficha
    const status = this.calcularStatusFicha(ficha, hoje);

    // Calcular estatísticas dos EPIs
    const episAtivos = this.contarEpisAtivos(ficha.entregas);
    const episVencidos = this.contarEpisVencidos(ficha.entregas, hoje);
    const proximoVencimento = this.encontrarProximoVencimento(ficha.entregas, hoje);

    // Encontrar última atualização
    const ultimaAtualizacao = this.encontrarUltimaAtualizacao(ficha);

    return {
      id: ficha.id,
      colaborador: {
        nome: ficha.colaborador.nome,
        matricula: ficha.colaborador.matricula,
        cargo: ficha.colaborador.cargo,
        empresa: ficha.colaborador.contratada?.nome || null,
      },
      status,
      statusDisplay: this.criarStatusDisplay(status),
      totalEpisAtivos: episAtivos,
      totalEpisVencidos: episVencidos,
      proximoVencimento,
      ultimaAtualizacao,
    };
  }

  private calcularStatusFicha(ficha: any, hoje: Date): 'ativa' | 'inativa' | 'vencida' | 'pendente_devolucao' {
    // Se a ficha estiver inativa no banco
    if (ficha.status === 'INATIVA') {
      return 'inativa';
    }

    let temEpisVencidos = false;
    let temPendenciaDevolucao = false;

    // Verificar equipamentos em posse
    for (const entrega of ficha.entregas) {
      for (const item of entrega.itens) {
        if (item.dataLimiteDevolucao && new Date(item.dataLimiteDevolucao) < hoje) {
          temEpisVencidos = true;
          
          // Se está há mais de 30 dias vencido, é pendência
          const diasAposVencimento = Math.floor((hoje.getTime() - new Date(item.dataLimiteDevolucao).getTime()) / (1000 * 60 * 60 * 24));
          if (diasAposVencimento > 30) {
            temPendenciaDevolucao = true;
          }
        }
      }
    }

    if (temPendenciaDevolucao) {
      return 'pendente_devolucao';
    }
    if (temEpisVencidos) {
      return 'vencida';
    }
    return 'ativa';
  }

  private contarEpisAtivos(entregas: any[]): number {
    let count = 0;
    const hoje = new Date();
    
    for (const entrega of entregas) {
      for (const item of entrega.itens) {
        // Considerado ativo se não está vencido
        if (!item.dataLimiteDevolucao || new Date(item.dataLimiteDevolucao) >= hoje) {
          count++;
        }
      }
    }
    
    return count;
  }

  private contarEpisVencidos(entregas: any[], hoje: Date): number {
    let count = 0;
    
    for (const entrega of entregas) {
      for (const item of entrega.itens) {
        if (item.dataLimiteDevolucao && new Date(item.dataLimiteDevolucao) < hoje) {
          count++;
        }
      }
    }
    
    return count;
  }

  private encontrarProximoVencimento(entregas: any[], hoje: Date): string | null {
    let proximaData: Date | null = null;
    
    for (const entrega of entregas) {
      for (const item of entrega.itens) {
        if (item.dataLimiteDevolucao) {
          const dataVencimento = new Date(item.dataLimiteDevolucao);
          // Só considerar datas futuras
          if (dataVencimento >= hoje) {
            if (!proximaData || dataVencimento < proximaData) {
              proximaData = dataVencimento;
            }
          }
        }
      }
    }
    
    return proximaData ? proximaData.toISOString().split('T')[0] : null;
  }

  private encontrarUltimaAtualizacao(ficha: any): string {
    let ultimaData = ficha.createdAt;
    
    // Verificar entregas
    for (const entrega of ficha.entregas) {
      if (entrega.dataEntrega > ultimaData) {
        ultimaData = entrega.dataEntrega;
      }
      if (entrega.dataAssinatura && entrega.dataAssinatura > ultimaData) {
        ultimaData = entrega.dataAssinatura;
      }
    }
    
    return ultimaData.toISOString();
  }

  private temVencimentoProximo(item: FichaListItem, hoje: Date): boolean {
    if (!item.proximoVencimento) {
      return false;
    }
    
    const dataVencimento = new Date(item.proximoVencimento);
    const diffDays = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    // Considera próximo se vence nos próximos 30 dias
    return diffDays <= 30 && diffDays >= 0;
  }

  private criarStatusDisplay(status: 'ativa' | 'inativa' | 'vencida' | 'pendente_devolucao') {
    const statusMap = {
      ativa: { cor: 'green' as const, label: 'Ativa' },
      inativa: { cor: 'gray' as const, label: 'Inativa' },
      vencida: { cor: 'red' as const, label: 'Vencida' },
      pendente_devolucao: { cor: 'yellow' as const, label: 'Pendente Devolução' },
    };

    return statusMap[status];
  }
}