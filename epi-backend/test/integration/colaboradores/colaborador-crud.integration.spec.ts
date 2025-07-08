import { beforeEach, describe, it, expect } from 'vitest';
import { createTestSetup } from '../../setup/integration-test-setup';
import { CriarColaboradorUseCase } from '../../../src/application/use-cases/colaboradores/criar-colaborador.use-case';
import { ListarColaboradoresUseCase } from '../../../src/application/use-cases/colaboradores/listar-colaboradores.use-case';
import { ApplicationModule } from '../../../src/application/application.module';

describe('Colaboradores CRUD - Integration Tests', () => {
  let setup: any;
  let criarColaboradorUseCase: CriarColaboradorUseCase;
  let listarColaboradoresUseCase: ListarColaboradoresUseCase;

  beforeEach(async () => {
    setup = await createTestSetup({
      imports: [
        // Importar módulos necessários
        ApplicationModule, // Já contém todos os use cases
      ],
    });
    criarColaboradorUseCase = setup.app.get(CriarColaboradorUseCase);
    listarColaboradoresUseCase = setup.app.get(ListarColaboradoresUseCase);
  });

  describe('Criar Colaborador', () => {
    it('deve criar colaborador com sucesso', async () => {
      // Arrange
      const { testDatabase } = setup;
      
      // Criar dados de teste
      const contratada = await testDatabase.createContratada({
        nome: 'Empresa Teste',
        cnpj: '12345678000123',
      });

      const input = {
        nome: 'João da Silva',
        cpf: '12345678909',
        contratadaId: contratada.id,
        matricula: 'MAT001',
        cargo: 'Técnico',
        setor: 'Manutenção',
      };

      // Act
      const resultado = await criarColaboradorUseCase.execute(input);

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.nome).toBe('João da Silva');
      expect(resultado.cpf).toBe('12345678909');
      expect(resultado.cpfFormatado).toBe('123.456.789-09');
      expect(resultado.contratadaId).toBe(contratada.id);
      expect(resultado.ativo).toBe(true);
      expect(resultado.contratada).toBeDefined();
      expect(resultado.contratada?.nome).toBe('Empresa Teste');
    });

    it('deve rejeitar CPF duplicado', async () => {
      // Arrange
      const { testDatabase } = setup;
      
      const contratada = await testDatabase.createContratada({
        nome: 'Empresa Teste',
        cnpj: '12345678000123',
      });

      const input = {
        nome: 'João da Silva',
        cpf: '12345678909',
        contratadaId: contratada.id,
      };

      // Criar primeiro colaborador
      await criarColaboradorUseCase.execute(input);

      // Act & Assert
      await expect(
        criarColaboradorUseCase.execute({
          ...input,
          nome: 'Maria Santos',
        })
      ).rejects.toThrow('CPF já cadastrado');
    });
  });

  describe('Listar Colaboradores', () => {
    it('deve listar colaboradores com paginação', async () => {
      // Arrange
      const { testDatabase } = setup;
      
      const contratada = await testDatabase.createContratada({
        nome: 'Empresa Teste',
        cnpj: '12345678000123',
      });

      // Criar alguns colaboradores
      await criarColaboradorUseCase.execute({
        nome: 'João da Silva',
        cpf: '12345678909',
        contratadaId: contratada.id,
      });

      await criarColaboradorUseCase.execute({
        nome: 'Maria Santos',
        cpf: '98765432100',
        contratadaId: contratada.id,
      });

      // Act
      const resultado = await listarColaboradoresUseCase.execute(
        {},
        { page: 1, limit: 10 }
      );

      // Assert
      expect(resultado.items).toHaveLength(2);
      expect(resultado.pagination.total).toBe(2);
      expect(resultado.pagination.page).toBe(1);
      expect(resultado.pagination.limit).toBe(10);
      expect(resultado.pagination.hasNext).toBe(false);
      expect(resultado.pagination.hasPrev).toBe(false);
    });

    it('deve filtrar colaboradores por contratada', async () => {
      // Arrange
      const { testDatabase } = setup;
      
      const contratada1 = await testDatabase.createContratada({
        nome: 'Empresa 1',
        cnpj: '12345678000123',
      });

      const contratada2 = await testDatabase.createContratada({
        nome: 'Empresa 2',
        cnpj: '98765432000198',
      });

      await criarColaboradorUseCase.execute({
        nome: 'João da Silva',
        cpf: '12345678909',
        contratadaId: contratada1.id,
      });

      await criarColaboradorUseCase.execute({
        nome: 'Maria Santos',
        cpf: '98765432100',
        contratadaId: contratada2.id,
      });

      // Act
      const resultado = await listarColaboradoresUseCase.execute(
        { contratadaId: contratada1.id },
        { page: 1, limit: 10 }
      );

      // Assert
      expect(resultado.items).toHaveLength(1);
      expect(resultado.items[0].nome).toBe('João da Silva');
      expect(resultado.items[0].contratada?.nome).toBe('Empresa 1');
    });
  });
});