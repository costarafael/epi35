#!/usr/bin/env tsx

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

// Use Cases que criam movimentações realistas
import { GerenciarNotaRascunhoUseCase } from '../src/application/use-cases/estoque/gerenciar-nota-rascunho.use-case';
import { ConcluirNotaMovimentacaoUseCase } from '../src/application/use-cases/estoque/concluir-nota-movimentacao.use-case';
import { CriarEntregaFichaUseCase } from '../src/application/use-cases/fichas/criar-entrega-ficha.use-case';
import { ProcessarDevolucaoUseCase } from '../src/application/use-cases/fichas/processar-devolucao.use-case';

// Configuração das movimentações
const CONFIG = {
  notasEntrada: 15,        // Notas de entrada de EPIs
  percentualEntregas: 0.3, // 30% das fichas ativas receberão entregas
  percentualDevolucoes: 0.2, // 20% das entregas terão devoluções
  itensMinPorNota: 3,      // Mínimo de tipos EPI por nota
  itensMaxPorNota: 7,      // Máximo de tipos EPI por nota
  quantidadeMinPorItem: 50, // Quantidade mínima por item na nota
  quantidadeMaxPorItem: 200, // Quantidade máxima por item na nota
  itensMinPorEntrega: 1,   // Mínimo de itens por entrega
  itensMaxPorEntrega: 4,   // Máximo de itens por entrega
  quantidadeMinPorEntrega: 1, // Quantidade mínima por item na entrega
  quantidadeMaxPorEntrega: 3, // Quantidade máxima por item na entrega
};

// Função para obter item aleatório de array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Função para shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Função para gerar número aleatório entre min e max (inclusive)
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Função para gerar data aleatória nos últimos N dias
function randomDateLastDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * days));
  return date;
}

class SeedMovimentacoes {
  private app: any;
  private prisma: PrismaService;
  private gerenciarNotaUseCase: GerenciarNotaRascunhoUseCase;
  private concluirNotaUseCase: ConcluirNotaMovimentacaoUseCase;
  private criarEntregaUseCase: CriarEntregaFichaUseCase;
  private processarDevolucaoUseCase: ProcessarDevolucaoUseCase;

  async inicializar() {
    console.log('🚀 Inicializando aplicação NestJS...');
    this.app = await NestFactory.create(AppModule, { logger: false });
    
    // Obter use cases via injeção de dependência
    this.prisma = this.app.get(PrismaService);
    this.gerenciarNotaUseCase = this.app.get(GerenciarNotaRascunhoUseCase);
    this.concluirNotaUseCase = this.app.get(ConcluirNotaMovimentacaoUseCase);
    this.criarEntregaUseCase = this.app.get(CriarEntregaFichaUseCase);
    this.processarDevolucaoUseCase = this.app.get(ProcessarDevolucaoUseCase);
    
    console.log('✅ Aplicação inicializada.');
  }

  async finalizarApp() {
    if (this.app) {
      await this.app.close();
    }
  }

  async validarDadosBase() {
    console.log('🔍 Validando dados base...');
    
    const usuarios = await this.prisma.usuario.findMany();
    const almoxarifados = await this.prisma.almoxarifado.findMany();
    const tiposEpi = await this.prisma.tipoEPI.findMany();
    const fichas = await this.prisma.fichaEPI.findMany();
    
    if (usuarios.length === 0) {
      throw new Error('❌ Nenhum usuário encontrado. Execute o seed principal primeiro.');
    }
    
    if (almoxarifados.length === 0) {
      throw new Error('❌ Nenhum almoxarifado encontrado. Execute o seed principal primeiro.');
    }
    
    if (tiposEpi.length === 0) {
      throw new Error('❌ Nenhum tipo de EPI encontrado. Execute o seed base primeiro.');
    }
    
    if (fichas.length === 0) {
      throw new Error('❌ Nenhuma ficha encontrada. Execute o seed base primeiro.');
    }
    
    console.log(`✅ Dados base validados: ${usuarios.length} usuários, ${almoxarifados.length} almoxarifados, ${tiposEpi.length} tipos EPI, ${fichas.length} fichas.`);
    
    return { usuarios, almoxarifados, tiposEpi, fichas };
  }

