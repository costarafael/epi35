import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RelatorioEstornosUseCase } from '@application/use-cases/queries/relatorio-estornos.use-case';

/**
 * R-10: Relatório de Estornos
 * 
 * Relatório que mostra todas as movimentações de estorno no sistema.
 * Conforme documentação da consulta SQL:
 * SELECT
 *   m.data_movimentacao,
 *   m.tipo_movimentacao,
 *   m.quantidade_movida,
 *   te.nome_equipamento,
 *   mo.data_movimentacao as data_movimentacao_original,
 *   mo.tipo_movimentacao as tipo_movimentacao_original,
 *   u.nome as responsavel_estorno,
 *   uo.nome as responsavel_original
 * FROM
 *   movimentacoes_estoque m
 * JOIN
 *   movimentacoes_estoque mo ON m.movimentacao_origem_id = mo.id
 * JOIN
 *   estoque_itens ei ON m.estoque_item_id = ei.id
 * JOIN
 *   tipos_epi te ON ei.tipo_epi_id = te.id
 * JOIN
 *   usuarios u ON m.responsavel_id = u.id
 * JOIN
 *   usuarios uo ON mo.responsavel_id = uo.id
 * WHERE
 *   m.tipo_movimentacao LIKE 'ESTORNO_%'
 * ORDER BY
 *   m.data_movimentacao DESC;
 */
