# PROJECT_HISTORY.md — Histórico do Projeto

Registro cronológico das Sprints. **Atualizado obrigatoriamente ao final de cada
Sprint** (ver `docs/CHECKLIST_RELEASE.md`). Cada entrada traz objetivo, entregas,
ADRs, problemas, soluções, lições e o hash do commit.

> **Nota de reconciliação (2026-08-18).** Os ciclos entre a Sprint 2.8 e a
> Documentação Contratual foram registrados **retroativamente**, a partir dos
> commits, dos ADRs e do código entregue — o arquivo havia parado em 2026-07-07.
> Duas particularidades **preservadas como fato histórico**, não corrigidas:
>
> 1. **A numeração das Sprints não é cronológica.** As Sprints 3.0, 3.1 (a) e
>    3.2.1 ocorreram **antes** das 2.9.x e 2.10.x. A ordem deste arquivo é
>    **cronológica** (a data manda), não numérica.
> 2. **O rótulo "Sprint 3.1" foi usado duas vezes.** Aqui aparecem como
>    **3.1 (a) — PDF Apresentação** (ADR-0301) e **3.1 (b) — Documentação
>    Contratual** (ADR-0330). Os **ADRs**, não o rótulo, são a referência
>    estável. Nenhum ADR foi renumerado.
>
> Onde a evidência não existe no repositório, a entrada diz explicitamente
> "**não registrado**" em vez de estimar.

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
- **Hash do commit:** `3fdc49e`
- **Próxima:** **2.7 PDF**.

---

## Sprint 2.6.5 — Finalização da Proposta

- **Versão:** 0.11.0
- **Data:** 2026-07-07
- **Objetivo:** finalizar o conteúdo comercial da proposta (antes do PDF) com as
  informações comerciais finais no cabeçalho.
- **Principais entregas:**
  - Componente **`FinalizacaoProposta`** abaixo da área de conteúdo, com dois
    grupos: **Informações Comerciais** (Forma de pagamento; Previsão de
    instalação) e **Observações** (Comerciais; Técnicas). Texto livre.
  - **Previsão de instalação** exibida apenas no modelo **Completa** (oculta na
    Simplificada; informação continua armazenada — regra só de apresentação).
  - **Persistência aditiva:** `formaPagamento`, `previsaoInstalacao`,
    `obsComerciais`, `obsTecnicas` na Proposta (migration
    `20260707060000_finalizacao`, `TEXT`). Sem novas tabelas/entidades; não
    interferem em cálculo/total/desconto/frete.
- **ADRs criadas:** ADR-0222.
- **Gate:** lint 0, typecheck 0, build 0, smoke **7/7** (preenchimento +
  persistência dos 4 campos na Completa; Previsão oculta na Simplificada),
  `/api/health` 200 (db up).
- **Hash do commit:** `94fa946`
- **Próxima:** **2.7 PDF**.

---

## Sprint 2.7 — Documento comercial (PDF)

- **Versão:** 0.12.0
- **Data:** 2026-07-07
- **Objetivo:** transformar a proposta no **documento comercial oficial** da
  Outmat (premium), pronto para envio ao cliente.
- **Principais entregas:**
  - **`GET /propostas/[id]/pdf`** (`@react-pdf/renderer`; sob demanda, sem
    armazenar; renderiza a `currentRevision`). Botões "Gerar PDF" (abre após
    emitir) e "Abrir PDF" (EMITIDA).
  - **Layout A4 multipágina premium:** cabeçalho limpo; bloco do cliente
    elegante; tabela com Descrição dominante/Código discreto; TOTAL em destaque;
    Informações Comerciais e Observações separadas; assinaturas; rodapé com
    institucionais + "Página X de Y". Simplificada oculta serviço/total
    serviços/previsão.
  - **Paginação:** cabeçalhos (documento e tabela) repetidos; `wrap`/
    `minPresenceAhead` para não quebrar blocos/seções. Validado de 1 a 7+
    páginas.
  - **Arquitetura:** `proposta-pdf.mapper.ts` (DTO puro, testado) + IO em
    `proposta-pdf.service.ts`; blocos próprios em `features/propostas/pdf`;
    `totais.ts` reutilizado (sem duplicação). Fonte Inter em `public/fonts`.
    Endereço da obra = endereço do cliente (sem migração).
- **ADRs criadas:** ADR-0223.
- **Gate:** lint 0, typecheck 0, build 0, **unit 17/17** (inclui o mapper do
  PDF), smoke **7/7** (endpoint PDF 200 `application/pdf` + botão "Abrir PDF"),
  `/api/health` 200 (db up). Renderização validada em propostas pequenas e
  grandes (contagem de páginas).
- **Hash do commit:** `b4e3c04`
- **Próxima:** **2.8 homologação geral**.

---

## Sprint 2.7.5 — Ajustes pós-PDF

- **Versão:** 0.12.1
- **Data:** 2026-07-07
- **Objetivo:** aplicar ajustes de UX/layout/apresentação identificados na
  validação do PDF, sem novas funcionalidades de negócio.
- **Principais entregas:**
  - **Configurações:** máscara de Telefone/WhatsApp; **logo por upload** (PNG/JPG,
    ≤ 2 MB; `logo.service.ts` + `uploadLogoAction` + rota `GET /configuracoes/logo`),
    sem links externos, usado no PDF.
  - **Clientes:** **UF** em lista; **RG (PF)/IE (PJ)** opcional (migration aditiva
    `20260707070000_cliente_rg_ie`).
  - **Proposta:** autocomplete de produto só com código+descrição; **quantidade
    recalcula totais em tempo real**; larguras reduzidas + descrição em 2 linhas
    (sem rolagem horizontal); desconto em uma linha; padrões PIX / 3 dias.
  - **PDF:** espaço antes das assinaturas; alinhamento do TOTAL; "Validade da
    proposta"; logo automático.
- **ADRs criadas:** ADR-0224.
- **Gate:** lint 0, typecheck 0, build 0, **unit 17/17**, smoke **7/7**
  (upload de logo, UF/RG, PDF), `/api/health` 200 (db up). Renderização do PDF
  revalidada (1 a 5+ páginas).
- **Nota de ambiente:** um dev server **órfão** na 3000 fazia o Playwright reusar
  o Prisma client antigo (falha no cliente com RG/IE) — resolvido matando o
  processo. A tabela de produtos do dev estava vazia (seed é global-idempotente,
  ADR-0209) e foi repovoada pontualmente para o smoke.
- **Hash do commit:** `d0cd2fe`
- **Próxima:** **2.8 homologação geral**.

---

## Sprint 2.7.6 — Ajustes pós-PDF (2ª rodada)

- **Versão:** 0.12.2
- **Data:** 2026-07-07
- **Objetivo:** segunda rodada de ajustes de UX/layout/apresentação da
  homologação, sem novas funcionalidades de negócio.
- **Principais entregas:**
  - **Config:** Inscrição Estadual (migration aditiva `20260707080000_config_ie`;
    layout CNPJ|IE); UF em lista.
  - **Clientes:** CPF/CNPJ com rótulo/placeholder por tipo de pessoa.
  - **Propostas:** legenda de status; coluna **Valor** (Total via
    `calcularTotais` na listagem); badge ao lado da ação; **Cancelada vermelho**;
    **motivo do cancelamento** abaixo do número; **não-duplicidade de produto**
    por seção.
  - **Frete** alinhado ao **Desconto**; **placeholders** mais apagados no dark
    (global).
  - **PDF:** **logo corrigido** (cabeçalho estático + data URI — o @react-pdf
    não embute imagem dentro de `render`); bloco **Observações da proposta**;
    faixa de seção em cinza médio; menos espaço cabeçalho→cliente.
- **ADRs criadas:** ADR-0225.
- **Gate:** lint 0, typecheck 0, build 0, **unit 17/17**, smoke **7/7** (IE/UF,
  coluna Valor + legenda, não-duplicidade de produto), `/api/health` 200 (db up).
  Logo do PDF validado (embute ~200 KB).
- **Hash do commit:** `61d7d26`
- **Próxima:** **2.8 homologação geral**.

---

## Sprint 2.7.7 — Refinamentos de UX e PDF

- **Versão:** 0.12.3
- **Data:** 2026-07-07
- **Objetivo:** rodada de refinamentos de UX/PDF com escopo estrito (somente os
  itens listados).
- **Principais entregas:**
  - **Desconto/Frete:** interpretação em tempo real + "-" quando vazio; novo
    `FreteInput` (input vazio no zero) no mesmo padrão do `DescontoInput`.
  - **Botões do workspace** (proposta e nova) na **parte inferior**; `PageHeader`
    ganhou `titleSuffix` (badge de status ao lado da revisão).
  - Badge **Rascunho** levemente mais escuro (`STATUS_BADGE_CLASS`, escopo).
  - Listagem: coluna **Status** em Vendedor · Status · Última alteração; **Valor**
    após Cliente; **legenda** responsiva.
  - **PDF:** linhas Desconto/Frete condicionais (> 0); coluna **Código** escura.
- **ADRs criadas:** ADR-0226.
- **Gate:** lint 0, typecheck 0, build 0, **unit 17/17**, smoke **7/7** (frete
  vazio, coluna Valor/legenda, não-duplicidade), `/api/health` 200 (db up). PDF
  revalidado (frete oculto no zero, render OK).
- **Hash do commit:** `3854816`
- **Próxima:** **2.8 homologação geral**.

---

## Sprint 2.7.8 — Refinamentos de UX e PDF

- **Versão:** 0.12.4
- **Data:** 2026-07-07
- **Objetivo:** rodada de refinamentos de UX/PDF com escopo estrito.
- **Principais entregas:**
  - **Nome do Projeto** na Proposta (migration aditiva
    `20260707090000_nome_projeto`); no cabeçalho, mesma linha do Cliente;
    Vendedor e Validade em linhas próprias.
  - **Desconto percentual** exibe também o valor monetário (Subtotal ×
    Percentual) via `DescontoInput` recebendo o subtotal (reuso de `totais`).
  - **Legenda de status** em bloco contido, responsiva (cores/badges inalterados).
  - **PDF:** Código em negrito, Descrição em peso normal.
- **ADRs criadas:** ADR-0227.
- **Gate:** lint 0, typecheck 0, build 0, **unit 17/17**, smoke **7/7** (Nome do
  Projeto persistência, não-duplicidade, coluna Valor/legenda), `/api/health`
  200 (db up). PDF revalidado (render OK).
- **Hash do commit:** `b53b3c3`
- **Próxima:** **2.8 homologação geral**.

---

## Sprint 2.8 — Homologação final e encerramento do módulo de Propostas

- **Versão:** 1.0.0 — **primeira versão homologada para produção**
- **Data:** 2026-07-08
- **Objetivo:** validar, estabilizar, documentar e **encerrar oficialmente** o
  módulo de Propostas. **Sem** novas funcionalidades/telas/campos/regras/
  migrations e sem alterações de arquitetura/UX/layout/PDF/banco.
- **Homologação funcional:** revisados todos os fluxos — Configurações, Clientes,
  Produtos, Vendedores, criação de proposta, Completa/Simplificada, seções,
  produtos, serviços, totais, desconto, frete, informações comerciais, revisões,
  emissão, cancelamento e PDF Comercial. Tudo funcionando como homologado.
- **Revisão técnica:** sem TODOs/`console`/`debugger`, sem `.only`, sem código
  morto/temporário/duplicações a remover; imports e `eslint-disable`
  justificados. **Nenhum bug encontrado → nenhuma correção necessária.**
- **Documentação:** CHANGELOG, PROJECT_HISTORY, DECISIONS (ADR-0228) e VERSION
  revisados; criado o **Backlog Futuro** (`BACKLOG.md`) com as oportunidades de
  melhoria (não implementadas).
- **Quality Gate:** ESLint 0, Typecheck 0, Build 0, **unit 17/17**, smoke **7/7**,
  `/api/health` 200 (db up, versão 1.0.0), `/dev/diagnostics` 200.
- **Versionamento:** `VERSION` e `package.json` → **1.0.0**.
- **ADRs criadas:** ADR-0228.
- **Hash do commit:** `58127b6`
- **Status do módulo:** ✔ Homologado · ✔ Estável · ✔ Pronto para produção.
- **Próximo:** novo módulo independente **"PDF Projeto"** (escopo/arquitetura
  próprios; fora deste módulo).

---

## Sprint 3.0 — Fundação do PDF Apresentação

- **Versão:** 1.0.0 (sem incremento à época, por decisão do próprio ciclo —
  consolidado em **1.1.0**)
- **Data:** 2026-07-07
- **Objetivo:** criar a **fundação estrutural** de um segundo formato de
  exportação da proposta — o PDF Apresentação, versão institucional para envio
  ao cliente. Mesma proposta cadastrada; só o layout muda.
- **Principais entregas:**
  - Novo gerador `src/features/propostas/pdf/presentation/` (10 páginas):
    `page-shell`, `pages`, `presentation-document`, `render`, `index`,
    reutilizando a fundação compartilhada (`theme`/`fonts`/`format`).
  - **Reuso total dos dados:** mesmo `getPropostaPdfData` → `PropostaPdfDTO` do
    PDF Comercial. Sem consultas nem regras paralelas.
  - Endpoint `GET /propostas/[id]/presentation` (runtime Node, `force-dynamic`,
    `application/pdf`), no padrão do `/pdf`.
  - Botão "Gerar PDF Apresentação" no workspace.
  - Páginas dinâmicas (1, 6, 8, 9) ligadas aos dados reais; fixas (2,3,4,5,7,10)
    com placeholders.
  - `PropostaPdfDTO` ganhou `nomeProjeto` (aditivo; PDF Comercial inalterado).
  - Smoke: endpoint `presentation` 200 `application/pdf` + botão.
- **ADRs criadas:** ADR-0300.
- **Problemas encontrados:** nenhum registrado.
- **Lições aprendidas:** separar fundação (3.0) de design visual (3.1) permitiu
  ligar os dados reais antes de existir arte definitiva.
- **Gate:** não registrado à época.
- **Hash do commit:** `2e00064`
- **Próxima:** 3.1 (a) — detalhamento visual.

---

## Sprint 3.1 (a) — Implementação do PDF Apresentação

> **Desambiguação:** este é o ciclo do **PDF Apresentação** (ADR-0301). O ciclo
> homônimo da **Documentação Contratual** é a Sprint 3.1 (b), ADR-0330.

- **Versão:** 1.0.0 (sem incremento à época — consolidado em **1.1.0**)
- **Data:** 2026-07-07 a 2026-07-08
- **Objetivo:** trocar as páginas desenhadas por **templates gráficos** oficiais
  como plano de fundo, sobrepondo apenas os campos variáveis.
