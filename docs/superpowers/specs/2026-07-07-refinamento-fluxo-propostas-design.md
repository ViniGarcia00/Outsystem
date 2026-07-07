# Design — Refinamento do fluxo de Propostas (pré-Sprint 2.3)

- **Data:** 2026-07-07
- **Status:** aprovado nas duas decisões-chave; aguardando revisão final do spec.
- **Escopo:** refinamento funcional do módulo de Propostas **antes** de adicionar
  Serviços. Unifica criação/edição em um **workspace único**, torna a criação de
  revisões **100% automática** e simplifica o ciclo de status. **Não** inclui
  geração de PDF binário, Serviços, totais/cálculos nem tela de histórico.

---

## 1. Decisões aprovadas

1. **Persistência = auto-save contínuo + "Gerar PDF".** Em RASCUNHO tudo salva
   sozinho (cabeçalho no blur de cada campo; conteúdo por operação, como já é).
   **Não existe botão "Salvar"** — nunca há nada pendente. A ação principal do
   rodapé é **"Gerar PDF"** (emitir). Preserva a auditoria granular e elimina o
   risco de perder trabalho.
2. **Numeração imediata (eager).** Ao clicar em **"Nova Proposta"**, o sistema já
   cria a proposta completa e atribui o próximo número sequencial. `proposalNumber`
   permanece `Int @unique @default(autoincrement())` (**sem alteração**). Consumir
   um número que depois seja cancelado/nunca emitido é aceitável — comportamento
   esperado de ERP. **Sem** numeração lazy, casca, número nullable, propostas
   invisíveis ou limpeza de cascas.
3. **`clienteId` nullable é um estado TEMPORÁRIO de montagem — não uma mudança
   conceitual do domínio.** A regra de negócio permanece: **"toda proposta válida
   deve possuir um cliente."** O schema aceita `clienteId String?` apenas para
   permitir criar a proposta (e seu número) *antes* de o usuário escolher o
   cliente no workspace. Enquanto o cliente estiver ausente, a proposta é tratada
   como **incompleta**: aviso visual, edição permitida, **emissão bloqueada**. O
   `null` só pode existir durante a montagem de um rascunho — nunca é um conceito
   permanente.

**Defaults assumidos (vetáveis nesta revisão):**

- **Gerar PDF** implementa **já** a semântica *emitir + congelar* (EMITIDA +
  `emitidaAt`). O **PDF binário real fica para uma Sprint futura**; o botão hoje
  executa a emissão (e, quando o PDF existir, passa a também renderizá-lo).
