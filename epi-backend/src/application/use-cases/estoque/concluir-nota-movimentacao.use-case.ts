import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { INotaRepository } from '../../../domain/interfaces/repositories/nota-repository.interface';
import { IMovimentacaoRepository } from '../../../domain/interfaces/repositories/movimentacao-repository.interface';
import { IEstoqueRepository } from '../../../domain/interfaces/repositories/estoque-repository.interface';
import { NotaMovimentacao } from '../../../domain/entities/nota-movimentacao.entity';
import { MovimentacaoEstoque } from '../../../domain/entities/movimentacao-estoque.entity';
import { TipoMovimentacao, StatusEstoqueItem, TipoNotaMovimentacao } from '../../../domain/enums';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';

export interface ConcluirNotaInput {
  notaId: string;
  usuarioId: string;
  validarEstoque?: boolean;
}

export interface ProcessamentoItem {
  tipoEpiId: string;
  quantidade: number;
  movimentacaoCreated: boolean;
  estoqueAtualizado: boolean;
}

export interface ResultadoProcessamento {
  notaConcluida: NotaMovimentacao;
  movimentacoesCriadas: MovimentacaoEstoque[];
  itensProcessados: ProcessamentoItem[];
}

@Injectable()
export class ConcluirNotaMovimentacaoUseCase {
  constructor(
    @Inject('INotaRepository')
    private readonly notaRepository: INotaRepository,
    @Inject('IMovimentacaoRepository')
    private readonly movimentacaoRepository: IMovimentacaoRepository,
    @Inject('IEstoqueRepository')
    private readonly estoqueRepository: IEstoqueRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: ConcluirNotaInput): Promise<ResultadoProcessamento> {
    // Validar se a nota existe e está em rascunho
    const notaComItens = await this.notaRepository.findWithItens(input.notaId);
    if (!notaComItens) {
      throw new NotFoundError('Nota de movimentação', input.notaId);
    }

    if (!notaComItens.isRascunho()) {
      throw new BusinessError('Apenas notas em rascunho podem ser concluídas');
    }

    if (notaComItens.itens.length === 0) {
      throw new BusinessError('Nota deve ter pelo menos um item');
    }

    // Executar dentro de uma transação para garantir atomicidade
    return await this.prisma.$transaction(async (tx) => {
      const movimentacoesCriadas: MovimentacaoEstoque[] = [];
      const itensProcessados: ProcessamentoItem[] = [];

      // Processar cada item da nota
      for (const item of notaComItens.itens) {
        const itemProcessado = await this.processarItem(
          notaComItens,
          item,
          input,
          tx,
        );

        itensProcessados.push(itemProcessado);

        // Se movimentação foi criada, adicionar à lista
        if (itemProcessado.movimentacaoCreated) {
          // Buscar a movimentação criada
          const movimentacoes = await this.movimentacaoRepository.findByNotaMovimentacao(
            input.notaId,
          );
          const novaMovimentacao = movimentacoes.find(
            mov => mov.tipoEpiId === item.tipoEpiId,
          );
          if (novaMovimentacao) {
            movimentacoesCriadas.push(novaMovimentacao);
          }
        }
      }

      // Concluir a nota
      const notaConcluida = await this.notaRepository.concluirNota(
        input.notaId,
        input.usuarioId,
      );

      return {
        notaConcluida,
        movimentacoesCriadas,
        itensProcessados,
      };
    });
  }

