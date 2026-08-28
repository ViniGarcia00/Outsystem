# Sprint 4.3 — Aprovação de Proposta, Apelido de Instalação e Anexos de Registro

- **Versão:** 1.5.1 → **1.6.0**
- **Branch:** `sprint-4.3` (nasceu de `9848643`, hash final da 1.5.1)
- **Data do plano:** 2026-08-27
- **ADRs previstas:** ADR-0412 (aprovação), ADR-0413 (apelido + redirect), ADR-0414 (anexos)
- **Status:** aguardando aprovação — **nenhuma linha de código escrita**

---

## 1. Invariantes que esta Sprint não pode quebrar

Checar a cada task, não só no fim:

1. **Clean Architecture + Feature-First.** Regra pura em `features/*`, IO em
   `services/*`, Server Actions como fronteira. Nenhum componente importa Prisma.
2. **ADR-0409 — três suítes separadas.** Unidade sem banco; integração para o que
   só a consulta real distingue; E2E para o que só a tela alcança.
3. **TDD.** Teste vermelho antes da implementação. Onde a mudança é refatoração
   de comportamento existente, vale o **teste de caracterização** primeiro (fixa o
   comportamento atual) e depois o refactor — está sinalizado nas tasks em que se
   aplica.
4. **Snapshots históricos intactos.** `PropostaItem` (ADR-0207), endereço da
   Instalação e `responsavelNome` (ADR-0400/0408) não mudam.
5. **Usuário único com papéis** (ADR-0410) — guardas de papel inalteradas.
6. **Paths por env.** Nenhum caminho fixo. Todo acesso a disco via
   `resolveWithin(storagePaths.upload, …)`.
7. **Cleanup E2E** (ADR-0403) fecha com resíduo zero — agora também em disco.
8. **Proposta e Instalação nunca são excluídas** — canceladas.
9. **Documentos e contrato fora de escopo.** Nada de PDF, DOCX ou template.

**Não iniciar:** Pedido de Venda, Ordem de Serviço, autenticação, permissões,
módulo de custos, atualização de Next.js ou de dependências, refatoração não
relacionada.

---

## 2. Ordem, dependências e por quê

```
FASE A — Propostas
  T1  ADRs + plano
  T2  fork por revisão congelada        ← REGRA CRÍTICA, antes de tudo
  T3  migration (enum + aprovadaEm)          depende: T2
  T4  service aprovar/desfazer               depende: T3
  T5  teste de segurança do ciclo            depende: T4
  T6  UI workspace + listagem                depende: T4
  T7  dashboard "Aprovadas"                  depende: T4
  T8  E2E de aprovação                       depende: T6

FASE B — Apelido
  T9  migration + backfill
  T10 schema, service, DTOs                  depende: T9
  T11 UX de sugestão na criação              depende: T10
  T12 listagem + busca                       depende: T10
  T13 E2E de apelido                         depende: T11, T12

FASE C — Redirect
  T14 redirects + toast "Abrir" + E2E        depende: T13

FASE D — Anexos
  T15 SPIKE Route Handler 8 MB          ← RISCO #1, antes de qualquer regra
  T16 migration da tabela                    depende: T15
  T17 módulo puro (validação/nomes/caminhos) depende: T16
  T18 service + integração de agregado       depende: T17
  T19 route handlers (upload/download)       depende: T18
  T20 UI no card do registro                 depende: T19
  T21 cascade + limpeza física pós-commit    depende: T18
  T22 cleanup E2E (banco + disco)            depende: T21
  T23 E2E de anexos                          depende: T20, T22

FASE E — Fechamento
  T24 documentação final
  T25 VERSION 1.6.0 + gate oficial
```

**T2 antes de T3/T4 é inegociável.** Habilitar `APROVADA` sem trocar o gatilho do
fork faz `salvarProposta` cair fora do `if`, e o `deleteMany` de seções
**sobrescreve in-place o conteúdo que o cliente aprovou**. Perda silenciosa de
dado. T2 é comportamentalmente neutra hoje (`emittedAt != null` ⟺
`status === "EMITIDA"`), o que permite provar que nada mudou antes de a nova
semântica existir.

**T15 antes de T16.** O limite padrão de corpo de Server Action é 1 MB e
`next.config.ts` está vazio. Se o Route Handler não resolver, a modelagem inteira
dos anexos muda de forma. Descobrir isso na T19 custa a fase inteira.

---

## 3. Gate

**Gate de task** (roda ao fim de cada task, antes do commit):

| | Sempre | Quando a task toca |
|---|---|---|
| `npm run lint` | ✔ | |
| `npm run typecheck` | ✔ | |
| `npm run build` | ✔ | |
| `npm run test` | ✔ | |
| `npm run test:integration` | | service, schema Prisma, migration |
| `npm run test:e2e` | | UI, rota, action, cleanup |

