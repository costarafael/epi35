import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { ProcessarDevolucaoUseCase, ProcessarDevolucaoInput, DevolucaoOutput } from '@application/use-cases/fichas/processar-devolucao.use-case';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StatusEntregaItem, StatusEstoqueItem } from '@domain/enums';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';

// Mock do PrismaService
const mockPrismaService = {
  $transaction: vi.fn(),
  entrega: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  entregaItem: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  movimentacaoEstoque: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  estoqueItem: {
    updateMany: vi.fn(),
    create: vi.fn(),
  },
};

describe('ProcessarDevolucaoUseCase', () => {
  let useCase: ProcessarDevolucaoUseCase;
  let prismaService: PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaService = mockPrismaService as any;
    useCase = new ProcessarDevolucaoUseCase(prismaService);
  });

  describe('execute', () => {
    const mockEntregaCompleta = {
      id: 'entrega-123',
      status: 'ATIVA',
      fichaEpi: {
        almoxarifadoId: 'almoxarifado-123',
        tipoEpi: {
          exigeAssinaturaEntrega: false,
        },
      },
      colaborador: {
        nome: 'João Silva',
        cpf: '12345678901',
      },
      itens: [
        {
          id: 'item-123',
          tipoEpiId: 'tipo-123',
          status: 'ENTREGUE',
          numeroSerie: 'SN001',
          lote: 'LT001',
          dataEntrega: new Date('2023-01-01'),
        },
      ],
    };

    const validInput: ProcessarDevolucaoInput = {
      entregaId: 'entrega-123',
      itensParaDevolucao: [
        {
          itemId: 'item-123',
          condicaoItem: 'BOM',
          motivoDevolucao: 'Fim do período de uso',
        },
      ],
      usuarioId: 'user-123',
    };

    it('should successfully process devolucao with BOM condition', async () => {
      // Arrange
      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntregaCompleta);
      prismaService.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          entregaItem: {
            update: vi.fn().mockResolvedValue({}),
            findMany: vi.fn().mockResolvedValue([{ status: 'DEVOLVIDO' }]),
          },
          movimentacaoEstoque: {
            findFirst: vi.fn().mockResolvedValue({ saldoPosterior: 10 }),
            create: vi.fn().mockResolvedValue({ id: 'mov-123' }),
          },
          estoqueItem: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          entrega: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result).toEqual({
        entregaId: 'entrega-123',
        itensDevolucao: [
          {
            itemId: 'item-123',
            tipoEpiId: 'tipo-123',
            numeroSerie: 'SN001',
            lote: 'LT001',
            statusAnterior: 'ENTREGUE',
            novoStatus: StatusEntregaItem.DEVOLVIDO,
            motivoDevolucao: 'Fim do período de uso',
            condicaoItem: 'BOM',
          },
        ],
        movimentacoesEstoque: [
          {
            id: 'mov-123',
            tipoEpiId: 'tipo-123',
            quantidade: 1,
            statusEstoque: StatusEstoqueItem.DISPONIVEL,
          },
        ],
        statusEntregaAtualizado: 'DEVOLVIDA_TOTAL',
        dataProcessamento: expect.any(Date),
      });

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should successfully process devolucao with DANIFICADO condition', async () => {
      // Arrange
      const inputDanificado = {
        ...validInput,
        itensParaDevolucao: [
          {
            itemId: 'item-123',
            condicaoItem: 'DANIFICADO' as const,
            motivoDevolucao: 'Item danificado durante uso',
          },
        ],
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntregaCompleta);
      prismaService.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          entregaItem: {
            update: vi.fn().mockResolvedValue({}),
            findMany: vi.fn().mockResolvedValue([{ status: 'DEVOLVIDO' }]),
          },
          movimentacaoEstoque: {
            findFirst: vi.fn().mockResolvedValue({ saldoPosterior: 10 }),
            create: vi.fn().mockResolvedValue({ id: 'mov-123' }),
          },
          estoqueItem: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          entrega: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      // Act
      const result = await useCase.execute(inputDanificado);

      // Assert
      expect(result.movimentacoesEstoque[0].statusEstoque).toBe(StatusEstoqueItem.AGUARDANDO_INSPECAO);
    });

    it('should process devolucao with PERDIDO condition without creating stock movement', async () => {
      // Arrange
      const inputPerdido = {
        ...validInput,
        itensParaDevolucao: [
          {
            itemId: 'item-123',
            condicaoItem: 'PERDIDO' as const,
            motivoDevolucao: 'Item perdido pelo colaborador',
          },
        ],
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntregaCompleta);
      prismaService.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          entregaItem: {
            update: vi.fn().mockResolvedValue({}),
            findMany: vi.fn().mockResolvedValue([{ status: 'PERDIDO' }]),
          },
          entrega: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      // Act
      const result = await useCase.execute(inputPerdido);

      // Assert
      expect(result.movimentacoesEstoque).toHaveLength(0);
      expect(result.itensDevolucao[0].novoStatus).toBe(StatusEntregaItem.PERDIDO);
    });

    it('should require signature when EPI tipo requires it', async () => {
      // Arrange
      const entregaComAssinatura = {
        ...mockEntregaCompleta,
        fichaEpi: {
          ...mockEntregaCompleta.fichaEpi,
          tipoEpi: {
            exigeAssinaturaEntrega: true,
          },
        },
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(entregaComAssinatura);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new BusinessError('Assinatura do colaborador é obrigatória para devolução deste tipo de EPI')
      );
    });

    it('should accept signature when EPI tipo requires it', async () => {
      // Arrange
      const entregaComAssinatura = {
        ...mockEntregaCompleta,
        fichaEpi: {
          ...mockEntregaCompleta.fichaEpi,
          tipoEpi: {
            exigeAssinaturaEntrega: true,
          },
        },
      };

      const inputComAssinatura = {
        ...validInput,
        assinaturaColaborador: 'base64-signature-data',
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(entregaComAssinatura);
      prismaService.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          entregaItem: {
            update: vi.fn().mockResolvedValue({}),
            findMany: vi.fn().mockResolvedValue([{ status: 'DEVOLVIDO' }]),
          },
          movimentacaoEstoque: {
            findFirst: vi.fn().mockResolvedValue({ saldoPosterior: 10 }),
            create: vi.fn().mockResolvedValue({ id: 'mov-123' }),
          },
          estoqueItem: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          entrega: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      // Act
      const result = await useCase.execute(inputComAssinatura);

      // Assert
      expect(result.entregaId).toBe('entrega-123');
    });

    it('should throw error when entrega is not found', async () => {
      // Arrange
      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new NotFoundError('Entrega', 'entrega-123')
      );
    });

    it('should throw error when item is not ENTREGUE', async () => {
      // Arrange
      const entregaComItemDevolvido = {
        ...mockEntregaCompleta,
        itens: [
          {
            id: 'item-123',
            status: 'DEVOLVIDO',
          },
        ],
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(entregaComItemDevolvido);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new BusinessError('Item item-123 não pode ser devolvido. Status atual: DEVOLVIDO')
      );
    });

    it('should throw error when item is not found in entrega', async () => {
      // Arrange
      const entregaSemItem = {
        ...mockEntregaCompleta,
        itens: [],
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(entregaSemItem);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new BusinessError('Item item-123 não encontrado na entrega')
      );
    });

    it('should validate input parameters', async () => {
      // Test missing entregaId
      const inputSemEntrega = { ...validInput, entregaId: '' };
      await expect(useCase.execute(inputSemEntrega)).rejects.toThrow(
        new BusinessError('ID da entrega é obrigatório')
      );

      // Test missing itens
      const inputSemItens = { ...validInput, itensParaDevolucao: [] };
      await expect(useCase.execute(inputSemItens)).rejects.toThrow(
        new BusinessError('Lista de itens para devolução é obrigatória')
      );

      // Test missing usuarioId
      const inputSemUsuario = { ...validInput, usuarioId: '' };
      await expect(useCase.execute(inputSemUsuario)).rejects.toThrow(
        new BusinessError('Usuário é obrigatório')
      );

      // Test invalid condition
      const inputCondicaoInvalida = {
        ...validInput,
        itensParaDevolucao: [
          {
            itemId: 'item-123',
            condicaoItem: 'INVALIDA' as any,
          },
        ],
      };
      await expect(useCase.execute(inputCondicaoInvalida)).rejects.toThrow(
        new BusinessError('Condição do item inválida: INVALIDA. Use: BOM, DANIFICADO ou PERDIDO')
      );
    });

    it('should handle partial returns correctly', async () => {
      // Arrange
      const entregaMultiplosItens = {
        ...mockEntregaCompleta,
        itens: [
          {
            id: 'item-123',
            tipoEpiId: 'tipo-123',
            status: 'ENTREGUE',
          },
          {
            id: 'item-456',
            tipoEpiId: 'tipo-123',
            status: 'ENTREGUE',
          },
        ],
      };

      const inputParcial = {
        ...validInput,
        itensParaDevolucao: [
          {
            itemId: 'item-123',
            condicaoItem: 'BOM' as const,
          },
        ],
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(entregaMultiplosItens);
      prismaService.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          entregaItem: {
            update: vi.fn().mockResolvedValue({}),
            findMany: vi.fn().mockResolvedValue([
              { status: 'DEVOLVIDO' },
              { status: 'ENTREGUE' },
            ]),
          },
          movimentacaoEstoque: {
            findFirst: vi.fn().mockResolvedValue({ saldoPosterior: 10 }),
            create: vi.fn().mockResolvedValue({ id: 'mov-123' }),
          },
          estoqueItem: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          entrega: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      // Act
      const result = await useCase.execute(inputParcial);

      // Assert
      expect(result.statusEntregaAtualizado).toBe('DEVOLVIDA_PARCIAL');
    });

    it('should create new stock record when no existing stock found', async () => {
      // Arrange
      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntregaCompleta);
      prismaService.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          entregaItem: {
            update: vi.fn().mockResolvedValue({}),
            findMany: vi.fn().mockResolvedValue([{ status: 'DEVOLVIDO' }]),
          },
          movimentacaoEstoque: {
            findFirst: vi.fn().mockResolvedValue({ saldoPosterior: 10 }),
            create: vi.fn().mockResolvedValue({ id: 'mov-123' }),
          },
          estoqueItem: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }), // No existing stock
            create: vi.fn().mockResolvedValue({ id: 'stock-123' }),
          },
          entrega: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result.entregaId).toBe('entrega-123');
    });
  });

  describe('validarDevolucaoPermitida', () => {
    it('should validate items can be returned', async () => {
      // Arrange
      const mockEntrega = {
        id: 'entrega-123',
        status: 'ATIVA',
        itens: [
          {
            id: 'item-123',
            status: 'ENTREGUE',
          },
          {
            id: 'item-456',
            status: 'DEVOLVIDO',
          },
        ],
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntrega);

      // Act
      const result = await useCase.validarDevolucaoPermitida('entrega-123', ['item-123', 'item-456']);

      // Assert
      expect(result).toEqual({
        permitida: true,
        itensValidos: ['item-123'],
        itensInvalidos: [
          {
            itemId: 'item-456',
            motivo: 'Item já está com status DEVOLVIDO',
          },
        ],
      });
    });

    it('should reject devolucao for cancelled entrega', async () => {
      // Arrange
      const mockEntregaCancelada = {
        id: 'entrega-123',
        status: 'CANCELADA',
        itens: [],
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntregaCancelada);

      // Act
      const result = await useCase.validarDevolucaoPermitida('entrega-123', ['item-123']);

      // Assert
      expect(result).toEqual({
        permitida: false,
        motivo: 'Entrega está cancelada',
        itensValidos: [],
        itensInvalidos: [
          {
            itemId: 'item-123',
            motivo: 'Entrega cancelada',
          },
        ],
      });
    });
  });

  describe('obterHistoricoDevolucoes', () => {
    it('should return historic data with statistics', async () => {
      // Arrange
      const mockItens = [
        {
          id: 'item-123',
          status: 'DEVOLVIDO',
          dataDevolucao: new Date('2023-06-01'),
          motivoDevolucao: 'Fim do período',
          numeroSerie: 'SN001',
          lote: 'LT001',
          entrega: {
            dataEntrega: new Date('2023-01-01'),
            colaborador: { nome: 'João Silva' },
          },
          tipoEpi: { nome: 'Capacete' },
        },
        {
          id: 'item-456',
          status: 'PERDIDO',
          dataDevolucao: new Date('2023-06-02'),
          motivoDevolucao: 'Item perdido',
          entrega: {
            dataEntrega: new Date('2023-02-01'),
            colaborador: { nome: 'Maria Santos' },
          },
          tipoEpi: { nome: 'Luvas' },
        },
      ];

      prismaService.entregaItem.findMany = vi.fn().mockResolvedValue(mockItens);

      // Act
      const result = await useCase.obterHistoricoDevolucoes();

      // Assert
      expect(result.devolucoes).toHaveLength(2);
      expect(result.estatisticas).toEqual({
        totalDevolucoes: 2,
        itensEmBomEstado: 1,
        itensDanificados: 0,
        itensPerdidos: 1,
        tempoMedioUso: expect.any(Number),
      });
    });

    it('should filter by colaborador', async () => {
      // Arrange
      prismaService.entregaItem.findMany = vi.fn().mockResolvedValue([]);

      // Act
      await useCase.obterHistoricoDevolucoes('colaborador-123');

      // Assert
      expect(prismaService.entregaItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entrega: { colaboradorId: 'colaborador-123' },
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      const dataInicio = new Date('2023-01-01');
      const dataFim = new Date('2023-12-31');
      prismaService.entregaItem.findMany = vi.fn().mockResolvedValue([]);

      // Act
      await useCase.obterHistoricoDevolucoes(undefined, undefined, dataInicio, dataFim);

      // Assert
      expect(prismaService.entregaItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dataDevolucao: {
              gte: dataInicio,
              lte: dataFim,
            },
          }),
        })
      );
    });
  });
});
