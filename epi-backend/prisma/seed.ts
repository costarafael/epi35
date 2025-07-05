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
  await prisma.contratada.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.notaMovimentacaoItem.deleteMany();
  await prisma.notaMovimentacao.deleteMany();
  await prisma.estoqueItem.deleteMany();
  await prisma.tipoEPI.deleteMany();
  await prisma.almoxarifado.deleteMany();
  await prisma.unidadeNegocio.deleteMany();
  await prisma.usuario.deleteMany();

  // 1. Usuários (campo senha removido do novo schema)
  console.log('👤 Creating users...');
  const users = await Promise.all([
    prisma.usuario.create({
      data: {
        nome: 'Administrador Sistema',
        email: 'admin@epi.com',
      },
    }),
    prisma.usuario.create({
      data: {
        nome: 'João Silva',
        email: 'joao.silva@epi.com',
      },
    }),
    prisma.usuario.create({
      data: {
        nome: 'Maria Santos',
        email: 'maria.santos@epi.com',
      },
    }),
  ]);

  // 2. Unidades de Negócio (campo ativa removido)
  console.log('🏢 Creating business units...');
  const unidades = await Promise.all([
    prisma.unidadeNegocio.create({
      data: {
        nome: 'Matriz São Paulo',
        codigo: 'SP001',
      },
    }),
    prisma.unidadeNegocio.create({
      data: {
        nome: 'Filial Rio de Janeiro',
        codigo: 'RJ001',
      },
    }),
  ]);

  // 3. Contratadas
  console.log('🏢 Creating contractors...');
  const contratadas = await Promise.all([
    prisma.contratada.create({
      data: {
        nome: 'Empresa Contratada Alpha LTDA',
        cnpj: '11222333000181',
      },
    }),
    prisma.contratada.create({
      data: {
        nome: 'Beta Serviços e Construções S.A.',
        cnpj: '44555666000122',
      },
    }),
    prisma.contratada.create({
      data: {
        nome: 'Gamma Engenharia e Consultoria',
        cnpj: '77888999000163',
      },
    }),
  ]);

  // 4. Almoxarifados (campo ativo removido, codigo removido)
  console.log('📦 Creating warehouses...');
  const almoxarifados = await Promise.all([
    prisma.almoxarifado.create({
      data: {
        nome: 'Almoxarifado Central SP',
        unidadeNegocioId: unidades[0].id,
        isPrincipal: true,
      },
    }),
    prisma.almoxarifado.create({
      data: {
        nome: 'Almoxarifado RJ',
        unidadeNegocioId: unidades[1].id,
        isPrincipal: false,
      },
    }),
  ]);

  // 5. Tipos de EPI (campos atualizados conforme documentação)
  console.log('🦺 Creating EPI types...');
  const tiposEpi = await Promise.all([
    prisma.tipoEPI.create({
      data: {
        nomeEquipamento: 'Capacete de Segurança',
        numeroCa: 'CA-12345',
        descricao: 'Capacete de segurança classe A',
        vidaUtilDias: 1800, // 60 meses * 30 dias
        status: 'ATIVO',
      },
    }),
    prisma.tipoEPI.create({
      data: {
        nomeEquipamento: 'Óculos de Proteção',
        numeroCa: 'CA-23456',
        descricao: 'Óculos de proteção contra impactos',
        vidaUtilDias: 720, // 24 meses * 30 dias
        status: 'ATIVO',
      },
    }),
    prisma.tipoEPI.create({
      data: {
        nomeEquipamento: 'Luva de Segurança',
        numeroCa: 'CA-34567',
        descricao: 'Luva de segurança em couro',
        vidaUtilDias: 360, // 12 meses * 30 dias
        status: 'ATIVO',
      },
    }),
  ]);

  // 6. Itens de Estoque
  console.log('📊 Creating initial stock...');
  const estoqueItens = [];
  
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

  // 7. Colaboradores
  console.log('👷 Creating employees...');
  const colaboradores = await Promise.all([
    // Colaboradores diretos (sem contratada)
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
    // Colaboradores de contratadas
    prisma.colaborador.create({
      data: {
        nome: 'Pedro Silva',
        cpf: '34567890123',
        matricula: 'ALPHA001',
        cargo: 'Técnico de Segurança',
        setor: 'Segurança do Trabalho',
        unidadeNegocioId: unidades[0].id,
        contratadaId: contratadas[0].id, // Empresa Alpha
        ativo: true,
      },
    }),
    prisma.colaborador.create({
      data: {
        nome: 'Maria Fernandes',
        cpf: '45678901234',
        matricula: 'BETA001',
        cargo: 'Operadora de Máquinas',
        setor: 'Produção',
        unidadeNegocioId: unidades[1].id,
        contratadaId: contratadas[1].id, // Beta Serviços
        ativo: true,
      },
    }),
    prisma.colaborador.create({
      data: {
        nome: 'João Santos',
        cpf: '56789012345',
        matricula: 'GAMMA001',
        cargo: 'Engenheiro de Campo',
        setor: 'Engenharia',
        unidadeNegocioId: unidades[1].id,
        contratadaId: contratadas[2].id, // Gamma Engenharia
        ativo: true,
      },
    }),
  ]);

  // 8. Fichas de EPI (estrutura conforme documentação - uma por colaborador)
  console.log('📋 Creating EPI cards...');
  const fichas = [];
  
  for (const colaborador of colaboradores) {
    const ficha = await prisma.fichaEPI.create({
      data: {
        colaboradorId: colaborador.id,
        status: 'ATIVA',
      },
    });
    fichas.push(ficha);
  }

  // 9. Configurações do Sistema (campo ativa removido)
  console.log('⚙️ Creating system configurations...');
  await Promise.all([
    prisma.configuracao.create({
      data: {
        chave: 'PERMITIR_ESTOQUE_NEGATIVO',
        valor: 'false',
        descricao: 'Permite que o estoque fique negativo',
      },
    }),
    prisma.configuracao.create({
      data: {
        chave: 'PERMITIR_AJUSTES_FORCADOS',
        valor: 'true',
        descricao: 'Permite ajustes diretos no inventário',
      },
    }),
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Created data summary:');
  console.log(`👤 Users: ${users.length}`);
  console.log(`🏢 Business Units: ${unidades.length}`);
  console.log(`🏛️  Contractors: ${contratadas.length}`);
  console.log(`📦 Warehouses: ${almoxarifados.length}`);
  console.log(`🦺 EPI Types: ${tiposEpi.length}`);
  console.log(`📊 Stock Items: ${estoqueItens.length}`);
  console.log(`👷 Employees: ${colaboradores.length}`);
  console.log(`📋 EPI Cards: ${fichas.length}`);
  console.log(`⚙️ System Configurations: 2`);
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