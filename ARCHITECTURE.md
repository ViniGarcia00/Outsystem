# ARCHITECTURE.md — Outmat Propostas

> Documento principal para manutenção. Explica a organização das camadas, o
> fluxo de dependências, a estrutura Feature-First, a organização do banco e as
> convenções do projeto.

## 1. Princípios

- **Clean Architecture** — dependências apontam sempre para dentro.
- **SOLID** — especialmente Dependency Inversion (depender de abstrações:
  `Logger`, services) e Single Responsibility (arquivos pequenos e focados).
- **Feature-First** — o código é organizado por domínio, não por tipo técnico.
- **Sem lógica em componentes** — regras ficam em `services`; componentes só
  renderizam e disparam ações.
- **TypeScript Strict** e **Windows Server 2019** como alvo de deploy.

## 2. Camadas e fluxo de dependências

```
┌─────────────────────────────────────────────────────────────┐
│  app/            Rotas, layouts e composição de páginas       │  (mais externo)
│      │           (Next.js App Router). Sem regra de negócio.  │
│      ▼                                                        │
│  features/       Domínios auto-contidos (UI + hooks + schemas)│
│      │                                                        │
│      ▼                                                        │
│  services/       Casos de uso / orquestração                  │
│      │                                                        │
│      ▼                                                        │
│  infrastructure/ Prisma, storage, logging, configuration      │  (mais interno)
└─────────────────────────────────────────────────────────────┘
        ▲
        │  transversais (sem estado, sem dependência para fora):
   lib/ · utils/ · types/ · hooks/ · components/
```

**Regra de ouro:** uma camada só conhece as de dentro. Um componente **nunca**
importa o Prisma diretamente — o acesso a dados passa por `services`, que usam
`infrastructure`.

## 3. Estrutura de pastas

```
src/
  app/                       # Rotas (App Router) — 1 pasta por menu
    dashboard/ propostas/ clientes/ produtos/ vendedores/ configuracoes/
    layout.tsx               # ThemeProvider + TooltipProvider + AppShell
    page.tsx                 # redireciona "/" -> "/dashboard"
    globals.css              # Tailwind v4 + tokens shadcn (light/dark)

  components/
    ui/                      # Primitivos shadcn/ui (Radix)
    layout/                  # AppShell, Sidebar, Header, Breadcrumb, ThemeProvider
    shared/                  # PageContainer, PageHeader, Section, Loading,
                             #   EmptyState, ConfirmDialog, SearchInput, ThemeToggle
    forms/                   # CurrencyInput (pronto p/ React Hook Form)
    tables/                  # DataTable (TanStack Table genérico)

  features/                  # Feature-First (esqueletos na Sprint 0)
    dashboard/ propostas/ clientes/ produtos/ vendedores/ configuracoes/

  infrastructure/
    configuration/           # env tipado e validado (Zod) — fail-fast
    database/                # Prisma Client singleton (driver adapter Pg)
    storage/                 # resolução de caminhos configuráveis (Windows-safe)
    logging/                 # abstração Logger + ConsoleLogger

  services/                  # casos de uso (vazio na Sprint 0)
  hooks/                     # hooks reutilizáveis (ex.: useIsMobile)
  lib/                       # utilitários de libs (cn) e config de navegação
  types/                     # tipos globais (ActionResult, NavItem)
  utils/                     # formatadores (currency, date, cpf/cnpj, phone)
  generated/prisma/          # Prisma Client gerado (NÃO versionado)

prisma/
  schema.prisma              # models estruturais + enum ModeloProposta
  migrations/                # migration inicial (gerada offline)
  seed.ts                    # dados fictícios para teste
```

## 4. Organização do banco (Prisma / PostgreSQL)

Prisma 7 com o generator `prisma-client` (saída em `src/generated/prisma`) e
**driver adapter** (`@prisma/adapter-pg`). Configuração em `prisma.config.ts`.

### Models (apenas estruturais na Sprint 0)

| Model                 | Tabela                  | Papel                                            |
| --------------------- | ----------------------- | ------------------------------------------------ |
| `Cliente`             | `clientes`              | Cadastro base                                    |
| `Produto`             | `produtos`              | Cadastro base                                    |
| `Vendedor`            | `vendedores`            | Cadastro base                                    |
| `Proposta`            | `propostas`             | Raiz (`proposalNumber` único, `currentRevisionId`, enum `modelo`) |
| `PropostaRevisao`     | `proposta_revisoes`     | Versões (`revisionNumber` inteiro, único por proposta) |
| `PropostaSecao`       | `proposta_secoes`       | **Agrupador neutro de itens** (ver abaixo)       |
| `PropostaItem`        | `proposta_itens`        | Item dentro de uma seção                         |
| `ConfiguracaoSistema` | `configuracao_sistema`  | **Singleton** de configuração                    |