describe('Relatório R-10: Estornos - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;
  let relatorioUseCase: RelatorioEstornosUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    prismaService = testSetup.prismaService;
    relatorioUseCase = new RelatorioEstornosUseCase(prismaService);
    await testSetup.resetTestData();
  });

  describe('Relatório de Estornos - Use Case Tests', () => {
    it('deve retornar estornos usando use case', async () => {
      // Act - Usar o use case
      const estornos = await relatorioUseCase.execute();

      // Assert
      expect(estornos).toBeDefined();
      expect(Array.isArray(estornos)).toBe(true);

      // Verificar estrutura do use case
      if (estornos.length > 0) {
        const firstItem = estornos[0];
        expect(firstItem).toHaveProperty('id');
        expect(firstItem).toHaveProperty('dataMovimentacao');
        expect(firstItem).toHaveProperty('tipoMovimentacao');
        expect(firstItem).toHaveProperty('quantidadeMovida');
        expect(firstItem).toHaveProperty('tipoEpi');
        expect(firstItem).toHaveProperty('almoxarifado');
        expect(firstItem).toHaveProperty('responsavelEstorno');
        expect(firstItem).toHaveProperty('movimentacaoOriginal');
        expect(firstItem).toHaveProperty('diasParaEstorno');
        expect(firstItem.tipoMovimentacao).toMatch(/ESTORNO_/);
        expect(typeof firstItem.quantidadeMovida).toBe('number');
        expect(typeof firstItem.diasParaEstorno).toBe('number');
      }
    });

    it('deve retornar estatísticas de estornos usando use case', async () => {
      // Act - Usar método de estatísticas
      const estatisticas = await relatorioUseCase.obterEstatisticas();

      // Assert
      expect(estatisticas).toBeDefined();
      expect(estatisticas).toHaveProperty('totalEstornos');
      expect(estatisticas).toHaveProperty('totalQuantidadeEstornada');
      expect(estatisticas).toHaveProperty('almoxarifadosComEstorno');
      expect(estatisticas).toHaveProperty('tiposEpisEstornados');
      expect(estatisticas).toHaveProperty('responsaveisDiferentes');
      expect(estatisticas).toHaveProperty('tempoMedioParaEstorno');
      expect(estatisticas).toHaveProperty('estornosPorTipoOriginal');
      expect(typeof estatisticas.totalEstornos).toBe('number');
      expect(typeof estatisticas.totalQuantidadeEstornada).toBe('number');
      expect(Array.isArray(estatisticas.estornosPorTipoOriginal)).toBe(true);
    });

    it('deve filtrar estornos por almoxarifado usando use case', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Act
      const estornos = await relatorioUseCase.execute({
        almoxarifadoId: almoxarifado.id,
      });

      // Assert
      expect(estornos).toBeDefined();
      estornos.forEach(item => {
        expect(item.almoxarifado.nome).toBe('Almoxarifado Central');
      });
    });
  });

  describe('Relatório de Estornos - SQL Direct Tests', () => {
    it('deve retornar estornos conforme especificação SQL com query direta', async () => {
      // Act - Executar consulta SQL raw conforme especificação R-10
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          m.tipo_movimentacao,
          m.quantidade_movida,
          te.nome_equipamento,
          te.numero_ca,
          mo.data_movimentacao as data_movimentacao_original,
          mo.tipo_movimentacao as tipo_movimentacao_original,
          u.nome as responsavel_estorno,
          uo.nome as responsavel_original,
          a.nome as almoxarifado_nome
        FROM
          movimentacoes_estoque m
        JOIN
          movimentacoes_estoque mo ON m.movimentacao_origem_id = mo.id
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        JOIN
          usuarios uo ON mo.responsavel_id = uo.id
        WHERE
          m.tipo_movimentacao LIKE 'ESTORNO_%'
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
        expect(firstItem).toHaveProperty('tipo_movimentacao');
        expect(firstItem).toHaveProperty('quantidade_movida');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('data_movimentacao_original');
        expect(firstItem).toHaveProperty('tipo_movimentacao_original');
        expect(firstItem).toHaveProperty('responsavel_estorno');
        expect(firstItem).toHaveProperty('responsavel_original');
        expect(firstItem.tipo_movimentacao).toMatch(/^ESTORNO_/);
        expect(typeof firstItem.quantidade_movida).toBe('number');
        expect(firstItem.quantidade_movida).toBeGreaterThan(0);
      }
    });

    it('deve usar Prisma ORM para buscar estornos', async () => {
      // Act - Usando Prisma ORM
      const estornos = await prismaService.movimentacaoEstoque.findMany({
        where: {
          tipoMovimentacao: {
            startsWith: 'ESTORNO_',
          },
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
          movimentacaoOrigem: {
            select: {
              id: true,
              tipoMovimentacao: true,
              dataMovimentacao: true,
              quantidadeMovida: true,
              responsavel: {
                select: {
                  nome: true,
                  email: true,
                },
              },
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
      expect(estornos).toBeDefined();
      expect(Array.isArray(estornos)).toBe(true);

      // Verificar que todos são estornos
      estornos.forEach(estorno => {
        expect(estorno.tipoMovimentacao).toMatch(/^ESTORNO_/);
        expect(estorno.quantidadeMovida).toBeGreaterThan(0);
        expect(estorno.movimentacaoOrigemId).toBeDefined();
        expect(estorno.movimentacaoOrigem).toBeDefined();
        expect(estorno.estoqueItem.tipoEpi).toHaveProperty('nomeEquipamento');
        expect(estorno.estoqueItem.almoxarifado).toHaveProperty('nome');
        expect(estorno.responsavel).toHaveProperty('nome');
      });
    });

    it('deve filtrar estornos por período', async () => {
      // Arrange - Definir período (últimos 30 dias)
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 30);

      // Act - Filtrar por período
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          m.tipo_movimentacao,
          m.quantidade_movida,
          te.nome_equipamento,
          mo.data_movimentacao as data_movimentacao_original,
          mo.tipo_movimentacao as tipo_movimentacao_original,
          u.nome as responsavel_estorno
        FROM
          movimentacoes_estoque m
        JOIN
          movimentacoes_estoque mo ON m.movimentacao_origem_id = mo.id
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        WHERE
          m.tipo_movimentacao LIKE 'ESTORNO_%'
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

    it('deve filtrar estornos por almoxarifado', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Act - Filtrar por almoxarifado
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          m.tipo_movimentacao,
          m.quantidade_movida,
          te.nome_equipamento,
          a.nome as almoxarifado_nome,
          mo.tipo_movimentacao as tipo_movimentacao_original,
          u.nome as responsavel_estorno
        FROM
          movimentacoes_estoque m
        JOIN
          movimentacoes_estoque mo ON m.movimentacao_origem_id = mo.id
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        WHERE
          m.tipo_movimentacao LIKE 'ESTORNO_%'
          AND a.id = ${almoxarifado.id}
        ORDER BY
          m.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ser do almoxarifado específico
      (result as any[]).forEach(item => {
        expect(item.almoxarifado_nome).toBe('Almoxarifado Central');
      });
    });

    it('deve filtrar estornos por tipo de EPI', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Filtrar por tipo de EPI
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          m.tipo_movimentacao,
          m.quantidade_movida,
          te.nome_equipamento,
          te.numero_ca,
          mo.tipo_movimentacao as tipo_movimentacao_original,
          u.nome as responsavel_estorno
        FROM
          movimentacoes_estoque m
        JOIN
          movimentacoes_estoque mo ON m.movimentacao_origem_id = mo.id
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        WHERE
          m.tipo_movimentacao LIKE 'ESTORNO_%'
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

    it('deve agrupar estornos por tipo de movimentação original', async () => {
      // Act - Agrupar por tipo de movimentação original
      const result = await prismaService.$queryRaw`
        SELECT
          mo.tipo_movimentacao as tipo_movimentacao_original,
          COUNT(m.id)::int as total_estornos,
          SUM(m.quantidade_movida)::int as total_quantidade_estornada,
          COUNT(DISTINCT m.responsavel_id)::int as responsaveis_diferentes
        FROM
          movimentacoes_estoque m
        JOIN
          movimentacoes_estoque mo ON m.movimentacao_origem_id = mo.id
        WHERE
          m.tipo_movimentacao LIKE 'ESTORNO_%'
        GROUP BY
          mo.tipo_movimentacao
        ORDER BY
          total_quantidade_estornada DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura dos agrupamentos
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('tipo_movimentacao_original');
        expect(firstItem).toHaveProperty('total_estornos');
        expect(firstItem).toHaveProperty('total_quantidade_estornada');
        expect(firstItem).toHaveProperty('responsaveis_diferentes');
        expect(firstItem.total_estornos).toBeGreaterThan(0);
        expect(firstItem.total_quantidade_estornada).toBeGreaterThan(0);
      }
    });

    it('deve agrupar estornos por responsável', async () => {
      // Act - Agrupar por responsável
      const result = await prismaService.$queryRaw`
        SELECT
          u.nome as responsavel_estorno,
          u.email,
          COUNT(m.id)::int as total_estornos_realizados,
          SUM(m.quantidade_movida)::int as total_quantidade_estornada,
          MIN(m.data_movimentacao) as primeiro_estorno,
          MAX(m.data_movimentacao) as ultimo_estorno
        FROM
          movimentacoes_estoque m
        JOIN
          usuarios u ON m.responsavel_id = u.id
        WHERE
          m.tipo_movimentacao LIKE 'ESTORNO_%'
        GROUP BY
          u.id, u.nome, u.email
        ORDER BY
          total_quantidade_estornada DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura dos agrupamentos
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('responsavel_estorno');
        expect(firstItem).toHaveProperty('email');
        expect(firstItem).toHaveProperty('total_estornos_realizados');
        expect(firstItem).toHaveProperty('total_quantidade_estornada');
        expect(firstItem.total_estornos_realizados).toBeGreaterThan(0);
        expect(firstItem.total_quantidade_estornada).toBeGreaterThan(0);
      }
    });

    it('deve calcular estatísticas gerais de estornos', async () => {
      // Act - Calcular estatísticas
      const estatisticas = await prismaService.$queryRaw`
        SELECT
          COUNT(m.id)::int as total_estornos,
          SUM(m.quantidade_movida)::int as total_quantidade_estornada,
          COUNT(DISTINCT ei.almoxarifado_id)::int as almoxarifados_com_estorno,
          COUNT(DISTINCT te.id)::int as tipos_epis_estornados,
          COUNT(DISTINCT m.responsavel_id)::int as responsaveis_diferentes,
          MIN(m.data_movimentacao) as primeiro_estorno_sistema,
          MAX(m.data_movimentacao) as ultimo_estorno_sistema
        FROM
          movimentacoes_estoque m
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        WHERE
          m.tipo_movimentacao LIKE 'ESTORNO_%';
      `;

      // Assert
      expect(estatisticas).toBeDefined();
      expect(Array.isArray(estatisticas)).toBe(true);

      if ((estatisticas as any[]).length > 0) {
        const stats = (estatisticas as any[])[0];
        expect(stats).toHaveProperty('total_estornos');
        expect(stats).toHaveProperty('total_quantidade_estornada');
        expect(stats).toHaveProperty('almoxarifados_com_estorno');
        expect(stats).toHaveProperty('tipos_epis_estornados');
        expect(stats).toHaveProperty('responsaveis_diferentes');
        expect(typeof stats.total_estornos).toBe('number');
        expect(typeof stats.total_quantidade_estornada).toBe('number');
      }
    });

    it('deve buscar estornos com tempo de resposta (delay entre original e estorno)', async () => {
      // Act - Incluir tempo de resposta
      const result = await prismaService.$queryRaw`
        SELECT
          m.data_movimentacao,
          m.tipo_movimentacao,
          m.quantidade_movida,
          te.nome_equipamento,
          mo.data_movimentacao as data_movimentacao_original,
          mo.tipo_movimentacao as tipo_movimentacao_original,
          u.nome as responsavel_estorno,
          uo.nome as responsavel_original,
          EXTRACT(DAY FROM (m.data_movimentacao - mo.data_movimentacao))::int as dias_para_estorno
        FROM
          movimentacoes_estoque m
        JOIN
          movimentacoes_estoque mo ON m.movimentacao_origem_id = mo.id
        JOIN
          estoque_itens ei ON m.estoque_item_id = ei.id
        JOIN
          tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN
          usuarios u ON m.responsavel_id = u.id
        JOIN
          usuarios uo ON mo.responsavel_id = uo.id
        WHERE
          m.tipo_movimentacao LIKE 'ESTORNO_%'
        ORDER BY
          dias_para_estorno DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura com tempo de resposta
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('dias_para_estorno');
        expect(typeof firstItem.dias_para_estorno).toBe('number');
        expect(firstItem.dias_para_estorno).toBeGreaterThanOrEqual(0);
      }
    });
  });
});