# Feature: tecnicos

CRUD de técnicos (Sprint 4.1, ADR-0408).

- `schema.ts` — Zod: `nome` obrigatório, `ativo` booleano. **Só isso na V1.**
- `actions.ts` — Server Actions (list/create/update/delete/toggle ativo).
- `tecnico-form.tsx` — formulário via `CrudFormShell`.
- `tecnicos-list.tsx` — listagem via `CrudListView`.

Service: `src/services/tecnico.service.ts` (inclui a regra de exclusão por uso
em instalações e `listTecnicoOptions`, que devolve os ativos mais os técnicos já
vinculados, mesmo inativos).

Técnico **não** é Vendedor e **não** é Usuário — ver ADR-0408.
