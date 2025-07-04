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
import { 
  PaginationOptions, 
  PaginatedResult, 
  createPaginatedResult, 
  DEFAULT_PAGINATION, 
  MAX_LIMIT 
} from '../../domain/interfaces/common/pagination.interface';

@Injectable()
export class MovimentacaoRepository implements IMovimentacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<MovimentacaoEstoque | null> {
    const movimentacao = await this.prisma.movimentacaoEstoque.findUnique({
      where: { id },
    });

    return movimentacao ? this.toDomain(movimentacao) : null;
  }

  /**
   * @deprecated Use findAllPaginated instead to prevent memory issues
   */
  async findAll(): Promise<MovimentacaoEstoque[]> {
    // Log warning for deprecated usage
    console.warn('⚠️  MovimentacaoRepository.findAll() is deprecated. Use findAllPaginated() instead to prevent memory issues.');
    
    // Return limited results to prevent crashes
    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      orderBy: { dataMovimentacao: 'desc' },
      take: 100, // Safety limit
    });

    return movimentacoes.map(this.toDomain);
  }

  async findAllPaginated(options: PaginationOptions = {}): Promise<PaginatedResult<MovimentacaoEstoque>> {
    const page = options.page ?? DEFAULT_PAGINATION.page;
    const limit = Math.min(options.limit ?? DEFAULT_PAGINATION.limit, MAX_LIMIT);
    
    const [items, total] = await Promise.all([
      this.prisma.movimentacaoEstoque.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { dataMovimentacao: 'desc' },
      }),
      this.prisma.movimentacaoEstoque.count(),
    ]);

    return createPaginatedResult(
      items.map(this.toDomain),
      total,
      page,
      limit,
    );
  }

  async create(entity: Omit<MovimentacaoEstoque, 'id' | 'dataMovimentacao'>): Promise<MovimentacaoEstoque> {
    const movimentacao = await this.prisma.movimentacaoEstoque.create({
      data: {
        estoqueItemId: entity.estoqueItemId,
        tipoMovimentacao: entity.tipoMovimentacao as any,
        quantidadeMovida: entity.quantidadeMovida,
        notaMovimentacaoId: entity.notaMovimentacaoId,
        responsavelId: entity.responsavelId,
        entregaId: entity.entregaId,
        movimentacaoOrigemId: entity.movimentacaoOrigemId,
        // Note: saldoAnterior, saldoPosterior, observacoes fields removed from schema v3.5
      },
    });

    return this.toDomain(movimentacao);
  }

  async update(id: string, entity: Partial<MovimentacaoEstoque>): Promise<MovimentacaoEstoque> {
    const movimentacao = await this.prisma.movimentacaoEstoque.update({
      where: { id },
      data: {
        // Note: MovimentacaoEstoque records should be immutable after creation
        // Limited update capability for emergency corrections only
        tipoMovimentacao: entity.tipoMovimentacao,
        quantidadeMovida: entity.quantidadeMovida,
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
      estoqueItem: {
        almoxarifadoId,
        tipoEpiId,
      },
    };

    if (filtros) {
      if (filtros.tipoMovimentacao) {
        where.tipoMovimentacao = filtros.tipoMovimentacao;
      }
      if (filtros.usuarioId) {
        where.responsavelId = filtros.usuarioId; // Field name updated
      }
      if (filtros.notaMovimentacaoId) {
        where.notaMovimentacaoId = filtros.notaMovimentacaoId;
      }
      if (filtros.dataInicio || filtros.dataFim) {
        where.dataMovimentacao = {}; // Field name updated
        if (filtros.dataInicio) {
          where.dataMovimentacao.gte = filtros.dataInicio;
        }
        if (filtros.dataFim) {
          where.dataMovimentacao.lte = filtros.dataFim;
        }
      }
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      include: {
        estoqueItem: true, // Need to include for toDomain mapping
      },
      orderBy: { dataMovimentacao: 'desc' },
    });

    return movimentacoes.map(this.toDomain);
  }

  async findByNotaMovimentacao(notaMovimentacaoId: string): Promise<MovimentacaoEstoque[]> {
    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where: { notaMovimentacaoId },
      include: {
        estoqueItem: true, // Need to include for toDomain mapping
      },
      orderBy: { dataMovimentacao: 'asc' },
    });

    return movimentacoes.map(this.toDomain);
  }

  async findByFilters(filtros: MovimentacaoEstoqueFilters): Promise<MovimentacaoEstoque[]> {
    const where: any = {};

    if (filtros.almoxarifadoId) {
      where.estoqueItem = { almoxarifadoId: filtros.almoxarifadoId };
    }
    if (filtros.tipoEpiId) {
      where.estoqueItem = { ...where.estoqueItem, tipoEpiId: filtros.tipoEpiId };
    }
    if (filtros.tipoMovimentacao) {
      where.tipoMovimentacao = filtros.tipoMovimentacao;
    }
    if (filtros.usuarioId) {
      where.responsavelId = filtros.usuarioId;
    }
    if (filtros.notaMovimentacaoId) {
      where.notaMovimentacaoId = filtros.notaMovimentacaoId;
    }
    if (filtros.dataInicio || filtros.dataFim) {
      where.dataMovimentacao = {};
      if (filtros.dataInicio) {
        where.dataMovimentacao.gte = filtros.dataInicio;
      }
      if (filtros.dataFim) {
        where.dataMovimentacao.lte = filtros.dataFim;
      }
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      orderBy: { dataMovimentacao: 'desc' },
      include: {
        estoqueItem: {
          include: {
            almoxarifado: {
              select: { nome: true },
            },
            tipoEpi: {
              select: { nomeEquipamento: true, numeroCa: true },
            },
          },
        },
        responsavel: {
          select: { nome: true, email: true },
        },
        notaMovimentacao: {
          select: { numeroDocumento: true, tipoNota: true },
        },
      },
    });

    return movimentacoes.map(this.toDomain);
  }

  async obterUltimaSaldo(almoxarifadoId: string, tipoEpiId: string): Promise<number> {
    // First find the estoqueItem that matches almoxarifado and tipo
    const estoqueItem = await this.prisma.estoqueItem.findFirst({
      where: { almoxarifadoId, tipoEpiId }
    });
    
    if (!estoqueItem) {
      return 0;
    }
    
    const ultimaMovimentacao = await this.prisma.movimentacaoEstoque.findFirst({
      where: {
        estoqueItemId: estoqueItem.id,
      },
      orderBy: { dataMovimentacao: 'desc' },
      select: { quantidadeMovida: true },
    });

    // saldoPosterior field removed - return quantidadeMovida as fallback
    return ultimaMovimentacao?.quantidadeMovida || 0;
  }

  async obterKardex(
    almoxarifadoId: string,
    tipoEpiId: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<KardexItem[]> {
    // First find the estoqueItem that matches almoxarifado and tipo
    const estoqueItem = await this.prisma.estoqueItem.findFirst({
      where: { almoxarifadoId, tipoEpiId }
    });
    
    if (!estoqueItem) {
      return [];
    }
    
    const where: any = {
      estoqueItemId: estoqueItem.id,
    };

    if (dataInicio || dataFim) {
      where.dataMovimentacao = {};
      if (dataInicio) {
        where.dataMovimentacao.gte = dataInicio;
      }
      if (dataFim) {
        where.dataMovimentacao.lte = dataFim;
      }
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      include: {
        notaMovimentacao: {
          select: { numeroDocumento: true },
        },
      },
      orderBy: { dataMovimentacao: 'asc' },
    });

    return movimentacoes.map((mov) => ({
      data: mov.dataMovimentacao,
      documento: mov.notaMovimentacao?.numeroDocumento || `MOV-${mov.id.substring(0, 8)}`,
      tipoMovimentacao: mov.tipoMovimentacao as TipoMovimentacao,
      quantidade: mov.quantidadeMovida,
      saldoAnterior: 0, // Field removed from schema - use 0 as default
      saldoPosterior: 0, // Field removed from schema - use 0 as default  
      observacoes: undefined, // Field removed from schema
    }));
  }

  async createMovimentacao(
    almoxarifadoId: string,
    tipoEpiId: string,
    tipoMovimentacao: TipoMovimentacao,
    quantidade: number,
    usuarioId: string,
    notaMovimentacaoId?: string,
    _observacoes?: string,
  ): Promise<MovimentacaoEstoque> {
    // Obter saldo anterior
    await this.obterUltimaSaldo(almoxarifadoId, tipoEpiId);

    // Criar a movimentação usando o método estático da entidade
    // First find or create the estoqueItem
    const estoqueItem = await this.prisma.estoqueItem.findFirst({
      where: { almoxarifadoId, tipoEpiId }
    });
    
    if (!estoqueItem) {
      throw new BusinessError('Estoque item não encontrado');
    }

    const movimentacaoData = MovimentacaoEstoque.createEntradaNota(
      estoqueItem.id,
      quantidade,
      usuarioId,
      notaMovimentacaoId,
    );

    return this.create(movimentacaoData);
  }

  async criarEstorno(
    movimentacaoOriginalId: string,
    usuarioId: string,
    _observacoes?: string,
  ): Promise<MovimentacaoEstoque> {
    // Get the original movement with estoqueItem data
    const movimentacaoOriginalData = await this.prisma.movimentacaoEstoque.findUnique({
      where: { id: movimentacaoOriginalId },
      include: {
        estoqueItem: {
          select: {
            almoxarifadoId: true,
            tipoEpiId: true,
          },
        },
      },
    });
    
    if (!movimentacaoOriginalData) {
      throw new NotFoundError('Movimentação', movimentacaoOriginalId);
    }
    
    const movimentacaoOriginal = this.toDomain(movimentacaoOriginalData);

    if (!movimentacaoOriginal.isEstornavel()) {
      throw new BusinessError('Movimentação não pode ser estornada');
    }

    // Get the estorno type for this movement
    const tipoEstorno = movimentacaoOriginal.getTipoEstorno();
    if (!tipoEstorno) {
      throw new BusinessError('Tipo de movimentação não pode ser estornado');
    }

    // Create estorno using the entity static method
    const estornoData = MovimentacaoEstoque.createEstorno(
      movimentacaoOriginal.estoqueItemId,
      movimentacaoOriginal.quantidadeMovida,
      usuarioId,
      tipoEstorno,
      movimentacaoOriginalId,
    );

    const estorno = await this.prisma.movimentacaoEstoque.create({
      data: {
        estoqueItemId: estornoData.estoqueItemId,
        tipoMovimentacao: estornoData.tipoMovimentacao as any,
        quantidadeMovida: estornoData.quantidadeMovida,
        responsavelId: usuarioId,
        notaMovimentacaoId: estornoData.notaMovimentacaoId,
        entregaId: estornoData.entregaId,
        movimentacaoOrigemId: estornoData.movimentacaoOrigemId,
      },
    });

    return this.toDomain(estorno);
  }

  async findEstornaveis(almoxarifadoId?: string): Promise<MovimentacaoEstoque[]> {
    const where: any = {
      tipoMovimentacao: { not: { startsWith: 'ESTORNO_' } },
      movimentacaoOrigemId: null, // Only original movements can be reversed
    };

    if (almoxarifadoId) {
      where.estoqueItem = {
        almoxarifadoId: almoxarifadoId
      };
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where,
      include: {
        estoqueItem: true, // Need to include for almoxarifado filter
      },
      orderBy: { dataMovimentacao: 'desc' },
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
      dataMovimentacao: {
        gte: dataInicio,
        lte: dataFim,
      },
    };

    if (almoxarifadoId) {
      where.estoqueItem = { almoxarifadoId: almoxarifadoId };
    }

    const resumo = await this.prisma.movimentacaoEstoque.groupBy({
      by: ['tipoMovimentacao'],
      where,
      _sum: { quantidadeMovida: true },
      _count: { id: true },
    });

    return resumo.map((item) => ({
      tipoMovimentacao: item.tipoMovimentacao as TipoMovimentacao,
      quantidade: item._sum.quantidadeMovida || 0,
      valor: item._count.id || 0,
    }));
  }

  private toDomain(movimentacao: any): MovimentacaoEstoque {
    return new MovimentacaoEstoque(
      movimentacao.id,
      movimentacao.estoqueItemId,
      movimentacao.tipoMovimentacao as TipoMovimentacao,
      movimentacao.quantidadeMovida,
      movimentacao.notaMovimentacaoId,
      movimentacao.responsavelId,
      movimentacao.entregaId,
      movimentacao.movimentacaoOrigemId,
      movimentacao.dataMovimentacao,
    );
  }
}