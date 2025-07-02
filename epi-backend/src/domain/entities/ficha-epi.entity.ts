import { StatusFichaEPI } from '../enums';
import { BusinessError } from '../exceptions/business.exception';

/**
 * Entidade FichaEPI reformulada conforme nova estrutura:
 * - Uma ficha por colaborador (não mais por tipo de EPI)
 * - Colaborador UNIQUE constraint
 * - Campos: colaboradorId, dataEmissao, status
 */
export class FichaEPI {
  constructor(
    public readonly id: string,
    public readonly colaboradorId: string,
    public readonly dataEmissao: Date,
    private _status: StatusFichaEPI,
    public readonly createdAt: Date,
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

    if (!this.dataEmissao) {
      throw new BusinessError('Data de emissão é obrigatória');
    }

    if (this.dataEmissao > new Date()) {
      throw new BusinessError('Data de emissão não pode ser futura');
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

  /**
   * Nova chave única baseada apenas no colaborador
   * (uma ficha por colaborador)
   */
  public getChaveUnica(): string {
    return this.colaboradorId;
  }

  /**
   * Verifica se a ficha pode ser inativada
   * (não deve ter entregas pendentes)
   */
  public podeSerInativada(): boolean {
    return this.isAtiva();
  }

  /**
   * Método de criação atualizado para nova estrutura
   */
  public static create(
    colaboradorId: string,
    status: StatusFichaEPI = StatusFichaEPI.ATIVA,
    dataEmissao: Date = new Date(),
  ): Omit<FichaEPI, 'id' | 'createdAt'> {
    return {
      colaboradorId,
      dataEmissao,
      status,
      isAtiva: FichaEPI.prototype.isAtiva,
      isInativa: FichaEPI.prototype.isInativa,
      isSuspensa: FichaEPI.prototype.isSuspensa,
      podeReceberEntrega: FichaEPI.prototype.podeReceberEntrega,
      ativar: FichaEPI.prototype.ativar,
      inativar: FichaEPI.prototype.inativar,
      suspender: FichaEPI.prototype.suspender,
      getChaveUnica: FichaEPI.prototype.getChaveUnica,
      podeSerInativada: FichaEPI.prototype.podeSerInativada,
    } as any;
  }
}