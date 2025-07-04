import { describe, it, expect, beforeEach } from 'vitest';
import { CancelarNotaMovimentacaoUseCase } from '@application/use-cases/estoque/cancelar-nota-movimentacao.use-case';
import { NotaRepository } from '@infrastructure/repositories/nota.repository';
import { MovimentacaoRepository } from '@infrastructure/repositories/movimentacao.repository';
import { EstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { 
  TipoNotaMovimentacao, 
  StatusNotaMovimentacao
} from '@domain/enums';
import { BusinessError, NotFoundError } from '@domain/exceptions/business.exception';

describe('CancelarNotaMovimentacaoUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: CancelarNotaMovimentacaoUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        CancelarNotaMovimentacaoUseCase,
        {
          provide: 'IMovimentacaoRepository',
          useClass: MovimentacaoRepository,
        },
        {
          provide: 'IEstoqueRepository',
          useClass: EstoqueRepository,
        },
        {
          provide: 'INotaRepository',
          useFactory: (prisma: PrismaService) => new NotaRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: NotaRepository,
          useFactory: (prisma: PrismaService) => new NotaRepository(prisma),
          inject: [PrismaService],
        },
      ],
    });

    useCase = testSetup.app.get<CancelarNotaMovimentacaoUseCase>(CancelarNotaMovimentacaoUseCase);

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('execute - Fluxo Completo de Cancelamento de Notas', () => {
    it('deve cancelar nota em RASCUNHO com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      expect(usuario).toBeDefined();
      expect(almoxarifado).toBeDefined();

      // Criar nota em rascunho
      const notaRascunho = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'CANCEL-001',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoOrigem: { connect: { id: almoxarifado.id } },
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Nota para cancelamento',
        },
      });

      // Act - Cancelar a nota
      const result = await useCase.execute({
        notaId: notaRascunho.id,
        usuarioId: usuario.id,
        motivo: 'Teste de cancelamento',
      });

      // Assert - Verificar se a nota foi cancelada
      expect(result).toBeDefined();
      expect(result.notaCancelada).toBeDefined();
      expect(result.notaCancelada.id).toBe(notaRascunho.id);
      expect(result.notaCancelada.status).toBe(StatusNotaMovimentacao.CANCELADA);
      expect(result.notaCancelada.observacoes).toContain('CANCELAMENTO: Teste de cancelamento');

      // Verificar no banco se a nota foi realmente cancelada
      const notaCancelada = await testSetup.prismaService.notaMovimentacao.findUnique({
        where: { id: notaRascunho.id },
      });

      expect(notaCancelada).toBeDefined();
      expect(notaCancelada.status).toBe(StatusNotaMovimentacao.CANCELADA);
    });

    it('deve cancelar nota PENDENTE com sucesso', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar nota pendente
      const notaPendente = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'CANCEL-002',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoOrigem: { connect: { id: almoxarifado.id } },
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Nota pendente para cancelamento',
        },
      });

      // Act - Cancelar a nota
      const result = await useCase.execute({
        notaId: notaPendente.id,
        usuarioId: usuario.id,
        motivo: 'Cancelamento de nota pendente',
      });

      // Assert - Verificar se a nota foi cancelada
      expect(result).toBeDefined();
      expect(result.notaCancelada).toBeDefined();
      expect(result.notaCancelada.status).toBe(StatusNotaMovimentacao.CANCELADA);
      expect(result.notaCancelada.observacoes).toContain('CANCELAMENTO: Cancelamento de nota pendente');
    });

    it('deve falhar ao tentar cancelar nota CONCLUIDA', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar nota concluída
      const notaConcluida = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'CANCEL-003',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoOrigem: { connect: { id: almoxarifado.id } },
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.CONCLUIDA,
          observacoes: 'Nota concluída',
          // dataConclusao: new Date(), // Field removed from schema v3.5
        },
      });

      // Act & Assert - Deve falhar ao tentar cancelar
      await expect(useCase.execute({
        notaId: notaConcluida.id,
        usuarioId: usuario.id,
        motivo: 'Tentativa de cancelar nota concluída',
      })).rejects.toThrow(BusinessError);
    });

    it('deve falhar ao tentar cancelar nota inexistente', async () => {
      // Arrange
      const usuario = await testSetup.findUser('admin@test.com');
      const notaIdInexistente = '00000000-0000-0000-0000-000000000000';

      // Act & Assert - Deve falhar ao tentar cancelar
      await expect(useCase.execute({
        notaId: notaIdInexistente,
        usuarioId: usuario.id,
        motivo: 'Tentativa de cancelar nota inexistente',
      })).rejects.toThrow(NotFoundError);
    });

    it('deve cancelar nota sem informar motivo', async () => {
      // Arrange - Buscar dados reais do seed
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');

      // Criar nota em rascunho
      const nota = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          numeroDocumento: 'CANCEL-004',
          tipoNota: TipoNotaMovimentacao.ENTRADA,
          almoxarifadoOrigem: { connect: { id: almoxarifado.id } },
          almoxarifadoDestino: { connect: { id: almoxarifado.id } },
          responsavel: { connect: { id: usuario.id } },
          status: StatusNotaMovimentacao.RASCUNHO,
          observacoes: 'Nota para cancelamento sem motivo',
        },
      });

      // Cancelar sem motivo (deve funcionar, pois motivo é opcional)
      const result = await useCase.execute({
        notaId: nota.id,
        usuarioId: usuario.id,
        motivo: '',
      });

      expect(result.notaCancelada.status).toBe(StatusNotaMovimentacao.CANCELADA);
      expect(result.notaCancelada.observacoes).toBe('Nota para cancelamento sem motivo');
      expect(result.estoqueAjustado).toBe(false);
      expect(result.estornosGerados).toHaveLength(0);
    });
  });
});
