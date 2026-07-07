# PROJECT_HISTORY.md — Histórico do Projeto

Registro cronológico das Sprints. **Atualizado obrigatoriamente ao final de cada
Sprint** (ver `docs/CHECKLIST_RELEASE.md`). Cada entrada traz objetivo, entregas,
ADRs, problemas, soluções, lições e o hash do commit.

---

## Sprint 0 — Fundação, Arquitetura e Planejamento

- **Versão:** 0.1.0
- **Data:** 2026-07-06
- **Objetivo:** estabelecer arquitetura, layout base e modelagem estrutural, sem
  regras de negócio.
- **Principais entregas:** Next.js 16 + Tailwind v4 + shadcn/ui; Clean
  Architecture + Feature-First; Prisma 7 (driver adapter) com 8 models
  estruturais + migration inicial; infraestrutura (env tipado, storage, logging);
  layout (sidebar, header, breadcrumb, tema); formatadores + testes; docs base.
- **ADRs criadas:** ADR-0001 (Clean Architecture + Feature-First), ADR-0002
  (Prisma 7 driver adapter), ADR-0003 (ConfiguracaoSistema singleton).
- **Problemas encontrados:** sem PostgreSQL no ambiente à época.
- **Como foram resolvidos:** migrations geradas offline (`prisma migrate diff`).
- **Lições aprendidas:** manter models estruturais e expandir por migration
  incremental reduz risco.
- **Hash do commit:** `9c6257c` (+ ajustes `070a04f`, `9ae3b8b`, `62b0e82`).

---

## Sprint 1 — Cadastros Base

- **Versão:** 0.2.0
- **Data:** 2026-07-06
- **Objetivo:** CRUD oficial dos cadastros (Configuração, Clientes, Produtos,
  Vendedores) sobre PostgreSQL real.
- **Principais entregas:** camada de dados via Server Actions → services →
  Prisma (`ActionResult`); listagens client-side (busca instantânea, ordenação,
  paginação 20/pág, filtro de inativos); formulários RHF + Zod com atalhos e
  guarda de dados não salvos; regras de exclusão/inativação; validações
  (CPF/CNPJ, e-mail, monetário); `/api/health`; seed reescrito; CRUD validado no
  banco real (14/14).
- **ADRs criadas:** ADR-0101 (PostgreSQL nativo no dev), ADR-0102 (Server
  Actions), ADR-0103 (listagens client-side), ADR-0104 (Produto sem relação com
  Proposta na Sprint 1), ADR-0105 (logo texto/URL), ADR-0106 (padrão único de
  tela).
- **Problemas encontrados:** porta 5432 ocupada por outro PostgreSQL; senha do
  superusuário desconhecida; seed antigo quebrado.
- **Como foram resolvidos:** usuário dedicado `outmat` + bootstrap
  (`scripts/db/bootstrap.sql`); seed reescrito para o schema real.
- **Lições aprendidas:** usar sempre usuário dedicado; validar o CRUD no banco
  real com script (`db:validate`).
- **Hash do commit:** `ef90915` (Sprint 1 não havia sido commitada isoladamente;
  foi oficializada junto com a Sprint 1.5).

---

## Sprint 1.5 — Polimento, UX e Preparação

- **Versão:** 0.3.0
- **Data:** 2026-07-07
- **Objetivo:** endurecer a fundação (qualidade, UX, acessibilidade, performance,
  testes, impressão) antes do módulo de Propostas. Sem regras de negócio novas,
  sem alteração de banco.
- **Principais entregas:** limpeza de código morto e componentes superados;
  `FormSection` (formulários padronizados); `TableSkeleton`; acessibilidade
  (aria-labels, foco visível); `React.memo` em leafs; `print.css` (base do
  Preview HTML futuro); Smoke Tests com Playwright (5/5); página dev-only
  `/dev/diagnostics`; README com trilhas Desenvolvimento/Publicação;
  `CHECKLIST_RELEASE.md` e `PROJECT_HISTORY.md`.
- **ADRs criadas:** ADR-0150 (testes/Playwright), ADR-0151 (impressão), ADR-0152
  (UX/acessibilidade), ADR-0153 (performance), ADR-0154 (responsividade),
  ADR-0155 (limpeza), ADR-0156 (`/dev/diagnostics`), ADR-0157 (post-mortem da
  conexão), ADR-0158 (processo de release).
- **Problemas encontrados:** lentidão/travamento das rotas de banco no dev
  (6→10→12s e depois travando); serviço Windows aparecendo `Stopped` com um
  `postgres.exe` órfão travado.
