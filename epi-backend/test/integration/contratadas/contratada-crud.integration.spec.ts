import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ContratadaRepository } from '@infrastructure/repositories/contratada.repository';
import { CriarContratadaUseCase } from '@application/use-cases/contratadas/criar-contratada.use-case';
import { AtualizarContratadaUseCase } from '@application/use-cases/contratadas/atualizar-contratada.use-case';
import { ListarContratadasUseCase } from '@application/use-cases/contratadas/listar-contratadas.use-case';
import { ExcluirContratadaUseCase } from '@application/use-cases/contratadas/excluir-contratada.use-case';
import { ObterContratadaUseCase } from '@application/use-cases/contratadas/obter-contratada.use-case';
import { BusinessError } from '@domain/exceptions/business.exception';

/**
 * Contratada CRUD - Integration Tests
 * 
 * Testa todas as operações CRUD da entidade Contratada
 */
describe('Contratada CRUD - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;
  let contratadaRepository: ContratadaRepository;
  let criarUseCase: CriarContratadaUseCase;
  let atualizarUseCase: AtualizarContratadaUseCase;
  let listarUseCase: ListarContratadasUseCase;
  let excluirUseCase: ExcluirContratadaUseCase;
  let obterUseCase: ObterContratadaUseCase;

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
          provide: CriarContratadaUseCase,
          useFactory: (repository: ContratadaRepository) => new CriarContratadaUseCase(repository),
          inject: ['IContratadaRepository'],
        },
        {
          provide: AtualizarContratadaUseCase,
          useFactory: (repository: ContratadaRepository) => new AtualizarContratadaUseCase(repository),
          inject: ['IContratadaRepository'],
        },
        {
          provide: ListarContratadasUseCase,
          useFactory: (repository: ContratadaRepository) => new ListarContratadasUseCase(repository),
          inject: ['IContratadaRepository'],
        },
        {
          provide: ExcluirContratadaUseCase,
          useFactory: (repository: ContratadaRepository) => new ExcluirContratadaUseCase(repository),
          inject: ['IContratadaRepository'],
        },
        {
          provide: ObterContratadaUseCase,
          useFactory: (repository: ContratadaRepository) => new ObterContratadaUseCase(repository),
          inject: ['IContratadaRepository'],
        },
      ],
    });
    
    prismaService = testSetup.prismaService;
    contratadaRepository = testSetup.app.get<ContratadaRepository>(ContratadaRepository);
    criarUseCase = testSetup.app.get<CriarContratadaUseCase>(CriarContratadaUseCase);
    atualizarUseCase = testSetup.app.get<AtualizarContratadaUseCase>(AtualizarContratadaUseCase);
    listarUseCase = testSetup.app.get<ListarContratadasUseCase>(ListarContratadasUseCase);
    excluirUseCase = testSetup.app.get<ExcluirContratadaUseCase>(ExcluirContratadaUseCase);
    obterUseCase = testSetup.app.get<ObterContratadaUseCase>(ObterContratadaUseCase);
    
    await testSetup.resetTestData();
  });

  describe('Criar Contratada', () => {
    it('deve criar contratada com CNPJ válido', async () => {
      // Arrange
      const input = {
        nome: 'Empresa de Teste LTDA',
        cnpj: '11.222.333/0001-81', // CNPJ válido
      };

      // Act
      const result = await criarUseCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.nome).toBe(input.nome);
      expect(result.cnpj).toBe('11222333000181'); // CNPJ armazenado sem formatação
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.cnpjFormatado).toBe(input.cnpj);
    });

    it('deve falhar ao criar contratada com CNPJ inválido', async () => {
      // Arrange
      const input = {
        nome: 'Empresa de Teste LTDA',
        cnpj: '11.111.111/1111-11', // CNPJ inválido
      };

      // Act & Assert
      await expect(criarUseCase.execute(input)).rejects.toThrow(BusinessError);
    });

    it('deve falhar ao criar contratada com CNPJ duplicado', async () => {
      // Arrange
      const cnpjExistente = '11.444.777/0001-61'; // CNPJ válido
      
      // Criar primeira contratada
      await criarUseCase.execute({
        nome: 'Primeira Empresa LTDA',
        cnpj: cnpjExistente,
      });

      // Tentar criar segunda com mesmo CNPJ
      const input = {
        nome: 'Segunda Empresa LTDA',
        cnpj: cnpjExistente,
      };

      // Act & Assert
      await expect(criarUseCase.execute(input)).rejects.toThrow(BusinessError);
    });

    it('deve permitir criar múltiplas contratadas diferentes', async () => {
      // Arrange
      const input1 = {
        nome: 'Primeira Empresa LTDA',
        cnpj: '22.333.444/0001-81', // CNPJ válido
      };
      
      const input2 = {
        nome: 'Segunda Empresa LTDA',
        cnpj: '60.746.948/0001-12', // CNPJ válido
      };

      // Act
      const result1 = await criarUseCase.execute(input1);
      const result2 = await criarUseCase.execute(input2);

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(result1.nome).toBe(input1.nome);
      expect(result2.nome).toBe(input2.nome);
    });
  });

  describe('Atualizar Contratada', () => {
    it('deve atualizar nome da contratada', async () => {
      // Arrange
      const contratada = await criarUseCase.execute({
        nome: 'Empresa Original LTDA',
        cnpj: '66.777.888/0001-81', // CNPJ válido
      });

      const input = {
        id: contratada.id,
        nome: 'Empresa Atualizada LTDA',
      };

      // Act
      const result = await atualizarUseCase.execute(input);

      // Assert
      expect(result.nome).toBe(input.nome);
      expect(result.cnpj).toBe(contratada.cnpj); // CNPJ não deve mudar
    });

    it('deve atualizar CNPJ da contratada', async () => {
      // Arrange
      const contratada = await criarUseCase.execute({
        nome: 'Empresa LTDA',
        cnpj: '34.608.122/0001-87', // CNPJ válido
      });

      const input = {
        id: contratada.id,
        cnpj: '05.570.714/0001-59', // CNPJ válido
      };

      // Act
      const result = await atualizarUseCase.execute(input);

      // Assert
      expect(result.cnpj).toBe('05570714000159'); // Armazenado sem formatação
      expect(result.nome).toBe(contratada.nome); // Nome não deve mudar
    });

    it('deve falhar ao atualizar com CNPJ inválido', async () => {
      // Arrange
      const contratada = await criarUseCase.execute({
        nome: 'Empresa LTDA',
        cnpj: '77.888.999/0001-81', // CNPJ válido
      });

      const input = {
        id: contratada.id,
        cnpj: '00.000.000/0000-00', // CNPJ inválido
      };

      // Act & Assert
      await expect(atualizarUseCase.execute(input)).rejects.toThrow(BusinessError);
    });

    it('deve falhar ao atualizar contratada inexistente', async () => {
      // Arrange
      const input = {
        id: 'contratada-inexistente',
        nome: 'Empresa Inexistente LTDA',
      };

      // Act & Assert
      await expect(atualizarUseCase.execute(input)).rejects.toThrow(BusinessError);
    });
  });

  describe('Listar Contratadas', () => {
    it('deve listar todas as contratadas cadastradas', async () => {
      // Arrange
      await criarUseCase.execute({
        nome: 'Empresa 1 LTDA',
        cnpj: '12.345.678/0001-95',
      });

      await criarUseCase.execute({
        nome: 'Empresa 2 LTDA',
        cnpj: '23.456.789/0001-95',
      });

      await criarUseCase.execute({
        nome: 'Empresa 3 LTDA',
        cnpj: '34.567.890/0001-30',
      });

      // Act
      const result = await listarUseCase.execute();

      // Assert
      expect(result.contratadas).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('deve retornar todas as contratadas cadastradas', async () => {
      // Arrange
      await criarUseCase.execute({
        nome: 'Empresa A LTDA',
        cnpj: '11.222.333/0001-81',
      });

      await criarUseCase.execute({
        nome: 'Empresa B LTDA',
        cnpj: '88.293.094/0001-85',
      });

      // Act
      const result = await listarUseCase.execute();

      // Assert
      expect(result.contratadas).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('deve filtrar contratadas por nome', async () => {
      // Arrange
      await criarUseCase.execute({
        nome: 'ABC Empresa LTDA',
        cnpj: '60.746.948/0001-12',
      });

      await criarUseCase.execute({
        nome: 'XYZ Corporação LTDA',
        cnpj: '34.608.122/0001-87',
      });

      // Act
      const result = await listarUseCase.execute({ nome: 'ABC' });

      // Assert
      expect(result.contratadas).toHaveLength(1);
      expect(result.contratadas[0].nome).toContain('ABC');
    });

    it('deve listar múltiplas contratadas corretamente', async () => {
      // Arrange - Criar múltiplas contratadas
      for (let i = 1; i <= 5; i++) {
        await criarUseCase.execute({
          nome: `Empresa ${i} LTDA`,
          cnpj: `${i.toString().padStart(2, '0')}.111.222/0001-${(i * 10).toString().padStart(2, '0')}`,
        });
      }

      // Act
      const result = await listarUseCase.execute();

      // Assert
      expect(result.contratadas).toHaveLength(5);
      expect(result.total).toBe(5);
    });
  });

  describe('Excluir Contratada', () => {
    it('deve excluir contratada sem colaboradores vinculados', async () => {
      // Arrange
      const contratada = await criarUseCase.execute({
        nome: 'Empresa para Excluir LTDA',
        cnpj: '05.570.714/0001-59',
      });

      // Act
      await excluirUseCase.execute({ id: contratada.id });

      // Assert - Verificar se foi removida da listagem
      const listaAtualizada = await listarUseCase.execute();
      expect(listaAtualizada.contratadas.find(c => c.id === contratada.id)).toBeUndefined();
    });

    it('deve falhar ao excluir contratada com colaboradores vinculados', async () => {
      // Arrange
      const contratada = await criarUseCase.execute({
        nome: 'Empresa com Colaboradores LTDA',
        cnpj: '11.444.777/0001-61',
      });

      // Criar unidade de negócio e colaborador vinculado à contratada
      const unidadeNegocio = await prismaService.unidadeNegocio.create({
        data: {
          nome: 'Unidade Teste',
          codigo: 'UN-TEST',
          endereco: 'Rua Teste, 123',
        },
      });

      await prismaService.colaborador.create({
        data: {
          nome: 'João da Silva',
          cpf: '123.456.789-00',
          funcao: 'Operador',
          ativo: true,
          contratadaId: contratada.id,
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Act & Assert
      await expect(excluirUseCase.execute({ id: contratada.id })).rejects.toThrow(BusinessError);
    });

    it('deve falhar ao excluir contratada inexistente', async () => {
      // Act & Assert
      await expect(excluirUseCase.execute({ id: 'contratada-inexistente' })).rejects.toThrow(BusinessError);
    });
  });

  describe('Validação de CNPJ', () => {
    it('deve aceitar CNPJs válidos em diferentes formatos', async () => {
      const cnpjsValidos = [
        { formatted: '11.222.333/0001-81', clean: '11222333000181' },
        { formatted: '60.746.948/0001-12', clean: '60746948000112' },
      ];

      for (let i = 0; i < cnpjsValidos.length; i++) {
        const cnpjData = cnpjsValidos[i];
        const contratada = await criarUseCase.execute({
          nome: `Empresa ${i + 1} LTDA`,
          cnpj: cnpjData.formatted,
        });
        expect(contratada.cnpj).toBe(cnpjData.clean);
      }
    });

    it('deve rejeitar CNPJs inválidos', async () => {
      const cnpjsInvalidos = [
        '00.000.000/0000-00',
        '11.111.111/1111-11',
        '123.456.789/0001-00',
        'cnpj-invalido',
        '',
      ];

      for (const cnpj of cnpjsInvalidos) {
        try {
          await criarUseCase.execute({
            nome: `Empresa ${cnpj} LTDA`,
            cnpj: cnpj,
          });
          // Se chegou aqui, deveria ter falhado
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(BusinessError);
        }
      }
    });
  });

  describe('Performance e Casos Extremos', () => {
    it('deve lidar com consultas em banco com muitas contratadas', async () => {
      // Arrange - Criar 20 contratadas
      const validCnpjList = [
        '22.333.444/0001-81', '60.746.948/0001-12', '66.777.888/0001-81', '34.608.122/0001-87', '05.570.714/0001-59',
        '77.888.999/0001-81', '16.727.230/0001-97', '88.293.094/0001-85', '99.382.077/0001-30', '71.150.470/0001-80',
        '42.591.651/0001-43', '18.236.120/0001-58', '90.400.888/0001-42', '25.351.396/0001-42', '73.698.021/0001-04',
        '56.892.707/0001-04', '14.200.166/0001-66', '87.535.344/0001-83', '39.346.553/0001-36', '61.984.281/0001-59'
      ];
      
      for (let i = 0; i < 20; i++) {
        await criarUseCase.execute({
          nome: `Empresa Performance ${i + 1} LTDA`,
          cnpj: validCnpjList[i],
        });
      }

      // Act
      const startTime = Date.now();
      const result = await listarUseCase.execute({});
      const endTime = Date.now();

      // Assert - Performance
      expect(endTime - startTime).toBeLessThan(1000); // Menos de 1 segundo
      expect(result.contratadas.length).toBeGreaterThanOrEqual(20);
    });

    it('deve retornar resultado vazio quando não há contratadas', async () => {
      // Act
      const result = await listarUseCase.execute({});

      // Assert
      expect(result.contratadas).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('deve lidar com nomes especiais e caracteres', async () => {
      // Arrange
      const nomesEspeciais = [
        'Empresa & Cia LTDA',
        'Açougue São José LTDA',
        'Empresa-Teste LTDA',
        'EMPRESA EM CAIXA ALTA LTDA',
      ];

      // Act & Assert
      const validCnpjs = [
        '71.150.470/0001-80',
        '42.591.651/0001-43',
        '18.236.120/0001-58',
        '90.400.888/0001-42',
      ];
      
      for (let i = 0; i < nomesEspeciais.length; i++) {
        const contratada = await criarUseCase.execute({
          nome: nomesEspeciais[i],
          cnpj: validCnpjs[i],
        });
        expect(contratada.nome).toBe(nomesEspeciais[i]);
      }
    });
  });
});