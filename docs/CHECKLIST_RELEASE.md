# CHECKLIST_RELEASE.md — Critérios de conclusão de Sprint

Documento **permanente**. Uma Sprint só é considerada **concluída** após todos
os itens abaixo passarem. Rodar na ordem; anexar evidências no relatório final
da Sprint e no `PROJECT_HISTORY.md`.

## Gate obrigatório

| # | Item | Como verificar | OK |
|---|------|----------------|----|
| 1 | **Lint** | `npm run lint` sem erros | ☐ |
| 2 | **Typecheck** | `npm run typecheck` sem erros | ☐ |
| 3 | **Build** | `npm run build` sem erros | ☐ |
| 4 | **Unit Tests (Vitest)** | `npm run test` — todos verdes | ☐ |
| 5 | **Smoke Tests (Playwright)** | `npm run test:e2e` — todos verdes | ☐ |
| 6 | **/api/health** | responde `200 { status: "ok" }` | ☐ |
| 7 | **/dev/diagnostics** | responde 200 com tempos normais (dev) | ☐ |
| 8 | **PostgreSQL conectado** | serviço `Running` e aceitando conexões | ☐ |
| 9 | **Prisma conectado** | `/dev/diagnostics` → status `ok`; conexão em ms | ☐ |
| 10 | **Documentação atualizada** | README, PROJECT_CONTEXT, ARCHITECTURE, VISION, BACKLOG, DECISIONS | ☐ |
| 11 | **CHANGELOG atualizado** | nova seção da versão da Sprint | ☐ |
| 12 | **VERSION atualizada** | número da versão coerente com a Sprint | ☐ |
| 13 | **Commit realizado** | commit oficial da Sprint + hash registrado no `PROJECT_HISTORY.md` | ☐ |

## Observações

- **Banco:** ambiente oficial é o **PostgreSQL nativo** (Docker é alternativa).
  Se houver lentidão, usar `/dev/diagnostics` para achar a causa raiz **antes**
  de qualquer correção — **sem workarounds**.
- **Decisões arquiteturais** tomadas na Sprint → registrar ADR em `DECISIONS.md`.
- **Toda Sprint termina com um commit** (regra fixa do projeto).
- Se algum item falhar, a Sprint **não** está concluída.
- **Item 4 (Vitest) incluído na Release 1.1.0.** Não é regra nova: o ADR-0228
  registra o Quality Gate da Sprint 2.8 como *"ESLint 0, Typecheck 0, Build 0,
  **unit 17/17**, smoke 7/7, /api/health 200"*, e o commit `df0717e` (Sprint
  3.2.1) valida *"test 17/17"*. Os testes unitários já faziam parte do gate na
  prática; a tabela apenas passou a refletir isso.
- **Merge em `main` NÃO é requisito do gate.** O item 13 exige apenas o commit.
  Não há decisão anterior que torne o merge obrigatório e o repositório não tem
  merge commits — até a Sprint 3.1 (b) o trabalho ia direto na `main`. Como
  `sprint-3.1` inaugurou o modelo de branch, **formalizar (ou não) o merge como
  critério de conclusão é uma decisão em aberto**, registrada em `BACKLOG.md`.
  Enquanto não houver ADR, o merge é operação de fechamento, não item de gate.
- **Gates manuais.** Alguns critérios não são automatizáveis e precisam de
  inspeção humana registrada. O caso vigente é a **homologação visual do Contrato
  .docx no Microsoft Word** (ADR-0330): nenhum teste prova fidelidade de fonte,
  margem ou layout. Um gate manual pendente **impede** a conclusão da Sprint,
  como qualquer outro item.