- **Principais entregas:**
  - 10 templates PNG (1920×1080) em `public/templates/presentation/`, usados
    como **fundo de página inteira**; nenhuma página é redesenhada.
  - Página em **landscape 16:9** (`size=[960, 540]` pt); escala template→página
    de 0.5.
  - `templates.ts` (loader que embute os PNGs como **data URI**, sem cache),
    `page-shell.tsx` (Image de fundo full-page) e `coords.ts` (posições e cores
    dos campos variáveis, centralizadas).
  - Sobreposição por **posicionamento absoluto** só nas 4 páginas dinâmicas.
  - **Ajustes funcionais (rotulados "Sprint 3.1.1", `3bb0958`):** "Gerar PDF
    Apresentação" passa a emitir a proposta reutilizando `emitirPropostaAction`
    (sem duplicar código); legenda de status removida da listagem; Forma de
    Pagamento vira `Textarea` com valor padrão para propostas novas (registros
    existentes nunca sobrescritos).
  - **~14 commits de ajuste fino** de coordenadas, pesos, cores e centralização
    (páginas 1, 6, 8 e 9), mais `suppressHydrationWarning` no `<body>`
    (`41cc860`) e bullet `●` (U+25CF) na Forma de Pagamento (`27c443b`).
- **ADRs criadas:** ADR-0301.
- **Problemas encontrados:** os templates das 4 páginas dinâmicas ainda continham
  **conteúdo de exemplo embutido** nas áreas reservadas.
- **Como foram resolvidos:** pendência assumida no ADR-0301 — ao receber as
  versões em branco, só `coords.ts` precisaria de ajuste fino.
- **Lições aprendidas:** centralizar coordenadas num único arquivo permitiu ~14
  iterações visuais sem tocar na estrutura das páginas.
- **Gate:** não registrado à época.
- **Hash dos commits:** `ca59dff` (principal), `a2d3a46`, `cdae5fc`, `93c7b73`,
  `c8b7fc5`, `41cc860`, `877b68e`, `95a4d94`, `6e26123`, `94e3255`, `3bb0958`,
  `a94e01e`, `05963a6`, `555e290`, `2d15c64`, `27c443b`, `80bd106`, `74e9395`.

---

## Ajustes de infraestrutura — PDF Projeto e seed do Prisma

- **Versão:** 1.0.0 (sem incremento)
- **Data:** 2026-07-08
- **Objetivo:** fechar os ajustes do PDF e a configuração de seed.
- **Principais entregas:** `prisma.config.ts` ajustado; artes das páginas 6, 8 e
  9 substituídas por versões mais leves.
- **Problemas encontrados:** o commit `cea9404` incluiu por engano um arquivo
  avulso `ma.config.ts`.
- **Como foram resolvidos:** removido no commit seguinte (`1bcca4d`).
- **Observação:** ambos os commits estão **sem corpo de mensagem** — as entregas
  acima foram deduzidas dos arquivos alterados, não de descrição do autor.
- **Gate:** não registrado.
- **Hash dos commits:** `cea9404`, `1bcca4d`.

---

## Sprint 3.2.1 — Correção da build de produção (Windows Server)

- **Versão:** 1.0.0 (sem incremento — correção; consolidada em **1.1.0**)
- **Data:** 2026-07-08
- **Objetivo:** corrigir a falha de `npm run build` que ocorria **apenas** no
  Windows Server 2019.
- **Principais entregas:**
  - `export const dynamic = "force-dynamic"` no **layout raiz**
    (`src/app/layout.tsx`) — **uma linha**.
  - Todas as páginas passam a ser renderizadas sob demanda (`ƒ`), eliminando o
    caminho de prerender que dispara o bug.
- **Problemas encontrados:** `Invariant: Expected workStore to be initialized`
  (bug interno do Next.js, código **E1068**) na etapa de prerender de
  `/clientes/novo`, com o mesmo commit passando na máquina de dev.
- **Como foram resolvidos:** causa raiz identificada — o nº de workers vem de
  `experimental.cpus` = `max(1, núcleos − 1)`: **11** em dev (12 núcleos),
  **1** no servidor (1–2 vCPU). Só o caminho de worker único dispara o bug.
  Análise comparativa (por página × layout raiz) registrada no ADR-0321: a via
  por página deixaria a rota sintética `/_not-found` exposta.
- **Lições aprendidas:** diferença dev × servidor que "não faz sentido" merece
  investigação de ambiente (nº de núcleos) antes de qualquer workaround.
- **Ponto de reavaliação:** ao atualizar o Next.js, verificar se a *invariant*
  foi corrigida — validando a build em ambiente de 1 vCPU **antes** de reverter.
- **ADRs criadas:** ADR-0321.
- **Gate (registrado no commit):** typecheck 0, lint 0, **test 17/17**, build 0,
  `npm start` serve `/clientes/novo` (200).
- **Hash do commit:** `df0717e`

---

## Sprint 2.9.1 — Serviços Complementares (estrutura e cadastro)

> **Sem ADR e sem spec.** As Sprints 2.9.x e 2.10.x não produziram ADR em
> `DECISIONS.md` (que salta de ADR-0228 para ADR-0300) nem documento de design
> em `docs/superpowers/specs/`. As entradas abaixo foram reconstruídas a partir
> dos corpos de commit e do código entregue.

- **Versão:** 1.0.0 (sem incremento à época — consolidado em **1.1.0**)
- **Data:** 2026-07-08
- **Objetivo:** introduzir os módulos opcionais da proposta comercial previstos
  desde a VISION (Projeto Som Ambiente e Projeto Wi-Fi Premium).
- **Principais entregas:**
  - Nova entidade **`PropostaServico`** (enum `TipoServicoProposta` SOM/WIFI),
    relação `Proposta` 1→N, **unicidade por (propostaId, tipo)** — no máximo um
    SOM e um WIFI por proposta.
  - **Migration aditiva** `20260708000000_servicos_complementares`.
  - Persistência por *delete-and-recreate* em `salvarProposta`; `valorTotal`
    recalculado no servidor (produtos + serviços). `ServicoDTO` + carga em
    `getWorkspace`.
  - Workspace: seção "Serviços Complementares" entre Conteúdo e Finalização.
  - Componentes `ProjetoServicoCard` (reutilizável) e `ServicosComplementares`;
    hook `servicos-memoria` (edição em memória + save-all).
  - Validações Zod (`servicoSchema`; tipo único por proposta).
- **Não alterado:** Automação, PDF, cálculos financeiros, emissão e revisões.
- **ADRs criadas:** nenhuma (**lacuna** — decisão de modelagem sem ADR).
- **Gate:** não registrado.
- **Hash do commit:** `b957693`

---

## Sprint 2.9.2 — Integração Financeira dos Serviços Complementares

- **Versão:** 1.0.0 (sem incremento — consolidado em **1.1.0**)
- **Data:** 2026-07-08
- **Objetivo:** fazer os serviços complementares comporem o investimento total.
- **Principais entregas:**
  - Investimento Geral = Automação + Σ(`valorTotal` dos serviços).
  - Helpers centralizados em `totais.ts`: `calcularInvestimentoComplementar` e
    `calcularInvestimento` — **camada aditiva**; `calcularTotais`/`totalProposta`
    ficaram intactos, seguindo a alimentar PDF e listagem só com a Automação.
  - Componente `ResumoInvestimento` no workspace.
  - `totais.test.ts`: 4 cenários + prova de aditividade.
- **Nada persistido** (derivado); PDF, listagem, banco e cálculo inalterados.
- **ADRs criadas:** nenhuma (**lacuna**).
- **Gate:** não registrado.
- **Hash do commit:** `d183375`

---

## Sprint 2.9.3 — PDF Apresentação com Som Ambiente, Wi-Fi e Investimento Total

- **Versão:** 1.0.0 (sem incremento — consolidado em **1.1.0**)
- **Data:** 2026-07-08
- **Objetivo:** refletir os serviços complementares no PDF Apresentação.
- **Principais entregas:**
  - Estrutura oficial de **13 templates** (renomeados de 10); loader atualizado,
    sem nome antigo referenciado.
  - **Slides condicionais por existência:** 09 Projeto Som Ambiente, 10 Projeto
    Wi-Fi Premium, 11 Investimento Total. Contagens resultantes:
    **Automação = 10 · +Som = 12 · +Wi-Fi = 12 · ambos = 13**.
  - Slide 08 passa a ser o Investimento **da Automação apenas**.
  - Slide 11 (`PaginaInvestimentoTotal`): Automação + Som/Wi-Fi + divisor +
    Investimento Total — **valores consumidos do DTO, nunca recalculados**.
  - `PropostaPdfDTO` ganhou `PdfServico servicos[]` + `investimento`
    (mapper/service). **PDF Comercial permaneceu byte-idêntico.**
  - Coordenadas em `coords.ts` (INVESTIMENTO, INVESTIMENTO_TOTAL, SERVICO).
  - Testes de geração no mapper (serviços + investimento).
- **ADRs criadas:** nenhuma (**lacuna**).
- **Gate:** não registrado.
- **Hash do commit:** `d9bc915`

---

## Sprint 2.9.4 — Refinamentos do Módulo de Propostas

- **Versão:** 1.0.0 (sem incremento — consolidado em **1.1.0**)
- **Data:** 2026-07-09
- **Objetivo:** unificar a apresentação financeira e ajustar a regra do desconto.
- **Principais entregas:**
  - **Resumo Financeiro único** (`resumo-financeiro.tsx`) substitui o rodapé de
    totais e o "Resumo do Investimento".
  - **Mudança de regra:** o Desconto passa a incidir sobre o **Total combinado**
    (`calcularResumoFinanceiro`): Total Geral = Automação + Serviços − Desconto
    + Frete. `calcularTotais` (desconto só sobre Automação) permaneceu no código.
  - Listagem: coluna "Valor" = Total Geral; ordem das colunas ajustada.
  - Serviços Complementares aparecem na Nova Proposta; **ocultos no modelo
    Simplificado** (auto-removidos ao trocar).
  - PDF Apresentação **bloqueado no Simplificado**; ajustes finos dos slides
    08, 09, 10, 11 e 12 e das artes.
  - Observações Comerciais/Técnicas removidas da tela (**mantidas no banco**).
- **Consequência de longo alcance:** `calcularResumoFinanceiro().totalGeral`
  tornou-se a **fonte oficial do valor** para todos os documentos — regra depois
  travada por teste na Sprint 3.1 (b).
- **ADRs criadas:** nenhuma (**lacuna grave** — mudança de regra de negócio
  financeira sem ADR; a decisão só foi formalizada depois, no ADR-0330).
- **Gate:** não registrado.
- **Hash do commit:** `2309c92`

---

## Sprint 2.10.1 — PDF Detalhado

- **Versão:** 1.0.0 (sem incremento — consolidado em **1.1.0**)
- **Data:** 2026-07-09
- **Objetivo:** padronizar a nomenclatura dos documentos e refletir os serviços
  complementares no PDF completo.
- **Principais entregas:**
  - PDF Comercial renomeado (botão) para **"PDF Detalhado"**; nomenclatura
    padronizada (PDF Detalhado / PDF Apresentação).
  - Seções "Projeto Som Ambiente" e "Projeto Wi-Fi Premium" (título + descrição
    + Valor do Projeto), condicionais à existência do serviço.
  - Resumo Financeiro reescrito consumindo `dto.resumo` (regras da 2.9.4):
    Produtos · Serviços da Automação · Som · Wi-Fi · Desconto · Frete · TOTAL —
    **estrutura fixa** (linhas sempre visíveis; R$ 0,00 quando ausentes).
  - Simplificada oculta serviços; mapper força `servicos=[]`.
  - **Valores 100% do DTO** (nunca recalculados no PDF).
- **ADRs criadas:** nenhuma (**lacuna**).
- **Gate:** não registrado.
- **Hash do commit:** `aed8990`

---

## Sprint 2.10.2 — PDF Contratual (hoje Anexo Contratual)

- **Versão:** 1.0.0 (sem incremento — consolidado em **1.1.0**)
- **Data:** 2026-07-09
- **Objetivo:** entregar o anexo do contrato — tudo o que será entregue, **sem
  preço por item**.
- **Principais entregas:**
  - Novo **PDF Contratual**: o cliente vê apenas o Total da Proposta.
  - **Parametrização do documento** por variante (`"detalhado" | "contratual"`),
    reutilizando cabeçalho, rodapé, cliente, tabela e financeiro. No contratual:
    tabela sem colunas de valor (Código/Descrição/Qtd/UN), seções Som/Wi-Fi sem
    "Valor do Projeto", Resumo só Desconto/Frete/TOTAL, título "ANEXO
    CONTRATUAL".
  - Nova rota `GET /propostas/[id]/contratual` e botões "Gerar/Abrir PDF
    Contratual".
- **Nota:** este documento é o que a Sprint 3.1 (b) renomeou para **"Anexo
  Contratual"** — só o rótulo do botão mudou; rota, conteúdo e nome de download
  permaneceram.
- **ADRs criadas:** nenhuma (**lacuna**).
- **Gate:** não registrado.
- **Hash do commit:** `213e8c4`

---

## Sprint 2.10.3 — Refinamentos do PDF Contratual

- **Versão:** 1.0.0 (sem incremento — consolidado em **1.1.0**)
- **Data:** 2026-07-10 a 2026-07-13
- **Objetivo:** fechar o PDF Contratual.
- **Principais entregas:**
  - **Subtotais dos projetos contratados:** a tabela segue sem preço por produto,
    mas o documento fecha a Automação com "Subtotal Automação" (Produtos +
    Serviços) e cada projeto (Som/Wi-Fi) exibe seu Subtotal. O cliente vê o
    subtotal de cada projeto e o valor final — **nunca o preço unitário**.
  - Resumo Financeiro contratual: Automação → Som → Wi-Fi → Subtotal Geral →
    Desconto → Frete → TOTAL. Estrutura fixa.
  - **Identificação do contratante por tipo de pessoa:** PF → Nome/CPF/RG;
    PJ → Razão Social/CNPJ/IE (+ Telefone/E-mail/Endereço). Opcionais vazios
    ocultados. Somente leitura — `rg`/`inscricaoEstadual` incluídos no
    select/DTO existentes; **banco e persistência inalterados**.
  - **Nomes de download padronizados** (`0b79177`): helpers `nomeArquivoPdf` +
    `contentDispositionPdf` — "OM Proposta Comercial/Detalhada" e "Anexo
    Contrato", com Primeiro Nome, Número e Revisão; caracteres inválidos para
    Windows removidos.
  - PDF Apresentação: fonte do slide 06 aumentada.
- **Observação:** o corpo do commit `6d372ea` diz "Encerra o desenvolvimento do
  módulo de Propostas (**v2.0**)". Essa "v2.0" **nunca foi formalizada** em
  `VERSION`, `CHANGELOG` ou ADR. Ver a decisão de versionamento na Release 1.1.0.
- **ADRs criadas:** nenhuma (**lacuna**).
- **Gate:** não registrado.
- **Hash dos commits:** `6d372ea`, `0b79177`

---

## Correções avulsas e refinamentos de Produtos

