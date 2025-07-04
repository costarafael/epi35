import { describe, it, expect, beforeEach } from 'vitest';
import { RealizarAjusteDirectoUseCase } from '@application/use-cases/estoque/realizar-ajuste-direto.use-case';
import { EstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { MovimentacaoRepository } from '@infrastructure/repositories/movimentacao.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { StatusEstoqueItem, TipoMovimentacao } from '@domain/enums';
import { BusinessError } from '@domain/exceptions/business.exception';

describe('RealizarAjusteDirectoUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: RealizarAjusteDirectoUseCase;
  // let _estoqueRepository: EstoqueRepository;
  // let _movimentacaoRepository: MovimentacaoRepository;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        RealizarAjusteDirectoUseCase,
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

    useCase = testSetup.app.get<RealizarAjusteDirectoUseCase>(RealizarAjusteDirectoUseCase);
    // _notaRepository = testSetup.app.get<EstoqueRepository>(EstoqueRepository);
    // _notaRepository = testSetup.app.get<MovimentacaoRepository>(MovimentacaoRepository);

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
      const result = await useCase.executarAjusteDirecto({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
        novaQuantidade: 15,
        motivo: 'Ajuste de inventário - positivo',
        usuarioId: usuario.id,
      });

      // Assert - Verificar resultado do ajuste
      expect(result).toBeDefined();
      expect(result.movimentacaoId).toBeDefined();
      expect(result.diferenca).toBe(15);
      expect(result.saldoPosterior).toBe(quantidadeAntes + 15);

      // Verificar se o estoque foi atualizado
      const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      expect(estoqueDepois).toBeDefined();
      expect(estoqueDepois.quantidade).toBe(quantidadeAntes + 15);

      // Verificar se a movimentação foi registrada
      const movimentacoes = await testSetup.prismaService.movimentacaoEstoque.findMany({
        where: {
          estoqueItem: { 
            tipoEpiId: tipoCapacete.id,
            almoxarifadoId: almoxarifado.id 
          },
          tipoMovimentacao: TipoMovimentacao.AJUSTE_POSITIVO,
        },
        orderBy: { dataMovimentacao: 'desc' },
        take: 1,
      });

      expect(movimentacoes).toHaveLength(1);
      expect(movimentacoes[0].quantidadeMovida).toBe(15);
      // Note: observacoes field removed from movimentacao schema v3.5
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
      const result = await useCase.executarAjusteDirecto({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
        novaQuantidade: quantidadeAntes - 5,
        motivo: 'Ajuste de inventário - negativo',
        usuarioId: usuario.id,
      });

      // Assert - Verificar resultado do ajuste
      expect(result).toBeDefined();
      expect(result.movimentacaoId).toBeDefined();
      expect(result.diferenca).toBe(-5); // Valor da diferença
      expect(result.saldoPosterior).toBe(quantidadeAntes - 5);

      // Verificar se o estoque foi atualizado
      const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      expect(estoqueDepois).toBeDefined();
      expect(estoqueDepois.quantidade).toBe(quantidadeAntes - 5);

      // Verificar se a movimentação foi registrada
      const movimentacoes = await testSetup.prismaService.movimentacaoEstoque.findMany({
        where: {
          estoqueItem: { 
            tipoEpiId: tipoCapacete.id,
            almoxarifadoId: almoxarifado.id 
          },
          tipoMovimentacao: TipoMovimentacao.AJUSTE_NEGATIVO,
        },
        orderBy: { dataMovimentacao: 'desc' },
        take: 1,
      });

      expect(movimentacoes).toHaveLength(1);
      expect(movimentacoes[0].quantidadeMovida).toBe(5);
      // Note: observacoes field removed from movimentacao schema v3.5
    });

    it('deve falhar ao tentar ajuste negativo sem estoque suficiente', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Garantir que o estoque é conhecido
      await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      // const _quantidadeAtual = estoqueAtual?.quantidade || 0;

      // Act & Assert - Deve falhar ao tentar ajuste negativo maior que o estoque
      await expect(useCase.executarAjusteDirecto({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
        novaQuantidade: -10, // Quantidade negativa impossível
        motivo: 'Ajuste negativo impossível',
        usuarioId: usuario.id,
      })).rejects.toThrow(BusinessError);
    });

    it('deve falhar ao tentar ajuste sem justificativa', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Act & Assert - Deve falhar ao tentar ajuste sem justificativa
      await expect(useCase.executarAjusteDirecto({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
        novaQuantidade: 10,
        motivo: '',
        usuarioId: usuario.id,
      })).rejects.toThrow(BusinessError);
    });
  });
});
