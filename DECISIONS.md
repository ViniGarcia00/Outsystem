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

### ADR-0205 — Tipo da proposta (Comercial/Simplificada): apenas persistência

- **Decisão:** o tipo/modelo é apenas **armazenado** (`modelo`) nesta Sprint —
  nenhuma diferença de layout, produtos, serviços ou cálculo. A arquitetura já
  carrega a informação para as próximas Sprints usarem.
- **Consequência:** evolução futura sem migração de dados; sem lógica específica
  prematura.