**Gate de release** (T25): os 14 itens de `docs/CHECKLIST_RELEASE.md`.

---

## 4. Migrations

| Arquivo | Conteúdo |
|---|---|
| `prisma/migrations/20260827000000_proposta_aprovacao/migration.sql` | `ALTER TYPE "StatusProposta" ADD VALUE 'APROVADA';` + `ALTER TABLE "proposta_revisoes" ADD COLUMN "aprovadaEm" TIMESTAMP(3);` |
| `prisma/migrations/20260827010000_instalacao_apelido/migration.sql` | `ALTER TABLE "instalacoes" ADD COLUMN "apelido" TEXT;` + backfill |
| `prisma/migrations/20260827020000_instalacao_registro_anexos/migration.sql` | `CREATE TABLE "instalacao_registro_anexos"` + FK `ON DELETE CASCADE` + índice |

**Nenhuma migração de dados entre estruturas** → a auditoria pré/pós do ADR-0410
**não se aplica**. O backfill do apelido deriva de coluna existente na mesma
tabela-alvo; não move vínculo.

**Risco conhecido — `ALTER TYPE … ADD VALUE`.** No PostgreSQL o valor novo não
pode ser *usado* na mesma transação em que é criado. A migration só o **cria**
(não insere nem compara), então o par numa transação é seguro no PG 18.
**Fallback**, se `migrate deploy` reclamar: separar em
`20260827000000_proposta_status_aprovada` (só o `ADD VALUE`) e
`20260827005000_proposta_revisao_aprovada_em` (só a coluna).

**Backfill do apelido:**

```sql
UPDATE "instalacoes" i
SET "apelido" = COALESCE(
  NULLIF(TRIM(CASE WHEN c."tipoPessoa" = 'PJ'
                   THEN COALESCE(c.empresa, c.nome)
                   ELSE COALESCE(c.nome, c.empresa) END), ''),
  'Instalação ' || i.numero::text)
FROM "clientes" c
WHERE c.id = i."clienteId" AND i."apelido" IS NULL;
```

O `COALESCE` externo cobre o cliente sem nome nenhum — sem ele a listagem
mostraria célula vazia na coluna de identificação principal.

---

## FASE A — Propostas: status APROVADA

### T1 — ADRs e abertura da Sprint

- **Alterar:** `DECISIONS.md` (ADR-0412, ADR-0413, ADR-0414)
- **Criar:** este plano (`docs/superpowers/plans/2026-08-27-…md`)
- **ADR-0412** registra: a aprovação é fato da **revisão**; `Proposta.status` é
  **projeção** da revisão atual; **não existe `Proposta.aprovadaAt`**; fork passa
  a depender de revisão congelada; alteração de proposta aprovada volta a
  `RASCUNHO`. **Supersede parcial do ADR-0211**, restrito ao bullet "*status
  reduzido a RASCUNHO · EMITIDA · CANCELADA (removidos APROVADA/REPROVADA)*" — o
  resto do ADR-0211 (workspace-first, sem seletor manual de status) **é
  reafirmado**: `Aprovar` é ação com guarda, não `<select>`.
- **Testes:** nenhum. **Gate:** lint/typecheck/build/unit.
- **Commit:** `docs(adr): ADR-0412..0414 e abertura da Sprint 4.3`

### T2 — Fork passa a depender da revisão congelada 🔴 REGRA CRÍTICA

- **Alterar:** `src/services/proposta.service.ts`
- **Criar:** `src/services/proposta.service.integration.test.ts`
- **Mudança:**

```ts
// select de salvarProposta
currentRevision: { select: { revisionNumber: true, emittedAt: true } },

- if (p.status === "EMITIDA") {
+ // Revisão congelada NUNCA é alterada in-place. `emittedAt` é a fonte de
+ // verdade do congelamento; o status é projeção dele (ADR-0412).
+ if (p.currentRevision?.emittedAt) {
```

- **Método: teste de caracterização, não TDD clássico.** A mudança é neutra por
  construção. A ordem é: (1) escrever os testes contra o código **atual** e
  vê-los **passar** — eles fixam o comportamento; (2) trocar a condição; (3) os
  mesmos testes continuam passando. Escrever um teste vermelho aqui exigiria
  inventar um comportamento que ainda não existe.
- **Testes (integração):** EMITIDA + salvar → forka, `Rev.N+1`, status
  `RASCUNHO`, `Rev.N.emittedAt` preservado · RASCUNHO + salvar → **não** forka,
  mesma revisão · CANCELADA + salvar → recusa.
- **Gate:** completo + integração.
- **Commit:** `refactor(proposta): fork depende da revisao congelada, nao do status`

### T3 — Migration: enum `APROVADA` + `PropostaRevisao.aprovadaEm`

