-- Sprint 2.7.5 — RG (PF) / Inscrição Estadual (PJ) no Cliente (ADR-0224).
-- Aditiva: colunas de texto opcionais; nulas para os clientes existentes.

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "rg" TEXT;
ALTER TABLE "clientes" ADD COLUMN     "inscricaoEstadual" TEXT;
