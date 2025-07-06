import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FichaEPI } from '../../../domain/entities/ficha-epi.entity';
import { StatusFichaEPI } from '../../../domain/enums';
import { BusinessError, ConflictError, NotFoundError } from '../../../domain/exceptions/business.exception';
// ✅ OTIMIZAÇÃO: Import tipos do Zod (Single Source of Truth)
import { CriarFichaEpiInput, FichaEpiOutput, FichaFilters } from '../../../presentation/dto/schemas/ficha-epi.schemas';
import { PaginationOptions, PaginatedResult, createPaginatedResult } from '../../../domain/interfaces/common/pagination.interface';
// ✅ OTIMIZAÇÃO: Import mapper para reduzir código duplicado
import { mapFichaEpiToOutput } from '../../../infrastructure/mapping/ficha-epi.mapper';

// ✅ OTIMIZAÇÃO: Interfaces removidas - usando tipos do Zod (Single Source of Truth)
// CriarFichaEpiInput, FichaEpiOutput e FichaFilters agora vêm de ../../../presentation/dto/schemas/ficha-epi.schemas

@Injectable()
export class CriarFichaEpiUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CriarFichaEpiInput): Promise<FichaEpiOutput> {
    // Validar dados de entrada
    await this.validarInput(input);

    // Verificar se já existe ficha para esta combinação (409 Conflict)
    await this.verificarFichaExistente(input);

    // Verificar se colaborador e tipo EPI existem e estão ativos
    await this.validarDependencias(input);

    // Criar entidade de domínio
    const fichaData = FichaEPI.create(
      input.colaboradorId,
      (input.status || 'ATIVA') as StatusFichaEPI,
    );

