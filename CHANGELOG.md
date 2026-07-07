# CHANGELOG

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.6.4] — 2026-07-07

### Edição por "Salvar Alterações" (pré-2.3). Ver ADR-0214.

#### Alterado

- **Proposta existente** deixa de ter **auto-save**: as alterações (cabeçalho,
  seções, produtos, observações) ficam **pendentes** até **"Salvar Alterações"**,
  que persiste tudo numa única transação. **Nova Proposta** permanece igual.
- **Revisão automática** passa a ocorrer **somente no salvamento**: se a proposta
  estava EMITIDA, "Salvar Alterações" cria a Rev.N+1, grava e volta a RASCUNHO.
  Nada de revisão durante a digitação.
- **Aviso ao sair** (voltar/fechar/navegar/atualizar) quando há alterações não
  salvas, reutilizando o `FormDirtyGuard` existente. "Gerar PDF" fica desabilitado
  enquanto houver pendências.

#### Interno

- Novo `salvarProposta` (substitui o conteúdo da revisão + auditoria consolidada);
  hook `useConteudoMemoria` reutilizado pelos dois workspaces. Removido o
  auto-save de conteúdo/cabeçalho (código morto): `ensureEditableRevision`,
  `updateCabecalho`, Server Actions de conteúdo e `serverConteudoActions`.

## [0.6.3] — 2026-07-07

### Homologação do fluxo de produtos (pré-2.3). Ver ADR-0213.

#### Adicionado

- **Autocomplete de produto** (busca por código/descrição, 3+ chars, teclado/
  mouse/Enter), via um `Autocomplete` genérico reutilizado também pelo Cliente.
- **Modelo Simplificada:** produtos entram **direto na proposta** (sem seções);
  Comercial mantém seções. Usa uma seção única implícita ("Produtos"), sem
  migração.
- **Coluna Total** por linha (Qtd × Valor Unitário, apenas visual).

#### Alterado

- **Grade de produtos** reordenada: Código · Descrição · Qtd · UN · Valor
  Unitário · Total · Ações.
- **Valor unitário editável** (no diálogo e na grade): vem do cadastro, é
  editável e grava no **snapshot** do item — não altera o cadastro do produto.
- **"Criar Proposta" exige cliente** (botão desabilitado + mensagem; validação no
  servidor).
- **Dashboard** de volta ao menu (placeholder); a home segue em Propostas.

## [0.6.2] — 2026-07-07

### Alterado

- **Workspace de criação:** o aviso "em memória" passa a usar o painel `Card`
  (componente existente), logo abaixo do cabeçalho, com título *"Esta proposta
  ainda não foi criada. Clique em 'Criar Proposta' para salvá-la."* e a descrição
  sobre não gravar/reservar número. Aparece apenas durante a criação; após
  "Criar Proposta" resta só o indicador de auto-save. Apenas UX.

## [0.6.1] — 2026-07-07

### Homologação do módulo de Propostas (ajustes pré-2.3). Ver ADR-0212.

#### Alterado

- **Criação diferida:** "Nova proposta" abre um workspace de **montagem em
  memória** (cabeçalho + seções + produtos); nada é gravado até **"Criar
  Proposta"**, que persiste tudo numa única transação (número, Rev.0, cabeçalho,
  conteúdo, auditoria). Fechar/cancelar antes ⇒ nada existe, **nenhum número
  consumido** (elimina lacunas por abandono).
- **Home = `/propostas`** (raiz e sidebar); item **Dashboard** removido da
  navegação (rota `/dashboard` removida).
- **Autocomplete de cliente** mostra o **documento** (CPF/CNPJ) em vez do tipo de
  pessoa.
- **Modelo da proposta** ocupa ~metade da linha.
- **Revisão única:** removido o rótulo "Conteúdo — Rev.N"; a revisão aparece uma
  vez, no título.

#### Interno

- Editor de conteúdo reutilizável via `ConteudoActions` (servidor vs memória);
  `criarPropostaCompleta`/`criarPropostaAction` transacional.

## [0.6.0] — 2026-07-07

