# Sprint 2.2 — Seções + Produtos na Revisão (design/spec)

> Data: 2026-07-07 · Versão alvo: 0.5.0
> Base: ADR-0206 (conteúdo comercial vive na Revisão). A Proposta passa a ser um
> **workspace**.

## Objetivo

Montar o conteúdo comercial **dentro da revisão atual**: **Seções** (agrupadores
neutros de itens) e **Produtos** (itens com snapshot). Criar revisão copia todo o
conteúdo; duplicar copia o conteúdo para a nova Rev.0.

## Fora de escopo (2.2)

Serviços, totais, cálculos, descontos, frete, impostos, PDF, preview, comparação
entre revisões, drag-and-drop. (Reordenação por **Mover ↑ / ↓**.)

## Decisões aprovadas

1. **Rotas:** `/propostas` (listagem) · `/propostas/nova` · `/propostas/[id]`
   (**workspace**) · `/propostas/[id]/editar` (formulário de cabeçalho — o
   `PropostaForm` atual, apenas muda de rota). "Editar" da listagem abre o
   workspace; no workspace, "Editar dados da proposta" leva a `/editar`.
2. **Conteúdo vive na revisão** (ADR-0206).
3. **Snapshot do item** + `produtoId` (navegável; ADR-0104 ativa).
4. **Nova revisão** copia profundamente (seções, ordem, itens, snapshots,
   quantidades); revisão anterior **imutável**.
5. **Duplicação** cria nova proposta + Rev.0 com cópia do conteúdo atual.
6. **Workspace** mostra apenas: cabeçalho resumido + revisão atual + editor de
   conteúdo (sem telas intermediárias).
7. **Edição** só na revisão atual e proposta não cancelada; histórico read-only.
8. **Reordenação:** Mover ↑ / ↓.
9. **Produto usado em proposta não pode ser excluído** (orientar "Inativar").
10. **`tipo` no item** desde já (`PRODUTO`/`SERVICO`, default `PRODUTO`); o editor
    exibe apenas produtos.

## 1. Schema (migration aditiva)

### Enum novo

- `enum TipoItemProposta { PRODUTO, SERVICO }`

### `PropostaSecao` (campos adicionados)

- `nome String` — nome da seção (ex.: "Sala", "Cozinha"). Agrupador **neutro**
  (nunca "Ambiente" internamente).
- `ordem Int @default(0)`.

### `PropostaItem` (campos adicionados)

- `tipo TipoItemProposta @default(PRODUTO)`
- `produtoId String?` — FK → `Produto`, **`onDelete: Restrict`** (navegável ao
  cadastro; itens de produto sempre preenchem). `@@index([produtoId])`.
- **Snapshot:** `codigo String`, `descricao String`, `unidade String`,
  `valorProduto Decimal @db.Decimal(12,2)`, `valorServico Decimal @db.Decimal(12,2)`.
- `quantidade Decimal @db.Decimal(12,3) @default(1)` — permite frações (cabo,
  fibra, metros, litros, kg…).
- `ordem Int @default(0)`

### `Produto` (cadastro — campo adicionado)

- `unidade String @default("UN")` — unidade de medida (UN, MT, CX, RL, L, KG…),
  editável no formulário de produto. É a origem do snapshot `unidade` do item.
- Back-relation `itens PropostaItem[]`.

> As tabelas `proposta_secoes`/`proposta_itens` estão vazias (as propostas do
> seed têm Rev.0 sem conteúdo), então colunas NOT NULL são seguras.

## 2. Serviço de conteúdo (`proposta-conteudo.service.ts`)

Todas as operações validam: proposta **não cancelada** e a seção/item pertence à
**revisão atual** (defesa em profundidade). Cada mutação grava auditoria
`ALTERACAO` (com observação) + atualiza `Proposta.updatedAt`, na mesma transação.

- `getWorkspace(propostaId)` → cabeçalho resumido + `readOnly` + seções (com
  itens) da revisão atual (Decimais → number).
- **Seções:** `adicionarSecao(propostaId, nome)`, `renomearSecao(secaoId, nome)`,
  `removerSecao(secaoId)`, `moverSecao(secaoId, "UP"|"DOWN")`.
- **Itens:** `adicionarItem(secaoId, produtoId, quantidade)` — snapshot de
  `codigo/descricao/unidade/valorProduto/valorServico` a partir do `Produto`,
  `tipo=PRODUTO`; `atualizarQuantidade(itemId, quantidade)`;
  `removerItem(itemId)`; `moverItem(itemId, "UP"|"DOWN")`.