- **Como foram resolvidos:** **causa raiz** = instância do PostgreSQL travada
  (postmaster aceitando TCP mas sem responder ao handshake), agravada por
  reinícios em série do dev server durante o diagnóstico. **Restart limpo do
  PostgreSQL** resolveu (conexão ~168ms, consulta ~3ms). Nenhuma mudança de
  código/arquitetura (ADR-0157).
- **Lições aprendidas:** não reiniciar o dev server à força em série; usar
  `/dev/diagnostics` para achar problemas de infraestrutura em segundos; validar
  a saúde do banco (processo + porta + handshake real), não só o status do
  serviço no SCM.
- **Hash do commit:** `ef90915`

---

## Sprint 1.5.1 — Ajustes finais

- **Versão:** 0.3.1
- **Data:** 2026-07-07
- **Objetivo:** aplicar ajustes da validação manual, sem novas funcionalidades.
- **Principais entregas:**
  - Configuração: removidos da UI Cor Primária, Cor Secundária e Textos
    Institucionais (estrutura mantida internamente).
  - Padrão oficial de badges (ADR-0159): Ativo = verde, Inativo = vermelho
    (Clientes, Produtos, Vendedores).
  - Clientes (listagem): exibição por `tipoPessoa` (PJ → Empresa, PF → Nome);
    service não grava campo irrelevante.
  - Produtos: código sempre em MAIÚSCULO (unicidade case-insensitive); helper
    "pode ser zero" movido para o rótulo (alinhamento corrigido).
- **ADRs criadas:** ADR-0159 (padrão de badges).
- **Problemas encontrados:** PJ exibia só a primeira letra do nome; código
  aceitava variações de caixa como distintos; helper desalinhava o formulário.
- **Como foram resolvidos:** `displayName` por `tipoPessoa` + normalização no
  service; `codigo.toUpperCase()` no form e no service; helper movido para o
  rótulo.
- **Lições aprendidas:** ao alternar campos condicionais em formulários, evitar
  persistir o campo não usado; normalizar chaves únicas antes de validar.
- **Hash do commit:** `275c9b9`

---

## Sprint 2.1 — Fundação do Módulo de Propostas

- **Versão:** 0.4.0
- **Data:** 2026-07-07
- **Objetivo:** criar a estrutura da proposta comercial (CRUD, numeração,
  revisões, cancelamento, duplicação, status, datas, auditoria) — sem produtos,
  serviços, PDF, preview ou cálculos.
- **Principais entregas:** modelagem aditiva (enums, campos na Proposta,
  `PropostaAuditoria`); numeração via sequência do Postgres (1001+); service
  transacional com auditoria e transições de status; listagem com filtro por
  status; formulário com modo somente leitura; duplicação e cancelamento; seed de
  exemplo; smoke test de propostas.
- **ADRs criadas:** ADR-0201 (numeração), ADR-0202 (revisões/cabeçalho),
  ADR-0203 (cancelamento + duplicação), ADR-0204 (ciclo de vida/datas/auditoria),
  ADR-0205 (tipo da proposta).
- **Problemas encontrados:** flags do `prisma migrate diff` mudaram no Prisma 7
  (`--from-url` removido); a sequência de autoincrement nasce em 1.
- **Como foram resolvidos:** usar `--from-config-datasource`; migration aditiva
  com `ALTER SEQUENCE ... RESTART WITH 1001`.
- **Lições aprendidas:** manter o cabeçalho na Proposta (não versionar) evita
  remodelagem; registrar transições e imutabilidade de datas explicitamente no
  service evita estados inconsistentes.
- **Hash do commit:** `78c3681`

---

## Sprint 2.2 — Seções + Produtos na Revisão (workspace)

- **Versão:** 0.5.0
- **Data:** 2026-07-07
- **Objetivo:** montar o conteúdo comercial (seções + produtos) dentro da revisão
  atual; transformar a proposta em workspace. Sem serviços/totais/PDF.
- **Principais entregas:** workspace `/propostas/[id]` + cabeçalho em `/editar`;
  seções e produtos (snapshot + `produtoId` + quantidade fracionária) com
  reordenação; cópia profunda em nova revisão e duplicação; produto `unidade` +
  exclusão bloqueada (ADR-0104 ativa); `tipo` de item preparado; auditoria
  granular; seed com conteúdo; smoke test do workspace.
- **ADRs criadas:** ADR-0207 (item snapshot/vínculo/tipo + exclusão), ADR-0208
  (cópia profunda + ordenação). ADR-0104 marcada como ativa.
