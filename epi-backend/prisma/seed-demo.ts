import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuração do seed
const CONFIG = {
  cleanDatabase: true, // Definir como false em produção se quiser preservar dados
  empresas: 20,
  colaboradoresPorEmpresa: 10,
  percentualSemFicha: 0.5, // 50% dos colaboradores sem ficha
  tiposEpi: 25,
  notasEntrada: 15,
  percentualEntregas: 0.3, // 30% dos colaboradores com fichas receberão entregas
  percentualDevolucoes: 0.2, // 20% das entregas terão devoluções
};

// Dados reais de contratadas brasileiras
const CONTRATADAS_REAIS = [
  { nome: 'Construtora Andrade Gutierrez S.A.', cnpj: '17262213000364' },
  { nome: 'Odebrecht Construções e Engenharia S.A.', cnpj: '15102288000182' },
  { nome: 'Camargo Corrêa Construções e Participações S.A.', cnpj: '61625493000123' },
  { nome: 'Queiroz Galvão Construções S.A.', cnpj: '33169817000176' },
  { nome: 'OAS Engenharia e Construções S.A.', cnpj: '05711171000130' },
  { nome: 'Engevix Engenharia S.A.', cnpj: '20611729000190' },
  { nome: 'Serveng Civilsan S.A.', cnpj: '44734671000109' },
  { nome: 'Construcap CCPS Engenharia e Comércio S.A.', cnpj: '47046992000156' },
  { nome: 'Mendes Júnior Trading e Engenharia S.A.', cnpj: '17184602000104' },
  { nome: 'Construtora Norberto Odebrecht S.A.', cnpj: '15102288000263' },
  { nome: 'Techint Engenharia e Construção S.A.', cnpj: '04669443000108' },
  { nome: 'Construtora Barbosa Mello S.A.', cnpj: '33134038000141' },
  { nome: 'Galvão Engenharia S.A.', cnpj: '44820719000157' },
  { nome: 'Construções e Comércio Camargo Corrêa S.A.', cnpj: '61625493000204' },
  { nome: 'Skanska Brasil S.A.', cnpj: '42278473000103' },
  { nome: 'Método Engenharia S.A.', cnpj: '77816766000145' },
  { nome: 'Construtora Triunfo S.A.', cnpj: '91143711000157' },
  { nome: 'Construtora Tenda S.A.', cnpj: '11284210000139' },
  { nome: 'Cyrela Brazil Realty S.A.', cnpj: '73178600000143' },
  { nome: 'MRV Engenharia e Participações S.A.', cnpj: '08343492000120' },
];

