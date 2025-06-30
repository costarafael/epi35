import { StatusFichaEPI } from '../enums';
import { BusinessError } from '../exceptions/business.exception';

export class FichaEPI {
  constructor(
    public readonly id: string,
    public readonly colaboradorId: string,
    public readonly tipoEpiId: string,
    public readonly almoxarifadoId: string,
    private _status: StatusFichaEPI,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validate();
  }

  get status(): StatusFichaEPI {
    return this._status;
  }

  private validate(): void {
    if (!this.colaboradorId) {
      throw new BusinessError('Colaborador é obrigatório');
    }

    if (!this.tipoEpiId) {
      throw new BusinessError('Tipo de EPI é obrigatório');
    }

    if (!this.almoxarifadoId) {
      throw new BusinessError('Almoxarifado é obrigatório');
    }
  }

  public isAtiva(): boolean {
    return this._status === StatusFichaEPI.ATIVA;
  }

  public isInativa(): boolean {
    return this._status === StatusFichaEPI.INATIVA;
  }

  public isSuspensa(): boolean {
    return this._status === StatusFichaEPI.SUSPENSA;
  }

  public podeReceberEntrega(): boolean {
    return this.isAtiva();
  }

  public ativar(): void {
    if (this.isAtiva()) {
      throw new BusinessError('Ficha já está ativa');
    }
    this._status = StatusFichaEPI.ATIVA;
  }

  public inativar(): void {
    if (this.isInativa()) {
      throw new BusinessError('Ficha já está inativa');
    }
    this._status = StatusFichaEPI.INATIVA;
  }

  public suspender(): void {
    if (this.isSuspensa()) {
      throw new BusinessError('Ficha já está suspensa');
    }
    this._status = StatusFichaEPI.SUSPENSA;
  }

  public getChaveUnica(): string {
    return `${this.colaboradorId}-${this.tipoEpiId}-${this.almoxarifadoId}`;
  }

  public static create(
    colaboradorId: string,
    tipoEpiId: string,
    almoxarifadoId: string,
    status: StatusFichaEPI = StatusFichaEPI.ATIVA,
  ): Omit<FichaEPI, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      colaboradorId,
      tipoEpiId,
      almoxarifadoId,
      status,
      isAtiva: FichaEPI.prototype.isAtiva,
      isInativa: FichaEPI.prototype.isInativa,
      isSuspensa: FichaEPI.prototype.isSuspensa,
      podeReceberEntrega: FichaEPI.prototype.podeReceberEntrega,
      ativar: FichaEPI.prototype.ativar,
      inativar: FichaEPI.prototype.inativar,
      suspender: FichaEPI.prototype.suspender,
      getChaveUnica: FichaEPI.prototype.getChaveUnica,
    } as any;
  }
}