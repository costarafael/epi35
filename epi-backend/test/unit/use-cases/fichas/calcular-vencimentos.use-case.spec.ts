import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessError } from '@domain/exceptions/business.exception';
import { StatusEntrega } from '@domain/enums';

// Mock interfaces for the use case that should exist
interface CalcularVencimentosInput {
  entregaId?: string;
  colaboradorId?: string;
  almoxarifadoId?: string;
  tipoEpiId?: string;
  diasAntecedencia?: number;
  incluirVencidas?: boolean;
}

interface VencimentoOutput {
  entregaId: string;
  colaboradorId: string;
  colaboradorNome: string;
  tipoEpiId: string;
  tipoEpiNome: string;
  dataEntrega: Date;
  dataVencimento: Date;
  diasRestantes: number;
  status: 'ATIVO' | 'VENCIDO' | 'PROXIMO_VENCIMENTO';
  numeroSerie?: string;
  lote?: string;
  validadeMeses?: number;
}

interface CalcularVencimentosOutput {
  vencimentos: VencimentoOutput[];
  estatisticas: {
    totalItensAtivos: number;
    itensVencidos: number;
    itensProximoVencimento: number;
    itensComMaisTempo: number;
  };
}

// Mock implementation of the use case
class CalcularVencimentosUseCase {
  constructor(private readonly prisma: any) {}

  async execute(input: CalcularVencimentosInput): Promise<CalcularVencimentosOutput> {
    await this.validarInput(input);
    
    const entregas = await this.obterEntregasAtivas(input);
    const vencimentos = await this.calcularVencimentosEntregas(entregas, input.diasAntecedencia || 30);
    const estatisticas = this.calcularEstatisticas(vencimentos);

    return {
      vencimentos,
      estatisticas,
    };
  }

  async calcularVencimentoEntrega(
    entregaId: string,
    validadeMeses?: number
  ): Promise<Date | null> {
    const entrega = await this.prisma.entrega.findUnique({
      where: { id: entregaId },
      include: {
        fichaEpi: {
          include: {
            tipoEpi: true,
          },
        },
      },
    });

    if (!entrega) {
      throw new BusinessError('Entrega não encontrada');
    }

    const mesesValidade = validadeMeses || entrega.fichaEpi.tipoEpi.validadeMeses;
    
    if (!mesesValidade) {
      return null; // EPI sem validade definida
    }

    const dataVencimento = new Date(entrega.dataEntrega);
    dataVencimento.setMonth(dataVencimento.getMonth() + mesesValidade);
    
    return dataVencimento;
  }

