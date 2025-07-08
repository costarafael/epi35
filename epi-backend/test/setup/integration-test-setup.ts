import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TestDatabaseService } from '../database/test-database.service';
import { DatabaseModule } from '../../src/infrastructure/database/database.module';
import { RepositoryModule } from '../../src/infrastructure/repositories/repository.module';
import { beforeAll, afterAll } from 'vitest';

export class IntegrationTestSetup {
  public app: INestApplication;
  public prismaService: PrismaService;
  public moduleRef: TestingModule;
  private testDb: TestDatabaseService;

  async setupTestEnvironment(moduleMetadata: any = {}): Promise<void> {
    // Configurar variáveis de ambiente para teste
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public';

    // Obter instância do serviço de banco de teste
    this.testDb = TestDatabaseService.getInstance();

    // Configurar banco de dados
    await this.testDb.setupDatabase();

    // Criar módulo de teste
    const moduleBuilder = Test.createTestingModule({
      imports: [
        // ConfigModule.forRoot({
        //   isGlobal: true,
        //   envFilePath: '.env.test',
        // }),
        // DatabaseModule, // Removed to avoid ConfigService conflicts
        // RepositoryModule, // Removed to avoid ConfigService conflicts
        ...(moduleMetadata.imports || []),
      ],
      controllers: moduleMetadata.controllers || [],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: any) => {
              const config = {
                DATABASE_URL: 'postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public',
                NODE_ENV: 'test',
                PERMITIR_ESTOQUE_NEGATIVO: 'false',
                PERMITIR_AJUSTES_FORCADOS: 'true',
                ESTOQUE_MINIMO_EQUIPAMENTO: '10',
              };
              return config[key] || defaultValue;
            },
          },
        },
        {
          provide: PrismaService,
          useValue: this.testDb.prismaService,
        },
        ...(moduleMetadata.providers || []),
      ],
    });

    const moduleFixture: TestingModule = await moduleBuilder.compile();
    
    // Armazenar a referência do módulo para permitir injeção de dependências nos testes
    this.moduleRef = moduleFixture;
    
    this.app = moduleFixture.createNestApplication();
    this.prismaService = moduleFixture.get<PrismaService>(PrismaService);
    
    await this.app.init();
  }

  async cleanupTestEnvironment(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    if (this.testDb) {
      await this.testDb.disconnect();
    }
  }

  async resetTestData(): Promise<void> {
    if (this.testDb) {
      await this.testDb.resetDatabase();
    }
  }

  // Helpers para facilitar testes
  async findUser(email: string): Promise<any> {
    return this.prismaService.usuario.findUnique({
      where: { email },
    });
  }

  async findAlmoxarifado(nome: string): Promise<any> {
    return this.prismaService.almoxarifado.findFirst({
      where: { nome },
    });
  }

  async findTipoEpi(numeroCa: string): Promise<any> {
    return this.prismaService.tipoEPI.findFirst({
      where: { numeroCa },
    });
  }

  async findColaborador(nome: string): Promise<any> {
    return this.prismaService.colaborador.findFirst({
      where: { nome },
    });
  }

  async getEstoqueDisponivel(almoxarifadoId: string, tipoEpiId: string): Promise<any> {
    return this.prismaService.estoqueItem.findFirst({
      where: {
        almoxarifadoId,
        tipoEpiId,
        status: 'DISPONIVEL',
      },
    });
  }

  async findEntregaByColaborador(colaboradorId: string): Promise<any> {
    return this.prismaService.entrega.findFirst({
      where: {
        fichaEpi: {
          colaboradorId
        }
      },
      include: {
        itens: {
          include: {
            estoqueItem: {
              include: {
                tipoEpi: true
              }
            }
          }
        }
      }
    });
  }
}

// Funções globais para configurar testes de integração
export function setupIntegrationTestSuite() {
  let testSetup: IntegrationTestSetup;

  beforeAll(async () => {
    console.log('🔧 Configurando ambiente de teste de integração...');
    
    // Aguardar banco de dados estar pronto
    await waitForDatabase();
  });

  afterAll(async () => {
    console.log('🧹 Limpando ambiente de teste de integração...');
    
    if (testSetup) {
      await testSetup.cleanupTestEnvironment();
    }
  });

  return {
    async createTestSetup(moduleMetadata: any = {}): Promise<IntegrationTestSetup> {
      const setup = new IntegrationTestSetup();
      await setup.setupTestEnvironment(moduleMetadata);
      testSetup = setup;
      return setup;
    }
  };
}

// Função para aguardar o banco de dados estar pronto
async function waitForDatabase(maxAttempts: number = 30): Promise<void> {
  const testUrl = 'postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public';
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient({
        datasources: {
          db: { url: testUrl },
        },
      });
      
      await prisma.$connect();
      await prisma.$disconnect();
      
      console.log('✅ Banco de dados de teste está pronto');
      return;
    } catch (error) {
      console.log(`⏳ Aguardando banco de dados... tentativa ${attempt}/${maxAttempts}`);
      
      if (attempt === maxAttempts) {
        console.error('❌ Banco de dados de teste não está disponível. Certifique-se de que o Docker está rodando:');
        console.error('  docker-compose up db_test');
        throw new Error('Banco de dados de teste não disponível');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Export direto da função createTestSetup para backward compatibility
export async function createTestSetup(moduleMetadata: any = {}): Promise<IntegrationTestSetup> {
  const setup = new IntegrationTestSetup();
  await setup.setupTestEnvironment(moduleMetadata);
  return setup;
}