- **Problemas encontrados:** arquivo `"use server"` exige exports como `async
  function` (arrows const falharam no build).
- **Como foram resolvidos:** converter as actions de conteúdo para `async
  function`.
- **Lições aprendidas:** em `"use server"`, exportar sempre `async function`;
  usar `router.refresh()` + página `force-dynamic` mantém o servidor como fonte
  da verdade do conteúdo, minimizando estado no cliente.
- **Hash do commit:** `3aea3ac`

---

## Ajustes pré-Sprint 2.3 — UX de Propostas + correção de perda de dados

- **Versão:** 0.5.1
- **Data:** 2026-07-07
- **Objetivo:** aplicar ajustes de UX solicitados e **investigar/corrigir a perda
  dos cadastros manuais** relatada antes de iniciar a Sprint 2.3.
- **Investigação (perda de dados):** causa raiz = **seed destrutivo**. O
  `prisma/seed.ts` executava `deleteMany()` em proposta/produto/vendedor/cliente
  e recriava só os exemplos; cada `npm run db:seed` (rodado nas Sprints 2.1 e
  2.2) apagou os cadastros manuais da Sprint 1.5. Verificado: `DATABASE_URL`
  sempre a mesma (`outmat@localhost:5432/outmat_propostas`, nativo); **nenhum**
  `migrate reset`; banco atual contém exatamente a baseline do seed + artefatos
  de teste. Config (singleton) preservada pelo `upsert(update:{})`.
- **Principais entregas:**
  - Seed **não-destrutivo e idempotente** (ADR-0209): nunca apaga; só popula
    banco vazio; Configuração garantida sem sobrescrever.
  - Listagem de Propostas sem as colunas Validade e Modelo (ADR-0210).
  - Formulário: Modelo da proposta como primeiro campo em linha inteira
    (ADR-0210).
  - Cliente por **autocomplete** (Nome/Razão Social/CPF/CNPJ, 3+ chars) —
    `ClienteAutocompleteField` + `searchClientes`/`searchClientesAction`
    (ADR-0210).
- **ADRs criadas:** ADR-0209 (seed não-destrutivo), ADR-0210 (UX de Propostas).
- **Riscos sinalizados:** o `docker-compose.yml` sobe um PostgreSQL alternativo
  com usuário `postgres/postgres` (≠ `outmat` da app) e volume próprio; se usado,
  a app não conecta ou vê um banco vazio — recomendado alinhar credenciais/DB
  antes de adotá-lo. Não é o banco ativo (dev usa o nativo).
- **Gate:** lint 0, typecheck 0, build 0, smoke 6/6, `/api/health` 200 (db up),
  `/dev/diagnostics` 200.
- **Hash do commit:** `f841a6e`

---

## Refino do fluxo de Propostas — workspace-first + revisão automática

- **Versão:** 0.6.0
- **Data:** 2026-07-07
- **Objetivo:** simplificar o fluxo do usuário antes de adicionar Serviços:
  workspace único, auto-save, emissão e revisão automática.
- **Principais entregas:**
  - **Workspace único** (`/propostas/[id]`) para criar/editar/revisar; rotas
    `/nova` e `/editar` removidas. "Nova proposta" cria a proposta já numerada e
    abre o workspace.
  - **Auto-save** do cabeçalho (por campo) e do conteúdo (por operação); sem botão
    "Salvar"; indicador "Última alteração salva às HH:mm".
  - **"Gerar PDF"** (`emitirProposta`): emite + congela a revisão (`emittedAt`);
    guarda cliente + ≥1 item; auditoria `EMISSAO`.
  - **Revisão automática** na 1ª edição pós-emissão via `ensureEditableRevision`
    (+ `idMap` para reapontar seções/itens existentes); sem botão "Nova Revisão".
  - **Status** reduzido a RASCUNHO/EMITIDA/CANCELADA; `clienteId` opcional
    (estado temporário; aviso de proposta incompleta + foco no Cliente).
- **ADRs criadas:** ADR-0211 (fluxo workspace-first, revisão automática, emissão,
  status simplificado, cliente temporário).
- **Problemas encontrados:** cache stale de tipos do Next (`.next/types`)
  referenciando as rotas removidas; seletor de heading ambíguo (Rev.1 no h1 e h2)
  no smoke.
- **Como foram resolvidos:** limpar `.next` antes do typecheck; especificar o h2
  "Conteúdo — Rev.1" no smoke.
