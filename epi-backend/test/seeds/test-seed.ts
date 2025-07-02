
import { PrismaService } from '@infrastructure/database/prisma.service';

// Função principal de seed que é exportada
export async function seedTestData(prisma: PrismaService): Promise<void> {
  console.log('🌱 Iniciando seed de dados para testes...');

  // 1. Limpar dados existentes (se houver)
  await cleanExistingData(prisma);

  // 2. Criar configurações do sistema
  await createConfigurations(prisma);

  // 3. Criar usuários
  const usuarios = await createUsers(prisma);

  // 4. Criar unidades de negócio e almoxarifados
  const { unidades, almoxarifados } = await createUnitsAndWarehouses(prisma);

  // 5. Criar tipos de EPI
  const tiposEpi = await createEpiTypes(prisma);

  // 6. Criar estoque inicial
  await createInitialStock(prisma, almoxarifados, tiposEpi);

  // 7. Criar colaboradores
  const colaboradores = await createEmployees(prisma, unidades);

  // 8. Criar fichas de EPI
  const fichas = await createEpiForms(prisma, colaboradores, tiposEpi, almoxarifados);

  // 9. Criar algumas entregas e movimentações para testes
  await createSampleDeliveries(prisma, usuarios[0], fichas, almoxarifados, tiposEpi);

  console.log('✅ Seed de dados de teste concluído');
}

async function cleanExistingData(prisma: PrismaService): Promise<void> {
  // Limpar em ordem inversa das dependências
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.entregaItem.deleteMany();
  await prisma.entrega.deleteMany();
  await prisma.fichaEPI.deleteMany();
  await prisma.estoqueItem.deleteMany();
  await prisma.notaMovimentacaoItem.deleteMany();
  await prisma.notaMovimentacao.deleteMany();
  await prisma.tipoEPI.deleteMany();
  await prisma.colaborador.deleteMany();
  await prisma.almoxarifado.deleteMany();
  await prisma.unidadeNegocio.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.configuracao.deleteMany();
}

async function createConfigurations(prisma: PrismaService): Promise<void> {
  await prisma.configuracao.createMany({
    data: [
      {
        chave: 'PERMITIR_ESTOQUE_NEGATIVO',
        valor: 'false',
        descricao: 'Permite que o saldo de estoque fique negativo',
      },
      {
        chave: 'PERMITIR_AJUSTES_FORCADOS',
        valor: 'true',
        descricao: 'Permite ajustes diretos de inventário',
      },
    ],
  });
}

async function createUsers(prisma: PrismaService): Promise<any[]> {
  const usuarios = [];
  
  usuarios.push(await prisma.usuario.create({
    data: {
      nome: 'Admin Teste',
      email: 'admin@test.com',
    },
  }));

  usuarios.push(await prisma.usuario.create({
    data: {
      nome: 'Operador Teste',
      email: 'operador@test.com',
    },
  }));

  usuarios.push(await prisma.usuario.create({
    data: {
      nome: 'Supervisor Teste',
      email: 'supervisor@test.com',
    },
  }));

  return usuarios;
}

async function createUnitsAndWarehouses(prisma: PrismaService): Promise<{ unidades: any[], almoxarifados: any[] }> {
  const unidades = [];
  const almoxarifados = [];

  // Unidade Principal
  const unidadePrincipal = await prisma.unidadeNegocio.create({
    data: {
      nome: 'Unidade Central Teste',
      codigo: 'CENTRAL',
    },
  });
  unidades.push(unidadePrincipal);

  // Unidade Secundária
  const unidadeSecundaria = await prisma.unidadeNegocio.create({
    data: {
      nome: 'Unidade Filial Teste',
      codigo: 'FILIAL',
    },
  });
  unidades.push(unidadeSecundaria);

  // Almoxarifados
  const almoxPrincipal = await prisma.almoxarifado.create({
    data: {
      nome: 'Almoxarifado Central',
      unidadeNegocioId: unidadePrincipal.id,
      isPrincipal: true,
    },
  });
  almoxarifados.push(almoxPrincipal);

  const almoxSecundario = await prisma.almoxarifado.create({
    data: {
      nome: 'Almoxarifado Filial',
      unidadeNegocioId: unidadeSecundaria.id,
      isPrincipal: false,
    },
  });
  almoxarifados.push(almoxSecundario);

  return { unidades, almoxarifados };
}

