# Feature: produtos

CRUD de produtos (Sprint 1).

- `schema.ts` — Zod: `codigo` e `descricao` obrigatórios (`codigo` único);
  `valorProduto`/`valorServico` monetários ≥ 0 (serviço pode ser 0).
- `actions.ts` — Server Actions (list/create/update/delete/toggle ativo).
- `produto-form.tsx` — formulário via `CrudFormShell`.
- `produtos-list.tsx` — listagem via `CrudListView`.

Service: `src/services/produto.service.ts`. Sprint 1: produto sem relação com
proposta → exclusão sempre permitida (ver DECISIONS.md ADR-0104).
