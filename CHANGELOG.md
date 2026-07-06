# CHANGELOG

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
