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
    dashboard/ propostas/ clientes/ produtos/ usuarios/ configuracoes/
    layout.tsx               # ThemeProvider + TooltipProvider + AppShell
    page.tsx                 # redireciona "/" -> "/propostas"
    globals.css              # Tailwind v4 + tokens shadcn (light/dark)

  components/
    ui/                      # Primitivos shadcn/ui (Radix)
    layout/                  # AppShell, Sidebar, Header, Breadcrumb, ThemeProvider
    shared/                  # PageContainer, PageHeader, Section, Loading,
                             #   EmptyState, ConfirmDialog, SearchInput, ThemeToggle
    forms/                   # CurrencyInput (pronto p/ React Hook Form)
    tables/                  # DataTable (TanStack Table genérico)

  features/                  # Feature-First
    dashboard/ clientes/ produtos/ usuarios/ configuracoes/
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
| `Usuario`             | `usuarios`              | Cadastro base — identidade única com papéis `ehVendedor`/`ehTecnico` (ADR-0410) |
| `Proposta`            | `propostas`             | Raiz (`proposalNumber` único, `currentRevisionId`, enum `modelo`) |
| `PropostaRevisao`     | `proposta_revisoes`     | Versões (`revisionNumber` inteiro, único por proposta) |
| `PropostaSecao`       | `proposta_secoes`       | **Agrupador neutro de itens** (ver abaixo)       |
| `PropostaItem`        | `proposta_itens`        | Item dentro de uma seção (`produtoId` com `onDelete: Restrict`) |
| `PropostaServico`     | `proposta_servicos`     | Serviço complementar (SOM/WIFI), único por tipo por proposta |
| `PropostaAuditoria`   | `proposta_auditorias`   | Trilha de eventos do ciclo de vida               |
| `Instalacao`          | `instalacoes`           | Raiz do módulo operacional (`numero` próprio, endereço por snapshot) |
| `InstalacaoAuditoria` | `instalacao_auditorias` | Trilha técnica da instalação                     |
| `InstalacaoRegistro`  | `instalacao_registros`  | Acontecimento da cronologia operacional          |
| `InstalacaoCusto`     | `instalacao_custos`     | Custo extra do acontecimento (`Decimal(12,2)`)   |
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

- **Inativação:** Cliente, Produto e Usuário têm `ativo` (default `true`). As
  listagens mostram apenas ativos; o filtro "Mostrar inativos" revela os demais.
- **Usuário tem um segundo eixo, independente do `ativo`: os PAPÉIS**
  (`ehVendedor`, `ehTecnico`, ADR-0410). `ativo` diz se a pessoa ainda atua; o
  papel diz o que ela faz. Disponível para um vínculo **novo** naquele papel =
  `ativo && ehPapel`. Usuário sem papel nenhum é válido — não aparece em select
  nenhum, e é o cadastro criado antes de a função ser decidida.
- **Exclusão condicionada ao uso em propostas:** um registro só pode ser
  **excluído** se nunca foi usado em uma proposta; caso contrário deve ser
  **inativado** (mensagem padrão única).
  - **Cliente** possui relação com `Proposta` — a checagem já é aplicada
    (`proposta.count`).
  - **Produto** passou a ter vínculo com a proposta: `PropostaItem.produtoId` com
    `onDelete: Restrict` (ADR-0207). A regra vale hoje — produto usado em
    proposta não é excluído. O texto original do ADR-0104 previa exatamente isso.
  - **Usuário (Sprint 4.2, ADR-0410) é o único cadastro cuja regra conta TRÊS
    relações**, porque a mesma identidade pode ter atuado nos dois papéis:
    `Proposta.vendedorId`, `Instalacao.tecnicoResponsavelId` e
    `InstalacaoRegistro.tecnicoId`. Mensagem própria,
    `CANNOT_DELETE_USED_IN_RECORDS`, porque a padrão fala só em "propostas".
    As três FKs são `ON DELETE RESTRICT` — o banco garante o mesmo que o
    service afirma. (`propostas.vendedorId` era `SET NULL` e foi corrigida
    nesta Sprint: apagar um vendedor por fora do service zerava o vínculo em
    silêncio.)

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

A mesma proposta gera **cinco documentos**, todos sob demanda, sem persistir
arquivo em disco:

| Documento | Rota | Formato | Papel |
| --- | --- | --- | --- |
| **PDF Detalhado** | `/propostas/[id]/pdf` | PDF | documento comercial completo, com preços |
| **PDF Apresentação** | `/propostas/[id]/presentation` | PDF | institucional; 13 templates, slides condicionais |
| **Contrato** | `/propostas/[id]/contrato` | **.docx** | jurídico, editável no Word antes do envio |
| **Anexo Contratual** | `/propostas/[id]/contratual` | PDF | escopo aprovado **sem preço por item** |
| **Geral de Produtos** | `/propostas/[id]/produtos` | PDF | lista **quantitativa** de material; **não emite** a proposta |

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
- **Geral de Produtos (Sprint 4.0.3, ADR-0407):** consolida os produtos de
  **todas** as Seções, somando as ocorrências do mesmo produto.
  `consolidarProdutos` é **função pura** (`pdf/consolidado.ts`), agrupando por
  `produtoId` — identidade estável — com fallback no SKU normalizado. Documento
  **quantitativo**: não lê `dto.servicos`, `dto.totais`, `dto.resumo` nem
  `dto.desconto`. É o único que **não emite** a proposta — é lista de conferência
  de material, disponível em Rascunho e Emitida.