// Tipos de EPI mais comuns conforme CA do Ministério do Trabalho
const TIPOS_EPI_COMUNS = [
  { nome: 'Capacete de Segurança Classe A', ca: 'CA-31469', categoria: 'PROTECAO_CABECA' as const, vidaUtil: 1800 },
  { nome: 'Capacete de Segurança Classe B', ca: 'CA-35519', categoria: 'PROTECAO_CABECA' as const, vidaUtil: 1800 },
  { nome: 'Óculos de Proteção Ampla Visão', ca: 'CA-25716', categoria: 'PROTECAO_OLHOS_ROSTO' as const, vidaUtil: 720 },
  { nome: 'Óculos de Proteção Contra Impactos', ca: 'CA-15700', categoria: 'PROTECAO_OLHOS_ROSTO' as const, vidaUtil: 540 },
  { nome: 'Protetor Facial de Acrílico', ca: 'CA-19775', categoria: 'PROTECAO_OLHOS_ROSTO' as const, vidaUtil: 720 },
  { nome: 'Protetor Auditivo de Inserção', ca: 'CA-5674', categoria: 'PROTECAO_OUVIDOS' as const, vidaUtil: 240 },
  { nome: 'Protetor Auditivo Tipo Concha', ca: 'CA-12506', categoria: 'PROTECAO_OUVIDOS' as const, vidaUtil: 1080 },
  { nome: 'Luva de Raspa de Couro', ca: 'CA-29219', categoria: 'PROTECAO_MAOS_BRACCOS' as const, vidaUtil: 180 },
  { nome: 'Luva de Vaqueta', ca: 'CA-15799', categoria: 'PROTECAO_MAOS_BRACCOS' as const, vidaUtil: 180 },
  { nome: 'Luva de Malha de Aço', ca: 'CA-26918', categoria: 'PROTECAO_MAOS_BRACCOS' as const, vidaUtil: 720 },
  { nome: 'Luva de Látex Natural', ca: 'CA-11288', categoria: 'PROTECAO_MAOS_BRACCOS' as const, vidaUtil: 90 },
  { nome: 'Luva de Borracha Nitrílica', ca: 'CA-28414', categoria: 'PROTECAO_MAOS_BRACCOS' as const, vidaUtil: 180 },
  { nome: 'Botina de Segurança com Bico de Aço', ca: 'CA-28914', categoria: 'PROTECAO_PES' as const, vidaUtil: 720 },
  { nome: 'Sapato de Segurança', ca: 'CA-37501', categoria: 'PROTECAO_PES' as const, vidaUtil: 720 },
  { nome: 'Bota de Borracha', ca: 'CA-39186', categoria: 'PROTECAO_PES' as const, vidaUtil: 540 },
  { nome: 'Máscara Respiratória PFF2', ca: 'CA-38437', categoria: 'PROTECAO_RESPIRATORIA' as const, vidaUtil: 30 },
  { nome: 'Máscara Respiratória PFF1', ca: 'CA-26351', categoria: 'PROTECAO_RESPIRATORIA' as const, vidaUtil: 30 },
  { nome: 'Respirador Semifacial', ca: 'CA-5756', categoria: 'PROTECAO_RESPIRATORIA' as const, vidaUtil: 1080 },
  { nome: 'Cinto de Segurança Tipo Paraquedista', ca: 'CA-35147', categoria: 'PROTECAO_CLIMATICA' as const, vidaUtil: 1800 },
  { nome: 'Trava-Quedas', ca: 'CA-31467', categoria: 'PROTECAO_CLIMATICA' as const, vidaUtil: 1800 },
  { nome: 'Avental de Raspa de Couro', ca: 'CA-32890', categoria: 'PROTECAO_CLIMATICA' as const, vidaUtil: 360 },
  { nome: 'Manga de Raspa de Couro', ca: 'CA-29891', categoria: 'PROTECAO_CLIMATICA' as const, vidaUtil: 360 },
  { nome: 'Roupa de Aproximação ao Calor', ca: 'CA-34567', categoria: 'ROUPA_APROXIMACAO' as const, vidaUtil: 540 },
  { nome: 'Colete Refletivo', ca: 'CA-40567', categoria: 'PROTECAO_CLIMATICA' as const, vidaUtil: 720 },
  { nome: 'Uniforme de Segurança', ca: 'CA-41234', categoria: 'PROTECAO_CLIMATICA' as const, vidaUtil: 360 },
];

// Nomes brasileiros comuns para colaboradores
const NOMES_BRASILEIROS = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza',
  'Fernanda Lima', 'Roberto Alves', 'Juliana Rodrigues', 'Marcelo Ferreira', 'Camila Martins',
  'Daniel Pereira', 'Luciana Gomes', 'Rafael Carvalho', 'Patrícia Ribeiro', 'Guilherme Araújo',
  'Renata Barbosa', 'Thiago Nascimento', 'Mariana Cardoso', 'Bruno Reis', 'Cristina Almeida',
  'Eduardo Moura', 'Vanessa Campos', 'Gustavo Rocha', 'Priscila Dias', 'Leonardo Teixeira',
  'Adriana Nunes', 'Felipe Monteiro', 'Larissa Castro', 'Rodrigo Azevedo', 'Natália Melo',
  'André Correia', 'Tatiana Freitas', 'Vinicius Ramos', 'Bianca Cunha', 'Matheus Pinto',
  'Gabriela Mendes', 'Leandro Cavalcanti', 'Aline Moreira', 'Diego Batista', 'Bruna Farias',
  'Fábio Macedo', 'Sabrina Viana', 'Henrique Lopes', 'Mônica Silveira', 'Caio Andrade',
  'Jéssica Siqueira', 'Murilo Paiva', 'Carla Tavares', 'Renato Magalhães', 'Evelyn Duarte',
];

