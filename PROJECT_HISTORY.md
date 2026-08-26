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

_(preenchido na Task 23)_

### Commits

_(preenchido na Task 23)_
