import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BusinessError } from '../../../domain/exceptions/business.exception';

export interface EstoqueItemOutput {
  id: string;
  almoxarifadoId: string;
  tipoEpiId: string;
  quantidade: number;
  status: string;
  createdAt: Date;
  almoxarifado: {
    id: string;
    nome: string;
    unidadeNegocioId: string;
    unidadeNegocio: {
      id: string;
      nome: string;
      codigo: string;
    };
  };
  tipoEpi: {
    id: string;
    nomeEquipamento: string;
    numeroCa: string;
    descricao?: string;
    categoriaEpi?: string;
  };
}

export interface ListarEstoqueItensInput {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  apenasDisponiveis?: boolean;
  apenasComSaldo?: boolean;
  page?: number;
  limit?: number;
}

export interface ListarEstoqueItensOutput {
  items: EstoqueItemOutput[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class ListarEstoqueItensUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ListarEstoqueItensInput = {}): Promise<ListarEstoqueItensOutput> {
    try {
      const page = input.page || 1;
      const limit = Math.min(input.limit || 50, 100); // Máximo 100 itens por página
      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {};

      if (input.almoxarifadoId) {
        where.almoxarifadoId = input.almoxarifadoId;
      }

      if (input.tipoEpiId) {
        where.tipoEpiId = input.tipoEpiId;
      }

      if (input.apenasDisponiveis) {
        where.status = 'DISPONIVEL';
      }

      if (input.apenasComSaldo) {
        where.quantidade = { gt: 0 };
      }

      // Buscar itens e contagem total
      const [items, total] = await Promise.all([
        this.prisma.estoqueItem.findMany({
          where,
          skip,
          take: limit,
          include: {
            almoxarifado: {
              include: {
                unidadeNegocio: true,
              },
            },
            tipoEpi: true,
          },
          orderBy: [
            { almoxarifado: { nome: 'asc' } },
            { tipoEpi: { nomeEquipamento: 'asc' } },
          ],
        }),
        this.prisma.estoqueItem.count({ where }),
      ]);

      // Mapear para output
      const mappedItems: EstoqueItemOutput[] = items.map((item) => ({
        id: item.id,
        almoxarifadoId: item.almoxarifadoId,
        tipoEpiId: item.tipoEpiId,
        quantidade: item.quantidade,
        status: item.status,
        createdAt: item.createdAt,
        almoxarifado: {
          id: item.almoxarifado.id,
          nome: item.almoxarifado.nome,
          unidadeNegocioId: item.almoxarifado.unidadeNegocioId,
          unidadeNegocio: {
            id: item.almoxarifado.unidadeNegocio.id,
            nome: item.almoxarifado.unidadeNegocio.nome,
            codigo: item.almoxarifado.unidadeNegocio.codigo,
          },
        },
        tipoEpi: {
          id: item.tipoEpi.id,
          nomeEquipamento: item.tipoEpi.nomeEquipamento,
          numeroCa: item.tipoEpi.numeroCa,
          descricao: item.tipoEpi.descricao,
          categoriaEpi: item.tipoEpi.categoria,
        },
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
      console.error('Erro ao listar itens de estoque:', error);
      throw new BusinessError('Erro interno ao listar itens de estoque');
    }
  }
}