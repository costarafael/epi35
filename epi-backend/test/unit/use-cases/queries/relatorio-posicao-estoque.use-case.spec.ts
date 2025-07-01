import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  RelatorioPosicaoEstoqueUseCase,
  RelatorioEstoqueFilters,
  ItemPosicaoEstoque,
  ResumoEstoque,
} from '@application/use-cases/queries/relatorio-posicao-estoque.use-case';
import { IEstoqueRepository } from '@domain/interfaces/repositories/estoque-repository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StatusEstoqueItem, TipoMovimentacao } from '@domain/enums';

describe('RelatorioPosicaoEstoqueUseCase', () => {
  let useCase: RelatorioPosicaoEstoqueUseCase;
  let mockEstoqueRepository: jest.Mocked<IEstoqueRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  const mockEstoqueData = [
    {
      id: 'estoque-1',
      almoxarifadoId: 'almox-1',
      tipoEpiId: 'tipo-1',
      quantidade: 100,
      status: StatusEstoqueItem.DISPONIVEL,
      tipoEpi: {
        id: 'tipo-1',
        nome: 'Capacete de Segurança',
        codigo: 'CAP001',
      },
      almoxarifado: {
        id: 'almox-1',
        nome: 'Almoxarifado Central',
        codigo: 'AC001',
        unidadeNegocio: {
          nome: 'Unidade São Paulo',
        },
      },
    },
    {
      id: 'estoque-2',
      almoxarifadoId: 'almox-1',
      tipoEpiId: 'tipo-1',
      quantidade: 20,
      status: StatusEstoqueItem.RESERVADO,
      tipoEpi: {
        id: 'tipo-1',
        nome: 'Capacete de Segurança',
        codigo: 'CAP001',
      },
      almoxarifado: {
        id: 'almox-1',
        nome: 'Almoxarifado Central',
        codigo: 'AC001',
        unidadeNegocio: {
          nome: 'Unidade São Paulo',
        },
      },
    },
    {
      id: 'estoque-3',
      almoxarifadoId: 'almox-2',
      tipoEpiId: 'tipo-2',
      quantidade: 5,
      status: StatusEstoqueItem.DISPONIVEL,
      tipoEpi: {
        id: 'tipo-2',
        nome: 'Óculos de Proteção',
        codigo: 'OCP001',
      },
      almoxarifado: {
        id: 'almox-2',
        nome: 'Almoxarifado Filial',
        codigo: 'AF001',
        unidadeNegocio: {
          nome: 'Unidade Rio de Janeiro',
        },
      },
    },
  ];

  const mockMovimentacaoData = [
    {
      id: 'mov-1',
      almoxarifadoId: 'almox-1',
      tipoEpiId: 'tipo-1',
      tipoMovimentacao: TipoMovimentacao.ENTRADA,
      quantidade: 50,
      saldoAnterior: 0,
      saldoPosterior: 50,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      observacoes: 'Entrada inicial',
      notaMovimentacao: {
        numero: 'NF-001',
      },
    },
    {
      id: 'mov-2',
      almoxarifadoId: 'almox-1',
      tipoEpiId: 'tipo-1',
      tipoMovimentacao: TipoMovimentacao.SAIDA,
      quantidade: 10,
      saldoAnterior: 50,
      saldoPosterior: 40,
      createdAt: new Date('2024-01-20T14:30:00Z'),
      observacoes: 'Entrega para colaborador',
      notaMovimentacao: null,
    },
  ];

  beforeEach(() => {
    mockEstoqueRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByAlmoxarifadoAndTipo: vi.fn(),
      findByAlmoxarifado: vi.fn(),
      findByTipoEpi: vi.fn(),
      findDisponiveis: vi.fn(),
      atualizarQuantidade: vi.fn(),
      adicionarQuantidade: vi.fn(),
      removerQuantidade: vi.fn(),
      verificarDisponibilidade: vi.fn(),
      obterSaldoTotal: vi.fn(),
      obterSaldoPorAlmoxarifado: vi.fn(),
      criarOuAtualizar: vi.fn(),
    };

    mockPrismaService = {
      estoqueItem: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      movimentacaoEstoque: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        groupBy: vi.fn(),
      },
      tipoEPI: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    } as any;

    useCase = new RelatorioPosicaoEstoqueUseCase(
      mockEstoqueRepository,
      mockPrismaService,
    );
  });

  describe('execute', () => {
    it('should generate stock position report with correct aggregation', async () => {
      // Arrange
      const filtros: RelatorioEstoqueFilters = {};
      mockPrismaService.estoqueItem.findMany.mockResolvedValue(mockEstoqueData);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue({
        createdAt: new Date('2024-01-20T14:30:00Z'),
      });

      // Act
      const result = await useCase.execute(filtros);

      // Assert
      expect(result).toHaveProperty('itens');
      expect(result).toHaveProperty('resumo');
      expect(result).toHaveProperty('dataGeracao');
      
      expect(result.itens).toHaveLength(2); // Two unique almoxarifado-tipoEpi combinations
      
      // Check first item aggregation (almox-1 + tipo-1)
      const primeiroItem = result.itens.find(
        item => item.almoxarifadoId === 'almox-1' && item.tipoEpiId === 'tipo-1'
      );
      expect(primeiroItem).toBeDefined();
      expect(primeiroItem?.saldoDisponivel).toBe(100);
      expect(primeiroItem?.saldoReservado).toBe(20);
      expect(primeiroItem?.saldoTotal).toBe(120);

      // Check second item (almox-2 + tipo-2)
      const segundoItem = result.itens.find(
        item => item.almoxarifadoId === 'almox-2' && item.tipoEpiId === 'tipo-2'
      );
      expect(segundoItem).toBeDefined();
      expect(segundoItem?.saldoDisponivel).toBe(5);
      expect(segundoItem?.situacao).toBe('CRITICO'); // 5 is <= 5, so CRITICO

      expect(mockPrismaService.estoqueItem.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          tipoEpi: {
            select: {
              id: true,
              nome: true,
              codigo: true,
            },
          },
          almoxarifado: {
            select: {
              id: true,
              nome: true,
              codigo: true,
              unidadeNegocio: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
        orderBy: [
          { almoxarifado: { nome: 'asc' } },
          { tipoEpi: { nome: 'asc' } },
          { status: 'asc' },
        ],
      });
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const filtros: RelatorioEstoqueFilters = {
        almoxarifadoId: 'almox-1',
        tipoEpiId: 'tipo-1',
        unidadeNegocioId: 'unidade-1',
        apenasComSaldo: true,
        apenasAbaixoMinimo: false,
      };
      mockPrismaService.estoqueItem.findMany.mockResolvedValue([]);

      // Act
      await useCase.execute(filtros);

      // Assert
      expect(mockPrismaService.estoqueItem.findMany).toHaveBeenCalledWith({
        where: {
          almoxarifadoId: 'almox-1',
          tipoEpiId: 'tipo-1',
          almoxarifado: {
            unidadeNegocioId: 'unidade-1',
          },
          quantidade: { gt: 0 },
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should filter items below minimum when requested', async () => {
      // Arrange
      const filtros: RelatorioEstoqueFilters = {
        apenasAbaixoMinimo: true,
      };
      mockPrismaService.estoqueItem.findMany.mockResolvedValue(mockEstoqueData);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(filtros);

      // Assert
      // Should only include items with situacao 'BAIXO', 'CRITICO', or 'ZERO'
      expect(result.itens.every(item => 
        ['BAIXO', 'CRITICO', 'ZERO'].includes(item.situacao)
      )).toBe(true);
    });

    it('should calculate summary correctly', async () => {
      // Arrange
      mockPrismaService.estoqueItem.findMany.mockResolvedValue(mockEstoqueData);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue(null);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.resumo.totalItens).toBe(2);
      expect(result.resumo.porAlmoxarifado).toHaveLength(2);
      expect(result.resumo.porTipoEpi).toHaveLength(2);
      
      // Check aggregation by almoxarifado
      const almoxCentral = result.resumo.porAlmoxarifado.find(
        a => a.almoxarifadoNome === 'Almoxarifado Central'
      );
      expect(almoxCentral).toBeDefined();
      expect(almoxCentral?.totalItens).toBe(1);
    });

    it('should handle empty result set', async () => {
      // Arrange
      mockPrismaService.estoqueItem.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.itens).toHaveLength(0);
      expect(result.resumo.totalItens).toBe(0);
      expect(result.resumo.valorTotalEstoque).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPrismaService.estoqueItem.findMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow('Database connection failed');
    });
  });

  describe('obterKardexItem', () => {
    it('should return kardex with correct calculations', async () => {
      // Arrange
      const almoxarifadoId = 'almox-1';
      const tipoEpiId = 'tipo-1';
      mockPrismaService.movimentacaoEstoque.findMany.mockResolvedValue(mockMovimentacaoData);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue(null);

      // Act
      const result = await useCase.obterKardexItem(almoxarifadoId, tipoEpiId);

      // Assert
      expect(result.movimentacoes).toHaveLength(2);
      expect(result.totalEntradas).toBe(50);
      expect(result.totalSaidas).toBe(10);
      expect(result.saldoFinal).toBe(40);
      
      // Check first movement
      const primeiraMovimentacao = result.movimentacoes[0];
      expect(primeiraMovimentacao.entrada).toBe(50);
      expect(primeiraMovimentacao.saida).toBe(0);
      expect(primeiraMovimentacao.documento).toBe('NF-001');
      
      // Check second movement
      const segundaMovimentacao = result.movimentacoes[1];
      expect(segundaMovimentacao.entrada).toBe(0);
      expect(segundaMovimentacao.saida).toBe(10);
      expect(segundaMovimentacao.documento).toBe('MOV-mov-2');
    });

    it('should filter by date range correctly', async () => {
      // Arrange
      const almoxarifadoId = 'almox-1';
      const tipoEpiId = 'tipo-1';
      const dataInicio = new Date('2024-01-16T00:00:00Z');
      const dataFim = new Date('2024-01-25T23:59:59Z');
      
      mockPrismaService.movimentacaoEstoque.findMany.mockResolvedValue([mockMovimentacaoData[1]]);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue({
        saldoPosterior: 50,
      });

      // Act
      const result = await useCase.obterKardexItem(
        almoxarifadoId,
        tipoEpiId,
        dataInicio,
        dataFim
      );

      // Assert
      expect(result.saldoInicial).toBe(50);
      expect(result.movimentacoes).toHaveLength(1);
      expect(mockPrismaService.movimentacaoEstoque.findMany).toHaveBeenCalledWith({
        where: {
          almoxarifadoId,
          tipoEpiId,
          createdAt: {
            gte: dataInicio,
            lte: dataFim,
          },
        },
        include: {
          notaMovimentacao: {
            select: { numero: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should handle AJUSTE movements correctly', async () => {
      // Arrange
      const mockAjusteData = [
        {
          id: 'mov-3',
          almoxarifadoId: 'almox-1',
          tipoEpiId: 'tipo-1',
          tipoMovimentacao: TipoMovimentacao.AJUSTE,
          quantidade: 10,
          saldoAnterior: 40,
          saldoPosterior: 50, // Positive adjustment
          createdAt: new Date('2024-01-25T09:00:00Z'),
          observacoes: 'Ajuste positivo',
          notaMovimentacao: null,
        },
        {
          id: 'mov-4',
          almoxarifadoId: 'almox-1',
          tipoEpiId: 'tipo-1',
          tipoMovimentacao: TipoMovimentacao.AJUSTE,
          quantidade: 5,
          saldoAnterior: 50,
          saldoPosterior: 45, // Negative adjustment
          createdAt: new Date('2024-01-26T09:00:00Z'),
          observacoes: 'Ajuste negativo',
          notaMovimentacao: null,
        },
      ];
      
      mockPrismaService.movimentacaoEstoque.findMany.mockResolvedValue(mockAjusteData);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue(null);

      // Act
      const result = await useCase.obterKardexItem('almox-1', 'tipo-1');

      // Assert
      expect(result.totalEntradas).toBe(10); // Only positive adjustment
      expect(result.totalSaidas).toBe(5); // Only negative adjustment
      
      const positiveAdjustment = result.movimentacoes[0];
      expect(positiveAdjustment.entrada).toBe(10);
      expect(positiveAdjustment.saida).toBe(0);
      
      const negativeAdjustment = result.movimentacoes[1];
      expect(negativeAdjustment.entrada).toBe(0);
      expect(negativeAdjustment.saida).toBe(5);
    });

    it('should handle empty kardex correctly', async () => {
      // Arrange
      mockPrismaService.movimentacaoEstoque.findMany.mockResolvedValue([]);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue(null);

      // Act
      const result = await useCase.obterKardexItem('almox-1', 'tipo-1');

      // Assert
      expect(result.movimentacoes).toHaveLength(0);
      expect(result.saldoInicial).toBe(0);
      expect(result.saldoFinal).toBe(0);
      expect(result.totalEntradas).toBe(0);
      expect(result.totalSaidas).toBe(0);
    });
  });

  describe('obterAnaliseGiroEstoque', () => {
    beforeEach(() => {
      // Mock consumption data
      mockPrismaService.movimentacaoEstoque.groupBy.mockResolvedValue([
        {
          tipoEpiId: 'tipo-1',
          _sum: { quantidade: 120 }, // 120 units consumed in period
        },
        {
          tipoEpiId: 'tipo-2',
          _sum: { quantidade: 0 }, // No consumption
        },
      ]);

      // Mock current stock
      mockPrismaService.estoqueItem.groupBy.mockResolvedValue([
        {
          tipoEpiId: 'tipo-1',
          _sum: { quantidade: 100 }, // 100 units in stock
        },
        {
          tipoEpiId: 'tipo-2',
          _sum: { quantidade: 50 }, // 50 units in stock
        },
      ]);

      // Mock tipo EPI names
      mockPrismaService.tipoEPI.findMany.mockResolvedValue([
        { id: 'tipo-1', nome: 'Capacete de Segurança' },
        { id: 'tipo-2', nome: 'Óculos de Proteção' },
      ]);
    });

    it('should calculate stock turnover analysis correctly for quarterly period', async () => {
      // Act
      const result = await useCase.obterAnaliseGiroEstoque();

      // Assert
      expect(result.analise).toHaveLength(2);
      
      // Fast-moving item (tipo-1)
      const fastMovingItem = result.analise.find(item => item.tipoEpiId === 'tipo-1');
      expect(fastMovingItem).toBeDefined();
      expect(fastMovingItem?.giroEstoque).toBe(1.2); // 120/100
      expect(fastMovingItem?.classificacao).toBe('RAPIDO');
      expect(fastMovingItem?.recomendacao).toBe('Giro alto. Monitorar para evitar ruptura.');
      
      // No-movement item (tipo-2)
      const noMovementItem = result.analise.find(item => item.tipoEpiId === 'tipo-2');
      expect(noMovementItem).toBeDefined();
      expect(noMovementItem?.giroEstoque).toBe(0);
      expect(noMovementItem?.classificacao).toBe('PARADO');
      expect(noMovementItem?.recomendacao).toBe('Item sem movimento. Avaliar necessidade.');
    });

    it('should handle different time periods correctly', async () => {
      // Act - Monthly period
      await useCase.obterAnaliseGiroEstoque(undefined, 'MENSAL');

      // Assert - Check that date range was calculated correctly
      const callArgs = mockPrismaService.movimentacaoEstoque.groupBy.mock.calls[0][0];
      const whereClause = callArgs.where;
      
      expect(whereClause.createdAt).toBeDefined();
      expect(whereClause.createdAt.gte).toBeInstanceOf(Date);
      expect(whereClause.createdAt.lte).toBeInstanceOf(Date);
      
      // Check that the date range is approximately 1 month
      const dateRange = whereClause.createdAt.lte.getTime() - whereClause.createdAt.gte.getTime();
      const expectedRange = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      expect(Math.abs(dateRange - expectedRange)).toBeLessThan(24 * 60 * 60 * 1000); // Within 1 day tolerance
    });

    it('should filter by almoxarifado when specified', async () => {
      // Act
      await useCase.obterAnaliseGiroEstoque('almox-1');

      // Assert
      const consumptionCallArgs = mockPrismaService.movimentacaoEstoque.groupBy.mock.calls[0][0];
      expect(consumptionCallArgs.where.almoxarifadoId).toBe('almox-1');
      
      const stockCallArgs = mockPrismaService.estoqueItem.groupBy.mock.calls[0][0];
      expect(stockCallArgs.where.almoxarifadoId).toBe('almox-1');
    });

    it('should classify items correctly based on stock days', async () => {
      // Arrange - Create scenario with different consumption patterns
      mockPrismaService.movimentacaoEstoque.groupBy.mockResolvedValue([
        { tipoEpiId: 'tipo-1', _sum: { quantidade: 90 } }, // High consumption
        { tipoEpiId: 'tipo-2', _sum: { quantidade: 30 } }, // Medium consumption
        { tipoEpiId: 'tipo-3', _sum: { quantidade: 10 } }, // Low consumption
      ]);

      mockPrismaService.estoqueItem.groupBy.mockResolvedValue([
        { tipoEpiId: 'tipo-1', _sum: { quantidade: 90 } }, // 90 days stock
        { tipoEpiId: 'tipo-2', _sum: { quantidade: 90 } }, // 270 days stock
        { tipoEpiId: 'tipo-3', _sum: { quantidade: 900 } }, // 8100 days stock
      ]);

      mockPrismaService.tipoEPI.findMany.mockResolvedValue([
        { id: 'tipo-1', nome: 'Item Rápido' },
        { id: 'tipo-2', nome: 'Item Médio' },
        { id: 'tipo-3', nome: 'Item Lento' },
      ]);

      // Act
      const result = await useCase.obterAnaliseGiroEstoque(undefined, 'TRIMESTRAL');

      // Assert
      const itemRapido = result.analise.find(item => item.tipoEpiId === 'tipo-1');
      expect(itemRapido?.classificacao).toBe('MEDIO'); // 90 days is MEDIO (between 30-90)

      const itemMedio = result.analise.find(item => item.tipoEpiId === 'tipo-2');
      expect(itemMedio?.classificacao).toBe('LENTO'); // 270 days is LENTO (> 90)

      const itemLento = result.analise.find(item => item.tipoEpiId === 'tipo-3');
      expect(itemLento?.classificacao).toBe('LENTO'); // 8100 days is LENTO (> 90)
    });

    it('should sort results by stock turnover descending', async () => {
      // Act
      const result = await useCase.obterAnaliseGiroEstoque();

      // Assert
      expect(result.analise).toHaveLength(2);
      
      // Results should be sorted by giroEstoque descending
      for (let i = 0; i < result.analise.length - 1; i++) {
        expect(result.analise[i].giroEstoque).toBeGreaterThanOrEqual(
          result.analise[i + 1].giroEstoque
        );
      }
    });

    it('should return correct period analysis information', async () => {
      // Act
      const result = await useCase.obterAnaliseGiroEstoque(undefined, 'SEMESTRAL');

      // Assert
      expect(result.periodoAnalise).toBeDefined();
      expect(result.periodoAnalise.inicio).toBeInstanceOf(Date);
      expect(result.periodoAnalise.fim).toBeInstanceOf(Date);
      
      // Check that the period is approximately 6 months
      const periodDuration = result.periodoAnalise.fim.getTime() - result.periodoAnalise.inicio.getTime();
      const expectedDuration = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months approximation
      expect(Math.abs(periodDuration - expectedDuration)).toBeLessThan(7 * 24 * 60 * 60 * 1000); // Within 1 week tolerance
    });

    it('should handle database errors in stock turnover analysis', async () => {
      // Arrange
      mockPrismaService.movimentacaoEstoque.groupBy.mockRejectedValue(
        new Error('Database error in consumption query')
      );

      // Act & Assert
      await expect(useCase.obterAnaliseGiroEstoque()).rejects.toThrow(
        'Database error in consumption query'
      );
    });
  });

  describe('private methods integration', () => {
    it('should calculate stock situation correctly', async () => {
      // Arrange - Create data with different stock levels
      const testData = [
        {
          id: 'estoque-zero',
          almoxarifadoId: 'almox-1',
          tipoEpiId: 'tipo-zero',
          quantidade: 0,
          status: StatusEstoqueItem.DISPONIVEL,
          tipoEpi: { id: 'tipo-zero', nome: 'Item Zero', codigo: 'ZERO' },
          almoxarifado: {
            id: 'almox-1',
            nome: 'Almoxarifado',
            codigo: 'A001',
            unidadeNegocio: { nome: 'Unidade' },
          },
        },
        {
          id: 'estoque-critico',
          almoxarifadoId: 'almox-1',
          tipoEpiId: 'tipo-critico',
          quantidade: 3,
          status: StatusEstoqueItem.DISPONIVEL,
          tipoEpi: { id: 'tipo-critico', nome: 'Item Crítico', codigo: 'CRIT' },
          almoxarifado: {
            id: 'almox-1',
            nome: 'Almoxarifado',
            codigo: 'A001',
            unidadeNegocio: { nome: 'Unidade' },
          },
        },
        {
          id: 'estoque-baixo',
          almoxarifadoId: 'almox-1',
          tipoEpiId: 'tipo-baixo',
          quantidade: 15,
          status: StatusEstoqueItem.DISPONIVEL,
          tipoEpi: { id: 'tipo-baixo', nome: 'Item Baixo', codigo: 'BAIXO' },
          almoxarifado: {
            id: 'almox-1',
            nome: 'Almoxarifado',
            codigo: 'A001',
            unidadeNegocio: { nome: 'Unidade' },
          },
        },
        {
          id: 'estoque-normal',
          almoxarifadoId: 'almox-1',
          tipoEpiId: 'tipo-normal',
          quantidade: 100,
          status: StatusEstoqueItem.DISPONIVEL,
          tipoEpi: { id: 'tipo-normal', nome: 'Item Normal', codigo: 'NORM' },
          almoxarifado: {
            id: 'almox-1',
            nome: 'Almoxarifado',
            codigo: 'A001',
            unidadeNegocio: { nome: 'Unidade' },
          },
        },
      ];

      mockPrismaService.estoqueItem.findMany.mockResolvedValue(testData);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue(null);

      // Act
      const result = await useCase.execute();

      // Assert
      const itemZero = result.itens.find(item => item.tipoEpiId === 'tipo-zero');
      const itemCritico = result.itens.find(item => item.tipoEpiId === 'tipo-critico');
      const itemBaixo = result.itens.find(item => item.tipoEpiId === 'tipo-baixo');
      const itemNormal = result.itens.find(item => item.tipoEpiId === 'tipo-normal');

      expect(itemZero?.situacao).toBe('ZERO');
      expect(itemCritico?.situacao).toBe('CRITICO');
      expect(itemBaixo?.situacao).toBe('BAIXO');
      expect(itemNormal?.situacao).toBe('NORMAL');

      // Check summary counts
      expect(result.resumo.itensSemEstoque).toBe(1);
      expect(result.resumo.itensEstoqueCritico).toBe(1);
      expect(result.resumo.itensBaixoEstoque).toBe(1);
    });

    it('should build where clause correctly for all filter combinations', async () => {
      // Test all possible filter combinations
      const allFilters: RelatorioEstoqueFilters = {
        almoxarifadoId: 'almox-test',
        tipoEpiId: 'tipo-test',
        unidadeNegocioId: 'unidade-test',
        apenasComSaldo: true,
        apenasAbaixoMinimo: false,
      };

      mockPrismaService.estoqueItem.findMany.mockResolvedValue([]);

      // Act
      await useCase.execute(allFilters);

      // Assert
      expect(mockPrismaService.estoqueItem.findMany).toHaveBeenCalledWith({
        where: {
          almoxarifadoId: 'almox-test',
          tipoEpiId: 'tipo-test',
          almoxarifado: {
            unidadeNegocioId: 'unidade-test',
          },
          quantidade: { gt: 0 },
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large datasets efficiently', async () => {
      // Arrange - Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
        id: `estoque-${index}`,
        almoxarifadoId: `almox-${index % 10}`,
        tipoEpiId: `tipo-${index % 50}`,
        quantidade: Math.floor(Math.random() * 100),
        status: StatusEstoqueItem.DISPONIVEL,
        tipoEpi: {
          id: `tipo-${index % 50}`,
          nome: `Tipo EPI ${index % 50}`,
          codigo: `TIPO${index % 50}`,
        },
        almoxarifado: {
          id: `almox-${index % 10}`,
          nome: `Almoxarifado ${index % 10}`,
          codigo: `A${index % 10}`,
          unidadeNegocio: {
            nome: `Unidade ${index % 5}`,
          },
        },
      }));

      mockPrismaService.estoqueItem.findMany.mockResolvedValue(largeDataset);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue(null);

      // Act
      const startTime = Date.now();
      const result = await useCase.execute();
      const endTime = Date.now();

      // Assert
      expect(result.itens.length).toBeGreaterThan(0);
      expect(result.resumo.totalItens).toBeGreaterThan(0);
      
      // Performance assertion - should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle concurrent requests correctly', async () => {
      // Arrange
      mockPrismaService.estoqueItem.findMany.mockResolvedValue(mockEstoqueData);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue(null);

      // Act - Execute multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => useCase.execute());
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('itens');
        expect(result).toHaveProperty('resumo');
        expect(result).toHaveProperty('dataGeracao');
      });
    });

    it('should handle null/undefined values in database results', async () => {
      // Arrange - Data with some null values
      const dataWithNulls = [
        {
          id: 'estoque-1',
          almoxarifadoId: 'almox-1',
          tipoEpiId: 'tipo-1',
          quantidade: 100,
          status: StatusEstoqueItem.DISPONIVEL,
          tipoEpi: {
            id: 'tipo-1',
            nome: 'Capacete',
            codigo: null, // Null code
          },
          almoxarifado: {
            id: 'almox-1',
            nome: 'Almoxarifado',
            codigo: 'A001',
            unidadeNegocio: {
              nome: null, // Null unit name
            },
          },
        },
      ];

      mockPrismaService.estoqueItem.findMany.mockResolvedValue(dataWithNulls);
      mockPrismaService.movimentacaoEstoque.findFirst.mockResolvedValue(null);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.itens).toHaveLength(1);
      expect(result.itens[0].tipoEpiCodigo).toBe(null);
      expect(result.itens[0].unidadeNegocioNome).toBe(null);
    });
  });
});