- **Nomes de download** centralizados em `pdf/filename.ts`, para PDF e .docx.

## 4.5. Instalações — módulo operacional (Sprint 4.0.1)

Primeiro módulo fora do Comercial. Acompanha a execução de uma instalação para
um cliente e **não depende de Pedido de Venda nem de Ordem de Serviço** — nenhum
campo os antecipa.

```
Cliente
   └── Instalação  (numero próprio 1001+, status, endereço por snapshot)
         ├── Proposta relacionada (OPCIONAL, vínculo puro)
         ├── Auditoria técnica       ← trilha de sistema
         └── Registros da cronologia ← conteúdo operacional
               └── Custos extras
```

- **Numeração** por sequência nativa (`instalacoes_numero_seq`, `RESTART WITH
  1001`), independente de Propostas. Mesmo padrão do ADR-0201.
- **Endereço por snapshot, derivado no service.** `criarInstalacao` recebe só o
  `clienteId`, lê o Cliente **persistido** na mesma transação e copia os campos.
  Nenhum endereço vindo do navegador é gravado — os schemas Zod nem declaram
  esses campos. Alterar o cadastro do Cliente depois **não** muda instalações
  antigas, e `atualizarInstalacao` não toca no endereço.
- **Sem "Nome do Projeto"** desde a Sprint 4.0.3 (ADR-0404): o campo foi
  removido estruturalmente, inclusive do banco. `Proposta.nomeProjeto`
  (ADR-0227) é outro campo, em outro model, e **permanece**.
- **Responsável é vínculo com o cadastro de Usuários** (ADR-0410, que substitui
  os cadastros separados de Vendedor e Técnico; a mecânica do vínculo vem do
  ADR-0408, supersede parcial do ADR-0400). A Instalação guarda só a FK —
  "responsável atual" é estado corrente e acompanha o cadastro. O registro da
  cronologia guarda a FK **e** `responsavelNome`, snapshot do nome no momento em
  que aquele responsável lhe foi atribuído: renomear um Usuário não reescreve
  fatos já registrados, nem inativá-lo, nem desmarcar seu papel.
- **O papel é exigido só em vínculo NOVO ou ALTERADO** (ADR-0410). O service
  compara o vínculo persistido com o recebido, dentro da transação, e só então
  exige `ativo && ehPapel`. É isso que permite exigir o papel sem quebrar o
  histórico: uma proposta cujo vendedor perdeu o papel continua salvável.
- **Cancelar, nunca excluir.** Concluir é mudar o status.
- **Cronologia operacional × auditoria técnica** são separadas: a primeira
  (Sprint 4.0.2) é conteúdo que o usuário lê; a segunda é trilha de sistema,
  gravada na mesma transação da escrita.
- **Datas** convertidas por `features/instalacoes/datas.ts`, com fuso fixo
  `America/Sao_Paulo`. A conversão acontece na Server Action, não no schema.
- **Listagem** usa `CrudLayout` + `useCrudList` (molde de Propostas), não
  `CrudListView` — a entidade tem *status*, não `ativo`.

### Cronologia e custos (Sprint 4.0.2)

- **Cronologia ≠ auditoria.** `InstalacaoRegistro` é conteúdo escrito pelos
  responsáveis; `InstalacaoAuditoria` é trilha de sistema. Operações de
  registro **não** geram auditoria (ADR-0401).
- **`aconteceuEm` × `createdAt`:** a timeline ordena pelo fato
  (`aconteceuEm desc`), com `createdAt desc` e `id desc` como desempates —
  o terceiro garante ordem determinística. Fatos históricos são aceitos;
  futuros, não.
- **Totais derivados** em `features/instalacoes/custos.ts`, módulo puro. Nada
  de total persistido. Valor em `Decimal(12, 2)`; o arredondamento a 2 casas do
  cálculo é proteção adicional, não substituta da coluna decimal.
- **Transações:** criar registro + custos é atômico; editar substitui os custos
  por delete-and-recreate na mesma transação.
- **Exclusão de registro** é bloqueada quando há custos — regra do **service**,
  não da interface: o `onDelete: Cascade` do banco apagaria os custos junto.

## 4.6. Dashboard (Sprint 4.0.3)

Visão rápida da situação comercial e operacional. **Não é BI.**

```
dashboard.service.ts        IO (4 consultas em paralelo)
  → features/dashboard/dashboard.ts    REGRA PURA
    → DashboardDTO
      → Server Component
```