- **Lições aprendidas:** centralizar a regra de fork num único
  `ensureEditableRevision` mantém as 8 operações de conteúdo simples e o `idMap`
  resolve o reapontamento de ids após a cópia; validar o trecho sutil com script
  dedicado além do smoke.
- **Gate:** lint 0, typecheck 0, build 0, smoke 6/6, `/api/health` 200 (db up),
  `/dev/diagnostics` 200. Ciclo emitir→fork→idMap verificado por script.
- **Hash do commit:** `a10fad0`

---

## Homologação 0.6.1 — criação diferida + ajustes de UX

- **Versão:** 0.6.1
- **Data:** 2026-07-07
- **Objetivo:** aplicar os ajustes da 1ª etapa de homologação da 0.6.0, antes da
  Sprint 2.3.
- **Principais entregas:**
  - **Home = `/propostas`** (raiz + sidebar; item/rota Dashboard removidos).
  - **Criação diferida (ADR-0212):** "Nova proposta" abre um workspace de
    **montagem em memória** (`/propostas/nova`, client-side); só "Criar Proposta"
    persiste tudo numa transação (`criarPropostaCompleta`). Abrir e abandonar não
    cria nada nem consome número (verificado: contagem estável ao abrir `/nova`).
  - **Editor de conteúdo reutilizável** via `ConteudoActions` (servidor vs
    memória) — mesmo `ConteudoEditor`/`SecaoCard` nos dois fluxos.
  - **Autocomplete** exibe o documento (CPF/CNPJ); **Modelo** em meia largura;
    **revisão única** (removido "Conteúdo — Rev.N").
- **ADRs criadas:** ADR-0212 (homologação: criação diferida, home, revisão única,
  autocomplete, modelo). Revisa a numeração eager da ADR-0211.
- **Problemas encontrados:** merge do patch do cabeçalho (nullable) vs
  `CabecalhoValores` (obs string) no fluxo em memória.
- **Como foram resolvidos:** normalização `null → ""` no `onCampo` da montagem.
- **Lições aprendidas:** abstrair as operações de conteúdo atrás de uma interface
  permitiu criar o fluxo em memória sem duplicar UI nem tocar a lógica do
  servidor.
- **Gate:** lint 0, typecheck 0, build 0, smoke 6/6, `/api/health` 200 (db up),
  criação diferida verificada (abrir `/nova` não cria proposta).
- **Hash do commit:** `0804188`

---

## Homologação 0.6.3 — Simplificada, autocomplete de produto, valor editável

- **Versão:** 0.6.3
- **Data:** 2026-07-07
- **Objetivo:** ajustes da 2ª etapa de homologação (fluxo de produtos) antes da
  Sprint 2.3.
- **Principais entregas:**
  - **Dashboard** reposto no menu (placeholder); home segue em Propostas.
  - **Cliente obrigatório** para criar (botão desabilitado + mensagem + schema).
  - **Simplificada** = produtos direto na proposta (seção única implícita, sem
    migração); Comercial mantém seções.
  - **Autocomplete de produto** via `Autocomplete` genérico (reutilizado por
    Cliente); busca código/descrição.
  - **Valor unitário editável** (diálogo + grade) gravando no snapshot do item,
    sem tocar o cadastro (`atualizarValorUnitario`, `valorUnitario` em
    `adicionarItem`/`criarPropostaCompleta`).
  - **Grade** Código · Descrição · Qtd · UN · Valor Unitário · **Total** (visual),
    extraída em `ItensTable` (reutilizada por Comercial e Simplificada).
- **ADRs criadas:** ADR-0213.
- **Problemas encontrados:** regra de lint `set-state-in-effect` no reset do
  diálogo de item.
- **Como foram resolvidos:** mover o form para um filho que remonta ao abrir o
  diálogo (Radix desmonta o conteúdo ao fechar) — sem efeito de reset.
- **Lições aprendidas:** a interface `ConteudoActions` (servidor vs memória) já
  absorveu as novas operações (avulso, valor unitário) sem duplicar UI.
- **Gate:** lint 0, typecheck 0, build 0, smoke **7/7**, `/api/health` 200 (db
  up). Verificado por script: snapshot com valor editado (cadastro intacto),
  `atualizarValorUnitario`, `adicionarItemAvulso` cria "Produtos", Total por linha.
- **Hash do commit:** `3877a04`

---

## Homologação 0.6.4 — "Salvar Alterações" (fim do auto-save)

