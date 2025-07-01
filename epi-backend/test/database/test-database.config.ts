import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

/**
 * Test database configuration and utilities
 */
export class TestDatabaseConfig {
  private static instance: TestDatabaseConfig;
  private prismaClient: PrismaClient | null = null;
  private testDbName: string;
  private testDbUrl: string;

  private constructor() {
    this.testDbName = `test_epi_${randomUUID().replace(/-/g, '')}`;
    this.testDbUrl = `postgresql://postgres:password@localhost:5432/${this.testDbName}?schema=public`;
  }

  static getInstance(): TestDatabaseConfig {
    if (!TestDatabaseConfig.instance) {
      TestDatabaseConfig.instance = new TestDatabaseConfig();
    }
    return TestDatabaseConfig.instance;
  }

  async setupDatabase(): Promise<void> {
    try {
      // Create test database
      execSync(`createdb ${this.testDbName}`, { stdio: 'ignore' });
      
      // Set environment variable
      process.env.DATABASE_URL = this.testDbUrl;
      
      // Run migrations
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      
      // Initialize Prisma client
      this.prismaClient = new PrismaClient({
        datasources: {
          db: {
            url: this.testDbUrl,
          },
        },
      });
      
      await this.prismaClient.$connect();
      
      console.log(`Test database ${this.testDbName} created successfully`);
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  async cleanDatabase(): Promise<void> {
    if (this.prismaClient) {
      try {
        // Clean all data in proper order (respecting foreign keys)
        await this.prismaClient.$transaction([
          this.prismaClient.entregaItem.deleteMany(),
          this.prismaClient.entrega.deleteMany(),
          this.prismaClient.fichaEpi.deleteMany(),
          this.prismaClient.movimentacaoEstoque.deleteMany(),
          this.prismaClient.notaMovimentacao.deleteMany(),
          this.prismaClient.estoqueItem.deleteMany(),
          this.prismaClient.colaborador.deleteMany(),
          this.prismaClient.tipoEpi.deleteMany(),
        ]);
      } catch (error) {
        console.warn('Failed to clean test database:', error);
      }
    }
  }

  async teardownDatabase(): Promise<void> {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
    }

    try {
      execSync(`dropdb ${this.testDbName}`, { stdio: 'ignore' });
      console.log(`Test database ${this.testDbName} dropped successfully`);
    } catch (error) {
      console.warn('Failed to drop test database:', error);
    }
  }

  getPrismaClient(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error('Database not initialized. Call setupDatabase() first.');
    }
    return this.prismaClient;
  }

  getDatabaseUrl(): string {
    return this.testDbUrl;
  }

  getDatabaseName(): string {
    return this.testDbName;
  }
}

// Export singleton instance
export const testDb = TestDatabaseConfig.getInstance();
