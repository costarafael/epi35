import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { INotaRepository } from '../../../domain/interfaces/repositories/nota-repository.interface';
import { IMovimentacaoRepository } from '../../../domain/interfaces/repositories/movimentacao-repository.interface';
import { IEstoqueRepository } from '../../../domain/interfaces/repositories/estoque-repository.interface';
import { NotaMovimentacao } from '../../../domain/entities/nota-movimentacao.entity';
import { MovimentacaoEstoque } from '../../../domain/entities/movimentacao-estoque.entity';
import { TipoNotaMovimentacao, StatusEstoqueItem } from '../../../domain/enums';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';

export interface CancelarNotaInput {
  notaId: string;
  usuarioId: string;
  motivo?: string;
  gerarEstorno?: boolean;
}

export interface EstornoMovimentacao {
  movimentacaoOriginalId: string;
  movimentacaoEstornoId: string;
  tipoEpiId: string;
  quantidade: number;
  saldoAnterior: number;
  saldoPosterior: number;
}

export interface ResultadoCancelamento {
  notaCancelada: NotaMovimentacao;
  estornosGerados: EstornoMovimentacao[];
  estoqueAjustado: boolean;
}

@Injectable()
export class CancelarNotaMovimentacaoUseCase {
  constructor(
    @Inject('INotaRepository')
    private readonly notaRepository: INotaRepository,
    @Inject('IMovimentacaoRepository')
    private readonly movimentacaoRepository: IMovimentacaoRepository,
    @Inject('IEstoqueRepository')
    private readonly estoqueRepository: IEstoqueRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CancelarNotaInput): Promise<ResultadoCancelamento> {
    // Validar se a nota existe e pode ser cancelada
    const nota = await this.notaRepository.findById(input.notaId);
    if (!nota) {
      throw new NotFoundError('Nota de movimentação', input.notaId);
    }

    if (!nota.isCancelavel()) {
      throw new BusinessError('Nota não pode ser cancelada');
    }

    // Se a nota está concluída e deve gerar estorno
    if (nota.isConcluida() && input.gerarEstorno !== false) {
      return await this.cancelarComEstorno(nota, input);
    } else {
      return await this.cancelarSimples(nota, input);
    }
  }

  private async cancelarSimples(
    nota: NotaMovimentacao,
    input: CancelarNotaInput,
  ): Promise<ResultadoCancelamento> {
    // Para notas em rascunho, apenas cancelar sem estorno
    const notaCancelada = await this.notaRepository.cancelarNota(
      input.notaId,
      input.usuarioId,
      input.motivo,
    );

    return {
      notaCancelada,
      estornosGerados: [],
      estoqueAjustado: false,
    };
  }

  private async cancelarComEstorno(
    nota: NotaMovimentacao,
    input: CancelarNotaInput,
  ): Promise<ResultadoCancelamento> {
    // Executar dentro de transação para garantir atomicidade
    return await this.prisma.$transaction(async (tx) => {
      // Buscar todas as movimentações da nota
      const movimentacoes = await this.movimentacaoRepository.findByNotaMovimentacao(
        input.notaId,
      );

      if (movimentacoes.length === 0) {
        throw new BusinessError('Nota não possui movimentações para estornar');
      }

      const estornosGerados: EstornoMovimentacao[] = [];

      // Gerar estorno para cada movimentação
      for (const movimentacao of movimentacoes) {
        if (!movimentacao.isEstornavel()) {
          throw new BusinessError(
            `Movimentação ${movimentacao.id} não pode ser estornada`,
          );
        }

        const estorno = await this.movimentacaoRepository.criarEstorno(
          movimentacao.id,
          input.usuarioId,
          `Estorno por cancelamento da nota ${nota.numero}. Motivo: ${input.motivo || 'Não informado'}`,
        );

        // Ajustar estoque
        await this.ajustarEstoqueEstorno(movimentacao, nota.tipo);

        estornosGerados.push({
          movimentacaoOriginalId: movimentacao.id,
          movimentacaoEstornoId: estorno.id,
          tipoEpiId: movimentacao.tipoEpiId,
          quantidade: movimentacao.quantidade,
          saldoAnterior: estorno.saldoAnterior,
          saldoPosterior: estorno.saldoPosterior,
        });
      }

      // Cancelar a nota
      const notaCancelada = await this.notaRepository.cancelarNota(
        input.notaId,
        input.usuarioId,
        input.motivo,
      );

      return {
        notaCancelada,
        estornosGerados,
        estoqueAjustado: true,
      };
    });
  }

  private async ajustarEstoqueEstorno(
    movimentacaoOriginal: MovimentacaoEstoque,
    tipoNota: TipoNotaMovimentacao,
  ): Promise<void> {
    const almoxarifadoId = movimentacaoOriginal.almoxarifadoId;
    const tipoEpiId = movimentacaoOriginal.tipoEpiId;
    const quantidade = movimentacaoOriginal.quantidade;

    switch (tipoNota) {
      case TipoNotaMovimentacao.ENTRADA:
        // Estorno de entrada: remover do estoque
        await this.estoqueRepository.removerQuantidade(
          almoxarifadoId,
          tipoEpiId,
          StatusEstoqueItem.DISPONIVEL,
          quantidade,
        );
        break;

      case TipoNotaMovimentacao.TRANSFERENCIA:
        // Estorno de transferência: mais complexo pois envolve dois almoxarifados
        await this.estornarTransferencia(movimentacaoOriginal);
        break;

      case TipoNotaMovimentacao.DESCARTE:
        // Estorno de descarte: adicionar de volta ao estoque
        await this.estoqueRepository.adicionarQuantidade(
          almoxarifadoId,
          tipoEpiId,
          StatusEstoqueItem.DISPONIVEL,
          quantidade,
        );
        break;

      case TipoNotaMovimentacao.AJUSTE:
        // Estorno de ajuste: aplicar o ajuste inverso
        await this.estornarAjuste(movimentacaoOriginal);
        break;

      default:
        throw new BusinessError(`Tipo de nota não suportado para estorno: ${tipoNota}`);
    }
  }

