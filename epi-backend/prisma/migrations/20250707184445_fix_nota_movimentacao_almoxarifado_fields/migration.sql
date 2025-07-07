-- DropForeignKey
ALTER TABLE "notas_movimentacao" DROP CONSTRAINT "notas_movimentacao_almoxarifado_id_fkey";

-- AlterTable
ALTER TABLE "notas_movimentacao" ALTER COLUMN "almoxarifado_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "notas_movimentacao" ADD CONSTRAINT "notas_movimentacao_almoxarifado_id_fkey" FOREIGN KEY ("almoxarifado_id") REFERENCES "almoxarifados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
