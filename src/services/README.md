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

## Integridade de agregado (pai → filho)

Quando um service opera sobre um **filho** a partir de um id de **pai** recebido
do chamador, a consulta deve ser condicionada aos DOIS ids. Vale hoje para
`instalacao-registro.service.ts`:

```ts
// Correto — o registro só é encontrado dentro da instalação informada.
await tx.instalacaoRegistro.findFirst({ where: { id, instalacaoId } });

// Errado — confia que o instalacaoId recebido corresponde ao registro.
await tx.instalacaoRegistro.findUnique({ where: { id } });
```

Não pertencer devolve a **mesma** mensagem de "não encontrado" que um id
inexistente: dizer de qual agregado o registro é vazaria informação entre
agregados vizinhos.

A garantia mora aqui, nunca na Server Action nem na tela. A interface pode mandar
o par certo — integridade não pode depender disso.
