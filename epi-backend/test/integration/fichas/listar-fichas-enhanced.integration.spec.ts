import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { ListarFichasEnhancedUseCase } from '../../../src/application/use-cases/fichas/listar-fichas-enhanced.use-case';

describe('ListarFichasEnhanced Integration Tests', () => {
  const testSuite = setupIntegrationTestSuite();
  let testSetup: any;
  let listarFichasEnhancedUseCase: ListarFichasEnhancedUseCase;

  beforeAll(async () => {
    testSetup = await testSuite.createTestSetup({
      providers: [
        ListarFichasEnhancedUseCase,
      ],
    });
    
    listarFichasEnhancedUseCase = testSetup.moduleRef.get<ListarFichasEnhancedUseCase>(ListarFichasEnhancedUseCase);
  });

  afterAll(async () => {
    if (testSetup) {
      await testSetup.cleanupTestEnvironment();
    }
  });

  it('should investigate totalEpisAtivos counting issue', async () => {
    // First, let's check what data exists in the database
    console.log('=== INVESTIGATING totalEpisAtivos ISSUE ===');
    
    // Get all fichas to see the current state
    const result = await listarFichasEnhancedUseCase.execute({
      page: 1,
      limit: 10,
    });

    console.log('Total fichas found:', result.items.length);
    
    for (const ficha of result.items) {
      console.log(`\nFicha ${ficha.id}:`);
      console.log(`  Colaborador: ${ficha.colaborador.nome}`);
      console.log(`  Status: ${ficha.status}`);
      console.log(`  TotalEpisAtivos: ${ficha.totalEpisAtivos}`);
      console.log(`  TotalEpisVencidos: ${ficha.totalEpisVencidos}`);
      
      // Let's check the raw data for this ficha
      const rawFicha = await testSetup.prismaService.fichaEPI.findUnique({
        where: { id: ficha.id },
        include: {
          entregas: {
            include: {
              itens: {
                where: {
                  status: 'COM_COLABORADOR',
                },
                include: {
                  estoqueItem: {
                    include: {
                      tipoEpi: true,
                    },
                  },
                },
              },
            },
            where: {
              status: {
                in: ['PENDENTE_ASSINATURA', 'ASSINADA'],
              },
            },
          },
        },
      });
      
      console.log(`  Raw entregas count: ${rawFicha?.entregas?.length || 0}`);
      
      if (rawFicha?.entregas) {
        for (const entrega of rawFicha.entregas) {
          console.log(`    Entrega ${entrega.id}: status=${entrega.status}, itens=${entrega.itens.length}`);
          for (const item of entrega.itens) {
            console.log(`      Item ${item.id}: status=${item.status}, dataLimiteDevolucao=${item.dataLimiteDevolucao}`);
          }
        }
      }
    }

    // This test is for investigation only - we'll fix the issue separately
    expect(result.items.length).toBeGreaterThanOrEqual(0);
  });
});