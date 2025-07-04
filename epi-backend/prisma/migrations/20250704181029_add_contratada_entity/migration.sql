-- AlterTable
ALTER TABLE "colaboradores" ADD COLUMN     "contratada_id" TEXT;

-- CreateTable
CREATE TABLE "contratadas" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratadas_cnpj_key" ON "contratadas"("cnpj");

-- AddForeignKey
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_contratada_id_fkey" FOREIGN KEY ("contratada_id") REFERENCES "contratadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