- **Versão:** 1.0.0 (sem incremento — consolidado em **1.1.0**)
- **Data:** 2026-07-10 a 2026-07-13
- **Principais entregas:**
  - **`31d5af1`** — ajuste do rodapé financeiro do PDF. *Commit sem corpo de
    mensagem; entrega deduzida do arquivo alterado.*
  - **`ee0db73`** — correção de autenticação do banco e configuração do ambiente
    de desenvolvimento; adição de `backup/db_outsystem.backup`. *Commit sem
    corpo.* **Consequência colateral relevante:** o banco de desenvolvimento
    passou a ser restaurado do **catálogo real da Outmat**, deixando de conter os
    produtos fictícios do `prisma/seed.ts` — origem da falha do smoke E2E
    registrada em `BACKLOG.md`.
  - **`3781c03`** — UX da tabela de produtos: **reordenação por Drag & Drop**
    (`@dnd-kit`) iniciada apenas pela alça, substituindo os botões mover
    cima/baixo; fonte dos inputs de valor reduzida; descrição em até 2 linhas;
    ação `reordenarItens` + helper puro `reordenarNaLista` com teste unitário.
  - **`75db63f`** — refinamentos do cadastro de Produtos: **SKU único em três
    níveis** (banco, backend `skuDisponivel` + P2002, frontend assíncrono);
    **Clonar Produto** (`/produtos/novo?clonarDe=<id>`, copia descritivos e zera
    SKU/valores); nomenclatura **"Código" → "SKU"** em toda a interface (nomes
    internos e de banco inalterados); listagem preserva posição e destaca o item
    recém-editado. Componentes compartilhados receberam props **opcionais**, sem
    impacto nos demais cadastros.
- **ADRs criadas:** nenhuma (**lacuna** — o Drag & Drop e a regra de SKU único
  são decisões que mereceriam ADR).
- **Gate:** não registrado.
- **Hash dos commits:** `31d5af1`, `ee0db73`, `3781c03`, `0b79177`, `75db63f`.

---

## Sprint 3.1 (b) — Documentação Contratual

> **Desambiguação:** este é o ciclo da **Documentação Contratual** (ADR-0330),
> distinto da Sprint 3.1 (a) — PDF Apresentação (ADR-0301).

- **Versão:** consolidada em **1.1.0**
- **Data:** 2026-07-17
- **Objetivo:** gerar o **Contrato em .docx** a partir do template oficial da
  Outmat e renomear o PDF Contratual para "Anexo Contratual", **encerrando o
  módulo Comercial**.
- **Documentos de processo:** design (`b489b3c`, revisado em `f2b0e79` após
  inspeção do template real) e plano de implementação (`dd9bc5f`) — o primeiro
  ciclo desde a 2.8 a seguir o processo completo de spec + plano.
- **Principais entregas:**
  - **Template versionado + script reproduzível:** o `.docx` oficial fica em
    `public/templates/contrato/contrato-outmat.oficial.docx`;
    `scripts/marcar-template-contrato.mjs` converte `[PLACEHOLDER]` → `{tag}`
    gerando `contrato-outmat.docx`. O script **aborta** se qualquer parte do XML
    fora de `<w:t>` (e do realce) mudar — prova mecânica de que fonte, margens,
    cabeçalho, rodapé, espaçamentos, numeração e estilos ficam intactos.
  - **Marcação seletiva:** `[Nº]` aparece 5× com 5 significados; só o do Anexo II
    vira tag. Os 4 restantes, mais `[VALOR]` e `[se houver]`, permanecem
    literais para preenchimento manual no Word.
  - `ContratoMapper` (`contrato.mapper.ts`) com **toda** a regra; renderer
    (`render.ts`) burro; rota `GET /propostas/[id]/contrato` orquestra e trata
    erro (500 + log).
  - Valor por extenso via `extenso`; data com timezone fixa `America/Sao_Paulo`
    a partir de `dto.data` (nunca `new Date()`).
  - **Fonte única do valor:** `dto.resumo.totalGeral` — a mesma do Anexo
    Contratual, travada por teste.
  - `filename.ts` generalizado para `.docx`/`attachment`, **mantendo os três
    nomes de PDF byte a byte**.
  - Botões "Emitir Contrato" e "Emitir Anexo Contratual" no workspace.
  - Novas dependências: `docxtemplater`, `pizzip`, `extenso` (todas MIT).
- **Problemas encontrados:** a homologação visual revelou que o template oficial
  **realça os placeholders em amarelo** e o docxtemplater preserva a formatação
  do run ao trocar o texto — nome, CPF, valor, data e forma de pagamento saíam
  pintados de amarelo, e a forma de pagamento em itálico.
- **Como foi resolvido:** o script de marcação passou a limpar `highlight`/`i`
  **apenas** dos runs que viram tag do sistema; os manuais mantêm o amarelo,
  sinalizando o que falta preencher. Realces: 18 → 6. Nova invariante do script e
  8 testes novos em `template.test.ts` (`1a6e6c8`, ADR atualizado em `da64d19`).
- **Lições aprendidas:** teste automatizado prova texto, não formatação — a
  inspeção visual no Word continua sendo gate humano obrigatório.
- **ADRs criadas:** ADR-0330.
- **Gate:** ver a seção **Release 1.1.0** abaixo.
- **Hash dos commits:** `b489b3c`, `f2b0e79`, `dd9bc5f` (processo); `2e88180`,
  `4351e06`, `58ab167`, `707785c`, `7f8da8d`, `1e0f282`, `947820e`, `aba7002`,
  `1a6e6c8`, `da64d19` (implementação).
- **Status do módulo Comercial:** ✔ encerrado. Próximos ciclos são operacionais
  (Pedido de Venda, Ordem de Serviço).

---

## Release 1.1.0 — Reconciliação documental e fechamento do módulo Comercial

- **Versão:** 1.0.0 → **1.1.0**
- **Data:** 2026-08-18
- **Objetivo:** **exclusivamente** reconciliação documental e fechamento formal
  da release. Nenhuma funcionalidade, regra de negócio, refatoração, schema,
  migration ou alteração de comportamento de PDFs, Contrato, Propostas ou
  cadastros.
- **Principais entregas:**
  - `PROJECT_HISTORY.md`: 16 ciclos reconstruídos a partir do repositório
    (3.0 → 3.1 b), com desambiguação 3.1 (a)/3.1 (b) e marcação explícita das
    lacunas de ADR/spec das Sprints 2.9.x e 2.10.x.
  - `CHANGELOG.md`: seção `[1.1.0]` consolidando tudo o que estava em
    `[Não lançado]` mais os ciclos ausentes.
  - Plano da Documentação Contratual: 51 checkboxes auditados item a item contra
    código, commits e testes; divergências de nomenclatura anotadas; o teste
    manual no Word permanece **desmarcado**.
  - `docs/CHECKLIST_RELEASE.md`: **Unit Tests (Vitest)** incluído explicitamente
    no gate, entre Build e Smoke.
  - `ARCHITECTURE.md` e `PROJECT_CONTEXT.md` atualizados.
  - `BACKLOG.md`: registrados o acoplamento do smoke ao catálogo, o guard 400 das
    rotas de documento, o superusuário no `.env` e a formalização do merge.
  - `docs/BRIEFING-PROJETO.md` corrigido e versionado.
- **Justificativa SemVer:** MINOR. Todas as entregas pós-1.0.0 são **aditivas** —
  nova entidade com migration aditiva, novos endpoints, novos documentos,
  campos acrescentados ao DTO. Nenhuma remoção de API nem quebra de contrato.
  A "v2.0" citada no corpo de `6d372ea` não foi adotada: seria um MAJOR sem
  breaking change.
- **Gate:** ESLint 0 · Typecheck 0 · Build 0 · **unit 105/105** · smoke **6/8** ·
  `/api/health` 200 (v1.1.0, db up) · `/dev/diagnostics` 200 (Saudável) ·
  PostgreSQL 18.1 conectado · Prisma conectado (121 ms conexão, 2 ms consulta).
  - **As 2 falhas do smoke são débito preexistente**, não regressão: os testes
    das linhas 136/149 e 342 preenchem o autocomplete com `"RTR"`, produto do
    catálogo fictício do `prisma/seed.ts`. Desde `ee0db73` (2026-07-10) o banco
    de dev é restaurado do catálogo **real** da Outmat, que não tem `RTR`
    (verificado: `codigo ILIKE 'RTR%'` → nenhum resultado). O teste novo da
    Sprint 3.1 (b), que usa `CM10`, **passa**. Correção registrada em
    `BACKLOG.md`; **nenhum workaround aplicado**.
- **Pendência humana:** homologação visual do Contrato .docx no Microsoft Word
  (gate manual, exigido pelo ADR-0330 e pelo plano da Sprint 3.1 b). O banco de
  desenvolvimento **não possui proposta PJ** — será preciso criar uma para
  cumprir o par PF + PJ que o plano exige.
- **Hash do commit:** `a5b21db`

---

## Sprint 4.0.1 — Fundação de Instalações

- **Versão:** 1.1.0 (sem incremento — o módulo fecha em **1.2.0** ao final da
  Sprint 4.0.2, como a 3.0 fez)
- **Data:** 2026-08-18
- **Objetivo:** abrir o primeiro módulo **operacional** do sistema, entregando o
  cadastro de Instalações: criar manualmente, listar, buscar, filtrar por status,
  abrir, editar o cabeçalho, concluir e cancelar.
- **Decisão de roadmap:** Instalações V1 passa **à frente** de Pedido de Venda e
  Ordem de Serviço. A Outmat já tem instalações em andamento sem controle, e o
  módulo precisa funcionar sem depender de entidades que ainda não existem.
- **Documentos de processo:** design técnico e plano de implementação escritos e
  aprovados antes do código (`d2654fd`).
- **Principais entregas:**
  - `Instalacao` e `InstalacaoAuditoria`, com os enums `StatusInstalacao` e
    `EventoInstalacao`. Migration aditiva.
  - **Numeração comercial própria** por sequência do PostgreSQL, iniciando em
    1001 e independente de Propostas (padrão do ADR-0201).
  - **Endereço por snapshot do Cliente, derivado no service.**
  - **Responsável em texto livre**, sem entidade, CRUD, tela ou FK, e sem
    reutilizar `Vendedor`.
  - **Proposta relacionada opcional** — vínculo puro, sem importar itens.
  - Listagem com busca por número, cliente, projeto, endereço e responsável, e
    filtro por status; workspace com cabeçalho editável e cancelamento com
    motivo; conclusão por mudança de status.
  - `datas.ts` — conversão entre `<input type="date">` e `Date` com fuso fixo
    `America/Sao_Paulo` (o projeto não tinha campo de data em formulário).
  - Item **Instalações** no menu principal.
- **Problemas encontrados e como foram resolvidos:**
  - *Snapshot na tela.* O design original deixava o formulário formar o endereço.
    Corrigido antes da implementação: `criarInstalacao` recebe só o `clienteId` e
    lê o Cliente persistido na mesma transação. Os schemas Zod nem declaram os
    campos de endereço, então o parse descarta qualquer valor vindo do navegador.
  - *Tipagem do Zod com `transform`.* Converter a data no schema fazia o tipo de
    entrada divergir do de saída, e o React Hook Form manipula o de entrada — o
    atrito contaminava `CrudFormShell` inteiro. A conversão foi para a Server
    Action; o schema só valida o formato.
  - *Locators do E2E.* O Radix Select mantém um `<option>` nativo **oculto** que
    casa com `getByText`, e o texto do diálogo de cancelamento contém "marcada
    como Cancelada." — que casava com a asserção do toast. Resolvido lendo o
    status pelo `combobox` e usando o fechamento do diálogo como sinal.
  - *`setState` em `useEffect`.* O primeiro diálogo usava `useState` + `useEffect`
    e o lint barrou. Alinhado ao precedente (`cancelar-dialog.tsx`), que usa
    `form.reset()`.
- **Lições aprendidas:** regra de integridade não pode depender do estado de um
  formulário — a garantia tem de estar onde qualquer chamador passa. E o
  acoplamento de um teste ao componente de UI (opções ocultas, textos de diálogo)
  custa tanto quanto o acoplamento a dados.
- **ADRs criadas:** ADR-0400.
- **Gate:** ESLint 0 · Typecheck 0 · Build 0 · **unit 140/140** · **smoke 11/11**
  (3 de Instalações + 8 pré-existentes) · `/api/health` 200 (v1.1.0, db up) ·
  `/dev/diagnostics` 200 (Saudável) · PostgreSQL 18.1 · Prisma conectado.
- **Verificação em banco:** primeira instalação recebeu **1001**; numeração
  sequencial e preservada após cancelamento; auditoria gravou `CRIACAO`,
  `MUDANCA_STATUS` (com a transição) e `CANCELAMENTO`; **nenhuma** coluna de
  custo e **nenhuma** tabela de responsável existem.
- **Hash dos commits:** `d2654fd` (design + plano), `f965f26` (schema/migration),
  `e78f1ab` (endereço e rótulos), `8103b41` (service/schemas/actions), `9bc40e0`
  (telas), `31e81e3` (E2E), `b89d1e9` (documentação).
- **Próxima:** **Sprint 4.0.2 — Cronologia e Custos** (`InstalacaoRegistro`,
  `InstalacaoCusto`, timeline, totais derivados), que fecha o módulo em 1.2.0.

---

> Próximas Sprints: adicionar uma nova seção ao final, seguindo este mesmo
> formato, ao concluir cada Sprint.

## Sprint 4.0.2 — Cronologia e Custos

- **Versão:** 1.1.0 → **1.2.0** — fechamento do módulo de Instalações
- **Data:** 2026-08-18
- **Objetivo:** entregar o coração do módulo — a cronologia operacional, com um
  registro independente por acontecimento e os custos extras associados.
- **Documentos de processo:** design atualizado com as decisões D12–D17 e plano
  de implementação escritos e aprovados antes do código.
- **Principais entregas:**
  - `InstalacaoRegistro` e `InstalacaoCusto`, com os enums
    `TipoRegistroInstalacao` (7 tipos) e `CategoriaCustoInstalacao` (6
    categorias). Migration aditiva.
  - **Cronologia** no workspace, com um card por acontecimento (data/hora do
    fato, tipo, responsável, relatório, custos e total) e resumo de custos no
    topo, com quebra por categoria.
  - **`datas.ts` estendido** com quatro helpers de data-hora, compartilhando o
    fuso fixo da 4.0.1. **Nenhum módulo de datas paralelo foi criado.**
  - **`custos.ts`** — fonte única de cálculo, módulo puro. Nada persistido.
  - Criação e edição transacionais; edição substitui os custos por
    delete-and-recreate.
  - Exclusão de registro bloqueada quando há custos, com a checagem no service.
- **Problemas encontrados e como foram resolvidos:**
  - *`setState` em `useEffect` no diálogo.* A primeira versão guardava os custos
    em `useState` e o lint barrou — o mesmo tropeço da 4.0.1. Os custos passaram
    a viver **dentro do formulário (RHF)**, o que resolveu o lint e, de quebra,
    eliminou a fonte dupla que poderia gerar custo fantasma na edição.
  - *Datas do exemplo da spec no E2E.* O cenário de homologação usa 18, 19 e
    20/08 — datas **futuras** em relação ao dia da implementação, e o schema
    rejeita fato futuro. O fixture passou a usar 15, 16 e 17/08.
  - *Asserção ambígua no E2E.* `/^Material/` casava tanto com o badge do tipo
    "Material comprado" quanto com a linha de custo "Material". Trocada pelo
    total do registro (R$ 335,00), que é prova numérica direta.