### Refino do fluxo de Propostas (workspace-first + revisão automática)

Refatoração funcional do módulo antes de adicionar Serviços. Ver ADR-0211.

#### Adicionado

- **"Gerar PDF"** (`emitirProposta`): valida cliente + ≥1 item, emite
  (`EMITIDA` + `emitidaAt`) e **congela** a revisão (`PropostaRevisao.emittedAt`);
  auditoria `EMISSAO`. (O PDF binário fica para Sprint futura.)
- **Revisão automática:** editar uma proposta **emitida** cria sozinha a
  **Rev.N+1** (cópia profunda), volta a **RASCUNHO** e reaponta a revisão atual —
  via `ensureEditableRevision`, com **`idMap`** para reapontar seções/itens
  existentes. Sem botão "Nova Revisão".
- **Indicador de auto-save** e **aviso de proposta incompleta** (sem cliente) no
  workspace; foco automático no campo Cliente ao criar.

#### Alterado

- **Workspace único** (`/propostas/[id]`) para criar, editar e revisar. "Nova
  proposta" cria a proposta **já numerada** e abre o workspace direto. Cabeçalho
  editável inline com **auto-save por campo** (sem botão "Salvar").
- **Status** reduzido a **RASCUNHO · EMITIDA · CANCELADA**.
- `Proposta.clienteId` opcional (estado temporário de montagem; exigido na
  emissão).

#### Removido

- Rotas `/propostas/nova` e `/propostas/[id]/editar`; formulário isolado de
  cabeçalho; botões "Salvar" e "Nova Revisão"; status `APROVADA`/`REPROVADA` e
  colunas `aprovadaAt`/`reprovadaAt`.

## [0.5.1] — 2026-07-07

### Ajustes de UX + correção de perda de dados (pré-Sprint 2.3)

#### Corrigido

- **Perda de dados (crítico):** o seed executava `deleteMany()` nos cadastros e
  recriava só os exemplos, apagando registros manuais a cada `db:seed`. O seed
  passa a ser **não-destrutivo e idempotente**: nunca apaga; só popula em banco
  vazio; a Configuração é garantida sem sobrescrever (ADR-0209).

#### Alterado

- **Listagem de Propostas:** removidas as colunas **Validade** e **Modelo da
  proposta** (mantidas Número, Revisão, Cliente, Vendedor, Status, Última
  alteração, Ações). Filtros e paginação inalterados (ADR-0210).
- **Formulário de Proposta:** **Modelo da proposta** vira o **primeiro campo, em
  linha inteira**; ordem passa a Modelo → Cliente → Vendedor → Validade →
  Observações (ADR-0210).
- **Campo Cliente:** Select substituído por **autocomplete** com busca por Nome,
  Razão Social, CPF e CNPJ a partir de 3 caracteres (documento comparado sem
  máscara). O formulário não pré-carrega mais toda a lista de clientes (ADR-0210).

#### Adicionado

- `ClienteAutocompleteField` (primeiro componente de autocomplete do projeto) e
  `searchClientes` / `searchClientesAction`.

## [0.5.0] — 2026-07-07

### Sprint 2.2 — Seções + Produtos na Revisão (workspace)

A Proposta vira um **workspace**. Conteúdo comercial (seções + produtos) vive
dentro da revisão atual. **Sem** serviços, totais, cálculos, PDF ou preview.

#### Adicionado

- **Workspace** em `/propostas/[id]` (cabeçalho resumido + editor de conteúdo da
  revisão atual). Formulário de cabeçalho movido para `/propostas/[id]/editar`.
  "Editar" da listagem abre o workspace.
- **Seções** (agrupadores neutros) e **Produtos** dentro da revisão:
  adicionar/renomear/remover/reordenar (Mover ↑/↓); item de produto com
  **snapshot** (código/descrição/unidade/valores) + `produtoId` + quantidade
  (`Decimal(12,3)`, permite frações). Ordenação contígua (ADR-0208).
- **Nova revisão** e **duplicação** copiam **em profundidade** o conteúdo da
  revisão atual (ADR-0208).
