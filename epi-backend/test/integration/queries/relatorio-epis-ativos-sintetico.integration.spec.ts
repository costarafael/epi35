import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * R-03: EPIs Ativos com Colaboradores (Sintético)
 * 
 * Relatório sintético que mostra quantos EPIs de cada tipo estão com colaboradores.
 * Conforme documentação da consulta SQL:
 * SELECT 
 *   est.tipo_epi_id,
 *   te.nome_equipamento,
 *   COUNT(ei.id) as quantidade_com_colaboradores
 * FROM entrega_itens ei
 * JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
 * JOIN tipos_epi te ON est.tipo_epi_id = te.id
 * WHERE ei.status = 'COM_COLABORADOR'
 * GROUP BY est.tipo_epi_id, te.nome_equipamento;
 */
describe('Relatório R-03: EPIs Ativos com Colaboradores (Sintético) - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    prismaService = testSetup.prismaService;
    await testSetup.resetTestData();
  });

  describe('EPIs Ativos Sintético', () => {
    it('deve retornar resumo de EPIs com colaboradores agrupados por tipo', async () => {
      // Act - Executar consulta sintética conforme documentação
      const episAtivos = await prismaService.entregaItem.groupBy({
        by: ['estoqueItemOrigemId'],
        where: {
          status: 'COM_COLABORADOR',
        },
        _count: {
          id: true,
        },
      });

      // Buscar detalhes dos tipos agrupados
      const episAtivosSintetico = await prismaService.estoqueItem.findMany({
        where: {
          id: {
            in: episAtivos.map(item => item.estoqueItemOrigemId),
          },
        },
        include: {
          tipoEpi: {
            select: {
              id: true,
              nomeEquipamento: true,
              numeroCa: true,
              status: true,
            },
          },
          almoxarifado: {
            select: {
              nome: true,
            },
          },
        },
      });

      // Assert
      expect(episAtivos).toBeDefined();
      expect(Array.isArray(episAtivos)).toBe(true);
      expect(episAtivosSintetico).toBeDefined();
      expect(Array.isArray(episAtivosSintetico)).toBe(true);

      // Verificar estrutura dos dados
      episAtivos.forEach(item => {
        expect(item).toHaveProperty('estoqueItemOrigemId');
        expect(item).toHaveProperty('_count');
        expect(typeof item._count.id).toBe('number');
        expect(item._count.id).toBeGreaterThan(0);
      });

      episAtivosSintetico.forEach(item => {
        expect(item).toHaveProperty('tipoEpi');
        expect(item.tipoEpi).toHaveProperty('nomeEquipamento');
        expect(item.tipoEpi).toHaveProperty('numeroCa');
      });
    });

    it('deve executar consulta SQL direta conforme documentação', async () => {
      // Act - Executar consulta SQL raw conforme especificação R-03
      const result = await prismaService.$queryRaw`
        SELECT 
          est.tipo_epi_id,
          te.nome_equipamento,
          COUNT(ei.id)::int as quantidade_com_colaboradores
        FROM entrega_itens ei
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
        GROUP BY est.tipo_epi_id, te.nome_equipamento
        ORDER BY te.nome_equipamento;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura conforme especificação
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('tipo_epi_id');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('quantidade_com_colaboradores');
        expect(typeof firstItem.quantidade_com_colaboradores).toBe('number');
        expect(firstItem.quantidade_com_colaboradores).toBeGreaterThan(0);
      }
    });

    it('deve agrupar por almoxarifado e tipo de EPI', async () => {
      // Act - Consulta agrupada por almoxarifado e tipo
      const result = await prismaService.$queryRaw`
        SELECT 
          est.almoxarifado_id,
          alm.nome as almoxarifado_nome,
          est.tipo_epi_id,
          te.nome_equipamento,
          COUNT(ei.id)::int as quantidade_com_colaboradores
        FROM entrega_itens ei
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        JOIN almoxarifados alm ON est.almoxarifado_id = alm.id
        WHERE ei.status = 'COM_COLABORADOR'
        GROUP BY est.almoxarifado_id, alm.nome, est.tipo_epi_id, te.nome_equipamento
        ORDER BY alm.nome, te.nome_equipamento;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Verificar estrutura
      if ((result as any[]).length > 0) {
        const firstItem = (result as any[])[0];
        expect(firstItem).toHaveProperty('almoxarifado_id');
        expect(firstItem).toHaveProperty('almoxarifado_nome');
        expect(firstItem).toHaveProperty('tipo_epi_id');
        expect(firstItem).toHaveProperty('nome_equipamento');
        expect(firstItem).toHaveProperty('quantidade_com_colaboradores');
      }
    });

    it('deve calcular totais gerais de EPIs ativos', async () => {
      // Act - Calcular totais
      const totais = await prismaService.entregaItem.aggregate({
        where: {
          status: 'COM_COLABORADOR',
        },
        _count: {
          id: true,
        },
      });

      const tiposUnicos = await prismaService.entregaItem.groupBy({
        by: ['estoqueItemOrigemId'],
        where: {
          status: 'COM_COLABORADOR',
        },
      });

      // Assert
      expect(totais).toBeDefined();
      expect(totais._count.id).toBeGreaterThanOrEqual(0);
      
      expect(tiposUnicos).toBeDefined();
      expect(Array.isArray(tiposUnicos)).toBe(true);
    });

    it('deve filtrar EPIs ativos por período de entrega', async () => {
      // Arrange - Definir período (últimos 30 dias)
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 30);

      // Act - Filtrar por período de entrega
      const result = await prismaService.$queryRaw`
        SELECT 
          est.tipo_epi_id,
          te.nome_equipamento,
          COUNT(ei.id)::int as quantidade_com_colaboradores
        FROM entrega_itens ei
        JOIN entregas ent ON ei.entrega_id = ent.id
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
          AND ent.data_entrega >= ${dataInicio}
          AND ent.data_entrega <= ${dataFim}
        GROUP BY est.tipo_epi_id, te.nome_equipamento
        ORDER BY te.nome_equipamento;
      `;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('deve comparar EPIs ativos vs disponíveis em estoque', async () => {
      // Act - EPIs com colaboradores
      const episComColaboradores = await prismaService.$queryRaw`
        SELECT 
          est.tipo_epi_id,
          te.nome_equipamento,
          COUNT(ei.id)::int as quantidade_com_colaboradores
        FROM entrega_itens ei
        JOIN estoque_itens est ON ei.estoque_item_origem_id = est.id
        JOIN tipos_epi te ON est.tipo_epi_id = te.id
        WHERE ei.status = 'COM_COLABORADOR'
        GROUP BY est.tipo_epi_id, te.nome_equipamento;
      `;

      // EPIs disponíveis em estoque
      const episDisponiveis = await prismaService.estoqueItem.groupBy({
        by: ['tipoEpiId'],
        where: {
          status: 'DISPONIVEL',
        },
        _sum: {
          quantidade: true,
        },
      });

      // Assert
      expect(episComColaboradores).toBeDefined();
      expect(episDisponiveis).toBeDefined();
      expect(Array.isArray(episComColaboradores)).toBe(true);
      expect(Array.isArray(episDisponiveis)).toBe(true);
    });

    it('deve listar EPIs sem nenhum item ativo com colaboradores', async () => {
      // Act - Tipos de EPI que não têm itens com colaboradores
      const tiposComItens = await prismaService.entregaItem.findMany({
        where: {
          status: 'COM_COLABORADOR',
        },
        select: {
          estoqueItemOrigem: {
            select: {
              tipoEpiId: true,
            },
          },
        },
      });

      const tipoIdsComItens = [...new Set(
        tiposComItens.map(item => item.estoqueItemOrigem.tipoEpiId)
      )];

      const tiposSemItensAtivos = await prismaService.tipoEPI.findMany({
        where: {
          id: {
            notIn: tipoIdsComItens,
          },
          status: 'ATIVO',
        },
        select: {
          id: true,
          nomeEquipamento: true,
          numeroCa: true,
        },
      });

      // Assert
      expect(tiposSemItensAtivos).toBeDefined();
      expect(Array.isArray(tiposSemItensAtivos)).toBe(true);

      // Verificar que nenhum desses tipos tem itens ativos
      tiposSemItensAtivos.forEach(tipo => {
        expect(tipoIdsComItens).not.toContain(tipo.id);
      });
    });
  });
});