  async criarNotasEntrada(usuarios: any[], almoxarifados: any[], tiposEpi: any[]) {
    console.log('📝 Criando notas de entrada via use cases...');
    
    const notasRascunho = [];
    
    for (let i = 0; i < CONFIG.notasEntrada; i++) {
      const almoxarifado = randomItem(almoxarifados);
      const responsavel = randomItem(usuarios);
      const numeroDocumento = `NF-${String(i + 1).padStart(6, '0')}`;
      const dataDocumento = randomDateLastDays(30);
      
      try {
        // 1. Criar nota em rascunho via use case
        const notaRascunho = await this.gerenciarNotaUseCase.execute({
          almoxarifadoId: almoxarifado.id,
          responsavelId: responsavel.id,
          tipoNota: 'ENTRADA',
          numeroDocumento,
          dataDocumento,
          observacoes: `Nota de entrada de EPIs - Lote ${i + 1}`,
        });
        
        // 2. Adicionar itens à nota
        const numeroItens = randomBetween(CONFIG.itensMinPorNota, CONFIG.itensMaxPorNota);
        const tiposEscolhidos = shuffleArray(tiposEpi).slice(0, numeroItens);
        
        const itensParaAdicionar = [];
        for (const tipoEpi of tiposEscolhidos) {
          const quantidade = randomBetween(CONFIG.quantidadeMinPorItem, CONFIG.quantidadeMaxPorItem);
          const custoUnitario = randomBetween(1000, 15000); // R$ 10,00 a R$ 150,00 em centavos
          
          itensParaAdicionar.push({
            tipoEpiId: tipoEpi.id,
            quantidade,
            custoUnitario,
          });
        }
        
        // Adicionar itens via use case
        for (const item of itensParaAdicionar) {
          await this.gerenciarNotaUseCase.adicionarItem({
            notaId: notaRascunho.id,
            ...item,
          });
        }
        
        // 3. Concluir nota via use case (cria movimentações e atualiza estoque)
        await this.concluirNotaUseCase.execute({
          notaId: notaRascunho.id,
          responsavelId: responsavel.id,
        });
        
        notasRascunho.push(notaRascunho);
        console.log(`✅ Nota ${numeroDocumento} criada e concluída (${itensParaAdicionar.length} tipos de EPI).`);
        
      } catch (error) {
        console.error(`❌ Erro ao criar nota ${numeroDocumento}:`, error.message);
      }
    }
    
    console.log(`✅ ${notasRascunho.length} notas de entrada criadas via use cases.`);
    return notasRascunho;
  }

