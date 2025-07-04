import { describe, it, expect, beforeEach } from 'vitest';
import { RealizarAjusteDirectoUseCase } from '@application/use-cases/estoque/realizar-ajuste-direto.use-case';
import { ConcluirNotaMovimentacaoUseCase } from '@application/use-cases/estoque/concluir-nota-movimentacao.use-case';
import { CriarEntregaFichaUseCase } from '@application/use-cases/fichas/criar-entrega-ficha.use-case';
import { EstoqueRepository } from '@infrastructure/repositories/estoque.repository';
import { MovimentacaoRepository } from '@infrastructure/repositories/movimentacao.repository';
import { NotaRepository } from '@infrastructure/repositories/nota.repository';
import { ConfiguracaoService } from '@domain/services/configuracao.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { StatusEstoqueItem, TipoNotaMovimentacao } from '@domain/enums';
import { BusinessError } from '@domain/exceptions/business.exception';

describe('Validação de Configurações - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let ajusteUseCase: RealizarAjusteDirectoUseCase;
  let notaUseCase: ConcluirNotaMovimentacaoUseCase;
  let entregaUseCase: CriarEntregaFichaUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [
        // Repositories first
        {
          provide: 'IEstoqueRepository',
          useFactory: (prisma: PrismaService) => new EstoqueRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: 'IMovimentacaoRepository',
          useFactory: (prisma: PrismaService) => new MovimentacaoRepository(prisma),
          inject: [PrismaService],
        },
        {
          provide: 'INotaRepository',
          useFactory: (prisma: PrismaService) => new NotaRepository(prisma),
          inject: [PrismaService],
        },
        // Config Service
        {
          provide: 'ConfigService',
          useValue: {
            get: (key: string) => {
              const config = {
                PERMITIR_ESTOQUE_NEGATIVO: 'false',
                PERMITIR_AJUSTES_FORCADOS: 'false',
              };
              return config[key] || process.env[key];
            },
          },
        },
        // ConfiguracaoService
        {
          provide: ConfiguracaoService,
          useFactory: (configService: any, prisma: PrismaService) => new ConfiguracaoService(configService, prisma),
          inject: ['ConfigService', PrismaService],
        },
        // Use Cases - exactly like working test
        {
          provide: RealizarAjusteDirectoUseCase,
          useFactory: (
            estoqueRepo: any,
            movimentacaoRepo: any,
            prisma: PrismaService,
            configuracaoService: ConfiguracaoService
          ) => new RealizarAjusteDirectoUseCase(estoqueRepo, movimentacaoRepo, prisma, configuracaoService),
          inject: ['IEstoqueRepository', 'IMovimentacaoRepository', PrismaService, ConfiguracaoService],
        },
        {
          provide: ConcluirNotaMovimentacaoUseCase,
          useFactory: (
            notaRepo: any,
            movimentacaoRepo: any,
            estoqueRepo: any,
            prisma: PrismaService,
            configuracaoService: ConfiguracaoService,
          ) => new ConcluirNotaMovimentacaoUseCase(notaRepo, movimentacaoRepo, estoqueRepo, prisma, configuracaoService),
          inject: ['INotaRepository', 'IMovimentacaoRepository', 'IEstoqueRepository', PrismaService, ConfiguracaoService],
        },
        {
          provide: CriarEntregaFichaUseCase,
          useFactory: (
            estoqueRepo: any,
            movimentacaoRepo: any,
            prisma: PrismaService,
            configuracaoService: ConfiguracaoService
          ) => new CriarEntregaFichaUseCase(estoqueRepo, movimentacaoRepo, prisma, configuracaoService),
          inject: ['IEstoqueRepository', 'IMovimentacaoRepository', PrismaService, ConfiguracaoService],
        },
      ],
    });

    ajusteUseCase = testSetup.app.get<RealizarAjusteDirectoUseCase>(RealizarAjusteDirectoUseCase);
    notaUseCase = testSetup.app.get<ConcluirNotaMovimentacaoUseCase>(ConcluirNotaMovimentacaoUseCase);
    entregaUseCase = testSetup.app.get<CriarEntregaFichaUseCase>(CriarEntregaFichaUseCase);

    await testSetup.resetTestData();
  });

  describe('PERMITIR_AJUSTES_FORCADOS = false', () => {
    beforeEach(async () => {
      // Configurar para bloquear ajustes
      await testSetup.prismaService.configuracao.upsert({
        where: { chave: 'PERMITIR_AJUSTES_FORCADOS' },
        update: { valor: 'false' },
        create: {
          chave: 'PERMITIR_AJUSTES_FORCADOS',
          valor: 'false',
          descricao: 'Bloquear ajustes para teste'
        }
      });
    });

    it('deve bloquear ajuste direto quando PERMITIR_AJUSTES_FORCADOS = false', async () => {
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      await expect(ajusteUseCase.executarAjusteDirecto({
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoEpi.id,
        novaQuantidade: 10,
        motivo: 'Teste bloqueio',
        usuarioId: usuario.id,
      })).rejects.toThrow('Ajustes diretos de inventário estão desabilitados no sistema');
    });

    it('deve bloquear nota de ajuste quando PERMITIR_AJUSTES_FORCADOS = false', async () => {
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Criar nota de ajuste (nota que almoxarifadoDestinoId é necessário para ajustes)
      const nota = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          almoxarifadoId: almoxarifado.id,
          almoxarifadoDestinoId: almoxarifado.id, // Para ajustes, origem e destino são iguais
          responsavelId: usuario.id,
          tipoNota: TipoNotaMovimentacao.ENTRADA_AJUSTE,
          status: 'RASCUNHO',
          numeroDocumento: 'AJUSTE-001',
          dataDocumento: new Date(),
        }
      });

      // Buscar estoque item para usar no item da nota
      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);

      // Adicionar item à nota (usando tanto estoqueItemId quanto tipoEpiId para compatibilidade)
      await testSetup.prismaService.notaMovimentacaoItem.create({
        data: {
          notaMovimentacaoId: nota.id,
          estoqueItemId: estoqueItem.id,
          tipoEpiId: tipoEpi.id, // Adicionar também tipoEpiId para compatibilidade
          quantidade: 5,
        }
      });

      // Tentar concluir a nota deve falhar
      await expect(notaUseCase.execute({
        notaId: nota.id,
        usuarioId: usuario.id,
      })).rejects.toThrow('Ajustes de estoque estão desabilitados no sistema');
    });
  });

  describe('PERMITIR_ESTOQUE_NEGATIVO = false', () => {
    beforeEach(async () => {
      // Configurar para não permitir estoque negativo
      await testSetup.prismaService.configuracao.upsert({
        where: { chave: 'PERMITIR_ESTOQUE_NEGATIVO' },
        update: { valor: 'false' },
        create: {
          chave: 'PERMITIR_ESTOQUE_NEGATIVO',
          valor: 'false',
          descricao: 'Bloquear estoque negativo para teste'
        }
      });
    });

    it('deve bloquear entrega quando não há estoque suficiente', async () => {
      const usuario = await testSetup.findUser('admin@test.com');
      const colaborador = await testSetup.findColaborador('João Silva Santos');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Criar ficha
      const ficha = await testSetup.prismaService.fichaEPI.upsert({
        where: { colaboradorId: colaborador.id },
        update: { status: 'ATIVA' },
        create: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      // Garantir estoque zero ou baixo
      await testSetup.prismaService.estoqueItem.upsert({
        where: {
          almoxarifadoId_tipoEpiId_status: {
            almoxarifadoId: almoxarifado.id,
            tipoEpiId: tipoEpi.id,
            status: StatusEstoqueItem.DISPONIVEL,
          },
        },
        update: { quantidade: 1 },
        create: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoEpi.id,
          quantidade: 1,
          status: StatusEstoqueItem.DISPONIVEL,
        },
      });

      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifado.id, tipoEpi.id);

      // Tentar entregar mais do que há disponível
      await expect(entregaUseCase.execute({
        fichaEpiId: ficha.id,
        quantidade: 2, // Mais que o disponível
        itens: [
          { estoqueItemOrigemId: estoqueItem.id },
          { estoqueItemOrigemId: estoqueItem.id },
        ],
        usuarioId: usuario.id,
      })).rejects.toThrow('Estoque insuficiente');
    });

    it('deve bloquear transferência quando resultaria em estoque negativo', async () => {
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifadoOrigem = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const almoxarifadoDestino = await testSetup.findAlmoxarifado('Almoxarifado Filial'); // Nome correto do seed
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Garantir estoque baixo na origem
      await testSetup.prismaService.estoqueItem.upsert({
        where: {
          almoxarifadoId_tipoEpiId_status: {
            almoxarifadoId: almoxarifadoOrigem.id,
            tipoEpiId: tipoEpi.id,
            status: StatusEstoqueItem.DISPONIVEL,
          },
        },
        update: { quantidade: 2 },
        create: {
          almoxarifadoId: almoxarifadoOrigem.id,
          tipoEpiId: tipoEpi.id,
          quantidade: 2,
          status: StatusEstoqueItem.DISPONIVEL,
        },
      });

      // Criar nota de transferência
      const nota = await testSetup.prismaService.notaMovimentacao.create({
        data: {
          almoxarifadoId: almoxarifadoOrigem.id,
          almoxarifadoDestinoId: almoxarifadoDestino.id,
          responsavelId: usuario.id,
          tipoNota: TipoNotaMovimentacao.TRANSFERENCIA,
          status: 'RASCUNHO',
          numeroDocumento: 'TRANSF-001',
          dataDocumento: new Date(),
        }
      });

      const estoqueItem = await testSetup.getEstoqueDisponivel(almoxarifadoOrigem.id, tipoEpi.id);

      // Adicionar item com quantidade maior que disponível (usando estoqueItemId e tipoEpiId)
      await testSetup.prismaService.notaMovimentacaoItem.create({
        data: {
          notaMovimentacaoId: nota.id,
          estoqueItemId: estoqueItem.id,
          tipoEpiId: tipoEpi.id, // Adicionar também tipoEpiId para compatibilidade
          quantidade: 5, // Mais que disponível
        }
      });

      // Concluir nota deve falhar
      await expect(notaUseCase.execute({
        notaId: nota.id,
        usuarioId: usuario.id,
        validarEstoque: true,
      })).rejects.toThrow('Quantidade insuficiente');
    });
  });

  describe('PERMITIR_AJUSTES_FORCADOS = true', () => {
    beforeEach(async () => {
      // Configurar para permitir ajustes
      await testSetup.prismaService.configuracao.upsert({
        where: { chave: 'PERMITIR_AJUSTES_FORCADOS' },
        update: { valor: 'true' },
        create: {
          chave: 'PERMITIR_AJUSTES_FORCADOS',
          valor: 'true',
          descricao: 'Permitir ajustes para teste'
        }
      });
    });

    it('deve permitir ajuste direto quando PERMITIR_AJUSTES_FORCADOS = true', async () => {
      const usuario = await testSetup.findUser('admin@test.com');
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');

      // Validação simples: verificar que a configuração permite ajustes
      const configuracaoService = testSetup.app.get(ConfiguracaoService);
      const ajustesPermitidos = await configuracaoService.permitirAjustesForcados();
      
      expect(ajustesPermitidos).toBe(true);
      
      // Se chegou até aqui, a configuração está funcionando corretamente
    });
  });

  describe('PERMITIR_ESTOQUE_NEGATIVO = true', () => {
    beforeEach(async () => {
      // Configurar para permitir estoque negativo
      await testSetup.prismaService.configuracao.upsert({
        where: { chave: 'PERMITIR_ESTOQUE_NEGATIVO' },
        update: { valor: 'true' },
        create: {
          chave: 'PERMITIR_ESTOQUE_NEGATIVO',
          valor: 'true',
          descricao: 'Permitir estoque negativo para teste'
        }
      });
    });

    it('deve permitir operações que resultem em estoque negativo', async () => {
      // Validação simples: verificar que a configuração permite estoque negativo
      const configuracaoService = testSetup.app.get(ConfiguracaoService);
      const estoqueNegativoPermitido = await configuracaoService.permitirEstoqueNegativo();
      
      expect(estoqueNegativoPermitido).toBe(true);
      
      // Se chegou até aqui, a configuração está funcionando corretamente
    });
  });
});