# Outmat Propostas — Briefing completo do projeto

> Documento de contexto para consulta externa. Estado apurado em 2026-08-18,
> branch `sprint-3.1`, release **1.1.0**.
>
> Fontes canônicas, em caso de divergência: `ARCHITECTURE.md` (estrutura),
> `DECISIONS.md` (decisões), `PROJECT_HISTORY.md` (histórico), `VISION.md`
> (regras de negócio). Este arquivo é um resumo consolidado, não substitui nenhum
> deles.

---

## 1. O que é o sistema

Sistema **interno** da Outmat para elaboração e emissão de **propostas comerciais**
de automação residencial/predial. Não é SaaS, não é multiempresa, não tem venda
externa.

- Uso restrito à empresa, via rede local e VPN.
- **Sem autenticação de usuários** na versão 1.0 (decisão explícita).
- Deploy em **Windows Server 2019**.
- Banco **PostgreSQL nativo**, usuário dedicado `outmat` (a aplicação nunca usa o
  superusuário `postgres`). Docker é opcional, só para ambiente isolado.
- Idioma: domínio e interface em português; termos técnicos em inglês.

Versão atual: **1.0.0** (módulo de Propostas homologado para produção).

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js **16.2.10** (App Router) + React 19.2.4 |
| Linguagem | TypeScript strict |
| Estilo | Tailwind CSS v4 (tokens em `globals.css`) |
| UI | shadcn/ui sobre Radix + Lucide React |
| Tema | next-themes (claro / escuro / sistema) |
| Formulários | React Hook Form + Zod 4 |
| Tabelas | TanStack Table 8 |
| Drag & drop | dnd-kit (ordenação de seções/itens) |
| ORM / Banco | Prisma 7 (generator `prisma-client`, driver adapter `@prisma/adapter-pg`) + PostgreSQL |
| Dados UI→DB | Server Actions (`"use server"`) → `services/` → Prisma, retorno padronizado `ActionResult<T>` |
| Toasts | sonner |
| PDF | `@react-pdf/renderer` 4 (sem Chromium/Puppeteer, por decisão) |
| DOCX | `docxtemplater` 3 + `pizzip` 3 + `extenso` 2 |
| Testes | Vitest 4 (unidade) + Playwright (smoke E2E, só Chromium, serial) |

Sem fontes de CDN — usa fontes de sistema (Segoe UI) para permitir build/deploy
offline.

Versão atual: **1.1.0**. A 1.0.0 encerrou o núcleo de Propostas (Sprint 2.8); a
1.1.0 consolidou tudo o que veio depois e encerrou o módulo Comercial.

---

## 3. Arquitetura

Clean Architecture + Feature-First. Dependências apontam sempre para dentro:

```
app/            rotas, layouts, composição de páginas (sem regra de negócio)
  ↓
features/       domínios auto-contidos (UI + hooks + schemas + mappers)
  ↓
services/       casos de uso, orquestração, transações
  ↓
infrastructure/ Prisma, storage, logging, configuration
```

Transversais, sem estado e sem dependência para fora: `lib/`, `utils/`, `types/`,
`hooks/`, `components/`.

**Regra de ouro:** componente nunca importa Prisma. Acesso a dados sempre por
`services`.

### Estrutura de pastas

```
src/
  app/            dashboard · propostas · clientes · produtos · vendedores ·
                  tecnicos · configuracoes · api/health · dev/diagnostics
  components/     ui · layout · shared · forms · tables
  features/       dashboard · propostas · clientes · produtos · vendedores · tecnicos · configuracoes
  infrastructure/ configuration (env tipado/validado com Zod, fail-fast) ·
                  database (Prisma singleton) · storage (caminhos configuráveis) ·
                  logging (abstração Logger)
  services/       cliente · produto · vendedor · tecnico · configuracao · logo · diagnostics ·
                  proposta · proposta-conteudo · proposta-pdf (+ mapper)
  lib/ utils/ types/ hooks/ generated/prisma (não versionado)
prisma/           schema · 11 migrations · seed
public/templates/ presentation/*.png (10 slides) · contrato/*.docx
scripts/          db/bootstrap.sql · db/validate-crud.ts · marcar-template-contrato.mjs
e2e/              smoke.spec.ts
docs/superpowers/ specs (designs) · plans (planos de implementação)
```

