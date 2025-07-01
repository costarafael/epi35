import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

// Test database setup
let testDbUrl: string;
let prismaClient: PrismaClient | null = null;

// Mock do PrismaService globalmente para testes unitários
vi.mock('@infrastructure/database/prisma.service', () => ({
  PrismaService: vi.fn().mockImplementation(() => ({
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    // Mock all Prisma model methods
    estoqueItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    movimentacaoEstoque: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    notaMovimentacao: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    colaborador: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    fichaEpi: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    entrega: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    tipoEpi: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  })),
}));

// Test database utilities
export function getTestDatabaseUrl(): string {
  if (!testDbUrl) {
    const testDbName = `test_epi_${randomUUID().replace(/-/g, '')}`;
    testDbUrl = `postgresql://postgres:password@localhost:5432/${testDbName}?schema=public`;
  }
  return testDbUrl;
}

export function getTestPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: getTestDatabaseUrl(),
        },
      },
    });
  }
  return prismaClient;
}

// Global test hooks for integration tests
beforeAll(async () => {
  // Only setup database for integration tests
  if (process.env.TEST_TYPE === 'integration') {
    try {
      // Create test database
      const createDbCommand = `createdb ${getTestDatabaseUrl().split('/').pop()?.split('?')[0]}`;
      execSync(createDbCommand, { stdio: 'ignore' });
      
      // Run migrations
      process.env.DATABASE_URL = getTestDatabaseUrl();
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      
      // Connect to test database
      prismaClient = getTestPrismaClient();
      await prismaClient.$connect();
    } catch (error) {
      console.warn('Test database setup failed, using mocks:', error);
    }
  }
});

afterAll(async () => {
  if (prismaClient) {
    await prismaClient.$disconnect();
    
    // Drop test database
    try {
      const dropDbCommand = `dropdb ${getTestDatabaseUrl().split('/').pop()?.split('?')[0]}`;
      execSync(dropDbCommand, { stdio: 'ignore' });
    } catch (error) {
      console.warn('Test database cleanup failed:', error);
    }
  }
});

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(async () => {
  // Clean test data for integration tests
  if (process.env.TEST_TYPE === 'integration' && prismaClient) {
    try {
      await prismaClient.$transaction([
        prismaClient.entregaItem.deleteMany(),
        prismaClient.entrega.deleteMany(),
        prismaClient.fichaEpi.deleteMany(),
        prismaClient.movimentacaoEstoque.deleteMany(),
        prismaClient.notaMovimentacao.deleteMany(),
        prismaClient.estoqueItem.deleteMany(),
        prismaClient.colaborador.deleteMany(),
        prismaClient.tipoEpi.deleteMany(),
      ]);
    } catch (error) {
      console.warn('Test data cleanup failed:', error);
    }
  }
});

// Configurações globais de teste
global.console = {
  ...console,
  log: process.env.NODE_ENV === 'test' ? vi.fn() : console.log,
  debug: process.env.NODE_ENV === 'test' ? vi.fn() : console.debug,
  info: process.env.NODE_ENV === 'test' ? vi.fn() : console.info,
  warn: process.env.NODE_ENV === 'test' ? vi.fn() : console.warn,
  error: console.error, // Always show errors
};

// Test environment validation
if (process.env.NODE_ENV !== 'test') {
  console.warn('Warning: Tests should run with NODE_ENV=test');
}

// Export test utilities
export { vi };
