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
              select: { nomeEquipamento: true, numeroCa: true },
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

  async create(entity: Omit<NotaMovimentacao, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotaMovimentacao> {
    return this.createNota(entity as any);
  }

  async createNota(entity: Omit<NotaMovimentacao, 'id' | 'createdAt' | 'updatedAt' | 'dataConclusao'>): Promise<NotaMovimentacao> {
    const nota = await this.prisma.notaMovimentacao.create({
      data: {
        numeroDocumento: entity.numero,
        tipoNota: entity.tipo as any,
        almoxarifadoId: entity.almoxarifadoOrigemId,
        almoxarifadoDestinoId: entity.almoxarifadoDestinoId,
        responsavelId: entity.usuarioId,
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
        // dataConclusao: entity.status === StatusNotaMovimentacao.CONCLUIDA ? new Date() : null,
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
    const nota = await this.prisma.notaMovimentacao.findFirst({
      where: { numeroDocumento: numero },
      include: {
        itens: {
          include: {
            tipoEpi: {
              select: { nomeEquipamento: true, numeroCa: true },
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
      where.numeroDocumento = { contains: filtros.numero, mode: 'insensitive' };
    }
    if (filtros.tipo) {
      where.tipoNota = filtros.tipo;
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
      where.responsavelId = filtros.usuarioId;
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
          select: { nome: true }, // codigo field removed from schema v3.5
        },
        almoxarifadoDestino: {
          select: { nome: true }, // codigo field removed from schema v3.5
        },
        responsavel: {
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
      where.responsavelId = usuarioId;
    }

    const notas = await this.prisma.notaMovimentacao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
        responsavel: {
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
              select: { nomeEquipamento: true, numeroCa: true },
            },
          },
        },
        almoxarifadoOrigem: {
          select: { nome: true },
        },
        almoxarifadoDestino: {
          select: { nome: true },
        },
        responsavel: {
          select: { nome: true, email: true },
        },
      },
    });

    if (!nota) return null;

    const notaDomain = this.toDomain(nota);
    
    // Adicionar itens à instância de domínio preservando métodos
    const itensProcessados = nota.itens.map((item) => ({
      id: item.id,
      tipoEpiId: item.tipoEpiId,
      quantidade: item.quantidade,
      quantidadeProcessada: 0, // Valor padrão
      observacoes: undefined,
    }));
    
    // Adicionar itens à instância usando método privado (se disponível) ou propriedade
    (notaDomain as any)._itens = itensProcessados;
    
    return notaDomain as unknown as NotaMovimentacaoWithItens;
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
        numeroDocumento: { startsWith: `${prefixo}-${ano}` },
        tipoNota: tipo as any,
      },
      orderBy: { numeroDocumento: 'desc' },
    });

    let proximoNumero = 1;
    if (ultimaNota) {
      const numeroAtual = ultimaNota.numeroDocumento?.split('-').pop();
      proximoNumero = parseInt(numeroAtual || '0') + 1;
    }

    return `${prefixo}-${ano}-${proximoNumero.toString().padStart(6, '0')}`;
  }

  async concluirNota(
    id: string,
    _usuarioId: string,
    _dataConclusao?: Date,
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
        // dataConclusao: dataConclusao || new Date(),
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

    motivo 
      ? `${nota.observacoes || ''}\nCANCELAMENTO: ${motivo}`
      : nota.observacoes;

    const notaAtualizada = await this.prisma.notaMovimentacao.update({
      where: { id },
      data: {
        status: StatusNotaMovimentacao.CANCELADA as any,
        // observacoes,
      },
    });

    return this.toDomain(notaAtualizada);
  }

  async adicionarItem(
    notaId: string,
    tipoEpiId: string,
    quantidade: number,
    _observacoes?: string,
  ): Promise<void> {
    await this.prisma.notaMovimentacaoItem.create({
      data: {
        notaMovimentacaoId: notaId,
        tipoEpiId,
        quantidade,
        // Note: quantidadeProcessada field removed from schema v3.5
        // observacoes,
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
    _quantidadeProcessada: number,
  ): Promise<void> {
    await this.prisma.notaMovimentacaoItem.update({
      where: { id: itemId },
      data: { /* quantidadeProcessada field removed */ },
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
        responsavel: {
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
      case TipoNotaMovimentacao.ENTRADA_AJUSTE:
        return 'AJUE';
      case TipoNotaMovimentacao.SAIDA_AJUSTE:
        return 'AJUS';
      default:
        return 'MOV';
    }
  }

  private toDomain(nota: any): NotaMovimentacao {
    const notaMovimentacao = new NotaMovimentacao(
      nota.id,
      nota.numeroDocumento, // Corrigido: usar numeroDocumento do banco
      nota.tipoNota as TipoNotaMovimentacao, // Corrigido: usar tipoNota do banco
      nota.almoxarifadoId, // Campo de origem (almoxarifadoId no schema)
      nota.almoxarifadoDestinoId, // Campo de destino
      nota.responsavelId, // Corrigido: usar responsavelId do banco
      nota.observacoes,
      nota.status as StatusNotaMovimentacao,
      nota.dataConclusao,
      nota.createdAt,
      nota.updatedAt,
    );

    return notaMovimentacao;
  }
}