### Hierarquia da proposta

```
Proposta → PropostaRevisao → PropostaSecao → PropostaItem
```

- **Seção = agrupador NEUTRO de itens.** Exemplos válidos: "Sala", "Cozinha",
  "Casa 92", "Apartamento Flávio", "Área Externa", "Recepção", "Piso Superior".
  **NÃO** representa obrigatoriamente um "ambiente" — nunca tratar como Ambiente
  internamente (nomenclatura, variáveis, comentários).
- Exclusão em cascata (`onDelete: Cascade`) da revisão para baixo.
- **`Proposta.currentRevisionId`** aponta para a revisão atual (1:1 opcional),
  evitando consultas para descobrir a última revisão.
- **`Proposta.proposalNumber`** é a numeração **comercial** (ex.: `26001001`) —
  nunca usar o `id` do banco como numeração.
- **`PropostaRevisao.revisionNumber`** guarda apenas o inteiro; a exibição
  (`"Rev.0"`, `"Rev.1"`) é responsabilidade da interface.

### Modelos de proposta

Enum `ModeloProposta { COMERCIAL, SIMPLIFICADA }` — apenas discriminador nesta
Sprint. As regras (produtos/serviços/módulos) virão nas próximas Sprints:

- **COMERCIAL:** produtos + serviços + módulos opcionais (ex.: Projeto Wi-Fi,
  Projeto Som). A arquitetura deve permitir **adicionar novos módulos sem
  alterar a estrutura principal** (estratégia: um tipo/enum de módulo + linhas
  associadas, não reestruturação de tabelas).
- **SIMPLIFICADA:** apenas produtos. Nunca serviços, nunca módulos.

### ConfiguracaoSistema (singleton)

Registro único (`id` fixo = `"singleton"`). É o **ponto único de expansão**
futura, sem alteração estrutural de camadas: dados da empresa, logo, endereço,
telefones, WhatsApp, email, site, redes sociais, rodapé do PDF, textos
institucionais, templates, caminhos de armazenamento e configurações gerais.
Esses campos serão adicionados via migration incremental.

## 5. Configuração e Storage (Windows Server 2019)

- **Env tipado:** `infrastructure/configuration/env.ts` valida `process.env`
  com Zod na inicialização (fail-fast). Ninguém lê `process.env` diretamente.
- **Caminhos configuráveis:** `infrastructure/storage/paths.ts` resolve
  `STORAGE_PATH`, `PDF_PATH`, `UPLOAD_PATH`, `BACKUP_PATH`, `LOG_PATH` sempre com
  `path.resolve`/`path.join`. **Nenhum caminho fixo**, nenhum separador
  hardcoded. **Nenhuma pasta é criada** nesta fase (só resolução).
- Compatível com deploy offline: as fontes são de sistema (Segoe UI), sem CDN.

## 6. Convenções

- **Imports por alias** `@/*` (ver `tsconfig.json`).
- **Barrels** (`index.ts`) expõem a API pública de cada pasta/camada.
- **Server Components por padrão**; `"use client"` apenas quando há estado,
  efeitos ou APIs de browser.
- **Nomes de arquivo** em `kebab-case`; componentes em `PascalCase`.
- **Retorno padronizado** de operações que podem falhar: `ActionResult<T>`
  (`src/types`).
- **Idioma:** domínio e UI em português; termos técnicos mantêm o inglês.

## 7. Scripts

| Script                     | Descrição                                        |
| -------------------------- | ------------------------------------------------ |
| `npm run dev`              | Ambiente de desenvolvimento                      |
| `npm run build`            | Build de produção                                |
| `npm run lint`             | ESLint                                           |
| `npm run test`             | Testes (Vitest)                                  |
| `npm run db:generate`      | Gera o Prisma Client                             |
| `npm run db:migrate:deploy`| Aplica migrations (no servidor com DB)           |
| `npm run db:migrate:diff`  | Gera SQL de migration offline (sem DB)           |
| `npm run db:seed`          | Popula dados fictícios de teste                  |