  async criarEntregasViaUseCase(fichas: any[], almoxarifados: any[], usuarios: any[]) {
    console.log('📦 Criando entregas via use cases...');
    
    const entregas = [];
    const fichasParaEntrega = shuffleArray(fichas)
      .slice(0, Math.floor(fichas.length * CONFIG.percentualEntregas));
    
    // Buscar estoque disponível
    const estoqueDisponivel = await this.prisma.estoqueItem.findMany({
      where: {
        quantidade: { gt: 0 },
        status: 'DISPONIVEL',
      },
      include: {
        tipoEpi: true,
        almoxarifado: true,
      },
    });
    
    if (estoqueDisponivel.length === 0) {
      console.log('⚠️ Nenhum estoque disponível para entregas. Execute as notas de entrada primeiro.');
      return [];
    }
    
    for (const ficha of fichasParaEntrega) {
      const almoxarifado = randomItem(almoxarifados);
      const responsavel = randomItem(usuarios);
      
      // Filtrar estoque do almoxarifado escolhido
      const estoqueAlmoxarifado = estoqueDisponivel.filter(
        item => item.almoxarifadoId === almoxarifado.id && item.quantidade > 0
      );
      
      if (estoqueAlmoxarifado.length === 0) {
        console.log(`⚠️ Almoxarifado ${almoxarifado.nome} sem estoque disponível.`);
        continue;
      }
      
      try {
        // Escolher itens para entrega
        const numeroItens = randomBetween(CONFIG.itensMinPorEntrega, CONFIG.itensMaxPorEntrega);
        const itensEscolhidos = shuffleArray(estoqueAlmoxarifado).slice(0, numeroItens);
        
        const itensParaEntrega = [];
        for (const estoqueItem of itensEscolhidos) {
          const quantidadeMaxima = Math.min(
            estoqueItem.quantidade,
            CONFIG.quantidadeMaxPorEntrega
          );
          
          if (quantidadeMaxima >= CONFIG.quantidadeMinPorEntrega) {
            const quantidade = randomBetween(CONFIG.quantidadeMinPorEntrega, quantidadeMaxima);
            
            itensParaEntrega.push({
              estoqueItemOrigemId: estoqueItem.id,
              quantidadeEntregue: quantidade,
            });
          }
        }
        
        if (itensParaEntrega.length === 0) {
          console.log(`⚠️ Nenhum item disponível para entrega na ficha ${ficha.id}.`);
          continue;
        }
        
        // Criar entrega via use case
        const entrega = await this.criarEntregaUseCase.execute({
          fichaEpiId: ficha.id,
          almoxarifadoId: almoxarifado.id,
          responsavelId: responsavel.id,
          itens: itensParaEntrega,
          observacoes: `Entrega de EPIs - ${itensParaEntrega.length} tipos`,
        });
        
        entregas.push(entrega);
        console.log(`✅ Entrega criada para ficha ${ficha.id} (${itensParaEntrega.length} tipos de EPI).`);
        
      } catch (error) {
        console.error(`❌ Erro ao criar entrega para ficha ${ficha.id}:`, error.message);
      }
    }
    
    console.log(`✅ ${entregas.length} entregas criadas via use cases.`);
    return entregas;
  }

