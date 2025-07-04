import { TipoMovimentacao } from '../enums';
import { BusinessError } from '../exceptions/business.exception';

/**
 * Entidade MovimentacaoEstoque reformulada conforme nova estrutura:
 * - estoqueItemId (antes: almoxarifadoId + tipoEpiId)
 * - quantidadeMovida (antes: quantidade)
 * - movimentacaoOrigemId (para estornos)
 * - Removidos: saldoAnterior, saldoPosterior, observacoes
 */
export class MovimentacaoEstoque {
  constructor(
    public readonly id: string,
    public readonly estoqueItemId: string,
    public readonly tipoMovimentacao: TipoMovimentacao,
    public readonly quantidadeMovida: number,
    public readonly notaMovimentacaoId: string | null,
    public readonly responsavelId: string,
    public readonly entregaId: string | null,
    public readonly movimentacaoOrigemId: string | null,
    public readonly dataMovimentacao: Date,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.estoqueItemId) {
      throw new BusinessError('Estoque item é obrigatório');
    }

    if (!this.responsavelId) {
      throw new BusinessError('Responsável é obrigatório');
    }

    if (this.quantidadeMovida === 0) {
      throw new BusinessError('Quantidade movida não pode ser zero');
    }

    if (this.quantidadeMovida < 0) {
      throw new BusinessError('Quantidade movida deve ser positiva');
    }

