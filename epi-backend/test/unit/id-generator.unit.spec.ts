/**
 * ✅ TESTES UNITÁRIOS: ID Generator
 * 
 * Testa a geração de IDs customizados para Entregas, EstoqueItems e TipoEPI
 */

import { describe, it, expect } from 'vitest';
import {
  generateEntregaId,
  generateEstoqueItemId,
  generateTipoEpiId,
  validateCustomId,
  isUuidFormat,
  detectIdType,
} from '../../src/shared/utils/id-generator.util';

describe('ID Generator Utilities', () => {
  describe('generateEntregaId', () => {
    it('deve gerar ID com formato E + 5 caracteres', () => {
      const id = generateEntregaId();
      expect(id).toHaveLength(6);
      expect(id.charAt(0)).toBe('E');
      // Caracteres sem 0, 1, O, I, L
      const allowedChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.replace(/[01OIL]/g, '');
      expect(id.slice(1)).toMatch(new RegExp(`^[${allowedChars}]{5}$`));
    });

    it('deve gerar IDs únicos em múltiplas execuções', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateEntregaId());
      }
      // Com 28^5 possibilidades, colisões são muito raras
      expect(ids.size).toBeGreaterThan(90);
    });
  });

  describe('generateEstoqueItemId', () => {
    it('deve gerar ID com formato I + 5 caracteres', () => {
      const id = generateEstoqueItemId();
      expect(id).toHaveLength(6);
      expect(id.charAt(0)).toBe('I');
      // Caracteres sem 0, 1, O, I, L
      const allowedChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.replace(/[01OIL]/g, '');
      expect(id.slice(1)).toMatch(new RegExp(`^[${allowedChars}]{5}$`));
    });
  });

  describe('generateTipoEpiId', () => {
    it('deve gerar ID com formato C + 5 caracteres', () => {
      const id = generateTipoEpiId();
      expect(id).toHaveLength(6);
      expect(id.charAt(0)).toBe('C');
      // Caracteres sem 0, 1, O, I, L
      const allowedChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.replace(/[01OIL]/g, '');
      expect(id.slice(1)).toMatch(new RegExp(`^[${allowedChars}]{5}$`));
    });
  });

  describe('validateCustomId', () => {
    it('deve validar IDs de entrega corretamente', () => {
      expect(validateCustomId('E4U3H2', 'E')).toBe(true); // Usando apenas chars válidos
      expect(validateCustomId('EABCDE', 'E')).toBe(true);
      expect(validateCustomId('I4U3H2', 'E')).toBe(false);
      expect(validateCustomId('E4U3H', 'E')).toBe(false);  // Muito curto
      expect(validateCustomId('E4U3H21', 'E')).toBe(false); // Muito longo
    });

    it('deve validar IDs de estoque corretamente', () => {
      expect(validateCustomId('I7XK92', 'I')).toBe(true); // Removido o 1
      expect(validateCustomId('IMNPQR', 'I')).toBe(true);
      expect(validateCustomId('E7XK92', 'I')).toBe(false);
    });

    it('deve validar IDs de tipo EPI corretamente', () => {
      expect(validateCustomId('C2MN58', 'C')).toBe(true);
      expect(validateCustomId('CQRSTU', 'C')).toBe(true);
      expect(validateCustomId('I2MN58', 'C')).toBe(false);
    });

    it('deve rejeitar caracteres confusos', () => {
      expect(validateCustomId('E0U3H2', 'E')).toBe(false); // 0 não permitido
      expect(validateCustomId('EOU3H2', 'E')).toBe(false); // O não permitido
      expect(validateCustomId('E1U3H2', 'E')).toBe(false); // 1 não permitido 
      expect(validateCustomId('ELU3H2', 'E')).toBe(false); // L não permitido
      expect(validateCustomId('EIU3H2', 'E')).toBe(false); // I não permitido (confunde com prefixo)
    });
  });

  describe('isUuidFormat', () => {
    it('deve reconhecer UUIDs válidos', () => {
      expect(isUuidFormat('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isUuidFormat('bab4ad6f-7aa2-4c20-b65c-0c664737b9b6')).toBe(true);
    });

    it('deve rejeitar formatos inválidos', () => {
      expect(isUuidFormat('E4UI02')).toBe(false);
      expect(isUuidFormat('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isUuidFormat('not-a-uuid')).toBe(false);
    });
  });

  describe('detectIdType', () => {
    it('deve detectar UUIDs', () => {
      expect(detectIdType('550e8400-e29b-41d4-a716-446655440000')).toBe('uuid');
      expect(detectIdType('bab4ad6f-7aa2-4c20-b65c-0c664737b9b6')).toBe('uuid');
    });

    it('deve detectar IDs customizados', () => {
      expect(detectIdType('E4U3H2')).toBe('custom');
      expect(detectIdType('I7XK92')).toBe('custom');
      expect(detectIdType('C2MN58')).toBe('custom');
    });

    it('deve detectar IDs inválidos', () => {
      expect(detectIdType('invalid')).toBe('invalid');
      expect(detectIdType('E4U3H')).toBe('invalid'); // Muito curto
      expect(detectIdType('X4U3H2')).toBe('invalid'); // Prefixo inválido
    });
  });

  describe('Caracteres alfanuméricos', () => {
    it('deve usar apenas caracteres não confusos', () => {
      const ids = [];
      for (let i = 0; i < 50; i++) {
        ids.push(generateEntregaId());
        ids.push(generateEstoqueItemId());
        ids.push(generateTipoEpiId());
      }

      // Remove os prefixos E, I, C dos IDs para analisar apenas os caracteres gerados
      const allChars = ids.map(id => id.slice(1)).join(''); // Remove primeiro char de cada ID
      
      // Não deve conter caracteres confusos
      expect(allChars).not.toMatch(/[01OIL]/);
      
      // Deve conter apenas caracteres permitidos (sem 0, 1, O, I, L)
      const allowedChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.replace(/[01OIL]/g, '');
      expect(allChars).toMatch(new RegExp(`^[${allowedChars}]*$`));
    });
  });
});