  private async processarItem(
    nota: any,
    item: any,
    input: ConcluirNotaInput,
    tx: any,
  ): Promise<ProcessamentoItem> {
    const tipoMovimentacao = this.mapearTipoMovimentacao(nota.tipo);
    const almoxarifadoOrigemId = nota.almoxarifadoOrigemId;
    const almoxarifadoDestinoId = nota.almoxarifadoDestinoId;

    // Validações específicas por tipo de movimentação
    await this.validarMovimentacao(
      nota.tipo,
      item,
      almoxarifadoOrigemId,
      almoxarifadoDestinoId,
      input.validarEstoque,
    );

    let movimentacaoCreated = false;
    let estoqueAtualizado = false;

    try {
      // Processar conforme o tipo de nota
      switch (nota.tipo) {
        case TipoNotaMovimentacao.ENTRADA:
          await this.processarEntrada(item, almoxarifadoDestinoId, nota.id, input.usuarioId);
          movimentacaoCreated = true;
          estoqueAtualizado = true;
          break;

        case TipoNotaMovimentacao.TRANSFERENCIA:
          await this.processarTransferencia(
            item,
            almoxarifadoOrigemId,
            almoxarifadoDestinoId,
            nota.id,
            input.usuarioId,
          );
          movimentacaoCreated = true;
          estoqueAtualizado = true;
          break;

        case TipoNotaMovimentacao.DESCARTE:
          await this.processarDescarte(item, almoxarifadoOrigemId, nota.id, input.usuarioId);
          movimentacaoCreated = true;
          estoqueAtualizado = true;
          break;

        case TipoNotaMovimentacao.AJUSTE:
          await this.processarAjuste(item, almoxarifadoDestinoId, nota.id, input.usuarioId);
          movimentacaoCreated = true;
          estoqueAtualizado = true;
          break;
      }

      // Atualizar quantidade processada do item
      await this.notaRepository.atualizarQuantidadeProcessada(
        nota.id,
        item.id,
        item.quantidade,
      );

      return {
        tipoEpiId: item.tipoEpiId,
        quantidade: item.quantidade,
        movimentacaoCreated,
        estoqueAtualizado,
      };
    } catch (error) {
      // Em caso de erro, lançar exceção para fazer rollback da transação
      throw new BusinessError(
        `Erro ao processar item ${item.tipoEpi?.codigo || item.tipoEpiId}: ${error.message}`,
      );
    }
  }

  private async processarEntrada(
    item: any,
    almoxarifadoId: string,
    notaId: string,
    usuarioId: string,
  ): Promise<void> {
    // Obter saldo atual
    const saldoAnterior = await this.movimentacaoRepository.obterUltimaSaldo(
      almoxarifadoId,
      item.tipoEpiId,
    );

    // Criar movimentação de entrada
    const movimentacao = MovimentacaoEstoque.createEntrada(
      almoxarifadoId,
      item.tipoEpiId,
      item.quantidade,
      saldoAnterior,
      usuarioId,
      notaId,
      `Entrada via nota ${notaId}`,
    );

    await this.movimentacaoRepository.create(movimentacao);

    // Atualizar estoque
    await this.estoqueRepository.adicionarQuantidade(
      almoxarifadoId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      item.quantidade,
    );
  }

  private async processarTransferencia(
    item: any,
    almoxarifadoOrigemId: string,
    almoxarifadoDestinoId: string,
    notaId: string,
    usuarioId: string,
  ): Promise<void> {
    // Saída do almoxarifado de origem
    const saldoAnteriorOrigem = await this.movimentacaoRepository.obterUltimaSaldo(
      almoxarifadoOrigemId,
      item.tipoEpiId,
    );

    const movimentacaoSaida = MovimentacaoEstoque.createSaida(
      almoxarifadoOrigemId,
      item.tipoEpiId,
      item.quantidade,
      saldoAnteriorOrigem,
      usuarioId,
      notaId,
      `Transferência - saída via nota ${notaId}`,
    );

    await this.movimentacaoRepository.create(movimentacaoSaida);

    // Entrada no almoxarifado de destino
    const saldoAnteriorDestino = await this.movimentacaoRepository.obterUltimaSaldo(
      almoxarifadoDestinoId,
      item.tipoEpiId,
    );

    const movimentacaoEntrada = MovimentacaoEstoque.createEntrada(
      almoxarifadoDestinoId,
      item.tipoEpiId,
      item.quantidade,
      saldoAnteriorDestino,
      usuarioId,
      notaId,
      `Transferência - entrada via nota ${notaId}`,
    );

    await this.movimentacaoRepository.create(movimentacaoEntrada);

    // Atualizar estoques
    await this.estoqueRepository.removerQuantidade(
      almoxarifadoOrigemId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      item.quantidade,
    );

    await this.estoqueRepository.adicionarQuantidade(
      almoxarifadoDestinoId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      item.quantidade,
    );
  }

