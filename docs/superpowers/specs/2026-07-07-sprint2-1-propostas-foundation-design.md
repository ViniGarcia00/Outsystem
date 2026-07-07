# Sprint 2.1 — Fundação do Módulo de Propostas (design/spec)

> Data: 2026-07-07 · Versão alvo: 0.4.0
> Escopo: **somente a fundação da Proposta**. SEM produtos, serviços, seções,
> PDF, preview, totais, cálculos, desconto, frete, impostos.

## Objetivo

Permitir: criar, editar, criar revisões, cancelar, duplicar, pesquisar e alterar
status de propostas. Nada além disso.

## Decisões-chave (aprovadas)

1. **Campos do cabeçalho na `Proposta`** (não na revisão) — respeita a Sprint 0
   (`clienteId/vendedorId/modelo` já estão na Proposta). Revisões versionam o
   **conteúdo** (seções/itens) das próximas Sprints; nesta Sprint uma revisão é
   um marcador de versão.
2. **Numeração via sequência do PostgreSQL** (`proposalNumber` autoincrement,
   sequência iniciada em **1001**). Atômica, nunca reutiliza.
3. **Validade em dias** (`validadeDias Int @default(5)`).

## 1. Modelagem (migration aditiva — não remodelar)

### Enums novos

- `StatusProposta { RASCUNHO, EMITIDA, APROVADA, REPROVADA, CANCELADA }`
- `MotivoCancelamento { CLIENTE_DESISTIU, CONCORRENCIA, PROJETO_CANCELADO, ERRO_PROPOSTA, PROPOSTA_SUBSTITUIDA, OUTRO }`
- `EventoAuditoria { CRIACAO, ALTERACAO, NOVA_REVISAO, DUPLICACAO, MUDANCA_STATUS, CANCELAMENTO }`

### `Proposta` (campos adicionados)

- `status StatusProposta @default(RASCUNHO)`
- `validadeDias Int @default(5)`
- `obsInternas String? @db.Text` — nunca no PDF/cliente.
- `obsProposta String? @db.Text` — futuro PDF.
- `emitidaAt / aprovadaAt / reprovadaAt / canceladaAt DateTime?`
- `motivoCancelamento MotivoCancelamento?`
- `obsCancelamento String? @db.Text`
- `proposalNumber` → `Int @unique @default(autoincrement())`; migration faz
  `ALTER SEQUENCE ... RESTART WITH 1001`.
- Mantidos: `id (cuid)`, `clienteId`, `vendedorId?`, `modelo`,
  `currentRevisionId?`, `createdAt`, `updatedAt`, `revisoes`.
- Índice novo: `@@index([status])`.

### `PropostaRevisao` — inalterada

`revisionNumber` (0,1,2…), único por proposta; conteúdo (seções/itens) nas
próximas Sprints.

### `PropostaAuditoria` (nova)

```
id String @id @default(cuid())
propostaId String
proposta   Proposta @relation(onDelete: Cascade)
evento     EventoAuditoria
revisionNumber Int?
observacao String? @db.Text
createdAt  DateTime @default(now())
@@index([propostaId])
```

## 2. Numeração

Sequência do Postgres via autoincrement, `RESTART WITH 1001`. Primeira proposta =
1001. Canceladas mantêm o número; duplicar pega o próximo; nunca reutiliza.

## 3. Revisões

- Ao **criar** a proposta: cria `Rev.0` e aponta `currentRevisionId`.
- **Nova revisão:** cria `Rev.(N+1)`, torna-a atual; anteriores read-only. Nesta
  Sprint não há conteúdo a copiar (marcador de versão). Auditoria `NOVA_REVISAO`.
- **Bloqueio:** não permitir nova revisão quando `status == CANCELADA` — a action
  rejeita e o botão fica indisponível.
- UI exibe `Rev.N`.

## 4. Duplicação

Nova `Proposta`: novo `proposalNumber`, `Rev.0`, `status = RASCUNHO`.

- **Copia:** `clienteId`, `vendedorId`, `modelo`, `validadeDias`, `obsProposta`.
- **NÃO copia:** `obsInternas` (anotações de negociação da proposta original),
  `status`, datas, auditoria, motivo/obs de cancelamento, número, revisão.

Auditoria `DUPLICACAO` (observação com o número de origem). Redireciona para
editar a nova proposta.

## 5. Cancelamento

Sem "Excluir". Ação **Cancelar** (row action + diálogo): exige `motivo`; se
`OUTRO`, `obsCancelamento` obrigatório. Define `status=CANCELADA`, `canceladaAt`,
`motivoCancelamento`, `obsCancelamento`. Permanece no banco, nas pesquisas, no
histórico e com todas as revisões. Bloqueia edição. Auditoria `CANCELAMENTO`.

## 6. Status (ciclo de vida)

Oficiais: Rascunho, Emitida, Aprovada, Reprovada, Cancelada. Cancelada é só via
ação **Cancelar**.

**Transições permitidas (validadas no service):**

```
RASCUNHO  -> EMITIDA, CANCELADA
EMITIDA   -> APROVADA, REPROVADA, CANCELADA
APROVADA  -> CANCELADA
REPROVADA -> CANCELADA
CANCELADA -> (nenhuma)
```

