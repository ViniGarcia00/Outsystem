-- Sprint 4.3 — Instalacao.apelido (ADR-0413).
--
-- Identificacao operacional da obra. Pertence a INSTALACAO, nunca ao Cliente:
-- o mesmo cliente tem varias instalacoes ("Casa Alphaville", "Apartamento
-- Moema") e era isso que a listagem nao sabia distinguir.
--
-- NAO e o `nomeProjeto` removido na Sprint 4.0.3 (migration
-- 20260819000000_remove_nome_projeto_instalacao, ADR-0404). Aquele era texto
-- solto, sem regra de preenchimento e sem papel na identificacao; a remocao
-- dele segue correta. Esta coluna e nova, com regra propria.
ALTER TABLE "instalacoes" ADD COLUMN "apelido" TEXT;

-- BACKFILL — replica EXATAMENTE a regra de nome de exibicao ja usada pelo
-- sistema, nao uma segunda regra paralela.
--
-- A regra em TypeScript (`nomeCliente` em instalacao.service.ts, e a mesma de
-- dashboard.service.ts e `clienteDisplay` em proposta.service.ts) e:
--
--   (tipoPessoa === "PJ" ? empresa || nome : nome || empresa) || "—"
--
-- Traducao fiel para SQL. O detalhe que importa: o `||` do JavaScript trata
-- string VAZIA como falsa, e `COALESCE` sozinho so trata NULL. Por isso cada
-- termo passa por NULLIF(x, '') — sem isso, um `empresa = ''` viraria apelido
-- vazio aqui e "nome" na tela, e as duas regras divergiriam justamente no caso
-- de borda.
--
-- O fallback final difere de proposito: a tela mostra "—" para cliente sem nome
-- nenhum, mas "—" como APELIDO seria inutil na coluna de identificacao
-- principal. Nesse caso unico usa-se o numero da instalacao. Nao ha nenhuma
-- linha assim no banco (verificado: 0 clientes sem nome e sem empresa) — a
-- clausula existe como guarda, nao como comportamento esperado.
UPDATE "instalacoes" i
SET "apelido" = COALESCE(
      CASE
        WHEN cl."tipoPessoa" = 'PJ'
          THEN COALESCE(NULLIF(cl.empresa, ''), NULLIF(cl.nome, ''))
        ELSE COALESCE(NULLIF(cl.nome, ''), NULLIF(cl.empresa, ''))
      END,
      'Instalação ' || i.numero::text)
FROM "clientes" cl
WHERE cl.id = i."clienteId" AND i."apelido" IS NULL;