### Convenções

- Imports por alias `@/*`; barrels (`index.ts`) expõem a API pública entre pastas.
- Server Components por padrão; `"use client"` só com estado/efeito/API de browser.
- Arquivos em `kebab-case`, componentes em `PascalCase`.
- Camadas de UI reutilizáveis: `CrudLayout` / `CrudListView` / `useCrudList`
  (listagens) e `CrudFormShell` (formulários, com modo `readOnly`) garantem o mesmo
  padrão visual em todos os cadastros.
- Listagens processadas no cliente: busca instantânea por qualquer parte do texto,
  ordenação e paginação de 20/página. Paginação server-side é backlog condicional.
- Todos os caminhos de arquivo vêm do `.env` (`STORAGE_PATH`, `PDF_PATH`,
  `UPLOAD_PATH`, `BACKUP_PATH`, `LOG_PATH`), resolvidos com `path.join`/`path.resolve`.
  Nenhum caminho fixo.
- `export const dynamic = "force-dynamic"` no layout raiz: todas as rotas são
  renderizadas sob demanda (contorna bug interno do Next 16.2.10 no prerender com
  1 vCPU — ADR-0321; reavaliar ao atualizar o Next).

---

## 4. Modelo de dados

### Hierarquia da proposta

```
Proposta
 ├── Cabeçalho (cliente, vendedor, modelo, nome do projeto, validade,
 │             status, datas) — NÃO versionado
 ├── Revisão 0 → Seções → Itens
 ├── Revisão 1
 └── Revisão N
 └── Serviços complementares (Som / Wi-Fi) — na Proposta
```

Todo o **conteúdo comercial** vive dentro da Revisão; o cabeçalho fica na Proposta
e não é versionado (ADR-0206).

### Entidades

| Model | Tabela | Papel |
|---|---|---|
| `Cliente` | `clientes` | PF/PJ, endereço granular, RG/IE, CPF/CNPJ único e validado |
| `Produto` | `produtos` | `codigo` único (exibido como **SKU** na interface), `valorProduto` + `valorServico` |
| `Vendedor` | `vendedores` | nome obrigatório |
| `Tecnico` | `tecnicos` | nome obrigatório; responsável das Instalações desde a Sprint 4.1 (ADR-0408) |
| `Proposta` | `propostas` | raiz; `proposalNumber` sequencial único; desconto, frete, forma de pagamento, previsão de instalação, observações |
| `PropostaRevisao` | `proposta_revisoes` | versões; `revisionNumber` inteiro, único por proposta; `emittedAt` |
| `PropostaSecao` | `proposta_secoes` | **agrupador neutro** de itens |
| `PropostaItem` | `proposta_itens` | item; referencia `produtoId` (`onDelete: Restrict`) e copia código/descrição/valores |
| `PropostaServico` | `proposta_servicos` | serviço complementar (SOM / WIFI), único por tipo por proposta |
| `PropostaAuditoria` | `proposta_auditorias` | trilha de eventos |
| `ConfiguracaoSistema` | `configuracao_sistema` | **singleton** (`id = "singleton"`) |

### Enums

- `ModeloProposta`: `COMERCIAL` | `SIMPLIFICADA`
- `TipoPessoa`: `PF` | `PJ`
- `StatusProposta`: `RASCUNHO` | `EMITIDA` | `CANCELADA`
- `MotivoCancelamento`: `CLIENTE_DESISTIU` | `CONCORRENCIA` | `PROJETO_CANCELADO` |
  `ERRO_PROPOSTA` | `PROPOSTA_SUBSTITUIDA` | `OUTRO`
