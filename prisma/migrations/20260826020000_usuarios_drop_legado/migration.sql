-- Sprint 4.2 — remove os cadastros antigos (ADR-0410).
--
-- CONTEÚDO PRESERVADO ANTES DO DROP. Estas tabelas não são perdidas: a M1
-- copiou cada linha para `usuarios` mantendo o MESMO id, e a M2 provou que as
-- três FKs resolvem em `usuarios` sem que um único valor de coluna fosse
-- reescrito. Verificado no banco da Outmat em 2026-08-26:
--
--   vendedores  2 linhas → Usuario ehVendedor  (Carlos Gomes, Vinicius Garcia)
--   tecnicos    1 linha  → Usuario ehTecnico   (Vinicius)
--   vínculos    2 propostas + 0 instalações + 3 registros, valores intactos
--               (7/7 linhas conferidas por diff antes/depois da M2)
--
-- Nenhuma linha de código lê `vendedores`/`tecnicos` a partir da Task 14 do
-- plano — esta migration roda no mesmo release daquele commit.
--
-- NÃO CONFUNDIR: instalacao_registros."responsavelNome" PERMANECE. É o snapshot
-- histórico da cronologia, e é justamente o que impede que renomear um Usuário
-- reescreva o que a timeline diz (ADR-0408, preservado pelo ADR-0410).

-- ---------------------------------------------------------------------------
-- GUARDA. Nenhuma FK pode restar apontando para as tabelas que serão apagadas.
-- O DROP falharia de qualquer forma, mas com erro de dependência; esta mensagem
-- diz quantas e por quê.
-- ---------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM pg_constraint con
    JOIN pg_class confrel ON confrel.oid = con.confrelid
   WHERE con.contype = 'f' AND confrel.relname IN ('vendedores', 'tecnicos');
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] ainda existem % FK(s) apontando para vendedores/tecnicos — migration abortada, nada foi alterado', n;
  END IF;

  -- Redundante com a G4 da M1, e de propósito: é a última chance de detectar
  -- que algum cadastro sumiria sem contrapartida em `usuarios`.
  IF EXISTS (SELECT 1 FROM "vendedores" v
              WHERE NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = v."id")) THEN
    RAISE EXCEPTION
      '[usuarios] algum vendedor nao tem Usuario correspondente — migration abortada, nada foi alterado';
  END IF;
  IF EXISTS (SELECT 1 FROM "tecnicos" t
              WHERE NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = t."id")) THEN
    RAISE EXCEPTION
      '[usuarios] algum tecnico nao tem Usuario correspondente — migration abortada, nada foi alterado';
  END IF;
END $$;

-- DropTable
DROP TABLE "vendedores";

-- DropTable
DROP TABLE "tecnicos";
