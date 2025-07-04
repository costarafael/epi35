import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RelatorioDescartesUseCase } from '@application/use-cases/queries/relatorio-descartes.use-case';
import { TipoMovimentacao } from '@domain/enums';

/**
 * Relatório de Descartes - Integration Tests
 * 
 * Testa o relatório específico de descartes de EPIs com filtros e estatísticas
 */
describe('Relatório de Descartes - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;
  let relatorioUseCase: RelatorioDescartesUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        // RelatorioDescartesUseCase
        {
          provide: RelatorioDescartesUseCase,
          useFactory: (prisma: PrismaService) => new RelatorioDescartesUseCase(prisma),
          inject: [PrismaService],
        },
      ],
    });
    
    prismaService = testSetup.prismaService;
    relatorioUseCase = testSetup.app.get<RelatorioDescartesUseCase>(RelatorioDescartesUseCase);
    await testSetup.resetTestData();
  });

  describe('Relatório de Descartes - Use Case Tests', () => {
    it('deve retornar relatório vazio quando não há descartes', async () => {
      // Act - Executar relatório sem descartes
      const relatorio = await relatorioUseCase.execute();

      // Assert
      expect(relatorio).toBeDefined();
      expect(relatorio.itens).toHaveLength(0);
      expect(relatorio.resumo.totalItensDescartados).toBe(0);
      expect(relatorio.resumo.quantidadeTotalDescartada).toBe(0);
      expect(relatorio.resumo.valorTotalDescartado).toBe(0);
      expect(relatorio.dataGeracao).toBeInstanceOf(Date);
    });

    it('deve listar descartes quando existem movimentações de descarte', async () => {
      // Arrange - Criar dados de teste
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      const usuario = await testSetup.findUser('admin@test.com');

      // Criar estoque item
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);

      // Criar movimentação de descarte
      await prismaService.movimentacaoEstoque.create({
        data: {
          estoqueItemId: estoqueItem.id,
          tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
          quantidadeMovida: 5,
          responsavelId: usuario.id,
          dataMovimentacao: new Date(),
        },
      });

      // Act
      const relatorio = await relatorioUseCase.execute();

      // Assert
      expect(relatorio.itens).toHaveLength(1);
      expect(relatorio.resumo.totalItensDescartados).toBe(1);
      expect(relatorio.resumo.quantidadeTotalDescartada).toBe(5);

      const item = relatorio.itens[0];
      expect(item.quantidadeDescartada).toBe(5);
      expect(item.almoxarifado.nome).toBe('Almoxarifado Central');
      expect(item.tipoEpi.numeroCa).toBe('CA-12345');
      expect(item.responsavel.email).toBe('admin@test.com');
    });

    it('deve filtrar descartes por almoxarifado', async () => {
      // Arrange
      const almoxarifadoCentral = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const almoxarifadoFilial = await testSetup.findAlmoxarifado('Almoxarifado Filial');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      const usuario = await testSetup.findUser('admin@test.com');

      // Criar estoques em diferentes almoxarifados
      const estoqueItemCentral = await testSetup.getEstoqueDisponivel(almoxarifadoCentral.id, tipoEpi.id);
      const estoqueItemFilial = await testSetup.getEstoqueDisponivel(almoxarifadoFilial.id, tipoEpi.id);

      // Criar descartes em ambos almoxarifados
      await prismaService.movimentacaoEstoque.createMany({
        data: [
          {
            estoqueItemId: estoqueItemCentral.id,
            tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
            quantidadeMovida: 3,
            responsavelId: usuario.id,
            dataMovimentacao: new Date(),
          },
          {
            estoqueItemId: estoqueItemFilial.id,
            tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
            quantidadeMovida: 2,
            responsavelId: usuario.id,
            dataMovimentacao: new Date(),
          },
        ],
      });

      // Act - Filtrar por almoxarifado central
      const relatorio = await relatorioUseCase.execute({
        almoxarifadoId: almoxarifadoCentral.id,
      });

      // Assert
      expect(relatorio.itens).toHaveLength(1);
      expect(relatorio.itens[0].almoxarifado.id).toBe(almoxarifadoCentral.id);
      expect(relatorio.itens[0].quantidadeDescartada).toBe(3);
    });

    it('deve filtrar descartes por período', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      const usuario = await testSetup.findUser('admin@test.com');
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);

      const hoje = new Date();
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      const semanaPassada = new Date(hoje);
      semanaPassada.setDate(hoje.getDate() - 7);

      // Criar descartes em diferentes datas
      await prismaService.movimentacaoEstoque.createMany({
        data: [
          {
            estoqueItemId: estoqueItem.id,
            tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
            quantidadeMovida: 1,
            responsavelId: usuario.id,
            dataMovimentacao: hoje,
          },
          {
            estoqueItemId: estoqueItem.id,
            tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
            quantidadeMovida: 2,
            responsavelId: usuario.id,
            dataMovimentacao: ontem,
          },
          {
            estoqueItemId: estoqueItem.id,
            tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
            quantidadeMovida: 3,
            responsavelId: usuario.id,
            dataMovimentacao: semanaPassada,
          },
        ],
      });

      // Act - Filtrar últimos 2 dias
      const relatorio = await relatorioUseCase.execute({
        dataInicio: ontem,
        dataFim: hoje,
      });

      // Assert - Deve incluir apenas descartes de hoje e ontem
      expect(relatorio.itens).toHaveLength(2);
      expect(relatorio.resumo.quantidadeTotalDescartada).toBe(3); // 1 + 2
    });

    it('deve calcular estatísticas corretamente', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      const usuario = await testSetup.findUser('admin@test.com');
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);

      // Criar descartes múltiplos
      await prismaService.movimentacaoEstoque.createMany({
        data: [
          {
            estoqueItemId: estoqueItem.id,
            tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
            quantidadeMovida: 5,
            responsavelId: usuario.id,
            dataMovimentacao: new Date(),
          },
          {
            estoqueItemId: estoqueItem.id,
            tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
            quantidadeMovida: 3,
            responsavelId: usuario.id,
            dataMovimentacao: new Date(),
          },
        ],
      });

      // Act
      const relatorio = await relatorioUseCase.execute();

      // Assert - Verificar resumo
      expect(relatorio.resumo.totalItensDescartados).toBe(2);
      expect(relatorio.resumo.quantidadeTotalDescartada).toBe(8);
      expect(relatorio.resumo.descartesPorAlmoxarifado).toHaveLength(1);
      expect(relatorio.resumo.descartesPorAlmoxarifado[0].almoxarifadoNome).toBe('Almoxarifado Central');
      expect(relatorio.resumo.descartesPorAlmoxarifado[0].quantidadeDescartada).toBe(8);
    });
  });

  describe('Estatísticas de Descartes', () => {
    it('deve retornar estatísticas dos últimos 30 dias', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      const usuario = await testSetup.findUser('admin@test.com');
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);

      // Criar descarte recente
      await prismaService.movimentacaoEstoque.create({
        data: {
          estoqueItemId: estoqueItem.id,
          tipoMovimentacao: TipoMovimentacao.SAIDA_DESCARTE,
          quantidadeMovida: 4,
          responsavelId: usuario.id,
          dataMovimentacao: new Date(),
        },
      });

      // Act
      const estatisticas = await relatorioUseCase.obterEstatisticasDescarte();

      // Assert
      expect(estatisticas.totalDescartes).toBe(1);
      expect(estatisticas.mediaMensalDescartes).toBe(1);
      expect(estatisticas.tipoEpiMaisDescartado).toBeDefined();
      expect(estatisticas.tipoEpiMaisDescartado!.nome).toContain('Capacete');
      expect(estatisticas.tipoEpiMaisDescartado!.quantidade).toBe(4);
      expect(estatisticas.ultimosDescartes).toHaveLength(1);
    });

    it('deve lidar com período sem descartes', async () => {
      // Act - Sem criar descartes
      const estatisticas = await relatorioUseCase.obterEstatisticasDescarte();

      // Assert
      expect(estatisticas.totalDescartes).toBe(0);
      expect(estatisticas.valorTotalDescartado).toBe(0);
      expect(estatisticas.tipoEpiMaisDescartado).toBeNull();
      expect(estatisticas.almoxarifadoComMaisDescartes).toBeNull();
      expect(estatisticas.ultimosDescartes).toHaveLength(0);
    });
  });
});