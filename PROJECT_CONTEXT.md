# PROJECT_CONTEXT.md — Outmat Propostas

## Visão geral

Sistema **interno** de geração de propostas da Outmat. Não é SaaS. Uso restrito
à empresa (rede local e VPN). **Sem autenticação de usuários na versão 1.0.**

- **Servidor:** Windows Server 2019
- **Banco:** PostgreSQL
- **Framework:** Next.js 16 (App Router)

## Stack

| Camada        | Tecnologia                                   |
| ------------- | -------------------------------------------- |
| Framework     | Next.js 16 (App Router) + React 19           |
| Linguagem     | TypeScript (strict)                          |
| Estilo        | Tailwind CSS v4                              |
| UI            | shadcn/ui (Radix) + Lucide React             |
| Formulários   | React Hook Form + Zod                        |
| Tabelas       | TanStack Table                               |
| ORM / Banco   | Prisma 7 (driver adapter Pg) + PostgreSQL nativo |
| Dados (UI→DB) | Server Actions → services → Prisma (`ActionResult`) |
| Toasts        | sonner                                       |
| Testes        | Vitest (unidade) + Playwright (smoke E2E)     |
| Impressão     | `print.css` (base para o Preview HTML futuro) |
| Tema          | next-themes (claro/escuro/sistema)           |

## Arquitetura

Clean Architecture + Feature-First. Fluxo de dependências:

```
app/ → features/ → services/ → infrastructure/
```

Detalhes completos em **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

## Estrutura de pastas (resumo)

```
src/
  app/            rotas (1 pasta por menu) + layout + globals.css
  components/     ui · layout · shared · forms · tables
  features/       dashboard · propostas · clientes · produtos · vendedores · configuracoes
  infrastructure/ configuration · database · storage · logging
  services/ hooks/ lib/ types/ utils/
prisma/           schema · migrations · seed
```

## Decisões tomadas (Sprint 0)

1. **Next.js 16 + Tailwind v4 + shadcn/ui (preset Radix/Nova).** Padrão atual do
   ecossistema; config de tema via tokens CSS (`globals.css`).
2. **Prisma 7 com driver adapter (`@prisma/adapter-pg`).** O client gerado vai
   para `src/generated/prisma` (não versionado; regenerado no `postinstall`).
3. **Configuração de ambiente tipada e validada com Zod** (fail-fast). Nada lê
   `process.env` diretamente.
4. **Caminhos de storage 100% configuráveis** e Windows-safe (`path.join`).
   Nenhuma pasta é criada nesta fase.
5. **Fontes de sistema (Segoe UI)** em vez de Google Fonts — build/deploy sem
   dependência de rede.
6. **Migration inicial gerada offline** (`prisma migrate diff`), já que não há
   PostgreSQL no ambiente de desenvolvimento. No servidor: `db:migrate:deploy`.
7. **Sidebar recolhível** com preferência persistida (localStorage) e versão
   off-canvas (Sheet) no mobile.
8. **Modelos de proposta** previstos desde já via enum `ModeloProposta`
   (COMERCIAL / SIMPLIFICADA), sem regras de negócio.
9. **Seção como agrupador neutro** (nunca "Ambiente").
10. **ConfiguracaoSistema como singleton**, preparado para expansão sem mudança
    estrutural.

## Estado atual (o que existe)

Sprint 0 (fundação) + **Sprint 1 (cadastros base)** + **Sprint 1.5 (polimento,
UX, testes e preparação)** concluídas.

- ✅ Estrutura de pastas e camadas; layout base; tema claro/escuro/sistema.
- ✅ **Banco PostgreSQL nativo** (usuário dedicado `outmat`); migrations + seed.
- ✅ **CRUD completo**: Configuração (singleton), Clientes, Produtos, Vendedores.
- ✅ Listagens: busca instantânea, ordenação, paginação (20/pág), filtro de
  inativos, ações por linha — via `CrudListView` + `CrudLayout`.
- ✅ Formulários: React Hook Form + Zod, autofocus, atalhos CTRL+S/ESC,
  redirect + toast ao salvar, `FormDirtyGuard` (guarda de dados não salvos).
- ✅ Regras de exclusão (uso em propostas) e inativação (`ativo`).
- ✅ Validações (CPF/CNPJ, e-mail, obrigatórios, monetário) compartilhadas
  cliente/servidor.
- ✅ `/api/health`, `VERSION`, `DECISIONS.md`, scripts padronizados.
- ✅ **Sprint 1.5:** smoke tests (Playwright), `print.css`, `FormSection`,
  `TableSkeleton`, revisão de acessibilidade/performance e limpeza de código
  morto. README com trilhas Desenvolvimento/Publicação. Página dev-only
  `/dev/diagnostics`.
- ✅ Processo de release: `docs/CHECKLIST_RELEASE.md` (gate obrigatório) +
  `PROJECT_HISTORY.md` (histórico por Sprint); toda Sprint termina com commit.
- ✅ **Sprint 2.1 — Fundação de Propostas:** CRUD de propostas, numeração
  sequencial (1001+), revisões, cancelamento, duplicação, status + datas
  automáticas e auditoria (sem produtos/serviços/PDF ainda). Ver DECISIONS.md
  ADR-0201..0205.
- ✅ `lint`, `build` e `typecheck` sem erros.

## Tela "About" (planejada — não implementada)

Estrutura preparada na Sprint 1.5 (ver BACKLOG). No futuro exibirá: Versão do
Sistema, Build, Última atualização, Versão do Banco, PostgreSQL, Prisma,
Next.js, Ambiente, Health e Diagnostics. Diferente de `/dev/diagnostics`, a
About é voltada ao usuário final e existirá também em produção.

## Próximas Sprints (visão)

- ✅ **Sprint 1 — Cadastros base:** Configuração, Clientes, Produtos, Vendedores
  (CRUD, forms, tabelas, validação). **Concluída.**
- **Sprint 2 — Propostas (núcleo):** Proposta → Revisão → Seção → Item; modelos
  COMERCIAL e SIMPLIFICADA.
- **Sprint 4 — Módulos da proposta comercial:** Projeto Wi-Fi, Projeto Som
  (arquitetura extensível).
- **Sprint 5 — Geração de PDF** a partir de templates.
- **Sprint 6 — Dashboard** e indicadores.

> O backlog detalhado é mantido em **[BACKLOG.md](./BACKLOG.md)** e as regras de
> negócio em **[VISION.md](./VISION.md)**.
