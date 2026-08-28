# DECISIONS.md — Outmat Propostas

> Registro vivo das **decisões arquiteturais** do projeto. Mantido durante toda a
> evolução do sistema. Cada decisão traz contexto, a decisão em si, e as
> consequências. Ordem cronológica (mais recentes ao final de cada Sprint).

Formato: **ADR** enxuto (Architecture Decision Record).

---

## Sprint 0 — Fundação

### ADR-0001 — Clean Architecture + Feature-First

- **Contexto:** sistema interno de propostas, alvo Windows Server 2019, evolução
  por Sprints.
- **Decisão:** camadas `app → features → services → infrastructure`, com
  transversais (`lib`, `utils`, `types`, `hooks`, `components`). Dependências
  sempre para dentro. Sem regra de negócio em componentes.
- **Consequência:** componentes nunca importam Prisma; acesso a dados passa por
  `services`.

### ADR-0002 — Prisma 7 com driver adapter e client gerado

- **Decisão:** Prisma 7, generator `prisma-client` (saída `src/generated/prisma`),
  driver adapter `@prisma/adapter-pg`. Client gerado **não** versionado.
- **Consequência:** `postinstall` roda `prisma generate`.

### ADR-0003 — `ConfiguracaoSistema` como singleton

- **Decisão:** um único registro (`id = "singleton"`). Ponto único de expansão
  de configurações futuras sem alterar estrutura de camadas.

---

## Sprint 1 — Cadastros Base

### ADR-0101 — PostgreSQL real no desenvolvimento (Docker)

- **Contexto:** na Sprint 0 não havia banco no dev (migrations geradas offline
  com `prisma migrate diff`).
- **Decisão:** a partir da Sprint 1 o dev usa **PostgreSQL 17 real** via
  `docker-compose.yml` (db `outmat_propostas`, `postgres`/`postgres`). Fluxo:
  `docker compose up -d` → `prisma migrate deploy` → `prisma db seed`. Proibido
  mock ou banco em memória. A aplicação e o Prisma sempre leem `DATABASE_URL` do
  `.env`.
- **Consequência:** CRUD é validado contra Postgres real; `.env.development` e
  `.env.production` documentam os ambientes.

### ADR-0102 — Camada de dados via Server Actions

- **Decisão:** o CRUD usa **Server Actions** (`"use server"`) que chamam
  `services`, retornando `ActionResult<T>`. Não há Route Handlers para o CRUD
  (apenas `/api/health` como endpoint operacional).
- **Consequência:** menos boilerplate, sem API HTTP manual; validação Zod
  compartilhada entre cliente (RHF) e servidor (action).

### ADR-0103 — Listagens processadas no cliente

- **Decisão:** busca (substring, qualquer parte do texto), ordenação e paginação
  (20/pág) ocorrem **no cliente** com TanStack Table. O service devolve apenas os
  registros necessários (respeitando "Mostrar Inativos") e **somente os campos
  exibidos** na listagem.
- **Consequência:** busca instantânea; adequado ao volume de cadastros. Caso
  algum cadastro cresça para milhares de registros, reavaliar paginação
  server-side (ver BACKLOG).

### ADR-0104 — Produto sem relação com Proposta na Sprint 1

- **Contexto:** a regra de exclusão diz "se usado em proposta, não excluir".
- **Decisão:** **não** criar relacionamento artificial entre `Produto` e
  `Proposta` agora. Na Sprint 1 o produto é **excluível normalmente**. O vínculo
  (`produtoId` em itens de proposta) será criado na **Sprint de Propostas**, e a
  regra de exclusão passará a valer automaticamente (como já ocorre para Cliente
  e Vendedor, que possuem relação `propostas`).
- **Consequência:** `ProdutoService.remove` não faz checagem de uso nesta Sprint;
  a checagem será adicionada quando o relacionamento existir.
- **Atualização (Sprint 2.2 — ADR-0207):** o vínculo existe (`PropostaItem.produtoId`)
  e a regra está **ativa** — produto usado em proposta não pode ser excluído.

### ADR-0105 — Logo como texto/URL (sem upload na Sprint 1)

- **Decisão:** o campo `logo` da Configuração é apenas texto/URL nesta Sprint.
  Upload real de arquivo (para `UPLOAD_PATH`/storage) fica para Sprint futura.
- **Consequência:** nenhuma escrita em disco de uploads na Sprint 1.

### ADR-0106 — Padrão único de tela (CrudLayout + PageForm)

- **Decisão:** toda listagem usa `CrudLayout` na ordem fixa Cabeçalho →
  Pesquisar → Novo → Mostrar Inativos → Tabela → Paginação. Todo formulário usa
  `PageHeader` + `PageForm` + botões Salvar/Cancelar, idêntico entre módulos.
  Autofocus no primeiro campo ao criar; após salvar, redireciona para a listagem
  com toast; exclusão e inativação sempre confirmam.
- **Consequência:** consistência visual garantida por construção.

---

## Sprint 1.5 — Polimento, UX e Preparação

### ADR-0150 — Estratégia de testes: Playwright (Smoke Tests)

- **Contexto:** era preciso garantir os fluxos principais antes do módulo de
  Propostas, sem investir em uma suíte E2E pesada.
- **Decisão:** adotar **Playwright** para **smoke tests** (E2E leves) cobrindo
  navegação e o CRUD básico de Clientes, contra a aplicação real (banco nativo).
  Apenas **Chromium** e execução **serial** (os testes escrevem no banco). O
  `webServer` do Playwright sobe a aplicação automaticamente. Testes ficam em
  `e2e/`; comando `npm run test:e2e`.
- **Consequência:** regressões de navegação/CRUD são detectadas rapidamente;
  suíte enxuta e barata. Testes de unidade continuam no Vitest.

### ADR-0151 — Estratégia de impressão (print.css)

- **Contexto:** o futuro Preview HTML da proposta e a geração de PDF precisam de
  uma base de impressão, mas o Preview **não** é implementado agora.
- **Decisão:** criar `src/app/print.css` (importado no `globals.css`) com
  `@page` (A4), utilitários (`.no-print`, `.print-only`, `.print-avoid-break`,
  `.print-break-before`, `.print-page`) e regras `@media print` que ocultam o
  chrome da aplicação (sidebar/header/toasts) e neutralizam superfícies. O
  `.print-page` é o cânvas A4 base do Preview futuro.
- **Consequência:** a Sprint de Propostas parte de uma base de impressão pronta,
  sem reescrever CSS.

### ADR-0152 — Estratégia de UX e acessibilidade

- **Decisão:** padrões transversais consolidados: autofocus no 1º campo,
  atalhos CTRL+S/ESC, ENTER submete o formulário, confirmação em excluir/inativar,
  `FormDirtyGuard` para dados não salvos, toasts em todas as operações,
  carregamento com **skeleton** de tabela (não spinner), e acessibilidade por
  padrão (labels ligadas via `FormControl`, `aria-label` em ícones/busca/filtro,
  `aria-invalid`/`aria-describedby` nos campos, foco visível). Componentes leaf
  presentacionais (`StatusBadge`, `SortableHeader`) usam `React.memo`.
- **Consequência:** experiência consistente e navegável por teclado em todas as
  telas.

### ADR-0153 — Performance: eficiência estrutural antes de memoização

- **Decisão:** priorizar eficiência estrutural — colunas definidas em nível de
  módulo (identidade estável), seletores memoizados no `useCrudList`
  (`useMemo`/`useCallback`), listagens que buscam **apenas os campos exibidos** e
  recarregam somente em mutação/troca de filtro — em vez de `React.memo` em toda
  parte. `React.memo` é aplicado apenas em componentes leaf baratos. Para os
  volumes atuais (cadastros client-side), evita-se otimização prematura.
- **Consequência:** re-renderizações e consultas já enxutas; se algum cadastro
  crescer para milhares de registros, migrar para paginação server-side
  (ver BACKLOG).

### ADR-0154 — Responsividade (sistema interno)

- **Decisão:** validar layout em 1366×768, 1920×1080, tablet e mobile. Padrões:
  container central `max-w-7xl`, grids de formulário `sm:grid-cols-2` (1 coluna
  no mobile), sidebar recolhível/off-canvas (Sheet) no mobile, tabelas com rolagem
  horizontal quando necessário. Nenhuma quebra de layout permitida.
- **Consequência:** o mesmo sistema atende às resoluções-alvo sem quebras.

### ADR-0159 — Padrão oficial de cores dos badges/estados

- **Contexto:** os selos de estado precisavam de um padrão único em todo o sistema.
- **Decisão:** cores semânticas oficiais, aplicadas em todo o projeto:
  - **Verde (`success`):** Ativo, Habilitado, Concluído, Sucesso.
  - **Vermelho (`danger`):** Inativo, Desabilitado, Erro.
  - **Amarelo (`warning`):** Pendente, Atenção.
  - **Azul (`info`):** Informação, Em andamento.
  - Implementadas como variantes do `Badge` (`@/components/ui/badge`),
    theme-aware (claro/escuro). `StatusBadge` usa `success` (Ativo) e `danger`
    (Inativo).
- **Consequência:** consistência visual de estados em todas as telas; novas telas
  devem reutilizar essas variantes.

### ADR-0158 — Processo de release: checklist, histórico e commit por Sprint

- **Contexto:** garantir que toda Sprint termine em estado verificável e
  rastreável.
- **Decisão:** toda Sprint só é concluída após o gate de `docs/CHECKLIST_RELEASE.md`
  (lint, typecheck, build, smoke tests, health, diagnostics, banco/Prisma
  conectados, docs/CHANGELOG/VERSION atualizados) e **termina obrigatoriamente
  com um commit**. O histórico de cada Sprint é registrado em
  `PROJECT_HISTORY.md` (objetivo, entregas, ADRs, problemas, soluções, lições,
  hash do commit).
- **Consequência:** rastreabilidade completa por Sprint; critérios de aceite
  uniformes e explícitos.

### ADR-0157 — Post-mortem: lentidão/travamento de conexão no dev (causa raiz)

- **Sintoma:** durante a Sprint 1.5, as rotas que consultam o banco no `next dev`
  ficaram lentas (6→10→12s) e depois travaram; `psql`/Prisma/`db:validate`
  expiravam.
- **Causa raiz (confirmada):** **não** era código, IPv6/`localhost`, nem o antigo
  conflito de porta. Era a **instância do PostgreSQL nativo em estado travado**
  (postmaster vivo e escutando na 5432 — a porta aceitava TCP —, mas **sem
  responder ao handshake de startup/autenticação**; log congelado no horário de
  inicialização; 0 conexões estabelecidas). O serviço do Windows aparecia
  `Stopped` no SCM enquanto o processo `postgres.exe` continuava órfão/preso.
- **Gatilho:** uma "tempestade de conexões" durante o diagnóstico (reinícios à
  força repetidos do dev server, cada um abrindo pool; um `db:validate` pendurado)
  levou o postmaster ao estado preso.
- **Correção:** **restart limpo do PostgreSQL** (encerrar o postmaster travado +
  `Start-Service postgresql-x64-18`). Após o restart: conexão ~168ms, consulta
  ~3ms, rotas 75–260ms. **Nenhuma alteração de código/arquitetura** foi
  necessária (a `DATABASE_URL` permanece com `localhost`).
- **Aprendizado / prevenção:** não reiniciar o dev server à força em série; usar
  `/dev/diagnostics` para flagrar o problema em segundos. Endurecimento opcional
  (fail-fast com timeout de conexão) registrado no BACKLOG — **não** aplicado
  agora para evitar workaround/mudança de comportamento não solicitada.

### ADR-0156 — Página de diagnóstico só em desenvolvimento (`/dev/diagnostics`)

- **Contexto:** problemas de infraestrutura/conexão são difíceis de diagnosticar
  sem depender de logs ou ferramentas externas.
- **Decisão:** criar `/dev/diagnostics` (server component) que mede tempo de
  conexão, tempo de consulta simples, versão do PostgreSQL, ambiente, status do
  Prisma e tempo de resposta da aplicação. A página **não existe em produção**:
  `notFound()` quando `NODE_ENV === "production"`. A coleta fica no service
  `diagnostics.service.ts` (Prisma nunca em componente).
- **Consequência:** diagnóstico rápido de infraestrutura em dev; nenhuma
  superfície exposta em produção.

### ADR-0155 — Limpeza de componentes superados vs. primitivos genéricos

- **Contexto:** a biblioteca da Sprint 0 tinha componentes não utilizados.
- **Decisão:** remover componentes **superados** por peças de mais alto nível
  (`PageActions`, `PageSection`, `PageContainer` — cobertos por `CrudFormShell`/
  `CrudListView`/`AppPage`) e primitivos sem uso (`scroll-area`). Manter
  primitivos genéricos ainda úteis mesmo sem consumidor atual (`Loading`,
  `Skeleton` — este passou a ser usado pelo `TableSkeleton`).
- **Consequência:** menor superfície morta, sem descartar primitivos reutilizáveis.

---

## Sprint 2.1 — Fundação do Módulo de Propostas

### ADR-0201 — Numeração da proposta via sequência do PostgreSQL

- **Contexto:** `proposalNumber` deve ser sequencial, começar em 1001 e **nunca**
  ser reutilizado (canceladas mantêm o número; duplicar gera o próximo).
- **Decisão:** `proposalNumber` passa a ser `@default(autoincrement())` (sequência
  nativa do Postgres `propostas_proposalnumber_seq`), com a migration executando
  `ALTER SEQUENCE ... RESTART WITH 1001`. A sequência é atômica e não reutiliza
  valores mesmo após exclusão/cancelamento.
- **Consequência:** numeração confiável sem lógica de aplicação nem corrida de
  concorrência. O `id` (cuid) permanece como chave interna.

### ADR-0202 — Revisões versionam CONTEÚDO; cabeçalho fica na Proposta

- **Decisão:** **Cliente, Vendedor e Modelo pertencem ao cabeçalho da `Proposta`
  e NÃO são versionados.** As revisões (`PropostaRevisao`) versionam o **conteúdo**
  (seções/itens das próximas Sprints). A `Rev.0` é criada junto com a proposta;
  "nova revisão" cria `Rev.(N+1)` e a torna atual (anteriores read-only). Não é
  permitido criar revisão quando a proposta está `CANCELADA`.
- **Consequência:** respeita a modelagem da Sprint 0 (sem remodelar); evita
  interpretações divergentes sobre o que é versionado.

### ADR-0203 — Cancelamento (nunca excluir) + não copiar obsInternas na duplicação

- **Decisão:** propostas **não são excluídas** — apenas **canceladas** (ação
  Cancelar, com `motivoCancelamento` obrigatório; `obsCancelamento` obrigatório
  quando "Outro"). A proposta cancelada permanece no banco, nas pesquisas, no
  histórico e com todas as revisões, e não pode mais ser editada. A **duplicação**
  copia `clienteId/vendedorId/modelo/validadeDias/obsProposta`, gera novo número e
  `Rev.0`, status `RASCUNHO`, e **não copia** `obsInternas` (anotações internas de
  negociação), status, datas, auditoria, motivo/obs de cancelamento, número nem
  revisão.
- **Consequência:** rastreabilidade total; anotações internas não vazam para a
  cópia.

### ADR-0204 — Ciclo de vida: transições, datas imutáveis e auditoria

- **Decisão:**
  - **Transições permitidas:** `RASCUNHO→{EMITIDA,CANCELADA}`,
    `EMITIDA→{APROVADA,REPROVADA,CANCELADA}`, `APROVADA→{CANCELADA}`,
    `REPROVADA→{CANCELADA}`, `CANCELADA→{}`. Nunca retornar a status anterior. O
    service valida; o select do formulário só oferece transições válidas
    (Cancelada apenas via ação Cancelar).
  - **Datas de status imutáveis:** `emitidaAt/aprovadaAt/reprovadaAt/canceladaAt`
    são preenchidas apenas na **primeira** transição correspondente e **nunca**
    sobrescritas.
  - **Auditoria:** toda mutação (criação, alteração, nova revisão, duplicação,
    mudança de status, cancelamento) grava `PropostaAuditoria` na **mesma
    transação** (data/hora, evento, revisão, observação). Sem tela nesta Sprint.
- **Consequência:** histórico fiel e consistente; operações atômicas.

### ADR-0207 — Item da revisão: snapshot + vínculo + tipo (exclusão de produto ativa)

- **Contexto:** produtos entram no conteúdo da revisão (Sprint 2.2).
- **Decisão:** `PropostaItem` guarda um **snapshot imutável** do produto no
  momento (`codigo`, `descricao`, `unidade`, `valorProduto`, `valorServico`) —
  alterações futuras no cadastro **não** mudam propostas já montadas. Mantém
  `produtoId` (FK, **RESTRICT**) para rastreabilidade e para a regra de exclusão.
  Campo `tipo TipoItemProposta` (`PRODUTO`/`SERVICO`, default `PRODUTO`) já
  preparado para a próxima Sprint (só PRODUTO é usado agora). `quantidade` é
  `Decimal(12,3)` (permite frações). `Produto` ganhou `unidade` (origem do
  snapshot).
- **ADR-0104 agora ATIVA:** `ProdutoService.remove` bloqueia a exclusão de
  produto usado em qualquer item de proposta ("… Utilize a opção Inativar.").
- **Consequência:** histórico de preço preservado; produto rastreável; regra de
  exclusão consistente com Cliente/Vendedor.

### ADR-0208 — Cópia profunda de conteúdo (nova revisão e duplicação) + ordenação

- **Decisão:** **nova revisão** copia em profundidade todas as seções e itens
  (com snapshots, quantidades e ordem) da revisão atual; a revisão anterior fica
  **imutável**. A **duplicação** de proposta copia o conteúdo da revisão atual da
  origem para a nova `Rev.0`. Somente a revisão atual (e proposta não cancelada) é
  editável. **Ordenação** (`ordem`) é única dentro da seção (itens) e da revisão
  (seções), **contígua** a partir de 0, **sem buracos** — remover renumera; mover
  ↑/↓ troca com o vizinho.
