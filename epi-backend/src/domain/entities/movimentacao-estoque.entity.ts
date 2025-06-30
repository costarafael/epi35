import { TipoMovimentacao } from '../enums';
import { BusinessError } from '../exceptions/business.exception';

export class MovimentacaoEstoque {
  constructor(
    public readonly id: string,
    public readonly almoxarifadoId: string,
    public readonly tipoEpiId: string,
    public readonly tipoMovimentacao: TipoMovimentacao,
    public readonly quantidade: number,
    public readonly saldoAnterior: number,
    public readonly saldoPosterior: number,
    public readonly notaMovimentacaoId: string | null,
    public readonly usuarioId: string,
    public readonly observacoes: string | null,
    public readonly movimentacaoEstornoId: string | null,
    public readonly createdAt: Date,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.almoxarifadoId) {
      throw new BusinessError('Almoxarifado é obrigatório');
    }

    if (!this.tipoEpiId) {
      throw new BusinessError('Tipo de EPI é obrigatório');
    }

    if (!this.usuarioId) {
      throw new BusinessError('Usuário é obrigatório');
    }

    if (this.quantidade === 0) {
      throw new BusinessError('Quantidade não pode ser zero');
    }

    this.validateSaldos();
  }

  private validateSaldos(): void {
    const quantidadeCalculada = this.saldoAnterior + this.getQuantidadeComSinal();
    
    if (quantidadeCalculada !== this.saldoPosterior) {
      throw new BusinessError(
        `Saldo posterior inválido. Esperado: ${quantidadeCalculada}, Informado: ${this.saldoPosterior}`
      );
    }
  }

  private getQuantidadeComSinal(): number {
    switch (this.tipoMovimentacao) {
      case TipoMovimentacao.ENTRADA:
      case TipoMovimentacao.AJUSTE:
        return Math.abs(this.quantidade);
      
      case TipoMovimentacao.SAIDA:
      case TipoMovimentacao.TRANSFERENCIA:
      case TipoMovimentacao.DESCARTE:
        return -Math.abs(this.quantidade);
      
      case TipoMovimentacao.ESTORNO:
        // Para estorno, inverte o sinal da movimentação original
        return this.quantidade > 0 ? -this.quantidade : Math.abs(this.quantidade);
      
      default:
        throw new BusinessError(`Tipo de movimentação inválido: ${this.tipoMovimentacao}`);
    }
  }

  public isEntrada(): boolean {
    return this.tipoMovimentacao === TipoMovimentacao.ENTRADA;
  }

  public isSaida(): boolean {
    return this.tipoMovimentacao === TipoMovimentacao.SAIDA;
  }

  public isTransferencia(): boolean {
    return this.tipoMovimentacao === TipoMovimentacao.TRANSFERENCIA;
  }

  public isAjuste(): boolean {
    return this.tipoMovimentacao === TipoMovimentacao.AJUSTE;
  }

  public isDescarte(): boolean {
    return this.tipoMovimentacao === TipoMovimentacao.DESCARTE;
  }

  public isEstorno(): boolean {
    return this.tipoMovimentacao === TipoMovimentacao.ESTORNO;
  }

  public isEstornavel(): boolean {
    // Não pode estornar estornos
    return !this.isEstorno() && !this.movimentacaoEstornoId;
  }

  public static createEntrada(
    almoxarifadoId: string,
    tipoEpiId: string,
    quantidade: number,
    saldoAnterior: number,
    usuarioId: string,
    notaMovimentacaoId?: string,
    observacoes?: string,
  ): Omit<MovimentacaoEstoque, 'id' | 'createdAt'> {
    return this.createMovimentacao(
      almoxarifadoId,
      tipoEpiId,
      TipoMovimentacao.ENTRADA,
      quantidade,
      saldoAnterior,
      usuarioId,
      notaMovimentacaoId,
      observacoes,
    );
  }

  public static createSaida(
    almoxarifadoId: string,
    tipoEpiId: string,
    quantidade: number,
    saldoAnterior: number,
    usuarioId: string,
    notaMovimentacaoId?: string,
    observacoes?: string,
  ): Omit<MovimentacaoEstoque, 'id' | 'createdAt'> {
    return this.createMovimentacao(
      almoxarifadoId,
      tipoEpiId,
      TipoMovimentacao.SAIDA,
      quantidade,
      saldoAnterior,
      usuarioId,
      notaMovimentacaoId,
      observacoes,
    );
  }

  public static createAjuste(
    almoxarifadoId: string,
    tipoEpiId: string,
    quantidadeAjuste: number,
    saldoAnterior: number,
    usuarioId: string,
    observacoes?: string,
  ): Omit<MovimentacaoEstoque, 'id' | 'createdAt'> {
    return this.createMovimentacao(
      almoxarifadoId,
      tipoEpiId,
      TipoMovimentacao.AJUSTE,
      quantidadeAjuste,
      saldoAnterior,
      usuarioId,
      undefined,
      observacoes,
    );
  }

  private static createMovimentacao(
    almoxarifadoId: string,
    tipoEpiId: string,
    tipoMovimentacao: TipoMovimentacao,
    quantidade: number,
    saldoAnterior: number,
    usuarioId: string,
    notaMovimentacaoId?: string,
    observacoes?: string,
  ): Omit<MovimentacaoEstoque, 'id' | 'createdAt'> {
    const quantidadeComSinal = MovimentacaoEstoque.prototype.getQuantidadeComSinal.call({
      tipoMovimentacao,
      quantidade: Math.abs(quantidade),
    });
    
    const saldoPosterior = saldoAnterior + quantidadeComSinal;

    return {
      almoxarifadoId,
      tipoEpiId,
      tipoMovimentacao,
      quantidade: Math.abs(quantidade),
      saldoAnterior,
      saldoPosterior,
      notaMovimentacaoId: notaMovimentacaoId || null,
      usuarioId,
      observacoes: observacoes || null,
      movimentacaoEstornoId: null,
      isEntrada: MovimentacaoEstoque.prototype.isEntrada,
      isSaida: MovimentacaoEstoque.prototype.isSaida,
      isTransferencia: MovimentacaoEstoque.prototype.isTransferencia,
      isAjuste: MovimentacaoEstoque.prototype.isAjuste,
      isDescarte: MovimentacaoEstoque.prototype.isDescarte,
      isEstorno: MovimentacaoEstoque.prototype.isEstorno,
      isEstornavel: MovimentacaoEstoque.prototype.isEstornavel,
    } as any;
  }
}