import { describe, it, expect, beforeEach } from 'vitest';
import { ListarUsuariosUseCase } from '@application/use-cases/usuarios/listar-usuarios.use-case';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('ListarUsuariosUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: ListarUsuariosUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        {
          provide: ListarUsuariosUseCase,
          useFactory: (prismaService: any) => {
            return new ListarUsuariosUseCase(prismaService);
          },
          inject: [PrismaService],
        },
      ],
    });

    useCase = testSetup.app.get<ListarUsuariosUseCase>(ListarUsuariosUseCase);

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('execute', () => {
    beforeEach(async () => {
      // Criar usuários de teste
      await testSetup.prismaService.usuario.createMany({
        data: [
          {
            id: 'user-1',
            nome: 'João Silva',
            email: 'joao@empresa.com',
          },
          {
            id: 'user-2',
            nome: 'Maria Santos',
            email: 'maria@empresa.com',
          },
          {
            id: 'user-3',
            nome: 'Pedro Oliveira',
            email: 'pedro@contratada.com',
          },
        ],
      });
    });

    it('deve listar todos os usuários', async () => {
      const result = await useCase.execute();

      // O seed cria 3 usuários + os 3 do teste = 6 total
      expect(result.items).toHaveLength(6);
      expect(result.pagination.total).toBe(6);
      
      // Verificar que nossos usuários estão na lista
      expect(result.items.some(u => u.id === 'user-1' && u.nome === 'João Silva')).toBe(true);
      expect(result.items.some(u => u.id === 'user-2' && u.nome === 'Maria Santos')).toBe(true);
      expect(result.items.some(u => u.id === 'user-3' && u.nome === 'Pedro Oliveira')).toBe(true);
    });

    it('deve filtrar usuários por nome', async () => {
      const result = await useCase.execute({ nome: 'joão' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'user-1',
        nome: 'João Silva',
        email: 'joao@empresa.com',
      });
    });

    it('deve filtrar usuários por email', async () => {
      const result = await useCase.execute({ email: 'contratada' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'user-3',
        nome: 'Pedro Oliveira',
        email: 'pedro@contratada.com',
      });
    });

    it('deve paginar resultados', async () => {
      const result = await useCase.execute({ limit: 2, page: 1 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 6, // seed + test users
        totalPages: 3,
      });
    });

    it('deve retornar página vazia quando não há mais resultados', async () => {
      const result = await useCase.execute({ page: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.pagination.page).toBe(10);
    });

    it('deve retornar lista vazia quando não há usuários', async () => {
      // Limpar todos os usuários manualmente (incluindo seed data)
      await testSetup.prismaService.usuario.deleteMany();

      const result = await useCase.execute();

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('obterPorId', () => {
    beforeEach(async () => {
      await testSetup.prismaService.usuario.create({
        data: {
          id: 'user-test',
          nome: 'Usuário Teste',
          email: 'teste@empresa.com',
        },
      });
    });

    it('deve retornar usuário existente', async () => {
      const result = await useCase.obterPorId('user-test');

      expect(result).toMatchObject({
        id: 'user-test',
        nome: 'Usuário Teste',
        email: 'teste@empresa.com',
        createdAt: expect.any(Date),
      });
    });

    it('deve retornar null para usuário não existente', async () => {
      const result = await useCase.obterPorId('user-not-found');

      expect(result).toBeNull();
    });

    it('deve retornar null para ID inválido', async () => {
      const result = await useCase.obterPorId('invalid-uuid');

      expect(result).toBeNull();
    });
  });

  describe('Validações de entrada', () => {
    it('deve aplicar valores padrão para parâmetros omitidos', async () => {
      const result = await useCase.execute();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });

    it('deve respeitar limites de paginação', async () => {
      // Criar muitos usuários para testar limite
      const manyUsers = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        nome: `Usuário ${i}`,
        email: `user${i}@test.com`,
      }));

      await testSetup.prismaService.usuario.createMany({
        data: manyUsers,
      });

      const result = await useCase.execute({ limit: 5 });

      expect(result.items).toHaveLength(5);
      expect(result.pagination.limit).toBe(5);
    });
  });
});