- **Consequência:** PDF, histórico e comparação entre versões (futuros) operam
  sobre a Revisão sem migração; ordenação simples e previsível.

### ADR-0206 — Conteúdo comercial vive na Revisão (diretriz para as próximas Sprints)

- **Contexto:** a partir da Sprint 2.2 serão implementados seções/ambientes,
  produtos, serviços, textos, totais, descontos, frete e impostos.
- **Decisão (diretriz fixa):** **todo o conteúdo comercial** da proposta deve
  existir **exclusivamente dentro da `PropostaRevisao`**. `Cliente`, `Vendedor`,
  `Modelo` e demais dados de **cabeçalho permanecem na `Proposta`** e **NÃO são
  versionados**. Estrutura alvo:

  ```
  Proposta
   ├── Cabeçalho (cliente, vendedor, modelo, validade, status, datas) — NÃO versionado
   ├── Revisão 0
   │     ├── Seções (ambientes)
   │     ├── Produtos
   │     ├── Serviços
   │     ├── Observações comerciais
   │     └── Totais
   ├── Revisão 1
   └── Revisão N
  ```

- **Consequência:** criar nova revisão copia o **conteúdo comercial completo**;
  PDF, histórico e comparação entre versões operam sobre a Revisão **sem migração
  futura**. Reforça a ADR-0202.

### ADR-0205 — Tipo da proposta (Comercial/Simplificada): apenas persistência

- **Decisão:** o tipo/modelo é apenas **armazenado** (`modelo`) nesta Sprint —
  nenhuma diferença de layout, produtos, serviços ou cálculo. A arquitetura já
  carrega a informação para as próximas Sprints usarem.
- **Consequência:** evolução futura sem migração de dados; sem lógica específica
  prematura.

### ADR-0209 — Seed NÃO-destrutivo e idempotente (proteção de dados)

- **Contexto (post-mortem):** o `prisma/seed.ts` executava `deleteMany()` em
  `proposta`, `produto`, `vendedor` e `cliente` e recriava apenas os dados de
  exemplo. Como `npm run db:seed` faz parte de `db:setup` e foi rodado nas
  Sprints 2.1 e 2.2, **todo cadastro inserido manualmente foi apagado** a cada
  execução. Causa raiz única da perda de dados relatada (o banco e a
  `DATABASE_URL` nunca mudaram; nenhum `migrate reset` foi executado).
- **Decisão:** o seed passa a ser **não-destrutivo e idempotente**:
  - **nunca** executa `deleteMany`/`truncate`/`reset`;
  - a Configuração (singleton) é garantida via `upsert` com `update: {}` — nunca
    sobrescreve valores existentes;
  - os cadastros/propostas de exemplo só são criados quando o banco está
    **vazio** (soma das contagens de cliente/vendedor/produto/proposta = 0). Com
    qualquer dado presente, o seed não popula nem apaga nada.
- **Consequência:** `db:seed`/`db:setup` são seguros para rodar a qualquer
  momento; dados manuais são preservados. Scripts de teste (`db:validate`,
  smoke) usam `deleteMany` **apenas com `where` restrito aos próprios registros
  de teste** — permitido por serem escopados.

### ADR-0210 — UX de Propostas: listagem enxuta, Modelo em destaque, Cliente por autocomplete

- **Decisão (listagem):** remover as colunas **Validade** e **Modelo da
  proposta** — a listagem foca em Número, Revisão, Cliente, Vendedor, Status,
  Última alteração e Ações. Filtros e paginação inalterados.
- **Decisão (formulário):** **Modelo da proposta** passa a ser o **primeiro
  campo, em linha inteira** (decisão que condiciona o restante do formulário);
  Cliente, Vendedor, Validade e Status seguem em grade de duas colunas.
- **Decisão (Cliente):** o Select tradicional é substituído por um
  **autocomplete** (`ClienteAutocompleteField`) com busca sob demanda no servidor
  (`searchClientes`) por **Nome, Razão Social, CPF e CNPJ**, a partir de 3
  caracteres; o documento é comparado ignorando a máscara. Não havia componente
  de autocomplete no projeto — este é o primeiro, reutilizável para buscas
  futuras. O componente é *client* e importa o service **apenas como tipo**
  (`import type`) para não arrastar o Prisma ao bundle; os dados chegam pela
  Server Action.
- **Consequência:** o formulário não pré-carrega mais a lista completa de
  clientes (`getPropostaFormOptions` retorna só vendedores), reduzindo o payload
  inicial e escalando melhor com muitos clientes.

### ADR-0211 — Fluxo workspace-first, revisão automática e emissão (refino pré-2.3)

- **Contexto:** o fluxo antigo tinha etapa de cabeçalho separada, botões manuais
  de "Salvar" e "Nova Revisão", e cinco status. Objetivo: aproximar do comportamento
  de ERP e simplificar a operação.
- **Decisão (workspace único):** `/propostas/[id]` cria/edita/revisa. "Nova
  proposta" cria imediatamente a proposta completa **já numerada** (autoincrement),
  `RASCUNHO`, Rev.0, e abre o workspace. Rotas `/propostas/nova` e
  `/propostas/[id]/editar` **removidas**.
- **Decisão (auto-save):** em RASCUNHO tudo salva sozinho (cabeçalho no blur de
  cada campo; conteúdo por operação). **Sem botão "Salvar"**; indicador "Última
  alteração salva às HH:mm".
- **Decisão (revisão automática):** `ensureEditableRevision` é o ponto único de
  toda mutação. Se a proposta está **EMITIDA**, a 1ª alteração cria automaticamente
  a **Rev.N+1** (cópia profunda do conteúdo), torna-a a revisão atual e volta o
  status a **RASCUNHO** — sem confirmação nem botão "Nova Revisão". Quando o alvo é
  uma seção/item **existente**, o `copiarConteudo` devolve um **`idMap`
  (id-antigo → id-novo)** e a operação **retraduz o alvo** para o item correto da
  nova revisão (trecho verificado por teste dedicado).
- **Decisão (emissão / "Gerar PDF"):** `emitirProposta` valida cliente + ≥1 item,
  define `EMITIDA` + `emitidaAt` e `PropostaRevisao.emittedAt` (congela a versão) e
  audita `EMISSAO`. O PDF binário fica para Sprint futura; a semântica de
  emissão/congelamento já opera. Congelamento é implícito: qualquer edição posterior
  forka.
- **Decisão (status):** reduzido a **RASCUNHO · EMITIDA · CANCELADA** (removidos
  APROVADA/REPROVADA e as colunas `aprovadaAt`/`reprovadaAt`). Status é 100%
  dirigido pelo sistema — não há seletor manual.
- **Decisão (cliente temporário):** `Proposta.clienteId` passa a `String?` **apenas**
  como estado de montagem do rascunho. A regra "proposta válida tem cliente"
  permanece: workspace foca o campo Cliente e mostra aviso de "proposta incompleta"
  enquanto ausente; a emissão é bloqueada. `null` nunca é conceito permanente.
- **Consequência:** menos telas, menos cliques, auditoria granular preservada,
  histórico por revisão (`emittedAt`) pronto para PDF/comparação futuras.

### ADR-0212 — Homologação 0.6.1: criação diferida, home Propostas, revisão única visual

- **Home:** enquanto não houver Dashboard, `/` redireciona para `/propostas` e o
  item Dashboard sai da navegação (rota `/dashboard` removida).
- **Criação diferida (revisa parte da ADR-0211):** a numeração **eager** é
  substituída por **criação sob confirmação**. "Nova proposta" abre um
  **workspace de montagem 100% em memória** (`NovaPropostaWorkspace`, rota
  `/propostas/nova` client-side): cabeçalho + seções + produtos **não** tocam o
  banco. O botão **"Criar Proposta"** persiste tudo numa **única transação**
  (`criarPropostaCompleta`): consome o próximo número, cria Rev.0, grava
  cabeçalho/seções/produtos (snapshot autoritativo do produto no servidor) e
  inicia a auditoria (`CRIACAO`). Fechar/cancelar antes ⇒ nada existe, nenhum
  número consumido — elimina lacunas por abandono. `proposalNumber` segue
  autoincrement (sem `null`).
- **Editor de conteúdo reutilizável:** as operações de conteúdo passam por uma
  interface `ConteudoActions` (`conteudo-handlers`). O mesmo `ConteudoEditor`/
  `SecaoCard` serve aos dois fluxos: `serverConteudoActions` (proposta
  persistida, auto-save) e uma implementação **em memória** (criação). Zero
  duplicação de UI.
- **Revisão única (visual):** removido o rótulo "Conteúdo — Rev.N"; a revisão
  aparece **uma vez** (no título). O modelo já tinha um único `revisionNumber`;
  toda alteração (cabeçalho ou conteúdo) participa da mesma revisão via
  `ensureEditableRevision`. *Nota:* os valores do cabeçalho seguem em `Proposta`
  (não versionados, ADR-0206); o snapshot do cabeçalho por revisão fica para
  quando o PDF/histórico for implementado.
- **Autocomplete:** o sub-rótulo do cliente passa a exibir o **documento**
  (CPF/CNPJ) em vez de "Pessoa física/jurídica", para diferenciar homônimos.
- **Modelo:** o campo ocupa ~metade da linha (restante reservado para campos
  futuros).

### ADR-0213 — Homologação 0.6.3: Simplificada, autocomplete de produto, valor editável, grade

- **Dashboard:** reposto no menu (placeholder); a home (`/`) segue abrindo
  Propostas até o Dashboard existir.
- **Cliente obrigatório na criação:** o botão "Criar Proposta" fica desabilitado
  enquanto não há cliente (mensagem de obrigatoriedade); `novaPropostaSchema`
  passa a exigir `clienteId`. Após criada, valem as regras atuais (cliente
  exigido na emissão).
- **Modelo Simplificada = seção única implícita (sem migração):** em vez de tornar
  `PropostaItem.secaoId` opcional, a Simplificada usa **uma seção implícita**
  ("Produtos", criada sob demanda) e a UI esconde o conceito de seção — produtos
  entram direto na proposta (lista plana). Comercial mantém seções. Operação
  `adicionarItemAvulso` (garante a seção única) na versão servidor e memória.
  Preserva fork/`idMap`/auditoria/cópia intactos.
- **Autocomplete de produto:** extraído um **`Autocomplete` genérico**
  (`components/forms`) reutilizado por Cliente e Produto. `ProdutoAutocomplete`
  busca por código/descrição (3+ chars); substitui o Select no diálogo de item.
- **Valor unitário editável:** ao adicionar, o valor vem do cadastro e é
  **editável**; também editável na grade. Grava no **snapshot** do item
  (`valorProduto`), nunca no cadastro. Novo `atualizarValorUnitario`; `adicionarItem`
  e `criarPropostaCompleta` aceitam `valorUnitario`.
- **Grade de produtos:** colunas **Código · Descrição · Qtd · UN · Valor Unitário
  · Total · Ações**; Total = Qtd × Valor Unitário (apenas visual). Sem
  total/subtotal/descontos/impostos/frete. Grade extraída em `ItensTable`,
  reutilizada por Comercial (dentro do `SecaoCard`) e Simplificada (lista plana).

### ADR-0214 — Edição por "Salvar Alterações" (fim do auto-save para propostas existentes)

- **Contexto:** o auto-save por operação em propostas existentes gerava revisões
  automáticas durante a digitação e uma experiência ruim.
- **Decisão:** a proposta existente passa a editar **em memória** (como a
  criação) e persistir tudo de uma vez em **"Salvar Alterações"**. `Nova Proposta`
  permanece inalterada. Unifica os dois workspaces no mesmo modelo (hook
  `useConteudoMemoria`).
- **`salvarProposta(id, payload)`** (transação única): se a proposta estava
  **EMITIDA**, cria a **Rev.N+1** e volta a **RASCUNHO** (a **revisão automática
  passa a acontecer só no salvamento**); grava o cabeçalho e **substitui** o
  conteúdo da revisão editável pelo estado enviado (delete escopado à revisão +
  recria; cascade). **Auditoria consolidada** na mesma transação.
- **Aviso ao sair:** reutiliza o `FormDirtyGuard`/`NavigationBlocker` existentes —
  confirmação em navegação por links e `beforeunload` (fechar/atualizar); os
  botões próprios (Voltar/Cancelar) confirmam quando há pendências. **"Gerar
  PDF"** fica desabilitado enquanto houver alterações não salvas.
- **Consequência (limpeza):** removidos o auto-save de conteúdo/cabeçalho
  (`ensureEditableRevision`, `updateCabecalho`, as Server Actions de conteúdo e o
  `serverConteudoActions`) — código morto. O `idMap` deixou de ser necessário
  (não há mais fork por-operação). Sem migração. "Nada de revisão durante a
  digitação" é garantido por construção (nada persiste até salvar).

---

## Sprint 2.3 — Serviços (Projeto de Automação)

### ADR-0215 — Serviço faz parte do cadastro do Produto (não é entidade independente)

- **Contexto:** chegou-se a esboçar um cadastro **separado** de Serviços
  (tabela/CRUD/autocomplete/`servicoId`); a regra de negócio correta é outra.
- **Decisão:** **não** existe entidade Serviço independente. O **valor de serviço
  faz parte do cadastro do Produto** (`Produto.valorProduto` + `valorServico`).
  Ao adicionar um produto na proposta, **ambos** os valores são copiados para o
  item (snapshot `PropostaItem.valorProduto` + `valorServico`) e ficam
  **editáveis apenas naquela proposta** — sem alterar o cadastro.
- **Cálculos por linha (apenas visuais):** Total Produto = Qtd × Valor Produto;
  Total Serviço = Qtd × Valor Serviço; Total da Linha = Total Produto + Total
  Serviço.
- **Modelagem:** **sem migração** — o schema já tinha `valorProduto` +
  `valorServico` em `Produto` e `PropostaItem`. O esboço de "Serviço separado"
  foi revertido e o banco de dev **resetado** (autorização explícita do usuário)
  ao estado das 4 migrations legítimas.
- **Consequência:** uma única arquitetura de item; o diálogo e a grade passam a
  tratar os dois valores; auditoria consolidada (ADR-0214) cobre tudo sem exceção.
  Não foram criados: tabela `servicos`, CRUD, autocomplete de serviço, `servicoId`
  ou módulo de Serviço.

### ADR-0217 — Enquadramento "Projeto de Automação" e forward-compatibility (documental)

- **Decisão (conceitual, sem código):** o conteúdo atual da proposta (Revisão →
  Seções → Itens) **é** o **Projeto de Automação**. **Projeto de Som** e **Projeto
  de Wi-Fi** são módulos **futuros** e **NÃO** são modelados agora — sem tabela
  `Projeto`, módulo, soluções, templates ou pacotes.
- **Forward-compatibility:** a arquitetura de item é genérica; no futuro, uma
  camada **"Projeto"** pode ser inserida de forma **aditiva** (Revisão → Projetos
  → Seções → Itens) sem reescrever a arquitetura de itens. Nenhuma nomenclatura
  "automação" foi gravada em schema/código (o módulo continua "Propostas"); o
  enquadramento é apenas conceitual.

---

## Sprint 2.4 — Ajustes funcionais (parte 1)

### ADR-0218 — Simplificada é apresentação; máscara monetária; validade da proposta

- **Simplificada = regra de APRESENTAÇÃO (sem tocar dados):** no modelo
  Simplificada a grade oculta **Valor Serviço**, **Total Produto** e **Total
  Serviço**, e o **Total** passa a ser Qtd × Valor Produto. Os valores de serviço
  **continuam armazenados** no snapshot — nada é excluído, o modelo/snapshot não
  muda. Trocar para **Completa** faz tudo reaparecer sem perda nem recálculo
  (verificado). A distinção vive só na UI, dirigida pelo `modelo` (`ItensTable`
  recebe `simplificada`; o diálogo recebe `mostrarServico`).
- **Máscara monetária (BRL):** os campos de valor do item (Valor Produto / Valor
  Serviço) usam máscara `R$ 0,00` reutilizando o `CurrencyInput` existente
  (armazenamento continua numérico; máscara é só exibição). Os mesmos componentes
  servirão a Desconto/Frete/Totais nas próximas Sprints.
- **Validade da proposta:** o campo de cabeçalho é rotulado **"Validade da
  proposta"** (em dias; usado futuramente no PDF). Sem mudança de modelo
  (`validadeDias`).
- **Consequência:** sem nova tabela/entidade/migração; apresentação condicionada
  ao tipo da proposta, com dados sempre completos no banco.

### ADR-0219 — Totais da proposta: derivados em tempo real, não persistidos

- **Decisão:** o rodapé financeiro (**Total Produtos**, **Total Serviços**,
  **Subtotal**) é **calculado em tempo real** a partir dos itens — **nada é
  gravado** no banco nem faz parte do snapshot. Sem botão de recalcular: o React
  recompõe a cada mutação (inclusão/remoção de item, alteração de quantidade ou
  de valor).
- **Centralização (anti-duplicação):** um único utilitário `totais.ts`
  (`totalProdutoLinha`/`totalServicoLinha`/`totalLinha` + `calcularTotais`) é a
  fonte da lógica, reutilizado pela grade (`ItensTable`) e pelo rodapé
  (`RodapeTotais`), e preparado para estender nas próximas Sprints (Desconto,
  Frete, PDF) sem reescrever os cálculos de base.
- **Simplificada (apresentação, ADR-0218):** o rodapé oculta **Total Serviços** e
  o **Subtotal = Total Produtos**; os valores de serviço seguem existindo
  internamente — só a exibição muda. Valores à direita, máscara BRL.