const CARGOS_SETORES = [
  { cargo: 'Operador de Produção', setor: 'Produção' },
  { cargo: 'Soldador', setor: 'Produção' },
  { cargo: 'Mecânico Industrial', setor: 'Manutenção' },
  { cargo: 'Técnico de Segurança', setor: 'Segurança do Trabalho' },
  { cargo: 'Supervisor de Produção', setor: 'Produção' },
  { cargo: 'Operador de Máquinas', setor: 'Produção' },
  { cargo: 'Eletricista Industrial', setor: 'Manutenção' },
  { cargo: 'Engenheiro de Campo', setor: 'Engenharia' },
  { cargo: 'Técnico de Manutenção', setor: 'Manutenção' },
  { cargo: 'Operador de Empilhadeira', setor: 'Logística' },
  { cargo: 'Inspetor de Qualidade', setor: 'Qualidade' },
  { cargo: 'Montador Industrial', setor: 'Produção' },
  { cargo: 'Pintor Industrial', setor: 'Produção' },
  { cargo: 'Auxiliar de Produção', setor: 'Produção' },
  { cargo: 'Coordenador de Obras', setor: 'Engenharia' },
];

// Função para gerar CPF válido
function gerarCPF(): string {
  const cpf = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  
  // Primeiro dígito verificador
  let soma = cpf.reduce((acc, digit, index) => acc + digit * (10 - index), 0);
  const digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  cpf.push(digito1);
  
  // Segundo dígito verificador
  soma = cpf.reduce((acc, digit, index) => acc + digit * (11 - index), 0);
  const digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  cpf.push(digito2);
  
  return cpf.join('');
}

// Função para gerar matrícula única
function gerarMatricula(index: number, empresaPrefix: string): string {
  return `${empresaPrefix}${String(index).padStart(4, '0')}`;
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

// Função para obter item aleatório de array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function limpezaSeletiva() {
  if (!CONFIG.cleanDatabase) {
    console.log('🔄 Limpeza do banco desabilitada. Mantendo dados existentes.');
    return;
  }

  console.log('🧹 Iniciando limpeza seletiva do banco...');

  // Limpar dados operacionais (preservar estrutura básica)
  await prisma.historicoFicha.deleteMany();
  await prisma.entregaItem.deleteMany();
  await prisma.entrega.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.notaMovimentacaoItem.deleteMany();
  await prisma.notaMovimentacao.deleteMany();
  await prisma.estoqueItem.deleteMany();
  await prisma.fichaEPI.deleteMany();
  await prisma.colaborador.deleteMany();
  await prisma.contratada.deleteMany();
  await prisma.tipoEPI.deleteMany();
  
  // Manter: usuários, unidades de negócio, almoxarifados, configurações
  console.log('✅ Limpeza seletiva concluída. Estrutura básica preservada.');
}

async function criarContratadas() {
  console.log('🏢 Criando contratadas...');
  
  const contratadas = [];
  const empresasSelecionadas = shuffleArray(CONTRATADAS_REAIS).slice(0, CONFIG.empresas);
  
  for (const empresa of empresasSelecionadas) {
    const contratada = await prisma.contratada.create({
      data: {
        nome: empresa.nome,
        cnpj: empresa.cnpj,
      },
    });
    contratadas.push(contratada);
  }
  
  console.log(`✅ ${contratadas.length} contratadas criadas.`);
  return contratadas;
}

async function criarColaboradores(contratadas: any[], unidadeNegocio: any) {
  console.log('👷 Criando colaboradores...');
  
  const colaboradores = [];
  let nomeIndex = 0;
  
  for (const contratada of contratadas) {
    const prefix = contratada.nome.split(' ')[0].substring(0, 3).toUpperCase();
    
    for (let i = 0; i < CONFIG.colaboradoresPorEmpresa; i++) {
      const nome = NOMES_BRASILEIROS[nomeIndex % NOMES_BRASILEIROS.length];
      const cargoSetor = randomItem(CARGOS_SETORES);
      
      const colaborador = await prisma.colaborador.create({
        data: {
          nome: nome,
          cpf: gerarCPF(),
          matricula: gerarMatricula(i + 1, prefix),
          cargo: cargoSetor.cargo,
          setor: cargoSetor.setor,
          unidadeNegocioId: unidadeNegocio.id,
          contratadaId: contratada.id,
          ativo: true,
        },
      });
      
      colaboradores.push(colaborador);
      nomeIndex++;
    }
  }
  
  console.log(`✅ ${colaboradores.length} colaboradores criados.`);
  return colaboradores;
}

