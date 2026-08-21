# Outmat Propostas

Sistema **interno** de geração de propostas comerciais da Outmat (Next.js 16 +
React 19 + Prisma 7 + PostgreSQL). Não é SaaS; uso restrito à empresa (rede
local/VPN); sem autenticação. Alvo de deploy: Windows Server 2019.

**Versão atual: 1.1.0** (ver [`VERSION`](./VERSION)) — o **módulo Comercial está
concluído**. Os próximos ciclos são operacionais (Pedido de Venda, Ordem de
Serviço) e ainda não têm design aprovado.

## Documentação

- **[docs/BRIEFING-PROJETO.md](./docs/BRIEFING-PROJETO.md)** — contexto consolidado (visão geral rápida).
- **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** — visão geral, stack, estado.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — camadas, banco e convenções.
- **[DECISIONS.md](./DECISIONS.md)** — decisões arquiteturais (ADRs).
- **[VISION.md](./VISION.md)** — regras de negócio.
- **[CHANGELOG.md](./CHANGELOG.md)** — histórico de versões.
- **[PROJECT_HISTORY.md](./PROJECT_HISTORY.md)** — histórico por Sprint.
- **[docs/CHECKLIST_RELEASE.md](./docs/CHECKLIST_RELEASE.md)** — gate de conclusão de Sprint.
- **[BACKLOG.md](./BACKLOG.md)** — melhorias e pendências conhecidas.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Linguagem | TypeScript strict |
| Estilo / UI | Tailwind CSS v4 + shadcn/ui (Radix) + Lucide |
| Formulários | React Hook Form + Zod |
| Tabelas · Drag & drop | TanStack Table · `@dnd-kit` |
| ORM / Banco | Prisma 7 (driver adapter Pg) + PostgreSQL |
| Dados UI→DB | Server Actions → `services/` → Prisma (`ActionResult`) |
| PDF · DOCX | `@react-pdf/renderer` · `docxtemplater` + `pizzip` + `extenso` |
| Testes | Vitest (unidade) + Playwright (smoke E2E) |

Fontes de sistema (Segoe UI), sem CDN — build e deploy funcionam offline.

## Módulos

- **Cadastros:** Configuração do Sistema (singleton, com upload de logo),
  Clientes (PF/PJ), Produtos e Vendedores — CRUD completo, com inativação e
  bloqueio de exclusão para registros já usados em proposta. Produtos têm **SKU
  único** e ação **Clonar**.
- **Propostas (workspace):** tela única para criar, editar e revisar. Cabeçalho +
  seções + itens editados em memória e persistidos em **"Salvar Alterações"** /
  **"Criar Proposta"**. Itens reordenáveis por **drag & drop**; cada item carrega
  valor de produto + valor de serviço, com total por linha. **Desconto** (valor ou
  percentual) e **frete**, consolidados no **Resumo Financeiro**. Emissão congela
  a revisão; alterar depois cria a **revisão seguinte** automaticamente.
  Duplicação, cancelamento com motivo e auditoria. Status:
  Rascunho / Emitida / Cancelada. Modelos **Comercial** e **Simplificada**.
- **Serviços complementares:** Projeto **Som Ambiente** e Projeto **Wi-Fi
  Premium**, no máximo um de cada por proposta, integrados ao Resumo Financeiro.
  Não existem no modelo Simplificada.
- **Dev:** `/api/health` e `/dev/diagnostics` (somente desenvolvimento).

## Documentos da proposta

A mesma proposta gera cinco documentos, todos sob demanda e sem gravar arquivo
em disco. Todos consomem o **mesmo carregador de dados**; os comerciais usam o
**mesmo total oficial** e nenhum recalcula valores.

| Documento | Rota | Formato |
| --- | --- | --- |
| **PDF Detalhado** | `/propostas/[id]/pdf` | PDF — documento comercial completo, com preços |
| **PDF Apresentação** | `/propostas/[id]/presentation` | PDF — institucional, landscape 16:9, slides condicionais |
| **Contrato** | `/propostas/[id]/contrato` | **.docx** — jurídico, editável no Word antes do envio |
| **Anexo Contratual** | `/propostas/[id]/contratual` | PDF — escopo aprovado, sem preço por item |
| **Geral de Produtos** | `/propostas/[id]/produtos` | PDF — lista de material, produtos somados entre as Seções, sem valores; **não emite** a proposta |

