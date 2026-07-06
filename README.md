# Outmat Propostas

Sistema **interno** de geração de propostas da Outmat (Next.js 16 + PostgreSQL).

## Documentação

- **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** — visão geral, stack, decisões.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — camadas, banco e convenções.
- **[VISION.md](./VISION.md)** — regras de negócio.
- **[CHANGELOG.md](./CHANGELOG.md)** — histórico de versões.
- **[BACKLOG.md](./BACKLOG.md)** — backlog das próximas Sprints.

## Requisitos

- Node.js 20+
- PostgreSQL (para migrations/seed/execução com dados)

## Setup

```bash
npm install                 # instala deps e gera o Prisma Client (postinstall)
cp .env.example .env        # ajuste DATABASE_URL e caminhos de storage
npm run db:migrate:deploy   # aplica a migration inicial (requer PostgreSQL)
npm run db:seed             # popula dados fictícios de teste (opcional)
npm run dev                 # http://localhost:3000
```

## Scripts principais

| Script                      | Descrição                          |
| --------------------------- | ---------------------------------- |
| `npm run dev`               | Desenvolvimento                    |
| `npm run build`             | Build de produção                  |
| `npm run lint`              | ESLint                             |
| `npm run test`              | Testes (Vitest)                    |
| `npm run db:migrate:deploy` | Aplica migrations                  |
| `npm run db:seed`           | Seed de dados fictícios            |

## Deploy

Alvo: **Windows Server 2019**. Todos os caminhos de arquivo são configuráveis
via `.env` (nunca fixos). Fontes de sistema (sem dependência de CDN).
