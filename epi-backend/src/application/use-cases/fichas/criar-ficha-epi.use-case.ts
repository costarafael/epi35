import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FichaEPI } from '../../../domain/entities/ficha-epi.entity';
import { StatusFichaEPI } from '../../../domain/enums';
import { BusinessError, ConflictError, NotFoundError } from '../../../domain/exceptions/business.exception';

export interface CriarFichaEpiInput {
  colaboradorId: string;
  tipoEpiId: string;
  almoxarifadoId: string;
  status?: StatusFichaEPI;
}

export interface FichaEpiOutput {
  id: string;
  colaboradorId: string;
  tipoEpiId: string;
  almoxarifadoId: string;
  status: StatusFichaEPI;
  createdAt: Date;
  updatedAt: Date;
  colaborador: {
    nome: string;
    cpf: string;
    matricula?: string;
  };
  tipoEpi: {
    nome: string;
    codigo: string;
    exigeAssinaturaEntrega: boolean;
  };
  almoxarifado: {
    nome: string;
    codigo: string;
  };
}

export interface FichaFilters {
  colaboradorId?: string;
  tipoEpiId?: string;
  almoxarifadoId?: string;
  status?: StatusFichaEPI;
  colaboradorNome?: string;
  tipoEpiNome?: string;
  ativo?: boolean;
}

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

    // Verificar se colaborador, tipo EPI e almoxarifado existem e estão ativos
    await this.validarDependencias(input);

    // Criar entidade de domínio
    const fichaData = FichaEPI.create(
      input.colaboradorId,
      input.tipoEpiId,
      input.almoxarifadoId,
      input.status || StatusFichaEPI.ATIVA,
    );

    // Salvar no banco de dados
    const ficha = await this.prisma.fichaEPI.create({
      data: {
        colaboradorId: fichaData.colaboradorId,
        tipoEpiId: fichaData.tipoEpiId,
        almoxarifadoId: fichaData.almoxarifadoId,
        status: fichaData.status as any,
      },
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
          },
        },
        tipoEpi: {
          select: {
            nome: true,
            codigo: true,
            exigeAssinaturaEntrega: true,
          },
        },
        almoxarifado: {
          select: {
            nome: true,
            codigo: true,
          },
        },
      },
    });

    return this.mapToOutput(ficha);
  }

  async obterFicha(id: string): Promise<FichaEpiOutput | null> {
    const ficha = await this.prisma.fichaEPI.findUnique({
      where: { id },
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
          },
        },
        tipoEpi: {
          select: {
            nome: true,
            codigo: true,
            exigeAssinaturaEntrega: true,
          },
        },
        almoxarifado: {
          select: {
            nome: true,
            codigo: true,
          },
        },
      },
    });

    return ficha ? this.mapToOutput(ficha) : null;
  }

  async listarFichas(filtros: FichaFilters = {}): Promise<FichaEpiOutput[]> {
    const where: any = {};

    if (filtros.colaboradorId) {
      where.colaboradorId = filtros.colaboradorId;
    }

    if (filtros.tipoEpiId) {
      where.tipoEpiId = filtros.tipoEpiId;
    }

    if (filtros.almoxarifadoId) {
      where.almoxarifadoId = filtros.almoxarifadoId;
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

    if (filtros.tipoEpiNome) {
      where.tipoEpi = {
        nome: { contains: filtros.tipoEpiNome, mode: 'insensitive' },
      };
    }

    const fichas = await this.prisma.fichaEPI.findMany({
      where,
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
          },
        },
        tipoEpi: {
          select: {
            nome: true,
            codigo: true,
            exigeAssinaturaEntrega: true,
          },
        },
        almoxarifado: {
          select: {
            nome: true,
            codigo: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { colaborador: { nome: 'asc' } },
        { tipoEpi: { nome: 'asc' } },
      ],
    });

    return fichas.map(this.mapToOutput);
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
          },
        },
        tipoEpi: {
          select: {
            nome: true,
            codigo: true,
            exigeAssinaturaEntrega: true,
          },
        },
        almoxarifado: {
          select: {
            nome: true,
            codigo: true,
          },
        },
      },
    });

    return this.mapToOutput(ficha);
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
        status: 'ATIVA',
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
          },
        },
        tipoEpi: {
          select: {
            nome: true,
            codigo: true,
            exigeAssinaturaEntrega: true,
          },
        },
        almoxarifado: {
          select: {
            nome: true,
            codigo: true,
          },
        },
      },
    });

    return this.mapToOutput(ficha);
  }

  async suspenderFicha(id: string, motivo?: string): Promise<FichaEpiOutput> {
    const fichaExistente = await this.prisma.fichaEPI.findUnique({
      where: { id },
    });

    if (!fichaExistente) {
      throw new NotFoundError('Ficha de EPI', id);
    }

    if (fichaExistente.status === StatusFichaEPI.SUSPENSA) {
      throw new BusinessError('Ficha já está suspensa');
    }

    const ficha = await this.prisma.fichaEPI.update({
      where: { id },
      data: { status: StatusFichaEPI.SUSPENSA as any },
      include: {
        colaborador: {
          select: {
            nome: true,
            cpf: true,
            matricula: true,
          },
        },
        tipoEpi: {
          select: {
            nome: true,
            codigo: true,
            exigeAssinaturaEntrega: true,
          },
        },
        almoxarifado: {
          select: {
            nome: true,
            codigo: true,
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

    return this.mapToOutput(ficha);
  }

  async criarOuAtivar(input: CriarFichaEpiInput): Promise<{
    ficha: FichaEpiOutput;
    criada: boolean;
  }> {
    // Verificar se já existe
    const fichaExistente = await this.prisma.fichaEPI.findUnique({
      where: {
        colaboradorId_tipoEpiId_almoxarifadoId: {
          colaboradorId: input.colaboradorId,
          tipoEpiId: input.tipoEpiId,
          almoxarifadoId: input.almoxarifadoId,
        },
      },
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

  async obterEstatisticas(almoxarifadoId?: string): Promise<{
    totalFichas: number;
    fichasAtivas: number;
    fichasInativas: number;
    fichasSuspensas: number;
    porTipoEpi: { tipoEpiNome: string; quantidade: number }[];
    porColaborador: { colaboradorNome: string; quantidade: number }[];
  }> {
    const where: any = {};
    if (almoxarifadoId) {
      where.almoxarifadoId = almoxarifadoId;
    }

    const [fichasPorStatus, fichasPorTipo, fichasPorColaborador] = await Promise.all([
      this.prisma.fichaEPI.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.fichaEPI.groupBy({
        by: ['tipoEpiId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.fichaEPI.groupBy({
        by: ['colaboradorId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Buscar nomes dos tipos EPI
    const tiposEpiIds = fichasPorTipo.map(f => f.tipoEpiId);
    const tiposEpi = await this.prisma.tipoEPI.findMany({
      where: { id: { in: tiposEpiIds } },
      select: { id: true, nome: true },
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
      fichasSuspensas: fichasPorStatus.find(f => f.status === 'SUSPENSA')?._count.id || 0,
      porTipoEpi: fichasPorTipo.map(f => ({
        tipoEpiNome: tiposEpi.find(t => t.id === f.tipoEpiId)?.nome || 'Desconhecido',
        quantidade: f._count.id,
      })),
      porColaborador: fichasPorColaborador.map(f => ({
        colaboradorNome: colaboradores.find(c => c.id === f.colaboradorId)?.nome || 'Desconhecido',
        quantidade: f._count.id,
      })),
    };
  }

  private async validarInput(input: CriarFichaEpiInput): Promise<void> {
    if (!input.colaboradorId) {
      throw new BusinessError('Colaborador é obrigatório');
    }

    if (!input.tipoEpiId) {
      throw new BusinessError('Tipo de EPI é obrigatório');
    }

    if (!input.almoxarifadoId) {
      throw new BusinessError('Almoxarifado é obrigatório');
    }
  }

  private async verificarFichaExistente(input: CriarFichaEpiInput): Promise<void> {
    const fichaExistente = await this.prisma.fichaEPI.findUnique({
      where: {
        colaboradorId_tipoEpiId_almoxarifadoId: {
          colaboradorId: input.colaboradorId,
          tipoEpiId: input.tipoEpiId,
          almoxarifadoId: input.almoxarifadoId,
        },
      },
    });

    if (fichaExistente) {
      throw new ConflictError(
        'Já existe uma ficha de EPI para este colaborador, tipo de EPI e almoxarifado',
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

    // Verificar tipo EPI
    const tipoEpi = await this.prisma.tipoEPI.findUnique({
      where: { id: input.tipoEpiId },
    });

    if (!tipoEpi) {
      throw new NotFoundError('Tipo de EPI', input.tipoEpiId);
    }

    if (!tipoEpi.ativo) {
      throw new BusinessError('Tipo de EPI está inativo');
    }

    // Verificar almoxarifado
    const almoxarifado = await this.prisma.almoxarifado.findUnique({
      where: { id: input.almoxarifadoId },
    });

    if (!almoxarifado) {
      throw new NotFoundError('Almoxarifado', input.almoxarifadoId);
    }

    if (!almoxarifado.ativo) {
      throw new BusinessError('Almoxarifado está inativo');
    }

    // Verificar se colaborador e almoxarifado são da mesma unidade de negócio
    if (colaborador.unidadeNegocioId !== almoxarifado.unidadeNegocioId) {
      throw new BusinessError(
        'Colaborador e almoxarifado devem pertencer à mesma unidade de negócio',
      );
    }
  }

  private mapToOutput(ficha: any): FichaEpiOutput {
    return {
      id: ficha.id,
      colaboradorId: ficha.colaboradorId,
      tipoEpiId: ficha.tipoEpiId,
      almoxarifadoId: ficha.almoxarifadoId,
      status: ficha.status as StatusFichaEPI,
      createdAt: ficha.createdAt,
      updatedAt: ficha.updatedAt,
      colaborador: {
        nome: ficha.colaborador.nome,
        cpf: ficha.colaborador.cpf,
        matricula: ficha.colaborador.matricula,
      },
      tipoEpi: {
        nome: ficha.tipoEpi.nome,
        codigo: ficha.tipoEpi.codigo,
        exigeAssinaturaEntrega: ficha.tipoEpi.exigeAssinaturaEntrega,
      },
      almoxarifado: {
        nome: ficha.almoxarifado.nome,
        codigo: ficha.almoxarifado.codigo,
      },
    };
  }
}