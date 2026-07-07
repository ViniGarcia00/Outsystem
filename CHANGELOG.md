# CHANGELOG

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.3.0] — 2026-07-06

### Sprint 1.5 — Polimento, UX e Preparação

Sprint de **qualidade** — nenhuma regra de negócio nova, nenhuma alteração de
banco. Fundação endurecida antes do módulo de Propostas.

#### Adicionado

- **Smoke tests com Playwright** (`e2e/`, `npm run test:e2e`): navegação e CRUD
  básico de Clientes contra a aplicação real; Chromium, execução serial.
- **Estrutura de impressão** `src/app/print.css` (importada no `globals.css`):
  `@page` A4, utilitários (`.no-print`, `.print-only`, `.print-avoid-break`,
  `.print-break-before`, `.print-page`) e regras `@media print` que ocultam o
  chrome — base para o futuro Preview HTML da proposta (Preview **não**
  implementado).
- **`FormSection`** — agrupador único de campos; formulários (Configuração,
  Clientes, Produtos, Vendedores) padronizados sobre ele.
- **`TableSkeleton`** — estado de carregamento das listagens com skeleton (usa o
  primitivo `Skeleton`), substituindo o spinner.
- **`/dev/diagnostics`** — página de diagnóstico **só em desenvolvimento**
  (tempo de conexão/consulta, versão do PostgreSQL, ambiente, status do Prisma,
  tempo de resposta). Não existe em produção (ADR-0156).
- Scripts `test:e2e` / `test:e2e:ui`.
- **Encerramento:** `docs/CHECKLIST_RELEASE.md` (gate obrigatório de Sprint) e
  `PROJECT_HISTORY.md` (histórico por Sprint); processo de release em ADR-0158.
- **Preparação da tela "About"** registrada (BACKLOG + PROJECT_CONTEXT) — sem
  implementar a tela.

#### Melhorado

- **Acessibilidade:** `aria-label` em busca, filtro "Mostrar inativos" e cabeçalho
  de ordenação; foco visível; navegação por teclado; ícones decorativos com
  `aria-hidden`. (Campos já expunham `aria-invalid`/`aria-describedby` via
  `FormControl`.)
- **Performance:** `React.memo` em componentes leaf (`StatusBadge`,
  `SortableHeader`); revisão confirmou seletores memoizados e consultas enxutas
  (ver DECISIONS.md ADR-0153).
- **Documentação:** README reescrito com trilhas separadas **Desenvolvimento** e
  **Publicação** (Windows Server 2019: deploy, atualização, backup, restore).
  READMEs de features/serviços atualizados (não mais "Sprint 0").

#### Removido

- Componentes superados/sem uso: `PageActions`, `PageSection`, `PageContainer`,
  `ui/scroll-area`; export morto `UNSAVED_CHANGES_MESSAGE`; slots placeholder e
  `TODO` antigos do header/logo.

#### Qualidade

- `npm run lint`, `npm run build`, `npm run typecheck` sem erros.
- Smoke tests do Playwright executados.

## [0.2.0] — 2026-07-06

### Sprint 1 — Cadastros Base

CRUD completo dos cadastros oficiais sobre **PostgreSQL real** (sem mocks).

#### Adicionado

- **Banco PostgreSQL nativo** como banco oficial do projeto, com **usuário
  dedicado** `outmat` (a aplicação nunca usa o superusuário `postgres`).
  Bootstrap em `scripts/db/bootstrap.sql` (`npm run db:bootstrap`). Docker
  passou a ser **opcional** (ambiente isolado). Ver `DECISIONS.md` (ADR-0101).
- **Camada de dados via Server Actions** (`"use server"`) → `services/` →
  Prisma, com retorno padronizado `ActionResult<T>` (ADR-0102).
- **CRUD completo**: Configuração do Sistema (singleton), Clientes, Produtos,
  Vendedores.
- **Listagens** padronizadas (`CrudListView` + `CrudLayout`): busca instantânea
  (qualquer parte do texto, sem acento), ordenação por coluna, paginação de
  20/pág, filtro "Mostrar inativos", ações por linha (Editar / Inativar /
  Excluir) — processadas no cliente (ADR-0103).
- **Formulários** padronizados (`CrudFormShell`): React Hook Form + Zod,
  autofocus no primeiro campo, atalhos **CTRL+S** (salvar) e **ESC** (cancelar),
  redirecionamento para a listagem + toast de sucesso ao salvar.