- **Alterar:** `prisma/schema.prisma`
- **Criar:** `prisma/migrations/20260827000000_proposta_aprovacao/migration.sql`
- **Schema:** `APROVADA` no enum + `aprovadaEm DateTime?` em `PropostaRevisao`,
  com doc-comment explicando que é **fato histórico, nunca reescrito por
  edição** — só a ação Desfazer o limpa, e só na revisão atual.
- `npx prisma generate`
- **Nota:** `StatusProposta` em `proposta.service.ts` é união **escrita à mão**,
  independente do enum gerado. Esta task não quebra o typecheck; a T4 sim.
- **Testes:** integração — a coluna existe, aceita nulo, default nulo.
- **Gate:** completo + integração.
- **Commit:** `feat(db): status APROVADA e PropostaRevisao.aprovadaEm`

### T4 — Service: aprovar e desfazer

- **Alterar:** `src/services/proposta.service.ts`, `src/features/propostas/labels.ts`
- **Criar:** `src/services/proposta-aprovacao.integration.test.ts`
- **API nova:**

```ts
export type StatusProposta = "RASCUNHO" | "EMITIDA" | "APROVADA" | "CANCELADA";

/** Aprova o conteúdo da revisão ATUAL. Só a partir de EMITIDA. */
export async function aprovarProposta(id: string): Promise<void>;

/** Correção de engano. Só a partir de APROVADA; limpa a revisão atual. */
export async function desfazerAprovacao(id: string): Promise<void>;
```

- **Guardas de `aprovarProposta`:** status **deve** ser `EMITIDA` (RASCUNHO →
  "Gere o documento antes de aprovar"; APROVADA → "já aprovada"; CANCELADA →
  recusa); `currentRevisionId` existe; `currentRevision.emittedAt != null`
  (defesa em profundidade). Grava `aprovadaEm = now` **na revisão**, `status =
  APROVADA` **na proposta**, e `MUDANCA_STATUS` "EMITIDA → APROVADA" na **mesma
  transação**.
- **Guardas de `desfazerAprovacao`:** status deve ser `APROVADA`. Limpa
  `currentRevision.aprovadaEm`, status → `EMITIDA`, audita "APROVADA → EMITIDA".
  **Só toca a revisão atual** — revisões anteriores são imutáveis.
- **`emitirProposta`:** a guarda "já está emitida" passa a cobrir `APROVADA`.
- **`duplicarProposta`:** **nenhuma mudança** — já cria `Rev.0` nova, cujo
  `aprovadaEm` nasce nulo. Coberto por teste, não por alteração.
- **`listPropostas`:** seleciona `currentRevision.aprovadaEm`; `PropostaListItem`
  ganha `aprovadaEm: Date | null`.
- **`labels.ts` entra aqui, não na T6.** Os três `Record<StatusProposta, …>`
  quebram o typecheck no instante em que a união cresce, e o gate da T4 seria
  impossível de satisfazer sem isso. É a lição da Task 19 antecipada da Sprint
  4.2, aplicada de propósito. Badge: **`success`** (verde, ADR-0159 — já existe).
- **Testes (integração, TDD):** aprovar de EMITIDA grava na revisão · aprovar de
  RASCUNHO recusa · aprovar de CANCELADA recusa · aprovar duas vezes recusa ·
  desfazer de APROVADA limpa e volta a EMITIDA · desfazer de EMITIDA recusa ·
  emitir proposta APROVADA recusa · duplicar APROVADA gera RASCUNHO com
  `aprovadaEm` nulo · auditoria gravada na mesma transação.
- **Gate:** completo + integração.
- **Commit:** `feat(proposta): aprovar e desfazer aprovacao, com o fato na revisao`

### T5 — Teste de segurança do ciclo completo 🔴 REQUISITO DA SPRINT

- **Alterar:** `src/services/proposta-aprovacao.integration.test.ts`
- **Cenário exigido:**

```
Rev.N RASCUNHO → emitir → aprovar → editar → cria Rev.N+1 RASCUNHO

Rev.N:    emittedAt preservado · aprovadaEm preservado · conteúdo IMUTÁVEL
Rev.N+1:  emittedAt = null     · aprovadaEm = null
Proposta: status = RASCUNHO    · currentRevisionId = Rev.N+1
```

- **"Conteúdo imutável" é asserção literal:** capturar seções e itens da `Rev.N`
  **antes** da edição e comparar campo a campo **depois** — nome, ordem, código,
  descrição, unidade, `valorProduto`, `valorServico`, `quantidade`. Sem isso o
  teste provaria só que a revisão existe, não que ninguém a tocou.
- **Discriminância obrigatória:** reverter a condição da T2 para
  `status === "EMITIDA"` e registrar no `PROJECT_HISTORY.md` que o teste **falha**;
  restaurar e ver passar. Um teste de segurança que passa nas duas versões não
  está protegendo nada.
