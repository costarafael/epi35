import { PrismaClient } from '@prisma/client';
import { applyCustomIdMiddleware } from '../src/infrastructure/database/prisma-id-middleware';

const prisma = new PrismaClient();

// Aplicar middleware para geração de IDs customizados
applyCustomIdMiddleware(prisma);

// Dados reais de contratadas brasileiras com CNPJs válidos
const CONTRATADAS_REAIS = [
  { nome: 'Construtora Andrade Gutierrez S.A.', cnpj: '39758577000100' },
  { nome: 'Odebrecht Construções e Engenharia S.A.', cnpj: '15388679000105' },
  { nome: 'Camargo Corrêa Construções e Participações S.A.', cnpj: '48919621000108' },
  { nome: 'Queiroz Galvão Construções S.A.', cnpj: '65658550000148' },
  { nome: 'OAS Engenharia e Construções S.A.', cnpj: '69213951000145' },
  { nome: 'Engevix Engenharia S.A.', cnpj: '08696359000157' },
  { nome: 'Serveng Civilsan S.A.', cnpj: '09206939000181' },
  { nome: 'Construcap CCPS Engenharia e Comércio S.A.', cnpj: '13539270000117' },
  { nome: 'Mendes Júnior Trading e Engenharia S.A.', cnpj: '72106826000140' },
  { nome: 'Construtora Norberto Odebrecht S.A.', cnpj: '07412299000130' },
  { nome: 'Techint Engenharia e Construção S.A.', cnpj: '94542632000120' },
  { nome: 'Construtora Barbosa Mello S.A.', cnpj: '72496007000157' },
  { nome: 'Galvão Engenharia S.A.', cnpj: '71224012000148' },
  { nome: 'Construções e Comércio Camargo Corrêa S.A.', cnpj: '88353437000150' },
  { nome: 'Skanska Brasil S.A.', cnpj: '64126211000158' },
  { nome: 'Método Engenharia S.A.', cnpj: '75014583000109' },
  { nome: 'Construtora Triunfo S.A.', cnpj: '97417482000111' },
  { nome: 'Construtora Tenda S.A.', cnpj: '23656472000100' },
  { nome: 'Cyrela Brazil Realty S.A.', cnpj: '69839775000151' },
  { nome: 'MRV Engenharia e Participações S.A.', cnpj: '41090639000192' },
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

// Lista de CPFs válidos pré-gerados
const CPFS_VALIDOS = [
  '98721761248', '51333961391', '93900403023', '31348877464', '45141010104', '90814225888', '08873513603', '26141488900', '12253003557', '89642070332',
  '49501404935', '28012487543', '81415282463', '24448526992', '48204140380', '62923277872', '59190296257', '61476431850', '10071115269', '17860076810',
  '67652469597', '13047683689', '01198561823', '23260825916', '45463617007', '69565606318', '27194322374', '80480948518', '71233996339', '68598507016',
  '29639616699', '17380266209', '67384275490', '18340631918', '89798533437', '21848022042', '05507115621', '68936922777', '40467636125', '67459087270',
  '86464688448', '77634295930', '24529969045', '79313900165', '98535242953', '18696476450', '73932073703', '81432310542', '87440143760', '56691720865',
  '54319509676', '94636878825', '13671857269', '26792795224', '56527031726', '48768917880', '32585547302', '12162179121', '54475103096', '13954690241',
  '90742735729', '74535484627', '32874090182', '43412113409', '81801642419', '45536611950', '23643856369', '43508783006', '18365001144', '03443201628',
  '86956619890', '48819911914', '62945492725', '23800003287', '46737621260', '84380031845', '11428612521', '44298728803', '71564340040', '07189741402',
  '12005576549', '49026663404', '76845964629', '44591164993', '84597868380', '90142746371', '51024725855', '86336174719', '95394520666', '14283272159',
  '30377373796', '07831998489', '18062174492', '24682590332', '89394354352', '65341689364', '08680092452', '36664535700', '48122122949', '81812275145',
  '50162434502', '04205081715', '33254557352', '18613473830', '53437374630', '01165730073', '68098534308', '49266136891', '98275969506', '09498350647',
  '50154413712', '79215641513', '42654488284', '75320023146', '95684436498', '72024468209', '31338762010', '44338119802', '57926011789', '62675327204',
  '94599436160', '86080182920', '40911386165', '38214752779', '97996788979', '57203223299', '77428746876', '96343604324', '01814668721', '39199093219',
  '50894778331', '42999071833', '35236343003', '58252294855', '03117774904', '51903480752', '41238655181', '46406659465', '17225532430', '71921209607',
  '06681900860', '06886321307', '27320323010', '94004904960', '85396412089', '53123513424', '86661838531', '90151580022', '16290175661', '87806034161',
  '10044457090', '08691368950', '31393555721', '36573688171', '23830964900', '35174152358', '54539055062', '11353710327', '34727913305', '46088027550',
  '79584689037', '87610902802', '63461233781', '64632245372', '52862905313', '36111087584', '83489646819', '28676541221', '32345933615', '65984614642',
  '68480935308', '91170027881', '29477208493', '51496605829', '64371373712', '85933164925', '61464044970', '37254399319', '38222216783', '69278700754',
  '34300957002', '11208792059', '74402297206', '82629127052', '33997426813', '34945399603', '07022065632', '03256057772', '87027752042', '31024210596',
  '53771440238', '17949338598', '39209888251', '28942084052', '19607423704', '50793027632', '10809742373', '42057321550', '92465828886', '37014074954',
  '06222664466', '05071083531', '57256758154', '01637409419', '37306048643', '90780783328', '97752805599', '90624522130', '52114119602', '68482296957',
];

// Configuração do seed base
const CONFIG = {
  cleanDatabase: true,
  empresas: 20,
  colaboradoresPorEmpresa: 10,
  percentualSemFicha: 0.5, // 50% dos colaboradores sem ficha
  tiposEpi: 25,
};

// Função para obter CPF válido da lista
function obterCPFValido(index: number): string {
  return CPFS_VALIDOS[index % CPFS_VALIDOS.length];
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

async function limpezaCompleta() {
  if (!CONFIG.cleanDatabase) {
    console.log('🔄 Limpeza do banco desabilitada. Mantendo dados existentes.');
    return;
  }

  console.log('🧹 Iniciando limpeza ABSOLUTA do banco (resolve inconsistências)...');

  // ⚠️ LIMPEZA TOTAL: Remove TODOS os dados para garantir consistência 100%
  // Esta limpeza resolve as inconsistências reportadas (11 críticas)
  
  // Limpar TODOS os dados operacionais e estruturais
  await prisma.historicoFicha.deleteMany();
  console.log('  ✅ Históricos removidos');
  
  await prisma.entregaItem.deleteMany();
  await prisma.entrega.deleteMany();
  console.log('  ✅ Entregas removidas');
  
  await prisma.movimentacaoEstoque.deleteMany();
  console.log('  ✅ Movimentações removidas');
  
  await prisma.notaMovimentacaoItem.deleteMany();
  await prisma.notaMovimentacao.deleteMany();
  console.log('  ✅ Notas de movimentação removidas');
  
  // 🔥 CRÍTICO: Remove todos os itens de estoque (resolve inconsistências)
  await prisma.estoqueItem.deleteMany();
  console.log('  ✅ TODOS os itens de estoque removidos (inconsistências eliminadas)');
  
  await prisma.fichaEPI.deleteMany();
  await prisma.colaborador.deleteMany();
  await prisma.contratada.deleteMany();
  console.log('  ✅ Fichas, colaboradores e contratadas removidas');
  
  await prisma.tipoEPI.deleteMany();
  console.log('  ✅ Tipos de EPI removidos');
  
  // Remove também usuários, almoxarifados e unidades para recomeçar do zero
  await prisma.usuario.deleteMany();
  await prisma.almoxarifado.deleteMany();
  await prisma.unidadeNegocio.deleteMany();
  console.log('  ✅ Infraestrutura removida');
  
  console.log('✅ Limpeza ABSOLUTA concluída - Database zerado, inconsistências eliminadas.');
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
  let cpfIndex = 0;
  
  for (const contratada of contratadas) {
    const prefix = contratada.nome.split(' ')[0].substring(0, 3).toUpperCase();
    
    for (let i = 0; i < CONFIG.colaboradoresPorEmpresa; i++) {
      const nome = NOMES_BRASILEIROS[nomeIndex % NOMES_BRASILEIROS.length];
      const cargoSetor = randomItem(CARGOS_SETORES);
      
      const colaborador = await prisma.colaborador.create({
        data: {
          nome: nome,
          cpf: obterCPFValido(cpfIndex),
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
      cpfIndex++;
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
        id: '', // Placeholder que será substituído pelo middleware
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

async function criarFichasVazias(colaboradores: any[]) {
  console.log('📋 Criando fichas de EPI vazias...');
  
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

async function main() {
  console.log('🌱 Iniciando seed base (dados estruturais)...');
  console.log(`📊 Configuração: ${CONFIG.empresas} empresas, ${CONFIG.colaboradoresPorEmpresa} colaboradores/empresa, ${CONFIG.tiposEpi} tipos de EPI`);
  
  try {
    // 1. Limpeza completa (se habilitado)
    await limpezaCompleta();
    
    // 2. Criar/validar dados básicos (infraestrutura)
    let usuarios = await prisma.usuario.findMany();
    let unidadeNegocio = await prisma.unidadeNegocio.findFirst();
    let almoxarifados = await prisma.almoxarifado.findMany();
    
    // Se não existir infraestrutura básica, criar
    if (!unidadeNegocio || almoxarifados.length === 0 || usuarios.length === 0) {
      console.log('🏗️ Criando infraestrutura básica...');
      
      // Criar usuários do sistema
      if (usuarios.length === 0) {
        await prisma.usuario.createMany({
          data: [
            {
              id: 'USR001',
              nome: 'Administrador Sistema',
              email: 'admin@epi.local',
            },
            {
              id: 'USR002',
              nome: 'Operador Almoxarifado',
              email: 'operador@epi.local',
            },
            {
              id: 'USR003',
              nome: 'Supervisor',
              email: 'supervisor@epi.local',
            },
          ],
        });
        console.log('  ✅ Usuários do sistema criados');
      }
      
      // Criar unidade de negócio
      if (!unidadeNegocio) {
        unidadeNegocio = await prisma.unidadeNegocio.create({
          data: {
            id: 'UNI001',
            nome: 'Unidade Central',
            codigo: 'CENTRAL',
          },
        });
        console.log('  ✅ Unidade de negócio criada');
      }
      
      // Criar almoxarifados
      if (almoxarifados.length === 0) {
        await prisma.almoxarifado.createMany({
          data: [
            {
              id: 'ALM001',
              nome: 'Almoxarifado Central',
              unidadeNegocioId: unidadeNegocio.id,
              isPrincipal: true,
            },
            {
              id: 'ALM002',
              nome: 'Almoxarifado Norte',
              unidadeNegocioId: unidadeNegocio.id,
              isPrincipal: false,
            },
          ],
        });
        almoxarifados = await prisma.almoxarifado.findMany();
        console.log('  ✅ Almoxarifados criados');
      }
    }
    
    // 3. Criar dados estruturais (sem movimentações)
    const contratadas = await criarContratadas();
    const colaboradores = await criarColaboradores(contratadas, unidadeNegocio);
    const tiposEpi = await criarTiposEPI();
    const fichas = await criarFichasVazias(colaboradores);
    
    console.log('\n🎉 Seed base concluído com sucesso!');
    console.log('\n📊 Resumo dos dados estruturais criados:');
    console.log(`🏢 Contratadas: ${contratadas.length}`);
    console.log(`👷 Colaboradores: ${colaboradores.length}`);
    console.log(`📋 Fichas de EPI (vazias): ${fichas.length} (${colaboradores.length - fichas.length} sem ficha)`);
    console.log(`🦺 Tipos de EPI: ${tiposEpi.length}`);
    console.log(`📦 Itens de estoque: 0 (serão criados via movimentações)`);
    console.log(`📝 Notas de movimentação: 0 (serão criadas via use cases)`);
    console.log(`📤 Entregas: 0 (serão criadas via use cases)`);
    console.log(`🔄 Devoluções: 0 (serão criadas via use cases)`);
    
    console.log('\n🚀 Próximo passo: Execute npm run seed:movimentacoes para criar movimentações realistas via backend.');
    
  } catch (error) {
    console.error('❌ Erro durante o seed base:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed base falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });