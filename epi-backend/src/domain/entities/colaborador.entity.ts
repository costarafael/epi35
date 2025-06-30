import { BusinessError } from '../exceptions/business.exception';

export class Colaborador {
  constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly cpf: string,
    public readonly matricula: string | null,
    public readonly cargo: string | null,
    public readonly setor: string | null,
    public readonly unidadeNegocioId: string,
    public readonly ativo: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.nome || this.nome.trim().length === 0) {
      throw new BusinessError('Nome do colaborador é obrigatório');
    }

    if (!this.cpf || this.cpf.trim().length === 0) {
      throw new BusinessError('CPF do colaborador é obrigatório');
    }

    if (!this.isValidCPF(this.cpf)) {
      throw new BusinessError('CPF inválido');
    }

    if (!this.unidadeNegocioId) {
      throw new BusinessError('Unidade de negócio é obrigatória');
    }
  }

  private isValidCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) {
      return false;
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      return false;
    }

    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
      remainder = 0;
    }
    if (remainder !== parseInt(cleanCPF.charAt(9))) {
      return false;
    }

    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
      remainder = 0;
    }
    if (remainder !== parseInt(cleanCPF.charAt(10))) {
      return false;
    }

    return true;
  }

  public getFormattedCPF(): string {
    const cleanCPF = this.cpf.replace(/\D/g, '');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  public getNomeCompleto(): string {
    if (this.matricula) {
      return `${this.nome} (${this.matricula})`;
    }
    return this.nome;
  }

  public isAtivo(): boolean {
    return this.ativo;
  }

  public static create(
    nome: string,
    cpf: string,
    unidadeNegocioId: string,
    matricula?: string,
    cargo?: string,
    setor?: string,
    ativo: boolean = true,
  ): Omit<Colaborador, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      nome: nome.trim(),
      cpf: cpf.replace(/\D/g, ''), // Armazenar apenas números
      matricula: matricula?.trim() || null,
      cargo: cargo?.trim() || null,
      setor: setor?.trim() || null,
      unidadeNegocioId,
      ativo,
      validate: Colaborador.prototype.validate,
      getFormattedCPF: Colaborador.prototype.getFormattedCPF,
      getNomeCompleto: Colaborador.prototype.getNomeCompleto,
      isAtivo: Colaborador.prototype.isAtivo,
    } as any;
  }
}