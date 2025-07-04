import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * R-07: Fichas com Devolução Atrasada
 * 
 * Relatório que identifica colaboradores com itens cuja data limite de devolução já passou.
 * Conforme documentação da consulta SQL:
 * SELECT DISTINCT
 *   f.id as ficha_id,
 *   c.nome as colaborador,
 *   te.nome_equipamento,
 *   ei.data_limite_devolucao,
 *   COUNT(ei.id) as quantidade_itens_atrasados
 * FROM entrega_itens ei
 * JOIN entregas e ON ei.entrega_id = e.id
 * JOIN fichas_epi f ON e.ficha_epi_id = f.id
 * JOIN colaboradores c ON f.colaborador_id = c.id
 * JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
 * JOIN tipos_epi te ON est.tipo_epi_id = te.id
 * WHERE ei.status = 'COM_COLABORADOR'
 *   AND ei.data_limite_devolucao IS NOT NULL
 *   AND ei.data_limite_devolucao < CURRENT_DATE
 * GROUP BY f.id, c.nome, te.nome_equipamento, ei.data_limite_devolucao
 * ORDER BY ei.data_limite_devolucao ASC, c.nome;
 */
describe('Relatório R-07: Fichas com Devolução Atrasada - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    prismaService = testSetup.prismaService;
    await testSetup.resetTestData();
  });

  describe('Devoluções Atrasadas', () => {
    it('deve retornar fichas com devolução atrasada conforme especificação SQL', async () => {
      // Act - Executar consulta SQL raw conforme especificação R-07
      const result = await prismaService.$queryRaw`
        SELECT DISTINCT
          f.id as ficha_id,
          c.nome as colaborador,
          c.matricula,
          c.setor,
          te.nome_equipamento,
          ei.data_limite_devolucao,
          COUNT(ei.id)::int as quantidade_itens_atrasados
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
          AND ei.data_limite_devolucao IS NOT NULL
          AND ei.data_limite_devolucao < CURRENT_DATE
        GROUP BY f.id, c.nome, c.matricula, c.setor, te.nome_equipamento, ei.data_limite_devolucao
        ORDER BY ei.data_limite_devolucao ASC, c.nome;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura conforme especificação
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('ficha_id');
        expect(firstItem).toHaveProperty('colaborador');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('data_limite_devolucao');
        expect(firstItem).toHaveProperty('quantidade_itens_atrasados');
        expect(typeof firstItem.quantidade_itens_atrasados).toBe('number');
        expect(firstItem.quantidade_itens_atrasados).toBeGreaterThan(0);
        
        // Verificar que realmente está atrasado
        const hoje = new Date();
        expect(new Date(firstItem.data_limite_devolucao) < hoje).toBe(true);
      }
    });

    it('deve criar dados de teste com devoluções atrasadas e verificar', async () => {
      // Arrange - Criar dados de teste com datas atrasadas
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      
      // Criar colaborador de teste
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Colaborador Teste Atrasado',
          cpf: `123${Date.now().toString().slice(-8)}`,
          matricula: `ATRASO${Date.now().toString().slice(-3)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha EPI (uma por colaborador no schema v3.5)
      const fichaEPI = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      // Criar entrega com data atrasada
      const usuario = await testSetup.prismaService.usuario.findFirst();
      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: fichaEPI.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA',
        },
      });

      // Criar item de entrega com devolução atrasada (30 dias atrás)
      const dataAtrasada = new Date();
      dataAtrasada.setDate(dataAtrasada.getDate() - 30);

      const estoqueItem = await testSetup.prismaService.estoqueItem.findFirst({
        where: {
          tipoEpiId: tipoEpi.id,
          almoxarifadoId: almoxarifado.id,
        },
      });

      await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          estoqueItemOrigemId: estoqueItem.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: dataAtrasada,
          status: 'COM_COLABORADOR',
        },
      });

      // Act - Buscar devoluções atrasadas
      const devolucaoAtrasada = await prismaService.$queryRaw`
        SELECT DISTINCT
          f.id as ficha_id,
          c.nome as colaborador,
          te.nome_equipamento,
          ei.data_limite_devolucao,
          CURRENT_DATE - ei.data_limite_devolucao as dias_atraso,
          COUNT(ei.id)::int as quantidade_itens_atrasados
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
          AND ei.data_limite_devolucao IS NOT NULL
          AND ei.data_limite_devolucao < CURRENT_DATE
          AND c.id = ${colaborador.id}
        GROUP BY f.id, c.nome, te.nome_equipamento, ei.data_limite_devolucao
        ORDER BY ei.data_limite_devolucao ASC;
      `;

      // Assert
      expect(devolucaoAtrasada).toBeDefined();
      expect((devolucaoAtrasada as any[]).length).toBeGreaterThan(0);

      const item = (devolucaoAtrasada as any[])[0];
      expect(item.colaborador).toBe('Colaborador Teste Atrasado');
      expect(item.dias_atraso).toBeGreaterThan(25); // Aproximadamente 30 dias
      expect(item.quantidade_itens_atrasados).toBe(1);
    });

    it('deve usar Prisma ORM para buscar devoluções atrasadas', async () => {
      // Act - Usando Prisma ORM
      const hoje = new Date();
      
      const devolucaoAtrasada = await prismaService.entregaItem.findMany({
        where: {
          status: 'COM_COLABORADOR',
          dataLimiteDevolucao: {
            not: null,
            lt: hoje,
          },
        },
        include: {
          entrega: {
            include: {
              fichaEpi: {
                include: {
                  colaborador: {
                    select: {
                      nome: true,
                      matricula: true,
                      cargo: true,
                      setor: true,
                    },
                  },
                },
              },
            },
          },
          estoqueItem: {
            include: {
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                  numeroCa: true,
                },
              },
              almoxarifado: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
        orderBy: [
          { dataLimiteDevolucao: 'asc' },
          { entrega: { fichaEpi: { colaborador: { nome: 'asc' } } } },
        ],
      });

      // Assert
      expect(devolucaoAtrasada).toBeDefined();
      expect(Array.isArray(devolucaoAtrasada)).toBe(true);

      // Verificar que todos estão realmente atrasados
      devolucaoAtrasada.forEach(item => {
        expect(item.status).toBe('COM_COLABORADOR');
        expect(item.dataLimiteDevolucao).toBeDefined();
        expect(item.dataLimiteDevolucao! < hoje).toBe(true);
        expect(item.entrega.fichaEpi.colaborador).toHaveProperty('nome');
        expect(item.estoqueItem.tipoEpi).toHaveProperty('nomeEquipamento');
      });
    });

    it('deve agrupar itens atrasados por colaborador', async () => {
      // Act - Agrupar por colaborador
      const result = await prismaService.$queryRaw`
        SELECT 
          c.id as colaborador_id,
          c.nome as colaborador,
          c.matricula,
          c.setor,
          COUNT(ei.id)::int as total_itens_atrasados,
          MIN(ei.data_limite_devolucao) as data_mais_antiga,
          MAX(CURRENT_DATE - ei.data_limite_devolucao) as maior_atraso_dias
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        WHERE ei.status = 'COM_COLABORADOR'
          AND ei.data_limite_devolucao IS NOT NULL
          AND ei.data_limite_devolucao < CURRENT_DATE
        GROUP BY c.id, c.nome, c.matricula, c.setor
        ORDER BY total_itens_atrasados DESC, maior_atraso_dias DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('colaborador_id');
        expect(firstItem).toHaveProperty('colaborador');
        expect(firstItem).toHaveProperty('total_itens_atrasados');
        expect(firstItem).toHaveProperty('data_mais_antiga');
        expect(firstItem).toHaveProperty('maior_atraso_dias');
        expect(firstItem.total_itens_atrasados).toBeGreaterThan(0);
        expect(firstItem.maior_atraso_dias).toBeGreaterThan(0);
      }
    });

    it('deve filtrar devoluções atrasadas por período de atraso', async () => {
      // Act - Filtrar itens atrasados há mais de 7 dias
      const result = await prismaService.$queryRaw`
        SELECT 
          c.nome as colaborador,
          te.nome_equipamento,
          ei.data_limite_devolucao,
          CURRENT_DATE - ei.data_limite_devolucao as dias_atraso,
          e.data_entrega
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
          AND ei.data_limite_devolucao IS NOT NULL
          AND ei.data_limite_devolucao < CURRENT_DATE - INTERVAL '7 days'
        ORDER BY dias_atraso DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ter mais de 7 dias de atraso
      (result as any[]).forEach(item => {
        expect(item.dias_atraso).toBeGreaterThan(7);
      });
    });

    it('deve filtrar devoluções atrasadas por tipo de EPI', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Filtrar por tipo específico
      const result = await prismaService.$queryRaw`
        SELECT 
          c.nome as colaborador,
          te.nome_equipamento,
          te.numero_ca,
          ei.data_limite_devolucao,
          CURRENT_DATE - ei.data_limite_devolucao as dias_atraso
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
          AND ei.data_limite_devolucao IS NOT NULL
          AND ei.data_limite_devolucao < CURRENT_DATE
          AND te.id = ${tipoEpi.id}
        ORDER BY dias_atraso DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ser do tipo específico
      (result as any[]).forEach(item => {
        expect(item.numero_ca).toBe('CA-12345');
      });
    });

    it('deve calcular estatísticas de devoluções atrasadas', async () => {
      // Act - Calcular estatísticas gerais
      const estatisticas = await prismaService.$queryRaw`
        SELECT 
          COUNT(DISTINCT c.id)::int as colaboradores_com_atraso,
          COUNT(ei.id)::int as total_itens_atrasados,
          COUNT(DISTINCT te.id)::int as tipos_epis_atrasados,
          AVG(CURRENT_DATE - ei.data_limite_devolucao)::int as media_dias_atraso,
          MAX(CURRENT_DATE - ei.data_limite_devolucao)::int as maior_atraso_dias
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
          AND ei.data_limite_devolucao IS NOT NULL
          AND ei.data_limite_devolucao < CURRENT_DATE;
      `;

      // Assert
      expect(estatisticas).toBeDefined();
      expect(Array.isArray(estatisticas)).toBe(true);

      if ((estatisticas as any[]).length > 0) {
        const stats = (estatisticas as any[])[0];
        expect(stats).toHaveProperty('colaboradores_com_atraso');
        expect(stats).toHaveProperty('total_itens_atrasados');
        expect(stats).toHaveProperty('tipos_epis_atrasados');
        expect(typeof stats.colaboradores_com_atraso).toBe('number');
        expect(typeof stats.total_itens_atrasados).toBe('number');
        expect(typeof stats.tipos_epis_atrasados).toBe('number');
      }
    });

    it('deve identificar devoluções críticas (muito atrasadas)', async () => {
      // Act - Buscar devoluções críticas (mais de 30 dias)
      const devolucoesCriticas = await prismaService.$queryRaw`
        SELECT 
          c.nome as colaborador,
          c.matricula,
          c.setor,
          te.nome_equipamento,
          ei.data_limite_devolucao,
          CURRENT_DATE - ei.data_limite_devolucao as dias_atraso,
          'CRÍTICO' as nivel_alerta
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
          AND ei.data_limite_devolucao IS NOT NULL
          AND ei.data_limite_devolucao < CURRENT_DATE - INTERVAL '30 days'
        ORDER BY dias_atraso DESC;
      `;

      // Assert
      expect(devolucoesCriticas).toBeDefined();
      expect(Array.isArray(devolucoesCriticas)).toBe(true);

      // Todos devem ter mais de 30 dias de atraso
      (devolucoesCriticas as any[]).forEach(item => {
        expect(item.dias_atraso).toBeGreaterThan(30);
        expect(item.nivel_alerta).toBe('CRÍTICO');
      });
    });
  });
});