  private async estornarTransferencia(movimentacaoOriginal: MovimentacaoEstoque): Promise<void> {
    const almoxarifadoId = movimentacaoOriginal.almoxarifadoId;
    const tipoEpiId = movimentacaoOriginal.tipoEpiId;
    const quantidade = movimentacaoOriginal.quantidade;

    if (movimentacaoOriginal.isSaida()) {
      // Era uma saída, estorno adiciona de volta
      await this.estoqueRepository.adicionarQuantidade(
        almoxarifadoId,
        tipoEpiId,
        StatusEstoqueItem.DISPONIVEL,
        quantidade,
      );
    } else if (movimentacaoOriginal.isEntrada()) {
      // Era uma entrada, estorno remove
      await this.estoqueRepository.removerQuantidade(
        almoxarifadoId,
        tipoEpiId,
        StatusEstoqueItem.DISPONIVEL,
        quantidade,
      );
    }
  }

  private async estornarAjuste(movimentacaoOriginal: MovimentacaoEstoque): Promise<void> {
    const almoxarifadoId = movimentacaoOriginal.almoxarifadoId;
    const tipoEpiId = movimentacaoOriginal.tipoEpiId;
    
    // Para ajuste, o estorno retorna ao saldo anterior
    await this.estoqueRepository.atualizarQuantidade(
      almoxarifadoId,
      tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      movimentacaoOriginal.saldoAnterior,
    );
  }

  async validarCancelamento(notaId: string): Promise<{
    podeSerCancelada: boolean;
    motivo?: string;
    requerEstorno: boolean;
    movimentacoesAfetadas: number;
  }> {
    const nota = await this.notaRepository.findById(notaId);
    if (!nota) {
      return {
        podeSerCancelada: false,
        motivo: 'Nota não encontrada',
        requerEstorno: false,
        movimentacoesAfetadas: 0,
      };
    }

    if (!nota.isCancelavel()) {
      return {
        podeSerCancelada: false,
        motivo: 'Nota não está em status que permite cancelamento',
        requerEstorno: false,
        movimentacoesAfetadas: 0,
      };
    }

    const movimentacoes = await this.movimentacaoRepository.findByNotaMovimentacao(notaId);
    const requerEstorno = nota.isConcluida() && movimentacoes.length > 0;

    // Verificar se todas as movimentações podem ser estornadas
    if (requerEstorno) {
      const movimentacoesNaoEstornaveis = movimentacoes.filter(
        mov => !mov.isEstornavel(),
      );

      if (movimentacoesNaoEstornaveis.length > 0) {
        return {
          podeSerCancelada: false,
          motivo: 'Existem movimentações que não podem ser estornadas',
          requerEstorno: true,
          movimentacoesAfetadas: movimentacoes.length,
        };
      }
    }

    return {
      podeSerCancelada: true,
      requerEstorno,
      movimentacoesAfetadas: movimentacoes.length,
    };
  }

  async obterImpactoCancelamento(notaId: string): Promise<{
    estoqueAfetado: {
      almoxarifadoId: string;
      tipoEpiId: string;
      saldoAtual: number;
      saldoAposCancelamento: number;
      diferenca: number;
    }[];
    movimentacoesAfetadas: {
      id: string;
      tipoMovimentacao: string;
      quantidade: number;
      saldoAnterior: number;
      saldoPosterior: number;
    }[];
  }> {
    const movimentacoes = await this.movimentacaoRepository.findByNotaMovimentacao(notaId);
    
    const estoqueAfetado = [];
    const movimentacoesAfetadas = [];

    for (const mov of movimentacoes) {
      // Calcular impacto no estoque
      const estoqueAtual = await this.estoqueRepository.findByAlmoxarifadoAndTipo(
        mov.almoxarifadoId,
        mov.tipoEpiId,
        StatusEstoqueItem.DISPONIVEL,
      );

      const saldoAtual = estoqueAtual?.quantidade || 0;
      const diferenca = mov.isEntrada() ? -mov.quantidade : mov.quantidade;
      const saldoAposCancelamento = saldoAtual + diferenca;

      estoqueAfetado.push({
        almoxarifadoId: mov.almoxarifadoId,
        tipoEpiId: mov.tipoEpiId,
        saldoAtual,
        saldoAposCancelamento,
        diferenca,
      });

      movimentacoesAfetadas.push({
        id: mov.id,
        tipoMovimentacao: mov.tipoMovimentacao,
        quantidade: mov.quantidade,
        saldoAnterior: mov.saldoAnterior,
        saldoPosterior: mov.saldoPosterior,
      });
    }

    return {
      estoqueAfetado,
      movimentacoesAfetadas,
    };
  }
}