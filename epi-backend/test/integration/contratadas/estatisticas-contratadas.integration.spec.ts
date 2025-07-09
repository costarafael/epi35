import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ContratadaRepository } from '@infrastructure/repositories/contratada.repository';
import { ListarContratadasUseCase } from '@application/use-cases/contratadas/listar-contratadas.use-case';

describe('Estatísticas Contratadas - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;
  let listarUseCase: ListarContratadasUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        // ContratadaRepository
        {
          provide: 'IContratadaRepository',
          useFactory: (prisma: PrismaService) => new ContratadaRepository(prisma),
          inject: [PrismaService],
        },
        ContratadaRepository,
        // Use Cases
        {
          provide: ListarContratadasUseCase,
          useFactory: (repository: ContratadaRepository) => new ListarContratadasUseCase(repository),
          inject: ['IContratadaRepository'],
        },
      ],
    });

    prismaService = testSetup.app.get<PrismaService>(PrismaService);
    listarUseCase = testSetup.app.get<ListarContratadasUseCase>(ListarContratadasUseCase);
  });

  describe('Estatísticas com EPIs Ativos', () => {
    it('deve retornar estatísticas com total de EPIs ativos por contratada', async () => {
      // Criar uma entrega para um colaborador para ter EPIs ativos
      const colaborador = await prismaService.colaborador.findFirst({
        where: { contratadaId: { not: null } },
      });
      
      const fichaEpi = await prismaService.fichaEPI.findFirst({
        where: { colaboradorId: colaborador?.id },
      });
      
      const almoxarifado = await prismaService.almoxarifado.findFirst();
      const usuario = await prismaService.usuario.findFirst();
      const estoqueItem = await prismaService.estoqueItem.findFirst();
      
      // Criar uma entrega
      const entrega = await prismaService.entrega.create({
        data: {
          fichaEpiId: fichaEpi!.id,
          almoxarifadoId: almoxarifado!.id,
          responsavelId: usuario!.id,
          status: 'ASSINADA',
        },
      });
      
      // Criar item de entrega com status COM_COLABORADOR
      await prismaService.entregaItem.create({
        data: {
          entregaId: entrega.id,
          estoqueItemOrigemId: estoqueItem!.id,
          quantidadeEntregue: 1,
          status: 'COM_COLABORADOR',
        },
      });

      // Testar diretamente o use case
      const result = await listarUseCase.obterEstatisticas();
      
      // Verificar estrutura básica
      expect(result.total).toBeGreaterThan(0);
      expect(result.colaboradoresVinculados).toBeGreaterThan(0);
      expect(result.topContratadas).toBeInstanceOf(Array);
      
      // Verificar que os EPIs ativos estão sendo contados
      const contratadaComEpi = result.topContratadas.find(
        (item: any) => item.contratada.id === colaborador?.contratadaId
      );
      
      expect(contratadaComEpi).toBeDefined();
      expect(contratadaComEpi.totalEpisAtivos).toBeGreaterThan(0);
      
      // Verificar estrutura completa
      expect(contratadaComEpi).toEqual({
        contratada: {
          id: expect.any(String),
          nome: expect.any(String),
          cnpjFormatado: expect.any(String),
        },
        totalColaboradores: expect.any(Number),
        totalEpisAtivos: expect.any(Number),
      });
    });

    it('deve retornar 0 EPIs ativos para contratada sem entregas', async () => {
      const result = await listarUseCase.obterEstatisticas();
      
      // Todas as contratadas devem ter 0 EPIs ativos quando não há entregas
      result.topContratadas.forEach((contratada: any) => {
        expect(contratada.totalEpisAtivos).toBe(0);
      });
    });
  });
});