- **Fora de escopo (próximas Sprints):** desconto, frete, total final, impostos,
  custos, margem, lucro, condições comerciais, PDF.

---

## Sprint 2.5 — Desconto da proposta

### ADR-0220 — Desconto: campo único inteligente + modelagem separada tipo/valor

- **UX (campo inteligente):** um único campo. Digitar `500` ⇒ desconto em
  **VALOR** (R$ 500,00); acrescentar `%` (`10%`, `7,5%`) ⇒ **PERCENTUAL**. Sem
  botão/seletor. Ao sair do foco, formata a exibição (R$ ou %). Placeholder
  "Ex.: 500 ou 10%" + ajuda "Digite um valor… ou acrescente % …".
- **Persistência (modelagem separada):** NUNCA se grava a string. Persistem-se
  **`Proposta.tipoDesconto`** (enum VALOR|PERCENTUAL) + **`valorDesconto`**
  (Decimal). Migration aditiva `20260707040000_desconto` (defaults VALOR/0). O
  desconto fica na **Proposta** (nível-proposta, junto de modelo/validade); o
  congelamento por-revisão (com o cabeçalho) fica para o PDF (Sprint 2.7).
- **Cálculo em tempo real (helper central, ADR-0219):** `totais.ts` ganha
  `aplicarDesconto(subtotal, desconto)` e `calcularTotais` passa a devolver
  `descontoAplicado` + `totalProposta`. **Regras (clamp):** VALOR ≥ 0 e nunca >
  Subtotal; PERCENTUAL 0–100%. Fluxo: **Subtotal → Desconto → Total da Proposta**
  (nunca negativo). Recalcula a cada mutação (item/quantidade/valor/desconto);
  sem botão de recalcular.
- **Simplificada (apresentação):** o Subtotal (e a base do desconto) considera só
  os produtos; Total Serviços oculto. Valores de serviço seguem existindo.
- **Consequência:** rodapé passa a exibir Subtotal · Desconto · **Total da
  Proposta**. Componente `DescontoInput` (reutilizável) + tipo `Desconto` no
  helper. Fora de escopo: frete, total final, impostos, PDF (próximas Sprints).

---

## Sprint 2.6 — Frete da proposta

### ADR-0221 — Frete: valor manual na Proposta, somado ao Total (derivado)

- **Decisão:** o frete é um valor monetário informado manualmente pelo usuário,
  pertencente à **Proposta** (não aos itens). Persiste-se **`Proposta.frete`**
  (Decimal, default 0). Migration aditiva `20260707050000_frete`.
- **Cálculo (helper central, ADR-0219/0220):** `calcularTotais` passa a receber o
  `frete` e compor **Total da Proposta = Subtotal − Desconto + Frete** (nunca
  negativo; `frete` clampado a ≥ 0). Sem limite máximo. A regra de desconto (≤
  Subtotal) permanece. Recalcula em tempo real; sem botão.
- **UI:** nova linha **Frete** no rodapé (entre Desconto e Total da Proposta),
  máscara BRL via `CurrencyInput` (valor inicial R$ 0,00). Vale para Completa e
  Simplificada.
- **Persistência:** apenas o `frete`. Subtotal, Total Produtos/Serviços e Total
  da Proposta seguem **derivados** (nunca persistidos).
- **Consequência:** toda a lógica financeira segue concentrada em `totais.ts`
  (sem duplicação). Fora de escopo: total final/condições/impostos/custos/margem/
  lucro/PDF/Som/Wi-Fi.

---

## Sprint 2.6.5 — Finalização da Proposta

### ADR-0222 — Informações comerciais finais: texto livre no cabeçalho

- **Decisão:** finalizar o conteúdo comercial da proposta antes do PDF (2.7) com
  **quatro campos de texto livre**, pertencentes à **Proposta** (cabeçalho), NÃO
  aos itens e SEM qualquer efeito em cálculo/total/desconto/frete:
  - `formaPagamento` (linha) — ex.: PIX, à vista, entrada + saldo na instalação.
  - `previsaoInstalacao` (linha) — ex.: 2 dias úteis, conforme cronograma.
  - `obsComerciais` (multilinha) — ex.: validade, responsabilidades do cliente.
  - `obsTecnicas` (multilinha) — ex.: requisitos de Wi-Fi/energia/compatibilidade.
- **Sem cadastro/tabela auxiliar:** são apenas campos-texto da Proposta.
  Persistência **aditiva** (migration `20260707060000_finalizacao`, colunas
  `TEXT` nulas). Nenhuma nova tabela/entidade; snapshots inalterados.
- **Apresentação:** `previsaoInstalacao` é exibido **apenas no modelo Completa**;
  na Simplificada o campo fica oculto, mas a informação continua armazenada
  normalmente (regra somente de apresentação). Os demais valem para os dois.
- **UI:** novo componente `FinalizacaoProposta`, **abaixo** da área de conteúdo,
  reutilizando o padrão self-contained do cabeçalho (commit no blur via
  `onCampo`/patch). Dois grupos claros: **Informações Comerciais** e
  **Observações**.
- **Consequência:** payload/`WorkspaceDTO`/`criar`/`salvar`/schema Zod carregam
  os quatro campos; persistência normal (`trimOrNull`). Fora de escopo (2.6.5):
  PDF, garantia, prazo de entrega, assinatura/aceite/QR, workflow de aprovação,
  anexos, cronograma, cadastro de formas de pagamento.

---

## Sprint 2.7 — Documento comercial (PDF)

### ADR-0223 — PDF com @react-pdf/renderer, sob demanda, reusando dados/regras

- **Contexto:** o PDF é o **documento comercial oficial** (premium), não uma
  impressão de tela. Alvo Windows Server 2019.
- **Biblioteca:** **`@react-pdf/renderer`** (componentes React → PDF; puro
  JS/WASM, **sem Chromium**) — melhor confiabilidade de deploy e componentização
  para templates futuros. Descartado Puppeteer (binário Chromium ~300MB, peso de
  patching, convida a "imprimir a tela").
- **Geração:** **sob demanda** via Route Handler `GET /propostas/[id]/pdf`
  (`runtime="nodejs"`, `dynamic="force-dynamic"`, `renderToBuffer` →
  `application/pdf` inline). **Sem armazenar arquivo**; renderiza a
  `currentRevision` (para EMITIDA = revisão congelada). "Gerar PDF" (emitir) abre
  o documento; EMITIDA ganha "Abrir PDF".
- **Reuso correto:** a **camada de dados/regras** é reaproveitada — `totais.ts`
  (financeiro), `formatCurrency`/`formatDate`, e as regras da Simplificada. Os
  **componentes de tela (shadcn) NÃO** são reutilizados (primitivas diferentes e
  evitam "cara de tela"); o PDF tem sua própria biblioteca de blocos.
- **Arquitetura:** IO (`proposta-pdf.service.ts`) separada da montagem pura
  (`proposta-pdf.mapper.ts` → `PropostaPdfDTO`, testável sem banco). Blocos puros
  em `features/propostas/pdf/blocks`, tema central (`theme.ts`, cores da Config +
  fallback), fonte **Inter** (TTF em `public/fonts`, registro idempotente).
  Endereço da obra = endereço do **Cliente** (sem migração). **Nenhuma migração**
  nesta Sprint.
- **Layout premium:** cabeçalho limpo (logo + "PROPOSTA COMERCIAL" + nº + data;
  institucionais vão ao rodapé); bloco do cliente elegante (não-tabela); tabela
  com **Descrição dominante** e **Código discreto** (Simplificada oculta serviço
  e usa total = Qtd × Valor Produto); **TOTAL DA PROPOSTA** em faixa de destaque;
  **Informações Comerciais** e **Observações** em blocos separados; área de
  **assinaturas** (Cliente / Consultor); rodapé com institucionais + "Página X
  de Y".
- **Paginação:** cabeçalho do documento e da **tabela** repetidos (`fixed`);
  `wrap={false}` em linhas/blocos de totais/observações/assinaturas;
  `minPresenceAhead` nas bandas de seção. **Validado** com propostas de 1 a 7+
  páginas (sem sobreposição; faixas fixas com folga reservada por padding).
- **Evolução futura (só arquitetura):** Projeto de Som/Wi-Fi, fotos de produtos e
  novos templates entram como **blocos** plugados na mesma composição, sem
  reescrever o documento. Fora de escopo: armazenar o binário, garantia,
  assinatura digital/aceite/QR, workflow de aprovação, anexos, cronograma.

---

## Sprint 2.7.5 — Ajustes pós-PDF

### ADR-0224 — Ajustes de UX/apresentação; RG/IE e logo por upload

Sprint de refinamento (sem novas funcionalidades de negócio). Decisões que
tocam modelagem/arquitetura:

- **Cliente — RG/IE:** documento secundário **opcional**. Colunas aditivas
  `Cliente.rg` (PF) e `Cliente.inscricaoEstadual` (PJ) (migration
  `20260707070000_cliente_rg_ie`). Exibido conforme o tipo de pessoa (mesmo
  padrão de nome/empresa); persistência só do campo relevante ao tipo. **UF**
  vira lista (`@/lib/ufs`).
- **Logo por upload (sem links externos):** o campo de URL é removido. O
  logotipo é **enviado por upload** (PNG/JPG ≤ 2 MB), gravado no armazenamento
  de uploads (`storagePaths.upload`, fora do repositório) e `Config.logo` passa
  a guardar apenas o **nome do arquivo**. Serviço `logo.service.ts`
  (`saveLogoFile`/`getLogoAbsolutePath`/`readLogoFile`), Server Action
  `uploadLogoAction`, rota `GET /configuracoes/logo` (preview/web) e uso
  **automático no PDF** (o cabeçalho embute o arquivo do disco). O `.env` de
  storage já era configurável; a criação da pasta ocorre no primeiro upload.
- **Máscara de telefone** em Configurações (Telefone/WhatsApp) reutilizando
  `MaskedField` + `formatPhone`.
- **Proposta (UX):** autocomplete de produto exibe só **código + descrição**
  (descrição no estilo antes usado para o valor; valor omitido); **quantidade
  recalcula os totais em tempo real** (campo controlado + atualização da
  memória, sem `blur` e sem perder o foco — a linha deixou de remontar por
  chave); **larguras reduzidas** e descrição em até 2 linhas para caber sem
  rolagem horizontal; **desconto numa única linha** (campo + interpretação);
  **valores padrão** Forma de Pagamento = "PIX" e Previsão de Instalação =
  "3 dias" (editáveis).
- **PDF:** mais espaço antes das assinaturas; alinhamento do valor no destaque
  do TOTAL; "Validade" → "Validade da proposta"; logo automático da Config.
- **Consequência operacional:** o seed continua **global-idempotente** (ADR-0209)
  — se um cadastro específico faltar no dev, ele não é repovoado sozinho;
  repopular pontualmente é um passo manual de ambiente.

---

## Sprint 2.7.6 — Ajustes pós-PDF (2ª rodada)

### ADR-0225 — Ajustes de UX/apresentação; IE da empresa; logo do PDF por data URI

Sprint de refinamento (sem novas funcionalidades de negócio). Pontos com
impacto em modelagem/arquitetura:

- **Config — Inscrição Estadual:** coluna aditiva `ConfiguracaoSistema.inscricaoEstadual`
  (migration `20260707080000_config_ie`); layout `CNPJ | IE`. **UF** vira lista.
- **Logo do PDF (correção):** o logo não aparecia porque estava dentro do
  callback `render` do cabeçalho fixo — o **@react-pdf só embute imagens da
  árvore estática**, não de conteúdo gerado por `render`. Correções: (1) o
  cabeçalho passou a ser **estático** (logo no canto superior esquerdo, repetido
  em todas as páginas, sem `render`); (2) a IO entrega `empresa.logo` como
  **DATA URI base64** (via `readLogoFile`), evitando a ambiguidade de caminho de
  arquivo no Windows. Validado: PDF com logo passa de ~180 KB (embutido).
- **Lista de Propostas — coluna Valor:** o Total da Proposta passa a ser
  **calculado na listagem** (`listPropostas` busca itens+desconto+frete e usa o
  helper `calcularTotais` — sem duplicar lógica). Legenda de status abaixo da
  tabela; badge de status movido para junto da ação; **Cancelada = vermelho**
  (badge `danger`).
- **Não-duplicidade de produto por seção:** as ações em memória
  (`adicionarItem`/`adicionarItemAvulso`) recusam o mesmo `produtoId` na mesma
  seção (checagem via ref espelho do estado, sincronizado por efeito); a mesma
  referência é permitida em outras seções. O diálogo exibe a mensagem.
- **Motivo do cancelamento:** `WorkspaceDTO` passa a expor
  `motivoCancelamento`/`obsCancelamento`; o workspace mostra o motivo em
  destaque discreto logo abaixo do número quando a proposta está cancelada.
- **PDF — Observações da proposta:** novo bloco com `obsProposta`. Faixa das
  seções em cinza médio (token `faixaSecao`), destacando do zebrado; menos
  espaço entre cabeçalho e bloco do cliente.
- **Cliente — CPF/CNPJ:** rótulo e placeholder acompanham o tipo de pessoa (a
  máscara/validação já se ajustam pela quantidade de dígitos); o valor não é
  apagado ao trocar o tipo.
- **Placeholders no tema escuro:** regra global (`globals.css`) reduz a opacidade
  dos placeholders (mais no dark), diferenciando-os do texto digitado.

---

## Sprint 2.7.7 — Refinamentos de UX e PDF

### ADR-0226 — Ajustes de UX/apresentação (escopo estrito)

Sprint de refinamento restrita aos itens abaixo (sem novas funcionalidades nem
alterações fora do escopo):

- **Desconto/Frete — interpretação em tempo real:** a interpretação passa a
  atualizar **enquanto digita** (não só no blur) e mostra **"-"** quando vazio.
  `DescontoInput` e o novo `FreteInput` encapsulam input + interpretação no mesmo
  padrão visual. **Frete inicia vazio** (não preenche "R$ 0,00"); emite o número.
- **PDF — linhas condicionais:** as linhas **Desconto** e **Frete** só aparecem
  quando houver valor (> 0).
- **PDF — Código:** cor escura (legibilidade), mantendo o tamanho menor.
- **Botões do workspace na parte inferior:** os botões dos workspaces de proposta
  (existente e nova) foram movidos para uma barra inferior, alinhada à direita
  (mesmo padrão dos demais módulos, que usam o rodapé do `CrudFormShell`).
  `PageHeader` ganhou a prop opcional **`titleSuffix`** (aditiva) para o badge.
- **Badge de status no workspace:** ao lado do título (Rev.N), via `titleSuffix`.
- **Badge "Rascunho":** fundo levemente mais escuro para contraste, via
  `STATUS_BADGE_CLASS` (aplicado só ao Rascunho; demais badges inalterados).
- **Listagem de propostas:** a coluna **Status** volta para a ordem
  Vendedor · **Status** · Última alteração (o badge sai da célula de ação); a
  coluna **Valor** passa a ficar após Cliente. **Legenda** de status com quebra
  responsiva (não estoura a largura em telas menores).

---

## Sprint 2.7.8 — Refinamentos de UX e PDF

### ADR-0227 — Nome do Projeto; desconto percentual em R$; legenda; PDF

Sprint de refinamento (escopo estrito):

- **Nome do Projeto:** novo campo **texto** pertencente à Proposta
  (`Proposta.nomeProjeto`, migration aditiva `20260707090000_nome_projeto`).
  No cabeçalho fica na **mesma linha do Cliente** (Cliente | Nome do Projeto);
  Vendedor e Validade da proposta seguem cada um em sua própria linha. Plumbing
  completo (`CabecalhoValores`/`cabecalhoPatchSchema`/`novaPropostaSchema`,
  workspaces, `NovaPropostaPayload`/`criar`/`salvar`, `WorkspaceDTO`/
  `getWorkspace`) via `trimOrNull`.
- **Desconto percentual → valor monetário:** a interpretação do desconto passa a
  exibir o **valor aplicado em R$** (Subtotal × Percentual). `DescontoInput`
  recebe o `subtotal` e mostra `formatCurrency(aplicarDesconto(subtotal, …))`
  (reuso do helper `totais`), "-" quando vazio. O input segue mostrando "10%"
  (percentual) ou "R$ 500,00" (valor) — comportamento do valor inalterado.
- **Legenda de status:** apresentação em bloco contido (borda/fundo suave),
  mantendo a responsividade; cores e badges inalterados.
- **PDF — tabela:** **Código em negrito**, Descrição em peso normal; demais
  colunas inalteradas.

---

## Sprint 2.8 — Homologação final e encerramento

### ADR-0228 — Módulo de Propostas encerrado em 1.0.0 (homologado, produção)

- **Decisão:** o desenvolvimento inicial do **módulo de Propostas** está
  **encerrado** e a versão passa a **1.0.0** — **primeira versão homologada para
  produção**. A Sprint 2.8 foi de **validação, estabilização e documentação**:
  **não** adicionou funcionalidades, telas, campos, regras, migrations, nem
  alterou arquitetura/UX/layout/PDF/banco.
- **Homologação:** todos os fluxos revisados (Configurações, Clientes, Produtos,
  Vendedores, criação de proposta, Completa/Simplificada, seções, produtos,
  serviços, totais, desconto, frete, informações comerciais, revisões, emissão,
  cancelamento, PDF Comercial). **Quality Gate:** ESLint 0, Typecheck 0, Build 0,
  unit 17/17, smoke 7/7, `/api/health` 200 (db up).
- **Revisão técnica:** sem TODOs/`console`/`debugger`, sem `.only` em testes, sem
  código morto/temporário; imports e `eslint-disable` justificados. **Nenhuma
  correção de comportamento foi necessária** (nenhum bug encontrado).