- `EventoAuditoria`: `CRIACAO` | `ALTERACAO` | `NOVA_REVISAO` | `DUPLICACAO` |
  `MUDANCA_STATUS` | `EMISSAO` | `CANCELAMENTO`
- `TipoItemProposta`: `PRODUTO` | `SERVICO`
- `TipoDesconto`: `VALOR` | `PERCENTUAL`
- `TipoServicoProposta`: `SOM` | `WIFI`

`ConfiguracaoSistema` guarda: dados da empresa (nome, razão social, CNPJ, IE),
endereço, contatos (telefone, WhatsApp, e-mail, site), identidade visual (logo com
upload real, cores) e textos institucionais. É o ponto único de expansão de
configuração, sem alteração estrutural de camadas.

11 migrations aplicadas, da inicial (`20260706000000_init`) até
`20260708000000_servicos_complementares`.

---

## 5. Regras de negócio consolidadas

### Modelos de proposta

- **COMERCIAL** — produtos + serviços + módulos opcionais (Som Ambiente, Wi-Fi
  Premium). A arquitetura deve permitir novos módulos sem reestruturar tabelas.
- **SIMPLIFICADA** — apenas produtos. Nunca serviços, nunca módulos.

### Seção

Agrupador **neutro** de itens. Não representa obrigatoriamente um ambiente físico.
Nomes válidos: "Sala", "Casa 92", "Apartamento Flávio", "Área Externa". Nunca tratar
como "Ambiente" no código, nomes ou textos.

### Numeração

`proposalNumber` é sequência do PostgreSQL iniciando em **1001**, nunca reutilizada.
O `id` do banco jamais é usado como numeração comercial.

### Ciclo de vida

- Transições de status controladas, datas de status imutáveis, auditoria gravada na
  mesma transação.
- **Proposta nunca é excluída** — é cancelada, com motivo obrigatório.
- Duplicação não copia `obsInternas`.
- `Rev.0` nasce junto com a proposta. Emitir congela a revisão.

### Exclusão × inativação (cadastros)

Todo cadastro tem `ativo`. Listagens mostram só ativos, com filtro "Mostrar
inativos". **Exclusão só é permitida se o registro nunca foi usado em proposta**;
caso contrário a operação é bloqueada com a mensagem padrão orientando a inativar.
Vale para Cliente, Vendedor e Produto. **Técnico** (Sprint 4.1, ADR-0408) segue o
mesmo princípio com alvo diferente: a checagem é sobre o uso em Instalações
(responsável atual ou registro da cronologia), não em propostas — mensagem
própria orientando a inativar.

### Cálculo financeiro — ponto de atenção

Existem **dois calculadores com resultados diferentes** em
`src/features/propostas/totais.ts`:

- `calcularTotais` → desconto incide **só sobre a Automação**.
- `calcularResumoFinanceiro` → desconto incide sobre o **total combinado**
  (Automação + Som + Wi-Fi).

**A fonte oficial para todos os documentos é `calcularResumoFinanceiro().totalGeral`**,
consumida via `dto.resumo.totalGeral`. Fixada por decisão de sprint e travada por
teste, para que Contrato e Anexo Contratual nunca divirjam em centavos.

### Formatações padrão (Brasil)

Moeda R$ (`formatCurrency`), data `dd/mm/aaaa` (`formatDate`), CPF/CNPJ e telefone
com máscara própria. Datas de documento usam `Intl.DateTimeFormat` com timezone
explícita `America/Sao_Paulo`.

---

## 6. Funcionalidades entregues

### Cadastros base

CRUD completo de **Clientes**, **Produtos**, **Vendedores**, **Técnicos** e
**Configuração** (singleton, com upload real do logo). Formulários com autofocus, atalhos CTRL+S /
ESC, redirect + toast ao salvar e `FormDirtyGuard` contra perda de dados não salvos.
Validações compartilhadas cliente/servidor (CPF/CNPJ com dígito verificador, e-mail,
obrigatórios, monetário).

