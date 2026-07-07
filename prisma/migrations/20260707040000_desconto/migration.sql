-- Sprint 2.5 — Desconto da proposta (ADR-0220): modelagem separada tipo/valor.
-- Aditiva: colunas com default cobrem as propostas existentes (VALOR / 0).

-- CreateEnum
CREATE TYPE "TipoDesconto" AS ENUM ('VALOR', 'PERCENTUAL');

-- AlterTable
ALTER TABLE "propostas" ADD COLUMN     "tipoDesconto" "TipoDesconto" NOT NULL DEFAULT 'VALOR',
ADD COLUMN     "valorDesconto" DECIMAL(12,2) NOT NULL DEFAULT 0;
