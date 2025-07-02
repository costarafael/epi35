import { describe, it, expect, beforeEach } from 'vitest';
import { RelatorioEntregasColaboradorUseCase } from '@application/use-cases/queries/relatorio-entregas-colaborador.use-case';
import { FichaRepository } from '@infrastructure/repositories/ficha.repository';
import { ColaboradorRepository } from '@infrastructure/repositories/colaborador.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { StatusFichaEpi, TipoEpi } from '@domain/enums';

describe('RelatorioEntregasColaboradorUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: RelatorioEntregasColaboradorUseCase;
  let fichaRepository: FichaRepository;
  let colaboradorRepository: ColaboradorRepository;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        RelatorioEntregasColaboradorUseCase,
        {
          provide: 'IFichaRepository',
          useFactory: (prisma: PrismaService) => new FichaRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: 'IColaboradorRepository',
          useFactory: (prisma: PrismaService) => new ColaboradorRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: FichaRepository,
          useFactory: (prisma: PrismaService) => new FichaRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: ColaboradorRepository,
          useFactory: (prisma: PrismaService) => new ColaboradorRepository(prisma),
          inject: [PrismaService],
        },
      ],
    });

    useCase = testSetup.app.get<RelatorioEntregasColaboradorUseCase>(RelatorioEntregasColaboradorUseCase);
    fichaRepository = testSetup.app.get<FichaRepository>(FichaRepository);
    colaboradorRepository = testSetup.app.get<ColaboradorRepository>(ColaboradorRepository);

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('execute - Relatório de Entregas por Colaborador', () => {
    it('deve gerar relatório de entregas por colaborador com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador();
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      expect(usuario).toBeDefined();
      expect(colaborador).toBeDefined();
      expect(tipoCapacete).toBeDefined();

      // Criar algumas fichas para o colaborador
      const dataHoje = new Date();
      const dataMesPassado = new Date();
      dataMesPassado.setMonth(dataMesPassado.getMonth() - 1);

      await testSetup.prismaService.fichaEpi.createMany({
        data: [
          {
            colaboradorId: colaborador.id,
            tipoEpiId: tipoCapacete.id,
            status: StatusFichaEpi.ENTREGUE,
            dataEntrega: dataHoje,
            usuarioEntregaId: usuario.id,
            quantidade: 1,
            observacoes: 'Entrega recente',
          },
          {
            colaboradorId: colaborador.id,
            tipoEpiId: tipoCapacete.id,
            status: StatusFichaEpi.ENTREGUE,
            dataEntrega: dataMesPassado,
            usuarioEntregaId: usuario.id,
            quantidade: 1,
            observacoes: 'Entrega antiga',
          },
        ],
      });

      // Act - Gerar relatório sem filtros
      const result = await useCase.execute({});

      // Assert - Verificar resultado do relatório
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Verificar se o colaborador está no relatório
      const entregasColaborador = result.find(item => item.colaboradorId === colaborador.id);
      expect(entregasColaborador).toBeDefined();
      expect(entregasColaborador.entregas.length).toBeGreaterThanOrEqual(2);
    });

    it('deve filtrar relatório por período com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador();
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar fichas em diferentes períodos
      const dataHoje = new Date();
      const data3MesesAtras = new Date();
      data3MesesAtras.setMonth(data3MesesAtras.getMonth() - 3);
      
      const data2MesesAtras = new Date();
      data2MesesAtras.setMonth(data2MesesAtras.getMonth() - 2);
      
      const data1MesAtras = new Date();
      data1MesAtras.setMonth(data1MesAtras.getMonth() - 1);

      await testSetup.prismaService.fichaEpi.createMany({
        data: [
          {
            colaboradorId: colaborador.id,
            tipoEpiId: tipoCapacete.id,
            status: StatusFichaEpi.ENTREGUE,
            dataEntrega: dataHoje,
            usuarioEntregaId: usuario.id,
            quantidade: 1,
            observacoes: 'Entrega hoje',
          },
          {
            colaboradorId: colaborador.id,
            tipoEpiId: tipoCapacete.id,
            status: StatusFichaEpi.ENTREGUE,
            dataEntrega: data1MesAtras,
            usuarioEntregaId: usuario.id,
            quantidade: 1,
            observacoes: 'Entrega 1 mês atrás',
          },
          {
            colaboradorId: colaborador.id,
            tipoEpiId: tipoCapacete.id,
            status: StatusFichaEpi.ENTREGUE,
            dataEntrega: data3MesesAtras,
            usuarioEntregaId: usuario.id,
            quantidade: 1,
            observacoes: 'Entrega 3 meses atrás',
          },
        ],
      });

      // Act - Gerar relatório com filtro de período (últimos 2 meses)
      const result = await useCase.execute({
        dataInicio: data2MesesAtras,
        dataFim: dataHoje,
      });

      // Assert - Verificar resultado do relatório
      expect(result).toBeDefined();
      
      // Verificar se o colaborador está no relatório
      const entregasColaborador = result.find(item => item.colaboradorId === colaborador.id);
      expect(entregasColaborador).toBeDefined();
      
      // Deve ter apenas as entregas dos últimos 2 meses
      const entregasNoPeriodo = entregasColaborador.entregas.filter(
        e => new Date(e.dataEntrega) >= data2MesesAtras && new Date(e.dataEntrega) <= dataHoje
      );
      
      expect(entregasNoPeriodo.length).toBeGreaterThanOrEqual(2);
      
      // Verificar se não tem entregas de 3 meses atrás
      const entregasAntigas = entregasColaborador.entregas.filter(
        e => new Date(e.dataEntrega) < data2MesesAtras
      );
      
      expect(entregasAntigas.length).toBe(0);
    });

    it('deve filtrar relatório por tipo de EPI com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador();
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');
      
      // Buscar ou criar outro tipo de EPI para teste
      let tipoLuva = await testSetup.prismaService.tipoEpi.findFirst({
        where: { tipo: TipoEpi.LUVA },
      });
      
      if (!tipoLuva) {
        tipoLuva = await testSetup.prismaService.tipoEpi.create({
          data: {
            nome: 'Luva de Proteção',
            tipo: TipoEpi.LUVA,
            ca: 'CA-67890',
            descricao: 'Luva de proteção para teste',
            validadeEmMeses: 6,
          },
        });
      }

      // Criar fichas para diferentes tipos de EPI
      const dataHoje = new Date();
      
      await testSetup.prismaService.fichaEpi.createMany({
        data: [
          {
            colaboradorId: colaborador.id,
            tipoEpiId: tipoCapacete.id,
            status: StatusFichaEpi.ENTREGUE,
            dataEntrega: dataHoje,
            usuarioEntregaId: usuario.id,
            quantidade: 1,
            observacoes: 'Entrega de capacete',
          },
          {
            colaboradorId: colaborador.id,
            tipoEpiId: tipoLuva.id,
            status: StatusFichaEpi.ENTREGUE,
            dataEntrega: dataHoje,
            usuarioEntregaId: usuario.id,
            quantidade: 2,
            observacoes: 'Entrega de luva',
          },
        ],
      });

      // Act - Gerar relatório com filtro por tipo de EPI (apenas capacetes)
      const result = await useCase.execute({
        tipoEpiId: tipoCapacete.id,
      });

      // Assert - Verificar resultado do relatório
      expect(result).toBeDefined();
      
      // Verificar se o colaborador está no relatório
      const entregasColaborador = result.find(item => item.colaboradorId === colaborador.id);
      expect(entregasColaborador).toBeDefined();
      
      // Verificar se todas as entregas são do tipo capacete
      const entregasCapacete = entregasColaborador.entregas.filter(
        e => e.tipoEpiId === tipoCapacete.id
      );
      
      expect(entregasCapacete.length).toBeGreaterThanOrEqual(1);
      
      // Verificar se não tem entregas de luvas
      const entregasLuva = entregasColaborador.entregas.filter(
        e => e.tipoEpiId === tipoLuva.id
      );
      
      expect(entregasLuva.length).toBe(0);
    });

    it('deve agrupar entregas por colaborador corretamente', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      
      // Buscar ou criar dois colaboradores para teste
      const colaborador1 = await testSetup.findColaborador();
      
      let colaborador2 = await testSetup.prismaService.colaborador.findFirst({
        where: { 
          NOT: { id: colaborador1.id }
        },
      });
      
      if (!colaborador2) {
        colaborador2 = await testSetup.prismaService.colaborador.create({
          data: {
            nome: 'Colaborador Teste 2',
            matricula: 'MAT-002',
            cpf: '98765432100',
            cargo: 'Técnico',
            setor: 'Manutenção',
            ativo: true,
          },
        });
      }
      
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar fichas para diferentes colaboradores
      const dataHoje = new Date();
      
      await testSetup.prismaService.fichaEpi.createMany({
        data: [
          {
            colaboradorId: colaborador1.id,
            tipoEpiId: tipoCapacete.id,
            status: StatusFichaEpi.ENTREGUE,
            dataEntrega: dataHoje,
            usuarioEntregaId: usuario.id,
            quantidade: 1,
            observacoes: 'Entrega para colaborador 1',
          },
          {
            colaboradorId: colaborador2.id,
            tipoEpiId: tipoCapacete.id,
            status: StatusFichaEpi.ENTREGUE,
            dataEntrega: dataHoje,
            usuarioEntregaId: usuario.id,
            quantidade: 1,
            observacoes: 'Entrega para colaborador 2',
          },
        ],
      });

      // Act - Gerar relatório
      const result = await useCase.execute({});

      // Assert - Verificar resultado do relatório
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(2);
      
      // Verificar se ambos os colaboradores estão no relatório
      const entregasColaborador1 = result.find(item => item.colaboradorId === colaborador1.id);
      const entregasColaborador2 = result.find(item => item.colaboradorId === colaborador2.id);
      
      expect(entregasColaborador1).toBeDefined();
      expect(entregasColaborador2).toBeDefined();
      
      // Verificar se as entregas estão corretamente associadas aos colaboradores
      expect(entregasColaborador1.entregas.some(e => e.observacoes === 'Entrega para colaborador 1')).toBe(true);
      expect(entregasColaborador2.entregas.some(e => e.observacoes === 'Entrega para colaborador 2')).toBe(true);
    });
  });
});