- **Toast não-bloqueante** ao ocorrer o fork automático ("Rev.N criada
  automaticamente").
- **Guardas do Gerar PDF:** exige cliente definido e ao menos 1 item.
- **Remoção** dos valores de enum `APROVADA`/`REPROVADA` e das colunas
  `aprovadaAt`/`reprovadaAt` (dados de dev descartáveis).

---

## 2. Fluxo alvo

```
Nova Proposta
   └─ cria a proposta COMPLETA já numerada (proposalNumber = próximo,
      status = RASCUNHO, Rev.0, cliente ainda vazio) e abre o Workspace único
Workspace (RASCUNHO)
   ├─ Cabeçalho editável (Modelo, Cliente, Vendedor, Validade, Observações)
   │     → auto-save por campo
   ├─ Seções + Produtos (auto-save por operação, como hoje)
   └─ [ Gerar PDF ]
         → valida (cliente + ≥1 item); status → EMITIDA; emitidaAt; congela a revisão
Workspace (EMITIDA)
   └─ qualquer alteração (cabeçalho OU conteúdo)
         → 1ª vez: cria Rev.N+1 (copia conteúdo), vira revisão atual,
           status → RASCUNHO (fork automático); toast "Rev.N criada"
         → alterações seguintes ocorrem na mesma Rev.N enquanto em RASCUNHO
Cancelar (qualquer status ≠ CANCELADA) → CANCELADA (como hoje; read-only)
```

Status mantidos: **RASCUNHO · EMITIDA · CANCELADA**.

---

## 3. Modelagem (Prisma)

- **`Proposta.proposalNumber`**: **inalterado** — `Int @unique
  @default(autoincrement())`. Numeração imediata na criação.
- **`Proposta.clienteId`**: passa a `String?` (opcional); relação `cliente
  Cliente?`. Exigido apenas na emissão.
- **`enum StatusProposta`**: remover `APROVADA` e `REPROVADA` (Postgres exige
  recriar o tipo com `USING`).
- **`Proposta.aprovadaAt` / `Proposta.reprovadaAt`**: remover.
- **`enum EventoAuditoria`**: adicionar `EMISSAO`.
- **`PropostaRevisao.emittedAt DateTime?`** (novo): marca quando *aquela* revisão
  foi emitida — base do histórico de versões e do PDF futuro, sem retrabalho.

> Nada some de `PropostaItem`/`PropostaSecao`. O campo `tipo` (PRODUTO/SERVICO)
> permanece preparado para Serviços.

---

## 4. Services

### 4.1 `ensureEditableRevision(tx, propostaId) → { revisaoId, revisionNumber, idMap }`
Ponto único de estrangulamento chamado por **toda** mutação (cabeçalho e conteúdo):

- `CANCELADA` → erro.
- `RASCUNHO` → devolve a revisão atual (`idMap` vazio).
- `EMITIDA` → cria `Rev.N+1`, **copia o conteúdo em profundidade**
  (`copiarConteudo` já existe), torna-a a revisão atual, `status → RASCUNHO`,
  audita `NOVA_REVISAO` (observação "automática — pós-emissão") + `MUDANCA_STATUS`
  (`EMITIDA → RASCUNHO`), e devolve **`idMap` (id-antigo → id-novo)**.

**Tratamento do `idMap` (o único trecho sutil):** quando a 1ª alteração pós-emissão
é sobre uma seção/item **existente** (ex.: mudar quantidade, remover, mover), o id
enviado pelo cliente pertence à revisão congelada. A cópia gera ids novos; a
operação **retraduz seu alvo** pelo `idMap` antes de aplicar. Adicionar seção/item
não precisa de tradução. `copiarConteudo` passa a **retornar o mapa** (seções e
itens).

### 4.2 `emitirProposta(id)` (novo)
- Valida `status === RASCUNHO`, `clienteId` presente e **≥ 1 item** na revisão
  atual.
- `status → EMITIDA`, `emitidaAt = now` (imutável na 1ª vez), `PropostaRevisao
  .emittedAt = now` na revisão atual.
- Audita `EMISSAO`.
- (Futuro) gera e persiste o PDF da revisão.

### 4.3 `criarProposta` → cria a proposta completa já numerada
- Cria `Proposta` com `proposalNumber` (autoincrement), `status = RASCUNHO`,
  defaults (`modelo`, `validadeDias`), `clienteId = null`, `vendedorId = null`;
  cria `Rev.0`; aponta `currentRevisionId`; audita `CRIACAO`. Devolve o `id` para
  redirecionar ao workspace. **Sem formulário/entrada prévia.**

### 4.4 `updateCabecalho(id, campos)` (substitui `updateProposta`)
- Auto-save do cabeçalho (cliente/vendedor/modelo/validade/obs). Chama
  `ensureEditableRevision` (fork se EMITIDA). Sem campo `status` (status é 100%
  sistêmico). Audita `ALTERACAO`.

### 4.5 Conteúdo (`proposta-conteudo.service`)
- `contextoProposta/contextoSecao/contextoItem` passam a usar
  `ensureEditableRevision` (fork + `idMap`) em vez de só validar a revisão atual.
- Demais regras (ordenação contígua, auditoria granular) inalteradas.

### 4.6 Removidos
- `criarRevisao` público e `criarRevisaoAction` (absorvidos por
  `ensureEditableRevision`).
- Select/transições manuais de status; `statusOptionsFor`.

### 4.7 `duplicarProposta`
- Mantido. Cria a cópia como proposta completa já numerada (autoincrement),
  status RASCUNHO, copiando o conteúdo da revisão atual da origem para a nova
  Rev.0.

---

## 5. Server Actions

- **Novas:** `emitirPropostaAction`, `criarPropostaAction` (cria a proposta
  completa já numerada e devolve o `id` para redirecionar), `salvarCabecalhoAction`
  (auto-save por campo/bloco).
- **Removidas:** `criarRevisaoAction`; o `createPropostaAction`/`updatePropostaAction`
  atuais são substituídos pelo par acima.
- `conteudo-actions` inalteradas em assinatura (o fork acontece no service).

---

## 6. Rotas

| Rota | Depois |
|---|---|
| `/propostas` | Listagem (todas as propostas, como hoje). "Nova proposta" chama `criarPropostaAction` e redireciona ao workspace. Cliente pode aparecer vazio em rascunho recém-criado. |
| `/propostas/[id]` | **Workspace único** (cabeçalho editável + conteúdo + Gerar PDF). Criar/editar/revisar. |
| `/propostas/[id]/editar` | **Removida.** |
| `/propostas/nova` | **Removida** (ou vira apenas o disparo do rascunho). |

---

## 7. UX (Workspace)

- **Cabeçalho editável inline:** Modelo (linha inteira), Cliente (autocomplete —
  vazio em rascunho recém-criado), Vendedor, Validade, Observações — cada campo
  auto-salva no blur.
- **Cliente em foco automático:** ao abrir o workspace de uma proposta **sem
  cliente**, o campo Cliente recebe foco automaticamente.
- **Aviso de proposta incompleta:** enquanto `clienteId` for nulo, exibir um
  aviso visual (ex.: banner/alerta discreto) — *"Proposta incompleta: informe o
  cliente para poder emitir."* A edição continua livre; o usuário pode fechar e
  voltar depois. O aviso some assim que o cliente é definido.
- **Indicador de auto-save (novo):** texto de confiança no topo/rodapé do
  workspace informando que não há botão "Salvar". Estado padrão: *"Todas as
  alterações são salvas automaticamente."*; após cada gravação bem-sucedida:
  *"Última alteração salva às HH:mm."* (atualiza a cada auto-save de cabeçalho ou
  conteúdo). Some quando CANCELADA (read-only).
- **Conteúdo:** seções + produtos como hoje (auto-save por operação).
- **Rodapé:** botão primário **"Gerar PDF"** (desabilitado/tooltip se faltar
  cliente ou itens).
- **EMITIDA não é read-only:** editável; a 1ª edição forka. Badge "Emitida" +
  dica sutil ("Editar criará automaticamente a Rev.N+1"). Ao forkar, **toast**
  "Rev.N criada automaticamente — você está editando um novo rascunho".
- **CANCELADA:** read-only (como hoje).
- `getWorkspace` passa a devolver os **ids** do cabeçalho (clienteId/vendedorId) +
  label inicial do cliente, para edição inline.

---

## 8. Auditoria

- `CRIACAO` (nova proposta já numerada), `ALTERACAO` (cabeçalho/conteúdo,
  granular), `NOVA_REVISAO`
  (agora sempre automática, observação "pós-emissão"), `EMISSAO` (novo),
  `MUDANCA_STATUS` (EMITIDA↔RASCUNHO), `DUPLICACAO`, `CANCELAMENTO`.
- Granularidade preservada (decisiva na escolha do auto-save).

---

## 9. Plano de migração (Prisma 7, aditivo/controlado)

1. `emittedAt` em `PropostaRevisao` (aditivo).
2. `EMISSAO` no enum `EventoAuditoria` (aditivo).
3. `Proposta.clienteId` → nullable (`DROP NOT NULL`). `proposalNumber`
   **inalterado** (segue autoincrement).
4. Recriar `StatusProposta` sem `APROVADA`/`REPROVADA` (com `USING`); mapear
   eventuais linhas remanescentes → `EMITIDA` (não deve haver em dev).
5. Remover colunas `aprovadaAt`/`reprovadaAt`.

Seed continua **não-destrutivo** (ADR-0209); ajustar exemplos para o novo ciclo
(sem APROVADA/REPROVADA; propostas de exemplo já numeradas).

---

## 10. Fora de escopo (confirmado)

PDF binário real, Serviços, totais/cálculos, descontos/frete/impostos, preview,
comparação entre revisões, tela de histórico de auditoria/versões, drag-and-drop.

---

## 11. Critérios de aceite

1. "Nova proposta" cria a proposta já numerada (próximo sequencial), status
   RASCUNHO, Rev.0, cliente vazio, e abre o workspace — sem etapa de cabeçalho.
   O campo Cliente recebe foco e um aviso de "proposta incompleta" aparece até o
   cliente ser informado; a emissão fica bloqueada nesse estado.
2. Em RASCUNHO, cabeçalho e conteúdo salvam sozinhos; não há botão "Salvar"; o
   indicador de auto-save mostra "Última alteração salva às HH:mm".
3. "Gerar PDF" exige cliente + ≥1 item, emite (EMITIDA + `emitidaAt` +
   `revisao.emittedAt`) e congela a revisão.
4. Editar uma proposta EMITIDA cria automaticamente Rev.N+1 (conteúdo copiado),
   volta a RASCUNHO e mostra o toast; a 2ª edição em diante fica na mesma revisão.
5. Editar uma seção/item existente como 1ª alteração pós-emissão aplica no item
   correto da nova revisão (via `idMap`).
6. Não existe botão "Nova Revisão"; status nunca é escolhido manualmente.
7. Cancelar funciona como hoje; CANCELADA é read-only.
8. Gate verde: lint, typecheck, build, smoke (atualizado ao novo fluxo),
   `/api/health`, `/dev/diagnostics`.

---

## 12. Riscos / pontos de atenção

- **`idMap` no fork:** único trecho sutil; exige teste explícito (editar item
  existente como 1ª ação pós-emissão).
- **`clienteId` nullable:** ajustar `getWorkspace`/`listPropostas`/DTOs para
  cliente ausente (exibir "—"/"Sem cliente"); a guarda do "Gerar PDF" garante a
  exigência na emissão.
- **Migração do enum de status:** recriação de tipo no Postgres; validar em dev.
- **Smoke atual** cria proposta via cabeçalho — precisa ser reescrito para o
  fluxo de workspace único.
