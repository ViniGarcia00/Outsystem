-- Sprint 4.1 — remove as colunas de texto do responsável (ADR-0408).
--
-- CONTEÚDO PRESERVADO ANTES DO DROP. Estas colunas não são perdidas: a
-- migration anterior (`tecnicos_vinculo`) já transferiu todo o conteúdo:
--   instalacao_registros."responsavel"  → "responsavelNome" (texto original,
--                                          linha a linha) + "tecnicoId"
--   instalacoes."responsavelAtual"      → "tecnicoResponsavelId"
-- A guarda daquela migration abortaria a Sprint inteira se qualquer linha
-- tivesse ficado sem vínculo. Verificado: 3 registros vinculados, 0 sem par.
--
-- Nenhuma linha de código lê estes campos desde o commit da Task 8 do plano.
--
-- NÃO CONFUNDIR: `InstalacaoRegistro.responsavelNome` PERMANECE — é o snapshot
-- histórico, e é justamente o que impede que renomear um Técnico reescreva a
-- cronologia (ADR-0408, princípio herdado do ADR-0400).

-- AlterTable
ALTER TABLE "instalacao_registros" DROP COLUMN "responsavel";

-- AlterTable
ALTER TABLE "instalacoes" DROP COLUMN "responsavelAtual";
