import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { MonitorUseCase } from 'src/shared/decorators/monitor-performance.decorator';
import {
  ProcessarDevolucoesBatch,
  DevolucoesBatchResponse,
} from 'src/presentation/dto/schemas/ficha-epi.schemas';

@Injectable()
export class ProcessarDevolucoesBatchUseCase {
  constructor(private readonly prisma: PrismaService) {}

  @MonitorUseCase('processar-devolucoes-batch')
  async execute(input: ProcessarDevolucoesBatch): Promise<DevolucoesBatchResponse> {
    const { devolucoes } = input;

    return await this.prisma.$transaction(async (tx) => {
      const resultado = {
        processadas: 0,
        erros: [] as string[],
        fichasAtualizadas: new Set<string>(),
        estoqueAtualizado: false,
      };

      // Processar cada devolução
      for (const devolucao of devolucoes) {
        try {
          // 1. Buscar o item de entrega
          const entregaItem = await tx.entregaItem.findUniqueOrThrow({
            where: { id: devolucao.equipamentoId },
            include: {
              entrega: {
                include: {
                  fichaEpi: true,
                },
              },
              estoqueItem: {
                include: {
                  tipoEpi: true,
                  almoxarifado: true,
                },
              },
            },
          });

          // 2. Validar se o item pode ser devolvido
          if (entregaItem.status !== 'COM_COLABORADOR') {
            resultado.erros.push(
              `Item ${entregaItem.estoqueItem.tipoEpi.nomeEquipamento} já foi devolvido ou não está com o colaborador`
            );
            continue;
          }

          if (entregaItem.entrega.status === 'CANCELADA') {
            resultado.erros.push(
              `Não é possível devolver item de entrega cancelada`
            );
            continue;
          }

          // 3. Atualizar status do item para devolvido
          await tx.entregaItem.update({
            where: { id: entregaItem.id },
            data: {
              status: 'DEVOLVIDO',
            },
          });

          // 4. Determinar status de retorno ao estoque baseado no motivo
          let statusEstoque = 'DISPONIVEL';
          if (devolucao.motivo === 'danificado') {
            statusEstoque = 'QUARENTENA';
          }

          // 5. Criar movimentação de entrada no estoque
          await tx.movimentacaoEstoque.create({
            data: {
              estoqueItemId: entregaItem.estoqueItem.id,
              responsavelId: entregaItem.entrega.responsavelId, // Usar responsável da entrega original
              tipoMovimentacao: 'ENTRADA_DEVOLUCAO',
              quantidadeMovida: 1, // Sempre 1 para rastreabilidade unitária
              entregaId: entregaItem.entregaId,
            },
          });

          // 6. Retornar item ao estoque (apenas se não estiver danificado)
          if (devolucao.motivo !== 'danificado') {
            await tx.estoqueItem.update({
              where: { id: entregaItem.estoqueItem.id },
              data: {
                quantidade: {
                  increment: 1,
                },
              },
            });
          }

          // 7. Criar histórico na ficha
          await tx.historicoFicha.create({
            data: {
              fichaEpiId: entregaItem.entrega.fichaEpiId,
              responsavelId: entregaItem.entrega.responsavelId,
              acao: `Devolução de EPI - ${devolucao.motivo}`,
              detalhes: {
                equipamento: entregaItem.estoqueItem.tipoEpi.nomeEquipamento,
                motivo: devolucao.motivo,
                observacoes: devolucao.observacoes,
                entregaId: entregaItem.entregaId,
                itemEntregaId: entregaItem.id,
                statusEstoque,
              },
            },
          });

          // Marcar ficha como atualizada
          resultado.fichasAtualizadas.add(entregaItem.entrega.fichaEpiId);
          resultado.processadas++;
          resultado.estoqueAtualizado = true;

        } catch (error) {
          resultado.erros.push(`Erro ao processar devolução ${devolucao.equipamentoId}: ${error.message}`);
        }
      }

      // 8. Verificar e atualizar status das entregas (se todos os itens foram devolvidos)
      for (const fichaId of resultado.fichasAtualizadas) {
        await this.verificarStatusEntregas(tx, fichaId);
      }

      return {
        processadas: resultado.processadas,
        erros: resultado.erros,
        fichasAtualizadas: Array.from(resultado.fichasAtualizadas),
        estoqueAtualizado: resultado.estoqueAtualizado,
      };
    });
  }

  private async verificarStatusEntregas(tx: any, fichaId: string) {
    // Buscar entregas da ficha que ainda estão ativas
    const entregasAtivas = await tx.entrega.findMany({
      where: {
        fichaEpiId: fichaId,
        status: {
          in: ['PENDENTE_ASSINATURA', 'ASSINADA'],
        },
      },
      include: {
        itens: true,
      },
    });

    // Verificar cada entrega para ver se todos os itens foram devolvidos
    for (const entrega of entregasAtivas) {
      const itensComColaborador = entrega.itens.filter(item => item.status === 'COM_COLABORADOR');
      
      if (itensComColaborador.length === 0) {
        // Todos os itens foram devolvidos, marcar entrega como devolvida total
        await tx.entrega.update({
          where: { id: entrega.id },
          data: {
            status: 'CANCELADA', // Ou criar um novo status 'DEVOLVIDA_TOTAL'
          },
        });
      }
    }
  }
}