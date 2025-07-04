/**
 * Categoria de EPI conforme normas brasileiras de segurança do trabalho
 */
export enum CategoriaEPI {
  PROTECAO_CABECA = 'PROTECAO_CABECA',
  PROTECAO_OLHOS_ROSTO = 'PROTECAO_OLHOS_ROSTO',
  PROTECAO_OUVIDOS = 'PROTECAO_OUVIDOS',
  PROTECAO_MAOS_BRACCOS = 'PROTECAO_MAOS_BRACCOS',
  PROTECAO_PES = 'PROTECAO_PES',
  PROTECAO_RESPIRATORIA = 'PROTECAO_RESPIRATORIA',
  PROTECAO_CLIMATICA = 'PROTECAO_CLIMATICA',
  ROUPA_APROXIMACAO = 'ROUPA_APROXIMACAO',
}

/**
 * Mapeamento de categorias EPI para descrições legíveis
 */
export const CATEGORIA_EPI_LABELS: Record<CategoriaEPI, string> = {
  [CategoriaEPI.PROTECAO_CABECA]: 'Proteção para Cabeça',
  [CategoriaEPI.PROTECAO_OLHOS_ROSTO]: 'Proteção para Olhos e Rosto',
  [CategoriaEPI.PROTECAO_OUVIDOS]: 'Proteção dos Ouvidos',
  [CategoriaEPI.PROTECAO_MAOS_BRACCOS]: 'Proteção de Mãos e Braços',
  [CategoriaEPI.PROTECAO_PES]: 'Proteção dos Pés',
  [CategoriaEPI.PROTECAO_RESPIRATORIA]: 'Proteção Respiratória',
  [CategoriaEPI.PROTECAO_CLIMATICA]: 'Proteção contra Condições Climáticas Extremas',
  [CategoriaEPI.ROUPA_APROXIMACAO]: 'Roupa de Aproximação',
};

/**
 * Lista de todas as categorias disponíveis
 */
export const CATEGORIAS_EPI_DISPONIVEIS = Object.values(CategoriaEPI);