- **Versão:** 0.6.4
- **Data:** 2026-07-07
- **Objetivo:** trocar o auto-save de propostas existentes por edição em memória
  + "Salvar Alterações", antes da Sprint 2.3.
- **Principais entregas:**
  - Proposta existente edita **em memória**; persiste tudo em **"Salvar
    Alterações"** (transação única). Nova Proposta inalterada.
  - **Revisão automática só no salvamento** (`salvarProposta`): EMITIDA + Salvar
    → Rev.N+1 + RASCUNHO; substitui o conteúdo da revisão; auditoria consolidada.
  - **Aviso ao sair** via `FormDirtyGuard` reutilizado; "Gerar PDF" desabilitado
    com alterações pendentes.
  - Unificação dos dois workspaces no hook `useConteudoMemoria`; remoção do
    auto-save (código morto): `ensureEditableRevision`, `updateCabecalho`, as
    Server Actions de conteúdo e `serverConteudoActions`.
- **ADRs criadas:** ADR-0214.
- **Problemas encontrados:** reinicializar o estado em memória após salvar.
- **Como foram resolvidos:** `key` por `updatedAt` na página `/[id]` remonta o
  workspace com o DTO fresco após "Salvar Alterações".
- **Lições aprendidas:** ao mover a persistência para um único save, o `idMap` do
  fork por-operação deixa de ser necessário — o payload já é o estado final.
- **Gate:** lint 0, typecheck 0, build 0, smoke **7/7**, `/api/health` 200 (db
  up). Verificado por script: replace no RASCUNHO, fork no save (Rev.1 +
  RASCUNHO, Rev.0 congelada), auditoria consolidada.
- **Hash do commit:** `856e0af`

---

## Sprint 2.3 — Serviços (Projeto de Automação) + Total da linha

- **Versão:** 0.7.0
- **Data:** 2026-07-07
- **Objetivo:** suportar o valor de serviço e os cálculos por linha no item da
  proposta, evoluindo o modelo atual de Produtos.
- **Correção de rumo:** serviço **não** é entidade separada — o valor de serviço
  faz parte do cadastro do **Produto**. O esboço inicial de "cadastro de Serviços"
  foi revertido e o banco de dev **resetado** (autorização explícita) ao estado
  das 4 migrations legítimas. **Sem migração** (o modelo já tinha os dois valores).
- **Principais entregas:**
  - Item expõe **Valor Produto** + **Valor Serviço**, ambos do cadastro e
    **editáveis na proposta** (snapshot; cadastro intacto).
  - **Totais por linha** (visuais): Total Produto, Total Serviço, Total da Linha.
  - Grade com as novas colunas; diálogo com os dois campos de valor.
  - Enquadramento "Projeto de Automação" + forward-compat para Som/Wi-Fi
    (documental; nada modelado).
- **ADRs criadas:** ADR-0215 (serviço = valor do Produto), ADR-0217 (Projeto de
  Automação / forward-compat).
- **Problemas encontrados:** migration/entidade de Serviço aplicada por engano no
  banco de dev antes da correção.
- **Como foram resolvidos:** reversão dos arquivos + `prisma migrate reset` no
  banco de dev (com consentimento explícito exigido pelo guard do Prisma) +
  reseed.
- **Lições aprendidas:** confirmar a regra de negócio (serviço no Produto vs
  entidade separada) antes de modelar; o guard de reset do Prisma 7 exige
  consentimento textual explícito do usuário.
- **Gate:** lint 0, typecheck 0, build 0, smoke **7/7**, `/api/health` 200 (db
  up). Verificado por script: snapshot dos dois valores editados (cadastro
  intacto) e os 3 totais por linha.
- **Hash do commit:** `82324ec`

---

## Sprint 2.4 (parte 1) — Ajustes funcionais

- **Versão:** 0.7.1
- **Data:** 2026-07-07
- **Objetivo:** ajustes funcionais do módulo de Propostas antes dos Totais da
  proposta (que completam a Sprint 2.4).
- **Principais entregas:**
  - Cabeçalho: campo **"Validade da proposta"** (em dias; futuro PDF).
  - **Máscara monetária (R$ 0,00)** nos valores do item, reutilizando o
    `CurrencyInput` (armazenamento numérico; máscara só de exibição).
  - **Simplificada = apresentação:** grade oculta Valor Serviço / Total Produto /
    Total Serviço; Total = Qtd × Valor Produto. Dados de serviço preservados
    (nada excluído; modelo/snapshot intactos) — Completa reexibe tudo (verificado
    por script).
