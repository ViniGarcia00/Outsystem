-- Sprint 4.2 — consolidação de "Vinicius" em "Vinicius Garcia" (ADR-0410).
--
-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ ESTA MIGRATION É UMA DECISÃO HUMANA SOBRE DUAS PESSOAS ESPECÍFICAS.        ║
-- ║ NÃO é uma regra, NÃO é uma heurística, NÃO é generalizável.                ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
--
-- APROVADA em 2026-08-26 pelo dono do produto, contra esta auditoria:
--
--   usuarios (3 linhas, criadas pela M1 a partir dos cadastros antigos)
--     cmrf506fv00085sooe4qbu9dw  Carlos Gomes     ehVendedor
--     cmrf51tt400095soowvrqfkl2  Vinicius Garcia  ehVendedor  (ex-Vendedor)
--     2169f741-...-59f2c2f4a44a  Vinicius         ehTecnico   (ex-Técnico)
--
--   vínculos do absorvido: 0 propostas, 0 instalações, 3 registros
--   vínculos do sobrevivente: 2 propostas, 0 registros
--
-- POR QUE ISTO NÃO ESTÁ NA M1. "Vinicius" e "Vinicius Garcia" são chaves
-- DISTINTAS por qualquer normalização defensável. Fundi-las exigiria casamento
-- por prefixo — que também fundiria "Carlos" com "Carlos Gomes". Essa é a
-- heurística obscura que a decisão do projeto proíbe (ADR-0408, mantido pelo
-- ADR-0410). As migrations estruturais (M1-M3) não contêm uma única linha de
-- lógica baseada em nome; toda consolidação vive aqui, isolada e assinada.
--
-- ┌─ COMO ESTA MIGRATION É SEGURA EM OUTRO BANCO ─────────────────────────────┐
-- │                                                                           │
-- │  OS IDS SÃO O SELETOR. OS NOMES SÃO APENAS ASSERÇÃO.                      │
-- │                                                                           │
-- │  Nenhuma linha é escolhida por nome. As duas pessoas são endereçadas       │
-- │  pelos ids literais abaixo — um cuid e um uuid, globalmente únicos, que    │
-- │  não existem em nenhum outro banco. Os nomes aparecem SOMENTE dentro de    │
-- │  verificações, para confirmar que a premissa auditada segue válida.        │
-- │                                                                           │
-- │  Restauração com conteúdo diferente → os ids não existem → G1 retorna e    │
-- │  NADA acontece. Dois registros chamados "Vinicius" e "Vinicius Garcia"     │
-- │  em outro banco, com outros ids, JAMAIS seriam fundidos: esta migration    │
-- │  nem chega a ler o nome deles.                                            │
-- │                                                                           │
-- │  Duas semânticas de guarda, deliberadamente diferentes:                   │
-- │    G1      ids ausentes (outro banco)      → RETURN silencioso            │
-- │    G2..G6  ids presentes, estado estranho  → RAISE EXCEPTION, aborta tudo │
-- │                                                                           │
-- │  Banco diferente não é erro. Banco igual em estado inesperado é.          │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- O QUE NÃO É TOCADO: instalacao_registros."responsavelNome". Os 3 registros
-- continuam dizendo "Vinicius", que é o que a cronologia sempre afirmou. É
-- justamente essa preservação que torna a fusão segura: o VÍNCULO passa a
-- apontar para a identidade correta, e o SNAPSHOT preserva o fato histórico
-- (ADR-0408). A coluna não aparece em nenhum SET deste arquivo.

DO $$
DECLARE
  -- SELETORES. Valores literais da base Outmat, auditados em 2026-08-26.
  ID_ABSORVIDO    CONSTANT text := '2169f741-dad5-4034-af76-59f2c2f4a44a';
  ID_SOBREVIVENTE CONSTANT text := 'cmrf51tt400095soowvrqfkl2';

  -- ASSERÇÕES. Nunca usadas para selecionar — só para verificar a premissa.
  NOME_ABSORVIDO      CONSTANT text := 'Vinicius';
  NOME_SOBREVIVENTE   CONSTANT text := 'Vinicius Garcia';
  REGISTROS_ESPERADOS CONSTANT int  := 3;

  n       int;
  v_nome  text;
  v_ativo boolean;
  v_vend  boolean;
  v_tec   boolean;
