import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BusinessError } from '../../../domain/exceptions/business.exception';

export interface AlmoxarifadoOutput {
  id: string;
  nome: string;
  isPrincipal: boolean;
  unidadeNegocioId: string;
  createdAt: Date;
  unidadeNegocio: {
    id: string;
    nome: string;
    codigo: string;
  };
  _count?: {
    estoqueItens: number;
  };
}

export interface ListarAlmoxarifadosInput {
  unidadeNegocioId?: string;
  incluirContadores?: boolean;
}

@Injectable()
export class ListarAlmoxarifadosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ListarAlmoxarifadosInput = {}): Promise<AlmoxarifadoOutput[]> {
    try {
      // Construir filtros
      const where: any = {};
      
      if (input.unidadeNegocioId) {
        where.unidadeNegocioId = input.unidadeNegocioId;
      }

      // Buscar almoxarifados
      const almoxarifados = await this.prisma.almoxarifado.findMany({
        where,
        include: {
          unidadeNegocio: true,
          ...(input.incluirContadores && {
            _count: {
              select: {
                estoqueItens: true,
              },
            },
          }),
        },
        orderBy: [
          { isPrincipal: 'desc' }, // Principais primeiro
          { nome: 'asc' },
        ],
      });

      // Mapear para output
      return almoxarifados.map((almoxarifado) => ({
        id: almoxarifado.id,
        nome: almoxarifado.nome,
        isPrincipal: almoxarifado.isPrincipal,
        unidadeNegocioId: almoxarifado.unidadeNegocioId,
        createdAt: almoxarifado.createdAt,
        unidadeNegocio: {
          id: almoxarifado.unidadeNegocio.id,
          nome: almoxarifado.unidadeNegocio.nome,
          codigo: almoxarifado.unidadeNegocio.codigo,
        },
        ...(input.incluirContadores && {
          _count: (almoxarifado as any)._count,
        }),
      }));
    } catch (error) {
      console.error('Erro ao listar almoxarifados:', error);
      throw new BusinessError('Erro interno ao listar almoxarifados');
    }
  }

  async obterPorId(id: string): Promise<AlmoxarifadoOutput | null> {
    try {
      const almoxarifado = await this.prisma.almoxarifado.findUnique({
        where: { id },
        include: {
          unidadeNegocio: true,
          _count: {
            select: {
              estoqueItens: true,
            },
          },
        },
      });

      if (!almoxarifado) {
        return null;
      }

      return {
        id: almoxarifado.id,
        nome: almoxarifado.nome,
        isPrincipal: almoxarifado.isPrincipal,
        unidadeNegocioId: almoxarifado.unidadeNegocioId,
        createdAt: almoxarifado.createdAt,
        unidadeNegocio: {
          id: almoxarifado.unidadeNegocio.id,
          nome: almoxarifado.unidadeNegocio.nome,
          codigo: almoxarifado.unidadeNegocio.codigo,
        },
        _count: (almoxarifado as any)._count,
      };
    } catch (error) {
      console.error('Erro ao obter almoxarifado:', error);
      throw new BusinessError('Erro interno ao obter almoxarifado');
    }
  }
}