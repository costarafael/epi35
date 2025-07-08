// import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { execSync } from 'child_process';
// import * as path from 'path';

export class TestDatabaseService {
  private static instance: TestDatabaseService;
  public prismaService: PrismaService;

  private constructor() {
    // Forçar uso das variáveis de teste
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public";
    
    // Mock ConfigService para o PrismaService
    const mockConfigService = {
      get: (key: string) => {
        const config = {
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public",
          NODE_ENV: 'test',
        };
        return config[key] || process.env[key];
      },
    };
    
    this.prismaService = new PrismaService(mockConfigService as any);
  }

  static getInstance(): TestDatabaseService {
    if (!TestDatabaseService.instance) {
      TestDatabaseService.instance = new TestDatabaseService();
    }
    return TestDatabaseService.instance;
  }

  async setupDatabase(): Promise<void> {
    try {
      // SEMPRE resetar o banco de teste no início dos testes
      console.log('🔄 Resetando banco de teste (automático para desenvolvimento)...');
      try {
        execSync('npm run prisma:test:reset', { 
          cwd: process.cwd(),
          stdio: 'pipe', // Usar pipe para evitar poluição visual
          env: { 
            ...process.env, 
            DATABASE_URL: "postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public"
          }
        });
        console.log('✅ Reset automático do banco de teste concluído');
      } catch (migrationError) {
        console.log('⚠️ Reset automático falhou, limpando e aplicando schema...');
        
        // Limpar banco e aplicar schema via SQL direto
        await this.cleanDatabase();
        
        execSync('npx prisma db push --force-reset', { 
          cwd: process.cwd(),
          stdio: 'pipe',
          env: { 
            ...process.env, 
            DATABASE_URL: "postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public"
          }
        });
        
        // Se db push funcionou, executar seed manualmente
        console.log('🌱 Executando seed no banco de teste...');
        await this.seedDatabase();
      }

      console.log('✅ Banco de teste configurado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao configurar banco de teste:', error);
      throw error;
    }
  }

  async cleanDatabase(): Promise<void> {
    try {
      console.log('🧹 Limpando banco de teste...');
      
      // Limpar dados em ordem específica para respeitar FKs (schema v3.5)
      // Usar CASCADE para lidar com dependências automaticamente
      // Limpar tabelas dependentes primeiro, depois as principais
      
      // 1. Limpar tabelas de relacionamento/histórico
      await this.prismaService.$executeRaw`TRUNCATE TABLE "movimentacoes_estoque" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "entrega_itens" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "historico_fichas" RESTART IDENTITY CASCADE`;
      
      // 2. Limpar tabelas de processo/transação
      await this.prismaService.$executeRaw`TRUNCATE TABLE "entregas" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "nota_movimentacao_itens" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "notas_movimentacao" RESTART IDENTITY CASCADE`;
      
      // 3. Limpar tabelas de entidades principais
      await this.prismaService.$executeRaw`TRUNCATE TABLE "fichas_epi" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "estoque_itens" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "colaboradores" RESTART IDENTITY CASCADE`;
      
      // 4. Limpar tabelas de configuração/mestre
      await this.prismaService.$executeRaw`TRUNCATE TABLE "tipos_epi" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "contratadas" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "almoxarifados" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "unidades_negocio" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "usuarios" RESTART IDENTITY CASCADE`;
      await this.prismaService.$executeRaw`TRUNCATE TABLE "configuracoes" RESTART IDENTITY CASCADE`;

      console.log('✅ Banco de teste limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar banco de teste:', error);
      throw error;
    }
  }

  async resetDatabase(): Promise<void> {
    await this.cleanDatabase();
    await this.seedDatabase();
  }

  private async seedDatabase(): Promise<void> {
    // Executar seed específico para testes
    // const _seedPath = path.join(__dirname, '../seeds/test-seed.ts');
    
    try {
      const { seedTestData } = await import('../seeds/test-seed');
      await seedTestData(this.prismaService);
    } catch (error) {
      console.warn('⚠️ Seed de teste não encontrado, criando dados básicos...');
      await this.createBasicTestData();
    }
  }

