import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CriarEntregaFichaUseCase } from '../../../../src/application/use-cases/fichas/criar-entrega-ficha.use-case';
import { ProcessarDevolucaoUseCase } from '../../../../src/application/use-cases/fichas/processar-devolucao.use-case';
import { PrismaService } from '../../../../src/infrastructure/database/prisma.service';
import { IEstoqueRepository } from '../../../../src/domain/interfaces/repositories/estoque-repository.interface';
import { IMovimentacaoRepository } from '../../../../src/domain/interfaces/repositories/movimentacao-repository.interface';
import { StatusEntrega, StatusEntregaItem } from '../../../../src/domain/enums';
import { BusinessError, NotFoundError } from '../../../../src/domain/exceptions/business.exception';

describe('UC-FICHA-02: ConsultarHistoricoEntregas', () => {
  let entregaUseCase: CriarEntregaFichaUseCase;
  let devolucaoUseCase: ProcessarDevolucaoUseCase;
  let prismaService: jest.Mocked<PrismaService>;
  let estoqueRepository: jest.Mocked<IEstoqueRepository>;
  let movimentacaoRepository: jest.Mocked<IMovimentacaoRepository>;

  const mockColaborador = {
    id: 'colaborador-1',
    nome: 'João Silva',
    cpf: '12345678901',
    matricula: 'MAT001',
  };

  const mockTipoEpi = {
    id: 'tipo-epi-1',
    nome: 'Capacete de Segurança',
    codigo: 'CAP001',
    validadeMeses: 12,
    exigeAssinaturaEntrega: true,
  };

  const mockAlmoxarifado = {
    id: 'almoxarifado-1',
    nome: 'Almoxarifado Central',
    codigo: 'ALM001',
  };

  const mockFichaEpi = {
    id: 'ficha-1',
    colaboradorId: 'colaborador-1',
    tipoEpiId: 'tipo-epi-1',
    almoxarifadoId: 'almoxarifado-1',
    status: 'ATIVA',
  };

  const mockEntregaItem = {
    id: 'item-1',
    entregaId: 'entrega-1',
    tipoEpiId: 'tipo-epi-1',
    quantidadeEntregue: 1,
    numeroSerie: 'SN123456',
    lote: 'LOTE001',
    dataFabricacao: new Date('2024-01-01'),
    dataVencimento: new Date('2025-01-01'),
    status: StatusEntregaItem.ENTREGUE,
    createdAt: new Date(),
  };

  const mockEntrega = {
    id: 'entrega-1',
    fichaEpiId: 'ficha-1',
    colaboradorId: 'colaborador-1',
    dataEntrega: new Date('2024-06-01'),
    dataVencimento: new Date('2025-06-01'),
    assinaturaColaborador: 'assinatura-hash',
    observacoes: 'Entrega normal',
    status: StatusEntrega.ATIVA,
    createdAt: new Date(),
    updatedAt: new Date(),
    itens: [mockEntregaItem],
    colaborador: mockColaborador,
    fichaEpi: {
      ...mockFichaEpi,
      tipoEpi: mockTipoEpi,
      almoxarifado: mockAlmoxarifado,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CriarEntregaFichaUseCase,
        ProcessarDevolucaoUseCase,
        {
          provide: PrismaService,
          useValue: {
            entrega: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
            },
            entregaItem: {
              findMany: vi.fn(),
              count: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
            },
            fichaEPI: {
              findUnique: vi.fn(),
            },
            colaborador: {
              findUnique: vi.fn(),
            },
            tipoEPI: {
              findUnique: vi.fn(),
            },
            almoxarifado: {
              findUnique: vi.fn(),
            },
            movimentacaoEstoque: {
              create: vi.fn(),
              findFirst: vi.fn(),
            },
            estoqueItem: {
              update: vi.fn(),
              updateMany: vi.fn(),
              create: vi.fn(),
            },
            $transaction: vi.fn(),
          },
        },
        {
          provide: 'IEstoqueRepository',
          useValue: {
            verificarDisponibilidade: vi.fn(),
            findByAlmoxarifadoAndTipo: vi.fn(),
          },
        },
        {
          provide: 'IMovimentacaoRepository',
          useValue: {
            obterUltimaSaldo: vi.fn(),
          },
        },
      ],
    }).compile();

    entregaUseCase = module.get<CriarEntregaFichaUseCase>(CriarEntregaFichaUseCase);
    devolucaoUseCase = module.get<ProcessarDevolucaoUseCase>(ProcessarDevolucaoUseCase);
    prismaService = module.get<PrismaService>(PrismaService) as jest.Mocked<PrismaService>;
    estoqueRepository = module.get<IEstoqueRepository>('IEstoqueRepository') as jest.Mocked<IEstoqueRepository>;
    movimentacaoRepository = module.get<IMovimentacaoRepository>('IMovimentacaoRepository') as jest.Mocked<IMovimentacaoRepository>;
  });

  describe('Consultar Histórico de Entregas por Colaborador', () => {
    it('deve listar entregas ativas de um colaborador', async () => {
      // Arrange
      const colaboradorId = 'colaborador-1';
      const entregasEncontradas = [mockEntrega];

      prismaService.entrega.findMany.mockResolvedValue(entregasEncontradas);

      // Act
      const result = await entregaUseCase.listarEntregasColaborador(colaboradorId, StatusEntrega.ATIVA);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].colaboradorId).toBe(colaboradorId);
      expect(result[0].status).toBe(StatusEntrega.ATIVA);
      expect(prismaService.entrega.findMany).toHaveBeenCalledWith({
        where: { colaboradorId, status: StatusEntrega.ATIVA },
        include: expect.any(Object),
        orderBy: { dataEntrega: 'desc' },
      });
    });

    it('deve listar todas as entregas de um colaborador quando status não especificado', async () => {
      // Arrange
      const colaboradorId = 'colaborador-1';
      const entregasVariadas = [
        { ...mockEntrega, status: StatusEntrega.ATIVA },
        { ...mockEntrega, id: 'entrega-2', status: StatusEntrega.DEVOLVIDA_TOTAL },
      ];

      prismaService.entrega.findMany.mockResolvedValue(entregasVariadas);

      // Act
      const result = await entregaUseCase.listarEntregasColaborador(colaboradorId);

      // Assert
      expect(result).toHaveLength(2);
      expect(prismaService.entrega.findMany).toHaveBeenCalledWith({
        where: { colaboradorId },
        include: expect.any(Object),
        orderBy: { dataEntrega: 'desc' },
      });
    });

    it('deve retornar array vazio quando colaborador não tem entregas', async () => {
      // Arrange
      const colaboradorId = 'colaborador-sem-entregas';

      prismaService.entrega.findMany.mockResolvedValue([]);

      // Act
      const result = await entregaUseCase.listarEntregasColaborador(colaboradorId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('Consultar Histórico de Entregas por Ficha', () => {
    it('deve listar entregas de uma ficha específica', async () => {
      // Arrange
      const fichaEpiId = 'ficha-1';
      const entregasEncontradas = [mockEntrega];

      prismaService.entrega.findMany.mockResolvedValue(entregasEncontradas);

      // Act
      const result = await entregaUseCase.listarEntregasPorFicha(fichaEpiId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fichaEpiId).toBe(fichaEpiId);
      expect(prismaService.entrega.findMany).toHaveBeenCalledWith({
        where: { fichaEpiId },
        include: expect.any(Object),
        orderBy: { dataEntrega: 'desc' },
      });
    });

    it('deve incluir detalhes completos da entrega e relacionamentos', async () => {
      // Arrange
      const fichaEpiId = 'ficha-1';
      const entregasEncontradas = [mockEntrega];

      prismaService.entrega.findMany.mockResolvedValue(entregasEncontradas);

      // Act
      const result = await entregaUseCase.listarEntregasPorFicha(fichaEpiId);

      // Assert
      expect(result[0]).toHaveProperty('colaborador');
      expect(result[0]).toHaveProperty('tipoEpi');
      expect(result[0]).toHaveProperty('almoxarifado');
      expect(result[0]).toHaveProperty('itens');
      expect(result[0].colaborador.nome).toBe(mockColaborador.nome);
      expect(result[0].tipoEpi.nome).toBe(mockTipoEpi.nome);
    });
  });

  describe('Consultar Posse Atual do Colaborador', () => {
    it('deve retornar posse atual de EPIs do colaborador', async () => {
      // Arrange
      const colaboradorId = 'colaborador-1';
      const itensAtivos = [
        {
          id: 'item-1',
          tipoEpiId: 'tipo-epi-1',
          status: 'ENTREGUE',
          numeroSerie: 'SN123456',
          lote: 'LOTE001',
          dataVencimento: new Date('2025-06-01'),
          createdAt: new Date(),
          entrega: {
            id: 'entrega-1',
            dataEntrega: new Date('2024-06-01'),
            dataVencimento: new Date('2025-06-01'),
          },
          tipoEpi: {
            id: 'tipo-epi-1',
            nome: 'Capacete de Segurança',
            codigo: 'CAP001',
            diasAvisoVencimento: 30,
          },
        },
      ];

      prismaService.entregaItem.findMany.mockResolvedValue(itensAtivos);

      // Act
      const result = await entregaUseCase.obterPosseAtual(colaboradorId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].tipoEpiId).toBe('tipo-epi-1');
      expect(result[0].quantidadePosse).toBe(1);
      expect(result[0].status).toMatch(/ATIVO|VENCIDO|PROXIMO_VENCIMENTO/);
      expect(result[0].itensAtivos).toHaveLength(1);
    });

    it('deve calcular status correto para itens próximos ao vencimento', async () => {
      // Arrange
      const colaboradorId = 'colaborador-1';
      const dataVencimentoProximo = new Date();
      dataVencimentoProximo.setDate(dataVencimentoProximo.getDate() + 15); // 15 dias para vencer

      const itensAtivos = [
        {
          id: 'item-1',
          tipoEpiId: 'tipo-epi-1',
          status: 'ENTREGUE',
          numeroSerie: 'SN123456',
          lote: 'LOTE001',
          dataVencimento: dataVencimentoProximo,
          createdAt: new Date(),
          entrega: {
            id: 'entrega-1',
            dataEntrega: new Date('2024-06-01'),
            dataVencimento: dataVencimentoProximo,
          },
          tipoEpi: {
            id: 'tipo-epi-1',
            nome: 'Capacete de Segurança',
            codigo: 'CAP001',
            diasAvisoVencimento: 30,
          },
        },
      ];

      prismaService.entregaItem.findMany.mockResolvedValue(itensAtivos);

      // Act
      const result = await entregaUseCase.obterPosseAtual(colaboradorId);

      // Assert
      expect(result[0].status).toBe('PROXIMO_VENCIMENTO');
    });

    it('deve calcular status correto para itens vencidos', async () => {
      // Arrange
      const colaboradorId = 'colaborador-1';
      const dataVencimentoPassado = new Date();
      dataVencimentoPassado.setDate(dataVencimentoPassado.getDate() - 10); // Vencido há 10 dias

      const itensAtivos = [
        {
          id: 'item-1',
          tipoEpiId: 'tipo-epi-1',
          status: 'ENTREGUE',
          numeroSerie: 'SN123456',
          lote: 'LOTE001',
          dataVencimento: dataVencimentoPassado,
          createdAt: new Date(),
          entrega: {
            id: 'entrega-1',
            dataEntrega: new Date('2024-01-01'),
            dataVencimento: dataVencimentoPassado,
          },
          tipoEpi: {
            id: 'tipo-epi-1',
            nome: 'Capacete de Segurança',
            codigo: 'CAP001',
            diasAvisoVencimento: 30,
          },
        },
      ];

      prismaService.entregaItem.findMany.mockResolvedValue(itensAtivos);

      // Act
      const result = await entregaUseCase.obterPosseAtual(colaboradorId);

      // Assert
      expect(result[0].status).toBe('VENCIDO');
    });

    it('deve agrupar itens por tipo de EPI', async () => {
      // Arrange
      const colaboradorId = 'colaborador-1';
      const itensAtivos = [
        {
          id: 'item-1',
          tipoEpiId: 'tipo-epi-1',
          status: 'ENTREGUE',
          numeroSerie: 'SN123456',
          lote: 'LOTE001',
          dataVencimento: new Date('2025-06-01'),
          createdAt: new Date(),
          entrega: {
            id: 'entrega-1',
            dataEntrega: new Date('2024-06-01'),
            dataVencimento: new Date('2025-06-01'),
          },
          tipoEpi: {
            id: 'tipo-epi-1',
            nome: 'Capacete de Segurança',
            codigo: 'CAP001',
            diasAvisoVencimento: 30,
          },
        },
        {
          id: 'item-2',
          tipoEpiId: 'tipo-epi-1',
          status: 'ENTREGUE',
          numeroSerie: 'SN789012',
          lote: 'LOTE002',
          dataVencimento: new Date('2025-06-01'),
          createdAt: new Date(),
          entrega: {
            id: 'entrega-2',
            dataEntrega: new Date('2024-06-15'),
            dataVencimento: new Date('2025-06-01'),
          },
          tipoEpi: {
            id: 'tipo-epi-1',
            nome: 'Capacete de Segurança',
            codigo: 'CAP001',
            diasAvisoVencimento: 30,
          },
        },
      ];

      prismaService.entregaItem.findMany.mockResolvedValue(itensAtivos);

      // Act
      const result = await entregaUseCase.obterPosseAtual(colaboradorId);

      // Assert
      expect(result).toHaveLength(1); // Agrupado por tipo
      expect(result[0].quantidadePosse).toBe(2); // 2 itens do mesmo tipo
      expect(result[0].itensAtivos).toHaveLength(2);
    });
  });

  describe('Consultar Histórico de Devoluções', () => {
    it('deve obter histórico de devoluções de um colaborador', async () => {
      // Arrange
      const colaboradorId = 'colaborador-1';
      const itensDevolvidos = [
        {
          id: 'item-1',
          entregaId: 'entrega-1',
          tipoEpiId: 'tipo-epi-1',
          status: StatusEntregaItem.DEVOLVIDO,
          numeroSerie: 'SN123456',
          lote: 'LOTE001',
          dataDevolucao: new Date('2024-06-30'),
          motivoDevolucao: 'Fim do período de uso',
          entrega: {
            id: 'entrega-1',
            colaboradorId: 'colaborador-1',
            dataEntrega: new Date('2024-06-01'),
            colaborador: { nome: 'João Silva' },
          },
          tipoEpi: { nome: 'Capacete de Segurança' },
        },
      ];

      prismaService.entregaItem.findMany.mockResolvedValue(itensDevolvidos);

      // Act
      const result = await devolucaoUseCase.obterHistoricoDevolucoes(colaboradorId);

      // Assert
      expect(result.devolucoes).toHaveLength(1);
      expect(result.devolucoes[0].colaboradorNome).toBe('João Silva');
      expect(result.devolucoes[0].tipoEpiNome).toBe('Capacete de Segurança');
      expect(result.devolucoes[0].motivoDevolucao).toBe('Fim do período de uso');
      expect(result.estatisticas.totalDevolucoes).toBe(1);
    });

    it('deve calcular estatísticas corretas das devoluções', async () => {
      // Arrange
      const itensDevolvidos = [
        {
          id: 'item-1',
          entregaId: 'entrega-1',
          tipoEpiId: 'tipo-epi-1',
          status: StatusEntregaItem.DEVOLVIDO,
          dataDevolucao: new Date('2024-06-30'),
          entrega: {
            id: 'entrega-1',
            dataEntrega: new Date('2024-06-01'),
            colaborador: { nome: 'João Silva' },
          },
          tipoEpi: { nome: 'Capacete' },
        },
        {
          id: 'item-2',
          entregaId: 'entrega-2',
          tipoEpiId: 'tipo-epi-2',
          status: StatusEntregaItem.PERDIDO,
          dataDevolucao: new Date('2024-06-25'),
          entrega: {
            id: 'entrega-2',
            dataEntrega: new Date('2024-06-01'),
            colaborador: { nome: 'Maria Santos' },
          },
          tipoEpi: { nome: 'Luva' },
        },
        {
          id: 'item-3',
          entregaId: 'entrega-3',
          tipoEpiId: 'tipo-epi-3',
          status: StatusEntregaItem.DANIFICADO,
          dataDevolucao: new Date('2024-06-20'),
          entrega: {
            id: 'entrega-3',
            dataEntrega: new Date('2024-06-01'),
            colaborador: { nome: 'Pedro Costa' },
          },
          tipoEpi: { nome: 'Óculos' },
        },
      ];

      prismaService.entregaItem.findMany.mockResolvedValue(itensDevolvidos);

      // Act
      const result = await devolucaoUseCase.obterHistoricoDevolucoes();

      // Assert
      expect(result.estatisticas.totalDevolucoes).toBe(3);
      expect(result.estatisticas.itensEmBomEstado).toBe(1);
      expect(result.estatisticas.itensPerdidos).toBe(1);
      expect(result.estatisticas.itensDanificados).toBe(1);
      expect(result.estatisticas.tempoMedioUso).toBeGreaterThan(0);
    });

    it('deve filtrar histórico por período de data', async () => {
      // Arrange
      const dataInicio = new Date('2024-06-01');
      const dataFim = new Date('2024-06-30');

      prismaService.entregaItem.findMany.mockResolvedValue([]);

      // Act
      await devolucaoUseCase.obterHistoricoDevolucoes(undefined, undefined, dataInicio, dataFim);

      // Assert
      expect(prismaService.entregaItem.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          dataDevolucao: {
            gte: dataInicio,
            lte: dataFim,
          },
        }),
        include: expect.any(Object),
        orderBy: { dataDevolucao: 'desc' },
      });
    });
  });

  describe('Validação de Entrega', () => {
    it('deve validar se entrega é permitida para ficha ativa', async () => {
      // Arrange
      const fichaEpiId = 'ficha-1';
      const quantidade = 2;

      const fichaCompleta = {
        id: fichaEpiId,
        status: 'ATIVA',
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
        colaborador: { ...mockColaborador, ativo: true },
        tipoEpi: { ...mockTipoEpi, ativo: true },
        almoxarifado: { ...mockAlmoxarifado, ativo: true },
      };

      prismaService.fichaEPI.findUnique.mockResolvedValue(fichaCompleta);
      estoqueRepository.verificarDisponibilidade.mockResolvedValue(true);
      estoqueRepository.findByAlmoxarifadoAndTipo.mockResolvedValue({ quantidade: 10 });
      prismaService.entregaItem.count.mockResolvedValue(0); // Posse atual

      // Act
      const result = await entregaUseCase.validarEntregaPermitida(fichaEpiId, quantidade);

      // Assert
      expect(result.permitida).toBe(true);
      expect(result.fichaAtiva).toBe(true);
      expect(result.estoqueDisponivel).toBe(10);
      expect(result.posseAtual).toBe(0);
    });

    it('deve rejeitar entrega para ficha inativa', async () => {
      // Arrange
      const fichaEpiId = 'ficha-1';
      const quantidade = 1;

      const fichaInativa = {
        id: fichaEpiId,
        status: 'INATIVA',
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
      };

      prismaService.fichaEPI.findUnique.mockResolvedValue(fichaInativa);

      // Act
      const result = await entregaUseCase.validarEntregaPermitida(fichaEpiId, quantidade);

      // Assert
      expect(result.permitida).toBe(false);
      expect(result.motivo).toBe('Ficha está inativa');
      expect(result.fichaAtiva).toBe(false);
    });

    it('deve rejeitar entrega quando estoque insuficiente', async () => {
      // Arrange
      const fichaEpiId = 'ficha-1';
      const quantidade = 5;

      const fichaCompleta = {
        id: fichaEpiId,
        status: 'ATIVA',
        colaboradorId: 'colaborador-1',
        tipoEpiId: 'tipo-epi-1',
        almoxarifadoId: 'almoxarifado-1',
        colaborador: { ...mockColaborador, ativo: true },
        tipoEpi: { ...mockTipoEpi, ativo: true },
        almoxarifado: { ...mockAlmoxarifado, ativo: true },
      };

      prismaService.fichaEPI.findUnique.mockResolvedValue(fichaCompleta);
      estoqueRepository.verificarDisponibilidade.mockResolvedValue(false);
      estoqueRepository.findByAlmoxarifadoAndTipo.mockResolvedValue({ quantidade: 2 });
      prismaService.entregaItem.count.mockResolvedValue(0);

      // Act
      const result = await entregaUseCase.validarEntregaPermitida(fichaEpiId, quantidade);

      // Assert
      expect(result.permitida).toBe(false);
      expect(result.motivo).toBe('Estoque insuficiente. Disponível: 2');
      expect(result.fichaAtiva).toBe(true);
      expect(result.estoqueDisponivel).toBe(2);
    });
  });

  describe('Obter Entrega Específica', () => {
    it('deve obter detalhes completos de uma entrega', async () => {
      // Arrange
      const entregaId = 'entrega-1';

      prismaService.entrega.findUnique.mockResolvedValue(mockEntrega);

      // Act
      const result = await entregaUseCase.obterEntrega(entregaId);

      // Assert
      expect(result).toBeDefined();
      expect(result!.id).toBe(entregaId);
      expect(result!.colaborador).toBeDefined();
      expect(result!.tipoEpi).toBeDefined();
      expect(result!.almoxarifado).toBeDefined();
      expect(result!.itens).toHaveLength(1);
    });

    it('deve retornar null quando entrega não existe', async () => {
      // Arrange
      const entregaId = 'entrega-inexistente';

      prismaService.entrega.findUnique.mockResolvedValue(null);

      // Act
      const result = await entregaUseCase.obterEntrega(entregaId);

      // Assert
      expect(result).toBeNull();
    });
  });
});