import { describe, it, expect, beforeEach } from 'vitest';
import { RealizarAjusteDiretoUseCase } from '@application/use-cases/estoque/realizar-ajuste-direto.use-case';
import { EstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { MovimentacaoRepository } from '@infrastructure/repositories/movimentacao.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { StatusEstoqueItem, TipoMovimentacao } from '@domain/enums';
import { BusinessError } from '@domain/exceptions/business.exception';

describe('RealizarAjusteDiretoUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: RealizarAjusteDiretoUseCase;
  let estoqueRepository: EstoqueRepository;
  let movimentacaoRepository: MovimentacaoRepository;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        RealizarAjusteDiretoUseCase,
        {
          provide: 'IEstoqueRepository',
          useFactory: (prisma: PrismaService) => new EstoqueRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: 'IMovimentacaoRepository',
          useFactory: (prisma: PrismaService) => new MovimentacaoRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: EstoqueRepository,
          useFactory: (prisma: PrismaService) => new EstoqueRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: MovimentacaoRepository,
          useFactory: (prisma: PrismaService) => new MovimentacaoRepository(prisma),
          inject: [PrismaService],
        },
      ],
    });

    useCase = testSetup.app.get<RealizarAjusteDiretoUseCase>(RealizarAjusteDiretoUseCase);
    estoqueRepository = testSetup.app.get<EstoqueRepository>(EstoqueRepository);
    movimentacaoRepository = testSetup.app.get<MovimentacaoRepository>(MovimentacaoRepository);

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('execute - Ajustes Diretos de Estoque', () => {
    it('deve realizar ajuste positivo com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      expect(usuario).toBeDefined();
      expect(almoxarifado).toBeDefined();
      expect(tipoCapacete).toBeDefined();

      // Verificar estoque antes
      const estoqueAntes = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      const quantidadeAntes = estoqueAntes?.quantidade || 0;

      // Act - Realizar ajuste positivo
      const result = await useCase.execute({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
        quantidade: 15,
        justificativa: 'Ajuste de inventário - positivo',
        usuarioId: usuario.id,
      });

      // Assert - Verificar resultado do ajuste
      expect(result).toBeDefined();
      expect(result.quantidade).toBe(15);
      expect(result.tipoMovimentacao).toBe(TipoMovimentacao.AJUSTE_POSITIVO);

      // Verificar se o estoque foi atualizado
      const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      expect(estoqueDepois).toBeDefined();
      expect(estoqueDepois.quantidade).toBe(quantidadeAntes + 15);

      // Verificar se a movimentação foi registrada
      const movimentacoes = await testSetup.prismaService.movimentacaoEstoque.findMany({
        where: {
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: almoxarifado.id,
          tipo: TipoMovimentacao.AJUSTE_POSITIVO,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(movimentacoes).toHaveLength(1);
      expect(movimentacoes[0].quantidade).toBe(15);
      expect(movimentacoes[0].observacoes).toContain('Ajuste de inventário - positivo');
    });

    it('deve realizar ajuste negativo com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Garantir que há estoque suficiente para o ajuste negativo
      const estoqueAntes = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      if (!estoqueAntes || estoqueAntes.quantidade < 10) {
        // Criar ou ajustar estoque se necessário
        await testSetup.prismaService.estoqueItem.upsert({
          where: {
            almoxarifadoId_tipoEpiId_status: {
              almoxarifadoId: almoxarifado.id,
              tipoEpiId: tipoCapacete.id,
              status: StatusEstoqueItem.DISPONIVEL,
            },
          },
          update: { quantidade: 20 },
          create: {
            almoxarifadoId: almoxarifado.id,
            tipoEpiId: tipoCapacete.id,
            quantidade: 20,
            status: StatusEstoqueItem.DISPONIVEL,
            custoUnitario: 10.0,
          },
        });
      }

      // Verificar estoque antes do ajuste
      const estoqueAtualizado = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      const quantidadeAntes = estoqueAtualizado.quantidade;

      // Act - Realizar ajuste negativo
      const result = await useCase.execute({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
        quantidade: -5,
        justificativa: 'Ajuste de inventário - negativo',
        usuarioId: usuario.id,
      });

      // Assert - Verificar resultado do ajuste
      expect(result).toBeDefined();
      expect(result.quantidade).toBe(5); // Valor absoluto
      expect(result.tipoMovimentacao).toBe(TipoMovimentacao.AJUSTE_NEGATIVO);

      // Verificar se o estoque foi atualizado
      const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      expect(estoqueDepois).toBeDefined();
      expect(estoqueDepois.quantidade).toBe(quantidadeAntes - 5);

      // Verificar se a movimentação foi registrada
      const movimentacoes = await testSetup.prismaService.movimentacaoEstoque.findMany({
        where: {
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: almoxarifado.id,
          tipo: TipoMovimentacao.AJUSTE_NEGATIVO,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(movimentacoes).toHaveLength(1);
      expect(movimentacoes[0].quantidade).toBe(5);
      expect(movimentacoes[0].observacoes).toContain('Ajuste de inventário - negativo');
    });

    it('deve falhar ao tentar ajuste negativo sem estoque suficiente', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Garantir que o estoque é conhecido
      const estoqueAtual = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      const quantidadeAtual = estoqueAtual?.quantidade || 0;

      // Act & Assert - Deve falhar ao tentar ajuste negativo maior que o estoque
      await expect(useCase.execute({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
        quantidade: -(quantidadeAtual + 10), // Quantidade maior que o estoque
        justificativa: 'Ajuste negativo impossível',
        usuarioId: usuario.id,
      })).rejects.toThrow(BusinessError);
    });

    it('deve falhar ao tentar ajuste sem justificativa', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Act & Assert - Deve falhar ao tentar ajuste sem justificativa
      await expect(useCase.execute({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
        quantidade: 10,
        justificativa: '',
        usuarioId: usuario.id,
      })).rejects.toThrow(BusinessError);
    });
  });
});
