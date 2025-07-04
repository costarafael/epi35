import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestDatabaseService } from '../../database/test-database.service';
import { CriarFichaEpiUseCase } from '../../../src/application/use-cases/fichas/criar-ficha-epi.use-case';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service';

describe('CriarFichaEpiUseCase - Paginação Integration Tests', () => {
  let testDb: TestDatabaseService;
  let useCase: CriarFichaEpiUseCase;
  let prisma: PrismaService;
  let colaboradoresIds: string[] = [];

  beforeEach(async () => {
    console.log('🔧 Configurando ambiente de teste de paginação...');
    
    testDb = TestDatabaseService.getInstance();
    prisma = testDb.prismaService;
    useCase = new CriarFichaEpiUseCase(prisma);

    console.log('✅ Banco de dados de teste está pronto');

    await testDb.setupDatabase();

    // Usar colaboradores existentes do seed e criar mais se necessário
    console.log('🧑‍🤝‍🧑 Verificando colaboradores existentes para teste de paginação...');
    
    // Buscar colaboradores existentes
    const colaboradoresExistentes = await prisma.colaborador.findMany({
      where: { ativo: true },
      take: 25,
    });

    // Se não temos suficientes, criar mais conectando à primeira unidade de negócio
    const unidadeNegocio = await prisma.unidadeNegocio.findFirst();
    if (!unidadeNegocio) {
      throw new Error('Nenhuma unidade de negócio encontrada no seed');
    }

    let colaboradoresParaTeste = [...colaboradoresExistentes];
    
    if (colaboradoresExistentes.length < 25) {
      const faltam = 25 - colaboradoresExistentes.length;
      console.log(`🧑‍🤝‍🧑 Criando ${faltam} colaboradores adicionais para teste de paginação...`);
      
      for (let i = colaboradoresExistentes.length + 1; i <= 25; i++) {
        const colaborador = await prisma.colaborador.create({
          data: {
            nome: `Colaborador Teste ${i.toString().padStart(2, '0')}`,
            cpf: `${i.toString().padStart(11, '0')}`,
            matricula: `MAT${i.toString().padStart(4, '0')}`,
            ativo: true,
            unidadeNegocioId: unidadeNegocio.id,
          },
        });
        colaboradoresParaTeste.push(colaborador);
      }
    }

    colaboradoresIds = colaboradoresParaTeste.map(c => c.id);

    // Criar fichas apenas para colaboradores novos (os do seed já podem ter)
    console.log('📋 Criando fichas para colaboradores novos...');
    for (const colaboradorId of colaboradoresIds.slice(colaboradoresExistentes.length)) {
      try {
        await useCase.execute({
          colaboradorId,
          status: Math.random() > 0.5 ? 'ATIVA' : 'INATIVA',
        });
      } catch (error) {
        // Ignorar conflitos - ficha já existe
        if (!error.message.includes('Já existe uma ficha')) {
          throw error;
        }
      }
    }

    console.log('✅ Dados de teste para paginação criados');
  });

  afterEach(async () => {
    console.log('🧹 Limpando ambiente de teste de paginação...');
    colaboradoresIds = [];
  });

  describe('listarFichas - Testes de Paginação', () => {
    it('deve retornar primeira página com limite correto', async () => {
      // Contar fichas existentes no banco
      const totalFichas = await prisma.fichaEPI.count();
      
      const resultado = await useCase.listarFichas({}, { page: 1, limit: 5 });

      expect(resultado).toHaveProperty('items');
      expect(resultado).toHaveProperty('total');
      expect(resultado).toHaveProperty('page');
      expect(resultado).toHaveProperty('totalPages');
      expect(resultado).toHaveProperty('hasNext');
      expect(resultado).toHaveProperty('hasPrev');

      if ('items' in resultado) {
        expect(resultado.items.length).toBeLessThanOrEqual(5);
        expect(resultado.page).toBe(1);
        expect(resultado.total).toBe(totalFichas);
        expect(resultado.hasNext).toBe(totalFichas > 5);
        expect(resultado.hasPrev).toBe(false);
      }
    });

    it('deve retornar todas as fichas quando paginação não é especificada', async () => {
      const resultado = await useCase.listarFichas({});

      expect(Array.isArray(resultado)).toBe(true);
      if (Array.isArray(resultado)) {
        expect(resultado.length).toBeGreaterThan(0);
        expect(resultado[0]).toHaveProperty('id');
        expect(resultado[0]).toHaveProperty('colaboradorId');
        expect(resultado[0]).toHaveProperty('status');
      }
    });

    it('deve usar valores padrão para paginação quando especificados', async () => {
      const totalFichas = await prisma.fichaEPI.count();
      const resultado = await useCase.listarFichas({}, { page: 1, limit: 50 });

      if ('items' in resultado) {
        expect(resultado.page).toBe(1);
        expect(resultado.total).toBe(totalFichas);
        // Com limite 50, todos devem caber em uma página
        expect(resultado.items.length).toBe(Math.min(totalFichas, 50));
      }
    });

    it('deve aplicar filtros com paginação', async () => {
      // Contar fichas ativas
      const fichasAtivas = await prisma.fichaEPI.count({
        where: { status: 'ATIVA' },
      });

      if (fichasAtivas > 0) {
        const resultado = await useCase.listarFichas(
          { status: 'ATIVA' },
          { page: 1, limit: 3 },
        );

        if ('items' in resultado) {
          expect(resultado.total).toBe(fichasAtivas);
          expect(resultado.items.length).toBeLessThanOrEqual(3);
          expect(resultado.items.every(ficha => ficha.status === 'ATIVA')).toBe(true);
        }
      }
    });

    it('deve ordenar resultados consistentemente', async () => {
      const totalFichas = await prisma.fichaEPI.count();
      
      if (totalFichas >= 2) {
        const resultado = await useCase.listarFichas({}, { page: 1, limit: 2 });

        if ('items' in resultado) {
          expect(resultado.items.length).toBe(2);
          
          // Verificar que está ordenado por status e nome do colaborador
          const [primeira, segunda] = resultado.items;
          
          if (primeira.status === segunda.status) {
            expect(primeira.colaborador.nome <= segunda.colaborador.nome).toBe(true);
          } else {
            expect(primeira.status <= segunda.status).toBe(true);
          }
        }
      }
    });
  });
});