- **Lições aprendidas:** quando um valor precisa existir no formulário e fora
  dele, escolher o formulário — estado paralelo custa um `setState` em efeito e
  abre espaço para divergência. E fixture de teste com data absoluta envelhece:
  o exemplo da spec virou data futura no dia da implementação.
- **ADRs criadas:** ADR-0401.
- **Gate:** ESLint 0 · Typecheck 0 · Build 0 · **unit 172/172** · **smoke 13/13**
  (5 de Instalações + 8 de Propostas) · `/api/health` 200 (v1.2.0, db up) ·
  `/dev/diagnostics` 200 (Saudável) · PostgreSQL 18.1 · Prisma conectado.
- **Verificação em banco:** registros com `aconteceuEm` distinto de `createdAt`;
  custos em `numeric(12,2)`; **nenhuma** coluna de total nas tabelas novas;
  **nenhuma** entrada de auditoria gerada por operação de registro.
- **Hash dos commits:** `e90f000` (design + plano), `0d92009` (ajustes aprovados), `b845e71` (schema, datas, cálculo, validação), `ac791ef` (service, actions, timeline), `ab7c708` (E2E), `93634fd` (documentação e VERSION).
- **Status do módulo de Instalações:** ✔ concluído em **1.2.0**.
- **Próximos ciclos:** **Pedido de Venda** e **Ordem de Serviço**, ambos ainda
  sem design aprovado.

---

---

## Sprint 4.0.3 — Refinamentos de Homologação + Dashboard + Correções em Propostas

- **Versão:** 1.3.0
- **Data:** 2026-08-19
- **Branch:** `sprint-4.0`
- **Objetivo:** ciclo curto de refinamento a partir da homologação de uso real do
  módulo de Instalações (1.2.0), antes de abrir Pedido de Venda ou Ordem de
  Serviço.

### Principais entregas

- **Busca sem acento**, com fonte única em `src/utils/busca.ts`
  (`normalizarBusca`, `contemBusca`), consumida pelo `useCrudList` e pelos três
  autocompletes server-side.
- **Cleanup E2E automático** — `e2e/support/limpeza.ts` (test-only) ligado ao
  `globalTeardown`, com três guardas de ambiente, ordem explícita de dependência
  e verificação de resíduo.
- **Dashboard V1** — service + módulo puro + DTO + Server Component.
- **Instalações:** `nomeProjeto` removido estruturalmente (migration
  `20260819000000`), endereço sem repetição e número da listagem como link.
- **Propostas:** duplicação passa a copiar `PropostaServico` e o restante do
  conteúdo comercial; novo **PDF Geral de Produtos** (quinto documento).
- **Menu** reordenado e travado por teste unitário.
- `src/utils/data-brasil.ts` — dono transversal do fuso `America/Sao_Paulo`.

### ADRs criadas

ADR-0402 (busca sem acento, fonte única e filtro em memória), ADR-0403 (cleanup
E2E por `globalTeardown`), ADR-0404 (Instalação: `nomeProjeto`, endereço, link),
ADR-0405 (Dashboard V1), ADR-0406 (duplicação de Proposta), ADR-0407 (PDF Geral
de Produtos).

### Problemas encontrados

1. **A causa da busca sem acento não era onde parecia.** O `useCrudList` já
   normalizava acentos desde sempre, e as cinco listagens passam por ele. Medição
   no banco real isolou o defeito: `ILIKE '%thai%'` → 0 linhas;
   `ILIKE '%thaí%'` → 1. O problema estava nos **autocompletes server-side**,
   onde o `contains + mode: "insensitive"` do Prisma vira `ILIKE` — insensível a
   caixa, sensível a acento.
2. **`unaccent` indisponível.** A extensão não está instalada e
   `CREATE EXTENSION` exige superusuário; o ADR-0101 determina o usuário dedicado
   `outmat`, que não é superusuário.
3. **Passivo de dados de teste dominando o banco de dev:** 88/91 clientes,
   27/49 produtos, 25/28 propostas e 44/45 instalações.
4. **`nomeProjeto` existe em dois models** — risco real de remover o campo
   errado e quebrar a capa do PDF Apresentação.
5. **Corrida latente nos E2E**, exposta pela limpeza: com a listagem 30× menor,
   o `fill` passou a acontecer antes da hidratação e o formulário remontava com
   os `defaultValues` do Server Component, descartando o texto digitado.
6. **Dependência cross-feature indevida** no plano original do Dashboard, que
   importaria um helper de fuso de `features/instalacoes/datas.ts`.

### Como foram resolvidos

1. Fonte única de normalização + filtro em memória nos três services.
2. `unaccent` descartada; débito registrado no `BACKLOG.md` com três caminhos e
   o gatilho para adotá-los.
3. `pg_dump` validado com `pg_restore -l`, depois a rotina de limpeza uma única
   vez. Resultado: clientes 91→3, produtos 49→22, propostas 28→3,
   instalações 45→1. Os dois `proposta_servicos` pertenciam a proposta real e
   foram preservados.
4. Auditoria linha a linha antes do `DROP COLUMN`, registrada na migration e no
   ADR-0404. `Proposta.nomeProjeto` intocado.
5. Passou-se a aguardar o valor carregado antes de digitar, nos dois specs.
6. Fuso promovido a `src/utils/data-brasil.ts`; `datas.ts` passou a importar só
   as constantes, sem mover funções, com `datas.test.ts` intocado como prova.

### Decisões de escopo

- **Nenhum `take` antes do filtro de busca.** Um limite esconderia registros
  válidos além do corte — o mesmo defeito por outra causa.
- **`pg_dump` é operação de implantação, não de rotina.** O `globalTeardown`
  nunca o executa.
- **O PDF Geral de Produtos não emite a proposta**, diferente dos outros quatro
  documentos.
- **A duplicação foi corrigida por inteiro**, não só nos serviços: desconto,
  frete, nome do projeto e finalização se perdiam pela mesma causa.

### Gate de qualidade

| Item | Resultado |
| --- | --- |
| `npm run lint` | 0 erros |
| `npm run typecheck` | 0 erros |
| `npm run test` (Vitest) | **232/232** em 20 arquivos |
| `npm run build` | sucesso |
| `npm run test:e2e` (Playwright) | **19/19** |
| `/api/health` | 200 `{ status: "ok", database: "up" }` |
| `/dev/diagnostics` | 200 |
| PostgreSQL 18.1 · Prisma 7.8.0 | conectados |
| Resíduo E2E após a suíte | **zero** (verificado pelo próprio teardown) |

### Verificações além do gate

- **Consolidação conferida contra o banco real** (proposta 1002, 2 seções, 15
  itens): 13 produtos consolidados, batendo produto a produto com uma agregação
  SQL independente — inclusive `OMI10B = 4` e `OMIT21B = 6`, os dois casos de
  mesmo produto em Seções distintas.
- **Dashboard conferido no ar:** Rascunho 1 · Emitidas 2 · Em andamento 1 ·
  custos R$ 0,00 · estado vazio nas próximas — coerente com os dados reais
  remanescentes.

### Lições aprendidas

- **Medir antes de corrigir.** A hipótese óbvia (o hook de listagem) estava
  errada; duas consultas ao banco apontaram a causa real em outra camada.
- **Um teste que só passa porque o sistema está lento não está passando.** A
  limpeza do passivo revelou uma corrida que existia havia sprints.
- **Otimização com limite arbitrário pode recriar o defeito que corrige.** Um
  `take` antes do filtro esconderia exatamente o registro que a correção
  pretendia tornar visível.
- **Campos homônimos em models diferentes exigem auditoria explícita** antes de
  qualquer remoção estrutural.

### Commits

- `dd01dc6` — design e plano da Sprint 4.0.3
- `51abbc5` — ajuste do D1 (utilitário transversal de data/timezone)
- `4a28fb1` — Grupo A (busca) + Grupo B (cleanup E2E)
- `ce0c5bb` — Grupos C (Instalações), D (Dashboard), E (duplicação) e menu
- `c8a7839` — Grupo F (PDF Geral de Produtos)
- `63c6321` — fechamento: ADR-0402..0407, documentação, CHANGELOG e VERSION 1.3.0

---

## Sprint 4.1 — Cadastro de Técnicos e vínculo do responsável das Instalações

- **Versão:** 1.4.0
- **Data:** 2026-08-20
- **Branch:** `sprint-4.0`
- **Objetivo:** trocar o responsável de Instalações — hoje texto digitado à mão
  em dois lugares — por um cadastro próprio (`Tecnico`: `nome`, `ativo`), sem
  perder nenhum nome já gravado e sem reescrever o histórico operacional.

### Principais entregas

- **Cadastro de Técnicos** (`/tecnicos`), reproduzindo a estrutura de Vendedor
  com dois campos a menos: service (`tecnico.service.ts`), listagem via
  `CrudListView`/`useCrudList` (busca sem acento, herdada de `busca.ts`),
  formulário via `CrudFormShell`, três rotas, ícone `HardHat` no menu e smoke
  E2E dedicado (`e2e/tecnicos.spec.ts`).
- **Migration em três passos**, sem editar nenhuma migration antiga: criar a
  tabela `tecnicos` (aditiva) → backfill dirigido pelos dados + vínculo com
  guarda de integridade → `DROP COLUMN` das duas colunas de texto.
- **`Instalacao.responsavelAtual`** (texto) → `tecnicoResponsavelId` (FK,
  `onDelete: Restrict`), sem snapshot — "responsável atual" é estado corrente.
- **`InstalacaoRegistro.responsavel`** (texto) → `tecnicoId` (FK, `Restrict`)
  **mais** `responsavelNome` (snapshot do nome no momento em que o responsável
  foi atribuído àquele registro), reescrito só quando o técnico muda.
- **Listagem de Instalações e Dashboard** (Próximas Instalações) passam a
  exibir o nome vindo do vínculo.
- **Regra de exclusão própria**, primeiro cadastro cuja checagem de uso não
  olha para `Proposta`: conta `Instalacao.tecnicoResponsavelId` **e**
  `InstalacaoRegistro.tecnicoId`, com mensagem dedicada
  (`CANNOT_DELETE_USED_IN_INSTALACOES`).
- Correção incidental de responsividade do workspace de Instalações (o único
  formulário do sistema que não passava por `AppPage`), aproveitando o mesmo
  ciclo de revisão da tela.

### ADRs criadas

ADR-0408 — Responsável das Instalações passa a ser Técnico cadastrado
(supersede parcial do ADR-0400, restrito ao bullet "responsável é texto
livre"; todo o resto do ADR-0400 — numeração, endereço por snapshot, cancelar
nunca excluir, datas com fuso fixo — continua valendo integralmente).

### Problemas encontrados

1. **Ambiguidade de acento no backfill.** Nomes já digitados podiam, em tese,
   ser a mesma pessoa grafada com e sem acento (`"João"` × `"Joao"`), e casar
   os dois por engano fundiria pessoas diferentes ou separaria a mesma pessoa
   de forma imprevisível.
2. **Risco de o `DROP COLUMN` rodar sobre dado sem vínculo**, deixando
   registros da cronologia sem responsável legível.
3. **O mesmo defeito latente do Vendedor** (`getPropostaFormOptions` não une o
   vendedor já vinculado quando ele está inativo) reapareceria em Técnico se a
   consulta de opções fosse copiada sem ajuste.

### Como foram resolvidos

1. A chave de agrupamento do backfill normaliza caixa e espaços, mas
   **deliberadamente não remove acento** — grafias diferentes por acento viram
   Técnicos distintos, visíveis no cadastro para revisão humana, decisão de
   negócio e não de migration.
2. Guarda (`RAISE EXCEPTION`) dentro da própria transação da migration: aborta
   tudo, inclusive a criação da tabela, se qualquer linha ficar sem vínculo
   depois do backfill.
3. `listTecnicoOptions` foi escrita para unir **técnicos ativos ∪ técnicos já
   vinculados àquele agregado** (mesmo inativos, rotulados "(inativo)") desde
   o início — desvio deliberado em relação ao Vendedor. O defeito do Vendedor
   foi registrado no `BACKLOG.md`, não corrigido, por estar fora do escopo
   aprovado desta Sprint.

### Decisões de escopo

- **Cadastro nasce vazio** — nenhum Técnico de exemplo no seed.
- **Sem múltiplos técnicos por instalação, sem filtro dedicado por Técnico na
  listagem e sem indicador por técnico no Dashboard** — a busca textual já
  encontra por nome, sem acento.
- **A correção do Vendedor inativo no workspace da Proposta não foi feita** —
  apurada nesta Sprint, fica registrada no `BACKLOG.md`.

### Gate de qualidade

| Item | Resultado |
| --- | --- |
| `npm run lint` | 0 erros |
| `npm run typecheck` | 0 erros |
| `npm run test` (Vitest) | **242/242** em 21 arquivos |
| `npm run build` | sucesso |
| `npm run test:e2e` (Playwright) | **25/25** |
| Resíduo E2E após a suíte | **zero** (verificado pelo próprio teardown, inclusive `tecnicos`) |

### Lições aprendidas

- **Reverter uma decisão de ADR não é o mesmo que ignorá-la.** O ADR-0400
  estava certo sobre o risco de reescrever histórico ao converter texto em FK;
  a solução desta Sprint manteve a garantia (agora via `responsavelNome`) em
  vez de descartar a preocupação original.
- **Backfill dirigido pelos dados precisa estar correto para qualquer banco
  restaurado**, não só para o conteúdo observado hoje — mesmo com um único
  nome real no banco de produção, a chave de agrupamento e a guarda foram
  escritas para o caso geral.
- **Um padrão comprovado (Vendedor) não deve ser copiado cegamente** quando um
  defeito latente nele já é conhecido — Técnico corrigiu, de propósito, o que
  o Vendedor ainda carrega.

### Commits

- `790dd44` — plano de implementação do cadastro de Técnicos
- `6951e1f` — model Tecnico e migration aditiva
- `50466b2` — service do cadastro com regra de exclusão por uso
- `a541737` — cadastro completo com listagem, formulário e rotas
- `d4f225d` — menu e smoke E2E do cadastro
- `efdf539` — backfill do responsável e travamento das colunas
- `a243cf8` — responsável atual da Instalação passa a ser Técnico cadastrado
- `b340119` — responsável do registro da cronologia vira Técnico com snapshot
- `d20fced` — Próximas Instalações do Dashboard mostram o nome do Técnico
- `ddad9a0` — remove as colunas de texto do responsável
- `8edee38` — cobertura E2E do vínculo com Técnico e da regra do snapshot
- fechamento desta Sprint: ADR-0408, documentação e VERSION 1.4.0 (este commit)

