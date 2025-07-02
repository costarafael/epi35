import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * R-09: Relatório de Itens Descartados
 * 
 * Relatório que mostra todos os itens que foram descartados.
 * Conforme documentação da consulta SQL:
 * SELECT
 *   m.data_movimentacao,
 *   te.nome_equipamento,
 *   m.quantidade_movida,
 *   a.nome AS almoxarifado_origem,
 *   u.nome AS responsavel
 * FROM
 *   movimentacoes_estoque m
 * JOIN
 *   estoque_itens ei ON m.estoque_item_id = ei.id
 * JOIN
 *   tipos_epi te ON ei.tipo_epi_id = te.id
 * JOIN
 *   almoxarifados a ON ei.almoxarifado_id = a.id
 * JOIN
 *   usuarios u ON m.responsavel_id = u.id
 * WHERE
 *   m.tipo_movimentacao = 'SAIDA_DESCARTE'
 * ORDER BY
 *   m.data_movimentacao DESC;
 */
describe('Relatório R-09: Itens Descartados - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    prismaService = testSetup.prismaService;
    await testSetup.resetTestData();
  });

  describe('Itens Descartados', () => {
    it('deve retornar itens descartados conforme especificação SQL', async () => {
      // Act - Executar consulta SQL raw conforme especificação R-09
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          te.nome_equipamento,
          te.numero_ca,
          m.quantidade_movida,
          a.nome AS almoxarifado_origem,
          u.nome AS responsavel,
          m.id as movimentacao_id
        FROM
          movimentacoes_estoque m
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        WHERE
          m.tipo_movimentacao = 'SAIDA_DESCARTE'
        ORDER BY
          m.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura conforme especificação
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('data_movimentacao');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('quantidade_movida');
        expect(firstItem).toHaveProperty('almoxarifado_origem');
        expect(firstItem).toHaveProperty('responsavel');
        expect(typeof firstItem.quantidade_movida).toBe('number');
        expect(firstItem.quantidade_movida).toBeGreaterThan(0);
      }
    });

    it('deve usar Prisma ORM para buscar itens descartados', async () => {
      // Act - Usando Prisma ORM
      const itensDescartados = await prismaService.movimentacaoEstoque.findMany({
        where: {
          tipoMovimentacao: 'SAIDA_DESCARTE',
        },
        include: {
          estoqueItem: {
            include: {
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                  numeroCa: true,
                  status: true,
                },
              },
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
            },
          },
          responsavel: {
            select: {
              nome: true,
              email: true,
            },
          },
          notaMovimentacao: {
            select: {
              numeroDocumento: true,
              tipoNota: true,
              observacoes: true,
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Assert
      expect(itensDescartados).toBeDefined();
      expect(Array.isArray(itensDescartados)).toBe(true);

      // Verificar que todos são descartes
      itensDescartados.forEach(item => {
        expect(item.tipoMovimentacao).toBe('SAIDA_DESCARTE');
        expect(item.quantidadeMovida).toBeGreaterThan(0);
        expect(item.estoqueItem.tipoEpi).toHaveProperty('nomeEquipamento');
        expect(item.estoqueItem.almoxarifado).toHaveProperty('nome');
        expect(item.responsavel).toHaveProperty('nome');
      });
    });

    it('deve filtrar descartes por período', async () => {
      // Arrange - Definir período (últimos 30 dias)
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 30);

      // Act - Filtrar por período
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          te.nome_equipamento,
          m.quantidade_movida,
          a.nome AS almoxarifado_origem,
          u.nome AS responsavel
        FROM
          movimentacoes_estoque m
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        WHERE
          m.tipo_movimentacao = 'SAIDA_DESCARTE'
          AND m.data_movimentacao >= ${dataInicio}
          AND m.data_movimentacao <= ${dataFim}
        ORDER BY
          m.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar período
      (result as any[]).forEach(item => {
        const dataMovimentacao = new Date(item.data_movimentacao);
        expect(dataMovimentacao.getTime()).toBeGreaterThanOrEqual(dataInicio.getTime());
        expect(dataMovimentacao.getTime()).toBeLessThanOrEqual(dataFim.getTime());
      });
    });

    it('deve filtrar descartes por almoxarifado', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Act - Filtrar por almoxarifado
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          te.nome_equipamento,
          m.quantidade_movida,
          a.nome AS almoxarifado_origem,
          u.nome AS responsavel
        FROM
          movimentacoes_estoque m
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        WHERE
          m.tipo_movimentacao = 'SAIDA_DESCARTE'
          AND a.id = ${almoxarifado.id}
        ORDER BY
          m.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ser do almoxarifado específico
      (result as any[]).forEach(item => {
        expect(item.almoxarifado_origem).toBe('Almoxarifado Central');
      });
    });

    it('deve filtrar descartes por tipo de EPI', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Filtrar por tipo de EPI
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          te.nome_equipamento,
          te.numero_ca,
          m.quantidade_movida,
          a.nome AS almoxarifado_origem,
          u.nome AS responsavel
        FROM
          movimentacoes_estoque m
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        WHERE
          m.tipo_movimentacao = 'SAIDA_DESCARTE'
          AND te.id = ${tipoEpi.id}
        ORDER BY
          m.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ser do tipo específico
      (result as any[]).forEach(item => {
        expect(item.numero_ca).toBe('CA-12345');
      });
    });

    it('deve agrupar descartes por tipo de EPI', async () => {
      // Act - Agrupar por tipo
      const result = await prismaService.$queryRaw`
        SELECT
          te.nome_equipamento,
          te.numero_ca,
          COUNT(m.id)::int as total_movimentacoes,
          SUM(m.quantidade_movida)::int as total_quantidade_descartada,
          MIN(m.data_movimentacao) as primeiro_descarte,
          MAX(m.data_movimentacao) as ultimo_descarte
        FROM
          movimentacoes_estoque m
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        WHERE
          m.tipo_movimentacao = 'SAIDA_DESCARTE'
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
        expect(firstItem).toHaveProperty('total_movimentacoes');
        expect(firstItem).toHaveProperty('total_quantidade_descartada');
        expect(firstItem).toHaveProperty('primeiro_descarte');
        expect(firstItem).toHaveProperty('ultimo_descarte');
        expect(firstItem.total_movimentacoes).toBeGreaterThan(0);
        expect(firstItem.total_quantidade_descartada).toBeGreaterThan(0);
      }
    });

    it('deve agrupar descartes por almoxarifado', async () => {
      // Act - Agrupar por almoxarifado
      const result = await prismaService.$queryRaw`
        SELECT
          a.nome AS almoxarifado,
          un.nome AS unidade_negocio,
          COUNT(m.id)::int as total_movimentacoes,
          SUM(m.quantidade_movida)::int as total_quantidade_descartada,
          COUNT(DISTINCT te.id)::int as tipos_epis_diferentes
        FROM
          movimentacoes_estoque m
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          unidades_negocio un ON a.unidade_negocio_id = un.id
        WHERE
          m.tipo_movimentacao = 'SAIDA_DESCARTE'
        GROUP BY
          a.id, a.nome, un.nome
        ORDER BY
          total_quantidade_descartada DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura dos agrupamentos
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('almoxarifado');
        expect(firstItem).toHaveProperty('unidade_negocio');
        expect(firstItem).toHaveProperty('total_movimentacoes');
        expect(firstItem).toHaveProperty('total_quantidade_descartada');
        expect(firstItem).toHaveProperty('tipos_epis_diferentes');
        expect(firstItem.total_movimentacoes).toBeGreaterThan(0);
        expect(firstItem.total_quantidade_descartada).toBeGreaterThan(0);
      }
    });

    it('deve agrupar descartes por responsável', async () => {
      // Act - Agrupar por responsável
      const result = await prismaService.$queryRaw`
        SELECT
          u.nome AS responsavel,
          u.email,
          COUNT(m.id)::int as total_movimentacoes,
          SUM(m.quantidade_movida)::int as total_quantidade_descartada,
          MIN(m.data_movimentacao) as primeiro_descarte,
          MAX(m.data_movimentacao) as ultimo_descarte
        FROM
          movimentacoes_estoque m
        JOIN
          usuarios u ON m.responsavel_id = u.id
        WHERE
          m.tipo_movimentacao = 'SAIDA_DESCARTE'
        GROUP BY
          u.id, u.nome, u.email
        ORDER BY
          total_quantidade_descartada DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura dos agrupamentos
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('responsavel');
        expect(firstItem).toHaveProperty('email');
        expect(firstItem).toHaveProperty('total_movimentacoes');
        expect(firstItem).toHaveProperty('total_quantidade_descartada');
        expect(firstItem.total_movimentacoes).toBeGreaterThan(0);
        expect(firstItem.total_quantidade_descartada).toBeGreaterThan(0);
      }
    });

    it('deve calcular estatísticas gerais de descartes', async () => {
      // Act - Calcular estatísticas
      const estatisticas = await prismaService.$queryRaw`
        SELECT
          COUNT(m.id)::int as total_movimentacoes_descarte,
          SUM(m.quantidade_movida)::int as total_itens_descartados,
          COUNT(DISTINCT ei.almoxarifado_id)::int as almoxarifados_com_descarte,
          COUNT(DISTINCT te.id)::int as tipos_epis_descartados,
          COUNT(DISTINCT m.responsavel_id)::int as responsaveis_diferentes,
          MIN(m.data_movimentacao) as primeiro_descarte_sistema,
          MAX(m.data_movimentacao) as ultimo_descarte_sistema
        FROM
          movimentacoes_estoque m
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        WHERE
          m.tipo_movimentacao = 'SAIDA_DESCARTE';
      `;

      // Assert
      expect(estatisticas).toBeDefined();
      expect(Array.isArray(estatisticas)).toBe(true);

      if ((estatisticas as any[]).length > 0) {
        const stats = (estatisticas as any[])[0];
        expect(stats).toHaveProperty('total_movimentacoes_descarte');
        expect(stats).toHaveProperty('total_itens_descartados');
        expect(stats).toHaveProperty('almoxarifados_com_descarte');
        expect(stats).toHaveProperty('tipos_epis_descartados');
        expect(stats).toHaveProperty('responsaveis_diferentes');
        expect(typeof stats.total_movimentacoes_descarte).toBe('number');
        expect(typeof stats.total_itens_descartados).toBe('number');
      }
    });

    it('deve buscar descartes com informações da nota de movimentação', async () => {
      // Act - Incluir informações da nota
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          te.nome_equipamento,
          m.quantidade_movida,
          a.nome AS almoxarifado_origem,
          u.nome AS responsavel,
          nm.numero_documento,
          nm.tipo_nota,
          nm.observacoes as motivo_descarte
        FROM
          movimentacoes_estoque m
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        LEFT JOIN
          notas_movimentacao nm ON m.nota_movimentacao_id = nm.id
        WHERE
          m.tipo_movimentacao = 'SAIDA_DESCARTE'
        ORDER BY
          m.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura com informações da nota
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('data_movimentacao');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('quantidade_movida');
        expect(firstItem).toHaveProperty('almoxarifado_origem');
        expect(firstItem).toHaveProperty('responsavel');
        // Campos da nota podem ser null se não houver nota associada
        expect(firstItem).toHaveProperty('numero_documento');
        expect(firstItem).toHaveProperty('tipo_nota');
        expect(firstItem).toHaveProperty('motivo_descarte');
      }
    });
  });
});