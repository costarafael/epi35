import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  CancelarNotaMovimentacaoUseCase, 
  CancelarNotaInput,
  ResultadoCancelamento,
  EstornoMovimentacao
} from '@application/use-cases/estoque/cancelar-nota-movimentacao.use-case';
import { NotaMovimentacao } from '@domain/entities/nota-movimentacao.entity';
import { MovimentacaoEstoque } from '@domain/entities/movimentacao-estoque.entity';
import { EstoqueItem } from '@domain/entities/estoque-item.entity';
import { 
  StatusNotaMovimentacao, 
  TipoNotaMovimentacao, 
  TipoMovimentacao,
  StatusEstoqueItem
} from '@domain/enums';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';
import { INotaRepository } from '@domain/interfaces/repositories/nota-repository.interface';
import { IMovimentacaoRepository } from '@domain/interfaces/repositories/movimentacao-repository.interface';
import { IEstoqueRepository } from '@domain/interfaces/repositories/estoque-repository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('CancelarNotaMovimentacaoUseCase', () => {
  let useCase: CancelarNotaMovimentacaoUseCase;
  let mockNotaRepository: vi.Mocked<INotaRepository>;
  let mockMovimentacaoRepository: vi.Mocked<IMovimentacaoRepository>;
  let mockEstoqueRepository: vi.Mocked<IEstoqueRepository>;
  let mockPrismaService: vi.Mocked<PrismaService>;

  const mockUsuarioId = 'user-123';
  const mockNotaId = 'nota-456';
  const mockAlmoxarifadoId = 'almox-789';
  const mockTipoEpiId = 'tipo-epi-321';

  beforeEach(() => {
    // Mock repositories
    mockNotaRepository = {
      findById: vi.fn(),
      cancelarNota: vi.fn(),
      createNota: vi.fn(),
      findByNumero: vi.fn(),
      findByFilters: vi.fn(),
      findRascunhos: vi.fn(),
      findPendentes: vi.fn(),
      findWithItens: vi.fn(),
      findByAlmoxarifado: vi.fn(),
      gerarProximoNumero: vi.fn(),
      concluirNota: vi.fn(),
      adicionarItem: vi.fn(),
      removerItem: vi.fn(),
      atualizarQuantidadeItem: vi.fn(),
      atualizarQuantidadeProcessada: vi.fn(),
      obterEstatisticas: vi.fn(),
      obterNotasVencidas: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    };

    mockMovimentacaoRepository = {
      findByNotaMovimentacao: vi.fn(),
      criarEstorno: vi.fn(),
      findByAlmoxarifadoAndTipo: vi.fn(),
      findByFilters: vi.fn(),
      obterUltimaSaldo: vi.fn(),
      obterKardex: vi.fn(),
      createMovimentacao: vi.fn(),
      findEstornaveis: vi.fn(),
      obterResumoMovimentacoes: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    };

    mockEstoqueRepository = {
      findByAlmoxarifadoAndTipo: vi.fn(),
      removerQuantidade: vi.fn(),
      adicionarQuantidade: vi.fn(),
      atualizarQuantidade: vi.fn(),
      findByAlmoxarifado: vi.fn(),
      findByTipoEpi: vi.fn(),
      findDisponiveis: vi.fn(),
      verificarDisponibilidade: vi.fn(),
      obterSaldoTotal: vi.fn(),
      obterSaldoPorAlmoxarifado: vi.fn(),
      criarOuAtualizar: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
    };

    mockPrismaService = {
      $transaction: vi.fn(),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    } as any;

    useCase = new CancelarNotaMovimentacaoUseCase(
      mockNotaRepository,
      mockMovimentacaoRepository,
      mockEstoqueRepository,
      mockPrismaService,
    );
  });

  describe('execute', () => {
    describe('when nota does not exist', () => {
      it('should throw NotFoundError', async () => {
        // Arrange
        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        mockNotaRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new NotFoundError('Nota de movimentação', mockNotaId)
        );

        expect(mockNotaRepository.findById).toHaveBeenCalledWith(mockNotaId);
      });
    });

    describe('when nota cannot be cancelled', () => {
      it('should throw BusinessError for draft notes', async () => {
        // Arrange
        const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.RASCUNHO);
        mockNota.isCancelavel = vi.fn().mockReturnValue(false);

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        mockNotaRepository.findById.mockResolvedValue(mockNota);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Nota não pode ser cancelada')
        );

        expect(mockNota.isCancelavel).toHaveBeenCalled();
      });

      it('should throw BusinessError for already cancelled notes', async () => {
        // Arrange
        const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.CANCELADA);
        mockNota.isCancelavel = vi.fn().mockReturnValue(false);

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        mockNotaRepository.findById.mockResolvedValue(mockNota);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Nota não pode ser cancelada')
        );
      });
    });

    describe('simple cancellation (draft notes)', () => {
      it('should cancel draft note without estorno', async () => {
        // Arrange
        const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.RASCUNHO);
        mockNota.isCancelavel = vi.fn().mockReturnValue(true);
        mockNota.isConcluida = vi.fn().mockReturnValue(false);

        const mockNotaCancelada = { ...mockNota, status: StatusNotaMovimentacao.CANCELADA };

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
          motivo: 'Erro no lançamento',
        };

        mockNotaRepository.findById.mockResolvedValue(mockNota);
        mockNotaRepository.cancelarNota.mockResolvedValue(mockNotaCancelada as any);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual({
          notaCancelada: mockNotaCancelada,
          estornosGerados: [],
          estoqueAjustado: false,
        });

        expect(mockNotaRepository.cancelarNota).toHaveBeenCalledWith(
          mockNotaId,
          mockUsuarioId,
          'Erro no lançamento'
        );
        expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      });
    });

    describe('cancellation with estorno (concluded notes)', () => {
      it('should cancel concluded note with estorno when gerarEstorno is not false', async () => {
        // Arrange
        const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.CONCLUIDA);
        mockNota.isCancelavel = vi.fn().mockReturnValue(true);
        mockNota.isConcluida = vi.fn().mockReturnValue(true);

        const mockMovimentacao = createMockMovimentacaoEstoque(TipoMovimentacao.ENTRADA);
        const mockEstorno = createMockMovimentacaoEstoque(TipoMovimentacao.ESTORNO);
        const mockNotaCancelada = { ...mockNota, status: StatusNotaMovimentacao.CANCELADA };

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
          motivo: 'Necessário estorno',
          gerarEstorno: true,
        };

        mockNotaRepository.findById.mockResolvedValue(mockNota);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([mockMovimentacao]);
        mockMovimentacaoRepository.criarEstorno.mockResolvedValue(mockEstorno);
        mockNotaRepository.cancelarNota.mockResolvedValue(mockNotaCancelada as any);

        // Mock transaction
        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          return await callback({} as any);
        });

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.notaCancelada).toEqual(mockNotaCancelada);
        expect(result.estornosGerados).toHaveLength(1);
        expect(result.estoqueAjustado).toBe(true);
        expect(result.estornosGerados[0]).toEqual({
          movimentacaoOriginalId: mockMovimentacao.id,
          movimentacaoEstornoId: mockEstorno.id,
          tipoEpiId: mockMovimentacao.tipoEpiId,
          quantidade: mockMovimentacao.quantidade,
          saldoAnterior: mockEstorno.saldoAnterior,
          saldoPosterior: mockEstorno.saldoPosterior,
        });

        expect(mockPrismaService.$transaction).toHaveBeenCalled();
        expect(mockMovimentacaoRepository.findByNotaMovimentacao).toHaveBeenCalledWith(mockNotaId);
        expect(mockMovimentacaoRepository.criarEstorno).toHaveBeenCalledWith(
          mockMovimentacao.id,
          mockUsuarioId,
          `Estorno por cancelamento da nota ${mockNota.numero}. Motivo: Necessário estorno`
        );
      });

      it('should use simple cancellation when gerarEstorno is false', async () => {
        // Arrange
        const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.CONCLUIDA);
        mockNota.isCancelavel = vi.fn().mockReturnValue(true);
        mockNota.isConcluida = vi.fn().mockReturnValue(true);

        const mockNotaCancelada = { ...mockNota, status: StatusNotaMovimentacao.CANCELADA };

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
          gerarEstorno: false,
        };

        mockNotaRepository.findById.mockResolvedValue(mockNota);
        mockNotaRepository.cancelarNota.mockResolvedValue(mockNotaCancelada as any);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual({
          notaCancelada: mockNotaCancelada,
          estornosGerados: [],
          estoqueAjustado: false,
        });

        expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      });

      it('should throw error when no movimentacoes exist for estorno', async () => {
        // Arrange
        const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.CONCLUIDA);
        mockNota.isCancelavel = vi.fn().mockReturnValue(true);
        mockNota.isConcluida = vi.fn().mockReturnValue(true);

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        mockNotaRepository.findById.mockResolvedValue(mockNota);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([]);

        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          return await callback({} as any);
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Nota não possui movimentações para estornar')
        );
      });

      it('should throw error when movimentacao is not estornavel', async () => {
        // Arrange
        const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.CONCLUIDA);
        mockNota.isCancelavel = vi.fn().mockReturnValue(true);
        mockNota.isConcluida = vi.fn().mockReturnValue(true);

        const mockMovimentacao = createMockMovimentacaoEstoque(TipoMovimentacao.ESTORNO);
        mockMovimentacao.isEstornavel = vi.fn().mockReturnValue(false);

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        mockNotaRepository.findById.mockResolvedValue(mockNota);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([mockMovimentacao]);

        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          return await callback({} as any);
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError(`Movimentação ${mockMovimentacao.id} não pode ser estornada`)
        );
      });
    });

    describe('estorno logic by movement type', () => {
      const setupEstornoTest = (tipoNota: TipoNotaMovimentacao, tipoMovimentacao: TipoMovimentacao) => {
        const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.CONCLUIDA, tipoNota);
        mockNota.isCancelavel = vi.fn().mockReturnValue(true);
        mockNota.isConcluida = vi.fn().mockReturnValue(true);

        const mockMovimentacao = createMockMovimentacaoEstoque(tipoMovimentacao);
        const mockEstorno = createMockMovimentacaoEstoque(TipoMovimentacao.ESTORNO);
        const mockNotaCancelada = { ...mockNota, status: StatusNotaMovimentacao.CANCELADA };

        mockNotaRepository.findById.mockResolvedValue(mockNota);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([mockMovimentacao]);
        mockMovimentacaoRepository.criarEstorno.mockResolvedValue(mockEstorno);
        mockNotaRepository.cancelarNota.mockResolvedValue(mockNotaCancelada as any);

        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          return await callback({} as any);
        });

        return { mockNota, mockMovimentacao, mockEstorno };
      };

      it('should handle ENTRADA estorno by removing from stock', async () => {
        // Arrange
        const { mockMovimentacao } = setupEstornoTest(
          TipoNotaMovimentacao.ENTRADA, 
          TipoMovimentacao.ENTRADA
        );

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockEstoqueRepository.removerQuantidade).toHaveBeenCalledWith(
          mockMovimentacao.almoxarifadoId,
          mockMovimentacao.tipoEpiId,
          StatusEstoqueItem.DISPONIVEL,
          mockMovimentacao.quantidade
        );
      });

      it('should handle DESCARTE estorno by adding back to stock', async () => {
        // Arrange
        const { mockMovimentacao } = setupEstornoTest(
          TipoNotaMovimentacao.DESCARTE, 
          TipoMovimentacao.DESCARTE
        );

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockEstoqueRepository.adicionarQuantidade).toHaveBeenCalledWith(
          mockMovimentacao.almoxarifadoId,
          mockMovimentacao.tipoEpiId,
          StatusEstoqueItem.DISPONIVEL,
          mockMovimentacao.quantidade
        );
      });

      it('should handle AJUSTE estorno by restoring previous balance', async () => {
        // Arrange
        const { mockMovimentacao } = setupEstornoTest(
          TipoNotaMovimentacao.AJUSTE, 
          TipoMovimentacao.AJUSTE
        );

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockEstoqueRepository.atualizarQuantidade).toHaveBeenCalledWith(
          mockMovimentacao.almoxarifadoId,
          mockMovimentacao.tipoEpiId,
          StatusEstoqueItem.DISPONIVEL,
          mockMovimentacao.saldoAnterior
        );
      });

      it('should handle TRANSFERENCIA estorno for saida movement', async () => {
        // Arrange
        const { mockMovimentacao } = setupEstornoTest(
          TipoNotaMovimentacao.TRANSFERENCIA, 
          TipoMovimentacao.SAIDA
        );
        mockMovimentacao.isSaida = vi.fn().mockReturnValue(true);
        mockMovimentacao.isEntrada = vi.fn().mockReturnValue(false);

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockEstoqueRepository.adicionarQuantidade).toHaveBeenCalledWith(
          mockMovimentacao.almoxarifadoId,
          mockMovimentacao.tipoEpiId,
          StatusEstoqueItem.DISPONIVEL,
          mockMovimentacao.quantidade
        );
      });

      it('should handle TRANSFERENCIA estorno for entrada movement', async () => {
        // Arrange
        const { mockMovimentacao } = setupEstornoTest(
          TipoNotaMovimentacao.TRANSFERENCIA, 
          TipoMovimentacao.ENTRADA
        );
        mockMovimentacao.isSaida = vi.fn().mockReturnValue(false);
        mockMovimentacao.isEntrada = vi.fn().mockReturnValue(true);

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockEstoqueRepository.removerQuantidade).toHaveBeenCalledWith(
          mockMovimentacao.almoxarifadoId,
          mockMovimentacao.tipoEpiId,
          StatusEstoqueItem.DISPONIVEL,
          mockMovimentacao.quantidade
        );
      });

      it('should throw error for unsupported movement type', async () => {
        // Arrange
        const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.CONCLUIDA);
        mockNota.isCancelavel = vi.fn().mockReturnValue(true);
        mockNota.isConcluida = vi.fn().mockReturnValue(true);
        mockNota.tipo = 'INVALID_TYPE' as any;

        const mockMovimentacao = createMockMovimentacaoEstoque(TipoMovimentacao.ENTRADA);
        const mockEstorno = createMockMovimentacaoEstoque(TipoMovimentacao.ESTORNO);

        mockNotaRepository.findById.mockResolvedValue(mockNota);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([mockMovimentacao]);
        mockMovimentacaoRepository.criarEstorno.mockResolvedValue(mockEstorno);

        mockPrismaService.$transaction.mockImplementation(async (callback) => {
          return await callback({} as any);
        });

        const input: CancelarNotaInput = {
          notaId: mockNotaId,
          usuarioId: mockUsuarioId,
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Tipo de nota não suportado para estorno: INVALID_TYPE')
        );
      });
    });
  });

  describe('validarCancelamento', () => {
    it('should return false for non-existent nota', async () => {
      // Arrange
      mockNotaRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.validarCancelamento(mockNotaId);

      // Assert
      expect(result).toEqual({
        podeSerCancelada: false,
        motivo: 'Nota não encontrada',
        requerEstorno: false,
        movimentacoesAfetadas: 0,
      });
    });

    it('should return false for non-cancelable nota', async () => {
      // Arrange
      const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.RASCUNHO);
      mockNota.isCancelavel = vi.fn().mockReturnValue(false);

      mockNotaRepository.findById.mockResolvedValue(mockNota);

      // Act
      const result = await useCase.validarCancelamento(mockNotaId);

      // Assert
      expect(result).toEqual({
        podeSerCancelada: false,
        motivo: 'Nota não está em status que permite cancelamento',
        requerEstorno: false,
        movimentacoesAfetadas: 0,
      });
    });

    it('should return true for concluded nota with estornavel movimentacoes', async () => {
      // Arrange
      const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.CONCLUIDA);
      mockNota.isCancelavel = vi.fn().mockReturnValue(true);
      mockNota.isConcluida = vi.fn().mockReturnValue(true);

      const mockMovimentacao = createMockMovimentacaoEstoque(TipoMovimentacao.ENTRADA);
      mockMovimentacao.isEstornavel = vi.fn().mockReturnValue(true);

      mockNotaRepository.findById.mockResolvedValue(mockNota);
      mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([mockMovimentacao]);

      // Act
      const result = await useCase.validarCancelamento(mockNotaId);

      // Assert
      expect(result).toEqual({
        podeSerCancelada: true,
        requerEstorno: true,
        movimentacoesAfetadas: 1,
      });
    });

    it('should return false when movimentacoes are not estornavel', async () => {
      // Arrange
      const mockNota = createMockNotaMovimentacao(StatusNotaMovimentacao.CONCLUIDA);
      mockNota.isCancelavel = vi.fn().mockReturnValue(true);
      mockNota.isConcluida = vi.fn().mockReturnValue(true);

      const mockMovimentacao = createMockMovimentacaoEstoque(TipoMovimentacao.ESTORNO);
      mockMovimentacao.isEstornavel = vi.fn().mockReturnValue(false);

      mockNotaRepository.findById.mockResolvedValue(mockNota);
      mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([mockMovimentacao]);

      // Act
      const result = await useCase.validarCancelamento(mockNotaId);

      // Assert
      expect(result).toEqual({
        podeSerCancelada: false,
        motivo: 'Existem movimentações que não podem ser estornadas',
        requerEstorno: true,
        movimentacoesAfetadas: 1,
      });
    });
  });

  describe('obterImpactoCancelamento', () => {
    it('should calculate correct stock impact for entrada movement', async () => {
      // Arrange
      const mockMovimentacao = createMockMovimentacaoEstoque(TipoMovimentacao.ENTRADA);
      mockMovimentacao.isEntrada = vi.fn().mockReturnValue(true);
      
      const mockEstoque = new EstoqueItem(
        'estoque-id',
        mockAlmoxarifadoId,
        mockTipoEpiId,
        100,
        StatusEstoqueItem.DISPONIVEL,
        new Date(),
        new Date()
      );

      mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([mockMovimentacao]);
      mockEstoqueRepository.findByAlmoxarifadoAndTipo.mockResolvedValue(mockEstoque);

      // Act
      const result = await useCase.obterImpactoCancelamento(mockNotaId);

      // Assert
      expect(result.estoqueAfetado).toHaveLength(1);
      expect(result.estoqueAfetado[0]).toEqual({
        almoxarifadoId: mockAlmoxarifadoId,
        tipoEpiId: mockTipoEpiId,
        saldoAtual: 100,
        saldoAposCancelamento: 80, // 100 - 20 (entrada será removida)
        diferenca: -20,
      });

      expect(result.movimentacoesAfetadas).toHaveLength(1);
      expect(result.movimentacoesAfetadas[0]).toEqual({
        id: mockMovimentacao.id,
        tipoMovimentacao: mockMovimentacao.tipoMovimentacao,
        quantidade: mockMovimentacao.quantidade,
        saldoAnterior: mockMovimentacao.saldoAnterior,
        saldoPosterior: mockMovimentacao.saldoPosterior,
      });
    });

    it('should handle null estoque', async () => {
      // Arrange
      const mockMovimentacao = createMockMovimentacaoEstoque(TipoMovimentacao.SAIDA);
      mockMovimentacao.isEntrada = vi.fn().mockReturnValue(false);

      mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([mockMovimentacao]);
      mockEstoqueRepository.findByAlmoxarifadoAndTipo.mockResolvedValue(null);

      // Act
      const result = await useCase.obterImpactoCancelamento(mockNotaId);

      // Assert
      expect(result.estoqueAfetado[0]).toEqual({
        almoxarifadoId: mockAlmoxarifadoId,
        tipoEpiId: mockTipoEpiId,
        saldoAtual: 0,
        saldoAposCancelamento: 20, // 0 + 20 (saída será revertida)
        diferenca: 20,
      });
    });
  });

  // Helper functions
  function createMockNotaMovimentacao(
    status: StatusNotaMovimentacao,
    tipo: TipoNotaMovimentacao = TipoNotaMovimentacao.ENTRADA
  ): NotaMovimentacao {
    return {
      id: mockNotaId,
      numero: 'NOTA-001',
      tipo,
      almoxarifadoOrigemId: tipo === TipoNotaMovimentacao.TRANSFERENCIA ? mockAlmoxarifadoId : null,
      almoxarifadoDestinoId: mockAlmoxarifadoId,
      usuarioId: mockUsuarioId,
      observacoes: null,
      status,
      dataConclusao: status === StatusNotaMovimentacao.CONCLUIDA ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      itens: [],
      isRascunho: vi.fn().mockReturnValue(status === StatusNotaMovimentacao.RASCUNHO),
      isConcluida: vi.fn().mockReturnValue(status === StatusNotaMovimentacao.CONCLUIDA),
      isCancelada: vi.fn().mockReturnValue(status === StatusNotaMovimentacao.CANCELADA),
      isEditavel: vi.fn().mockReturnValue(status === StatusNotaMovimentacao.RASCUNHO),
      isCancelavel: vi.fn().mockReturnValue(status === StatusNotaMovimentacao.CONCLUIDA),
      adicionarItem: vi.fn(),
      removerItem: vi.fn(),
      atualizarQuantidadeItem: vi.fn(),
      concluir: vi.fn(),
      cancelar: vi.fn(),
    } as any;
  }

  function createMockMovimentacaoEstoque(
    tipoMovimentacao: TipoMovimentacao
  ): MovimentacaoEstoque {
    return {
      id: 'mov-123',
      almoxarifadoId: mockAlmoxarifadoId,
      tipoEpiId: mockTipoEpiId,
      tipoMovimentacao,
      quantidade: 20,
      saldoAnterior: 50,
      saldoPosterior: tipoMovimentacao === TipoMovimentacao.ENTRADA ? 70 : 30,
      notaMovimentacaoId: mockNotaId,
      usuarioId: mockUsuarioId,
      observacoes: null,
      movimentacaoEstornoId: null,
      createdAt: new Date(),
      isEntrada: vi.fn().mockReturnValue(tipoMovimentacao === TipoMovimentacao.ENTRADA),
      isSaida: vi.fn().mockReturnValue(tipoMovimentacao === TipoMovimentacao.SAIDA),
      isTransferencia: vi.fn().mockReturnValue(tipoMovimentacao === TipoMovimentacao.TRANSFERENCIA),
      isAjuste: vi.fn().mockReturnValue(tipoMovimentacao === TipoMovimentacao.AJUSTE),
      isDescarte: vi.fn().mockReturnValue(tipoMovimentacao === TipoMovimentacao.DESCARTE),
      isEstorno: vi.fn().mockReturnValue(tipoMovimentacao === TipoMovimentacao.ESTORNO),
      isEstornavel: vi.fn().mockReturnValue(
        tipoMovimentacao !== TipoMovimentacao.ESTORNO && 
        !mockMovimentacaoEstoque.movimentacaoEstornoId
      ),
    } as any;
  }

  const mockMovimentacaoEstoque = {
    movimentacaoEstornoId: null,
  };
});