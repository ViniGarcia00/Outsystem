-- Sprint 2.7.6 — Inscrição Estadual da empresa na Configuração (ADR-0225).
-- Aditiva: coluna de texto opcional; nula na configuração existente.

-- AlterTable
ALTER TABLE "configuracao_sistema" ADD COLUMN     "inscricaoEstadual" TEXT;
