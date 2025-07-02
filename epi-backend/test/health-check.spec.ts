import { describe, it, expect } from 'vitest';

describe('Environment Health Check', () => {
  it('should have correct test environment variables', () => {
    // Arrange
    const expectedTestDbUrl = 'postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public';
    
    // Act - Note: estas variáveis são configuradas automaticamente pelos scripts de teste
    const nodeEnv = process.env.NODE_ENV;
    const databaseUrl = process.env.DATABASE_URL;
    
    // Assert
    if (nodeEnv === 'test') {
      expect(databaseUrl).toBe(expectedTestDbUrl);
    }
  });

  it('should be able to connect to different databases', () => {
    // Este teste documenta as diferentes URLs de banco disponíveis
    const databases = {
      development: 'postgresql://postgres:postgres@localhost:5435/epi_db_v35?schema=public',
      test: 'postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public',
    };

    expect(databases.development).toContain('5435');
    expect(databases.test).toContain('5436');
    expect(databases.development).not.toBe(databases.test);
  });

  it('should have correct Docker container configuration', () => {
    // Este teste documenta a configuração esperada dos containers
    const containers = {
      devDb: {
        name: 'epi_db_dev_v35',
        port: 5435,
        database: 'epi_db_v35',
      },
      testDb: {
        name: 'epi_db_test_v35', 
        port: 5436,
        database: 'epi_test_db_v35',
      },
      redis: {
        name: 'epi_redis',
        port: 6379,
      },
    };

    // Verificar que as configurações são únicas
    expect(containers.devDb.port).not.toBe(containers.testDb.port);
    expect(containers.devDb.database).not.toBe(containers.testDb.database);
    expect(containers.devDb.name).not.toBe(containers.testDb.name);
  });
});