Nunca retornar a status anterior (ex.: Aprovada → Rascunho). O `service` rejeita
transições inválidas; o **select do formulário** só oferece o status atual + as
transições válidas para frente (Cancelada nunca no select). Auditoria
`MUDANCA_STATUS` em cada mudança.

**Datas de status IMUTÁVEIS:** `emitidaAt/aprovadaAt/reprovadaAt/canceladaAt` são
preenchidas **apenas na primeira** transição correspondente; se já tiverem valor,
**nunca sobrescrever** (preserva o histórico real).

**Badge (ADR-0159):** Rascunho = neutro (`secondary`), Emitida = azul (`info`),
Aprovada = verde (`success`), Reprovada = vermelho (`danger`), Cancelada =
contorno neutro (`outline`, mudo). Renderizado com o primitivo `Badge` +
mapeamento no feature (sem componente duplicado).

## 7. Datas automáticas

`createdAt` (criação), `updatedAt` (última alteração — toda mutação),
`emitidaAt/aprovadaAt/reprovadaAt/canceladaAt` carimbadas na transição.

## 8. Validade

`validadeDias Int @default(5)`; usuário altera. Listagem mostra "N dia(s)".

## 9. Observações

`obsInternas` (nunca no PDF/cliente) e `obsProposta` (futuro PDF).

## 10. Auditoria

Toda operação escreve `PropostaAuditoria` na MESMA transação: data/hora
(`createdAt`), evento, revisão (quando aplicável), observação. **Sem tela** nesta
Sprint.

## 11. Camadas

- `services/proposta.service.ts`: `listPropostas`, `getPropostaForEdit`,
  `createProposta`, `updateProposta`, `criarRevisao`, `duplicarProposta`,
  `cancelarProposta`, `alterarStatus`. Cada mutação em `prisma.$transaction`
  com escrita de auditoria. Seleciona só os campos exibidos na listagem.
- `features/propostas/`: `schema.ts` (Zod), `actions.ts` (Server Actions →
  `ActionResult`), `propostas-list.tsx`, `proposta-form.tsx`,
  `cancelar-dialog.tsx`.
- Regra de edição: bloqueada quando `status === CANCELADA` (form read-only +
  action rejeita).

## 12. Listagem

`CrudLayout` + `useCrudList` (reuso — não CrudListView, que é de cadastros com
ativo/inativar/excluir). Colunas: Número, Revisão Atual, Cliente, Vendedor,
Modelo, Status, Validade, Última Alteração, Ações. Busca instantânea, ordenação,
paginação (20/pág), **filtro por Status** (select no slot de filtros). Ações por
linha (dropdown): Editar, Nova Revisão, Duplicar, Cancelar (sem Excluir).

## 13. Formulário

`CrudFormShell` + campos: Cliente (select — clientes ativos), Vendedor (select —
vendedores ativos, opcional), Modelo (Comercial/Simplificada), Validade (dias),
Observações Internas, Observações da Proposta, Status. Sem produtos/serviços.

## 14. Modelo/Tipo (Comercial × Simplificada)

Apenas persiste em `modelo`. Nenhuma lógica específica. **ADR** dedicada.

## 15. Interface / reuso

Reusa `CrudLayout`, `CrudFormShell`, `PageHeader/Filters/Table/Form/Empty`,
`Badge`, `ConfirmDialog`, `useCrudList`, campos de formulário. Componentes novos
específicos do domínio (não duplicados): `propostas-list`, `proposta-form`,
`cancelar-dialog`, e um menu de ações de linha da proposta.

## 16. Seed

Adiciona 2–3 propostas de exemplo (vinculadas a clientes/vendedores do seed) para
a listagem não nascer vazia. Idempotente.

## 17. Qualidade / testes

Gate: `lint`, `typecheck`, `build`, Smoke Tests, `/api/health`,
`/dev/diagnostics` — todos verdes. Smoke test novo: abrir `/propostas`, criar
uma proposta (selecionar cliente, salvar), vê-la na listagem.

## 18. Documentação / ADRs

Atualizar README, PROJECT_CONTEXT, ARCHITECTURE, CHANGELOG, PROJECT_HISTORY,
DECISIONS, VERSION (0.4.0). **ADRs:** Numeração (ADR-0201), Revisões (ADR-0202),
Cancelamento (ADR-0203), Ciclo de Vida/Status+Datas (ADR-0204), Tipo da Proposta
(ADR-0205).

**ADR-0202 (Revisões)** deve documentar explicitamente: **Cliente, Vendedor e
Modelo pertencem ao cabeçalho da Proposta e NÃO são versionados**; somente o
conteúdo (itens/seções das próximas Sprints) será versionado. A duplicação **não
copia** `obsInternas` (decisão registrada em ADR-0203).

## Fora de escopo (explícito)

Produtos, serviços, seções/ambientes, PDF, preview, totais, cálculos, desconto,
frete, impostos, tela de histórico de auditoria, diferenças de layout entre
Comercial/Simplificada.

## Critério de aceite

CRUD de propostas; numeração sequencial (1001+); revisões; cancelamento;
duplicação; status + datas automáticas; auditoria gravando; docs + ADRs; lint,
typecheck, build, smoke tests verdes; commit.