async function criarTiposEPI() {
  console.log('🦺 Criando tipos de EPI...');
  
  const tiposEpi = [];
  const tiposSelecionados = shuffleArray(TIPOS_EPI_COMUNS).slice(0, CONFIG.tiposEpi);
  
  for (const tipo of tiposSelecionados) {
    const tipoEpi = await prisma.tipoEPI.create({
      data: {
        // ID será gerado automaticamente pelo middleware
        nomeEquipamento: tipo.nome,
        numeroCa: tipo.ca,
        categoria: tipo.categoria,
        descricao: `Equipamento de proteção individual - ${tipo.nome}`,
        vidaUtilDias: tipo.vidaUtil,
        status: 'ATIVO',
      },
    });
    tiposEpi.push(tipoEpi);
  }
  
  console.log(`✅ ${tiposEpi.length} tipos de EPI criados.`);
  return tiposEpi;
}

async function criarEstoqueInicial(almoxarifados: any[], tiposEpi: any[]) {
  console.log('📦 Criando estoque inicial...');
  
  const estoqueItens = [];
  
  // Criar itens de estoque para cada combinação almoxarifado x tipo EPI
  for (const almoxarifado of almoxarifados) {
    for (const tipoEpi of tiposEpi) {
      const quantidade = Math.floor(Math.random() * 200) + 100; // Entre 100 e 300 unidades
      
      const estoqueItem = await prisma.estoqueItem.create({
        data: {
          // ID será gerado automaticamente pelo middleware
          almoxarifadoId: almoxarifado.id,
          tipoEpiId: tipoEpi.id,
          quantidade: quantidade,
          custoUnitario: Math.floor(Math.random() * 10000) + 1000, // Entre R$ 10,00 e R$ 110,00
          status: 'DISPONIVEL',
        },
      });
      
      estoqueItens.push(estoqueItem);
    }
  }
  
  console.log(`✅ ${estoqueItens.length} itens de estoque criados.`);
  return estoqueItens;
}

async function criarNotasMovimentacao(almoxarifados: any[], usuarios: any[], estoqueItens: any[]) {
  console.log('📝 Criando notas de movimentação...');
  
  const notas = [];
  
  for (let i = 0; i < CONFIG.notasEntrada; i++) {
    const almoxarifado = randomItem(almoxarifados);
    const responsavel = randomItem(usuarios);
    const dataDocumento = new Date();
    dataDocumento.setDate(dataDocumento.getDate() - Math.floor(Math.random() * 30)); // Últimos 30 dias
    
    const nota = await prisma.notaMovimentacao.create({
      data: {
        almoxarifadoId: almoxarifado.id,
        responsavelId: responsavel.id,
        tipoNota: 'ENTRADA',
        status: 'CONCLUIDA',
        numeroDocumento: `NF-${String(i + 1).padStart(6, '0')}`,
        dataDocumento: dataDocumento,
        observacoes: `Nota de entrada de EPIs - Lote ${i + 1}`,
      },
    });
    
    // Adicionar itens à nota (3-7 tipos diferentes)
    const numeroItens = Math.floor(Math.random() * 5) + 3;
    const tiposEscolhidos = shuffleArray(estoqueItens.filter(item => item.almoxarifadoId === almoxarifado.id))
      .slice(0, numeroItens);
    
    for (const estoqueItem of tiposEscolhidos) {
      const quantidade = Math.floor(Math.random() * 50) + 10; // Entre 10 e 60 unidades
      
      await prisma.notaMovimentacaoItem.create({
        data: {
          notaMovimentacaoId: nota.id,
          estoqueItemId: estoqueItem.id,
          tipoEpiId: estoqueItem.tipoEpiId,
          quantidade: quantidade,
          custoUnitario: estoqueItem.custoUnitario,
        },
      });
      
      // Criar movimentação de estoque
      await prisma.movimentacaoEstoque.create({
        data: {
          estoqueItemId: estoqueItem.id,
          responsavelId: responsavel.id,
          tipoMovimentacao: 'ENTRADA_NOTA',
          quantidadeMovida: quantidade,
          notaMovimentacaoId: nota.id,
        },
      });
      
      // Atualizar quantidade no estoque
      await prisma.estoqueItem.update({
        where: { id: estoqueItem.id },
        data: {
          quantidade: {
            increment: quantidade,
          },
        },
      });
    }
    
    notas.push(nota);
  }
  
  console.log(`✅ ${notas.length} notas de movimentação criadas.`);
  return notas;
}

async function criarFichasEPI(colaboradores: any[]) {
  console.log('📋 Criando fichas de EPI...');
  
  const fichas = [];
  const colaboradoresComFicha = shuffleArray(colaboradores)
    .slice(0, Math.floor(colaboradores.length * (1 - CONFIG.percentualSemFicha)));
  
  for (const colaborador of colaboradoresComFicha) {
    const ficha = await prisma.fichaEPI.create({
      data: {
        colaboradorId: colaborador.id,
        status: 'ATIVA',
      },
    });
    fichas.push(ficha);
  }
  
  console.log(`✅ ${fichas.length} fichas de EPI criadas (${colaboradores.length - fichas.length} colaboradores sem ficha).`);
  return fichas;
}

