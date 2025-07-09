// Script para gerar CNPJs e CPFs válidos únicos
// Baseado no algoritmo oficial brasileiro

/**
 * Gera dígito verificador usando módulo 11
 * @param {string} numeros - String com os números para calcular DV
 * @param {number[]} pesos - Array com os pesos para cada posição
 * @returns {number} - Dígito verificador (0-9)
 */
function calcularDV(numeros, pesos) {
  let soma = 0;
  for (let i = 0; i < numeros.length; i++) {
    soma += parseInt(numeros[i]) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Gera um CPF válido
 * @returns {string} - CPF no formato 12345678901
 */
function gerarCPF() {
  // Gera os 9 primeiros dígitos aleatórios
  let cpf = '';
  for (let i = 0; i < 9; i++) {
    cpf += Math.floor(Math.random() * 10);
  }
  
  // Evita CPFs com todos os dígitos iguais (inválidos)
  const todosIguais = cpf.split('').every(d => d === cpf[0]);
  if (todosIguais) {
    return gerarCPF(); // Recursão para gerar outro
  }
  
  // Calcula primeiro dígito verificador
  const pesos1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = calcularDV(cpf, pesos1);
  cpf += dv1;
  
  // Calcula segundo dígito verificador
  const pesos2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv2 = calcularDV(cpf, pesos2);
  cpf += dv2;
  
  return cpf;
}

/**
 * Gera um CNPJ válido
 * @returns {string} - CNPJ no formato 12345678000195
 */
function gerarCNPJ() {
  // Gera os 8 primeiros dígitos (empresa) + 4 dígitos da filial (0001)
  let cnpj = '';
  for (let i = 0; i < 8; i++) {
    cnpj += Math.floor(Math.random() * 10);
  }
  cnpj += '0001'; // Filial padrão
  
  // Evita CNPJs com todos os dígitos iguais (inválidos)
  const todosIguais = cnpj.substring(0, 8).split('').every(d => d === cnpj[0]);
  if (todosIguais) {
    return gerarCNPJ(); // Recursão para gerar outro
  }
  
  // Calcula primeiro dígito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = calcularDV(cnpj, pesos1);
  cnpj += dv1;
  
  // Calcula segundo dígito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv2 = calcularDV(cnpj, pesos2);
  cnpj += dv2;
  
  return cnpj;
}

/**
 * Gera lista de CPFs únicos
 * @param {number} quantidade - Número de CPFs a gerar
 * @returns {string[]} - Array com CPFs únicos
 */
function gerarListaCPFs(quantidade) {
  const cpfs = new Set();
  
  while (cpfs.size < quantidade) {
    const cpf = gerarCPF();
    cpfs.add(cpf);
  }
  
  return Array.from(cpfs);
}

/**
 * Gera lista de CNPJs únicos
 * @param {number} quantidade - Número de CNPJs a gerar
 * @returns {string[]} - Array com CNPJs únicos
 */
function gerarListaCNPJs(quantidade) {
  const cnpjs = new Set();
  
  while (cnpjs.size < quantidade) {
    const cnpj = gerarCNPJ();
    cnpjs.add(cnpj);
  }
  
  return Array.from(cnpjs);
}

// Gerar listas para usar no seed
console.log('🔢 Gerando documentos válidos...');

const cpfs = gerarListaCPFs(300); // Mais que suficiente para 200 colaboradores
const cnpjs = gerarListaCNPJs(30); // Mais que suficiente para 20 contratadas

console.log('📋 CPFs gerados:');
cpfs.forEach((cpf, i) => {
  console.log(`'${cpf}',${i % 10 === 9 ? '' : ' '}`);
});

console.log('\n📋 CNPJs gerados:');
cnpjs.forEach((cnpj, i) => {
  console.log(`'${cnpj}',${i % 5 === 4 ? '' : ' '}`);
});

console.log(`\n✅ Gerados ${cpfs.length} CPFs e ${cnpjs.length} CNPJs válidos!`);

// Teste de validação
function validarCPF(cpf) {
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (cpf.split('').every(d => d === cpf[0])) return false;
  
  // Valida primeiro dígito
  const pesos1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = calcularDV(cpf.substring(0, 9), pesos1);
  if (dv1 !== parseInt(cpf[9])) return false;
  
  // Valida segundo dígito
  const pesos2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv2 = calcularDV(cpf.substring(0, 10), pesos2);
  if (dv2 !== parseInt(cpf[10])) return false;
  
  return true;
}

function validarCNPJ(cnpj) {
  if (cnpj.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (cnpj.substring(0, 12).split('').every(d => d === cnpj[0])) return false;
  
  // Valida primeiro dígito
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = calcularDV(cnpj.substring(0, 12), pesos1);
  if (dv1 !== parseInt(cnpj[12])) return false;
  
  // Valida segundo dígito
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv2 = calcularDV(cnpj.substring(0, 13), pesos2);
  if (dv2 !== parseInt(cnpj[13])) return false;
  
  return true;
}

// Teste de alguns documentos gerados
console.log('\n🧪 Testando validação:');
console.log('CPF:', cpfs[0], '- Válido:', validarCPF(cpfs[0]));
console.log('CNPJ:', cnpjs[0], '- Válido:', validarCNPJ(cnpjs[0]));