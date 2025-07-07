import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { MonitorUseCase } from 'src/shared/decorators/monitor-performance.decorator';
import {
  FichaCompleta,
  EquipamentoEmPosse,
  HistoricoFichaDetalhado,
  EstatisticasFichaOptimized,
  ColaboradorDetalhado,
} from 'src/presentation/dto/schemas/ficha-epi.schemas';

export interface ObterFichaCompletaInput {
  fichaId: string;
}

@Injectable()
export class ObterFichaCompletaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  @MonitorUseCase('obter-ficha-completa')
  async execute(input: ObterFichaCompletaInput): Promise<FichaCompleta> {
    const { fichaId } = input;

    // Buscar ficha com relacionamentos otimizados
    const fichaData = await this.prisma.fichaEPI.findUniqueOrThrow({
      where: { id: fichaId },
      include: {
        colaborador: {
          include: {
            contratada: true,
          },
        },
        entregas: {
          include: {
            itens: {
              include: {
                estoqueItem: {
                  include: {
                    tipoEpi: true,
                  },
                },
              },
            },
          },
        },
        historicos: {
          orderBy: { dataAcao: 'desc' },
          take: 50, // Limitar histórico para performance
        },
      },
    });

    // 1. Calcular status da ficha
    const statusCalculado = await this.calcularStatusFicha(fichaData);

    // 2. Extrair equipamentos em posse
    const equipamentosEmPosse = this.extrairEquipamentosEmPosse(fichaData.entregas);

    // 3. Processar histórico
    const historico = this.processarHistorico(fichaData.historicos);

    // 4. Calcular estatísticas
    const estatisticas = this.calcularEstatisticas(equipamentosEmPosse);

    // 5. Mapear dados do colaborador com display fields
    const colaborador: ColaboradorDetalhado = {
      id: fichaData.colaborador.id,
      nome: fichaData.colaborador.nome,
      cpf: fichaData.colaborador.cpf,
      cpfDisplay: this.formatarCpfDisplay(fichaData.colaborador.cpf),
      matricula: fichaData.colaborador.matricula,
      cargo: fichaData.colaborador.cargo,
      empresa: fichaData.colaborador.contratada?.nome || null,
      iniciais: this.obterIniciais(fichaData.colaborador.nome),
    };

    // 6. Calcular statusDisplay
    const statusDisplay = this.calcularStatusDisplay(statusCalculado);

    return {
      ficha: {
        id: fichaData.id,
        status: statusCalculado,
        statusDisplay,
        colaborador,
      },
      equipamentosEmPosse,
      devolucoes: [], // TODO: Implementar devoluções
      entregas: [], // TODO: Implementar entregas  
      historico,
      estatisticas,
    };
  }

  private async calcularStatusFicha(ficha: any): Promise<'ativa' | 'inativa' | 'vencida' | 'pendente_devolucao'> {
    // Se a ficha estiver inativa no banco
    if (ficha.status === 'INATIVA') {
      return 'inativa';
    }

    const hoje = new Date();
    let temEpisVencidos = false;
    let temPendenciaDevolucao = false;

    // Verificar equipamentos em posse
    for (const entrega of ficha.entregas) {
      if (entrega.status === 'PENDENTE_ASSINATURA' || entrega.status === 'ASSINADA') {
        for (const item of entrega.itens) {
          if (item.status === 'COM_COLABORADOR') {
            // Verificar se está vencido
            if (item.dataLimiteDevolucao && new Date(item.dataLimiteDevolucao) < hoje) {
              temEpisVencidos = true;
            }

            // Lógica adicional para pendência de devolução (ex: 30 dias após vencimento)
            if (item.dataLimiteDevolucao) {
              const diasAposVencimento = Math.floor((hoje.getTime() - new Date(item.dataLimiteDevolucao).getTime()) / (1000 * 60 * 60 * 24));
              if (diasAposVencimento > 30) {
                temPendenciaDevolucao = true;
              }
            }
          }
        }
      }
    }

    // Determinar status final
    if (temPendenciaDevolucao) {
      return 'pendente_devolucao';
    }
    if (temEpisVencidos) {
      return 'vencida';
    }
    return 'ativa';
  }

  private extrairEquipamentosEmPosse(entregas: any[]): EquipamentoEmPosse[] {
    const equipamentos: EquipamentoEmPosse[] = [];
    const hoje = new Date();

    for (const entrega of entregas) {
      if (entrega.status === 'PENDENTE_ASSINATURA' || entrega.status === 'ASSINADA') {
        for (const item of entrega.itens) {
          if (item.status === 'COM_COLABORADOR') {
            const dataLimiteDevolucao = item.dataLimiteDevolucao 
              ? new Date(item.dataLimiteDevolucao).toISOString().split('T')[0] 
              : null;
            
            const diasParaVencimento = item.dataLimiteDevolucao 
              ? Math.ceil((new Date(item.dataLimiteDevolucao).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
              : 999;

            let statusVencimento: 'dentro_prazo' | 'vencendo' | 'vencido' = 'dentro_prazo';
            if (diasParaVencimento < 0) {
              statusVencimento = 'vencido';
            } else if (diasParaVencimento <= 15) {
              statusVencimento = 'vencendo';
            }

            // Calcular statusVencimentoDisplay baseado no status e dias
            const statusVencimentoDisplay = this.calcularStatusVencimentoDisplay(statusVencimento, diasParaVencimento);

            equipamentos.push({
              id: item.id,
              nomeEquipamento: item.estoqueItem.tipoEpi.nomeEquipamento,
              numeroCA: item.estoqueItem.tipoEpi.numeroCa,
              categoria: item.estoqueItem.tipoEpi.categoria,
              dataEntrega: new Date(entrega.dataEntrega).toISOString().split('T')[0],
              dataLimiteDevolucao,
              statusVencimento,
              statusVencimentoDisplay,
              diasParaVencimento,
              podeDevolver: true, // Sempre pode devolver por enquanto
              entregaId: entrega.id,
              itemEntregaId: item.id,
            });
          }
        }
      }
    }

    return equipamentos;
  }

  private processarHistorico(historicos: any[]): HistoricoFichaDetalhado[] {
    return historicos.map(hist => {
      const tipo = this.mapearTipoHistorico(hist.acao);
      const tipoDisplay = this.calcularTipoDisplay(tipo);
      const dataFormatada = this.formatarDataBrasileira(hist.dataAcao);
      const mudancaStatus = this.detectarMudancaStatus(hist.detalhes, tipo);
      const detalhes = this.processarDetalhesHistorico(hist.detalhes);

      return {
        id: hist.id,
        data: hist.dataAcao.toISOString(),
        dataFormatada,
        tipo,
        tipoDisplay,
        acao: hist.acao,
        responsavel: hist.responsavelId || null,
        mudancaStatus,
        detalhes,
      };
    });
  }

  private mapearTipoHistorico(acao: string): 'entrega' | 'devolucao' | 'assinatura' | 'cancelamento' {
    if (acao.toLowerCase().includes('entrega')) return 'entrega';
    if (acao.toLowerCase().includes('devolucao')) return 'devolucao';
    if (acao.toLowerCase().includes('assinatura')) return 'assinatura';
    if (acao.toLowerCase().includes('cancelamento')) return 'cancelamento';
    return 'entrega'; // default
  }

  private calcularEstatisticas(equipamentos: EquipamentoEmPosse[]): EstatisticasFichaOptimized {
    const episAtivos = equipamentos.filter(eq => eq.statusVencimento !== 'vencido').length;
    const episVencidos = equipamentos.filter(eq => eq.statusVencimento === 'vencido').length;
    
    // Encontrar próximo vencimento
    const equipamentosComVencimento = equipamentos
      .filter(eq => eq.dataLimiteDevolucao && eq.statusVencimento !== 'vencido')
      .sort((a, b) => a.diasParaVencimento - b.diasParaVencimento);

    const proximoVencimento = equipamentosComVencimento.length > 0 
      ? equipamentosComVencimento[0].dataLimiteDevolucao 
      : null;
    
    const diasProximoVencimento = equipamentosComVencimento.length > 0 
      ? equipamentosComVencimento[0].diasParaVencimento 
      : null;

    return {
      totalEpisAtivos: episAtivos,
      totalEpisVencidos: episVencidos,
      proximoVencimento,
      diasProximoVencimento,
    };
  }

  private calcularStatusVencimentoDisplay(
    statusVencimento: 'dentro_prazo' | 'vencendo' | 'vencido',
    diasParaVencimento: number
  ) {
    switch (statusVencimento) {
      case 'dentro_prazo':
        return {
          texto: 'No prazo',
          cor: 'green' as const,
          diasRestantes: diasParaVencimento,
          statusDetalhado: 'dentro_prazo' as const,
        };
      case 'vencendo':
        return {
          texto: 'Vencendo',
          cor: 'yellow' as const,
          diasRestantes: diasParaVencimento,
          statusDetalhado: 'vencendo' as const,
        };
      case 'vencido':
        return {
          texto: 'Em atraso',
          cor: 'red' as const,
          diasRestantes: diasParaVencimento,
          statusDetalhado: 'vencido' as const,
        };
    }
  }

  private calcularStatusDisplay(status: string) {
    switch (status) {
      case 'ativa':
        return {
          cor: 'green' as const,
          label: 'Ativa',
        };
      case 'vencida':
        return {
          cor: 'red' as const,
          label: 'Vencida',
        };
      case 'pendente_devolucao':
        return {
          cor: 'yellow' as const,
          label: 'Pendente Devolução',
        };
      case 'inativa':
        return {
          cor: 'gray' as const,
          label: 'Inativa',
        };
      default:
        return {
          cor: 'gray' as const,
          label: 'Indefinida',
        };
    }
  }

  private formatarCpfDisplay(cpf: string): string {
    // Formatar CPF mascarado: 123.456.***-01
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      return `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.***-${cleanCpf.slice(9)}`;
    }
    return cpf; // Se não for um CPF válido, retorna como está
  }

  private obterIniciais(nome: string): string {
    return nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private calcularTipoDisplay(tipo: string) {
    switch (tipo) {
      case 'entrega':
        return {
          label: 'Entrega',
          tipo: 'entrega',
          cor: 'green' as const,
        };
      case 'devolucao':
        return {
          label: 'Devolução',
          tipo: 'devolucao',
          cor: 'orange' as const,
        };
      case 'assinatura':
        return {
          label: 'Assinatura',
          tipo: 'assinatura',
          cor: 'blue' as const,
        };
      case 'cancelamento':
        return {
          label: 'Cancelamento',
          tipo: 'cancelamento',
          cor: 'red' as const,
        };
      default:
        return {
          label: 'Evento',
          tipo,
          cor: 'green' as const,
        };
    }
  }

  private formatarDataBrasileira(data: Date): string {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private detectarMudancaStatus(detalhes: any, tipo: string): string | null {
    if (!detalhes) return null;

    // Verificar se há mudança de status explícita nos detalhes
    const statusAnterior = detalhes.statusAnterior || detalhes.statusAntigo || detalhes.de;
    const statusNovo = detalhes.statusNovo || detalhes.statusAtual || detalhes.para;

    if (statusAnterior && statusNovo) {
      return `${statusAnterior} → ${statusNovo}`;
    }

    // Inferir mudança baseada no tipo de ação
    switch (tipo) {
      case 'entrega':
        return 'Disponível → Com Colaborador';
      case 'devolucao':
        return 'Com Colaborador → Devolvido';
      case 'assinatura':
        return 'Pendente Assinatura → Assinada';
      case 'cancelamento':
        return 'Ativa → Cancelada';
      default:
        return null;
    }
  }

  private processarDetalhesHistorico(detalhes: any) {
    if (!detalhes) return null;

    // Extrair informações estruturadas dos detalhes
    const quantidade = detalhes.quantidade || 1;
    const equipamento = detalhes.equipamento || detalhes.tipoEpiNome || 'Equipamento';
    const numeroCA = detalhes.numeroCA || detalhes.ca || '';
    const categoria = detalhes.categoria || '';

    // Gerar resumo formatado
    const resumo = numeroCA 
      ? `${quantidade}x ${equipamento} (CA ${numeroCA})`
      : `${quantidade}x ${equipamento}`;

    return {
      resumo,
      dados: {
        quantidade,
        equipamento,
        numeroCA: numeroCA || undefined,
        categoria: categoria || undefined,
      },
    };
  }
}