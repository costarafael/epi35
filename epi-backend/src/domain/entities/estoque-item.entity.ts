import { StatusEstoqueItem } from '../enums';
import { BusinessError } from '../exceptions/business.exception';

export class EstoqueItem {
  constructor(
    public readonly id: string,
    public readonly almoxarifadoId: string,
    public readonly tipoEpiId: string,
    private _quantidade: number,
    public readonly status: StatusEstoqueItem,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validateQuantidade(_quantidade);
  }

  get quantidade(): number {
    return this._quantidade;
  }

  private validateQuantidade(quantidade: number): void {
    if (quantidade < 0) {
      throw new BusinessError('Quantidade em estoque não pode ser negativa');
    }
  }

  public atualizarQuantidade(novaQuantidade: number): void {
    this.validateQuantidade(novaQuantidade);
    this._quantidade = novaQuantidade;
  }

  public adicionarQuantidade(quantidade: number): void {
    if (quantidade <= 0) {
      throw new BusinessError('Quantidade a adicionar deve ser positiva');
    }
    this._quantidade += quantidade;
  }

  public removerQuantidade(quantidade: number): void {
    if (quantidade <= 0) {
      throw new BusinessError('Quantidade a remover deve ser positiva');
    }
    if (this._quantidade < quantidade) {
      throw new BusinessError('Quantidade insuficiente em estoque');
    }
    this._quantidade -= quantidade;
  }

  public isDisponivel(): boolean {
    return this.status === StatusEstoqueItem.DISPONIVEL && this._quantidade > 0;
  }

  public isReservado(): boolean {
    return this.status === StatusEstoqueItem.QUARENTENA;
  }

  public static create(
    almoxarifadoId: string,
    tipoEpiId: string,
    quantidade: number,
    status: StatusEstoqueItem = StatusEstoqueItem.DISPONIVEL,
  ): Omit<EstoqueItem, 'id' | 'createdAt' | 'updatedAt'> {
    if (!almoxarifadoId || !tipoEpiId) {
      throw new BusinessError('Almoxarifado e Tipo de EPI são obrigatórios');
    }

    return {
      almoxarifadoId,
      tipoEpiId,
      quantidade,
      status,
      atualizarQuantidade: EstoqueItem.prototype.atualizarQuantidade,
      adicionarQuantidade: EstoqueItem.prototype.adicionarQuantidade,
      removerQuantidade: EstoqueItem.prototype.removerQuantidade,
      isDisponivel: EstoqueItem.prototype.isDisponivel,
      isReservado: EstoqueItem.prototype.isReservado,
    } as any;
  }
}