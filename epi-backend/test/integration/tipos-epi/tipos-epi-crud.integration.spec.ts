import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { GlobalZodValidationPipe } from '../../../src/presentation/pipes/global-zod-validation.pipe';
import { HttpExceptionFilter } from '../../../src/presentation/filters/http-exception.filter';

describe('TiposEpiController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tipoEpiId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Configure the same validation as in main.ts
    app.useGlobalPipes(
      new GlobalZodValidationPipe(),
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Clean up tipos EPI before each test
    await prisma.tipoEPI.deleteMany();
  });

  afterAll(async () => {
    // Clean up tipos EPI after all tests
    await prisma.tipoEPI.deleteMany();
    await app.close();
  });

  describe('POST /tipos-epi', () => {
    const validTipoEpiData = {
      nomeEquipamento: 'Capacete de Segurança',
      numeroCa: 'CA-12345',
      categoria: 'PROTECAO_CABECA',
      descricao: 'Capacete de segurança em polietileno',
      vidaUtilDias: 365,
      status: 'ATIVO',
    };

    it('should create a new EPI type successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/tipos-epi')
        .send(validTipoEpiData)
        .expect(HttpStatus.CREATED);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Tipo de EPI criado com sucesso',
        data: {
          id: expect.any(String),
          nomeEquipamento: validTipoEpiData.nomeEquipamento,
          numeroCa: validTipoEpiData.numeroCa,
          categoria: validTipoEpiData.categoria,
          descricao: validTipoEpiData.descricao,
          vidaUtilDias: validTipoEpiData.vidaUtilDias,
          status: validTipoEpiData.status,
          createdAt: expect.any(String),
        },
      });

      tipoEpiId = response.body.data.id;
    });

    it('should create EPI type with minimal required fields', async () => {
      const minimalData = {
        nomeEquipamento: 'Óculos de Proteção',
        numeroCa: 'CA-54321',
        categoria: 'PROTECAO_OLHOS_FACE',
      };

      const response = await request(app.getHttpServer())
        .post('/tipos-epi')
        .send(minimalData)
        .expect(HttpStatus.CREATED);

      expect(response.body.data).toMatchObject({
        nomeEquipamento: minimalData.nomeEquipamento,
        numeroCa: minimalData.numeroCa,
        categoria: minimalData.categoria,
        status: 'ATIVO', // Default value
        descricao: null,
        vidaUtilDias: null,
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        nomeEquipamento: 'Capacete de Segurança',
        // Missing numeroCa and categoria
      };

      await request(app.getHttpServer())
        .post('/tipos-epi')
        .send(invalidData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 for invalid categoria', async () => {
      const invalidData = {
        ...validTipoEpiData,
        categoria: 'CATEGORIA_INVALIDA',
      };

      await request(app.getHttpServer())
        .post('/tipos-epi')
        .send(invalidData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 409 for duplicate numeroCa', async () => {
      // Create first type
      await request(app.getHttpServer())
        .post('/tipos-epi')
        .send(validTipoEpiData)
        .expect(HttpStatus.CREATED);

      // Try to create with same CA number
      const duplicateData = {
        ...validTipoEpiData,
        nomeEquipamento: 'Outro Capacete',
      };

      await request(app.getHttpServer())
        .post('/tipos-epi')
        .send(duplicateData)
        .expect(HttpStatus.CONFLICT);
    });

    it('should return 400 for negative vidaUtilDias', async () => {
      const invalidData = {
        ...validTipoEpiData,
        vidaUtilDias: -10,
      };

      await request(app.getHttpServer())
        .post('/tipos-epi')
        .send(invalidData)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /tipos-epi', () => {
    beforeEach(async () => {
      // Create test data
      await prisma.tipoEPI.createMany({
        data: [
          {
            nomeEquipamento: 'Capacete de Segurança',
            numeroCa: 'CA-12345',
            categoria: 'PROTECAO_CABECA',
            status: 'ATIVO',
          },
          {
            nomeEquipamento: 'Óculos de Proteção',
            numeroCa: 'CA-54321',
            categoria: 'PROTECAO_OLHOS_FACE',
            status: 'DESCONTINUADO',
          },
          {
            nomeEquipamento: 'Luva de Segurança',
            numeroCa: 'CA-98765',
            categoria: 'PROTECAO_MAOS_BRACOS',
            status: 'ATIVO',
          },
        ],
      });
    });

    it('should return all EPI types with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/tipos-epi')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              nomeEquipamento: expect.any(String),
              numeroCa: expect.any(String),
              categoria: expect.any(String),
              status: expect.any(String),
            }),
          ]),
          pagination: {
            page: 1,
            limit: 10,
            total: 3,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });

      expect(response.body.data.items).toHaveLength(3);
    });

    it('should filter by status ativo=true', async () => {
      const response = await request(app.getHttpServer())
        .get('/tipos-epi?ativo=true')
        .expect(HttpStatus.OK);

      expect(response.body.data.items).toHaveLength(2);
      response.body.data.items.forEach((item: any) => {
        expect(item.status).toBe('ATIVO');
      });
    });

    it('should filter by status ativo=false', async () => {
      const response = await request(app.getHttpServer())
        .get('/tipos-epi?ativo=false')
        .expect(HttpStatus.OK);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].status).toBe('DESCONTINUADO');
    });

    it('should filter by categoria', async () => {
      const response = await request(app.getHttpServer())
        .get('/tipos-epi?categoria=PROTECAO_CABECA')
        .expect(HttpStatus.OK);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].categoria).toBe('PROTECAO_CABECA');
    });

    it('should search by busca parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/tipos-epi?busca=Capacete')
        .expect(HttpStatus.OK);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].nomeEquipamento).toContain('Capacete');
    });

    it('should apply pagination correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/tipos-epi?page=1&limit=2')
        .expect(HttpStatus.OK);

      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });
  });

  describe('GET /tipos-epi/:id', () => {
    let existingTipoEpiId: string;

    beforeEach(async () => {
      const tipoEpi = await prisma.tipoEPI.create({
        data: {
          nomeEquipamento: 'Capacete de Segurança',
          numeroCa: 'CA-12345',
          categoria: 'PROTECAO_CABECA',
          status: 'ATIVO',
        },
      });
      existingTipoEpiId = tipoEpi.id;
    });

    it('should return EPI type by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tipos-epi/${existingTipoEpiId}`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: existingTipoEpiId,
          nomeEquipamento: 'Capacete de Segurança',
          numeroCa: 'CA-12345',
          categoria: 'PROTECAO_CABECA',
          status: 'ATIVO',
        },
      });
    });

    it('should return 404 for non-existent id', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
      
      await request(app.getHttpServer())
        .get(`/tipos-epi/${nonExistentId}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/tipos-epi/invalid-uuid')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PUT /tipos-epi/:id', () => {
    let existingTipoEpiId: string;

    beforeEach(async () => {
      const tipoEpi = await prisma.tipoEPI.create({
        data: {
          nomeEquipamento: 'Capacete de Segurança',
          numeroCa: 'CA-12345',
          categoria: 'PROTECAO_CABECA',
          status: 'ATIVO',
        },
      });
      existingTipoEpiId = tipoEpi.id;
    });

    it('should update EPI type successfully', async () => {
      const updateData = {
        nomeEquipamento: 'Capacete de Segurança Atualizado',
        numeroCa: 'CA-54321',
        categoria: 'PROTECAO_CABECA',
        descricao: 'Descrição atualizada',
        vidaUtilDias: 730,
        status: 'ATIVO',
      };

      const response = await request(app.getHttpServer())
        .put(`/tipos-epi/${existingTipoEpiId}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Tipo de EPI atualizado com sucesso',
        data: {
          id: existingTipoEpiId,
          nomeEquipamento: updateData.nomeEquipamento,
          numeroCa: updateData.numeroCa,
          categoria: updateData.categoria,
          descricao: updateData.descricao,
          vidaUtilDias: updateData.vidaUtilDias,
          status: updateData.status,
        },
      });
    });

    it('should update partial fields only', async () => {
      const partialUpdate = {
        descricao: 'Nova descrição',
        vidaUtilDias: 500,
      };

      const response = await request(app.getHttpServer())
        .put(`/tipos-epi/${existingTipoEpiId}`)
        .send(partialUpdate)
        .expect(HttpStatus.OK);

      expect(response.body.data).toMatchObject({
        id: existingTipoEpiId,
        nomeEquipamento: 'Capacete de Segurança', // Unchanged
        numeroCa: 'CA-12345', // Unchanged
        categoria: 'PROTECAO_CABECA', // Unchanged
        descricao: partialUpdate.descricao,
        vidaUtilDias: partialUpdate.vidaUtilDias,
        status: 'ATIVO', // Unchanged
      });
    });

    it('should return 404 for non-existent id', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { nomeEquipamento: 'Novo Nome' };

      await request(app.getHttpServer())
        .put(`/tipos-epi/${nonExistentId}`)
        .send(updateData)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 409 for duplicate numeroCa', async () => {
      // Create another type
      await prisma.tipoEPI.create({
        data: {
          nomeEquipamento: 'Outro Equipamento',
          numeroCa: 'CA-99999',
          categoria: 'PROTECAO_OLHOS_FACE',
          status: 'ATIVO',
        },
      });

      // Try to update with existing CA
      const updateData = { numeroCa: 'CA-99999' };

      await request(app.getHttpServer())
        .put(`/tipos-epi/${existingTipoEpiId}`)
        .send(updateData)
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('PATCH /tipos-epi/:id/ativar', () => {
    let inactiveTipoEpiId: string;

    beforeEach(async () => {
      const tipoEpi = await prisma.tipoEPI.create({
        data: {
          nomeEquipamento: 'Equipamento Inativo',
          numeroCa: 'CA-99999',
          categoria: 'PROTECAO_CABECA',
          status: 'DESCONTINUADO',
        },
      });
      inactiveTipoEpiId = tipoEpi.id;
    });

    it('should activate EPI type successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tipos-epi/${inactiveTipoEpiId}/ativar`)
        .send({})
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Tipo de EPI ativado com sucesso',
        data: {
          id: inactiveTipoEpiId,
          status: 'ATIVO',
        },
      });
    });

    it('should activate with optional motivo', async () => {
      const body = { motivo: 'Reativado por necessidade operacional' };

      const response = await request(app.getHttpServer())
        .patch(`/tipos-epi/${inactiveTipoEpiId}/ativar`)
        .send(body)
        .expect(HttpStatus.OK);

      expect(response.body.data.status).toBe('ATIVO');
    });

    it('should return 404 for non-existent id', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .patch(`/tipos-epi/${nonExistentId}/ativar`)
        .send({})
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /tipos-epi/:id/inativar', () => {
    let activeTipoEpiId: string;

    beforeEach(async () => {
      const tipoEpi = await prisma.tipoEPI.create({
        data: {
          nomeEquipamento: 'Equipamento Ativo',
          numeroCa: 'CA-88888',
          categoria: 'PROTECAO_CABECA',
          status: 'ATIVO',
        },
      });
      activeTipoEpiId = tipoEpi.id;
    });

    it('should inactivate EPI type successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tipos-epi/${activeTipoEpiId}/inativar`)
        .send({})
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Tipo de EPI inativado com sucesso',
        data: {
          id: activeTipoEpiId,
          status: 'DESCONTINUADO',
        },
      });
    });

    it('should inactivate with optional motivo', async () => {
      const body = { motivo: 'Descontinuado pelo fabricante' };

      const response = await request(app.getHttpServer())
        .patch(`/tipos-epi/${activeTipoEpiId}/inativar`)
        .send(body)
        .expect(HttpStatus.OK);

      expect(response.body.data.status).toBe('DESCONTINUADO');
    });

    it('should return 404 for non-existent id', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .patch(`/tipos-epi/${nonExistentId}/inativar`)
        .send({})
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /tipos-epi/:id/estatisticas', () => {
    let tipoEpiId: string;

    beforeEach(async () => {
      const tipoEpi = await prisma.tipoEPI.create({
        data: {
          nomeEquipamento: 'Capacete para Estatísticas',
          numeroCa: 'CA-77777',
          categoria: 'PROTECAO_CABECA',
          status: 'ATIVO',
        },
      });
      tipoEpiId = tipoEpi.id;
    });

    it('should return statistics for EPI type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tipos-epi/${tipoEpiId}/estatisticas`)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalFichas: expect.any(Number),
          fichasAtivas: expect.any(Number),
          totalEstoque: expect.any(Number),
          estoqueDisponivel: expect.any(Number),
          totalEntregas: expect.any(Number),
          entregasAtivas: expect.any(Number),
        },
      });
    });

    it('should return 404 for non-existent id', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .get(`/tipos-epi/${nonExistentId}/estatisticas`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /tipos-epi/estatisticas/por-categoria', () => {
    beforeEach(async () => {
      // Create tipos EPI for different categories
      await prisma.tipoEPI.createMany({
        data: [
          {
            nomeEquipamento: 'Capacete 1',
            numeroCa: 'CA-11111',
            categoria: 'PROTECAO_CABECA',
            status: 'ATIVO',
          },
          {
            nomeEquipamento: 'Capacete 2',
            numeroCa: 'CA-22222',
            categoria: 'PROTECAO_CABECA',
            status: 'ATIVO',
          },
          {
            nomeEquipamento: 'Óculos 1',
            numeroCa: 'CA-33333',
            categoria: 'PROTECAO_OLHOS_FACE',
            status: 'ATIVO',
          },
        ],
      });
    });

    it('should return statistics grouped by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/tipos-epi/estatisticas/por-categoria')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            categoria: expect.any(String),
            tiposAtivos: expect.any(Number),
            estoqueDisponivel: expect.any(Number),
            totalItens: expect.any(Number),
          }),
        ]),
      });

      // Should have at least the categories we created
      const categorias = response.body.data.map((item: any) => item.categoria);
      expect(categorias).toContain('PROTECAO_CABECA');
      expect(categorias).toContain('PROTECAO_OLHOS_FACE');
    });
  });
});