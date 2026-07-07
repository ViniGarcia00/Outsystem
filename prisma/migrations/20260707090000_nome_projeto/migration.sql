-- Sprint 2.7.8 — Nome do Projeto na Proposta (ADR-0227).
-- Aditiva: coluna de texto opcional; nula para as propostas existentes.

-- AlterTable
ALTER TABLE "propostas" ADD COLUMN     "nomeProjeto" TEXT;
