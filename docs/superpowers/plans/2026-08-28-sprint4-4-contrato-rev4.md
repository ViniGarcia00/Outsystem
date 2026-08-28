# Sprint 4.4 — Contrato Rev. 4: versionamento de template e campos contratuais

- **Versão:** 1.6.0 → **1.7.0**
- **Branch:** `sprint-4.4` (nasceu de `5e1d743`, hash final da 1.6.0)
- **Data:** 2026-08-28
- **ADRs:** ADR-0415 (versionamento + dívida), ADR-0416 (Rev. 4 e campos)
- **Fonte da verdade do documento:** `public/templates/contrato/contrato-outmat.rev4.docx`

---

## 1. Ordem inegociável

```
FASE 1  versionamento         ← a Rev.4 NÃO pode virar vigente antes disto verde
FASE 2  campos novos
FASE 3  ativação da Rev.4
FASE 4  fechamento 1.7.0
```

A razão é a mesma da T2 da Sprint anterior: enquanto não existe versionamento,
trocar o arquivo do template altera silenciosamente o texto jurídico de qualquer
contrato regenerado. O versionamento entra **antes** de existir uma segunda
versão, então nunca há janela de risco.

## 2. Invariantes que esta Sprint não pode quebrar

1. **`currentRevision.emittedAt != null`** continua sendo o único discriminante
   de congelamento (ADR-0412). Não tocar.
2. **Templates antigos nunca são apagados.**
3. **Nenhuma linha do texto jurídico da Rev. 4 é reescrita** — a única edição
   autorizada no `.docx` é `[se houver]` → `{observacoes}`, o realce daquele
   placeholder e o estilo das três tags novas.
4. Clean Architecture + Feature-First; três suítes separadas (ADR-0409);
   `Decimal` para dinheiro, nunca `Float`.
5. **Não** criar tabela nem CRUD de templates.
6. **Não** derivar `valorParcelaFinal` de `formaPagamento`.

**Não iniciar:** Pedido de Venda, Ordem de Serviço, Financeiro, autenticação,
permissões, upgrades de dependências.

## 3. Migrations previstas

| Arquivo | Conteúdo |
|---|---|
| `2026…_proposta_revisao_template_contrato` | `PropostaRevisao.templateContratoVersao TEXT` |
| `2026…_proposta_campos_contratuais_rev4` | `propostas`: `prazoExecucaoDiasUteis INTEGER`, `valorParcelaFinal DECIMAL(12,2)`, `observacoesAceite TEXT` |

Ambas aditivas, todas as colunas nullable, nenhuma linha existente alterada,
nenhum backfill. Sem auditoria pré/pós (ADR-0410) — não há migração de dados.

---

## FASE 1 — Versionamento do template

### T1 — ADRs e plano
- **Criar:** este plano · **Alterar:** `DECISIONS.md` (ADR-0415, ADR-0416)
- ADR-0415 registra também a **dívida técnica** dos campos comerciais de
  cabeçalho, conforme determinado.
- **Commit:** `docs(adr): ADR-0415..0416 e abertura da Sprint 4.4`

### T2 — Rev. 3 versionada + catálogo em código
- **Renomear (via `git mv`, preservando histórico):**
  `contrato-outmat.docx` → `contrato-outmat.rev3.docx`
  `contrato-outmat.oficial.docx` → `contrato-outmat.rev3.oficial.docx`
- **Criar:** `src/features/propostas/docx/templates.ts` — catálogo com versão,
  arquivo, `vigenteDe` e o conjunto de tags de cada versão;
  `TEMPLATE_CONTRATO_VIGENTE = "rev3"` **nesta fase**.
- **Alterar:** `scripts/marcar-template-contrato.mjs` — caminhos e um cabeçalho
  dizendo que ele é a proveniência da **rev3** e **não se aplica à rev4**.
- **Testes:** unidade do catálogo (versões conhecidas, arquivos existem,
  vigente é uma versão do catálogo).
- **Commit:** `refactor(contrato): rev3 versionada e catalogo de templates`

### T3 — Migration `templateContratoVersao`
- **Alterar:** `prisma/schema.prisma` · **Criar:** migration
- **Testes:** integração — coluna existe, nasce nula, aceita valor.
- **Commit:** `feat(db): PropostaRevisao.templateContratoVersao`

### T4 — Carimbo na emissão e seleção no renderer
- **Alterar:** `proposta.service.ts` (`emitirProposta` carimba a versão vigente
  junto de `emittedAt`), `docx/render.ts` (recebe a versão e resolve o arquivo
  pelo catálogo), `proposta-pdf.mapper.ts` / `proposta-pdf.service.ts` (levar a
  versão no DTO), `contrato/route.ts`.
- **Fallback:** versão nula ⇒ `rev3`.
- **Commit:** `feat(contrato): renderer escolhe o template pela versao da revisao`

### T5 — Integração do versionamento
- Carimbo na emissão · revisão nunca emitida fica nula · **fork preserva a
  versão da revisão anterior** · `null` renderiza rev3 · nova emissão recebe a
  vigente.
