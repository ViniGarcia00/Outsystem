-- Sprint 4.0.2 — Cronologia e custos das Instalações.
-- Aditiva: nenhuma tabela existente muda além do lado inverso da relação.
--
-- InstalacaoRegistro é a cronologia OPERACIONAL (conteúdo escrito pelos
-- responsáveis); InstalacaoAuditoria, criada na 4.0.1, continua sendo a trilha
-- TÉCNICA. Os dois mecanismos não se misturam (ADR-0401).
--
-- Nenhum total é persistido: totalRegistro e totalInstalacao são derivados.
-- O valor do custo é DECIMAL(12,2) — nunca float. O arredondamento a 2 casas
-- em custos.ts endurece o cálculo, não substitui a persistência segura.

-- CreateEnum
CREATE TYPE "TipoRegistroInstalacao" AS ENUM ('VISITA_CLIENTE', 'ATUALIZACAO_INTERNA', 'MATERIAL_COMPRADO', 'ALTERACAO_ESCOPO', 'PENDENCIA', 'CONCLUSAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "CategoriaCustoInstalacao" AS ENUM ('MATERIAL', 'MAO_DE_OBRA', 'DESLOCAMENTO', 'TERCEIROS', 'FRETE', 'OUTROS');

-- CreateTable
CREATE TABLE "instalacao_registros" (
    "id" TEXT NOT NULL,
    "instalacaoId" TEXT NOT NULL,
    "tipo" "TipoRegistroInstalacao" NOT NULL,
    "aconteceuEm" TIMESTAMP(3) NOT NULL,
    "responsavel" TEXT NOT NULL,
    "relatorio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instalacao_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instalacao_custos" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "categoria" "CategoriaCustoInstalacao" NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instalacao_custos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instalacao_registros_instalacaoId_aconteceuEm_idx" ON "instalacao_registros"("instalacaoId", "aconteceuEm");

-- CreateIndex
CREATE INDEX "instalacao_custos_registroId_idx" ON "instalacao_custos"("registroId");

-- AddForeignKey
ALTER TABLE "instalacao_registros" ADD CONSTRAINT "instalacao_registros_instalacaoId_fkey" FOREIGN KEY ("instalacaoId") REFERENCES "instalacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instalacao_custos" ADD CONSTRAINT "instalacao_custos_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "instalacao_registros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
