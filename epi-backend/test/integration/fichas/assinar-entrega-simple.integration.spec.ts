import { describe, it, expect, beforeEach } from 'vitest';
import { AssinarEntregaUseCase } from '@application/use-cases/fichas/assinar-entrega.use-case';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('AssinarEntregaUseCase - Simple Integration Tests', () => {
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

  describe('execute - Teste Básico de Assinatura', () => {
    it('deve assinar entrega pendente com sucesso', async () => {
      // Arrange - Criar dados de teste diretamente no banco
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

      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
          dataEmissao: new Date(),
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'PENDENTE_ASSINATURA',
          dataEntrega: new Date(),
        },
      });

      // Act
      const result = await assinarEntregaUseCase.execute({
        entregaId: entrega.id,
        assinaturaColaborador: 'Assinatura do colaborador',
        observacoes: 'Teste de assinatura',
      });

      // Assert
      expect(result.id).toBe(entrega.id);
      expect(result.status).toBe('ASSINADA');
      expect(result.dataAssinatura).toBeDefined();
      expect(result.assinaturaColaborador).toBe('Assinatura do colaborador');

      // Verificar no banco
      const entregaDb = await testSetup.prismaService.entrega.findUnique({
        where: { id: entrega.id },
      });
      
      expect(entregaDb.status).toBe('ASSINADA');
      expect(entregaDb.dataAssinatura).toBeDefined();
      expect(entregaDb.linkAssinatura).toBe('Assinatura do colaborador');
    });

    it('deve falhar ao tentar assinar entrega inexistente', async () => {
      await expect(assinarEntregaUseCase.execute({
        entregaId: 'entrega-inexistente',
        assinaturaColaborador: 'Teste',
      })).rejects.toThrow(NotFoundError);
    });

    it('deve falhar ao tentar assinar entrega já assinada', async () => {
      // Arrange - Criar entrega já assinada
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      const usuario = await testSetup.prismaService.usuario.findFirst();
      const almoxarifado = await testSetup.prismaService.almoxarifado.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Colaborador Teste Dupla',
          cpf: `777${Date.now().toString().slice(-8)}`,
          matricula: `DUPLA${Date.now().toString().slice(-3)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const ficha = await testSetup.prismaService.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
          dataEmissao: new Date(),
        },
      });

      const entrega = await testSetup.prismaService.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: usuario.id,
          status: 'ASSINADA', // Já assinada
          dataEntrega: new Date(),
          dataAssinatura: new Date(),
        },
      });

      // Act & Assert
      await expect(assinarEntregaUseCase.execute({
        entregaId: entrega.id,
        assinaturaColaborador: 'Segunda assinatura',
      })).rejects.toThrow(BusinessError);
    });
  });
});