- **Consequência:** nenhuma nova funcionalidade será adicionada a este módulo. As
  próximas evoluções ocorrem em **módulos independentes** (a começar por **"PDF
  Projeto"**, que usará os dados da Proposta com arquitetura/roadmap próprios).
  Oportunidades de melhoria ficam registradas em `BACKLOG.md` (**Backlog
  Futuro**), sem implementação nesta versão.

---

## Sprint 3.0 — Fundação do PDF Apresentação

### ADR-0300 — PDF Apresentação: segundo formato, mesma proposta (só o layout muda)

- **Contexto:** além do **PDF Comercial** (documento atual), a proposta passará a
  ter um **PDF Apresentação** — versão comercial institucional (premium) para
  envio ao cliente. **Ambos usam a mesma proposta cadastrada**; não há novo
  cadastro, tela ou módulo de proposta. A única diferença é o **layout**.
- **Decisão (fundação — Sprint 3.0, estrutural):**
  - **Reuso total dos dados:** o gerador consome exatamente o mesmo
    `getPropostaPdfData` → `PropostaPdfDTO` do PDF Comercial (proposta, cliente,
    produtos, serviços, cálculo de totais). **Sem consultas ou regras paralelas**;
    nenhuma migration/alteração de banco/Prisma/entidade/campo.
  - **Estrutura espelhando o PDF Comercial:** novo pacote
    `src/features/propostas/pdf/presentation/` (`presentation-document.tsx`,
    `pages.tsx` com as 10 páginas, `page-shell.tsx`, `render.tsx`, `index.ts`),
    reutilizando a fundação compartilhada (`theme`, `fonts`, `format`). O PDF
    Comercial **não foi tocado** (arquivos intactos).
  - **Endpoint** `GET /propostas/[id]/presentation` (mesmo padrão do
    `/propostas/[id]/pdf`: runtime Node, `force-dynamic`, `application/pdf`).
  - **Interface:** botão **"Gerar PDF Apresentação"** ao lado do PDF Comercial.
  - **10 páginas fixas:** dinâmicas (1 capa, 6 itens, 8 investimento, 9
    pagamento) já ligadas aos dados reais; fixas (2,3,4,5,7,10) com placeholders.
    A página 6 mostra **apenas** seção + lista de produtos (sem preço/quantidade/
    subtotal/desconto/frete).
  - **DTO:** acréscimo aditivo de `nomeProjeto` ao `PropostaPdfDTO` (necessário à
    capa); não altera a saída do PDF Comercial.
- **Consequência:** arquitetura pronta para a **Sprint 3.1** detalhar o design
  premium de cada página. Versão inalterada (1.0.0) até o recurso concluir.

---

## Sprint 3.1 — Implementação do PDF Apresentação

### ADR-0301 — Templates gráficos como plano de fundo (landscape 16:9)

- **Decisão:** o PDF Apresentação usa os **templates PNG fornecidos**
  (`public/templates/presentation/`, 1920×1080) como **plano de fundo de página
  inteira**; **nenhuma página é redesenhada**. Página em **landscape 16:9**
  (`size=[960, 540]` pt = padrão PowerPoint); escala template→página = **0.5**.
  Os templates são lidos do disco e embutidos como **data URI** (o @react-pdf
  embute imagem de forma confiável por data URI; sem cache, para refletir a troca
  das imagens).
- **Campos variáveis:** só as 4 páginas dinâmicas sobrepõem dados, por
  posicionamento **absoluto** (capa: Nome do Projeto + Cliente; itens: seções +
  produtos sem preço/quantidade; investimento: Valor Total + prazo; pagamento:
  forma de pagamento). Reutiliza o mesmo `PropostaPdfDTO` (ADR-0300). Cores dos
  overlays casadas com a identidade dos templates. Coordenadas centralizadas em
  `coords.ts`.
- **Estrutura:** `presentation/templates.ts` (loader), `page-shell.tsx` (página
  landscape com Image de fundo), `coords.ts`, `pages.tsx` (10 páginas),
  `presentation-document.tsx`, `render.tsx`.
- **Pendência conhecida:** os templates das 4 páginas dinâmicas ainda contêm
  **conteúdo de exemplo embutido** nas áreas reservadas; ao receber as versões
  **em branco** (mesmos nomes/caminho), os overlays caem nas áreas limpas — só as
  coordenadas de `coords.ts` podem precisar de ajuste fino. **PDF Comercial
  intacto**; sem banco/migration/Prisma. Homologação após a troca das imagens.

---

## Sprint 3.2.1 — Correção da build de produção (Windows Server)

### ADR-0321 — `force-dynamic` no layout raiz para eliminar a falha de prerender

- **Contexto:** `npm run build` falhava **apenas no Windows Server 2019**, na
  etapa de *prerender*, com `Invariant: Expected workStore to be initialized`
  (bug interno do Next.js, código **E1068**), enquanto passava na máquina de dev
  — mesmo commit, mesmo `package-lock`, mesmo Next 16.2.10. As páginas estáticas
  de formulário (`/clientes/novo`, `/produtos/novo`, `/vendedores/novo`,
  `/dashboard`, `/`) eram **pré-renderadas** em build; a resolução de metadados no
  prerender lê o `workStore` (`AsyncLocalStorage`) e, sob a configuração de
  **worker único**, esse contexto não é inicializado e a *invariant* é lançada.
- **Causa da diferença dev × servidor:** o nº de workers de geração estática vem
  de `experimental.cpus`, cujo default é `Math.max(1, os.cpus().length - 1)`
  (`config-shared.js`). Dev/CI (12 núcleos) → **11 workers**; servidor (1–2 vCPU)
  → **1 worker**. Só o caminho de worker único do servidor dispara o bug. É um bug
  **interno do Next** (a própria mensagem diz *"This is a bug in Next.js"*), não da
  aplicação.
- **Decisão:** `export const dynamic = "force-dynamic"` no **layout raiz**
  (`src/app/layout.tsx`). Todas as páginas passam a `ƒ` (renderizadas sob
  demanda); o caminho de prerender que dispara o bug deixa de existir, em qualquer
  nº de núcleos/SO. Mesmo HTML; só a estratégia de renderização muda.
- **Análise comparativa (por página × layout raiz)** — validada por build real:

  | Abordagem | Arquivos | Sobra estática (○) | Confiável? |
  | --- | --- | --- | --- |
  | Por página (4 forms + dashboard) | 4 | `/`, **`/_not-found`**, `/_global-error`, `/favicon.ico` | ❌ deixa `/_not-found` no caminho que falha |
  | Por página + `/` + `not-found.tsx` custom | 6 (+1 novo) | `/_global-error`, `/favicon.ico` | ⚠️ só completa **trocando o 404 padrão** (muda comportamento) |
  | **`force-dynamic` no layout raiz** | **1** | `/_global-error`, `/favicon.ico` | ✅ mesmo estado final, sem alterar comportamento |

  A rota **`/_not-found` é sintética** (o Next a gera; não há arquivo para anotar)
  e **renderiza sob o layout raiz** — comprovado: ao aplicar `dynamic` no layout
  ela vira `ƒ`. Logo percorre **o mesmo caminho de prerender+metadados** que
  estoura em `/clientes/novo`. Como a falha é disparada pelo ambiente (worker
  único) e independe do conteúdo, a via por página deixa `/_not-found` exposta;
  cobri-la exigiria um `not-found.tsx` custom, que **substitui o 404 padrão do
  Next** (mudança de comportamento) e ainda não cobre `/_global-error`. Portanto o
  layout é, ao mesmo tempo, a **menor** correção (1 linha) e a **única** confiável
  sem alterar comportamento. As estáticas remanescentes (`/_global-error`,
  `/favicon.ico`) são internas do Next e **não resolvem metadados** → fora do
  caminho da *invariant*.
- **Consequência:** build determinístico em qualquer ambiente
  (typecheck/lint/test/build verdes; `npm start` serve `/clientes/novo` → 200). O
  app passa a ser uniformemente *server-rendered on demand* — coerente com sua
  natureza (interno, orientado a dados, sem SEO); 15 das 20 rotas já eram `ƒ`.
- **Reavaliar em futuras atualizações do Next.js:** a correção contorna um **bug
  interno do Next** (E1068) presente na 16.2.10. Ao atualizar o Next, revisar se a
  *invariant* de prerender foi corrigida (changelog/issues); se sim, pode-se
  **remover o `force-dynamic` do layout** e reavaliar se voltar a pré-renderar as
  páginas estáticas compensa — validando o `npm run build` em ambiente de poucos
  núcleos (1 vCPU) **antes** de reverter. Enquanto o bug existir no Next, a decisão
  permanece.

---

## Sprint 3.1 — Documentação Contratual

> Encerra o módulo Comercial. Nota de nomenclatura: houve uma "Sprint 3.1"
> anterior sobre o **PDF Apresentação** (ADR-0301); esta "Sprint 3.1" é a
> **Documentação Contratual** (ADR-0330). São ciclos distintos que reusaram o
> número — os ADRs, não o rótulo, são a referência estável.

### ADR-0330 — Contrato em .docx via docxtemplater (marcação seletiva do template)

- **Contexto:** o Anexo Contratual (PDF Contratual, ADR da Sprint 2.10.2) já
  entrega o escopo aprovado sem preço por item. Faltava o **contrato jurídico**,
  que precisa ser **editável antes do envio** (forma de pagamento, prazos, multa,
  cláusulas, ajustes jurídicos) — requisito que nenhum PDF atende. O ADR-0223
  fixou `@react-pdf/renderer` para PDFs e descartou Puppeteer.
- **Decisão — DOCX como formato oficial do contrato:** gerado com
  `docxtemplater` + `pizzip` (MIT) a partir do **template oficial da Outmat**.
  Não contradiz o ADR-0223 (aquele decidia sobre PDF); o docxtemplater é puro
  JS/WASM, mesma motivação de não trazer Chromium. Valor por extenso via
  `extenso` (MIT). .docx é obrigatório porque o Word é onde o jurídico ajusta o
  contrato — um PDF seria imutável.
- **Template versionado + script reproduzível:** o `.docx` oficial fica em
  `public/templates/contrato/contrato-outmat.oficial.docx` (fonte da verdade,
  commitado). `scripts/marcar-template-contrato.mjs` converte `[PLACEHOLDER]` →
  `{tag}` gerando `contrato-outmat.docx` (também commitado, lido em runtime). O
  script **só altera texto dentro de `<w:t>` e aborta** se qualquer outra parte
  do XML mudar — prova mecânica de que fonte, margens, cabeçalho, rodapé,
  espaçamentos, numeração e estilos ficam intactos. Versionar entrada + script
  torna a marcação auditável e reexecutável quando o jurídico enviar novo modelo.
- **Marcação SELETIVA (decisão crítica):** o template usa `[MAIÚSCULAS ENTRE
  COLCHETES]`. Configurar `[` `]` como delimitadores do docxtemplater está
  **proibido**: `[Nº]` aparece 5× com 5 significados (prazo de início, prazo de
  conclusão, prazo de aceite, multa %, nº da proposta) e todos receberiam o mesmo
  valor — "multa de 1042%". Só os placeholders que o sistema preenche viram
  `{tag}`; os demais permanecem literais para preenchimento manual no Word.
- **Placeholders como contrato template↔código:** as chaves do
  `ContratoTemplateDTO` **são** as tags do `.docx`. Renomear um campo exige
  remarcar o template — acoplamento documentado no código e travado por
  `template.test.ts` (confere presença das 9 tags e a preservação dos literais).
- **Realce (highlight) dos campos automáticos removido:** o template oficial
  realça os placeholders em amarelo ("preencha aqui") e o docxtemplater preserva
  a formatação do run ao trocar o texto — sem tratamento, o contrato final sairia
  com nome, CPF, valor e data pintados de amarelo (e a forma de pagamento em
  itálico). O script de marcação limpa `highlight`/`i` **apenas** dos runs que
  viram tag do sistema; os placeholders manuais (`[Nº]`, `[VALOR]`, `[se houver]`)
  mantêm o amarelo, sinalizando o que falta preencher. A invariante do script
  mudou de acordo: "removendo texto e realce de ambos, o resto é byte a byte
  idêntico" — prova que nada além de texto/realce mudou. Achado na homologação
  visual da própria sprint; travado por `template.test.ts`.
- **Camadas — regra só no mapper, renderer burro:**
  - `ContratoMapper` (`contrato.mapper.ts`) concentra **toda** a regra de
    negócio: busca no DTO, formata moeda/data, converte extenso, decide o
    fallback da forma de pagamento, monta o `ContratoTemplateDTO` pronto.
  - `renderContratoDocx` (`render.ts`) **só** abre o template, troca placeholder
    por valor e devolve o buffer. Não calcula, não formata, não decide.
  - Rota `GET /propostas/[id]/contrato` orquestra e trata erro (500 + log em
    falha de template/render); sem regra de negócio.
- **Fonte única do valor:** `calcularResumoFinanceiro().totalGeral`, consumido
  via `dto.resumo.totalGeral` — a **mesma** do Anexo Contratual. O mapper **não
  recalcula**; espelha o total recebido. Garante que Contrato e Anexo citem
  exatamente o mesmo valor (travado por teste que roda a fonte oficial de
  verdade). Verificado em runtime: proposta real → contrato "R$ 15.000,00" ==
  cadeia do Resumo Financeiro na tela (18.085,50 − 3.085,50).
- **Campos manuais preservados:** os 4 `[Nº]` (prazos/multa), `[VALOR]` (parcela
  final do Anexo II) e `[se houver]` (observações) permanecem literais no
  documento gerado — são preenchidos no Word, coerente com "alterações de
  cláusulas realizadas posteriormente pelo usuário".
- **Timezone fixa `America/Sao_Paulo`:** a data usa `Intl.DateTimeFormat` com
  fuso explícito e vem de `dto.data` (`currentRevision.emittedAt`), **não**
  `new Date()`. O fuso do servidor poderia virar o dia e datar o contrato errado;
  usar a data da revisão faz reemitir um contrato antigo reproduzir a data
  original. A cidade **não** entra na tag — o fecho do template já traz "São
  Caetano do Sul, ".
- **Nome do arquivo com nº da proposta e revisão:** `Contrato - Proposta {Nº} -
  {Nome Completo} Rev.{Rev}.docx`, baixado como `attachment`. A revisão é
  obrigatória — sem ela, contratos de revisões diferentes da mesma proposta
  baixariam com nome idêntico e se sobrescreveriam. Foge do padrão dos PDFs
  (primeiro nome) de propósito: é o documento que vai para assinatura.
- **Anexo Contratual:** só o rótulo do botão mudou ("PDF Contratual" → "Emitir
  Anexo Contratual"). A rota `/contratual`, o documento e o nome de download
  (`Anexo Contrato - ...`) ficam **inalterados** — regressão provada por teste
  unitário e em runtime.
- **Consequência:** a proposta passa a ter quatro documentos (PDF Detalhado, PDF
  Apresentação, Contrato .docx, Anexo Contratual PDF). O módulo Comercial encerra
  aqui; os próximos ciclos são operacionais (Pedido de Venda, Ordem de Serviço).

#### Fora do escopo (deliberado) e backlog

- **Proposta sem itens gera documento por acesso direto à rota.** A UI protege
  (`podeEmitir` exige cliente + item), mas `GET /contrato` de uma proposta vazia
  responde 200 com "R$ 0,00". É o **comportamento herdado** das rotas de PDF
  existentes (`/pdf`, `/presentation` fazem o mesmo) — não uma regressão desta
  sprint. **Melhoria futura:** um guard 400 na rota quando a proposta não tem
  itens, como `/presentation` já faz para o modelo Simplificada. Não implementado
  aqui para não divergir do comportamento dos demais documentos.
- **"zero centavos" para valor zero.** `extenso(0)` devolve "zero centavos", não
  "zero reais" (quirk da lib). Só aparece no caso acima (proposta sem itens), que
  não deveria gerar contrato. Fica no backlog junto do guard 400.
- **Homologação visual do .docx é manual e obrigatória** antes do merge — nenhum
  teste automatizado prova fidelidade de fonte/margem/layout; só a inspeção no
  Word. O script de marcação dá a garantia estrutural (XML fora de `<w:t>`
  idêntico), mas a conferência visual final é humana.

---

## Sprint 4.0.1 — Fundação de Instalações

### ADR-0400 — Instalação independente de Pedido de Venda; endereço e responsável por snapshot

- **Contexto:** a Outmat já tem vendas e instalações em andamento que precisam de
  controle operacional antes de existirem os módulos de Pedido de Venda e Ordem
  de Serviço. O roadmap foi reordenado: **Instalações V1 vem antes dos dois**.
- **Decisão — Instalação não depende de Pedido:** a Instalação é criada
  manualmente, a partir de um Cliente. **Nenhum campo, coluna ou enum antecipa
  Pedido de Venda ou Ordem de Serviço.** Quando existirem, entram por migration
  aditiva. A Proposta relacionada é vínculo **opcional** e não importa itens nem
  sincroniza nada — nenhuma regra do Comercial é duplicada.
- **Numeração própria:** `Instalacao.numero` é sequência nativa do PostgreSQL
  (`instalacoes_numero_seq`, `RESTART WITH 1001`), independente da de Propostas.
  Mesmo padrão e mesmos motivos do ADR-0201: atômica sob concorrência, nunca
  reutilizada, não volta após cancelamento. O `id` (cuid) nunca é exibido.
- **Endereço é SNAPSHOT do Cliente, garantido no SERVICE (decisão crítica):**
  `criarInstalacao` recebe **apenas `clienteId`**, lê o Cliente **persistido** na
  mesma transação e deriva os campos com `snapshotEndereco`. Nenhum dado de
  endereço vindo do navegador é gravado — os schemas Zod sequer declaram esses
  campos, então o parse os descarta.
  A alternativa descartada era formar o snapshot na tela: ela funciona no
  caminho feliz e falha em todos os outros. A regra precisa valer para qualquer
  chamador — tela, Server Action, teste, importação ou integração futura —, e
  uma regra de integridade não pode depender do estado de um formulário no
  navegador. `atualizarInstalacao` **não toca** no endereço: o snapshot é
  imutável depois da criação.
  Nomes ajustados na cópia: `endereco`/`numero` do Cliente viram
  `enderecoLogradouro`/`enderecoNumero`, porque `numero` já é a numeração
  comercial da instalação.
- **Sem endereço alternativo de obra nesta versão:** não há múltiplos endereços,
  "endereço da obra", seletor "usar outro endereço" nem entidade de endereço. Os
  campos são **somente leitura** na interface. Se surgir necessidade real de
  instalar em local diferente do cadastro, vira refinamento próprio.
- **Responsável é TEXTO LIVRE — decisão deliberada, não provisória.** Não existe
  entidade, tabela, FK, CRUD ou tela de responsável, e `Vendedor` **não** é
  reutilizado: um instalador, técnico ou comprador não é vendedor, e reaproveitar
  aquele cadastro poluiria o autocomplete da Proposta e distorceria a regra de
  exclusão "já foi usado em uma proposta".
  O nome digitado é **snapshot histórico do fato**: quem executou a visita
  continua sendo aquele nome mesmo que a pessoa saia da empresa ou nunca venha a
  ter login. Quando houver autenticação, o sistema distinguirá "responsável pelo
  acontecimento" (este texto, preservado) de "registrado no sistema por" (campo
  **novo e aditivo**, vindo do usuário autenticado). Converter o primeiro em FK
  reescreveria o histórico — por isso ele permanece texto.
- **Cancelar, nunca excluir:** instalação com histórico não é apagada; recebe
  status `CANCELADA` e continua na listagem sob o filtro correspondente. Ao
  reabrir, a tela fica somente leitura.
- **Concluir é mudar o status**, não uma ação separada. A spec pede estado
  operacional, e uma máquina de estados simples é o que a V1 autoriza.
- **Auditoria técnica separada da cronologia:** `InstalacaoAuditoria` registra
  criação, alteração, mudança de status e cancelamento, gravada na **mesma
  transação** da escrita — o padrão de `PropostaAuditoria`. A cronologia
  operacional (Sprint 4.0.2) é outra coisa: conteúdo que o usuário lê, não trilha
  de sistema.
- **Datas com fuso fixo:** o projeto não tinha campo de data em formulário.
  `features/instalacoes/datas.ts` converte nos dois sentidos entre
  `<input type="date">` e `Date` com fuso **`America/Sao_Paulo` explícito**,
  ancorando ao meio-dia para que o dia escolhido não vire na conversão. A
  conversão acontece na Server Action, não no schema: transformar no Zod faria o
  tipo de entrada divergir do de saída, e o React Hook Form manipula o de
  entrada.
- **Listagem segue o molde de Propostas, não o dos cadastros:** `CrudListView`
  exige o par `ativo`/`toggleAtivoAction`; Instalação tem **status**, então usa
  `CrudLayout` + `useCrudList` com colunas TanStack, como `propostas-list.tsx`.
- **Consequência:** o módulo funciona imediatamente sobre o cadastro de Clientes
  existente, sem tocar em nada do Comercial. A Sprint 4.0.2 acrescenta cronologia
  e custos sobre esta fundação, quando entram `InstalacaoRegistro` e
  `InstalacaoCusto`.
- **Atualização (Sprint 4.1 — ADR-0408):** o bullet "Responsável é TEXTO
  LIVRE" foi **superado parcialmente** — o responsável passa a ser vínculo com
  o novo cadastro de Técnicos (`tecnicoResponsavelId`). Todo o resto deste ADR
  continua valendo integralmente.

---

## Sprint 4.0.2 — Cronologia e Custos

### ADR-0401 — Cronologia operacional × auditoria técnica; custos derivados

- **Contexto:** a Instalação precisa de um histórico que responda, meses depois,
  o que aconteceu, quando, quem fez e quanto custou. A 4.0.1 entregou a fundação;
  falta a cronologia — o coração do módulo, segundo a spec (§3).
- **Cronologia e auditoria são mecanismos SEPARADOS:**

  ```
  InstalacaoAuditoria  = trilha TÉCNICA do agregado
                         (criação, alteração, mudança de status, cancelamento)
  InstalacaoRegistro   = conteúdo OPERACIONAL escrito pelos responsáveis
                         (visita, material, alteração de escopo, pendência…)
  ```

  **Criar, editar ou excluir um registro NÃO grava auditoria.** Espelhar cada
  acontecimento numa entrada textual de auditoria produziria um log redundante e
  embaralharia as duas coisas. **Consequência assumida:** a exclusão de um
  registro — só possível quando ele não tem custos — não deixa rastro. É o preço
  da separação limpa, e o dado descartável nesse caso é texto recém-digitado.
- **`aconteceuEm` × `createdAt`:** o registro guarda **quando o fato ocorreu**,
  independente de quando entrou no sistema. Carlos faz a visita às 14h, Bruno
  cadastra às 17h: a timeline mostra 14h. Isso também permite cadastrar
  acontecimentos **anteriores à criação da instalação** — não há validação de
  piso. Há teto: `aconteceuEm` não pode ser futuro, porque um fato ainda não
  aconteceu.
- **Ordenação determinística, em três níveis:** `aconteceuEm desc`,
  `createdAt desc`, `id desc`. Ordenar por `createdAt` colocaria um registro
  criado hoje acima de um fato de ontem. O terceiro nível existe porque, sem ele,
  dois registros com `aconteceuEm` **e** `createdAt` idênticos sairiam em ordem
  indefinida do PostgreSQL: a mesma consulta poderia devolver ordens diferentes
  entre execuções. O `id` (cuid) continua **sem significado comercial** — é
  critério de determinismo, nunca exibido nem usado como numeração.
- **Datas: `datas.ts` foi ESTENDIDO, não duplicado.** O módulo da 4.0.1 tratava
  data pura; ganhou quatro helpers de data-hora compartilhando a mesma constante
  de fuso. Uma diferença deliberada entre os dois: a data pura é **ancorada ao
  meio-dia** para o dia não virar na conversão; a data-hora **não é ancorada**,
  porque ali a hora é informação real do fato.
  `dataHoraParaExibicao` existe porque o `formatDateTime` de `@/utils` **não fixa
  timezone** (usa a do runtime) e é compartilhado com Propostas — alterá-lo
  mudaria aquele módulo.
- **Custos: totais derivados, valor em `Decimal`.** Nenhum total é persistido
  (ADR-0219): `totalDoRegistro` e `totalDaInstalacao` vivem em `custos.ts`, módulo
  puro e testado sem banco, e a interface só apresenta o resultado.
  O valor mora no banco como **`Decimal(12, 2)` — nunca `Float`**. O
  arredondamento a 2 casas do cálculo é proteção **adicional**, não substituta: um
  total agrega N linhas independentes e o erro de ponto flutuante acumula
  (`0.1 + 0.2`). A cadeia é `Banco Decimal → service toNumber na borda →
  custos.ts soma e normaliza → UI formatCurrency`. Divergência consciente de
  `features/propostas/totais.ts`, que soma direto e **não** é alterado.
- **Transação:** criar registro + custos é atômico. Na edição, os custos usam
  **delete-and-recreate dentro da mesma transação** — padrão de `PropostaServico`
  em `proposta.service.ts`. Substituição, nunca append: um teste E2E trava isso
  numericamente (455 → 415; um append daria 795).
- **Exclusão — a regra é do domínio, não do banco:** registro **sem** custos pode
  ser excluído; **com** custos, bloqueado, com mensagem orientando editar. A
  checagem está no **service**, porque o `onDelete: Cascade` apagaria os custos
  junto — que é exatamente o que a regra impede. A interface **não** oferece
  caminho que use a cascade para contornar a regra.
- **Pertencimento ao agregado (reforçado na Sprint 4.1.1):** editar ou excluir um
  registro exige que ele **pertença à Instalação informada** — a consulta é
  condicionada por `id` **E** `instalacaoId`. Antes, as duas operações buscavam
  só pelo `registroId`: a Server Action recebia o `instalacaoId` e o usava apenas
  para `revalidatePath`, de modo que uma chamada forjada com o par cruzado
  (`instalacaoId` de A, `registroId` de B) alcançava o histórico de B. A
  interface sempre mandou o par certo, mas integridade de agregado não pode
  depender disso. Registro de outra instalação e registro inexistente devolvem a
  **mesma** mensagem ("Registro não encontrado."), para não vazar a existência de
  um agregado vizinho. A checagem vem **antes** do delete-and-recreate dos
  custos — invertida, uma tentativa recusada ainda teria apagado os custos do
  alvo. Coberto por teste de integração do service, que é a única camada onde o
  par cruzado é expressável.
- **Custos são INTERNOS:** não alteram a Proposta, não recalculam total
  comercial, não geram cobrança, aditivo, contrato, PDF nem comissão. Servirão
  para análise de margem no futuro.
- **Responsável do registro continua texto livre e obrigatório** (ADR-0400).
  Nenhuma entidade, FK, cadastro ou login foi criado.
- **Consequência:** o módulo de Instalações fecha em **1.2.0**. Os próximos
  ciclos são Pedido de Venda e Ordem de Serviço, ambos ainda sem design.
- **Atualização (Sprint 4.1 — ADR-0408):** o bullet "Responsável do registro
  continua texto livre e obrigatório" foi **superado parcialmente** — o
  registro passa a ter `tecnicoId` (FK) mais `responsavelNome` (snapshot
  histórico). Todo o resto deste ADR continua valendo integralmente.

### ADR-0402 — Busca sem acento: fonte única compartilhada e filtro em memória

- **Contexto:** na homologação, o cliente **"Thaís"** não era encontrado ao
  digitar "Thais". A suspeita natural recaiu sobre o `useCrudList`, mas ele
  **já** normalizava acentos desde o início, e as cinco listagens passam por ele.
  A auditoria mediu o banco de desenvolvimento real:

  ```
  SELECT count(*) FROM clientes WHERE nome ILIKE '%thai%';   -- 0
  SELECT count(*) FROM clientes WHERE nome ILIKE '%thaí%';   -- 1
  ```

  O defeito estava nos **autocompletes server-side**. O `contains + mode:
  "insensitive"` do Prisma vira `ILIKE` no PostgreSQL: insensível a **caixa**,
  sensível a **acento**. Atingia `searchClientes`, `searchProdutos` e
  `searchPropostas`.
- **Decisão 1 — fonte única.** `src/utils/busca.ts` passa a ser o único lugar do
  sistema que normaliza texto para busca (`normalizarBusca`, `contemBusca`).
  `useCrudList` deixou de reimplementar a expressão e passou a consumi-la; os
  services usam a mesma função. Foi justamente a existência de duas
  implementações — uma na tela, nenhuma no banco — que permitiu a divergência.
  Um `grep` por `.normalize("NFD")` em `src/` retorna um único arquivo.
- **Decisão 2 — `unaccent` está descartada.** A extensão não está instalada
  (`pg_extension` só tem `plpgsql`) e `CREATE EXTENSION` exige superusuário. O
  ADR-0101 determina que a aplicação use o usuário dedicado **`outmat`**, que não
  é superusuário (`rolsuper = f`). Adotá-la criaria uma dependência de privilégio
  elevado no deploy do Windows Server, para resolver um problema que hoje não
  tem custo de desempenho.
- **Decisão 3 — filtro em memória, SEM limite arbitrário.** O service carrega o
  conjunto que a busca precisa considerar, seleciona **apenas os campos usados**,
  normaliza, filtra e só então corta em 10 sugestões.

  Um `take` antes do filtro foi **explicitamente rejeitado**: com 500 clientes e
  "Thaís" na posição 301, um `take: 300` a manteria invisível — exatamente o
  defeito que este ADR corrige, agora por outra causa. O limite existe só na
  quantidade de sugestões devolvidas.
- **Caminhos especiais preservados:** o `proposalNumber` exato continua resolvido
  no banco (é igualdade, não texto) e a busca de CPF/CNPJ por dígitos continua
  funcionando. Esta última **deixou de precisar de uma segunda consulta**: com o
  conjunto já em memória, virou mais um predicado do mesmo filtro, e o
  `take: 200` que ela usava desapareceu junto.
- **Custo aceito e medido:** 91 clientes, 49 produtos e 28 propostas. O
  autocomplete tem debounce de 250 ms e mínimo de 3 caracteres. Para volume
  muito maior há um item no `BACKLOG.md` com três caminhos (índice funcional
  sobre expressão normalizada, coluna sombra ou `unaccent` com o privilégio
  resolvido no bootstrap) e o gatilho para adotá-los. Otimizar antes disso seria
  resolver um problema que não existe.

### ADR-0403 — Cleanup E2E por `globalTeardown` test-only, com verificação

- **Contexto:** os E2E criavam os próprios dados — correção da Release 1.1.0 —
  mas nunca os removiam. O passivo medido em 2026-08-19 **dominava** o banco de
  desenvolvimento: 88 de 91 clientes, 27 de 49 produtos, 25 de 28 propostas e 44
  de 45 instalações eram resíduo de teste.
- **Por que uma ferramenta de teste, e não a aplicação:** Proposta e Instalação
  **não são excluídas** por regra de negócio — são canceladas (ADR-0203,
  ADR-0400). Afrouxar essa regra para acomodar a suíte trocaria uma garantia do
  domínio por conveniência de teste, e um endpoint de exclusão em massa seria
  pior ainda. `e2e/support/limpeza.ts` vive **fora de `src/`**, fala com o
  PostgreSQL diretamente e não é importado por nenhum código de aplicação.
- **Estratégia ÚNICA — `globalTeardown`.** Uma varredura por marcador depois da
  suíte inteira, que roda **inclusive quando há testes falhando**. Preferida a
  `afterEach`/fixture por cenário porque os testes encadeiam entidades entre
  passos (cliente → proposta → instalação → registro → custo): uma varredura por
  marcador é verificável de forma completa, enquanto o teardown por cenário
  depende de cada teste lembrar tudo o que criou.
- **Três guardas, com `throw` antes de qualquer `DELETE`:** `NODE_ENV` diferente
  de `production`; host da `DATABASE_URL` em `localhost`/`127.0.0.1`;
  `E2E_CLEANUP` diferente de `"0"`. Não é defesa contra ataque — é defesa contra
  engano: um `.env` apontado para o servidor errado.
- **Ordem explícita, sem confiar em cascade onde há `Restrict`:**
  `Instalacao.propostaId` e `PropostaItem.produtoId` obrigam a apagar instalações
  antes de propostas e itens antes de produtos. `propostas.currentRevisionId` é
  zerado antes das revisões. Nunca `TRUNCATE`, nunca `DELETE` sem `WHERE`.
- **A verificação é a recontagem.** Depois do commit, o módulo reconta os
  marcadores e **lança** se sobrar qualquer linha; um `globalTeardown` que lança
  derruba a execução. É o único lugar onde essa asserção pode rodar, já que
  nenhum teste executa depois dela.
- **`pg_dump` é operação de implantação, não de rotina.** O backup foi feito
  **uma vez**, validado com `pg_restore -l`, e só então a rotina rodou contra o
  passivo. O `globalTeardown` nunca executa `pg_dump` — backup acumulando a cada
  execução do Playwright seria lixo, não segurança.
- **Resultado da implantação:** clientes 91→3, produtos 49→22 (catálogo real
  intacto), propostas 28→3, instalações 45→1. Os dois `proposta_servicos`
  pertenciam a proposta real e foram preservados.
- **Efeito colateral revelador:** a limpeza **expôs uma corrida latente** nos
  E2E. Com a listagem de clientes 30× menor, a navegação ficou rápida o bastante
  para o `fill` acontecer antes da hidratação, e o formulário remontava com os
  `defaultValues` do Server Component, descartando o texto digitado. Corrigido
  aguardando o valor carregado antes de digitar. O teste não estava certo antes —
  estava sendo salvo pela lentidão.

### ADR-0404 — Instalação: remoção de `nomeProjeto`, endereço sem repetição, acesso por link

- **Contexto:** homologação de uso real do módulo 1.2.0.
- **`Instalacao.nomeProjeto` removido ESTRUTURALMENTE**, não escondido: schema
  Zod, DTOs, service, formulário, workspace, listagem, `searchAccessor`,
  placeholder, testes, E2E e coluna do banco. Migration própria; nenhuma
  migration aplicada foi editada.

  **Evidência exigida antes do `DROP COLUMN`**, conferida linha a linha: das 45
  linhas, 44 eram resíduo de E2E ("Apartamento E2E …", "Projeto Snapshot …") e a
  45ª continha `"134324"`, preenchimento de homologação. **Nenhum dado real.**
- **ATENÇÃO — `nomeProjeto` existe em dois models.** `Proposta.nomeProjeto`
  (ADR-0227) **permanece**: alimenta a capa do PDF Apresentação, o cabeçalho da
  Proposta e o `PropostaPdfDTO`. Só o campo da Instalação saiu. As três
  ocorrências restantes em `instalacao.service.ts` são do campo da Proposta,
  dentro de `searchPropostas`.
- **Busca da Instalação** passa a ser número · cliente · endereço · responsável ·
  status. Nenhuma referência ao projeto sobrou no `searchAccessor`.
- **Endereço aparece UMA vez.** `EnderecoSnapshot` mostrava os sete campos
  read-only e, logo abaixo, um resumo em linha com o mesmo conteúdo. O resumo
  saiu. Com isso `enderecoEmLinha` ficou sem consumidor e foi removida com seu
  bloco de teste — consequência direta da mudança, não faxina oportunista.
- **A regra server-side do snapshot NÃO mudou:** `clienteId` → o service lê o
  Cliente persistido → o service cria o snapshot. Os schemas Zod continuam sem
  declarar campos de endereço e `atualizarInstalacao` continua sem tocá-lo.
- **Acesso ao workspace pela tabela:** o número vira `<Link>` do `next/link`, que
  renderiza um `<a>` real — navegável por Tab, com foco visível e Ctrl/Cmd+clique
  abrindo em nova aba. `onClick` na `<tr>` foi **rejeitado**: não é elemento
  semântico de link, não recebe foco e quebra o clique do meio. O item "Abrir" do
  menu de ações permanece, para quem já o conhece.

### ADR-0405 — Dashboard V1: service + módulo puro + DTO, sem gráficos

- **Contexto:** `/dashboard` existia como placeholder desde a Sprint 0. O pedido
  foi explícito: uma visão simples, não um módulo de BI.
- **Camadas:** `dashboard.service.ts` (IO) → `features/dashboard/dashboard.ts`
  (regra pura) → `DashboardDTO` → Server Component. Mesmo par service/mapper de
  `proposta-pdf`. Nenhum componente importa Prisma.
- **A regra mora no módulo puro** — quais status viram card, o que conta como
  próxima instalação, em que ordem e quantas — porque é a única forma de provar
  ordenação e estado vazio sem banco.

  O pré-filtro SQL é deliberadamente **mais amplo** que a regra: remove apenas o
  que a regra também removeria (sem data agendada, já encerrada). O corte por
  data e o limite de 5 ficam no módulo puro. Duplicar a decisão nos dois lugares
  criaria duas fontes para a mesma regra.
- **Próximas instalações:** `dataAgendada >= início do dia no Brasil`, fora de
  Concluída e Cancelada, ordem crescente, máximo 5, desempate por `numero`. O
  corte é o **início do dia**, não o instante atual: às 15h uma instalação
  agendada para hoje de manhã ainda precisa aparecer. Sem o desempate, duas
  instalações no mesmo dia sairiam em ordem indefinida.
- **Fuso horário virou utilitário TRANSVERSAL** — `src/utils/data-brasil.ts`
  (`FUSO_BRASIL`, `OFFSET_BRASIL`, `inicioDoDiaBrasil`). O helper **não** ficou em
  `features/instalacoes/datas.ts`: isso criaria a dependência
  `features/dashboard → features/instalacoes` para uma preocupação que é de
  data/timezone, não regra de Instalações.

  `datas.ts` passou a **importar as constantes** do módulo novo — só constantes,
  nenhuma função movida, nenhuma conversão alterada, com o `datas.test.ts`
  intocado servindo de prova. Criar o dono transversal do fuso e deixar uma
  segunda definição viva contrariaria a regra que o próprio módulo de Instalações
  documenta em `labels.ts`.

  **Distinção deliberada:** o Dashboard **continua** importando o tipo e os
  rótulos de status de `features/instalacoes/labels`. O fuso é transversal; o
  conjunto de status de uma Instalação é vocabulário exclusivo daquele domínio, e
  um painel que informa instalações precisa conhecê-lo. Redeclará-los aqui faria
  um status novo passar despercebido pelo typecheck.
- **Não confundir com `utils/format/date.ts`:** aquele formata para exibição e
  **não** fixa timezone (usa a do runtime) por ser compartilhado com Propostas.
- **Fora de escopo da V1:** gráficos, comparativos mensais, metas, funil,
  receita, margem, widgets configuráveis, filtros avançados, tempo real, drag and
  drop e dashboard por usuário. Nenhum dado fictício — tudo vem do banco.
- **Independência:** o Dashboard não conhece o PDF Geral de Produtos, nem o
  contrário. Services separados, sem dependência cruzada.

### ADR-0406 — Duplicação de Proposta copia o conteúdo comercial aplicável

- **Contexto:** defeito relatado na homologação — duplicar uma proposta **não
  copiava os serviços complementares** (Som Ambiente e Wi-Fi Premium).
- **Causa:** `duplicarProposta` selecionava apenas `clienteId`, `vendedorId`,
  `modelo`, `validadeDias` e `obsProposta`, mais seções e itens da revisão.
  `PropostaServico` sequer estava no `select` — e, com ele, também se perdiam
  `nomeProjeto`, `tipoDesconto`, `valorDesconto`, `frete`, `formaPagamento`,
  `previsaoInstalacao`, `obsComerciais` e `obsTecnicas`.

  Os itens de tipo `SERVICO` **já** eram copiados (`copiarConteudo` inclui
  `tipo`), assim como o `valorServico` de cada linha. O que se perdia era
  exclusivamente a entidade `PropostaServico`, ligada à Proposta e não à Revisão
  — e é justamente por estar fora da revisão que ela escapou de `copiarConteudo`.
- **Decisão:** a duplicação passa a copiar **todo o conteúdo comercial
  aplicável**. Corrigir só os serviços deixaria desconto e frete se perdendo em
  silêncio, com a mesma causa e a mesma surpresa para o usuário mais adiante.
- **Nunca copiado:** `obsInternas` (ADR-0203, regra preservada),
  `proposalNumber`, `status`, datas de status, cancelamento e auditoria.
- **Integridade:** cada `PropostaServico` é **criado** na proposta nova. Nenhum
  `id` da origem é reaproveitado e nenhuma linha mutável é compartilhada —
  alterar a duplicada não pode tocar na original. Um E2E prova isso alterando a
  cópia e relendo a origem.
- **`SIMPLIFICADA` continua sem serviços**, mesma regra de `criarPropostaCompleta`
  e `salvarProposta`.
- **Nada financeiro é recalculado:** `valorTotal` é copiado como está — já é
  derivado e persistido pela regra da Sprint 2.9.1 — e
  `calcularResumoFinanceiro().totalGeral` segue sendo a fonte oficial, intocada.

### ADR-0407 — PDF Geral de Produtos: quinto documento, quantitativo

- **Contexto:** a separação de material exigia percorrer a proposta seção por
  seção somando o mesmo produto à mão.
- **Decisão:** um quinto documento que consolida os produtos de **todas** as
  Seções, somando as ocorrências do mesmo produto. Não separa por Seção —
  consolidar é a finalidade.
- **Arquitetura preservada:** o **mesmo loader** dos outros quatro documentos.

  ```
  getPropostaPdfData → PropostaPdfDTO → consolidarProdutos → renderer → Response
  ```

  Nenhuma consulta Prisma paralela no Route Handler. A consolidação é **função
  pura**, testada sem banco.
- **Chave de agrupamento: `produtoId`,** a identidade estável. O SKU do item é
  snapshot: se o cadastro mudou depois, duas linhas do mesmo produto teriam
  códigos diferentes e não se reconheceriam. Sem vínculo — item legado —, o
  fallback é o **SKU normalizado** por `normalizarBusca`.

  **Descrição nunca entra na chave:** "Interruptor 4 teclas" e "Interruptor 4
  teclas branco" são produtos diferentes e não podem se fundir.
- **Documento QUANTITATIVO, não comercial.** Não lê `dto.servicos`, `dto.totais`,
  `dto.resumo` nem `dto.desconto`: sem preço por item, sem total financeiro, sem
  desconto, sem frete, sem Som/Wi-Fi e sem custos de Instalação. A finalidade é
  conferência de material, não negociação.
- **Ordenação previsível:** SKU ascendente com `localeCompare("pt-BR")`,
  desempate por descrição — o mesmo conteúdo gera sempre o mesmo documento,
  independentemente da ordem dos itens na proposta.
- **DTO estendido de forma ADITIVA e OPCIONAL** (`produtoId?`, `tipo?`), no mesmo
  padrão de `servicos?`. Os quatro documentos existentes não leem os campos novos
  e nenhum teste anterior precisou de ajuste para compilar.
- **NÃO emite a proposta** — única diferença deliberada em relação aos outros
  quatro, que passam por `emitirEAbrir` (RASCUNHO → EMITIDA). Este é uso interno e
  operacional, disponível nos dois status: emitir uma proposta por engano ao
  conferir material seria defeito de negócio, não conveniência.
- **Rota, botão e arquivo:** `GET /propostas/[id]/produtos`, botão
  "PDF Geral de Produtos" e `Geral de Produtos - {Primeiro Nome} {Nº} Rev.{N}.pdf`
  — o padrão vigente dos PDFs; o formato com nome completo é exclusivo do
  Contrato `.docx`. O rótulo não se confunde com "PDF Detalhado".
- **Proposta sem produtos** gera o documento com a tabela vazia e uma linha
  explicativa. Comportamento definido, não erro.

---

## Sprint 4.1 — Cadastro de Técnicos e vínculo do responsável das Instalações

### ADR-0408 — Responsável das Instalações passa a ser Técnico cadastrado (supersede parcial do ADR-0400)

- **Contexto:** o ADR-0400 (Sprint 4.0.1) decidiu, deliberadamente, que o
  responsável da Instalação seria **texto livre**: "*O nome digitado é
  snapshot histórico do fato […] Converter o primeiro em FK reescreveria o
  histórico — por isso ele permanece texto.*" O pedido desta Sprint é
  exatamente o que aquele ADR previa como risco — trocar o texto por uma FK —,
  e a decisão só é legítima porque a forma de cumprir a garantia mudou, não o
  compromisso em si.
- **Este ADR é supersede PARCIAL do ADR-0400**, restrito ao bullet
  "Responsável é TEXTO LIVRE". Todo o resto do ADR-0400 continua valendo
  **integralmente**: Instalação independente de Pedido de Venda, numeração
  própria por sequência nativa, endereço por snapshot derivado no service,
  cancelar (nunca excluir), concluir como mudança de status, auditoria técnica
  separada da cronologia e datas com fuso `America/Sao_Paulo` fixo na conversão
  da Server Action. Nenhum desses pontos foi tocado nesta Sprint.
- **O que muda é a FORMA, não o princípio.** `Instalacao.responsavelAtual`
  (texto livre) vira `tecnicoResponsavelId` (FK para o novo model `Tecnico`).
  `InstalacaoRegistro.responsavel` (texto livre) vira `tecnicoId` (FK) **mais**
  `responsavelNome` (snapshot histórico, texto).
- **O que NÃO muda: o princípio de não reescrever silenciosamente o histórico
  operacional.** O ADR-0400 estava certo sobre o risco — é exatamente o que
  aconteceria se `InstalacaoRegistro` guardasse só a FK: renomear um Técnico, ou
  ele deixar a empresa, reescreveria o que a cronologia diz ter acontecido. A
  solução evoluiu: antes a garantia vinha de o nome ser texto digitado à mão;
  agora vem de `responsavelNome`, um snapshot igualmente imutável, só que
  derivado de um cadastro em vez de tecladado por quem preenche o formulário.
- **Por que a Instalação NÃO tem snapshot e o registro TEM.**
  `tecnicoResponsavelId` da Instalação não guarda nome nenhum — só a FK. É a
  mesma distinção que já existe no ADR-0400 entre "responsável pelo
  acontecimento" e o resto: "responsável atual" da Instalação é **estado
  corrente**, não fato histórico — renomear o Técnico no cadastro deve refletir
  ali, do mesmo jeito que o cabeçalho de uma proposta reflete o nome atual do
  vendedor, não o nome que ele tinha quando a proposta foi criada. Já
  `InstalacaoRegistro` é a cronologia — cada linha é um fato consumado ("quem
  fez essa visita em tal data"), e fatos consumados não se movem quando o
  cadastro muda depois.
- **A regra exata do snapshot (§6.2 da spec):** `responsavelNome` é o nome do
  responsável **no momento em que ELE foi atribuído àquele registro**, não "o
  nome que o Técnico tinha na última vez que qualquer campo do registro foi
  editado". Na criação, o nome vem do Técnico selecionado, lido do banco dentro
  da transação. Na edição, `atualizarRegistro` compara o `tecnicoId` vigente
  (lido dentro da própria transação) com o recebido: se **não mudou**, o
  service passa `undefined` para `responsavelNome`, e o Prisma simplesmente não
  toca naquela coluna — o valor gravado na criação (ou na última troca)
  permanece intacto, ainda que o cadastro tenha sido renomeado nesse meio
  tempo. Só quando o `tecnicoId` **muda** é que o service relê o nome do novo
  Técnico e reescreve o snapshot. Exemplo canônico:

  ```
  1. registro criado com o Técnico "Carlos"        → responsavelNome = "Carlos"
  2. cadastro renomeado para "Carlos Almeida"
  3. edita SÓ o relatório do registro              → responsavelNome = "Carlos"      ← preservado
  4. edita e troca o responsável para "Bruno"      → responsavelNome = "Bruno"       ← reescrito
  ```

  Edição comum (relatório, data, custos) não dispara a reescrita porque a
  condição que dispara é estritamente "o `tecnicoId` mudou", nunca "algum campo
  do registro mudou". O nome nunca é recebido do navegador — `nomeDoTecnico` lê
  o `Tecnico` persistido dentro da transação, a mesma regra e o mesmo motivo do
  `snapshotEndereco` do ADR-0400: uma garantia de integridade não pode depender
  do estado de um formulário.
- **`Vendedor` continua não sendo reutilizado**, pelo mesmo argumento que já
  valia no ADR-0400: um instalador ou técnico não é vendedor, e usar o mesmo
  cadastro poluiria o autocomplete da Proposta com nomes que nunca deveriam
  aparecer ali, além de distorcer a regra de exclusão "já foi usado em uma
  proposta" — um Técnico nunca é usado em proposta nenhuma, então essa contagem
  ficaria sempre zerada e sem sentido para ele.
- **Técnico não é Usuário.** Não há login, permissão, agenda ou qualquer
  vínculo com autenticação — o cadastro tem só `nome` e `ativo`, como
  `Vendedor` sem os campos de contato. Quando o sistema ganhar autenticação,
  "registrado por" será um campo **novo e aditivo**, distinto deste vínculo:
  `tecnicoId`/`responsavelNome` continuarão respondendo "quem esteve na
  instalação", enquanto "registrado por" responderá "quem operou o sistema"
  — a mesma distinção que o ADR-0400 já antecipava entre "responsável pelo
  acontecimento" e "registrado no sistema por".
- **Backfill dirigido pelos dados, não pelo conteúdo observado.** A migration
  agrupa os nomes de texto livre existentes por uma chave normalizada em caixa
  e espaços (`lower(regexp_replace(btrim(nome), '\s+', ' ', 'g'))`), mas
  **recusa deliberadamente** normalizar por acento: "João" e "Joao" podem ser a
  mesma pessoa ou não, e inventar essa correspondência seria uma decisão de
  negócio disfarçada de detalhe técnico de migration. Cada grafia distinta por
  acento vira um Técnico **distinto**, visível no cadastro recém-criado, onde
  uma pessoa decide se funde os dois — decisão humana, não automatizada. Uma
  guarda (`RAISE EXCEPTION` dentro da transação da migration) aborta a
  migration inteira, sem alterar nada, se qualquer linha ficar sem vínculo
  depois do backfill — preferível a inventar um mapeamento e mascarar um caso
  que a chave não resolveu. Contra os dados reais da Outmat, a auditoria prévia
  confirmou 1 Técnico criado (`Vinicius`) e os 3 registros existentes
  vinculados a ele, cada um preservando a própria grafia original em
  `responsavelNome`.
- **Desvio deliberado em relação ao Vendedor: Técnico inativo já vinculado
  entra na lista de opções.** No Select de Vendedor da Proposta
  (`getPropostaFormOptions`), o filtro é só `ativo: true` — um vendedor
  inativado depois de vinculado à proposta some da lista e o campo abre em
  branco (débito real, registrado no `BACKLOG.md` nesta mesma Sprint, não
  corrigido por estar fora do escopo aprovado). Para Técnico, `listTecnicoOptions`
  evita deliberadamente esse defeito: a lista de opções é **técnicos ativos ∪
  técnicos já vinculados àquele agregado**, mesmo inativos, rotulados
  `Nome (inativo)`. Um técnico inativo **não vinculado** continua fora da
  lista, para não ser oferecido como opção nova. Sem essa união, reabrir uma
  Instalação cujo técnico foi inativado mostraria o campo vazio, e salvar
  qualquer outra alteração da tela apagaria o vínculo em silêncio — exatamente
  o efeito colateral que o princípio deste ADR existe para evitar.
- **Consequência:** o cadastro de Técnicos nasce vazio (sem dados de seed) e
  reproduz a estrutura de Vendedor com dois campos a menos. A exclusão segue o
  padrão de Cliente/Produto/Vendedor — nunca usado pode ser excluído, usado
  (em Instalação ou em qualquer registro) só pode ser inativado — mas é o
  primeiro cadastro cuja checagem de uso **não** olha para `Proposta`: olha
  para `Instalacao.tecnicoResponsavelId` e `InstalacaoRegistro.tecnicoId`, com
  mensagem própria (`CANNOT_DELETE_USED_IN_INSTALACOES`). O `DROP COLUMN` das
  duas colunas de texto livre só é alcançado depois que a guarda prova que
  toda linha tem vínculo — nenhum dado é perdido: os 3 registros reais
  continuam legíveis, com a mesma grafia de antes.

---

## Sprint 4.1.1 — Integridade do agregado da cronologia (fechamento da 1.4.0)

### ADR-0409 — Estratégia de testes: três suítes separadas, todas obrigatórias

- **Contexto:** até a 1.4.0 o projeto tinha duas suítes — unidade (Vitest,
  módulos puros) e smoke/E2E (Playwright, navegador). A correção de integridade
  do agregado da cronologia expôs uma lacuna entre elas. A regra sob teste
  ("um registro só pode ser editado ou excluído dentro da Instalação a que
  pertence") **é** uma condição de consulta: `where: { id, instalacaoId }`. Com o
  Prisma mockado, o teste provaria apenas que o mock foi chamado com certos
  argumentos — o que já era verdade na versão vulnerável. E a interface nunca
  produz o par cruzado, então o E2E também não alcança o caso. Existia uma classe
  de invariante que **nenhuma** das duas suítes conseguia provar.
- **Decisão — três camadas, com fronteiras por natureza da garantia:**
  - **Unidade — `npm run test`.** Lógica pura: funções, schemas Zod, mappers,
    cálculos, regras que não precisam de infraestrutura real. Rápidos,
    determinísticos, **sem PostgreSQL**, executáveis isoladamente e em qualquer
    máquina.
  - **Integração — `npm run test:integration`.** Services, persistência,
    transações, constraints — comportamento cuja fidelidade depende do
    PostgreSQL/Prisma **reais**. Config e comando próprios
    (`vitest.integration.config.ts`, `src/**/*.integration.test.ts`).
  - **Smoke/E2E — `npm run test:e2e`.** Fluxo completo pelo navegador: UI,
    navegação, integração entre camadas, as principais jornadas do usuário.
- **Critério para escolher a camada — não migrar tudo para integração:** use
  integração **quando a resposta que se quer provar depende do banco real**. Se a
  regra é computável sem IO, é teste de unidade; se só se manifesta pela tela, é
  E2E. Testes de integração são mais lentos, exigem banco disponível e escrevem
  dados — o custo só se justifica quando a infraestrutura É a garantia.
- **As três suítes permanecem SEPARADAS.** Testes de integração **não** entram em
  `npm run test`. A razão é preservar essa suíte como pura, rápida e executável
  mesmo sem PostgreSQL disponível — é a que roda a cada alteração, e um
  desenvolvedor sem banco configurado precisa continuar podendo rodá-la. A suíte
  de integração tem responsabilidade diferente e ciclo de vida diferente (cria e
  apaga os próprios dados, marcados com `E2E `, o mesmo marcador que o
  `globalTeardown` do Playwright varre).
- **Gate oficial** (`docs/CHECKLIST_RELEASE.md`), na ordem lógica, sem remover
  nenhum critério anterior: Lint · Typecheck · Build · **Unit Tests** ·
  **Integration Tests** · **Smoke/E2E** · `/api/health` · `/dev/diagnostics` ·
  PostgreSQL · Prisma · Documentação · CHANGELOG · VERSION · Commit. Quem roda o
  gate roda os **três** comandos de teste; nenhum deles executa os outros.
- **Consequência:** invariantes de domínio que vivem na fronteira com o banco
  passam a ter onde ser provadas. O detalhe operacional (comandos, tabela do
  gate, quando cada suíte se aplica) fica em `README.md`, `ARCHITECTURE.md` §8 e
  `docs/CHECKLIST_RELEASE.md` — este ADR registra a decisão e a razão. O primeiro
  caso coberto é o pertencimento do registro da cronologia à sua Instalação,
  cujos quatro cenários cruzados foram verificados como **discriminantes**:
  removida a guarda, falham; restaurada, passam.

---

## Sprint 4.2 — Usuário único com papéis operacionais

### ADR-0410 — Usuário único com papéis operacionais (supersede parcial do ADR-0408)

- **Contexto:** o projeto tinha **dois** cadastros de pessoas — `Vendedor`
  (Sprint 1) e `Tecnico` (Sprint 4.1) — e, na prática, as mesmas pessoas
  apareciam nos dois. A auditoria de 2026-08-26 confirmou: 2 vendedores
  (`Carlos Gomes`, `Vinicius Garcia`) e 1 técnico (`Vinicius`), sendo os dois
  últimos a mesma pessoa em cadastros separados. Manter duas identidades para
  uma pessoa obriga a cadastrar duas vezes, renomear duas vezes e inativar duas
  vezes — e nada garante que as duas fiquem coerentes.
- **Decisão:** um único model `Usuario` (`nome`, `ativo`, `ehVendedor`,
  `ehTecnico`, `telefone`, `email`), com os dois papéis como flags
  **independentes**. `Vendedor` e `Tecnico` deixam de existir como models,
  tabelas, services, features e rotas.

- **Este ADR é supersede PARCIAL do ADR-0408**, restrito a dois bullets. Todo o
  resto daquele ADR continua valendo **integralmente** — em especial a regra do
  snapshot `responsavelNome`, que é reafirmada abaixo e não sofreu uma única
  alteração de comportamento nesta Sprint.

- **Bullet superado nº 1 — "`Vendedor` continua não sendo reutilizado".** O
  ADR-0408 argumentava que reaproveitar aquele cadastro "*poluiria o
  autocomplete da Proposta com nomes que nunca deveriam aparecer ali, além de
  distorcer a regra de exclusão 'já foi usado em uma proposta'*". **O argumento
  estava correto — para um cadastro sem papéis.** Reutilizar `Vendedor` como
  ele era em 2026-08-20 realmente colocaria instaladores no Select da Proposta.
  O que mudou não foi o julgamento, foi a estrutura: a identidade passa a
  carregar papéis explícitos, e **todo Select filtra pelo papel**
  (`ativo && ehVendedor`, `ativo && ehTecnico`). Um técnico que não vende nunca
  aparece na Proposta, porque `ehVendedor` é falso — não porque está em outra
  tabela. A separação que o ADR-0408 obtinha por tabela, este ADR obtém por
  papel, que é a dimensão que realmente descreve o problema.
- **A segunda metade daquele argumento também é resolvida.** A regra de
  exclusão deixa de ser vazia: `removeUsuario` conta os **três** vínculos
  (`Proposta.vendedorId`, `Instalacao.tecnicoResponsavelId`,
  `InstalacaoRegistro.tecnicoId`) e usa uma mensagem única
  (`CANNOT_DELETE_USED_IN_RECORDS`). Para qualquer combinação de papéis a
  contagem é significativa — o problema que o ADR-0408 apontava ("*um Técnico
  nunca é usado em proposta nenhuma, então essa contagem ficaria sempre zerada e
  sem sentido para ele*") existia justamente porque a regra olhava para uma
  relação só.

- **Bullet superado nº 2 — "Técnico não é Usuário" — superado apenas no NOME.**
  O conteúdo daquele bullet **continua valendo e é reafirmado aqui**: este
  `Usuario` **não é um principal de autenticação**. Não há login, senha,
  permissão, sessão nem agenda. Ele responde "**quem fez o trabalho**", não
  "quem operou o sistema". Quando o sistema ganhar autenticação, "registrado
  por" será campo **novo e aditivo**, distinto destes vínculos — exatamente como
  o ADR-0408 e o ADR-0400 já antecipavam. O que este ADR supera é a afirmação
  literal de que a entidade não poderia se chamar `Usuario`; o compromisso de
  não misturar identidade operacional com identidade de autenticação permanece
  intacto.
- **Risco aceito conscientemente:** o nome `Usuario` fica indisponível para o
  futuro principal de autenticação. A alternativa (`Pessoa`, `Colaborador`) foi
  considerada e recusada pelo dono do produto, que prefere o vocabulário
  `Usuários` na interface. Quando a autenticação chegar, o principal precisará
  de outro nome (`Conta`, `Login`, `Credencial`) ou de um vínculo opcional
  `Usuario ↔ Conta`. A decisão é deliberada, não um descuido.

- **`ativo` e papéis são eixos INDEPENDENTES.** `ativo` responde "esta pessoa
  ainda atua"; os papéis respondem "o que ela faz". Disponível para um vínculo
  **novo** naquele papel = `ativo && ehPapel`. Um usuário com os **dois papéis
  desmarcados é válido** — é o cadastro criado antes de a função ser decidida;
  proibir isso tornaria impossível cadastrar alguém antes de saber o papel, e a
  consequência natural já basta: ele não aparece em Select nenhum.

- **Regra dos filtros, com união obrigatória.** `listUsuarioOptions(papel,
  incluirIds)` devolve **disponíveis ∪ os ids informados**. `incluirIds` carrega
  quem já está vinculado àquele agregado, ainda que indisponível. Sem essa
  união, abrir uma proposta cujo vendedor foi inativado mostraria o campo em
  branco e salvar qualquer outra alteração apagaria o vínculo em silêncio — o
  efeito colateral que o ADR-0408 já evitava para Técnico e que o Vendedor
  **sofria** (débito registrado no `BACKLOG.md` naquela mesma Sprint). A
  unificação dos dois Selects fecha esse débito por consequência mecânica.
- **Duas causas de indisponibilidade, dois rótulos.** Antes só existia
  inativação; agora a pessoa também pode perder o papel. O efeito operacional é
  idêntico (some das escolhas novas), mas a ação corretiva não é, então o rótulo
  distingue: `João (inativo)` — o rótulo que já existia, preservado — e
  `João (sem papel de vendedor)`. **Um único sufixo, nunca dois:** quando as
  duas condições valem, vence `(inativo)`, por ser a condição mais forte. A
  regra vive em `features/usuarios/opcoes.ts`, módulo puro testado sem banco.

- **Guarda de papel apenas em vínculo NOVO ou ALTERADO.** Escolher alguém sem o
  papel é recusado no **service**, não só na tela. Mas a verificação compara o
  vínculo persistido com o recebido, **dentro da transação**, e só age na
  mudança:

  ```
  vínculo NOVO ou ALTERADO        → exige ativo && ehPapel; senão, erro
  vínculo PREEXISTENTE inalterado → aceito sempre, sem verificação
  vínculo removido (→ null)       → aceito sempre
  ```

  É isto que permite exigir o papel **sem** quebrar o histórico: uma proposta
  cujo vendedor foi inativado, ou que perdeu o papel depois, continua salvável —
  corrigir o desconto de uma proposta antiga não pode falhar por causa de uma
  mudança de cadastro posterior. Trocar o vendedor, sim: aí é escolha nova, e
  escolha nova respeita a regra vigente. A **duplicação** de proposta copia o
  `vendedorId` sem passar pela guarda, pelo mesmo motivo: é vínculo copiado, não
  escolhido. A forma é a mesma que `atualizarRegistro` já usava para o snapshot
  (ADR-0408) — comparar o persistido com o recebido e agir só na mudança.

- **Preservação histórica — nada é reescrito.** `InstalacaoRegistro.
  responsavelNome` permanece, com a regra do ADR-0408 **sem uma alteração**:
  reescrito somente quando o `tecnicoId` muda; `undefined` continua impedindo o
  Prisma de tocar na coluna. Renomear um Usuário não altera retroativamente a
  cronologia. Inativá-lo ou desmarcar seu papel não apaga nem altera vínculo
  nenhum. `nomeDoTecnico` passou a ler de `usuarios` e a exigir o papel na mesma
  consulta — uma leitura só, para que nome e verificação venham do mesmo estado.

- **Migração em quatro etapas: três estruturais e genéricas, uma humana.**
  - **M1 `usuarios_estrutura`** cria a tabela e a popula, **um Usuario por
    cadastro de origem, sempre**.
  - **M2 `usuarios_vinculos`** troca o alvo das três FKs.
  - **M3 `usuarios_drop_legado`** apaga `vendedores` e `tecnicos`.
  - **M4 `usuarios_consolidacao_outmat`** consolida duas pessoas específicas.
- **R1 — o id de origem é PRESERVADO.** `usuarios.id` recebe `vendedores.id` ou
  `tecnicos.id`. Os valores já gravados nas três colunas de vínculo **já são** os
  ids corretos, então a M2 não contém um único `UPDATE`: ela remove e recria
  constraints, sem tocar em valor nenhum. "Nenhum vínculo perdido" deixa de
  depender de uma guarda e passa a ser **estruturalmente impossível de violar**.
  Uma guarda de colisão (`INTERSECT` entre os dois conjuntos de id) roda antes de
  qualquer `INSERT`, porque preservar o id só é seguro se os conjuntos forem
  disjuntos — na Outmat são (cuid de 25 caracteres × uuid de 36), mas a migration
  não pode depender disso. A preservação foi provada valor a valor: as sete
  linhas de vínculo foram capturadas antes e depois da M2 e comparadas com
  `diff`.
- **R2 — M1–M3 não contêm uma única linha de lógica baseada em nome.** Sem
  `lower`, sem `LIKE`, sem prefixo, sem normalização de espaço, sem remoção de
  acento, sem chave normalizada. Um cadastro de origem vira um Usuario, sempre.
  Isso leva à sua conclusão o princípio que o ADR-0408 já defendia — "*cada
  grafia distinta vira um Técnico distinto, visível no cadastro, onde uma PESSOA
  decide se os funde*" —, agora **sem exceção**: nenhuma migration estrutural
  toma decisão de identidade. Com R1 isso também é uma necessidade técnica:
  fundir na etapa estrutural descartaria o id do absorvido e quebraria as FKs
  dele.
- **R3 — as três FKs passam a `ON DELETE RESTRICT`.** `propostas.vendedorId` era
  `SET NULL` desde a migration inicial, enquanto as duas FKs de técnico já eram
  `RESTRICT`. Apagar um vendedor por qualquer caminho que não passasse por
  `removeVendedor()` **zerava o vínculo da proposta em silêncio** — perda de
  histórico, o oposto do que este ADR garante. Como a M2 reescrevia as três
  constraints de qualquer forma, a divergência foi corrigida na própria Sprint,
  sem virar débito. O banco passa a garantir o que a aplicação já afirmava em
  `removeUsuario`.

- **M4 — a consolidação é decisão humana, e as guardas provam isso.** "Vinicius"
  e "Vinicius Garcia" são chaves **distintas** por qualquer normalização
  defensável; fundi-las exigiria casamento por prefixo, que também fundiria
  "Carlos" com "Carlos Gomes". A fusão foi **aprovada explicitamente pelo dono
  do produto em 2026-08-26**, contra a auditoria, e vive isolada na M4. O
  desenho da migration separa estritamente duas funções:
  **os ids são o SELETOR; os nomes são apenas ASSERÇÃO.** Nenhuma linha é
  escolhida por nome — as duas pessoas são endereçadas pelos ids literais
  auditados, um cuid e um uuid, globalmente únicos, que não existem em nenhum
  outro banco. Os nomes aparecem só dentro de `IF … RAISE EXCEPTION`, para
  verificar que a premissa auditada continua válida. Duas semânticas de guarda,
  deliberadamente diferentes: **ids ausentes** (outro banco) → `RETURN`
  silencioso, nada acontece; **ids presentes com estado inesperado** →
  `RAISE EXCEPTION`, aborta tudo. Banco diferente não é erro; banco igual em
  estado inesperado é. Dois registros chamados "Vinicius" e "Vinicius Garcia" em
  outra base, com outros ids, **jamais** seriam fundidos: a migration nem chega
  a ler o nome deles. Antes do `DELETE` do absorvido, uma guarda prova zero
  referências restantes; outra prova que os três registros continuam com
  `responsavelNome = 'Vinicius'`. A coluna do snapshot **não aparece em nenhum
  `SET` do arquivo**.

- **Sem redirects de `/vendedores` e `/tecnicos`.** Aplicação interna, sem SEO,
  sem link externo, sem API pública. Os únicos consumidores dessas URLs eram o
  menu e os specs E2E, ambos reescritos. Um redirect manteria vivos por tempo
  indeterminado os dois nomes que a Sprint existe para eliminar, com arquivos e
  testes a manter. Um bookmark antigo devolve 404 e a pessoa usa o menu.

- **Consequência:** um cadastro no lugar de dois, com `/usuarios` no menu entre
  Instalações e Configurações (sete itens). Nenhuma mudança de contrato: as
  colunas de FK mantêm os nomes (`vendedorId`, `tecnicoResponsavelId`,
  `tecnicoId`), porque nomeiam o **papel no vínculo**, não a tabela de origem —
  e por isso `proposta-pdf.mapper.ts` (`consultor`) e o resumo financeiro
  oficial não mudaram uma linha. O Dashboard perdeu o card "Custos extras
  acumulados" (apresentação apenas — `InstalacaoCusto`, categorias, cálculo e
  histórico ficam intactos) e teve os cards restantes rebalanceados.

---

## Release 1.5.1 — Contrato: multa de rescisão e prazo de início

### ADR-0411 — Dois `[Nº]` do contrato viram termo fixo (supersede parcial do ADR-0330)

- **Contexto:** o template nasceu (ADR-0330) com **5 `[Nº]`** manuais, digitados
  no Word a cada envio. Dois deles não variavam na prática — o prazo de início e
  a multa de rescisão eram sempre os mesmos valores comerciais. Redigitá-los a
  cada contrato é retrabalho com risco assimétrico: o erro típico não é um número
  errado, é o contrato sair **com o colchete em branco**, e esse documento vai
  para assinatura.

- **Decisão — multa de rescisão fixada em 20% (cláusula 9.2).** O texto passa a
  "*além de multa de **20% (vinte por cento)** sobre o saldo do contrato*". A
  **base de cálculo (saldo do contrato), a hipótese (rescisão por iniciativa do
  CONTRATANTE após o início dos serviços) e a retenção da entrada não mudaram** —
  só o percentual deixou de ser preenchível. A forma "número (por extenso)" segue
  a convenção do próprio documento ("3 (três) meses", "12 (doze) meses").

- **A cláusula 8.1 NÃO foi tocada e permanece em 2%.** São multas diferentes: a
  8.1 é **moratória** (atraso de pagamento, incide sobre o valor em aberto,
  acompanhada de juros de 1% a.m.); a 9.2 é **compensatória** (desistência,
  incide sobre o saldo). Levar 20% para a 8.1 seria mudança de natureza — 2% é o
  teto do art. 52 §1º do CDC para relação de consumo, e a maior parte da
  clientela é pessoa física consumidora. A confusão entre as duas é o erro
  provável de quem reabrir este assunto, por isso há **teste dedicado** que falha
  se a 8.1 for alterada.

- **Decisão — prazo de início contado da autorização formal (cláusula 3.1).** O
  texto passa a: "*O início dos serviços não depende de data previamente fixada.
  Os serviços terão início em até **10 (dez) dias úteis** contados da
  **autorização formal do CONTRATANTE**, assim entendida a confirmação do
  pagamento previsto na Cláusula 2.2 acompanhada da disponibilização do local em
  condições de execução, e serão concluídos no prazo estimado de [Nº] dias
  úteis.*"

- **Por que "autorização formal" é DEFINIDA na própria cláusula.** A redação
  curta ("em até 10 dias após a autorização formal") foi considerada e recusada:
  deixaria o termo indefinido e **contradiria a cláusula 2.3**, que condiciona o
  início à confirmação do primeiro pagamento — o CONTRATANTE poderia sustentar
  que autorizou por e-mail e que o prazo correu sem ele ter pago. Definir o termo
  dentro da 3.1 mantém 2.3 e 3.1 dizendo a mesma coisa **sem editar a 2.3**, e
  preserva a condição "disponibilização do local", da qual a **cláusula 3.2**
  (prorrogação automática por atraso na liberação do local) depende. Uma cláusula
  de prorrogação cujo gatilho sumiu do texto que ela prorroga fica órfã.

- **Dias ÚTEIS, não corridos.** Decisão do dono do produto. Mantém a unidade já
  usada nas outras duas contagens de prazo do documento — conclusão (3.1) e
  aceite (5.5) —; "corridos" só na 3.1 faria o contrato misturar duas unidades e
  obrigaria a rever a 5.5 junto.

- **Formatação: os dois runs perderam realce, negrito e cor — de propósito.** No
  template, negrito + azul `3C77FF` é o estilo de **dado variável** (é como
  `{clienteNome}` e `{valorTotal}` saem no contrato entregue, e foi assim
  homologado na 3.1); o amarelo marca "preencha aqui". `20% (vinte por cento)` e
  `10 (dez)` não são nem uma coisa nem outra: são **cláusula**. Por isso ficaram
  com o `rPr` do corpo (`sz 21`), byte a byte igual aos runs vizinhos — exatamente
  como o documento já escreve "2%", "1% ao mês" e "3 (três) meses".

- **Contagens e guardas.** `[Nº]` cai de **5 → 3** no oficial e de **4 → 2** no
  marcado (restam prazo de conclusão e prazo de aceite; o do Anexo II vira
  `{propostaNumero}`). As pré/pós-condições de
  `scripts/marcar-template-contrato.mjs`, `template.test.ts` e `render.test.ts`
  foram atualizadas. **As três guardas dispararam sozinhas durante a execução** —
  o `render.test.ts` não havia sido mapeado na auditoria e quebrou o gate, que é
  precisamente a função dele.

- **Nenhuma linha de código de aplicação mudou.** Os percentuais e prazos **nunca
  estiveram no código**: não há campo correspondente em `ContratoTemplateDTO`,
  `contrato.mapper.ts` não os calcula e `render.ts` não os conhece. `Proposta.
  previsaoInstalacao` existe (ADR-0222) mas alimenta só o PDF Apresentação, e o
  contrato não tem vínculo com `Instalacao`. A mudança é de **conteúdo de
  documento**, o que é a razão de ela caber numa release **patch**.

- **Prova estrutural da edição do oficial:** apenas os parágrafos **22 (3.1)** e
  **46 (9.2)** do `word/document.xml` mudaram — todos os outros 71 são byte a byte
  idênticos —, e as outras **21 entradas do `.docx`** ficaram intactas. Em
  seguida a invariante do próprio script de marcação ("removendo texto e realce
  de ambos, o resto é idêntico") passou, provando que fonte, margens, cabeçalho,
  rodapé, espaçamentos, numeração e estilos não foram tocados.

- **Supersede PARCIAL do ADR-0330**, restrito a duas afirmações de contagem: "*os
  4 `[Nº]` (prazos/multa) … permanecem literais*" e "*`[Nº]` aparece 5× com 5
  significados*". Todo o resto do ADR-0330 continua valendo integralmente — em
  especial a proibição de usar `[` `]` como delimitadores do docxtemplater, que é
  o que evita a "multa de 1042%", e que a redução de 5 para 3 não enfraquece.

- **Gate manual obrigatório mantido:** homologação visual no Microsoft Word antes
  de fechar a release. Nenhum teste prova fidelidade de fonte, margem ou layout.

- **Consequência:** o contrato sai do sistema com dois campos a menos para
  preencher à mão e sem o risco de ir para assinatura com a multa em branco.
  Sobram 2 `[Nº]` manuais, ambos genuinamente variáveis por obra.

---

## Sprint 4.3 — Aprovação de Proposta, Apelido de Instalação e Anexos de Registro

### ADR-0412 — Aprovação pertence à REVISÃO; `Proposta.status` é projeção (supersede parcial do ADR-0211)

- **Contexto:** era preciso identificar propostas que o cliente já aprovou, antes
  de existir Pedido de Venda, e a exigência do dono do produto foi explícita: a
  aprovação representa **a revisão/conteúdo específico que o cliente aprovou**,
  não uma aprovação eterna da proposta. Alterar a proposta depois tem de
  invalidar a aprovação automaticamente.

- **Decisão — duas camadas, e só uma delas é o fato.**
  - **O FATO vive na revisão:** `PropostaRevisao.aprovadaEm DateTime?`. Simétrico
    a `emittedAt`, mesma tabela, mesma semântica de carimbo por versão. É
    histórico: a `Rev.2` foi aprovada em tal data, e isso segue verdadeiro depois
    de existir uma `Rev.3`.
  - **O ESTADO vive na proposta:** `StatusProposta.APROVADA` é a **projeção** de
    "a revisão ATUAL está aprovada". Existe porque listagem, filtro, badge e
    dashboard já leem `Proposta.status`; derivar isso por join em toda listagem
    seria caro e divergiria do padrão do projeto.

- **`Proposta.aprovadaAt` NÃO é recriada.** Ela responderia "quando foi aprovada
  pela primeira vez" — pergunta sem consumidor —, e o ADR-0204 obrigaria a nunca
  sobrescrevê-la, o que a tornaria enganosa depois da segunda aprovação.
  `currentRevision.aprovadaEm` é a resposta correta e sempre atual.

- **A invalidação é automática, por construção.** `salvarProposta` já cria uma
  revisão nova quando a atual está congelada; a revisão nova nasce com
  `aprovadaEm` nulo. Não existe "limpar a aprovação": ela continua colada à
  revisão que o cliente aprovou, e a proposta apenas deixa de apontar para uma
  revisão aprovada. Nenhuma máquina de estados nova, nenhum campo a zerar,
  nenhum histórico reescrito.

- **Decisão — o gatilho do fork deixa de ser o status.** `salvarProposta` passava
  por `if (p.status === "EMITIDA")`. Passa a `if (p.currentRevision?.emittedAt)`.
  **Sem essa troca existe perda silenciosa de dado:** uma proposta `APROVADA` não
  cairia no `if` e o `deleteMany` de seções sobrescreveria **in-place o conteúdo
  que o cliente aprovou**. Hoje as duas condições são equivalentes
  (`emittedAt != null` ⟺ `status === "EMITIDA"`), então a troca é neutra e foi
  provada por **teste de caracterização** antes de `APROVADA` existir. A regra
  passa a ser enunciável sem citar status: **revisão congelada nunca é alterada
  in-place**.

- **Decisão — alteração de proposta aprovada volta para RASCUNHO**, não para
  EMITIDA. Três razões: (1) a revisão nova **nunca foi emitida** (`emittedAt`
  nulo) — marcá-la EMITIDA afirmaria que existe documento para um conteúdo que
  ninguém gerou; (2) `emitirProposta` recusa proposta já emitida e `podeEmitir`
  exige RASCUNHO — voltar a EMITIDA **travaria a emissão** do novo conteúdo; (3)
  é o comportamento já homologado desde a 0.6.x, agora estendido sem virar uma
  segunda regra.

- **Qualquer `salvarProposta` bem-sucedido invalida a aprovação — sem diff campo
  a campo.** O sistema já trata todo salvamento como versão comercial nova
  (ADR-0214), o botão só habilita com alterações pendentes, e os campos citados
  pelo dono do produto (produto, quantidade, preço, desconto, frete, serviços,
  Som, Wi-Fi, seções, observações comerciais) **são exatamente** o payload de
  `salvarProposta`. O único campo do payload que não é conteúdo apresentado ao
  cliente é `obsInternas`; aceitar que ele invalide é o lado seguro do erro —
  reaprovar é um clique, enquanto uma proposta alterada exibida como APROVADA é o
  defeito que se queria evitar.

- **Transições:** `RASCUNHO→{EMITIDA,CANCELADA}` ·
  `EMITIDA→{APROVADA,RASCUNHO(fork),CANCELADA}` ·
  `APROVADA→{EMITIDA(desfazer),RASCUNHO(fork),CANCELADA}` · `CANCELADA→{}`.
  Aprovar exige `EMITIDA`: o cliente só aprova o que lhe foi enviado.

- **"Desfazer aprovação" existe por necessidade operacional.** Sem ela, um clique
  errado só teria saída fazendo uma alteração qualquer — o que forka uma revisão
  e perde a emissão. Limpa `aprovadaEm` **da revisão atual**, volta a `EMITIDA` e
  audita. Não é reescrita de histórico: revisões anteriores nunca são tocadas, e
  a ação é correção de engano sobre o estado corrente.

- **Supersede PARCIAL do ADR-0211**, restrito ao bullet "*status reduzido a
  RASCUNHO · EMITIDA · CANCELADA (removidos APROVADA/REPROVADA e as colunas
  `aprovadaAt`/`reprovadaAt`)*". O que mudou desde então: naquele momento
  APROVADA era um **valor de `<select>` manual sem semântica**, e removê-la
  estava certo. Agora é ação com guarda, fato datado na revisão e invalidação
  automática. **O resto do ADR-0211 é reafirmado** — em especial "*status é 100%
  dirigido pelo sistema, não há seletor manual*": continua não havendo.
  **`REPROVADA` segue fora** — não foi pedida e não tem regra definida.

- **Consequência:** identificar proposta aprovada sem depender de Pedido de
  Venda; quando ele existir, "qual revisão o cliente aprovou e quando" é consulta
  direta a `PropostaRevisao`, sem migração.

### ADR-0413 — `Instalacao.apelido` e retorno à listagem ao salvar

- **Contexto:** um mesmo cliente tem várias instalações ("Casa Alphaville",
  "Apartamento Moema") e a listagem não tinha como distingui-las. Colocar o campo
  no cadastro de Cliente seria errado — o apelido é da obra, não da pessoa.

- **Decisão — `apelido` pertence à Instalação.** Nasce **sugerido** pelo nome de
  exibição do Cliente na criação, é editável livremente, e **continua editável no
  workspace** depois (é rótulo interno; renomear tem de ser possível). Não é
  snapshot e não pertence ao Cliente.

- **NÃO é o `nomeProjeto` removido na Sprint 4.0.3 (ADR-0404).** Aquele era texto
  solto, sem regra, sem sugestão e sem papel na identificação — e sua remoção
  estrutural continua correta. Este nasce de uma regra de sugestão, é a
  identificação principal da instalação e entra na busca. A coluna é **nova**;
  nenhum resquício daquela foi reaproveitado.

- **Sugestão de três estados:** *nunca tocado* → escolher Cliente preenche ·
  *tocado* → trocar de Cliente **não sobrescreve**, e uma dica não-bloqueante
  mostra a sugestão descartada · *esvaziado* → volta a "nunca tocado" e a próxima
  escolha re-sugere. O terceiro estado dá saída óbvia sem botão extra.
  **A troca de Cliente só existe durante a criação** — `cabecalhoInstalacaoSchema`
  não declara `clienteId` e o workspace mostra o Cliente somente-leitura, então o
  caso "trocar o cliente depois" não existe no modelo e não foi inventada regra
  para ele.

- **`apelido` é nullable no banco, obrigatório no Zod.** `NOT NULL` exigiria
  backfill de qualquer forma, e constraint dura num campo de rótulo não paga o
  custo. A migration faz o backfill pelo nome de exibição do Cliente, com
  fallback `"Instalação <número>"` para o cliente sem nome — sem ele a coluna de
  identificação principal ficaria vazia.

- **Listagem:** Apelido em primeiro, `font-medium`, como link. **O Número
  permanece link** — o ADR-0404 decidiu que ele é a porta de entrada, com `<a>`
  real (Tab, foco visível, Ctrl+clique) e rejeição explícita de `onClick` na
  `<tr>`; remover isso seria reverter aquela decisão sem ADR. Cliente permanece
  como coluna secundária: dois clientes podem ter "Casa".

- **Decisão — salvar dados gerais volta para `/instalacoes`.** Vale para criação
  e para edição do cabeçalho. Na criação o toast ganha ação **"Abrir"**, que
  devolve o atalho para o workspace recém-criado.

- **A cronologia NÃO segue essa regra.** Criar, editar ou excluir Registro
  permanece no workspace. A separação é **física**, não condicional: os registros
  vivem em `Cronologia`/`RegistroDialog`, com Server Actions próprias que só
  revalidam `/instalacoes/[id]`. Há **E2E dedicado ao negativo** — salvar um
  registro mantém a URL em `/instalacoes/<id>` —, porque é a regra que mais
  facilmente se perde numa refatoração futura. **Cancelar instalação** também
  continua no workspace: não é "salvar".

- **Consequência:** a listagem passa a ser navegável por obra, e o fluxo de
  cadastro termina onde o usuário confere o resultado.

### ADR-0414 — Anexos do Registro: 1:N, banco como autoridade, agregado completo

- **Contexto:** faltava anexar foto e documento a um acontecimento da cronologia.
  A infraestrutura já existia e nunca havia sido usada para isso: `storagePaths`
  (`UPLOAD_PATH` ou `<STORAGE_PATH>/uploads`) e `resolveWithin`, ambos da Sprint
  0. O único precedente de upload é `logo.service.ts`.

- **Decisão — `InstalacaoRegistro 1:N InstalacaoRegistroAnexo`.** 1:1 custaria uma
  migration de remodelagem na primeira vez que alguém anexasse duas fotos, e
  "duas fotos" é o caso normal de uma visita.

- **O banco guarda metadados e caminho RELATIVO — nunca absoluto.** O caminho
  absoluto depende do servidor e de `UPLOAD_PATH`, que mudam entre ambientes.
  Layout: `instalacoes/<instalacaoId>/registros/<registroId>/<cuid>.<ext>`.
  Particionar assim evita diretório com milhares de arquivos, torna a inspeção
  manual no servidor viável e faz da exclusão de um registro uma pasta.

- **Invariante que fixa a ordem de todas as operações:** **o banco é a
  autoridade; arquivo órfão é tolerado e logável, linha apontando para arquivo
  inexistente é o estado a evitar.** Daí: no upload, grava-se o arquivo e
  **depois** a linha (falha do banco → `unlink` best-effort + log + rethrow); na
  exclusão, apaga-se a linha e **depois** o arquivo (falha do `unlink` → log, sem
  lançar).

- **Segurança em camadas independentes:**
  - **Nome físico gerado no servidor** (`cuid` + extensão vinda da allowlist de
    MIME, **nunca** do nome enviado). O `nomeOriginal` é guardado como texto e
    devolvido no `Content-Disposition`; **jamais participa da construção de um
    caminho** — é isso, e não a sanitização, que é a garantia real.
  - **`resolveWithin`** em toda leitura e escrita.
  - **Resolução pelo agregado completo** — `anexoId` + `registroId` +
    `instalacaoId` —, com "não encontrado" idêntico ao de um id inexistente. É a
    mesma classe de invariante que originou o ADR-0409 e vai para a **suíte de
    integração, com pares cruzados provados discriminantes**.
  - Allowlist fechada: `image/jpeg`, `image/png`, `image/webp`,
    `application/pdf`. **SVG fora** de propósito (é HTML executável). Limites: 10
    MB por arquivo, 10 anexos por registro.
  - Download com `Content-Type` **derivado da allowlist**, nunca ecoando o valor
    guardado, mais `X-Content-Type-Options: nosniff`.

- **Upload por Route Handler, não Server Action.** O limite padrão de corpo de
  Server Action é 1 MB e foto de celular não passa. **`next.config.ts` não é
  tocado** — subir o limite global afetaria toda Server Action do sistema para
  resolver um caso pontual. A exclusão continua Server Action (só apaga linha).

- **Os anexos são gerenciados pelo CARD do registro, não pelo diálogo.** O
  diálogo cria registro e custos numa transação única, mas um anexo precisa de um
  `registroId` que ainda não existe durante a criação. Anexar pelo card elimina
  área de staging, elimina arquivo órfão por diálogo abandonado, e faz registro
  novo e existente terem a mesma regra.

- **Exclusão de registro: anexo não vira um segundo bloqueio.** O bloqueio de
  `REGISTRO_COM_CUSTOS` continua valendo como está — ele existe por razão
  **financeira** (ADR-0401), que não se aplica a arquivo. Permitida a exclusão, as
  linhas saem por `onDelete: Cascade` e a pasta é removida **pós-commit**,
  best-effort. **Cancelar Instalação não remove anexos.**

- **Cleanup E2E passa a varrer disco além do banco**, na ordem de dependência do
  ADR-0403. `e2e/support/limpeza.ts` **não pode importar** `storagePaths` (vive
  fora de `src/`, por decisão daquele ADR), então re-deriva a raiz de uploads a
  partir do ambiente — **duplicação aceita e documentada**, com guarda
  obrigatória: o alvo é resolvido e provado **contido na raiz** antes de qualquer
  remoção, e a rotina aborta se a guarda falhar. Nunca remoção recursiva sobre
  caminho não validado.

- **Consequência:** a cronologia passa a carregar evidência (foto da visita, nota
  fiscal do material) sem que nada dependa de caminho fixo no código, e sem
  afrouxar nenhuma garantia existente do agregado.
