import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { AppModule } from '../../../src/app.module';

describe('Configuracoes API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  beforeEach(async () => {
    // Limpar configurações antes de cada teste
    await prisma.configuracao.deleteMany({});
  });

  afterAll(async () => {
    // Limpar configurações após todos os testes
    await prisma.configuracao.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /api/configuracoes', () => {
    it('deve listar todas as configurações com valores padrão', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/configuracoes')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            chave: 'PERMITIR_ESTOQUE_NEGATIVO',
            valor: 'false',
            valorParsed: false,
            tipo: 'BOOLEAN',
            descricao: expect.any(String),
            createdAt: expect.any(String),
          }),
          expect.objectContaining({
            chave: 'PERMITIR_AJUSTES_FORCADOS',
            valor: 'false',
            valorParsed: false,
            tipo: 'BOOLEAN',
            descricao: expect.any(String),
            createdAt: expect.any(String),
          }),
          expect.objectContaining({
            chave: 'ESTOQUE_MINIMO_EQUIPAMENTO',
            valor: '10',
            valorParsed: 10,
            tipo: 'NUMBER',
            descricao: expect.any(String),
            createdAt: expect.any(String),
          }),
        ]),
        message: 'Configurações listadas com sucesso',
      });

      expect(response.body.data).toHaveLength(3);
    });

    it('deve criar configurações padrão se não existirem no banco', async () => {
      // Garantir que não há configurações
      await prisma.configuracao.deleteMany({});

      const response = await request(app.getHttpServer())
        .get('/api/configuracoes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      // Verificar se foram criadas no banco
      const configCount = await prisma.configuracao.count();
      expect(configCount).toBe(3);
    });
  });

  describe('GET /api/configuracoes/status', () => {
    it('deve retornar status do sistema com configurações atuais', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/configuracoes/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          configuracoes: {
            permitirEstoqueNegativo: false,
            permitirAjustesForcados: false,
            estoqueMinimoEquipamento: 10,
          },
          versao: expect.any(String),
          ambiente: expect.any(String),
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('GET /api/configuracoes/:chave', () => {
    it('deve obter configuração específica', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/configuracoes/PERMITIR_ESTOQUE_NEGATIVO')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          chave: 'PERMITIR_ESTOQUE_NEGATIVO',
          valor: 'false',
          valorParsed: false,
          tipo: 'BOOLEAN',
          descricao: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: null,
        },
      });
    });

    it('deve retornar erro para chave inválida', async () => {
      await request(app.getHttpServer())
        .get('/api/configuracoes/CHAVE_INEXISTENTE')
        .expect(400);
    });

    it('deve criar configuração padrão se não existir', async () => {
      // Garantir que não há configurações
      await prisma.configuracao.deleteMany({});

      const response = await request(app.getHttpServer())
        .get('/api/configuracoes/ESTOQUE_MINIMO_EQUIPAMENTO')
        .expect(200);

      expect(response.body.data.chave).toBe('ESTOQUE_MINIMO_EQUIPAMENTO');
      expect(response.body.data.valor).toBe('10');
      expect(response.body.data.valorParsed).toBe(10);

      // Verificar se foi criada no banco
      const config = await prisma.configuracao.findUnique({
        where: { chave: 'ESTOQUE_MINIMO_EQUIPAMENTO' },
      });
      expect(config).toBeTruthy();
    });
  });

  describe('PUT /api/configuracoes/:chave', () => {
    it('deve atualizar configuração booleana', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/configuracoes/PERMITIR_ESTOQUE_NEGATIVO')
        .send({
          valor: 'true',
          descricao: 'Permitir estoque negativo para testes',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          configuracao: {
            chave: 'PERMITIR_ESTOQUE_NEGATIVO',
            valor: 'true',
            valorParsed: true,
            tipo: 'BOOLEAN',
            descricao: 'Permitir estoque negativo para testes',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
          valorAnterior: 'false',
        },
        message: 'Configuração atualizada com sucesso',
      });

      // Verificar se foi atualizada no banco
      const config = await prisma.configuracao.findUnique({
        where: { chave: 'PERMITIR_ESTOQUE_NEGATIVO' },
      });
      expect(config?.valor).toBe('true');
    });

    it('deve atualizar configuração numérica', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/configuracoes/ESTOQUE_MINIMO_EQUIPAMENTO')
        .send({
          valor: '25',
          descricao: 'Estoque mínimo aumentado',
        })
        .expect(200);

      expect(response.body.data.configuracao.valor).toBe('25');
      expect(response.body.data.configuracao.valorParsed).toBe(25);
      expect(response.body.data.valorAnterior).toBe('10');
    });

    it('deve retornar erro para valor inválido em configuração booleana', async () => {
      await request(app.getHttpServer())
        .put('/api/configuracoes/PERMITIR_ESTOQUE_NEGATIVO')
        .send({
          valor: 'maybe',
        })
        .expect(400);
    });

    it('deve retornar erro para valor inválido em configuração numérica', async () => {
      await request(app.getHttpServer())
        .put('/api/configuracoes/ESTOQUE_MINIMO_EQUIPAMENTO')
        .send({
          valor: 'not-a-number',
        })
        .expect(400);
    });

    it('deve retornar erro para dados obrigatórios ausentes', async () => {
      await request(app.getHttpServer())
        .put('/api/configuracoes/PERMITIR_ESTOQUE_NEGATIVO')
        .send({})
        .expect(400);
    });

    it('deve retornar erro para chave inválida', async () => {
      await request(app.getHttpServer())
        .put('/api/configuracoes/CHAVE_INEXISTENTE')
        .send({
          valor: 'true',
        })
        .expect(400);
    });
  });

  describe('PATCH /api/configuracoes/:chave/boolean', () => {
    it('deve atualizar configuração booleana de forma simplificada', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/configuracoes/PERMITIR_AJUSTES_FORCADOS/boolean')
        .send({
          ativo: true,
          descricao: 'Habilitado para manutenção',
        })
        .expect(200);

      expect(response.body.data.configuracao.valor).toBe('true');
      expect(response.body.data.configuracao.valorParsed).toBe(true);
      expect(response.body.data.valorAnterior).toBe('false');
    });

    it('deve retornar erro para configuração não booleana', async () => {
      await request(app.getHttpServer())
        .patch('/api/configuracoes/ESTOQUE_MINIMO_EQUIPAMENTO/boolean')
        .send({
          ativo: true,
        })
        .expect(400);
    });

    it('deve retornar erro para dados inválidos', async () => {
      await request(app.getHttpServer())
        .patch('/api/configuracoes/PERMITIR_ESTOQUE_NEGATIVO/boolean')
        .send({})
        .expect(400);
    });
  });

  describe('PATCH /api/configuracoes/:chave/number', () => {
    it('deve atualizar configuração numérica de forma simplificada', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/configuracoes/ESTOQUE_MINIMO_EQUIPAMENTO/number')
        .send({
          valor: 50,
          descricao: 'Estoque mínimo para período sazonal',
        })
        .expect(200);

      expect(response.body.data.configuracao.valor).toBe('50');
      expect(response.body.data.configuracao.valorParsed).toBe(50);
      expect(response.body.data.valorAnterior).toBe('10');
    });

    it('deve retornar erro para configuração não numérica', async () => {
      await request(app.getHttpServer())
        .patch('/api/configuracoes/PERMITIR_ESTOQUE_NEGATIVO/number')
        .send({
          valor: 100,
        })
        .expect(400);
    });

    it('deve retornar erro para valor negativo', async () => {
      await request(app.getHttpServer())
        .patch('/api/configuracoes/ESTOQUE_MINIMO_EQUIPAMENTO/number')
        .send({
          valor: -10,
        })
        .expect(400);
    });

    it('deve retornar erro para valor muito alto', async () => {
      await request(app.getHttpServer())
        .patch('/api/configuracoes/ESTOQUE_MINIMO_EQUIPAMENTO/number')
        .send({
          valor: 1000000,
        })
        .expect(400);
    });
  });

  describe('POST /api/configuracoes/batch', () => {
    it('deve atualizar múltiplas configurações com sucesso', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/configuracoes/batch')
        .send({
          configuracoes: [
            {
              chave: 'PERMITIR_ESTOQUE_NEGATIVO',
              valor: 'true',
              descricao: 'Ativado para emergência',
            },
            {
              chave: 'PERMITIR_AJUSTES_FORCADOS',
              valor: 'true',
              descricao: 'Ativado para ajustes',
            },
            {
              chave: 'ESTOQUE_MINIMO_EQUIPAMENTO',
              valor: '20',
              descricao: 'Aumentado para segurança',
            },
          ],
        })
        .expect(200);

      expect(response.body.data.totalAtualizadas).toBe(3);
      expect(response.body.data.configuracoes).toHaveLength(3);
      expect(response.body.data.falhas).toBeUndefined();

      // Verificar se foram atualizadas no banco
      const configs = await prisma.configuracao.findMany({
        orderBy: { chave: 'asc' },
      });

      expect(configs).toHaveLength(3);
      expect(configs[0].valor).toBe('20'); // ESTOQUE_MINIMO_EQUIPAMENTO
      expect(configs[1].valor).toBe('true'); // PERMITIR_AJUSTES_FORCADOS
      expect(configs[2].valor).toBe('true'); // PERMITIR_ESTOQUE_NEGATIVO
    });

    it('deve processar configurações válidas e reportar falhas', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/configuracoes/batch')
        .send({
          configuracoes: [
            {
              chave: 'PERMITIR_ESTOQUE_NEGATIVO',
              valor: 'true',
            },
            {
              chave: 'PERMITIR_AJUSTES_FORCADOS',
              valor: 'invalid-boolean',
            },
            {
              chave: 'ESTOQUE_MINIMO_EQUIPAMENTO',
              valor: '30',
            },
          ],
        })
        .expect(200);

      expect(response.body.data.totalAtualizadas).toBe(2);
      expect(response.body.data.configuracoes).toHaveLength(2);
      expect(response.body.data.falhas).toHaveLength(1);
      expect(response.body.data.falhas[0].chave).toBe('PERMITIR_AJUSTES_FORCADOS');
    });

    it('deve retornar erro para lista vazia', async () => {
      await request(app.getHttpServer())
        .post('/api/configuracoes/batch')
        .send({
          configuracoes: [],
        })
        .expect(400);
    });

    it('deve retornar erro para muitas configurações', async () => {
      const configuracoes = Array(11).fill({
        chave: 'PERMITIR_ESTOQUE_NEGATIVO',
        valor: 'true',
      });

      await request(app.getHttpServer())
        .post('/api/configuracoes/batch')
        .send({ configuracoes })
        .expect(400);
    });
  });

  describe('POST /api/configuracoes/reset', () => {
    it('deve resetar todas as configurações para valores padrão', async () => {
      // Primeiro, alterar algumas configurações
      await prisma.configuracao.createMany({
        data: [
          {
            chave: 'PERMITIR_ESTOQUE_NEGATIVO',
            valor: 'true',
            descricao: 'Alterado',
          },
          {
            chave: 'ESTOQUE_MINIMO_EQUIPAMENTO',
            valor: '100',
            descricao: 'Alterado',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .post('/api/configuracoes/reset')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            chave: 'PERMITIR_ESTOQUE_NEGATIVO',
            valor: 'false',
            valorParsed: false,
          }),
          expect.objectContaining({
            chave: 'PERMITIR_AJUSTES_FORCADOS',
            valor: 'false',
            valorParsed: false,
          }),
          expect.objectContaining({
            chave: 'ESTOQUE_MINIMO_EQUIPAMENTO',
            valor: '10',
            valorParsed: 10,
          }),
        ]),
        message: 'Configurações resetadas para valores padrão',
      });

      // Verificar se foram resetadas no banco
      const configs = await prisma.configuracao.findMany({
        orderBy: { chave: 'asc' },
      });

      expect(configs[0].valor).toBe('10'); // ESTOQUE_MINIMO_EQUIPAMENTO
      expect(configs[1].valor).toBe('false'); // PERMITIR_AJUSTES_FORCADOS
      expect(configs[2].valor).toBe('false'); // PERMITIR_ESTOQUE_NEGATIVO
    });
  });

  describe('Integração com ConfiguracaoService', () => {
    it('deve refletir mudanças em tempo real no ConfiguracaoService', async () => {
      // Atualizar configuração via API
      await request(app.getHttpServer())
        .put('/api/configuracoes/PERMITIR_ESTOQUE_NEGATIVO')
        .send({ valor: 'true' })
        .expect(200);

      // Verificar status reflete a mudança
      const statusResponse = await request(app.getHttpServer())
        .get('/api/configuracoes/status')
        .expect(200);

      expect(statusResponse.body.data.configuracoes.permitirEstoqueNegativo).toBe(true);
    });

    it('deve manter consistência entre endpoints', async () => {
      // Atualizar via endpoint específico
      await request(app.getHttpServer())
        .patch('/api/configuracoes/ESTOQUE_MINIMO_EQUIPAMENTO/number')
        .send({ valor: 75 })
        .expect(200);

      // Verificar via endpoint geral
      const configResponse = await request(app.getHttpServer())
        .get('/api/configuracoes/ESTOQUE_MINIMO_EQUIPAMENTO')
        .expect(200);

      expect(configResponse.body.data.valorParsed).toBe(75);

      // Verificar via status
      const statusResponse = await request(app.getHttpServer())
        .get('/api/configuracoes/status')
        .expect(200);

      expect(statusResponse.body.data.configuracoes.estoqueMinimoEquipamento).toBe(75);
    });
  });
});