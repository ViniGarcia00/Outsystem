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

  features/                  # Feature-First
    dashboard/ clientes/ produtos/ vendedores/ configuracoes/
    propostas/               # workspace, seções, itens, serviços, totais
      pdf/                   # geração de PDF (@react-pdf/renderer)
        blocks/              #   cabeçalho, cliente, tabela, rodapé financeiro,
                             #   serviço complementar — compartilhados
        presentation/        #   PDF Apresentação (13 templates, landscape 16:9)
        filename.ts          #   nome de download de TODOS os documentos
      docx/                  # geração do Contrato (docxtemplater)
        contrato.mapper.ts   #   DTO → ContratoTemplateDTO (toda a regra)
        render.ts            #   preenche o template (sem regra)
        extenso.ts           #   valor por extenso

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

> **Banco oficial (a partir da Sprint 1): PostgreSQL nativo**, com **usuário
> dedicado** `outmat` — a aplicação **nunca** usa o superusuário `postgres`.
> Bootstrap único em `scripts/db/bootstrap.sql`. Docker é **opcional** (ambiente
> isolado). A aplicação/Prisma sempre leem a `DATABASE_URL` do `.env`. Detalhes
> e histórico em `DECISIONS.md` (ADR-0101).

### Models (apenas estruturais na Sprint 0)

| Model                 | Tabela                  | Papel                                            |
| --------------------- | ----------------------- | ------------------------------------------------ |
| `Cliente`             | `clientes`              | Cadastro base                                    |
| `Produto`             | `produtos`              | Cadastro base                                    |
| `Vendedor`            | `vendedores`            | Cadastro base                                    |
| `Proposta`            | `propostas`             | Raiz (`proposalNumber` único, `currentRevisionId`, enum `modelo`) |
| `PropostaRevisao`     | `proposta_revisoes`     | Versões (`revisionNumber` inteiro, único por proposta) |
| `PropostaSecao`       | `proposta_secoes`       | **Agrupador neutro de itens** (ver abaixo)       |
| `PropostaItem`        | `proposta_itens`        | Item dentro de uma seção (`produtoId` com `onDelete: Restrict`) |
| `PropostaServico`     | `proposta_servicos`     | Serviço complementar (SOM/WIFI), único por tipo por proposta |
| `PropostaAuditoria`   | `proposta_auditorias`   | Trilha de eventos do ciclo de vida               |
| `Instalacao`          | `instalacoes`           | Raiz do módulo operacional (`numero` próprio, endereço por snapshot) |
| `InstalacaoAuditoria` | `instalacao_auditorias` | Trilha técnica da instalação                     |
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

## 4.0. Propostas — fundação (Sprint 2.1)

- **Numeração:** `Proposta.proposalNumber` é sequência do PostgreSQL iniciando em
  1001 (nunca reutilizada). ADR-0201.
- **Cabeçalho na Proposta:** cliente/vendedor/modelo/validade/observações/status/
  datas ficam na `Proposta`; as **revisões** (`PropostaRevisao`) versionam o
  conteúdo (seções/itens) das próximas Sprints. `Rev.0` nasce com a proposta.
  ADR-0202.
- **Cancelamento (nunca excluir):** status `CANCELADA` com motivo; duplicação não
  copia `obsInternas`. ADR-0203.
- **Ciclo de vida:** transições controladas + datas de status imutáveis +
  **auditoria** (`PropostaAuditoria`) na mesma transação. ADR-0204.
- **Tipo** (Comercial/Simplificada): apenas persistido. ADR-0205.
- `proposta.service.ts` concentra as operações (transações + auditoria); as telas
  reutilizam `CrudLayout`/`useCrudList` (listagem) e `CrudFormShell` (formulário,
  com modo `readOnly`).

### Estrutura-alvo (diretriz — ADR-0206)

Todo o **conteúdo comercial** vive **dentro da Revisão**; o cabeçalho fica na
`Proposta` e não é versionado:

```
Proposta
 ├── Cabeçalho (cliente, vendedor, modelo, validade, status, datas) — NÃO versionado
 ├── Revisão 0 → Seções · Produtos · Serviços · Observações · Totais
 ├── Revisão 1
 └── Revisão N
```

Produtos, serviços, seções, textos, totais, descontos, frete e impostos serão
implementados **exclusivamente** dentro da Revisão, evitando migrações quando
chegarem PDF, histórico e comparação entre versões.

## 4.1. Camada de dados — Server Actions (Sprint 1)

O CRUD segue o fluxo **Server Action (`"use server"`) → `services/` → Prisma**,
com retorno padronizado `ActionResult<T>` (`src/types`). Não há Route Handlers
para o CRUD (apenas `/api/health` como endpoint operacional). O mesmo schema Zod
valida no cliente (React Hook Form) e no servidor (action). As **listagens** são
processadas no cliente (busca instantânea por qualquer parte do texto, ordenação
e paginação de 20/pág) — os services retornam apenas os campos exibidos. Ver
`DECISIONS.md` (ADR-0102, ADR-0103).