- **Gate:** completo + integração.
- **Commit:** `test(integration): revisao aprovada nunca e alterada in-place`

### T6 — UI: workspace, actions e listagem

- **Alterar:** `src/features/propostas/actions.ts`,
  `src/features/propostas/proposta-workspace.tsx`,
  `src/features/propostas/propostas-list.tsx`,
  `src/services/proposta-conteudo.service.ts`
- **Actions:** `aprovarPropostaAction`, `desfazerAprovacaoAction` — padrão
  `ActionResult` + `revalidatePath`.
- **Workspace:** botão **"Aprovar proposta"** só em `EMITIDA`; **"Desfazer
  aprovação"** (`variant="outline"`) só em `APROVADA`, com `ConfirmDialog`;
  aviso "Aprovada em DD/MM/AAAA HH:mm" no bloco de status; `readOnly` inalterado
  (APROVADA continua editável — editar é o que a invalida).
- **Guardas dos 4 documentos:** os blocos `data.status === "EMITIDA"` viram
  `data.status !== "RASCUNHO"`, senão os botões de documento **somem** quando a
  proposta é aprovada. `podeEmitir` continua exigindo `RASCUNHO` — sem mudança.
- 🔴 **`STATUS_ORDER` em `propostas-list.tsx:48` é array literal — o typecheck
  NÃO pega.** Item de checklist manual: adicionar `"APROVADA"`. Sem isso o
  status some do filtro sem erro nenhum.
- **Coluna/badge** de status já derivam de `labels.ts` (T4).
- **Testes:** unidade nos rótulos/ordem; o resto é E2E (T8).
- **Gate:** completo.
- **Commit:** `feat(proposta): acoes de aprovar e desfazer no workspace`

### T7 — Dashboard: contador "Aprovadas"

- **Alterar:** `src/features/dashboard/dashboard.ts`,
  `src/features/dashboard/dashboard.test.ts`,
  `src/features/dashboard/dashboard-view.tsx`, `e2e/dashboard.spec.ts`
- `DashboardDTO.propostas` passa de `{rascunho, emitidas}` para
  `{rascunho, emitidas, aprovadas}`.
- **`dashboard.service.ts` não muda** — o `groupBy` por status já devolve todas
  as linhas; quem escolhe o que conta é o módulo puro. É a fronteira do ADR-0405
  funcionando.
- **Não reintroduzir "Custos acumulados"** (removido na 1.5.0, ADR-0410).
- **Testes (unidade, TDD):** `montarDashboard` conta aprovadas; zero quando não há.
- **Gate:** completo + E2E.
- **Commit:** `feat(dashboard): contador de propostas aprovadas`

### T8 — E2E de aprovação

- **Alterar:** `e2e/smoke.spec.ts`
- **Cenários:** criar → emitir → **Aprovar** → badge "Aprovada" na listagem e no
  workspace → editar e salvar → volta a **"Rascunho"** com `Rev.N+1` no título ·
  emitir → aprovar → **Desfazer aprovação** → volta a "Emitida" · botão "Aprovar"
  **ausente** em Rascunho.
- Dados criados pelo próprio teste, marcador `E2E ` (ADR-0403).
- **Gate:** completo + E2E.
- **Commit:** `test(e2e): aprovacao, invalidacao por edicao e desfazer`

---

## FASE B — Instalações: Apelido

### T9 — Migration + backfill

- **Alterar:** `prisma/schema.prisma`
- **Criar:** `prisma/migrations/20260827010000_instalacao_apelido/migration.sql`
- Doc-comment obrigatório: **não é o `nomeProjeto` removido na 4.0.3
  (ADR-0404)** — aquele era texto solto sem regra; este nasce sugerido pelo
  Cliente e é a identificação principal na listagem. O comentário existe para que
  ninguém leia a coluna como uma reversão daquela decisão.
- **Testes:** integração — coluna existe; backfill não deixou nulo nem vazio.
- **Commit:** `feat(db): Instalacao.apelido com backfill pelo nome do cliente`

### T10 — Schema, service e DTOs

- **Alterar:** `src/features/instalacoes/schema.ts`,
  `src/services/instalacao.service.ts`
- `apelido` entra em **`camposComuns`** → vale para `novaInstalacaoSchema` **e**
  `cabecalhoInstalacaoSchema` (editável depois). Obrigatório, `min(1)`, `max(80)`.
- `InstalacaoInput`, `InstalacaoListItem`, `InstalacaoDetalhe` ganham `apelido`.
- **`toData()`** ganha `apelido: input.apelido.trim()` — ponto único de escrita,
  já compartilhado por criação e edição.
- **Endereço continua fora do schema** (ADR-0400) — não relaxar.
- **Testes:** unidade no schema (obrigatório, trim, limite); integração
  (criar/atualizar persistem, o endereço segue derivado do Cliente).
