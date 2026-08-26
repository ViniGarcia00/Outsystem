# PROJECT_CONTEXT.md — Outmat Propostas

## Visão geral

Sistema **interno** de geração de propostas da Outmat. Não é SaaS. Uso restrito
à empresa (rede local e VPN). **Sem autenticação de usuários na versão 1.0.**

- **Servidor:** Windows Server 2019
- **Banco:** PostgreSQL
- **Framework:** Next.js 16 (App Router)

## Stack

| Camada        | Tecnologia                                   |
| ------------- | -------------------------------------------- |
| Framework     | Next.js 16 (App Router) + React 19           |
| Linguagem     | TypeScript (strict)                          |
| Estilo        | Tailwind CSS v4                              |
| UI            | shadcn/ui (Radix) + Lucide React             |
| Formulários   | React Hook Form + Zod                        |
| Tabelas       | TanStack Table                               |
| ORM / Banco   | Prisma 7 (driver adapter Pg) + PostgreSQL nativo |
| Dados (UI→DB) | Server Actions → services → Prisma (`ActionResult`) |
| Toasts        | sonner                                       |
| Testes        | Vitest (unidade) + Playwright (smoke E2E)     |
| PDF           | `@react-pdf/renderer` (sem Chromium)          |
| DOCX          | `docxtemplater` + `pizzip` + `extenso`        |
| Drag & drop   | `@dnd-kit` (ordenação de itens)               |
| Impressão     | `print.css` (impressão de tela)               |
| Tema          | next-themes (claro/escuro/sistema)           |

## Arquitetura

Clean Architecture + Feature-First. Fluxo de dependências:

```
app/ → features/ → services/ → infrastructure/
```

Detalhes completos em **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

## Estrutura de pastas (resumo)

```
src/
  app/            rotas (1 pasta por menu) + layout + globals.css
  components/     ui · layout · shared · forms · tables
  features/       dashboard · propostas · clientes · produtos · usuarios · configuracoes
  infrastructure/ configuration · database · storage · logging
  services/ hooks/ lib/ types/ utils/
prisma/           schema · migrations · seed
```

## Decisões tomadas (Sprint 0)

1. **Next.js 16 + Tailwind v4 + shadcn/ui (preset Radix/Nova).** Padrão atual do
   ecossistema; config de tema via tokens CSS (`globals.css`).
2. **Prisma 7 com driver adapter (`@prisma/adapter-pg`).** O client gerado vai
   para `src/generated/prisma` (não versionado; regenerado no `postinstall`).
3. **Configuração de ambiente tipada e validada com Zod** (fail-fast). Nada lê
   `process.env` diretamente.
4. **Caminhos de storage 100% configuráveis** e Windows-safe (`path.join`).
   Nenhuma pasta é criada nesta fase.
5. **Fontes de sistema (Segoe UI)** em vez de Google Fonts — build/deploy sem
   dependência de rede.
6. **Migration inicial gerada offline** (`prisma migrate diff`), já que não há
   PostgreSQL no ambiente de desenvolvimento. No servidor: `db:migrate:deploy`.
7. **Sidebar recolhível** com preferência persistida (localStorage) e versão
   off-canvas (Sheet) no mobile.
8. **Modelos de proposta** previstos desde já via enum `ModeloProposta`
   (COMERCIAL / SIMPLIFICADA), sem regras de negócio.
9. **Seção como agrupador neutro** (nunca "Ambiente").
10. **ConfiguracaoSistema como singleton**, preparado para expansão sem mudança
    estrutural.

## Estado atual (o que existe)

Sprint 0 (fundação) + **Sprint 1 (cadastros base)** + **Sprint 1.5 (polimento,
UX, testes e preparação)** concluídas.

- ✅ Estrutura de pastas e camadas; layout base; tema claro/escuro/sistema.
- ✅ **Banco PostgreSQL nativo** (usuário dedicado `outmat`); migrations + seed.
- ✅ **CRUD completo**: Configuração (singleton), Clientes, Produtos, **Usuários**
  (identidade única com papéis `ehVendedor`/`ehTecnico` — ADR-0410).
- ✅ Listagens: busca instantânea, ordenação, paginação (20/pág), filtro de
  inativos, ações por linha — via `CrudListView` + `CrudLayout`.
