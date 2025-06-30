import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotaMovimentacao } from '../../domain/entities/nota-movimentacao.entity';
import {
  INotaRepository,
  NotaMovimentacaoFilters,
  NotaMovimentacaoWithItens,
} from '../../domain/interfaces/repositories/nota-repository.interface';
import { StatusNotaMovimentacao, TipoNotaMovimentacao } from '../../domain/enums';
import { BusinessError, NotFoundError } from '../../domain/exceptions/business.exception';

@Injectable()
export class NotaRepository implements INotaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<NotaMovimentacao | null> {
    const nota = await this.prisma.notaMovimentacao.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            tipoEpi: {
              select: { nome: true, codigo: true },
            },
          },
        },
      },
    });

    return nota ? this.toDomain(nota) : null;
  }

  async findAll(): Promise<NotaMovimentacao[]> {
    const notas = await this.prisma.notaMovimentacao.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return notas.map(this.toDomain);
  }

  async create(entity: Omit<NotaMovimentacao, 'id' | 'createdAt' | 'updatedAt' | 'dataConclusao'>): Promise<NotaMovimentacao> {
    const nota = await this.prisma.notaMovimentacao.create({
      data: {
        numero: entity.numero,
        tipo: entity.tipo as any,
        almoxarifadoOrigemId: entity.almoxarifadoOrigemId,
        almoxarifadoDestinoId: entity.almoxarifadoDestinoId,
        usuarioId: entity.usuarioId,
        observacoes: entity.observacoes,
        status: StatusNotaMovimentacao.RASCUNHO as any,
      },
    });

    return this.toDomain(nota);
  }

  async update(id: string, entity: Partial<NotaMovimentacao>): Promise<NotaMovimentacao> {
    const nota = await this.prisma.notaMovimentacao.update({
      where: { id },
      data: {
        observacoes: entity.observacoes,
        status: entity.status as any,
        dataConclusao: entity.status === StatusNotaMovimentacao.CONCLUIDA ? new Date() : null,
      },
    });

    return this.toDomain(nota);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.notaMovimentacao.delete({
      where: { id },
    });
  }

  async findByNumero(numero: string): Promise<NotaMovimentacao | null> {
    const nota = await this.prisma.notaMovimentacao.findUnique({
      where: { numero },
      include: {
        itens: {
          include: {
            tipoEpi: {
              select: { nome: true, codigo: true },
            },
          },
        },
      },
    });

    return nota ? this.toDomain(nota) : null;
  }

  async findByFilters(filtros: NotaMovimentacaoFilters): Promise<NotaMovimentacao[]> {
    const where: any = {};

    if (filtros.numero) {
      where.numero = { contains: filtros.numero, mode: 'insensitive' };
    }
    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }
    if (filtros.status) {
      where.status = filtros.status;
    }
    if (filtros.almoxarifadoOrigemId) {
      where.almoxarifadoOrigemId = filtros.almoxarifadoOrigemId;
    }
    if (filtros.almoxarifadoDestinoId) {
      where.almoxarifadoDestinoId = filtros.almoxarifadoDestinoId;
    }
    if (filtros.usuarioId) {
      where.usuarioId = filtros.usuarioId;
    }
    if (filtros.dataInicio || filtros.dataFim) {
      where.createdAt = {};
      if (filtros.dataInicio) {
        where.createdAt.gte = filtros.dataInicio;
      }
      if (filtros.dataFim) {
        where.createdAt.lte = filtros.dataFim;
      }
    }

    const notas = await this.prisma.notaMovimentacao.findMany({
      where,
      include: {
        almoxarifadoOrigem: {
          select: { nome: true, codigo: true },
        },
        almoxarifadoDestino: {
          select: { nome: true, codigo: true },
        },
        usuario: {
          select: { nome: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return notas.map(this.toDomain);
  }

  async findRascunhos(usuarioId?: string): Promise<NotaMovimentacao[]> {
    const where: any = {
      status: StatusNotaMovimentacao.RASCUNHO,
    };

    if (usuarioId) {
      where.usuarioId = usuarioId;
    }

    const notas = await this.prisma.notaMovimentacao.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return notas.map(this.toDomain);
  }

  async findPendentes(): Promise<NotaMovimentacao[]> {
    const notas = await this.prisma.notaMovimentacao.findMany({
      where: {
        status: StatusNotaMovimentacao.RASCUNHO,
        createdAt: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Mais de 24h
        },
      },
      include: {
        usuario: {
          select: { nome: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return notas.map(this.toDomain);
  }

  async findWithItens(id: string): Promise<NotaMovimentacaoWithItens | null> {
    const nota = await this.prisma.notaMovimentacao.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            tipoEpi: {
              select: { nome: true, codigo: true },
            },
          },
        },
        almoxarifadoOrigem: {
          select: { nome: true, codigo: true },
        },
        almoxarifadoDestino: {
          select: { nome: true, codigo: true },
        },
        usuario: {
          select: { nome: true, email: true },
        },
      },
    });

    if (!nota) return null;

    const notaDomain = this.toDomain(nota);
    return {
      ...notaDomain,
      itens: nota.itens.map((item) => ({
        id: item.id,
        tipoEpiId: item.tipoEpiId,
        quantidade: item.quantidade,
        quantidadeProcessada: item.quantidadeProcessada,
        observacoes: item.observacoes || undefined,
        tipoEpi: {
          nome: item.tipoEpi.nome,
          codigo: item.tipoEpi.codigo,
        },
      })),
    } as NotaMovimentacaoWithItens;
  }

  async findByAlmoxarifado(
    almoxarifadoId: string,
    isOrigem: boolean,
  ): Promise<NotaMovimentacao[]> {
    const where: any = {};
    
    if (isOrigem) {
      where.almoxarifadoOrigemId = almoxarifadoId;
    } else {
      where.almoxarifadoDestinoId = almoxarifadoId;
    }

    const notas = await this.prisma.notaMovimentacao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return notas.map(this.toDomain);
  }

  async gerarProximoNumero(tipo: TipoNotaMovimentacao): Promise<string> {
    const ano = new Date().getFullYear();
    const prefixo = this.getPrefixoPorTipo(tipo);
    
    const ultimaNota = await this.prisma.notaMovimentacao.findFirst({
      where: {
        numero: { startsWith: `${prefixo}-${ano}` },
        tipo: tipo as any,
      },
      orderBy: { numero: 'desc' },
    });

    let proximoNumero = 1;
    if (ultimaNota) {
      const numeroAtual = ultimaNota.numero.split('-').pop();
      proximoNumero = parseInt(numeroAtual || '0') + 1;
    }

    return `${prefixo}-${ano}-${proximoNumero.toString().padStart(6, '0')}`;
  }

  async concluirNota(
    id: string,
    usuarioId: string,
    dataConclusao?: Date,
  ): Promise<NotaMovimentacao> {
    const nota = await this.findById(id);
    if (!nota) {
      throw new NotFoundError('Nota de movimentação', id);
    }

    if (!nota.isRascunho()) {
      throw new BusinessError('Apenas notas em rascunho podem ser concluídas');
    }

    const notaAtualizada = await this.prisma.notaMovimentacao.update({
      where: { id },
      data: {
        status: StatusNotaMovimentacao.CONCLUIDA as any,
        dataConclusao: dataConclusao || new Date(),
      },
    });

    return this.toDomain(notaAtualizada);
  }

  async cancelarNota(
    id: string,
    usuarioId: string,
    motivo?: string,
  ): Promise<NotaMovimentacao> {
    const nota = await this.findById(id);
    if (!nota) {
      throw new NotFoundError('Nota de movimentação', id);
    }

    if (!nota.isCancelavel()) {
      throw new BusinessError('Nota não pode ser cancelada');
    }

    const observacoes = motivo 
      ? `${nota.observacoes || ''}\nCANCELAMENTO: ${motivo}`
      : nota.observacoes;

    const notaAtualizada = await this.prisma.notaMovimentacao.update({
      where: { id },
      data: {
        status: StatusNotaMovimentacao.CANCELADA as any,
        observacoes,
      },
    });

    return this.toDomain(notaAtualizada);
  }

  async adicionarItem(
    notaId: string,
    tipoEpiId: string,
    quantidade: number,
    observacoes?: string,
  ): Promise<void> {
    await this.prisma.notaMovimentacaoItem.create({
      data: {
        notaMovimentacaoId: notaId,
        tipoEpiId,
        quantidade,
        quantidadeProcessada: 0,
        observacoes,
      },
    });
  }

  async removerItem(notaId: string, itemId: string): Promise<void> {
    await this.prisma.notaMovimentacaoItem.delete({
      where: { id: itemId },
    });
  }

  async atualizarQuantidadeItem(
    notaId: string,
    itemId: string,
    quantidade: number,
  ): Promise<void> {
    await this.prisma.notaMovimentacaoItem.update({
      where: { id: itemId },
      data: { quantidade },
    });
  }

  async atualizarQuantidadeProcessada(
    notaId: string,
    itemId: string,
    quantidadeProcessada: number,
  ): Promise<void> {
    await this.prisma.notaMovimentacaoItem.update({
      where: { id: itemId },
      data: { quantidadeProcessada },
    });
  }

  async obterEstatisticas(
    dataInicio: Date,
    dataFim: Date,
    almoxarifadoId?: string,
  ): Promise<{
    totalNotas: number;
    notasConcluidas: number;
    notasCanceladas: number;
    notasRascunho: number;
    totalItens: number;
    totalQuantidade: number;
  }> {
    const where: any = {
      createdAt: {
        gte: dataInicio,
        lte: dataFim,
      },
    };

    if (almoxarifadoId) {
      where.OR = [
        { almoxarifadoOrigemId: almoxarifadoId },
        { almoxarifadoDestinoId: almoxarifadoId },
      ];
    }

    const [stats, itensStats] = await Promise.all([
      this.prisma.notaMovimentacao.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.notaMovimentacaoItem.aggregate({
        where: {
          notaMovimentacao: where,
        },
        _count: { id: true },
        _sum: { quantidade: true },
      }),
    ]);

    const estatisticas = {
      totalNotas: 0,
      notasConcluidas: 0,
      notasCanceladas: 0,
      notasRascunho: 0,
      totalItens: itensStats._count.id || 0,
      totalQuantidade: itensStats._sum.quantidade || 0,
    };

    stats.forEach((stat) => {
      estatisticas.totalNotas += stat._count.id;
      
      switch (stat.status) {
        case StatusNotaMovimentacao.CONCLUIDA:
          estatisticas.notasConcluidas = stat._count.id;
          break;
        case StatusNotaMovimentacao.CANCELADA:
          estatisticas.notasCanceladas = stat._count.id;
          break;
        case StatusNotaMovimentacao.RASCUNHO:
          estatisticas.notasRascunho = stat._count.id;
          break;
      }
    });

    return estatisticas;
  }

  async obterNotasVencidas(): Promise<NotaMovimentacao[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7); // 7 dias atrás

    const notas = await this.prisma.notaMovimentacao.findMany({
      where: {
        status: StatusNotaMovimentacao.RASCUNHO,
        createdAt: { lte: dataLimite },
      },
      include: {
        usuario: {
          select: { nome: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return notas.map(this.toDomain);
  }

  private getPrefixoPorTipo(tipo: TipoNotaMovimentacao): string {
    switch (tipo) {
      case TipoNotaMovimentacao.ENTRADA:
        return 'ENT';
      case TipoNotaMovimentacao.TRANSFERENCIA:
        return 'TRF';
      case TipoNotaMovimentacao.DESCARTE:
        return 'DESC';
      case TipoNotaMovimentacao.AJUSTE:
        return 'AJU';
      default:
        return 'MOV';
    }
  }

  private toDomain(nota: any): NotaMovimentacao {
    const notaMovimentacao = new NotaMovimentacao(
      nota.id,
      nota.numero,
      nota.tipo as TipoNotaMovimentacao,
      nota.almoxarifadoOrigemId,
      nota.almoxarifadoDestinoId,
      nota.usuarioId,
      nota.observacoes,
      nota.status as StatusNotaMovimentacao,
      nota.dataConclusao,
      nota.createdAt,
      nota.updatedAt,
    );

    return notaMovimentacao;
  }
}