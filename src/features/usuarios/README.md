# features/usuarios

Cadastro único de **Usuários** com papéis operacionais (Sprint 4.2, ADR-0410).

Substitui `features/vendedores` e `features/tecnicos`, que representavam a mesma
pessoa em dois cadastros separados.

## O que é

Uma pessoa que atua na operação, com **dois papéis independentes**:

| Campo | Significado |
| --- | --- |
| `ativo` | a pessoa ainda atua na empresa |
| `ehVendedor` | aparece como opção de Vendedor nas Propostas |
| `ehTecnico` | aparece como opção de Técnico nas Instalações e na cronologia |

Os dois eixos são independentes. A mesma pessoa pode ser vendedora, técnica,
**ambas**, ou nenhuma — e um usuário sem papel nenhum é válido: é o cadastro
criado antes de a função ser decidida. Ele simplesmente não aparece em select
nenhum.

## O que NÃO é

**Não é principal de autenticação.** Não há login, senha, permissão, sessão nem
agenda. Estes vínculos respondem **quem fez o trabalho**, não quem operou o
sistema. Quando o sistema ganhar autenticação, "registrado por" será campo novo
e aditivo, distinto de `vendedorId`/`tecnicoId` (ADR-0408, reafirmado no 0410).

## Arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `opcoes.ts` | **Módulo PURO** — disponibilidade por papel e rótulo da opção. Sem Prisma, sem IO, sem React. |
| `schema.ts` | Zod — fonte única de validação (RHF + Server Action). |
| `actions.ts` | Server Actions do CRUD. |
| `usuario-form.tsx` | Formulário via `CrudFormShell`. |
| `usuarios-list.tsx` | Listagem via `CrudListView`. |
| `usuario-select-field.tsx` | Select de um papel — usado por Propostas e Instalações. |

O IO fica em `src/services/usuario.service.ts`. Mesmo par service/módulo-puro de
`dashboard.service` ↔ `features/dashboard/dashboard.ts`.

## A regra dos selects

`listUsuarioOptions(papel, incluirIds)` devolve **disponíveis ∪ os ids
informados**:

- **disponível** = `ativo && ehPapel` — quem pode ser escolhido para um vínculo
  **novo**;
- **`incluirIds`** = quem já está vinculado àquele agregado, ainda que
  indisponível.

Sem essa união, abrir uma proposta cujo vendedor foi inativado mostraria o campo
em branco, e salvar qualquer outra alteração apagaria o vínculo em silêncio.

Há **duas** causas de indisponibilidade, e o rótulo distingue, porque a ação
corretiva é diferente:

```
Carlos Gomes                        ← disponível
João (inativo)                      ← ativo === false
Marcos (sem papel de vendedor)      ← ativo, mas ehVendedor === false
```

Um único sufixo, nunca dois: quando as duas condições valem, vence `(inativo)`.

## Guarda de papel

Escolher alguém sem o papel é recusado **no service**, não só na tela. Mas a
verificação só age na mudança:

```
vínculo NOVO ou ALTERADO        → exige ativo && ehPapel; senão, erro
vínculo PREEXISTENTE inalterado → aceito sempre
vínculo removido (→ null)       → aceito sempre
```

É isso que permite exigir o papel sem quebrar o histórico. `assertPapel` vive no
service e recebe o `tx` de quem chama, para que verificação e escrita enxerguem
o mesmo estado.

## Busca

Nada próprio. `CrudListView`/`useCrudList` consomem `contemBusca` de
`@/utils/busca` (ADR-0402) — case- e accent-insensitive. **Não** escrever
`.normalize()` aqui.
