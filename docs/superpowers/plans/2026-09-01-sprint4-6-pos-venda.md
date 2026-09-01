# Sprint 4.6 — Módulo Pós-venda (plano de execução)

Design: `docs/superpowers/specs/2026-09-01-sprint4-6-pos-venda-design.md`
Branch: `sprint-4.6-pos-venda` · Versão alvo: **1.9.0**

---

## T1 — Auditoria (sem código)

Ler antes de escrever: `prisma/schema.prisma`, o módulo de Instalações inteiro
(feature + services + rotas de anexo + E2E), `lib/navigation.ts`,
`utils/busca.ts`, `infrastructure/storage/paths.ts`, `e2e/support/limpeza.ts`,
`docs/CHECKLIST_RELEASE.md` e as convenções de migration.

**Saída:** o design acima, com as quatro decisões que a Sprint precisa tomar
(separação dos dois processos, cardinalidade, origem derivada, guardas de
finalização) e a lista do que fica fora de escopo.

## T2 — Banco

- Cinco enums e doze models `pos_venda_*` no `schema.prisma` (seis por
  processo, incluindo a auditoria exigida pela spec §46), com back-relations
  em `Cliente`, `Produto` e `Usuario` (lado inverso, sem DDL).
- Migration **aditiva** `20260901000000_pos_venda`: gerada por `migrate diff`,
  com `SERIAL` trocado por `INTEGER` + duas sequências nomeadas
  `RESTART WITH 1001`, na convenção da migration de Instalações.
- `migrate deploy`, `migrate status`, `migrate diff` (deve sair vazio),
  `prisma generate`.

**Prova:** `migrate diff` sem drift; sequências começando em 1001.

## T3 — Fonte única dos anexos (ADR-0421)

Extrair os primitivos neutros para `src/lib/anexos.ts`;
`features/instalacoes/anexos.ts` re-exporta e mantém seus caminhos.

**Prova:** `features/instalacoes/anexos.test.ts` verde **sem uma linha
alterada**. Se precisar mudar o teste, não é extração — é refatoração, e sai do
escopo.

## T4 — Módulos puros do Pós-venda

`labels.ts` (status, destinatário, origem derivada, categorias),
`itens.ts` (XOR, quantidades, pendência, `itensParaOS`), `custos.ts` (totais de
UM agregado), `anexos.ts` (caminhos por submódulo). Testes de unidade junto.

**Prova:** os dois casos do briefing viram teste — fechadura 1/1/0 e
interruptores 7/7/5 → 7/7/7.

## T5 — Services

`pos-venda-troca.service`, `pos-venda-troca-registro.service`,
`pos-venda-os.service`, `pos-venda-os-registro.service`,
`pos-venda-anexo.service` (um só, com uma `PortaAnexo` por agregado).

Invariantes obrigatórios: numeração por sequência, auditoria na mesma transação,
pertencimento ao agregado em toda operação, snapshot de responsável, custos
nunca somados entre agregados, guardas de finalização.

Correção legítima no escopo: `removeUsuario` passa a contar sete relações.

## T6 — Schemas e Server Actions

Zod por submódulo + schema de registro compartilhado. Actions traduzem erro e
convertem data-hora; a regra fica no service, sempre.

## T7 — Interface

Compartilhado (`timeline`, `registro-dialog`, `custos-editor`, `anexos-editor`,
`resumo-custos`, `cancelar-dialog`, `produto-dialog`) recebendo por prop o que
varia — sem nenhum `if` de submódulo. Domínio explícito em `trocas/` e
`ordens-servico/`. Hub, rotas e Route Handlers de anexo.

Menu: `Pós-venda` entre Instalações e Usuários, apontando para o hub. Atualizar
`navigation.test.ts`.

## T8 — Testes de integração

Três arquivos, contra o PostgreSQL real. O que só eles provam: condições de
consulta (pertencimento, reconciliação por id), a assimetria do invariante de
anexo em disco, e o **teste crítico do snapshot** 7/7/5 → OS 5 → Troca 7/7/7 →
OS continua 5.

## T9 — E2E e limpeza

`e2e/pos-venda.spec.ts` com os cenários da spec §57–§63.
`e2e/support/limpeza.ts` passa a contar e apagar as doze tabelas e as pastas
físicas dos dois submódulos — ordens de serviço **antes** das trocas.

**Prova:** resíduo zero em banco **e** em disco na saída do `globalTeardown`.

Testes antigos legitimamente afetados: o smoke que trava a ordem do menu.

## T10 — Documentação, versão e gate

DECISIONS (ADR-0418..0421), ARCHITECTURE §4.8, PROJECT_CONTEXT, VISION, BACKLOG,
CHECKLIST_RELEASE, CHANGELOG, VERSION e `package.json` em 1.9.0
(`package-lock.json` **não** é tocado — o repositório nunca o sincronizou).

Gate completo do `CHECKLIST_RELEASE`, com as evidências no `PROJECT_HISTORY`.

---

## Fora de escopo (parar e reportar se aparecer)

Estoque, número de série, garantia, financeiro, mudança estrutural em Cliente ou
Produto, papel novo de Usuário, múltiplas OS por Troca, sincronização Troca → OS,
migration destrutiva, alteração de autenticação/permissões, refactor global e
cards de Dashboard.