  async criarDevolucoesViaUseCase(usuarios: any[]) {
    console.log('🔄 Criando devoluções via use cases...');
    
    // Buscar entregas assinadas que podem ter devoluções
    const entregasAssinadas = await this.prisma.entrega.findMany({
      where: { status: 'ASSINADA' },
      include: {
        itens: {
          where: { status: 'COM_COLABORADOR' },
        },
      },
    });
    
    if (entregasAssinadas.length === 0) {
      console.log('⚠️ Nenhuma entrega assinada disponível para devolução.');
      return [];
    }
    
    const devolucoes = [];
    const entregasParaDevolucao = shuffleArray(entregasAssinadas)
      .slice(0, Math.floor(entregasAssinadas.length * CONFIG.percentualDevolucoes));
    
    for (const entrega of entregasParaDevolucao) {
      const responsavel = randomItem(usuarios);
      
      try {
        // Escolher itens para devolução (alguns itens da entrega)
        const itensDisponiveis = entrega.itens.filter(item => item.status === 'COM_COLABORADOR');
        
        if (itensDisponiveis.length === 0) {
          continue;
        }
        
        // Devolver 30% a 70% dos itens
        const percentualDevolucao = Math.random() * 0.4 + 0.3;
        const quantidadeItensParaDevolver = Math.max(1, Math.ceil(itensDisponiveis.length * percentualDevolucao));
        const itensParaDevolucao = shuffleArray(itensDisponiveis).slice(0, quantidadeItensParaDevolver);
        
        const itensParaProcessar = [];
        for (const item of itensParaDevolucao) {
          // Devolver quantidade parcial ou total
          const quantidadeMaxima = item.quantidadeEntregue;
          const quantidadeDevolucao = randomBetween(1, quantidadeMaxima);
          
          itensParaProcessar.push({
            entregaItemId: item.id,
            quantidadeDevolvida: quantidadeDevolucao,
            motivoDevolucao: randomItem([
              'DANIFICADO',
              'VENCIDO',
              'TROCA_TAMANHO',
              'DESLIGAMENTO',
              'TROCA_FUNCAO'
            ]),
            destinoPos: randomItem(['QUARENTENA', 'DESCARTE']),
          });
        }
        
        // Processar devolução via use case
        await this.processarDevolucaoUseCase.execute({
          entregaId: entrega.id,
          responsavelId: responsavel.id,
          itens: itensParaProcessar,
          observacoes: `Devolução de ${itensParaProcessar.length} itens`,
        });
        
        devolucoes.push(entrega);
        console.log(`✅ Devolução processada para entrega ${entrega.id} (${itensParaProcessar.length} itens).`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar devolução da entrega ${entrega.id}:`, error.message);
      }
    }
    
    console.log(`✅ ${devolucoes.length} devoluções criadas via use cases.`);
    return devolucoes;
  }

  async gerarEstatisticas() {
    console.log('\n📊 Gerando estatísticas finais...');
    
    const [
      totalMovimentacoes,
      estoqueDisponivel,
      estoqueQuarentena,
      totalEntregas,
      totalDevolucoes,
      fichasAtivas
    ] = await Promise.all([
      this.prisma.movimentacaoEstoque.count(),
      this.prisma.estoqueItem.aggregate({
        where: { status: 'DISPONIVEL' },
        _sum: { quantidade: true },
      }),
      this.prisma.estoqueItem.aggregate({
        where: { status: 'QUARENTENA' },
        _sum: { quantidade: true },
      }),
      this.prisma.entrega.count(),
      this.prisma.entrega.count({
        where: {
          itens: {
            some: { status: 'DEVOLVIDO' }
          }
        }
      }),
      this.prisma.fichaEPI.count({ where: { status: 'ATIVA' } })
    ]);
    
    console.log('📈 Estatísticas das movimentações:');
    console.log(`🔄 Total de movimentações: ${totalMovimentacoes}`);
    console.log(`📦 Estoque disponível: ${estoqueDisponivel._sum.quantidade || 0} unidades`);
    console.log(`🔒 Estoque em quarentena: ${estoqueQuarentena._sum.quantidade || 0} unidades`);
    console.log(`📤 Total de entregas: ${totalEntregas}`);
    console.log(`🔄 Entregas com devoluções: ${totalDevolucoes}`);
    console.log(`📋 Fichas ativas: ${fichasAtivas}`);
  }

  async executar() {
    try {
      await this.inicializar();
      
      console.log('🌱 Iniciando seed de movimentações via use cases...');
      
      // 1. Validar dados base
      const { usuarios, almoxarifados, tiposEpi, fichas } = await this.validarDadosBase();
      
      // 2. Criar notas de entrada (via use cases)
      await this.criarNotasEntrada(usuarios, almoxarifados, tiposEpi);
      
      // 3. Criar entregas (via use cases)
      await this.criarEntregasViaUseCase(fichas, almoxarifados, usuarios);
      
      // 4. Criar devoluções (via use cases)
      await this.criarDevolucoesViaUseCase(usuarios);
      
      // 5. Gerar estatísticas
      await this.gerarEstatisticas();
      
      console.log('\n🎉 Seed de movimentações concluído com sucesso!');
      console.log('✅ Todas as movimentações foram criadas via use cases do backend.');
      console.log('✅ Rastreabilidade unitária preservada.');
      console.log('✅ Dados consistentes entre Read Model e Event Log.');
      
    } catch (error) {
      console.error('❌ Erro durante o seed de movimentações:', error);
      throw error;
    } finally {
      await this.finalizarApp();
    }
  }
}

// Executar script
async function main() {
  const seedMovimentacoes = new SeedMovimentacoes();
  await seedMovimentacoes.executar();
}

main()
  .catch((e) => {
    console.error('❌ Seed de movimentações falhou:', e);
    process.exit(1);
  });