import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * R-05: EPIs Devolvidos e Descartados
 * 
 * Relatório que correlaciona movimentações de entrada (devolução) com saídas (descarte)
 * para o mesmo item de estoque. Conforme documentação:
 * "Correlates movimentacoes_estoque of type ENTRADA_DEVOLUCAO and SAIDA_DESCARTE 
 * for the same stock item. The correlation between return and disposal requires 
 * temporal analysis of records."
 */
describe('Relatório R-05: EPIs Devolvidos e Descartados - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    prismaService = testSetup.prismaService;
    await testSetup.resetTestData();
  });

  describe('EPIs Devolvidos e Descartados', () => {
    it('deve correlacionar devoluções com descartes do mesmo item', async () => {
      // Act - Correlacionar devoluções e descartes
      const result = await prismaService.$queryRaw`
        SELECT DISTINCT
          te.nome_equipamento,
          te.numero_ca,
          a.nome as almoxarifado,
          md.data_movimentacao as data_devolucao,
          md.quantidade_movida as quantidade_devolvida,
          ud.nome as responsavel_devolucao,
          mdc.data_movimentacao as data_descarte,
          mdc.quantidade_movida as quantidade_descartada,
          udc.nome as responsavel_descarte,
          EXTRACT(DAY FROM (mdc.data_movimentacao - md.data_movimentacao))::int as dias_entre_devolucao_descarte
        FROM
          movimentacoes_estoque md
        JOIN
          movimentacoes_estoque mdc ON md.estoque_item_id = mdc.estoque_item_id
        JOIN
          estoque_itens ei ON md.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          usuarios ud ON md.responsavel_id = ud.id
        JOIN
          usuarios udc ON mdc.responsavel_id = udc.id
        WHERE
          md.tipo_movimentacao = 'ENTRADA_DEVOLUCAO'
          AND mdc.tipo_movimentacao = 'SAIDA_DESCARTE'
          AND mdc.data_movimentacao >= md.data_movimentacao
        ORDER BY
          md.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura conforme especificação
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('numero_ca');
        expect(firstItem).toHaveProperty('almoxarifado');
        expect(firstItem).toHaveProperty('data_devolucao');
        expect(firstItem).toHaveProperty('quantidade_devolvida');
        expect(firstItem).toHaveProperty('responsavel_devolucao');
        expect(firstItem).toHaveProperty('data_descarte');
        expect(firstItem).toHaveProperty('quantidade_descartada');
        expect(firstItem).toHaveProperty('responsavel_descarte');
        expect(firstItem).toHaveProperty('dias_entre_devolucao_descarte');
        expect(typeof firstItem.quantidade_devolvida).toBe('number');
        expect(typeof firstItem.quantidade_descartada).toBe('number');
        expect(firstItem.quantidade_devolvida).toBeGreaterThan(0);
        expect(firstItem.quantidade_descartada).toBeGreaterThan(0);
        expect(firstItem.dias_entre_devolucao_descarte).toBeGreaterThanOrEqual(0);
      }
    });

    it('deve usar Prisma ORM para correlacionar devoluções e descartes', async () => {
      // Act - Buscar devoluções primeiro
      const devolucoes = await prismaService.movimentacaoEstoque.findMany({
        where: {
          tipoMovimentacao: 'ENTRADA_DEVOLUCAO',
        },
        include: {
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
          responsavel: {
            select: {
              nome: true,
              email: true,
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Para cada devolução, buscar descartes posteriores do mesmo item
      const correlacoes = [];
      for (const devolucao of devolucoes) {
        const descartes = await prismaService.movimentacaoEstoque.findMany({
          where: {
            estoqueItemId: devolucao.estoqueItemId,
            tipoMovimentacao: 'SAIDA_DESCARTE',
            dataMovimentacao: {
              gte: devolucao.dataMovimentacao,
            },
          },
          include: {
            responsavel: {
              select: {
                nome: true,
                email: true,
              },
            },
          },
          orderBy: {
            dataMovimentacao: 'asc',
          },
        });

        for (const descarte of descartes) {
          correlacoes.push({
            devolucao,
            descarte,
            diasEntre: Math.floor(
              (descarte.dataMovimentacao.getTime() - devolucao.dataMovimentacao.getTime()) / 
              (1000 * 60 * 60 * 24)
            ),
          });
        }
      }

      // Assert
      expect(correlacoes).toBeDefined();
      expect(Array.isArray(correlacoes)).toBe(true);

      // Verificar correlações
      correlacoes.forEach(correlacao => {
        expect(correlacao.devolucao.tipoMovimentacao).toBe('ENTRADA_DEVOLUCAO');
        expect(correlacao.descarte.tipoMovimentacao).toBe('SAIDA_DESCARTE');
        expect(correlacao.devolucao.estoqueItemId).toBe(correlacao.descarte.estoqueItemId);
        expect(correlacao.diasEntre).toBeGreaterThanOrEqual(0);
        expect(correlacao.devolucao.estoqueItem.tipoEpi).toHaveProperty('nomeEquipamento');
        expect(correlacao.devolucao.estoqueItem.almoxarifado).toHaveProperty('nome');
      });
    });

    it('deve identificar EPIs devolvidos que ainda não foram descartados', async () => {
      // Act - EPIs devolvidos sem descarte posterior
      const result = await prismaService.$queryRaw`
        SELECT DISTINCT
          te.nome_equipamento,
          te.numero_ca,
          a.nome as almoxarifado,
          md.data_movimentacao as data_devolucao,
          md.quantidade_movida as quantidade_devolvida,
          ud.nome as responsavel_devolucao,
          CURRENT_DATE - md.data_movimentacao::date as dias_desde_devolucao
        FROM
          movimentacoes_estoque md
        JOIN
          estoque_itens ei ON md.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          usuarios ud ON md.responsavel_id = ud.id
        WHERE
          md.tipo_movimentacao = 'ENTRADA_DEVOLUCAO'
          AND NOT EXISTS (
            SELECT 1 FROM movimentacoes_estoque mdc
            WHERE mdc.estoque_item_id = md.estoque_item_id
              AND mdc.tipo_movimentacao = 'SAIDA_DESCARTE'
              AND mdc.data_movimentacao >= md.data_movimentacao
          )
        ORDER BY
          md.data_movimentacao ASC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ser devoluções sem descarte posterior
      (result as any[]).forEach(item => {
        expect(item).toHaveProperty('data_devolucao');
        expect(item).toHaveProperty('quantidade_devolvida');
        expect(item).toHaveProperty('dias_desde_devolucao');
        expect(typeof item.dias_desde_devolucao).toBe('number');
        expect(item.dias_desde_devolucao).toBeGreaterThanOrEqual(0);
      });
    });

    it('deve filtrar correlações por período de devolução', async () => {
      // Arrange - Definir período (últimos 30 dias)
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 30);

      // Act - Filtrar correlações por período
      const result = await prismaService.$queryRaw`
        SELECT
          te.nome_equipamento,
          md.data_movimentacao as data_devolucao,
          md.quantidade_movida as quantidade_devolvida,
          mdc.data_movimentacao as data_descarte,
          mdc.quantidade_movida as quantidade_descartada
        FROM
          movimentacoes_estoque md
        JOIN
          movimentacoes_estoque mdc ON md.estoque_item_id = mdc.estoque_item_id
        JOIN
          estoque_itens ei ON md.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        WHERE
          md.tipo_movimentacao = 'ENTRADA_DEVOLUCAO'
          AND mdc.tipo_movimentacao = 'SAIDA_DESCARTE'
          AND mdc.data_movimentacao >= md.data_movimentacao
          AND md.data_movimentacao >= ${dataInicio}
          AND md.data_movimentacao <= ${dataFim}
        ORDER BY
          md.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar período
      (result as any[]).forEach(item => {
        const dataDevolucao = new Date(item.data_devolucao);
        expect(dataDevolucao.getTime()).toBeGreaterThanOrEqual(dataInicio.getTime());
        expect(dataDevolucao.getTime()).toBeLessThanOrEqual(dataFim.getTime());
      });
    });

    it('deve filtrar correlações por almoxarifado', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Act - Filtrar por almoxarifado
      const result = await prismaService.$queryRaw`
        SELECT
          te.nome_equipamento,
          a.nome as almoxarifado,
          md.data_movimentacao as data_devolucao,
          mdc.data_movimentacao as data_descarte
        FROM
          movimentacoes_estoque md
        JOIN
          movimentacoes_estoque mdc ON md.estoque_item_id = mdc.estoque_item_id
        JOIN
          estoque_itens ei ON md.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        WHERE
          md.tipo_movimentacao = 'ENTRADA_DEVOLUCAO'
          AND mdc.tipo_movimentacao = 'SAIDA_DESCARTE'
          AND mdc.data_movimentacao >= md.data_movimentacao
          AND a.id = ${almoxarifado.id}
        ORDER BY
          md.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ser do almoxarifado específico
      (result as any[]).forEach(item => {
        expect(item.almoxarifado).toBe('Almoxarifado Central');
      });
    });

    it('deve filtrar correlações por tipo de EPI', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Filtrar por tipo de EPI
      const result = await prismaService.$queryRaw`
        SELECT
          te.nome_equipamento,
          te.numero_ca,
          md.data_movimentacao as data_devolucao,
          mdc.data_movimentacao as data_descarte,
          EXTRACT(DAY FROM (mdc.data_movimentacao - md.data_movimentacao))::int as dias_entre
        FROM
          movimentacoes_estoque md
        JOIN
          movimentacoes_estoque mdc ON md.estoque_item_id = mdc.estoque_item_id
        JOIN
          estoque_itens ei ON md.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        WHERE
          md.tipo_movimentacao = 'ENTRADA_DEVOLUCAO'
          AND mdc.tipo_movimentacao = 'SAIDA_DESCARTE'
          AND mdc.data_movimentacao >= md.data_movimentacao
          AND te.id = ${tipoEpi.id}
        ORDER BY
          md.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ser do tipo específico
      (result as any[]).forEach(item => {
        expect(item.numero_ca).toBe('CA-12345');
      });
    });

    it('deve agrupar correlações por tipo de EPI', async () => {
      // Act - Agrupar por tipo
      const result = await prismaService.$queryRaw`
        SELECT
          te.nome_equipamento,
          te.numero_ca,
          COUNT(DISTINCT md.id)::int as total_devolucoes,
          COUNT(DISTINCT mdc.id)::int as total_descartes,
          SUM(md.quantidade_movida)::int as total_quantidade_devolvida,
          SUM(mdc.quantidade_movida)::int as total_quantidade_descartada,
          AVG(EXTRACT(DAY FROM (mdc.data_movimentacao - md.data_movimentacao)))::int as media_dias_ate_descarte
        FROM
          movimentacoes_estoque md
        JOIN
          movimentacoes_estoque mdc ON md.estoque_item_id = mdc.estoque_item_id
        JOIN
          estoque_itens ei ON md.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        WHERE
          md.tipo_movimentacao = 'ENTRADA_DEVOLUCAO'
          AND mdc.tipo_movimentacao = 'SAIDA_DESCARTE'
          AND mdc.data_movimentacao >= md.data_movimentacao
        GROUP BY
          te.id, te.nome_equipamento, te.numero_ca
        ORDER BY
          total_quantidade_descartada DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura dos agrupamentos
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('numero_ca');
        expect(firstItem).toHaveProperty('total_devolucoes');
        expect(firstItem).toHaveProperty('total_descartes');
        expect(firstItem).toHaveProperty('total_quantidade_devolvida');
        expect(firstItem).toHaveProperty('total_quantidade_descartada');
        expect(firstItem).toHaveProperty('media_dias_ate_descarte');
        expect(firstItem.total_devolucoes).toBeGreaterThan(0);
        expect(firstItem.total_descartes).toBeGreaterThan(0);
        expect(firstItem.total_quantidade_devolvida).toBeGreaterThan(0);
        expect(firstItem.total_quantidade_descartada).toBeGreaterThan(0);
      }
    });

    it('deve calcular estatísticas de tempo entre devolução e descarte', async () => {
      // Act - Calcular estatísticas de tempo
      const estatisticas = await prismaService.$queryRaw`
        SELECT
          COUNT(DISTINCT md.id)::int as total_correlacoes,
          MIN(EXTRACT(DAY FROM (mdc.data_movimentacao - md.data_movimentacao)))::int as menor_tempo_descarte,
          MAX(EXTRACT(DAY FROM (mdc.data_movimentacao - md.data_movimentacao)))::int as maior_tempo_descarte,
          AVG(EXTRACT(DAY FROM (mdc.data_movimentacao - md.data_movimentacao)))::int as tempo_medio_descarte,
          COUNT(DISTINCT ei.almoxarifado_id)::int as almoxarifados_envolvidos,
          COUNT(DISTINCT te.id)::int as tipos_epis_envolvidos
        FROM
          movimentacoes_estoque md
        JOIN
          movimentacoes_estoque mdc ON md.estoque_item_id = mdc.estoque_item_id
        JOIN
          estoque_itens ei ON md.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        WHERE
          md.tipo_movimentacao = 'ENTRADA_DEVOLUCAO'
          AND mdc.tipo_movimentacao = 'SAIDA_DESCARTE'
          AND mdc.data_movimentacao >= md.data_movimentacao;
      `;

      // Assert
      expect(estatisticas).toBeDefined();
      expect(Array.isArray(estatisticas)).toBe(true);

      if ((estatisticas as any[]).length > 0) {
        const stats = (estatisticas as any[])[0];
        expect(stats).toHaveProperty('total_correlacoes');
        expect(stats).toHaveProperty('menor_tempo_descarte');
        expect(stats).toHaveProperty('maior_tempo_descarte');
        expect(stats).toHaveProperty('tempo_medio_descarte');
        expect(stats).toHaveProperty('almoxarifados_envolvidos');
        expect(stats).toHaveProperty('tipos_epis_envolvidos');
        expect(typeof stats.total_correlacoes).toBe('number');
        expect(typeof stats.tempo_medio_descarte).toBe('number');
      }
    });
  });
});