---

## Sprint 4.1.1 — Integridade do agregado da cronologia (fechamento da 1.4.0)

Ciclo curto, aberto **pela revisão final da própria 1.4.0**, antes do merge na
`main`. Não é uma Sprint nova: é o fechamento da 1.4.0, e por isso a `VERSION`
permanece em `1.4.0`.

### O defeito

`atualizarRegistro` e `excluirRegistro` recebiam apenas o `registroId`. A Server
Action recebia também o `instalacaoId`, mas o usava só para `revalidatePath` —
nunca chegava ao service. Uma chamada forjada com o par cruzado (`instalacaoId`
de A, `registroId` de B) alcançava o histórico da instalação B.

Nenhum dado real foi afetado: a interface sempre enviou o par correto. Mas a
integridade do agregado dependia disso, que é exatamente o que não se pode
aceitar — a Server Action é fronteira pública.

### Correção

As duas operações passaram a consultar por `id` **E** `instalacaoId`. Não
pertencer devolve a **mesma** mensagem de `Registro não encontrado.` que um id
inexistente, para não vazar a existência de um agregado vizinho. A checagem vem
**antes** do delete-and-recreate dos custos — invertida, uma tentativa recusada
ainda teria apagado os custos do alvo. O `deleteMany` repete as duas condições,
para que a janela entre leitura e escrita não seja explorável.

Auditadas também `criarRegistro`, `listarRegistros` e os três pontos de escrita
de `InstalacaoCusto`: custos só são manipulados dentro de um registro já
carregado, e **não existe action nem service que opere um `InstalacaoCusto` por
id de forma independente**. Nenhuma correção adicional foi necessária.

### Terceira suíte de teste — agora parte do gate oficial

A garantia é uma condição de consulta, então nem a suíte pura nem o E2E a
alcançam: com Prisma mockado o teste provaria apenas que o mock foi chamado, e a
interface nunca produz o par cruzado. Nasceu daí
`src/services/instalacao-registro.integration.test.ts`, com config e comando
próprios (`vitest.integration.config.ts`, `npm run test:integration`).

As três suítes ficam **separadas de propósito** — `npm run test` continua puro,
rápido e executável sem PostgreSQL — e as três são obrigatórias. O
`CHECKLIST_RELEASE.md` passou a listar **Integration Tests** como item 5 do gate,
com os demais renumerados; README e ARCHITECTURE foram atualizados.

Os quatro casos cruzados foram verificados como **discriminantes**: removendo a
guarda, eles falham; restaurando, passam. Sem esse passo, passariam também na
versão vulnerável.

### ADRs criadas

ADR-0409 — Estratégia de testes: três suítes separadas, todas obrigatórias
(unidade sem banco, integração contra PostgreSQL real, smoke/E2E pelo
navegador). Registra também o reforço da invariante de pertencimento do
registro à Instalação, que já havia sido acrescentada como bullet ao ADR-0401.

### Gate de qualidade

| Item | Resultado |
| --- | --- |
| `npm run lint` | 0 erros |
| `npm run typecheck` | 0 erros |
| `npm run test` (Vitest — unidade) | **242/242** em 21 arquivos |
| `npm run test:integration` (Vitest + PostgreSQL) | **10/10** |
| `npm run build` | sucesso, 30 rotas |
| `npm run test:e2e` (Playwright) | **26/26** |
| Resíduo E2E após a suíte | **zero** nos 7 marcadores |
| `/api/health` | `200 {"status":"ok","version":"1.4.0","database":"up"}` |
| `/dev/diagnostics` | 200 · Saudável · Prisma conectado · PostgreSQL 18.1 |

### Lições aprendidas

- **Um id de pai recebido e não usado é um defeito esperando acontecer.** O
  `instalacaoId` chegava à action e morria no `revalidatePath`; bastava isso para
  o agregado ficar sem dono. Vale como regra de leitura de código: parâmetro que
  entra e não participa da consulta merece explicação.
- **Teste que passa não prova nada até falhar por ausência do código.** Os quatro
  casos cruzados passavam vacuosamente contra a assinatura antiga; só a remoção
  deliberada da guarda mostrou que discriminam.
- **A camada do teste é ditada pela natureza da garantia.** Quando a regra É a
  consulta, mock não serve e UI não alcança — sobra o service contra o banco.

### Commits

- `1337afa` — registro da cronologia condicionado à instalação informada
- `f6f352c` — `test:integration` passa a integrar o gate oficial
- fechamento: ADR-0409, estratégia de testes de integração (este commit)


---

## Sprint 4.2 — Usuário único com papéis operacionais

- **Versão:** 1.4.0 → **1.5.0**
- **Data:** 2026-08-26
- **Branch:** `sprint-4.2`
- **Objetivo:** substituir os cadastros separados de **Vendedores** e
  **Técnicos** por um cadastro único de **Usuários** com papéis independentes
  (`ehVendedor`, `ehTecnico`), migrando dados e vínculos sem perda, e remover
  "Custos acumulados" da apresentação do Dashboard.
- **Spec:** `docs/superpowers/specs/2026-08-26-usuario-unico-papeis-design.md`
- **Plano:** `docs/superpowers/plans/2026-08-26-sprint4-2-usuario-unico-papeis.md`
- **ADR:** ADR-0410 (supersede parcial do ADR-0408)

### Auditoria pré-migration

Saída de `npx tsx scripts/db/audit-usuarios.ts`, executada em 2026-08-26 **antes
de qualquer migration**. É o lado "antes" da prova de que nenhum vínculo foi
perdido.

```json
{
  "cadastros": {
    "vendedores": 2,
    "tecnicos": 1,
    "usuarios": null
  },
  "listas": {
    "vendedores": [
      "Carlos Gomes",
      "Vinicius Garcia"
    ],
    "tecnicos": [
      "Vinicius"
    ],
    "usuarios": null
  },
  "vinculos": {
    "propostasComVendedor": 2,
    "instalacoesComTecnico": 0,
    "registros": 3
  },
  "cronologia": [
    {
      "id": "cmt1gqo01000000ucc1nvxjzf",
      "tecnicoId": "2169f741-dad5-4034-af76-59f2c2f4a44a",
      "responsavelNome": "Vinicius"
    },
    {
      "id": "cmt1grpf1000100uckuik1v14",
      "tecnicoId": "2169f741-dad5-4034-af76-59f2c2f4a44a",
      "responsavelNome": "Vinicius"
    },
    {
      "id": "cmt1gsyw3000200ucfmij1pll",
      "tecnicoId": "2169f741-dad5-4034-af76-59f2c2f4a44a",
      "responsavelNome": "Vinicius"
    }
  ]
}
```

Leitura: **2 vendedores + 1 técnico**; **5 vínculos** (2 propostas, 0
instalações com responsável, 3 registros); os 3 registros da cronologia apontam
para o técnico `2169f741-…` e trazem o snapshot `"Vinicius"`.

`Vinicius` (técnico) e `Vinicius Garcia` (vendedor) são a mesma pessoa em dois
cadastros — a consolidação está aprovada e isolada na M4 (ADR-0410).

### Auditoria pós-migration

Saída do **mesmo** `scripts/db/audit-usuarios.ts`, executada após as quatro
migrations (M1-M4).

```json
{
  "cadastros": {
    "vendedores": null,
    "tecnicos": null,
    "usuarios": 2
  },
  "listas": {
    "vendedores": null,
    "tecnicos": null,
    "usuarios": [
      {
        "id": "cmrf506fv00085sooe4qbu9dw",
        "nome": "Carlos Gomes",
        "ativo": true,
        "ehVendedor": true,
        "ehTecnico": false
      },
      {
        "id": "cmrf51tt400095soowvrqfkl2",
        "nome": "Vinicius Garcia",
        "ativo": true,
        "ehVendedor": true,
        "ehTecnico": true
      }
    ]
  },
  "vinculos": {
    "propostasComVendedor": 2,
    "instalacoesComTecnico": 0,
    "registros": 3
  },
  "cronologia": [
    {
      "id": "cmt1gqo01000000ucc1nvxjzf",
      "tecnicoId": "cmrf51tt400095soowvrqfkl2",
      "responsavelNome": "Vinicius"
    },
    {
      "id": "cmt1grpf1000100uckuik1v14",
      "tecnicoId": "cmrf51tt400095soowvrqfkl2",
      "responsavelNome": "Vinicius"
    },
    {
      "id": "cmt1gsyw3000200ucfmij1pll",
      "tecnicoId": "cmrf51tt400095soowvrqfkl2",
      "responsavelNome": "Vinicius"
    }
  ]
}
```

#### Comparação pré × pós

| Item | Pré | Pós | Observação |
| --- | --- | --- | --- |
| Cadastros | 2 vendedores + 1 técnico | **2 usuários** | fusão aprovada do Vinicius (M4) |
| Propostas com vendedor | 2 | **2** | idêntico |
| Instalações com técnico | 0 | **0** | idêntico |
| Registros na cronologia | 3 | **3** | idêntico |
| `responsavelNome` | `"Vinicius"` ×3 | `"Vinicius"` ×3 | **preservado** |
| `tecnicoId` dos registros | `2169f741-…` (Vinicius) | `cmrf51tt…` (Vinicius Garcia) | repontado pela M4, por decisão |

**Duas provas automatizadas, ambas verdes:**

1. `diff` do bloco `vinculos` pré × pós → **VINCULOS PRESERVADOS: 2 + 0 + 3**.
   Nenhum vínculo perdido.
2. `diff` da lista de `responsavelNome` pré × pós → **SNAPSHOTS HISTORICOS
   IDENTICOS**. Renomear, inativar, desmarcar papel ou fundir identidades não
   reescreveu a cronologia (ADR-0408, preservado pelo ADR-0410).

Prova adicional, colhida entre a M1 e a M2 (R1): as **7 linhas** de vínculo
(`propostas.vendedorId`, `instalacoes.tecnicoResponsavelId`,
`instalacao_registros.tecnicoId`) foram capturadas antes e depois da troca das
constraints e comparadas com `diff` — **VALORES DE VINCULO IDENTICOS**. A M2
remove e recria constraints, mas não contém um único `UPDATE`.

Estado final:

```
Carlos Gomes      [x] Vendedor  [ ] Técnico
Vinicius Garcia   [x] Vendedor  [x] Técnico
```

### Gate de qualidade

| Item | Resultado |
| --- | --- |
| `npm run lint` | **0 erros** |
| `npm run typecheck` | **0 erros** |
| `npm run build` | sucesso, 26 rotas (`/usuarios`, `/usuarios/[id]`, `/usuarios/novo`; `/vendedores` e `/tecnicos` ausentes) |
| `npm run test` (Vitest — unidade) | **250/250** em 22 arquivos |
| `npm run test:integration` (Vitest + PostgreSQL) | **33/33** em 2 arquivos |
| `npm run test:e2e` (Playwright) | **33/33** |
| Resíduo E2E após a suíte | **zero** nos 7 marcadores (24 usuários varridos) |
| `npm run db:validate` | **14 ok, 0 falhas** |
| `/api/health` | `200 {"status":"ok","version":"1.5.0","database":"up"}` |
| `/dev/diagnostics` | 200 · Saudável · 0,88 s |
| PostgreSQL | **18.1** conectado · 32 ms |
| Prisma | conectado · 2 ms · `migrate status`: *Database schema is up to date* |
| Drift schema × banco | `migrate diff`: **No difference detected** |
| `VERSION` / `package.json` | **1.5.0** / **1.5.0** |

#### Verificações de apresentação

| O quê | Resultado |
| --- | --- |
| `/dashboard` sem "Custos extras acumulados" | 0 ocorrências no HTML |
| `/dashboard` grupos restantes | Comercial · Instalações · Próximas Instalações |
| Menu | só `/usuarios`; `/vendedores` e `/tecnicos` ausentes |
| `/usuarios` | Carlos Gomes e Vinicius Garcia listados |
| **Instalação 1045 — cronologia** | renderiza **`Vinicius`** (snapshot) enquanto o cadastro se chama **`Vinicius Garcia`**. É a prova visual central da Sprint: a fusão repontou o vínculo sem reescrever o histórico. |

### Commits

| # | Hash | Task |
| --- | --- | --- |
| 1 | `58054b7` | ajustes do plano aprovado (guarda de colisão M1, prova valor-a-valor M2) |
| 2 | `caff5a9` | T1 — ADR-0410 e abertura da Sprint |
| 3 | `7453d90` | T2 — script de auditoria + auditoria pré |
| 4 | `47e7af6` | T3 — schema Prisma |
| 5 | `79e003b` | T4 — M1 (cria `usuarios`, ids preservados) |
| 6 | `a505fe6` | T5 — M2 (reaponta as três FKs, `RESTRICT`) |
| 7 | `801a361` | T6 — M3 (drop de `vendedores` e `tecnicos`) |
| 8 | `dbf8929` | T7 — módulo puro `opcoes.ts` |
| 9 | `1979b41` | T8 — schema Zod |
| 10 | `359d2c3` | T9 — `usuario.service.ts` + `assertPapel` |
| 11 | `865a923` | T10 — select de Vendedor por papel |
| 12 | `5578889` | T11 — select de Técnico por papel |
| 13 | `ba65a8b` | T12 — guardas de papel nos três services |
| 14 | `6dfc678` | T13 — integração: papel, histórico, cronologia |
| 15 | `625e0fb` | T19 — seed e validate-crud (antecipada) |
| 16 | `67eda45` | T14 — feature `usuarios/`, rotas e remoção dos antigos |
| 17 | `ba9a21d` | T15 — menu |
| 18 | `ee97c8c` | T16 — Dashboard |
| 19 | `d4540b7` | T17 — cleanup E2E |
| 20 | `557b652` | T18 — E2E de Usuários |
| 21 | `fbb6b04` | T20 — M4 (consolidação humana) |
| 22 | `711d05c` | T21 — auditoria pós |
| 23 | `2083551` | T22 — documentação final |
| 24 | `a8d9081` | T23 — VERSION 1.5.0 e gate oficial |

### Desvios do plano, e por quê

- **Task 19 antecipada para antes do gate da Task 14.** `npm run build` roda o
  typecheck sobre `prisma/seed.ts` e `scripts/db/validate-crud.ts`, que só
  deixavam de referenciar `prisma.vendedor` na Task 19. Sem a antecipação, o
  gate da Task 14 era impossível de satisfazer.
- **`CANNOT_DELETE_USED_IN_PROPOSTAS` foi mantida.** O plano dizia remover as
  duas mensagens antigas; removê-la quebraria `cliente.service` e
  `produto.service`, que a usam. Só `CANNOT_DELETE_USED_IN_INSTALACOES` saiu.
- **`e2e/dashboard.spec.ts` precisou de ajuste não previsto**: afirmava a
  existência do grupo "Custos", removido na Task 16. Passou a afirmar a
  **ausência** dele.
- **Defeito pré-existente corrigido em `scripts/db/validate-crud.ts`**: a
  checagem de SKU duplicado casava a mensagem pela palavra "código", enquanto o
  service diz "SKU" desde `75db63f`. Falhava em silêncio. Corrigido o matcher —
  a mensagem, que é homologada, não mudou.

