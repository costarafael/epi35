import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RelatorioSaldoEstoqueUseCase } from '@application/use-cases/queries/relatorio-saldo-estoque.use-case';
import { ConfiguracaoService } from '@domain/services/configuracao.service';
import { ConfigService } from '@nestjs/config';

/**
 * R-01: Saldo de Estoque
 * 
 * Relatório que mostra o saldo atual de todos os itens em estoque.
 * Conforme documentação: SELECT * FROM estoque_itens com filtros por almoxarifado_id, tipo_epi_id
 */
describe('Relatório R-01: Saldo de Estoque - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;
  let relatorioUseCase: RelatorioSaldoEstoqueUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        // Config Service
        {
          provide: 'ConfigService',
          useValue: {
            get: (key: string) => {
              const config = {
                PERMITIR_ESTOQUE_NEGATIVO: 'false',
                PERMITIR_AJUSTES_FORCADOS: 'false',
                ESTOQUE_MINIMO_EQUIPAMENTO: '10',
              };
              return config[key] || process.env[key];
            },
          },
        },
        // ConfiguracaoService
        {
          provide: ConfiguracaoService,
          useFactory: (configService: any, prisma: PrismaService) => new ConfiguracaoService(configService, prisma),
          inject: ['ConfigService', PrismaService],
        },
        // RelatorioSaldoEstoqueUseCase
        {
          provide: RelatorioSaldoEstoqueUseCase,
          useFactory: (prisma: PrismaService, configuracaoService: ConfiguracaoService) => 
            new RelatorioSaldoEstoqueUseCase(prisma, configuracaoService),
          inject: [PrismaService, ConfiguracaoService],
        },
      ],
    });
    
    prismaService = testSetup.prismaService;
    relatorioUseCase = testSetup.app.get<RelatorioSaldoEstoqueUseCase>(RelatorioSaldoEstoqueUseCase);
    await testSetup.resetTestData();
  });

  describe('Saldo de Estoque - Use Case Tests', () => {
    it('deve retornar todos os itens em estoque usando use case', async () => {
      // Act - Usar o use case
      const saldos = await relatorioUseCase.execute();

      // Assert
      expect(saldos).toBeDefined();
      expect(Array.isArray(saldos)).toBe(true);

      // Verificar estrutura do use case
      if (saldos.length > 0) {
        const firstItem = saldos[0];
        expect(firstItem).toHaveProperty('estoqueItemId');
        expect(firstItem).toHaveProperty('quantidade');
        expect(firstItem).toHaveProperty('status');
        expect(firstItem).toHaveProperty('almoxarifado');
        expect(firstItem).toHaveProperty('tipoEpi');
        expect(firstItem.almoxarifado).toHaveProperty('nome');
        expect(firstItem.tipoEpi).toHaveProperty('nomeEquipamento');
        expect(typeof firstItem.quantidade).toBe('number');
      }
    });

    it('deve retornar estatísticas do estoque usando use case', async () => {
      // Act - Usar método de estatísticas
      const estatisticas = await relatorioUseCase.obterEstatisticas();

      // Assert
      expect(estatisticas).toBeDefined();
      expect(estatisticas).toHaveProperty('totalItens');
      expect(estatisticas).toHaveProperty('totalQuantidade');
      expect(estatisticas).toHaveProperty('itensPorStatus');
      expect(estatisticas).toHaveProperty('almoxarifadosComEstoque');
      expect(estatisticas).toHaveProperty('tiposEpiDiferentes');
      expect(typeof estatisticas.totalItens).toBe('number');
      expect(typeof estatisticas.totalQuantidade).toBe('number');
      expect(Array.isArray(estatisticas.itensPorStatus)).toBe(true);
    });

    it('deve filtrar por almoxarifado usando use case', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Act
      const saldos = await relatorioUseCase.execute({
        almoxarifadoId: almoxarifado.id,
      });

      // Assert
      expect(saldos).toBeDefined();
      saldos.forEach(item => {
        expect(item.almoxarifado.nome).toBe('Almoxarifado Central');
      });
    });

    it('deve filtrar por tipo de EPI usando use case', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act
      const saldos = await relatorioUseCase.execute({
        tipoEpiId: tipoEpi.id,
      });

      // Assert
      expect(saldos).toBeDefined();
      saldos.forEach(item => {
        expect(item.tipoEpi.numeroCa).toBe('CA-12345');
      });
    });

    it('deve incluir estoque negativo quando PERMITIR_ESTOQUE_NEGATIVO = true e incluirZerados = true', async () => {
      // Arrange - Configure to allow negative stock
      await testSetup.prismaService.configuracao.upsert({
        where: { chave: 'PERMITIR_ESTOQUE_NEGATIVO' },
        update: { valor: 'true' },
        create: {
          chave: 'PERMITIR_ESTOQUE_NEGATIVO',
          valor: 'true',
          descricao: 'Permitir estoque negativo para teste'
        }
      });

      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Create an item with negative stock
      await testSetup.prismaService.estoqueItem.upsert({
        where: {
          almoxarifadoId_tipoEpiId_status: {
            almoxarifadoId: almoxarifado.id,
            tipoEpiId: tipoEpi.id,
            status: 'DISPONIVEL',
          },
        },
        update: { quantidade: -5 }, // Negative stock
        create: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoEpi.id,
          quantidade: -5,
          status: 'DISPONIVEL',
        },
      });

      // Act - Get report including zeros (which should include negatives when allowed)
      const saldosComNegativo = await relatorioUseCase.execute({
        incluirZerados: true,
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoEpi.id,
      });

      // Act - Get report without including zeros (should exclude negatives)
      const saldosSemZero = await relatorioUseCase.execute({
        incluirZerados: false,
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoEpi.id,
      });

      // Assert
      const itemNegativo = saldosComNegativo.find(item => item.quantidade < 0);
      expect(itemNegativo).toBeDefined();
      expect(itemNegativo!.quantidade).toBe(-5);

      // When not including zeros, negative items should be excluded
      const itemNegativoExcluido = saldosSemZero.find(item => item.quantidade < 0);
      expect(itemNegativoExcluido).toBeUndefined();
    });

    it('deve excluir estoque negativo quando PERMITIR_ESTOQUE_NEGATIVO = false mesmo com incluirZerados = true', async () => {
      // Arrange - Configure to NOT allow negative stock
      await testSetup.prismaService.configuracao.upsert({
        where: { chave: 'PERMITIR_ESTOQUE_NEGATIVO' },
        update: { valor: 'false' },
        create: {
          chave: 'PERMITIR_ESTOQUE_NEGATIVO',
          valor: 'false',
          descricao: 'Não permitir estoque negativo para teste'
        }
      });

      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-67890');

      // Create an item with negative stock
      await testSetup.prismaService.estoqueItem.upsert({
        where: {
          almoxarifadoId_tipoEpiId_status: {
            almoxarifadoId: almoxarifado.id,
            tipoEpiId: tipoEpi.id,
            status: 'DISPONIVEL',
          },
        },
        update: { quantidade: -3 }, // Negative stock
        create: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoEpi.id,
          quantidade: -3,
          status: 'DISPONIVEL',
        },
      });

      // Act - Even with incluirZerados = true, negatives should be excluded when not allowed
      const saldos = await relatorioUseCase.execute({
        incluirZerados: true,
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoEpi.id,
      });

      // Assert - Negative items should be excluded
      const itemNegativo = saldos.find(item => item.quantidade < 0);
      expect(itemNegativo).toBeUndefined();

      // Should only include zero and positive items
      saldos.forEach(item => {
        expect(item.quantidade).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Saldo de Estoque - SQL Direct Tests', () => {
    it('deve retornar todos os itens em estoque com SQL direto', async () => {
      // Act - Buscar todos os itens de estoque
      const saldos = await prismaService.estoqueItem.findMany({
        include: {
          almoxarifado: {
            select: {
              nome: true,
              unidadeNegocio: {
                select: {
                  nome: true,
                  codigo: true,
                },
              },
            },
          },
          tipoEpi: {
            select: {
              nomeEquipamento: true,
              numeroCa: true,
              status: true,
            },
          },
        },
        orderBy: [
          { almoxarifado: { nome: 'asc' } },
          { tipoEpi: { nomeEquipamento: 'asc' } },
        ],
      });

      // Assert
      expect(saldos).toBeDefined();
      expect(Array.isArray(saldos)).toBe(true);
      
      // Verificar estrutura dos dados
      if (saldos.length > 0) {
        const firstItem = saldos[0];
        expect(firstItem).toHaveProperty('id');
        expect(firstItem).toHaveProperty('quantidade');
        expect(firstItem).toHaveProperty('status');
        expect(firstItem).toHaveProperty('almoxarifado');
        expect(firstItem).toHaveProperty('tipoEpi');
        expect(firstItem.almoxarifado).toHaveProperty('nome');
        expect(firstItem.tipoEpi).toHaveProperty('nomeEquipamento');
        expect(firstItem.tipoEpi).toHaveProperty('numeroCa');
      }
    });

    it('deve filtrar itens por almoxarifado específico', async () => {
      // Arrange - Buscar um almoxarifado existente
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      expect(almoxarifado).toBeDefined();

      // Act - Filtrar por almoxarifado
      const saldos = await prismaService.estoqueItem.findMany({
        where: {
          almoxarifadoId: almoxarifado.id,
        },
        include: {
          almoxarifado: {
            select: {
              nome: true,
            },
          },
          tipoEpi: {
            select: {
              nomeEquipamento: true,
              numeroCa: true,
            },
          },
        },
      });

      // Assert
      expect(saldos).toBeDefined();
      
      // Todos os itens devem ser do almoxarifado filtrado
      saldos.forEach(item => {
        expect(item.almoxarifadoId).toBe(almoxarifado.id);
        expect(item.almoxarifado.nome).toBe('Almoxarifado Central');
      });
    });

    it('deve filtrar itens por tipo de EPI específico', async () => {
      // Arrange - Buscar um tipo de EPI existente
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      expect(tipoEpi).toBeDefined();

      // Act - Filtrar por tipo de EPI
      const saldos = await prismaService.estoqueItem.findMany({
        where: {
          tipoEpiId: tipoEpi.id,
        },
        include: {
          almoxarifado: {
            select: {
              nome: true,
            },
          },
          tipoEpi: {
            select: {
              nomeEquipamento: true,
              numeroCa: true,
            },
          },
        },
      });

      // Assert
      expect(saldos).toBeDefined();
      
      // Todos os itens devem ser do tipo filtrado
      saldos.forEach(item => {
        expect(item.tipoEpiId).toBe(tipoEpi.id);
        expect(item.tipoEpi.numeroCa).toBe('CA-12345');
      });
    });

    it('deve filtrar itens por status de estoque', async () => {
      // Act - Filtrar apenas itens disponíveis
      const saldos = await prismaService.estoqueItem.findMany({
        where: {
          status: 'DISPONIVEL',
        },
        include: {
          almoxarifado: {
            select: {
              nome: true,
            },
          },
          tipoEpi: {
            select: {
              nomeEquipamento: true,
              numeroCa: true,
            },
          },
        },
      });

      // Assert
      expect(saldos).toBeDefined();
      
      // Todos os itens devem ter status DISPONIVEL
      saldos.forEach(item => {
        expect(item.status).toBe('DISPONIVEL');
      });
    });

    it('deve combinar filtros múltiplos', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Filtrar por almoxarifado, tipo EPI e status
      const saldos = await prismaService.estoqueItem.findMany({
        where: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoEpi.id,
          status: 'DISPONIVEL',
        },
        include: {
          almoxarifado: {
            select: {
              nome: true,
            },
          },
          tipoEpi: {
            select: {
              nomeEquipamento: true,
              numeroCa: true,
            },
          },
        },
      });

      // Assert
      expect(saldos).toBeDefined();
      
      // Verificar que todos os filtros foram aplicados
      saldos.forEach(item => {
        expect(item.almoxarifadoId).toBe(almoxarifado.id);
        expect(item.tipoEpiId).toBe(tipoEpi.id);
        expect(item.status).toBe('DISPONIVEL');
      });
    });

    it('deve calcular totais por almoxarifado', async () => {
      // Act - Agrupar saldos por almoxarifado usando raw SQL
      const totaisPorAlmoxarifado = await prismaService.$queryRaw`
        SELECT 
          almoxarifado_id as "almoxarifadoId",
          SUM(quantidade)::int as "_sum_quantidade",
          COUNT(id)::int as "_count_id"
        FROM estoque_itens 
        WHERE status = 'DISPONIVEL'
        GROUP BY almoxarifado_id
        ORDER BY "_sum_quantidade" DESC;
      `;

      // Assert
      expect(totaisPorAlmoxarifado).toBeDefined();
      expect(Array.isArray(totaisPorAlmoxarifado)).toBe(true);
      
      // Verificar estrutura dos totais
      (totaisPorAlmoxarifado as any[]).forEach(total => {
        expect(total).toHaveProperty('almoxarifadoId');
        expect(total).toHaveProperty('_sum_quantidade');
        expect(total).toHaveProperty('_count_id');
        expect(typeof total._sum_quantidade).toBe('number');
        expect(typeof total._count_id).toBe('number');
      });
    });

    it('deve calcular totais por tipo de EPI', async () => {
      // Act - Agrupar saldos por tipo de EPI usando raw SQL
      const totaisPorTipo = await prismaService.$queryRaw`
        SELECT 
          tipo_epi_id as "tipoEpiId",
          SUM(quantidade)::int as "_sum_quantidade",
          COUNT(id)::int as "_count_id"
        FROM estoque_itens 
        WHERE status = 'DISPONIVEL'
        GROUP BY tipo_epi_id
        ORDER BY "_sum_quantidade" DESC;
      `;

      // Assert
      expect(totaisPorTipo).toBeDefined();
      expect(Array.isArray(totaisPorTipo)).toBe(true);
      
      // Verificar estrutura dos totais
      (totaisPorTipo as any[]).forEach(total => {
        expect(total).toHaveProperty('tipoEpiId');
        expect(total).toHaveProperty('_sum_quantidade');
        expect(total).toHaveProperty('_count_id');
        expect(typeof total._sum_quantidade).toBe('number');
        expect(typeof total._count_id).toBe('number');
      });
    });
  });
});