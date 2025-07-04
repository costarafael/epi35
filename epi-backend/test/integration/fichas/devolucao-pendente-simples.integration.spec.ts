import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestDatabaseService } from '../../database/test-database.service';
import { CriarFichaEpiUseCase } from '../../../src/application/use-cases/fichas/criar-ficha-epi.use-case';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';

describe('Devolução Pendente - Testes Simplificados', () => {
  let testDb: TestDatabaseService;
  let fichaUseCase: CriarFichaEpiUseCase;
  let prisma: PrismaService;

  beforeEach(async () => {
    console.log('🔧 Configurando teste simplificado de devolução pendente...');
    
    testDb = TestDatabaseService.getInstance();
    prisma = testDb.prismaService;
    fichaUseCase = new CriarFichaEpiUseCase(prisma);

    await testDb.setupDatabase();
    console.log('✅ Banco de dados configurado');
  });

  afterEach(async () => {
    console.log('🧹 Limpando ambiente de teste...');
  });

  describe('Flag devolucaoPendente', () => {
    it('deve retornar devolucaoPendente = false para ficha sem entregas', async () => {
      // Buscar uma ficha existente do seed
      const fichaExistente = await prisma.fichaEPI.findFirst({
        where: { status: 'ATIVA' },
      });

      if (!fichaExistente) {
        throw new Error('Nenhuma ficha encontrada no seed');
      }

      const ficha = await fichaUseCase.obterFicha(fichaExistente.id);

      expect(ficha).not.toBeNull();
      if (ficha) {
        expect(ficha).toHaveProperty('devolucaoPendente');
        expect(ficha.devolucaoPendente).toBe(false);
      }
    });

    it('deve calcular devolucaoPendente corretamente com dados mock', async () => {
      // Buscar dados básicos do seed
      const colaborador = await prisma.colaborador.findFirst({ where: { ativo: true } });
      const almoxarifado = await prisma.almoxarifado.findFirst();
      const estoqueItem = await prisma.estoqueItem.findFirst({ 
        where: { quantidade: { gt: 0 }, status: 'DISPONIVEL' }
      });

      if (!colaborador || !almoxarifado || !estoqueItem) {
        throw new Error('Dados básicos não encontrados no seed');
      }

      // Criar dados mock diretamente no banco para testar a lógica
      const ficha = await prisma.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          status: 'ATIVA',
        },
      });

      const entrega = await prisma.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: colaborador.id, // Usar colaborador como responsável temporário
          status: 'ASSINADA',
        },
      });

      // Criar item com data limite vencida
      const dataLimiteVencida = new Date();
      dataLimiteVencida.setDate(dataLimiteVencida.getDate() - 5); // 5 dias atrás

      await prisma.entregaItem.create({
        data: {
          entregaId: entrega.id,
          estoqueItemOrigemId: estoqueItem.id,
          status: 'COM_COLABORADOR',
          dataLimiteDevolucao: dataLimiteVencida,
        },
      });

      // Testar se a flag é calculada corretamente
      const fichaComDevolucaoPendente = await fichaUseCase.obterFicha(ficha.id);

      expect(fichaComDevolucaoPendente).not.toBeNull();
      if (fichaComDevolucaoPendente) {
        expect(fichaComDevolucaoPendente.devolucaoPendente).toBe(true);
      }
    });

    it('deve retornar devolucaoPendente = false para item com data limite futura', async () => {
      // Buscar dados básicos do seed
      const colaborador = await prisma.colaborador.findFirst({ where: { ativo: true } });
      const almoxarifado = await prisma.almoxarifado.findFirst();
      const estoqueItem = await prisma.estoqueItem.findFirst({ 
        where: { quantidade: { gt: 0 }, status: 'DISPONIVEL' }
      });

      if (!colaborador || !almoxarifado || !estoqueItem) {
        throw new Error('Dados básicos não encontrados no seed');
      }

      // Criar ficha nova para este teste
      const novoColaborador = await prisma.colaborador.create({
        data: {
          nome: 'Colaborador Teste Futuro',
          cpf: '88888888888',
          matricula: 'TEST-FUTURO',
          ativo: true,
          unidadeNegocioId: (await prisma.unidadeNegocio.findFirst())!.id,
        },
      });

      const ficha = await prisma.fichaEPI.create({
        data: {
          colaboradorId: novoColaborador.id,
          status: 'ATIVA',
        },
      });

      const entrega = await prisma.entrega.create({
        data: {
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: colaborador.id,
          status: 'ASSINADA',
        },
      });

      // Criar item com data limite futura
      const dataLimiteFutura = new Date();
      dataLimiteFutura.setDate(dataLimiteFutura.getDate() + 30); // 30 dias no futuro

      await prisma.entregaItem.create({
        data: {
          entregaId: entrega.id,
          estoqueItemOrigemId: estoqueItem.id,
          status: 'COM_COLABORADOR',
          dataLimiteDevolucao: dataLimiteFutura,
        },
      });

      const fichaComDataFutura = await fichaUseCase.obterFicha(ficha.id);

      expect(fichaComDataFutura).not.toBeNull();
      if (fichaComDataFutura) {
        expect(fichaComDataFutura.devolucaoPendente).toBe(false);
      }
    });
  });

  describe('Filtro devolucaoPendente', () => {
    it('deve funcionar com filtro devolucaoPendente = true', async () => {
      const fichas = await fichaUseCase.listarFichas({
        devolucaoPendente: true,
      });

      const fichasArray = Array.isArray(fichas) ? fichas : fichas.items;

      // Verificar que cada ficha retornada tem devolucaoPendente = true
      fichasArray.forEach(ficha => {
        expect(ficha).toHaveProperty('devolucaoPendente', true);
      });
    });

    it('deve incluir flag devolucaoPendente em todas as fichas', async () => {
      const fichas = await fichaUseCase.listarFichas({});

      const fichasArray = Array.isArray(fichas) ? fichas : fichas.items;

      expect(fichasArray.length).toBeGreaterThan(0);
      fichasArray.forEach(ficha => {
        expect(ficha).toHaveProperty('devolucaoPendente');
        expect(typeof ficha.devolucaoPendente).toBe('boolean');
      });
    });

    it('deve funcionar com paginação', async () => {
      const resultado = await fichaUseCase.listarFichas(
        {},
        { page: 1, limit: 3 }
      );

      if ('items' in resultado) {
        expect(resultado.items.length).toBeLessThanOrEqual(3);
        resultado.items.forEach(ficha => {
          expect(ficha).toHaveProperty('devolucaoPendente');
          expect(typeof ficha.devolucaoPendente).toBe('boolean');
        });
      }
    });
  });
});