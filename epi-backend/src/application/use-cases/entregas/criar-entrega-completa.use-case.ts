import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { MonitorUseCase } from 'src/shared/decorators/monitor-performance.decorator';
import {
  CriarEntregaCompleta,
  EntregaCompletaResponse,
} from 'src/presentation/dto/schemas/ficha-epi.schemas';
import { randomBytes } from 'crypto';

@Injectable()
export class CriarEntregaCompletaUseCase {
  constructor(private readonly prisma: PrismaService) {}

  @MonitorUseCase('criar-entrega-completa')
  async execute(input: CriarEntregaCompleta): Promise<EntregaCompletaResponse> {
    const { fichaEpiId, responsavelId, itens, observacoes } = input;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Validar ficha existe e está ativa
      const ficha = await tx.fichaEPI.findUniqueOrThrow({
        where: { id: fichaEpiId },
        include: {
          colaborador: true,
        },
      });

      if (ficha.status !== 'ATIVA') {
        throw new Error('Ficha deve estar ativa para receber entregas');
      }

      // 2. Validar responsável existe
      await tx.usuario.findUniqueOrThrow({
        where: { id: responsavelId },
      });

      // 3. Validar e buscar itens de estoque
      const itensValidados = [];
      let totalItensIndividuais = 0;

      for (const item of itens) {
        const estoqueItem = await tx.estoqueItem.findUniqueOrThrow({
          where: { id: item.estoqueItemId },
          include: {
            tipoEpi: true,
            almoxarifado: true,
          },
        });

        // Validar quantidade disponível
        if (estoqueItem.quantidade < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para ${estoqueItem.tipoEpi.nomeEquipamento}. ` +
            `Disponível: ${estoqueItem.quantidade}, Solicitado: ${item.quantidade}`
          );
        }

        if (estoqueItem.status !== 'DISPONIVEL') {
          throw new Error(
            `Item ${estoqueItem.tipoEpi.nomeEquipamento} não está disponível para entrega`
          );
        }

        itensValidados.push({
          ...item,
          estoqueItem,
        });

        totalItensIndividuais += item.quantidade;
      }

      // 4. Criar a entrega principal
      const entrega = await tx.entrega.create({
        data: {
          id: randomBytes(3).toString('hex').toUpperCase(), // ID de 6 caracteres
          fichaEpiId,
          almoxarifadoId: itensValidados[0].estoqueItem.almoxarifadoId, // Usar almoxarifado do primeiro item
          responsavelId,
          status: 'PENDENTE_ASSINATURA',
          dataEntrega: new Date(),
        },
      });

      // 5. Criar itens individuais da entrega (rastreabilidade unitária)
      const itensIndividuais = [];

      for (const itemValidado of itensValidados) {
        const { estoqueItem, quantidade } = itemValidado;

        // Calcular data limite de devolução
        const dataLimiteDevolucao = estoqueItem.tipoEpi.vidaUtilDias
          ? new Date(Date.now() + estoqueItem.tipoEpi.vidaUtilDias * 24 * 60 * 60 * 1000)
          : null;

        // Criar quantidade de itens individuais conforme solicitado
        for (let i = 0; i < quantidade; i++) {
          const itemIndividual = await tx.entregaItem.create({
            data: {
              entregaId: entrega.id,
              estoqueItemOrigemId: estoqueItem.id,
              quantidadeEntregue: 1, // Sempre 1 para rastreabilidade unitária
              dataLimiteDevolucao,
              status: 'COM_COLABORADOR',
            },
          });

          itensIndividuais.push({
            id: itemIndividual.id,
            nomeEquipamento: estoqueItem.tipoEpi.nomeEquipamento,
            numeroCA: estoqueItem.tipoEpi.numeroCa,
            dataLimiteDevolucao: dataLimiteDevolucao?.toISOString().split('T')[0] || null,
          });
        }

        // 6. Criar movimentações de estoque (batch para performance)
        const movimentacoesData = [];
        for (let i = 0; i < quantidade; i++) {
          movimentacoesData.push({
            estoqueItemId: estoqueItem.id,
            responsavelId,
            tipoMovimentacao: 'SAIDA_ENTREGA',
            quantidadeMovida: 1, // Sempre 1 para rastreabilidade
            entregaId: entrega.id,
          });
        }

        await tx.movimentacaoEstoque.createMany({
          data: movimentacoesData,
        });

        // 7. Atualizar saldo do estoque
        await tx.estoqueItem.update({
          where: { id: estoqueItem.id },
          data: {
            quantidade: {
              decrement: quantidade,
            },
          },
        });
      }

      // 8. Criar registro no histórico da ficha
      await tx.historicoFicha.create({
        data: {
          fichaEpiId,
          responsavelId,
          acao: `Entrega de ${totalItensIndividuais} item(s) de EPI`,
          detalhes: {
            entregaId: entrega.id,
            tiposEpi: itensValidados.map(item => ({
              nome: item.estoqueItem.tipoEpi.nomeEquipamento,
              quantidade: item.quantidade,
            })),
            observacoes,
            totalItens: totalItensIndividuais,
          },
        },
      });

      return {
        entregaId: entrega.id,
        itensIndividuais,
        totalItens: totalItensIndividuais,
        statusEntrega: 'pendente_assinatura',
      };
    });
  }
}