import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CriarFichaEpiUseCase, CriarFichaEpiInput, FichaEpiOutput } from '@application/use-cases/fichas/criar-ficha-epi.use-case';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StatusFichaEPI } from '@domain/enums';
import { BusinessError, ConflictError, NotFoundError } from '@domain/exceptions/business.exception';
import { FichaEPI } from '@domain/entities/ficha-epi.entity';

// Mock do PrismaService
const mockPrismaService = {
  fichaEPI: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
  },
  colaborador: {
    findUnique: vi.fn(),
  },
  tipoEPI: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  almoxarifado: {
    findUnique: vi.fn(),
  },
  entrega: {
    count: vi.fn(),
  },
  historicoFicha: {
    create: vi.fn(),
  },
};

// Mock do FichaEPI.create
vi.mock('@domain/entities/ficha-epi.entity', () => ({
  FichaEPI: {
    create: vi.fn(),
  },
}));

describe('CriarFichaEpiUseCase', () => {
  let useCase: CriarFichaEpiUseCase;
  let prismaService: PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaService = mockPrismaService as any;
    useCase = new CriarFichaEpiUseCase(prismaService);
  });

  describe('execute', () => {
    const validInput: CriarFichaEpiInput = {
      colaboradorId: 'colaborador-123',
      tipoEpiId: 'tipo-epi-123',
      almoxarifadoId: 'almoxarifado-123',
      status: StatusFichaEPI.ATIVA,
    };

    const mockColaborador = {
      id: 'colaborador-123',
      nome: 'João Silva',
      cpf: '12345678901',
      matricula: 'MAT001',
      ativo: true,
      unidadeNegocioId: 'unidade-123',
      setor: 'Produção',
      cargo: 'Operador',
    };

    const mockTipoEpi = {
      id: 'tipo-epi-123',
      nome: 'Capacete',
      codigo: 'CAP001',
      exigeAssinaturaEntrega: false,
      ativo: true,
    };

    const mockAlmoxarifado = {
      id: 'almoxarifado-123',
      nome: 'Almoxarifado Central',
      codigo: 'ALM001',
      ativo: true,
      unidadeNegocioId: 'unidade-123',
    };

    const mockFichaCreated = {
      id: 'ficha-123',
      colaboradorId: 'colaborador-123',
      tipoEpiId: 'tipo-epi-123',
      almoxarifadoId: 'almoxarifado-123',
      status: StatusFichaEPI.ATIVA,
      createdAt: new Date(),
      updatedAt: new Date(),
      colaborador: {
        nome: mockColaborador.nome,
        cpf: mockColaborador.cpf,
        matricula: mockColaborador.matricula,
      },
      tipoEpi: {
        nome: mockTipoEpi.nome,
        codigo: mockTipoEpi.codigo,
        exigeAssinaturaEntrega: mockTipoEpi.exigeAssinaturaEntrega,
      },
      almoxarifado: {
        nome: mockAlmoxarifado.nome,
        codigo: mockAlmoxarifado.codigo,
      },
    };

    it('should successfully create ficha EPI', async () => {
      // Arrange
      (FichaEPI.create as any).mockReturnValue({
        colaboradorId: validInput.colaboradorId,
        tipoEpiId: validInput.tipoEpiId,
        almoxarifadoId: validInput.almoxarifadoId,
        status: StatusFichaEPI.ATIVA,
      });

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null); // Não existe ficha
      prismaService.colaborador.findUnique = vi.fn().mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique = vi.fn().mockResolvedValue(mockTipoEpi);
      prismaService.almoxarifado.findUnique = vi.fn().mockResolvedValue(mockAlmoxarifado);
      prismaService.fichaEPI.create = vi.fn().mockResolvedValue(mockFichaCreated);

      // Act
      const result = await useCase.execute(validInput);

      // Assert
      expect(result).toEqual({
        id: 'ficha-123',
        colaboradorId: 'colaborador-123',
        tipoEpiId: 'tipo-epi-123',
        almoxarifadoId: 'almoxarifado-123',
        status: StatusFichaEPI.ATIVA,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        colaborador: {
          nome: 'João Silva',
          cpf: '12345678901',
          matricula: 'MAT001',
        },
        tipoEpi: {
          nome: 'Capacete',
          codigo: 'CAP001',
          exigeAssinaturaEntrega: false,
        },
        almoxarifado: {
          nome: 'Almoxarifado Central',
          codigo: 'ALM001',
        },
      });

      expect(FichaEPI.create).toHaveBeenCalledWith(
        'colaborador-123',
        'tipo-epi-123',
        'almoxarifado-123',
        StatusFichaEPI.ATIVA
      );
      expect(prismaService.fichaEPI.create).toHaveBeenCalledWith({
        data: {
          colaboradorId: 'colaborador-123',
          tipoEpiId: 'tipo-epi-123',
          almoxarifadoId: 'almoxarifado-123',
          status: StatusFichaEPI.ATIVA,
        },
        include: expect.any(Object),
      });
    });

    it('should create ficha with default status when not provided', async () => {
      // Arrange
      const inputWithoutStatus = {
        colaboradorId: 'colaborador-123',
        tipoEpiId: 'tipo-epi-123',
        almoxarifadoId: 'almoxarifado-123',
      };

      (FichaEPI.create as any).mockReturnValue({
        colaboradorId: inputWithoutStatus.colaboradorId,
        tipoEpiId: inputWithoutStatus.tipoEpiId,
        almoxarifadoId: inputWithoutStatus.almoxarifadoId,
        status: StatusFichaEPI.ATIVA,
      });

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);
      prismaService.colaborador.findUnique = vi.fn().mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique = vi.fn().mockResolvedValue(mockTipoEpi);
      prismaService.almoxarifado.findUnique = vi.fn().mockResolvedValue(mockAlmoxarifado);
      prismaService.fichaEPI.create = vi.fn().mockResolvedValue(mockFichaCreated);

      // Act
      await useCase.execute(inputWithoutStatus);

      // Assert
      expect(FichaEPI.create).toHaveBeenCalledWith(
        'colaborador-123',
        'tipo-epi-123',
        'almoxarifado-123',
        StatusFichaEPI.ATIVA
      );
    });

    it('should throw BusinessError when colaboradorId is missing', async () => {
      // Arrange
      const invalidInput = {
        ...validInput,
        colaboradorId: '',
      };

      // Act & Assert
      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        new BusinessError('Colaborador é obrigatório')
      );
    });

    it('should throw BusinessError when tipoEpiId is missing', async () => {
      // Arrange
      const invalidInput = {
        ...validInput,
        tipoEpiId: '',
      };

      // Act & Assert
      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        new BusinessError('Tipo de EPI é obrigatório')
      );
    });

    it('should throw BusinessError when almoxarifadoId is missing', async () => {
      // Arrange
      const invalidInput = {
        ...validInput,
        almoxarifadoId: '',
      };

      // Act & Assert
      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        new BusinessError('Almoxarifado é obrigatório')
      );
    });

    it('should throw ConflictError when ficha already exists', async () => {
      // Arrange
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(mockFichaCreated);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new ConflictError('Já existe uma ficha de EPI para este colaborador, tipo de EPI e almoxarifado')
      );
    });

    it('should throw NotFoundError when colaborador not found', async () => {
      // Arrange
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);
      prismaService.colaborador.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new NotFoundError('Colaborador', 'colaborador-123')
      );
    });

    it('should throw BusinessError when colaborador is inactive', async () => {
      // Arrange
      const inactiveColaborador = { ...mockColaborador, ativo: false };
      
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);
      prismaService.colaborador.findUnique = vi.fn().mockResolvedValue(inactiveColaborador);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new BusinessError('Colaborador está inativo')
      );
    });

    it('should throw NotFoundError when tipo EPI not found', async () => {
      // Arrange
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);
      prismaService.colaborador.findUnique = vi.fn().mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new NotFoundError('Tipo de EPI', 'tipo-epi-123')
      );
    });

    it('should throw BusinessError when tipo EPI is inactive', async () => {
      // Arrange
      const inactiveTipoEpi = { ...mockTipoEpi, ativo: false };
      
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);
      prismaService.colaborador.findUnique = vi.fn().mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique = vi.fn().mockResolvedValue(inactiveTipoEpi);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new BusinessError('Tipo de EPI está inativo')
      );
    });

    it('should throw NotFoundError when almoxarifado not found', async () => {
      // Arrange
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);
      prismaService.colaborador.findUnique = vi.fn().mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique = vi.fn().mockResolvedValue(mockTipoEpi);
      prismaService.almoxarifado.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new NotFoundError('Almoxarifado', 'almoxarifado-123')
      );
    });

    it('should throw BusinessError when almoxarifado is inactive', async () => {
      // Arrange
      const inactiveAlmoxarifado = { ...mockAlmoxarifado, ativo: false };
      
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);
      prismaService.colaborador.findUnique = vi.fn().mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique = vi.fn().mockResolvedValue(mockTipoEpi);
      prismaService.almoxarifado.findUnique = vi.fn().mockResolvedValue(inactiveAlmoxarifado);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new BusinessError('Almoxarifado está inativo')
      );
    });

    it('should throw BusinessError when colaborador and almoxarifado are from different business units', async () => {
      // Arrange
      const differentUnitAlmoxarifado = { ...mockAlmoxarifado, unidadeNegocioId: 'unidade-456' };
      
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);
      prismaService.colaborador.findUnique = vi.fn().mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique = vi.fn().mockResolvedValue(mockTipoEpi);
      prismaService.almoxarifado.findUnique = vi.fn().mockResolvedValue(differentUnitAlmoxarifado);

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow(
        new BusinessError('Colaborador e almoxarifado devem pertencer à mesma unidade de negócio')
      );
    });
  });

  describe('ativarFicha', () => {
    it('should successfully activate ficha', async () => {
      // Arrange
      const inactiveFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.INATIVA,
      };

      const activatedFicha = {
        ...inactiveFicha,
        status: StatusFichaEPI.ATIVA,
        colaborador: { nome: 'João Silva', cpf: '12345678901', matricula: 'MAT001' },
        tipoEpi: { nome: 'Capacete', codigo: 'CAP001', exigeAssinaturaEntrega: false },
        almoxarifado: { nome: 'Almoxarifado Central', codigo: 'ALM001' },
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(inactiveFicha);
      prismaService.fichaEPI.update = vi.fn().mockResolvedValue(activatedFicha);

      // Act
      const result = await useCase.ativarFicha('ficha-123');

      // Assert
      expect(result.status).toBe(StatusFichaEPI.ATIVA);
      expect(prismaService.fichaEPI.update).toHaveBeenCalledWith({
        where: { id: 'ficha-123' },
        data: { status: StatusFichaEPI.ATIVA },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundError when ficha not found', async () => {
      // Arrange
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.ativarFicha('ficha-123')).rejects.toThrow(
        new NotFoundError('Ficha de EPI', 'ficha-123')
      );
    });

    it('should throw BusinessError when ficha is already active', async () => {
      // Arrange
      const activeFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.ATIVA,
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(activeFicha);

      // Act & Assert
      await expect(useCase.ativarFicha('ficha-123')).rejects.toThrow(
        new BusinessError('Ficha já está ativa')
      );
    });
  });

  describe('inativarFicha', () => {
    it('should successfully inactivate ficha when no active deliveries', async () => {
      // Arrange
      const activeFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.ATIVA,
      };

      const inactivatedFicha = {
        ...activeFicha,
        status: StatusFichaEPI.INATIVA,
        colaborador: { nome: 'João Silva', cpf: '12345678901', matricula: 'MAT001' },
        tipoEpi: { nome: 'Capacete', codigo: 'CAP001', exigeAssinaturaEntrega: false },
        almoxarifado: { nome: 'Almoxarifado Central', codigo: 'ALM001' },
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(activeFicha);
      prismaService.entrega.count = vi.fn().mockResolvedValue(0);
      prismaService.fichaEPI.update = vi.fn().mockResolvedValue(inactivatedFicha);

      // Act
      const result = await useCase.inativarFicha('ficha-123');

      // Assert
      expect(result.status).toBe(StatusFichaEPI.INATIVA);
      expect(prismaService.entrega.count).toHaveBeenCalledWith({
        where: {
          fichaEpiId: 'ficha-123',
          status: 'ATIVA',
        },
      });
    });

    it('should throw BusinessError when there are active deliveries', async () => {
      // Arrange
      const activeFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.ATIVA,
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(activeFicha);
      prismaService.entrega.count = vi.fn().mockResolvedValue(2);

      // Act & Assert
      await expect(useCase.inativarFicha('ficha-123')).rejects.toThrow(
        new BusinessError('Não é possível inativar: existe(m) 2 entrega(s) ativa(s) para esta ficha')
      );
    });

    it('should throw BusinessError when ficha is already inactive', async () => {
      // Arrange
      const inactiveFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.INATIVA,
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(inactiveFicha);

      // Act & Assert
      await expect(useCase.inativarFicha('ficha-123')).rejects.toThrow(
        new BusinessError('Ficha já está inativa')
      );
    });
  });

  describe('suspenderFicha', () => {
    it('should successfully suspend ficha', async () => {
      // Arrange
      const activeFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.ATIVA,
      };

      const suspendedFicha = {
        ...activeFicha,
        status: StatusFichaEPI.SUSPENSA,
        colaborador: { nome: 'João Silva', cpf: '12345678901', matricula: 'MAT001' },
        tipoEpi: { nome: 'Capacete', codigo: 'CAP001', exigeAssinaturaEntrega: false },
        almoxarifado: { nome: 'Almoxarifado Central', codigo: 'ALM001' },
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(activeFicha);
      prismaService.fichaEPI.update = vi.fn().mockResolvedValue(suspendedFicha);
      prismaService.historicoFicha.create = vi.fn().mockResolvedValue({});

      // Act
      const result = await useCase.suspenderFicha('ficha-123', 'Colaborador afastado');

      // Assert
      expect(result.status).toBe(StatusFichaEPI.SUSPENSA);
      expect(prismaService.historicoFicha.create).toHaveBeenCalledWith({
        data: {
          fichaEpiId: 'ficha-123',
          acao: 'SUSPENSAO',
          detalhes: { motivo: 'Colaborador afastado' },
        },
      });
    });

    it('should suspend ficha without creating history when no reason provided', async () => {
      // Arrange
      const activeFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.ATIVA,
      };

      const suspendedFicha = {
        ...activeFicha,
        status: StatusFichaEPI.SUSPENSA,
        colaborador: { nome: 'João Silva', cpf: '12345678901', matricula: 'MAT001' },
        tipoEpi: { nome: 'Capacete', codigo: 'CAP001', exigeAssinaturaEntrega: false },
        almoxarifado: { nome: 'Almoxarifado Central', codigo: 'ALM001' },
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(activeFicha);
      prismaService.fichaEPI.update = vi.fn().mockResolvedValue(suspendedFicha);

      // Act
      const result = await useCase.suspenderFicha('ficha-123');

      // Assert
      expect(result.status).toBe(StatusFichaEPI.SUSPENSA);
      expect(prismaService.historicoFicha.create).not.toHaveBeenCalled();
    });

    it('should throw BusinessError when ficha is already suspended', async () => {
      // Arrange
      const suspendedFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.SUSPENSA,
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(suspendedFicha);

      // Act & Assert
      await expect(useCase.suspenderFicha('ficha-123')).rejects.toThrow(
        new BusinessError('Ficha já está suspensa')
      );
    });
  });

  describe('criarOuAtivar', () => {
    const validInput: CriarFichaEpiInput = {
      colaboradorId: 'colaborador-123',
      tipoEpiId: 'tipo-epi-123',
      almoxarifadoId: 'almoxarifado-123',
    };

    it('should create new ficha when none exists', async () => {
      // Arrange
      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(null);
      const mockExecute = vi.spyOn(useCase, 'execute').mockResolvedValue({} as FichaEpiOutput);

      // Act
      const result = await useCase.criarOuAtivar(validInput);

      // Assert
      expect(result.criada).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(validInput);
    });

    it('should activate existing inactive ficha', async () => {
      // Arrange
      const inactiveFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.INATIVA,
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(inactiveFicha);
      const mockAtivarFicha = vi.spyOn(useCase, 'ativarFicha').mockResolvedValue({} as FichaEpiOutput);

      // Act
      const result = await useCase.criarOuAtivar(validInput);

      // Assert
      expect(result.criada).toBe(false);
      expect(mockAtivarFicha).toHaveBeenCalledWith('ficha-123');
    });

    it('should return existing active ficha', async () => {
      // Arrange
      const activeFicha = {
        id: 'ficha-123',
        status: StatusFichaEPI.ATIVA,
      };

      prismaService.fichaEPI.findUnique = vi.fn().mockResolvedValue(activeFicha);
      const mockObterFicha = vi.spyOn(useCase, 'obterFicha').mockResolvedValue({} as FichaEpiOutput);

      // Act
      const result = await useCase.criarOuAtivar(validInput);

      // Assert
      expect(result.criada).toBe(false);
      expect(mockObterFicha).toHaveBeenCalledWith('ficha-123');
    });
  });

  describe('obterEstatisticas', () => {
    it('should return complete statistics', async () => {
      // Arrange
      const mockFichasPorStatus = [
        { status: 'ATIVA', _count: { id: 5 } },
        { status: 'INATIVA', _count: { id: 2 } },
        { status: 'SUSPENSA', _count: { id: 1 } },
      ];

      const mockFichasPorTipo = [
        { tipoEpiId: 'tipo-1', _count: { id: 3 } },
        { tipoEpiId: 'tipo-2', _count: { id: 2 } },
      ];

      const mockFichasPorColaborador = [
        { colaboradorId: 'colab-1', _count: { id: 2 } },
        { colaboradorId: 'colab-2', _count: { id: 1 } },
      ];

      const mockTiposEpi = [
        { id: 'tipo-1', nome: 'Capacete' },
        { id: 'tipo-2', nome: 'Luvas' },
      ];

      const mockColaboradores = [
        { id: 'colab-1', nome: 'João Silva' },
        { id: 'colab-2', nome: 'Maria Santos' },
      ];

      prismaService.fichaEPI.groupBy = vi.fn()
        .mockResolvedValueOnce(mockFichasPorStatus)
        .mockResolvedValueOnce(mockFichasPorTipo)
        .mockResolvedValueOnce(mockFichasPorColaborador);
      
      prismaService.tipoEPI.findMany = vi.fn().mockResolvedValue(mockTiposEpi);
      prismaService.colaborador.findMany = vi.fn().mockResolvedValue(mockColaboradores);

      // Act
      const result = await useCase.obterEstatisticas();

      // Assert
      expect(result).toEqual({
        totalFichas: 8,
        fichasAtivas: 5,
        fichasInativas: 2,
        fichasSuspensas: 1,
        porTipoEpi: [
          { tipoEpiNome: 'Capacete', quantidade: 3 },
          { tipoEpiNome: 'Luvas', quantidade: 2 },
        ],
        porColaborador: [
          { colaboradorNome: 'João Silva', quantidade: 2 },
          { colaboradorNome: 'Maria Santos', quantidade: 1 },
        ],
      });
    });

    it('should filter by almoxarifado when provided', async () => {
      // Arrange
      prismaService.fichaEPI.groupBy = vi.fn().mockResolvedValue([]);
      prismaService.tipoEPI.findMany = vi.fn().mockResolvedValue([]);
      prismaService.colaborador.findMany = vi.fn().mockResolvedValue([]);

      // Act
      await useCase.obterEstatisticas('almoxarifado-123');

      // Assert
      expect(prismaService.fichaEPI.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { almoxarifadoId: 'almoxarifado-123' },
        })
      );
    });
  });

  describe('listarFichas', () => {
    it('should list fichas with filters', async () => {
      // Arrange
      const mockFichas = [
        {
          id: 'ficha-123',
          colaboradorId: 'colaborador-123',
          tipoEpiId: 'tipo-epi-123',
          almoxarifadoId: 'almoxarifado-123',
          status: StatusFichaEPI.ATIVA,
          createdAt: new Date(),
          updatedAt: new Date(),
          colaborador: { nome: 'João Silva', cpf: '12345678901', matricula: 'MAT001' },
          tipoEpi: { nome: 'Capacete', codigo: 'CAP001', exigeAssinaturaEntrega: false },
          almoxarifado: { nome: 'Almoxarifado Central', codigo: 'ALM001' },
        },
      ];

      prismaService.fichaEPI.findMany = vi.fn().mockResolvedValue(mockFichas);

      // Act
      const result = await useCase.listarFichas({
        colaboradorId: 'colaborador-123',
        status: StatusFichaEPI.ATIVA,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ficha-123');
      expect(prismaService.fichaEPI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            colaboradorId: 'colaborador-123',
            status: StatusFichaEPI.ATIVA,
          },
        })
      );
    });

    it('should handle search by colaborador name', async () => {
      // Arrange
      prismaService.fichaEPI.findMany = vi.fn().mockResolvedValue([]);

      // Act
      await useCase.listarFichas({
        colaboradorNome: 'João',
      });

      // Assert
      expect(prismaService.fichaEPI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            colaborador: {
              nome: { contains: 'João', mode: 'insensitive' },
            },
          },
        })
      );
    });

    it('should handle ativo filter', async () => {
      // Arrange
      prismaService.fichaEPI.findMany = vi.fn().mockResolvedValue([]);

      // Act
      await useCase.listarFichas({ ativo: false });

      // Assert
      expect(prismaService.fichaEPI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { in: ['INATIVA', 'SUSPENSA'] },
          },
        })
      );
    });
  });
});
