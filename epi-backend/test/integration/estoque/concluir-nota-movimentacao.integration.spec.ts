import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConcluirNotaMovimentacaoUseCase } from '@application/use-cases/estoque/concluir-nota-movimentacao.use-case';
import { NotaRepository } from '@infrastructure/repositories/nota.repository';
import { MovimentacaoRepository } from '@infrastructure/repositories/movimentacao.repository';
import { EstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ConfiguracaoService } from '@domain/services/configuracao.service';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { 
  TipoNotaEnum as TipoNotaMovimentacao, 
  StatusNotaEnum as StatusNotaMovimentacao, 
  TipoMovimentacaoEnum as TipoMovimentacao 
} from '@prisma/client';
// import { StatusEstoqueItem } from '@domain/enums';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';

describe('ConcluirNotaMovimentacaoUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: ConcluirNotaMovimentacaoUseCase;
  // let _notaRepository: NotaRepository;
  // let _movimentacaoRepository: MovimentacaoRepository;
  // let _estoqueRepository: EstoqueRepository;

  beforeEach(async () => {
    testSetup = await createTestSetup();

    // Override providers to add the missing services
    await testSetup.app.close(); // Close the initial app

    // Create a new test module with all required providers
    const moduleBuilder = Test.createTestingModule({
      providers: [
        ConcluirNotaMovimentacaoUseCase,
        {
          provide: ConfiguracaoService,
          useFactory: (configService: ConfigService, prismaService: PrismaService) => 
            new ConfiguracaoService(configService, prismaService),
          inject: [ConfigService, PrismaService],
        },
        {
          provide: PrismaService,
          useValue: testSetup.prismaService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: any) => {
              // Check process.env first for runtime changes, then fall back to defaults
              const envValue = process.env[key];
              if (envValue !== undefined) {
                return envValue;
              }
              
              const config = {
                DATABASE_URL: 'postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public',
                NODE_ENV: 'test',
                PERMITIR_ESTOQUE_NEGATIVO: 'false',
                PERMITIR_AJUSTES_FORCADOS: 'true',
                ESTOQUE_MINIMO_EQUIPAMENTO: '10',
              };
              return config[key] || defaultValue;
            },
          },
        },
        {
          provide: 'INotaRepository',
          useFactory: (prisma: PrismaService) => new NotaRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: 'IMovimentacaoRepository',
          useFactory: (prisma: PrismaService) => new MovimentacaoRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: 'IEstoqueRepository',
          useFactory: (prisma: PrismaService) => new EstoqueRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: NotaRepository,
          useFactory: (prisma: PrismaService) => new NotaRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: MovimentacaoRepository,
          useFactory: (prisma: PrismaService) => new MovimentacaoRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: EstoqueRepository,
          useFactory: (prisma: PrismaService) => new EstoqueRepository(prisma),
          inject: [PrismaService],
        },
      ],
    });

    const moduleFixture = await moduleBuilder.compile();
    testSetup.app = moduleFixture.createNestApplication();
    await testSetup.app.init();

    useCase = testSetup.app.get<ConcluirNotaMovimentacaoUseCase>(ConcluirNotaMovimentacaoUseCase);
    // _notaRepository = testSetup.app.get<NotaRepository>(NotaRepository);
    // _movimentacaoRepository = testSetup.app.get<MovimentacaoRepository>(MovimentacaoRepository);
    // _estoqueRepository = testSetup.app.get<EstoqueRepository>(EstoqueRepository);

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('execute - Fluxo Completo de Conclusão de Notas', () => {
    it('deve concluir nota de ENTRADA com sucesso e atualizar estoque', async () => {
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

      // Criar nota de entrada em rascunho
      const notaEntrada = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'ENTRADA-001',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          // almoxarifadoOrigem: não deve ser informado para ENTRADA
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Teste de entrada',
        },
      });

      // Adicionar item à nota
      await testSetup.prismaService.notaMovimentacaoItem.create({
        data: {
          notaMovimentacaoId: notaEntrada.id,
          tipoEpiId: tipoCapacete.id,
          quantidade: 50,
          // Note: quantidadeProcessada removed from schema
        },
      });

      const input = {
        notaId: notaEntrada.id,
        usuarioId: usuario.id,
        validarEstoque: true,
      };

      // Act - Concluir nota
      const result = await useCase.execute(input);

      // Assert - Verificar resultado
      expect(result).toBeDefined();
      expect(result.notaConcluida).toBeDefined();
      expect(result.notaConcluida.status).toBe(StatusNotaMovimentacao.CONCLUIDA);
      expect(result.movimentacoesCriadas).toHaveLength(1);
      expect(result.itensProcessados).toHaveLength(1);

      const movimentacao = result.movimentacoesCriadas[0];
      expect(movimentacao.tipoMovimentacao).toBe(TipoMovimentacao.ENTRADA_NOTA);
      expect(movimentacao.quantidadeMovida).toBe(50);
      expect(movimentacao.estoqueItemId).toBeDefined(); // almoxarifadoId is now in estoqueItem relationship

      const item = result.itensProcessados[0];
      expect(item.tipoEpiId).toBe(tipoCapacete.id);
      expect(item.quantidade).toBe(50);
      expect(item.movimentacaoCreated).toBe(true);
      expect(item.estoqueAtualizado).toBe(true);

      // Verificar que o estoque foi atualizado corretamente
      const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      expect(estoqueDepois.quantidade).toBe(quantidadeAntes + 50);

      // Verificar movimentação foi registrada no banco
      const movimentacaoDb = await testSetup.prismaService.movimentacaoEstoque.findFirst({
        where: { notaMovimentacaoId: notaEntrada.id },
      });
      expect(movimentacaoDb).toBeDefined();
      expect(movimentacaoDb.tipoMovimentacao).toBe(TipoMovimentacao.ENTRADA_NOTA);
      expect(movimentacaoDb.quantidadeMovida).toBe(50);
      // Note: saldoPosterior field removed from schema v3.5

      // Verificar nota foi marcada como concluída
      const notaDb = await testSetup.prismaService.notaMovimentacao.findUnique({
        where: { id: notaEntrada.id },
      });
      expect(notaDb.status).toBe(StatusNotaMovimentacao.CONCLUIDA);
      // Note: dataConclusao field may be in different table structure
    });

    it('deve concluir nota de TRANSFERENCIA com sucesso entre almoxarifados', async () => {
      // Arrange - Buscar dados do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxCentral = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoLuva = await testSetup.findTipoEpi('CA-67890');

      // Criar segundo almoxarifado para transferência
      const almoxFilial = await testSetup.prismaService.almoxarifado.create({
        data: {
          nome: 'Almoxarifado Filial',
          // codigo: 'AF001', // Field removed from schema v3.5
          unidadeNegocioId: almoxCentral.unidadeNegocioId,
          // ativo: true, // Field removed from schema v3.5
        },
      });

      // Verificar estoque disponível na origem
      const estoqueOrigem = await testSetup.getEstoqueDisponivel(almoxCentral.id, tipoLuva.id);
      expect(estoqueOrigem.quantidade).toBeGreaterThan(10); // Garantir que tem estoque suficiente

      // Verificar estoque no destino (pode não existir)
      const estoqueDestinoAntes = await testSetup.getEstoqueDisponivel(almoxFilial.id, tipoLuva.id);
      const quantidadeDestinoAntes = estoqueDestinoAntes?.quantidade || 0;

      // Criar nota de transferência
      const notaTransferencia = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'TRANSF-001',
          tipoNota: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigem: { connect: { id: almoxCentral.id } },
          almoxarifadoDestino: { connect: { id: almoxFilial.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Teste de transferência',
        },
      });

      await testSetup.prismaService.notaMovimentacaoItem.create({
        data: {
          notaMovimentacaoId: notaTransferencia.id,
          tipoEpiId: tipoLuva.id,
          quantidade: 10,
          // Note: quantidadeProcessada removed from schema
        },
      });

      const input = {
        notaId: notaTransferencia.id,
        usuarioId: usuario.id,
        validarEstoque: true,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.notaConcluida.status).toBe(StatusNotaMovimentacao.CONCLUIDA);
      expect(result.movimentacoesCriadas).toHaveLength(2); // Saída + Entrada

      // Verificar movimentação de saída
      const movSaida = result.movimentacoesCriadas.find(m => m.tipoMovimentacao === TipoMovimentacao.SAIDA_TRANSFERENCIA);
      expect(movSaida).toBeDefined();
      expect(movSaida.quantidadeMovida).toBe(10);

      // Verificar movimentação de entrada
      const movEntrada = result.movimentacoesCriadas.find(m => m.tipoMovimentacao === TipoMovimentacao.ENTRADA_TRANSFERENCIA);
      expect(movEntrada).toBeDefined();
      expect(movEntrada.quantidadeMovida).toBe(10);

      // Verificar estoque na origem diminuiu
      const estoqueOrigemDepois = await testSetup.getEstoqueDisponivel(almoxCentral.id, tipoLuva.id);
      expect(estoqueOrigemDepois.quantidade).toBe(estoqueOrigem.quantidade - 10);

      // Verificar estoque no destino aumentou
      const estoqueDestinoDepois = await testSetup.getEstoqueDisponivel(almoxFilial.id, tipoLuva.id);
      expect(estoqueDestinoDepois.quantidade).toBe(quantidadeDestinoAntes + 10);

      // Verificar movimentações no banco
      const movimentacoesDb = await testSetup.prismaService.movimentacaoEstoque.findMany({
        where: { notaMovimentacaoId: notaTransferencia.id },
      });
      expect(movimentacoesDb).toHaveLength(2);
    });

    it('deve concluir nota de DESCARTE com sucesso e reduzir estoque', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoOculos = await testSetup.findTipoEpi('CA-11111');

      // Verificar estoque antes
      const estoqueAntes = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoOculos.id);
      expect(estoqueAntes.quantidade).toBeGreaterThan(5);

      // Criar nota de descarte
      const notaDescarte = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'DESC-001',
          tipoNota: TipoNotaMovimentacao.DESCARTE,
          almoxarifadoOrigem: { connect: { id: almoxarifado.id } },
          // almoxarifadoDestino: não deve ser informado para DESCARTE
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'EPIs vencidos - descarte',
        },
      });

      await testSetup.prismaService.notaMovimentacaoItem.create({
        data: {
          notaMovimentacaoId: notaDescarte.id,
          tipoEpiId: tipoOculos.id,
          quantidade: 5,
          // Note: quantidadeProcessada removed from schema
        },
      });

      const input = {
        notaId: notaDescarte.id,
        usuarioId: usuario.id,
        validarEstoque: true,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.notaConcluida.status).toBe(StatusNotaMovimentacao.CONCLUIDA);
      expect(result.movimentacoesCriadas).toHaveLength(1);

      const movDescarte = result.movimentacoesCriadas[0];
      expect(movDescarte.tipoMovimentacao).toBe(TipoMovimentacao.SAIDA_DESCARTE);
      expect(movDescarte.quantidadeMovida).toBe(5);

      // Verificar estoque diminuiu
      const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoOculos.id);
      expect(estoqueDepois.quantidade).toBe(estoqueAntes.quantidade - 5);

      // Note: observacoes field moved to notaMovimentacao table in schema v3.5
      const notaDb = await testSetup.prismaService.notaMovimentacao.findFirst({
        where: { id: notaDescarte.id },
      });
      expect(notaDb.observacoes).toContain('descarte');
    });

    it('deve concluir nota de AJUSTE e ajustar estoque para valor específico', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoBota = await testSetup.findTipoEpi('CA-22222');

      // Verificar estoque atual
      const estoqueAntes = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoBota.id);
      const saldoAnterior = estoqueAntes.quantidade;

      // Criar nota de ajuste para definir estoque como 100
      const novoSaldo = 100;
      const ajusteQuantidade = novoSaldo - saldoAnterior;

      const notaAjuste = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'AJUSTE-001',
          tipoNota: TipoNotaMovimentacao.ENTRADA_AJUSTE,
          // almoxarifadoOrigem: não deve ser informado para AJUSTE
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Ajuste de inventário',
        },
      });

      await testSetup.prismaService.notaMovimentacaoItem.create({
        data: {
          notaMovimentacaoId: notaAjuste.id,
          tipoEpiId: tipoBota.id,
          quantidade: ajusteQuantidade,
          // Note: quantidadeProcessada removed from schema
        },
      });

      const input = {
        notaId: notaAjuste.id,
        usuarioId: usuario.id,
        validarEstoque: false, // Ajuste não valida estoque
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.notaConcluida.status).toBe(StatusNotaMovimentacao.CONCLUIDA);
      expect(result.movimentacoesCriadas).toHaveLength(1);

      const movAjuste = result.movimentacoesCriadas[0];
      expect(movAjuste.tipoMovimentacao).toBe(ajusteQuantidade > 0 ? TipoMovimentacao.AJUSTE_POSITIVO : TipoMovimentacao.AJUSTE_NEGATIVO);
      expect(movAjuste.quantidadeMovida).toBe(Math.abs(ajusteQuantidade));

      // Verificar estoque foi ajustado para o valor correto
      const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoBota.id);
      expect(estoqueDepois.quantidade).toBe(novoSaldo);

      // Note: saldoAnterior and saldoPosterior fields removed from schema v3.5
      const movimentacaoDb = await testSetup.prismaService.movimentacaoEstoque.findFirst({
        where: { notaMovimentacaoId: notaAjuste.id },
      });
      expect(movimentacaoDb.quantidadeMovida).toBe(Math.abs(ajusteQuantidade));
    });
  });

  describe('Validações e Tratamento de Erros', () => {
    it('deve falhar quando nota não existir', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');

      const input = {
        notaId: 'nota-inexistente',
        usuarioId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(input)).rejects.toThrow(/Nota de movimentação.*nota-inexistente/);
    });

    it('deve falhar quando nota já estiver concluída', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar nota já concluída
      const notaConcluida = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'CONCLUIDA-001',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          // almoxarifadoOrigem: não deve ser informado para ENTRADA
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.CONCLUIDA, // Já concluída
          // dataConclusao: new Date(), // Field removed from schema v3.5
        },
      });

      const input = {
        notaId: notaConcluida.id,
        usuarioId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow(/Apenas notas em rascunho podem ser concluídas/);
    });

    it('deve falhar quando nota não tiver itens', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar nota sem itens
      const notaSemItens = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'SEM-ITENS-001',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          // almoxarifadoOrigem: não deve ser informado para ENTRADA
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
        },
      });

      const input = {
        notaId: notaSemItens.id,
        usuarioId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow(/Nota deve ter pelo menos um item/);
    });

    it('deve falhar quando estoque for insuficiente para transferência', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxCentral = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar almoxarifado destino
      const almoxFilial = await testSetup.prismaService.almoxarifado.create({
        data: {
          nome: 'Almoxarifado Filial 2',
          // codigo: 'AF002', // Field removed from almoxarifado schema v3.5
          unidadeNegocioId: almoxCentral.unidadeNegocioId,
          // ativo: true, // Field removed from almoxarifado schema v3.5
        },
      });

      // Verificar estoque disponível
      const estoqueOrigem = await testSetup.getEstoqueDisponivel(almoxCentral.id, tipoCapacete.id);
      const quantidadeExcessiva = estoqueOrigem.quantidade + 100; // Mais do que disponível

      // Criar nota de transferência com quantidade excessiva
      const notaTransferencia = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'TRANSF-EXCESSO-001',
          tipoNota: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigem: { connect: { id: almoxCentral.id } },
          almoxarifadoDestino: { connect: { id: almoxFilial.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
        },
      });

      await testSetup.prismaService.notaMovimentacaoItem.create({
        data: {
          notaMovimentacaoId: notaTransferencia.id,
          tipoEpiId: tipoCapacete.id,
          quantidade: quantidadeExcessiva,
          // Note: quantidadeProcessada removed from schema
        },
      });

      const input = {
        notaId: notaTransferencia.id,
        usuarioId: usuario.id,
        validarEstoque: true,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow(/Quantidade insuficiente em estoque/);
    });

    it('deve permitir estoque negativo quando configuração está habilitada', async () => {
      // Arrange - Configurar no banco e variável de ambiente
      process.env.PERMITIR_ESTOQUE_NEGATIVO = 'true';
      
      // Atualizar configuração no banco de dados
      await testSetup.prismaService.configuracao.upsert({
        where: { chave: 'PERMITIR_ESTOQUE_NEGATIVO' },
        update: { valor: 'true' },
        create: {
          chave: 'PERMITIR_ESTOQUE_NEGATIVO',
          valor: 'true',
          descricao: 'Permitir estoque negativo - teste'
        }
      });
      

      const usuario = await testSetup.findUser('admin@test.com');
      const almoxCentral = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const almoxFilial = await testSetup.prismaService.almoxarifado.create({
        data: {
          nome: 'Almoxarifado Filial 3',
          // codigo: 'AF003', // Field removed from almoxarifado schema v3.5
          unidadeNegocioId: almoxCentral.unidadeNegocioId,
          // ativo: true, // Field removed from almoxarifado schema v3.5
        },
      });
      const tipoLuva = await testSetup.findTipoEpi('CA-67890');

      // Verificar estoque atual
      const estoqueOrigem = await testSetup.getEstoqueDisponivel(almoxCentral.id, tipoLuva.id);
      const quantidadeExcessiva = estoqueOrigem.quantidade + 5; // Mais do que disponível

      // Criar nota de transferência
      const notaTransferencia = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'TRANSF-NEGATIVO-001',
          tipoNota: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigem: { connect: { id: almoxCentral.id } },
          almoxarifadoDestino: { connect: { id: almoxFilial.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
        },
      });

      await testSetup.prismaService.notaMovimentacaoItem.create({
        data: {
          notaMovimentacaoId: notaTransferencia.id,
          tipoEpiId: tipoLuva.id,
          quantidade: quantidadeExcessiva,
          // Note: quantidadeProcessada removed from schema
        },
      });

      const input = {
        notaId: notaTransferencia.id,
        usuarioId: usuario.id,
        validarEstoque: true,
      };

      try {
        // Act - Deve processar mesmo com estoque insuficiente
        const result = await useCase.execute(input);

        // Assert
        expect(result.notaConcluida.status).toBe(StatusNotaMovimentacao.CONCLUIDA);
        expect(result.movimentacoesCriadas).toHaveLength(2);

        // Verificar que estoque ficou negativo
        const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxCentral.id, tipoLuva.id);
        expect(estoqueDepois.quantidade).toBeLessThan(0);
      } finally {
        // Cleanup - remover variável de ambiente e resetar configuração no banco
        delete process.env.PERMITIR_ESTOQUE_NEGATIVO;
        
        await testSetup.prismaService.configuracao.upsert({
          where: { chave: 'PERMITIR_ESTOQUE_NEGATIVO' },
          update: { valor: 'false' },
          create: {
            chave: 'PERMITIR_ESTOQUE_NEGATIVO',
            valor: 'false',
            descricao: 'Permitir estoque negativo'
          }
        });
      }
    });
  });

  describe('Processamento de Múltiplos Itens', () => {
    it('deve processar múltiplos itens na mesma nota em uma única transação', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');
      const tipoLuva = await testSetup.findTipoEpi('CA-67890');
      const tipoOculos = await testSetup.findTipoEpi('CA-11111');

      // Criar nota de entrada com múltiplos itens
      const notaEntrada = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'MULTIPLOS-001',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          // almoxarifadoOrigem: não deve ser informado para ENTRADA
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Entrada múltiplos itens',
        },
      });

      // Adicionar múltiplos itens
      await testSetup.prismaService.notaMovimentacaoItem.createMany({
        data: [
          {
            notaMovimentacaoId: notaEntrada.id,
            tipoEpiId: tipoCapacete.id,
            quantidade: 20,
            // Note: quantidadeProcessada removed from schema
          },
          {
            notaMovimentacaoId: notaEntrada.id,
            tipoEpiId: tipoLuva.id,
            quantidade: 30,
            // Note: quantidadeProcessada removed from schema
          },
          {
            notaMovimentacaoId: notaEntrada.id,
            tipoEpiId: tipoOculos.id,
            quantidade: 15,
            // Note: quantidadeProcessada removed from schema
          },
        ],
      });

      // Verificar estoques antes
      const estoqueCapaceteAntes = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      const estoqueLuvaAntes = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoLuva.id);
      const estoqueOculosAntes = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoOculos.id);

      const input = {
        notaId: notaEntrada.id,
        usuarioId: usuario.id,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.notaConcluida.status).toBe(StatusNotaMovimentacao.CONCLUIDA);
      expect(result.movimentacoesCriadas).toHaveLength(3); // Uma movimentação por item
      expect(result.itensProcessados).toHaveLength(3);

      // Verificar que todos os itens foram processados
      const itemCapacete = result.itensProcessados.find(i => i.tipoEpiId === tipoCapacete.id);
      const itemLuva = result.itensProcessados.find(i => i.tipoEpiId === tipoLuva.id);
      const itemOculos = result.itensProcessados.find(i => i.tipoEpiId === tipoOculos.id);

      expect(itemCapacete.quantidade).toBe(20);
      expect(itemLuva.quantidade).toBe(30);
      expect(itemOculos.quantidade).toBe(15);

      // Verificar que todos os estoques foram atualizados
      const estoqueCapaceteDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      const estoqueLuvaDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoLuva.id);
      const estoqueOculosDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoOculos.id);

      expect(estoqueCapaceteDepois.quantidade).toBe((estoqueCapaceteAntes?.quantidade || 0) + 20);
      expect(estoqueLuvaDepois.quantidade).toBe((estoqueLuvaAntes?.quantidade || 0) + 30);
      expect(estoqueOculosDepois.quantidade).toBe((estoqueOculosAntes?.quantidade || 0) + 15);

      // Verificar que todas as movimentações foram registradas no banco
      const movimentacoesDb = await testSetup.prismaService.movimentacaoEstoque.findMany({
        where: { notaMovimentacaoId: notaEntrada.id },
      });
      expect(movimentacoesDb).toHaveLength(3);
    });
  });
});