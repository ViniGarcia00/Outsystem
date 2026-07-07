# Feature: clientes

CRUD de clientes (Sprint 1).

- `schema.ts` — Zod: PF exige `nome`, PJ exige `empresa`; `cpfCnpj` opcional,
  validado e único.
- `actions.ts` — Server Actions (list/create/update/delete/toggle ativo).
- `cliente-form.tsx` — formulário (create/edit) via `CrudFormShell`.
- `clientes-list.tsx` — listagem via `CrudListView`.

Service: `src/services/cliente.service.ts` (inclui a regra de exclusão por uso
em propostas).
