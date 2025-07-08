import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { BusinessError, ConflictError, NotFoundError } from '../../../domain/exceptions/business.exception';

export interface CriarColaboradorInput {
  nome: string;
  cpf: string;
  matricula?: string;
  cargo?: string;
  setor?: string;
  contratadaId: string;
}

export interface ColaboradorOutput {
  id: string;
  nome: string;
  cpf: string;
  cpfFormatado: string;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  ativo: boolean;
  contratadaId: string;
  unidadeNegocioId: string;
  createdAt: Date;
  contratada?: {
    id: string;
    nome: string;
    cnpj: string;
  };
}

@Injectable()
export class CriarColaboradorUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CriarColaboradorInput): Promise<ColaboradorOutput> {
    // Verificar se contratada existe
    const contratada = await this.prisma.contratada.findUnique({
      where: { id: input.contratadaId },
    });

    if (!contratada) {
      throw new NotFoundError('Contratada', input.contratadaId);
    }

    // Verificar se CPF já existe
    const colaboradorExistente = await this.prisma.colaborador.findUnique({
      where: { cpf: input.cpf },
    });

    if (colaboradorExistente) {
      throw new ConflictError('CPF já cadastrado');
    }

    // Buscar uma unidade de negócio padrão (primeira disponível)
    const unidadeNegocio = await this.prisma.unidadeNegocio.findFirst();

    if (!unidadeNegocio) {
      throw new BusinessError('Nenhuma unidade de negócio encontrada');
    }

    // Criar colaborador
    const colaborador = await this.prisma.colaborador.create({
      data: {
        nome: input.nome,
        cpf: input.cpf,
        matricula: input.matricula || null,
        cargo: input.cargo || null,
        setor: input.setor || null,
        contratadaId: input.contratadaId,
        unidadeNegocioId: unidadeNegocio.id,
      },
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

    return {
      ...colaborador,
      cpfFormatado: this.formatCPF(colaborador.cpf),
    };
  }

  private formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}