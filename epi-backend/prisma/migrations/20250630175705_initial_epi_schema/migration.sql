-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE', 'DESCARTE', 'ESTORNO');

-- CreateEnum
CREATE TYPE "StatusNotaMovimentacao" AS ENUM ('RASCUNHO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoNotaMovimentacao" AS ENUM ('ENTRADA', 'TRANSFERENCIA', 'DESCARTE', 'AJUSTE');

-- CreateEnum
CREATE TYPE "StatusEstoqueItem" AS ENUM ('DISPONIVEL', 'RESERVADO', 'AGUARDANDO_INSPECAO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "StatusEntrega" AS ENUM ('ATIVA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusEntregaItem" AS ENUM ('ENTREGUE', 'DEVOLVIDO', 'PERDIDO', 'DANIFICADO');

-- CreateEnum
CREATE TYPE "StatusFichaEPI" AS ENUM ('ATIVA', 'INATIVA', 'SUSPENSA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "status" "StatusUsuario" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_negocio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almoxarifados" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "unidadeNegocioId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "almoxarifados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_epi" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "ca" TEXT,
    "validadeMeses" INTEGER,
    "diasAvisoVencimento" INTEGER NOT NULL DEFAULT 30,
    "exigeAssinaturaEntrega" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_epi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_itens" (
    "id" TEXT NOT NULL,
    "almoxarifadoId" TEXT NOT NULL,
    "tipoEpiId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusEstoqueItem" NOT NULL DEFAULT 'DISPONIVEL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_movimentacao" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoNotaMovimentacao" NOT NULL,
    "almoxarifadoOrigemId" TEXT,
    "almoxarifadoDestinoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" "StatusNotaMovimentacao" NOT NULL DEFAULT 'RASCUNHO',
    "dataConclusao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_movimentacao_itens" (
    "id" TEXT NOT NULL,
    "notaMovimentacaoId" TEXT NOT NULL,
    "tipoEpiId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "quantidadeProcessada" INTEGER NOT NULL DEFAULT 0,
    "observacoes" TEXT,

    CONSTRAINT "nota_movimentacao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "almoxarifadoId" TEXT NOT NULL,
    "tipoEpiId" TEXT NOT NULL,
    "tipoMovimentacao" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "saldoAnterior" INTEGER NOT NULL,
    "saldoPosterior" INTEGER NOT NULL,
    "notaMovimentacaoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "observacoes" TEXT,
    "movimentacaoEstornoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colaboradores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "matricula" TEXT,
    "cargo" TEXT,
    "setor" TEXT,
    "unidadeNegocioId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas_epi" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "tipoEpiId" TEXT NOT NULL,
    "almoxarifadoId" TEXT NOT NULL,
    "status" "StatusFichaEPI" NOT NULL DEFAULT 'ATIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_epi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "fichaEpiId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "dataEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" TIMESTAMP(3),
    "assinaturaColaborador" TEXT,
    "observacoes" TEXT,
    "status" "StatusEntrega" NOT NULL DEFAULT 'ATIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrega_itens" (
    "id" TEXT NOT NULL,
    "entregaId" TEXT NOT NULL,
    "tipoEpiId" TEXT NOT NULL,
    "quantidadeEntregue" INTEGER NOT NULL DEFAULT 1,
    "numeroSerie" TEXT,
    "lote" TEXT,
    "dataFabricacao" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3),
    "status" "StatusEntregaItem" NOT NULL DEFAULT 'ENTREGUE',
    "dataDevolucao" TIMESTAMP(3),
    "motivoDevolucao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entrega_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_fichas" (
    "id" TEXT NOT NULL,
    "fichaEpiId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "detalhes" JSONB,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_fichas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_negocio_codigo_key" ON "unidades_negocio"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "almoxarifados_codigo_key" ON "almoxarifados"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_epi_codigo_key" ON "tipos_epi"("codigo");

-- CreateIndex
CREATE INDEX "estoque_itens_almoxarifadoId_status_idx" ON "estoque_itens"("almoxarifadoId", "status");

-- CreateIndex
CREATE INDEX "estoque_itens_tipoEpiId_status_idx" ON "estoque_itens"("tipoEpiId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "estoque_itens_almoxarifadoId_tipoEpiId_status_key" ON "estoque_itens"("almoxarifadoId", "tipoEpiId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notas_movimentacao_numero_key" ON "notas_movimentacao"("numero");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_almoxarifadoId_tipoEpiId_createdAt_idx" ON "movimentacoes_estoque"("almoxarifadoId", "tipoEpiId", "createdAt");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_tipoMovimentacao_createdAt_idx" ON "movimentacoes_estoque"("tipoMovimentacao", "createdAt");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_notaMovimentacaoId_idx" ON "movimentacoes_estoque"("notaMovimentacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "colaboradores_cpf_key" ON "colaboradores"("cpf");

-- CreateIndex
CREATE INDEX "fichas_epi_colaboradorId_status_idx" ON "fichas_epi"("colaboradorId", "status");

-- CreateIndex
CREATE INDEX "fichas_epi_almoxarifadoId_status_idx" ON "fichas_epi"("almoxarifadoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fichas_epi_colaboradorId_tipoEpiId_almoxarifadoId_key" ON "fichas_epi"("colaboradorId", "tipoEpiId", "almoxarifadoId");

-- CreateIndex
CREATE INDEX "entregas_colaboradorId_status_idx" ON "entregas"("colaboradorId", "status");

-- CreateIndex
CREATE INDEX "entregas_dataVencimento_status_idx" ON "entregas"("dataVencimento", "status");

-- CreateIndex
CREATE INDEX "entrega_itens_status_dataVencimento_idx" ON "entrega_itens"("status", "dataVencimento");

-- CreateIndex
CREATE INDEX "entrega_itens_tipoEpiId_status_idx" ON "entrega_itens"("tipoEpiId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_chave_key" ON "configuracoes"("chave");

-- AddForeignKey
ALTER TABLE "almoxarifados" ADD CONSTRAINT "almoxarifados_unidadeNegocioId_fkey" FOREIGN KEY ("unidadeNegocioId") REFERENCES "unidades_negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_itens" ADD CONSTRAINT "estoque_itens_almoxarifadoId_fkey" FOREIGN KEY ("almoxarifadoId") REFERENCES "almoxarifados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_itens" ADD CONSTRAINT "estoque_itens_tipoEpiId_fkey" FOREIGN KEY ("tipoEpiId") REFERENCES "tipos_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_movimentacao" ADD CONSTRAINT "notas_movimentacao_almoxarifadoOrigemId_fkey" FOREIGN KEY ("almoxarifadoOrigemId") REFERENCES "almoxarifados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_movimentacao" ADD CONSTRAINT "notas_movimentacao_almoxarifadoDestinoId_fkey" FOREIGN KEY ("almoxarifadoDestinoId") REFERENCES "almoxarifados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_movimentacao" ADD CONSTRAINT "notas_movimentacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_movimentacao_itens" ADD CONSTRAINT "nota_movimentacao_itens_notaMovimentacaoId_fkey" FOREIGN KEY ("notaMovimentacaoId") REFERENCES "notas_movimentacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_movimentacao_itens" ADD CONSTRAINT "nota_movimentacao_itens_tipoEpiId_fkey" FOREIGN KEY ("tipoEpiId") REFERENCES "tipos_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_almoxarifadoId_fkey" FOREIGN KEY ("almoxarifadoId") REFERENCES "almoxarifados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_tipoEpiId_fkey" FOREIGN KEY ("tipoEpiId") REFERENCES "tipos_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_notaMovimentacaoId_fkey" FOREIGN KEY ("notaMovimentacaoId") REFERENCES "notas_movimentacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_movimentacaoEstornoId_fkey" FOREIGN KEY ("movimentacaoEstornoId") REFERENCES "movimentacoes_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_unidadeNegocioId_fkey" FOREIGN KEY ("unidadeNegocioId") REFERENCES "unidades_negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_epi" ADD CONSTRAINT "fichas_epi_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "colaboradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_epi" ADD CONSTRAINT "fichas_epi_tipoEpiId_fkey" FOREIGN KEY ("tipoEpiId") REFERENCES "tipos_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_epi" ADD CONSTRAINT "fichas_epi_almoxarifadoId_fkey" FOREIGN KEY ("almoxarifadoId") REFERENCES "almoxarifados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_fichaEpiId_fkey" FOREIGN KEY ("fichaEpiId") REFERENCES "fichas_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "colaboradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_itens" ADD CONSTRAINT "entrega_itens_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_itens" ADD CONSTRAINT "entrega_itens_tipoEpiId_fkey" FOREIGN KEY ("tipoEpiId") REFERENCES "tipos_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_fichas" ADD CONSTRAINT "historico_fichas_fichaEpiId_fkey" FOREIGN KEY ("fichaEpiId") REFERENCES "fichas_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