async function createEpiTypes(prisma: PrismaService): Promise<any[]> {
  const tiposEpi = [];

  // Capacete
  tiposEpi.push(await prisma.tipoEPI.create({
    data: {
      nomeEquipamento: 'Capacete de Segurança',
      numeroCa: 'CA-12345',
      descricao: 'Capacete de segurança classe A',
      vidaUtilDias: 360, // 12 meses * 30 dias
      status: 'ATIVO',
    },
  }));

  // Luva
  tiposEpi.push(await prisma.tipoEPI.create({
    data: {
      nomeEquipamento: 'Luva de Proteção',
      numeroCa: 'CA-67890',
      descricao: 'Luva de proteção em couro',
      vidaUtilDias: 180, // 6 meses * 30 dias
      status: 'ATIVO',
    },
  }));

  // Óculos
  tiposEpi.push(await prisma.tipoEPI.create({
    data: {
      nomeEquipamento: 'Óculos de Proteção',
      numeroCa: 'CA-11111',
      descricao: 'Óculos de proteção antiembaçante',
      vidaUtilDias: 270, // 9 meses * 30 dias
      status: 'ATIVO',
    },
  }));

  // Bota
  tiposEpi.push(await prisma.tipoEPI.create({
    data: {
      nomeEquipamento: 'Bota de Segurança',
      numeroCa: 'CA-22222',
      descricao: 'Bota de segurança com biqueira de aço',
      vidaUtilDias: 540, // 18 meses * 30 dias
      status: 'ATIVO',
    },
  }));

  // EPI para testes variados
  tiposEpi.push(await prisma.tipoEPI.create({
    data: {
      nomeEquipamento: 'EPI Teste Variado',
      numeroCa: 'CA-33333',
      descricao: 'EPI para testes diversos',
      vidaUtilDias: 90, // 3 meses * 30 dias
      status: 'DESCONTINUADO',
    },
  }));

  return tiposEpi;
}

async function createInitialStock(
  prisma: PrismaService,
  almoxarifados: any[],
  tiposEpi: any[]
): Promise<void> {
  const estoquesData = [];

  // Estoque no almoxarifado principal
  for (const tipo of tiposEpi.slice(0, 4)) { // Não incluir o descontinuado
    estoquesData.push({
      almoxarifadoId: almoxarifados[0].id,
      tipoEpiId: tipo.id,
      quantidade: Math.floor(Math.random() * 100) + 50, // 50-149 unidades
      status: 'DISPONIVEL' as const,
    });

    // Alguns itens em inspeção
    if (Math.random() > 0.7) {
      estoquesData.push({
        almoxarifadoId: almoxarifados[0].id,
        tipoEpiId: tipo.id,
        quantidade: Math.floor(Math.random() * 10) + 1, // 1-10 unidades
        status: 'AGUARDANDO_INSPECAO' as const,
      });
    }
  }

  // Estoque menor no almoxarifado secundário
  for (const tipo of tiposEpi.slice(0, 3)) {
    estoquesData.push({
      almoxarifadoId: almoxarifados[1].id,
      tipoEpiId: tipo.id,
      quantidade: Math.floor(Math.random() * 30) + 10, // 10-39 unidades
      status: 'DISPONIVEL' as const,
    });
  }

  await prisma.estoqueItem.createMany({
    data: estoquesData,
  });
}

async function createEmployees(prisma: PrismaService, unidades: any[]): Promise<any[]> {
  const colaboradores = [];
  
  // Obter a unidade principal para associar aos colaboradores
  const unidadePrincipal = unidades[0]; // Usando a primeira unidade como principal

  const funcionarios = [
    { nome: 'João Silva Santos', cpf: '11111111111', matricula: 'MAT001', cargo: 'Operador', setor: 'Produção' },
    { nome: 'Maria Oliveira Costa', cpf: '22222222222', matricula: 'MAT002', cargo: 'Técnica', setor: 'Manutenção' },
    { nome: 'Pedro Santos Silva', cpf: '33333333333', matricula: 'MAT003', cargo: 'Supervisor', setor: 'Produção' },
    { nome: 'Ana Paula Ferreira', cpf: '44444444444', matricula: 'MAT004', cargo: 'Analista', setor: 'Qualidade' },
    { nome: 'Carlos Eduardo Lima', cpf: '55555555555', matricula: 'MAT005', cargo: 'Soldador', setor: 'Produção' },
    { nome: 'Fernanda Silva Lima', cpf: '66666666666', matricula: 'MAT006', cargo: 'Operadora', setor: 'Embalagem' },
    { nome: 'Roberto Alves Mendes', cpf: '77777777777', matricula: 'MAT007', cargo: 'Coordenador', setor: 'Logística' },
    { nome: 'Lucia Santos Costa', cpf: '88888888888', matricula: 'MAT008', cargo: 'Auxiliar', setor: 'Limpeza' },
    { nome: 'Gabriel Costa Ferreira', cpf: '99999999999', matricula: 'MAT009', cargo: 'Técnico', setor: 'Elétrica' },
    { nome: 'Patricia Lima Oliveira', cpf: '10101010101', matricula: 'MAT010', cargo: 'Operadora', setor: 'Produção' },
    { nome: 'Rafael Mendes Silva', cpf: '12121212121', matricula: 'MAT011', cargo: 'Inspetor', setor: 'Qualidade' },
    { nome: 'Claudia Ferreira Santos', cpf: '13131313131', matricula: 'MAT012', cargo: 'Assistente', setor: 'Administrativo' },
  ];

  for (const funcionario of funcionarios) {
    colaboradores.push(await prisma.colaborador.create({
      data: {
        nome: funcionario.nome,
        cpf: funcionario.cpf,
        matricula: funcionario.matricula,
        cargo: funcionario.cargo,
        setor: funcionario.setor,
        unidadeNegocioId: unidadePrincipal.id,
      },
    }));
  }

  return colaboradores;
}

