import { EstoqueItem } from '@domain/entities';
import { StatusEstoqueItem } from '@domain/enums';
import { randomUUID } from 'crypto';
import { TipoEpiFactory } from './tipo-epi.factory';

/**
 * Factory para criar instâncias de EstoqueItem para testes
 */
export class EstoqueItemFactory {
  private static counter = 0;

  static create(overrides: Partial<EstoqueItem> = {}): EstoqueItem {
    const id = overrides.id ?? randomUUID();
    const counter = ++this.counter;
    const now = new Date();

    const defaults = {
      id,
      almoxarifadoId: overrides.almoxarifadoId ?? randomUUID(),
      tipoEpiId: overrides.tipoEpiId ?? randomUUID(),
      quantidade: overrides.quantidade ?? 10,
      status: overrides.status ?? StatusEstoqueItem.DISPONIVEL,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    };

    return new EstoqueItem(
      defaults.id,
      defaults.almoxarifadoId,
      defaults.tipoEpiId,
      defaults.quantidade,
      defaults.status,
      defaults.createdAt,
      defaults.updatedAt,
    );
  }

  static createMany(count: number, overrides: Partial<EstoqueItem> = {}): EstoqueItem[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createDisponivel(overrides: Partial<EstoqueItem> = {}): EstoqueItem {
    return this.create({
      status: StatusEstoqueItem.DISPONIVEL,
      quantidade: 50,
      ...overrides,
    });
  }

  static createReservado(overrides: Partial<EstoqueItem> = {}): EstoqueItem {
    return this.create({
      status: StatusEstoqueItem.RESERVADO,
      quantidade: 10,
      ...overrides,
    });
  }

  static createAguardandoInspecao(overrides: Partial<EstoqueItem> = {}): EstoqueItem {
    return this.create({
      status: StatusEstoqueItem.AGUARDANDO_INSPECAO,
      quantidade: 5,
      ...overrides,
    });
  }

  static createDescartado(overrides: Partial<EstoqueItem> = {}): EstoqueItem {
    return this.create({
      status: StatusEstoqueItem.DESCARTADO,
      quantidade: 0,
      ...overrides,
    });
  }

  static createComQuantidadeZero(overrides: Partial<EstoqueItem> = {}): EstoqueItem {
    return this.create({
      quantidade: 0,
      ...overrides,
    });
  }

  static createComQuantidadeAlta(overrides: Partial<EstoqueItem> = {}): EstoqueItem {
    return this.create({
      quantidade: 1000,
      ...overrides,
    });
  }

  static createComQuantidadeBaixa(overrides: Partial<EstoqueItem> = {}): EstoqueItem {
    return this.create({
      quantidade: 1,
      ...overrides,
    });
  }

  /**
   * Cria um item de estoque com um tipo de EPI específico
   */
  static createComTipoEpi(tipoEpiId: string, overrides: Partial<EstoqueItem> = {}): EstoqueItem {
    return this.create({
      tipoEpiId,
      ...overrides,
    });
  }

  /**
   * Cria múltiplos itens de estoque para o mesmo almoxarifado
   */
  static createManyForAlmoxarifado(
    almoxarifadoId: string,
    count: number,
    overrides: Partial<EstoqueItem> = {},
  ): EstoqueItem[] {
    return Array.from({ length: count }, () =>
      this.create({
        almoxarifadoId,
        ...overrides,
      }),
    );
  }

  /**
   * Cria itens de estoque com diferentes status para testes
   */
  static createVariedStatuses(almoxarifadoId?: string): EstoqueItem[] {
    const baseAlmoxarifadoId = almoxarifadoId ?? randomUUID();
    const tipoEpiId = randomUUID();

    return [
      this.createDisponivel({ almoxarifadoId: baseAlmoxarifadoId, tipoEpiId }),
      this.createReservado({ almoxarifadoId: baseAlmoxarifadoId, tipoEpiId }),
      this.createAguardandoInspecao({ almoxarifadoId: baseAlmoxarifadoId, tipoEpiId }),
      this.createDescartado({ almoxarifadoId: baseAlmoxarifadoId, tipoEpiId }),
    ];
  }

  /**
   * Cria um cenário completo de estoque para testes de integração
   */
  static createCompleteScenario(): {
    almoxarifadoId: string;
    tipoEpiId: string;
    items: EstoqueItem[];
  } {
    const almoxarifadoId = randomUUID();
    const tipoEpiId = randomUUID();

    const items = [
      this.createDisponivel({ almoxarifadoId, tipoEpiId, quantidade: 100 }),
      this.createReservado({ almoxarifadoId, tipoEpiId, quantidade: 20 }),
      this.createAguardandoInspecao({ almoxarifadoId, tipoEpiId, quantidade: 10 }),
    ];

    return { almoxarifadoId, tipoEpiId, items };
  }

  /**
   * Reset do contador para testes determinísticos
   */
  static resetCounter(): void {
    this.counter = 0;
  }
}
