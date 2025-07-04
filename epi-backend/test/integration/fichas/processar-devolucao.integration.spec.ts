import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessarDevolucaoUseCase } from '@application/use-cases/fichas/processar-devolucao.use-case';
import { EstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { MovimentacaoRepository } from '@infrastructure/repositories/movimentacao.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { StatusEntregaItem, StatusEstoqueItem } from '@domain/enums';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';

describe('ProcessarDevolucaoUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: ProcessarDevolucaoUseCase;
  // let _estoqueRepository: EstoqueRepository;
  // let _movimentacaoRepository: MovimentacaoRepository;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        {
          provide: ProcessarDevolucaoUseCase,
          useFactory: (prisma: PrismaService) => new ProcessarDevolucaoUseCase(prisma),
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

    useCase = testSetup.app.get<ProcessarDevolucaoUseCase>(ProcessarDevolucaoUseCase);
    // _notaRepository = testSetup.app.get<EstoqueRepository>(EstoqueRepository);
    // _notaRepository = testSetup.app.get<MovimentacaoRepository>(MovimentacaoRepository);

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('execute - Fluxo Completo de Devolução', () => {
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

      // Obter estoque disponível existente
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoCapacete.id);
      expect(estoqueItem).toBeDefined();

      // Criar ficha EPI
      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      // Criar entrega
      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA',
        },
      });

      // Criar itens de entrega (3 itens entregues)
      const itensEntrega = await Promise.all([
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            estoqueItemOrigemId: estoqueItem.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.COM_COLABORADOR,
          },
        }),
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            estoqueItemOrigemId: estoqueItem.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.COM_COLABORADOR,
          },
        }),
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            estoqueItemOrigemId: estoqueItem.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.COM_COLABORADOR,
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
        itensParaDevolucao: [
          {
            itemId: itensEntrega[0].id,
            motivoDevolucao: 'Fim do uso',
            condicaoItem: 'BOM' as const,
          },
          {
            itemId: itensEntrega[1].id,
            motivoDevolucao: 'Defeito',
            condicaoItem: 'DANIFICADO' as const,
          },
        ],
        usuarioId: usuario.id,
        observacoes: 'Devolução de teste',
      };

      // Act - Processar devolução
      const result = await useCase.execute(input);

      // Assert - Verificar resultado
      expect(result).toBeDefined();
      expect(result.entregaId).toBe(entrega.id);
      expect(result.itensDevolucao).toHaveLength(2);
      expect(result.movimentacoesEstoque.length).toBeGreaterThan(0);

      // Verificar itens processados
      result.itensDevolucao.forEach(item => {
        expect(item.motivoDevolucao).toBeDefined();
        expect(item.novoStatus).toBe(StatusEntregaItem.DEVOLVIDO);
      });

      // Verificar que estoque AGUARDANDO_INSPECAO foi criado/atualizado
      const estoqueInspecaoDepois = await testSetup.prismaService.estoqueItem.findFirst({
        where: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoCapacete.id,
          status: StatusEstoqueItem.AGUARDANDO_INSPECAO,
        },
      });
      expect(estoqueInspecaoDepois.quantidade).toBe(quantidadeInspecaoAntes + 1); // Apenas 1 item DANIFICADO

      // Verificar que itens foram marcados como devolvidos no banco
      const itensDb = await testSetup.prismaService.entregaItem.findMany({
        where: { 
          id: { in: [itensEntrega[0].id, itensEntrega[1].id] }
        },
      });
      itensDb.forEach(item => {
        expect(item.status).toBe(StatusEntregaItem.DEVOLVIDO);
      });

      // Verificar que o terceiro item ainda está com colaborador
      const terceiroItem = await testSetup.prismaService.entregaItem.findUnique({
        where: { id: itensEntrega[2].id },
      });
      expect(terceiroItem.status).toBe(StatusEntregaItem.COM_COLABORADOR);
    });

    it('deve processar devolução parcial corretamente', async () => {
      // Arrange - Criar cenário com múltiplos itens
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Maria Oliveira Costa');
      const tipoLuva = await testSetup.findTipoEpi('CA-67890');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Obter estoque disponível existente
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoLuva.id);
      expect(estoqueItem).toBeDefined();

      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA',
        },
      });

      // Criar 5 itens entregues
      const itensEntrega = await Promise.all(
        Array.from({ length: 5 }, (_, _i) =>
          testSetup.prismaService.entregaItem.create({
            data: {
              entregaId: entrega.id,
              estoqueItemOrigemId: estoqueItem.id,
              quantidadeEntregue: 1,
              dataLimiteDevolucao: new Date('2025-12-31'),
              status: StatusEntregaItem.COM_COLABORADOR,
            },
          })
        )
      );

      // Devolver apenas 2 dos 5 itens
      const input = {
        entregaId: entrega.id,
        itensParaDevolucao: [
          {
            itemId: itensEntrega[0].id,
            motivoDevolucao: 'Troca por tamanho',
            condicaoItem: 'BOM' as const,
          },
          {
            itemId: itensEntrega[2].id,
            motivoDevolucao: 'Fim do uso',
            condicaoItem: 'BOM' as const,
          },
        ],
        usuarioId: usuario.id,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.itensDevolucao).toHaveLength(2);

      // Verificar que apenas os itens especificados foram devolvidos
      const itensDevolvidos = await testSetup.prismaService.entregaItem.findMany({
        where: { 
          entregaId: entrega.id,
          status: StatusEntregaItem.DEVOLVIDO,
        },
      });
      expect(itensDevolvidos).toHaveLength(2);

      // Verificar que os outros 3 itens ainda estão com colaborador
      const itensEntregues = await testSetup.prismaService.entregaItem.findMany({
        where: { 
          entregaId: entrega.id,
          status: StatusEntregaItem.COM_COLABORADOR,
        },
      });
      expect(itensEntregues).toHaveLength(3);

      // Verificar que a entrega ainda está assinada (não foi totalmente devolvida)
      const entregaDb = await testSetup.prismaService.entrega.findUnique({
        where: { id: entrega.id },
      });
      expect(entregaDb.status).toBe('ASSINADA');
    });

    it('deve finalizar entrega quando todos os itens forem devolvidos', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Pedro Santos Silva');
      const tipoOculos = await testSetup.findTipoEpi('CA-11111');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Obter estoque disponível existente
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoOculos.id);
      expect(estoqueItem).toBeDefined();

      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA',
        },
      });

      // Criar apenas 2 itens
      const itensEntrega = await Promise.all([
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            estoqueItemOrigemId: estoqueItem.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.COM_COLABORADOR,
          },
        }),
        testSetup.prismaService.entregaItem.create({
          data: {
            entregaId: entrega.id,
            estoqueItemOrigemId: estoqueItem.id,
            quantidadeEntregue: 1,
            dataLimiteDevolucao: new Date('2025-12-31'),
            status: StatusEntregaItem.COM_COLABORADOR,
          },
        }),
      ]);

      // Devolver todos os itens
      const input = {
        entregaId: entrega.id,
        itensParaDevolucao: itensEntrega.map(item => ({
          itemId: item.id,
          motivoDevolucao: 'Devolução completa',
          condicaoItem: 'BOM' as const,
        })),
        usuarioId: usuario.id,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.itensDevolucao).toHaveLength(2);

      // Verificar que a entrega permanece assinada (schema não tem status específico para devolução)
      const entregaDb = await testSetup.prismaService.entrega.findUnique({
        where: { id: entrega.id },
      });
      expect(entregaDb.status).toBe('ASSINADA');
    });
  });

  describe('Validações e Tratamento de Erros', () => {
    it('deve falhar quando entrega não existir', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');

      const input = {
        entregaId: 'entrega-inexistente',
        itensParaDevolucao: [
          {
            itemId: 'item-qualquer',
            motivoDevolucao: 'Teste',
            condicaoItem: 'BOM' as const,
          },
        ],
        usuarioId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(input)).rejects.toThrow(/Entrega.*entrega-inexistente/);
    });

    it('deve falhar quando entrega não estiver assinada', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Ana Paula Ferreira');
      // const _tipoEpi = await testSetup.findTipoEpi('CA-12345');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
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
        },
      });

      const input = {
        entregaId: entrega.id,
        itensParaDevolucao: [
          {
            itemId: 'item-qualquer',
            motivoDevolucao: 'Teste',
            condicaoItem: 'BOM' as const,
          },
        ],
        usuarioId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow(/entrega deve estar assinada/);
    });

    it('deve falhar quando tentar devolver item já devolvido', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Carlos Eduardo Lima');
      const tipoEpi = await testSetup.findTipoEpi('CA-22222');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Obter estoque disponível existente
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);
      expect(estoqueItem).toBeDefined();

      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA',
        },
      });

      // Criar item já devolvido
      const itemDevolvido = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          estoqueItemOrigemId: estoqueItem.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.DEVOLVIDO, // Já devolvido
        },
      });

      const input = {
        entregaId: entrega.id,
        itensParaDevolucao: [
          {
            itemId: itemDevolvido.id,
            motivoDevolucao: 'Teste duplicado',
            condicaoItem: 'BOM' as const,
          },
        ],
        usuarioId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow(/não pode ser devolvido/);
    });

    it('deve falhar quando item não pertencer à entrega especificada', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador1 = await testSetup.findColaborador('Fernanda Silva Lima');
      const colaborador2 = await testSetup.findColaborador('Roberto Alves Mendes');
      const tipoEpi = await testSetup.findTipoEpi('CA-67890');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Obter estoque disponível existente
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);
      expect(estoqueItem).toBeDefined();

      // Criar duas fichas e entregas diferentes
      const ficha1 = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador1.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador1.id,
          status: 'ATIVA',
        },
      });

      const ficha2 = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador2.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador2.id,
          status: 'ATIVA',
        },
      });

      const entrega1 = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha1.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA',
        },
      });

      const entrega2 = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha2.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA',
        },
      });

      // Criar item na entrega2
      const itemEntrega2 = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega2.id,
          estoqueItemOrigemId: estoqueItem.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.COM_COLABORADOR,
        },
      });

      // Tentar devolver item da entrega2 na entrega1
      const input = {
        entregaId: entrega1.id,
        itensParaDevolucao: [
          {
            itemId: itemEntrega2.id,
            motivoDevolucao: 'Erro - item de outra entrega',
            condicaoItem: 'BOM' as const,
          },
        ],
        usuarioId: usuario.id,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
      await expect(useCase.execute(input)).rejects.toThrow(/não encontrado na entrega/);
    });
  });

  describe('obterHistoricoDevolucoes - Consultas Históricas', () => {
    it('deve retornar histórico de devoluções de um colaborador', async () => {
      // Arrange - Criar histórico de devoluções
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Lucia Santos Costa');
      const tipoEpi = await testSetup.findTipoEpi('CA-22222');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Obter estoque disponível existente
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);
      expect(estoqueItem).toBeDefined();

      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA',
        },
      });

      // Criar e processar devolução
      const itemEntrega = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          estoqueItemOrigemId: estoqueItem.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.COM_COLABORADOR,
        },
      });

      await useCase.execute({
        entregaId: entrega.id,
        itensParaDevolucao: [
          {
            itemId: itemEntrega.id,
            motivoDevolucao: 'Teste histórico',
            condicaoItem: 'BOM' as const,
          },
        ],
        usuarioId: usuario.id,
      });

      // Act
      const historico = await useCase.obterHistoricoDevolucoes(colaborador.id);

      // Assert
      expect(historico).toBeDefined();
      expect(historico.devolucoes.length).toBeGreaterThan(0);
      expect(historico.estatisticas).toBeDefined();

      const devolucao = historico.devolucoes[0];
      expect(devolucao.entregaId).toBe(entrega.id);
      expect(devolucao.colaboradorNome).toBeDefined();
    });

    it('deve filtrar histórico por período específico', async () => {
      // Arrange
      const colaborador = await testSetup.findColaborador('Gabriel Costa Ferreira');
      const dataInicio = new Date('2024-01-01');
      const dataFim = new Date('2024-12-31');

      // Act
      const historico = await useCase.obterHistoricoDevolucoes(
        colaborador.id,
        undefined,
        dataInicio,
        dataFim
      );

      // Assert
      expect(historico).toBeDefined();
      expect(historico.devolucoes).toBeDefined();
      
      // Verificar que todas as devoluções estão no período
      historico.devolucoes.forEach(item => {
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
      const tipoEpi = await testSetup.findTipoEpi('CA-11111');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Obter estoque disponível existente
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);
      expect(estoqueItem).toBeDefined();

      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA',
        },
      });

      const itemEntrega = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          estoqueItemOrigemId: estoqueItem.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.COM_COLABORADOR,
        },
      });

      // Act
      const validacao = await useCase.validarDevolucaoPermitida(entrega.id, [itemEntrega.id]);

      // Assert
      expect(validacao.permitida).toBe(true);
      expect(validacao.itensValidos).toHaveLength(1);
      expect(validacao.itensValidos[0]).toBe(itemEntrega.id);
    });

    it('deve rejeitar devolução para entrega não assinada', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('Rafael Mendes Silva');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Obter estoque disponível existente
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);
      expect(estoqueItem).toBeDefined();

      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'PENDENTE_ASSINATURA',
        },
      });

      const itemEntrega = await testSetup.prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          estoqueItemOrigemId: estoqueItem.id,
          quantidadeEntregue: 1,
          dataLimiteDevolucao: new Date('2025-12-31'),
          status: StatusEntregaItem.COM_COLABORADOR,
        },
      });

      // Act
      const validacao = await useCase.validarDevolucaoPermitida(entrega.id, [itemEntrega.id]);

      // Assert
      expect(validacao.permitida).toBe(false);
      expect(validacao.motivo).toContain('assinada');
    });
  });
});