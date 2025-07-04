/**
 * ✅ OTIMIZAÇÃO: Utility Mapper
 * 
 * Substitui AutoMapper com uma solução type-safe e leve.
 * Reduz mapeamentos manuais repetitivos mantendo tipagem estrita.
 * 
 * Benefícios:
 * - Type-safe com TypeScript completo
 * - Zero dependências externas problemáticas
 * - Performance superior ao AutoMapper
 * - Fácil manutenção e debug
 */

// Generic mapper function para transformações 1:1
export function mapTo<T, R>(source: T, mappingFn: (source: T) => R): R {
  return mappingFn(source);
}

// Array mapper para transformações em lote
export function mapArrayTo<T, R>(sources: T[], mappingFn: (source: T) => R): R[] {
  return sources.map(mappingFn);
}

// Mapper condicional
export function mapIf<T, R>(
  condition: boolean,
  source: T,
  trueMappingFn: (source: T) => R,
  falseMappingFn: (source: T) => R
): R {
  return condition ? trueMappingFn(source) : falseMappingFn(source);
}

// Helper para pick de propriedades específicas
export function pick<T, K extends keyof T>(source: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    result[key] = source[key];
  });
  return result;
}

// Helper para omit de propriedades específicas
export function omit<T, K extends keyof T>(source: T, keys: K[]): Omit<T, K> {
  const result = { ...source };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

// Helper para transformação com validação
export function transformWithValidation<T, R>(
  source: T,
  mappingFn: (source: T) => R,
  validationFn?: (result: R) => boolean
): R {
  const result = mappingFn(source);
  
  if (validationFn && !validationFn(result)) {
    throw new Error('Validation failed after mapping transformation');
  }
  
  return result;
}