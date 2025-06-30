import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Limpar dados existentes (cuidado em produção!)
  console.log('🧹 Cleaning existing data...');
  await prisma.configuracao.deleteMany();
  await prisma.historicoFicha.deleteMany();
  await prisma.entregaItem.deleteMany();
  await prisma.entrega.deleteMany();
  await prisma.fichaEPI.deleteMany();
  await prisma.colaborador.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.notaMovimentacaoItem.deleteMany();
  await prisma.notaMovimentacao.deleteMany();
  await prisma.estoqueItem.deleteMany();
  await prisma.tipoEPI.deleteMany();
  await prisma.almoxarifado.deleteMany();
  await prisma.unidadeNegocio.deleteMany();
  await prisma.usuario.deleteMany();

  // 1. Usuários
  console.log('👤 Creating users...');
  const users = await Promise.all([
    prisma.usuario.create({
      data: {
        nome: 'Administrador Sistema',
        email: 'admin@epi.com',
        senha: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        status: 'ATIVO',
      },
    }),
    prisma.usuario.create({
      data: {
        nome: 'João Silva',
        email: 'joao.silva@epi.com',
        senha: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        status: 'ATIVO',
      },
    }),
    prisma.usuario.create({
      data: {
        nome: 'Maria Santos',
        email: 'maria.santos@epi.com',
        senha: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        status: 'ATIVO',
      },
    }),
  ]);

  // 2. Unidades de Negócio
  console.log('🏢 Creating business units...');
  const unidades = await Promise.all([
    prisma.unidadeNegocio.create({
      data: {
        nome: 'Matriz São Paulo',
        codigo: 'SP001',
        ativa: true,
      },
    }),
    prisma.unidadeNegocio.create({
      data: {
        nome: 'Filial Rio de Janeiro',
        codigo: 'RJ001',
        ativa: true,
      },
    }),
    prisma.unidadeNegocio.create({
      data: {
        nome: 'Unidade Belo Horizonte',
        codigo: 'BH001',
        ativa: true,
      },
    }),
  ]);

  // 3. Almoxarifados
  console.log('📦 Creating warehouses...');
  const almoxarifados = await Promise.all([
    prisma.almoxarifado.create({
      data: {
        nome: 'Almoxarifado Central SP',
        codigo: 'ALM-SP-001',
        descricao: 'Almoxarifado principal da matriz',
        unidadeNegocioId: unidades[0].id,
        ativo: true,
      },
    }),
    prisma.almoxarifado.create({
      data: {
        nome: 'Almoxarifado Fábrica SP',
        codigo: 'ALM-SP-002',
        descricao: 'Almoxarifado da área de produção',
        unidadeNegocioId: unidades[0].id,
        ativo: true,
      },
    }),
    prisma.almoxarifado.create({
      data: {
        nome: 'Almoxarifado RJ',
        codigo: 'ALM-RJ-001',
        descricao: 'Almoxarifado da filial RJ',
        unidadeNegocioId: unidades[1].id,
        ativo: true,
      },
    }),
    prisma.almoxarifado.create({
      data: {
        nome: 'Almoxarifado BH',
        codigo: 'ALM-BH-001',
        descricao: 'Almoxarifado da unidade BH',
        unidadeNegocioId: unidades[2].id,
        ativo: true,
      },
    }),
  ]);

  // 4. Tipos de EPI
  console.log('🦺 Creating EPI types...');
  const tiposEpi = await Promise.all([
    prisma.tipoEPI.create({
      data: {
        nome: 'Capacete de Segurança',
        codigo: 'EPI-CAP-001',
        descricao: 'Capacete de segurança classe A',
        ca: '12345',
        validadeMeses: 60,
        diasAvisoVencimento: 30,
        exigeAssinaturaEntrega: true,
        ativo: true,
      },
    }),
    prisma.tipoEPI.create({
      data: {
        nome: 'Óculos de Proteção',
        codigo: 'EPI-OCU-001',
        descricao: 'Óculos de proteção contra impactos',
        ca: '23456',
        validadeMeses: 24,
        diasAvisoVencimento: 15,
        exigeAssinaturaEntrega: true,
        ativo: true,
      },
    }),
    prisma.tipoEPI.create({
      data: {
        nome: 'Luva de Segurança',
        codigo: 'EPI-LUV-001',
        descricao: 'Luva de segurança em couro',
        ca: '34567',
        validadeMeses: 12,
        diasAvisoVencimento: 30,
        exigeAssinaturaEntrega: true,
        ativo: true,
      },
    }),
    prisma.tipoEPI.create({
      data: {
        nome: 'Protetor Auricular',
        codigo: 'EPI-AUR-001',
        descricao: 'Protetor auricular tipo concha',
        ca: '45678',
        validadeMeses: 36,
        diasAvisoVencimento: 30,
        exigeAssinaturaEntrega: false,
        ativo: true,
      },
    }),
    prisma.tipoEPI.create({
      data: {
        nome: 'Botina de Segurança',
        codigo: 'EPI-BOT-001',
        descricao: 'Botina de segurança com bico de aço',
        ca: '56789',
        validadeMeses: 24,
        diasAvisoVencimento: 30,
        exigeAssinaturaEntrega: true,
        ativo: true,
      },
    }),
  ]);

  // 5. Itens de Estoque
  console.log('📊 Creating initial stock...');
  const estoqueItens = [];
  
  // Criar estoque para cada almoxarifado e tipo de EPI
  for (const almox of almoxarifados) {
    for (const tipo of tiposEpi) {
      const item = await prisma.estoqueItem.create({
        data: {
          almoxarifadoId: almox.id,
          tipoEpiId: tipo.id,
          quantidade: Math.floor(Math.random() * 100) + 50, // Entre 50 e 150 unidades
          status: 'DISPONIVEL',
        },
      });
      estoqueItens.push(item);
    }
  }

  // 6. Colaboradores
  console.log('👷 Creating employees...');
  const colaboradores = await Promise.all([
    prisma.colaborador.create({
      data: {
        nome: 'Carlos Oliveira',
        cpf: '12345678901',
        matricula: 'MAT001',
        cargo: 'Operador de Produção',
        setor: 'Produção',
        unidadeNegocioId: unidades[0].id,
        ativo: true,
      },
    }),
    prisma.colaborador.create({
      data: {
        nome: 'Ana Costa',
        cpf: '23456789012',
        matricula: 'MAT002',
        cargo: 'Supervisora de Qualidade',
        setor: 'Qualidade',
        unidadeNegocioId: unidades[0].id,
        ativo: true,
      },
    }),
    prisma.colaborador.create({
      data: {
        nome: 'Pedro Santos',
        cpf: '34567890123',
        matricula: 'MAT003',
        cargo: 'Técnico de Manutenção',
        setor: 'Manutenção',
        unidadeNegocioId: unidades[1].id,
        ativo: true,
      },
    }),
    prisma.colaborador.create({
      data: {
        nome: 'Luciana Ferreira',
        cpf: '45678901234',
        matricula: 'MAT004',
        cargo: 'Engenheira de Segurança',
        setor: 'Segurança do Trabalho',
        unidadeNegocioId: unidades[2].id,
        ativo: true,
      },
    }),
  ]);

  // 7. Fichas de EPI
  console.log('📋 Creating EPI cards...');
  const fichas = [];
  
  for (const colaborador of colaboradores) {
    // Cada colaborador terá fichas para alguns tipos de EPI
    const tiposParaColaborador = tiposEpi.slice(0, 3); // Primeiros 3 tipos
    const almoxarifadoColaborador = almoxarifados.find(
      a => a.unidadeNegocioId === colaborador.unidadeNegocioId
    ) || almoxarifados[0];

    for (const tipo of tiposParaColaborador) {
      const ficha = await prisma.fichaEPI.create({
        data: {
          colaboradorId: colaborador.id,
          tipoEpiId: tipo.id,
          almoxarifadoId: almoxarifadoColaborador.id,
          status: 'ATIVA',
        },
      });
      fichas.push(ficha);
    }
  }

  // 8. Configurações do Sistema
  console.log('⚙️ Creating system configurations...');
  await Promise.all([
    prisma.configuracao.create({
      data: {
        chave: 'PERMITIR_ESTOQUE_NEGATIVO',
        valor: 'false',
        descricao: 'Permite que o estoque fique negativo',
        ativa: true,
      },
    }),
    prisma.configuracao.create({
      data: {
        chave: 'PERMITIR_AJUSTES_FORCADOS',
        valor: 'true',
        descricao: 'Permite ajustes diretos no inventário',
        ativa: true,
      },
    }),
    prisma.configuracao.create({
      data: {
        chave: 'DIAS_AVISO_VENCIMENTO_DEFAULT',
        valor: '30',
        descricao: 'Dias padrão para aviso de vencimento',
        ativa: true,
      },
    }),
    prisma.configuracao.create({
      data: {
        chave: 'BACKUP_AUTOMATICO',
        valor: 'true',
        descricao: 'Ativa backup automático do sistema',
        ativa: true,
      },
    }),
  ]);

  // 9. Nota de Movimentação de Exemplo (Entrada)
  console.log('📝 Creating sample movement note...');
  const notaMovimentacao = await prisma.notaMovimentacao.create({
    data: {
      numero: 'NM-001-2024',
      tipo: 'ENTRADA',
      almoxarifadoDestinoId: almoxarifados[0].id,
      usuarioId: users[0].id,
      observacoes: 'Entrada inicial de estoque - lote de abertura',
      status: 'CONCLUIDA',
      dataConclusao: new Date(),
    },
  });

  // 10. Itens da Nota de Movimentação
  const itensNota = await Promise.all([
    prisma.notaMovimentacaoItem.create({
      data: {
        notaMovimentacaoId: notaMovimentacao.id,
        tipoEpiId: tiposEpi[0].id,
        quantidade: 50,
        quantidadeProcessada: 50,
        observacoes: 'Lote inicial de capacetes',
      },
    }),
    prisma.notaMovimentacaoItem.create({
      data: {
        notaMovimentacaoId: notaMovimentacao.id,
        tipoEpiId: tiposEpi[1].id,
        quantidade: 30,
        quantidadeProcessada: 30,
        observacoes: 'Lote inicial de óculos',
      },
    }),
  ]);

  // 11. Movimentações de Estoque correspondentes
  await Promise.all([
    prisma.movimentacaoEstoque.create({
      data: {
        almoxarifadoId: almoxarifados[0].id,
        tipoEpiId: tiposEpi[0].id,
        tipoMovimentacao: 'ENTRADA',
        quantidade: 50,
        saldoAnterior: 0,
        saldoPosterior: 50,
        notaMovimentacaoId: notaMovimentacao.id,
        usuarioId: users[0].id,
        observacoes: 'Entrada inicial - capacetes',
      },
    }),
    prisma.movimentacaoEstoque.create({
      data: {
        almoxarifadoId: almoxarifados[0].id,
        tipoEpiId: tiposEpi[1].id,
        tipoMovimentacao: 'ENTRADA',
        quantidade: 30,
        saldoAnterior: 0,
        saldoPosterior: 30,
        notaMovimentacaoId: notaMovimentacao.id,
        usuarioId: users[0].id,
        observacoes: 'Entrada inicial - óculos',
      },
    }),
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Created data summary:');
  console.log(`👤 Users: ${users.length}`);
  console.log(`🏢 Business Units: ${unidades.length}`);
  console.log(`📦 Warehouses: ${almoxarifados.length}`);
  console.log(`🦺 EPI Types: ${tiposEpi.length}`);
  console.log(`📊 Stock Items: ${estoqueItens.length}`);
  console.log(`👷 Employees: ${colaboradores.length}`);
  console.log(`📋 EPI Cards: ${fichas.length}`);
  console.log(`⚙️ System Configurations: 4`);
  console.log(`📝 Movement Notes: 1`);
  console.log(`📄 Note Items: ${itensNota.length}`);
  console.log(`📈 Stock Movements: 2`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });