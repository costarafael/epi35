import { BusinessError } from '../exceptions/business.exception';
import { CategoriaEPI } from '../enums/categoria-epi.enum';

/**
 * Tipo de status para TipoEPI conforme novo schema
 */
export type StatusTipoEpi = 'ATIVO' | 'DESCONTINUADO';

/**
 * Entidade TipoEPI reformulada conforme nova estrutura:
 * - nomeEquipamento (antes: nome)
 * - numeroCa (antes: ca) 
 * - categoria (novo campo obrigatório)
 * - vidaUtilDias (antes: validadeMeses)
 * - status enum (antes: ativo boolean)
 * - Removidos: codigo, diasAvisoVencimento, exigeAssinaturaEntrega
 */
export class TipoEPI {
  constructor(
    public readonly id: string,
    public readonly nomeEquipamento: string,
    public readonly numeroCa: string,
    public readonly descricao: string | null,
    public readonly categoria: CategoriaEPI,
    public readonly vidaUtilDias: number | null,
    public readonly status: StatusTipoEpi,
    public readonly createdAt: Date,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.nomeEquipamento || this.nomeEquipamento.trim().length === 0) {
      throw new BusinessError('Nome do equipamento é obrigatório');
    }

    if (!this.numeroCa || this.numeroCa.trim().length === 0) {
      throw new BusinessError('Número CA é obrigatório');
    }

    if (this.vidaUtilDias !== null && this.vidaUtilDias <= 0) {
      throw new BusinessError('Vida útil em dias deve ser positiva');
    }

    if (!['ATIVO', 'DESCONTINUADO'].includes(this.status)) {
      throw new BusinessError('Status deve ser ATIVO ou DESCONTINUADO');
    }
  }

  /**
   * Calcula data de vencimento baseado na vida útil em dias
   */
  public calcularDataVencimento(dataEntrega: Date): Date | null {
    if (!this.vidaUtilDias) {
      return null;
    }

    const dataVencimento = new Date(dataEntrega);
    dataVencimento.setDate(dataVencimento.getDate() + this.vidaUtilDias);
    return dataVencimento;
  }

  /**
   * Calcula data de aviso (30 dias antes do vencimento por padrão)
   */
  public calcularDataAvisoVencimento(dataVencimento: Date, diasAviso: number = 30): Date {
    const dataAviso = new Date(dataVencimento);
    dataAviso.setDate(dataAviso.getDate() - diasAviso);
    return dataAviso;
  }

  /**
   * Verifica se está vencido ou próximo do vencimento
   */
  public isVencidoOuProximoVencimento(dataVencimento: Date | null, diasAviso: number = 30): boolean {
    if (!dataVencimento) {
      return false;
    }

    const hoje = new Date();
    const dataAviso = this.calcularDataAvisoVencimento(dataVencimento, diasAviso);
    
    return hoje >= dataAviso;
  }

  /**
   * Verifica se o tipo de EPI está ativo
   */
  public isAtivo(): boolean {
    return this.status === 'ATIVO';
  }

  /**
   * Verifica se o tipo de EPI está descontinuado
   */
  public isDescontinuado(): boolean {
    return this.status === 'DESCONTINUADO';
  }

  /**
   * Converte vida útil de meses para dias (para migração)
   */
  public static mesesParaDias(meses: number): number {
    return meses * 30;
  }

  /**
   * Converte vida útil de dias para meses (para exibição)
   */
  public getVidaUtilMeses(): number | null {
    if (!this.vidaUtilDias) {
      return null;
    }
    return Math.round(this.vidaUtilDias / 30);
  }

  /**
   * Método de criação atualizado para nova estrutura
   */
  public static create(
    nomeEquipamento: string,
    numeroCa: string,
    categoria: CategoriaEPI,
    descricao: string | null = null,
    vidaUtilDias: number | null = null,
    status: StatusTipoEpi = 'ATIVO',
  ): Omit<TipoEPI, 'id' | 'createdAt'> {
    return {
      nomeEquipamento: nomeEquipamento.trim(),
      numeroCa: numeroCa.trim().toUpperCase(),
      categoria,
      descricao: descricao?.trim() || null,
      vidaUtilDias,
      status,
      calcularDataVencimento: TipoEPI.prototype.calcularDataVencimento,
      calcularDataAvisoVencimento: TipoEPI.prototype.calcularDataAvisoVencimento,
      isVencidoOuProximoVencimento: TipoEPI.prototype.isVencidoOuProximoVencimento,
      isAtivo: TipoEPI.prototype.isAtivo,
      isDescontinuado: TipoEPI.prototype.isDescontinuado,
      getVidaUtilMeses: TipoEPI.prototype.getVidaUtilMeses,
    } as any;
  }
}