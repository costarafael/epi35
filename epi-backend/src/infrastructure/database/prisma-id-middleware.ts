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
  // Intercepta operações de criação
  if (params.action === 'create') {
    const { model, args } = params;

    // Log para debugging (disabled in test environment)
    if (process.env.NODE_ENV !== 'test') {
      console.log(`🔧 Middleware: Creating ${model}`, args.data.id ? 'with ID' : 'without ID');
    }

    // Gera ID customizado baseado no modelo
    switch (model) {
      case 'Entrega':
        if (!args.data.id || args.data.id === '') {
          args.data.id = generateEntregaId();
          if (process.env.NODE_ENV !== 'test') {
            console.log(`🆔 Generated Entrega ID: ${args.data.id}`);
          }
        }
        break;
        
      case 'EstoqueItem':
        if (!args.data.id || args.data.id === '') {
          args.data.id = generateEstoqueItemId();
          if (process.env.NODE_ENV !== 'test') {
            console.log(`🆔 Generated EstoqueItem ID: ${args.data.id}`);
          }
        }
        break;
        
      case 'TipoEPI':
        if (!args.data.id || args.data.id === '') {
          args.data.id = generateTipoEpiId();
          if (process.env.NODE_ENV !== 'test') {
            console.log(`🆔 Generated TipoEPI ID: ${args.data.id}`);
          }
        }
        break;
    }
  }

  // Intercepta operações de upsert
  if (params.action === 'upsert') {
    const { model, args } = params;

    // Log para debugging (disabled in test environment)
    if (process.env.NODE_ENV !== 'test') {
      console.log(`🔧 Middleware: Upserting ${model}`, args.create?.id ? 'with ID' : 'without ID');
    }

    // Gera ID customizado para o caso create do upsert
    switch (model) {
      case 'Entrega':
        if (!args.create?.id || args.create.id === '') {
          args.create.id = generateEntregaId();
          if (process.env.NODE_ENV !== 'test') {
            console.log(`🆔 Generated Entrega ID for upsert: ${args.create.id}`);
          }
        }
        break;
        
      case 'EstoqueItem':
        if (!args.create?.id || args.create.id === '') {
          args.create.id = generateEstoqueItemId();
          if (process.env.NODE_ENV !== 'test') {
            console.log(`🆔 Generated EstoqueItem ID for upsert: ${args.create.id}`);
          }
        }
        break;
        
      case 'TipoEPI':
        if (!args.create?.id || args.create.id === '') {
          args.create.id = generateTipoEpiId();
          if (process.env.NODE_ENV !== 'test') {
            console.log(`🆔 Generated TipoEPI ID for upsert: ${args.create.id}`);
          }
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
          id: (!item.id || item.id === '') ? generateEntregaId() : item.id,
        }));
        break;
        
      case 'EstoqueItem':
        args.data = args.data.map((item: any) => ({
          ...item,
          id: (!item.id || item.id === '') ? generateEstoqueItemId() : item.id,
        }));
        break;
        
      case 'TipoEPI':
        args.data = args.data.map((item: any) => ({
          ...item,
          id: (!item.id || item.id === '') ? generateTipoEpiId() : item.id,
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