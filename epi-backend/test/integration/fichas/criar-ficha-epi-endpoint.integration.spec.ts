import { describe, it, expect, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { StatusFichaEPI } from '../../../src/domain/enums/ficha.enum';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';

describe('POST /api/fichas-epi - Endpoint Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    app = testSetup.app;
    prismaService = testSetup.prismaService;

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('POST /api/fichas-epi - Criação de Ficha EPI', () => {
    it('deve criar ficha EPI com sucesso (201)', async () => {
      // Arrange - Criar colaborador único
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await prismaService.colaborador.create({
        data: {
          nome: 'João Silva',
          cpf: `111${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador de Produção',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const requestBody = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(201);

      // Validar estrutura da resposta
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Ficha criada com sucesso');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.colaboradorId).toBe(colaborador.id);
      expect(response.body.data.status).toBe(StatusFichaEPI.ATIVA);
      expect(response.body.data.dataEmissao).toBeDefined();
      expect(response.body.data.colaborador).toBeDefined();
      expect(response.body.data.colaborador.nome).toBe('João Silva');
      expect(response.body.data.colaborador.cpf).toBe(colaborador.cpf);

      // Verificar se foi criada no banco
      const fichaDb = await prismaService.fichaEPI.findUnique({
        where: { id: response.body.data.id },
      });
      expect(fichaDb).toBeDefined();
      expect(fichaDb.colaboradorId).toBe(colaborador.id);
      expect(fichaDb.status).toBe('ATIVA');
    });

    it('deve criar ficha com status INATIVA quando especificado (201)', async () => {
      // Arrange
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await prismaService.colaborador.create({
        data: {
          nome: 'Maria Santos',
          cpf: `222${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operadora de Qualidade',
          setor: 'Qualidade',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const requestBody = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.INATIVA,
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(StatusFichaEPI.INATIVA);

      // Verificar no banco
      const fichaDb = await prismaService.fichaEPI.findUnique({
        where: { id: response.body.data.id },
      });
      expect(fichaDb.status).toBe('INATIVA');
    });

    it('deve criar ficha com status ATIVA por padrão quando não especificado (201)', async () => {
      // Arrange
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await prismaService.colaborador.create({
        data: {
          nome: 'Carlos Oliveira',
          cpf: `333${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Técnico de Segurança',
          setor: 'Segurança',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const requestBody = {
        colaboradorId: colaborador.id,
        // status não especificado
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(StatusFichaEPI.ATIVA);
    });
  });

  describe('POST /api/fichas-epi - Validações e Erros', () => {
    it('deve retornar 400 para dados inválidos (colaboradorId inválido)', async () => {
      const requestBody = {
        colaboradorId: 'id-invalido',
        status: StatusFichaEPI.ATIVA,
      };

      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('deve retornar 400 para dados inválidos (status inválido)', async () => {
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await prismaService.colaborador.create({
        data: {
          nome: 'Ana Costa',
          cpf: `444${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Supervisora',
          setor: 'Supervisão',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const requestBody = {
        colaboradorId: colaborador.id,
        status: 'STATUS_INVALIDO',
      };

      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('deve retornar 400 para colaboradorId ausente', async () => {
      const requestBody = {
        status: StatusFichaEPI.ATIVA,
      };

      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('deve retornar 404 para colaborador inexistente', async () => {
      const requestBody = {
        colaboradorId: 'b47ac10b-58cc-4372-a567-0e02b2c3d479', // UUID válido mas inexistente
        status: StatusFichaEPI.ATIVA,
      };

      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Colaborador não encontrado');
    });

    it('deve retornar 400 para colaborador inativo', async () => {
      // Arrange - Criar colaborador inativo
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaboradorInativo = await prismaService.colaborador.create({
        data: {
          nome: 'Pedro Inativo',
          cpf: `555${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Ex-Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
          ativo: false,
        },
      });

      const requestBody = {
        colaboradorId: colaboradorInativo.id,
        status: StatusFichaEPI.ATIVA,
      };

      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Colaborador inativo não pode ter ficha EPI');
    });

    it('deve retornar 409 para colaborador que já possui ficha', async () => {
      // Arrange - Criar colaborador e primeira ficha
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await prismaService.colaborador.create({
        data: {
          nome: 'Lucas Duplicado',
          cpf: `666${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const requestBody = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      };

      // Criar primeira ficha
      await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(201);

      // Tentar criar segunda ficha
      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send(requestBody)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Colaborador já possui ficha EPI');
    });
  });

  describe('POST /api/fichas-epi/criar-ou-ativar - Endpoint de Criação ou Ativação', () => {
    it('deve criar nova ficha quando não existe (201)', async () => {
      // Arrange
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await prismaService.colaborador.create({
        data: {
          nome: 'Roberto Novo',
          cpf: `777${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const requestBody = {
        colaboradorId: colaborador.id,
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi/criar-ou-ativar')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Ficha criada com sucesso');
      expect(response.body.data.ficha.status).toBe(StatusFichaEPI.ATIVA);
      expect(response.body.data.criada).toBe(true);
    });

    it('deve ativar ficha inativa existente (201)', async () => {
      // Arrange - Criar colaborador com ficha inativa
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await prismaService.colaborador.create({
        data: {
          nome: 'Sandra Reativar',
          cpf: `888${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operadora',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha inativa primeiro
      await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send({
          colaboradorId: colaborador.id,
          status: StatusFichaEPI.INATIVA,
        })
        .expect(201);

      const requestBody = {
        colaboradorId: colaborador.id,
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi/criar-ou-ativar')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Ficha ativada com sucesso');
      expect(response.body.data.ficha.status).toBe(StatusFichaEPI.ATIVA);
      expect(response.body.data.criada).toBe(false);
    });

    it('deve retornar ficha ativa existente (201)', async () => {
      // Arrange - Criar colaborador com ficha ativa
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await prismaService.colaborador.create({
        data: {
          nome: 'Marcos Ativo',
          cpf: `999${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha ativa primeiro
      const fichaOriginalResponse = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .send({
          colaboradorId: colaborador.id,
          status: StatusFichaEPI.ATIVA,
        })
        .expect(201);

      const requestBody = {
        colaboradorId: colaborador.id,
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi/criar-ou-ativar')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Ficha ativada com sucesso');
      expect(response.body.data.ficha.id).toBe(fichaOriginalResponse.body.data.id);
      expect(response.body.data.ficha.status).toBe(StatusFichaEPI.ATIVA);
      expect(response.body.data.criada).toBe(false);
    });
  });

  describe('POST /api/fichas-epi - Validação de Headers e Content-Type', () => {
    it('deve aceitar content-type application/json', async () => {
      const unidadeNegocio = await prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await prismaService.colaborador.create({
        data: {
          nome: 'Teste Header',
          cpf: `000${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const requestBody = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      };

      const response = await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .set('Content-Type', 'application/json')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('deve rejeitar content-type inválido', async () => {
      const requestBody = {
        colaboradorId: 'some-id',
        status: StatusFichaEPI.ATIVA,
      };

      await request(app.getHttpServer())
        .post('/api/fichas-epi')
        .set('Content-Type', 'text/plain')
        .send(requestBody)
        .expect(415);
    });
  });
});