- **Commit:** `feat(instalacoes): apelido no schema, service e DTOs`

### T11 — UX: sugestão de três estados na criação

- **Alterar:** `src/features/instalacoes/nova-instalacao-form.tsx`
- **Regra:** *nunca tocado* → escolher Cliente preenche com o nome dele ·
  *tocado* → trocar de Cliente **não sobrescreve**, e aparece a dica
  "Apelido mantido. Sugestão para este cliente: …" · *esvaziado* → volta a
  "nunca tocado" e a próxima escolha re-sugere.
- Sinal de "tocado" via `form.formState.dirtyFields.apelido`; a lógica entra no
  `handleCliente`, que já é assíncrono e já faz `setValue`.
- **Não editável no workspace? Não** — é editável (T10 já o colocou em
  `cabecalhoInstalacaoSchema`); o campo aparece no
  `instalacao-workspace.tsx` junto de "Dados da instalação".
- **Alterar também:** `src/features/instalacoes/instalacao-workspace.tsx`
- **Testes:** E2E (T13) — é comportamento de formulário.
- **Commit:** `feat(instalacoes): apelido sugerido pelo cliente, sem sobrescrever edicao`

### T12 — Listagem: identificação principal e busca

- **Alterar:** `src/features/instalacoes/instalacoes-list.tsx`
- Coluna **Apelido** em 1º, `font-medium`, **`<Link>`** para o workspace.
- **Número continua `<Link>`**, coluna estreita — o ADR-0404 decidiu que ele é a
  porta de entrada, com `<a>` real (Tab, foco, Ctrl+clique) e rejeição explícita
  de `onClick` na `<tr>`. Remover o link seria reverter aquilo sem ADR.
- **Cliente permanece** como coluna secundária.
- `searchAccessor` ganha `apelido`; a normalização de acento vem do
  `useCrudList` → `utils/busca` (fonte única, ADR-0402).
- **Commit:** `feat(instalacoes): apelido como identificacao principal na listagem`

### T13 — E2E de apelido

- **Alterar:** `e2e/instalacoes.spec.ts`
- **Cenários:** selecionar Cliente sugere o nome · editar e trocar de Cliente
  **preserva** o texto editado · esvaziar e trocar de Cliente **re-sugere** ·
  Apelido aparece como link na listagem e abre o workspace · busca encontra por
  apelido **sem acento** · editar o apelido no workspace persiste.
- **Commit:** `test(e2e): apelido — sugestao, preservacao e busca`

---

## FASE C — Redirect de Instalações

### T14 — Redirects + toast com ação, e a prova do que NÃO muda

- **Alterar:** `src/features/instalacoes/nova-instalacao-form.tsx`,
  `src/features/instalacoes/instalacao-workspace.tsx`, `e2e/instalacoes.spec.ts`
- **Criação:** `router.push('/instalacoes/${id}')` → `router.push("/instalacoes")`,
  com toast `{ action: { label: "Abrir", onClick: () => router.push(...) } }` —
  devolve o atalho que o redirect tira.
- **Edição:** `router.refresh()` → `router.push("/instalacoes")`. O
  `form.reset(values)` que precede **permanece** (limpa o dirty antes de navegar).
- **Cancelar instalação continua com `router.refresh()`** — não é "salvar".
  Registrado para não mudar por descuido.
- **`setStatus(values.status)` fica sem efeito visível** (a página sai). Remover
  na mesma task, com comentário — código sem propósito não fica.
- **As actions já revalidam `/instalacoes`** — nenhuma mudança de servidor.
- 🔴 **E2E obrigatório do negativo:** salvar/criar/editar **Registro** permanece
  no workspace. Asserção explícita de que a URL **continua** em
  `/instalacoes/<id>` depois de salvar um registro. É a regra que mais facilmente
  se quebra por engano numa refatoração futura.
- **Commit:** `feat(instalacoes): salvar dados gerais volta para a listagem`

---

## FASE D — Anexos de Registro

### T15 — SPIKE: Route Handler com arquivo de 8 MB 🔴 RISCO #1

- **Criar (temporário):** rota de teste + script de upload
- **Objetivo:** provar, **antes de qualquer modelagem**, que um `POST`
  `multipart/form-data` de **8 MB** chega íntegro a um Route Handler
  (`runtime = "nodejs"`) sem tocar em `next.config.ts`.
- **Critério:** bytes recebidos == bytes enviados; sem erro de limite.
- **Se falhar:** parar e reportar. As alternativas (streaming, chunking) mudam a
  forma da fase inteira e precisam de decisão sua.
- **Ao fim:** o spike é **removido**; o que sobrevive é o conhecimento e o
  registro no `PROJECT_HISTORY.md`. Nada temporário entra no commit final.
