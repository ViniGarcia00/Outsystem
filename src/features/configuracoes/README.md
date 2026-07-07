# Feature: configuracoes

Configuração do Sistema — registro único (singleton) (Sprint 1).

- `schema.ts` — Zod: todos os campos opcionais; `email` validado quando informado.
- `actions.ts` — Server Action de salvar (upsert do singleton).
- `configuracao-form.tsx` — formulário via `CrudFormShell` (sem listagem).

Service: `src/services/configuracao.service.ts`. Nesta versão, `logo` é apenas
texto/URL (upload adiado — ver DECISIONS.md ADR-0105).
