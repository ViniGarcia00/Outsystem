-- Sprint 4.2 — repontamento das FKs para `usuarios` (ADR-0410).
--
-- ESTA MIGRATION REMOVE E RECRIA CONSTRAINTS, MAS NÃO ALTERA OS VALORES DAS
-- COLUNAS DE VÍNCULO. Não contém um único UPDATE — verificável por grep.
--
-- As três colunas — propostas."vendedorId", instalacoes."tecnicoResponsavelId"
-- e instalacao_registros."tecnicoId" — guardam exatamente os mesmos valores
-- antes e depois desta migration; muda só a tabela que a FK referencia. É a
-- consequência direta de a M1 ter preservado os ids de origem (R1), e foi
-- provado valor a valor: as 7 linhas de vínculo foram capturadas antes e depois
-- e comparadas com `diff`.
--
-- MUDANÇA DELIBERADA DE COMPORTAMENTO (R3): propostas."vendedorId" era
-- ON DELETE SET NULL desde a migration inicial, enquanto as duas FKs de técnico
-- já eram RESTRICT. Apagar um vendedor por qualquer caminho que não passasse
-- por `removeVendedor()` ZERAVA silenciosamente o vínculo da proposta — perda
-- de histórico, o oposto da regra do projeto. As três FKs passam a ser
-- RESTRICT, e o banco passa a garantir o que `removeUsuario` já afirmava.

-- ---------------------------------------------------------------------------
-- 1. GUARDA PRÉVIA. As FKs novas já barrariam um valor órfão, mas com erro de
--    violação de chave. Estas mensagens dizem QUAL tabela e QUANTAS linhas.
--    Mesma razão pela qual `removeTecnico()` contava antes de deletar, embora o
--    Restrict do banco também protegesse.
-- ---------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM "propostas" p
   WHERE p."vendedorId" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = p."vendedorId");
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] % proposta(s) com vendedorId sem Usuario correspondente — migration abortada, nada foi alterado', n;
  END IF;

  SELECT count(*) INTO n
    FROM "instalacoes" i
   WHERE i."tecnicoResponsavelId" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = i."tecnicoResponsavelId");
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] % instalacao(oes) com tecnicoResponsavelId sem Usuario correspondente — migration abortada, nada foi alterado', n;
  END IF;

  SELECT count(*) INTO n
    FROM "instalacao_registros" r
   WHERE NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = r."tecnicoId");
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] % registro(s) da cronologia com tecnicoId sem Usuario correspondente — migration abortada, nada foi alterado', n;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Troca do alvo das três FKs. Os índices existentes não são tocados, e
--    NENHUM valor de coluna é escrito.
-- ---------------------------------------------------------------------------
ALTER TABLE "propostas" DROP CONSTRAINT "propostas_vendedorId_fkey";
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_vendedorId_fkey"
  FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instalacoes" DROP CONSTRAINT "instalacoes_tecnicoResponsavelId_fkey";
ALTER TABLE "instalacoes" ADD CONSTRAINT "instalacoes_tecnicoResponsavelId_fkey"
  FOREIGN KEY ("tecnicoResponsavelId") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instalacao_registros" DROP CONSTRAINT "instalacao_registros_tecnicoId_fkey";
ALTER TABLE "instalacao_registros" ADD CONSTRAINT "instalacao_registros_tecnicoId_fkey"
  FOREIGN KEY ("tecnicoId") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. GUARDA POSTERIOR. Prova, dentro da própria transação, que as três FKs
--    apontam para `usuarios` e que nenhuma sobrou apontando para o legado.
-- ---------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM pg_constraint con
    JOIN pg_class confrel ON confrel.oid = con.confrelid
   WHERE con.contype = 'f' AND confrel.relname = 'usuarios';
  IF n <> 3 THEN
    RAISE EXCEPTION
      '[usuarios] esperadas 3 FKs apontando para usuarios, encontradas % — migration abortada, nada foi alterado', n;
  END IF;

  SELECT count(*) INTO n
    FROM pg_constraint con
    JOIN pg_class confrel ON confrel.oid = con.confrelid
   WHERE con.contype = 'f' AND confrel.relname IN ('vendedores', 'tecnicos');
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] ainda restam % FK(s) apontando para vendedores/tecnicos — migration abortada, nada foi alterado', n;
  END IF;

  -- R3: as três precisam ser RESTRICT ('r'). Nenhuma pode ter ficado SET NULL.
  SELECT count(*) INTO n
    FROM pg_constraint con
    JOIN pg_class confrel ON confrel.oid = con.confrelid
   WHERE con.contype = 'f' AND confrel.relname = 'usuarios'
     AND con.confdeltype <> 'r';
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] % FK(s) para usuarios sem ON DELETE RESTRICT — migration abortada, nada foi alterado', n;
  END IF;
END $$;
