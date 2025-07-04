import { describe, it, expect, beforeEach } from 'vitest';
import { CriarFichaEpiUseCase } from '@application/use-cases/fichas/criar-ficha-epi.use-case';
import { BusinessError, ConflictError, NotFoundError } from '@domain/exceptions/business.exception';
import { StatusFichaEPI } from '@domain/enums/ficha.enum';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

describe('CriarFichaEpiUseCase - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: CriarFichaEpiUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        {
          provide: CriarFichaEpiUseCase,
          useFactory: (prismaService: any) => {
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

  describe('execute - Fluxo Completo de Criação', () => {
    it('deve criar ficha EPI com sucesso usando dados reais do banco', async () => {
      // Arrange - Criar colaborador único para evitar conflito com seed
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Novo Colaborador',
          cpf: `999${Date.now().toString().slice(-8)}`, // CPF único baseado em timestamp
          matricula: `TEST${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      expect(colaborador).toBeDefined();

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
      expect(result.createdAt).toBeDefined();
      expect(result.colaborador.nome).toBe(colaborador.nome);
      expect(result.colaborador.cpf).toBe(colaborador.cpf);
      // Note: ativo field removed from colaborador schema

      // Verificar se foi criada no banco
      const fichaDb = await testSetup.prismaService.fichaEPI.findUnique({
        where: { id: result.id },
        include: {
          colaborador: true,
        },
      });

      expect(fichaDb).toBeDefined();
      expect(fichaDb.status).toBe('ATIVA');
      expect(fichaDb.colaboradorId).toBe(colaborador.id);
    });

    it('deve criar ficha com status INATIVA quando especificado', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Inativo',
          cpf: `998${Date.now().toString().slice(-8)}`,
          matricula: `INATIVO${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
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
      expect(result.status).toBe('INATIVA');
    });

    it('deve criar ficha com status ATIVA por padrão quando não especificado', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Padrão',
          cpf: `997${Date.now().toString().slice(-8)}`,
          matricula: `PADRAO${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      const input = {
        colaboradorId: colaborador.id,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.status).toBe(StatusFichaEPI.ATIVA);
    });
  });

  describe('execute - Validações de Negócio', () => {
    it('deve falhar ao tentar criar ficha para colaborador inexistente', async () => {
      // Arrange
      const input = {
        colaboradorId: 'colaborador-inexistente',
        status: StatusFichaEPI.ATIVA,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    });

    it('deve falhar ao tentar criar ficha para colaborador inativo', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaboradorInativo = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Inativo',
          cpf: `996${Date.now().toString().slice(-8)}`,
          matricula: `INATIVO${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
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

    it('deve falhar ao tentar criar segunda ficha para mesmo colaborador', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Duplicado',
          cpf: `995${Date.now().toString().slice(-8)}`,
          matricula: `DUPLIC${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
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

  describe('ativarFicha - Testes com Banco Real', () => {
    it('deve ativar ficha inativa com sucesso', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Ativar',
          cpf: `994${Date.now().toString().slice(-8)}`,
          matricula: `ATIVAR${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
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

    it('deve falhar ao tentar ativar ficha já ativa', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Ativar Ativa',
          cpf: `993${Date.now().toString().slice(-8)}`,
          matricula: `ATIVATV${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha ativa
      const fichaAtiva = await useCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      });

      // Act & Assert
      await expect(useCase.ativarFicha(fichaAtiva.id)).rejects.toThrow(BusinessError);
    });

    it('deve falhar ao tentar ativar ficha inexistente', async () => {
      // Act & Assert
      await expect(useCase.ativarFicha('ficha-inexistente')).rejects.toThrow(NotFoundError);
    });
  });

  describe('inativarFicha - Testes com Banco Real', () => {
    it('deve inativar ficha ativa sem entregas pendentes', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Inativar',
          cpf: `992${Date.now().toString().slice(-8)}`,
          matricula: `INATIVAR${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
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

    it('deve falhar ao inativar ficha com entregas ativas', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Entregas',
          cpf: `991${Date.now().toString().slice(-8)}`,
          matricula: `ENTREGAS${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha ativa
      const fichaAtiva = await useCase.execute({
        colaboradorId: colaborador.id,
        status: StatusFichaEPI.ATIVA,
      });

      // Criar entrega assinada - usar qualquer usuário disponível
      const usuario = await testSetup.prismaService.usuario.findFirst();
      if (!usuario) {
        // Se não encontrou nenhum usuário, criar um para o teste
        const novoUsuario = await testSetup.prismaService.usuario.create({
          data: {
            nome: 'Usuário Teste Temporário',
            email: `temp${Date.now()}@teste.com`,
          },
        });
        await testSetup.prismaService.entrega.create({
          data: {
            fichaEpiId: fichaAtiva.id,
            almoxarifadoId: almoxarifado.id,
            responsavelId: novoUsuario.id,
            status: 'ASSINADA',
          },
        });
      } else {
        await testSetup.prismaService.entrega.create({
          data: {
            fichaEpiId: fichaAtiva.id,
            almoxarifadoId: almoxarifado.id,
            responsavelId: usuario.id,
            status: 'ASSINADA',
          },
        });
      }

      // Act & Assert
      await expect(useCase.inativarFicha(fichaAtiva.id)).rejects.toThrow(BusinessError);
    });
  });

  describe('criarOuAtivar - Testes com Banco Real', () => {
    it('deve criar nova ficha quando não existe', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Novo',
          cpf: `990${Date.now().toString().slice(-8)}`,
          matricula: `NOVO${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
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
    });

    it('deve ativar ficha inativa existente', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Reativar',
          cpf: `989${Date.now().toString().slice(-8)}`,
          matricula: `REATIVAR${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha inativa
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
    });

    it('deve retornar ficha ativa existente', async () => {
      // Arrange
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();
      
      const colaborador = await testSetup.prismaService.colaborador.create({
        data: {
          nome: 'Teste Colaborador Existente',
          cpf: `988${Date.now().toString().slice(-8)}`,
          matricula: `EXISTENTE${Date.now().toString().slice(-3)}`,
          cargo: 'Operador de Teste',
          setor: 'Produção',
          unidadeNegocioId: unidadeNegocio.id,
        },
      });

      // Criar ficha ativa
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
    });
  });

  describe('obterEstatisticas - Testes com Banco Real', () => {
    it('deve retornar estatísticas corretas das fichas', async () => {
      // Arrange - Criar dados de teste para estatísticas
      const unidadeNegocio = await testSetup.prismaService.unidadeNegocio.findFirst();

      // Criar 3 colaboradores
      const colaboradores = await Promise.all([
        testSetup.prismaService.colaborador.create({
          data: {
            nome: 'Colaborador Com Ficha 1',
            cpf: `987${Date.now().toString().slice(-8)}`,
            matricula: `STAT1${Date.now().toString().slice(-3)}`,
            cargo: 'Operador',
            setor: 'Produção',
            unidadeNegocioId: unidadeNegocio.id,
          },
        }),
        testSetup.prismaService.colaborador.create({
          data: {
            nome: 'Colaborador Com Ficha 2',
            cpf: `986${Date.now().toString().slice(-8)}`,
            matricula: `STAT2${Date.now().toString().slice(-3)}`,
            cargo: 'Operador',
            setor: 'Produção',
            unidadeNegocioId: unidadeNegocio.id,
          },
        }),
        testSetup.prismaService.colaborador.create({
          data: {
            nome: 'Colaborador Sem Ficha',
            cpf: `985${Date.now().toString().slice(-8)}`,
            matricula: `STAT3${Date.now().toString().slice(-3)}`,
            cargo: 'Operador',
            setor: 'Produção',
            unidadeNegocioId: unidadeNegocio.id,
          },
        }),
      ]);

      // Criar 2 fichas (1 ativa, 1 inativa)
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
      // Note: colaboradoresComFicha and colaboradoresSemFicha fields removed from stats
      // expect(stats.colaboradoresComFicha).toBeGreaterThanOrEqual(2);
      // expect(stats.colaboradoresSemFicha).toBeGreaterThanOrEqual(1);
    });
  });
});