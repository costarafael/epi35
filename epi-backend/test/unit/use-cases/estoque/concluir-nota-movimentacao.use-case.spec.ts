import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { ConcluirNotaMovimentacaoUseCase, ConcluirNotaInput, ResultadoProcessamento } from '@application/use-cases/estoque/concluir-nota-movimentacao.use-case';
import { INotaRepository } from '@domain/interfaces/repositories/nota-repository.interface';
import { IMovimentacaoRepository } from '@domain/interfaces/repositories/movimentacao-repository.interface';
import { IEstoqueRepository } from '@domain/interfaces/repositories/estoque-repository.interface';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { NotaMovimentacao } from '@domain/entities/nota-movimentacao.entity';
import { MovimentacaoEstoque } from '@domain/entities/movimentacao-estoque.entity';
import { EstoqueItem } from '@domain/entities/estoque-item.entity';
import { 
  TipoNotaMovimentacao, 
  StatusNotaMovimentacao, 
  StatusEstoqueItem, 
  TipoMovimentacao 
} from '@domain/enums';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';

describe('ConcluirNotaMovimentacaoUseCase', () => {
  let useCase: ConcluirNotaMovimentacaoUseCase;
  let mockNotaRepository: jest.Mocked<INotaRepository>;
  let mockMovimentacaoRepository: jest.Mocked<IMovimentacaoRepository>;
  let mockEstoqueRepository: jest.Mocked<IEstoqueRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockTransaction: MockedFunction<any>;

  // Test data constants
  const NOTA_ID = 'nota-123';
  const USUARIO_ID = 'usuario-123';
  const ALMOXARIFADO_ORIGEM_ID = 'almox-origem-123';
  const ALMOXARIFADO_DESTINO_ID = 'almox-destino-123';
  const TIPO_EPI_ID = 'tipo-epi-123';
  const QUANTIDADE = 10;
  const SALDO_ANTERIOR = 20;

  beforeEach(() => {
    // Mock repositories
    mockNotaRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createNota: vi.fn(),
      findByNumero: vi.fn(),
      findByFilters: vi.fn(),
      findRascunhos: vi.fn(),
      findPendentes: vi.fn(),
      findWithItens: vi.fn(),
      findByAlmoxarifado: vi.fn(),
      gerarProximoNumero: vi.fn(),
      concluirNota: vi.fn(),
      cancelarNota: vi.fn(),
      adicionarItem: vi.fn(),
      removerItem: vi.fn(),
      atualizarQuantidadeItem: vi.fn(),
      atualizarQuantidadeProcessada: vi.fn(),
      obterEstatisticas: vi.fn(),
      obterNotasVencidas: vi.fn(),
    } as jest.Mocked<INotaRepository>;

    mockMovimentacaoRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByAlmoxarifadoAndTipo: vi.fn(),
      findByNotaMovimentacao: vi.fn(),
      findByFilters: vi.fn(),
      obterUltimaSaldo: vi.fn(),
      obterKardex: vi.fn(),
      createMovimentacao: vi.fn(),
      criarEstorno: vi.fn(),
      findEstornaveis: vi.fn(),
      obterResumoMovimentacoes: vi.fn(),
    } as jest.Mocked<IMovimentacaoRepository>;

    mockEstoqueRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
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
    } as jest.Mocked<IEstoqueRepository>;

    // Mock transaction
    mockTransaction = vi.fn();
    mockPrismaService = {
      $transaction: mockTransaction,
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    } as any;

    useCase = new ConcluirNotaMovimentacaoUseCase(
      mockNotaRepository,
      mockMovimentacaoRepository,
      mockEstoqueRepository,
      mockPrismaService,
    );
  });

  describe('execute', () => {
    describe('Validações iniciais', () => {
      it('deve lançar NotFoundError quando nota não existir', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        mockNotaRepository.findWithItens.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new NotFoundError('Nota de movimentação', NOTA_ID)
        );

        expect(mockNotaRepository.findWithItens).toHaveBeenCalledWith(NOTA_ID);
      });

      it('deve lançar BusinessError quando nota não estiver em rascunho', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaConcluida = createMockNotaWithItens({
          status: StatusNotaMovimentacao.CONCLUIDA,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaConcluida);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Apenas notas em rascunho podem ser concluídas')
        );
      });

      it('deve lançar BusinessError quando nota não tiver itens', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaSemItens = createMockNotaWithItens({
          itens: [],
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaSemItens);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Nota deve ter pelo menos um item')
        );
      });
    });

    describe('Processamento de Nota ENTRADA', () => {
      it('deve processar nota de entrada com sucesso', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        const movimentacaoEntrada = createMockMovimentacao({
          tipoMovimentacao: TipoMovimentacao.ENTRADA,
        });

        const notaConcluida = createMockNota({
          status: StatusNotaMovimentacao.CONCLUIDA,
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValue(movimentacaoEntrada);
        mockEstoqueRepository.adicionarQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(notaConcluida);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([movimentacaoEntrada]);

        // Mock transaction to execute callback
        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result).toEqual({
          notaConcluida,
          movimentacoesCriadas: [movimentacaoEntrada],
          itensProcessados: [{
            tipoEpiId: TIPO_EPI_ID,
            quantidade: QUANTIDADE,
            movimentacaoCreated: true,
            estoqueAtualizado: true,
          }],
        });

        // Verify transaction was called
        expect(mockTransaction).toHaveBeenCalledTimes(1);
        
        // Verify entrada processing
        expect(mockMovimentacaoRepository.obterUltimaSaldo).toHaveBeenCalledWith(
          ALMOXARIFADO_DESTINO_ID,
          TIPO_EPI_ID
        );
        expect(mockMovimentacaoRepository.create).toHaveBeenCalled();
        expect(mockEstoqueRepository.adicionarQuantidade).toHaveBeenCalledWith(
          ALMOXARIFADO_DESTINO_ID,
          TIPO_EPI_ID,
          StatusEstoqueItem.DISPONIVEL,
          QUANTIDADE
        );
      });
    });

    describe('Processamento de Nota TRANSFERENCIA', () => {
      it('deve processar nota de transferência com sucesso', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaTransferencia = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        const movimentacaoSaida = createMockMovimentacao({
          tipoMovimentacao: TipoMovimentacao.SAIDA,
          almoxarifadoId: ALMOXARIFADO_ORIGEM_ID,
        });

        const movimentacaoEntrada = createMockMovimentacao({
          tipoMovimentacao: TipoMovimentacao.ENTRADA,
          almoxarifadoId: ALMOXARIFADO_DESTINO_ID,
        });

        const notaConcluida = createMockNota({
          status: StatusNotaMovimentacao.CONCLUIDA,
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaTransferencia);
        mockEstoqueRepository.verificarDisponibilidade.mockResolvedValue(true);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValueOnce(SALDO_ANTERIOR);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValueOnce(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValueOnce(movimentacaoSaida);
        mockMovimentacaoRepository.create.mockResolvedValueOnce(movimentacaoEntrada);
        mockEstoqueRepository.removerQuantidade.mockResolvedValue(null as any);
        mockEstoqueRepository.adicionarQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(notaConcluida);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([movimentacaoSaida]);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.notaConcluida).toEqual(notaConcluida);
        expect(result.itensProcessados).toHaveLength(1);
        expect(result.itensProcessados[0].movimentacaoCreated).toBe(true);

        // Verify stock validation
        expect(mockEstoqueRepository.verificarDisponibilidade).toHaveBeenCalledWith(
          ALMOXARIFADO_ORIGEM_ID,
          TIPO_EPI_ID,
          QUANTIDADE
        );

        // Verify two movimentações were created
        expect(mockMovimentacaoRepository.create).toHaveBeenCalledTimes(2);
        
        // Verify stock updates
        expect(mockEstoqueRepository.removerQuantidade).toHaveBeenCalledWith(
          ALMOXARIFADO_ORIGEM_ID,
          TIPO_EPI_ID,
          StatusEstoqueItem.DISPONIVEL,
          QUANTIDADE
        );
        expect(mockEstoqueRepository.adicionarQuantidade).toHaveBeenCalledWith(
          ALMOXARIFADO_DESTINO_ID,
          TIPO_EPI_ID,
          StatusEstoqueItem.DISPONIVEL,
          QUANTIDADE
        );
      });

      it('deve lançar BusinessError quando estoque insuficiente para transferência', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaTransferencia = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaTransferencia);
        mockEstoqueRepository.verificarDisponibilidade.mockResolvedValue(false);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Quantidade insuficiente em estoque para o item ' + TIPO_EPI_ID)
        );
      });
    });

    describe('Processamento de Nota DESCARTE', () => {
      it('deve processar nota de descarte com sucesso', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaDescarte = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.DESCARTE,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
        });

        const movimentacaoDescarte = createMockMovimentacao({
          tipoMovimentacao: TipoMovimentacao.SAIDA,
        });

        const notaConcluida = createMockNota({
          status: StatusNotaMovimentacao.CONCLUIDA,
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaDescarte);
        mockEstoqueRepository.verificarDisponibilidade.mockResolvedValue(true);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValue(movimentacaoDescarte);
        mockEstoqueRepository.removerQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(notaConcluida);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([movimentacaoDescarte]);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.notaConcluida).toEqual(notaConcluida);
        expect(result.itensProcessados[0].movimentacaoCreated).toBe(true);

        // Verify descarte processing
        expect(mockEstoqueRepository.removerQuantidade).toHaveBeenCalledWith(
          ALMOXARIFADO_ORIGEM_ID,
          TIPO_EPI_ID,
          StatusEstoqueItem.DISPONIVEL,
          QUANTIDADE
        );
      });
    });

    describe('Processamento de Nota AJUSTE', () => {
      it('deve processar nota de ajuste com sucesso', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: false, // Ajuste não valida estoque
        };

        const notaAjuste = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.AJUSTE,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        const movimentacaoAjuste = createMockMovimentacao({
          tipoMovimentacao: TipoMovimentacao.AJUSTE,
        });

        const notaConcluida = createMockNota({
          status: StatusNotaMovimentacao.CONCLUIDA,
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaAjuste);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValue(movimentacaoAjuste);
        mockEstoqueRepository.atualizarQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(notaConcluida);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([movimentacaoAjuste]);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.notaConcluida).toEqual(notaConcluida);
        expect(result.itensProcessados[0].movimentacaoCreated).toBe(true);

        // Verify ajuste processing
        expect(mockEstoqueRepository.atualizarQuantidade).toHaveBeenCalledWith(
          ALMOXARIFADO_DESTINO_ID,
          TIPO_EPI_ID,
          StatusEstoqueItem.DISPONIVEL,
          SALDO_ANTERIOR + QUANTIDADE // Nova quantidade
        );
      });
    });

    describe('Configuração de validação de estoque', () => {
      it('deve pular validação de estoque quando validarEstoque = false', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: false,
        };

        const notaTransferencia = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        const movimentacaoSaida = createMockMovimentacao({
          tipoMovimentacao: TipoMovimentacao.SAIDA,
        });

        const notaConcluida = createMockNota({
          status: StatusNotaMovimentacao.CONCLUIDA,
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaTransferencia);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValueOnce(SALDO_ANTERIOR);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValueOnce(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValue(movimentacaoSaida);
        mockEstoqueRepository.removerQuantidade.mockResolvedValue(null as any);
        mockEstoqueRepository.adicionarQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(notaConcluida);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([movimentacaoSaida]);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        await useCase.execute(input);

        // Assert - verificarDisponibilidade não deve ser chamado
        expect(mockEstoqueRepository.verificarDisponibilidade).not.toHaveBeenCalled();
      });

      it('deve validar estoque por padrão quando validarEstoque não especificado', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          // validarEstoque não especificado - deve usar padrão true
        };

        const notaTransferencia = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaTransferencia);
        mockEstoqueRepository.verificarDisponibilidade.mockResolvedValue(true);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        await useCase.execute(input);

        // Assert - verificarDisponibilidade deve ser chamado
        expect(mockEstoqueRepository.verificarDisponibilidade).toHaveBeenCalledWith(
          ALMOXARIFADO_ORIGEM_ID,
          TIPO_EPI_ID,
          QUANTIDADE
        );
      });
    });

    describe('Tratamento de erros e rollback', () => {
      it('deve fazer rollback quando erro ocorre durante processamento', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(SALDO_ANTERIOR);
        
        // Simulate error during stock update
        mockEstoqueRepository.adicionarQuantidade.mockRejectedValue(
          new Error('Database connection error')
        );

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Erro ao processar item ' + TIPO_EPI_ID + ': Database connection error')
        );

        // Verify transaction was called (rollback would be handled by Prisma)
        expect(mockTransaction).toHaveBeenCalledTimes(1);
      });

      it('deve lançar BusinessError específico quando erro ocorre no processamento', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
          itens: [{
            id: 'item-1',
            tipoEpiId: TIPO_EPI_ID,
            quantidade: QUANTIDADE,
            quantidadeProcessada: 0,
            tipoEpi: { nome: 'Capacete', codigo: 'CAP-001' }
          }]
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);
        mockMovimentacaoRepository.obterUltimaSaldo.mockRejectedValue(
          new BusinessError('Erro específico do domínio')
        );

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Erro ao processar item CAP-001: Erro específico do domínio')
        );
      });
    });

    describe('Operações que consomem estoque', () => {
      it('deve identificar TRANSFERENCIA como operação que consome estoque', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaTransferencia = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaTransferencia);
        mockEstoqueRepository.verificarDisponibilidade.mockResolvedValue(true);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockEstoqueRepository.verificarDisponibilidade).toHaveBeenCalled();
      });

      it('deve identificar DESCARTE como operação que consome estoque', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaDescarte = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.DESCARTE,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaDescarte);
        mockEstoqueRepository.verificarDisponibilidade.mockResolvedValue(true);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockEstoqueRepository.verificarDisponibilidade).toHaveBeenCalled();
      });

      it('não deve validar estoque para ENTRADA', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockEstoqueRepository.verificarDisponibilidade).not.toHaveBeenCalled();
      });

      it('não deve validar estoque para AJUSTE', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaAjuste = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.AJUSTE,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaAjuste);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockEstoqueRepository.verificarDisponibilidade).not.toHaveBeenCalled();
      });
    });

    describe('Processamento de múltiplos itens', () => {
      it('deve processar múltiplos itens na mesma nota', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
          itens: [
            {
              id: 'item-1',
              tipoEpiId: 'tipo-epi-1',
              quantidade: 10,
              quantidadeProcessada: 0,
              tipoEpi: { nome: 'Capacete', codigo: 'CAP-001' }
            },
            {
              id: 'item-2',
              tipoEpiId: 'tipo-epi-2',
              quantidade: 5,
              quantidadeProcessada: 0,
              tipoEpi: { nome: 'Luvas', codigo: 'LUV-001' }
            }
          ]
        });

        const movimentacao1 = createMockMovimentacao({
          tipoEpiId: 'tipo-epi-1',
          quantidade: 10,
        });

        const movimentacao2 = createMockMovimentacao({
          tipoEpiId: 'tipo-epi-2',
          quantidade: 5,
        });

        const notaConcluida = createMockNota({
          status: StatusNotaMovimentacao.CONCLUIDA,
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValue(movimentacao1);
        mockEstoqueRepository.adicionarQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(notaConcluida);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValueOnce([movimentacao1]);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValueOnce([movimentacao2]);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.itensProcessados).toHaveLength(2);
        expect(result.itensProcessados[0].tipoEpiId).toBe('tipo-epi-1');
        expect(result.itensProcessados[0].quantidade).toBe(10);
        expect(result.itensProcessados[1].tipoEpiId).toBe('tipo-epi-2');
        expect(result.itensProcessados[1].quantidade).toBe(5);

        // Verify both items were processed
        expect(mockMovimentacaoRepository.create).toHaveBeenCalledTimes(2);
        expect(mockEstoqueRepository.adicionarQuantidade).toHaveBeenCalledTimes(2);
        expect(mockNotaRepository.atualizarQuantidadeProcessada).toHaveBeenCalledTimes(2);
      });

      it('deve parar processamento quando um item falha (rollback)', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
          itens: [
            {
              id: 'item-1',
              tipoEpiId: 'tipo-epi-1',
              quantidade: 10,
              quantidadeProcessada: 0,
              tipoEpi: { nome: 'Capacete', codigo: 'CAP-001' }
            },
            {
              id: 'item-2',
              tipoEpiId: 'tipo-epi-2',
              quantidade: 5,
              quantidadeProcessada: 0,
              tipoEpi: { nome: 'Luvas', codigo: 'LUV-001' }
            }
          ]
        });

        // Setup mocks - primeiro item processa ok, segundo falha
        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValueOnce(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValueOnce(createMockMovimentacao());
        mockEstoqueRepository.adicionarQuantidade.mockResolvedValueOnce(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValueOnce();
        
        // Segundo item falha
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValueOnce(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockRejectedValueOnce(new Error('Database error'));

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Erro ao processar item LUV-001: Database error')
        );

        // Verify transaction was called (Prisma handles rollback)
        expect(mockTransaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('PERMITIR_ESTOQUE_NEGATIVO Configuration', () => {
      it('deve permitir estoque negativo quando configuração está habilitada', async () => {
        // Arrange - simular configuração PERMITIR_ESTOQUE_NEGATIVO = true
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaTransferencia = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        const notaConcluida = createMockNota({
          status: StatusNotaMovimentacao.CONCLUIDA,
        });

        // Setup mocks - estoque insuficiente mas permite negativo
        mockNotaRepository.findWithItens.mockResolvedValue(notaTransferencia);
        mockEstoqueRepository.verificarDisponibilidade.mockResolvedValue(false); // Estoque insuficiente
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(5); // Saldo menor que quantidade
        mockMovimentacaoRepository.create.mockResolvedValue(createMockMovimentacao());
        mockEstoqueRepository.removerQuantidade.mockResolvedValue(null as any); // Permite negativo
        mockEstoqueRepository.adicionarQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(notaConcluida);
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([createMockMovimentacao()]);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Mock process.env for configuration
        vi.stubEnv('PERMITIR_ESTOQUE_NEGATIVO', 'true');

        // Act - deve processar mesmo com estoque negativo
        const result = await useCase.execute(input);

        // Assert
        expect(result.notaConcluida).toEqual(notaConcluida);
        expect(result.itensProcessados[0].estoqueAtualizado).toBe(true);
        
        // Verify stock operations still proceeded
        expect(mockEstoqueRepository.removerQuantidade).toHaveBeenCalled();
        expect(mockEstoqueRepository.adicionarQuantidade).toHaveBeenCalled();

        vi.unstubAllEnvs();
      });

      it('deve bloquear estoque negativo quando configuração está desabilitada', async () => {
        // Arrange - simular configuração PERMITIR_ESTOQUE_NEGATIVO = false
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaTransferencia = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaTransferencia);
        mockEstoqueRepository.verificarDisponibilidade.mockResolvedValue(false); // Estoque insuficiente

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Mock process.env for configuration
        vi.stubEnv('PERMITIR_ESTOQUE_NEGATIVO', 'false');

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Quantidade insuficiente em estoque para o item ' + TIPO_EPI_ID)
        );

        // Verify stock operations were not called
        expect(mockEstoqueRepository.removerQuantidade).not.toHaveBeenCalled();
        expect(mockEstoqueRepository.adicionarQuantidade).not.toHaveBeenCalled();

        vi.unstubAllEnvs();
      });
    });

    describe('Validações de Movimentação Detalhadas', () => {
      it('deve validar parâmetros corretos na criação de movimentação ENTRADA', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        const movimentacaoEntrada = createMockMovimentacao({
          tipoMovimentacao: TipoMovimentacao.ENTRADA,
          almoxarifadoId: ALMOXARIFADO_DESTINO_ID,
          quantidade: QUANTIDADE,
          saldoAnterior: SALDO_ANTERIOR,
          saldoPosterior: SALDO_ANTERIOR + QUANTIDADE,
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValue(movimentacaoEntrada);
        mockEstoqueRepository.adicionarQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(createMockNota());
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([movimentacaoEntrada]);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        await useCase.execute(input);

        // Assert - verificar se MovimentacaoEstoque.createEntrada foi chamado com parâmetros corretos
        expect(mockMovimentacaoRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            almoxarifadoId: ALMOXARIFADO_DESTINO_ID,
            tipoEpiId: TIPO_EPI_ID,
            tipoMovimentacao: TipoMovimentacao.ENTRADA,
            quantidade: QUANTIDADE,
            saldoAnterior: SALDO_ANTERIOR,
            usuarioId: USUARIO_ID,
            notaMovimentacaoId: NOTA_ID,
          })
        );
      });

      it('deve validar ordem correta de operações na TRANSFERENCIA', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
          validarEstoque: true,
        };

        const notaTransferencia = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigemId: ALMOXARIFADO_ORIGEM_ID,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaTransferencia);
        mockEstoqueRepository.verificarDisponibilidade.mockResolvedValue(true);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValue(createMockMovimentacao());
        mockEstoqueRepository.removerQuantidade.mockResolvedValue(null as any);
        mockEstoqueRepository.adicionarQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(createMockNota());
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([createMockMovimentacao()]);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        await useCase.execute(input);

        // Assert - verificar ordem das operações
        const callOrder = [
          'verificarDisponibilidade',
          'obterUltimaSaldo', // Primeiro para origem
          'create', // Movimentação saída
          'obterUltimaSaldo', // Segundo para destino  
          'create', // Movimentação entrada
          'removerQuantidade', // Remove da origem
          'adicionarQuantidade', // Adiciona no destino
        ];

        expect(mockEstoqueRepository.verificarDisponibilidade).toHaveBeenCalledBefore(
          mockMovimentacaoRepository.obterUltimaSaldo as any
        );
        expect(mockEstoqueRepository.removerQuantidade).toHaveBeenCalledWith(
          ALMOXARIFADO_ORIGEM_ID,
          TIPO_EPI_ID,
          StatusEstoqueItem.DISPONIVEL,
          QUANTIDADE
        );
        expect(mockEstoqueRepository.adicionarQuantidade).toHaveBeenCalledWith(
          ALMOXARIFADO_DESTINO_ID,
          TIPO_EPI_ID,
          StatusEstoqueItem.DISPONIVEL,
          QUANTIDADE
        );
      });

      it('deve criar movimentação de AJUSTE com cálculo correto do saldo', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const QUANTIDADE_AJUSTE = -5; // Ajuste negativo
        const notaAjuste = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.AJUSTE,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
          itens: [{
            id: 'item-1',
            tipoEpiId: TIPO_EPI_ID,
            quantidade: QUANTIDADE_AJUSTE,
            quantidadeProcessada: 0,
            tipoEpi: { nome: 'Capacete', codigo: 'CAP-001' }
          }]
        });

        // Setup mocks
        mockNotaRepository.findWithItens.mockResolvedValue(notaAjuste);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValue(createMockMovimentacao());
        mockEstoqueRepository.atualizarQuantidade.mockResolvedValue(null as any);
        mockNotaRepository.atualizarQuantidadeProcessada.mockResolvedValue();
        mockNotaRepository.concluirNota.mockResolvedValue(createMockNota());
        mockMovimentacaoRepository.findByNotaMovimentacao.mockResolvedValue([createMockMovimentacao()]);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act
        await useCase.execute(input);

        // Assert - verificar se quantidade final está correta
        expect(mockEstoqueRepository.atualizarQuantidade).toHaveBeenCalledWith(
          ALMOXARIFADO_DESTINO_ID,
          TIPO_EPI_ID,
          StatusEstoqueItem.DISPONIVEL,
          SALDO_ANTERIOR + QUANTIDADE_AJUSTE // 20 + (-5) = 15
        );
      });
    });

    describe('Cenários de Falha e Recuperação', () => {
      it('deve falhar graciosamente quando não consegue obter saldo anterior', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);
        mockMovimentacaoRepository.obterUltimaSaldo.mockRejectedValue(
          new Error('Connection timeout')
        );

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Erro ao processar item ' + TIPO_EPI_ID + ': Connection timeout')
        );
      });

      it('deve falhar quando repositório de estoque rejeita operação', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);
        mockMovimentacaoRepository.obterUltimaSaldo.mockResolvedValue(SALDO_ANTERIOR);
        mockMovimentacaoRepository.create.mockResolvedValue(createMockMovimentacao());
        mockEstoqueRepository.adicionarQuantidade.mockRejectedValue(
          new BusinessError('Estoque máximo excedido')
        );

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Erro ao processar item ' + TIPO_EPI_ID + ': Estoque máximo excedido')
        );
      });

      it('deve preservar erro de domínio original quando BusinessError é lançada', async () => {
        // Arrange
        const input: ConcluirNotaInput = {
          notaId: NOTA_ID,
          usuarioId: USUARIO_ID,
        };

        const notaEntrada = createMockNotaWithItens({
          tipo: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
        });

        const domainError = new BusinessError('Regra de negócio violada');

        mockNotaRepository.findWithItens.mockResolvedValue(notaEntrada);
        mockMovimentacaoRepository.obterUltimaSaldo.mockRejectedValue(domainError);

        mockTransaction.mockImplementation(async (callback) => {
          return await callback(mockPrismaService);
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          new BusinessError('Erro ao processar item ' + TIPO_EPI_ID + ': Regra de negócio violada')
        );
      });
    });
  });

  // Helper functions
  function createMockNota(overrides: Partial<NotaMovimentacao> = {}): NotaMovimentacao {
    return {
      id: NOTA_ID,
      numero: 'NOTA-001',
      tipo: TipoNotaMovimentacao.ENTRADA,
      almoxarifadoOrigemId: null,
      almoxarifadoDestinoId: ALMOXARIFADO_DESTINO_ID,
      usuarioId: USUARIO_ID,
      observacoes: null,
      status: StatusNotaMovimentacao.RASCUNHO,
      dataConclusao: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      itens: [],
      isRascunho: () => true,
      isConcluida: () => false,
      isCancelada: () => false,
      isEditavel: () => true,
      isCancelavel: () => false,
      adicionarItem: vi.fn(),
      removerItem: vi.fn(),
      atualizarQuantidadeItem: vi.fn(),
      concluir: vi.fn(),
      cancelar: vi.fn(),
      ...overrides,
    } as NotaMovimentacao;
  }

  function createMockNotaWithItens(overrides: any = {}): any {
    const baseNota = createMockNota(overrides);
    
    return {
      ...baseNota,
      itens: overrides.itens || [{
        id: 'item-1',
        tipoEpiId: TIPO_EPI_ID,
        quantidade: QUANTIDADE,
        quantidadeProcessada: 0,
        tipoEpi: { nome: 'Capacete', codigo: 'CAP-001' }
      }],
      isRascunho: () => overrides.status !== StatusNotaMovimentacao.CONCLUIDA,
    };
  }

  function createMockMovimentacao(overrides: Partial<MovimentacaoEstoque> = {}): MovimentacaoEstoque {
    return {
      id: 'movimentacao-123',
      almoxarifadoId: overrides.almoxarifadoId || ALMOXARIFADO_DESTINO_ID,
      tipoEpiId: overrides.tipoEpiId || TIPO_EPI_ID,
      tipoMovimentacao: TipoMovimentacao.ENTRADA,
      quantidade: overrides.quantidade || QUANTIDADE,
      saldoAnterior: SALDO_ANTERIOR,
      saldoPosterior: SALDO_ANTERIOR + QUANTIDADE,
      notaMovimentacaoId: NOTA_ID,
      usuarioId: USUARIO_ID,
      observacoes: null,
      movimentacaoEstornoId: null,
      createdAt: new Date(),
      isEntrada: () => true,
      isSaida: () => false,
      isTransferencia: () => false,
      isAjuste: () => false,
      isDescarte: () => false,
      isEstorno: () => false,
      isEstornavel: () => true,
      ...overrides,
    } as MovimentacaoEstoque;
  }
});