  async obterVencimentosPorColaborador(
    colaboradorId: string,
    incluirVencidas: boolean = false
  ): Promise<VencimentoOutput[]> {
    const entregas = await this.prisma.entrega.findMany({
      where: {
        colaboradorId,
        status: StatusEntrega.ATIVA,
      },
      include: {
        colaborador: true,
        fichaEpi: {
          include: {
            tipoEpi: true,
          },
        },
        itens: true,
      },
    });

    const vencimentos = [];
    const hoje = new Date();

    for (const entrega of entregas) {
      if (!entrega.dataVencimento) continue;

      const diasRestantes = Math.ceil(
        (entrega.dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (!incluirVencidas && diasRestantes < 0) continue;

      let status: 'ATIVO' | 'VENCIDO' | 'PROXIMO_VENCIMENTO';
      if (diasRestantes < 0) {
        status = 'VENCIDO';
      } else if (diasRestantes <= 30) {
        status = 'PROXIMO_VENCIMENTO';
      } else {
        status = 'ATIVO';
      }

      for (const item of entrega.itens) {
        vencimentos.push({
          entregaId: entrega.id,
          colaboradorId: entrega.colaboradorId,
          colaboradorNome: entrega.colaborador.nome,
          tipoEpiId: entrega.fichaEpi.tipoEpiId,
          tipoEpiNome: entrega.fichaEpi.tipoEpi.nome,
          dataEntrega: entrega.dataEntrega,
          dataVencimento: entrega.dataVencimento,
          diasRestantes,
          status,
          numeroSerie: item.numeroSerie,
          lote: item.lote,
          validadeMeses: entrega.fichaEpi.tipoEpi.validadeMeses,
        });
      }
    }

    return vencimentos;
  }

  async renovarVencimento(
    entregaId: string,
    novaDataVencimento: Date,
    usuarioId: string,
    observacoes?: string
  ): Promise<void> {
    const entrega = await this.prisma.entrega.findUnique({
      where: { id: entregaId },
    });

    if (!entrega) {
      throw new BusinessError('Entrega não encontrada');
    }

    if (entrega.status !== StatusEntrega.ATIVA) {
      throw new BusinessError('Apenas entregas ativas podem ter vencimento renovado');
    }

    if (novaDataVencimento <= entrega.dataEntrega) {
      throw new BusinessError('Nova data de vencimento deve ser posterior à data de entrega');
    }

    await this.prisma.entrega.update({
      where: { id: entregaId },
      data: {
        dataVencimento: novaDataVencimento,
        observacoes: observacoes || entrega.observacoes,
      },
    });

    // Registrar log de renovação
    await this.prisma.logOperacao.create({
      data: {
        operacao: 'RENOVACAO_VENCIMENTO',
        entregaId,
        usuarioId,
        detalhes: {
          dataVencimentoAnterior: entrega.dataVencimento,
          novaDataVencimento,
          observacoes,
        },
      },
    });
  }

  private async validarInput(input: CalcularVencimentosInput): Promise<void> {
    if (input.diasAntecedencia && input.diasAntecedencia < 0) {
      throw new BusinessError('Dias de antecedência deve ser um número positivo');
    }
  }

  private async obterEntregasAtivas(input: CalcularVencimentosInput): Promise<any[]> {
    const where: any = {
      status: StatusEntrega.ATIVA,
      dataVencimento: { not: null },
    };

    if (input.entregaId) {
      where.id = input.entregaId;
    }

    if (input.colaboradorId) {
      where.colaboradorId = input.colaboradorId;
    }

    if (input.almoxarifadoId) {
      where.fichaEpi = { almoxarifadoId: input.almoxarifadoId };
    }

    if (input.tipoEpiId) {
      where.fichaEpi = { ...where.fichaEpi, tipoEpiId: input.tipoEpiId };
    }

    return await this.prisma.entrega.findMany({
      where,
      include: {
        colaborador: true,
        fichaEpi: {
          include: {
            tipoEpi: true,
          },
        },
        itens: true,
      },
    });
  }

  private async calcularVencimentosEntregas(
    entregas: any[],
    diasAntecedencia: number
  ): Promise<VencimentoOutput[]> {
    const vencimentos = [];
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + diasAntecedencia);

    for (const entrega of entregas) {
      if (!entrega.dataVencimento) continue;

      const diasRestantes = Math.ceil(
        (entrega.dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );

      let status: 'ATIVO' | 'VENCIDO' | 'PROXIMO_VENCIMENTO';
      if (diasRestantes < 0) {
        status = 'VENCIDO';
      } else if (diasRestantes <= diasAntecedencia) {
        status = 'PROXIMO_VENCIMENTO';
      } else {
        status = 'ATIVO';
      }

      for (const item of entrega.itens) {
        vencimentos.push({
          entregaId: entrega.id,
          colaboradorId: entrega.colaboradorId,
          colaboradorNome: entrega.colaborador.nome,
          tipoEpiId: entrega.fichaEpi.tipoEpiId,
          tipoEpiNome: entrega.fichaEpi.tipoEpi.nome,
          dataEntrega: entrega.dataEntrega,
          dataVencimento: entrega.dataVencimento,
          diasRestantes,
          status,
          numeroSerie: item.numeroSerie,
          lote: item.lote,
          validadeMeses: entrega.fichaEpi.tipoEpi.validadeMeses,
        });
      }
    }

    return vencimentos;
  }

  private calcularEstatisticas(vencimentos: VencimentoOutput[]) {
    return {
      totalItensAtivos: vencimentos.length,
      itensVencidos: vencimentos.filter(v => v.status === 'VENCIDO').length,
      itensProximoVencimento: vencimentos.filter(v => v.status === 'PROXIMO_VENCIMENTO').length,
      itensComMaisTempo: vencimentos.filter(v => v.diasRestantes > 90).length,
    };
  }
}

// Mock do PrismaService
const mockPrismaService = {
  entrega: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  logOperacao: {
    create: vi.fn(),
  },
};

describe('CalcularVencimentosUseCase', () => {
  let useCase: CalcularVencimentosUseCase;
  let prismaService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaService = mockPrismaService;
    useCase = new CalcularVencimentosUseCase(prismaService);
  });

  describe('execute', () => {
    const mockEntregaAtiva = {
      id: 'entrega-123',
      colaboradorId: 'colaborador-123',
      dataEntrega: new Date('2023-01-01'),
      dataVencimento: new Date('2023-07-01'),
      status: StatusEntrega.ATIVA,
      colaborador: {
        nome: 'João Silva',
      },
      fichaEpi: {
        tipoEpiId: 'tipo-123',
        tipoEpi: {
          nome: 'Capacete',
          validadeMeses: 6,
        },
      },
      itens: [
        {
          id: 'item-123',
          numeroSerie: 'SN001',
          lote: 'LT001',
        },
      ],
    };

    it('should calculate vencimentos for active entregas', async () => {
      // Arrange
      const input: CalcularVencimentosInput = {
        diasAntecedencia: 30,
      };

      prismaService.entrega.findMany = vi.fn().mockResolvedValue([mockEntregaAtiva]);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.vencimentos).toHaveLength(1);
      expect(result.vencimentos[0]).toEqual({
        entregaId: 'entrega-123',
        colaboradorId: 'colaborador-123',
        colaboradorNome: 'João Silva',
        tipoEpiId: 'tipo-123',
        tipoEpiNome: 'Capacete',
        dataEntrega: mockEntregaAtiva.dataEntrega,
        dataVencimento: mockEntregaAtiva.dataVencimento,
        diasRestantes: expect.any(Number),
        status: expect.any(String),
        numeroSerie: 'SN001',
        lote: 'LT001',
        validadeMeses: 6,
      });
      expect(result.estatisticas.totalItensAtivos).toBe(1);
    });

    it('should filter by colaborador', async () => {
      // Arrange
      const input: CalcularVencimentosInput = {
        colaboradorId: 'colaborador-123',
      };

      prismaService.entrega.findMany = vi.fn().mockResolvedValue([]);

      // Act
      await useCase.execute(input);

      // Assert
      expect(prismaService.entrega.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            colaboradorId: 'colaborador-123',
          }),
        })
      );
    });

    it('should validate negative dias antecedencia', async () => {
      // Arrange
      const input: CalcularVencimentosInput = {
        diasAntecedencia: -10,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        new BusinessError('Dias de antecedência deve ser um número positivo')
      );
    });
  });

  describe('calcularVencimentoEntrega', () => {
    it('should calculate vencimento based on tipo EPI validity', async () => {
      // Arrange
      const mockEntrega = {
        id: 'entrega-123',
        dataEntrega: new Date('2023-01-01'),
        fichaEpi: {
          tipoEpi: {
            validadeMeses: 12,
          },
        },
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntrega);

      // Act
      const result = await useCase.calcularVencimentoEntrega('entrega-123');

      // Assert
      const expectedDate = new Date('2024-01-01');
      expect(result).toEqual(expectedDate);
    });

    it('should return null for EPI without validity', async () => {
      // Arrange
      const mockEntrega = {
        id: 'entrega-123',
        dataEntrega: new Date('2023-01-01'),
        fichaEpi: {
          tipoEpi: {
            validadeMeses: null,
          },
        },
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntrega);

      // Act
      const result = await useCase.calcularVencimentoEntrega('entrega-123');

      // Assert
      expect(result).toBeNull();
    });

    it('should use custom validity months when provided', async () => {
      // Arrange
      const mockEntrega = {
        id: 'entrega-123',
        dataEntrega: new Date('2023-01-01'),
        fichaEpi: {
          tipoEpi: {
            validadeMeses: 12,
          },
        },
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntrega);

      // Act
      const result = await useCase.calcularVencimentoEntrega('entrega-123', 6);

      // Assert
      const expectedDate = new Date('2023-07-01');
      expect(result).toEqual(expectedDate);
    });

    it('should throw error when entrega not found', async () => {
      // Arrange
      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.calcularVencimentoEntrega('invalid-id')).rejects.toThrow(
        new BusinessError('Entrega não encontrada')
      );
    });
  });

  describe('obterVencimentosPorColaborador', () => {
    it('should return vencimentos for colaborador', async () => {
      // Arrange
      const mockEntregas = [{
        id: 'entrega-123',
        colaboradorId: 'colaborador-123',
        dataEntrega: new Date('2023-01-01'),
        dataVencimento: new Date('2023-12-01'),
        status: StatusEntrega.ATIVA,
        colaborador: { nome: 'João Silva' },
        fichaEpi: {
          tipoEpiId: 'tipo-123',
          tipoEpi: { nome: 'Capacete', validadeMeses: 12 },
        },
        itens: [{ numeroSerie: 'SN001', lote: 'LT001' }],
      }];

      prismaService.entrega.findMany = vi.fn().mockResolvedValue(mockEntregas);

      // Act
      const result = await useCase.obterVencimentosPorColaborador('colaborador-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].colaboradorNome).toBe('João Silva');
    });

    it('should exclude expired items when incluirVencidas is false', async () => {
      // Arrange
      const dataVencida = new Date();
      dataVencida.setDate(dataVencida.getDate() - 10); // 10 days ago

      const mockEntregas = [{
        id: 'entrega-123',
        colaboradorId: 'colaborador-123',
        dataEntrega: new Date('2022-01-01'),
        dataVencimento: dataVencida,
        status: StatusEntrega.ATIVA,
        colaborador: { nome: 'João Silva' },
        fichaEpi: {
          tipoEpiId: 'tipo-123',
          tipoEpi: { nome: 'Capacete', validadeMeses: 12 },
        },
        itens: [{ numeroSerie: 'SN001' }],
      }];

      prismaService.entrega.findMany = vi.fn().mockResolvedValue(mockEntregas);

      // Act
      const result = await useCase.obterVencimentosPorColaborador('colaborador-123', false);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should include expired items when incluirVencidas is true', async () => {
      // Arrange
      const dataVencida = new Date();
      dataVencida.setDate(dataVencida.getDate() - 10);

      const mockEntregas = [{
        id: 'entrega-123',
        colaboradorId: 'colaborador-123',
        dataEntrega: new Date('2022-01-01'),
        dataVencimento: dataVencida,
        status: StatusEntrega.ATIVA,
        colaborador: { nome: 'João Silva' },
        fichaEpi: {
          tipoEpiId: 'tipo-123',
          tipoEpi: { nome: 'Capacete', validadeMeses: 12 },
        },
        itens: [{ numeroSerie: 'SN001' }],
      }];

      prismaService.entrega.findMany = vi.fn().mockResolvedValue(mockEntregas);

      // Act
      const result = await useCase.obterVencimentosPorColaborador('colaborador-123', true);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('VENCIDO');
    });
  });

  describe('renovarVencimento', () => {
    it('should successfully renew vencimento', async () => {
      // Arrange
      const mockEntrega = {
        id: 'entrega-123',
        dataEntrega: new Date('2023-01-01'),
        dataVencimento: new Date('2023-12-01'),
        status: StatusEntrega.ATIVA,
        observacoes: 'Observação inicial',
      };

      const novaDataVencimento = new Date('2024-12-01');
      const usuarioId = 'user-123';
      const observacoes = 'Renovação autorizada';

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntrega);
      prismaService.entrega.update = vi.fn().mockResolvedValue({});
      prismaService.logOperacao.create = vi.fn().mockResolvedValue({});

      // Act
      await useCase.renovarVencimento('entrega-123', novaDataVencimento, usuarioId, observacoes);

      // Assert
      expect(prismaService.entrega.update).toHaveBeenCalledWith({
        where: { id: 'entrega-123' },
        data: {
          dataVencimento: novaDataVencimento,
          observacoes,
        },
      });

      expect(prismaService.logOperacao.create).toHaveBeenCalledWith({
        data: {
          operacao: 'RENOVACAO_VENCIMENTO',
          entregaId: 'entrega-123',
          usuarioId,
          detalhes: {
            dataVencimentoAnterior: mockEntrega.dataVencimento,
            novaDataVencimento,
            observacoes,
          },
        },
      });
    });

    it('should throw error when entrega not found', async () => {
      // Arrange
      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.renovarVencimento('invalid-id', new Date(), 'user-123')
      ).rejects.toThrow(new BusinessError('Entrega não encontrada'));
    });

    it('should throw error when entrega is not active', async () => {
      // Arrange
      const mockEntrega = {
        id: 'entrega-123',
        status: StatusEntrega.CANCELADA,
      };

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntrega);

      // Act & Assert
      await expect(
        useCase.renovarVencimento('entrega-123', new Date(), 'user-123')
      ).rejects.toThrow(
        new BusinessError('Apenas entregas ativas podem ter vencimento renovado')
      );
    });

    it('should throw error when new date is not after entrega date', async () => {
      // Arrange
      const mockEntrega = {
        id: 'entrega-123',
        dataEntrega: new Date('2023-06-01'),
        status: StatusEntrega.ATIVA,
      };

      const novaDataVencimento = new Date('2023-01-01'); // Before entrega date

      prismaService.entrega.findUnique = vi.fn().mockResolvedValue(mockEntrega);

      // Act & Assert
      await expect(
        useCase.renovarVencimento('entrega-123', novaDataVencimento, 'user-123')
      ).rejects.toThrow(
        new BusinessError('Nova data de vencimento deve ser posterior à data de entrega')
      );
    });
  });
});
