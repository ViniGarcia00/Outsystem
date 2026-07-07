# Outmat Propostas

Sistema **interno** de geração de propostas da Outmat (Next.js 16 + Prisma 7 +
PostgreSQL). Não é SaaS; uso restrito à empresa (rede local/VPN); sem
autenticação na v1. Versão atual em [`VERSION`](./VERSION).

## Documentação

- **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** — visão geral, stack, estado.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — camadas, banco e convenções.
- **[DECISIONS.md](./DECISIONS.md)** — decisões arquiteturais (ADRs).
- **[VISION.md](./VISION.md)** — regras de negócio.
- **[CHANGELOG.md](./CHANGELOG.md)** — histórico de versões.
- **[PROJECT_HISTORY.md](./PROJECT_HISTORY.md)** — histórico por Sprint.
- **[docs/CHECKLIST_RELEASE.md](./docs/CHECKLIST_RELEASE.md)** — gate de conclusão de Sprint.
- **[BACKLOG.md](./BACKLOG.md)** — próximas Sprints.

## Módulos

- **Cadastros:** Configuração do Sistema, Clientes, Produtos, Vendedores (CRUD
  completo).
- **Propostas (workspace):** tela única para criar/editar/revisar; cabeçalho +
  seções + produtos, editados em memória e persistidos em **"Salvar Alterações"**/
  **"Criar Proposta"**; cada produto carrega **valor de produto + valor de
  serviço** (editáveis na proposta) com **totais por linha**; **"Gerar PDF"** emite
  e congela a revisão; **revisão automática** no salvamento após emitida;
  duplicação, cancelamento e auditoria. Status: Rascunho/Emitida/Cancelada.
  **Sem** totais/descontos/frete/PDF binário ainda (próximas Sprints).
- **Dev:** `/api/health` e `/dev/diagnostics` (somente desenvolvimento).

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

## Scripts

| Script                      | Descrição                                     |
| --------------------------- | --------------------------------------------- |
| `npm run dev`               | Desenvolvimento                               |
| `npm run build`             | Build de produção                             |
| `npm run start`             | Servidor de produção                          |
| `npm run lint`              | ESLint                                        |
| `npm run typecheck`         | Verificação de tipos (tsc)                    |
| `npm run test`              | Testes de unidade (Vitest)                    |
| `npm run test:e2e`          | Smoke tests (Playwright) — sobe a app sozinho |
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