O Contrato é preenchido a partir do template oficial versionado em
`public/templates/contrato/`. **O template nunca é alterado pelo sistema** — só
os placeholders são substituídos, e os campos que o sistema não conhece
permanecem realçados para preenchimento manual no Word.

---

# 🛠️ DESENVOLVIMENTO (Windows)

## Requisitos

- **Node.js 20.9+**
- **PostgreSQL nativo** (banco oficial do projeto). Docker é apenas alternativa
  opcional (ver o fim deste documento).

## 1. PostgreSQL nativo

Use um **usuário dedicado** da aplicação (`outmat`) — nunca o superusuário
`postgres`. Com o `postgres` (superusuário), rode o bootstrap uma única vez:

```bash
# psql precisa estar no PATH (ou use o caminho completo da instalação, ex.:
# "C:\Program Files\PostgreSQL\18\bin\psql.exe")
npm run db:bootstrap
# equivale a: psql -U postgres -h localhost -p 5432 -f scripts/db/bootstrap.sql
```

Isso cria o papel `outmat` (senha `outmat123`) e o banco `outmat_propostas`.

## 2. Configuração (.env)

A aplicação e o Prisma sempre leem a `DATABASE_URL` do `.env` (já configurada):

```
DATABASE_URL="postgresql://outmat:outmat123@localhost:5432/outmat_propostas?schema=public"
```

Arquivos de referência: `.env.example`, `.env.development`, `.env.production`.

> ⚠️ **O `.env` versionado hoje diverge desta instrução:** aponta para o banco
> `db_outsystem` com o superusuário `postgres`. É uma pendência registrada no
> [BACKLOG](./BACKLOG.md) — a configuração correta é a acima, com o usuário
> dedicado `outmat`.

## 3. Instalar, migrar, semear e rodar

```bash
npm install         # instala deps + gera o Prisma Client (postinstall)
npm run db:setup    # migrate deploy + seed (dados de exemplo)
npm run dev         # http://localhost:3000
```

## Build

```bash
npm run build       # build de produção (Turbopack)
npm run start       # serve o build em produção
```

## Antes de concluir uma Sprint

O projeto tem um **gate obrigatório** em
[docs/CHECKLIST_RELEASE.md](./docs/CHECKLIST_RELEASE.md). Na ordem:

```bash
npm run lint
npm run typecheck
npm run build
npm run test              # Vitest — unidade, sem banco
npm run test:integration  # Vitest — service contra o PostgreSQL real
npm run test:e2e          # Playwright — ponta a ponta
```

Mais `/api/health`, `/dev/diagnostics`, documentação, CHANGELOG, VERSION e
commit. Se algum item falhar, a Sprint **não** está concluída.

> **São três suítes, e as três são obrigatórias.** `npm run test` cobre regras
> puras e não toca o banco — é o que a mantém rápida e executável em qualquer
> máquina. `npm run test:integration` valida invariantes de domínio/persistência
> contra o PostgreSQL real: coisas que não pertencem à suíte unitária (um Prisma
> mockado provaria só que o mock foi chamado) nem dependem da UI. `npm run test`
> **não** executa a de integração — rode os dois.

> Os smoke tests **escrevem no banco** e rodam em série. Cada cenário cria os
> próprios dados (cliente e produto com identificador único, prefixados por
> `E2E`) — nenhum teste depende do conteúdo do catálogo. Feche qualquer processo
> `node` ocupando a porta 3000 antes de rodar.

## Scripts