    this.validateEstorno();
  }

  private validateEstorno(): void {
    const isEstorno = this.isEstorno();
    
    if (isEstorno && !this.movimentacaoOrigemId) {
      throw new BusinessError('Movimentação de estorno deve referenciar a movimentação original');
    }

    if (!isEstorno && this.movimentacaoOrigemId) {
      throw new BusinessError('Apenas estornos podem referenciar movimentação original');
    }
  }

  /**
   * Métodos de verificação para novos tipos de movimentação
   */
  public isEntrada(): boolean {
    return [
      TipoMovimentacao.ENTRADA_NOTA,
      TipoMovimentacao.ENTRADA_DEVOLUCAO,
      TipoMovimentacao.ENTRADA_TRANSFERENCIA,
    ].includes(this.tipoMovimentacao);
  }

  public isSaida(): boolean {
    return [
      TipoMovimentacao.SAIDA_ENTREGA,
      TipoMovimentacao.SAIDA_TRANSFERENCIA,
      TipoMovimentacao.SAIDA_DESCARTE,
    ].includes(this.tipoMovimentacao);
  }

  public isAjuste(): boolean {
    return [
      TipoMovimentacao.AJUSTE_POSITIVO,
      TipoMovimentacao.AJUSTE_NEGATIVO,
    ].includes(this.tipoMovimentacao);
  }

  public isEstorno(): boolean {
    return this.tipoMovimentacao.startsWith('ESTORNO_');
  }

  public isEstornavel(): boolean {
    // Não pode estornar estornos nem movimentações já estornadas
    return !this.isEstorno() && !this.movimentacaoOrigemId;
  }

  /**
   * Verifica se é uma movimentação que incrementa o estoque
   */
  public isPositiva(): boolean {
    return [
      TipoMovimentacao.ENTRADA_NOTA,
      TipoMovimentacao.ENTRADA_DEVOLUCAO,
      TipoMovimentacao.ENTRADA_TRANSFERENCIA,
      TipoMovimentacao.AJUSTE_POSITIVO,
      TipoMovimentacao.ESTORNO_SAIDA_ENTREGA,
      TipoMovimentacao.ESTORNO_SAIDA_TRANSFERENCIA,
      TipoMovimentacao.ESTORNO_SAIDA_DESCARTE,
      TipoMovimentacao.ESTORNO_AJUSTE_NEGATIVO,
    ].includes(this.tipoMovimentacao);
  }

  /**
   * Verifica se é uma movimentação que decrementa o estoque
   */
  public isNegativa(): boolean {
    return !this.isPositiva();
  }

  /**
   * Obtém o tipo de estorno correspondente
   */
  public getTipoEstorno(): TipoMovimentacao | null {
    const estornoMap = {
      [TipoMovimentacao.ENTRADA_NOTA]: TipoMovimentacao.ESTORNO_ENTRADA_NOTA,
      [TipoMovimentacao.SAIDA_ENTREGA]: TipoMovimentacao.ESTORNO_SAIDA_ENTREGA,
      [TipoMovimentacao.ENTRADA_DEVOLUCAO]: TipoMovimentacao.ESTORNO_ENTRADA_DEVOLUCAO,
      [TipoMovimentacao.SAIDA_TRANSFERENCIA]: TipoMovimentacao.ESTORNO_SAIDA_TRANSFERENCIA,
      [TipoMovimentacao.ENTRADA_TRANSFERENCIA]: TipoMovimentacao.ESTORNO_ENTRADA_TRANSFERENCIA,
      [TipoMovimentacao.SAIDA_DESCARTE]: TipoMovimentacao.ESTORNO_SAIDA_DESCARTE,
      [TipoMovimentacao.AJUSTE_POSITIVO]: TipoMovimentacao.ESTORNO_AJUSTE_POSITIVO,
      [TipoMovimentacao.AJUSTE_NEGATIVO]: TipoMovimentacao.ESTORNO_AJUSTE_NEGATIVO,
    };

    return estornoMap[this.tipoMovimentacao] || null;
  }

  /**
   * Métodos de criação atualizados para nova estrutura
   */
  public static createEntradaNota(
    estoqueItemId: string,
    quantidadeMovida: number,
    responsavelId: string,
    notaMovimentacaoId: string,
  ): Omit<MovimentacaoEstoque, 'id' | 'dataMovimentacao'> {
    return this.createMovimentacao(
      estoqueItemId,
      TipoMovimentacao.ENTRADA_NOTA,
      quantidadeMovida,
      responsavelId,
      notaMovimentacaoId,
      null,
      null,
    );
  }

  public static createSaidaEntrega(
    estoqueItemId: string,
    quantidadeMovida: number,
    responsavelId: string,
    entregaId?: string,
  ): Omit<MovimentacaoEstoque, 'id' | 'dataMovimentacao'> {
    return this.createMovimentacao(
      estoqueItemId,
      TipoMovimentacao.SAIDA_ENTREGA,
      quantidadeMovida,
      responsavelId,
      null,
      null,
      entregaId,
    );
  }

  public static createAjustePositivo(
    estoqueItemId: string,
    quantidadeMovida: number,
    responsavelId: string,
  ): Omit<MovimentacaoEstoque, 'id' | 'dataMovimentacao'> {
    return this.createMovimentacao(
      estoqueItemId,
      TipoMovimentacao.AJUSTE_POSITIVO,
      quantidadeMovida,
      responsavelId,
      null,
      null,
      null,
    );
  }

  public static createAjusteNegativo(
    estoqueItemId: string,
    quantidadeMovida: number,
    responsavelId: string,
  ): Omit<MovimentacaoEstoque, 'id' | 'dataMovimentacao'> {
    return this.createMovimentacao(
      estoqueItemId,
      TipoMovimentacao.AJUSTE_NEGATIVO,
      quantidadeMovida,
      responsavelId,
      null,
      null,
      null,
    );
  }

  public static createEstorno(
    estoqueItemId: string,
    quantidadeMovida: number,
    responsavelId: string,
    tipoEstorno: TipoMovimentacao,
    movimentacaoOrigemId: string,
  ): Omit<MovimentacaoEstoque, 'id' | 'dataMovimentacao'> {
    return this.createMovimentacao(
      estoqueItemId,
      tipoEstorno,
      quantidadeMovida,
      responsavelId,
      null,
      movimentacaoOrigemId,
      null,
    );
  }

  private static createMovimentacao(
    estoqueItemId: string,
    tipoMovimentacao: TipoMovimentacao,
    quantidadeMovida: number,
    responsavelId: string,
    notaMovimentacaoId?: string | null,
    movimentacaoOrigemId?: string | null,
    entregaId?: string | null,
  ): Omit<MovimentacaoEstoque, 'id' | 'dataMovimentacao'> {
    return {
      estoqueItemId,
      tipoMovimentacao,
      quantidadeMovida: Math.abs(quantidadeMovida),
      notaMovimentacaoId: notaMovimentacaoId || null,
      responsavelId,
      entregaId: entregaId || null,
      movimentacaoOrigemId: movimentacaoOrigemId || null,
      isEntrada: MovimentacaoEstoque.prototype.isEntrada,
      isSaida: MovimentacaoEstoque.prototype.isSaida,
      isAjuste: MovimentacaoEstoque.prototype.isAjuste,
      isEstorno: MovimentacaoEstoque.prototype.isEstorno,
      isEstornavel: MovimentacaoEstoque.prototype.isEstornavel,
      isPositiva: MovimentacaoEstoque.prototype.isPositiva,
      isNegativa: MovimentacaoEstoque.prototype.isNegativa,
      getTipoEstorno: MovimentacaoEstoque.prototype.getTipoEstorno,
    } as any;
  }
}