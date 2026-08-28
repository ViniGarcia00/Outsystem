-- Sprint 4.3 — status APROVADA e PropostaRevisao.aprovadaEm (ADR-0412).
--
-- MODELAGEM: a aprovação é um FATO da REVISÃO, não da Proposta.
--   `proposta_revisoes.aprovadaEm` -> o fato histórico (simétrico a emittedAt)
--   `propostas.status = 'APROVADA'` -> a PROJEÇÃO de "a revisão atual está
--                                      aprovada", para listagem/filtro/badge
--
-- NÃO existe `propostas.aprovadaAt`, de propósito: ela responderia "quando foi
-- aprovada pela primeira vez" — pergunta sem consumidor — e o ADR-0204 obrigaria
-- a nunca sobrescrevê-la, tornando-a enganosa a partir da segunda aprovação.
--
-- Aditiva e reversível por natureza: nenhuma linha existente é alterada e
-- `aprovadaEm` nasce NULL em todas as revisões já gravadas — nenhuma proposta
-- antiga passa a aparecer como aprovada.
--
-- SOBRE `ALTER TYPE ... ADD VALUE` EM TRANSAÇÃO: o PostgreSQL proíbe USAR um
-- valor de enum na mesma transação em que ele é criado. Esta migration apenas
-- o CRIA — não há INSERT, UPDATE nem comparação com 'APROVADA' aqui —, então o
-- par com o ALTER TABLE abaixo é seguro. Se algum ambiente futuro recusar,
-- separar em duas migrations (só o ADD VALUE, depois só a coluna).
--
-- `AFTER 'EMITIDA'` mantém a ordem física do enum igual à ordem declarada no
-- schema.prisma e igual à ordem do ciclo de vida.
ALTER TYPE "StatusProposta" ADD VALUE 'APROVADA' AFTER 'EMITIDA';

ALTER TABLE "proposta_revisoes" ADD COLUMN "aprovadaEm" TIMESTAMP(3);
