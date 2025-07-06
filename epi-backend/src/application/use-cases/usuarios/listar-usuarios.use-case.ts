import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BusinessError } from '../../../domain/exceptions/business.exception';

export interface UsuarioOutput {
  id: string;
  nome: string;
  email: string;
  createdAt: Date;
}

export interface ListarUsuariosInput {
  nome?: string;
  email?: string;
  page?: number;
  limit?: number;
}

export interface ListarUsuariosOutput {
  items: UsuarioOutput[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class ListarUsuariosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ListarUsuariosInput = {}): Promise<ListarUsuariosOutput> {
    try {
      const page = input.page || 1;
      const limit = Math.min(input.limit || 50, 100); // Máximo 100 usuários por página
      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {};

      if (input.nome) {
        where.nome = {
          contains: input.nome,
          mode: 'insensitive',
        };
      }

      if (input.email) {
        where.email = {
          contains: input.email,
          mode: 'insensitive',
        };
      }

      // Buscar usuários e contagem total
      const [items, total] = await Promise.all([
        this.prisma.usuario.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { nome: 'asc' },
          ],
        }),
        this.prisma.usuario.count({ where }),
      ]);

      // Mapear para output
      const mappedItems: UsuarioOutput[] = items.map((usuario) => ({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        createdAt: usuario.createdAt,
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        items: mappedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw new BusinessError('Erro interno ao listar usuários');
    }
  }

  async obterPorId(id: string): Promise<UsuarioOutput | null> {
    try {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id },
      });

      if (!usuario) {
        return null;
      }

      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        createdAt: usuario.createdAt,
      };
    } catch (error) {
      console.error('Erro ao obter usuário:', error);
      throw new BusinessError('Erro interno ao obter usuário');
    }
  }
}