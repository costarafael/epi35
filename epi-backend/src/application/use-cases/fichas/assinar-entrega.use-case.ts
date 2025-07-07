import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';
import { MonitorUseCase } from '../../../shared/decorators/monitor-performance.decorator';

export interface AssinarEntregaInput {
  entregaId: string;
  assinaturaColaborador?: string;
  observacoes?: string;
}

export interface AssinarEntregaOutput {
  id: string;
  status: string;
  dataAssinatura: Date;
  assinaturaColaborador?: string;
  observacoes?: string;
  fichaEpiId: string;
  almoxarifadoId: string;
  responsavelId: string;
  dataEntrega: Date;
  linkAssinatura?: string;
}

@Injectable()
export class AssinarEntregaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  @MonitorUseCase('assinar-entrega')
  async execute(input: AssinarEntregaInput): Promise<AssinarEntregaOutput> {
    return await this.prisma.$transaction(async (tx) => {
      // Buscar a entrega
      const entrega = await tx.entrega.findUnique({
        where: { id: input.entregaId },
        include: {
          fichaEpi: {
            include: {
              colaborador: true,
            },
          },
        },
      });

      if (!entrega) {
        throw new NotFoundError('Entrega', input.entregaId);
      }

      // Validar se a entrega está pendente de assinatura
      if (entrega.status !== 'PENDENTE_ASSINATURA') {
        throw new BusinessError(
          `Entrega não pode ser assinada. Status atual: ${entrega.status}. Apenas entregas com status PENDENTE_ASSINATURA podem ser assinadas.`,
        );
      }

      // Validar se a ficha EPI está ativa
      if (entrega.fichaEpi.status !== 'ATIVA') {
        throw new BusinessError(
          'Não é possível assinar entrega de ficha EPI inativa',
        );
      }

      // Atualizar a entrega para status ASSINADA
      const entregaAtualizada = await tx.entrega.update({
        where: { id: input.entregaId },
        data: {
          status: 'ASSINADA',
          dataAssinatura: new Date(),
          linkAssinatura: input.assinaturaColaborador, // Usar linkAssinatura para guardar a assinatura
        },
      });

      return {
        id: entregaAtualizada.id,
        status: entregaAtualizada.status,
        dataAssinatura: entregaAtualizada.dataAssinatura!,
        assinaturaColaborador: entregaAtualizada.linkAssinatura || undefined,
        observacoes: input.observacoes, // Retornar as observações do input já que não são salvas no DB
        fichaEpiId: entregaAtualizada.fichaEpiId,
        almoxarifadoId: entregaAtualizada.almoxarifadoId,
        responsavelId: entregaAtualizada.responsavelId,
        dataEntrega: entregaAtualizada.dataEntrega,
        linkAssinatura: entregaAtualizada.linkAssinatura || undefined,
      };
    });
  }
}