### Lições aprendidas

- **Preservar o id de origem transforma uma garantia em impossibilidade.** Com
  `usuarios.id = vendedores.id`, a migration de vínculos não precisou de um
  único `UPDATE`: "nenhum vínculo perdido" deixou de depender de uma guarda
  correta e passou a depender de nada. A prova virou um `diff` de 7 linhas.
- **Separar "seletor" de "asserção" é o que torna uma migration de dados segura
  fora do banco em que foi escrita.** Selecionar por id (globalmente único) e
  usar o nome apenas dentro de `IF … RAISE` dá as duas semânticas certas: no-op
  em outro banco, explosão em estado inesperado.
- **Uma flag de papel resolve o que uma tabela separada resolvia — e melhor.**
  O ADR-0408 recusou reutilizar `Vendedor` por medo de poluir o autocomplete. O
  medo era justo; a solução era o eixo errado. Filtrar por papel separa o que
  precisava ser separado sem duplicar a identidade da pessoa.

---

## Release 1.5.1 — Contrato: multa de rescisão e prazo de início

- **Versão:** 1.5.0 → **1.5.1**
- **Data:** 2026-08-27
- **Branch:** `main` (trabalho direto, sem branch — release de conteúdo
  documental, sem código de aplicação; coerente com o modelo anterior à Sprint
  3.1, e o merge segue **fora** do gate por decisão em aberto no `BACKLOG.md`)
- **Objetivo:** fixar no template oficial do contrato dois termos comerciais que
  até aqui eram digitados à mão no Word a cada envio — a **multa de rescisão**
  (cláusula 9.2) e o **prazo de início** (cláusula 3.1) —, sem tocar em código de
  aplicação e sem alterar a formatação homologada.
- **ADR:** ADR-0411 (supersede parcial do ADR-0330)
- **Escopo recusado deliberadamente:** a **cláusula 8.1** (multa de inadimplência)
  **não** foi alterada e permanece em **2%**.

### O que mudou no documento

| Cláusula | Antes | Depois |
| --- | --- | --- |
| 9.2 — multa de rescisão | `multa de [Nº]% sobre o saldo do contrato` | `multa de 20% (vinte por cento) sobre o saldo do contrato` |
| 3.1 — prazo de início | `terão início em até [Nº] dias úteis após a confirmação do pagamento da entrada e a disponibilização do local…` | `O início dos serviços não depende de data previamente fixada. … em até 10 (dez) dias úteis contados da autorização formal do CONTRATANTE, assim entendida a confirmação do pagamento previsto na Cláusula 2.2 acompanhada da disponibilização do local…` |
| 8.1 — multa de inadimplência | `multa de 2% sobre o valor em aberto` | **inalterada** |

`[Nº]` caiu de **5 → 3** no oficial e de **4 → 2** no marcado. Restam os dois
genuinamente variáveis por obra: prazo de conclusão (3.1) e prazo de aceite (5.5).

### Decisões de produto tomadas na abertura

| # | Decisão | Escolha |
| --- | --- | --- |
| 0.1 | Qual multa recebe 20% | **9.2** (rescisão); 8.1 permanece 2% |
| 0.2 | Unidade do prazo | **dias ÚTEIS** |
| 0.3 | Redação da 3.1 | **Opção A** — define "autorização formal" na própria cláusula |
| 0.8 | Estratégia de release | **split** — 1.5.1 (contrato) antes da 1.6.0 (sprint funcional) |

### Provas de preservação da formatação

- **Round-trip do `.docx` verificado antes de qualquer edição:** 22 entradas, 0
  divergentes, sem BOM. Sem essa prova, nada do resto valeria.
- **Só os parágrafos 22 (3.1) e 46 (9.2)** do `word/document.xml` mudaram — os
  outros 71 ficaram byte a byte idênticos.
- **As outras 21 entradas do `.docx`** ficaram byte a byte idênticas.
- A **invariante do próprio `scripts/marcar-template-contrato.mjs`** passou
  ("removendo texto e realce de ambos, o resto é idêntico"), provando que fonte,
  margens, cabeçalho, rodapé, espaçamentos, numeração e estilos não foram tocados.
- Realces: **16 → 4** (só os manuais restantes seguem amarelos).

### Gate visual manual — APROVADO

Gate obrigatório do ADR-0330, executado no **Microsoft Word** pelo dono do
produto em **2026-08-27**, sobre o contrato gerado da **Proposta 1016 (Rev.2)**,
proposta real. Nenhum teste automatizado prova fidelidade de fonte, margem ou
layout — só a inspeção humana.

Conferidos e aprovados: cláusula 3.1; cláusula 8.1; cláusula 9.2;
`10 (dez) dias úteis` como texto normal; `20% (vinte por cento)` como texto
normal; ausência de realce amarelo/azul indevido nesses valores; fonte; margens;
cabeçalho; rodapé; numeração; quebras de página; Anexo II; e os demais campos
manuais destacados.

### Gate oficial (`docs/CHECKLIST_RELEASE.md`)

Lint 0 · Typecheck 0 · Build OK · **Unit 264/264** · **Integração 33/33** ·
**E2E 33/33** (limpeza com resíduo zero) · `/api/health` 200 (`db up`, versão
`1.5.1`) · `/dev/diagnostics` 200 · PostgreSQL e Prisma OK · documentação,
CHANGELOG e VERSION atualizados · **gate visual manual aprovado**.

### Problemas encontrados

- **`render.test.ts` não estava mapeado na auditoria e quebrou o gate.** A
  auditoria localizou o contador de `[Nº]` em `template.test.ts` e no script de
  marcação, mas não o terceiro, que afirma `toBe(4)` sobre o documento
  **renderizado**. A suíte unitária o pegou na primeira execução.
- **Como foi resolvido:** contador corrigido para `2` e o arquivo **ampliado** com
  7 asserções sobre o documento entregue — que é onde as emendas entre runs
  aparecem. A falha não foi um contratempo: foi a guarda funcionando.

### Lições aprendidas

- **Auditar "onde o número aparece" não é o mesmo que auditar "quem afirma o
  número".** O `[Nº]` estava em dois lugares que o grep achou e num terceiro que
  só a execução revelou. Rodar a suíte cedo custa menos que mapear exaustivamente.
- **Provar o round-trip ANTES de editar um binário versionado.** Reescrever o zip
  podia, sozinho, alterar entradas não relacionadas. Verificar isso primeiro
  transformou todas as provas seguintes em afirmações sobre a edição, não sobre a
  ferramenta.
- **A formatação certa vem do próprio documento, não da preferência de quem
  edita.** O template tinha três estilos com significados distintos — corpo
  (termo fixo), negrito+azul (dado variável) e amarelo (preencher à mão).
  Comparar com como o documento já escrevia "2%" e "3 (três) meses" respondeu a
  questão sem opinião.
- **Fixar um valor é também impedir que ele se espalhe.** A decisão foi 20% na
  9.2; o risco real é alguém depois aplicar o mesmo número à 8.1, que é multa de
  outra natureza e tem teto legal. O teste dedicado à 8.1 existe para esse erro
  futuro, não para o presente.

### Commits

| # | Hash | Conteúdo |
| --- | --- | --- |
| 1 | `0189590` | fechamento da release 1.5.1 — cláusulas 3.1 e 9.2 nos templates oficial e marcado, guards do script de marcação, 14 testes, documentação, ADR-0411, VERSION e `package.json` em 1.5.1 |

- **Hash do commit de fechamento:** `0189590`

Release entregue em **um único commit**, diferente da Sprint 4.2: o escopo é
conteúdo de documento e não comportava fatiamento por task — o template, os
guards que travam as contagens e os testes que provam o resultado só fazem
sentido juntos, e um commit intermediário deixaria a suíte vermelha. O registro
deste hash é feito em **commit documental separado**, seguindo o padrão do
projeto (Sprint 4.2, `4b7ebd1`).

---

## Sprint 4.3 — Aprovação de Proposta, Apelido de Instalação e Anexos de Registro

- **Versão:** 1.5.1 → **1.6.0**
- **Data:** 2026-08-27 a 2026-08-28
- **Branch:** `sprint-4.3` (nasceu de `9848643`, hash final da 1.5.1)
- **Objetivo:** identificar propostas aprovadas pelo cliente sem depender de
  Pedido de Venda; dar às instalações uma identificação própria por obra; e
  permitir anexar arquivos aos acontecimentos da cronologia.
- **Plano:** `docs/superpowers/plans/2026-08-27-sprint4-3-aprovacao-apelido-anexos.md`
- **ADRs:** ADR-0412 (aprovação, supersede parcial do ADR-0211), ADR-0413
  (apelido + redirects), ADR-0414 (anexos)

### FASE A — Propostas: status APROVADA

A aprovação é um **fato da REVISÃO** (`PropostaRevisao.aprovadaEm`, simétrico a
`emittedAt`); `Proposta.status = APROVADA` é a **projeção** de "a revisão atual
está aprovada". `Proposta.aprovadaAt` **não** foi criada.

A invalidação é automática **por construção**: `salvarProposta` forka quando a
revisão está congelada, e a revisão nova nasce com `aprovadaEm` nulo. Não existe
"limpar a aprovação" em lugar nenhum do código.

#### Prova discriminante da regra de fork

A regra crítica da Sprint foi trocar o gatilho de `status === "EMITIDA"` para
`currentRevision.emittedAt != null`, **antes** de habilitar `APROVADA`. Sem a
troca, uma proposta aprovada não entraria no `if` e o `deleteMany` de seções
sobrescreveria **in-place o conteúdo que o cliente aprovou** — perda silenciosa
de dado.

| Estado do gatilho | Resultado |
| --- | --- |
| `currentRevision.emittedAt != null` | **61/61 verde** |
| revertido para `status === "EMITIDA"` | **exatamente os 2 testes do bloco SEGURANÇA falham** — "expected false to be true" no `forked`, e a trilha sem "APROVADA → RASCUNHO" |
| restaurado | **61/61 verde** |

O teste compara o conteúdo da `Rev.N` **campo a campo** (seções, ordem, e por
item código, descrição, unidade, `valorProduto`, `valorServico`, `quantidade`),
não apenas a existência da revisão, e tem asserção de sanidade para nunca passar
sobre captura vazia.

#### Desvios da Fase A

1. **Expansão da união e de `labels.ts` antecipada do T4 para o T3.** O plano
   dizia que a migration não afetaria o typecheck, por `StatusProposta` ser união
   escrita à mão. **Errado:** o tipo GERADO pelo Prisma alarga com
   `prisma generate` e é atribuído a essa união em três pontos (`listPropostas`,
   `salvarProposta` e `proposta-conteudo.service.ts`) — três erros TS2322. Como o
   processo proíbe deixar a árvore deliberadamente sem typecheck, a união e as
   três entradas de `labels.ts` vieram para o T3.
2. **Documentos usam `status === "EMITIDA" || status === "APROVADA"`**, não
   `status !== "RASCUNHO"` como o plano prescrevia. A forma curta incluiria
   `CANCELADA` e passaria a oferecer PDF, contrato e anexo de proposta cancelada
   — comportamento que não existia e que ninguém pediu. Corrigido no T6 e
   registrado no ADR-0412.
3. **T4 e T5 no mesmo commit.** O teste de segurança do T5 foi escrito dentro da
   fase vermelha do T4 (15 testes falhando por função inexistente) e vive no
   mesmo arquivo; separar seria artificial.
4. **`aprovadaEm` só onde há consumidor real.** O plano previa expô-lo também em
   `PropostaListItem`, mas nada renderiza a data na listagem — o badge basta. Ele
   entra apenas no DTO do workspace, que a exibe.
5. **Trilha de auditoria dinâmica.** A observação de `MUDANCA_STATUS` no fork
   passou do literal "EMITIDA → RASCUNHO" para a forma derivada
   `${p.status} → RASCUNHO`. Para `EMITIDA` o texto é idêntico; quando o fork
   parte de `APROVADA`, a trilha não mente. Verificado por teste.

### FASE B — Apelido de Instalação

#### Achado: o Zod exigia, o typecheck passava, o service descartava

Com `apelido` já obrigatório no schema Zod, `tsc --noEmit` passava **limpo** e o
campo era **descartado em silêncio** pelo service: `parsed.data` chega como
objeto **não-literal**, e o *excess property checking* do TypeScript não se
aplica a esse caso. Nenhuma das duas defesas estáticas pegou.

Quem pegou foi o teste de integração novo — "expected null to be 'Casa
Alphaville'". É exatamente a classe de lacuna que originou o **ADR-0409**, e o
caso mais direto até hoje de por que a suíte de Integração existe separada.

*Nota que torna o achado instrutivo:* onde a chamada É um literal fresco — dois
pontos em `usuario.service.integration.test.ts` — o typecheck **pegou**
normalmente. A diferença entre os dois casos é a forma da chamada, não a regra.

#### Prova de equivalência do backfill

O backfill precisava replicar a regra de exibição já usada pelo sistema, não
criar uma segunda. A regra é
`(tipoPessoa === "PJ" ? empresa || nome : nome || empresa) || "—"`.

A tradução ingênua erraria: **o operador `||` do JavaScript trata string VAZIA
como falsa, e `COALESCE` sozinho só trata `NULL`**. Cada termo precisou de
`NULLIF(x, '')` — sem isso, `empresa = ''` viraria apelido vazio no banco e
"nome" na tela.

As duas regras foram executadas sobre os mesmos dados e comparadas:

```
12 casos | 0 divergências
  3 clientes REAIS do banco (PF com acento, PF simples, PJ com nome nulo)
  9 sintéticos de borda, incluindo PJ com empresa = '' — o caso que quebraria
    um COALESCE ingênuo
```

Instalações após o backfill: **1 de 1 com o valor correto, 0 nulas ou vazias**.

O fallback final difere de propósito: a tela mostra o travessão para cliente sem
nome nenhum, mas um travessão como apelido seria inútil na coluna de
identificação principal; nesse caso único usa-se o número. **Não existe nenhuma
linha assim** (0 clientes sem nome e sem empresa) — é guarda, não comportamento.

#### Desvios da Fase B

1. **T10 e T11 no mesmo commit.** Com o service exigindo `apelido` e o formulário
   ainda sem o campo, commitar o T10 sozinho deixaria a criação de instalação
   quebrada e o E2E vermelho entre dois commits.
2. **Testes preexistentes ajustados, todos por consequência legítima:**
   `usuario.service.integration.test.ts` (2 chamadas de `criarInstalacao` sem o
   campo novo — aqui o typecheck pegou) e um E2E cujo
   `getByText(clienteNome, { exact: true })` virou **ambíguo** porque o apelido
   sugerido **é** o nome do cliente, fazendo o mesmo texto aparecer na coluna
   Apelido e na coluna Cliente; passou a `getByRole("cell")`.
