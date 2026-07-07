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
