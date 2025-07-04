import { describe, it, expect, beforeEach } from 'vitest';
import { RelatorioPosicaoEstoqueUseCase } from '@application/use-cases/queries/relatorio-posicao-estoque.use-case';
import { EstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ConfiguracaoService } from '@domain/services/configuracao.service';
import { ConfigService } from '@nestjs/config';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { StatusEstoqueItem, TipoMovimentacao } from '@domain/enums';

describe('RelatorioPosicaoEstoqueUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: RelatorioPosicaoEstoqueUseCase;
  // let _estoqueRepository: EstoqueRepository;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        // Config Service
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                PERMITIR_ESTOQUE_NEGATIVO: 'false',
                PERMITIR_AJUSTES_FORCADOS: 'false',
                ESTOQUE_MINIMO_EQUIPAMENTO: '10',
              };
              return config[key] || process.env[key];
            },
          },
        },
        // ConfiguracaoService
        {
          provide: ConfiguracaoService,
          useFactory: (configService: ConfigService, prisma: PrismaService) => new ConfiguracaoService(configService, prisma),
          inject: [ConfigService, PrismaService],
        },
        // EstoqueRepository
        {
          provide: 'IEstoqueRepository',
          useFactory: (prismaService: PrismaService) => new EstoqueRepository(prismaService),
          inject: [PrismaService],
        },
        // RelatorioPosicaoEstoqueUseCase
        {
          provide: RelatorioPosicaoEstoqueUseCase,
          useFactory: (estoqueRepository: EstoqueRepository, prisma: PrismaService, configuracaoService: ConfiguracaoService) => 
            new RelatorioPosicaoEstoqueUseCase(estoqueRepository, prisma, configuracaoService),
          inject: ['IEstoqueRepository', PrismaService, ConfiguracaoService],
        },
      ],
    });

    useCase = testSetup.app.get<RelatorioPosicaoEstoqueUseCase>(RelatorioPosicaoEstoqueUseCase);
    // _notaRepository = testSetup.app.get<EstoqueRepository>('IEstoqueRepository');

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('execute - Relatório de Posição de Estoque', () => {
    it('deve gerar relatório completo com dados reais do estoque', async () => {
      // Arrange - Os dados vêm do seed, vamos verificar se existem
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      expect(almoxarifado).toBeDefined();

      // Act - Gerar relatório sem filtros
      const result = await useCase.execute();

      // Assert - Verificar estrutura do relatório
      expect(result).toBeDefined();
      expect(result.itens).toBeDefined();
      expect(result.resumo).toBeDefined();
      expect(result.dataGeracao).toBeInstanceOf(Date);

      // Deve ter pelo menos alguns itens do seed
      expect(result.itens.length).toBeGreaterThan(0);

      // Verificar estrutura dos itens
      const primeiroItem = result.itens[0];
      expect(primeiroItem).toHaveProperty('almoxarifadoId');
      expect(primeiroItem).toHaveProperty('tipoEpiId');
      expect(primeiroItem).toHaveProperty('almoxarifadoNome');
      expect(primeiroItem).toHaveProperty('tipoEpiNome');
      expect(primeiroItem).toHaveProperty('tipoEpiCodigo');
      expect(primeiroItem).toHaveProperty('saldoDisponivel');
      expect(primeiroItem).toHaveProperty('saldoReservado');
      expect(primeiroItem).toHaveProperty('saldoTotal');
      expect(primeiroItem).toHaveProperty('situacao');
      expect(primeiroItem).toHaveProperty('unidadeNegocioNome');

      // Verificar valores numéricos
      expect(primeiroItem.saldoDisponivel).toBeGreaterThanOrEqual(0);
      expect(primeiroItem.saldoReservado).toBeGreaterThanOrEqual(0);
      expect(primeiroItem.saldoTotal).toBe(primeiroItem.saldoDisponivel + primeiroItem.saldoReservado);

      // Verificar resumo
      expect(result.resumo.totalItens).toBe(result.itens.length);
      expect(result.resumo.valorTotalEstoque).toBeGreaterThanOrEqual(0);
      expect(result.resumo.itensSemEstoque).toBeGreaterThanOrEqual(0);
      // expect(result.resumo.itensEstoqueCritico).toBeGreaterThanOrEqual(0); // Removido status CRÍTICO
      expect(result.resumo.itensBaixoEstoque).toBeGreaterThanOrEqual(0);
      expect(result.resumo.porAlmoxarifado).toBeDefined();
      expect(result.resumo.porTipoEpi).toBeDefined();
    });

    it('deve filtrar por almoxarifado específico', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Act
      const result = await useCase.execute({
        almoxarifadoId: almoxarifado.id,
      });

      // Assert
      expect(result.itens.length).toBeGreaterThan(0);
      
      // Todos os itens devem ser do almoxarifado específico
      result.itens.forEach(item => {
        expect(item.almoxarifadoId).toBe(almoxarifado.id);
        expect(item.almoxarifadoNome).toBe(almoxarifado.nome);
      });
    });

    it('deve filtrar por tipo de EPI específico', async () => {
      // Arrange
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Act
      const result = await useCase.execute({
        tipoEpiId: tipoCapacete.id,
      });

      // Assert
      expect(result.itens.length).toBeGreaterThan(0);
      
      // Todos os itens devem ser do tipo EPI específico
      result.itens.forEach(item => {
        expect(item.tipoEpiId).toBe(tipoCapacete.id);
        expect(item.tipoEpiNome).toBe(tipoCapacete.nomeEquipamento);
      });
    });

    it('deve filtrar apenas itens com saldo quando apenasComSaldo=true', async () => {
      // Act
      const result = await useCase.execute({
        apenasComSaldo: true,
      });

      // Assert
      expect(result.itens.length).toBeGreaterThan(0);
      
      // Todos os itens devem ter saldo total > 0
      result.itens.forEach(item => {
        expect(item.saldoTotal).toBeGreaterThan(0);
      });
    });

    it('deve filtrar apenas itens abaixo do mínimo quando apenasAbaixoMinimo=true', async () => {
      // Act
      const result = await useCase.execute({
        apenasAbaixoMinimo: true,
      });

      // Assert - Pode não haver itens abaixo do mínimo nos dados de seed
      if (result.itens.length > 0) {
        // Se houver itens, devem estar com situação baixa ou zero
        result.itens.forEach(item => {
          expect(['BAIXO', 'ZERO']).toContain(item.situacao);
        });
      }
    });

    it('deve combinar múltiplos filtros corretamente', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Act
      const result = await useCase.execute({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
        apenasComSaldo: true,
      });

      // Assert
      if (result.itens.length > 0) {
        result.itens.forEach(item => {
          expect(item.almoxarifadoId).toBe(almoxarifado.id);
          expect(item.tipoEpiId).toBe(tipoCapacete.id);
          expect(item.saldoTotal).toBeGreaterThan(0);
        });
      }
    });

    it('deve classificar situação do estoque corretamente', async () => {
      // Arrange - Criar itens de teste com diferentes níveis de estoque
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoTeste1 = await testSetup.findTipoEpi('CA-12345');
      const tipoTeste2 = await testSetup.findTipoEpi('CA-67890');

      // Modificar estoques para testar classificações
      await testSetup.prismaService.estoqueItem.upsert({
        where: {
          almoxarifadoId_tipoEpiId_status: {
            almoxarifadoId: almoxarifado.id,
            tipoEpiId: tipoTeste1.id,
            status: StatusEstoqueItem.DISPONIVEL,
          },
        },
        update: { quantidade: 0 }, // ZERO
        create: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoTeste1.id,
          status: StatusEstoqueItem.DISPONIVEL,
          quantidade: 0,
        },
      });

      await testSetup.prismaService.estoqueItem.upsert({
        where: {
          almoxarifadoId_tipoEpiId_status: {
            almoxarifadoId: almoxarifado.id,
            tipoEpiId: tipoTeste2.id,
            status: StatusEstoqueItem.DISPONIVEL,
          },
        },
        update: { quantidade: 3 }, // BAIXO (<10)
        create: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoTeste2.id,
          status: StatusEstoqueItem.DISPONIVEL,
          quantidade: 3,
        },
      });

      // Act
      const result = await useCase.execute({
        almoxarifadoId: almoxarifado.id,
      });

      // Assert
      const itemZero = result.itens.find(item => 
        item.tipoEpiId === tipoTeste1.id && item.saldoTotal === 0
      );
      const itemBaixo = result.itens.find(item => 
        item.tipoEpiId === tipoTeste2.id && item.saldoTotal === 3
      );

      if (itemZero) {
        expect(itemZero.situacao).toBe('ZERO');
      }
      if (itemBaixo) {
        expect(itemBaixo.situacao).toBe('BAIXO');
      }
    });
  });

  describe('obterKardexItem - Kardex com Dados Reais', () => {
    it('deve retornar kardex de movimentações de um item específico', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar algumas movimentações de teste
      const usuario = await testSetup.findUser('admin@test.com');
      // Get or create estoque item for movimentações
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      
      await testSetup.prismaService.movimentacaoEstoque.createMany({
        data: [
          {
            estoqueItemId: estoqueItem.id,
            tipoMovimentacao: TipoMovimentacao.ENTRADA_NOTA,
            quantidadeMovida: 100,
            responsavelId: usuario.id,
            // Note: saldoAnterior, saldoPosterior, observacoes removed from schema v3.5
          },
          {
            estoqueItemId: estoqueItem.id,
            tipoMovimentacao: TipoMovimentacao.SAIDA_ENTREGA,
            quantidadeMovida: 20,
            responsavelId: usuario.id,
            // Note: saldoAnterior, saldoPosterior, observacoes removed from schema v3.5
          },
        ],
      });

      // Act
      const result = await useCase.obterKardexItem(almoxarifado.id, tipoCapacete.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.movimentacoes).toBeDefined();
      expect(result.movimentacoes.length).toBeGreaterThanOrEqual(2);
      expect(result.totalEntradas).toBeGreaterThanOrEqual(100);
      expect(result.totalSaidas).toBeGreaterThanOrEqual(20);
      expect(result.saldoFinal).toBeGreaterThanOrEqual(80);

      // Verificar estrutura das movimentações
      const primeiraMovimentacao = result.movimentacoes[0];
      expect(primeiraMovimentacao).toHaveProperty('data');
      expect(primeiraMovimentacao).toHaveProperty('entrada');
      expect(primeiraMovimentacao).toHaveProperty('saida');
      expect(primeiraMovimentacao).toHaveProperty('saldo');
      expect(primeiraMovimentacao).toHaveProperty('documento');
      expect(primeiraMovimentacao).toHaveProperty('observacoes');

      // Verificar que movimentações estão ordenadas por data
      for (let i = 1; i < result.movimentacoes.length; i++) {
        const dataAnterior = new Date(result.movimentacoes[i - 1].data);
        const dataAtual = new Date(result.movimentacoes[i].data);
        expect(dataAnterior.getTime()).toBeLessThanOrEqual(dataAtual.getTime());
      }
    });

    it('deve filtrar kardex por período específico', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoLuva = await testSetup.findTipoEpi('CA-67890');
      const dataInicio = new Date('2024-01-15');
      const dataFim = new Date('2024-12-31');

      // Act
      const result = await useCase.obterKardexItem(
        almoxarifado.id, 
        tipoLuva.id, 
        dataInicio, 
        dataFim
      );

      // Assert
      expect(result).toBeDefined();
      
      // Verificar que todas as movimentações estão no período
      result.movimentacoes.forEach(mov => {
        const dataMovimentacao = new Date(mov.data);
        expect(dataMovimentacao.getTime()).toBeGreaterThanOrEqual(dataInicio.getTime());
        expect(dataMovimentacao.getTime()).toBeLessThanOrEqual(dataFim.getTime());
      });
    });

    it('deve tratar movimentações de ajuste corretamente no kardex', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoOculos = await testSetup.findTipoEpi('CA-11111');
      const usuario = await testSetup.findUser('admin@test.com');

      // Get or create estoque item first
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoOculos.id);
      
      // Criar movimentação de ajuste
      await testSetup.prismaService.movimentacaoEstoque.create({
        data: {
          estoqueItemId: estoqueItem.id,
          tipoMovimentacao: TipoMovimentacao.AJUSTE_POSITIVO,
          quantidadeMovida: 10,
          responsavelId: usuario.id,
        },
      });

      // Act
      const result = await useCase.obterKardexItem(almoxarifado.id, tipoOculos.id);

      // Assert
      const movimentacaoAjuste = result.movimentacoes.find(mov => 
        mov.observacoes?.includes('inventário')
      );

      if (movimentacaoAjuste) {
        // Ajuste positivo deve aparecer como entrada
        expect(movimentacaoAjuste.entrada).toBeGreaterThan(0);
        expect(movimentacaoAjuste.saida).toBe(0);
      }
    });
  });

  describe('obterAnaliseGiroEstoque - Análise com Dados Reais', () => {
    it('deve calcular análise de giro de estoque baseada em movimentações reais', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Act
      const result = await useCase.obterAnaliseGiroEstoque(almoxarifado.id, 'TRIMESTRAL');

      // Assert
      expect(result).toBeDefined();
      expect(result.analise).toBeDefined();
      expect(result.periodoAnalise).toBeDefined();
      expect(result.periodoAnalise.inicio).toBeInstanceOf(Date);
      expect(result.periodoAnalise.fim).toBeInstanceOf(Date);

      if (result.analise.length > 0) {
        // Verificar estrutura da análise
        const primeiraAnalise = result.analise[0];
        expect(primeiraAnalise).toHaveProperty('tipoEpiId');
        expect(primeiraAnalise).toHaveProperty('tipoEpiNome');
        expect(primeiraAnalise).toHaveProperty('estoqueAtual');
        expect(primeiraAnalise).toHaveProperty('consumoMedio');
        expect(primeiraAnalise).toHaveProperty('giroEstoque');
        expect(primeiraAnalise).toHaveProperty('diasEstoque');
        expect(primeiraAnalise).toHaveProperty('classificacao');
        expect(primeiraAnalise).toHaveProperty('recomendacao');

        // Verificar valores numéricos
        expect(primeiraAnalise.estoqueAtual).toBeGreaterThanOrEqual(0);
        expect(primeiraAnalise.consumoMedio).toBeGreaterThanOrEqual(0);
        expect(primeiraAnalise.giroEstoque).toBeGreaterThanOrEqual(0);
        expect(primeiraAnalise.diasEstoque).toBeGreaterThanOrEqual(0);

        // Verificar classificações válidas
        expect(['RAPIDO', 'MEDIO', 'LENTO', 'PARADO']).toContain(primeiraAnalise.classificacao);
        expect(primeiraAnalise.recomendacao).toBeDefined();
      }
    });

    it('deve analisar diferentes períodos corretamente', async () => {
      // Act - Testar diferentes períodos
      const mensal = await useCase.obterAnaliseGiroEstoque(undefined, 'MENSAL');
      const trimestral = await useCase.obterAnaliseGiroEstoque(undefined, 'TRIMESTRAL');
      const semestral = await useCase.obterAnaliseGiroEstoque(undefined, 'SEMESTRAL');

      // Assert - Verificar que os períodos são diferentes
      const diffMensal = mensal.periodoAnalise.fim.getTime() - mensal.periodoAnalise.inicio.getTime();
      const diffTrimestral = trimestral.periodoAnalise.fim.getTime() - trimestral.periodoAnalise.inicio.getTime();
      const diffSemestral = semestral.periodoAnalise.fim.getTime() - semestral.periodoAnalise.inicio.getTime();

      expect(diffMensal).toBeLessThan(diffTrimestral);
      expect(diffTrimestral).toBeLessThan(diffSemestral);
    });

    it('deve classificar itens sem movimento como PARADO', async () => {
      // Arrange - Criar tipo EPI sem movimentações
      const novoTipoEpi = await testSetup.prismaService.tipoEPI.create({
        data: {
          nomeEquipamento: 'EPI Sem Movimento',
          numeroCa: `CA-99999-${Date.now()}`, // CA único para evitar conflitos
          vidaUtilDias: 365, // 12 months * 30 days
          status: 'ATIVO',
        },
      });

      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar estoque sem movimentações
      await testSetup.prismaService.estoqueItem.create({
        data: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: novoTipoEpi.id,
          status: StatusEstoqueItem.DISPONIVEL,
          quantidade: 50,
        },
      });

      // Act
      const result = await useCase.obterAnaliseGiroEstoque(almoxarifado.id);

      // Assert
      const itemSemMovimento = result.analise.find(item => 
        item.tipoEpiId === novoTipoEpi.id
      );

      if (itemSemMovimento) {
        expect(itemSemMovimento.classificacao).toBe('PARADO');
        expect(itemSemMovimento.giroEstoque).toBe(0);
        expect(itemSemMovimento.consumoMedio).toBe(0);
        expect(itemSemMovimento.recomendacao).toContain('sem movimento');
      }
    });
  });

  describe('Performance e Casos Extremos', () => {
    it('deve lidar com consultas em banco com muitos dados', async () => {
      // Act
      const startTime = Date.now();
      const result = await useCase.execute();
      const endTime = Date.now();

      // Assert - Performance
      expect(endTime - startTime).toBeLessThan(5000); // Menos de 5 segundos
      expect(result).toBeDefined();
    });

    it('deve retornar resultado vazio quando não há dados para os filtros', async () => {
      // Act - Filtrar por almoxarifado inexistente
      const result = await useCase.execute({
        almoxarifadoId: 'almoxarifado-inexistente',
      });

      // Assert
      expect(result.itens).toHaveLength(0);
      expect(result.resumo.totalItens).toBe(0);
      expect(result.resumo.valorTotalEstoque).toBe(0);
    });

    it('deve lidar com valores null/undefined nos dados', async () => {
      // Arrange - Criar dados com valores opcionais null
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Modificar dados para incluir valores null
      await testSetup.prismaService.tipoEPI.update({
        where: { id: tipoEpi.id },
        data: { descricao: null }, // Descrição null
      });

      // Act
      const result = await useCase.execute({
        almoxarifadoId: almoxarifado.id,
      });

      // Assert - Deve lidar graciosamente com valores null
      expect(result).toBeDefined();
      
      const itemComDescricaoNull = result.itens.find(item => 
        item.tipoEpiId === tipoEpi.id
      );

      if (itemComDescricaoNull) {
        expect(itemComDescricaoNull.tipoEpiNome).toBeDefined();
      }
    });
  });
});