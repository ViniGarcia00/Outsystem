# Services (camada de aplicação)

Orquestração de casos de uso. É a **única** camada autorizada a acessar a
infraestrutura (Prisma, storage, logging). Componentes e páginas dependem de
services — nunca do Prisma diretamente.

```
app/ → features/ → services/ → infrastructure/
```

## Estado atual (Sprint 1)

Services implementados por domínio:

- `configuracao.service.ts` — singleton (get/upsert).
- `cliente.service.ts` — CRUD + regra de exclusão por uso em propostas.
- `produto.service.ts` — CRUD (sem relação com proposta na Sprint 1).
- `vendedor.service.ts` — CRUD + regra de exclusão por uso em propostas.

As **Server Actions** (em `features/*/actions.ts`) chamam estes services e
padronizam o retorno como `ActionResult<T>` (ver `src/types`). Os services em si
retornam dados/DTOs e lançam erros de domínio (tratados na fronteira da action).