3. **T13 não antecipou o redirect.** A primeira versão do cenário de apelido
   afirmava que salvar levava à listagem — comportamento que só chegaria no T14.
   Trocado por navegação explícita: um cenário de apelido não trava
   comportamento de outra task.

### FASE C — Redirects

Comportamento final:

```
criar Instalação        → /instalacoes        (toast com ação "Abrir")
salvar dados gerais     → /instalacoes
criar/editar Registro   → permanece em /instalacoes/[id]
cancelar Instalação     → permanece em /instalacoes/[id]
```

A separação da cronologia é **física, não condicional**: os registros vivem em
`Cronologia`/`RegistroDialog`, com Server Actions próprias que só revalidam
`/instalacoes/[id]`. Não há condicional a preservar — e é justamente por isso que
a regra é fácil de perder numa refatoração futura.

**O teste negativo prova pela URL FINAL, nunca pelo toast** — o toast diz que a
ação respondeu, não para onde a aplicação foi. As asserções de permanência são
duplas (`toHaveURL(instalacaoPath)` **e** `not.toHaveURL` da listagem), porque a
primeira sozinha passaria se a URL virasse um terceiro lugar.

Seis testes preexistentes com fluxo de criação inline foram ajustados, e o helper
`criarInstalacao` passou a preencher um apelido único por chamada — sem isso, os
dois cenários que criam duas obras para o **mesmo** cliente gerariam dois links
homônimos e o strict mode do Playwright recusaria o locator.

### FASE D — Anexos

#### SPIKE T15 — resultado

```
arquivo ............ ~8 MB pseudoaleatório, incompressível
transporte ......... multipart/form-data
Next-Action ........ AUSENTE (não passou por Server Action)
sha256 ............. IDÊNTICO origem/destino, nos dois modos
Route Handler ...... APROVADO
next.config.ts ..... intacto, sem aumento de bodySizeLimit
runtime ............ Node v24.11.1 · win32 x64 · dev E build de produção
memória ............ 8 uploads (64 MB): RSS oscilou 134–197 MB, SEM crescimento
                     monotônico — GC recupera, não há vazamento
```

**Decisão adotada:** `file.stream()` → `pipeline(...)` → `createWriteStream(...)`.
Medição: `arrayBuffers` retidos −24 MB contra +48 MB do caminho
`arrayBuffer()` + `Buffer.from()`, com latência igual ou melhor.

**Ressalva registrada:** `request.formData()` materializa o multipart em memória.
O streaming adotado evita as cópias **adicionais**, mas **não é streaming
multipart ponta a ponta**. Aceito para os limites atuais (10 MB por arquivo, 10
anexos por registro). **Parser multipart manual não foi implementado nesta
Sprint** — e é o ponto de retorno se o teto subir muito.

**Achado colateral, relevante para o deploy.** O primeiro teste em build deu 500
com `ENOENT: mkdir` num caminho truncado. A causa **não era o upload**:
`next start` carrega `.env.production`, que aponta `UPLOAD_PATH` para
`D:\Sistemas\Outsystem\storage` — caminho do Windows Server, inexistente na
máquina de desenvolvimento. O `path.resolve` funcionou (inclusive colapsando as
barras duplas que o dotenv preserva literalmente); o `mkdir` falhou por o drive
não existir. Repetido com `UPLOAD_PATH` local, passou.

Isso **confirmou** a arquitetura de paths por env e gerou a pré-condição
operacional registrada em `README.md` → Publicação, `ARCHITECTURE.md` §5,
`docs/CHECKLIST_RELEASE.md` e ADR-0414:

> `mkdir` recursivo cria diretórios **dentro de uma raiz existente e acessível**;
> não resolve drive inexistente nem falta de permissão da conta do serviço.

Ruído descartado: assertion do libuv no Windows (`UV_HANDLE_CLOSING`,
`src\win\async.c`) vinha do `process.exit()` do **cliente de teste** com sockets
keep-alive do undici abertos. Saída natural eliminou. Artefato do harness, não do
Route Handler.

**Spike totalmente descartável:** rota temporária, cliente e pasta `spike/`
removidos; `git status` limpo, nenhuma referência restante no código. A evidência
ficou no plano (commit `c5265dc`).

#### Estado final dos anexos

```
InstalacaoRegistro 1:N InstalacaoRegistroAnexo
gerenciamento .... card do Registro (nunca no diálogo)
formatos ......... JPEG · PNG · WebP · PDF        (SVG RECUSADO)
limites .......... 10 MB por arquivo · 10 anexos por registro
```

**Segurança:**

- nome físico gerado no servidor (`randomBytes(16)`), **não** o id da linha;
- extensão derivada da **allowlist de MIME**, nunca do nome enviado — teste
  envia `relatorio.jpg.exe` com MIME de PDF e confere que o arquivo sai `.pdf`;
- `nomeOriginal` **nunca** compõe caminho: é texto de exibição e
  `Content-Disposition`;
- **caminho RELATIVO** persistido no banco (POSIX, sem drive, sem barra inicial);
- `resolveWithin` em **todo** I/O, inclusive no `rm` recursivo;
- resolução sempre pelo **agregado completo** — `instalacaoId` + `registroId` +
  `anexoId` —, em função única, para ser impossível "esquecer" um id;
- `Content-Type` do download **derivado da allowlist**, nunca ecoando o valor
  guardado, mais `X-Content-Type-Options: nosniff`;
- **banco é a autoridade**: arquivo órfão é tolerado e logado; linha apontando
  para arquivo inexistente é o estado a evitar — e é essa assimetria que fixa a
  ordem das operações.

#### Prova discriminante do agregado (pares cruzados)

| Condição | Resultado |
| --- | --- |
| `{ id: anexoId, registro: { id: registroId, instalacaoId } }` | **90/90 verde** |
| sem `instalacaoId` | **3 testes falham** (ler, excluir e listar pela instalação errada) |
| sem `registroId` | **4 testes falham** (ler e excluir pelo registro errado, listar só os do registro, e o anexo deixa de sobreviver à exclusão cruzada) |

Há também um teste afirmando que **os três ids certos ENCONTRAM** o anexo — sem
ele, um `where` que nunca casa passaria em todos os cenários negativos.

#### Exclusão

- **anexo:** banco primeiro, filesystem best-effort depois;
- **registro:** FK `CASCADE` no banco + pasta removida **pós-commit**,
  best-effort — apagar antes ou dentro da transação arriscaria o oposto, porque
  um rollback deixaria linhas apontando para arquivos removidos;
- **regra de custos preservada** (ADR-0401): registro com custo continua
  bloqueado, e o bloqueio **não tem efeito colateral** sobre os anexos;
- **cancelar instalação não remove anexos.**

#### Cleanup E2E — banco e disco

`anexos` entrou na contagem e no `DELETE`, **antes** dos registros. As pastas
caem depois do COMMIT, com os ids lidos **antes** do `DELETE` (depois não haveria
como saber quais remover).

Quatro guardas antes de qualquer remoção — resolver a raiz, resolver o alvo,
**provar a contenção**, abortar se falhar — mais uma quinta que não estava no
enunciado e faltava: **o alvo não pode ser a própria raiz**, senão uma remoção
recursiva ali apagaria o logo da empresa e tudo o mais sob `storage/uploads`.

`limpeza.ts` re-deriva `UPLOAD_PATH` por conta própria, **duplicação deliberada**
de `paths.ts`: o ADR-0403 proíbe importar de `src/`. O que compensa o risco é a
guarda de contenção.

Exercitado de verdade na suíte completa: "pastas de anexos removidas: 2",
"anexos=1" no banco, resíduo **zero** nas duas pontas.

#### Desvios da Fase D

1. **Import circular desfeito.** A T21 precisa de `registro → anexo` (para
   `removerPastaDoRegistro`) e já existia `anexo → registro` por
   `REGISTRO_NAO_ENCONTRADO`. A constante foi para `src/lib/messages.ts`, onde o
   projeto já guarda mensagens de domínio compartilhadas desde a 4.2. Sobrou
   apenas o import de TIPO `AnexoDTO`, que o TypeScript apaga: **sem ciclo em
   runtime**.
2. **`INCLUDE_CUSTOS` manteve o nome** ao ganhar a relação `anexos`. Renomear
   obrigaria a tocar `instalacao.service.ts` e o teste de integração da
   cronologia sem ganho — é o mesmo include, com uma relação a mais.
3. **Um warning de lint entrou e saiu.** O T17 foi commitado com
   "Unused eslint-disable directive"; escrita com escapes unicode, a classe de
   caracteres não dispara `no-control-regex`, então a diretiva nunca teve efeito.
   Corrigido em commit próprio (`5f1edf7`) — lint voltou a 0 erros e 0 warnings.

### Lições aprendidas

- **Uma garantia estática que não falha não é uma garantia.** O `apelido` era
  exigido pelo Zod, o `tsc` passava e o campo sumia. O *excess property checking*
  só age sobre literais frescos; um `parsed.data` atravessa. Quando a checagem
  estática depende da FORMA da chamada, ela não cobre o caso geral — e é aí que
  a suíte de Integração paga por si mesma.
- **Antes de editar um binário versionado, prove o round-trip.** Reescrever o
  `.docx` podia, sozinho, alterar entradas não relacionadas. Verificar isso
  primeiro (22 entradas, 0 divergentes) transformou todas as provas seguintes em
  afirmações sobre a edição, não sobre a ferramenta. Vale igual para o zip de um
  template e para o layout de arquivos de anexo.
- **Traduzir uma regra entre linguagens exige prova, não leitura.** O `||` do JS
  e o `COALESCE` do SQL parecem equivalentes e divergem em string vazia. Rodar as
  duas sobre os mesmos dados custou minutos e fechou a questão; ler o código
  teria deixado o caso de borda passar.
- **Mapear onde um número aparece não é o mesmo que mapear quem o afirma.** Na
  1.5.1 o contador de placeholders estava em dois lugares que o grep achou e num
  terceiro que só a execução revelou. Rodar as suítes cedo custa menos que
  auditar exaustivamente — e foi a mitigação adotada aqui, com resultado.
- **A forma curta de uma condição costuma incluir mais do que se quer.**
  `status !== "RASCUNHO"` parecia inofensivo e teria exposto documentos de
  proposta cancelada. Enumerar os estados desejados é mais longo de escrever e
  mais difícil de errar.

### Commits

| # | Hash | Task |
| --- | --- | --- |
| 1 | `7735cf0` | T1 — ADR-0412..0414 e abertura da Sprint |
| 2 | `1978f92` | T2 — fork depende da revisão congelada (regra crítica) |
| 3 | `d9917a0` | T3 — migration: enum `APROVADA` + `aprovadaEm` |
| 4 | `d5ecef8` | T4+T5 — service aprovar/desfazer + teste de segurança |
| 5 | `e5a6845` | T6 — ações de aprovar e desfazer no workspace |
| 6 | `bebdf26` | T7 — Dashboard: contador de aprovadas |
| 7 | `aebf255` | T8 — E2E de aprovação |
| 8 | `d9f3390` | T9 — migration: `Instalacao.apelido` + backfill |
| 9 | `f4ca35c` | T10+T11 — apelido no schema, service e formulários |
| 10 | `e13a187` | T12 — apelido como identificação principal na listagem |
| 11 | `29e7be1` | T13 — E2E de apelido |
| 12 | `6f48e40` | T14 — salvar dados gerais volta para a listagem |
| 13 | `c5265dc` | T15 — evidência do SPIKE de upload (spike descartado) |
| 14 | `eb7a992` | T16 — migration: `InstalacaoRegistroAnexo` |
| 15 | `920dead` | T17 — módulo puro de validação e caminho |
| 16 | `5f1edf7` | T17 (correção) — diretiva eslint desnecessária |
| 17 | `bb492e7` | T18 — service de anexos com resolução por agregado |
| 18 | `5f14bfa` | T19 — rotas de upload e download |
| 19 | `c6287ee` | T20 — anexos no card do registro |
| 20 | `3fbf188` | T21 — exclusão de registro leva os anexos |
| 21 | `2a5df58` | T22 — cleanup E2E de banco e disco |
| 22 | `a4882b1` | T23 — E2E de anexos |
| 23 | `6c5a001` | T24 — documentação final |
| 24 | `c0eb1a6` | T25 — VERSION 1.6.0 e gate oficial |

- **Hash do commit de fechamento:** `c0eb1a6`

Vinte e quatro commits para 25 tasks: T4+T5 e T10+T11 saíram juntas (as razões
estão nos desvios de cada fase), e a T17 precisou de um commit extra para o
warning de lint. O registro deste hash é feito em **commit documental separado**,
seguindo o padrão do projeto (Sprint 4.2, `4b7ebd1`; Release 1.5.1, `9848643`).

### Gate oficial da 1.6.0

| Item | Resultado |
| --- | --- |
| Lint | 0 erros, 0 warnings |
| Typecheck | 0 |
| Build | OK |
| Unit | **295/295** (23 arquivos) |
| Integração | **90/90** (6 arquivos) |
| Smoke/E2E | **38/38** |
| `/api/health` | 200 · `{"status":"ok","version":"1.6.0","database":"up"}` |
| `/dev/diagnostics` | 200 |
| PostgreSQL | 18.1 (x86_64-windows) |
| Prisma | 7.8.0 |
| `migrate status` | *Database schema is up to date* · 24 migrations · 0 pendentes |
| `migrate diff` | **No difference detected** (sem drift) |
| `db:validate` | 14 ok, 0 falhas |
| Resíduo banco | **zero** |
| Resíduo filesystem | **zero** (só `logo.jpg` preexistente) |
| Documentação · CHANGELOG · VERSION · package.json | atualizados |

`package-lock.json` **não** foi tocado — o repositório nunca o sincronizou com a
versão (segue em `1.0.0` desde o início), e a instrução foi manter o
comportamento estabelecido.

---

## Sprint 4.4 — Versionamento do template de contrato e Rev. 4

- **Versão:** 1.6.0 → **1.7.0**
- **Data:** 2026-08-28
- **Branch:** `sprint-4.4` (nasceu de `5e1d743`, hash final da 1.6.0)
- **Objetivo:** parar de tratar o contrato como **um arquivo** e passar a tratá-lo
  como **um texto jurídico com versões**; sobre essa base, ativar a **Rev. 4**
  enviada pelo jurídico, que transformou prazo de execução e parcela final em
  variáveis da proposta.
- **Plano:** `docs/superpowers/plans/2026-08-28-sprint4-4-contrato-rev4.md`
- **ADRs:** ADR-0415 (versionamento e carimbo na revisão), ADR-0416 (campos
  contratuais da Rev. 4 e guarda de geração)

### A ordem das fases foi a decisão de projeto mais importante

O versionamento entrou **antes** de existir uma segunda versão de template.
Enquanto a Fase 1 não fechou verde, `TEMPLATE_CONTRATO_VIGENTE` permaneceu
`rev3` — de modo que **não existiu nenhum instante** em que trocar o arquivo do
template alterasse um contrato antigo. É a mesma disciplina da T2 da Sprint 4.3
(trocar o gatilho do fork antes de habilitar `APROVADA`).