- **Produto:** campo `unidade` (UN, MT, CX…); exclusão de produto usado em
  proposta **bloqueada** (ADR-0104 ativa / ADR-0207).
- Campo `tipo` (`PRODUTO`/`SERVICO`) já preparado no item para a próxima Sprint.
- Auditoria granular por operação de conteúdo; revisão histórica e proposta
  cancelada em **somente leitura** (`readOnly` no `CrudFormShell`).
- Componente reutilizável `NumberField`.
- Seed com conteúdo de exemplo; smoke test do workspace (seção + produto).
- ADRs 0207–0208; VERSION 0.5.0.

## [0.4.0] — 2026-07-07

### Sprint 2.1 — Fundação do Módulo de Propostas

Estrutura da proposta comercial. **Sem** produtos, serviços, seções, PDF,
preview, totais ou cálculos (próximas Sprints).

#### Adicionado

- **Modelagem** (migration aditiva, sem remodelar): enums `StatusProposta`,
  `MotivoCancelamento`, `EventoAuditoria`; novos campos na `Proposta` (status,
  `validadeDias`, `obsInternas`/`obsProposta`, datas de status,
  motivo/obs de cancelamento); tabela `PropostaAuditoria`.
- **Numeração sequencial** via sequência do PostgreSQL iniciando em **1001**
  (`proposalNumber` autoincrement); nunca reutilizada (ADR-0201).
- **CRUD de propostas**: criar (Rev.0, Rascunho, validade 5 dias), editar,
  **nova revisão**, **duplicar** (novo número, Rev.0, sem copiar obsInternas),
  **cancelar** (com motivo; sem excluir), **alterar status**.
- **Ciclo de vida** com transições validadas e **datas de status imutáveis**;
  **auditoria** gravada na mesma transação (ADR-0204).
- **Listagem** (`CrudLayout` + `useCrudList`): número, revisão, cliente, vendedor,
  modelo, status, validade, última alteração, ações; busca instantânea,
  ordenação, paginação e **filtro por status**. Badges de status pelo padrão
  ADR-0159.
- **Formulário** (`CrudFormShell`): cliente, vendedor, modelo, validade,
  observações internas/da proposta, status. Modo **somente leitura** quando
  cancelada.
- Componentes reutilizáveis novos: `NumberField`; `readOnly` no `CrudFormShell`.
- **Tipo** Comercial/Simplificada apenas persistido (ADR-0205).
- Seed com 3 propostas de exemplo; smoke test de propostas.
- ADRs 0201–0205; VERSION 0.4.0.

## [0.3.1] — 2026-07-07

### Sprint 1.5.1 — Ajustes finais

Ajustes de validação manual (sem novas funcionalidades).

#### Alterado

- **Configuração:** removidos da interface os campos **Cor Primária**, **Cor
  Secundária** e **Textos Institucionais** (não usados no projeto). A estrutura
  (colunas/DTO) permanece internamente para o futuro.
- **Badges — padrão oficial de cores (ADR-0159):** verde = Ativo/Sucesso,
  vermelho = Inativo/Erro, amarelo = Pendente/Atenção, azul = Informação/Em
  andamento. `StatusBadge`: **Ativo = verde**, **Inativo = vermelho** (aplicado
  em Clientes, Produtos e Vendedores).
- **Produtos — layout:** o helper "Pode ser zero" saiu da descrição (que
  desalinhava o grid) e foi para o rótulo do campo ("Valor do serviço (pode ser
  zero)"), mantendo todos os campos alinhados.

#### Corrigido

- **Clientes (listagem):** Pessoa Jurídica mostrava só a primeira letra. Agora a
  listagem escolhe o campo por `tipoPessoa` (**PJ → Empresa**, **PF → Nome**) e o
  service não grava o campo irrelevante (PJ não guarda `nome` órfão).
- **Produtos (código):** normalizado para **MAIÚSCULO** ao digitar e ao salvar;
  unicidade **case-insensitive** (`ABC001` = `abc001` = `AbC001`). Busca continua
  case-insensitive.

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