- **Commit:** `test(integration): versionamento do template de contrato`

---

## FASE 2 — Campos contratuais

### T6 — Migration dos três campos
- **Commit:** `feat(db): campos contratuais da proposta (prazo, parcela final, observacoes)`

### T7 — Zod, service e DTOs
- `prazoExecucaoDiasUteis`: inteiro, `> 0`, sem decimal, opcional.
- `valorParcelaFinal`: `Decimal`, `>= 0`, opcional.
- `observacoesAceite`: texto, vazio permitido. **Nunca** `obsInternas`.
- Criar, salvar e **duplicar** preservam os três.
- **Commit:** `feat(proposta): campos contratuais no schema, service e DTOs`

### T8 — Integração dos campos
- Persistência · duplicação · **fork ao editar revisão congelada**.
- **Commit:** `test(integration): campos contratuais e fork`

### T9 — UI no bloco Finalização
- **Commit:** `feat(proposta): campos contratuais no bloco Finalizacao`

### T10 — E2E dos campos
- **Commit:** `test(e2e): campos contratuais com round-trip`

---

## FASE 3 — Ativação da Rev. 4

### T11 — Edição cirúrgica do `.docx`
1. `[se houver]` → `{observacoes}`
2. remover o realce amarelo **daquele** run
3. aplicar negrito + `3C77FF` às três tags novas
4. **nenhum outro texto tocado**
- **Prova exigida:** round-trip do zip antes de editar; só `word/document.xml`
  muda; só os parágrafos alvo mudam; demais entradas byte-idênticas.
- **Commit:** `feat(contrato): rev4 com {observacoes} e estilo das tags novas`

### T12 — DTO e mapper
- `ContratoTemplateDTO` += `prazoExecucao`, `valorParcelaFinal`, `observacoes`.
- `prazoExecucao`: **só o número**. `valorParcelaFinal`: pt-BR **sem "R$"**.
  `observacoes`: **string vazia** se nulo.
- **Commit:** `feat(contrato): mapeia prazo, parcela final e observacoes`

### T13 — Guarda de geração (só Rev. 4)
- Sem `prazoExecucaoDiasUteis` **ou** sem `valorParcelaFinal` ⇒ **bloqueia** a
  geração com mensagem dizendo qual falta.
- **Contratos rev3 não sofrem a guarda** — regeneram como sempre.
- **Commit:** `feat(contrato): guarda de geracao do contrato rev4`

### T14 — Testes de template e render por versão
- Semânticos, não por contagem fixa.
- **Commit:** `test(contrato): tags por versao, integridade de runs e render`

### T15 — Virar a vigência
- `TEMPLATE_CONTRATO_VIGENTE = "rev4"`, `vigenteDe: "2026-08-28"`.
- **Commit:** `feat(contrato): Rev. 4 passa a ser a versao vigente`

### T16 — 🔴 Gate visual no Microsoft Word (manual)
- Gerar **um contrato rev3 histórico** e **um contrato rev4**, abrir os dois.
- Sem aprovação humana, a release **não fecha**.

---

## FASE 4 — Fechamento

### T17 — Documentação
`ARCHITECTURE.md`, `VISION.md`, `PROJECT_CONTEXT.md`, `PROJECT_HISTORY.md`,
`docs/CHECKLIST_RELEASE.md`, `BACKLOG.md` (dívida).

### T18 — VERSION 1.7.0 + gate oficial + commit de release
Depois, commit documental com o hash.

---

## 4. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Rev.4 vigente antes do versionamento funcionar | Fase 1 fecha verde antes da T15; vigente fica `rev3` até lá |
| R2 | Edição do `.docx` corromper layout | Round-trip provado antes; diff por parágrafo depois; gate no Word |
| R3 | Contrato rev4 sair com "de dias úteis" ou "R$ ." | Guarda da T13, com teste |
| R4 | Guarda vazar para contratos rev3 | Guarda condicionada à versão; teste explícito do rev3 sem os campos |
| R5 | Teste preexistente quebrar por contagem de placeholder | Substituídos por semânticos na T14; ajustar e registrar |
| R6 | Confundir campo histórico com campo de cabeçalho | Dívida registrada no ADR-0415; documentação não afirma imutabilidade que não existe |

## 5. Dívida técnica registrada (não corrigida nesta release)

Campos comerciais de cabeçalho vivem em `Proposta`, não em `PropostaRevisao`:
`formaPagamento`, `tipoDesconto`/`valorDesconto`, `frete`, `previsaoInstalacao` e
os três novos. São **sobrescritos** no fork — a revisão histórica não preserva os
valores da época. `emittedAt`, `aprovadaEm`, o conteúdo (seções/itens) e o novo
`templateContratoVersao` **são** históricos.

Na prática não gera documento errado, porque só se gera contrato da revisão
**atual**. Mas contraria o ADR-0206 e **não pode ser descrito como imutável na
documentação**. Remodelar exigiria mover ~8 colunas para a revisão e reescrever
`salvarProposta`, `duplicarProposta` e os mappers — fora do escopo desta release.
