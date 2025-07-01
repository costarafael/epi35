import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CriarFichaEpiUseCase, CriarFichaEpiInput, FichaEpiOutput } from '../../../../src/application/use-cases/fichas/criar-ficha-epi.use-case';
import { PrismaService } from '../../../../src/infrastructure/database/prisma.service';
import { StatusFichaEPI } from '../../../../src/domain/enums';
import { BusinessError, ConflictError, NotFoundError } from '../../../../src/domain/exceptions/business.exception';

describe('UC-FICHA-01: GerenciarFichaColaborador (CriarFichaEpiUseCase)', () => {
  let useCase: CriarFichaEpiUseCase;
  let prismaService: jest.Mocked<PrismaService>;

  const mockColaborador = {
    id: 'colaborador-1',
    nome: 'João Silva',
    cpf: '12345678901',
    matricula: 'MAT001',
    ativo: true,
    unidadeNegocioId: 'unidade-1',
  };

  const mockTipoEpi = {
    id: 'tipo-epi-1',
    nome: 'Capacete de Segurança',
    codigo: 'CAP001',
    exigeAssinaturaEntrega: true,
    ativo: true,
  };

  const mockAlmoxarifado = {
    id: 'almoxarifado-1',
    nome: 'Almoxarifado Central',
    codigo: 'ALM001',
    ativo: true,
    unidadeNegocioId: 'unidade-1',
  };

  const mockFichaEpi = {
    id: 'ficha-1',
    colaboradorId: 'colaborador-1',
    tipoEpiId: 'tipo-epi-1',
    almoxarifadoId: 'almoxarifado-1',
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CriarFichaEpiUseCase,
        {
          provide: PrismaService,
          useValue: {
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
            $transaction: vi.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<CriarFichaEpiUseCase>(CriarFichaEpiUseCase);
    prismaService = module.get<PrismaService>(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('Criar Ficha EPI', () => {
    it('deve criar uma nova ficha com dados válidos', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
        status: StatusFichaEPI.ATIVA,
      };

      prismaService.fichaEPI.findUnique.mockResolvedValue(null); // Não existe ficha duplicada
      prismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique.mockResolvedValue(mockTipoEpi);
      prismaService.almoxarifado.findUnique.mockResolvedValue(mockAlmoxarifado);
      prismaService.fichaEPI.create.mockResolvedValue(mockFichaEpi);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.colaboradorId).toBe(mockColaborador.id);
      expect(result.tipoEpiId).toBe(mockTipoEpi.id);
      expect(result.almoxarifadoId).toBe(mockAlmoxarifado.id);
      expect(result.status).toBe(StatusFichaEPI.ATIVA);
    });

    it('deve lançar erro quando colaborador não é fornecido', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: '',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow('Colaborador é obrigatório');
    });

    it('deve lançar erro quando tipo EPI não é fornecido', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-1',
        tipoEpiId: '',
        almoxarifadoId: 'almoxarifado-1',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow('Tipo de EPI é obrigatório');
    });

    it('deve lançar erro quando almoxarifado não é fornecido', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: '',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow('Almoxarifado é obrigatório');
    });

    it('deve lançar ConflictError quando já existe ficha para a combinação', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
      };

      prismaService.fichaEPI.findUnique.mockResolvedValue(mockFichaEpi); // Ficha já existe

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ConflictError);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Já existe uma ficha de EPI para este colaborador, tipo de EPI e almoxarifado'
      );
    });

    it('deve lançar NotFoundError quando colaborador não existe', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-inexistente',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
      };

      prismaService.fichaEPI.findUnique.mockResolvedValue(null);
      prismaService.colaborador.findUnique.mockResolvedValue(null); // Colaborador não existe

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(input)).rejects.toThrow('Colaborador');
    });

    it('deve lançar BusinessError quando colaborador está inativo', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
      };

      const colaboradorInativo = { ...mockColaborador, ativo: false };
      
      prismaService.fichaEPI.findUnique.mockResolvedValue(null);
      prismaService.colaborador.findUnique.mockResolvedValue(colaboradorInativo);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow('Colaborador está inativo');
    });

    it('deve lançar BusinessError quando colaborador e almoxarifado são de unidades diferentes', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
      };

      const almoxarifadoDiferente = { ...mockAlmoxarifado, unidadeNegocioId: 'unidade-2' };
      
      prismaService.fichaEPI.findUnique.mockResolvedValue(null);
      prismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique.mockResolvedValue(mockTipoEpi);
      prismaService.almoxarifado.findUnique.mockResolvedValue(almoxarifadoDiferente);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Colaborador e almoxarifado devem pertencer à mesma unidade de negócio'
      );
    });
  });

  describe('Gerenciar Status da Ficha', () => {
    it('deve ativar ficha inativa com sucesso', async () => {
      // Arrange
      const fichaInativa = { ...mockFichaEpi, status: StatusFichaEPI.INATIVA };
      const fichaAtivada = { ...mockFichaEpi, status: StatusFichaEPI.ATIVA };

      prismaService.fichaEPI.findUnique.mockResolvedValue(fichaInativa);
      prismaService.fichaEPI.update.mockResolvedValue(fichaAtivada);

      // Act
      const result = await useCase.ativarFicha('ficha-1');

      // Assert
      expect(result.status).toBe(StatusFichaEPI.ATIVA);
      expect(prismaService.fichaEPI.update).toHaveBeenCalledWith({
        where: { id: 'ficha-1' },
        data: { status: StatusFichaEPI.ATIVA },
        include: expect.any(Object),
      });
    });

    it('deve lançar erro ao tentar ativar ficha já ativa', async () => {
      // Arrange
      const fichaAtiva = { ...mockFichaEpi, status: StatusFichaEPI.ATIVA };
      
      prismaService.fichaEPI.findUnique.mockResolvedValue(fichaAtiva);

      // Act & Assert
      await expect(useCase.ativarFicha('ficha-1')).rejects.toThrow(BusinessError);
      await expect(useCase.ativarFicha('ficha-1')).rejects.toThrow('Ficha já está ativa');
    });

    it('deve inativar ficha ativa sem entregas pendentes', async () => {
      // Arrange
      const fichaAtiva = { ...mockFichaEpi, status: StatusFichaEPI.ATIVA };
      const fichaInativada = { ...mockFichaEpi, status: StatusFichaEPI.INATIVA };

      prismaService.fichaEPI.findUnique.mockResolvedValue(fichaAtiva);
      prismaService.entrega.count.mockResolvedValue(0); // Sem entregas ativas
      prismaService.fichaEPI.update.mockResolvedValue(fichaInativada);

      // Act
      const result = await useCase.inativarFicha('ficha-1');

      // Assert
      expect(result.status).toBe(StatusFichaEPI.INATIVA);
    });

    it('deve lançar erro ao tentar inativar ficha com entregas ativas', async () => {
      // Arrange
      const fichaAtiva = { ...mockFichaEpi, status: StatusFichaEPI.ATIVA };

      prismaService.fichaEPI.findUnique.mockResolvedValue(fichaAtiva);
      prismaService.entrega.count.mockResolvedValue(2); // 2 entregas ativas

      // Act & Assert
      await expect(useCase.inativarFicha('ficha-1')).rejects.toThrow(BusinessError);
      await expect(useCase.inativarFicha('ficha-1')).rejects.toThrow(
        'Não é possível inativar: existe(m) 2 entrega(s) ativa(s) para esta ficha'
      );
    });

    it('deve suspender ficha com motivo', async () => {
      // Arrange
      const fichaAtiva = { ...mockFichaEpi, status: StatusFichaEPI.ATIVA };
      const fichaSuspensa = { ...mockFichaEpi, status: StatusFichaEPI.SUSPENSA };
      const motivo = 'Colaborador em afastamento médico';

      prismaService.fichaEPI.findUnique.mockResolvedValue(fichaAtiva);
      prismaService.fichaEPI.update.mockResolvedValue(fichaSuspensa);
      prismaService.historicoFicha.create.mockResolvedValue({});

      // Act
      const result = await useCase.suspenderFicha('ficha-1', motivo);

      // Assert
      expect(result.status).toBe(StatusFichaEPI.SUSPENSA);
      expect(prismaService.historicoFicha.create).toHaveBeenCalledWith({
        data: {
          fichaEpiId: 'ficha-1',
          acao: 'SUSPENSAO',
          detalhes: { motivo },
        },
      });
    });
  });

  describe('Criar ou Ativar Ficha', () => {
    it('deve criar nova ficha quando não existe', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
      };

      prismaService.fichaEPI.findUnique.mockResolvedValue(null); // Não existe
      // Mock das validações
      prismaService.colaborador.findUnique.mockResolvedValue(mockColaborador);
      prismaService.tipoEPI.findUnique.mockResolvedValue(mockTipoEpi);
      prismaService.almoxarifado.findUnique.mockResolvedValue(mockAlmoxarifado);
      prismaService.fichaEPI.create.mockResolvedValue(mockFichaEpi);

      // Act
      const result = await useCase.criarOuAtivar(input);

      // Assert
      expect(result.criada).toBe(true);
      expect(result.ficha.id).toBe(mockFichaEpi.id);
    });

    it('deve ativar ficha existente inativa', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
      };

      const fichaInativa = { ...mockFichaEpi, status: StatusFichaEPI.INATIVA };
      const fichaAtivada = { ...mockFichaEpi, status: StatusFichaEPI.ATIVA };

      prismaService.fichaEPI.findUnique
        .mockResolvedValueOnce(fichaInativa) // Para criarOuAtivar
        .mockResolvedValueOnce(fichaInativa) // Para ativarFicha
        .mockResolvedValueOnce(fichaAtivada); // Para obterFicha

      prismaService.fichaEPI.update.mockResolvedValue(fichaAtivada);

      // Act
      const result = await useCase.criarOuAtivar(input);

      // Assert
      expect(result.criada).toBe(false);
      expect(result.ficha.status).toBe(StatusFichaEPI.ATIVA);
    });

    it('deve retornar ficha existente já ativa', async () => {
      // Arrange
      const input: CriarFichaEpiInput = {
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
      };

      const fichaAtiva = { ...mockFichaEpi, status: StatusFichaEPI.ATIVA };

      prismaService.fichaEPI.findUnique
        .mockResolvedValueOnce(fichaAtiva) // Para criarOuAtivar
        .mockResolvedValueOnce(fichaAtiva); // Para obterFicha

      // Act
      const result = await useCase.criarOuAtivar(input);

      // Assert
      expect(result.criada).toBe(false);
      expect(result.ficha.status).toBe(StatusFichaEPI.ATIVA);
    });
  });

  describe('Obter Estatísticas', () => {
    it('deve retornar estatísticas das fichas', async () => {
      // Arrange
      const fichasPorStatus = [
        { status: 'ATIVA', _count: { id: 10 } },
        { status: 'INATIVA', _count: { id: 3 } },
        { status: 'SUSPENSA', _count: { id: 2 } },
      ];

      const fichasPorTipo = [
        { tipoEpiId: 'tipo-1', _count: { id: 8 } },
        { tipoEpiId: 'tipo-2', _count: { id: 7 } },
      ];

      const fichasPorColaborador = [
        { colaboradorId: 'colab-1', _count: { id: 5 } },
        { colaboradorId: 'colab-2', _count: { id: 4 } },
      ];

      const tiposEpi = [
        { id: 'tipo-1', nome: 'Capacete' },
        { id: 'tipo-2', nome: 'Luva' },
      ];

      const colaboradores = [
        { id: 'colab-1', nome: 'João Silva' },
        { id: 'colab-2', nome: 'Maria Santos' },
      ];

      prismaService.fichaEPI.groupBy
        .mockResolvedValueOnce(fichasPorStatus)
        .mockResolvedValueOnce(fichasPorTipo)
        .mockResolvedValueOnce(fichasPorColaborador);

      prismaService.tipoEPI.findMany.mockResolvedValue(tiposEpi);
      prismaService.colaborador.findMany.mockResolvedValue(colaboradores);

      // Act
      const result = await useCase.obterEstatisticas();

      // Assert
      expect(result.totalFichas).toBe(15);
      expect(result.fichasAtivas).toBe(10);
      expect(result.fichasInativas).toBe(3);
      expect(result.fichasSuspensas).toBe(2);
      expect(result.porTipoEpi).toHaveLength(2);
      expect(result.porColaborador).toHaveLength(2);
    });
  });

  describe('Listar Fichas com Filtros', () => {
    it('deve listar fichas por colaborador', async () => {
      // Arrange
      const filtros = { colaboradorId: 'colaborador-1' };
      const fichasEncontradas = [mockFichaEpi];

      prismaService.fichaEPI.findMany.mockResolvedValue(fichasEncontradas);

      // Act
      const result = await useCase.listarFichas(filtros);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].colaboradorId).toBe('colaborador-1');
      expect(prismaService.fichaEPI.findMany).toHaveBeenCalledWith({
        where: { colaboradorId: 'colaborador-1' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('deve listar fichas por status', async () => {
      // Arrange
      const filtros = { status: StatusFichaEPI.ATIVA };
      const fichasEncontradas = [mockFichaEpi];

      prismaService.fichaEPI.findMany.mockResolvedValue(fichasEncontradas);

      // Act
      const result = await useCase.listarFichas(filtros);

      // Assert
      expect(result).toHaveLength(1);
      expect(prismaService.fichaEPI.findMany).toHaveBeenCalledWith({
        where: { status: StatusFichaEPI.ATIVA },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('deve listar fichas ativas quando filtro ativo=true', async () => {
      // Arrange
      const filtros = { ativo: true };
      const fichasEncontradas = [mockFichaEpi];

      prismaService.fichaEPI.findMany.mockResolvedValue(fichasEncontradas);

      // Act
      const result = await useCase.listarFichas(filtros);

      // Assert
      expect(result).toHaveLength(1);
      expect(prismaService.fichaEPI.findMany).toHaveBeenCalledWith({
        where: { status: 'ATIVA' },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });
});