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
| 5 | **Integration Tests (Vitest + PostgreSQL)** | `npm run test:integration` — todos verdes | ☐ |
| 6 | **Smoke Tests (Playwright)** | `npm run test:e2e` — todos verdes | ☐ |
| 7 | **/api/health** | responde `200 { status: "ok" }` | ☐ |
| 8 | **/dev/diagnostics** | responde 200 com tempos normais (dev) | ☐ |
| 9 | **PostgreSQL conectado** | serviço `Running` e aceitando conexões | ☐ |
| 10 | **Prisma conectado** | `/dev/diagnostics` → status `ok`; conexão em ms | ☐ |
| 11 | **Documentação atualizada** | README, PROJECT_CONTEXT, ARCHITECTURE, VISION, BACKLOG, DECISIONS | ☐ |
| 12 | **CHANGELOG atualizado** | nova seção da versão da Sprint | ☐ |
| 13 | **VERSION atualizada** | número da versão coerente com a Sprint | ☐ |
| 14 | **Commit realizado** | commit oficial da Sprint + hash registrado no `PROJECT_HISTORY.md` | ☐ |

## As três suítes de teste

Separadas de propósito. Cada uma responde a uma pergunta diferente, e **as três
são obrigatórias**:

| Suíte | Comando | Responde |
|---|---|---|
| Unidade | `npm run test` | regras puras — cálculo, formatação, validação, mappers. **Sem banco**, sem IO, roda em qualquer máquina em segundos. |
| Integração | `npm run test:integration` | invariantes de **domínio e persistência** contra o **PostgreSQL real** — o que só a consulta de verdade distingue. |
| E2E / smoke | `npm run test:e2e` | fluxos ponta a ponta pelo navegador, na aplicação real. |

**Por que a suíte de integração existe.** Testes de integração validam invariantes
de domínio/persistência contra PostgreSQL real que não pertencem à suíte unitária
nem dependem da UI. O caso que a originou (Sprint 4.1.1) é o pertencimento do
registro da cronologia à sua Instalação: a garantia é uma condição de consulta
(`id` **E** `instalacaoId`), então um Prisma mockado provaria apenas que o mock
foi chamado — o que já seria verdade na versão vulnerável. E a interface nunca
produz o par cruzado, então o E2E também não a alcança. Sobra a camada de service,
contra o banco.

**Por que continuam separadas.** `npm run test` precisa permanecer puro e rápido:
é a suíte que roda a cada alteração e que funciona sem PostgreSQL instalado.
Fundir as duas tornaria toda a suíte dependente de banco. Quem roda o gate roda
**os dois comandos**.

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
- **Item 5 (Integração) incluído na Release 1.4.0 (ADR-0409).** Nasceu com a correção de
  integridade do agregado da cronologia, apurada na revisão final da própria
  1.4.0. Diferente do item 4, é regra **nova**: não havia teste de service no
  projeto antes disso. A suíte roda contra o banco local e cada teste apaga os
  próprios dados no `afterAll`, com o mesmo marcador `E2E ` que o
  `globalTeardown` do Playwright varre — um teste interrompido no meio não deixa
  rastro permanente.
- **Merge em `main` NÃO é requisito do gate.** O item 13 exige apenas o commit.
  Não há decisão anterior que torne o merge obrigatório e o repositório não tem
  merge commits — até a Sprint 3.1 (b) o trabalho ia direto na `main`. Como
  `sprint-3.1` inaugurou o modelo de branch, **formalizar (ou não) o merge como
  critério de conclusão é uma decisão em aberto**, registrada em `BACKLOG.md`.
  Enquanto não houver ADR, o merge é operação de fechamento, não item de gate.
- **Auditoria pré/pós de migração de dados.** Introduzida na Sprint 4.2
  (ADR-0410). Quando uma Sprint **migra dados entre estruturas**, as contagens de
  vínculo antes e depois vão para o `PROJECT_HISTORY.md`, junto do `diff` que as
  compara. A razão: uma migration **não é reexecutável** dentro de uma suíte de
  teste — a prova de "nenhum vínculo perdido" é a guarda dentro da própria
  migration (que aborta a transação inteira) somada à comparação documentada.
  Testes de integração cobrem os invariantes do estado **pós**-migração, que é o
  que uma suíte pode legitimamente afirmar.
- **Gates manuais.** Alguns critérios não são automatizáveis e precisam de
  inspeção humana registrada. O caso vigente é a **homologação visual do Contrato
  .docx no Microsoft Word** (ADR-0330): nenhum teste prova fidelidade de fonte,
  margem ou layout. Um gate manual pendente **impede** a conclusão da Sprint,
  como qualquer outro item.