- **A regra mora no módulo puro** — quais status viram card, o que é "próxima
  instalação", ordem e corte. É o que permite testá-la sem banco. O pré-filtro
  SQL é deliberadamente mais amplo: só remove o que a regra também removeria.
- **Indicadores:** Propostas em Rascunho/Emitidas; Instalações A Agendar,
  Agendadas, Aguardando Material, Em Andamento e Concluídas; custos extras
  acumulados; e até 5 próximas instalações.
- Sem gráficos, comparativos, metas, filtros ou tempo real. Nenhum dado
  fictício. Ver ADR-0405.

## 4.7. Busca — fonte única de normalização (Sprint 4.0.3)

`src/utils/busca.ts` (`normalizarBusca`, `contemBusca`) é o **único** lugar do
sistema que normaliza texto para busca. `useCrudList` e os autocompletes
server-side consomem a mesma função.

O `contains + mode: "insensitive"` do Prisma vira `ILIKE`: insensível a caixa,
**sensível a acento** — era por isso que "Thaís" não aparecia ao digitar
"Thais". Os services `searchClientes`, `searchProdutos` e `searchPropostas`
filtram em memória, carregando o conjunto **sem `take`** (um limite antes do
filtro esconderia registros válidos) e selecionando só os campos usados. Ver
ADR-0402 e o item de busca escalável no `BACKLOG.md`.

`src/utils/data-brasil.ts` é o dono transversal do fuso `America/Sao_Paulo`
(`FUSO_BRASIL`, `OFFSET_BRASIL`, `inicioDoDiaBrasil`). Não confundir com
`utils/format/date.ts`, que formata para exibição e **não** fixa timezone.

## 5. Configuração e Storage (Windows Server 2019)

- **Env tipado:** `infrastructure/configuration/env.ts` valida `process.env`
  com Zod na inicialização (fail-fast). Ninguém lê `process.env` diretamente.
- **Caminhos configuráveis:** `infrastructure/storage/paths.ts` resolve
  `STORAGE_PATH`, `PDF_PATH`, `UPLOAD_PATH`, `BACKUP_PATH`, `LOG_PATH` sempre com
  `path.resolve`/`path.join`. **Nenhum caminho fixo**, nenhum separador
  hardcoded. O módulo de paths continua sendo **só resolução** — não faz IO.
- **Quem escreve, cria a subárvore.** Desde a Sprint 4.3 os anexos da cronologia
  gravam em disco (`instalacao-anexo.service.ts`) e fazem `mkdir` recursivo da
  pasta do registro. Toda leitura e escrita passa por
  `resolveWithin(storagePaths.upload, …)`, que prova a contenção na raiz antes de
  tocar no filesystem.
- 🔴 **Pré-condição de produção:** `mkdir` recursivo cria diretórios **dentro de
  uma raiz existente e acessível**. Ele **não** resolve drive inexistente nem
  falta de permissão da conta do serviço. `UPLOAD_PATH` precisa existir no
  servidor, ou a conta que roda a aplicação precisa poder criar a árvore. Ver
  README → Publicação e o gate de release (ADR-0414).
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
| `npm run test`             | Testes de unidade (Vitest) — puros, sem banco     |
| `npm run test:integration` | Testes de service contra o PostgreSQL real       |
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
- **Integração (Vitest + PostgreSQL real):** invariantes de domínio e persistência
  que a suíte pura não alcança, em `src/**/*.integration.test.ts`, com config
  própria (`vitest.integration.config.ts`) e comando próprio
  (`npm run test:integration`). Ver DECISIONS.md (ADR-0409). Ficam **fora** de `npm run test`, que continua
  puro e sem banco. A regra de bolso: quando a garantia É a consulta — como o
  pertencimento do registro da cronologia à sua Instalação (`id` **E**
  `instalacaoId`) —, mockar o Prisma provaria apenas que o mock foi chamado, e a
  interface nem sempre consegue produzir o caso. Cada teste cria e apaga os
  próprios dados, marcados com `E2E `.
- **E2E smoke (Playwright):** fluxos mínimos de navegação e CRUD básico contra a
  aplicação real, em `e2e/`. Apenas Chromium, execução serial (os testes escrevem
  no banco); o `webServer` sobe a aplicação automaticamente. Ver DECISIONS.md
  (ADR-0150).

**Cada cenário cria os próprios dados** (cliente `E2E …`, produto `E2E-…`) — não
depende de nada preexistente no catálogo.

**Cleanup automático (Sprint 4.0.3, ADR-0403).** `e2e/support/limpeza.ts` é
infraestrutura **test-only**, fora de `src/`, ligada ao `globalTeardown` do
Playwright: roda uma vez depois da suíte, **inclusive com testes falhando**,
varre por marcador em ordem de dependência e **falha a execução** se sobrar
resíduo. Recusa-se a rodar fora de ambiente local (três guardas). Nunca
`TRUNCATE`, nunca `DELETE` sem `WHERE`, nunca `pg_dump` — o backup foi operação
única de implantação.

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
