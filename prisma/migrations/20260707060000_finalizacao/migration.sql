-- Sprint 2.6.5 — Finalização da Proposta (ADR-0222). Aditiva: colunas de texto
-- livre no cabeçalho da Proposta; nulas para as propostas existentes. Não
-- entram em cálculos/totais. Sem novas tabelas/entidades.

-- AlterTable
ALTER TABLE "propostas" ADD COLUMN     "formaPagamento" TEXT;
ALTER TABLE "propostas" ADD COLUMN     "previsaoInstalacao" TEXT;
ALTER TABLE "propostas" ADD COLUMN     "obsComerciais" TEXT;
ALTER TABLE "propostas" ADD COLUMN     "obsTecnicas" TEXT;
