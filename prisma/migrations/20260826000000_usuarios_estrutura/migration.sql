-- Sprint 4.2 — cadastro único de Usuários (ADR-0410).
--
-- ADITIVA. Cria `usuarios` e a popula a partir dos dois cadastros existentes.
-- NENHUMA coluna de vínculo é lida, alterada ou removida aqui: o repontamento
-- das FKs fica na migration seguinte (`usuarios_vinculos`), e o DROP das tabelas
-- antigas só na terceira.
--
-- ┌─ DUAS PROPRIEDADES QUE ESTA MIGRATION GARANTE ────────────────────────────┐
-- │                                                                           │
-- │ 1. O id é PRESERVADO (R1). `usuarios.id` recebe `vendedores.id` ou        │
-- │    `tecnicos.id`. Os valores já gravados em propostas."vendedorId",       │
-- │    instalacoes."tecnicoResponsavelId" e instalacao_registros."tecnicoId"  │
-- │    JÁ SÃO os ids corretos — nenhum vínculo precisa ser reescrito, em      │
-- │    lugar nenhum, em momento nenhum. "Nenhum vínculo perdido" deixa de     │
-- │    depender de uma guarda e vira impossibilidade estrutural.              │
-- │                                                                           │
-- │ 2. ZERO lógica baseada em nome (R2). Não há `lower()`, `LIKE`,            │
-- │    `regexp_replace` nem chave normalizada em lugar nenhum deste arquivo.  │
-- │    Um cadastro de origem = um Usuario, SEMPRE. Nenhuma fusão acontece     │
-- │    aqui, nem poderia: fundir descartaria o id do absorvido e quebraria    │
-- │    as FKs dele. Consolidar duas pessoas é DECISÃO HUMANA e vive           │
-- │    exclusivamente na M4.                                                  │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- Usuario NÃO é principal de autenticação — ver ADR-0410.

-- CreateTable
CREATE TABLE "usuarios" (
    "id"         TEXT NOT NULL,
    "ativo"      BOOLEAN NOT NULL DEFAULT true,
    "nome"       TEXT NOT NULL,
    "ehVendedor" BOOLEAN NOT NULL DEFAULT false,
    "ehTecnico"  BOOLEAN NOT NULL DEFAULT false,
    "telefone"   TEXT,
    "email"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usuarios_ativo_idx" ON "usuarios"("ativo");

-- ---------------------------------------------------------------------------
-- 0. GUARDA DE COLISÃO — roda ANTES de qualquer INSERT.
--
--    Preservar o id de origem só é seguro se os dois conjuntos forem disjuntos.
--    Na Outmat são (cuid de 25 caracteres × uuid de 36), mas a migration não
--    pode depender disso: em um banco onde colidissem, o INSERT falharia com
--    violação de chave primária no meio do caminho. Melhor recusar antes, com
--    uma mensagem que diz exatamente o que aconteceu.
-- ---------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM (SELECT "id" FROM "vendedores" INTERSECT SELECT "id" FROM "tecnicos") x;
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] % id(s) colidem entre vendedores e tecnicos — preservar o id de origem seria impossivel; migration abortada, nada foi alterado', n;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Um Usuario por VENDEDOR. Id, nome, ativo, contatos e createdAt preservados.
-- ---------------------------------------------------------------------------
INSERT INTO "usuarios" ("id", "nome", "ativo", "ehVendedor", "ehTecnico",
                        "telefone", "email", "createdAt", "updatedAt")
SELECT "id", "nome", "ativo", true, false,
       "telefone", "email", "createdAt", now()
  FROM "vendedores";

-- ---------------------------------------------------------------------------
-- 2. Um Usuario por TÉCNICO. Sempre — sem comparar nome com nada.
--    `Tecnico` não tinha telefone nem e-mail; ficam nulos.
-- ---------------------------------------------------------------------------
INSERT INTO "usuarios" ("id", "nome", "ativo", "ehVendedor", "ehTecnico",
                        "telefone", "email", "createdAt", "updatedAt")
SELECT "id", "nome", "ativo", false, true,
       NULL, NULL, "createdAt", now()
  FROM "tecnicos";

-- ---------------------------------------------------------------------------
-- 3. GUARDAS. Abortar é o comportamento correto — o Prisma roda cada migration
--    em transação, então a exceção reverte TUDO, inclusive o CREATE TABLE.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  n_usuarios int;
  n_origem   int;
BEGIN
  SELECT count(*) INTO n_usuarios FROM "usuarios";
  SELECT (SELECT count(*) FROM "vendedores") + (SELECT count(*) FROM "tecnicos")
    INTO n_origem;

  -- G1: um Usuario para cada cadastro de origem, nem mais nem menos.
  IF n_usuarios <> n_origem THEN
    RAISE EXCEPTION
      '[usuarios] esperado % usuarios (vendedores + tecnicos), encontrado % — migration abortada, nada foi alterado',
      n_origem, n_usuarios;
  END IF;

  -- G2: todo Usuario criado pela migração veio de um cadastro que TINHA papel.
  IF EXISTS (SELECT 1 FROM "usuarios"
              WHERE "ehVendedor" = false AND "ehTecnico" = false) THEN
    RAISE EXCEPTION
      '[usuarios] usuario sem papel apos o backfill — migration abortada, nada foi alterado';
  END IF;

  -- G3: nenhum nome vazio veio junto. Inspeção de VALOR VAZIO — não é
  -- correspondência entre nomes, que é o que o R2 proíbe.
  IF EXISTS (SELECT 1 FROM "usuarios" WHERE btrim("nome") = '') THEN
    RAISE EXCEPTION
      '[usuarios] usuario com nome vazio — migration abortada, nada foi alterado';
  END IF;

  -- G4: todo id de origem tem um Usuario com o MESMO id (R1). É esta guarda
  -- que autoriza a M2 a trocar o alvo das FKs sem reescrever valor nenhum.
  IF EXISTS (SELECT 1 FROM "vendedores" v
              WHERE NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = v."id")) THEN
    RAISE EXCEPTION
      '[usuarios] algum vendedor nao tem Usuario com o mesmo id — migration abortada, nada foi alterado';
  END IF;
  IF EXISTS (SELECT 1 FROM "tecnicos" t
              WHERE NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = t."id")) THEN
    RAISE EXCEPTION
      '[usuarios] algum tecnico nao tem Usuario com o mesmo id — migration abortada, nada foi alterado';
  END IF;
END $$;
