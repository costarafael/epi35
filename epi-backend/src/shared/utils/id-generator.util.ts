/**
 * ✅ CUSTOM ID GENERATOR
 * 
 * Gera IDs customizados amigáveis para diferentes entidades:
 * - Entregas: E + 5 dígitos alfanuméricos (ex: E4UI02)
 * - EstoqueItems: I + 5 dígitos alfanuméricos (ex: I7XK91)
 * - TipoEPI: C + 5 dígitos alfanuméricos (ex: C2MN58)
 */

/**
 * Caracteres alfanuméricos para geração de IDs (excluindo caracteres confusos)
 * Removidos: 0, O, I, 1, L para evitar confusão visual
 */
const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.replace(/[01OIL]/g, '');

/**
 * Gera uma string alfanumérica aleatória de tamanho específico
 */
function generateRandomAlphanumeric(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHANUMERIC_CHARS.length);
    result += ALPHANUMERIC_CHARS[randomIndex];
  }
  return result;
}

/**
 * Gera ID customizado para Entregas
 * Formato: E + 5 dígitos alfanuméricos
 * 
 * @returns string - ID no formato E4UI02
 */
export function generateEntregaId(): string {
  return 'E' + generateRandomAlphanumeric(5);
}

/**
 * Gera ID customizado para EstoqueItems
 * Formato: I + 5 dígitos alfanuméricos
 * 
 * @returns string - ID no formato I7XK91
 */
export function generateEstoqueItemId(): string {
  return 'I' + generateRandomAlphanumeric(5);
}

/**
 * Gera ID customizado para TipoEPI
 * Formato: C + 5 dígitos alfanuméricos
 * 
 * @returns string - ID no formato C2MN58
 */
export function generateTipoEpiId(): string {
  return 'C' + generateRandomAlphanumeric(5);
}

/**
 * Valida se um ID segue o formato customizado esperado
 */
export function validateCustomId(id: string, prefix: 'E' | 'I' | 'C'): boolean {
  // Caracteres permitidos (sem 0, 1, O, I, L)
  const allowedChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.replace(/[01OIL]/g, '');
  const pattern = new RegExp(`^${prefix}[${allowedChars}]{5}$`);
  return pattern.test(id);
}

/**
 * Verifica se um ID é do formato UUID (para compatibilidade com dados existentes)
 */
export function isUuidFormat(id: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

/**
 * Detecta o tipo de ID (UUID ou customizado)
 */
export function detectIdType(id: string): 'uuid' | 'custom' | 'invalid' {
  if (isUuidFormat(id)) {
    return 'uuid';
  }
  
  if (validateCustomId(id, 'E') || validateCustomId(id, 'I') || validateCustomId(id, 'C')) {
    return 'custom';
  }
  
  return 'invalid';
}