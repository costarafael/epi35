import { describe, it, expect, beforeEach } from 'vitest';
import { GerenciarNotaRascunhoUseCase } from '@application/use-cases/estoque/gerenciar-nota-rascunho.use-case';
import { NotaRepository } from '@infrastructure/repositories/nota.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { 
  TipoNotaMovimentacao, 
  StatusNotaMovimentacao 
} from '@domain/enums';
import { BusinessError } from '@domain/exceptions/business.exception';

describe('GerenciarNotaRascunhoUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: GerenciarNotaRascunhoUseCase;
  // let _notaRepository: NotaRepository;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        GerenciarNotaRascunhoUseCase,
        {
          provide: 'INotaRepository',
          useFactory: (prisma: PrismaService) => new NotaRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: NotaRepository,
          useFactory: (prisma: PrismaService) => new NotaRepository(prisma),
          inject: [PrismaService],
        },
      ],
    });

    useCase = testSetup.app.get<GerenciarNotaRascunhoUseCase>(GerenciarNotaRascunhoUseCase);
    // _notaRepository = testSetup.app.get<NotaRepository>(NotaRepository);

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('criarRascunho - Criação de Notas em Rascunho', () => {
    it('deve criar nota de entrada em rascunho com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      expect(usuario).toBeDefined();
      expect(almoxarifado).toBeDefined();

      // Act - Criar nota em rascunho
      const result = await useCase.criarNota({
        tipo: TipoNotaMovimentacao.ENTRADA,
        almoxarifadoDestinoId: almoxarifado.id,
        usuarioId: usuario.id,
        observacoes: 'Nota de entrada em rascunho',
      });

      // Assert - Verificar se a nota foi criada
      expect(result).toBeDefined();
      expect(result.tipo).toBe(TipoNotaMovimentacao.ENTRADA);
      expect(result.almoxarifadoDestinoId).toBe(almoxarifado.id);
      expect(result.usuarioId).toBe(usuario.id);
      expect(result.status).toBe(StatusNotaMovimentacao.RASCUNHO);
      expect(result.observacoes).toBe('Nota de entrada em rascunho');
      expect(result.numero).toBeDefined();

      // Verificar no banco se a nota foi realmente criada
      const notaCriada = await testSetup.prismaService.notaMovimentacao.findUnique({
        where: { id: result.id },
      });

      expect(notaCriada).toBeDefined();
      expect(notaCriada.status).toBe(StatusNotaMovimentacao.RASCUNHO);
    });

    it('deve criar nota de saída em rascunho com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Act - Criar nota em rascunho
      const result = await useCase.criarNota({
        tipo: TipoNotaMovimentacao.TRANSFERENCIA,
        almoxarifadoOrigemId: almoxarifado.id,
        usuarioId: usuario.id,
        observacoes: 'Nota de saída em rascunho',
      });

      // Assert - Verificar se a nota foi criada
      expect(result).toBeDefined();
      expect(result.tipo).toBe(TipoNotaMovimentacao.TRANSFERENCIA);
      expect(result.almoxarifadoOrigemId).toBe(almoxarifado.id);
      expect(result.status).toBe(StatusNotaMovimentacao.RASCUNHO);
    });
  });

  describe('adicionarItem - Adição de Itens em Notas Rascunho', () => {
    it('deve adicionar item à nota em rascunho com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar nota em rascunho
      const notaRascunho = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'RASCUNHO-001',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoOrigem: { connect: { id: almoxarifado.id } },
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Nota para adicionar item',
        },
      });

      // Act - Adicionar item à nota
      await useCase.adicionarItem({
        notaId: notaRascunho.id,
        tipoEpiId: tipoCapacete.id,
        quantidade: 10,
        observacoes: 'Item adicionado em teste',
      });

      // Assert - Verificar se o item foi adicionado
      const notaComItem = await testSetup.prismaService.notaMovimentacao.findUnique({
        where: { id: notaRascunho.id },
        include: { itens: true },
      });

      expect(notaComItem).toBeDefined();
      expect(notaComItem.itens).toHaveLength(1);
      expect(notaComItem.itens[0].tipoEpiId).toBe(tipoCapacete.id);
      expect(notaComItem.itens[0].quantidade).toBe(10);
    });

    it('deve falhar ao adicionar item à nota que não está em rascunho', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar nota pendente (não em rascunho)
      const notaPendente = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'PENDENTE-001',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoOrigem: { connect: { id: almoxarifado.id } },
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Nota pendente',
        },
      });

      // Act & Assert - Deve falhar ao tentar adicionar item
      await expect(useCase.adicionarItem({
        notaId: notaPendente.id,
        tipoEpiId: tipoCapacete.id,
        quantidade: 10,
        observacoes: 'Tentativa de adicionar item em nota não rascunho',
      })).rejects.toThrow(BusinessError);
    });
  });

  describe('removerItem - Remoção de Itens em Notas Rascunho', () => {
    it('deve remover item da nota em rascunho com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar nota em rascunho
      const notaRascunho = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'RASCUNHO-002',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoOrigem: { connect: { id: almoxarifado.id } },
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Nota para remover item',
          itens: {
            create: {
              tipoEpiId: tipoCapacete.id,
              quantidade: 5,
              // observacoes: 'Item para remover', // Field moved to notaMovimentacao level
            },
          },
        },
      });

      // Buscar o item criado
      const itemCriado = await testSetup.prismaService.notaMovimentacaoItem.findFirst({
        where: { notaMovimentacaoId: notaRascunho.id },
      });

      expect(itemCriado).toBeDefined();

      // Act - Remover o item
      await useCase.removerItem(notaRascunho.id, itemCriado.id);

      // Assert - Verificar se o item foi removido
      const notaSemItem = await testSetup.prismaService.notaMovimentacao.findUnique({
        where: { id: notaRascunho.id },
        include: { itens: true },
      });

      expect(notaSemItem).toBeDefined();
      expect(notaSemItem.itens).toHaveLength(0);
    });
  });

  describe('listarRascunhos - Listagem de Notas em Rascunho', () => {
    it('deve listar rascunhos do usuário com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar algumas notas em rascunho
      await testSetup.prismaService.notaMovimentacao.createMany({
        data: [
          {
            numeroDocumento: 'RASCUNHO-LIST-1',
            tipoNota: TipoNotaMovimentacao.ENTRADA,
            almoxarifadoId: almoxarifado.id,
            responsavelId: usuario.id,
            status: StatusNotaMovimentacao.RASCUNHO,
            observacoes: 'Rascunho 1',
          },
          {
            numeroDocumento: 'RASCUNHO-LIST-2',
            tipoNota: TipoNotaMovimentacao.TRANSFERENCIA,
            almoxarifadoId: almoxarifado.id,
            responsavelId: usuario.id,
            status: StatusNotaMovimentacao.RASCUNHO,
            observacoes: 'Rascunho 2',
          },
        ],
      });

      // Act - Listar rascunhos
      const result = await useCase.listarRascunhos(usuario.id);

      // Assert - Verificar se os rascunhos foram listados
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(nota => nota.numero === 'RASCUNHO-LIST-1')).toBe(true);
      expect(result.some(nota => nota.numero === 'RASCUNHO-LIST-2')).toBe(true);
    });
  });
});
