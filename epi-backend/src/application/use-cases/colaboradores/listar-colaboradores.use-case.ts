import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ColaboradorOutput } from './criar-colaborador.use-case';

export interface ListarColaboradoresInput {
  nome?: string;
  cpf?: string;
  contratadaId?: string;
  cargo?: string;
  setor?: string;
  ativo?: boolean;
}

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface ListarColaboradoresOutput {
  items: ColaboradorOutput[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class ListarColaboradoresUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    filtros: ListarColaboradoresInput,
    pagination: PaginationInput,
  ): Promise<ListarColaboradoresOutput> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (filtros.nome) {
      where.nome = { contains: filtros.nome, mode: 'insensitive' };
    }

    if (filtros.cpf) {
      where.cpf = { contains: filtros.cpf.replace(/\D/g, '') };
    }

    if (filtros.contratadaId) {
      where.contratadaId = filtros.contratadaId;
    }

    if (filtros.cargo) {
      where.cargo = { contains: filtros.cargo, mode: 'insensitive' };
    }

    if (filtros.setor) {
      where.setor = { contains: filtros.setor, mode: 'insensitive' };
    }

    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }

    // Buscar colaboradores e total
    const [colaboradores, total] = await Promise.all([
      this.prisma.colaborador.findMany({
        where,
        include: {
          contratada: {
            select: {
              id: true,
              nome: true,
              cnpj: true,
            },
          },
        },
        orderBy: { nome: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.colaborador.count({ where }),
    ]);

    const items = colaboradores.map(colaborador => ({
      ...colaborador,
      cpfFormatado: this.formatCPF(colaborador.cpf),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async obterPorId(id: string): Promise<ColaboradorOutput | null> {
    const colaborador = await this.prisma.colaborador.findUnique({
      where: { id },
      include: {
        contratada: {
          select: {
            id: true,
            nome: true,
            cnpj: true,
          },
        },
      },
    });

    if (!colaborador) {
      return null;
    }

    return {
      ...colaborador,
      cpfFormatado: this.formatCPF(colaborador.cpf),
    };
  }

  private formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}