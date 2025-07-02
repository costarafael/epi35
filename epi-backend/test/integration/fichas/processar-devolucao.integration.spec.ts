import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessarDevolucaoUseCase } from '@application/use-cases/fichas/processar-devolucao.use-case';
import { PrismaEstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { PrismaMovimentacaoRepository } from '@infrastructure/repositories/movimentacao.repository';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { StatusEntregaItem, StatusEstoqueItem, TipoMovimentacao } from '@domain/enums';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';

describe('ProcessarDevolucaoUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: ProcessarDevolucaoUseCase;
  let estoqueRepository: PrismaEstoqueRepository;
  let movimentacaoRepository: PrismaMovimentacaoRepository;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        ProcessarDevolucaoUseCase,
        PrismaEstoqueRepository,
        PrismaMovimentacaoRepository,
      ],
    });

    useCase = testSetup.app.get<ProcessarDevolucaoUseCase>(ProcessarDevolucaoUseCase);
    estoqueRepository = testSetup.app.get<PrismaEstoqueRepository>(PrismaEstoqueRepository);
    movimentacaoRepository = testSetup.app.get<PrismaMovimentacaoRepository>(PrismaMovimentacaoRepository);

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('executarDevolucaoCompleta - Fluxo Completo de Devolução', () => {
    it('deve processar devolução completa com sucesso e criar estoque AGUARDANDO_INSPECAO', async () => {
      // Arrange - Criar cenário de entrega para devolução
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('João Silva Santos');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      expect(usuario).toBeDefined();
      expect(colaborador).toBeDefined();
      expect(tipoCapacete).toBeDefined();
      expect(almoxarifado).toBeDefined();

      // Criar ficha EPI
      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      // Criar entrega
      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ATIVA',
          assinada: true,
        },
      });

      // Criar itens de entrega (3 itens entregues)
      const itensEntrega = await Promise.all([
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            tipoEpiId: tipoCapacete.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.ENTREGUE,
          },
        }),
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            tipoEpiId: tipoCapacete.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.ENTREGUE,
          },
        }),
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            tipoEpiId: tipoCapacete.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.ENTREGUE,
          },
        }),
      ]);

      // Verificar estoque aguardando inspeção antes (deve ser 0)
      const estoqueInspecaoAntes = await testSetup.prismaService.estoqueItem.findFirst({
        where: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoCapacete.id,
          status: StatusEstoqueItem.AGUARDANDO_INSPECAO,
        },
      });
      const quantidadeInspecaoAntes = estoqueInspecaoAntes?.quantidade || 0;

      const input = {
        entregaId: entrega.id,
        itensDevolvidos: [
          {
            entregaItemId: itensEntrega[0].id,
            motivoDevolucao: 'Fim do uso',
            observacoes: 'Item em bom estado',
          },
          {
            entregaItemId: itensEntrega[1].id,
            motivoDevolucao: 'Defeito',
            observacoes: 'Item danificado',
          },
        ],
        responsavelId: usuario.id,
      };

      // Act - Processar devolução
      const result = await useCase.executarDevolucaoCompleta(input);

      // Assert - Verificar resultado
      expect(result).toBeDefined();
      expect(result.devolucao).toBeDefined();
      expect(result.itensProcessados).toHaveLength(2);
      expect(result.movimentacoesCriadas).toHaveLength(1); // Uma movimentação para os 2 itens do mesmo tipo

      // Verificar devolução criada
      expect(result.devolucao.entregaId).toBe(entrega.id);
      expect(result.devolucao.responsavelId).toBe(usuario.id);
      expect(result.devolucao.quantidadeDevolvida).toBe(2);

      // Verificar itens processados
      result.itensProcessados.forEach(item => {
        expect(item.motivoDevolucao).toBeDefined();
        expect(item.novoStatus).toBe(StatusEntregaItem.DEVOLVIDO);
      });

      // Verificar movimentação criada
      const movimentacao = result.movimentacoesCriadas[0];
      expect(movimentacao.tipoMovimentacao).toBe(TipoMovimentacao.ENTRADA);
      expect(movimentacao.quantidade).toBe(2);
      expect(movimentacao.almoxarifadoId).toBe(almoxarifado.id);
      expect(movimentacao.observacoes).toContain('devolução');

      // Verificar que estoque AGUARDANDO_INSPECAO foi criado/atualizado
      const estoqueInspecaoDepois = await testSetup.prismaService.estoqueItem.findFirst({
        where: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoCapacete.id,
          status: StatusEstoqueItem.AGUARDANDO_INSPECAO,
        },
      });
      expect(estoqueInspecaoDepois.quantidade).toBe(quantidadeInspecaoAntes + 2);

      // Verificar que itens foram marcados como devolvidos no banco
      const itensDb = await testSetup.prismaService.entregaItem.findMany({
        where: { 
          id: { in: [itensEntrega[0].id, itensEntrega[1].id] }
        },
      });
      itensDb.forEach(item => {
        expect(item.status).toBe(StatusEntregaItem.DEVOLVIDO);
        expect(item.dataDevolucao).toBeDefined();
      });

      // Verificar que o terceiro item ainda está entregue
      const terceiroItem = await testSetup.prismaService.entregaItem.findUnique({
        where: { id: itensEntrega[2].id },
      });
      expect(terceiroItem.status).toBe(StatusEntregaItem.ENTREGUE);
    });

    it('deve processar devolução parcial corretamente', async () => {
      // Arrange - Criar cenário com múltiplos itens
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Maria Oliveira Costa');
      const tipoLuva = await testSetup.findTipoEpi('CA-67890');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoLuva.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ATIVA',
          assinada: true,
        },
      });

      // Criar 5 itens entregues
      const itensEntrega = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          testSetup.prismaService.entregaItem.create({
            data: {
              entregaId: entrega.id,
              tipoEpiId: tipoLuva.id,
              quantidadeEntregue: 1,
              dataLimiteDevolucao: new Date('2025-12-31'),
              status: StatusEntregaItem.ENTREGUE,
            },
          })
        )
      );

      // Devolver apenas 2 dos 5 itens
      const input = {
        entregaId: entrega.id,
        itensDevolvidos: [
          {
            entregaItemId: itensEntrega[0].id,
            motivoDevolucao: 'Troca por tamanho',
          },
          {
            entregaItemId: itensEntrega[2].id,
            motivoDevolucao: 'Fim do uso',
          },
        ],
        responsavelId: usuario.id,
      };

      // Act
      const result = await useCase.executarDevolucaoCompleta(input);

      // Assert
      expect(result.itensProcessados).toHaveLength(2);
      expect(result.devolucao.quantidadeDevolvida).toBe(2);

      // Verificar que apenas os itens especificados foram devolvidos
      const itensDevolvidos = await testSetup.prismaService.entregaItem.findMany({
        where: { 
          entregaId: entrega.id,
          status: StatusEntregaItem.DEVOLVIDO,
        },
      });
      expect(itensDevolvidos).toHaveLength(2);

      // Verificar que os outros 3 itens ainda estão entregues
      const itensEntregues = await testSetup.prismaService.entregaItem.findMany({
        where: { 
          entregaId: entrega.id,
          status: StatusEntregaItem.ENTREGUE,
        },
      });
      expect(itensEntregues).toHaveLength(3);

      // Verificar que a entrega ainda está ativa (não foi totalmente devolvida)
      const entregaDb = await testSetup.prismaService.entrega.findUnique({
        where: { id: entrega.id },
      });
      expect(entregaDb.status).toBe('ATIVA');
    });

    it('deve finalizar entrega quando todos os itens forem devolvidos', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Pedro Santos Almeida');
      const tipoOculos = await testSetup.findTipoEpi('CA-11111');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoOculos.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ATIVA',
          assinada: true,
        },
      });

      // Criar apenas 2 itens
      const itensEntrega = await Promise.all([
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            tipoEpiId: tipoOculos.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.ENTREGUE,
          },
        }),
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            tipoEpiId: tipoOculos.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.ENTREGUE,
          },
        }),
      ]);

      // Devolver todos os itens
      const input = {
        entregaId: entrega.id,
        itensDevolvidos: itensEntrega.map(item => ({
          entregaItemId: item.id,
          motivoDevolucao: 'Devolução completa',
        })),
        responsavelId: usuario.id,
      };

      // Act
      const result = await useCase.executarDevolucaoCompleta(input);

      // Assert
      expect(result.itensProcessados).toHaveLength(2);
      expect(result.devolucao.quantidadeDevolvida).toBe(2);

      // Verificar que a entrega foi finalizada
      const entregaDb = await testSetup.prismaService.entrega.findUnique({
        where: { id: entrega.id },
      });
      expect(entregaDb.status).toBe('DEVOLVIDA');
    });
  });

  describe('Validações e Tratamento de Erros', () => {
    it('deve falhar quando entrega não existir', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');

      const input = {
        entregaId: 'entrega-inexistente',
        itensDevolvidos: [],
        responsavelId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.executarDevolucaoCompleta(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.executarDevolucaoCompleta(input)).rejects.toThrow(/Entrega.*entrega-inexistente/);
    });

    it('deve falhar quando entrega não estiver assinada', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Ana Paula Ferreira');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoEpi.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      // Criar entrega NÃO assinada
      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'PENDENTE_ASSINATURA',
          assinada: false, // Não assinada
        },
      });

      const input = {
        entregaId: entrega.id,
        itensDevolvidos: [],
        responsavelId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.executarDevolucaoCompleta(input)).rejects.toThrow(BusinessError);
      await expect(useCase.executarDevolucaoCompleta(input)).rejects.toThrow(/entrega deve estar assinada/);
    });

    it('deve falhar quando tentar devolver item já devolvido', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Carlos Eduardo Lima');
      const tipoEpi = await testSetup.findTipoEpi('CA-22222');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoEpi.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ATIVA',
          assinada: true,
        },
      });

      // Criar item já devolvido
      const itemDevolvido = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          tipoEpiId: tipoEpi.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.DEVOLVIDO, // Já devolvido
          dataDevolucao: new Date(),
        },
      });

      const input = {
        entregaId: entrega.id,
        itensDevolvidos: [
          {
            entregaItemId: itemDevolvido.id,
            motivoDevolucao: 'Teste duplicado',
          },
        ],
        responsavelId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.executarDevolucaoCompleta(input)).rejects.toThrow(BusinessError);
      await expect(useCase.executarDevolucaoCompleta(input)).rejects.toThrow(/já foi devolvido/);
    });

    it('deve falhar quando item não pertencer à entrega especificada', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador1 = await testSetup.findColaborador('Fernanda Silva Lima');
      const colaborador2 = await testSetup.findColaborador('Roberto Alves Mendes');
      const tipoEpi = await testSetup.findTipoEpi('CA-33333');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar duas fichas e entregas diferentes
      const ficha1 = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador1.id,
          tipoEpiId: tipoEpi.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      const ficha2 = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador2.id,
          tipoEpiId: tipoEpi.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      const entrega1 = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha1.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ATIVA',
          assinada: true,
        },
      });

      const entrega2 = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha2.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ATIVA',
          assinada: true,
        },
      });

      // Criar item na entrega2
      const itemEntrega2 = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega2.id,
          tipoEpiId: tipoEpi.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.ENTREGUE,
        },
      });

      // Tentar devolver item da entrega2 na entrega1
      const input = {
        entregaId: entrega1.id,
        itensDevolvidos: [
          {
            entregaItemId: itemEntrega2.id,
            motivoDevolucao: 'Erro - item de outra entrega',
          },
        ],
        responsavelId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.executarDevolucaoCompleta(input)).rejects.toThrow(BusinessError);
      await expect(useCase.executarDevolucaoCompleta(input)).rejects.toThrow(/não pertence à entrega/);
    });
  });

  describe('obterHistoricoDevolucoes - Consultas Históricas', () => {
    it('deve retornar histórico de devoluções de um colaborador', async () => {
      // Arrange - Criar histórico de devoluções
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Lucia Santos Costa');
      const tipoEpi = await testSetup.findTipoEpi('CA-44444');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoEpi.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ATIVA',
          assinada: true,
        },
      });

      // Criar e processar devolução
      const itemEntrega = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          tipoEpiId: tipoEpi.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.ENTREGUE,
        },
      });

      await useCase.executarDevolucaoCompleta({
        entregaId: entrega.id,
        itensDevolvidos: [
          {
            entregaItemId: itemEntrega.id,
            motivoDevolucao: 'Teste histórico',
          },
        ],
        responsavelId: usuario.id,
      });

      // Act
      const historico = await useCase.obterHistoricoDevolucoes(colaborador.id);

      // Assert
      expect(historico).toBeDefined();
      expect(historico.length).toBeGreaterThan(0);

      const devolucao = historico[0];
      expect(devolucao.colaboradorId).toBe(colaborador.id);
      expect(devolucao.tipoEpiId).toBe(tipoEpi.id);
      expect(devolucao.status).toBe(StatusEntregaItem.DEVOLVIDO);
      expect(devolucao.dataDevolucao).toBeDefined();
    });

    it('deve filtrar histórico por período específico', async () => {
      // Arrange
      const colaborador = await testSetup.findColaborador('Gabriel Costa Ferreira');
      const dataInicio = new Date('2024-01-01');
      const dataFim = new Date('2024-12-31');

      // Act
      const historico = await useCase.obterHistoricoDevolucoes(
        colaborador.id,
        dataInicio,
        dataFim
      );

      // Assert
      expect(historico).toBeDefined();
      
      // Verificar que todas as devoluções estão no período
      historico.forEach(item => {
        if (item.dataDevolucao) {
          expect(item.dataDevolucao.getTime()).toBeGreaterThanOrEqual(dataInicio.getTime());
          expect(item.dataDevolucao.getTime()).toBeLessThanOrEqual(dataFim.getTime());
        }
      });
    });
  });

  describe('validarDevolucaoPermitida - Validações de Negócio', () => {
    it('deve validar devolução permitida para item entregue', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Patricia Lima Oliveira');
      const tipoEpi = await testSetup.findTipoEpi('CA-55555');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoEpi.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ATIVA',
          assinada: true,
        },
      });

      const itemEntrega = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          tipoEpiId: tipoEpi.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.ENTREGUE,
        },
      });

      // Act
      const validacao = await useCase.validarDevolucaoPermitida(entrega.id, [itemEntrega.id]);

      // Assert
      expect(validacao.permitida).toBe(true);
      expect(validacao.entregaAssinada).toBe(true);
      expect(validacao.itensValidos).toHaveLength(1);
      expect(validacao.itensValidos[0].podeDevolver).toBe(true);
    });

    it('deve rejeitar devolução para entrega não assinada', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Rafael Mendes Silva');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoEpi.id,
          almoxarifadoId: almoxarifado.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'PENDENTE_ASSINATURA',
          assinada: false, // Não assinada
        },
      });

      const itemEntrega = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          tipoEpiId: tipoEpi.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.ENTREGUE,
        },
      });

      // Act
      const validacao = await useCase.validarDevolucaoPermitida(entrega.id, [itemEntrega.id]);

      // Assert
      expect(validacao.permitida).toBe(false);
      expect(validacao.entregaAssinada).toBe(false);
      expect(validacao.motivo).toContain('assinada');
    });
  });
});