- **Commit:** nenhum (ou `chore: spike de upload` revertido na mesma task)

### T16 — Migration da tabela

- **Alterar:** `prisma/schema.prisma`
- **Criar:** `prisma/migrations/20260827020000_instalacao_registro_anexos/migration.sql`

```prisma
model InstalacaoRegistroAnexo {
  id              String   @id @default(cuid())
  registroId      String
  registro        InstalacaoRegistro @relation(fields: [registroId], references: [id], onDelete: Cascade)
  nomeOriginal    String
  nomeArmazenado  String
  caminhoRelativo String
  mimeType        String
  tamanho         Int
  createdAt       DateTime @default(now())

  @@index([registroId])
  @@map("instalacao_registro_anexos")
}
```

- `InstalacaoRegistro` ganha `anexos InstalacaoRegistroAnexo[]`.
- **`caminhoRelativo` é sempre relativo a `storagePaths.upload`, separadores
  POSIX.** Caminho absoluto nunca é persistido — ele depende do servidor e de
  `UPLOAD_PATH`, que mudam entre ambientes.
- **Commit:** `feat(db): InstalacaoRegistroAnexo (1:N por registro)`

### T17 — Módulo puro: validação, nome físico e caminho

- **Criar:** `src/features/instalacoes/anexos.ts`,
  `src/features/instalacoes/anexos.test.ts`

```ts
export const MIME_ACEITOS = {
  "image/jpeg": "jpg", "image/png": "png",
  "image/webp": "webp", "application/pdf": "pdf",
} as const;
export const MAX_BYTES = 10 * 1024 * 1024;   // 10 MB
export const MAX_POR_REGISTRO = 10;

export function extensaoDe(mime: string): string | null;
export function nomeFisico(id: string, mime: string): string;      // `${id}.${ext}`
export function caminhoRelativoDe(instalacaoId, registroId, nomeFisico): string;
export function validarArquivo(a: { mime: string; tamanho: number }): string | null;
export function sanitizarNomeOriginal(nome: string): string;       // trim + 255
```

- **A extensão vem SEMPRE da allowlist de MIME, nunca do nome enviado.** É o que
  impede `foto.jpg.exe` de virar arquivo executável em disco.
- **Testes (unidade, TDD):** MIME fora da lista recusa · tamanho no limite passa,
  acima recusa · zero bytes recusa · `nomeFisico` ignora a extensão do nome
  original · `caminhoRelativoDe` nunca produz `..` nem `/` inicial ·
  `sanitizarNomeOriginal` corta em 255 e preserva acentos.
- **Commit:** `feat(instalacoes): modulo puro de validacao e caminho de anexos`

### T18 — Service de anexos + integração de agregado

- **Criar:** `src/services/instalacao-anexo.service.ts`,
  `src/services/instalacao-anexo.integration.test.ts`

```ts
export async function criarAnexo(instalacaoId, registroId, file: File): Promise<AnexoDTO>;
export async function listarAnexos(instalacaoId, registroId): Promise<AnexoDTO[]>;
export async function lerAnexo(instalacaoId, registroId, anexoId): Promise<{ data: Buffer; mimeType: string; nomeOriginal: string } | null>;
export async function excluirAnexo(instalacaoId, registroId, anexoId): Promise<void>;
```

- **Toda resolução é pelo agregado completo:**
  `where: { id: anexoId, registro: { id: registroId, instalacaoId } }`. Não
  pertencer devolve o **mesmo** "não encontrado" de um id inexistente — não
  vazar a diferença é parte da garantia.
- **Ordem do upload:** validar → contar (`MAX_POR_REGISTRO`) → `mkdir recursive`
  → `writeFile` → `create` no banco. Falha no banco: `unlink` best-effort em
  `catch`, com log, e **rethrow**.
- **Ordem da exclusão:** resolver pelo agregado → `delete` da linha → `unlink`
  best-effort. Falha no `unlink`: log, **sem** lançar.
- **Invariante, escrita no doc-comment:** *o banco é a autoridade; arquivo órfão
  é tolerado e logável, linha apontando para arquivo inexistente é o estado a
  evitar.* É ela que fixa a ordem das duas operações.
- **Todo acesso a disco via `resolveWithin(storagePaths.upload, caminhoRelativo)`.**
- **Testes (integração, TDD) — pares cruzados discriminantes:** anexo de outro
  registro → não encontrado · registro de outra instalação → não encontrado ·
  anexo certo + instalação errada → não encontrado · anexo certo + registro certo
  + instalação certa → encontrado · 11º anexo recusado · MIME inválido recusado ·
  falha de banco não deixa linha. **Provar discriminância**: removida a condição
  do agregado, os três primeiros falham; restaurada, passam — e registrar isso.
- **Commit:** `feat(instalacoes): service de anexos com resolucao por agregado`

