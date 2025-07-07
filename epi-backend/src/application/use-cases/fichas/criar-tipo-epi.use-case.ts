import { Injectable } from '@nestjs/common';
import { TipoEPI } from '../../../domain/entities/tipo-epi.entity';
import { BusinessError, ConflictError } from '../../../domain/exceptions/business.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CategoriaEPI } from '../../../domain/enums/categoria-epi.enum';
import { randomBytes } from 'crypto';

export interface CriarTipoEpiInput {
  nomeEquipamento: string;
  numeroCa: string;
  categoria: CategoriaEPI;
  descricao?: string;
  vidaUtilDias?: number;
  status?: 'ATIVO' | 'DESCONTINUADO';
}

export interface TipoEpiOutput {
  id: string;
  nomeEquipamento: string;
  numeroCa: string;
  categoria: CategoriaEPI;
  descricao?: string;
  vidaUtilDias?: number;
  status: 'ATIVO' | 'DESCONTINUADO';
  createdAt: Date;
}

@Injectable()
export class CriarTipoEpiUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CriarTipoEpiInput): Promise<TipoEpiOutput> {
    // Validar dados de entrada
    this.validarInput(input);

    // Verificar se já existe tipo com o mesmo CA
    await this.verificarCAUnico(input.numeroCa);

    // Criar entidade de domínio
    const tipoEpiData = TipoEPI.create(
      input.nomeEquipamento,
      input.numeroCa,
      input.categoria,
      input.descricao,
      input.vidaUtilDias,
      input.status
    );

    // Salvar no banco de dados
    const tipoEpi = await this.prisma.tipoEPI.create({
      data: {
        id: randomBytes(3).toString('hex').toUpperCase(),
        nomeEquipamento: tipoEpiData.nomeEquipamento,
        numeroCa: tipoEpiData.numeroCa,
        categoria: tipoEpiData.categoria,
        descricao: tipoEpiData.descricao,
        vidaUtilDias: tipoEpiData.vidaUtilDias,
        status: tipoEpiData.status,
      },
    });

