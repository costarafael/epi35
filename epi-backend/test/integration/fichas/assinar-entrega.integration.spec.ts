import { describe, it, expect, beforeEach } from 'vitest';
import { AssinarEntregaUseCase } from '@application/use-cases/fichas/assinar-entrega.use-case';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('AssinarEntregaUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let assinarEntregaUseCase: AssinarEntregaUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        {
          provide: AssinarEntregaUseCase,
          useFactory: (prismaService: any) => {
            return new AssinarEntregaUseCase(prismaService);
          },
          inject: [PrismaService],
        },
      ],
    });

    assinarEntregaUseCase = testSetup.app.get<AssinarEntregaUseCase>(AssinarEntregaUseCase);

    await testSetup.resetTestData();
  });

  describe('execute - Fluxo Completo de Assinatura', () => {
    it('deve assinar entrega pendente com sucesso', async () => {
      // Arrange - Criar dados de teste manuais 
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      const usuario = await testSetup.prismaService.usuario.findFirst();
      const almoxarifado = await testSetup.prismaService.almoxarifado.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Colaborador Teste Assinatura',
          cpf: `888${Date.now().toString().slice(-8)}`,
          matricula: `ASSINAR${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha ativa
      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
          dataEmissao: new Date(),
        },
      });

      // Criar entrega pendente de assinatura
      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'PENDENTE_ASSINATURA',
          dataEntrega: new Date(),
        },
      });

      const input = {
        entregaId: entrega.id,
        assinaturaColaborador: 'Assinatura do colaborador de teste',
        observacoes: 'Entrega assinada em teste de integração',
      };

      // Act
      const result = await assinarEntregaUseCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(entrega.id);
      expect(result.status).toBe('ASSINADA');
      expect(result.dataAssinatura).toBeDefined();
      expect(result.assinaturaColaborador).toBe(input.assinaturaColaborador);
      expect(result.observacoes).toBe(input.observacoes);
      expect(result.fichaEpiId).toBe(ficha.id);

      // Verificar se foi atualizada no banco
      const entregaDb = await testSetup.prismaService.entrega.findUnique({
        where: { id: entrega.id },
      });

      expect(entregaDb).toBeDefined();
      expect(entregaDb.status).toBe('ASSINADA');
      expect(entregaDb.dataAssinatura).toBeDefined();
      expect(entregaDb.linkAssinatura).toBe(input.assinaturaColaborador);
    });

    it('deve assinar entrega sem assinatura nem observações', async () => {
      // Arrange - Criar entrega pendente
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      const usuario = await testSetup.prismaService.usuario.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Colaborador Teste Assinatura Simples',
          cpf: `777${Date.now().toString().slice(-8)}`,
          matricula: `SIMPLES${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const ficha = await criarFichaUseCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      });

      const estoqueItem = await testSetup.prismaService.estoqueItem.findFirst({
        where: { status: 'DISPONIVEL' },
      });

      const entrega = await criarEntregaUseCase.execute({
        fichaEpiId: ficha.id,
        quantidade: 1,
        itens: [{
          numeroSerie: `TESTE-${Date.now()}`,
          estoqueItemOrigemId: estoqueItem.id,
        }],
        usuarioId: usuario.id,
      });

      const input = {
        entregaId: entrega.id,
      };

      // Act
      const result = await assinarEntregaUseCase.execute(input);

      // Assert
      expect(result.status).toBe('ASSINADA');
      expect(result.dataAssinatura).toBeDefined();
      expect(result.assinaturaColaborador).toBeUndefined();
      expect(result.observacoes).toBeUndefined();
    });
  });

  describe('execute - Validações de Negócio', () => {
    it('deve falhar ao tentar assinar entrega inexistente', async () => {
      // Arrange
      const input = {
        entregaId: 'entrega-inexistente',
        assinaturaColaborador: 'Teste',
      };

      // Act & Assert
      await expect(assinarEntregaUseCase.execute(input)).rejects.toThrow(NotFoundError);
    });

    it('deve falhar ao tentar assinar entrega já assinada', async () => {
      // Arrange - Criar e assinar entrega
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      const usuario = await testSetup.prismaService.usuario.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Colaborador Teste Dupla Assinatura',
          cpf: `666${Date.now().toString().slice(-8)}`,
          matricula: `DUPLA${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const ficha = await criarFichaUseCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      });

      const estoqueItem = await testSetup.prismaService.estoqueItem.findFirst({
        where: { status: 'DISPONIVEL' },
      });

      const entrega = await criarEntregaUseCase.execute({
        fichaEpiId: ficha.id,
        quantidade: 1,
        itens: [{
          numeroSerie: `TESTE-${Date.now()}`,
          estoqueItemOrigemId: estoqueItem.id,
        }],
        usuarioId: usuario.id,
      });

      // Assinar primeira vez
      await assinarEntregaUseCase.execute({
        entregaId: entrega.id,
        assinaturaColaborador: 'Primeira assinatura',
      });

      // Act & Assert - Tentar assinar novamente
      await expect(assinarEntregaUseCase.execute({
        entregaId: entrega.id,
        assinaturaColaborador: 'Segunda assinatura',
      })).rejects.toThrow(BusinessError);
    });

    it('deve falhar ao tentar assinar entrega cancelada', async () => {
      // Arrange - Criar entrega e cancelar manualmente
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      const usuario = await testSetup.prismaService.usuario.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Colaborador Teste Entrega Cancelada',
          cpf: `555${Date.now().toString().slice(-8)}`,
          matricula: `CANCEL${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const ficha = await criarFichaUseCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      });

      const estoqueItem = await testSetup.prismaService.estoqueItem.findFirst({
        where: { status: 'DISPONIVEL' },
      });

      const entrega = await criarEntregaUseCase.execute({
        fichaEpiId: ficha.id,
        quantidade: 1,
        itens: [{
          numeroSerie: `TESTE-${Date.now()}`,
          estoqueItemOrigemId: estoqueItem.id,
        }],
        usuarioId: usuario.id,
      });

      // Cancelar entrega manualmente
      await testSetup.prismaService.entrega.update({
        where: { id: entrega.id },
        data: { status: 'CANCELADA' },
      });

      // Act & Assert
      await expect(assinarEntregaUseCase.execute({
        entregaId: entrega.id,
        assinaturaColaborador: 'Teste',
      })).rejects.toThrow(BusinessError);
    });

    it('deve falhar ao tentar assinar entrega de ficha inativa', async () => {
      // Arrange - Criar entrega e inativar ficha
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      const usuario = await testSetup.prismaService.usuario.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Colaborador Teste Ficha Inativa',
          cpf: `444${Date.now().toString().slice(-8)}`,
          matricula: `INATIVA${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const ficha = await criarFichaUseCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      });

      const estoqueItem = await testSetup.prismaService.estoqueItem.findFirst({
        where: { status: 'DISPONIVEL' },
      });

      const entrega = await criarEntregaUseCase.execute({
        fichaEpiId: ficha.id,
        quantidade: 1,
        itens: [{
          numeroSerie: `TESTE-${Date.now()}`,
          estoqueItemOrigemId: estoqueItem.id,
        }],
        usuarioId: usuario.id,
      });

      // Inativar ficha
      await testSetup.prismaService.fichaEPI.update({
        where: { id: ficha.id },
        data: { status: 'INATIVA' },
      });

      // Act & Assert
      await expect(assinarEntregaUseCase.execute({
        entregaId: entrega.id,
        assinaturaColaborador: 'Teste',
      })).rejects.toThrow(BusinessError);
    });
  });

  describe('execute - Validação de Observações', () => {
    it('deve aceitar observações longas até o limite', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      const usuario = await testSetup.prismaService.usuario.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Colaborador Teste Observações',
          cpf: `333${Date.now().toString().slice(-8)}`,
          matricula: `OBS${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const ficha = await criarFichaUseCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      });

      const estoqueItem = await testSetup.prismaService.estoqueItem.findFirst({
        where: { status: 'DISPONIVEL' },
      });

      const entrega = await criarEntregaUseCase.execute({
        fichaEpiId: ficha.id,
        quantidade: 1,
        itens: [{
          numeroSerie: `TESTE-${Date.now()}`,
          estoqueItemOrigemId: estoqueItem.id,
        }],
        usuarioId: usuario.id,
      });

      const observacoesLongas = 'A'.repeat(500); // Máximo permitido pelo schema

      // Act
      const result = await assinarEntregaUseCase.execute({
        entregaId: entrega.id,
        observacoes: observacoesLongas,
      });

      // Assert
      expect(result.observacoes).toBe(observacoesLongas);
    });
  });
});