### Ordenação (regra explícita)

- `ordem` é **única dentro da seção** (itens) e **dentro da revisão** (seções),
  **contígua** a partir de 0 (0,1,2,3…), **sem buracos**.
- Adicionar → `ordem = quantidade atual` (append ao fim).
- Remover → **renumera** os remanescentes sequencialmente.
- Mover ↑/↓ → troca com o vizinho e mantém a sequência contígua.

### Alterações em `proposta.service.ts`

- **`criarRevisao`**: cópia profunda das seções+itens da revisão atual para a
  nova revisão (recria seções mantendo `ordem`; recria itens com snapshot,
  `produtoId`, `quantidade`, `ordem`, `tipo`). Nova vira atual; anterior imutável.
- **`duplicarProposta`**: após criar a nova proposta + Rev.0, copia o conteúdo da
  revisão atual da origem para a nova Rev.0.

### Alteração em `produto.service.ts` (ADR-0104 ativa)

- `removeProduto(id)`: se `prisma.propostaItem.count({ where: { produtoId } }) > 0`
  → lança `CANNOT_DELETE_USED_IN_PROPOSTAS` ("… Utilize a opção Inativar.").

## 3. UX / rotas

- **`/propostas/[id]` (workspace):** `AppPage` com `PageHeader`
  ("Proposta 1001 · Rev.0", status badge, ação "Editar dados da proposta" →
  `/editar`), um **cartão de cabeçalho resumido** e o **editor de conteúdo**.
  O cabeçalho resumido inclui: **proposalNumber, Rev.N, Status, Data de emissão**
  (`emitidaAt`, quando existir), além de cliente/vendedor/modelo/validade.
- **`/propostas/[id]/editar`:** o `PropostaForm` atual (cabeçalho), sem mudanças
  além da rota; após salvar, volta ao workspace `/propostas/[id]`.
- Listagem: "Editar" → `/propostas/[id]`.

## 4. Editor de conteúdo (client + Server Actions + `router.refresh()`)

Servidor é a fonte da verdade (página `force-dynamic`). Após cada operação, a
action revalida e o client faz `router.refresh()` — sem estado de conteúdo no
cliente.

- **Seções** em cards: nome (editável inline), Mover ↑/↓, Remover, "Adicionar
  produto".
- **Adicionar produto:** diálogo com `Select` de produtos **ativos** + `NumberField`
  de quantidade → cria item (snapshot).
- **Itens** (linhas): código, descrição, **valor unitário** (`formatCurrency`),
  quantidade, Mover ↑/↓, Remover. **Sem** total de linha nem somatórios.
- **Read-only** quando cancelada ou revisão histórica: exibe o conteúdo sem
  controles de edição.
- Reuso: `Card`, `Select`, `NumberField`, `ConfirmDialog`, `Badge`, `Button`.
  Novos componentes de domínio: `proposta-workspace.tsx`, `secao-card.tsx`,
  `adicionar-item-dialog.tsx`, `conteudo-actions.ts`.

## 5. Auditoria

Cada mutação de conteúdo → `PropostaAuditoria` (`ALTERACAO`) com observação
descritiva (ex.: `Seção "Sala" adicionada`, `Produto RTR-001 adicionado`) +
`revisionNumber`, na mesma transação. Sem tela de histórico (mantém).

## 6. Seed

Adicionar conteúdo de exemplo a 1 proposta do seed (1–2 seções com alguns
produtos) para o workspace não nascer vazio.

## 7. Qualidade / testes

Gate completo (lint, typecheck, build, smoke, health, diagnostics). Smoke test
novo: abrir workspace de uma proposta, adicionar uma seção e um produto.

## 8. Documentação / ADRs

Atualizar README, PROJECT_CONTEXT, ARCHITECTURE, CHANGELOG, PROJECT_HISTORY,
DECISIONS, VERSION (0.5.0). **ADRs:** ADR-0207 (item = snapshot + `produtoId`
RESTRICT + `tipo`; exclusão de produto bloqueada — ADR-0104 ativa), ADR-0208
(cópia profunda de conteúdo em nova revisão e na duplicação).

## Critério de aceite

Seções e produtos dentro da revisão atual; snapshot + `produtoId`; nova revisão e
duplicação copiam o conteúdo; revisão histórica read-only; produto usado não
pode ser excluído; workspace funcionando; gate verde; commit.