### T19 — Route Handlers de upload e download

- **Criar:** `src/app/instalacoes/[id]/registros/[registroId]/anexos/route.ts` (POST),
  `src/app/instalacoes/[id]/registros/[registroId]/anexos/[anexoId]/route.ts` (GET)
- `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- **Upload por Route Handler, não Server Action** — e **`next.config.ts` não é
  tocado**: o limite global de Server Actions fica como está.
- **Download:** `Content-Type` **derivado da allowlist**, nunca ecoando o valor
  guardado; `X-Content-Type-Options: nosniff`; `Content-Disposition` com
  `filename*=UTF-8''<encodeURIComponent>`; `attachment` para PDF, `inline` para
  imagem.
- **Sem regra de negócio na rota** — orquestra e trata erro, como
  `/propostas/[id]/contrato` (ADR-0330).
- **Testes:** unidade nos handlers (o projeto já testa route handlers); o fluxo
  real é E2E (T23).
- **Commit:** `feat(instalacoes): rotas de upload e download de anexos`

### T20 — UI: anexos no card do registro

- **Criar:** `src/features/instalacoes/anexos-editor.tsx`,
  `src/features/instalacoes/anexo-actions.ts`
- **Alterar:** `src/features/instalacoes/registro-card.tsx`,
  `src/features/instalacoes/cronologia.tsx`
- 🟡 **Decisão de UX que preciso confirmar (§7).** Os anexos vivem **no card do
  registro**, não no diálogo de criar/editar. Razão: o diálogo cria o registro e
  os custos numa transação, mas um anexo precisa de um `registroId` que **ainda
  não existe** durante a criação. Anexar pelo card elimina área de staging,
  elimina arquivo órfão de diálogo abandonado, e funciona igual para registro
  novo e existente.
- Seção "Anexos" no card: lista (nome original, tamanho, tipo), link de download,
  botão excluir com `ConfirmDialog`, e "Adicionar anexo" (`<input type="file">`
  com `accept` derivado de `MIME_ACEITOS`).
- Botões `type="button"` — o card vive dentro do `<form>` do workspace.
- `excluirAnexoAction` como Server Action (só apaga linha — sem problema de
  limite de corpo); o **upload** vai por `fetch` para o Route Handler.
- **Commit:** `feat(instalacoes): anexos no card do registro`

### T21 — Exclusão de registro: cascade + limpeza física

- **Alterar:** `src/services/instalacao-registro.service.ts`,
  `src/services/instalacao-registro.integration.test.ts`
- **A regra de custos continua valendo** — `REGISTRO_COM_CUSTOS` bloqueia como
  hoje. **Anexo não vira um segundo bloqueio:** o bloqueio de custos existe por
  razão financeira (ADR-0401), que não se aplica a arquivo.
- Se a exclusão é permitida: linhas saem por **cascade**; a pasta
  `instalacoes/<id>/registros/<registroId>/` é removida **pós-commit**,
  best-effort, com log — nunca dentro da transação.
- **Cancelar Instalação não remove anexos.**
- **Testes (integração):** excluir registro sem custos apaga as linhas de anexo ·
  com custos continua bloqueado e **os anexos permanecem** · cancelar instalação
  preserva anexos.
- **Commit:** `feat(instalacoes): exclusao de registro leva os anexos junto`

### T22 — Cleanup E2E: banco e disco

- **Alterar:** `e2e/support/limpeza.ts`
- `instalacao_registro_anexos` entra em `ContagemResiduos` e no `DELETE`
  **antes** de `instalacao_registros` (ordem explícita, ADR-0403).
- **Arquivos físicos:** antes do `DELETE`, coletar os `caminhoRelativo` das
  instalações E2E e remover as pastas correspondentes.
- 🟡 **Duplicação aceita e documentada:** `limpeza.ts` vive fora de `src/` e
  **não pode importar** `storagePaths` (ADR-0403). Ela re-deriva a raiz de
  `process.env.UPLOAD_PATH ?? join(STORAGE_PATH ?? "./storage", "uploads")` — a
  mesma regra de `paths.ts`, escrita duas vezes de propósito. **Guarda
  obrigatória:** recusar apagar qualquer caminho fora da raiz resolvida, além
  das três guardas de ambiente que já existem.
- **A verificação é a recontagem** — e passa a incluir "nenhuma pasta E2E
  sobrando em disco".
- **Commit:** `test(e2e): cleanup remove anexos do banco e do disco`

### T23 — E2E de anexos

- **Alterar:** `e2e/instalacoes.spec.ts`
- **Cenários:** anexar imagem a um registro → aparece na lista com nome e
  tamanho · link de download presente e responde 200 com o `Content-Type` certo ·
  excluir anexo → some · arquivo de tipo não aceito → mensagem de erro · excluir
  registro sem custos → anexos somem · registro com custos segue bloqueado.
- **Commit:** `test(e2e): anexos de registro — upload, download e exclusao`

---

## FASE E — Fechamento

### T24 — Documentação final

- **Alterar:** `ARCHITECTURE.md` (nova entidade, camada de anexos, rotas),
  `PROJECT_CONTEXT.md`, `VISION.md` (regras de aprovação e de apelido),
  `README.md` (se as rotas novas entrarem na tabela), `BACKLOG.md`,
  `PROJECT_HISTORY.md` (entrada da Sprint, com as provas de discriminância)
- **Commit:** `docs: arquitetura, contexto e historico da Sprint 4.3`

### T25 — VERSION 1.6.0 e gate oficial

- **Alterar:** `VERSION`, `package.json`, `CHANGELOG.md`
- Gate completo dos 14 itens.
- **Commit:** `chore(release): 1.6.0 — Sprint 4.3 aprovacao, apelido e anexos`
- Depois: commit documental com o hash, como na 1.5.0 e na 1.5.1.

---

## 5. Interfaces entre tasks

| Produtor | Consome | Contrato |
|---|---|---|
| T2 | T4 | `salvarProposta` forka por `emittedAt` — T4 confia nisso e não re-testa |
| T3 | T4 | `PropostaRevisao.aprovadaEm` no client Prisma |
| T4 | T6, T7, T8 | `aprovarProposta`/`desfazerAprovacao`; `StatusProposta` com `APROVADA`; `PropostaListItem.aprovadaEm`; `labels.ts` completo |
| T4 | T5 | mesma API; T5 só acrescenta cenário |
| T9 | T10 | coluna `apelido` populada |
| T10 | T11, T12 | `apelido` em schema, `InstalacaoInput`, `ListItem`, `Detalhe` |
| T15 | T16..T19 | prova de que o Route Handler aceita 8 MB |
| T17 | T18, T19, T20 | `MIME_ACEITOS`, `MAX_*`, `nomeFisico`, `caminhoRelativoDe`, `validarArquivo` |
| T18 | T19, T20, T21 | `criarAnexo`/`listarAnexos`/`lerAnexo`/`excluirAnexo` + resolução por agregado |
| T18 | T22 | formato de `caminhoRelativo` (a limpeza depende dele) |

---

## 6. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | **Sobrescrever in-place o conteúdo aprovado** se o fork não mudar antes de `APROVADA` | Baixa | **Crítico** — perda silenciosa de dado | T2 antes de T3/T4; T5 com discriminância provada |
| R2 | **Limite de 1 MB** de corpo derruba o upload | Média | Alto — remodela a Fase D | T15 é spike isolado, antes da modelagem |
| R3 | `STATUS_ORDER` (array literal) esquecido — status some do filtro **sem erro** | Média | Médio | Item de checklist na T6 + cenário E2E na T8 |
| R4 | Outro contador/`Record` de status não mapeado quebra o gate | Média | Baixo | Foi o que aconteceu na 1.5.1 (`render.test.ts`); rodar as suítes cedo em vez de mapear exaustivamente |
| R5 | `ALTER TYPE … ADD VALUE` em transação | Baixa | Médio | Fallback de duas migrations já escrito (§4) |
| R6 | Anexo órfão em disco após falha | Média | Baixo | É o lado **tolerado** do invariante; logado |
| R7 | Cleanup E2E não apaga arquivos → passivo em disco | Média | Médio | T22 conta e verifica disco, não só banco |
| R8 | Duplicação da derivação de `UPLOAD_PATH` em `limpeza.ts` diverge de `paths.ts` | Baixa | Baixo | Documentada, com guarda de raiz; ADR-0403 proíbe o import |
| R9 | Escopo grande (3 domínios, 25 tasks) | Alta | Médio | Fases independentes; a Fase D pode virar 1.7.0 sem quebrar as outras |

---

## 7. Decisões que preciso confirmar antes de começar

| # | Assunto | Recomendação |
|---|---|---|
| **D1** | **Onde os anexos são gerenciados** | **No card do registro**, não no diálogo — o diálogo cria registro+custos numa transação e o anexo precisa de um `registroId` que ainda não existe. Evita staging e arquivo órfão de diálogo abandonado. |
| **D2** | Apelido é **editável** no workspace depois da criação | **Sim** — é rótulo interno; renomear tem de ser possível. Já refletido em T10/T11. |
| **D3** | Se a Fase D (anexos) estourar, ela vira **1.7.0** | Fases independentes; decidir só se acontecer. |

---

## 8. Resumo

**25 tasks · 3 migrations · 3 ADRs · ~27 commits planejados.**

Ordem inegociável: **T2 antes de T3/T4** (integridade do conteúdo aprovado) e
**T15 antes de T16** (viabilidade do upload).
