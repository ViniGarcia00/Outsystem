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
| ORM / Banco   | Prisma 7 (driver adapter Pg) + PostgreSQL    |
| Testes        | Vitest                                       |
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

- ✅ Estrutura de pastas e camadas.
- ✅ Layout base: Sidebar recolhível, Header, Breadcrumb, área principal.
- ✅ Tema claro/escuro/sistema.
- ✅ 6 rotas placeholder (sem funcionalidades).
- ✅ Componentes base reutilizáveis.
- ✅ Prisma configurado + 8 models estruturais + migration inicial.
- ✅ Seed de dados fictícios (5 clientes, 20 produtos, 3 vendedores).
- ✅ Formatadores (moeda, data, CPF/CNPJ, telefone) + testes.
- ✅ `lint`, `build` e `test` sem erros.

**Fora de escopo da Sprint 0 (proibido):** CRUD, telas funcionais, Dashboard,
PDF, regras de negócio, propostas.

## Próximas Sprints (visão)

- **Sprint 1 — Cadastros base:** Clientes, Produtos, Vendedores (CRUD, forms,
  tabelas, validação). Modelagem completa dos campos.
- **Sprint 2 — Configuração do sistema:** tela do singleton (empresa, logo,
  cores, textos, templates, caminhos).
- **Sprint 3 — Propostas (núcleo):** Proposta → Revisão → Seção → Item; modelos
  COMERCIAL e SIMPLIFICADA.
- **Sprint 4 — Módulos da proposta comercial:** Projeto Wi-Fi, Projeto Som
  (arquitetura extensível).
- **Sprint 5 — Geração de PDF** a partir de templates.
- **Sprint 6 — Dashboard** e indicadores.

> O backlog detalhado é mantido em **[BACKLOG.md](./BACKLOG.md)** e as regras de
> negócio em **[VISION.md](./VISION.md)**.