- ✅ Formulários: React Hook Form + Zod, autofocus, atalhos CTRL+S/ESC,
  redirect + toast ao salvar, `FormDirtyGuard` (guarda de dados não salvos).
- ✅ Regras de exclusão (uso em propostas) e inativação (`ativo`).
- ✅ Validações (CPF/CNPJ, e-mail, obrigatórios, monetário) compartilhadas
  cliente/servidor.
- ✅ `/api/health`, `VERSION`, `DECISIONS.md`, scripts padronizados.
- ✅ **Sprint 1.5:** smoke tests (Playwright), `print.css`, `FormSection`,
  `TableSkeleton`, revisão de acessibilidade/performance e limpeza de código
  morto. README com trilhas Desenvolvimento/Publicação. Página dev-only
  `/dev/diagnostics`.
- ✅ Processo de release: `docs/CHECKLIST_RELEASE.md` (gate obrigatório) +
  `PROJECT_HISTORY.md` (histórico por Sprint); toda Sprint termina com commit.
- ✅ **Sprint 2.1 — Fundação de Propostas:** CRUD de propostas, numeração
  sequencial (1001+), revisões, cancelamento, duplicação, status + datas
  automáticas e auditoria (sem produtos/serviços/PDF ainda). Ver DECISIONS.md
  ADR-0201..0205.
- ✅ **Módulo de Propostas completo (1.0.0, Sprint 2.8):** workspace com seções,
  itens, autocomplete de produto, drag & drop, desconto, frete, informações
  comerciais, revisões, emissão e cancelamento.
- ✅ **Serviços complementares (Sprints 2.9.x):** Projeto Som Ambiente e Projeto
  Wi-Fi Premium (`PropostaServico`), com integração financeira. O desconto passou
  a incidir sobre o **total combinado** (`calcularResumoFinanceiro`) — a fonte
  oficial do valor para todos os documentos.
- ✅ **Quatro documentos da proposta:** PDF Detalhado, PDF Apresentação (13
  templates, slides condicionais), Contrato em **.docx** e Anexo Contratual (PDF).
  Ver ADR-0223, ADR-0300, ADR-0301 e ADR-0330.
- ✅ **Refinamentos de Produtos:** SKU único em três níveis, Clonar Produto,
  nomenclatura "Código" → "SKU" na interface.
- ✅ **Instalações — módulo completo (Sprints 4.0.1 e 4.0.2, versão 1.2.0):**
  primeiro módulo **operacional**. Cadastro manual com numeração própria (1001+),
  cliente obrigatório, endereço por **snapshot derivado no servidor**, proposta
  opcional, responsável em texto livre, status, datas, listagem com busca e
  filtro, workspace, conclusão e cancelamento (ADR-0400). **Cronologia** com um
  registro por acontecimento (tipo, data do fato, responsável, relatório) e
  **custos extras** por registro, com totais derivados (ADR-0401).
- ✅ **Sprint 4.0.3 — Refinamentos + Dashboard + correções em Propostas
  (1.3.0):** menu reordenado; **busca sem acento** com fonte única em
  `utils/busca.ts` (o defeito estava nos autocompletes server-side, não no
  `useCrudList`); **cleanup E2E automático** por `globalTeardown` test-only, com
  guardas de ambiente e verificação de resíduo; **Dashboard V1** (indicadores
  comerciais, de instalações, custos acumulados e próximas instalações);
  Instalação sem `nomeProjeto`, endereço sem repetição e número clicável;
  **duplicação de Proposta** passa a copiar os serviços complementares e o
  restante do conteúdo comercial; e o **PDF Geral de Produtos**, quinto
  documento da Proposta. Ver ADR-0402..0407.
- ✅ **Sprint 4.1 — Cadastro de Técnicos (1.4.0):** o responsável das
  Instalações deixou de ser texto digitado e passou a ser vínculo com o novo
  cadastro `Tecnico` (`nome`, `ativo`, molde de Vendedor). Instalação guarda só
  a FK (`tecnicoResponsavelId`, estado corrente); o registro da cronologia
  guarda a FK **e** `responsavelNome`, snapshot do nome no momento em que aquele
  responsável foi atribuído ao registro. Migration em três passos (criar →
  vincular com backfill dirigido pelos dados → remover as colunas antigas de
  texto), sem perder nenhum nome já gravado. Cadastro nasce vazio, sem dados de
  seed. Ver ADR-0408 (supersede parcial do ADR-0400).
