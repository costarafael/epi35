import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MovimentacaoEstoque } from '../../domain/entities/movimentacao-estoque.entity';
import {
  IMovimentacaoRepository,
  MovimentacaoEstoqueFilters,
  KardexItem,
} from '../../domain/interfaces/repositories/movimentacao-repository.interface';
import { TipoMovimentacao } from '../../domain/enums';
import { BusinessError, NotFoundError } from '../../domain/exceptions/business.exception';

@Injectable()
export class MovimentacaoRepository implements IMovimentacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MovimentacaoEstoque | null> {
    const movimentacao = await this.prisma.movimentacaoEstoque.findUnique({
      where: { id },
    });

    return movimentacao ? this.toDomain(movimentacao) : null;
  }

  async findAll(): Promise<MovimentacaoEstoque[]> {
    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return movimentacoes.map(this.toDomain);
  }

  async create(entity: Omit<MovimentacaoEstoque, 'id' | 'createdAt'>): Promise<MovimentacaoEstoque> {
    const movimentacao = await this.prisma.movimentacaoEstoque.create({
      data: {
        almoxarifadoId: entity.almoxarifadoId,
        tipoEpiId: entity.tipoEpiId,
        tipoMovimentacao: entity.tipoMovimentacao as any,
        quantidade: entity.quantidade,
        saldoAnterior: entity.saldoAnterior,
        saldoPosterior: entity.saldoPosterior,
        notaMovimentacaoId: entity.notaMovimentacaoId,
        usuarioId: entity.usuarioId,
        observacoes: entity.observacoes,
        movimentacaoEstornoId: entity.movimentacaoEstornoId,
      },
    });

    return this.toDomain(movimentacao);
  }

  async update(id: string, entity: Partial<MovimentacaoEstoque>): Promise<MovimentacaoEstoque> {
    const movimentacao = await this.prisma.movimentacaoEstoque.update({
      where: { id },
      data: {
        observacoes: entity.observacoes,
      },
    });

    return this.toDomain(movimentacao);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.movimentacaoEstoque.delete({
      where: { id },
    });
  }

  async findByAlmoxarifadoAndTipo(
    almoxarifadoId: string,
    tipoEpiId: string,
    filtros?: Partial<MovimentacaoEstoqueFilters>,
  ): Promise<MovimentacaoEstoque[]> {
    const where: any = {
      almoxarifadoId,
      tipoEpiId,
    };

    if (filtros) {
      if (filtros.tipoMovimentacao) {
        where.tipoMovimentacao = filtros.tipoMovimentacao;
      }
      if (filtros.usuarioId) {
        where.usuarioId = filtros.usuarioId;
      }
      if (filtros.notaMovimentacaoId) {
        where.notaMovimentacaoId = filtros.notaMovimentacaoId;
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
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return movimentacoes.map(this.toDomain);
  }

  async findByNotaMovimentacao(notaMovimentacaoId: string): Promise<MovimentacaoEstoque[]> {
    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where: { notaMovimentacaoId },
      orderBy: { createdAt: 'asc' },
    });

    return movimentacoes.map(this.toDomain);
  }

  async findByFilters(filtros: MovimentacaoEstoqueFilters): Promise<MovimentacaoEstoque[]> {
    const where: any = {};

    if (filtros.almoxarifadoId) {
      where.almoxarifadoId = filtros.almoxarifadoId;
    }
    if (filtros.tipoEpiId) {
      where.tipoEpiId = filtros.tipoEpiId;
    }
    if (filtros.tipoMovimentacao) {
      where.tipoMovimentacao = filtros.tipoMovimentacao;
    }
    if (filtros.usuarioId) {
      where.usuarioId = filtros.usuarioId;
    }
    if (filtros.notaMovimentacaoId) {
      where.notaMovimentacaoId = filtros.notaMovimentacaoId;
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

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        almoxarifado: {
          select: { nome: true, codigo: true },
        },
        tipoEpi: {
          select: { nome: true, codigo: true },
        },
        usuario: {
          select: { nome: true, email: true },
        },
        notaMovimentacao: {
          select: { numero: true, tipo: true },
        },
      },
    });

    return movimentacoes.map(this.toDomain);
  }

  async obterUltimaSaldo(almoxarifadoId: string, tipoEpiId: string): Promise<number> {
    const ultimaMovimentacao = await this.prisma.movimentacaoEstoque.findFirst({
      where: {
        almoxarifadoId,
        tipoEpiId,
      },
      orderBy: { createdAt: 'desc' },
      select: { saldoPosterior: true },
    });

    return ultimaMovimentacao?.saldoPosterior || 0;
  }

  async obterKardex(
    almoxarifadoId: string,
    tipoEpiId: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<KardexItem[]> {
    const where: any = {
      almoxarifadoId,
      tipoEpiId,
    };

    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) {
        where.createdAt.gte = dataInicio;
      }
      if (dataFim) {
        where.createdAt.lte = dataFim;
      }
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      include: {
        notaMovimentacao: {
          select: { numero: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return movimentacoes.map((mov) => ({
      data: mov.createdAt,
      documento: mov.notaMovimentacao?.numero || `MOV-${mov.id.substring(0, 8)}`,
      tipoMovimentacao: mov.tipoMovimentacao as TipoMovimentacao,
      quantidade: mov.quantidade,
      saldoAnterior: mov.saldoAnterior,
      saldoPosterior: mov.saldoPosterior,
      observacoes: mov.observacoes || undefined,
    }));
  }

  async createMovimentacao(
    almoxarifadoId: string,
    tipoEpiId: string,
    tipoMovimentacao: TipoMovimentacao,
    quantidade: number,
    usuarioId: string,
    notaMovimentacaoId?: string,
    observacoes?: string,
  ): Promise<MovimentacaoEstoque> {
    // Obter saldo anterior
    const saldoAnterior = await this.obterUltimaSaldo(almoxarifadoId, tipoEpiId);

    // Criar a movimentação usando o método estático da entidade
    const movimentacaoData = MovimentacaoEstoque.createEntrada(
      almoxarifadoId,
      tipoEpiId,
      quantidade,
      saldoAnterior,
      usuarioId,
      notaMovimentacaoId,
      observacoes,
    );

    return this.create(movimentacaoData);
  }

  async criarEstorno(
    movimentacaoOriginalId: string,
    usuarioId: string,
    observacoes?: string,
  ): Promise<MovimentacaoEstoque> {
    const movimentacaoOriginal = await this.findById(movimentacaoOriginalId);
    if (!movimentacaoOriginal) {
      throw new NotFoundError('Movimentação', movimentacaoOriginalId);
    }

    if (!movimentacaoOriginal.isEstornavel()) {
      throw new BusinessError('Movimentação não pode ser estornada');
    }

    // Obter saldo atual
    const saldoAnterior = await this.obterUltimaSaldo(
      movimentacaoOriginal.almoxarifadoId,
      movimentacaoOriginal.tipoEpiId,
    );

    // Criar movimentação de estorno (quantidade com sinal oposto)
    const quantidadeEstorno = movimentacaoOriginal.isEntrada()
      ? -movimentacaoOriginal.quantidade
      : movimentacaoOriginal.quantidade;

    const estorno = await this.prisma.movimentacaoEstoque.create({
      data: {
        almoxarifadoId: movimentacaoOriginal.almoxarifadoId,
        tipoEpiId: movimentacaoOriginal.tipoEpiId,
        tipoMovimentacao: TipoMovimentacao.ESTORNO as any,
        quantidade: Math.abs(quantidadeEstorno),
        saldoAnterior,
        saldoPosterior: saldoAnterior + quantidadeEstorno,
        usuarioId,
        observacoes: observacoes || `Estorno da movimentação ${movimentacaoOriginalId}`,
        movimentacaoEstornoId: movimentacaoOriginalId,
      },
    });

    return this.toDomain(estorno);
  }

  async findEstornaveis(almoxarifadoId?: string): Promise<MovimentacaoEstoque[]> {
    const where: any = {
      tipoMovimentacao: { not: TipoMovimentacao.ESTORNO },
      movimentacaoEstornoId: null,
    };

    if (almoxarifadoId) {
      where.almoxarifadoId = almoxarifadoId;
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limitar para performance
    });

    return movimentacoes.map(this.toDomain);
  }

  async obterResumoMovimentacoes(
    dataInicio: Date,
    dataFim: Date,
    almoxarifadoId?: string,
  ): Promise<{
    tipoMovimentacao: TipoMovimentacao;
    quantidade: number;
    valor: number;
  }[]> {
    const where: any = {
      createdAt: {
        gte: dataInicio,
        lte: dataFim,
      },
    };

    if (almoxarifadoId) {
      where.almoxarifadoId = almoxarifadoId;
    }

    const resumo = await this.prisma.movimentacaoEstoque.groupBy({
      by: ['tipoMovimentacao'],
      where,
      _sum: { quantidade: true },
      _count: { id: true },
    });

    return resumo.map((item) => ({
      tipoMovimentacao: item.tipoMovimentacao as TipoMovimentacao,
      quantidade: item._sum.quantidade || 0,
      valor: item._count.id || 0,
    }));
  }

  private toDomain(movimentacao: any): MovimentacaoEstoque {
    return new MovimentacaoEstoque(
      movimentacao.id,
      movimentacao.almoxarifadoId,
      movimentacao.tipoEpiId,
      movimentacao.tipoMovimentacao as TipoMovimentacao,
      movimentacao.quantidade,
      movimentacao.saldoAnterior,
      movimentacao.saldoPosterior,
      movimentacao.notaMovimentacaoId,
      movimentacao.usuarioId,
      movimentacao.observacoes,
      movimentacao.movimentacaoEstornoId,
      movimentacao.createdAt,
    );
  }
}