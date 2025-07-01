import { vi } from 'vitest';
import { 
  INotaRepository, 
  NotaMovimentacaoFilters, 
  NotaMovimentacaoWithItens 
} from '../../src/domain/interfaces/repositories/nota-repository.interface';
import { NotaMovimentacao } from '../../src/domain/entities/nota-movimentacao.entity';
import { TipoNotaMovimentacao, StatusNotaMovimentacao } from '../../src/domain/enums';

export class MockNotaRepository implements INotaRepository {
  // Base repository methods
  create = vi.fn<[Omit<NotaMovimentacao, 'id' | 'createdAt' | 'updatedAt' | 'dataConclusao'>], Promise<NotaMovimentacao>>();
  findById = vi.fn<[string], Promise<NotaMovimentacao | null>>();
  findAll = vi.fn<[], Promise<NotaMovimentacao[]>>();
  update = vi.fn<[string, Partial<NotaMovimentacao>], Promise<NotaMovimentacao>>();
  delete = vi.fn<[string], Promise<void>>();

  // Specific NotaRepository methods
  createNota = vi.fn<[Omit<NotaMovimentacao, 'id' | 'createdAt' | 'updatedAt' | 'dataConclusao'>], Promise<NotaMovimentacao>>();
  findByNumero = vi.fn<[string], Promise<NotaMovimentacao | null>>();
  findByFilters = vi.fn<[NotaMovimentacaoFilters], Promise<NotaMovimentacao[]>>();
  findRascunhos = vi.fn<[string?], Promise<NotaMovimentacao[]>>();
  findPendentes = vi.fn<[], Promise<NotaMovimentacao[]>>();
  findWithItens = vi.fn<[string], Promise<NotaMovimentacaoWithItens | null>>();
  findByAlmoxarifado = vi.fn<[string, boolean], Promise<NotaMovimentacao[]>>();
  gerarProximoNumero = vi.fn<[TipoNotaMovimentacao], Promise<string>>();
  concluirNota = vi.fn<[string, string, Date?], Promise<NotaMovimentacao>>();
  cancelarNota = vi.fn<[string, string, string?], Promise<NotaMovimentacao>>();
  adicionarItem = vi.fn<[string, string, number, string?], Promise<void>>();
  removerItem = vi.fn<[string, string], Promise<void>>();
  atualizarQuantidadeItem = vi.fn<[string, string, number], Promise<void>>();
  atualizarQuantidadeProcessada = vi.fn<[string, string, number], Promise<void>>();
  obterEstatisticas = vi.fn<[Date, Date, string?], Promise<{
    totalNotas: number;
    notasConcluidas: number;
    notasCanceladas: number;
    notasRascunho: number;
    totalItens: number;
    totalQuantidade: number;
  }>>();
  obterNotasVencidas = vi.fn<[], Promise<NotaMovimentacao[]>>();

  // Helper methods for testing
  reset(): void {
    vi.clearAllMocks();
    
    // Reset all mocks to default implementations
    this.create.mockResolvedValue({} as NotaMovimentacao);
    this.findById.mockResolvedValue(null);
    this.findAll.mockResolvedValue([]);
    this.update.mockResolvedValue({} as NotaMovimentacao);
    this.delete.mockResolvedValue(undefined);
    
    this.createNota.mockResolvedValue({} as NotaMovimentacao);
    this.findByNumero.mockResolvedValue(null);
    this.findByFilters.mockResolvedValue([]);
    this.findRascunhos.mockResolvedValue([]);
    this.findPendentes.mockResolvedValue([]);
    this.findWithItens.mockResolvedValue(null);
    this.findByAlmoxarifado.mockResolvedValue([]);
    this.gerarProximoNumero.mockResolvedValue('TEST-001');
    this.concluirNota.mockResolvedValue({} as NotaMovimentacao);
    this.cancelarNota.mockResolvedValue({} as NotaMovimentacao);
    this.adicionarItem.mockResolvedValue(undefined);
    this.removerItem.mockResolvedValue(undefined);
    this.atualizarQuantidadeItem.mockResolvedValue(undefined);
    this.atualizarQuantidadeProcessada.mockResolvedValue(undefined);
    this.obterEstatisticas.mockResolvedValue({
      totalNotas: 0,
      notasConcluidas: 0,
      notasCanceladas: 0,
      notasRascunho: 0,
      totalItens: 0,
      totalQuantidade: 0
    });
    this.obterNotasVencidas.mockResolvedValue([]);
  }

  // Common setup methods for testing scenarios
  setupSuccessfulCreation(nota: NotaMovimentacao): void {
    this.gerarProximoNumero.mockResolvedValue(nota.numero);
    this.createNota.mockResolvedValue(nota);
  }

  setupNotaFound(notaId: string): void {
    this.findById.mockImplementation((id) => 
      id === notaId ? Promise.resolve(null) : Promise.resolve({} as NotaMovimentacao)
    );
  }

  setupNotaExists(nota: NotaMovimentacao): void {
    this.findById.mockImplementation((id) => 
      id === nota.id ? Promise.resolve(nota) : Promise.resolve(null)
    );
    this.findWithItens.mockImplementation((id) => 
      id === nota.id ? Promise.resolve(nota as NotaMovimentacaoWithItens) : Promise.resolve(null)
    );
  }

  setupRascunhosList(notas: NotaMovimentacao[], usuarioId?: string): void {
    this.findRascunhos.mockImplementation((userId) => {
      if (usuarioId && userId === usuarioId) {
        return Promise.resolve(notas.filter(n => n.usuarioId === usuarioId));
      }
      return Promise.resolve(notas);
    });
  }

  setupItemOperations(): void {
    this.adicionarItem.mockResolvedValue(undefined);
    this.removerItem.mockResolvedValue(undefined);
    this.atualizarQuantidadeItem.mockResolvedValue(undefined);
  }

  setupUpdateOperations(updatedNota: NotaMovimentacao): void {
    this.update.mockResolvedValue(updatedNota);
  }

  setupDeleteOperations(): void {
    this.delete.mockResolvedValue(undefined);
  }
}

export const createMockNotaRepository = (): MockNotaRepository => {
  const mock = new MockNotaRepository();
  mock.reset();
  return mock;
};