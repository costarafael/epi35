/**
 * ✅ PRISMA ID MIDDLEWARE
 * 
 * Middleware que intercepta operações de criação no Prisma e gera IDs customizados
 * automaticamente para as entidades especificadas.
 */

import { Prisma } from '@prisma/client';
import { generateEntregaId, generateEstoqueItemId, generateTipoEpiId } from '../../shared/utils/id-generator.util';

/**
 * Middleware para geração automática de IDs customizados
 */
export const customIdMiddleware: Prisma.Middleware = async (params, next) => {
  // Intercepta apenas operações de criação
  if (params.action === 'create') {
    const { model, args } = params;

    // Gera ID customizado baseado no modelo
    switch (model) {
      case 'Entrega':
        if (!args.data.id) {
          args.data.id = generateEntregaId();
        }
        break;
        
      case 'EstoqueItem':
        if (!args.data.id) {
          args.data.id = generateEstoqueItemId();
        }
        break;
        
      case 'TipoEPI':
        if (!args.data.id) {
          args.data.id = generateTipoEpiId();
        }
        break;
    }
  }

  // Para operações createMany, precisamos de uma abordagem diferente
  if (params.action === 'createMany') {
    const { model, args } = params;

    switch (model) {
      case 'Entrega':
        args.data = args.data.map((item: any) => ({
          ...item,
          id: item.id || generateEntregaId(),
        }));
        break;
        
      case 'EstoqueItem':
        args.data = args.data.map((item: any) => ({
          ...item,
          id: item.id || generateEstoqueItemId(),
        }));
        break;
        
      case 'TipoEPI':
        args.data = args.data.map((item: any) => ({
          ...item,
          id: item.id || generateTipoEpiId(),
        }));
        break;
    }
  }

  return next(params);
};

/**
 * Aplica o middleware ao cliente Prisma
 */
export function applyCustomIdMiddleware(prisma: any) {
  prisma.$use(customIdMiddleware);
}