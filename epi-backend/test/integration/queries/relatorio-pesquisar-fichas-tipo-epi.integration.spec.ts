import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * R-08: Pesquisar Fichas por Tipo de EPI
 * 
 * Relatório para pesquisar fichas de colaboradores filtradas por tipo de EPI.
 * Conforme documentação:
 * SELECT * FROM fichas_epi
 * -- With joins to filter by tipo_epi_id
 */
describe('Relatório R-08: Pesquisar Fichas por Tipo de EPI - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    prismaService = testSetup.prismaService;
    await testSetup.resetTestData();
  });

  describe('Pesquisa de Fichas por Tipo de EPI', () => {
    it('deve buscar fichas por tipo de EPI específico', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Buscar fichas que tenham entregas do tipo específico
      const result = await prismaService.$queryRaw`
        SELECT DISTINCT
          f.id as ficha_id,
          f.colaborador_id,
          f.data_emissao,
          f.status as status_ficha,
          c.nome as colaborador_nome,
          c.matricula,
          c.cargo,
          c.setor,
          te.nome_equipamento,
          te.numero_ca,
          COUNT(ei.id)::int as total_itens_tipo,
          COUNT(CASE WHEN ei.status = 'COM_COLABORADOR' THEN 1 END)::int as itens_ativos
        FROM fichas_epi f
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN entregas e ON f.id = e.ficha_epi_id
        JOIN entrega_itens ei ON e.id = ei.entrega_id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE te.id = ${tipoEpi.id}
        GROUP BY f.id, f.colaborador_id, f.data_emissao, f.status, 
                 c.nome, c.matricula, c.cargo, c.setor,
                 te.nome_equipamento, te.numero_ca
        ORDER BY c.nome, f.data_emissao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura conforme especificação
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('ficha_id');
        expect(firstItem).toHaveProperty('colaborador_id');
        expect(firstItem).toHaveProperty('colaborador_nome');
        expect(firstItem).toHaveProperty('matricula');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('numero_ca');
        expect(firstItem).toHaveProperty('total_itens_tipo');
        expect(firstItem).toHaveProperty('itens_ativos');
        expect(firstItem.numero_ca).toBe('CA-12345');
        expect(typeof firstItem.total_itens_tipo).toBe('number');
        expect(typeof firstItem.itens_ativos).toBe('number');
        expect(firstItem.total_itens_tipo).toBeGreaterThan(0);
      }
    });

    it('deve usar Prisma ORM para buscar fichas por tipo de EPI', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Usando Prisma ORM
      const fichasPorTipo = await prismaService.fichaEPI.findMany({
        where: {
          entregas: {
            some: {
              itens: {
                some: {
                  estoqueItemOrigem: {
                    tipoEpiId: tipoEpi.id,
                  },
                },
              },
            },
          },
        },
        include: {
          colaborador: {
            select: {
              nome: true,
              cpf: true,
              matricula: true,
              cargo: true,
              setor: true,
              unidadeNegocio: {
                select: {
                  nome: true,
                  codigo: true,
                },
              },
            },
          },
          entregas: {
            include: {
              itens: {
                where: {
                  estoqueItemOrigem: {
                    tipoEpiId: tipoEpi.id,
                  },
                },
                include: {
                  estoqueItemOrigem: {
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
              },
            },
          },
        },
        orderBy: [
          { colaborador: { nome: 'asc' } },
          { dataEmissao: 'desc' },
        ],
      });

      // Assert
      expect(fichasPorTipo).toBeDefined();
      expect(Array.isArray(fichasPorTipo)).toBe(true);

      // Verificar que todas as fichas têm itens do tipo específico
      fichasPorTipo.forEach(ficha => {
        expect(ficha.colaborador).toHaveProperty('nome');
        expect(ficha.entregas.length).toBeGreaterThan(0);
        
        // Verificar que há pelo menos um item do tipo específico
        const hasTargetType = ficha.entregas.some(entrega =>
          entrega.itens.some(item =>
            item.estoqueItemOrigem.tipoEpi.numeroCa === 'CA-12345'
          )
        );
        expect(hasTargetType).toBe(true);
      });
    });

    it('deve filtrar fichas ativas por tipo de EPI', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Filtrar apenas fichas ativas
      const result = await prismaService.$queryRaw`
        SELECT DISTINCT
          f.id as ficha_id,
          f.status as status_ficha,
          c.nome as colaborador_nome,
          c.matricula,
          te.nome_equipamento,
          COUNT(ei.id)::int as total_itens_tipo
        FROM fichas_epi f
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN entregas e ON f.id = e.ficha_epi_id
        JOIN entrega_itens ei ON e.id = ei.entrega_id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE te.id = ${tipoEpi.id}
          AND f.status = 'ATIVA'
        GROUP BY f.id, f.status, c.nome, c.matricula, te.nome_equipamento
        ORDER BY c.nome;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todas devem ser fichas ativas
      (result as any[]).forEach(item => {
        expect(item.status_ficha).toBe('ATIVA');
        expect(item.numero_ca).toBe('CA-12345');
      });
    });

    it('deve buscar fichas com itens ativos do tipo específico', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Buscar fichas que têm itens ativos (COM_COLABORADOR)
      const result = await prismaService.$queryRaw`
        SELECT DISTINCT
          f.id as ficha_id,
          c.nome as colaborador_nome,
          c.matricula,
          c.setor,
          te.nome_equipamento,
          te.numero_ca,
          COUNT(ei.id)::int as itens_ativos_tipo,
          MIN(ei.data_limite_devolucao) as proxima_devolucao,
          COUNT(CASE WHEN ei.data_limite_devolucao < CURRENT_DATE THEN 1 END)::int as itens_atrasados
        FROM fichas_epi f
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN entregas e ON f.id = e.ficha_epi_id
        JOIN entrega_itens ei ON e.id = ei.entrega_id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE te.id = ${tipoEpi.id}
          AND ei.status = 'COM_COLABORADOR'
        GROUP BY f.id, c.nome, c.matricula, c.setor, te.nome_equipamento, te.numero_ca
        ORDER BY itens_atrasados DESC, proxima_devolucao ASC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('ficha_id');
        expect(firstItem).toHaveProperty('colaborador_nome');
        expect(firstItem).toHaveProperty('itens_ativos_tipo');
        expect(firstItem).toHaveProperty('itens_atrasados');
        expect(firstItem.numero_ca).toBe('CA-12345');
        expect(firstItem.itens_ativos_tipo).toBeGreaterThan(0);
        expect(firstItem.itens_atrasados).toBeGreaterThanOrEqual(0);
      }
    });

    it('deve buscar fichas por múltiplos tipos de EPI', async () => {
      // Arrange - Buscar dois tipos diferentes
      const tipo1 = await testSetup.findTipoEpi('CA-12345');
      const tipos = await prismaService.tipoEPI.findMany({
        where: {
          status: 'ATIVO',
        },
        take: 2,
      });
      
      const tipoIds = tipos.map(t => t.id);

      // Act - Buscar fichas com qualquer um dos tipos
      const result = await prismaService.$queryRaw`
        SELECT DISTINCT
          f.id as ficha_id,
          c.nome as colaborador_nome,
          c.matricula,
          COUNT(DISTINCT te.id)::int as tipos_diferentes,
          STRING_AGG(DISTINCT te.nome_equipamento, ', ') as equipamentos
        FROM fichas_epi f
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN entregas e ON f.id = e.ficha_epi_id
        JOIN entrega_itens ei ON e.id = ei.entrega_id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE te.id = ANY(${tipoIds})
        GROUP BY f.id, c.nome, c.matricula
        ORDER BY tipos_diferentes DESC, c.nome;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura
      if ((result as any[]).length > 0) {
        (result as any[]).forEach(item => {
          expect(item).toHaveProperty('tipos_diferentes');
          expect(item).toHaveProperty('equipamentos');
          expect(item.tipos_diferentes).toBeGreaterThan(0);
          expect(typeof item.equipamentos).toBe('string');
        });
      }
    });

    it('deve agrupar fichas por tipo de EPI', async () => {
      // Act - Agrupar por tipo
      const result = await prismaService.$queryRaw`
        SELECT 
          te.id as tipo_epi_id,
          te.nome_equipamento,
          te.numero_ca,
          COUNT(DISTINCT f.id)::int as total_fichas,
          COUNT(DISTINCT c.id)::int as total_colaboradores,
          COUNT(ei.id)::int as total_itens_entregues,
          COUNT(CASE WHEN ei.status = 'COM_COLABORADOR' THEN 1 END)::int as itens_ativos,
          COUNT(CASE WHEN f.status = 'ATIVA' THEN 1 END)::int as fichas_ativas
        FROM tipos_epi te
        JOIN estoque_itens est ON te.id = est.tipo_epi_id
        JOIN entrega_itens ei ON est.id = ei.estoque_item_origem_id
        JOIN entregas e ON ei.entrega_id = e.id
        JOIN fichas_epi f ON e.ficha_epi_id = f.id
        JOIN colaboradores c ON f.colaborador_id = c.id
        GROUP BY te.id, te.nome_equipamento, te.numero_ca
        ORDER BY total_fichas DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura dos agrupamentos
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('tipo_epi_id');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('numero_ca');
        expect(firstItem).toHaveProperty('total_fichas');
        expect(firstItem).toHaveProperty('total_colaboradores');
        expect(firstItem).toHaveProperty('total_itens_entregues');
        expect(firstItem).toHaveProperty('itens_ativos');
        expect(firstItem).toHaveProperty('fichas_ativas');
        expect(firstItem.total_fichas).toBeGreaterThan(0);
        expect(firstItem.total_colaboradores).toBeGreaterThan(0);
        expect(firstItem.total_itens_entregues).toBeGreaterThan(0);
      }
    });

    it('deve buscar histórico de entregas por tipo de EPI', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Buscar histórico
      const result = await prismaService.$queryRaw`
        SELECT 
          f.id as ficha_id,
          c.nome as colaborador_nome,
          c.matricula,
          e.data_entrega,
          e.status as status_entrega,
          te.nome_equipamento,
          COUNT(ei.id)::int as quantidade_itens,
          alm.nome as almoxarifado_origem
        FROM fichas_epi f
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN entregas e ON f.id = e.ficha_epi_id
        JOIN entrega_itens ei ON e.id = ei.entrega_id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        JOIN almoxarifados alm ON est.almoxarifado_id = alm.id
        WHERE te.id = ${tipoEpi.id}
        GROUP BY f.id, c.nome, c.matricula, e.data_entrega, e.status, 
                 te.nome_equipamento, alm.nome
        ORDER BY e.data_entrega DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura do histórico
      if ((result as any[]).length > 0) {
        (result as any[]).forEach(item => {
          expect(item).toHaveProperty('ficha_id');
          expect(item).toHaveProperty('colaborador_nome');
          expect(item).toHaveProperty('data_entrega');
          expect(item).toHaveProperty('status_entrega');
          expect(item).toHaveProperty('quantidade_itens');
          expect(item).toHaveProperty('almoxarifado_origem');
          expect(item.quantidade_itens).toBeGreaterThan(0);
        });
      }
    });

    it('deve calcular estatísticas de fichas por tipo de EPI', async () => {
      // Act - Calcular estatísticas gerais
      const estatisticas = await prismaService.$queryRaw`
        SELECT 
          COUNT(DISTINCT f.id)::int as total_fichas_sistema,
          COUNT(DISTINCT c.id)::int as total_colaboradores_com_epis,
          COUNT(DISTINCT te.id)::int as tipos_epis_em_uso,
          COUNT(ei.id)::int as total_itens_entregues,
          COUNT(CASE WHEN ei.status = 'COM_COLABORADOR' THEN 1 END)::int as total_itens_ativos,
          COUNT(CASE WHEN f.status = 'ATIVA' THEN 1 END)::int as total_fichas_ativas
        FROM fichas_epi f
        JOIN colaboradores c ON f.colaborador_id = c.id
        JOIN entregas e ON f.id = e.ficha_epi_id
        JOIN entrega_itens ei ON e.id = ei.entrega_id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id;
      `;

      // Assert
      expect(estatisticas).toBeDefined();
      expect(Array.isArray(estatisticas)).toBe(true);

      if ((estatisticas as any[]).length > 0) {
        const stats = (estatisticas as any[])[0];
        expect(stats).toHaveProperty('total_fichas_sistema');
        expect(stats).toHaveProperty('total_colaboradores_com_epis');
        expect(stats).toHaveProperty('tipos_epis_em_uso');
        expect(stats).toHaveProperty('total_itens_entregues');
        expect(stats).toHaveProperty('total_itens_ativos');
        expect(stats).toHaveProperty('total_fichas_ativas');
        expect(typeof stats.total_fichas_sistema).toBe('number');
        expect(typeof stats.total_colaboradores_com_epis).toBe('number');
        expect(typeof stats.tipos_epis_em_uso).toBe('number');
      }
    });

    it('deve buscar fichas sem itens de um tipo específico', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Fichas que NÃO têm itens do tipo específico
      const fichasSemTipo = await prismaService.fichaEPI.findMany({
        where: {
          NOT: {
            entregas: {
              some: {
                itens: {
                  some: {
                    estoqueItemOrigem: {
                      tipoEpiId: tipoEpi.id,
                    },
                  },
                },
              },
            },
          },
        },
        include: {
          colaborador: {
            select: {
              nome: true,
              matricula: true,
              setor: true,
            },
          },
        },
        orderBy: {
          colaborador: {
            nome: 'asc',
          },
        },
      });

      // Assert
      expect(fichasSemTipo).toBeDefined();
      expect(Array.isArray(fichasSemTipo)).toBe(true);

      // Verificar que nenhuma tem itens do tipo específico
      for (const ficha of fichasSemTipo) {
        const temTipo = await prismaService.entregaItem.findFirst({
          where: {
            entrega: {
              fichaEpiId: ficha.id,
            },
            estoqueItemOrigem: {
              tipoEpiId: tipoEpi.id,
            },
          },
        });
        expect(temTipo).toBeNull();
      }
    });
  });
});