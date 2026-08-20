-- Sprint 4.1 — cadastro de Técnicos (ADR-0408).
--
-- Aditiva: cria a tabela `tecnicos` e as colunas de vínculo, todas NULLABLE.
-- Nenhum dado existente é lido, alterado ou removido aqui. O backfill e o
-- travamento das colunas ficam na migration seguinte (`tecnicos_vinculo`),
-- que é onde a preservação do histórico é provada antes de qualquer DROP.
--
-- Técnico NÃO é Vendedor e NÃO é Usuário — ver ADR-0408.

-- AlterTable
ALTER TABLE "instalacao_registros" ADD COLUMN     "responsavelNome" TEXT,
ADD COLUMN     "tecnicoId" TEXT;

-- AlterTable
ALTER TABLE "instalacoes" ADD COLUMN     "tecnicoResponsavelId" TEXT;

-- CreateTable
CREATE TABLE "tecnicos" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tecnicos_ativo_idx" ON "tecnicos"("ativo");

-- CreateIndex
CREATE INDEX "instalacao_registros_tecnicoId_idx" ON "instalacao_registros"("tecnicoId");

-- CreateIndex
CREATE INDEX "instalacoes_tecnicoResponsavelId_idx" ON "instalacoes"("tecnicoResponsavelId");

-- AddForeignKey
ALTER TABLE "instalacoes" ADD CONSTRAINT "instalacoes_tecnicoResponsavelId_fkey" FOREIGN KEY ("tecnicoResponsavelId") REFERENCES "tecnicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instalacao_registros" ADD CONSTRAINT "instalacao_registros_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "tecnicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
