# Feature: vendedores

CRUD de vendedores (Sprint 1).

- `schema.ts` — Zod: `nome` obrigatório; `telefone`/`email` opcionais.
- `actions.ts` — Server Actions (list/create/update/delete/toggle ativo).
- `vendedor-form.tsx` — formulário via `CrudFormShell`.
- `vendedores-list.tsx` — listagem via `CrudListView`.

Service: `src/services/vendedor.service.ts` (inclui a regra de exclusão por uso
em propostas).