  private async processarDescarte(
    item: any,
    almoxarifadoId: string,
    notaId: string,
    usuarioId: string,
  ): Promise<void> {
    // Obter saldo atual
    const saldoAnterior = await this.movimentacaoRepository.obterUltimaSaldo(
      almoxarifadoId,
      item.tipoEpiId,
    );

    // Criar movimentação de saída (descarte)
    const movimentacao = MovimentacaoEstoque.createSaida(
      almoxarifadoId,
      item.tipoEpiId,
      item.quantidade,
      saldoAnterior,
      usuarioId,
      notaId,
      `Descarte via nota ${notaId}`,
    );

    await this.movimentacaoRepository.create(movimentacao);

    // Remover do estoque disponível
    await this.estoqueRepository.removerQuantidade(
      almoxarifadoId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      item.quantidade,
    );
  }

  private async processarAjuste(
    item: any,
    almoxarifadoId: string,
    notaId: string,
    usuarioId: string,
  ): Promise<void> {
    // Obter saldo atual
    const saldoAnterior = await this.movimentacaoRepository.obterUltimaSaldo(
      almoxarifadoId,
      item.tipoEpiId,
    );

    // Criar movimentação de ajuste
    const movimentacao = MovimentacaoEstoque.createAjuste(
      almoxarifadoId,
      item.tipoEpiId,
      item.quantidade,
      saldoAnterior,
      usuarioId,
      `Ajuste de inventário via nota ${notaId}`,
    );

    await this.movimentacaoRepository.create(movimentacao);

    // Definir nova quantidade no estoque
    const novaQuantidade = saldoAnterior + item.quantidade;
    await this.estoqueRepository.atualizarQuantidade(
      almoxarifadoId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      novaQuantidade,
    );
  }

  private async validarMovimentacao(
    tipoNota: TipoNotaMovimentacao,
    item: any,
    almoxarifadoOrigemId: string | null,
    almoxarifadoDestinoId: string | null,
    validarEstoque: boolean = true,
  ): Promise<void> {
    // Validar estoque para operações que consomem
    if (validarEstoque && this.operacaoConsome(tipoNota)) {
      const almoxarifadoId = almoxarifadoOrigemId!;
      const disponibilidade = await this.estoqueRepository.verificarDisponibilidade(
        almoxarifadoId,
        item.tipoEpiId,
        item.quantidade,
      );

      if (!disponibilidade) {
        throw new BusinessError(
          `Quantidade insuficiente em estoque para o item ${item.tipoEpi?.codigo || item.tipoEpiId}`,
        );
      }
    }
  }

  private mapearTipoMovimentacao(tipoNota: TipoNotaMovimentacao): TipoMovimentacao {
    switch (tipoNota) {
      case TipoNotaMovimentacao.ENTRADA:
        return TipoMovimentacao.ENTRADA;
      case TipoNotaMovimentacao.TRANSFERENCIA:
        return TipoMovimentacao.TRANSFERENCIA;
      case TipoNotaMovimentacao.DESCARTE:
        return TipoMovimentacao.DESCARTE;
      case TipoNotaMovimentacao.AJUSTE:
        return TipoMovimentacao.AJUSTE;
      default:
        throw new BusinessError(`Tipo de nota não suportado: ${tipoNota}`);
    }
  }

  private operacaoConsome(tipoNota: TipoNotaMovimentacao): boolean {
    return [
      TipoNotaMovimentacao.TRANSFERENCIA,
      TipoNotaMovimentacao.DESCARTE,
    ].includes(tipoNota);
  }
}