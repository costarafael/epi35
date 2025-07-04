import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EstoqueItem } from '../../domain/entities/estoque-item.entity';
import { IEstoqueRepository } from '../../domain/interfaces/repositories/estoque-repository.interface';
import { StatusEstoqueItem } from '../../domain/enums';
import { BusinessError } from '../../domain/exceptions/business.exception';
import { 
  PaginationOptions, 
  PaginatedResult, 
  createPaginatedResult, 
  DEFAULT_PAGINATION, 
  MAX_LIMIT 
} from '../../domain/interfaces/common/pagination.interface';

@Injectable()
export class EstoqueRepository implements IEstoqueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<EstoqueItem | null> {
    const estoque = await this.prisma.estoqueItem.findUnique({
      where: { id },
    });

    return estoque ? this.toDomain(estoque) : null;
  }

  /**
   * @deprecated Use findAllPaginated instead to prevent memory issues
   */
  async findAll(): Promise<EstoqueItem[]> {
    // Log warning for deprecated usage
    console.warn('⚠️  EstoqueRepository.findAll() is deprecated. Use findAllPaginated() instead to prevent memory issues.');
    
    // Return limited results to prevent crashes
    const estoques = await this.prisma.estoqueItem.findMany({
      orderBy: [{ almoxarifadoId: 'asc' }, { tipoEpiId: 'asc' }],
      take: 100, // Safety limit
    });

    return estoques.map(this.toDomain);
  }

  async findAllPaginated(options: PaginationOptions = {}): Promise<PaginatedResult<EstoqueItem>> {
    const page = options.page ?? DEFAULT_PAGINATION.page;
    const limit = Math.min(options.limit ?? DEFAULT_PAGINATION.limit, MAX_LIMIT);
    
    const [items, total] = await Promise.all([
      this.prisma.estoqueItem.findMany({
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [{ almoxarifadoId: 'asc' }, { tipoEpiId: 'asc' }],
      }),
      this.prisma.estoqueItem.count(),
    ]);

    return createPaginatedResult(
      items.map(this.toDomain),
      total,
      page,
      limit,
    );
  }

  async create(entity: Omit<EstoqueItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<EstoqueItem> {
    const estoque = await this.prisma.estoqueItem.create({
      data: {
        almoxarifadoId: entity.almoxarifadoId,
        tipoEpiId: entity.tipoEpiId,
        quantidade: entity.quantidade,
        status: entity.status as any,
      },
    });

    return this.toDomain(estoque);
  }

  async update(id: string, entity: Partial<EstoqueItem>): Promise<EstoqueItem> {
    const estoque = await this.prisma.estoqueItem.update({
      where: { id },
      data: {
        quantidade: entity.quantidade,
        status: entity.status as any,
      },
    });

    return this.toDomain(estoque);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.estoqueItem.delete({
      where: { id },
    });
  }

  async findByAlmoxarifadoAndTipo(
    almoxarifadoId: string,
    tipoEpiId: string,
    status?: StatusEstoqueItem,
  ): Promise<EstoqueItem | null> {
    const estoque = await this.prisma.estoqueItem.findUnique({
      where: {
        almoxarifadoId_tipoEpiId_status: {
          almoxarifadoId,
          tipoEpiId,
          status: status as any || StatusEstoqueItem.DISPONIVEL as any,
        },
      },
    });

    return estoque ? this.toDomain(estoque) : null;
  }

  async findByAlmoxarifado(almoxarifadoId: string): Promise<EstoqueItem[]> {
    const estoques = await this.prisma.estoqueItem.findMany({
      where: { almoxarifadoId },
      orderBy: { tipoEpiId: 'asc' },
    });

    return estoques.map(this.toDomain);
  }

  async findByTipoEpi(tipoEpiId: string): Promise<EstoqueItem[]> {
    const estoques = await this.prisma.estoqueItem.findMany({
      where: { tipoEpiId },
      orderBy: { almoxarifadoId: 'asc' },
    });

    return estoques.map(this.toDomain);
  }

  async findDisponiveis(almoxarifadoId?: string): Promise<EstoqueItem[]> {
    const where: any = {
      status: StatusEstoqueItem.DISPONIVEL as any,
      quantidade: { gt: 0 },
    };

    if (almoxarifadoId) {
      where.almoxarifadoId = almoxarifadoId;
    }

    const estoques = await this.prisma.estoqueItem.findMany({
      where,
      orderBy: [{ almoxarifadoId: 'asc' }, { tipoEpiId: 'asc' }],
    });

    return estoques.map(this.toDomain);
  }

  async atualizarQuantidade(
    almoxarifadoId: string,
    tipoEpiId: string,
    status: StatusEstoqueItem,
    novaQuantidade: number,
  ): Promise<EstoqueItem> {
    if (novaQuantidade < 0) {
      throw new BusinessError('Quantidade não pode ser negativa');
    }

    const estoque = await this.prisma.estoqueItem.update({
      where: {
        almoxarifadoId_tipoEpiId_status: {
          almoxarifadoId,
          tipoEpiId,
          status: status as any,
        },
      },
      data: { quantidade: novaQuantidade },
    });

    return this.toDomain(estoque);
  }

  async adicionarQuantidade(
    almoxarifadoId: string,
    tipoEpiId: string,
    status: StatusEstoqueItem,
    quantidade: number,
  ): Promise<EstoqueItem> {
    if (quantidade <= 0) {
      throw new BusinessError('Quantidade a adicionar deve ser positiva');
    }

    const estoque = await this.prisma.estoqueItem.update({
      where: {
        almoxarifadoId_tipoEpiId_status: {
          almoxarifadoId,
          tipoEpiId,
          status: status as any,
        },
      },
      data: { quantidade: { increment: quantidade } },
    });

    return this.toDomain(estoque);
  }

  async removerQuantidade(
    almoxarifadoId: string,
    tipoEpiId: string,
    status: StatusEstoqueItem,
    quantidade: number,
  ): Promise<EstoqueItem> {
    if (quantidade <= 0) {
      throw new BusinessError('Quantidade a remover deve ser positiva');
    }

    // Verificar se há quantidade suficiente
    const estoqueAtual = await this.findByAlmoxarifadoAndTipo(almoxarifadoId, tipoEpiId, status);
    if (!estoqueAtual || estoqueAtual.quantidade < quantidade) {
      throw new BusinessError('Quantidade insuficiente em estoque');
    }

    const estoque = await this.prisma.estoqueItem.update({
      where: {
        almoxarifadoId_tipoEpiId_status: {
          almoxarifadoId,
          tipoEpiId,
          status: status as any,
        },
      },
      data: { quantidade: { decrement: quantidade } },
    });

    return this.toDomain(estoque);
  }

  async verificarDisponibilidade(
    almoxarifadoId: string,
    tipoEpiId: string,
    quantidadeRequerida: number,
  ): Promise<boolean> {
    const estoque = await this.findByAlmoxarifadoAndTipo(
      almoxarifadoId,
      tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
    );

    return estoque ? estoque.quantidade >= quantidadeRequerida : false;
  }

  async obterSaldoTotal(tipoEpiId: string): Promise<number> {
    const result = await this.prisma.estoqueItem.aggregate({
      where: {
        tipoEpiId,
        status: StatusEstoqueItem.DISPONIVEL as any,
      },
      _sum: { quantidade: true },
    });

    return result._sum.quantidade || 0;
  }

  async obterSaldoPorAlmoxarifado(almoxarifadoId: string): Promise<EstoqueItem[]> {
    const estoques = await this.prisma.estoqueItem.findMany({
      where: {
        almoxarifadoId,
        status: StatusEstoqueItem.DISPONIVEL as any,
        quantidade: { gt: 0 },
      },
      include: {
        tipoEpi: {
          select: {
            nomeEquipamento: true,
            numeroCa: true,
          },
        },
      },
      orderBy: { tipoEpiId: 'asc' },
    });

    return estoques.map(this.toDomain);
  }

  async criarOuAtualizar(
    almoxarifadoId: string,
    tipoEpiId: string,
    status: StatusEstoqueItem,
    quantidade: number,
  ): Promise<EstoqueItem> {
    const estoque = await this.prisma.estoqueItem.upsert({
      where: {
        almoxarifadoId_tipoEpiId_status: {
          almoxarifadoId,
          tipoEpiId,
          status: status as any,
        },
      },
      update: { quantidade },
      create: {
        almoxarifadoId,
        tipoEpiId,
        status: status as any,
        quantidade,
      },
    });

    return this.toDomain(estoque);
  }

  private toDomain(estoque: any): EstoqueItem {
    return new EstoqueItem(
      estoque.id,
      estoque.almoxarifadoId,
      estoque.tipoEpiId,
      estoque.quantidade,
      estoque.status as StatusEstoqueItem,
      estoque.createdAt,
      estoque.updatedAt,
    );
  }
}