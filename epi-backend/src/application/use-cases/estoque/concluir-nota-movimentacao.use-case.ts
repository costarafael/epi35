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
          // Buscar nova movimentação por estoqueItemId
          const estoqueItem = await this.estoqueRepository.findByAlmoxarifadoAndTipo(
            notaComItens.almoxarifadoOrigemId || notaComItens.almoxarifadoDestinoId || '',
            item.tipoEpiId,
            StatusEstoqueItem.DISPONIVEL,
          );
          const novaMovimentacao = movimentacoes?.find(
            mov => mov.estoqueItemId === estoqueItem?.id,
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
    // Buscar ou criar o estoque item
    const estoqueItem = await this.estoqueRepository.criarOuAtualizar(
      almoxarifadoId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      0, // quantidade inicial se não existir
    );

    // Criar movimentação de entrada
    const movimentacao = MovimentacaoEstoque.createEntradaNota(
      estoqueItem.id,
      item.quantidade,
      usuarioId,
      notaId,
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
    // Buscar estoque item de origem
    const estoqueItemOrigem = await this.estoqueRepository.findByAlmoxarifadoAndTipo(
      almoxarifadoOrigemId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
    );
    if (!estoqueItemOrigem) {
      throw new BusinessError('Item de estoque não encontrado no almoxarifado de origem');
    }

    // Buscar ou criar estoque item de destino
    const estoqueItemDestino = await this.estoqueRepository.criarOuAtualizar(
      almoxarifadoDestinoId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      0,
    );

    // Criar movimentações usando dados diretos (sem static methods por falta de compatibilidade)
    await this.prisma.movimentacaoEstoque.create({
      data: {
        estoqueItemId: estoqueItemOrigem.id,
        tipoMovimentacao: TipoMovimentacao.SAIDA_TRANSFERENCIA,
        quantidadeMovida: item.quantidade,
        notaMovimentacaoId: notaId,
        responsavelId: usuarioId,
        movimentacaoOrigemId: null,
      },
    });

    await this.prisma.movimentacaoEstoque.create({
      data: {
        estoqueItemId: estoqueItemDestino.id,
        tipoMovimentacao: TipoMovimentacao.ENTRADA_TRANSFERENCIA,
        quantidadeMovida: item.quantidade,
        notaMovimentacaoId: notaId,
        responsavelId: usuarioId,
        movimentacaoOrigemId: null,
      },
    });

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
    // Buscar estoque item
    const estoqueItem = await this.estoqueRepository.findByAlmoxarifadoAndTipo(
      almoxarifadoId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
    );
    if (!estoqueItem) {
      throw new BusinessError('Item de estoque não encontrado para descarte');
    }

    // Criar movimentação de saída (descarte)
    await this.prisma.movimentacaoEstoque.create({
      data: {
        estoqueItemId: estoqueItem.id,
        tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
        quantidadeMovida: item.quantidade,
        notaMovimentacaoId: notaId,
        responsavelId: usuarioId,
        movimentacaoOrigemId: null,
      },
    });

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
    // Buscar ou criar estoque item
    const estoqueItem = await this.estoqueRepository.criarOuAtualizar(
      almoxarifadoId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      0,
    );

    // Determinar tipo de ajuste (positivo ou negativo)
    const tipoMovimentacao = item.quantidade >= 0 
      ? TipoMovimentacao.AJUSTE_POSITIVO 
      : TipoMovimentacao.AJUSTE_NEGATIVO;

    // Criar movimentação de ajuste
    await this.prisma.movimentacaoEstoque.create({
      data: {
        estoqueItemId: estoqueItem.id,
        tipoMovimentacao,
        quantidadeMovida: Math.abs(item.quantidade),
        notaMovimentacaoId: notaId,
        responsavelId: usuarioId,
        movimentacaoOrigemId: null,
      },
    });

    // Definir nova quantidade no estoque
    const novaQuantidade = estoqueItem.quantidade + item.quantidade;
    await this.estoqueRepository.atualizarQuantidade(
      almoxarifadoId,
      item.tipoEpiId,
      StatusEstoqueItem.DISPONIVEL,
      Math.max(0, novaQuantidade), // Evitar saldo negativo
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
        return TipoMovimentacao.ENTRADA_NOTA;
      case TipoNotaMovimentacao.TRANSFERENCIA:
        return TipoMovimentacao.SAIDA_TRANSFERENCIA; // Pode ser saída ou entrada dependendo do contexto
      case TipoNotaMovimentacao.DESCARTE:
        return TipoMovimentacao.SAIDA_DESCARTE;
      case TipoNotaMovimentacao.AJUSTE:
        return TipoMovimentacao.AJUSTE_POSITIVO; // Pode ser positivo ou negativo dependendo do valor
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