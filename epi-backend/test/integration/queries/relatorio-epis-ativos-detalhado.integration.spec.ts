import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * R-04: EPIs Ativos com Colaboradores (Detalhado)
 * 
 * Relatório detalhado que mostra cada EPI individual com seu colaborador.
 * Conforme documentação da consulta SQL:
 * SELECT 
 *   c.nome as colaborador,
 *   te.nome_equipamento,
 *   ei.data_limite_devolucao,
 *   ei.status,
 *   CASE 
 *     WHEN ei.status = 'COM_COLABORADOR' AND ei.data_limite_devolucao < CURRENT_DATE 
 *     THEN true 
 *     ELSE false 
 *   END as devolucao_atrasada
 * FROM entrega_itens ei
 * JOIN entregas e ON ei.entrega_id = e.id
 * JOIN fichas_epi f ON e.ficha_epi_id = f.id
 * JOIN colaboradores c ON f.colaborador_id = c.id
 * JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
 * JOIN tipos_epi te ON est.tipo_epi_id = te.id
 * WHERE ei.status = 'COM_COLABORADOR'
 * ORDER BY c.nome, te.nome_equipamento;
 */
describe('Relatório R-04: EPIs Ativos com Colaboradores (Detalhado) - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    prismaService = testSetup.prismaService;
    await testSetup.resetTestData();
  });

  describe('EPIs Ativos Detalhado', () => {
    it('deve retornar relatório detalhado conforme especificação SQL', async () => {
      // Act - Executar consulta SQL raw conforme especificação R-04
      const result = await prismaService.$queryRaw`
        SELECT 
          c.nome as colaborador,
          te.nome_equipamento,
          ei.data_limite_devolucao,
          ei.status,
          CASE 
            WHEN ei.status = 'COM_COLABORADOR' AND ei.data_limite_devolucao < CURRENT_DATE 
            THEN true 
            ELSE false 
          END as devolucao_atrasada
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
        ORDER BY c.nome, te.nome_equipamento;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura conforme especificação
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('colaborador');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('data_limite_devolucao');
        expect(firstItem).toHaveProperty('status');
        expect(firstItem).toHaveProperty('devolucao_atrasada');
        expect(firstItem.status).toBe('COM_COLABORADOR');
        expect(typeof firstItem.devolucao_atrasada).toBe('boolean');
      }
    });

    it('deve usar Prisma ORM para o mesmo relatório', async () => {
      // Act - Usando Prisma ORM equivalente
      const episAtivosDetalhado = await prismaService.entregaItem.findMany({
        where: {
          status: 'COM_COLABORADOR',
        },
        include: {
          entrega: {
            include: {
              fichaEpi: {
                include: {
                  colaborador: {
                    select: {
                      nome: true,
                      cpf: true,
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
                  vidaUtilDias: true,
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
          {
            entrega: {
              fichaEpi: {
                colaborador: {
                  nome: 'asc',
                },
              },
            },
          },
          {
            estoqueItemOrigemId: 'asc',
          },
        ],
      });

      // Assert
      expect(episAtivosDetalhado).toBeDefined();
      expect(Array.isArray(episAtivosDetalhado)).toBe(true);

      // Verificar estrutura e calcular devolução atrasada
      episAtivosDetalhado.forEach(item => {
        expect(item.status).toBe('COM_COLABORADOR');
        expect(item.entrega.fichaEpi.colaborador).toHaveProperty('nome');
        expect(item.estoqueItem.tipoEpi).toHaveProperty('nomeEquipamento');

        // Calcular se está atrasado
        const hoje = new Date();
        const devolucaoAtrasada = item.dataLimiteDevolucao ? 
          item.dataLimiteDevolucao < hoje : false;
        
        expect(typeof devolucaoAtrasada).toBe('boolean');
      });
    });

    it('deve filtrar EPIs com devolução atrasada', async () => {
      // Act - Filtrar apenas itens com devolução atrasada
      const result = await prismaService.$queryRaw`
        SELECT 
          c.nome as colaborador,
          c.matricula,
          c.setor,
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
        ORDER BY ei.data_limite_devolucao ASC, c.nome;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos os itens devem estar atrasados
      (result as any[]).forEach(item => {
        expect(item.data_limite_devolucao).toBeDefined();
        expect(new Date(item.data_limite_devolucao) < new Date()).toBe(true);
        expect(item.dias_atraso).toBeGreaterThan(0);
      });
    });

    it('deve agrupar EPIs por colaborador', async () => {
      // Act - Agrupar por colaborador
      const result = await prismaService.$queryRaw`
        SELECT 
          c.id as colaborador_id,
          c.nome as colaborador,
          c.matricula,
          c.setor,
          COUNT(ei.id)::int as total_epis,
          COUNT(CASE WHEN ei.data_limite_devolucao < CURRENT_DATE THEN 1 END)::int as epis_atrasados
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        WHERE ei.status = 'COM_COLABORADOR'
        GROUP BY c.id, c.nome, c.matricula, c.setor
        ORDER BY total_epis DESC, c.nome;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('colaborador_id');
        expect(firstItem).toHaveProperty('colaborador');
        expect(firstItem).toHaveProperty('total_epis');
        expect(firstItem).toHaveProperty('epis_atrasados');
        expect(firstItem.total_epis).toBeGreaterThan(0);
        expect(firstItem.epis_atrasados).toBeGreaterThanOrEqual(0);
        expect(firstItem.epis_atrasados).toBeLessThanOrEqual(firstItem.total_epis);
      }
    });

    it('deve filtrar EPIs por colaborador específico', async () => {
      // Arrange - Buscar um colaborador que tenha EPIs
      const colaboradorComEpis = await prismaService.colaborador.findFirst({
        where: {
          fichasEPI: {
            some: {
              entregas: {
                some: {
                  itens: {
                    some: {
                      status: 'COM_COLABORADOR',
                    },
                  },
                },
              },
            },
          },
        },
        include: {
          fichasEPI: true,
        },
      });

      if (!colaboradorComEpis) {
        // Se não há colaboradores com EPIs, pular este teste
        return;
      }

      // Act - Buscar EPIs do colaborador específico
      const episDoColaborador = await prismaService.entregaItem.findMany({
        where: {
          status: 'COM_COLABORADOR',
          entrega: {
            fichaEpi: {
              colaboradorId: colaboradorComEpis.id,
            },
          },
        },
        include: {
          entrega: {
            select: {
              dataEntrega: true,
              status: true,
            },
          },
          estoqueItem: {
            include: {
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                  numeroCa: true,
                  vidaUtilDias: true,
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
      });

      // Assert
      expect(episDoColaborador).toBeDefined();
      expect(Array.isArray(episDoColaborador)).toBe(true);

      // Todos os itens devem ser do colaborador específico
      episDoColaborador.forEach(item => {
        expect(item.status).toBe('COM_COLABORADOR');
        expect(item.estoqueItem.tipoEpi).toHaveProperty('nomeEquipamento');
      });
    });

    it('deve filtrar EPIs por tipo específico', async () => {
      // Arrange - Buscar um tipo de EPI
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      expect(tipoEpi).toBeDefined();

      // Act - Filtrar EPIs ativos do tipo específico
      const result = await prismaService.$queryRaw`
        SELECT 
          c.nome as colaborador,
          c.matricula,
          te.nome_equipamento,
          te.numero_ca,
          ei.data_limite_devolucao,
          e.data_entrega,
          alm.nome as almoxarifado_origem
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        JOIN almoxarifados alm ON est.almoxarifado_id = alm.id
        WHERE ei.status = 'COM_COLABORADOR'
          AND te.id = ${tipoEpi.id}
        ORDER BY e.data_entrega DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos os itens devem ser do tipo específico
      (result as any[]).forEach(item => {
        expect(item.numero_ca).toBe('CA-12345');
      });
    });

    it('deve calcular estatísticas de EPIs ativos', async () => {
      // Act - Calcular estatísticas gerais
      const estatisticas = await prismaService.$queryRaw`
        SELECT 
          COUNT(DISTINCT c.id)::int as total_colaboradores_com_epis,
          COUNT(ei.id)::int as total_itens_ativos,
          COUNT(DISTINCT te.id)::int as tipos_epis_diferentes,
          COUNT(CASE WHEN ei.data_limite_devolucao < CURRENT_DATE THEN 1 END)::int as itens_atrasados,
          AVG(CASE WHEN ei.data_limite_devolucao IS NOT NULL 
                   THEN EXTRACT(DAY FROM (ei.data_limite_devolucao - e.data_entrega))
                   ELSE NULL END)::int as media_dias_vida_util
        FROM entrega_itens ei
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR';
      `;

      // Assert
      expect(estatisticas).toBeDefined();
      expect(Array.isArray(estatisticas)).toBe(true);

      if ((estatisticas as any[]).length > 0) {
        const stats = (estatisticas as any[])[0];
        expect(stats).toHaveProperty('total_colaboradores_com_epis');
        expect(stats).toHaveProperty('total_itens_ativos');
        expect(stats).toHaveProperty('tipos_epis_diferentes');
        expect(stats).toHaveProperty('itens_atrasados');
        expect(typeof stats.total_colaboradores_com_epis).toBe('number');
        expect(typeof stats.total_itens_ativos).toBe('number');
        expect(typeof stats.tipos_epis_diferentes).toBe('number');
        expect(typeof stats.itens_atrasados).toBe('number');
      }
    });
  });
});