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
| 4 | **Smoke Tests (Playwright)** | `npm run test:e2e` — todos verdes | ☐ |
| 5 | **/api/health** | responde `200 { status: "ok" }` | ☐ |
| 6 | **/dev/diagnostics** | responde 200 com tempos normais (dev) | ☐ |
| 7 | **PostgreSQL conectado** | serviço `Running` e aceitando conexões | ☐ |
| 8 | **Prisma conectado** | `/dev/diagnostics` → status `ok`; conexão em ms | ☐ |
| 9 | **Documentação atualizada** | README, PROJECT_CONTEXT, ARCHITECTURE, VISION, BACKLOG, DECISIONS | ☐ |
| 10 | **CHANGELOG atualizado** | nova seção da versão da Sprint | ☐ |
| 11 | **VERSION atualizada** | número da versão coerente com a Sprint | ☐ |
| 12 | **Commit realizado** | commit oficial da Sprint + hash registrado no `PROJECT_HISTORY.md` | ☐ |

## Observações

- **Banco:** ambiente oficial é o **PostgreSQL nativo** (Docker é alternativa).
  Se houver lentidão, usar `/dev/diagnostics` para achar a causa raiz **antes**
  de qualquer correção — **sem workarounds**.
- **Decisões arquiteturais** tomadas na Sprint → registrar ADR em `DECISIONS.md`.
- **Toda Sprint termina com um commit** (regra fixa do projeto).
- Se algum item falhar, a Sprint **não** está concluída.
