import { StatusNotaMovimentacao, TipoNotaMovimentacao } from '../enums';
import { BusinessError } from '../exceptions/business.exception';

export interface NotaMovimentacaoItem {
  id?: string;
  tipoEpiId: string;
  quantidade: number;
  quantidadeProcessada: number;
  observacoes?: string;
}

export class NotaMovimentacao {
  constructor(
    public readonly id: string,
    public readonly numero: string,
    public readonly tipo: TipoNotaMovimentacao,
    public readonly almoxarifadoOrigemId: string | null,
    public readonly almoxarifadoDestinoId: string | null,
    public readonly usuarioId: string,
    public readonly observacoes: string | null,
    private _status: StatusNotaMovimentacao,
    public readonly dataConclusao: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    private _itens: NotaMovimentacaoItem[] = [],
  ) {
    this.validate();
  }

  get status(): StatusNotaMovimentacao {
    return this._status;
  }

  get itens(): readonly NotaMovimentacaoItem[] {
    return this._itens;
  }

  private validate(): void {
    if (!this.numero || this.numero.trim().length === 0) {
      throw new BusinessError('Número da nota é obrigatório');
    }

    if (!this.usuarioId) {
      throw new BusinessError('Usuário é obrigatório');
    }

    this.validateAlmoxarifados();
  }

  private validateAlmoxarifados(): void {
    switch (this.tipo) {
      case TipoNotaMovimentacao.ENTRADA:
        if (!this.almoxarifadoDestinoId) {
          throw new BusinessError('Almoxarifado de destino é obrigatório para entrada');
        }
        if (this.almoxarifadoOrigemId) {
          throw new BusinessError('Almoxarifado de origem não deve ser informado para entrada');
        }
        break;

      case TipoNotaMovimentacao.TRANSFERENCIA:
        if (!this.almoxarifadoOrigemId || !this.almoxarifadoDestinoId) {
          throw new BusinessError('Almoxarifados de origem e destino são obrigatórios para transferência');
        }
        if (this.almoxarifadoOrigemId === this.almoxarifadoDestinoId) {
          throw new BusinessError('Almoxarifado de origem deve ser diferente do destino');
        }
        break;

      case TipoNotaMovimentacao.DESCARTE:
        if (!this.almoxarifadoOrigemId) {
          throw new BusinessError('Almoxarifado de origem é obrigatório para descarte');
        }
        
        break;

      case TipoNotaMovimentacao.AJUSTE:
        if (!this.almoxarifadoDestinoId) {
          throw new BusinessError('Almoxarifado de destino é obrigatório para ajuste');
        }
        break;
    }
  }

  public isRascunho(): boolean {
    return this._status === StatusNotaMovimentacao.RASCUNHO;
  }

  public isConcluida(): boolean {
    return this._status === StatusNotaMovimentacao.CONCLUIDA;
  }

  public isCancelada(): boolean {
    return this._status === StatusNotaMovimentacao.CANCELADA;
  }

  public isEditavel(): boolean {
    return this.isRascunho();
  }

  public isCancelavel(): boolean {
    // Notas em RASCUNHO podem ser canceladas
    // Notas CONCLUIDAS não podem ser canceladas
    return this._status === StatusNotaMovimentacao.RASCUNHO;
  }

  public adicionarItem(tipoEpiId: string, quantidade: number, observacoes?: string): void {
    if (!this.isEditavel()) {
      throw new BusinessError('Nota não está em modo de edição');
    }

    if (quantidade <= 0) {
      throw new BusinessError('Quantidade deve ser positiva');
    }

    // Verificar se já existe item para este tipo de EPI
    const itemExistente = this._itens.find(item => item.tipoEpiId === tipoEpiId);
    if (itemExistente) {
      throw new BusinessError('Tipo de EPI já adicionado na nota');
    }

    this._itens.push({
      tipoEpiId,
      quantidade,
      quantidadeProcessada: 0,
      observacoes,
    });
  }

  public removerItem(tipoEpiId: string): void {
    if (!this.isEditavel()) {
      throw new BusinessError('Nota não está em modo de edição');
    }

    const index = this._itens.findIndex(item => item.tipoEpiId === tipoEpiId);
    if (index === -1) {
      throw new BusinessError('Item não encontrado na nota');
    }

    this._itens.splice(index, 1);
  }

  public atualizarQuantidadeItem(tipoEpiId: string, quantidade: number): void {
    if (!this.isEditavel()) {
      throw new BusinessError('Nota não está em modo de edição');
    }

    if (quantidade <= 0) {
      throw new BusinessError('Quantidade deve ser positiva');
    }

    const item = this._itens.find(item => item.tipoEpiId === tipoEpiId);
    if (!item) {
      throw new BusinessError('Item não encontrado na nota');
    }

    item.quantidade = quantidade;
  }

  public concluir(): void {
    if (!this.isRascunho()) {
      throw new BusinessError('Apenas notas em rascunho podem ser concluídas');
    }

    if (this._itens.length === 0) {
      throw new BusinessError('Nota deve ter pelo menos um item');
    }

    this._status = StatusNotaMovimentacao.CONCLUIDA;
  }

  public cancelar(): void {
    if (!this.isCancelavel()) {
      throw new BusinessError('Nota não pode ser cancelada');
    }

    this._status = StatusNotaMovimentacao.CANCELADA;
  }

  public static create(
    numero: string,
    tipo: TipoNotaMovimentacao,
    usuarioId: string,
    almoxarifadoOrigemId?: string,
    almoxarifadoDestinoId?: string,
    observacoes?: string,
  ): Omit<NotaMovimentacao, 'id' | 'createdAt' | 'updatedAt' | 'dataConclusao'> {
    return {
      numero: numero.trim().toUpperCase(),
      tipo,
      almoxarifadoOrigemId: almoxarifadoOrigemId || null,
      almoxarifadoDestinoId: almoxarifadoDestinoId || null,
      usuarioId,
      observacoes: observacoes?.trim() || null,
      status: StatusNotaMovimentacao.RASCUNHO,
      itens: [],
      isRascunho: NotaMovimentacao.prototype.isRascunho,
      isConcluida: NotaMovimentacao.prototype.isConcluida,
      isCancelada: NotaMovimentacao.prototype.isCancelada,
      isEditavel: NotaMovimentacao.prototype.isEditavel,
      isCancelavel: NotaMovimentacao.prototype.isCancelavel,
      adicionarItem: NotaMovimentacao.prototype.adicionarItem,
      removerItem: NotaMovimentacao.prototype.removerItem,
      atualizarQuantidadeItem: NotaMovimentacao.prototype.atualizarQuantidadeItem,
      concluir: NotaMovimentacao.prototype.concluir,
      cancelar: NotaMovimentacao.prototype.cancelar,
    } as any;
  }
}