- **FormDirtyGuard** + `NavigationBlocker`: confirmação ao sair com alterações
  não salvas (links da aplicação via `onNavigate` + `beforeunload`).
- **Regras de exclusão/inativação**: Cliente e Vendedor não podem ser excluídos
  se usados em propostas (mensagem padrão → usar Inativar); Produto é excluível
  na Sprint 1 (sem relação com Proposta ainda — ADR-0104). Exclusão e inativação
  sempre pedem confirmação.
- **Validações**: CPF/CNPJ (dígitos verificadores), e-mail, campos obrigatórios,
  valores monetários (≥ 0). Regras condicionais do Cliente (PF exige `nome`, PJ
  exige `empresa`); `cpfCnpj` único quando informado.
- **Componentes**: primitivos `Textarea`, `Checkbox`, `Switch`, `Select`,
  `Form` (RHF), `Toaster` (sonner); campos `TextField`, `TextareaField`,
  `SelectField`, `SwitchField`, `CurrencyField`, `MaskedField`; `SortableHeader`,
  `RowActions`, `StatusBadge`; hooks `useCrudList`, `useFormShortcuts`.
- **Toasts** (sonner) em criar, editar, excluir, inativar e salvar.
- **`/api/health`**: verificação de saúde (app + conexão com o banco).
- **`VERSION`**, scripts padronizados no `package.json` (`typecheck`,
  `db:bootstrap`, `db:setup`, `db:up`/`db:down`), README revisado e novo
  `DECISIONS.md` (ADRs).
- Seed reescrito para o modelo real (produtos com código/valores; clientes PF e
  PJ com documentos válidos; configuração de exemplo).

#### Qualidade

- `npm run lint` sem erros.
- `npm run build` sem erros.
- CRUD validado contra PostgreSQL real (migrations + seed aplicados).

## [0.1.0] — 2026-07-06

### Sprint 0 — Fundação, Arquitetura e Planejamento

Fundação do projeto. **Nenhuma regra de negócio** foi implementada.

#### Adicionado

- Projeto Next.js 16 (App Router) com React 19 e TypeScript strict.
- Tailwind CSS v4 + shadcn/ui (preset Radix/Nova) + Lucide React.
- Arquitetura Clean Architecture + Feature-First (camadas `app`, `features`,
  `services`, `infrastructure` e transversais `lib`/`utils`/`types`/`hooks`).
- Infraestrutura:
  - Configuração de ambiente tipada e validada com Zod (fail-fast).
  - Resolução de caminhos de storage configuráveis e Windows-safe (sem criação
    de pastas).
  - Abstração de logging (`Logger` + `ConsoleLogger`).
  - Prisma Client singleton com driver adapter PostgreSQL.
- Prisma configurado (PostgreSQL) com 8 models **estruturais**: `Cliente`,
  `Produto`, `Vendedor`, `Proposta`, `PropostaRevisao`, `PropostaSecao`,
  `PropostaItem`, `ConfiguracaoSistema`; enum `ModeloProposta`.
- Migration inicial gerada offline (`prisma migrate diff`).
- Ajustes finais de modelagem: `Proposta.proposalNumber` (numeração comercial
  única), `Proposta.currentRevisionId` (revisão atual, 1:1 opcional) e
  `PropostaRevisao.revisionNumber` (inteiro; UI exibe "Rev.0").
- Seed de dados fictícios (5 clientes, 20 produtos, 3 vendedores).
- Layout base: Sidebar recolhível (off-canvas no mobile), Header, Breadcrumb,
  área principal; tema claro/escuro/sistema.
- Componentes base: `PageContainer`, `PageHeader`, `Section`, `Card` (ui),
  `DataTable`, `SearchInput`, `CurrencyInput`, `Loading`, `EmptyState`,
  `ConfirmDialog`, `ThemeToggle`, `Sidebar`, `Breadcrumb`.
- Utilitários: `formatCurrency`, `formatDate`, `formatCpfCnpj`, `formatPhone`
  (com testes em Vitest).
- 6 rotas placeholder (Dashboard, Propostas, Clientes, Produtos, Vendedores,
  Configurações), sem funcionalidades.
- Documentação: `PROJECT_CONTEXT.md`, `VISION.md`, `ARCHITECTURE.md`,
  `CHANGELOG.md`, `BACKLOG.md`.

#### Qualidade

- `npm run lint` sem erros.
- `npm run build` sem erros.
- `npm run test` — 11 testes passando.

[0.1.0]: #010--2026-07-06