| Script                      | Descrição                                     |
| --------------------------- | --------------------------------------------- |
| `npm run dev`               | Desenvolvimento                               |
| `npm run build`             | Build de produção                             |
| `npm run start`             | Servidor de produção                          |
| `npm run lint`              | ESLint                                        |
| `npm run typecheck`         | Verificação de tipos (tsc)                    |
| `npm run test`              | Testes de unidade (Vitest) — puros, sem banco  |
| `npm run test:integration`  | Testes de service contra o PostgreSQL real     |
| `npm run test:e2e`          | Smoke tests (Playwright) — sobe a app sozinho |
| `npm run test:e2e:ui`       | Smoke tests em modo interativo                |
| `npm run db:generate`       | Gera o Prisma Client                          |
| `npm run db:bootstrap`      | Cria usuário `outmat` + banco (requer postgres) |
| `npm run db:migrate:deploy` | Aplica migrations                             |
| `npm run db:seed`           | Popula dados de exemplo                       |
| `npm run db:setup`          | migrate deploy + seed                         |
| `npm run db:validate`       | Valida o CRUD contra o PostgreSQL real        |
| `npm run db:studio`         | Prisma Studio                                 |

## Saúde da aplicação

`GET /api/health` → `200 { status: "ok" }` (app + banco) ou `503` se o banco
estiver indisponível.

## Diagnóstico (apenas desenvolvimento)

`/dev/diagnostics` mostra tempo de conexão/consulta ao banco, versão do
PostgreSQL, ambiente, status do Prisma e tempo de resposta. **Não existe em
produção** (retorna 404). Útil para identificar problemas de infraestrutura
rapidamente.

## Logs

Logging via abstração `Logger` (`src/infrastructure/logging`), nunca `console`
direto. Destino de arquivos configurável por `LOG_PATH` no `.env`.

---

# 🚀 PUBLICAÇÃO (Windows Server 2019)

Ambiente oficial: **PostgreSQL nativo** no servidor. Caminhos de arquivo são
**configuráveis** via `.env` (nunca fixos). Fontes de sistema (sem CDN).

## Configuração do servidor

1. Instalar **Node.js 20.9+** e **PostgreSQL** no servidor.
2. Criar o banco/usuário dedicados (ajuste a senha para produção):
   `psql -U postgres -f scripts/db/bootstrap.sql` (ou crie manualmente o papel
   `outmat` e o banco `outmat_propostas`).
3. Preencher o `.env` de produção a partir de `.env.production`:
   - `DATABASE_URL` com host/usuário/senha reais do servidor.
   - Caminhos absolutos (ex.: `STORAGE_PATH="D:\\OutmatPropostas\\storage"`).
   - `NODE_ENV="production"`.

## Deploy

```bash
npm ci                       # instala deps (gera Prisma Client no postinstall)
npm run build                # build de produção
npm run db:migrate:deploy    # aplica as migrations no banco do servidor
# (opcional na 1ª carga) npm run db:seed
npm run start                # inicia a aplicação (porta padrão 3000)
```

Recomenda-se manter o processo ativo com um gerenciador de serviço do Windows
(ex.: NSSM) ou uma tarefa que execute `npm run start`.

## Atualização (nova versão)

```bash
git pull                     # ou copiar a nova versão para o servidor
npm ci
npm run build
npm run db:migrate:deploy    # aplica novas migrations, se houver
# reiniciar o serviço/processo da aplicação
```

## Backup

Backup lógico do banco (agende diariamente):

```bash
pg_dump -U outmat -h localhost -p 5432 -F c outmat_propostas > backup_outmat.dump
```

Inclua também o diretório de `STORAGE_PATH` (arquivos) no backup.

## Restore

```bash
# banco vazio outmat_propostas já existente (ver bootstrap)
pg_restore -U outmat -h localhost -p 5432 -d outmat_propostas --clean backup_outmat.dump
```

Restaure o diretório de `STORAGE_PATH` correspondente ao mesmo ponto no tempo.

---

## Docker (alternativa opcional)

Para quem prefere um ambiente **isolado** em desenvolvimento, há um
`docker-compose.yml` (PostgreSQL 17): `npm run db:up` / `npm run db:down`.
Ajuste a `DATABASE_URL` conforme o usuário/porta do container. **O ambiente
oficial do projeto é o PostgreSQL nativo.**
