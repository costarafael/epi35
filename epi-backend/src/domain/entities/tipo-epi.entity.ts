import { BusinessError } from '../exceptions/business.exception';

export class TipoEPI {
  constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly codigo: string,
    public readonly descricao: string | null,
    public readonly ca: string | null,
    public readonly validadeMeses: number | null,
    public readonly diasAvisoVencimento: number,
    public readonly exigeAssinaturaEntrega: boolean,
    public readonly ativo: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.nome || this.nome.trim().length === 0) {
      throw new BusinessError('Nome do tipo de EPI é obrigatório');
    }

    if (!this.codigo || this.codigo.trim().length === 0) {
      throw new BusinessError('Código do tipo de EPI é obrigatório');
    }

    if (this.validadeMeses !== null && this.validadeMeses <= 0) {
      throw new BusinessError('Validade em meses deve ser positiva');
    }

    if (this.diasAvisoVencimento < 0) {
      throw new BusinessError('Dias de aviso de vencimento não pode ser negativo');
    }
  }

  public calcularDataVencimento(dataEntrega: Date): Date | null {
    if (!this.validadeMeses) {
      return null;
    }

    const dataVencimento = new Date(dataEntrega);
    dataVencimento.setMonth(dataVencimento.getMonth() + this.validadeMeses);
    return dataVencimento;
  }

  public calcularDataAvisoVencimento(dataVencimento: Date): Date {
    const dataAviso = new Date(dataVencimento);
    dataAviso.setDate(dataAviso.getDate() - this.diasAvisoVencimento);
    return dataAviso;
  }

  public isVencidoOuProximoVencimento(dataVencimento: Date | null): boolean {
    if (!dataVencimento) {
      return false;
    }

    const hoje = new Date();
    const dataAviso = this.calcularDataAvisoVencimento(dataVencimento);
    
    return hoje >= dataAviso;
  }

  public isAtivo(): boolean {
    return this.ativo;
  }

  public static create(
    nome: string,
    codigo: string,
    descricao: string | null = null,
    ca: string | null = null,
    validadeMeses: number | null = null,
    diasAvisoVencimento: number = 30,
    exigeAssinaturaEntrega: boolean = true,
    ativo: boolean = true,
  ): Omit<TipoEPI, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      nome: nome.trim(),
      codigo: codigo.trim().toUpperCase(),
      descricao: descricao?.trim() || null,
      ca: ca?.trim() || null,
      validadeMeses,
      diasAvisoVencimento,
      exigeAssinaturaEntrega,
      ativo,
      calcularDataVencimento: TipoEPI.prototype.calcularDataVencimento,
      calcularDataAvisoVencimento: TipoEPI.prototype.calcularDataAvisoVencimento,
      isVencidoOuProximoVencimento: TipoEPI.prototype.isVencidoOuProximoVencimento,
      isAtivo: TipoEPI.prototype.isAtivo,
    } as any;
  }
}