  private async createBasicTestData(): Promise<void> {
    // Criar usuário de teste (schema simplificado - sem senha, sem configurações)
    let usuario = await this.prismaService.usuario.findUnique({
      where: { email: 'teste@epi.com' },
    });
    
    if (!usuario) {
      usuario = await this.prismaService.usuario.create({
        data: {
          nome: 'Usuário de Teste',
          email: 'teste@epi.com',
        },
      });
    }

    // Criar unidade de negócio
    let unidade = await this.prismaService.unidadeNegocio.findUnique({
      where: { codigo: 'TEST' },
    });
    
    if (!unidade) {
      unidade = await this.prismaService.unidadeNegocio.create({
        data: {
          nome: 'Unidade Teste',
          codigo: 'TEST',
        },
      });
    }

    // Criar almoxarifado
    let almoxarifado = await this.prismaService.almoxarifado.findFirst({
      where: { nome: 'Almoxarifado Central' },
    });
    
    if (!almoxarifado) {
      almoxarifado = await this.prismaService.almoxarifado.create({
        data: {
          nome: 'Almoxarifado Central',
          // codigo: 'ALM-TEST', // Field removed from schema v3.5
          unidadeNegocioId: unidade.id,
          // ativo: true, // Field removed from schema v3.5
        },
      });
    }

    // Criar tipos de EPI de teste (usando nova estrutura de campos)
    let tipoCapacete = await this.prismaService.tipoEPI.findUnique({
      where: { numeroCa: 'CA-12345' },
    });
    
    if (!tipoCapacete) {
      tipoCapacete = await this.prismaService.tipoEPI.create({
        data: {
          nomeEquipamento: 'Capacete de Segurança',
          numeroCa: 'CA-12345',
          descricao: 'Capacete de segurança para teste',
          vidaUtilDias: 180, // 6 meses
          status: 'ATIVO',
        },
      });
    }

    let tipoLuva = await this.prismaService.tipoEPI.findUnique({
      where: { numeroCa: 'CA-67890' },
    });
    
    if (!tipoLuva) {
      tipoLuva = await this.prismaService.tipoEPI.create({
        data: {
          nomeEquipamento: 'Luva de Proteção',
          numeroCa: 'CA-67890',
          descricao: 'Luva de proteção para teste',
          vidaUtilDias: 180, // 6 meses
          status: 'ATIVO',
        },
      });
    }

    // Verificar se já existe estoque para esses itens
    const estoqueCapacete = await this.prismaService.estoqueItem.findFirst({
      where: {
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoCapacete.id,
      },
    });
    
    if (!estoqueCapacete) {
      await this.prismaService.estoqueItem.create({
        data: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoCapacete.id,
          quantidade: 50,
          status: 'DISPONIVEL',
        },
      });
    }
    
    const estoqueLuva = await this.prismaService.estoqueItem.findFirst({
      where: {
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoLuva.id,
      },
    });
    
    if (!estoqueLuva) {
      await this.prismaService.estoqueItem.create({
        data: {
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoLuva.id,
          quantidade: 100,
          status: 'DISPONIVEL',
        },
      });
    }

    // Criar colaborador de teste
    await this.prismaService.colaborador.upsert({
      where: { cpf: '12345678901' },
      update: {},
      create: {
        nome: 'João Silva Teste',
        cpf: '12345678901',
        matricula: 'TEST001',
        cargo: 'Operador de Teste',
        setor: 'Produção',
        unidadeNegocioId: unidade.id,
      },
    });

    console.log('✅ Dados básicos de teste criados');
  }

  getPrismaService(): PrismaService {
    return this.prismaService;
  }

  async disconnect(): Promise<void> {
    await this.prismaService.$disconnect();
  }
}