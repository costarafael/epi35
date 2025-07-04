import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestDatabaseService } from '../../database/test-database.service';
import { CriarFichaEpiUseCase } from '../../../src/application/use-cases/fichas/criar-ficha-epi.use-case';
import { CriarEntregaFichaUseCase } from '../../../src/application/use-cases/fichas/criar-entrega-ficha.use-case';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';

describe('CriarFichaEpiUseCase - Devolução Pendente Integration Tests', () => {
  let testDb: TestDatabaseService;
  let fichaUseCase: CriarFichaEpiUseCase;
  let entregaUseCase: CriarEntregaFichaUseCase;
  let prisma: PrismaService;
  let colaboradorId: string;
  let almoxarifadoId: string;
  let estoqueItemId: string;
  let fichaId: string;

  beforeEach(async () => {
    console.log('🔧 Configurando ambiente de teste de devolução pendente...');
    
    testDb = TestDatabaseService.getInstance();
    prisma = testDb.prismaService;
    fichaUseCase = new CriarFichaEpiUseCase(prisma);
    // entregaUseCase = new CriarEntregaFichaUseCase(prisma); // TODO: Fix constructor dependencies

    console.log('✅ Banco de dados de teste está pronto');

    await testDb.setupDatabase();

    // Buscar dados do seed para usar nos testes
    const colaborador = await prisma.colaborador.findFirst({ where: { ativo: true } });
    const almoxarifado = await prisma.almoxarifado.findFirst();
    const estoqueItem = await prisma.estoqueItem.findFirst({ 
      where: { quantidade: { gt: 0 }, status: 'DISPONIVEL' }
    });

    if (!colaborador || !almoxarifado || !estoqueItem) {
      throw new Error('Dados básicos não encontrados no seed');
    }

    colaboradorId = colaborador.id;
    almoxarifadoId = almoxarifado.id;
    estoqueItemId = estoqueItem.id;

    // Buscar ou criar ficha para teste
    let ficha = await prisma.fichaEPI.findUnique({
      where: { colaboradorId },
    });

    if (!ficha) {
      const novaFicha = await fichaUseCase.execute({
        colaboradorId,
        status: 'ATIVA',
      });
      fichaId = novaFicha.id;
    } else {
      fichaId = ficha.id;
    }

    console.log('✅ Dados de teste para devolução pendente criados');
  });

  afterEach(async () => {
    console.log('🧹 Limpando ambiente de teste de devolução pendente...');
  });

  describe('Flag devolucaoPendente', () => {
    it('deve retornar devolucaoPendente = false para ficha sem entregas', async () => {
      const ficha = await fichaUseCase.obterFicha(fichaId);

      expect(ficha).not.toBeNull();
      if (ficha) {
        expect(ficha.devolucaoPendente).toBe(false);
      }
    });

    it('deve retornar devolucaoPendente = false para entrega sem data limite vencida', async () => {
      // Criar entrega com data limite futura
      const dataLimiteFutura = new Date();
      dataLimiteFutura.setDate(dataLimiteFutura.getDate() + 30); // 30 dias no futuro

      const entrega = await entregaUseCase.execute({
        fichaEpiId: fichaId,
        quantidade: 1,
        itens: [{
          numeroSerie: 'TESTE-001',
          estoqueItemOrigemId: estoqueItemId,
        }],
        usuarioId: 'user-temp',
        observacoes: 'Teste devolução pendente',
      });

      // Simular assinatura da entrega
      await prisma.entrega.update({
        where: { id: entrega.id },
        data: { status: 'ASSINADA' },
      });

      // Atualizar data limite dos itens
      await prisma.entregaItem.updateMany({
        where: { entregaId: entrega.id },
        data: { dataLimiteDevolucao: dataLimiteFutura },
      });

      const ficha = await fichaUseCase.obterFicha(fichaId);

      expect(ficha).not.toBeNull();
      if (ficha) {
        expect(ficha.devolucaoPendente).toBe(false);
      }
    });

    it('deve retornar devolucaoPendente = true para entrega com data limite vencida', async () => {
      // Criar entrega com data limite passada
      const dataLimitePassada = new Date();
      dataLimitePassada.setDate(dataLimitePassada.getDate() - 5); // 5 dias atrás

      const entrega = await entregaUseCase.execute({
        fichaEpiId: fichaId,
        quantidade: 1,
        itens: [{
          numeroSerie: 'TESTE-002',
          estoqueItemOrigemId: estoqueItemId,
        }],
        usuarioId: 'user-temp',
        observacoes: 'Teste devolução pendente - vencida',
      });

      // Simular assinatura da entrega
      await prisma.entrega.update({
        where: { id: entrega.id },
        data: { status: 'ASSINADA' },
      });

      // Atualizar data limite dos itens para data passada
      await prisma.entregaItem.updateMany({
        where: { entregaId: entrega.id },
        data: { dataLimiteDevolucao: dataLimitePassada },
      });

      const ficha = await fichaUseCase.obterFicha(fichaId);

      expect(ficha).not.toBeNull();
      if (ficha) {
        expect(ficha.devolucaoPendente).toBe(true);
      }
    });

    it('deve retornar devolucaoPendente = false para item já devolvido', async () => {
      // Criar entrega com data limite passada
      const dataLimitePassada = new Date();
      dataLimitePassada.setDate(dataLimitePassada.getDate() - 5);

      const entrega = await entregaUseCase.execute({
        fichaEpiId: fichaId,
        quantidade: 1,
        itens: [{
          numeroSerie: 'TESTE-003',
          estoqueItemOrigemId: estoqueItemId,
        }],
        usuarioId: 'user-temp',
        observacoes: 'Teste item devolvido',
      });

      // Simular assinatura da entrega
      await prisma.entrega.update({
        where: { id: entrega.id },
        data: { status: 'ASSINADA' },
      });

      // Atualizar item para devolvido e com data limite passada
      await prisma.entregaItem.updateMany({
        where: { entregaId: entrega.id },
        data: { 
          dataLimiteDevolucao: dataLimitePassada,
          status: 'DEVOLVIDO', // Item já foi devolvido
        },
      });

      const ficha = await fichaUseCase.obterFicha(fichaId);

      expect(ficha).not.toBeNull();
      if (ficha) {
        expect(ficha.devolucaoPendente).toBe(false);
      }
    });
  });

  describe('Filtro devolucaoPendente', () => {
    beforeEach(async () => {
      // Criar outra ficha e entrega para ter dados para filtrar
      const outroColaborador = await prisma.colaborador.create({
        data: {
          nome: 'Colaborador Teste Filtro',
          cpf: '99999999999',
          matricula: 'TEST-FILTRO',
          ativo: true,
          unidadeNegocioId: (await prisma.unidadeNegocio.findFirst())!.id,
        },
      });

      const outraFicha = await fichaUseCase.execute({
        colaboradorId: outroColaborador.id,
        status: 'ATIVA',
      });

      // Criar entrega com devolução pendente
      const dataLimitePassada = new Date();
      dataLimitePassada.setDate(dataLimitePassada.getDate() - 10);

      const entrega = await entregaUseCase.execute({
        fichaEpiId: outraFicha.id,
        quantidade: 1,
        itens: [{
          numeroSerie: 'FILTRO-001',
          estoqueItemOrigemId: estoqueItemId,
        }],
        usuarioId: 'user-temp',
        observacoes: 'Teste filtro devolução pendente',
      });

      await prisma.entrega.update({
        where: { id: entrega.id },
        data: { status: 'ASSINADA' },
      });

      await prisma.entregaItem.updateMany({
        where: { entregaId: entrega.id },
        data: { dataLimiteDevolucao: dataLimitePassada },
      });
    });

    it('deve filtrar apenas fichas com devolução pendente quando devolucaoPendente = true', async () => {
      const fichasComDevolucaoPendente = await fichaUseCase.listarFichas({
        devolucaoPendente: true,
      });

      const fichasArray = Array.isArray(fichasComDevolucaoPendente) 
        ? fichasComDevolucaoPendente 
        : fichasComDevolucaoPendente.items;

      expect(fichasArray.length).toBeGreaterThan(0);
      expect(fichasArray.every(ficha => ficha.devolucaoPendente === true)).toBe(true);
    });

    it('deve retornar todas as fichas quando devolucaoPendente não é especificado', async () => {
      const todasFichas = await fichaUseCase.listarFichas({});

      const fichasArray = Array.isArray(todasFichas) 
        ? todasFichas 
        : todasFichas.items;

      expect(fichasArray.length).toBeGreaterThan(0);
      
      // Deve ter pelo menos uma com devolução pendente e uma sem
      const comDevolucaoPendente = fichasArray.filter(f => f.devolucaoPendente);
      const semDevolucaoPendente = fichasArray.filter(f => !f.devolucaoPendente);
      
      expect(comDevolucaoPendente.length).toBeGreaterThan(0);
      expect(semDevolucaoPendente.length).toBeGreaterThan(0);
    });

    it('deve funcionar com paginação', async () => {
      const resultado = await fichaUseCase.listarFichas(
        { devolucaoPendente: true },
        { page: 1, limit: 5 }
      );

      if ('items' in resultado) {
        expect(resultado.items.every(ficha => ficha.devolucaoPendente === true)).toBe(true);
        expect(resultado.total).toBeGreaterThan(0);
        expect(resultado.page).toBe(1);
      }
    });
  });
});