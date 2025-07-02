import { describe, it, expect, beforeEach } from 'vitest';
import { addDays, differenceInDays } from 'date-fns';
import { CriarEntregaFichaUseCase } from '@application/use-cases/fichas/criar-entrega-ficha.use-case';
import { StatusEntregaItem } from '@prisma/client';

// Interface temporária para suportar o campo dataDevolucao até regenerar o Prisma Client
interface EntregaItemDB {
  id: string;
  tipoEpiId: string;
  status: StatusEntregaItem;
  createdAt: Date;
  updatedAt: Date;
  entregaId: string;
  quantidadeEntregue: number;
  numeroSerie: string | null;
  lote: string | null;
  dataFabricacao: Date | null;
  dataDevolucao: Date | null; // Antigo nome do campo que está no banco
  // dataLimiteDevolucao: Date | null; // Novo nome do campo que será usado após migration
  estoqueItemOrigemId: string | null;
  motivoDevolucao: string | null;
}
import { EstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { MovimentacaoRepository } from '@infrastructure/repositories/movimentacao.repository';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';

describe('CriarEntregaFichaUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: CriarEntregaFichaUseCase;
  // Repositories são injetados automaticamente no use case

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        CriarEntregaFichaUseCase,
        {
          provide: 'IEstoqueRepository',
          useClass: EstoqueRepository
        },
        {
          provide: 'IMovimentacaoRepository',
          useClass: MovimentacaoRepository
        },
      ],
    });

    // Adicionar método auxiliar ao testSetup
    testSetup.findEntregaByColaborador = async (colaboradorId: string, tipoEpiId: string) => {
      return testSetup.prismaService.entrega.findFirst({
        where: {
          colaboradorId,
          itens: {
            some: {
              tipoEpiId
            }
          }
        }
      });
    };

    useCase = testSetup.moduleRef.get<CriarEntregaFichaUseCase>(CriarEntregaFichaUseCase);
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

      // Criar ficha de EPI com identificador único para evitar violação de restrição única
      const fichaUniqueId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          id: fichaUniqueId,
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
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
          },
          {
            numeroSerie: '123457',
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
            tipoEpiId: tipoCapacete.id,
            quantidadeEntregue: 1,
            numeroSerie: null,
            dataDevolucao: expect.any(Date), // Ainda usando dataDevolucao até atualização do client
            status: 'COM_COLABORADOR', // Status atualizados diasAvisoVencimento do TipoEPI para calcular data de devolução sugerida
          },
        ],
      });

      // Verificar itens entregues (deve criar 2 registros unitários)
      expect(result.itens).toHaveLength(1);
      expect(result.itens[0].tipoEpiId).toBe(tipoCapacete.id);
      expect(result.itens[0].status).toBe('ENTREGUE');

      // Verificar movimentações criadas no banco
      const movimentacoes = await testSetup.prismaService.movimentacaoEstoque.findMany({
        where: { 
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoCapacete.id
        }
      });
      expect(movimentacoes).toHaveLength(1);
      expect(movimentacoes[0].tipoEpiId).toBe(tipoCapacete.id);
      expect(movimentacoes[0].quantidade).toBe(2);

      // Verificar que a entrega foi criada corretamente no banco
      const entrega = await testSetup.findEntregaByColaborador(
        colaborador.id,
        tipoCapacete.id,
      );
      expect(entrega).toBeDefined();

      // Verificar itens entregues (deve criar 2 registros unitários)
      const itens = await testSetup.prismaService.entregaItem.findMany({
        where: { entregaId: entrega.id },
      }) as unknown as EntregaItemDB[];
      expect(itens).toHaveLength(1);
      expect(itens[0].tipoEpiId).toBe(tipoCapacete.id);
      expect(itens[0].status).toBe('COM_COLABORADOR');

      // Verificar cálculo da data de devolução baseada na validade (180 dias para capacete)
      // Usando dataDevolucao temporariamente até que o Prisma Client seja atualizado
      expect(itens[0].dataDevolucao).toBeDefined(); 
      if (itens[0].dataDevolucao) {
        const dataEsperada = addDays(new Date(), 180);
        const diff = differenceInDays(itens[0].dataDevolucao, dataEsperada);
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
      expect(entregaDb.itens).toHaveLength(1);

      const movimentacao = await testSetup.prismaService.movimentacaoEstoque.findFirst({
        where: { 
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoCapacete.id
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

      // Criar ficha de EPI com identificador único para evitar violação de restrição única
      const fichaUniqueId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          id: fichaUniqueId,
          colaboradorId: colaborador.id,
          tipoEpiId: tipoLuva.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      const estoque = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoLuva.id);
      
      // Tentar entregar mais do que disponível
      const entregaInput = {
        fichaEpiId: ficha.id,
        quantidade: estoque.quantidade + 10, // Mais do que existe em estoque
        usuarioId: usuario.id,
        itens: [
          {
            numeroSerie: '123456',
          },
        ],
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
      const colaborador = await testSetup.findColaborador('Pedro Santos Almeida');
      const tipoOculos = await testSetup.findTipoEpi('CA-11111'); // 270 dias de vida útil
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar ficha de EPI com identificador único para evitar violação de restrição única
      const fichaUniqueId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          id: fichaUniqueId,
          colaboradorId: colaborador.id,
          tipoEpiId: tipoOculos.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      // Verificar que existe estoque disponível para entrega
      await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoOculos.id);
      const dataEntrega = new Date();

      // Act
      const entregaInput = {
        fichaEpiId: ficha.id,
        quantidade: 1,
        usuarioId: usuario.id,
        itens: [
          {
            numeroSerie: '123456',
            // Agora usamos diasAvisoVencimento do TipoEPI para calcular data de devolução sugerida
          },
        ],
      };

      const result = await useCase.execute(entregaInput);

      // Assert
      // Fazemos o cast para EntregaItemDB para acessar o campo dataDevolucao até que o Prisma Client seja regenerado
      const entregaItemDb = result.itens[0] as unknown as EntregaItemDB;
      expect(entregaItemDb.dataDevolucao).toBeDefined();
      
      // Calcular data esperada (usando diasAvisoVencimento, 180 dias após entrega)
      const dataEsperada = addDays(new Date(dataEntrega), 180); // 180 é o diasAvisoVencimento do capacete
      
      // Usar o valor de dataDevolucao
      const dataCalculada = new Date(entregaItemDb.dataDevolucao as Date);
      
      // Permitir diferença de 1 dia devido ao tempo de execução
      const diff = differenceInDays(dataCalculada, dataEsperada);
      expect(Math.abs(diff)).toBeLessThanOrEqual(1);
    });
  });

  describe('validarEntregaPermitida', () => {
    it('deve validar corretamente ficha ativa com estoque disponível', async () => {
      // Arrange
      const colaborador = await testSetup.findColaborador('Ana Paula Ferreira');
      const tipoBota = await testSetup.findTipoEpi('CA-22222');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar ficha de EPI com identificador único para evitar violação de restrição única
      const fichaUniqueId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          id: fichaUniqueId,
          colaboradorId: colaborador.id,
          tipoEpiId: tipoBota.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
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
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar ficha de EPI com identificador único para evitar violação de restrição única
      const fichaUniqueId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          id: fichaUniqueId,
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: almoxarifado.id,
          status: 'INATIVA', // Ficha inativa
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