async function createEpiForms(
  prisma: PrismaService,
  colaboradores: any[],
  tiposEpi: any[],
  almoxarifados: any[]
): Promise<any[]> {
  const fichas = [];

  // Criar uma ficha por colaborador (conforme documentação)
  for (let i = 0; i < colaboradores.length; i++) {
    const colaborador = colaboradores[i];
    
    // Uma ficha por colaborador
    fichas.push(await prisma.fichaEPI.create({
      data: {
        colaboradorId: colaborador.id,
        status: 'ATIVA',
      },
    }));
  }

  return fichas;
}

async function createSampleDeliveries(
  prisma: PrismaService,
  usuario: any,
  fichas: any[],
  almoxarifados: any[],
  tiposEpi: any[]
): Promise<void> {
  // Criar algumas entregas para demonstração
  const numEntregas = Math.min(3, fichas.length);
  
  for (let i = 0; i < numEntregas; i++) {
    const ficha = fichas[i];
    const almoxarifado = almoxarifados[i % almoxarifados.length];
    const tipoEpi = tiposEpi.find(t => t.status === 'ATIVO');
    
    if (!tipoEpi) continue;

    // Buscar estoque disponível
    const estoque = await prisma.estoqueItem.findFirst({
      where: {
        almoxarifadoId: almoxarifado.id,
        tipoEpiId: tipoEpi.id,
        status: 'DISPONIVEL',
        quantidade: { gt: 0 },
      },
    });

    if (!estoque) continue;

    // Criar entrega
    const dataEntrega = new Date();
    dataEntrega.setDate(dataEntrega.getDate() - Math.floor(Math.random() * 30)); // Últimos 30 dias

    const entrega = await prisma.entrega.create({
      data: {
        fichaEpiId: ficha.id,
        almoxarifadoId: almoxarifado.id,
        responsavelId: usuario.id,
        dataEntrega: dataEntrega,
        status: 'PENDENTE_ASSINATURA',
      },
    });

    // Criar itens da entrega (1-2 unidades)
    const quantidadeEntregue = Math.floor(Math.random() * 2) + 1;
    
    for (let j = 0; j < quantidadeEntregue; j++) {
      const dataDevolucao = new Date(dataEntrega);
      const diasVida = tipoEpi?.vidaUtilDias || 180;
      dataDevolucao.setDate(dataDevolucao.getDate() + diasVida);

      await prisma.entregaItem.create({
        data: {
          entregaId: entrega.id,
          estoqueItemOrigemId: estoque.id, // Rastreabilidade: de onde a unidade saiu
          quantidadeEntregue: 1,
          dataLimiteDevolucao: dataDevolucao, // Data limite para devolução baseada no tipo EPI
          status: 'COM_COLABORADOR',
        },
      });
    }

    // Criar movimentação de saída (conforme novo schema)
    await prisma.movimentacaoEstoque.create({
      data: {
        estoqueItemId: estoque.id,
        responsavelId: usuario.id,
        tipoMovimentacao: 'SAIDA_ENTREGA',
        quantidadeMovida: quantidadeEntregue,
        entregaId: entrega.id,
      },
    });

    // Atualizar saldo do estoque
    await prisma.estoqueItem.update({
      where: { id: estoque.id },
      data: {
        quantidade: {
          decrement: quantidadeEntregue,
        },
      },
    });
  }
}

// Executar seed se for chamado diretamente
if (require.main === module) {
  const mockConfigService = {
    get: (key: string) => {
      const config = {
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public",
        NODE_ENV: 'test',
      };
      return config[key] || process.env[key];
    },
  };

  const prisma = new PrismaService(mockConfigService as any);
  
  seedTestData(prisma)
    .then(() => {
      console.log('✅ Seed executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar seed:', error);
      process.exit(1);
    });
}