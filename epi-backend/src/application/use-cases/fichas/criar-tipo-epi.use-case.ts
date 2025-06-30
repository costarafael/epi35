import { Injectable, Inject } from '@nestjs/common';
import { TipoEPI } from '../../../domain/entities/tipo-epi.entity';
import { BusinessError, ConflictError } from '../../../domain/exceptions/business.exception';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CriarTipoEpiInput {
  nome: string;
  codigo: string;
  descricao?: string;
  ca?: string;
  validadeMeses?: number;
  diasAvisoVencimento?: number;
  exigeAssinaturaEntrega?: boolean;
  ativo?: boolean;
}

export interface TipoEpiOutput {
  id: string;
  nome: string;
  codigo: string;
  descricao?: string;
  ca?: string;
  validadeMeses?: number;
  diasAvisoVencimento: number;
  exigeAssinaturaEntrega: boolean;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CriarTipoEpiUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CriarTipoEpiInput): Promise<TipoEpiOutput> {
    // Validar dados de entrada
    this.validarInput(input);

    // Verificar se já existe tipo com o mesmo código
    await this.verificarCodigoUnico(input.codigo);

    // Verificar se já existe tipo com o mesmo CA (se informado)
    if (input.ca) {
      await this.verificarCAUnico(input.ca);
    }

    // Criar entidade de domínio
    const tipoEpiData = TipoEPI.create(
      input.nome,
      input.codigo,
      input.descricao,
      input.ca,
      input.validadeMeses,
      input.diasAvisoVencimento || 30,
      input.exigeAssinaturaEntrega !== false, // Default true
      input.ativo !== false, // Default true
    );

    // Salvar no banco de dados
    const tipoEpi = await this.prisma.tipoEPI.create({
      data: {
        nome: tipoEpiData.nome,
        codigo: tipoEpiData.codigo,
        descricao: tipoEpiData.descricao,
        ca: tipoEpiData.ca,
        validadeMeses: tipoEpiData.validadeMeses,
        diasAvisoVencimento: tipoEpiData.diasAvisoVencimento,
        exigeAssinaturaEntrega: tipoEpiData.exigeAssinaturaEntrega,
        ativo: tipoEpiData.ativo,
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
  ): Promise<TipoEpiOutput[]> {
    const where: any = {};

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { codigo: { contains: busca, mode: 'insensitive' } },
        { ca: { contains: busca, mode: 'insensitive' } },
      ];
    }

    const tiposEpi = await this.prisma.tipoEPI.findMany({
      where,
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
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

    // Verificar código único se foi alterado
    if (input.codigo && input.codigo !== tipoEpiExistente.codigo) {
      await this.verificarCodigoUnico(input.codigo, id);
    }

    // Verificar CA único se foi alterado
    if (input.ca && input.ca !== tipoEpiExistente.ca) {
      await this.verificarCAUnico(input.ca, id);
    }

    // Preparar dados para atualização
    const updateData: any = {};

    if (input.nome !== undefined) {
      if (!input.nome.trim()) {
        throw new BusinessError('Nome é obrigatório');
      }
      updateData.nome = input.nome.trim();
    }

    if (input.codigo !== undefined) {
      if (!input.codigo.trim()) {
        throw new BusinessError('Código é obrigatório');
      }
      updateData.codigo = input.codigo.trim().toUpperCase();
    }

    if (input.descricao !== undefined) {
      updateData.descricao = input.descricao?.trim() || null;
    }

    if (input.ca !== undefined) {
      updateData.ca = input.ca?.trim() || null;
    }

    if (input.validadeMeses !== undefined) {
      if (input.validadeMeses !== null && input.validadeMeses <= 0) {
        throw new BusinessError('Validade em meses deve ser positiva');
      }
      updateData.validadeMeses = input.validadeMeses;
    }

    if (input.diasAvisoVencimento !== undefined) {
      if (input.diasAvisoVencimento < 0) {
        throw new BusinessError('Dias de aviso não pode ser negativo');
      }
      updateData.diasAvisoVencimento = input.diasAvisoVencimento;
    }

    if (input.exigeAssinaturaEntrega !== undefined) {
      updateData.exigeAssinaturaEntrega = input.exigeAssinaturaEntrega;
    }

    if (input.ativo !== undefined) {
      updateData.ativo = input.ativo;
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
      data: { ativo: true },
    });

    return this.mapToOutput(tipoEpi);
  }

  async inativarTipoEpi(id: string): Promise<TipoEpiOutput> {
    // Verificar se há fichas ativas ou estoque para este tipo
    const [fichasAtivas, estoque] = await Promise.all([
      this.prisma.fichaEPI.count({
        where: {
          tipoEpiId: id,
          status: 'ATIVA',
        },
      }),
      this.prisma.estoqueItem.count({
        where: {
          tipoEpiId: id,
          quantidade: { gt: 0 },
        },
      }),
    ]);

    if (fichasAtivas > 0) {
      throw new BusinessError(
        `Não é possível inativar: existem ${fichasAtivas} ficha(s) ativa(s) para este tipo de EPI`,
      );
    }

    if (estoque > 0) {
      throw new BusinessError(
        'Não é possível inativar: existe estoque para este tipo de EPI',
      );
    }

    const tipoEpi = await this.prisma.tipoEPI.update({
      where: { id },
      data: { ativo: false },
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

    const [fichas, estoque, entregas] = await Promise.all([
      this.prisma.fichaEPI.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
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
          fichaEpi: { tipoEpiId: tipoEpiId },
        },
        _count: { id: true },
      }),
    ]);

    return {
      totalFichas: fichas.reduce((sum, f) => sum + f._count.id, 0),
      fichasAtivas: fichas.find(f => f.status === 'ATIVA')?._count.id || 0,
      totalEstoque: estoque._count.id || 0,
      estoqueDisponivel: estoque._sum.quantidade || 0,
      totalEntregas: entregas.reduce((sum, e) => sum + e._count.id, 0),
      entregasAtivas: entregas.find(e => e.status === 'ATIVA')?._count.id || 0,
    };
  }

  private validarInput(input: CriarTipoEpiInput): void {
    if (!input.nome || input.nome.trim().length === 0) {
      throw new BusinessError('Nome é obrigatório');
    }

    if (!input.codigo || input.codigo.trim().length === 0) {
      throw new BusinessError('Código é obrigatório');
    }

    if (input.validadeMeses !== undefined && input.validadeMeses !== null && input.validadeMeses <= 0) {
      throw new BusinessError('Validade em meses deve ser positiva');
    }

    if (input.diasAvisoVencimento !== undefined && input.diasAvisoVencimento < 0) {
      throw new BusinessError('Dias de aviso de vencimento não pode ser negativo');
    }
  }

  private async verificarCodigoUnico(codigo: string, excludeId?: string): Promise<void> {
    const where: any = {
      codigo: codigo.trim().toUpperCase(),
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existente = await this.prisma.tipoEPI.findFirst({ where });

    if (existente) {
      throw new ConflictError(`Já existe um tipo de EPI com o código '${codigo}'`);
    }
  }

  private async verificarCAUnico(ca: string, excludeId?: string): Promise<void> {
    const where: any = {
      ca: ca.trim(),
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existente = await this.prisma.tipoEPI.findFirst({ where });

    if (existente) {
      throw new ConflictError(`Já existe um tipo de EPI com o CA '${ca}'`);
    }
  }

  private mapToOutput(tipoEpi: any): TipoEpiOutput {
    return {
      id: tipoEpi.id,
      nome: tipoEpi.nome,
      codigo: tipoEpi.codigo,
      descricao: tipoEpi.descricao,
      ca: tipoEpi.ca,
      validadeMeses: tipoEpi.validadeMeses,
      diasAvisoVencimento: tipoEpi.diasAvisoVencimento,
      exigeAssinaturaEntrega: tipoEpi.exigeAssinaturaEntrega,
      ativo: tipoEpi.ativo,
      createdAt: tipoEpi.createdAt,
      updatedAt: tipoEpi.updatedAt,
    };
  }
}