### Propostas (módulo encerrado em 1.0.0)

- Workspace único de edição (workspace-first), com criação diferida e revisão
  automática.
- Cabeçalho: cliente (autocomplete), vendedor, modelo, nome do projeto, validade.
- Seções e itens com drag & drop, autocomplete de produto, valor editável por linha,
  total por linha.
- **Serviços complementares** Som Ambiente e Wi-Fi Premium, com integração financeira.
- **Desconto** por valor ou percentual, com interpretação em tempo real.
- **Frete**.
- Informações comerciais: forma de pagamento, previsão de instalação, observações
  comerciais/técnicas, observações da proposta e internas.
- Revisões, duplicação, emissão, cancelamento com motivo, auditoria completa.
- Listagem com busca instantânea, ordenação, paginação, legenda de status.

### Documentos gerados (cinco artefatos, mesma proposta)

| Documento | Rota | Formato | Observação |
|---|---|---|---|
| **PDF Detalhado** | `GET /propostas/[id]/pdf` | PDF | documento comercial completo, com preços por item |
| **PDF Apresentação** | `GET /propostas/[id]/presentation` | PDF | landscape 16:9 (960×540pt), **13 templates** PNG 1920×1080 como plano de fundo; slides 09/10/11 são **condicionais** (Automação = 10 páginas · +Som = 12 · +Wi-Fi = 12 · ambos = 13). Bloqueado no modelo Simplificada |
| **Contrato** | `GET /propostas/[id]/contrato` | **.docx** | template oficial da Outmat preenchido via docxtemplater; editável no Word antes do envio |
| **Anexo Contratual** | `GET /propostas/[id]/contratual` | PDF | escopo aprovado sem preço por item (era o "PDF Contratual") |
| **Geral de Produtos** | `GET /propostas/[id]/produtos` | PDF | lista quantitativa de material, com o mesmo produto somado entre todas as Seções; **não emite** a proposta (Sprint 4.0.3) |

Arquitetura comum: loader único `getPropostaPdfData(id)` → `PropostaPdfDTO` → mapper
puro → renderer → Route Handler (`runtime = "nodejs"`, `force-dynamic`, `no-store`,
sem persistir arquivo em disco). Nenhum documento tem consulta ou regra paralela.

**Contrato .docx — pontos críticos do design:**

- Template oficial versionado em `public/templates/contrato/contrato-outmat.oficial.docx`;
  `scripts/marcar-template-contrato.mjs` converte `[PLACEHOLDER]` → `{tag}` e gera o
  template marcado, também commitado. O script **aborta se qualquer coisa fora do
  texto dentro de `<w:t>` (e do realce) mudar** — prova mecânica de que fonte,
  margens, cabeçalho, rodapé, espaçamentos, numeração e estilos ficam intactos.
- **Marcação seletiva, obrigatória:** o template usa `[MAIÚSCULAS ENTRE COLCHETES]` e
  `[Nº]` aparece 5× com 5 significados (prazo de início, prazo de conclusão, prazo de
  aceite, multa %, número da proposta). Usar `[` `]` como delimitadores emitiria
  "multa de 1042%". Só os campos que o sistema conhece viram `{tag}`; os demais
  permanecem literais e amarelos, para preenchimento manual no Word.
- Campos preenchidos: nome do cliente, CPF/CNPJ, endereço, nº da proposta, valor
  total, valor por extenso, forma de pagamento, data e nome da empresa.
- A qualificação da CONTRATADA (JVL Indústria e Comércio de Eletroeletrônicos LTDA)
  e a cidade do fecho são texto fixo do template — o sistema não interfere.
- Forma de pagamento vazia mantém o bloco de instrução do template como guia (único
  campo com fallback diferente de string vazia).
