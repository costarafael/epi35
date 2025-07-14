import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Contratada } from '../../domain/entities/contratada.entity';
import { IContratadaRepository, ContratadaFilters } from '../../domain/interfaces/repositories/contratada-repository.interface';
import { BusinessError } from '../../domain/exceptions/business.exception';

@Injectable()
export class ContratadaRepository implements IContratadaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Contratada | null> {
    const contratada = await this.prisma.contratada.findUnique({
      where: { id },
    });

    return contratada ? this.toDomain(contratada) : null;
  }

  async findAll(): Promise<Contratada[]> {
    const contratadas = await this.prisma.contratada.findMany({
      orderBy: { nome: 'asc' },
    });

    return contratadas.map(this.toDomain);
  }

  async create(entity: Omit<Contratada, 'id' | 'createdAt'>): Promise<Contratada> {
    // Verificar se CNPJ já existe
    const cnpjExists = await this.existsByCNPJ(entity.cnpj);
    if (cnpjExists) {
      throw new BusinessError('CNPJ já cadastrado');
    }

    const contratada = await this.prisma.contratada.create({
      data: {
        nome: entity.nome,
        cnpj: entity.cnpj,
      },
    });

    return this.toDomain(contratada);
  }

  async update(id: string, entity: Partial<Contratada>): Promise<Contratada> {
    // Verificar se entidade existe
    const existing = await this.findById(id);
    if (!existing) {
      throw new BusinessError('Contratada não encontrada');
    }

    // Se está alterando CNPJ, verificar se não existe
    if (entity.cnpj && entity.cnpj !== existing.cnpj) {
      const cnpjExists = await this.existsByCNPJ(entity.cnpj, id);
      if (cnpjExists) {
        throw new BusinessError('CNPJ já cadastrado');
      }
    }

    const contratada = await this.prisma.contratada.update({
      where: { id },
      data: {
        ...(entity.nome && { nome: entity.nome }),
        ...(entity.cnpj && { cnpj: entity.cnpj }),
      },
    });

    return this.toDomain(contratada);
  }

  async delete(id: string): Promise<void> {
    // Verificar se há colaboradores vinculados
    const colaboradoresVinculados = await this.prisma.colaborador.count({
      where: { contratadaId: id },
    });

    if (colaboradoresVinculados > 0) {
      throw new BusinessError(
        `Não é possível excluir a contratada. Existem ${colaboradoresVinculados} colaboradores vinculados.`
      );
    }

    await this.prisma.contratada.delete({
      where: { id },
    });
  }

  async findByCNPJ(cnpj: string): Promise<Contratada | null> {
    const contratada = await this.prisma.contratada.findUnique({
      where: { cnpj: cnpj.replace(/\D/g, '') }, // Remove caracteres não numéricos
    });

    return contratada ? this.toDomain(contratada) : null;
  }

  async findByFilters(filtros: ContratadaFilters): Promise<Contratada[]> {
    const where: any = {};

    if (filtros.nome) {
      where.nome = {
        contains: filtros.nome,
        mode: 'insensitive',
      };
    }

    if (filtros.cnpj && filtros.cnpj.trim() !== '') {
      where.cnpj = {
        contains: filtros.cnpj.replace(/\D/g, ''),
      };
    }

    const contratadas = await this.prisma.contratada.findMany({
      where,
      orderBy: { nome: 'asc' },
    });

    return contratadas.map(this.toDomain);
  }

  async searchByNome(nome: string): Promise<Contratada[]> {
    const contratadas = await this.prisma.contratada.findMany({
      where: {
        nome: {
          contains: nome,
          mode: 'insensitive',
        },
      },
      orderBy: { nome: 'asc' },
      take: 10, // Limitar resultados para busca
    });

    return contratadas.map(this.toDomain);
  }

  async existsByCNPJ(cnpj: string, excludeId?: string): Promise<boolean> {
    const where: any = {
      cnpj: cnpj.replace(/\D/g, ''),
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.contratada.count({ where });
    return count > 0;
  }

  async obterEstatisticas(): Promise<{
    total: number;
    colaboradoresVinculados: number;
    colaboradoresSemContratada: number;
    topContratadas: Array<{
      contratada: {
        id: string;
        nome: string;
        cnpj: string;
      };
      totalColaboradores: number;
      totalEpisAtivos: number;
    }>;
  }> {
    const [
      totalContratadas,
      totalColaboradores,
      colaboradoresSemContratada,
      topContratadas,
    ] = await Promise.all([
      this.prisma.contratada.count(),
      this.prisma.colaborador.count({
        where: { contratadaId: { not: null } },
      }),
      this.prisma.colaborador.count({
        where: { contratadaId: null },
      }),
      this.prisma.contratada.findMany({
        select: {
          id: true,
          nome: true,
          cnpj: true,
          _count: {
            select: {
              colaboradores: true,
            },
          },
        },
        orderBy: {
          colaboradores: {
            _count: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Contar EPIs ativos por contratada
    const episAtivosPorContratada = await Promise.all(
      topContratadas.map(async (contratada) => {
        const totalEpisAtivos = await this.prisma.entregaItem.count({
          where: {
            status: 'COM_COLABORADOR',
            entrega: {
              fichaEpi: {
                colaborador: {
                  contratadaId: contratada.id,
                },
              },
            },
          },
        });
        return { contratadaId: contratada.id, totalEpisAtivos };
      })
    );

    const episAtivosMap = new Map(
      episAtivosPorContratada.map(item => [item.contratadaId, item.totalEpisAtivos])
    );

    return {
      total: totalContratadas,
      colaboradoresVinculados: totalColaboradores,
      colaboradoresSemContratada,
      topContratadas: topContratadas.map(item => ({
        contratada: {
          id: item.id,
          nome: item.nome,
          cnpj: item.cnpj,
        },
        totalColaboradores: item._count.colaboradores,
        totalEpisAtivos: episAtivosMap.get(item.id) || 0,
      })),
    };
  }

  private toDomain(contratada: any): Contratada {
    return new Contratada(
      contratada.id,
      contratada.nome,
      contratada.cnpj,
      contratada.createdAt,
    );
  }
}