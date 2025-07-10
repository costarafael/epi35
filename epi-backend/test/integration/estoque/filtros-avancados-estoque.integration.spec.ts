import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { ConfiguracaoService } from '../../../src/domain/services/configuracao.service';
import { ListarEstoqueItensUseCase } from '../../../src/application/use-cases/estoque/listar-estoque-itens.use-case';
import { AppModule } from '../../../src/app.module';
import { ListarEstoqueItensQuerySchema } from '../../../src/presentation/dto/schemas/estoque.schemas';

describe('Filtros Avançados de Estoque (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let configuracaoService: ConfiguracaoService;
  let listarEstoqueItensUseCase: ListarEstoqueItensUseCase;

  let almoxarifadoId: string;
  let tipoEpiId1: string;
  let tipoEpiId2: string;
  let itemDisponivelComEstoque: string;
  let itemDisponivelSemEstoque: string;
  let itemQuarentenaComEstoque: string;
  let itemQuarentenaSemEstoque: string;
  let itemInspecaoComEstoque: string;
  let itemInspecaoSemEstoque: string;

  beforeAll(async () => {
    // Setup environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    configuracaoService = moduleFixture.get<ConfiguracaoService>(ConfiguracaoService);
    listarEstoqueItensUseCase = moduleFixture.get<ListarEstoqueItensUseCase>(ListarEstoqueItensUseCase);

    // Reset database
    await prisma.estoqueItem.deleteMany();
    await prisma.almoxarifado.deleteMany();
    await prisma.tipoEpi.deleteMany();
    await prisma.unidadeNegocio.deleteMany();
  });

  beforeEach(async () => {
    // Limpar dados
    await prisma.estoqueItem.deleteMany();
    await prisma.almoxarifado.deleteMany();
    await prisma.tipoEpi.deleteMany();
    await prisma.unidadeNegocio.deleteMany();

    // Criar dados de teste
    const unidadeNegocio = await prisma.unidadeNegocio.create({
      data: {
        nome: 'Teste UN',
        codigo: 'TST001',
      },
    });

    const almoxarifado = await prisma.almoxarifado.create({
      data: {
        nome: 'Almoxarifado Teste',
        isPrincipal: true,
        unidadeNegocioId: unidadeNegocio.id,
      },
    });
    almoxarifadoId = almoxarifado.id;

    const tipoEpi1 = await prisma.tipoEpi.create({
      data: {
        nomeEquipamento: 'Capacete Teste',
        numeroCa: 'CA-TEST-001',
        categoria: 'PROTECAO_CABECA',
        status: 'ATIVO',
      },
    });
    tipoEpiId1 = tipoEpi1.id;

    const tipoEpi2 = await prisma.tipoEpi.create({
      data: {
        nomeEquipamento: 'Luva Teste',
        numeroCa: 'CA-TEST-002',
        categoria: 'PROTECAO_MAOS_BRACOS',
        status: 'ATIVO',
      },
    });
    tipoEpiId2 = tipoEpi2.id;

    // Criar itens de estoque com diferentes combinações de status e quantidade
    const estoqueItens = await prisma.estoqueItem.createMany({
      data: [
        { almoxarifadoId, tipoEpiId: tipoEpiId1, quantidade: 10, status: 'DISPONIVEL' },
        { almoxarifadoId, tipoEpiId: tipoEpiId2, quantidade: 0, status: 'DISPONIVEL' },
        { almoxarifadoId, tipoEpiId: tipoEpiId1, quantidade: 5, status: 'QUARENTENA' },
        { almoxarifadoId, tipoEpiId: tipoEpiId2, quantidade: 0, status: 'QUARENTENA' },
        { almoxarifadoId, tipoEpiId: tipoEpiId1, quantidade: 3, status: 'AGUARDANDO_INSPECAO' },
        { almoxarifadoId, tipoEpiId: tipoEpiId2, quantidade: 0, status: 'AGUARDANDO_INSPECAO' },
      ],
      skipDuplicates: true,
    });

    // Buscar IDs dos itens criados para referência
    const itens = await prisma.estoqueItem.findMany({
      where: { almoxarifadoId },
      orderBy: [{ status: 'asc' }, { quantidade: 'desc' }],
    });

    [
      itemInspecaoComEstoque,
      itemInspecaoSemEstoque,
      itemDisponivelComEstoque,
      itemDisponivelSemEstoque,
      itemQuarentenaComEstoque,
      itemQuarentenaSemEstoque,
    ] = itens.map(item => item.id);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('Endpoint de Configuração de Filtros', () => {
    it('deve retornar configuração correta quando PERMITIR_ESTOQUE_NEGATIVO = false', async () => {
      // Configurar para não permitir estoque negativo
      await configuracaoService.setConfiguration('PERMITIR_ESTOQUE_NEGATIVO', false);

      const result = await listarEstoqueItensUseCase.execute({});
      
      // Verificar se podemos acessar a configuração
      const permitirEstoqueNegativo = await configuracaoService.permitirEstoqueNegativo();
      expect(permitirEstoqueNegativo).toBe(false);
    });

    it('deve retornar configuração correta quando PERMITIR_ESTOQUE_NEGATIVO = true', async () => {
      // Configurar para permitir estoque negativo
      await configuracaoService.setConfiguration('PERMITIR_ESTOQUE_NEGATIVO', true);

      const permitirEstoqueNegativo = await configuracaoService.permitirEstoqueNegativo();
      expect(permitirEstoqueNegativo).toBe(true);
    });
  });

  describe('Filtro SEM_ESTOQUE', () => {
    it('deve retornar apenas itens com quantidade <= 0 exceto quarentena/inspeção', async () => {
      const result = await listarEstoqueItensUseCase.execute({
        status: 'SEM_ESTOQUE',
      });

      expect(result.items).toHaveLength(1); // Apenas o item DISPONIVEL com quantidade 0
      expect(result.items[0].quantidade).toBe(0);
      expect(result.items[0].status).toBe('DISPONIVEL');
    });

    it('deve funcionar com outros filtros', async () => {
      const result = await listarEstoqueItensUseCase.execute({
        status: 'SEM_ESTOQUE',
        tipoEpiId: tipoEpiId2, // Tipo EPI específico
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].tipoEpiId).toBe(tipoEpiId2);
      expect(result.items[0].quantidade).toBe(0);
      expect(result.items[0].status).toBe('DISPONIVEL');
    });
  });

  describe('Filtro DISPONIVEL com Lógica Condicional', () => {
    it('deve filtrar por quantidade > 0 quando PERMITIR_ESTOQUE_NEGATIVO = false', async () => {
      // Configurar para não permitir estoque negativo
      await configuracaoService.setConfiguration('PERMITIR_ESTOQUE_NEGATIVO', false);

      const result = await listarEstoqueItensUseCase.execute({
        status: 'DISPONIVEL',
      });

      expect(result.items).toHaveLength(1); // Apenas item DISPONIVEL com quantidade > 0
      expect(result.items[0].quantidade).toBeGreaterThan(0);
      expect(result.items[0].status).toBe('DISPONIVEL');
    });

    it('deve retornar todos DISPONIVEL quando PERMITIR_ESTOQUE_NEGATIVO = true', async () => {
      // Configurar para permitir estoque negativo
      await configuracaoService.setConfiguration('PERMITIR_ESTOQUE_NEGATIVO', true);

      const result = await listarEstoqueItensUseCase.execute({
        status: 'DISPONIVEL',
      });

      expect(result.items).toHaveLength(2); // Ambos itens DISPONIVEL
      expect(result.items.every(item => item.status === 'DISPONIVEL')).toBe(true);
    });
  });

  describe('Filtros Tradicionais', () => {
    it('deve filtrar QUARENTENA corretamente', async () => {
      const result = await listarEstoqueItensUseCase.execute({
        status: 'QUARENTENA',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(item => item.status === 'QUARENTENA')).toBe(true);
    });

    it('deve filtrar AGUARDANDO_INSPECAO corretamente', async () => {
      const result = await listarEstoqueItensUseCase.execute({
        status: 'AGUARDANDO_INSPECAO',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(item => item.status === 'AGUARDANDO_INSPECAO')).toBe(true);
    });
  });

  describe('Compatibilidade com Filtros Legados', () => {
    it('deve respeitar apenasDisponiveis com lógica condicional', async () => {
      // Configurar para não permitir estoque negativo
      await configuracaoService.setConfiguration('PERMITIR_ESTOQUE_NEGATIVO', false);

      const result = await listarEstoqueItensUseCase.execute({
        apenasDisponiveis: true,
      });

      expect(result.items).toHaveLength(1); // Apenas DISPONIVEL com quantidade > 0
      expect(result.items[0].status).toBe('DISPONIVEL');
      expect(result.items[0].quantidade).toBeGreaterThan(0);
    });

    it('deve funcionar com apenasComSaldo', async () => {
      const result = await listarEstoqueItensUseCase.execute({
        apenasComSaldo: true,
      });

      expect(result.items).toHaveLength(3); // Todos com quantidade > 0
      expect(result.items.every(item => item.quantidade > 0)).toBe(true);
    });
  });

  describe('Prioridade de Filtros', () => {
    it('filtro status deve ter prioridade sobre apenasDisponiveis', async () => {
      const result = await listarEstoqueItensUseCase.execute({
        status: 'QUARENTENA',
        apenasDisponiveis: true, // Deve ser ignorado
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(item => item.status === 'QUARENTENA')).toBe(true);
    });
  });

  describe('Validação de Schema', () => {
    it('deve validar status válidos', () => {
      const validStatuses = ['DISPONIVEL', 'AGUARDANDO_INSPECAO', 'QUARENTENA', 'SEM_ESTOQUE'];
      
      validStatuses.forEach(status => {
        const result = ListarEstoqueItensQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      });
    });

    it('deve rejeitar status inválidos', () => {
      const invalidStatuses = ['INVALID', 'TESTE', 'SEM_ESTOQUE_INVALID'];
      
      invalidStatuses.forEach(status => {
        const result = ListarEstoqueItensQuerySchema.safeParse({ status });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Performance e Edge Cases', () => {
    it('deve funcionar com resultado vazio', async () => {
      // Deletar todos os itens
      await prisma.estoqueItem.deleteMany();

      const result = await listarEstoqueItensUseCase.execute({
        status: 'SEM_ESTOQUE',
      });

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('deve aplicar paginação corretamente', async () => {
      const result = await listarEstoqueItensUseCase.execute({
        page: 1,
        limit: 2,
      });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(6);
      expect(result.pagination.totalPages).toBe(3);
    });
  });
});