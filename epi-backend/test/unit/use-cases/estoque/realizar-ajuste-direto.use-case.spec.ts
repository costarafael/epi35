import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { RealizarAjusteDirectoUseCase, AjusteDirectoInput, AjusteInventarioInput } from '@application/use-cases/estoque/realizar-ajuste-direto.use-case';
import { IMovimentacaoRepository } from '@domain/interfaces/repositories/movimentacao-repository.interface';
import { IEstoqueRepository } from '@domain/interfaces/repositories/estoque-repository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { MovimentacaoEstoque } from '@domain/entities/movimentacao-estoque.entity';
import { StatusEstoqueItem, TipoMovimentacao } from '@domain/enums';
import { BusinessError } from '@domain/exceptions/business.exception';

describe('RealizarAjusteDirectoUseCase', () => {
  let useCase: RealizarAjusteDirectoUseCase;
  let mockMovimentacaoRepository: MockedFunction<IMovimentacaoRepository>;
  let mockEstoqueRepository: MockedFunction<IEstoqueRepository>;
  let mockPrismaService: MockedFunction<PrismaService>;
  let mockTransaction: MockedFunction<any>;

  const mockUsuarioId = 'user-123';
  const mockAlmoxarifadoId = 'almox-123';
  const mockTipoEpiId = 'epi-123';
  const mockMovimentacaoId = 'mov-123';

  beforeEach(() => {
    // Mock transaction function
    mockTransaction = vi.fn();
    
    // Mock PrismaService
    mockPrismaService = {
      $transaction: mockTransaction,
    } as any;

    // Mock MovimentacaoRepository
    mockMovimentacaoRepository = {
      create: vi.fn(),
      obterUltimaSaldo: vi.fn(),
      findByFilters: vi.fn(),
    } as any;

    // Mock EstoqueRepository
    mockEstoqueRepository = {
      criarOuAtualizar: vi.fn(),
    } as any;

    useCase = new RealizarAjusteDirectoUseCase(
      mockMovimentacaoRepository,
      mockEstoqueRepository,
      mockPrismaService,
    );
  });

  describe('executarAjusteDirecto', () => {
    const validInput: AjusteDirectoInput = {
      almoxarifadoId: mockAlmoxarifadoId,
      tipoEpiId: mockTipoEpiId,
      novaQuantidade: 100,
      usuarioId: mockUsuarioId,
      motivo: 'Ajuste de inventário',
    };

    describe('Permission Validation', () => {
      it('should validate permissions by default', async () => {
        // Arrange
        const spy = vi.spyOn(useCase as any, 'validarPermissaoAjuste');
        spy.mockResolvedValue(undefined);
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(50);
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Act
        await useCase.executarAjusteDirecto(validInput);

        // Assert
        expect(spy).toHaveBeenCalledWith(mockUsuarioId);
      });

      it('should skip permission validation when explicitly disabled', async () => {
        // Arrange
        const spy = vi.spyOn(useCase as any, 'validarPermissaoAjuste');
        const inputWithoutValidation = { ...validInput, validarPermissao: false };
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(50);
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Act
        await useCase.executarAjusteDirecto(inputWithoutValidation);

        // Assert
        expect(spy).not.toHaveBeenCalled();
      });

      it('should throw BusinessError when permission validation fails', async () => {
        // Arrange
        vi.spyOn(useCase as any, 'validarPermissaoAjuste')
          .mockRejectedValue(new BusinessError('Ajustes diretos de inventário estão desabilitados no sistema'));

        // Act & Assert
        await expect(useCase.executarAjusteDirecto(validInput))
          .rejects.toThrow('Ajustes diretos de inventário estão desabilitados no sistema');
      });
    });

    describe('Input Validation', () => {
      it('should throw BusinessError for negative quantity', async () => {
        // Arrange
        const invalidInput = { ...validInput, novaQuantidade: -10 };

        // Act & Assert
        await expect(useCase.executarAjusteDirecto(invalidInput))
          .rejects.toThrow('Quantidade não pode ser negativa');
      });

      it('should throw BusinessError for empty motivo', async () => {
        // Arrange
        const invalidInput = { ...validInput, motivo: '' };

        // Act & Assert
        await expect(useCase.executarAjusteDirecto(invalidInput))
          .rejects.toThrow('Motivo do ajuste é obrigatório');
      });

      it('should throw BusinessError for whitespace-only motivo', async () => {
        // Arrange
        const invalidInput = { ...validInput, motivo: '   ' };

        // Act & Assert
        await expect(useCase.executarAjusteDirecto(invalidInput))
          .rejects.toThrow('Motivo do ajuste é obrigatório');
      });
    });

    describe('Adjustment Calculations', () => {
      beforeEach(() => {
        vi.spyOn(useCase as any, 'validarPermissaoAjuste').mockResolvedValue(undefined);
      });

      it('should handle positive adjustment correctly', async () => {
        // Arrange
        const saldoAnterior = 50;
        const novaQuantidade = 100;
        const expectedDiferenca = novaQuantidade - saldoAnterior;
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAnterior);
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Act
        const result = await useCase.executarAjusteDirecto(validInput);

        // Assert
        expect(result).toEqual({
          movimentacaoId: mockMovimentacaoId,
          tipoEpiId: mockTipoEpiId,
          saldoAnterior,
          saldoPosterior: novaQuantidade,
          diferenca: expectedDiferenca,
          observacoes: `Ajuste direto: ${validInput.motivo}`,
        });
      });

      it('should handle negative adjustment correctly', async () => {
        // Arrange
        const saldoAnterior = 100;
        const novaQuantidade = 50;
        const expectedDiferenca = novaQuantidade - saldoAnterior;
        const inputWithNegativeAdjustment = { ...validInput, novaQuantidade };
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAnterior);
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Act
        const result = await useCase.executarAjusteDirecto(inputWithNegativeAdjustment);

        // Assert
        expect(result).toEqual({
          movimentacaoId: mockMovimentacaoId,
          tipoEpiId: mockTipoEpiId,
          saldoAnterior,
          saldoPosterior: novaQuantidade,
          diferenca: expectedDiferenca,
          observacoes: `Ajuste direto: ${validInput.motivo}`,
        });
      });

      it('should throw BusinessError when new quantity equals current balance', async () => {
        // Arrange
        const saldoAnterior = 100;
        const inputWithSameQuantity = { ...validInput, novaQuantidade: saldoAnterior };
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAnterior);
          return callback();
        });

        // Act & Assert
        await expect(useCase.executarAjusteDirecto(inputWithSameQuantity))
          .rejects.toThrow('Nova quantidade é igual ao saldo atual. Nenhum ajuste necessário.');
      });
    });

    describe('Audit Trail Creation', () => {
      beforeEach(() => {
        vi.spyOn(useCase as any, 'validarPermissaoAjuste').mockResolvedValue(undefined);
      });

      it('should create adjustment movement record with correct data', async () => {
        // Arrange
        const saldoAnterior = 50;
        const novaQuantidade = 100;
        const expectedDiferenca = Math.abs(novaQuantidade - saldoAnterior);
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAnterior);
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Mock the static method
        const createAjusteSpy = vi.spyOn(MovimentacaoEstoque, 'createAjuste');
        const mockMovimentacaoData = {
          almoxarifadoId: mockAlmoxarifadoId,
          tipoEpiId: mockTipoEpiId,
          tipoMovimentacao: TipoMovimentacao.AJUSTE,
          quantidade: expectedDiferenca,
          saldoAnterior,
          saldoPosterior: novaQuantidade,
          usuarioId: mockUsuarioId,
          observacoes: `Ajuste direto: ${validInput.motivo}`,
        };
        createAjusteSpy.mockReturnValue(mockMovimentacaoData as any);

        // Act
        await useCase.executarAjusteDirecto(validInput);

        // Assert
        expect(createAjusteSpy).toHaveBeenCalledWith(
          mockAlmoxarifadoId,
          mockTipoEpiId,
          expectedDiferenca,
          saldoAnterior,
          mockUsuarioId,
          `Ajuste direto: ${validInput.motivo}`,
        );
        expect(mockMovimentacaoRepository.create).toHaveBeenCalledWith(mockMovimentacaoData);
      });

      it('should update stock with correct parameters', async () => {
        // Arrange
        const saldoAnterior = 50;
        const novaQuantidade = 100;
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAnterior);
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Act
        await useCase.executarAjusteDirecto(validInput);

        // Assert
        expect(mockEstoqueRepository.criarOuAtualizar).toHaveBeenCalledWith(
          mockAlmoxarifadoId,
          mockTipoEpiId,
          StatusEstoqueItem.DISPONIVEL,
          novaQuantidade,
        );
      });
    });

    describe('Transaction Handling', () => {
      beforeEach(() => {
        vi.spyOn(useCase as any, 'validarPermissaoAjuste').mockResolvedValue(undefined);
      });

      it('should execute all operations within a transaction', async () => {
        // Arrange
        const saldoAnterior = 50;
        let transactionCallback: any;
        
        mockTransaction.mockImplementation(async (callback) => {
          transactionCallback = callback;
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAnterior);
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Act
        await useCase.executarAjusteDirecto(validInput);

        // Assert
        expect(mockPrismaService.$transaction).toHaveBeenCalledWith(expect.any(Function));
        expect(transactionCallback).toBeDefined();
      });

      it('should rollback transaction on repository error', async () => {
        // Arrange
        const errorMessage = 'Database error';
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(50);
          mockMovimentacaoRepository.create.mockRejectedValue(new Error(errorMessage));
          
          return callback();
        });

        // Act & Assert
        await expect(useCase.executarAjusteDirecto(validInput))
          .rejects.toThrow(errorMessage);
      });
    });
  });

  describe('executarInventario', () => {
    const validInventarioInput: AjusteInventarioInput = {
      almoxarifadoId: mockAlmoxarifadoId,
      ajustes: [
        { tipoEpiId: 'epi-1', quantidadeContada: 100, motivo: 'Contagem física' },
        { tipoEpiId: 'epi-2', quantidadeContada: 50 },
      ],
      usuarioId: mockUsuarioId,
      observacoes: 'Inventário mensal',
    };

    describe('Input Validation', () => {
      it('should throw BusinessError for empty adjustments list', async () => {
        // Arrange
        const invalidInput = { ...validInventarioInput, ajustes: [] };

        // Act & Assert
        await expect(useCase.executarInventario(invalidInput))
          .rejects.toThrow('Lista de ajustes não pode estar vazia');
      });

      it('should throw BusinessError for null adjustments', async () => {
        // Arrange
        const invalidInput = { ...validInventarioInput, ajustes: null as any };

        // Act & Assert
        await expect(useCase.executarInventario(invalidInput))
          .rejects.toThrow('Lista de ajustes não pode estar vazia');
      });
    });

    describe('Permission Validation', () => {
      it('should always validate permissions for inventory operations', async () => {
        // Arrange
        const spy = vi.spyOn(useCase as any, 'validarPermissaoAjuste');
        spy.mockResolvedValue(undefined);
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo
            .mockResolvedValueOnce(80) // epi-1: 80 -> 100 (difference: +20)
            .mockResolvedValueOnce(50); // epi-2: 50 -> 50 (no difference)
          
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Act
        await useCase.executarInventario(validInventarioInput);

        // Assert
        expect(spy).toHaveBeenCalledWith(mockUsuarioId);
      });
    });

    describe('Batch Processing', () => {
      beforeEach(() => {
        vi.spyOn(useCase as any, 'validarPermissaoAjuste').mockResolvedValue(undefined);
      });

      it('should process multiple adjustments correctly', async () => {
        // Arrange
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo
            .mockResolvedValueOnce(80) // epi-1: 80 -> 100 (difference: +20)
            .mockResolvedValueOnce(60); // epi-2: 60 -> 50 (difference: -10)
          
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Act
        const result = await useCase.executarInventario(validInventarioInput);

        // Assert
        expect(result.totalItensProcessados).toBe(2);
        expect(result.totalAjustesPositivos).toBe(1);
        expect(result.totalAjustesNegativos).toBe(1);
        expect(result.valorTotalAjustes).toBe(30); // |20| + |-10|
        expect(result.ajustesRealizados).toHaveLength(2);
      });

      it('should skip items with no difference', async () => {
        // Arrange
        const inputWithNoDifference: AjusteInventarioInput = {
          ...validInventarioInput,
          ajustes: [
            { tipoEpiId: 'epi-1', quantidadeContada: 100 }, // Has difference
            { tipoEpiId: 'epi-2', quantidadeContada: 50 },  // No difference
          ],
        };
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo
            .mockResolvedValueOnce(80) // epi-1: 80 -> 100 (difference: +20)
            .mockResolvedValueOnce(50); // epi-2: 50 -> 50 (no difference)
          
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Act
        const result = await useCase.executarInventario(inputWithNoDifference);

        // Assert
        expect(result.totalItensProcessados).toBe(2);
        expect(result.ajustesRealizados).toHaveLength(1); // Only one adjustment made
        expect(mockMovimentacaoRepository.create).toHaveBeenCalledTimes(1);
        expect(mockEstoqueRepository.criarOuAtualizar).toHaveBeenCalledTimes(1);
      });

      it('should generate default motivo when not provided', async () => {
        // Arrange
        const inputWithoutMotivo: AjusteInventarioInput = {
          ...validInventarioInput,
          ajustes: [{ tipoEpiId: 'epi-1', quantidadeContada: 100 }],
        };
        
        const saldoAnterior = 80;
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAnterior);
          const mockMovimentacao = { id: mockMovimentacaoId } as MovimentacaoEstoque;
          mockMovimentacaoRepository.create.mockResolvedValue(mockMovimentacao);
          mockEstoqueRepository.criarOuAtualizar.mockResolvedValue({} as any);
          
          return callback();
        });

        // Mock the static method
        const createAjusteSpy = vi.spyOn(MovimentacaoEstoque, 'createAjuste');
        createAjusteSpy.mockReturnValue({} as any);

        // Act
        await useCase.executarInventario(inputWithoutMotivo);

        // Assert
        expect(createAjusteSpy).toHaveBeenCalledWith(
          mockAlmoxarifadoId,
          'epi-1',
          20, // |100 - 80|
          saldoAnterior,
          mockUsuarioId,
          `Inventário: contagem 100, saldo sistema ${saldoAnterior}`,
        );
      });

      it('should handle errors during processing and provide context', async () => {
        // Arrange
        const errorMessage = 'Repository error';
        
        mockTransaction.mockImplementation(async (callback) => {
          mockMovimentacaoRepository.obterUltimaSaldo.mockRejectedValue(new Error(errorMessage));
          return callback();
        });

        // Act & Assert
        await expect(useCase.executarInventario(validInventarioInput))
          .rejects.toThrow(`Erro ao processar ajuste para item epi-1: ${errorMessage}`);
      });
    });
  });

  describe('simularAjuste', () => {
    it('should simulate positive adjustment correctly', async () => {
      // Arrange
      const saldoAtual = 50;
      const novaQuantidade = 100;
      mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAtual);

      // Act
      const result = await useCase.simularAjuste(mockAlmoxarifadoId, mockTipoEpiId, novaQuantidade);

      // Assert
      expect(result).toEqual({
        saldoAtual,
        novaQuantidade,
        diferenca: 50,
        tipoAjuste: 'positivo',
        impactoFinanceiro: 50,
      });
    });

    it('should simulate negative adjustment correctly', async () => {
      // Arrange
      const saldoAtual = 100;
      const novaQuantidade = 50;
      mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAtual);

      // Act
      const result = await useCase.simularAjuste(mockAlmoxarifadoId, mockTipoEpiId, novaQuantidade);

      // Assert
      expect(result).toEqual({
        saldoAtual,
        novaQuantidade,
        diferenca: -50,
        tipoAjuste: 'negativo',
        impactoFinanceiro: 50,
      });
    });

    it('should simulate neutral adjustment correctly', async () => {
      // Arrange
      const saldoAtual = 100;
      const novaQuantidade = 100;
      mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(saldoAtual);

      // Act
      const result = await useCase.simularAjuste(mockAlmoxarifadoId, mockTipoEpiId, novaQuantidade);

      // Assert
      expect(result).toEqual({
        saldoAtual,
        novaQuantidade,
        diferenca: 0,
        tipoAjuste: 'neutro',
        impactoFinanceiro: 0,
      });
    });
  });

  describe('validarPermissaoAjuste', () => {
    it('should throw BusinessError when user ID is not provided', async () => {
      // Act & Assert
      await expect((useCase as any).validarPermissaoAjuste(''))
        .rejects.toThrow('Usuário é obrigatório para realizar ajustes');
    });

    it('should throw BusinessError when user ID is null', async () => {
      // Act & Assert
      await expect((useCase as any).validarPermissaoAjuste(null))
        .rejects.toThrow('Usuário é obrigatório para realizar ajustes');
    });

    it('should pass validation when user ID is provided and adjustments are enabled', async () => {
      // This test verifies the current implementation where ajustesForcadosHabilitados is hardcoded to true
      // In a real implementation, this would check actual configuration
      
      // Act & Assert - should not throw
      await expect((useCase as any).validarPermissaoAjuste(mockUsuarioId))
        .resolves.toBeUndefined();
    });

    // Note: The following test demonstrates how permission validation would work 
    // when connected to a real configuration service
    it('should demonstrate PERMITIR_AJUSTES_FORCADOS configuration logic', async () => {
      // This is a demonstration of how the permission logic should work
      // In the actual implementation, you would mock the configuration service
      
      // Arrange - Mock the configuration check
      const originalMethod = (useCase as any).validarPermissaoAjuste;
      (useCase as any).validarPermissaoAjuste = vi.fn().mockImplementation(async (usuarioId: string) => {
        if (!usuarioId) {
          throw new BusinessError('Usuário é obrigatório para realizar ajustes');
        }
        
        // Simulate checking PERMITIR_AJUSTES_FORCADOS configuration
        const ajustesForcadosHabilitados = false; // Simulating disabled config
        
        if (!ajustesForcadosHabilitados) {
          throw new BusinessError('Ajustes diretos de inventário estão desabilitados no sistema');
        }
      });

      // Act & Assert
      await expect((useCase as any).validarPermissaoAjuste(mockUsuarioId))
        .rejects.toThrow('Ajustes diretos de inventário estão desabilitados no sistema');

      // Restore original method
      (useCase as any).validarPermissaoAjuste = originalMethod;
    });
  });

  describe('obterHistoricoAjustes', () => {
    it('should return adjustment history with correct filters', async () => {
      // Arrange
      const mockMovimentacoes = [
        {
          id: 'mov-1',
          createdAt: new Date('2024-01-01'),
          almoxarifadoId: mockAlmoxarifadoId,
          tipoEpiId: 'epi-1',
          quantidade: 20,
          saldoAnterior: 80,
          saldoPosterior: 100,
          usuarioId: mockUsuarioId,
          observacoes: 'Ajuste positivo',
        },
        {
          id: 'mov-2',
          createdAt: new Date('2024-01-02'),
          almoxarifadoId: mockAlmoxarifadoId,
          tipoEpiId: 'epi-2',
          quantidade: 10,
          saldoAnterior: 60,
          saldoPosterior: 50,
          usuarioId: mockUsuarioId,
          observacoes: 'Ajuste negativo',
        },
      ];

      mockMovimentacaoRepository.findByFilters.mockResolvedValue(mockMovimentacoes as any);

      // Act
      const result = await useCase.obterHistoricoAjustes(mockAlmoxarifadoId);

      // Assert
      expect(mockMovimentacaoRepository.findByFilters).toHaveBeenCalledWith({
        tipoMovimentacao: 'AJUSTE',
        almoxarifadoId: mockAlmoxarifadoId,
      });

      expect(result.ajustes).toHaveLength(2);
      expect(result.resumo.totalAjustes).toBe(2);
      expect(result.resumo.ajustesPositivos).toBe(1);
      expect(result.resumo.ajustesNegativos).toBe(1);
      expect(result.resumo.somaAjustesPositivos).toBe(20);
      expect(result.resumo.somaAjustesNegativos).toBe(10);
    });
  });

  describe('validarDivergenciasInventario', () => {
    it('should identify and calculate divergences correctly', async () => {
      // Arrange
      const contagensInventario = [
        { tipoEpiId: 'epi-1', quantidadeContada: 100 }, // Sistema: 80, Diferença: +20
        { tipoEpiId: 'epi-2', quantidadeContada: 40 },  // Sistema: 50, Diferença: -10
        { tipoEpiId: 'epi-3', quantidadeContada: 30 },  // Sistema: 30, Diferença: 0
      ];

      mockMovimentacaoRepository.obterUltimaSaldo
        .mockResolvedValueOnce(80) // epi-1
        .mockResolvedValueOnce(50) // epi-2
        .mockResolvedValueOnce(30); // epi-3

      // Act
      const result = await useCase.validarDivergenciasInventario(mockAlmoxarifadoId, contagensInventario);

      // Assert
      expect(result.divergencias).toHaveLength(2); // Only items with differences
      expect(result.resumo.totalItens).toBe(3);
      expect(result.resumo.itensSemDivergencia).toBe(1);
      expect(result.resumo.itensComDivergencia).toBe(2);
      expect(result.resumo.maiorDivergencia).toBe(20);
      expect(result.resumo.menorDivergencia).toBe(10);

      // Check first divergence (positive)
      expect(result.divergencias[0]).toEqual({
        tipoEpiId: 'epi-1',
        saldoSistema: 80,
        quantidadeContada: 100,
        diferenca: 20,
        percentualDivergencia: 25, // (20/80) * 100
      });

      // Check second divergence (negative)
      expect(result.divergencias[1]).toEqual({
        tipoEpiId: 'epi-2',
        saldoSistema: 50,
        quantidadeContada: 40,
        diferenca: -10,
        percentualDivergencia: -20, // (-10/50) * 100
      });
    });

    it('should handle zero system balance correctly', async () => {
      // Arrange
      const contagensInventario = [
        { tipoEpiId: 'epi-1', quantidadeContada: 10 }, // Sistema: 0, Diferença: +10
      ];

      mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(0);

      // Act
      const result = await useCase.validarDivergenciasInventario(mockAlmoxarifadoId, contagensInventario);

      // Assert
      expect(result.divergencias[0].percentualDivergencia).toBe(100);
    });

    it('should handle zero counted quantity with zero system balance', async () => {
      // Arrange
      const contagensInventario = [
        { tipoEpiId: 'epi-1', quantidadeContada: 0 }, // Sistema: 0, Diferença: 0
      ];

      mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(0);

      // Act
      const result = await useCase.validarDivergenciasInventario(mockAlmoxarifadoId, contagensInventario);

      // Assert
      expect(result.divergencias).toHaveLength(0); // No divergence
      expect(result.resumo.itensSemDivergencia).toBe(1);
    });
  });
});