Camadas de UI reutilizáveis: `CrudLayout`/`CrudListView` (listagem) e
`CrudFormShell` (formulário) garantem o **mesmo padrão visual** em todos os
cadastros (ADR-0106).

## 4.2. Regras de exclusão e inativação (cadastros)

- **Inativação:** Cliente, Produto e Vendedor têm `ativo` (default `true`). As
  listagens mostram apenas ativos; o filtro "Mostrar inativos" revela os demais.
- **Exclusão condicionada ao uso em propostas:** um registro só pode ser
  **excluído** se nunca foi usado em uma proposta; caso contrário deve ser
  **inativado** (mensagem padrão única).
  - **Cliente** e **Vendedor** possuem relação com `Proposta` — a checagem já é
    aplicada (`proposta.count`).
  - **Produto** passou a ter vínculo com a proposta: `PropostaItem.produtoId` com
    `onDelete: Restrict` (ADR-0207). A regra vale hoje — produto usado em
    proposta não é excluído. O texto original do ADR-0104 previa exatamente isso.

> **Nomenclatura — "Código" × "SKU".** Na interface (formulário, listagem, busca,
> validações, tabela, PDF e autocomplete) o campo do produto chama-se **SKU**.
> No banco e no código o nome continua `codigo` — a renomeação foi só de
> apresentação. Unicidade garantida em três níveis: índice do banco, backend
> (`skuDisponivel` + tratamento de `P2002`) e checagem assíncrona no frontend.

## 4.3. Serviços complementares (Sprint 2.9.x)

Os **módulos opcionais** da proposta comercial previstos na VISION são a entidade
`PropostaServico`, ligada à **Proposta** (não à Revisão):

- Enum `TipoServicoProposta { SOM, WIFI }` — **Projeto Som Ambiente** e
  **Projeto Wi-Fi Premium**.
- `@@unique([propostaId, tipo])` — no máximo **um de cada** por proposta.
- Persistência por *delete-and-recreate* em `salvarProposta`; `valorTotal`
  (produtos + serviços do módulo) é derivado, mas **persistido** por decisão da
  Sprint 2.9.1.
- **Nunca aparecem no modelo SIMPLIFICADA** — são auto-removidos ao trocar o
  modelo, e o mapper força `servicos = []`.
- Novos módulos entram como novos valores do enum + linhas associadas, **sem
  reestruturar tabelas**, como a VISION exige.

### Cálculo financeiro — fonte oficial única

`src/features/propostas/totais.ts` tem **dois calculadores com resultados
diferentes**, e a distinção importa:

| Função | Desconto incide sobre | Uso |
| --- | --- | --- |
| `calcularTotais` | apenas a **Automação** | legado; permanece no código |
| `calcularResumoFinanceiro` | o **Total combinado** (Automação + Som + Wi-Fi) | **fonte oficial** |

**Regra:** todo documento consome `calcularResumoFinanceiro().totalGeral` via
`dto.resumo.totalGeral`. Nenhum documento recalcula — os mappers **espelham** o
total recebido. É isso que garante que PDF Detalhado, Anexo Contratual e Contrato
citem o mesmo valor. Travado por teste em `contrato.mapper.test.ts`.

## 4.4. Documentos da proposta

A mesma proposta gera **quatro documentos**, todos sob demanda, sem persistir
arquivo em disco:

| Documento | Rota | Formato | Papel |
| --- | --- | --- | --- |
| **PDF Detalhado** | `/propostas/[id]/pdf` | PDF | documento comercial completo, com preços |
| **PDF Apresentação** | `/propostas/[id]/presentation` | PDF | institucional; 13 templates, slides condicionais |
| **Contrato** | `/propostas/[id]/contrato` | **.docx** | jurídico, editável no Word antes do envio |
| **Anexo Contratual** | `/propostas/[id]/contratual` | PDF | escopo aprovado **sem preço por item** |

Arquitetura comum a todos:

```
Route Handler (runtime nodejs, force-dynamic, no-store)
  → getPropostaPdfData(id)      loader ÚNICO, compartilhado
  → PropostaPdfDTO
  → mapper puro                 (montarPropostaPdfDTO | montarContratoTemplateDTO)
  → renderer                    (@react-pdf/renderer | docxtemplater)
  → Response
```

- **Um loader só.** Nenhum documento faz consulta própria.
- **Mapper concentra a regra; renderer é burro.** O renderer do contrato abre o
  template, troca placeholder por valor e devolve o buffer — não calcula, não
  formata, não decide (ADR-0330).
- **PDF Apresentação:** templates PNG 1920×1080 como plano de fundo de página
  inteira, em landscape 16:9 (`size=[960, 540]` pt); nenhuma página é redesenhada.
  Slides 09 (Som), 10 (Wi-Fi) e 11 (Investimento Total) são **condicionais** —
  Automação = 10 páginas · +Som = 12 · +Wi-Fi = 12 · ambos = 13. Coordenadas dos
  overlays centralizadas em `coords.ts`. Bloqueado no modelo Simplificada.