    // Salvar no banco de dados
    const ficha = await this.prisma.fichaEPI.create({
      data: {
        colaboradorId: fichaData.colaboradorId,
        status: fichaData.status as any,
      },
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
            contratada: {
              select: {
                id: true,
                nome: true,
                cnpj: true,
              },
            },
          },
        },
      },
    });

    return mapFichaEpiToOutput(ficha);
  }

  async obterFicha(id: string): Promise<FichaEpiOutput | null> {
    // 🔍 DEBUG: Log da consulta de ficha
    console.log('🔍 [OBTER FICHA] Buscando ficha com ID:', id);
    
    const ficha = await this.prisma.fichaEPI.findUnique({
      where: { id },
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
            contratada: {
              select: {
                id: true,
                nome: true,
                cnpj: true,
              },
            },
          },
        },
        entregas: {
          where: { status: 'ASSINADA' },
          include: {
            itens: {
              where: { status: 'COM_COLABORADOR' },
              include: {
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
                  },
                },
              },
            },
          },
        },
      },
    });

    // 🔍 DEBUG: Log da ficha encontrada
    if (ficha) {
      console.log('🔍 [OBTER FICHA] Ficha encontrada:', {
        fichaId: ficha.id,
        colaboradorNome: ficha.colaborador.nome,
        totalEntregas: ficha.entregas.length,
        totalItens: ficha.entregas.reduce((total, entrega) => total + entrega.itens.length, 0),
        itensDetalhados: ficha.entregas.flatMap(entrega => 
          entrega.itens.map(item => ({
            itemId: item.id,
            tipoEpiId: item.estoqueItem?.tipoEpi?.id,
            tipoEpiNome: item.estoqueItem?.tipoEpi?.nomeEquipamento,
            hasEstoqueItem: !!item.estoqueItem,
            hasTipoEpi: !!item.estoqueItem?.tipoEpi,
          }))
        ),
      });
    } else {
      console.log('🔍 [OBTER FICHA] Ficha não encontrada para ID:', id);
    }

    return ficha ? this.mapFichaWithDevolucaoPendente(ficha) : null;
  }

  async listarFichas(
    filtros: FichaFilters = {},
    paginacao?: PaginationOptions,
  ): Promise<FichaEpiOutput[] | PaginatedResult<FichaEpiOutput>> {
    const where: any = {};

    if (filtros.colaboradorId) {
      where.colaboradorId = filtros.colaboradorId;
    }


    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.ativo !== undefined) {
      where.status = filtros.ativo ? 'ATIVA' : { in: ['INATIVA', 'SUSPENSA'] };
    }

    if (filtros.colaboradorNome) {
      where.colaborador = {
        nome: { contains: filtros.colaboradorNome, mode: 'insensitive' },
      };
    }

    // ✅ NOVO FILTRO: Devolução Pendente
    if (filtros.devolucaoPendente === true) {
      const hoje = new Date();
      where.entregas = {
        some: {
          status: 'ASSINADA',
          itens: {
            some: {
              status: 'COM_COLABORADOR',
              dataLimiteDevolucao: {
                lt: hoje,
                not: null,
              },
            },
          },
        },
      };
    }


    const orderBy = [
      { status: 'asc' as const },
      { colaborador: { nome: 'asc' as const } },
    ];

    // Se paginação foi solicitada, usar skip/take + count
    if (paginacao) {
      const { page = 1, limit = 50 } = paginacao;
      const skip = (page - 1) * limit;
      
      const [fichas, total] = await Promise.all([
        this.prisma.fichaEPI.findMany({
          where,
          include: {
            colaborador: {
              select: {
                nome: true,
                cpf: true,
                matricula: true,
              },
            },
            entregas: {
              where: { status: 'ASSINADA' },
              include: {
                itens: {
                  where: { status: 'COM_COLABORADOR' },
                  select: {
                    dataLimiteDevolucao: true,
                    status: true,
                    estoqueItem: {
                      select: {
                        tipoEpi: {
                          select: {
                            id: true,
                            nomeEquipamento: true,
                            vidaUtilDias: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.fichaEPI.count({ where }),
      ]);

      const fichasOutput = fichas.map(ficha => this.mapFichaWithDevolucaoPendente(ficha));
      return createPaginatedResult(fichasOutput, total, page, limit);
    }

    // Sem paginação, retornar array tradicional
    const fichas = await this.prisma.fichaEPI.findMany({
      where,
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
            contratada: {
              select: {
                id: true,
                nome: true,
                cnpj: true,
              },
            },
          },
        },
        entregas: {
          where: { status: 'ASSINADA' },
          include: {
            itens: {
              where: { status: 'COM_COLABORADOR' },
              select: {
                dataLimiteDevolucao: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy,
    });

    return fichas.map(ficha => this.mapFichaWithDevolucaoPendente(ficha));
  }

  async ativarFicha(id: string): Promise<FichaEpiOutput> {
    const fichaExistente = await this.prisma.fichaEPI.findUnique({
      where: { id },
    });

    if (!fichaExistente) {
      throw new NotFoundError('Ficha de EPI', id);
    }

    if (fichaExistente.status === StatusFichaEPI.ATIVA) {
      throw new BusinessError('Ficha já está ativa');
    }

    const ficha = await this.prisma.fichaEPI.update({
      where: { id },
      data: { status: StatusFichaEPI.ATIVA as any },
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
            contratada: {
              select: {
                id: true,
                nome: true,
                cnpj: true,
              },
            },
          },
        },
      },
    });

    // ✅ Registrar no histórico
    await this.prisma.historicoFicha.create({
      data: {
        fichaEpiId: id,
        acao: 'ATIVACAO',
        detalhes: {
          statusAnterior: fichaExistente.status,
          statusNovo: 'ATIVA',
        },
      },
    });

    return mapFichaEpiToOutput(ficha);
  }

  async inativarFicha(id: string): Promise<FichaEpiOutput> {
    const fichaExistente = await this.prisma.fichaEPI.findUnique({
      where: { id },
    });

    if (!fichaExistente) {
      throw new NotFoundError('Ficha de EPI', id);
    }

    if (fichaExistente.status === StatusFichaEPI.INATIVA) {
      throw new BusinessError('Ficha já está inativa');
    }

    // Verificar se há entregas ativas para esta ficha
    const entregasAtivas = await this.prisma.entrega.count({
      where: {
        fichaEpiId: id,
        status: 'ASSINADA',
      },
    });

    if (entregasAtivas > 0) {
      throw new BusinessError(
        `Não é possível inativar: existe(m) ${entregasAtivas} entrega(s) ativa(s) para esta ficha`,
      );
    }

    const ficha = await this.prisma.fichaEPI.update({
      where: { id },
      data: { status: StatusFichaEPI.INATIVA as any },
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
            contratada: {
              select: {
                id: true,
                nome: true,
                cnpj: true,
              },
            },
          },
        },
      },
    });

    // ✅ Registrar no histórico
    await this.prisma.historicoFicha.create({
      data: {
        fichaEpiId: id,
        acao: 'INATIVACAO',
        detalhes: {
          statusAnterior: fichaExistente.status,
          statusNovo: 'INATIVA',
          motivo: `Inativação solicitada - ${entregasAtivas} entrega(s) ativa(s) verificadas`,
        },
      },
    });

    return mapFichaEpiToOutput(ficha);
  }

  async suspenderFicha(id: string, motivo?: string): Promise<FichaEpiOutput> {
    const fichaExistente = await this.prisma.fichaEPI.findUnique({
      where: { id },
    });

    if (!fichaExistente) {
      throw new NotFoundError('Ficha de EPI', id);
    }

    throw new BusinessError('Status SUSPENSA não é mais suportado no sistema');

    const ficha = await this.prisma.fichaEPI.update({
      where: { id },
      data: { status: StatusFichaEPI.INATIVA as any },
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
            contratada: {
              select: {
                id: true,
                nome: true,
                cnpj: true,
              },
            },
          },
        },
      },
    });

    // Registrar no histórico o motivo da suspensão
    if (motivo) {
      await this.prisma.historicoFicha.create({
        data: {
          fichaEpiId: id,
          acao: 'SUSPENSAO',
          detalhes: { motivo },
        },
      });
    }

    return mapFichaEpiToOutput(ficha);
  }

  async criarOuAtivar(input: CriarFichaEpiInput): Promise<{
    ficha: FichaEpiOutput;
    criada: boolean;
  }> {
    // Verificar se já existe
    const fichaExistente = await this.prisma.fichaEPI.findUnique({
      where: { colaboradorId: input.colaboradorId },
    });

    if (fichaExistente) {
      // Se existe mas está inativa, ativar
      if (fichaExistente.status !== StatusFichaEPI.ATIVA) {
        const fichaAtivada = await this.ativarFicha(fichaExistente.id);
        return { ficha: fichaAtivada, criada: false };
      } else {
        // Se já está ativa, retornar a existente
        const ficha = await this.obterFicha(fichaExistente.id);
        return { ficha: ficha!, criada: false };
      }
    } else {
      // Criar nova ficha
      const novaFicha = await this.execute(input);
      return { ficha: novaFicha, criada: true };
    }
  }

  async obterEstatisticas(): Promise<{
    totalFichas: number;
    fichasAtivas: number;
    fichasInativas: number;
    fichasSuspensas: number;
    porTipoEpi: { tipoEpiNome: string; quantidade: number }[];
    porColaborador: { colaboradorNome: string; quantidade: number }[];
  }> {
    const [fichasPorStatus, fichasPorTipo, fichasPorColaborador] = await Promise.all([
      this.prisma.fichaEPI.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      // Query para fichas por tipo (removido Promise.resolve([]) que estava causando estatísticas vazias)
      Promise.resolve([]), // TODO: Implementar groupBy por tipoEpiId quando necessário
      this.prisma.fichaEPI.groupBy({
        by: ['colaboradorId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Buscar nomes dos tipos EPI
    const tiposEpiIds = fichasPorTipo.map(f => f.tipoEpiId);
    const tiposEpi = await this.prisma.tipoEPI.findMany({
      where: { id: { in: tiposEpiIds } },
      select: { id: true, nomeEquipamento: true },
    });

    // Buscar nomes dos colaboradores
    const colaboradoresIds = fichasPorColaborador.map(f => f.colaboradorId);
    const colaboradores = await this.prisma.colaborador.findMany({
      where: { id: { in: colaboradoresIds } },
      select: { id: true, nome: true },
    });

    const totalFichas = fichasPorStatus.reduce((sum, f) => sum + f._count.id, 0);

    return {
      totalFichas,
      fichasAtivas: fichasPorStatus.find(f => f.status === 'ATIVA')?._count.id || 0,
      fichasInativas: fichasPorStatus.find(f => f.status === 'INATIVA')?._count.id || 0,
      fichasSuspensas: 0,
      porTipoEpi: fichasPorTipo.map(f => ({
        tipoEpiNome: tiposEpi.find(t => t.id === f.tipoEpiId)?.nomeEquipamento || 'Desconhecido',
        quantidade: f._count.id,
      })),
      porColaborador: fichasPorColaborador.map(f => ({
        colaboradorNome: colaboradores.find(c => c.id === f.colaboradorId)?.nome || 'Desconhecido',
        quantidade: f._count.id,
      })),
    };
  }

  private async validarInput(_input: CriarFichaEpiInput): Promise<void> {
    // ✅ OTIMIZAÇÃO: Validações básicas removidas - já validadas pelo Zod schema
    // colaboradorId obrigatório: validado por IdSchema
    
    // Apenas validações de negócio específicas que não podem ser feitas no Zod permanecem aqui
  }

  private async verificarFichaExistente(input: CriarFichaEpiInput): Promise<void> {
    const fichaExistente = await this.prisma.fichaEPI.findUnique({
      where: { colaboradorId: input.colaboradorId },
    });

    if (fichaExistente) {
      throw new ConflictError(
        'Já existe uma ficha de EPI para este colaborador e tipo de EPI',
      );
    }
  }

  private async validarDependencias(input: CriarFichaEpiInput): Promise<void> {
    // Verificar colaborador
    const colaborador = await this.prisma.colaborador.findUnique({
      where: { id: input.colaboradorId },
    });

    if (!colaborador) {
      throw new NotFoundError('Colaborador', input.colaboradorId);
    }

    if (!colaborador.ativo) {
      throw new BusinessError('Colaborador está inativo');
    }

  }

  // ✅ MÉTODO MELHORADO: Mapear ficha com informações detalhadas
  private mapFichaWithDevolucaoPendente(ficha: any): FichaEpiOutput {
    const baseOutput = mapFichaEpiToOutput(ficha);
    const hoje = new Date();
    
    // Coletar todos os itens COM_COLABORADOR de todas as entregas
    const todosItens = ficha.entregas?.flatMap((entrega: any) => entrega.itens || []) || [];
    
    // Calcular informações de EPIs
    let episExpirados = 0;
    let proximaDataVencimento: Date | undefined;
    const datasVencimento: Date[] = [];
    const tiposEpisMap = new Map<string, { id: string; nome: string; quantidade: number }>();
    
    // 🔍 DEBUG: Log inicial do agrupamento
    console.log('🔍 [FICHA MAPPER] Iniciando agrupamento de equipamentos:');
    console.log('🔍 [FICHA MAPPER] Total de itens para agrupar:', todosItens.length);
    console.log('🔍 [FICHA MAPPER] Itens detalhados:', todosItens.map((item, idx) => ({
      index: idx,
      itemId: item.id,
      tipoEpiId: item.estoqueItem?.tipoEpi?.id,
      tipoEpiNome: item.estoqueItem?.tipoEpi?.nomeEquipamento,
      hasEstoqueItem: !!item.estoqueItem,
      hasTipoEpi: !!item.estoqueItem?.tipoEpi,
    })));
    
    todosItens.forEach((item: any, index: number) => {
      // 🔍 DEBUG: Log de cada item sendo processado
      console.log(`🔍 [FICHA MAPPER] Processando item ${index + 1}/${todosItens.length}:`, {
        itemId: item.id,
        estoqueItemExists: !!item.estoqueItem,
        tipoEpiExists: !!item.estoqueItem?.tipoEpi,
        tipoEpiId: item.estoqueItem?.tipoEpi?.id,
        tipoEpiNome: item.estoqueItem?.tipoEpi?.nomeEquipamento,
      });

      // Contar EPI expirado
      if (item.dataLimiteDevolucao) {
        const dataVencimento = new Date(item.dataLimiteDevolucao);
        datasVencimento.push(dataVencimento);
        
        if (dataVencimento < hoje) {
          episExpirados++;
        }
      }
      
      // Agrupar por tipo de EPI
      if (item.estoqueItem?.tipoEpi) {
        const tipoEpi = item.estoqueItem.tipoEpi;
        const key = tipoEpi.id;
        
        // 🔍 DEBUG: Log do agrupamento
        console.log(`🔍 [FICHA MAPPER] Agrupando item ${index + 1}:`, {
          tipoEpiKey: key,
          tipoEpiNome: tipoEpi.nomeEquipamento,
          jaExisteNoMapa: tiposEpisMap.has(key),
          quantidadeAtual: tiposEpisMap.get(key)?.quantidade || 0,
        });
        
        if (tiposEpisMap.has(key)) {
          tiposEpisMap.get(key)!.quantidade++;
          console.log(`🔍 [FICHA MAPPER] Incrementou quantidade para tipo ${tipoEpi.nomeEquipamento}: ${tiposEpisMap.get(key)!.quantidade}`);
        } else {
          tiposEpisMap.set(key, {
            id: tipoEpi.id,
            nome: tipoEpi.nomeEquipamento,
            quantidade: 1,
          });
          console.log(`🔍 [FICHA MAPPER] Criou novo tipo ${tipoEpi.nomeEquipamento} com quantidade: 1`);
        }
      } else {
        console.log(`🔍 [FICHA MAPPER] ⚠️ Item ${index + 1} sem tipoEpi válido:`, {
          itemId: item.id,
          hasEstoqueItem: !!item.estoqueItem,
          estoqueItemId: item.estoqueItem?.id,
          estoqueItemTipoEpiId: item.estoqueItem?.tipoEpiId,
        });
      }
    });

    // 🔍 DEBUG: Log final do mapa de tipos
    console.log('🔍 [FICHA MAPPER] Mapa final de tipos de EPI:');
    console.log('🔍 [FICHA MAPPER] Total de tipos únicos:', tiposEpisMap.size);
    tiposEpisMap.forEach((tipo, key) => {
      console.log(`🔍 [FICHA MAPPER] - ${key}: ${tipo.nome} (quantidade: ${tipo.quantidade})`);
    });
    
    // Encontrar próxima data de vencimento (futuras)
    const datasVencimentoFuturas = datasVencimento.filter(data => data >= hoje);
    if (datasVencimentoFuturas.length > 0) {
      proximaDataVencimento = datasVencimentoFuturas.sort((a, b) => a.getTime() - b.getTime())[0];
    }
    
    // Calcular dias até próximo vencimento
    const diasAteProximoVencimento = proximaDataVencimento 
      ? Math.ceil((proximaDataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;
    
    // Calcular se tem devolução pendente (EPIs vencidos)
    const temDevolucaoPendente = episExpirados > 0;

    return {
      ...baseOutput,
      devolucaoPendente: temDevolucaoPendente,
      // Informações da contratada
      contratada: ficha.colaborador?.contratada ? {
        id: ficha.colaborador.contratada.id,
        nome: ficha.colaborador.contratada.nome,
        cnpj: ficha.colaborador.contratada.cnpj,
      } : undefined,
      // Informações dos EPIs
      episInfo: {
        totalEpisComColaborador: todosItens.length,
        episExpirados,
        proximaDataVencimento,
        diasAteProximoVencimento,
        tiposEpisAtivos: Array.from(tiposEpisMap.values()).map(tipo => ({
          tipoEpiId: tipo.id,
          tipoEpiNome: tipo.nome,
          quantidade: tipo.quantidade,
        })),
      },
    };
  }
}