- ✅ `lint`, `build` e `typecheck` sem erros.

## Dashboard (entregue na Sprint 4.0.3)

`/dashboard` deixou de ser placeholder. Mostra Propostas em Rascunho e Emitidas;
Instalações A Agendar, Agendadas, Aguardando Material, Em Andamento e
Concluídas; custos extras acumulados; e até 5 próximas instalações agendadas.
Sem gráficos e sem dado fictício — tudo vem do banco (ADR-0405).

## Tela "About" (planejada — não implementada)

Estrutura preparada na Sprint 1.5 (ver BACKLOG). No futuro exibirá: Versão do
Sistema, Build, Última atualização, Versão do Banco, PostgreSQL, Prisma,
Next.js, Ambiente, Health e Diagnostics. Diferente de `/dev/diagnostics`, a
About é voltada ao usuário final e existirá também em produção.

## Próximas Sprints (visão)

> **Estado atual (2026-08-18): módulo Comercial encerrado na versão 1.1.0.**
> Depois da 1.0.0 vieram os Serviços Complementares (2.9.x), o PDF Detalhado e o
> PDF Contratual (2.10.x), o PDF Apresentação (3.0 e 3.1 a), a correção de build
> do Windows Server (3.2.1) e a Documentação Contratual (3.1 b, ADR-0330) —
> consolidados na release **1.1.0**. Ver PROJECT_HISTORY.md e CHANGELOG.md.
>
> **Estado atual (2026-08-18): módulo de Instalações concluído na versão 1.2.0.**
> O roadmap operacional foi reordenado (ADR-0400): Instalações veio **antes** de
> Pedido de Venda e Ordem de Serviço, porque a Outmat já tinha instalações em
> andamento sem controle. Sprints 4.0.1 (fundação) e 4.0.2 (cronologia e custos)
> concluídas.
>
> **Estado atual (2026-08-19): Sprint 4.0.3 concluída na versão 1.3.0.** Ciclo
> curto de refinamento após a homologação de uso real: menu, busca sem acento,
> cleanup automático dos dados de teste, Dashboard V1, refinamentos de
> Instalações e, em Propostas, a correção da duplicação dos serviços mais o
> quinto documento (PDF Geral de Produtos). Ver ADR-0402..0407.
>
> **Próximos ciclos:** **Pedido de Venda** e **Ordem de Serviço**, nenhum dos
> dois com design ou plano escritos — pelo processo do projeto, cada um exige
> spec aprovada antes de qualquer código. Do roadmap original segue aberta a
> tela **About**; o **Dashboard** foi entregue na 4.0.3.
>
> **Pendência de release:** homologação visual do Contrato .docx no Microsoft
> Word — gate manual obrigatório pelo ADR-0330.
>
> **Nota de numeração:** o rótulo "Sprint 3.1" foi usado duas vezes — 3.1 (a) é o
> PDF Apresentação (ADR-0301) e 3.1 (b) é a Documentação Contratual (ADR-0330).
> A numeração das Sprints também não é cronológica. Os **ADRs** são a referência
> estável.
>
> A visão abaixo é histórica. Melhorias registradas em `BACKLOG.md`.

- ✅ **Sprint 1 — Cadastros base:** Configuração, Clientes, Produtos, Vendedores
  (CRUD, forms, tabelas, validação). **Concluída.**
- **Sprint 2 — Propostas (núcleo):** Proposta → Revisão → Seção → Item; modelos
  COMERCIAL e SIMPLIFICADA.
- **Sprint 4 — Módulos da proposta comercial:** Projeto Wi-Fi, Projeto Som
  (arquitetura extensível).
- **Sprint 5 — Geração de PDF** a partir de templates.
- **Sprint 6 — Dashboard** e indicadores.

> O backlog detalhado é mantido em **[BACKLOG.md](./BACKLOG.md)** e as regras de
> negócio em **[VISION.md](./VISION.md)**.