- **Contrato:** template oficial versionado (`contrato-outmat.oficial.docx`) +
  `scripts/marcar-template-contrato.mjs`, que converte `[PLACEHOLDER]` → `{tag}`
  de forma **seletiva** e **aborta** se o XML mudar fora de `<w:t>`/realce. Os
  placeholders que o sistema não conhece ficam literais e realçados, para
  preenchimento manual no Word. As chaves do `ContratoTemplateDTO` **são** as tags
  do `.docx` — renomear um campo exige remarcar o template.
- **Nomes de download** centralizados em `pdf/filename.ts`, para PDF e .docx.

## 4.5. Instalações — módulo operacional (Sprint 4.0.1)

Primeiro módulo fora do Comercial. Acompanha a execução de uma instalação para
um cliente e **não depende de Pedido de Venda nem de Ordem de Serviço** — nenhum
campo os antecipa.

```
Cliente
   └── Instalação  (numero próprio 1001+, status, endereço por snapshot)
         ├── Proposta relacionada (OPCIONAL, vínculo puro)
         └── Auditoria técnica
```

- **Numeração** por sequência nativa (`instalacoes_numero_seq`, `RESTART WITH
  1001`), independente de Propostas. Mesmo padrão do ADR-0201.
- **Endereço por snapshot, derivado no service.** `criarInstalacao` recebe só o
  `clienteId`, lê o Cliente **persistido** na mesma transação e copia os campos.
  Nenhum endereço vindo do navegador é gravado — os schemas Zod nem declaram
  esses campos. Alterar o cadastro do Cliente depois **não** muda instalações
  antigas, e `atualizarInstalacao` não toca no endereço.
- **Responsável é texto livre**, sem entidade, FK ou cadastro, e sem reutilizar
  `Vendedor`. É snapshot histórico do fato — ver ADR-0400.
- **Cancelar, nunca excluir.** Concluir é mudar o status.
- **Cronologia operacional × auditoria técnica** são separadas: a primeira
  (Sprint 4.0.2) é conteúdo que o usuário lê; a segunda é trilha de sistema,
  gravada na mesma transação da escrita.
- **Datas** convertidas por `features/instalacoes/datas.ts`, com fuso fixo
  `America/Sao_Paulo`. A conversão acontece na Server Action, não no schema.
- **Listagem** usa `CrudLayout` + `useCrudList` (molde de Propostas), não
  `CrudListView` — a entidade tem *status*, não `ativo`.

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
| `npm run typecheck`        | Verificação de tipos (tsc)                       |
| `npm run test`             | Testes de unidade (Vitest)                       |
| `npm run test:e2e`         | Smoke tests (Playwright)                          |
| `npm run db:migrate:deploy`| Aplica migrations (no servidor com DB)           |
| `npm run db:seed`          | Popula dados de exemplo                          |
| `npm run db:validate`      | Valida o CRUD contra o PostgreSQL real           |

## 8. Testes

- **Unidade (Vitest):** formatadores/validações, utilitários puros, mappers e
  route handlers (`src/**/*.test.ts`). Mappers são funções puras, testadas **sem
  banco** — o padrão de `proposta-pdf.mapper.test.ts` e `contrato.mapper.test.ts`.
  O template do contrato tem teste de **integridade** que roda no CI, garantindo
  que as tags existem e que os placeholders manuais continuam literais.
- **E2E smoke (Playwright):** fluxos mínimos de navegação e CRUD básico contra a
  aplicação real, em `e2e/`. Apenas Chromium, execução serial (os testes escrevem
  no banco); o `webServer` sobe a aplicação automaticamente. Ver DECISIONS.md
  (ADR-0150).

> **Limitação conhecida do smoke.** Os testes preenchem o autocomplete com
> **códigos de produto fixos**, o que os acopla ao conteúdo do banco. O ambiente
> de desenvolvimento passou a ser restaurado do catálogo real da Outmat
> (`backup/db_outsystem.backup`), que não contém os produtos fictícios do
> `prisma/seed.ts`. Ver `BACKLOG.md`.

## 9. Impressão

`src/app/print.css` (importado no `globals.css`) define a **estrutura de
impressão**: `@page` A4, utilitários (`.no-print`, `.print-only`,
`.print-avoid-break`, `.print-break-before`, `.print-page`) e regras
`@media print` que ocultam o chrome (sidebar/header/toasts) e neutralizam
superfícies. Ver DECISIONS.md (ADR-0151).

> O **Preview HTML** que essa base preparava **não foi implementado** e não será:
> foi substituído pela geração de PDF via `@react-pdf/renderer` (ADR-0223). O
> `print.css` permanece para impressão de tela.

## 10. Convenção de imports

- **Barrels** (`index.ts`) expõem a API pública **entre pastas**. Dentro de uma
  mesma pasta, os arquivos podem se importar por caminho relativo direto.
- Componentes de formulário compartilham `FormSection` e os campos ligados ao
  RHF (`TextField`, `SelectField`, etc.) de `@/components/forms`.
