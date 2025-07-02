import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * R-06: EPIs Devolvidos em Análise/Quarentena
 * 
 * Relatório que mostra todos os EPIs devolvidos que estão aguardando inspeção ou em quarentena.
 * Conforme documentação da consulta SQL:
 * SELECT * FROM estoque_itens 
 * WHERE status IN ('AGUARDANDO_INSPECAO', 'QUARENTENA');
 */
describe('Relatório R-06: EPIs Devolvidos em Análise/Quarentena - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    prismaService = testSetup.prismaService;
    await testSetup.resetTestData();
  });

  describe('EPIs em Análise/Quarentena', () => {
    it('deve retornar EPIs em análise/quarentena conforme especificação SQL', async () => {
      // Act - Executar consulta SQL raw conforme especificação R-06
      const result = await prismaService.$queryRaw`
        SELECT 
          ei.id,
          ei.quantidade,
          ei.status,
          ei.created_at,
          ei.updated_at,
          te.nome_equipamento,
          te.numero_ca,
          te.descricao as tipo_descricao,
          a.nome as almoxarifado_nome,
          un.nome as unidade_negocio_nome
        FROM estoque_itens ei
        JOIN tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN almoxarifados a ON ei.almoxarifado_id = a.id
        JOIN unidades_negocio un ON a.unidade_negocio_id = un.id
        WHERE ei.status IN ('AGUARDANDO_INSPECAO', 'QUARENTENA')
        ORDER BY ei.updated_at DESC, te.nome_equipamento;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura conforme especificação
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('id');
        expect(firstItem).toHaveProperty('quantidade');
        expect(firstItem).toHaveProperty('status');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('numero_ca');
        expect(firstItem).toHaveProperty('almoxarifado_nome');
        expect(['AGUARDANDO_INSPECAO', 'QUARENTENA']).toContain(firstItem.status);
        expect(typeof firstItem.quantidade).toBe('number');
        expect(firstItem.quantidade).toBeGreaterThanOrEqual(0);
      }
    });

    it('deve usar Prisma ORM para buscar EPIs em análise/quarentena', async () => {
      // Act - Usando Prisma ORM
      const episEmAnalise = await prismaService.estoqueItem.findMany({
        where: {
          status: {
            in: ['AGUARDANDO_INSPECAO', 'QUARENTENA'],
          },
        },
        include: {
          tipoEpi: {
            select: {
              nomeEquipamento: true,
              numeroCa: true,
              descricao: true,
              vidaUtilDias: true,
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
        orderBy: [
          { updatedAt: 'desc' },
          { tipoEpi: { nomeEquipamento: 'asc' } },
        ],
      });

      // Assert
      expect(episEmAnalise).toBeDefined();
      expect(Array.isArray(episEmAnalise)).toBe(true);

      // Verificar que todos estão em análise ou quarentena
      episEmAnalise.forEach(item => {
        expect(['AGUARDANDO_INSPECAO', 'QUARENTENA']).toContain(item.status);
        expect(item.quantidade).toBeGreaterThanOrEqual(0);
        expect(item.tipoEpi).toHaveProperty('nomeEquipamento');
        expect(item.almoxarifado).toHaveProperty('nome');
      });
    });

    it('deve filtrar apenas EPIs aguardando inspeção', async () => {
      // Act - Filtrar apenas aguardando inspeção
      const aguardandoInspecao = await prismaService.estoqueItem.findMany({
        where: {
          status: 'AGUARDANDO_INSPECAO',
        },
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
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Assert
      expect(aguardandoInspecao).toBeDefined();
      expect(Array.isArray(aguardandoInspecao)).toBe(true);

      // Todos devem estar aguardando inspeção
      aguardandoInspecao.forEach(item => {
        expect(item.status).toBe('AGUARDANDO_INSPECAO');
      });
    });

    it('deve filtrar apenas EPIs em quarentena', async () => {
      // Act - Filtrar apenas em quarentena
      const emQuarentena = await prismaService.estoqueItem.findMany({
        where: {
          status: 'QUARENTENA',
        },
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
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Assert
      expect(emQuarentena).toBeDefined();
      expect(Array.isArray(emQuarentena)).toBe(true);

      // Todos devem estar em quarentena
      emQuarentena.forEach(item => {
        expect(item.status).toBe('QUARENTENA');
      });
    });

    it('deve filtrar EPIs em análise/quarentena por almoxarifado', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Act - Filtrar por almoxarifado
      const result = await prismaService.$queryRaw`
        SELECT 
          ei.id,
          ei.quantidade,
          ei.status,
          te.nome_equipamento,
          a.nome as almoxarifado_nome
        FROM estoque_itens ei
        JOIN tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN almoxarifados a ON ei.almoxarifado_id = a.id
        WHERE ei.status IN ('AGUARDANDO_INSPECAO', 'QUARENTENA')
          AND a.id = ${almoxarifado.id}
        ORDER BY ei.status, te.nome_equipamento;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ser do almoxarifado específico
      (result as any[]).forEach(item => {
        expect(item.almoxarifado_nome).toBe('Almoxarifado Central');
        expect(['AGUARDANDO_INSPECAO', 'QUARENTENA']).toContain(item.status);
      });
    });

    it('deve filtrar EPIs em análise/quarentena por tipo de EPI', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Act - Filtrar por tipo de EPI
      const result = await prismaService.$queryRaw`
        SELECT 
          ei.id,
          ei.quantidade,
          ei.status,
          te.nome_equipamento,
          te.numero_ca
        FROM estoque_itens ei
        JOIN tipos_epi te ON ei.tipo_epi_id = te.id
        WHERE ei.status IN ('AGUARDANDO_INSPECAO', 'QUARENTENA')
          AND te.id = ${tipoEpi.id}
        ORDER BY ei.status, ei.quantidade DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Todos devem ser do tipo específico
      (result as any[]).forEach(item => {
        expect(item.numero_ca).toBe('CA-12345');
        expect(['AGUARDANDO_INSPECAO', 'QUARENTENA']).toContain(item.status);
      });
    });

    it('deve agrupar EPIs por status (aguardando inspeção vs quarentena)', async () => {
      // Act - Agrupar por status
      const result = await prismaService.$queryRaw`
        SELECT 
          ei.status,
          COUNT(ei.id)::int as total_itens,
          SUM(ei.quantidade)::int as total_quantidade,
          COUNT(DISTINCT ei.tipo_epi_id)::int as tipos_diferentes,
          COUNT(DISTINCT ei.almoxarifado_id)::int as almoxarifados_diferentes
        FROM estoque_itens ei
        WHERE ei.status IN ('AGUARDANDO_INSPECAO', 'QUARENTENA')
        GROUP BY ei.status
        ORDER BY ei.status;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura dos agrupamentos
      if ((result as any[]).length > 0) {
        (result as any[]).forEach(item => {
          expect(item).toHaveProperty('status');
          expect(item).toHaveProperty('total_itens');
          expect(item).toHaveProperty('total_quantidade');
          expect(item).toHaveProperty('tipos_diferentes');
          expect(item).toHaveProperty('almoxarifados_diferentes');
          expect(['AGUARDANDO_INSPECAO', 'QUARENTENA']).toContain(item.status);
          expect(item.total_itens).toBeGreaterThan(0);
          expect(item.total_quantidade).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it('deve agrupar EPIs por tipo', async () => {
      // Act - Agrupar por tipo de EPI
      const result = await prismaService.$queryRaw`
        SELECT 
          te.nome_equipamento,
          te.numero_ca,
          COUNT(ei.id)::int as total_itens_analise,
          SUM(ei.quantidade)::int as total_quantidade_analise,
          COUNT(CASE WHEN ei.status = 'AGUARDANDO_INSPECAO' THEN 1 END)::int as itens_aguardando_inspecao,
          COUNT(CASE WHEN ei.status = 'QUARENTENA' THEN 1 END)::int as itens_em_quarentena
        FROM estoque_itens ei
        JOIN tipos_epi te ON ei.tipo_epi_id = te.id
        WHERE ei.status IN ('AGUARDANDO_INSPECAO', 'QUARENTENA')
        GROUP BY te.id, te.nome_equipamento, te.numero_ca
        ORDER BY total_quantidade_analise DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura dos agrupamentos
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('numero_ca');
        expect(firstItem).toHaveProperty('total_itens_analise');
        expect(firstItem).toHaveProperty('total_quantidade_analise');
        expect(firstItem).toHaveProperty('itens_aguardando_inspecao');
        expect(firstItem).toHaveProperty('itens_em_quarentena');
        expect(firstItem.total_itens_analise).toBeGreaterThan(0);
        expect(firstItem.total_quantidade_analise).toBeGreaterThanOrEqual(0);
      }
    });

    it('deve calcular estatísticas gerais de EPIs em análise', async () => {
      // Act - Calcular estatísticas
      const estatisticas = await prismaService.$queryRaw`
        SELECT 
          COUNT(ei.id)::int as total_itens_analise,
          SUM(ei.quantidade)::int as total_quantidade_analise,
          COUNT(DISTINCT ei.tipo_epi_id)::int as tipos_epis_diferentes,
          COUNT(DISTINCT ei.almoxarifado_id)::int as almoxarifados_com_analise,
          COUNT(CASE WHEN ei.status = 'AGUARDANDO_INSPECAO' THEN 1 END)::int as total_aguardando_inspecao,
          COUNT(CASE WHEN ei.status = 'QUARENTENA' THEN 1 END)::int as total_em_quarentena,
          AVG(ei.quantidade)::numeric(10,2) as media_quantidade_por_item
        FROM estoque_itens ei
        WHERE ei.status IN ('AGUARDANDO_INSPECAO', 'QUARENTENA');
      `;

      // Assert
      expect(estatisticas).toBeDefined();
      expect(Array.isArray(estatisticas)).toBe(true);

      if ((estatisticas as any[]).length > 0) {
        const stats = (estatisticas as any[])[0];
        expect(stats).toHaveProperty('total_itens_analise');
        expect(stats).toHaveProperty('total_quantidade_analise');
        expect(stats).toHaveProperty('tipos_epis_diferentes');
        expect(stats).toHaveProperty('almoxarifados_com_analise');
        expect(stats).toHaveProperty('total_aguardando_inspecao');
        expect(stats).toHaveProperty('total_em_quarentena');
        expect(typeof stats.total_itens_analise).toBe('number');
        expect(typeof stats.total_quantidade_analise).toBe('number');
      }
    });

    it('deve buscar histórico de movimentações dos EPIs em análise', async () => {
      // Act - Buscar histórico
      const result = await prismaService.$queryRaw`
        SELECT 
          ei.id as estoque_item_id,
          ei.status as status_atual,
          te.nome_equipamento,
          a.nome as almoxarifado,
          m.data_movimentacao,
          m.tipo_movimentacao,
          m.quantidade_movida,
          u.nome as responsavel
        FROM estoque_itens ei
        JOIN tipos_epi te ON ei.tipo_epi_id = te.id
        JOIN almoxarifados a ON ei.almoxarifado_id = a.id
        LEFT JOIN movimentacoes_estoque m ON ei.id = m.estoque_item_id
        LEFT JOIN usuarios u ON m.responsavel_id = u.id
        WHERE ei.status IN ('AGUARDANDO_INSPECAO', 'QUARENTENA')
        ORDER BY ei.id, m.data_movimentacao DESC;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura com histórico
      if ((result as any[]).length > 0) {
        (result as any[]).forEach(item => {
          expect(item).toHaveProperty('status_atual');
          expect(['AGUARDANDO_INSPECAO', 'QUARENTENA']).toContain(item.status_atual);
          expect(item).toHaveProperty('nome_equipamento');
          expect(item).toHaveProperty('almoxarifado');
          // Movimentação pode ser null se não houver histórico
          if (item.data_movimentacao) {
            expect(item).toHaveProperty('tipo_movimentacao');
            expect(item).toHaveProperty('quantidade_movida');
            expect(item).toHaveProperty('responsavel');
          }
        });
      }
    });
  });
});