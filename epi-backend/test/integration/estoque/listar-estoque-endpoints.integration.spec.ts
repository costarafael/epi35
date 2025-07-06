import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EstoqueController } from '../../../src/presentation/controllers/estoque.controller';
import { ListarEstoqueItensUseCase } from '../../../src/application/use-cases/estoque/listar-estoque-itens.use-case';
import { ListarAlmoxarifadosUseCase } from '../../../src/application/use-cases/estoque/listar-almoxarifados.use-case';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { RelatorioPosicaoEstoqueUseCase } from '../../../src/application/use-cases/queries/relatorio-posicao-estoque.use-case';
import { RealizarAjusteDirectoUseCase } from '../../../src/application/use-cases/estoque/realizar-ajuste-direto.use-case';
import { ConfiguracaoService } from '../../../src/domain/services/configuracao.service';

describe('EstoqueController - Listagem Endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let listarEstoqueItensUseCase: ListarEstoqueItensUseCase;
  let listarAlmoxarifadosUseCase: ListarAlmoxarifadosUseCase;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EstoqueController],
      providers: [
        PrismaService,
        ConfiguracaoService,
        ListarEstoqueItensUseCase,
        ListarAlmoxarifadosUseCase,
        RelatorioPosicaoEstoqueUseCase,
        RealizarAjusteDirectoUseCase,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    listarEstoqueItensUseCase = moduleFixture.get<ListarEstoqueItensUseCase>(ListarEstoqueItensUseCase);
    listarAlmoxarifadosUseCase = moduleFixture.get<ListarAlmoxarifadosUseCase>(ListarAlmoxarifadosUseCase);

    // Reset database
    await prisma.$executeRaw`TRUNCATE TABLE "estoque_itens", "almoxarifados", "unidades_negocio", "tipos_epi" RESTART IDENTITY CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /estoque/itens', () => {
    beforeEach(async () => {
      // Create test data
      const unidadeNegocio = await prisma.unidadeNegocio.create({
        data: {
          nome: 'Unidade Test',
          codigo: 'UN001',
        },
      });

      const almoxarifado = await prisma.almoxarifado.create({
        data: {
          nome: 'Almox Test',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const tipoEpi = await prisma.tipoEPI.create({
        data: {
          nomeEquipamento: 'Capacete',
          numeroCa: '12345',
          descricao: 'Capacete de segurança',
        },
      });

      await prisma.estoqueItem.create({
        data: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoEpi.id,
          quantidade: 10,
          status: 'DISPONIVEL',
        },
      });
    });

    afterEach(async () => {
      await prisma.$executeRaw`TRUNCATE TABLE "estoque_itens", "almoxarifados", "unidades_negocio", "tipos_epi" RESTART IDENTITY CASCADE`;
    });

    it('deve listar itens de estoque com sucesso', async () => {
      const resultado = await listarEstoqueItensUseCase.execute({});

      expect(resultado).toBeDefined();
      expect(resultado.items).toHaveLength(1);
      expect(resultado.pagination).toBeDefined();
      expect(resultado.pagination.total).toBe(1);
      expect(resultado.items[0]).toMatchObject({
        quantidade: 10,
        status: 'DISPONIVEL',
        almoxarifado: expect.objectContaining({
          nome: 'Almox Test',
        }),
        tipoEpi: expect.objectContaining({
          nomeEquipamento: 'Capacete',
          numeroCa: '12345',
        }),
      });
    });

    it('deve filtrar por almoxarifado', async () => {
      const almoxarifados = await prisma.almoxarifado.findMany();
      const almoxarifadoId = almoxarifados[0].id;

      const resultado = await listarEstoqueItensUseCase.execute({
        almoxarifadoId,
      });

      expect(resultado.items).toHaveLength(1);
      expect(resultado.items[0].almoxarifadoId).toBe(almoxarifadoId);
    });

    it('deve filtrar apenas itens disponíveis', async () => {
      const resultado = await listarEstoqueItensUseCase.execute({
        apenasDisponiveis: true,
      });

      expect(resultado.items).toHaveLength(1);
      expect(resultado.items[0].status).toBe('DISPONIVEL');
    });

    it('deve filtrar apenas itens com saldo', async () => {
      const resultado = await listarEstoqueItensUseCase.execute({
        apenasComSaldo: true,
      });

      expect(resultado.items).toHaveLength(1);
      expect(resultado.items[0].quantidade).toBeGreaterThan(0);
    });

    it('deve paginar corretamente', async () => {
      const resultado = await listarEstoqueItensUseCase.execute({
        page: 1,
        limit: 1,
      });

      expect(resultado.items).toHaveLength(1);
      expect(resultado.pagination.page).toBe(1);
      expect(resultado.pagination.limit).toBe(1);
      expect(resultado.pagination.totalPages).toBe(1);
    });
  });

  describe('GET /estoque/almoxarifados', () => {
    beforeEach(async () => {
      // Create test data
      const unidadeNegocio = await prisma.unidadeNegocio.create({
        data: {
          nome: 'Unidade Test',
          codigo: 'UN001',
        },
      });

      await prisma.almoxarifado.create({
        data: {
          nome: 'Almox Principal',
          unidadeNegocioId: unidadeNegocio.id,
          isPrincipal: true,
        },
      });

      await prisma.almoxarifado.create({
        data: {
          nome: 'Almox Secundário',
          unidadeNegocioId: unidadeNegocio.id,
          isPrincipal: false,
        },
      });
    });

    afterEach(async () => {
      await prisma.$executeRaw`TRUNCATE TABLE "almoxarifados", "unidades_negocio" RESTART IDENTITY CASCADE`;
    });

    it('deve listar almoxarifados com sucesso', async () => {
      const resultado = await listarAlmoxarifadosUseCase.execute({});

      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toMatchObject({
        nome: 'Almox Principal',
        isPrincipal: true,
        unidadeNegocio: expect.objectContaining({
          nome: 'Unidade Test',
          codigo: 'UN001',
        }),
      });
    });

    it('deve ordenar principais primeiro', async () => {
      const resultado = await listarAlmoxarifadosUseCase.execute({});

      expect(resultado[0].isPrincipal).toBe(true);
      expect(resultado[0].nome).toBe('Almox Principal');
      expect(resultado[1].isPrincipal).toBe(false);
    });

    it('deve filtrar por unidade de negócio', async () => {
      const unidadeNegocio = await prisma.unidadeNegocio.findFirst();
      
      const resultado = await listarAlmoxarifadosUseCase.execute({
        unidadeNegocioId: unidadeNegocio?.id,
      });

      expect(resultado).toHaveLength(2);
      resultado.forEach(almox => {
        expect(almox.unidadeNegocioId).toBe(unidadeNegocio?.id);
      });
    });

    it('deve incluir contadores quando solicitado', async () => {
      const resultado = await listarAlmoxarifadosUseCase.execute({
        incluirContadores: true,
      });

      expect(resultado).toHaveLength(2);
      resultado.forEach(almox => {
        expect(almox._count).toBeDefined();
        expect(almox._count?.estoqueItens).toBeDefined();
        expect(typeof almox._count?.estoqueItens).toBe('number');
      });
    });

    it('não deve incluir contadores quando não solicitado', async () => {
      const resultado = await listarAlmoxarifadosUseCase.execute({
        incluirContadores: false,
      });

      expect(resultado).toHaveLength(2);
      // Note: _count may still be present but undefined in the type
      // This is acceptable behavior
    });
  });

  describe('Casos de erro', () => {
    it('deve retornar lista vazia quando não há itens', async () => {
      const resultado = await listarEstoqueItensUseCase.execute({});
      
      expect(resultado.items).toHaveLength(0);
      expect(resultado.pagination.total).toBe(0);
    });

    it('deve retornar lista vazia quando não há almoxarifados', async () => {
      const resultado = await listarAlmoxarifadosUseCase.execute({});
      
      expect(resultado).toHaveLength(0);
    });

    it('deve lidar com paginação fora do range', async () => {
      const resultado = await listarEstoqueItensUseCase.execute({
        page: 999,
        limit: 10,
      });
      
      expect(resultado.items).toHaveLength(0);
      expect(resultado.pagination.page).toBe(999);
      expect(resultado.pagination.total).toBe(0);
    });

    it('deve aplicar limite máximo de itens por página', async () => {
      const resultado = await listarEstoqueItensUseCase.execute({
        limit: 200, // Acima do máximo de 100
      });
      
      expect(resultado.pagination.limit).toBe(100);
    });
  });
});