- **ADRs criadas:** ADR-0218.
- **Gate:** lint 0, typecheck 0, build 0, smoke 7/7, `/api/health` 200.
- **Hash do commit:** `2e0567e`
- **Observação:** os **Totais da proposta** completam a Sprint 2.4 na parte 2.

---

## Sprint 2.4 (parte 2) — Totais da Proposta

- **Versão:** 0.8.0
- **Data:** 2026-07-07
- **Objetivo:** rodapé financeiro da proposta (Total Produtos, Total Serviços,
  Subtotal) derivado dos itens em tempo real.
- **Principais entregas:**
  - Utilitário **`totais.ts`** (fonte única: `totalProdutoLinha`,
    `totalServicoLinha`, `totalLinha`, `calcularTotais`), reutilizado pela grade
    e pelo rodapé.
  - Componente **`RodapeTotais`** abaixo da grade (valores à direita, máscara
    BRL); recalcula a cada mutação (React re-render; sem botão).
  - **Simplificada:** oculta Total Serviços; Subtotal = Total Produtos (serviços
    preservados internamente).
  - **Nada persistido** — totais são derivados; sem tabela/entidade/migração/
    snapshot.
- **ADRs criadas:** ADR-0219.
- **Gate:** lint 0, typecheck 0, build 0, smoke **7/7** (com asserts do rodapé),
  `/api/health` 200 (db up). Helper verificado por script.
- **Hash do commit:** `235ac97`
- **Sprint 2.4 concluída** (parte 1 `2e0567e` + parte 2). Próxima: **2.5
  Descontos**.

---

## Sprint 2.5 — Desconto da Proposta

- **Versão:** 0.9.0
- **Data:** 2026-07-07
- **Objetivo:** desconto da proposta com um único campo inteligente e cálculo do
  Total da Proposta em tempo real.
- **Principais entregas:**
  - **`DescontoInput`** (campo único): `500` → VALOR; `10%`/`7,5%` → PERCENTUAL;
    formata no blur (R$/%); placeholder + ajuda. Sem seletor/botão.
  - **Persistência separada:** `Proposta.tipoDesconto` (enum) + `valorDesconto`
    (Decimal). Migration aditiva `20260707040000_desconto` (defaults VALOR/0).
  - **Cálculo (helper `totais.ts`):** `aplicarDesconto` + `calcularTotais` com
    `descontoAplicado`/`totalProposta`. Clamps: valor ≤ Subtotal; percentual
    0–100%. Fluxo Subtotal → Desconto → Total da Proposta (≥ 0).
  - **Rodapé:** Subtotal · Desconto · Total da Proposta; Simplificada mantém
    Total Serviços oculto (desconto sobre o Subtotal de produtos).
- **ADRs criadas:** ADR-0220.
- **Decisão de modelagem:** desconto na **Proposta** (nível-proposta, como
  modelo/validade); congelamento por-revisão fica para o PDF (2.7).
- **Gate:** lint 0, typecheck 0, build 0, smoke **7/7** (com desconto e Total da
  Proposta), `/api/health` 200 (db up). Verificado por script (clamps + round-trip
  da persistência).
- **Hash do commit:** `9f91836`
- **Próxima:** **2.6 Frete**.

---

## Sprint 2.6 — Frete da Proposta

- **Versão:** 0.10.0
- **Data:** 2026-07-07
- **Objetivo:** adicionar o frete ao rodapé financeiro, compondo o Total da
  Proposta.
- **Principais entregas:**
  - Campo **Frete** no rodapé (máscara BRL, `CurrencyInput`, inicial R$ 0,00),
    entre Desconto e Total da Proposta; Completa e Simplificada.
  - **Total da Proposta = Subtotal − Desconto + Frete** (≥ 0), em tempo real.
  - **Persistência:** `Proposta.frete` (Decimal, default 0). Migration aditiva
    `20260707050000_frete`. Demais totais seguem derivados.
  - Helper `totais.ts` estendido (`calcularTotais` recebe `frete`) — sem
    duplicação de lógica.
- **ADRs criadas:** ADR-0221.
- **Gate:** lint 0, typecheck 0, build 0, smoke **7/7** (frete padrão + alteração,
  Completa e Simplificada), `/api/health` 200 (db up). Verificado por script
  (soma/clamps + round-trip da persistência).
- **Hash do commit:** `PENDENTE`
- **Próxima:** **2.7 PDF**.

---

> Próximas Sprints: adicionar uma nova seção ao final, seguindo este mesmo
> formato, ao concluir cada Sprint.
