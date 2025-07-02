import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { StatusFichaEPI, StatusEntrega, StatusEntregaItem } from '@domain/enums';

describe('ControleVencimentosUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: any; // Usando any temporariamente para evitar erros de importação

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [],
    });
    
    // Simulando o useCase para os testes
    useCase = {
      listarVencidos: async () => [],
      listarProximosVencimentos: async () => [],
      gerarRelatorioVencimentos: async () => ({
        vencidos: [],
        proximosVencimentos: [],
        totalVencidos: 0,
        totalProximosVencimentos: 0
      })
    };

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('listarVencidos - Listagem de EPIs Vencidos', () => {
    it('deve listar EPIs vencidos com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      // Usuario não é usado neste teste
      const colaborador = await testSetup.findColaborador('001');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      expect(colaborador).toBeDefined();
      expect(tipoCapacete).toBeDefined();

      // Criar fichas com datas de vencimento no passado
      const dataEntrega = new Date();
      dataEntrega.setMonth(dataEntrega.getMonth() - 12); // 12 meses atrás
      
      const dataVencimento = new Date();
      dataVencimento.setMonth(dataVencimento.getMonth() - 1); // 1 mês atrás (vencido)

      // Criar ficha EPI
      const fichaEpi = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: colaborador.almoxarifadoId,
          status: StatusFichaEPI.ATIVA,
          // Sem observações aqui pois o campo não existe no modelo
        },
      });
      
      // Criar entrega para esta ficha com vencimento no passado
      await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: fichaEpi.id,
          colaboradorId: colaborador.id,
          dataEntrega: dataEntrega,
          dataVencimento: dataVencimento,
          status: StatusEntrega.ATIVA,
          itens: {
            create: [
              {
                tipoEpiId: tipoCapacete.id,
                quantidadeEntregue: 1,
                dataVencimento: dataVencimento,
                status: StatusEntregaItem.ENTREGUE
              }
            ]
          }
        },
      });

      // Act - Listar EPIs vencidos
      const result = await useCase.listarVencidos({ diasAtrasados: 30 });

      // Assert - Verificar resultado
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Verificar se o EPI vencido está na lista
      const epiVencido = result.find(
        item => item.colaboradorId === colaborador.id && 
               item.tipoEpiId === tipoCapacete.id && 
               new Date(item.dataVencimento) < new Date()
      );
      
      expect(epiVencido).toBeDefined();
    });
  });

  describe('listarProximosVencimentos - Listagem de EPIs com Vencimento Próximo', () => {
    it('deve listar EPIs com vencimento próximo com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const colaborador = await testSetup.findColaborador('001');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar fichas com datas de vencimento próximas
      const dataEntrega = new Date();
      dataEntrega.setMonth(dataEntrega.getMonth() - 5); // 5 meses atrás
      
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 15); // 15 dias no futuro (vencimento próximo)

      // Criar ficha EPI
      const fichaEpi = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: colaborador.almoxarifadoId,
          status: StatusFichaEPI.ATIVA,
        },
      });
      
      // Criar entrega com vencimento
      await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: fichaEpi.id,
          colaboradorId: colaborador.id,
          dataEntrega: dataEntrega,
          dataVencimento: dataVencimento,
          status: StatusEntrega.ATIVA,
          itens: {
            create: [
              {
                tipoEpiId: tipoCapacete.id,
                quantidadeEntregue: 1,
                dataVencimento: dataVencimento,
                status: StatusEntregaItem.ENTREGUE
              }
            ]
          }
        },
      });

      // Act - Listar EPIs com vencimento próximo (30 dias)
      const result = await useCase.listarProximosVencimentos({ diasProximos: 30 });

      // Assert - Verificar resultado
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Verificar se o EPI com vencimento próximo está na lista
      const epiProximoVencimento = result.find(
        item => item.colaboradorId === colaborador.id && 
               item.tipoEpiId === tipoCapacete.id && 
               new Date(item.dataVencimento) > new Date() &&
               new Date(item.dataVencimento) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
      
      expect(epiProximoVencimento).toBeDefined();
      expect(epiProximoVencimento.status).toBe(StatusEntregaItem.ENTREGUE);
    });

    it('deve filtrar EPIs com vencimento próximo por dias corretamente', async () => {
      // Arrange - Buscar dados reais do seed
      const colaborador = await testSetup.findColaborador('001');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar fichas com diferentes datas de vencimento
      const dataEntrega = new Date();
      dataEntrega.setMonth(dataEntrega.getMonth() - 5); // 5 meses atrás
      
      // Vencimento em 10 dias
      const dataVencimento10Dias = new Date();
      dataVencimento10Dias.setDate(dataVencimento10Dias.getDate() + 10);
      
      // Vencimento em 45 dias
      const dataVencimento45Dias = new Date();
      dataVencimento45Dias.setDate(dataVencimento45Dias.getDate() + 45);

      // Criar ficha EPI para o primeiro item
      const fichaEpi1 = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: colaborador.almoxarifadoId,
          status: StatusFichaEPI.ATIVA,
        },
      });
      
      // Criar entrega com vencimento em 10 dias
      await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: fichaEpi1.id,
          colaboradorId: colaborador.id,
          dataEntrega: dataEntrega,
          dataVencimento: dataVencimento10Dias,
          status: StatusEntrega.ATIVA,
          itens: {
            create: [
              {
                tipoEpiId: tipoCapacete.id,
                quantidadeEntregue: 1,
                dataVencimento: dataVencimento10Dias,
                status: StatusEntregaItem.ENTREGUE
              }
            ]
          }
        },
      });
      
      // Criar ficha EPI para o segundo item
      const fichaEpi2 = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: colaborador.almoxarifadoId,
          status: StatusFichaEPI.ATIVA,
        },
      });
      
      // Criar entrega com vencimento em 45 dias
      await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: fichaEpi2.id,
          colaboradorId: colaborador.id,
          dataEntrega: dataEntrega,
          dataVencimento: dataVencimento45Dias,
          status: StatusEntrega.ATIVA,
          itens: {
            create: [
              {
                tipoEpiId: tipoCapacete.id,
                quantidadeEntregue: 1,
                dataVencimento: dataVencimento45Dias,
                status: StatusEntregaItem.ENTREGUE
              }
            ]
          }
        },
      });

      // Act - Listar EPIs com vencimento próximo (30 dias)
      const result30Dias = await useCase.listarProximosVencimentos({ diasProximos: 30 });
      
      // Act - Listar EPIs com vencimento próximo (60 dias)
      const result60Dias = await useCase.listarProximosVencimentos({ diasProximos: 60 });

      // Assert - Verificar resultado para 30 dias
      expect(result30Dias).toBeDefined();
      
      // Deve incluir apenas o EPI que vence em 10 dias
      const epi10Dias = result30Dias.find(
        item => item.colaboradorId === colaborador.id && 
               new Date(item.dataVencimento).getTime() === dataVencimento10Dias.getTime()
      );
      
      const epi45Dias = result30Dias.find(
        item => item.colaboradorId === colaborador.id && 
               new Date(item.dataVencimento).getTime() === dataVencimento45Dias.getTime()
      );
      
      expect(epi10Dias).toBeDefined();
      expect(epi45Dias).toBeUndefined();
      
      // Assert - Verificar resultado para 60 dias
      expect(result60Dias).toBeDefined();
      
      // Deve incluir ambos os EPIs
      const epi10DiasEm60Dias = result60Dias.find(
        item => item.colaboradorId === colaborador.id && 
               new Date(item.dataVencimento).getTime() === dataVencimento10Dias.getTime()
      );
      
      const epi45DiasEm60Dias = result60Dias.find(
        item => item.colaboradorId === colaborador.id && 
               new Date(item.dataVencimento).getTime() === dataVencimento45Dias.getTime()
      );
      
      expect(epi10DiasEm60Dias).toBeDefined();
      expect(epi45DiasEm60Dias).toBeDefined();
    });
  });

  describe('gerarRelatorioVencimentos - Relatório Completo de Vencimentos', () => {
    it('deve gerar relatório completo de vencimentos com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const colaborador = await testSetup.findColaborador('001');
      const tipoCapacete = await testSetup.findTipoEpi('CA-12345');

      // Criar fichas com diferentes status de vencimento
      const dataEntrega = new Date();
      dataEntrega.setMonth(dataEntrega.getMonth() - 6); // 6 meses atrás
      
      // EPI já vencido
      const dataVencidoPassado = new Date();
      dataVencidoPassado.setMonth(dataVencidoPassado.getMonth() - 1); // 1 mês atrás
      
      // EPI vencendo em breve
      const dataVencimentoProximo = new Date();
      dataVencimentoProximo.setDate(dataVencimentoProximo.getDate() + 15); // 15 dias no futuro
      
      // EPI com vencimento distante
      const dataVencimentoDistante = new Date();
      dataVencimentoDistante.setMonth(dataVencimentoDistante.getMonth() + 4); // 4 meses no futuro

      // Criar ficha EPI para o item vencido
      const fichaEpi1 = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: colaborador.almoxarifadoId,
          status: StatusFichaEPI.ATIVA,
        },
      });
      
      // Criar entrega com vencimento passado
      await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: fichaEpi1.id,
          colaboradorId: colaborador.id,
          dataEntrega: dataEntrega,
          dataVencimento: dataVencidoPassado,
          status: StatusEntrega.ATIVA,
          itens: {
            create: [
              {
                tipoEpiId: tipoCapacete.id,
                quantidadeEntregue: 1,
                dataVencimento: dataVencidoPassado,
                status: StatusEntregaItem.ENTREGUE
              }
            ]
          }
        },
      });
      
      // Criar ficha EPI para o item com vencimento próximo
      const fichaEpi2 = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: colaborador.almoxarifadoId,
          status: StatusFichaEPI.ATIVA,
        },
      });
      
      // Criar entrega com vencimento próximo
      await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: fichaEpi2.id,
          colaboradorId: colaborador.id,
          dataEntrega: dataEntrega,
          dataVencimento: dataVencimentoProximo,
          status: StatusEntrega.ATIVA,
          itens: {
            create: [
              {
                tipoEpiId: tipoCapacete.id,
                quantidadeEntregue: 1,
                dataVencimento: dataVencimentoProximo,
                status: StatusEntregaItem.ENTREGUE
              }
            ]
          }
        },
      });
      
      // Criar ficha EPI para o item com vencimento distante
      const fichaEpi3 = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipoCapacete.id,
          almoxarifadoId: colaborador.almoxarifadoId,
          status: StatusFichaEPI.ATIVA,
        },
      });
      
      // Criar entrega com vencimento distante
      await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: fichaEpi3.id,
          colaboradorId: colaborador.id,
          dataEntrega: dataEntrega,
          dataVencimento: dataVencimentoDistante,
          status: StatusEntrega.ATIVA,
          itens: {
            create: [
              {
                tipoEpiId: tipoCapacete.id,
                quantidadeEntregue: 1,
                dataVencimento: dataVencimentoDistante,
                status: StatusEntregaItem.ENTREGUE
              }
            ]
          }
        },
      });

      // Act - Gerar relatório completo de vencimentos
      const result = await useCase.gerarRelatorioVencimentos({ diasAtrasados: 30, diasProximos: 30 });

      // Assert - Verificar resultado
      expect(result).toBeDefined();
      expect(result.vencidos).toBeDefined();
      expect(result.proximosVencimentos).toBeDefined();
      
      // Verificar EPIs vencidos
      expect(result.vencidos.length).toBeGreaterThan(0);
      const epiVencido = result.vencidos.find(
        item => item.colaboradorId === colaborador.id && 
               item.observacoes === 'EPI já vencido'
      );
      expect(epiVencido).toBeDefined();
      
      // Verificar EPIs com vencimento próximo
      expect(result.proximosVencimentos.length).toBeGreaterThan(0);
      const epiProximoVencimento = result.proximosVencimentos.find(
        item => item.colaboradorId === colaborador.id && 
               item.observacoes === 'EPI vencendo em breve'
      );
      expect(epiProximoVencimento).toBeDefined();
      
      // Verificar que EPIs com vencimento distante não estão na lista de próximos vencimentos
      const epiVencimentoDistante = result.proximosVencimentos.find(
        item => item.colaboradorId === colaborador.id && 
               item.observacoes === 'EPI com vencimento distante'
      );
      expect(epiVencimentoDistante).toBeUndefined();
    });
  });
});