BEGIN
  -- ── G1: os dois ids existem? Se não, é OUTRO BANCO. Nada a consolidar. ────
  SELECT count(*) INTO n
    FROM "usuarios" WHERE "id" IN (ID_ABSORVIDO, ID_SOBREVIVENTE);
  IF n <> 2 THEN
    RAISE NOTICE
      '[consolidacao] ids da base Outmat nao encontrados (% de 2) — nada a consolidar, migration encerrada sem alteracao', n;
    RETURN;
  END IF;

  -- ── G2: o ABSORVIDO ainda é quem a auditoria descreveu? ──────────────────
  SELECT "nome", "ativo", "ehVendedor", "ehTecnico"
    INTO v_nome, v_ativo, v_vend, v_tec
    FROM "usuarios" WHERE "id" = ID_ABSORVIDO;

  IF v_nome <> NOME_ABSORVIDO THEN
    RAISE EXCEPTION
      '[consolidacao] usuario absorvido mudou de nome (esperado "%", encontrado "%") — a premissa auditada nao vale mais; migration abortada, nada foi alterado',
      NOME_ABSORVIDO, v_nome;
  END IF;
  IF v_tec <> true OR v_vend <> false THEN
    RAISE EXCEPTION
      '[consolidacao] usuario absorvido tem papeis inesperados (ehVendedor=%, ehTecnico=%) — migration abortada, nada foi alterado',
      v_vend, v_tec;
  END IF;

  -- ── G3: o SOBREVIVENTE ainda é quem a auditoria descreveu? ───────────────
  SELECT "nome", "ativo", "ehVendedor", "ehTecnico"
    INTO v_nome, v_ativo, v_vend, v_tec
    FROM "usuarios" WHERE "id" = ID_SOBREVIVENTE;

  IF v_nome <> NOME_SOBREVIVENTE THEN
    RAISE EXCEPTION
      '[consolidacao] usuario sobrevivente mudou de nome (esperado "%", encontrado "%") — migration abortada, nada foi alterado',
      NOME_SOBREVIVENTE, v_nome;
  END IF;
  IF v_vend <> true THEN
    RAISE EXCEPTION
      '[consolidacao] usuario sobrevivente perdeu o papel de vendedor — migration abortada, nada foi alterado';
  END IF;
  IF v_ativo <> true THEN
    RAISE EXCEPTION
      '[consolidacao] usuario sobrevivente esta inativo — fundir para dentro de um cadastro inativo esconderia a pessoa dos dois fluxos; migration abortada, nada foi alterado';
  END IF;

  -- ── G4: os vínculos batem exatamente com os auditados? ───────────────────
  SELECT count(*) INTO n FROM "propostas" WHERE "vendedorId" = ID_ABSORVIDO;
  IF n <> 0 THEN
    RAISE EXCEPTION
      '[consolidacao] absorvido tem % proposta(s), a auditoria registrou 0 — migration abortada, nada foi alterado', n;
  END IF;

  SELECT count(*) INTO n FROM "instalacoes" WHERE "tecnicoResponsavelId" = ID_ABSORVIDO;
  IF n <> 0 THEN
    RAISE EXCEPTION
      '[consolidacao] absorvido e responsavel por % instalacao(oes), a auditoria registrou 0 — migration abortada, nada foi alterado', n;
  END IF;

  SELECT count(*) INTO n FROM "instalacao_registros" WHERE "tecnicoId" = ID_ABSORVIDO;
  IF n <> REGISTROS_ESPERADOS THEN
    RAISE EXCEPTION
      '[consolidacao] absorvido tem % registro(s) na cronologia, a auditoria registrou % — migration abortada, nada foi alterado',
      n, REGISTROS_ESPERADOS;
  END IF;

  -- O sobrevivente não pode ter registros próprios: senão a contagem da G6,
  -- depois do repontamento, deixaria de ser exata.
  SELECT count(*) INTO n FROM "instalacao_registros" WHERE "tecnicoId" = ID_SOBREVIVENTE;
  IF n <> 0 THEN
    RAISE EXCEPTION
      '[consolidacao] sobrevivente ja tem % registro(s) proprio(s), a auditoria registrou 0 — migration abortada, nada foi alterado', n;
  END IF;

  -- ═══ AÇÕES ═══════════════════════════════════════════════════════════════

  -- 1. O sobrevivente acumula o papel de técnico. `ehVendedor` não é tocado.
  UPDATE "usuarios"
     SET "ehTecnico" = true, "updatedAt" = now()
   WHERE "id" = ID_SOBREVIVENTE;

  -- 2. Reponta APENAS o vínculo dos registros.
  --    "responsavelNome" NÃO APARECE NESTE SET, de propósito: os 3 registros
  --    continuam dizendo "Vinicius". O vínculo passa a apontar para a
  --    identidade correta; o snapshot preserva o fato (ADR-0408).
  UPDATE "instalacao_registros"
     SET "tecnicoId" = ID_SOBREVIVENTE
   WHERE "tecnicoId" = ID_ABSORVIDO;

  -- ── G5: nenhuma referência pode restar antes do DELETE ───────────────────
  SELECT (SELECT count(*) FROM "propostas"            WHERE "vendedorId"           = ID_ABSORVIDO)
       + (SELECT count(*) FROM "instalacoes"          WHERE "tecnicoResponsavelId" = ID_ABSORVIDO)
       + (SELECT count(*) FROM "instalacao_registros" WHERE "tecnicoId"            = ID_ABSORVIDO)
    INTO n;
  IF n <> 0 THEN
    RAISE EXCEPTION
      '[consolidacao] ainda restam % referencia(s) ao usuario absorvido — migration abortada, nada foi alterado', n;
  END IF;

  -- ── G6: os snapshots históricos continuam intactos ───────────────────────
  SELECT count(*) INTO n
    FROM "instalacao_registros"
   WHERE "tecnicoId" = ID_SOBREVIVENTE
     AND "responsavelNome" = NOME_ABSORVIDO;
  IF n <> REGISTROS_ESPERADOS THEN
    RAISE EXCEPTION
      '[consolidacao] esperados % registros com responsavelNome "%", encontrados % — o snapshot historico foi alterado; migration abortada, nada foi alterado',
      REGISTROS_ESPERADOS, NOME_ABSORVIDO, n;
  END IF;

  -- 3. Só agora o absorvido sai. As três FKs são Restrict: se a G5 tivesse
  --    falhado em enxergar algo, o banco recusaria este DELETE de qualquer jeito.
  DELETE FROM "usuarios" WHERE "id" = ID_ABSORVIDO;

  RAISE NOTICE
    '[consolidacao] "%" absorvido em "%": % registro(s) repontado(s), snapshots preservados',
    NOME_ABSORVIDO, NOME_SOBREVIVENTE, REGISTROS_ESPERADOS;
END $$;
