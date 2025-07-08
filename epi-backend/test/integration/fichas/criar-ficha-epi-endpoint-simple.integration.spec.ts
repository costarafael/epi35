import { describe, it, expect, beforeEach } from 'vitest';
import { StatusFichaEPI } from '../../../src/domain/enums/ficha.enum';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { CriarFichaEpiUseCase } from '../../../src/application/use-cases/fichas/criar-ficha-epi.use-case';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';
import { BusinessError, ConflictError, NotFoundError } from '../../../src/domain/exceptions/business.exception';

describe('Criar Ficha EPI - Business Logic Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: CriarFichaEpiUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        {
          provide: CriarFichaEpiUseCase,
          useFactory: (prismaService: PrismaService) => {
            return new CriarFichaEpiUseCase(prismaService);
          },
          inject: [PrismaService],
        },
      ],
    });

    useCase = testSetup.app.get<CriarFichaEpiUseCase>(CriarFichaEpiUseCase);

    // Reset do banco para cada teste
    await testSetup.resetTestData();
  });

  describe('Cenários de Sucesso', () => {
    it('deve criar ficha EPI com status ATIVA', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'João Silva',
          cpf: `111${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador de Produção',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const input = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.colaboradorId).toBe(colaborador.id);
      expect(result.status).toBe(StatusFichaEPI.ATIVA);
      expect(result.dataEmissao).toBeDefined();
      expect(result.colaborador.nome).toBe('João Silva');
      expect(result.colaborador.cpf).toBe(colaborador.cpf);

      // Verificar se foi criada no banco
      const fichaDb = await testSetup.prismaService.fichaEPI.findUnique({
        where: { id: result.id },
      });
      expect(fichaDb).toBeDefined();
      expect(fichaDb.status).toBe('ATIVA');
    });

    it('deve criar ficha EPI com status INATIVA', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Maria Santos',
          cpf: `222${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operadora de Qualidade',
          setor: 'Qualidade',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const input = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.INATIVA,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.status).toBe(StatusFichaEPI.INATIVA);

      // Verificar no banco
      const fichaDb = await testSetup.prismaService.fichaEPI.findUnique({
        where: { id: result.id },
      });
      expect(fichaDb.status).toBe('INATIVA');
    });

    it('deve criar ficha com status ATIVA por padrão quando não especificado', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Carlos Oliveira',
          cpf: `333${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Técnico de Segurança',
          setor: 'Segurança',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const input = {
        colaboradorId: colaborador.id,
        // status não especificado
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.status).toBe(StatusFichaEPI.ATIVA);
    });
  });

  describe('Cenários de Erro', () => {
    it('deve lançar NotFoundError para colaborador inexistente', async () => {
      // Arrange
      const input = {
        colaboradorId: 'b47ac10b-58cc-4372-a567-0e02b2c3d479', // UUID válido mas inexistente
        status: StatusFichaEPI.ATIVA,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    });

    it('deve lançar BusinessError para colaborador inativo', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaboradorInativo = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Pedro Inativo',
          cpf: `555${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Ex-Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
          ativo: false,
        },
      });

      const input = {
        colaboradorId: colaboradorInativo.id,
        status: StatusFichaEPI.ATIVA,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
    });

    it('deve lançar ConflictError para colaborador que já possui ficha', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Lucas Duplicado',
          cpf: `666${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const input = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      };

      // Criar primeira ficha
      await useCase.execute(input);

      // Act & Assert - Tentar criar segunda ficha
      await expect(useCase.execute(input)).rejects.toThrow(ConflictError);
    });
  });

  describe('Funcionalidades Avançadas', () => {
    it('deve usar criarOuAtivar para criar nova ficha', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Roberto Novo',
          cpf: `777${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const input = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      };

      // Act
      const result = await useCase.criarOuAtivar(input);

      // Assert
      expect(result.ficha.status).toBe(StatusFichaEPI.ATIVA);
      expect(result.ficha.colaboradorId).toBe(colaborador.id);
      expect(result.criada).toBe(true);
    });

    it('deve usar criarOuAtivar para ativar ficha inativa existente', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Sandra Reativar',
          cpf: `888${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operadora',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha inativa primeiro
      await useCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.INATIVA,
      });

      const input = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      };

      // Act
      const result = await useCase.criarOuAtivar(input);

      // Assert
      expect(result.ficha.status).toBe(StatusFichaEPI.ATIVA);
      expect(result.ficha.colaboradorId).toBe(colaborador.id);
      expect(result.criada).toBe(false);
    });

    it('deve usar criarOuAtivar para retornar ficha ativa existente', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Marcos Ativo',
          cpf: `999${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha ativa primeiro
      const fichaOriginal = await useCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      });

      const input = {
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      };

      // Act
      const result = await useCase.criarOuAtivar(input);

      // Assert
      expect(result.ficha.id).toBe(fichaOriginal.id);
      expect(result.ficha.status).toBe(StatusFichaEPI.ATIVA);
      expect(result.criada).toBe(false);
    });

    it('deve ativar ficha inativa com sucesso', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Ativar',
          cpf: `994${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha inativa
      const fichaInativa = await useCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.INATIVA,
      });

      // Act
      const result = await useCase.ativarFicha(fichaInativa.id);

      // Assert
      expect(result.status).toBe(StatusFichaEPI.ATIVA);
      expect(result.id).toBe(fichaInativa.id);
    });

    it('deve inativar ficha ativa sem entregas pendentes', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Inativar',
          cpf: `993${Date.now().toString().slice(-8)}`,
          matricula: `MAT${Date.now().toString().slice(-4)}`,
          cargo: 'Operador',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha ativa
      const fichaAtiva = await useCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      });

      // Act
      const result = await useCase.inativarFicha(fichaAtiva.id);

      // Assert
      expect(result.status).toBe('INATIVA');
      expect(result.id).toBe(fichaAtiva.id);
    });

    it('deve obter estatísticas das fichas', async () => {
      // Arrange - Criar dados para estatísticas
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();

      const colaboradores = await Promise.all([
        testSetup.prismaService.colaborador.create({
          data: {
            nome: 'Colaborador 1',
            cpf: `987${Date.now().toString().slice(-8)}`,
            matricula: `STAT1${Date.now().toString().slice(-3)}`,
            cargo: 'Operador',
            setor: 'Produção',
            unidadeNegocioId: unidadeNegocio.id,
          },
        }),
        testSetup.prismaService.colaborador.create({
          data: {
            nome: 'Colaborador 2',
            cpf: `986${Date.now().toString().slice(-8)}`,
            matricula: `STAT2${Date.now().toString().slice(-3)}`,
            cargo: 'Operador',
            setor: 'Produção',
            unidadeNegocioId: unidadeNegocio.id,
          },
        }),
      ]);

      // Criar fichas
      await useCase.execute({
        colaboradorId: colaboradores[0].id,
        status: StatusFichaEPI.ATIVA,
      });

      await useCase.execute({
        colaboradorId: colaboradores[1].id,
        status: StatusFichaEPI.INATIVA,
      });

      // Act
      const stats = await useCase.obterEstatisticas();

      // Assert
      expect(stats.totalFichas).toBeGreaterThanOrEqual(2);
      expect(stats.fichasAtivas).toBeGreaterThanOrEqual(1);
      expect(stats.fichasInativas).toBeGreaterThanOrEqual(1);
    });
  });
});