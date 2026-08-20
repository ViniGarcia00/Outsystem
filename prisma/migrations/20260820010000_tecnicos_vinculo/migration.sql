-- Sprint 4.1 — vínculo do responsável com o cadastro de Técnicos (ADR-0408).
--
-- Supersede parcial do ADR-0400, que definia o responsável como TEXTO LIVRE.
-- O princípio daquele ADR — não reescrever silenciosamente o histórico
-- operacional — é preservado por `responsavelNome`, o snapshot que acompanha
-- o vínculo estrutural.
--
-- CONTEÚDO AUDITADO ANTES DO BACKFILL (2026-08-20), linha a linha:
--   instalacoes           1 linha  → nº 1045, "responsavelAtual" = NULL
--   instalacao_registros  3 linhas → todas "Vinicius" (instalação 1045)
--   nomes distintos (minúsculas, espaços colapsados): 1
--     vinicius -> ["Vinicius"] (3 usos)
--   Nenhuma variação de caixa/espaço. Nenhum valor ambíguo ou duvidoso.
--
-- Ainda assim o backfill abaixo é DIRIGIDO PELOS DADOS, não escrito para este
-- conteúdo: a mesma migration precisa estar correta em qualquer banco
-- restaurado de backup. Nenhum nome está hardcoded.
--
-- Esta migration NÃO remove coluna nenhuma. Os dois DROP ficam na migration
-- seguinte (`tecnicos_drop_texto`), que só roda depois que nenhuma linha de
-- código lê os campos antigos.

-- ---------------------------------------------------------------------------
-- 1. Um Técnico por nome DISTINTO encontrado nos dois campos de texto.
--
-- Chave de agrupamento: minúsculas + sem espaço nas pontas + espaços internos
-- colapsados. Agrupa "carlos", "Carlos" e "Carlos  " no mesmo Técnico.
--
-- A chave NÃO remove acento, DE PROPÓSITO: "Joao" e "João" podem ser a mesma
-- pessoa ou não, e inventar essa correspondência é justamente o que a decisão
-- proíbe. Viram Técnicos distintos, visíveis no cadastro, onde uma PESSOA
-- decide se os funde — isso é decisão de negócio, não de migration.
--
-- `gen_random_uuid()` é nativo do PostgreSQL desde a 13 (aqui roda 18): não
-- exige extensão nem superusuário, o que respeita o ADR-0101. `cuid()` não
-- serviria: é gerado pelo Prisma no cliente, não existe como default no banco.
-- O id nunca é exibido.
-- ---------------------------------------------------------------------------
INSERT INTO "tecnicos" ("id", "nome", "ativo", "createdAt", "updatedAt")
SELECT DISTINCT ON (lower(regexp_replace(btrim(nome), '\s+', ' ', 'g')))
       gen_random_uuid()::text,
       btrim(nome),
       true,
       now(),
       now()
  FROM (
         SELECT "responsavel" AS nome
           FROM "instalacao_registros"
          WHERE "responsavel" IS NOT NULL
         UNION ALL
         SELECT "responsavelAtual" AS nome
           FROM "instalacoes"
          WHERE "responsavelAtual" IS NOT NULL
       ) AS origem
 WHERE btrim(nome) <> ''
 ORDER BY lower(regexp_replace(btrim(nome), '\s+', ' ', 'g')), btrim(nome);

-- ---------------------------------------------------------------------------
-- 2. Vincula os registros da cronologia.
--
-- `responsavelNome` recebe o TEXTO ORIGINAL DAQUELA LINHA, não o nome canônico
-- do Técnico: se três registros diziam "Carlos", "carlos" e "Carlos ", os três
-- apontam para o mesmo Técnico e CADA UM mantém a própria grafia. É a leitura
-- mais fiel possível do histórico.
-- ---------------------------------------------------------------------------
UPDATE "instalacao_registros" r
   SET "tecnicoId" = t."id",
       "responsavelNome" = r."responsavel"
  FROM "tecnicos" t
 WHERE lower(regexp_replace(btrim(t."nome"), '\s+', ' ', 'g'))
     = lower(regexp_replace(btrim(r."responsavel"), '\s+', ' ', 'g'));

-- ---------------------------------------------------------------------------
-- 3. Vincula as instalações. SEM snapshot: "responsável atual" é estado
--    corrente, e renomear o Técnico deve refletir ali (ADR-0408).
-- ---------------------------------------------------------------------------
UPDATE "instalacoes" i
   SET "tecnicoResponsavelId" = t."id"
  FROM "tecnicos" t
 WHERE i."responsavelAtual" IS NOT NULL
   AND lower(regexp_replace(btrim(t."nome"), '\s+', ' ', 'g'))
     = lower(regexp_replace(btrim(i."responsavelAtual"), '\s+', ' ', 'g'));

-- ---------------------------------------------------------------------------
-- 4. GUARDA. Abortar é o comportamento correto: em um banco com nome que a
--    chave não resolve, é preferível a migration falhar e alguém olhar, a ela
--    inventar um mapeamento. O Prisma roda cada migration em transação, então
--    a exceção reverte TUDO — inclusive os INSERT/UPDATE acima.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "instalacao_registros" WHERE "tecnicoId" IS NULL) THEN
    RAISE EXCEPTION
      '[tecnicos] backfill incompleto em instalacao_registros — migration abortada, nada foi alterado';
  END IF;

  IF EXISTS (SELECT 1
               FROM "instalacoes"
              WHERE "responsavelAtual" IS NOT NULL
                AND "tecnicoResponsavelId" IS NULL) THEN
    RAISE EXCEPTION
      '[tecnicos] backfill incompleto em instalacoes — migration abortada, nada foi alterado';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Só agora: travar as colunas novas.
-- ---------------------------------------------------------------------------
ALTER TABLE "instalacao_registros" ALTER COLUMN "tecnicoId"       SET NOT NULL;
ALTER TABLE "instalacao_registros" ALTER COLUMN "responsavelNome" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. A coluna ANTIGA continua existindo, mas deixa de ser obrigatória, para que
--    o código possa parar de escrevê-la antes do DROP da próxima migration.
-- ---------------------------------------------------------------------------
ALTER TABLE "instalacao_registros" ALTER COLUMN "responsavel" DROP NOT NULL;