async function criarEntregas(fichas: any[], almoxarifados: any[], usuarios: any[], estoqueItens: any[]) {
  console.log('📦 Criando entregas...');
  
  const entregas = [];
  const fichasComEntrega = shuffleArray(fichas)
    .slice(0, Math.floor(fichas.length * CONFIG.percentualEntregas));
  
  for (const ficha of fichasComEntrega) {
    const almoxarifado = randomItem(almoxarifados);
    const responsavel = randomItem(usuarios);
    const dataEntrega = new Date();
    dataEntrega.setDate(dataEntrega.getDate() - Math.floor(Math.random() * 60)); // Últimos 60 dias
    
    const entrega = await prisma.entrega.create({
      data: {
        // ID será gerado automaticamente pelo middleware
        fichaEpiId: ficha.id,
        almoxarifadoId: almoxarifado.id,
        responsavelId: responsavel.id,
        status: 'ASSINADA',
      },
    });
    
    // Adicionar itens à entrega (1-4 tipos diferentes)
    const numeroItens = Math.floor(Math.random() * 4) + 1;
    const itensDisponiveis = estoqueItens.filter(item => 
      item.almoxarifadoId === almoxarifado.id && item.quantidade > 0
    );
    const itensEscolhidos = shuffleArray(itensDisponiveis).slice(0, numeroItens);
    
    for (const estoqueItem of itensEscolhidos) {
      const quantidadeEntregue = Math.floor(Math.random() * 3) + 1; // Entre 1 e 3 unidades
      
      if (estoqueItem.quantidade >= quantidadeEntregue) {
        await prisma.entregaItem.create({
          data: {
            entregaId: entrega.id,
            estoqueItemOrigemId: estoqueItem.id,
            quantidadeEntregue: quantidadeEntregue,
            status: 'COM_COLABORADOR',
          },
        });
        
        // Criar movimentação de estoque (uma por unidade para rastreabilidade)
        for (let i = 0; i < quantidadeEntregue; i++) {
          await prisma.movimentacaoEstoque.create({
            data: {
              estoqueItemId: estoqueItem.id,
              responsavelId: responsavel.id,
              tipoMovimentacao: 'SAIDA_ENTREGA',
              quantidadeMovida: 1,
              entregaId: entrega.id,
            },
          });
        }
        
        // Atualizar quantidade no estoque
        await prisma.estoqueItem.update({
          where: { id: estoqueItem.id },
          data: {
            quantidade: {
              decrement: quantidadeEntregue,
            },
          },
        });
      }
    }
    
    entregas.push(entrega);
  }
  
  console.log(`✅ ${entregas.length} entregas criadas.`);
  return entregas;
}