- Nome do download: `Contrato - Proposta {Nº} - {Nome Completo} Rev.{N}.docx`,
  `Content-Disposition: attachment`.

### Operacional

- `GET /api/health`, arquivo `VERSION`, página dev-only `/dev/diagnostics`.
- `print.css` com cânvas A4 (base de impressão preparada, preview HTML não implementado
  — foi substituído pelos PDFs).
- Scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:bootstrap`,
  `db:migrate:deploy`, `db:seed`, `db:validate`, `db:studio`, `db:up`/`db:down`.

---

## 7. Processo de trabalho

- Desenvolvimento por **Sprints numeradas**, cada uma com **gate de aprovação** antes
  de seguir.
- Toda decisão arquitetural vira um **ADR** em `DECISIONS.md` (~64 KB, numeração
  ADR-0001 → ADR-0330).
- Cada sprint tem **design** (`docs/superpowers/specs/`) e **plano de implementação**
  (`docs/superpowers/plans/`) escritos e aprovados antes do código.
- Gate obrigatório de release em `docs/CHECKLIST_RELEASE.md`, 13 itens: lint,
  typecheck, build, **unit (Vitest)**, smoke (Playwright), `/api/health`,
  `/dev/diagnostics`, PostgreSQL, Prisma, documentação, CHANGELOG, VERSION e
  commit. **Merge em `main` não é item do gate** — não há decisão que o torne
  obrigatório; a questão está registrada em `BACKLOG.md`.
- Alguns critérios são **gates manuais** e valem tanto quanto os automatizados.
  O vigente é a homologação visual do Contrato .docx no Word (ADR-0330).
- Histórico por sprint em `PROJECT_HISTORY.md`; mudanças em `CHANGELOG.md`
  (Keep a Changelog + SemVer); regras de negócio em `VISION.md`; melhorias futuras em
  `BACKLOG.md`.

### Histórico de sprints

| Sprint | Entrega |
|---|---|
| 0 | Fundação, arquitetura, layout, tema, schema estrutural |
| 1 | Cadastros base (Configuração, Clientes, Produtos, Vendedores) |
| 1.5 / 1.5.1 | Polimento, UX, smoke tests, `print.css`, processo de release |
| 2.1 | Fundação de Propostas (CRUD, numeração, revisões, status, auditoria) |
| 2.2 | Seções + produtos na revisão (workspace) |
| 2.3 | Serviços (Projeto de Automação) + total da linha |
| 2.4 | Ajustes funcionais + totais da proposta |
| 2.5 / 2.6 / 2.6.5 | Desconto · Frete · Finalização da proposta |
| 2.7 → 2.7.8 | Documento comercial em PDF + 4 rodadas de refinamento |
| 2.8 | Homologação final — **módulo de Propostas encerrado em 1.0.0** |
| 2.9.1 → 2.9.4 | Serviços complementares (Som/Wi-Fi) + integração financeira + refinos |
| 2.10.1 → 2.10.3 | PDF Detalhado · PDF Contratual · refinamentos |
| 3.0 | Fundação do PDF Apresentação |
| 3.1 (a) | Implementação do PDF Apresentação (templates gráficos) |
| 3.2.1 | Correção da build de produção no Windows Server |
| 3.1 (b) | **Documentação Contratual** — Contrato .docx + Anexo Contratual |

> ⚠️ **Duas armadilhas na numeração das Sprints.**
>
> 1. **O rótulo "Sprint 3.1" foi usado duas vezes** — 3.1 (a) é o PDF
>    Apresentação (ADR-0301) e 3.1 (b) é a Documentação Contratual (ADR-0330).
> 2. **A numeração não é cronológica.** As Sprints 3.0, 3.1 (a) e 3.2.1
>    aconteceram em 07–08/07, **antes** das 2.9.x e 2.10.x (08–13/07).
>
> Os **ADRs**, não os rótulos, são a referência estável. Nenhum ADR foi
> renumerado e o histórico Git não foi reescrito.

> **Lacuna documental conhecida:** as Sprints **2.9.x e 2.10.x não produziram
> ADR nem spec**. `DECISIONS.md` salta de ADR-0228 para ADR-0300. Sete ciclos —
> incluindo a criação da entidade `PropostaServico` com migration e a mudança da
> regra do desconto — estão documentados apenas nos corpos dos commits e no
> `PROJECT_HISTORY.md` reconstruído. Registrado em `BACKLOG.md`.

---

## 8. Estado atual e pendências

**Branch `sprint-3.1`, working tree limpo, não integrada à `main`.** Todos os
commits da Documentação Contratual estão feitos (rota, mapper, renderer, extenso,
template marcado, botões, ADR-0330, correção do realce amarelo).

**Resolvido na release 1.1.0** (ciclo exclusivamente documental/processual):

- `PROJECT_HISTORY.md` reconstruído — 16 ciclos, da Sprint 3.0 à 3.1 (b).
- `CHANGELOG.md` fechado como `[1.1.0]`, com todos os ciclos ausentes.
- Plano da Documentação Contratual auditado item a item (43 marcados, 7 não).
- `VERSION` e `package.json`: 1.0.0 → **1.1.0**.
- `CHECKLIST_RELEASE.md` passou a listar **Vitest** explicitamente no gate.
- `ARCHITECTURE.md` e `PROJECT_CONTEXT.md` atualizados.

Pendências que permanecem:

1. **Teste manual do contrato no Word** — comparação lado a lado com o template
   oficial, para uma proposta PF e uma PJ. **Gate manual obrigatório** pelo
   ADR-0330; sem evidência de conclusão. É o único bloqueio de release.
2. **Branch `sprint-3.1` não integrada.** Os 3 commits de design e plano **já
   estão** na `main` (`dd9bc5f`); os **10 commits de implementação** não. A `main`
   local também está 3 commits à frente de `origin/main`, não publicados.
3. **Smoke E2E acoplado ao catálogo.** Três ocorrências de `fill("RTR")` (linhas
   136, 149, 342) vêm do catálogo fictício do `prisma/seed.ts`. Desde `ee0db73`
   (10/07) o banco de dev é restaurado de `backup/db_outsystem.backup` — o
   catálogo **real** da Outmat, sem nenhum `RTR`. Débito preexistente, não
   regressão. A correção certa é desacoplar o teste do catálogo, **não** trocar
   por `"CM10"` (workaround). Ver `BACKLOG.md`.
4. **Sprints 2.9.x e 2.10.x sem ADR e sem spec.** `DECISIONS.md` salta de
   ADR-0228 para ADR-0300. Sete ciclos com nova entidade, migration e mudança de
   regra financeira documentados apenas em corpos de commit.
5. **PDF Apresentação:** os templates das páginas dinâmicas ainda contêm conteúdo
   de exemplo embutido. Ao receber as versões em branco, `coords.ts` pode precisar
   de ajuste fino.
6. **Rota de documento sem guard de proposta vazia:** `/contrato`, `/pdf` e
   `/presentation` respondem 200 com "R$ 0,00" para proposta sem itens acessada
   diretamente. A UI protege; a rota não. Comportamento herdado.
7. **`README.md` e `VISION.md` desatualizados** — item 10 do gate não fecha.
8. **`.env` usa o superusuário `postgres`**, contra o ADR-0101 e o comentário do
   próprio arquivo; `.env.development` e `.env.production` estão versionados com
   senha em texto claro.

---

## 9. Próximos planejamentos

### Definidos

O **módulo Comercial está encerrado** com a entrega do Contrato. Os próximos ciclos
são **operacionais** (registrado no ADR-0330):

1. **Pedido de Venda** — geração a partir da proposta emitida. Explicitamente fora do
   escopo da Sprint 3.1.
2. **Ordem de Serviço** — também fora do escopo da 3.1, citada como próximo ciclo.

Ambos ainda **não têm design nem plano escritos**. Pelo processo do projeto, cada um
exige spec aprovada antes de qualquer código.

### Previstos no roadmap original, ainda não feitos

- ~~**Dashboard e indicadores**~~ — **entregue na Sprint 4.0.3** (ADR-0405):
  indicadores comerciais e de instalações, custos acumulados e próximas
  instalações. Sem gráficos, por decisão de escopo da V1.
- **Tela "About"** — versão do sistema, build, última atualização, versão do banco,
  PostgreSQL, Prisma, Next.js, ambiente, health. Voltada ao usuário final, existiria
  também em produção (diferente da `/dev/diagnostics`). Pode reaproveitar
  `diagnostics.service.ts` + `VERSION` + versões do `package.json`.
- **Módulos adicionais da proposta comercial** além de Som e Wi-Fi — a arquitetura foi
  desenhada para aceitar novos módulos sem reestruturar tabelas.

### Backlog de melhorias (identificado em homologação, nada implementado)

**UX**
- Barra de ações fixa (sticky) no workspace da proposta — hoje é preciso rolar até o
  fim de propostas longas para salvar.
- Contraste do placeholder nos Selects do Radix no tema escuro (a regra global cobre
  `input`/`textarea`, mas não o Select).
- Recálculo do total do desconto em tempo real (a interpretação já é ao vivo, mas o
  total só recalcula no blur).

**PDF**
- Cabeçalho compacto a partir da página 2 (exige pré-carregar a imagem de outra forma
  — o `@react-pdf` não embute imagem dentro de `render`).
- Suporte a SVG/WebP no logo (hoje só PNG/JPG, limitação da lib; exigiria conversão
  no upload).
- Exibir o Nome do Projeto no PDF Detalhado (o campo existe na Proposta desde a 2.7.8).

**Dados / infra**
- Seed idempotente por entidade (hoje é global-idempotente, tudo-ou-nada).
- Guard 400 nas rotas de documento quando a proposta não tem itens.
- `connectionTimeoutMillis` no pool do adapter, para responder 503 rápido quando o
  PostgreSQL trava, em vez de pendurar as requisições.
- Paginação server-side (a avaliar, só se algum cadastro chegar a milhares de
  registros).
- Máscara/validação de CEP e busca automática por CEP (endereço é texto livre hoje).
- Ampliar a cobertura E2E além do smoke atual (navegação + CRUD básico de Clientes).
- Ambiente de dev: dois PostgreSQL disputando a porta 5432 (nativo + container
  `kanban-postgres`) adicionam ~6s de latência por consulta. Não é defeito do projeto.

### Ponto de reavaliação técnica

Quando o Next.js for atualizado, revisar se a *invariant* de prerender (bug E1068,
presente na 16.2.10) foi corrigida. Se sim, o `force-dynamic` do layout raiz pode ser
removido — validando `npm run build` em ambiente de 1 vCPU **antes** de reverter.

---

## 10. Restrições que qualquer proposta de mudança precisa respeitar

- **Ler o guia em `node_modules/next/dist/docs/` antes de escrever código.** Esta
  versão do Next tem breaking changes em relação ao conhecimento comum de treino: APIs,
  convenções e estrutura de arquivos podem divergir.
- Nunca tratar Seção como "Ambiente" (código, variáveis, comentários, textos).
- Nunca usar o `id` do banco como numeração comercial.
- Nunca recalcular o total nos documentos — sempre espelhar
  `calcularResumoFinanceiro().totalGeral`.
- Nunca alterar formatação do template de contrato: o sistema só substitui
  placeholders.
- Nunca criar caminho de arquivo fixo — tudo vem do `.env`.
- Componente não importa Prisma.
- Cada sprint exige design aprovado, plano escrito e gate de qualidade fechado.
