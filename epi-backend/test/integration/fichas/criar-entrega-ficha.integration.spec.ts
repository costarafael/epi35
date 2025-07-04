import { describe, it, expect, beforeEach } from 'vitest';
import { addDays, differenceInDays } from 'date-fns';
import { CriarEntregaFichaUseCase } from '@application/use-cases/fichas/criar-entrega-ficha.use-case';
import { StatusEntregaEnum, StatusFichaEnum } from '@prisma/client';
import { StatusEntregaItem } from '@domain/enums/entrega.enum';

// Interface temporária para suportar o campo dataDevolucao até regenerar o Prisma Client
interface EntregaItemDB {
  id: string;
  status: StatusEntregaEnum;
  createdAt: Date;
  updatedAt: Date;
  entregaId: string;
  quantidadeEntregue: number;
  dataFabricacao: Date | null;
  dataDevolucao: Date | null; // Antigo nome do campo que está no banco
  dataLimiteDevolucao: Date | null; // Novo nome do campo que será usado após migration
  estoqueItemOrigemId: string | null;
  motivoDevolucao: string | null;
}
import { EstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { MovimentacaoRepository } from '@infrastructure/repositories/movimentacao.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ConfiguracaoService } from '@domain/services/configuracao.service';
import { IEstoqueRepository } from '@domain/interfaces/repositories/estoque-repository.interface';
import { IMovimentacaoRepository } from '@domain/interfaces/repositories/movimentacao-repository.interface';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';

describe('CriarEntregaFichaUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: CriarEntregaFichaUseCase;
  // Repositories são injetados automaticamente no use case

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
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
          provide: 'ConfigService',
          useValue: {
            get: (key: string) => {
              const config = {
                PERMITIR_ESTOQUE_NEGATIVO: 'false',
                PERMITIR_AJUSTES_FORCADOS: 'false',
              };
              return config[key] || process.env[key];
            },
          },
        },
        {
          provide: ConfiguracaoService,
          useFactory: (configService: any, prisma: PrismaService) => new ConfiguracaoService(configService, prisma),
          inject: ['ConfigService', PrismaService],
        },
        {
          provide: CriarEntregaFichaUseCase,
          useFactory: (
            estoqueRepo: IEstoqueRepository,
            movimentacaoRepo: IMovimentacaoRepository,
            prisma: PrismaService,
            configuracaoService: ConfiguracaoService
          ) => new CriarEntregaFichaUseCase(estoqueRepo, movimentacaoRepo, prisma, configuracaoService),
          inject: ['IEstoqueRepository', 'IMovimentacaoRepository', PrismaService, ConfiguracaoService],
        },
      ],
    });

    // Adicionar método auxiliar ao testSetup
    testSetup.findEntregaByColaborador = async (colaboradorId: string) => {
      return testSetup.prismaService.entrega.findFirst({
        where: {
          fichaEpi: { colaboradorId }
        }
      });
    };

    useCase = testSetup.app.get<CriarEntregaFichaUseCase>(CriarEntregaFichaUseCase);
    // Inicializar o use case com as dependências necessárias

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('execute - Fluxo Completo de Entrega', () => {
    it('deve criar entrega com sucesso usando dados reais do banco', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('João Silva Santos');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      expect(usuario).toBeDefined();
      expect(colaborador).toBeDefined();
      expect(tipoCapacete).toBeDefined();
      expect(almoxarifado).toBeDefined();

      // Criar ficha de EPI (uma por colaborador no schema v3.5)
      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: StatusFichaEnum.ATIVA },
        create: {
          colaboradorId: colaborador.id,
          status: StatusFichaEnum.ATIVA,
        },
      });

      // Verificar que existe estoque disponível para entrega
      const estoqueAntes = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      expect(estoqueAntes).toBeDefined();
      expect(estoqueAntes.quantidade).toBeGreaterThan(0);

      const quantidadeAntes = estoqueAntes.quantidade;

      // Act - Criar entrega
      const entregaInput = {
        fichaEpiId: ficha.id,
        quantidade: 2,
        usuarioId: usuario.id,
        itens: [
          {
            numeroSerie: '123456',
            estoqueItemOrigemId: estoqueAntes.id,
          },
          {
            numeroSerie: '123457',
            estoqueItemOrigemId: estoqueAntes.id,
          },
        ],
      };

      const result = await useCase.execute(entregaInput);

      // Assert - Verificar resultado
      expect(result).toBeDefined();
      expect(result).toMatchObject({
        id: expect.any(String),
        colaboradorId: colaborador.id,
        dataEntrega: expect.any(Date),
        itens: [
          {
            id: expect.any(String),
            quantidadeEntregue: 1,
            dataLimiteDevolucao: expect.any(Date), // Campo correto no schema v3.5
            status: StatusEntregaItem.COM_COLABORADOR, // Status correto
          },
          {
            id: expect.any(String),
            quantidadeEntregue: 1,
            dataLimiteDevolucao: expect.any(Date), // Campo correto no schema v3.5
            status: StatusEntregaItem.COM_COLABORADOR, // Status correto
          },
        ],
      });

      // Verificar itens entregues (deve criar 2 registros unitários)
      expect(result.itens).toHaveLength(2); // 2 registros unitários conforme implementação
      expect(result.itens[0].status).toBe(StatusEntregaItem.COM_COLABORADOR); // Status correto

      // Verificar que a entrega foi criada corretamente no banco
      const entrega = await testSetup.findEntregaByColaborador(
        colaborador.id
      );
      expect(entrega).toBeDefined();

      // Verificar movimentações criadas no banco (uma por item para rastreabilidade)
      const movimentacoes = await testSetup.prismaService.movimentacaoEstoque.findMany({
        where: { 
          entregaId: entrega.id // Usar entregaId para filtrar
        }
      });
      
      expect(movimentacoes).toHaveLength(2); // Uma movimentação por item
      expect(movimentacoes[0].quantidadeMovida).toBe(1); // Sempre 1 para rastreabilidade
      expect(movimentacoes[1].quantidadeMovida).toBe(1); // Sempre 1 para rastreabilidade
      expect(movimentacoes[0].tipoMovimentacao).toBe('SAIDA_ENTREGA'); // Enum correto

      // Verificar itens entregues (deve criar 2 registros unitários)
      const itens = await testSetup.prismaService.entregaItem.findMany({
        where: { entregaId: entrega.id },
      }) as unknown as EntregaItemDB[];
      expect(itens).toHaveLength(2); // 2 registros unitários conforme implementação
      expect(itens[0].status).toBe(StatusEntregaItem.COM_COLABORADOR); // Status correto
      expect(itens[1].status).toBe(StatusEntregaItem.COM_COLABORADOR); // Status correto

      // Verificar cálculo da data de devolução baseada na vida útil
      // Nota: Campo pode ter nome diferente dependendo da migração
      const dataLimiteDevolucao = itens[0].dataLimiteDevolucao || itens[0].dataDevolucao;
      expect(dataLimiteDevolucao).toBeDefined(); 
      if (dataLimiteDevolucao) {
        const tipoEpiFromDb = await testSetup.findTipoEpi('CA-12345');
        const dataEsperada = addDays(new Date(), tipoEpiFromDb.vidaUtilDias || 180);
        const diff = differenceInDays(dataLimiteDevolucao, dataEsperada);
        expect(Math.abs(diff)).toBeLessThanOrEqual(1); // Tolerância de 1 dia devido a arredondamentos
      }

      // Verificar que o saldo do estoque foi atualizado
      const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      expect(estoqueDepois.quantidade).toBe(quantidadeAntes - 2);

      // Verificar dados no banco diretamente
      const entregaDb = await testSetup.prismaService.entrega.findUnique({
        where: { id: result.id },
        include: {
          itens: true,
        },
      });

      expect(entregaDb).toBeDefined();
      expect(entregaDb.itens).toHaveLength(2); // 2 registros unitários

      const movimentacao = await testSetup.prismaService.movimentacaoEstoque.findFirst({
        where: { 
          estoqueItem: { 
            almoxarifadoId: almoxarifado.id,
            tipoEpiId: tipoCapacete.id
          }
        },
      });

      expect(movimentacao).toBeDefined();
      expect(movimentacao.tipoMovimentacao).toBe('SAIDA_ENTREGA');
    });

    it('deve falhar quando estoque é insuficiente', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Maria Oliveira Costa');
      const tipoLuva = await testSetup.findTipoEpi('CA-67890');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar ficha de EPI (uma por colaborador no schema v3.5)
      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: StatusFichaEnum.ATIVA },
        create: {
          colaboradorId: colaborador.id,
          status: StatusFichaEnum.ATIVA,
        },
      });

      const estoque = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoLuva.id);
      
      // Tentar entregar mais do que disponível
      const quantidadeExcessiva = estoque.quantidade + 1; // Sempre exceder o estoque disponível
      const entregaInput = {
        fichaEpiId: ficha.id,
        quantidade: quantidadeExcessiva,
        usuarioId: usuario.id,
        itens: Array.from({ length: quantidadeExcessiva }, (_, i) => ({
          numeroSerie: `123${456 + i}`,
          estoqueItemOrigemId: estoque.id,
        })),
      };

      // Act & Assert
      await expect(useCase.execute(entregaInput)).rejects.toThrowError(/estoque insuficiente/i);

      // Verificar que o estoque não foi alterado
      const estoqueDepois = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoLuva.id);
      expect(estoqueDepois.quantidade).toBe(estoque.quantidade);
    });

    it('deve calcular data de vencimento baseada na vida útil do EPI', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Pedro Santos Silva');
      const tipoOculos = await testSetup.findTipoEpi('CA-11111'); // 270 dias de vida útil
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar ficha de EPI (uma por colaborador no schema v3.5)
      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: StatusFichaEnum.ATIVA },
        create: {
          colaboradorId: colaborador.id,
          status: StatusFichaEnum.ATIVA,
        },
      });

      // Verificar que existe estoque disponível para entrega
      const estoque = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoOculos.id);
      const dataEntrega = new Date();

      // Act
      const entregaInput = {
        fichaEpiId: ficha.id,
        quantidade: 1,
        usuarioId: usuario.id,
        itens: [
          {
            numeroSerie: '123456',
            estoqueItemOrigemId: estoque.id,
            // Agora usamos diasAvisoVencimento do TipoEPI para calcular data de devolução sugerida
          },
        ],
      };

      const result = await useCase.execute(entregaInput);

      // Assert
      // Verificar cálculo da data limite devolução
      expect(result.itens[0].dataLimiteDevolucao).toBeDefined();
      
      if (result.itens[0].dataLimiteDevolucao) {
        const tipoEpiFromDb = await testSetup.findTipoEpi('CA-11111');
        const dataEsperada = addDays(new Date(dataEntrega), tipoEpiFromDb.vidaUtilDias || 270);
        
        const dataCalculada = new Date(result.itens[0].dataLimiteDevolucao);
        
        // Permitir diferença de 1 dia devido ao tempo de execução
        const diff = differenceInDays(dataCalculada, dataEsperada);
        expect(Math.abs(diff)).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('validarEntregaPermitida', () => {
    it('deve validar corretamente ficha ativa com estoque disponível', async () => {
      // Arrange
      const colaborador = await testSetup.findColaborador('Ana Paula Ferreira');
      // const _tipoBota = await testSetup.findTipoEpi('CA-22222');
      // const _almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar ficha de EPI (uma por colaborador no schema v3.5)
      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: StatusFichaEnum.ATIVA },
        create: {
          colaboradorId: colaborador.id,
          status: StatusFichaEnum.ATIVA,
        },
      });

      // Act
      const resultado = await useCase.validarEntregaPermitida(ficha.id, 1);

      // Assert
      expect(resultado.permitida).toBe(true);
      expect(resultado.fichaAtiva).toBe(true);
      expect(resultado.estoqueDisponivel).toBeGreaterThan(0);
      expect(resultado.posseAtual).toBe(0);
    });

    it('deve rejeitar entrega para ficha inativa', async () => {
      // Arrange
      const colaborador = await testSetup.findColaborador('Carlos Eduardo Lima');
      // const _tipoCapacete = await testSetup.findTipoEpi('CA-12345');
      // const _almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar ficha de EPI (uma por colaborador no schema v3.5)
      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: StatusFichaEnum.INATIVA },
        create: {
          colaboradorId: colaborador.id,
          status: StatusFichaEnum.INATIVA, // Ficha inativa
        },
      });

      // Act
      const resultado = await useCase.validarEntregaPermitida(ficha.id, 1);

      // Assert
      expect(resultado.permitida).toBe(false);
      expect(resultado.fichaAtiva).toBe(false);
      expect(resultado.motivo).toContain('inativa');
    });
  });
});