O defeito que isso evita já estava lá antes desta Sprint: o contrato era gerado
de um único arquivo, lido do disco a cada chamada, e **nunca armazenado**. Uma
proposta emitida em março, cujo contrato fosse gerado de novo depois de o
template ser trocado em setembro, sairia com o **texto jurídico novo e os dados
comerciais antigos**, em silêncio.

### FASE 1 — Versionamento (rev3 preservada, carimbo na revisão)

- `contrato-outmat.docx` → `contrato-outmat.rev3.docx` (e o oficial de
  proveniência junto), preservando a rev3 como a versão que já existia.
- `docx/templates.ts`: catálogo versão → arquivo, vigência, tags e se a versão
  exige os campos contratuais. **Em código, não em tabela** — o conjunto de tags
  é um contrato de tipo com o `ContratoTemplateDTO`: renomear um campo tem de
  quebrar o typecheck, não passar por um `INSERT`.
- `PropostaRevisao.templateContratoVersao`, carimbada em `emitirProposta` na
  **mesma transação e no mesmo instante** que `emittedAt`. Migration puramente
  aditiva, **sem backfill**: preencher retroativamente seria *afirmar* uma versão
  que ninguém registrou, quando a inferência correta já vem da regra de resolução.
- O renderer passou a escolher o arquivo **pela versão da revisão**, nunca pela
  vigente.

### FASE 2 — Campos contratuais da Rev. 4

`Proposta.prazoExecucaoDiasUteis` (Int), `valorParcelaFinal` (Decimal(12,2) —
nunca Float) e `observacoesAceite` (Text), do schema ao bloco **Finalização** do
workspace, passando por Zod, service, DTO e duplicação.

**Parcela final "não informada" ≠ "zero".** O campo é controlado e permanece
**vazio** quando o valor é nulo, porque o contrato precisa distinguir os dois: R$
0,00 é um valor válido de parcela final, e a guarda só bloqueia o **ausente**.

### FASE 3 — Ativação da Rev. 4

Template do jurídico usado **como fonte de verdade**, sem reconstrução em outro
DOCX. Só duas edições cirúrgicas no OOXML: `[se houver]` → `{observacoes}` e a
padronização do estilo das tags novas (negrito + `3C77FF`), cada uma precedida de
prova estrutural (round-trip do zip, diff parágrafo a parágrafo com alinhamento
LCS). `TEMPLATE_CONTRATO_VIGENTE` passou a `rev4`, vigente desde **2026-08-28**.

**Guarda de geração (ADR-0416):** versões que declaram `exigeCamposContratuais`
não geram sem prazo e sem parcela final — o documento sairia com "de  dias
úteis" e "R$ .". A guarda é **por versão, não por estado**: uma revisão histórica
`rev3` nunca deixa de regenerar por causa de campos criados depois dela.

### T15 — A descoberta: o rascunho mudava de texto jurídico ao ser emitido

**O que foi encontrado.** Ao virar a vigência para `rev4` e exercitar o fluxo, um
**RASCUNHO pré-visualizava a rev3 e, ao ser emitido, entregava a rev4**. Dois
textos jurídicos diferentes na mesma sessão de trabalho — exatamente a surpresa
silenciosa que esta Sprint existe para eliminar.

**A causa.** O ADR-0415, escrito no início desta mesma Sprint, dizia:

> `null` = revisão nunca emitida, **ou** emitida antes deste campo existir; nos
> dois casos o renderer assume rev3.

Os dois casos foram tratados como um só, **e não são**. "Nunca emitida" é um
rascunho — algo que ainda vai acontecer. "Emitida antes da coluna existir" é
história — algo que já aconteceu. O fallback `rev3` responde ao segundo e estava
respondendo ao primeiro.

**A regra final** (decisão do dono do produto, Opção A), num **único ponto** —
`resolverVersaoTemplateContrato`:

| `templateContratoVersao` | `emittedAt` | versão | por quê |
| --- | --- | --- | --- |
| carimbada | qualquer | **a carimbada** | é o que foi congelado |
| `null` | preenchido | **`rev3`** | emitida antes de a coluna existir |
| `null` | `null` | **a vigente** | rascunho: é o que a emissão vai gerar |

**O fallback `rev3` é EXCLUSIVAMENTE histórico.** Existe para revisões já
emitidas antes da coluna existir, e para mais nada. Um rascunho não é histórico —
ele ainda não aconteceu.

**Um único ponto de decisão, como determinado.** A resolução acontece no mapper
do PDF e o `PropostaPdfDTO` carrega a versão **já resolvida**, tipada como
`VersaoTemplateContrato` (nunca nula). `renderContratoDocx` e
`validarGeracaoContrato` passaram a **exigir** versão concreta: não resolvem, não
têm fallback, não repetem `if (emittedAt)` nem `if (versao)`. O typecheck garante
que ninguém esqueça de passar.

**Consequência desejada:** a guarda da Rev. 4 passou a valer **no rascunho**. O
momento útil de avisar que falta o prazo é antes da emissão, não depois.

**Correção do ADR-0415.** O ADR foi corrigido com a tabela dos três casos **e**
com um bloco que registra a redação anterior e por que estava errada — o ADR não
pode parecer que sempre disse isto.

**Prova discriminante.** Revertendo a regra para `null => rev3` sempre:

| Estado da regra | Resultado |
| --- | --- |
| regra dos três casos | **370/370 verde** |
| revertida para `null => rev3` | **3 testes falham** (3 failed \| 367 passed) — os três do rascunho |
| restaurada | **370/370 verde** |

A alteração temporária **não** ficou na árvore.

### Três pontos reportados durante a Sprint

1. **Correção da contagem de testes: 306/306 → 310/310.** O número que eu havia
   reportado estava desatualizado em quatro testes; a contagem correta foi
   apurada e corrigida no relatório da fase.
2. **NUL literal removido de `template-rev4.test.ts`** (`03c9bc9`). O arquivo foi
   escrito com caracteres de controle crus, e o git passou a tratá-lo como
   **binário** ("Bin 0 → 9465 bytes, 0 insertions") — um arquivo de teste
   invisível ao `diff` e à revisão. Reescrito sem NUL, com verificação de que o
   novo blob não contém nenhum.
3. **Quatro testes preexistentes ajustados por consequência legítima**, não por
   conveniência: a assinatura mais estrita de `renderContratoDocx` e
   `validarGeracaoContrato` (versão obrigatória) obrigou a atualizar as chamadas
   — 9 em `render.test.ts`, o caso do `null` em `template-rev4.test.ts` (que
   virou teste do **resolver**, onde pertence), a guarda em
   `contrato.mapper.test.ts` e o import na suíte de integração. Nenhuma asserção
   foi enfraquecida.

### T10 — E2E: a versão jurídica não muda entre pré-visualizar e emitir

O teste percorre `RASCUNHO → contrato é Rev. 4 → usuário preenche os campos
obrigatórios → emite → contrato continua Rev. 4`.

**O discriminante é o 400.** Um rascunho que resolvesse para a `rev3` devolveria
**200** na pré-visualização, porque aquele template não tem os campos novos. O
bloqueio é, portanto, a prova de que o rascunho já é `rev4`. Depois da emissão, o
contrato tem o **mesmo número de bytes** da pré-visualização.

**Determinismo (desvio apurado durante a task).** As primeiras execuções falharam
no segundo "Salvar Alterações" — ora por timeout, ora com o botão desabilitado. A
causa não era a interface: `app/propostas/[id]/page.tsx` remonta o workspace por
`key={data.updatedAt}` após salvar, e a remontagem chega em um **round-trip de
servidor**. Digitar logo depois do toast corria contra ela, e o estado novo era
descartado. Cada etapa passou a terminar em `reload()`, que além de
determinístico **prova a persistência**: os campos voltam preenchidos do banco.

### T16 — Gate visual manual: um documento por caso de resolução

Desde que o template é versionado, o gate do Word deixou de ser "um documento" e
passou a ser **um por caso de resolução vivo**. `scripts/gate-contrato-rev4.ts`
produz os três pelo **pipeline real** de produção
(`getPropostaPdfData` → `montarContratoTemplateDTO` → `renderContratoDocx`), sem
atalho de renderização:

| # | Documento | Caso que prova |
| --- | --- | --- |
| 1 | `1-historico-rev3.docx` | revisão emitida antes da Sprint 4.4, carimbo nulo → **rev3** |
| 2 | `2-rascunho-rev4.docx` | rascunho sem carimbo → **vigente** (o que o usuário pré-visualiza) |
| 3 | `3-emitido-rev4.docx` | a **mesma** proposta emitida, agora carimbada `rev4` |

O script **falha sozinho** se (2) ≠ (3) em um byte, e **apaga** a proposta que
criou — o gate não deixa resíduo no banco.

### Dívida arquitetural registrada (decisão explícita, não corrigida aqui)

Esta Sprint tornou explícita uma inconsistência **que já existia**:

- **É histórico na `PropostaRevisao`:** `emittedAt`, `aprovadaEm`, o conteúdo
  comercial (seções e itens, com snapshot de produto) e, agora,
  `templateContratoVersao`.
- **NÃO é histórico** — vive na `Proposta` e é **sobrescrito** no fork:
  `formaPagamento`, desconto, `frete`, `previsaoInstalacao` e os três campos
  novos desta Sprint.

Não gera documento errado hoje, porque só existe rota para gerar documento da
**revisão atual**. Registrada em `BACKLOG.md` e no ADR-0415, com a regra que a
acompanha: **nenhuma documentação do projeto pode afirmar que "todos os dados
comerciais de uma revisão são imutáveis"** enquanto isso não for verdade. A
afirmação que existia em `ARCHITECTURE.md` ("produtos, serviços, seções, textos,
totais, descontos, frete e impostos serão implementados exclusivamente dentro da
Revisão") foi corrigida nesta Sprint.

### Gate visual manual — APROVADO

Gate obrigatório do ADR-0330, executado no **Microsoft Word** pelo dono do
produto em **2026-08-28**, sobre os três documentos da T16. Nenhum teste
automatizado prova fidelidade de fonte, margem ou layout — só a inspeção humana.

**Rev. 3 histórica** (`1-historico-rev3.docx`, proposta 1016, carimbo nulo):
layout preservado, texto e aparência corretos, **nenhuma regressão visual**. É a
prova de que versionar o template não mexeu no contrato que já existia.

**Rev. 4** (`2-rascunho-rev4.docx` e `3-emitido-rev4.docx`): fontes, margens,
cabeçalho, rodapé e paginação corretos; sem página extra indevida; numeração das
cláusulas correta; cláusulas novas visualmente corretas; cláusula 3.1 com o prazo
correto; Anexo II correto; parcela final correta; observações corretas; tags
novas no mesmo padrão visual das demais; **nenhum realce amarelo residual**;
assinaturas e testemunhas corretas; nenhum texto deslocado ou sobreposto.

**Rascunho Rev. 4 e Emitido Rev. 4 visualmente equivalentes** — confirmando na
inspeção humana o que o script já provava por hash: o texto jurídico não muda
entre pré-visualizar e emitir.

### Commits da Sprint 4.4

| # | Hash | Task |
| --- | --- | --- |
| 1 | `a1003c7` | T1 — ADR-0415/0416 e abertura da Sprint |
| 2 | `d4abfeb` | T2 — rev3 versionada e catálogo de templates |
| 3 | `de00f23` | T3 — migration: `PropostaRevisao.templateContratoVersao` |
| 4 | `f71f6c6` | T4 — renderer escolhe o template pela versão da revisão |
| 5 | `4406d86` | T5 — integração: versionamento do template |
| 6 | `d79cd0d` | T6 — migration: campos contratuais da Proposta |
| 7 | `7980f22` | T7 — campos contratuais no schema, service e DTOs |
| 8 | `49e027b` | T8 — integração: campos contratuais e fork |
| 9 | `90a5eb2` | T9 — campos contratuais no bloco Finalização |
| 10 | `01b6c2f` | T11 — rev4 com `{observacoes}` e estilo das tags novas |
| 11 | `d0b9e6c` | T12 — mapper dos três campos + guarda de geração |
| 12 | `c655005` | T13 — tags por versão, integridade de runs e render |
| 13 | `03c9bc9` | T13 (correção) — NUL literal removido de `template-rev4.test.ts` |
| 14 | `fc2a40b` | T14 — Rev. 4 passa a ser a versão vigente |
| 15 | `8259aa4` | **T15.1** — rascunho resolve para a vigente, não para o fallback |
| 16 | `9260560` | T10 — E2E: rascunho pré-visualiza e emite a MESMA Rev. 4 |
| 17 | `96b9dfa` | T16 — script que produz os 3 contratos do gate visual |
| 18 | `e628550` | T17 — documentação |
| 19 | `31c6e08` | T18 — VERSION 1.7.0, CHANGELOG e gate oficial |

- **Hash do commit de fechamento:** `31c6e08`

A T10 saiu **fora de ordem**, depois da T15.1: o E2E existe para provar a regra de
resolução, e escrevê-lo antes da correção seria cravar o comportamento defeituoso.

### Gate oficial da 1.7.0

| # | Item | Resultado |
| --- | --- | --- |
| 1 | Lint | **0 erros, 0 warnings** |
| 2 | Typecheck | **0** |
| 3 | Build | **OK** |
| 4 | Unit | **370/370** (25 arquivos) |
| 5 | Integração | **103/103** (6 arquivos) |
| 6 | Smoke/E2E | **38/38** · resíduo de banco e de disco **zero** |
| 7 | `/api/health` | **200** · `{"status":"ok","version":"1.7.0","database":"up"}` |
| 8 | `/dev/diagnostics` | **200** · status geral *Saudável* · 0,74 s |
| 9 | PostgreSQL | **18.1** (x86_64-windows, msvc-19.44.35219, 64-bit) |
| 10 | Prisma | **7.8.0** · conectado · 1ª consulta 31 ms · consulta simples 2 ms |
| 11 | Documentação | README, PROJECT_CONTEXT, ARCHITECTURE, VISION, BACKLOG, DECISIONS, CHECKLIST_RELEASE |
| 12 | CHANGELOG | seção **[1.7.0]** |
| 13 | VERSION | **1.7.0** (e `package.json` **1.7.0**) |
| 14 | Commit | commit oficial da Sprint + hash registrado abaixo |

Verificações além do gate:

| Verificação | Resultado |
| --- | --- |
| `migrate status` | *Database schema is up to date* · **26 migrations** · 0 pendentes |
| `migrate diff` (banco × schema) | **No difference detected** — sem drift |
| `db:validate` | **14 ok, 0 falhas** |
| Resíduo de banco | **zero** — inclusive a proposta criada pelo script do gate |
| Resíduo de filesystem | **zero** — só o `logo.jpg` preexistente |
| Gate visual manual (Word) | **APROVADO** — ver acima |

`package-lock.json` **não** foi tocado: o repositório nunca o sincronizou com a
versão (segue em `1.0.0` desde o início), e o comportamento estabelecido foi
mantido.
