-- Sprint 2.6 — Frete da proposta (ADR-0221). Aditiva: default 0 cobre as
-- propostas existentes; total é derivado (nunca persistido).

-- AlterTable
ALTER TABLE "propostas" ADD COLUMN     "frete" DECIMAL(12,2) NOT NULL DEFAULT 0;
