-- Remove default UUID from tables that will use custom ID generation
-- This forces the middleware to generate custom IDs

-- Remove default from TipoEPI
ALTER TABLE "tipos_epi" ALTER COLUMN "id" DROP DEFAULT;

-- Remove default from EstoqueItem  
ALTER TABLE "estoque_itens" ALTER COLUMN "id" DROP DEFAULT;

-- Remove default from Entrega
ALTER TABLE "entregas" ALTER COLUMN "id" DROP DEFAULT;