async function criarDevolucoes(entregas: any[], usuarios: any[]) {
  console.log('🔄 Criando devoluções...');
  
  const devolucoes = [];
  const entregasComDevolucao = shuffleArray(entregas)
    .slice(0, Math.floor(entregas.length * CONFIG.percentualDevolucoes));
  
  for (const entrega of entregasComDevolucao) {
    const responsavel = randomItem(usuarios);
    const dataDevolucao = new Date();
    dataDevolucao.setDate(dataDevolucao.getDate() - Math.floor(Math.random() * 30)); // Últimos 30 dias
    
    // Buscar itens da entrega
    const itensEntrega = await prisma.entregaItem.findMany({
      where: { entregaId: entrega.id },
      include: { 
        estoqueItem: true,
      },
    });
    
    // Devolver alguns itens (30-70% dos itens)
    const percentualDevolucao = Math.random() * 0.4 + 0.3; // 30% a 70%
    const itensParaDevolucao = shuffleArray(itensEntrega)
      .slice(0, Math.ceil(itensEntrega.length * percentualDevolucao));
    
    for (const itemEntrega of itensParaDevolucao) {
      const quantidadeDevolucao = Math.floor(Math.random() * itemEntrega.quantidadeEntregue) + 1;
      
      // Criar movimentação de devolução (uma por unidade)
      for (let i = 0; i < quantidadeDevolucao; i++) {
        await prisma.movimentacaoEstoque.create({
          data: {
            estoqueItemId: itemEntrega.estoqueItemOrigemId,
            responsavelId: responsavel.id,
            tipoMovimentacao: 'ENTRADA_DEVOLUCAO',
            quantidadeMovida: 1,
            entregaId: entrega.id,
          },
        });
      }
      
      // Atualizar status do item para devolução em quarentena
      await prisma.entregaItem.update({
        where: { id: itemEntrega.id },
        data: { status: 'DEVOLVIDO' },
      });
      
      // Criar item de estoque em quarentena
      const itemExistente = await prisma.estoqueItem.findFirst({
        where: {
          almoxarifadoId: itemEntrega.estoqueItem.almoxarifadoId,
          tipoEpiId: itemEntrega.estoqueItem.tipoEpiId,
          status: 'QUARENTENA',
        },
      });
      
      if (itemExistente) {
        await prisma.estoqueItem.update({
          where: { id: itemExistente.id },
          data: {
            quantidade: {
              increment: quantidadeDevolucao,
            },
          },
        });
      } else {
        await prisma.estoqueItem.create({
          data: {
            almoxarifadoId: itemEntrega.estoqueItem.almoxarifadoId,
            tipoEpiId: itemEntrega.estoqueItem.tipoEpiId,
            quantidade: quantidadeDevolucao,
            custoUnitario: itemEntrega.estoqueItem.custoUnitario,
            status: 'QUARENTENA',
          },
        });
      }
    }
    
    devolucoes.push(entrega);
  }
  
  console.log(`✅ ${devolucoes.length} devoluções criadas.`);
  return devolucoes;
}

async function main() {
  console.log('🌱 Iniciando seed de demonstração robusto...');
  console.log(`📊 Configuração: ${CONFIG.empresas} empresas, ${CONFIG.colaboradoresPorEmpresa} colaboradores/empresa, ${CONFIG.tiposEpi} tipos de EPI`);
  
  try {
    // 1. Limpeza seletiva
    await limpezaSeletiva();
    
    // 2. Obter dados básicos existentes
    const usuarios = await prisma.usuario.findMany();
    const unidadeNegocio = await prisma.unidadeNegocio.findFirst();
    const almoxarifados = await prisma.almoxarifado.findMany();
    
    if (!unidadeNegocio || almoxarifados.length === 0) {
      throw new Error('Dados básicos não encontrados. Execute o seed básico primeiro.');
    }
    
    // 3. Criar dados de demonstração
    const contratadas = await criarContratadas();
    const colaboradores = await criarColaboradores(contratadas, unidadeNegocio);
    const tiposEpi = await criarTiposEPI();
    const estoqueItens = await criarEstoqueInicial(almoxarifados, tiposEpi);
    const notasMovimentacao = await criarNotasMovimentacao(almoxarifados, usuarios, estoqueItens);
    const fichas = await criarFichasEPI(colaboradores);
    const entregas = await criarEntregas(fichas, almoxarifados, usuarios, estoqueItens);
    const devolucoes = await criarDevolucoes(entregas, usuarios);
    
    console.log('\n🎉 Seed de demonstração concluído com sucesso!');
    console.log('\n📊 Resumo dos dados criados:');
    console.log(`🏢 Contratadas: ${contratadas.length}`);
    console.log(`👷 Colaboradores: ${colaboradores.length}`);
    console.log(`📋 Fichas de EPI: ${fichas.length} (${colaboradores.length - fichas.length} sem ficha)`);
    console.log(`🦺 Tipos de EPI: ${tiposEpi.length}`);
    console.log(`📦 Itens de estoque: ${estoqueItens.length}`);
    console.log(`📝 Notas de movimentação: ${notasMovimentacao.length}`);
    console.log(`📤 Entregas: ${entregas.length}`);
    console.log(`🔄 Devoluções: ${devolucoes.length}`);
    
    // Estatísticas adicionais
    const estoqueDisponivel = await prisma.estoqueItem.aggregate({
      where: { status: 'DISPONIVEL' },
      _sum: { quantidade: true },
    });
    
    const estoqueQuarentena = await prisma.estoqueItem.aggregate({
      where: { status: 'QUARENTENA' },
      _sum: { quantidade: true },
    });
    
    console.log(`\n📊 Estatísticas do estoque:`);
    console.log(`✅ Disponível: ${estoqueDisponivel._sum.quantidade || 0} unidades`);
    console.log(`🔒 Quarentena: ${estoqueQuarentena._sum.quantidade || 0} unidades`);
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });