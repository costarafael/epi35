import { TipoEPI } from '@domain/entities';
import { randomUUID } from 'crypto';

/**
 * Factory para criar instâncias de TipoEPI para testes
 */
export class TipoEpiFactory {
  private static counter = 0;

  static create(overrides: Partial<TipoEPI> = {}): TipoEPI {
    const id = overrides.id ?? randomUUID();
    const counter = ++this.counter;
    const now = new Date();

    const defaults = {
      id,
      nome: overrides.nome ?? `Capacete Tipo ${counter}`,
      codigo: overrides.codigo ?? `CAP${counter.toString().padStart(3, '0')}`,
      descricao: overrides.descricao ?? `Descrição do capacete tipo ${counter}`,
      ca: overrides.ca ?? `12345${counter}`,
      validadeMeses: overrides.validadeMeses ?? 12,
      diasAvisoVencimento: overrides.diasAvisoVencimento ?? 30,
      exigeAssinaturaEntrega: overrides.exigeAssinaturaEntrega ?? true,
      ativo: overrides.ativo ?? true,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    };

    return new TipoEPI(
      defaults.id,
      defaults.nome,
      defaults.codigo,
      defaults.descricao,
      defaults.ca,
      defaults.validadeMeses,
      defaults.diasAvisoVencimento,
      defaults.exigeAssinaturaEntrega,
      defaults.ativo,
      defaults.createdAt,
      defaults.updatedAt,
    );
  }

  static createMany(count: number, overrides: Partial<TipoEPI> = {}): TipoEPI[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createCapacete(overrides: Partial<TipoEPI> = {}): TipoEPI {
    return this.create({
      nome: 'Capacete de Segurança',
      codigo: 'CAP001',
      descricao: 'Capacete de segurança classe A',
      ca: '12345',
      validadeMeses: 24,
      ...overrides,
    });
  }

  static createLuva(overrides: Partial<TipoEPI> = {}): TipoEPI {
    return this.create({
      nome: 'Luva de Segurança',
      codigo: 'LUV001',
      descricao: 'Luva de segurança em couro',
      ca: '23456',
      validadeMeses: 6,
      ...overrides,
    });
  }

  static createOculos(overrides: Partial<TipoEPI> = {}): TipoEPI {
    return this.create({
      nome: 'Óculos de Proteção',
      codigo: 'OCU001',
      descricao: 'Óculos de proteção contra impactos',
      ca: '34567',
      validadeMeses: 12,
      ...overrides,
    });
  }

  static createSemValidade(overrides: Partial<TipoEPI> = {}): TipoEPI {
    return this.create({
      nome: 'Cinto de Segurança',
      codigo: 'CIN001',
      descricao: 'Cinto de segurança para trabalho em altura',
      ca: '45678',
      validadeMeses: null,
      ...overrides,
    });
  }

  static createInativo(overrides: Partial<TipoEPI> = {}): TipoEPI {
    return this.create({
      nome: 'EPI Descontinuado',
      codigo: 'DESC001',
      ativo: false,
      ...overrides,
    });
  }

  /**
   * Cria um TipoEPI mínimo para testes que precisam apenas dos campos obrigatórios
   */
  static createMinimal(overrides: Partial<TipoEPI> = {}): TipoEPI {
    const counter = ++this.counter;
    return this.create({
      nome: `EPI Mínimo ${counter}`,
      codigo: `MIN${counter}`,
      descricao: null,
      ca: null,
      validadeMeses: null,
      diasAvisoVencimento: 0,
      exigeAssinaturaEntrega: false,
      ...overrides,
    });
  }

  /**
   * Reset do contador para testes determinísticos
   */
  static resetCounter(): void {
    this.counter = 0;
  }
}
