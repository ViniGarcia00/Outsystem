# Sprint 1 — Cadastros Base (design/spec)

> Data: 2026-07-06 · Status: **aprovado** (com ajustes do usuário incorporados).
> Arquitetura base: Sprint 0 (aprovada). Este documento é o contrato da Sprint 1.

## Objetivo

Implementar os cadastros oficiais do sistema sobre **PostgreSQL real** (sem mocks,
sem banco em memória): **Configuração do Sistema**, **Clientes**, **Produtos** e
**Vendedores**, com CRUD completo, listagens padronizadas, validação, feedback e
guarda de dados não salvos.

## Decisões-chave (aprovadas)

1. **Camada de dados:** Server Actions (`"use server"`) → `services/` → Prisma.
   Retorno padronizado `ActionResult<T>`. Sem Route Handlers para o CRUD.
2. **Listagens:** processamento **no cliente** (busca instantânea, ordenação,
   paginação 20/pág) com TanStack Table. O service devolve apenas os registros
   necessários (respeitando "Mostrar Inativos") e **somente os campos usados na
   listagem** (performance).
3. **Logo (Configuração):** campo **texto/URL** nesta Sprint. Upload real fica
   para Sprint futura.
4. **Produto × Proposta:** **sem relacionamento** nesta Sprint (não criar vínculo
   artificial). Logo, produto é **excluível normalmente** na Sprint 1. Quando a
   Sprint de Propostas criar o vínculo, a regra de exclusão passa a valer
   automaticamente. Documentado no `ARCHITECTURE.md` e no `DECISIONS.md`.

## Banco de dados

- `docker-compose.yml` (PostgreSQL 17), `.env.development`, `.env.production`
  já existem e atendem ao spec (db `outmat_propostas`, `postgres`/`postgres`).
- A migration `init` já cria todas as tabelas/colunas da Sprint 1 → **nenhuma
  alteração de schema é necessária** para os cadastros.
- Bring-up: `docker compose up -d` → aguardar healthcheck →
  `npm run db:migrate:deploy` → `npm run db:seed`.
- **`seed.ts` reescrito** (o atual está quebrado: semeia `produto` com campo
  `nome` inexistente). Novo seed: produtos com `codigo`/`descricao`/`valorProduto`/
  `valorServico`; clientes PF e PJ com documentos válidos; upsert do singleton de
  configuração com dados de exemplo da empresa.

## Estrutura por feature

Para cada `features/{configuracoes,clientes,produtos,vendedores}`:

- `schema.ts` — Zod (fonte única de verdade para RHF + validação no servidor).
  - Cliente: `nome` obrigatório se PF; `empresa` obrigatório se PJ; `cpfCnpj`
    opcional mas validado (CPF/CNPJ) e único; `email` formato; demais opcionais.
  - Produto: `codigo` obrigatório/único; `descricao` obrigatório; `valorProduto`
    e `valorServico` decimais ≥ 0 (`valorServico` pode ser 0).
  - Vendedor: `nome` obrigatório; `telefone`/`email` opcionais.
  - Configuração: todos opcionais; `email`/`site` validados quando informados.
- `actions.ts` (`"use server"`) — wrappers finos `ActionResult<T>` + `revalidatePath`.
- UI da feature: componentes de listagem/formulário (client) usando a biblioteca
  `@/components/app`.

Services em `src/services/<entity>.service.ts`:
`list({ showInactive })`, `getById`, `create`, `update`, `remove`, `toggleAtivo`
(Configuração: apenas `get` + `upsert`). Selecionam só os campos necessários.

## Regras de exclusão / inativação

- **Cliente / Vendedor:** possuem relação `propostas`. `remove` conta propostas
  vinculadas; se > 0 → falha com a mensagem exata:
  `"Este registro já foi utilizado em propostas e não pode ser excluído. Utilize a opção Inativar."`
- **Produto:** sem relação nesta Sprint → exclusão sempre permitida.
- **Inativação:** `ativo` (default true). Listagens mostram só ativos; filtro
  **☐ Mostrar Inativos** revela os inativos. Exclusão **e** inativação exigem
  confirmação (ConfirmDialog).
- **Configuração:** singleton, sem excluir/inativar — apenas editar (upsert).

## Padrões de UI (obrigatórios e idênticos entre módulos)

- **Listagem — `CrudLayout`**, sempre nesta ordem: Cabeçalho (Título +
  Descrição) → Pesquisar → Botão Novo → Filtro "Mostrar Inativos" → Tabela →
  Paginação. Ações por linha: Editar, Excluir, Inativar/Reativar.
- **Formulário** — sempre: `PageHeader` → Formulário (`PageForm`) → Botões
  **Salvar** / **Cancelar**. Nada diferente entre os módulos.
- **Pesquisa:** casa qualquer parte do texto (substring), não só o início.
- **Autofocus:** ao abrir um cadastro **novo**, o primeiro campo recebe foco.
- **Após salvar:** redirecionar para a listagem + Toast de sucesso.
- **Toasts:** criar, editar, excluir, inativar, salvar.
- **Atalhos:** CTRL+S salva, ESC cancela.
- **FormDirtyGuard:** ao sair com alterações não salvas, exigir confirmação.

## Blocos compartilhados a criar (uma vez, reutilizados)

- `components/ui`: `form` (wrapper RHF), `textarea`, `checkbox`, `switch`,
  `select`, `sonner` + `<Toaster />` no `layout.tsx`. Instalados conforme os docs
  do Next 16 (lidos em `node_modules/next/dist/docs` antes de codar).
- `components/shared/form-dirty-guard.tsx` — bloqueio de navegação com `isDirty`.
- `hooks/use-form-shortcuts.ts` — CTRL+S / ESC.
- `hooks/use-crud-list.ts` — filtro (Mostrar Inativos) + busca/ordenação/
  paginação client-side sobre a lista do service.
- `components/forms/` — wrappers de campo (texto, textarea, select, checkbox);
  `currency-input` já existe.

## Melhorias adicionais (item 11 do usuário)

- **Scripts** padronizados no `package.json` (db:up/down, health, etc.).
- **README** completo.
- **VERSION** (arquivo de versão).
- **`/api/health`** (Route Handler — checa app + conexão ao banco).
- **Estrutura para logs** (LOG_PATH + logger já existentes; documentar/organizar).

## Documentação a atualizar/criar

`PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `VISION.md`, `CHANGELOG.md`,
`BACKLOG.md`, e **novo** `DECISIONS.md` (registro vivo de decisões
arquiteturais).

## Ordem de implementação (obrigatória)

Blocos compartilhados + bring-up do banco → **1. Configuração → 2. Clientes →
3. Produtos → 4. Vendedores**. Um módulo por vez; só avançar após concluir o
anterior.

## Critério de aceite (gate)

`npm run lint` e `npm run build` limpos; migrations aplicadas; seed executado;
CRUD dos 4 módulos validado contra PostgreSQL real; pesquisa, paginação,
ordenação, filtro de inativos, toasts e FormDirtyGuard funcionando.

## Fora de escopo (explicitamente adiado)

Upload real de logo/arquivos; paginação server-side; qualquer `produtoId` em
itens de proposta; regras de negócio de propostas.
