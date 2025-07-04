import { BusinessError } from '../exceptions/business.exception';

export class Contratada {
  constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly cnpj: string,
    public readonly createdAt: Date,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.nome || this.nome.trim().length === 0) {
      throw new BusinessError('Nome da contratada é obrigatório');
    }

    if (this.nome.trim().length > 255) {
      throw new BusinessError('Nome da contratada deve ter no máximo 255 caracteres');
    }

    if (!this.cnpj || this.cnpj.trim().length === 0) {
      throw new BusinessError('CNPJ da contratada é obrigatório');
    }

    if (!this.isValidCNPJ(this.cnpj)) {
      throw new BusinessError('CNPJ inválido');
    }
  }

  private isValidCNPJ(cnpj: string): boolean {
    // Remove caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cleanCNPJ.length !== 14) {
      return false;
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      return false;
    }

    // Validação do primeiro dígito verificador
    let sum = 0;
    let multiplier = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ.charAt(i)) * multiplier;
      multiplier--;
      if (multiplier < 2) {
        multiplier = 9;
      }
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (digit1 !== parseInt(cleanCNPJ.charAt(12))) {
      return false;
    }

    // Validação do segundo dígito verificador
    sum = 0;
    multiplier = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ.charAt(i)) * multiplier;
      multiplier--;
      if (multiplier < 2) {
        multiplier = 9;
      }
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    if (digit2 !== parseInt(cleanCNPJ.charAt(13))) {
      return false;
    }

    return true;
  }

  public getFormattedCNPJ(): string {
    const cleanCNPJ = this.cnpj.replace(/\D/g, '');
    return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  public getIdentificacao(): string {
    return `${this.nome} (${this.getFormattedCNPJ()})`;
  }

  public static create(
    nome: string,
    cnpj: string,
  ): Omit<Contratada, 'id' | 'createdAt'> {
    // Criar uma instância temporária para validação
    const tempContratada = new Contratada(
      'temp-id',
      nome.trim(),
      cnpj.replace(/\D/g, ''),
      new Date()
    );
    
    // Se chegou aqui, a validação passou
    return {
      nome: nome.trim(),
      cnpj: cnpj.replace(/\D/g, ''), // Armazenar apenas números
      getFormattedCNPJ: tempContratada.getFormattedCNPJ.bind(tempContratada),
      getIdentificacao: tempContratada.getIdentificacao.bind(tempContratada),
    };
  }
}