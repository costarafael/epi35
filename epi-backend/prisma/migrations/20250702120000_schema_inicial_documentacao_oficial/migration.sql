-- CreateEnum
CREATE TYPE "status_tipo_epi_enum" AS ENUM ('ATIVO', 'DESCONTINUADO');

-- CreateEnum
CREATE TYPE "status_estoque_item_enum" AS ENUM ('DISPONIVEL', 'AGUARDANDO_INSPECAO', 'QUARENTENA');

-- CreateEnum
CREATE TYPE "tipo_nota_enum" AS ENUM ('ENTRADA', 'TRANSFERENCIA', 'DESCARTE', 'ENTRADA_AJUSTE', 'SAIDA_AJUSTE');

-- CreateEnum
CREATE TYPE "status_nota_enum" AS ENUM ('RASCUNHO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "tipo_movimentacao_enum" AS ENUM ('ENTRADA_NOTA', 'SAIDA_ENTREGA', 'ENTRADA_DEVOLUCAO', 'SAIDA_TRANSFERENCIA', 'ENTRADA_TRANSFERENCIA', 'SAIDA_DESCARTE', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'ESTORNO_ENTRADA_NOTA', 'ESTORNO_SAIDA_ENTREGA', 'ESTORNO_ENTRADA_DEVOLUCAO', 'ESTORNO_SAIDA_DESCARTE', 'ESTORNO_SAIDA_TRANSFERENCIA', 'ESTORNO_ENTRADA_TRANSFERENCIA', 'ESTORNO_AJUSTE_POSITIVO', 'ESTORNO_AJUSTE_NEGATIVO');

-- CreateEnum
CREATE TYPE "status_ficha_enum" AS ENUM ('ATIVA', 'INATIVA');

-- CreateEnum
CREATE TYPE "status_entrega_enum" AS ENUM ('PENDENTE_ASSINATURA', 'ASSINADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "status_entrega_item_enum" AS ENUM ('COM_COLABORADOR', 'DEVOLVIDO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_negocio" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almoxarifados" (
    "id" TEXT NOT NULL,
    "unidade_negocio_id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "is_principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "almoxarifados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_epi" (
    "id" TEXT NOT NULL,
    "nome_equipamento" VARCHAR(255) NOT NULL,
    "numero_ca" VARCHAR(50) NOT NULL,
    "descricao" TEXT,
    "vida_util_dias" INTEGER,
    "status" "status_tipo_epi_enum" NOT NULL DEFAULT 'ATIVO',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_epi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_itens" (
    "id" TEXT NOT NULL,
    "almoxarifado_id" TEXT NOT NULL,
    "tipo_epi_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "custo_unitario" DECIMAL(12,2),
    "status" "status_estoque_item_enum" NOT NULL DEFAULT 'DISPONIVEL',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estoque_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_movimentacao" (
    "id" TEXT NOT NULL,
    "almoxarifado_id" TEXT NOT NULL,
    "almoxarifado_destino_id" TEXT,
    "responsavel_id" TEXT NOT NULL,
    "tipo_nota" "tipo_nota_enum" NOT NULL,
    "status" "status_nota_enum" NOT NULL DEFAULT 'RASCUNHO',
    "numero_documento" VARCHAR(255),
    "data_documento" DATE NOT NULL DEFAULT CURRENT_DATE,
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_movimentacao_itens" (
    "id" TEXT NOT NULL,
    "nota_movimentacao_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "estoque_item_id" TEXT,
    "tipo_epi_id" TEXT,
    "custo_unitario" DECIMAL(12,2),

    CONSTRAINT "nota_movimentacao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "estoque_item_id" TEXT NOT NULL,
    "responsavel_id" TEXT NOT NULL,
    "tipo_movimentacao" "tipo_movimentacao_enum" NOT NULL,
    "quantidade_movida" INTEGER NOT NULL,
    "nota_movimentacao_id" TEXT,
    "entrega_id" TEXT,
    "movimentacao_origem_id" TEXT,
    "data_movimentacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colaboradores" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "matricula" VARCHAR(50),
    "cargo" VARCHAR(100),
    "setor" VARCHAR(100),
    "unidade_negocio_id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas_epi" (
    "id" TEXT NOT NULL,
    "colaborador_id" TEXT NOT NULL,
    "data_emissao" DATE NOT NULL DEFAULT CURRENT_DATE,
    "status" "status_ficha_enum" NOT NULL DEFAULT 'ATIVA',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fichas_epi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "ficha_epi_id" TEXT NOT NULL,
    "almoxarifado_id" TEXT NOT NULL,
    "responsavel_id" TEXT NOT NULL,
    "data_entrega" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "status_entrega_enum" NOT NULL DEFAULT 'PENDENTE_ASSINATURA',
    "link_assinatura" TEXT,
    "data_assinatura" TIMESTAMPTZ(6),

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrega_itens" (
    "id" TEXT NOT NULL,
    "entrega_id" TEXT NOT NULL,
    "estoque_item_origem_id" TEXT NOT NULL,
    "quantidade_entregue" INTEGER NOT NULL DEFAULT 1,
    "data_limite_devolucao" DATE,
    "status" "status_entrega_item_enum" NOT NULL DEFAULT 'COM_COLABORADOR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrega_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_fichas" (
    "id" TEXT NOT NULL,
    "ficha_epi_id" TEXT NOT NULL,
    "responsavel_id" TEXT,
    "acao" TEXT NOT NULL,
    "detalhes" JSONB,
    "data_acao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_fichas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "chave" VARCHAR(255) NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_negocio_codigo_key" ON "unidades_negocio"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_epi_numero_ca_key" ON "tipos_epi"("numero_ca");

-- CreateIndex
CREATE INDEX "estoque_itens_almoxarifado_id_idx" ON "estoque_itens"("almoxarifado_id");

-- CreateIndex
CREATE INDEX "estoque_itens_tipo_epi_id_idx" ON "estoque_itens"("tipo_epi_id");

-- CreateIndex
CREATE UNIQUE INDEX "estoque_itens_almoxarifado_id_tipo_epi_id_status_key" ON "estoque_itens"("almoxarifado_id", "tipo_epi_id", "status");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_estoque_item_id_idx" ON "movimentacoes_estoque"("estoque_item_id");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_tipo_movimentacao_idx" ON "movimentacoes_estoque"("tipo_movimentacao");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_nota_movimentacao_id_idx" ON "movimentacoes_estoque"("nota_movimentacao_id");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_entrega_id_idx" ON "movimentacoes_estoque"("entrega_id");

-- CreateIndex
CREATE UNIQUE INDEX "colaboradores_cpf_key" ON "colaboradores"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "fichas_epi_colaborador_id_key" ON "fichas_epi"("colaborador_id");

-- CreateIndex
CREATE INDEX "entregas_ficha_epi_id_idx" ON "entregas"("ficha_epi_id");

-- CreateIndex
CREATE INDEX "entregas_almoxarifado_id_idx" ON "entregas"("almoxarifado_id");

-- CreateIndex
CREATE INDEX "entrega_itens_status_data_limite_devolucao_idx" ON "entrega_itens"("status", "data_limite_devolucao");

-- CreateIndex
CREATE INDEX "entrega_itens_estoque_item_origem_id_idx" ON "entrega_itens"("estoque_item_origem_id");

-- CreateIndex
CREATE INDEX "historico_fichas_ficha_epi_id_idx" ON "historico_fichas"("ficha_epi_id");

-- AddForeignKey
ALTER TABLE "almoxarifados" ADD CONSTRAINT "almoxarifados_unidade_negocio_id_fkey" FOREIGN KEY ("unidade_negocio_id") REFERENCES "unidades_negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_itens" ADD CONSTRAINT "estoque_itens_almoxarifado_id_fkey" FOREIGN KEY ("almoxarifado_id") REFERENCES "almoxarifados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_itens" ADD CONSTRAINT "estoque_itens_tipo_epi_id_fkey" FOREIGN KEY ("tipo_epi_id") REFERENCES "tipos_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_movimentacao" ADD CONSTRAINT "notas_movimentacao_almoxarifado_id_fkey" FOREIGN KEY ("almoxarifado_id") REFERENCES "almoxarifados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_movimentacao" ADD CONSTRAINT "notas_movimentacao_almoxarifado_destino_id_fkey" FOREIGN KEY ("almoxarifado_destino_id") REFERENCES "almoxarifados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_movimentacao" ADD CONSTRAINT "notas_movimentacao_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_movimentacao_itens" ADD CONSTRAINT "nota_movimentacao_itens_nota_movimentacao_id_fkey" FOREIGN KEY ("nota_movimentacao_id") REFERENCES "notas_movimentacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_movimentacao_itens" ADD CONSTRAINT "nota_movimentacao_itens_estoque_item_id_fkey" FOREIGN KEY ("estoque_item_id") REFERENCES "estoque_itens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_movimentacao_itens" ADD CONSTRAINT "nota_movimentacao_itens_tipo_epi_id_fkey" FOREIGN KEY ("tipo_epi_id") REFERENCES "tipos_epi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_estoque_item_id_fkey" FOREIGN KEY ("estoque_item_id") REFERENCES "estoque_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_nota_movimentacao_id_fkey" FOREIGN KEY ("nota_movimentacao_id") REFERENCES "notas_movimentacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_movimentacao_origem_id_fkey" FOREIGN KEY ("movimentacao_origem_id") REFERENCES "movimentacoes_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_unidade_negocio_id_fkey" FOREIGN KEY ("unidade_negocio_id") REFERENCES "unidades_negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_epi" ADD CONSTRAINT "fichas_epi_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_ficha_epi_id_fkey" FOREIGN KEY ("ficha_epi_id") REFERENCES "fichas_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_almoxarifado_id_fkey" FOREIGN KEY ("almoxarifado_id") REFERENCES "almoxarifados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_itens" ADD CONSTRAINT "entrega_itens_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_itens" ADD CONSTRAINT "entrega_itens_estoque_item_origem_id_fkey" FOREIGN KEY ("estoque_item_origem_id") REFERENCES "estoque_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_fichas" ADD CONSTRAINT "historico_fichas_ficha_epi_id_fkey" FOREIGN KEY ("ficha_epi_id") REFERENCES "fichas_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