    return this.mapToOutput(tipoEpi);
  }

  async obterTipoEpi(id: string): Promise<TipoEpiOutput | null> {
    const tipoEpi = await this.prisma.tipoEPI.findUnique({
      where: { id },
    });

    return tipoEpi ? this.mapToOutput(tipoEpi) : null;
  }

  async listarTiposEpi(
    ativo?: boolean,
    busca?: string,
    categoria?: CategoriaEPI,
  ): Promise<TipoEpiOutput[]> {
    const where: any = {};

    if (ativo !== undefined) {
      where.status = ativo ? 'ATIVO' : 'DESCONTINUADO';
    }

    if (categoria) {
      where.categoria = categoria;
    }

    if (busca) {
      where.OR = [
        { nomeEquipamento: { contains: busca, mode: 'insensitive' } },
        { numeroCa: { contains: busca, mode: 'insensitive' } },
      ];
    }

    const tiposEpi = await this.prisma.tipoEPI.findMany({
      where,
      orderBy: [{ status: 'asc' }, { nomeEquipamento: 'asc' }],
    });

    return tiposEpi.map(this.mapToOutput);
  }

  async atualizarTipoEpi(
    id: string,
    input: Partial<CriarTipoEpiInput>,
  ): Promise<TipoEpiOutput> {
    // Verificar se existe
    const tipoEpiExistente = await this.prisma.tipoEPI.findUnique({
      where: { id },
    });

    if (!tipoEpiExistente) {
      throw new BusinessError('Tipo de EPI não encontrado');
    }

    // Verificar CA único se foi alterado
    if (input.numeroCa && input.numeroCa !== tipoEpiExistente.numeroCa) {
      await this.verificarCAUnico(input.numeroCa, id);
    }

    // Preparar dados para atualização
    const updateData: any = {};

    if (input.nomeEquipamento !== undefined) {
      if (!input.nomeEquipamento.trim()) {
        throw new BusinessError('Nome do equipamento é obrigatório');
      }
      updateData.nomeEquipamento = input.nomeEquipamento.trim();
    }

    if (input.descricao !== undefined) {
      updateData.descricao = input.descricao?.trim() || null;
    }

    if (input.numeroCa !== undefined) {
      updateData.numeroCa = input.numeroCa?.trim() || null;
    }

    if (input.vidaUtilDias !== undefined) {
      if (input.vidaUtilDias !== null && input.vidaUtilDias <= 0) {
        throw new BusinessError('Vida útil em dias deve ser positiva');
      }
      updateData.vidaUtilDias = input.vidaUtilDias;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Atualizar no banco
    const tipoEpiAtualizado = await this.prisma.tipoEPI.update({
      where: { id },
      data: updateData,
    });

    return this.mapToOutput(tipoEpiAtualizado);
  }

  async ativarTipoEpi(id: string): Promise<TipoEpiOutput> {
    const tipoEpi = await this.prisma.tipoEPI.update({
      where: { id },
      data: { status: 'ATIVO' },
    });

    return this.mapToOutput(tipoEpi);
  }

  async inativarTipoEpi(id: string): Promise<TipoEpiOutput> {
    // Verificar se há estoque para este tipo
    const estoque = await this.prisma.estoqueItem.count({
      where: {
        tipoEpiId: id,
        quantidade: { gt: 0 },
      },
    });

    if (estoque > 0) {
      throw new BusinessError(
        'Não é possível inativar: existe estoque para este tipo de EPI',
      );
    }

    const tipoEpi = await this.prisma.tipoEPI.update({
      where: { id },
      data: { status: 'DESCONTINUADO' },
    });

    return this.mapToOutput(tipoEpi);
  }

  async obterEstatisticas(tipoEpiId?: string): Promise<{
    totalFichas: number;
    fichasAtivas: number;
    totalEstoque: number;
    estoqueDisponivel: number;
    totalEntregas: number;
    entregasAtivas: number;
  }> {
    const where: any = {};
    if (tipoEpiId) {
      where.tipoEpiId = tipoEpiId;
    }

    const [estoque, entregas] = await Promise.all([
      this.prisma.estoqueItem.aggregate({
        where: {
          ...where,
          quantidade: { gt: 0 },
        },
        _sum: { quantidade: true },
        _count: { id: true },
      }),
      this.prisma.entrega.groupBy({
        by: ['status'],
        where: {
          itens: {
            some: {
              estoqueItem: { tipoEpiId: tipoEpiId }
            }
          }
        },
        _count: { id: true },
      }),
    ]);

    return {
      totalFichas: 0, // Removed - fichas no longer relate to tipo EPI directly
      fichasAtivas: 0, // Removed - fichas no longer relate to tipo EPI directly
      totalEstoque: estoque._count.id || 0,
      estoqueDisponivel: estoque._sum.quantidade || 0,
      totalEntregas: entregas.reduce((sum, e) => sum + e._count.id, 0),
      entregasAtivas: entregas.find(e => e.status === 'ASSINADA')?._count.id || 0,
    };
  }

  async obterEstatisticasPorCategoria(): Promise<{
    categoria: CategoriaEPI;
    tiposAtivos: number;
    estoqueDisponivel: number;
    totalItens: number;
  }[]> {
    const estatisticas = await this.prisma.tipoEPI.findMany({
      select: {
        categoria: true,
        status: true,
        estoqueItens: {
          select: {
            quantidade: true,
            status: true,
          },
        },
      },
    });

    // Agrupar por categoria
    const groupedData = new Map<string, {
      tiposAtivos: number;
      estoqueDisponivel: number;
      totalItens: number;
    }>();

    estatisticas.forEach(item => {
      const categoriaKey = item.categoria as string;
      if (!groupedData.has(categoriaKey)) {
        groupedData.set(categoriaKey, {
          tiposAtivos: 0,
          estoqueDisponivel: 0,
          totalItens: 0,
        });
      }

      const data = groupedData.get(categoriaKey)!;
      
      if (item.status === 'ATIVO') {
        data.tiposAtivos++;
      }

      item.estoqueItens.forEach(estoque => {
        data.totalItens += estoque.quantidade;
        if (estoque.status === 'DISPONIVEL') {
          data.estoqueDisponivel += estoque.quantidade;
        }
      });
    });

    return Array.from(groupedData.entries()).map(([categoria, stats]) => ({
      categoria: categoria as CategoriaEPI,
      ...stats,
    }));
  }

  private validarInput(input: CriarTipoEpiInput): void {
    if (!input.nomeEquipamento || input.nomeEquipamento.trim().length === 0) {
      throw new BusinessError('Nome do equipamento é obrigatório');
    }

    if (!input.numeroCa || input.numeroCa.trim().length === 0) {
      throw new BusinessError('Número CA é obrigatório');
    }

    if (input.vidaUtilDias !== undefined && input.vidaUtilDias !== null && input.vidaUtilDias <= 0) {
      throw new BusinessError('Vida útil em dias deve ser positiva');
    }
  }


  private async verificarCAUnico(numeroCa: string, excludeId?: string): Promise<void> {
    const where: any = {
      numeroCa: numeroCa.trim(),
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existente = await this.prisma.tipoEPI.findFirst({ where });

    if (existente) {
      throw new ConflictError(`Já existe um tipo de EPI com o CA '${numeroCa}'`);
    }
  }

  private mapToOutput(tipoEpi: any): TipoEpiOutput {
    return {
      id: tipoEpi.id,
      nomeEquipamento: tipoEpi.nomeEquipamento,
      numeroCa: tipoEpi.numeroCa,
      categoria: tipoEpi.categoria,
      descricao: tipoEpi.descricao,
      vidaUtilDias: tipoEpi.vidaUtilDias,
      status: tipoEpi.status,
      createdAt: tipoEpi.createdAt,
    };
  }
}