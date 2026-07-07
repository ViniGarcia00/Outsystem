# Features (Feature-First)

Cada feature é **auto-contida** e representa um domínio da aplicação.

## Estrutura real (a partir da Sprint 1)

```
features/<dominio>/
  schema.ts             # validação Zod (fonte única: RHF + Server Action)
  actions.ts            # Server Actions ("use server") → services
  <dominio>-form.tsx    # formulário (client) — usa CrudFormShell
  <dominio>s-list.tsx   # listagem (client) — usa CrudListView
  index.ts              # API pública da feature (barrel)
```

Os **services** (acesso a dados via Prisma) ficam centralizados em
`src/services/<dominio>.service.ts` — as features os consomem através das
Server Actions.

## Regras de arquitetura

- A camada `app/` compõe telas a partir das features — **não** contém lógica.
- Componentes **não** acessam o Prisma diretamente: sempre via `services`.
- A feature expõe apenas o necessário pelo `index.ts` (encapsulamento).
- Dependências apontam para dentro: `app → features → services → infrastructure`.

## Estado atual

- Implementadas (Sprint 1): `clientes/`, `produtos/`, `vendedores/`,
  `configuracoes/`.
- Placeholder (próximas Sprints): `dashboard/`, `propostas/`.
