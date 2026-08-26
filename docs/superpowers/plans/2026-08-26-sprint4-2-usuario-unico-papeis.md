# Sprint 4.2 — Usuário único com papéis operacionais — Plano de Implementação

> **Para executores:** use `superpowers:subagent-driven-development` (recomendado)
> ou `superpowers:executing-plans` para executar task a task. Os passos usam
> checkbox (`- [ ]`).

**Goal:** Substituir os cadastros de Vendedores e Técnicos por um cadastro único
de Usuários com papéis independentes (`ehVendedor`, `ehTecnico`), migrando todos
os dados e vínculos sem perda, e remover "Custos acumulados" do Dashboard.

**Architecture:** `Usuario` é identidade única com dois papéis booleanos
independentes. As colunas de FK mantêm os nomes atuais (`vendedorId`,
`tecnicoResponsavelId`, `tecnicoId`) porque nomeiam o *papel no vínculo*, não a
tabela de origem — isso mantém intactos o DTO do PDF, os schemas Zod e as props
de UI. A migração preserva o **id de origem** como `usuarios.id`, o que torna o
repontamento das FKs uma troca de alvo sem reescrever um único valor.

**Tech Stack:** Next.js 16.2.10, React 19.2.4, Prisma 7.8 (PostgreSQL 18), Zod 4,
React Hook Form, shadcn/radix, Vitest (unidade + integração), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-08-26-usuario-unico-papeis-design.md`
(aprovada, commit `9cc8fb9`)

---

## Global Constraints

Valem para **todas** as tasks. Copiadas da spec e do `AGENTS.md`.

- **Next.js 16.2.10 não é o Next.js de treinamento.** Ler o guia relevante em
  `node_modules/next/dist/docs/` antes de escrever código de framework.
- **Componentes nunca importam Prisma.** UI consome Server Actions; Server
  Actions consomem services; só services tocam `@/infrastructure/database`.
- **Clean Architecture + Feature-First.** Feature nova segue o molde de
  `features/vendedores/` (schema, actions, form, list, index, README).
- **Número comercial nunca usa DB id.** `proposalNumber` e `Instalacao.numero`
  são sequências. O `id` (cuid/uuid) nunca é exibido.
- **Seção continua Seção**, nunca "Ambiente".
- **Nenhuma mudança de contrato.** `proposta-pdf.mapper.ts` (`consultor`) e o
  resumo financeiro oficial não mudam uma linha.
- **Busca:** usar `contemBusca`/`normalizarBusca` de `@/utils/busca` (ADR-0402).
  Nunca escrever `.normalize()` novo em componente, hook ou service.
- **Monetário é `Decimal`, nunca `Float`.**
- **ADR-0409 — três suítes separadas e todas obrigatórias:** `npm run test`
  (puro, sem banco), `npm run test:integration` (`src/**/*.integration.test.ts`,
  PostgreSQL real), `npm run test:e2e` (Playwright).
- **Dados de teste marcados com `E2E `** — o marcador que o `globalTeardown`
  varre. Vale para E2E e para integração.
- **TDD.** Teste que falha → implementação mínima → teste que passa → commit.
- **Não iniciar Pedido de Venda nem Ordem de Serviço.** Fora de escopo.
- **Não mexer em Next.js nem em dependências** sem necessidade comprovada.
- **Versão de saída: 1.5.0.**

---

## ⚠️ Refinamentos que exigem aprovação antes da Task 4

A auditoria técnica feita para escrever este plano encontrou três pontos que
**melhoram** o desenho aprovado. Os três desviam da letra da spec e estão
isolados aqui para decisão explícita. **As Tasks 4–6 assumem os três aprovados.**

### R1 — `usuarios.id` preserva o id do cadastro de origem

**A spec (§6.2) diz** `gen_random_uuid()::text` para o id do novo `Usuario`, com
colunas temporárias (`usuarioVendedorId` etc.), backfill por join e guarda.

**O plano propõe** que `usuarios.id` receba o **id do cadastro de origem** —
`vendedores.id` ou `tecnicos.id`, ambos `TEXT`.

**Por quê.** Os valores hoje gravados em `propostas.vendedorId`,
`instalacoes.tecnicoResponsavelId` e `instalacao_registros.tecnicoId` **já são**
os ids corretos. Preservando-os, o repontamento vira troca do alvo da FK, e
**nenhum valor de vínculo é reescrito em lugar nenhum**. "Nenhum vínculo
perdido" deixa de depender de uma guarda e passa a ser estruturalmente
impossível de violar.

Some as três colunas temporárias, o backfill por join, o `RENAME COLUMN` e a
guarda de completude. A migração encolhe e fica mais fácil de revisar.

**Verificado contra o banco real:** `vendedores.id` tem 25 caracteres (cuid),
`tecnicos.id` tem 36 (uuid) — **zero colisões** (`INTERSECT` retorna 0 linhas).
Precedente no próprio projeto: as linhas de `tecnicos` já têm uuid gerado por
migration enquanto o model declara `@default(cuid())`; o default só vale para
linhas novas.

### R2 — M1 não funde nada por nome; toda fusão é humana (M4)

**A spec (§6.2, passo 2) diz** que a M2 cria um Usuario por técnico "cuja chave
normalizada não coincida com a de nenhum vendedor", ligando `ehTecnico = true`
no existente quando coincidir.

**O plano propõe** que a M1 crie **um Usuario por cadastro de origem, sempre**,
sem nenhuma comparação de nome. Toda consolidação passa a ser exclusivamente a
M4, humana e explícita.

**Por quê.** É o que você pediu na observação sobre a M4, levado à sua
consequência: com R2, **as migrations estruturais não contêm uma única linha de
lógica baseada em nome** — nada de `lower()`, `LIKE`, `btrim` ou chave
normalizada. Um revisor confirma isso com um `grep`. A regra da spec ("cada
grafia distinta vira um cadastro distinto, visível na tela, onde uma PESSOA
decide se funde") deixa de ter exceção.

Nos dados reais o resultado é idêntico: as três chaves já são distintas, então a
regra da spec nunca dispararia. R2 remove código que, neste banco, nunca
executaria — e que em outro banco tomaria uma decisão de negócio sozinho.

**Efeito colateral necessário:** com R1, fundir na migration estrutural seria
descartar o id do absorvido e quebrar suas FKs. R2 elimina o problema pela raiz.

### R3 — `propostas.vendedorId` passa de `ON DELETE SET NULL` para `RESTRICT`

**Achado não previsto na spec.** As três FKs divergem hoje:

| Constraint | ON DELETE |
|---|---|
| `propostas_vendedorId_fkey` | **SET NULL** |
| `instalacoes_tecnicoResponsavelId_fkey` | RESTRICT |
| `instalacao_registros_tecnicoId_fkey` | RESTRICT |

Apagar um vendedor por qualquer caminho que não passe por `removeVendedor()`
**zera silenciosamente** `Proposta.vendedorId` — perda de vínculo histórico, o
oposto do §3 do pedido. Hoje a única proteção é a contagem na aplicação.

**O plano propõe** `RESTRICT` nas três, já que a M2 reescreve as três
constraints de qualquer forma. Custo zero, e alinha o banco à regra que a
aplicação já afirma.

**Se você recusar R3**, a Task 5 mantém `SET NULL` em `propostas` e a Task 22
registra o desvio no `BACKLOG.md`. Nada mais muda.

---

## Estrutura de arquivos

**Criar**

| Arquivo | Responsabilidade |
|---|---|
| `prisma/migrations/20260826000000_usuarios_estrutura/migration.sql` | M1 — cria `usuarios` e popula preservando ids |
| `prisma/migrations/20260826010000_usuarios_vinculos/migration.sql` | M2 — reaponta as três FKs, com guardas |
| `prisma/migrations/20260826020000_usuarios_drop_legado/migration.sql` | M3 — `DROP TABLE vendedores, tecnicos` |
| `prisma/migrations/20260826030000_usuarios_consolidacao_outmat/migration.sql` | M4 — consolidação humana, defensiva |
| `scripts/db/audit-usuarios.ts` | Auditoria pré/pós — contagens e vínculos |
| `src/features/usuarios/schema.ts` + `.test.ts` | Zod do formulário |
| `src/features/usuarios/opcoes.ts` + `.test.ts` | Módulo **puro**: rótulo e disponibilidade por papel |
| `src/features/usuarios/actions.ts` | Server Actions do CRUD |
| `src/features/usuarios/usuario-form.tsx` | Formulário via `CrudFormShell` |
| `src/features/usuarios/usuarios-list.tsx` | Listagem via `CrudListView` |
| `src/features/usuarios/usuario-select-field.tsx` | Select de papel (substitui `tecnico-select-field.tsx`) |
| `src/features/usuarios/index.ts`, `README.md` | Barrel e documentação da feature |
| `src/services/usuario.service.ts` | IO do cadastro + `listUsuarioOptions` + `assertPapel` |
| `src/services/usuario.service.integration.test.ts` | Casos 1, 2, 6, 7, 10 da spec §10.2 |
| `src/app/usuarios/page.tsx`, `novo/page.tsx`, `[id]/page.tsx` | Rotas |
| `e2e/usuarios.spec.ts` | E2E do cadastro e dos dois fluxos |
| `DECISIONS.md` → ADR-0410 | Decisão arquitetural |

**Alterar:** `prisma/schema.prisma`, `prisma/seed.ts`, `scripts/db/validate-crud.ts`,
`src/lib/messages.ts`, `src/lib/navigation.ts` + `.test.ts`,
`src/services/proposta.service.ts`, `src/services/instalacao.service.ts`,
`src/services/instalacao-registro.service.ts`, `src/services/dashboard.service.ts`,
`src/services/instalacao-registro.integration.test.ts`,
`src/features/dashboard/dashboard.ts` + `dashboard-view.tsx` + `dashboard.test.ts`,
`src/features/instalacoes/index.ts` + `nova-instalacao-form.tsx` + `instalacao-workspace.tsx` + `registro-dialog.tsx`,
`src/app/propostas/nova/page.tsx`, `src/app/propostas/[id]/page.tsx`,
`src/app/instalacoes/nova/page.tsx`, `src/app/instalacoes/[id]/page.tsx`,
`e2e/support/limpeza.ts`, `e2e/instalacoes.spec.ts`, `e2e/dashboard.spec.ts`,
`e2e/smoke.spec.ts`, `ARCHITECTURE.md`, `CHANGELOG.md`, `BACKLOG.md`,
`PROJECT_HISTORY.md`, `docs/CHECKLIST_RELEASE.md`, `VERSION`, `package.json`.

**Remover:** `src/features/vendedores/` (6 arquivos), `src/features/tecnicos/`
(7 arquivos), `src/features/instalacoes/tecnico-select-field.tsx`,
`src/services/vendedor.service.ts`, `src/services/tecnico.service.ts`,
`src/app/vendedores/` (3 rotas), `src/app/tecnicos/` (3 rotas),
`e2e/tecnicos.spec.ts`.

---

## Task 1 — ADR-0410 e abertura da Sprint

**Files:**
- Modify: `DECISIONS.md` (append após o ADR-0409, ~linha 1660)
- Modify: `PROJECT_HISTORY.md` (abrir a seção da Sprint 4.2)

**Interfaces:**
- Consumes: nada
- Produces: o número `ADR-0410`, referenciado em comentário por todas as tasks
  seguintes

- [ ] **Step 1: Confirmar que 0410 é o próximo número livre**

```bash
grep -o "ADR-04[0-9][0-9]" DECISIONS.md | sort -u | tail -3
```

Esperado: `ADR-0407`, `ADR-0408`, `ADR-0409`. Se aparecer `ADR-0410`, **pare** e
reporte — a numeração mudou desde o desenho.

- [ ] **Step 2: Escrever o ADR-0410**

Acrescentar ao fim de `DECISIONS.md`, sob um cabeçalho de Sprint novo
(`## Sprint 4.2 — Usuário único com papéis operacionais`), seguindo a estrutura
de bullets do ADR-0408. Cobrir, cada um em seu bullet:

1. **Contexto e supersede parcial do ADR-0408.** Citar textualmente os dois
   bullets superados ("*Vendedor continua não sendo reutilizado*" e "*Técnico
   não é Usuário*") e responder ponto a ponto: o argumento do autocomplete
   poluído era correto **para um cadastro sem papéis**, e é resolvido pelo
   filtro por `ehVendedor`/`ehTecnico`; a regra de exclusão deixa de ser vazia
   porque passa a contar os três vínculos. Deixar explícito que **todo o resto**
   do ADR-0408 continua valendo integralmente — em especial a regra do snapshot
   `responsavelNome`.
2. **`Usuario` não é principal de autenticação.** Sem login, senha, permissão ou
   agenda. Quando houver autenticação, "registrado por" continua sendo campo
   novo e aditivo, distinto de `vendedorId`/`tecnicoId`. Registrar o risco de
   colisão de nome como aceito conscientemente.
3. **Papéis independentes; `ativo` e papel são eixos separados.** Disponível
   para vínculo novo = `ativo && ehPapel`. Usuário sem papel nenhum é válido.
4. **Regra dos filtros** e a união com `incluirIds`, que fecha o débito do
   `BACKLOG.md`.
5. **Guarda de papel só em vínculo novo ou alterado** — a forma que permite ao
   §3 (histórico não quebra) coexistir com o §10 (papel é exigido).
6. **Preservação histórica:** `responsavelNome` intacto; nenhum vínculo antigo
   reescrito; renomear não altera cronologia.
7. **Estratégia de migração** com R1, R2, R3 e a separação M1–M3 (estruturais,
   genéricas, **zero lógica por nome**) × M4 (humana, específica, defensiva).
8. **Sem redirects** de `/vendedores` e `/tecnicos`, com a justificativa da
   spec §8.1.

- [ ] **Step 3: Abrir a seção da Sprint 4.2 no `PROJECT_HISTORY.md`**

Cabeçalho com data (2026-08-26), versão de entrada 1.4.0, versão de saída
prevista 1.5.0, link para a spec e para este plano. Deixar preparados os
espaços "Auditoria pré-migration" e "Auditoria pós-migration" — as Tasks 2 e 20
preenchem.

- [ ] **Step 4: Gate**

```bash
npm run lint
```

Esperado: sem erros. (Markdown não é lintado, mas o comando confirma que a
árvore está limpa antes de começar.)

- [ ] **Step 5: Commit**

```bash
git add DECISIONS.md PROJECT_HISTORY.md
git commit -m "docs(adr): ADR-0410 — Usuario unico com papeis operacionais"
```

**Resultado esperado:** ADR-0410 escrito, superseder do ADR-0408 argumentado,
Sprint 4.2 aberta no histórico. Nenhum código alterado.

---

## Task 2 — Script de auditoria e auditoria PRÉ-migration

**Files:**
- Create: `scripts/db/audit-usuarios.ts`
- Modify: `PROJECT_HISTORY.md` (preencher "Auditoria pré-migration")

**Interfaces:**
- Consumes: `@/infrastructure/database` (`prisma`)
- Produces: `npx tsx scripts/db/audit-usuarios.ts`, que imprime um bloco JSON
  estável. A Task 20 roda o **mesmo** script e compara.

**Dependências:** Task 1.

> **Por que existe.** Uma migration não é reexecutável dentro de uma suíte de
> teste. A prova de "nenhum vínculo perdido" é a comparação entre esta saída e a
> da Task 20, somada às guardas das migrations.

- [ ] **Step 1: Escrever o script**

Criar `scripts/db/audit-usuarios.ts`. O script precisa rodar **antes** da M1
(quando `usuarios` ainda não existe) e **depois** da M4 (quando `vendedores` e
`tecnicos` não existem mais). Por isso toda consulta é feita em SQL bruto via
`$queryRaw`, com detecção de existência da tabela — o cliente Prisma gerado não
conhece as duas fases ao mesmo tempo.

```ts
import { prisma } from "@/infrastructure/database";

/**
 * Auditoria da migração Vendedor/Tecnico → Usuario (Sprint 4.2, ADR-0410).
 *
 * Roda nas DUAS pontas: antes da M1 (quando `usuarios` não existe) e depois da
 * M4 (quando `vendedores` e `tecnicos` não existem mais). Por isso usa SQL
 * bruto com detecção de tabela — o cliente Prisma gerado só conhece uma das
 * duas fases por vez.
 *
 * A saída é JSON estável e ordenada, para `diff` direto entre as duas execuções.
 */

async function tabelaExiste(nome: string): Promise<boolean> {
  const r = await prisma.$queryRawUnsafe<{ existe: boolean }[]>(
    `SELECT to_regclass($1) IS NOT NULL AS existe`,
    `public.${nome}`,
  );
  return r[0]?.existe ?? false;
}

async function contar(sql: string): Promise<number> {
  const r = await prisma.$queryRawUnsafe<{ n: bigint }[]>(sql);
  return Number(r[0]?.n ?? 0);
}

async function nomes(tabela: string): Promise<string[]> {
  const r = await prisma.$queryRawUnsafe<{ nome: string }[]>(
    `SELECT nome FROM "${tabela}" ORDER BY nome`,
  );
  return r.map((x) => x.nome);
}

async function main() {
  const temVendedores = await tabelaExiste("vendedores");
  const temTecnicos = await tabelaExiste("tecnicos");
  const temUsuarios = await tabelaExiste("usuarios");

  const cadastros = {
    vendedores: temVendedores ? await contar(`SELECT count(*) n FROM vendedores`) : null,
    tecnicos: temTecnicos ? await contar(`SELECT count(*) n FROM tecnicos`) : null,
    usuarios: temUsuarios ? await contar(`SELECT count(*) n FROM usuarios`) : null,
  };

  const listas = {
    vendedores: temVendedores ? await nomes("vendedores") : null,
    tecnicos: temTecnicos ? await nomes("tecnicos") : null,
    usuarios: temUsuarios
      ? await prisma.$queryRawUnsafe<
          { nome: string; ativo: boolean; ehVendedor: boolean; ehTecnico: boolean }[]
        >(
          `SELECT nome, ativo, "ehVendedor", "ehTecnico" FROM usuarios ORDER BY nome`,
        )
      : null,
  };

  // Os vínculos NÃO dependem de qual cadastro existe: as três colunas têm o
  // mesmo nome antes e depois da migração. É exatamente esse o ponto do R1.
  const vinculos = {
    propostasComVendedor: await contar(
      `SELECT count(*) n FROM propostas WHERE "vendedorId" IS NOT NULL`,
    ),
    instalacoesComTecnico: await contar(
      `SELECT count(*) n FROM instalacoes WHERE "tecnicoResponsavelId" IS NOT NULL`,
    ),
    registros: await contar(`SELECT count(*) n FROM instalacao_registros`),
  };

  // A prova da cronologia: o par (vínculo, snapshot) de cada registro.
  const cronologia = await prisma.$queryRawUnsafe<
    { id: string; tecnicoId: string; responsavelNome: string }[]
  >(
    `SELECT id, "tecnicoId", "responsavelNome"
       FROM instalacao_registros ORDER BY "aconteceuEm", id`,
  );

  console.log(
    JSON.stringify({ cadastros, listas, vinculos, cronologia }, null, 2),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Rodar a auditoria PRÉ e salvar a saída**

```bash
npx tsx scripts/db/audit-usuarios.ts > /tmp/audit-pre.json
cat /tmp/audit-pre.json
```

**Esperado, conferido contra o banco real em 2026-08-26:**

```
cadastros: vendedores=2, tecnicos=1, usuarios=null
listas.vendedores: ["Carlos Gomes", "Vinicius Garcia"]
listas.tecnicos:   ["Vinicius"]
vinculos: propostasComVendedor=2, instalacoesComTecnico=0, registros=3
cronologia: 3 linhas, todas com tecnicoId=2169f741-dad5-4034-af76-59f2c2f4a44a
            e responsavelNome="Vinicius"
```

Se qualquer número divergir, **pare** e reporte: o banco mudou desde o desenho e
as guardas das Tasks 5 e 19 foram calibradas para este conteúdo.

- [ ] **Step 3: Registrar a saída no `PROJECT_HISTORY.md`**

Colar o JSON completo na seção "Auditoria pré-migration" da Sprint 4.2.

- [ ] **Step 4: Gate**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add scripts/db/audit-usuarios.ts PROJECT_HISTORY.md
git commit -m "chore(db): script de auditoria da migracao Usuario + auditoria pre"
```

**Resultado esperado:** script reutilizável nas duas pontas; estado inicial do
banco congelado por escrito antes de qualquer alteração.

---

## Task 3 — Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: model `Usuario` e as três relações nomeadas
  (`PropostaVendedor`, `InstalacaoTecnico`, `RegistroTecnico`). O cliente Prisma
  gerado expõe `prisma.usuario` — consumido pelas Tasks 8+.

**Dependências:** Task 2 (a auditoria pré precisa rodar com o schema antigo).

> **Importante — as migrations são escritas à mão.** O schema descreve o estado
> **final** (pós-M3). As Tasks 4–6 escrevem o SQL manualmente, no molde das
> migrations de Técnicos. Não rodar `prisma migrate dev` para gerar o SQL: ele
> produziria um `DROP TABLE` destrutivo sem backfill nem guarda.

- [ ] **Step 1: Substituir os models `Vendedor` e `Tecnico` por `Usuario`**

Remover `model Vendedor` e `model Tecnico` inteiros. No lugar (mesma posição,
seção "Cadastros base"):

```prisma
/// Usuario — pessoa que atua na operação, com PAPÉIS independentes (ADR-0410).
///
/// Substitui os cadastros separados de Vendedor e Técnico (supersede parcial do
/// ADR-0408). A mesma pessoa pode ser vendedora, técnica, ambas ou nenhuma.
///
/// **NÃO é principal de autenticação.** Não há login, senha, permissão nem
/// agenda. Quando o sistema ganhar autenticação, "registrado por" será campo
/// NOVO e aditivo, separado destes vínculos: `vendedorId`/`tecnicoId` respondem
/// QUEM FEZ o trabalho, não quem digitou.
///
/// `ativo` e os papéis são eixos INDEPENDENTES: `ativo` diz se a pessoa ainda
/// atua; os papéis dizem o que ela faz. Disponível para um vínculo NOVO naquele
/// papel = `ativo && ehPapel`. Usuário sem papel nenhum é válido — é o cadastro
/// criado antes de a função ser decidida; ele só não aparece em select nenhum.
model Usuario {
  id         String  @id @default(cuid())
  ativo      Boolean @default(true)
  nome       String
  /// Papel comercial. Filtra o Select de Vendedor da Proposta.
  ehVendedor Boolean @default(false)
  /// Papel operacional. Filtra os Selects de Técnico das Instalações.
  ehTecnico  Boolean @default(false)
  telefone   String?
  email      String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  /// Relações NOMEADAS: são três para o mesmo model, e o Prisma exige o nome
  /// explícito quando há mais de uma entre os mesmos dois models.
  propostasComoVendedor Proposta[]           @relation("PropostaVendedor")
  instalacoes           Instalacao[]         @relation("InstalacaoTecnico")
  registros             InstalacaoRegistro[] @relation("RegistroTecnico")

  @@index([ativo])
  @@map("usuarios")
}
```

- [ ] **Step 2: Repontar as três relações**

Em `model Proposta`, trocar apenas as duas linhas da relação de vendedor. **A
coluna `vendedorId` não muda de nome** — ela nomeia o papel no vínculo, não a
tabela de origem, e é isso que mantém o mapper do PDF intacto:

```prisma
  vendedorId String?
  vendedor   Usuario? @relation("PropostaVendedor", fields: [vendedorId], references: [id], onDelete: Restrict)
```

> `onDelete: Restrict` é o **R3**. Se R3 for recusado, omitir o `onDelete` aqui
> (o default do Prisma para relação opcional é `SetNull`, o comportamento atual).

Em `model Instalacao`:

```prisma
  tecnicoResponsavelId String?
  tecnicoResponsavel   Usuario? @relation("InstalacaoTecnico", fields: [tecnicoResponsavelId], references: [id], onDelete: Restrict)
```

Em `model InstalacaoRegistro`:

```prisma
  tecnicoId String
  tecnico   Usuario @relation("RegistroTecnico", fields: [tecnicoId], references: [id], onDelete: Restrict)
```

Atualizar o comentário `///` de `tecnicoResponsavelId` em `Instalacao` e de
`tecnicoId` em `InstalacaoRegistro` para dizer `Usuario` em vez de `Tecnico`.
**Não alterar o comentário de `responsavelNome`** — a regra continua idêntica.

- [ ] **Step 3: Validar o schema**

```bash
npx prisma validate
```

Esperado: `The schema at prisma/schema.prisma is valid 🚀`

Se acusar relação ambígua, falta um `@relation("nome")` em algum dos três lados.

- [ ] **Step 4: Gate — o cliente ainda NÃO é gerado**

Não rodar `prisma generate` nem `typecheck` aqui: o código da aplicação ainda
usa `prisma.vendedor` e `prisma.tecnico`, e vai quebrar. Isso é esperado e é
resolvido nas Tasks 8–14. A verificação desta task é só `prisma validate`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): model Usuario com papeis e repontamento das tres relacoes"
```

**Resultado esperado:** schema descreve o estado final. Aplicação ainda não
compila — previsto e resolvido adiante.

---

## Task 4 — M1: cria `usuarios` preservando os ids de origem

**Files:**
- Create: `prisma/migrations/20260826000000_usuarios_estrutura/migration.sql`

**Dependências:** Task 3. **Assume R1 e R2 aprovados.**

- [ ] **Step 1: Escrever a migration**

```sql
-- Sprint 4.2 — cadastro único de Usuários (ADR-0410).
--
-- ADITIVA. Cria `usuarios` e a popula a partir dos dois cadastros existentes.
-- NENHUMA coluna de vínculo é lida, alterada ou removida aqui: o repontamento
-- das FKs fica na migration seguinte (`usuarios_vinculos`), e o DROP das tabelas
-- antigas só na terceira.
--
-- ┌─ DUAS PROPRIEDADES QUE ESTA MIGRATION GARANTE ────────────────────────────┐
-- │                                                                           │
-- │ 1. O id é PRESERVADO. `usuarios.id` recebe `vendedores.id` ou             │
-- │    `tecnicos.id`. Os valores já gravados em propostas."vendedorId",       │
-- │    instalacoes."tecnicoResponsavelId" e instalacao_registros."tecnicoId"  │
-- │    JÁ SÃO os ids corretos — nenhum vínculo precisa ser reescrito, em      │
-- │    lugar nenhum, em momento nenhum. "Nenhum vínculo perdido" deixa de     │
-- │    depender de uma guarda e vira impossibilidade estrutural.              │
-- │                                                                           │
-- │ 2. ZERO lógica baseada em nome. Não há `lower()`, `LIKE`, `btrim`,        │
-- │    `regexp_replace` nem chave normalizada em lugar nenhum deste arquivo.  │
-- │    Um cadastro de origem = um Usuario, sempre. Nenhuma fusão acontece     │
-- │    aqui, nem poderia: fundir descartaria o id do absorvido e quebraria    │
-- │    as FKs dele. Consolidar duas pessoas é DECISÃO HUMANA e vive           │
-- │    exclusivamente na M4.                                                  │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- Usuario NÃO é principal de autenticação — ver ADR-0410.

-- CreateTable
CREATE TABLE "usuarios" (
    "id"         TEXT NOT NULL,
    "ativo"      BOOLEAN NOT NULL DEFAULT true,
    "nome"       TEXT NOT NULL,
    "ehVendedor" BOOLEAN NOT NULL DEFAULT false,
    "ehTecnico"  BOOLEAN NOT NULL DEFAULT false,
    "telefone"   TEXT,
    "email"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usuarios_ativo_idx" ON "usuarios"("ativo");

-- ---------------------------------------------------------------------------
-- 1. Um Usuario por VENDEDOR. Id, nome, ativo, contatos e createdAt preservados.
-- ---------------------------------------------------------------------------
INSERT INTO "usuarios" ("id", "nome", "ativo", "ehVendedor", "ehTecnico",
                        "telefone", "email", "createdAt", "updatedAt")
SELECT "id", "nome", "ativo", true, false,
       "telefone", "email", "createdAt", now()
  FROM "vendedores";

-- ---------------------------------------------------------------------------
-- 2. Um Usuario por TÉCNICO. Sempre — sem comparar nome com nada.
--    `Tecnico` não tem telefone nem e-mail; ficam nulos.
-- ---------------------------------------------------------------------------
INSERT INTO "usuarios" ("id", "nome", "ativo", "ehVendedor", "ehTecnico",
                        "telefone", "email", "createdAt", "updatedAt")
SELECT "id", "nome", "ativo", false, true,
       NULL, NULL, "createdAt", now()
  FROM "tecnicos";

-- ---------------------------------------------------------------------------
-- 3. GUARDA. Abortar é o comportamento correto — o Prisma roda cada migration
--    em transação, então a exceção reverte TUDO, inclusive o CREATE TABLE.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  n_usuarios   int;
  n_origem     int;
BEGIN
  SELECT count(*) INTO n_usuarios FROM "usuarios";
  SELECT (SELECT count(*) FROM "vendedores") + (SELECT count(*) FROM "tecnicos")
    INTO n_origem;

  -- G1: um Usuario para cada cadastro de origem, nem mais nem menos.
  -- Se os INSERT acima tivessem colidido em id, o INSERT teria falhado antes;
  -- esta guarda cobre o caso de alguém alterar a migration no futuro.
  IF n_usuarios <> n_origem THEN
    RAISE EXCEPTION
      '[usuarios] esperado % usuarios (vendedores + tecnicos), encontrado % — migration abortada, nada foi alterado',
      n_origem, n_usuarios;
  END IF;

  -- G2: todo Usuario criado pela migração veio de um cadastro que TINHA papel.
  IF EXISTS (SELECT 1 FROM "usuarios"
              WHERE "ehVendedor" = false AND "ehTecnico" = false) THEN
    RAISE EXCEPTION
      '[usuarios] usuario sem papel apos o backfill — migration abortada, nada foi alterado';
  END IF;

  -- G3: nenhum nome vazio veio junto.
  IF EXISTS (SELECT 1 FROM "usuarios" WHERE btrim("nome") = '') THEN
    RAISE EXCEPTION
      '[usuarios] usuario com nome vazio — migration abortada, nada foi alterado';
  END IF;
END $$;
```

> `btrim` no G3 é inspeção de **valor vazio**, não correspondência entre nomes.
> A propriedade "zero lógica por nome" da caixa acima trata de *casar* nomes
> entre cadastros — nada aqui casa nome com nada.

- [ ] **Step 2: Aplicar e verificar**

```bash
npm run db:migrate:deploy
```

Esperado: `1 migration found` / `applied`.

```bash
npx tsx scripts/db/audit-usuarios.ts | head -40
```

Esperado: `usuarios=3`, com `Carlos Gomes` (V), `Vinicius` (T),
`Vinicius Garcia` (V). `vendedores=2` e `tecnicos=1` **ainda existem**.

- [ ] **Step 3: Provar que os ids foram preservados**

```bash
PGPASSWORD='Exposec-2010' "/c/Program Files/PostgreSQL/18/bin/psql.exe" \
  -U postgres -h localhost -p 5432 -d db_outsystem -c "
SELECT (SELECT count(*) FROM vendedores v JOIN usuarios u ON u.id=v.id) AS v_ok,
       (SELECT count(*) FROM tecnicos t  JOIN usuarios u ON u.id=t.id) AS t_ok;"
```

Esperado: `v_ok=2`, `t_ok=1`. Se algum for menor, a M1 não preservou os ids e a
M2 vai falhar — **pare**.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/20260826000000_usuarios_estrutura
git commit -m "feat(db): M1 cria usuarios preservando os ids de origem"
```

**Resultado esperado:** `usuarios` com 3 linhas, ids idênticos aos de origem.
Nenhum vínculo tocado. `vendedores` e `tecnicos` intactos.

---

## Task 5 — M2: reaponta as três FKs, com guardas

**Files:**
- Create: `prisma/migrations/20260826010000_usuarios_vinculos/migration.sql`

**Dependências:** Task 4. **Assume R3 aprovado** (ver Step 1 se recusado).

- [ ] **Step 1: Escrever a migration**

```sql
-- Sprint 4.2 — repontamento das FKs para `usuarios` (ADR-0410).
--
-- NENHUM VALOR DE VÍNCULO É REESCRITO. Esta migration não contém um único
-- UPDATE. As três colunas — propostas."vendedorId",
-- instalacoes."tecnicoResponsavelId" e instalacao_registros."tecnicoId" —
-- guardam exatamente os mesmos valores antes e depois; muda só a tabela que a
-- FK referencia. É a consequência direta de a M1 ter preservado os ids.
--
-- MUDANÇA DELIBERADA DE COMPORTAMENTO (R3): propostas."vendedorId" era
-- ON DELETE SET NULL e passa a RESTRICT, como as outras duas. Apagar um
-- vendedor por qualquer caminho que não passasse por `removeVendedor()`
-- ZERAVA silenciosamente o vínculo da proposta — perda de histórico, o oposto
-- da regra do projeto. As três FKs passam a ser Restrict.

-- ---------------------------------------------------------------------------
-- 1. GUARDA PRÉVIA. As FKs novas já barrariam um valor órfão, mas com erro de
--    violação de chave. Estas mensagens dizem QUAL tabela e QUANTAS linhas.
--    Mesma razão pela qual `removeTecnico()` conta antes de deletar, embora o
--    Restrict do banco também proteja.
-- ---------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM "propostas" p
   WHERE p."vendedorId" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = p."vendedorId");
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] % proposta(s) com vendedorId sem Usuario correspondente — migration abortada, nada foi alterado', n;
  END IF;

  SELECT count(*) INTO n
    FROM "instalacoes" i
   WHERE i."tecnicoResponsavelId" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = i."tecnicoResponsavelId");
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] % instalacao(oes) com tecnicoResponsavelId sem Usuario correspondente — migration abortada, nada foi alterado', n;
  END IF;

  SELECT count(*) INTO n
    FROM "instalacao_registros" r
   WHERE NOT EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = r."tecnicoId");
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] % registro(s) da cronologia com tecnicoId sem Usuario correspondente — migration abortada, nada foi alterado', n;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Troca do alvo das três FKs. Os índices existentes não são tocados.
-- ---------------------------------------------------------------------------
ALTER TABLE "propostas" DROP CONSTRAINT "propostas_vendedorId_fkey";
ALTER TABLE "propostas" ADD CONSTRAINT "propostas_vendedorId_fkey"
  FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instalacoes" DROP CONSTRAINT "instalacoes_tecnicoResponsavelId_fkey";
ALTER TABLE "instalacoes" ADD CONSTRAINT "instalacoes_tecnicoResponsavelId_fkey"
  FOREIGN KEY ("tecnicoResponsavelId") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "instalacao_registros" DROP CONSTRAINT "instalacao_registros_tecnicoId_fkey";
ALTER TABLE "instalacao_registros" ADD CONSTRAINT "instalacao_registros_tecnicoId_fkey"
  FOREIGN KEY ("tecnicoId") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

> **Se R3 for recusado:** trocar `ON DELETE RESTRICT` por `ON DELETE SET NULL`
> **apenas** no bloco de `propostas`, e remover o parágrafo "MUDANÇA DELIBERADA"
> do cabeçalho. Os outros dois já eram Restrict.

- [ ] **Step 2: Aplicar**

```bash
npm run db:migrate:deploy
```

- [ ] **Step 3: Provar que as FKs apontam para `usuarios` e que nada mudou de valor**

```bash
PGPASSWORD='Exposec-2010' "/c/Program Files/PostgreSQL/18/bin/psql.exe" \
  -U postgres -h localhost -p 5432 -d db_outsystem -c "
SELECT con.conname, confrel.relname AS referencia,
       CASE con.confdeltype WHEN 'r' THEN 'RESTRICT' WHEN 'n' THEN 'SET NULL'
            WHEN 'a' THEN 'NO ACTION' WHEN 'c' THEN 'CASCADE' END AS on_delete
  FROM pg_constraint con JOIN pg_class confrel ON confrel.oid=con.confrelid
 WHERE con.contype='f' AND confrel.relname IN ('usuarios','vendedores','tecnicos')
 ORDER BY con.conname;"
```

Esperado: as três constraints referenciando **`usuarios`**, todas `RESTRICT`
(ou `propostas` em `SET NULL` se R3 recusado). Nenhuma linha referenciando
`vendedores` ou `tecnicos`.

```bash
npx tsx scripts/db/audit-usuarios.ts > /tmp/audit-m2.json
diff <(jq .vinculos,.cronologia /tmp/audit-pre.json) \
     <(jq .vinculos,.cronologia /tmp/audit-m2.json) && echo "VINCULOS IDENTICOS"
```

Esperado: `VINCULOS IDENTICOS`. É a prova de que nenhum valor foi reescrito.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/20260826010000_usuarios_vinculos
git commit -m "feat(db): M2 reaponta as tres FKs para usuarios (Restrict nas tres)"
```

**Resultado esperado:** três FKs apontando para `usuarios`, com os mesmos
valores de antes. `vendedores` e `tecnicos` ainda existem, agora sem
referenciadores.

---

## Task 6 — M3: remove as tabelas antigas

**Files:**
- Create: `prisma/migrations/20260826020000_usuarios_drop_legado/migration.sql`

**Dependências:** Task 5.

- [ ] **Step 1: Escrever a migration**

```sql
-- Sprint 4.2 — remove os cadastros antigos (ADR-0410).
--
-- CONTEÚDO PRESERVADO ANTES DO DROP. Estas tabelas não são perdidas: a M1
-- copiou cada linha para `usuarios` mantendo o MESMO id, e a M2 provou que as
-- três FKs resolvem em `usuarios`. Verificado no banco da Outmat:
--   vendedores  2 linhas → Usuario ehVendedor  (Carlos Gomes, Vinicius Garcia)
--   tecnicos    1 linha  → Usuario ehTecnico   (Vinicius)
--   vínculos    2 propostas + 0 instalações + 3 registros, todos intactos
--
-- Nenhuma linha de código lê `vendedores`/`tecnicos` a partir da Task 14 do
-- plano — esta migration roda no mesmo release daquele commit.
--
-- NÃO CONFUNDIR: instalacao_registros."responsavelNome" PERMANECE. É o snapshot
-- histórico da cronologia, e é justamente o que impede que renomear um Usuário
-- reescreva o que a timeline diz (ADR-0408, preservado pelo ADR-0410).

-- ---------------------------------------------------------------------------
-- GUARDA. Nenhuma FK pode restar apontando para as tabelas que serão apagadas.
-- ---------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM pg_constraint con
    JOIN pg_class confrel ON confrel.oid = con.confrelid
   WHERE con.contype = 'f' AND confrel.relname IN ('vendedores', 'tecnicos');
  IF n > 0 THEN
    RAISE EXCEPTION
      '[usuarios] ainda existem % FK(s) apontando para vendedores/tecnicos — migration abortada, nada foi alterado', n;
  END IF;
END $$;

-- DropTable
DROP TABLE "vendedores";

-- DropTable
DROP TABLE "tecnicos";
```

- [ ] **Step 2: Aplicar e conferir ausência de drift**

```bash
npm run db:migrate:deploy && npx prisma migrate status
```

Esperado: `Database schema is up to date!` — confirma que o SQL escrito à mão
chegou exatamente ao estado que o schema da Task 3 descreve.

```bash
npm run db:generate
```

Esperado: cliente gerado sem erro, agora com `prisma.usuario` e **sem**
`prisma.vendedor`/`prisma.tecnico`.

- [ ] **Step 3: Confirmar o estado do banco**

```bash
npx tsx scripts/db/audit-usuarios.ts
```

Esperado: `vendedores=null`, `tecnicos=null`, `usuarios=3`; vínculos idênticos
aos da auditoria pré (2 / 0 / 3) e cronologia com os 3 pares inalterados.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/20260826020000_usuarios_drop_legado
git commit -m "feat(db): M3 remove as tabelas vendedores e tecnicos"
```

**Resultado esperado:** banco no formato final. Aplicação ainda não compila
(Tasks 8–14 resolvem). A consolidação do Vinicius **ainda não aconteceu** — é a
Task 19, deliberadamente depois de a aplicação estar funcionando.

---

## Task 7 — Módulo puro: papéis, disponibilidade e rótulo

**Files:**
- Create: `src/features/usuarios/opcoes.ts`
- Test: `src/features/usuarios/opcoes.test.ts`

**Interfaces:**
- Produces:
  - `type PapelUsuario = "ehVendedor" | "ehTecnico"`
  - `interface UsuarioComPapeis { nome: string; ativo: boolean; ehVendedor: boolean; ehTecnico: boolean }`
  - `disponivelPara(u: UsuarioComPapeis, papel: PapelUsuario): boolean`
  - `rotuloOpcao(u: UsuarioComPapeis, papel: PapelUsuario): string`
  - `LABEL_PAPEL: Record<PapelUsuario, string>`

**Dependências:** Task 6.

> **Por que módulo puro.** É a regra que decide o que o usuário lê no Select.
> Testá-la sem banco é o único jeito de cobrir as quatro combinações de
> `ativo` x papel sem montar quatro cenários no PostgreSQL. Mesmo par
> service/módulo-puro de `dashboard.service` ↔ `features/dashboard/dashboard.ts`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/features/usuarios/opcoes.test.ts
import { describe, expect, it } from "vitest";

import { disponivelPara, rotuloOpcao } from "./opcoes";

const base = { nome: "João", ativo: true, ehVendedor: true, ehTecnico: false };

describe("disponivelPara", () => {
  it("é disponível quando ativo e com o papel", () => {
    expect(disponivelPara(base, "ehVendedor")).toBe(true);
  });

  it("não é disponível quando inativo, mesmo com o papel", () => {
    expect(disponivelPara({ ...base, ativo: false }, "ehVendedor")).toBe(false);
  });

  it("não é disponível quando ativo mas sem o papel", () => {
    expect(disponivelPara(base, "ehTecnico")).toBe(false);
  });

  it("avalia cada papel de forma independente", () => {
    const ambos = { ...base, ehTecnico: true };
    expect(disponivelPara(ambos, "ehVendedor")).toBe(true);
    expect(disponivelPara(ambos, "ehTecnico")).toBe(true);
  });
});

describe("rotuloOpcao", () => {
  it("mostra só o nome quando disponível", () => {
    expect(rotuloOpcao(base, "ehVendedor")).toBe("João");
  });

  it("marca (inativo) quando a pessoa está inativa", () => {
    expect(rotuloOpcao({ ...base, ativo: false }, "ehVendedor")).toBe(
      "João (inativo)",
    );
  });

  it("marca (sem papel de técnico) quando ativo mas sem o papel", () => {
    expect(rotuloOpcao(base, "ehTecnico")).toBe("João (sem papel de técnico)");
  });

  it("marca (sem papel de vendedor) no papel de vendedor", () => {
    const tecnico = { ...base, ehVendedor: false, ehTecnico: true };
    expect(rotuloOpcao(tecnico, "ehVendedor")).toBe(
      "João (sem papel de vendedor)",
    );
  });

  // A precedência importa: um só sufixo, nunca dois. Inativo é a condição mais
  // forte — a pessoa não está disponível para nada — e é o rótulo que o
  // usuário do sistema já conhece do cadastro de Técnicos.
  it("usa (inativo) quando inativo E sem o papel", () => {
    const inativoSemPapel = { ...base, ativo: false, ehVendedor: false };
    expect(rotuloOpcao(inativoSemPapel, "ehVendedor")).toBe("João (inativo)");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/features/usuarios/opcoes.test.ts
```

Esperado: FAIL — `Failed to resolve import "./opcoes"`.

- [ ] **Step 3: Implementar**

```ts
// src/features/usuarios/opcoes.ts
/**
 * Papéis do Usuário — REGRA PURA (Sprint 4.2, ADR-0410).
 *
 * Decide quem pode ser escolhido em cada papel e como quem já está vinculado,
 * mas não pode mais ser escolhido, aparece na lista.
 *
 * `ativo` e papel são eixos INDEPENDENTES. Há duas formas de ficar indisponível
 * — inativado, ou papel desmarcado — e o efeito operacional é o mesmo: some das
 * escolhas novas. O que difere é o rótulo, porque as duas situações pedem ações
 * diferentes de quem administra o cadastro.
 *
 * Módulo PURO — sem Prisma, sem IO, sem React.
 */

export type PapelUsuario = "ehVendedor" | "ehTecnico";

export interface UsuarioComPapeis {
  nome: string;
  ativo: boolean;
  ehVendedor: boolean;
  ehTecnico: boolean;
}

/** Nome do papel em português, para mensagens e rótulos. */
export const LABEL_PAPEL: Record<PapelUsuario, string> = {
  ehVendedor: "vendedor",
  ehTecnico: "técnico",
};

/** Pode ser escolhido para um vínculo NOVO neste papel. */
export function disponivelPara(
  u: UsuarioComPapeis,
  papel: PapelUsuario,
): boolean {
  return u.ativo && u[papel];
}

/**
 * Rótulo da opção no Select.
 *
 * Um único sufixo, nunca dois: quando a pessoa está inativa **e** sem o papel,
 * vence "(inativo)" — é a condição mais forte e é o rótulo que já existia no
 * cadastro de Técnicos (ADR-0408), preservado aqui.
 */
export function rotuloOpcao(u: UsuarioComPapeis, papel: PapelUsuario): string {
  if (!u.ativo) return `${u.nome} (inativo)`;
  if (!u[papel]) return `${u.nome} (sem papel de ${LABEL_PAPEL[papel]})`;
  return u.nome;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run src/features/usuarios/opcoes.test.ts
```

Esperado: PASS, 9 testes.

- [ ] **Step 5: Commit**

```bash
git add src/features/usuarios/opcoes.ts src/features/usuarios/opcoes.test.ts
git commit -m "feat(usuarios): modulo puro de papeis, disponibilidade e rotulo"
```

**Resultado esperado:** regra de papel testada sem banco, pronta para o service
e para a UI consumirem.

---

## Task 8 — Schema Zod do formulário

**Files:**
- Create: `src/features/usuarios/schema.ts`
- Test: `src/features/usuarios/schema.test.ts`

**Interfaces:**
- Produces: `usuarioSchema`, `usuarioDefaults`, `type UsuarioFormValues`

**Dependências:** Task 7.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/features/usuarios/schema.test.ts
import { describe, expect, it } from "vitest";

import { usuarioDefaults, usuarioSchema } from "./schema";

const valido = {
  ativo: true,
  nome: "Vinicius Garcia",
  ehVendedor: true,
  ehTecnico: true,
  telefone: "",
  email: "",
};

describe("usuarioSchema", () => {
  it("aceita um usuário com os dois papéis", () => {
    expect(usuarioSchema.safeParse(valido).success).toBe(true);
  });

  it("aceita um usuário sem papel nenhum", () => {
    // É o cadastro criado antes de a função ser decidida. Ele simplesmente não
    // aparece em select nenhum — proibir tornaria impossível cadastrar antes.
    const semPapel = { ...valido, ehVendedor: false, ehTecnico: false };
    expect(usuarioSchema.safeParse(semPapel).success).toBe(true);
  });

  it("exige nome", () => {
    const r = usuarioSchema.safeParse({ ...valido, nome: "   " });
    expect(r.success).toBe(false);
  });

  it("limita o nome a 200 caracteres", () => {
    const r = usuarioSchema.safeParse({ ...valido, nome: "x".repeat(201) });
    expect(r.success).toBe(false);
  });

  it("recusa e-mail inválido quando informado", () => {
    expect(usuarioSchema.safeParse({ ...valido, email: "nao-e-email" }).success)
      .toBe(false);
  });

  it("aceita e-mail vazio", () => {
    expect(usuarioSchema.safeParse({ ...valido, email: "" }).success).toBe(true);
  });

  it("descarta campo enviado a mais", () => {
    const r = usuarioSchema.safeParse({ ...valido, ehAdmin: true });
    expect(r.success).toBe(true);
    expect(r.success && "ehAdmin" in r.data).toBe(false);
  });

  it("nasce ativo, sem papel e com contatos vazios", () => {
    expect(usuarioDefaults).toEqual({
      ativo: true,
      nome: "",
      ehVendedor: false,
      ehTecnico: false,
      telefone: "",
      email: "",
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/features/usuarios/schema.test.ts
```

Esperado: FAIL — `Failed to resolve import "./schema"`.

- [ ] **Step 3: Implementar**

```ts
// src/features/usuarios/schema.ts
import { z } from "zod";

import { optionalEmail, optionalText, requiredText } from "@/lib/validation";

/**
 * Schema (Zod) do Usuário — fonte única de validação (RHF + Server Action).
 *
 * Os papéis são INDEPENDENTES e sem validação cruzada: um usuário com os dois
 * desmarcados é válido, e é o cadastro criado antes de a função ser decidida.
 * Proibir isso tornaria impossível cadastrar alguém antes de saber o papel; a
 * consequência de não ter papel já é suficiente — a pessoa não aparece em
 * select nenhum (ADR-0410).
 *
 * O `.object()` sem passthrough é o que garante que um campo enviado a mais
 * seja descartado no parse.
 */
export const usuarioSchema = z.object({
  ativo: z.boolean(),
  nome: requiredText("Nome", 200),
  ehVendedor: z.boolean(),
  ehTecnico: z.boolean(),
  telefone: optionalText(30),
  email: optionalEmail,
});

export type UsuarioFormValues = z.infer<typeof usuarioSchema>;

export const usuarioDefaults: UsuarioFormValues = {
  ativo: true,
  nome: "",
  ehVendedor: false,
  ehTecnico: false,
  telefone: "",
  email: "",
};
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run src/features/usuarios/schema.test.ts
```

Esperado: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
git add src/features/usuarios/schema.ts src/features/usuarios/schema.test.ts
git commit -m "feat(usuarios): schema Zod com papeis independentes"
```

**Resultado esperado:** validação única para formulário e Server Action.

---

## Task 9 — `usuario.service.ts` e a mensagem de exclusão

**Files:**
- Create: `src/services/usuario.service.ts`
- Create: `src/services/usuario.service.integration.test.ts`
- Modify: `src/lib/messages.ts`

**Interfaces:**
- Consumes: `disponivelPara`, `rotuloOpcao`, `LABEL_PAPEL`, `PapelUsuario` (Task 7)
- Produces:
  - `interface UsuarioListItem { id; ativo; nome; ehVendedor; ehTecnico; telefone: string|null; email: string|null }`
  - `interface UsuarioFormDTO { ativo; nome; ehVendedor; ehTecnico; telefone: string; email: string }`
  - `interface UsuarioInput { ativo; nome; ehVendedor; ehTecnico; telefone?: string; email?: string }`
  - `interface UsuarioOption { value: string; label: string }`
  - `listUsuarios(showInactive: boolean): Promise<UsuarioListItem[]>`
  - `getUsuarioForEdit(id: string): Promise<UsuarioFormDTO | null>`
  - `createUsuario(input: UsuarioInput): Promise<string>`
  - `updateUsuario(id: string, input: UsuarioInput): Promise<void>`
  - `removeUsuario(id: string): Promise<void>`
  - `setUsuarioAtivo(id: string, ativo: boolean): Promise<void>`
  - `listUsuarioOptions(papel: PapelUsuario, incluirIds?: string[]): Promise<UsuarioOption[]>`
  - `assertPapel(tx, usuarioId: string, papel: PapelUsuario): Promise<void>`
  - `USUARIO_NAO_ENCONTRADO`, `semPapelMsg(papel)`
  - `CANNOT_DELETE_USED_IN_RECORDS` (em `@/lib/messages`)

**Dependências:** Tasks 6, 7.

> `assertPapel` mora aqui, e não em cada service consumidor, porque a regra é a
> mesma nos três lugares e a mensagem precisa ser idêntica. Recebe `tx` para
> rodar **dentro** da transação de quem chama — a verificação e a escrita
> precisam ver o mesmo estado, pela mesma razão que `nomeDoTecnico` lê o
> cadastro dentro da transação (ADR-0408).

- [ ] **Step 1: Escrever o teste de integração que falha**

Cobre os casos 1, 7 e 10 da spec §10.2. Os casos 2, 3, 4, 5 e 6 chegam na
Task 13, quando as guardas existirem nos services consumidores.

```ts
// src/services/usuario.service.integration.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/infrastructure/database";
import { CANNOT_DELETE_USED_IN_RECORDS } from "@/lib/messages";

import {
  createUsuario,
  listUsuarioOptions,
  removeUsuario,
  updateUsuario,
} from "./usuario.service";

/**
 * Cadastro único de Usuários (Sprint 4.2, ADR-0410).
 *
 * Por que INTEGRAÇÃO e não unidade: `listUsuarioOptions` é uma condição de
 * consulta (`OR` entre papel-ativo e a lista de ids) e `removeUsuario` conta
 * três relações. Com Prisma mockado o teste provaria só que o mock foi chamado.
 *
 * Dados marcados com `E2E ` — o mesmo marcador que o `globalTeardown` do
 * Playwright varre, então um teste interrompido não deixa rastro permanente.
 */

const MARCA = `E2E Usuario ${Date.now()}`;

let vendedorId: string;
let tecnicoId: string;
let ambosId: string;
let inativoId: string;
let clienteId: string;
let propostaId: string;

beforeAll(async () => {
  vendedorId = await createUsuario({
    ativo: true, nome: `${MARCA} Vendedor`, ehVendedor: true, ehTecnico: false,
  });
  tecnicoId = await createUsuario({
    ativo: true, nome: `${MARCA} Tecnico`, ehVendedor: false, ehTecnico: true,
  });
  ambosId = await createUsuario({
    ativo: true, nome: `${MARCA} Ambos`, ehVendedor: true, ehTecnico: true,
  });
  inativoId = await createUsuario({
    ativo: false, nome: `${MARCA} Inativo`, ehVendedor: true, ehTecnico: false,
  });

  const cliente = await prisma.cliente.create({
    data: { nome: `${MARCA} Cliente`, tipoPessoa: "PF" },
    select: { id: true },
  });
  clienteId = cliente.id;
});

afterAll(async () => {
  if (propostaId) await prisma.proposta.deleteMany({ where: { id: propostaId } });
  if (clienteId) await prisma.cliente.deleteMany({ where: { id: clienteId } });
  await prisma.usuario.deleteMany({ where: { nome: { startsWith: MARCA } } });
});

describe("vínculo com proposta", () => {
  it("vincula um usuário com papel de vendedor a uma proposta", async () => {
    const p = await prisma.proposta.create({
      data: { clienteId, vendedorId },
      select: { id: true, vendedorId: true },
    });
    propostaId = p.id;
    expect(p.vendedorId).toBe(vendedorId);

    const lido = await prisma.proposta.findUnique({
      where: { id: propostaId },
      select: { vendedor: { select: { nome: true, ehVendedor: true } } },
    });
    expect(lido?.vendedor?.ehVendedor).toBe(true);
  });
});

describe("listUsuarioOptions", () => {
  it("traz só ativos com o papel pedido", async () => {
    const ids = (await listUsuarioOptions("ehVendedor")).map((o) => o.value);
    expect(ids).toContain(vendedorId);
    expect(ids).toContain(ambosId);
    expect(ids).not.toContain(tecnicoId);
    expect(ids).not.toContain(inativoId);
  });

  it("filtra o outro papel de forma independente", async () => {
    const ids = (await listUsuarioOptions("ehTecnico")).map((o) => o.value);
    expect(ids).toContain(tecnicoId);
    expect(ids).toContain(ambosId);
    expect(ids).not.toContain(vendedorId);
  });

  it("inclui o vinculado mesmo inativo, rotulado", async () => {
    const opcoes = await listUsuarioOptions("ehVendedor", [inativoId]);
    const achado = opcoes.find((o) => o.value === inativoId);
    expect(achado?.label).toBe(`${MARCA} Inativo (inativo)`);
  });

  it("inclui o vinculado que não tem o papel, com rótulo próprio", async () => {
    const opcoes = await listUsuarioOptions("ehVendedor", [tecnicoId]);
    const achado = opcoes.find((o) => o.value === tecnicoId);
    expect(achado?.label).toBe(`${MARCA} Tecnico (sem papel de vendedor)`);
  });

  it("ignora ids vazios ou repetidos em incluirIds", async () => {
    const opcoes = await listUsuarioOptions("ehVendedor", [inativoId, inativoId, ""]);
    expect(opcoes.filter((o) => o.value === inativoId)).toHaveLength(1);
  });

  it("volta a oferecer quem recebeu o papel", async () => {
    await updateUsuario(tecnicoId, {
      ativo: true, nome: `${MARCA} Tecnico`, ehVendedor: true, ehTecnico: true,
    });
    const ids = (await listUsuarioOptions("ehVendedor")).map((o) => o.value);
    expect(ids).toContain(tecnicoId);

    // devolve ao estado do beforeAll para não afetar os testes seguintes
    await updateUsuario(tecnicoId, {
      ativo: true, nome: `${MARCA} Tecnico`, ehVendedor: false, ehTecnico: true,
    });
  });
});

describe("removeUsuario", () => {
  it("exclui um usuário nunca usado", async () => {
    const id = await createUsuario({
      ativo: true, nome: `${MARCA} Descartavel`, ehVendedor: true, ehTecnico: false,
    });
    await removeUsuario(id);
    expect(await prisma.usuario.findUnique({ where: { id } })).toBeNull();
  });

  it("bloqueia a exclusão de quem está em uma proposta", async () => {
    await expect(removeUsuario(vendedorId)).rejects.toThrow(
      CANNOT_DELETE_USED_IN_RECORDS,
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm run test:integration -- src/services/usuario.service.integration.test.ts
```

Esperado: FAIL — `Failed to resolve import "./usuario.service"`.

- [ ] **Step 3: Trocar as mensagens em `src/lib/messages.ts`**

Remover `CANNOT_DELETE_USED_IN_PROPOSTAS` e `CANNOT_DELETE_USED_IN_INSTALACOES`
(ficam sem uso ao fim da Task 14) e acrescentar:

```ts
/**
 * Exclusão bloqueada quando o usuário já foi usado em qualquer vínculo.
 *
 * Substitui as duas mensagens anteriores (uma por cadastro): com identidade
 * única, a mesma pessoa pode ter sido usada como vendedora, como técnica ou
 * como as duas, e a orientação é sempre a mesma (ADR-0410).
 */
export const CANNOT_DELETE_USED_IN_RECORDS =
  "Este usuário já foi utilizado em propostas ou instalações e não pode ser excluído. Utilize a opção Inativar.";
```

- [ ] **Step 4: Implementar o service**

```ts
// src/services/usuario.service.ts
import {
  disponivelPara,
  rotuloOpcao,
  LABEL_PAPEL,
  type PapelUsuario,
} from "@/features/usuarios/opcoes";
import { prisma } from "@/infrastructure/database";
import { CANNOT_DELETE_USED_IN_RECORDS } from "@/lib/messages";

/**
 * Serviço de Usuários (Sprint 4.2, ADR-0410).
 *
 * Substitui `vendedor.service.ts` e `tecnico.service.ts`. Só IO: a regra de
 * papel/disponibilidade/rótulo mora em `features/usuarios/opcoes.ts`, módulo
 * puro testado sem banco — mesmo par service/módulo de `dashboard.service`.
 *
 * **Usuario não é principal de autenticação.** Sem login, senha ou permissão.
 */

export type { PapelUsuario };

export interface UsuarioListItem {
  id: string;
  ativo: boolean;
  nome: string;
  ehVendedor: boolean;
  ehTecnico: boolean;
  telefone: string | null;
  email: string | null;
}

export interface UsuarioFormDTO {
  ativo: boolean;
  nome: string;
  ehVendedor: boolean;
  ehTecnico: boolean;
  telefone: string;
  email: string;
}

export interface UsuarioInput {
  ativo: boolean;
  nome: string;
  ehVendedor: boolean;
  ehTecnico: boolean;
  telefone?: string;
  email?: string;
}

/** Opção de `Select` — mesmo formato do `SelectOption` de `proposta.service`. */
export interface UsuarioOption {
  value: string;
  label: string;
}

export const USUARIO_NAO_ENCONTRADO = "Usuário não encontrado.";

/** Mensagem do papel exigido e ausente. */
export const semPapelMsg = (papel: PapelUsuario): string =>
  `O usuário selecionado não tem o papel de ${LABEL_PAPEL[papel]}.`;

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const trimOrNull = (value?: string): string | null =>
  value && value.trim() ? value.trim() : null;

function toData(input: UsuarioInput) {
  return {
    ativo: input.ativo,
    nome: input.nome.trim(),
    ehVendedor: input.ehVendedor,
    ehTecnico: input.ehTecnico,
    telefone: trimOrNull(input.telefone),
    email: trimOrNull(input.email),
  };
}

const SELECT_LIST = {
  id: true,
  ativo: true,
  nome: true,
  ehVendedor: true,
  ehTecnico: true,
  telefone: true,
  email: true,
} as const;

export async function listUsuarios(
  showInactive: boolean,
): Promise<UsuarioListItem[]> {
  return prisma.usuario.findMany({
    where: showInactive ? {} : { ativo: true },
    select: SELECT_LIST,
    orderBy: { nome: "asc" },
  });
}

export async function getUsuarioForEdit(
  id: string,
): Promise<UsuarioFormDTO | null> {
  const u = await prisma.usuario.findUnique({ where: { id } });
  if (!u) return null;
  return {
    ativo: u.ativo,
    nome: u.nome,
    ehVendedor: u.ehVendedor,
    ehTecnico: u.ehTecnico,
    telefone: u.telefone ?? "",
    email: u.email ?? "",
  };
}

export async function createUsuario(input: UsuarioInput): Promise<string> {
  const created = await prisma.usuario.create({
    data: toData(input),
    select: { id: true },
  });
  return created.id;
}

export async function updateUsuario(
  id: string,
  input: UsuarioInput,
): Promise<void> {
  await prisma.usuario.update({ where: { id }, data: toData(input) });
}

/**
 * Exclusão permitida apenas para usuário NUNCA usado — o padrão de Cliente,
 * Produto, Vendedor e Técnico. "Usado" agora são TRÊS relações, porque a mesma
 * identidade pode ter atuado nos dois papéis.
 *
 * A checagem existe aqui mesmo com o `onDelete: Restrict` no banco: o Restrict
 * protege qualquer caminho de escrita, mas devolve erro de FK. É esta função
 * que produz a mensagem que orienta o usuário a inativar.
 */
export async function removeUsuario(id: string): Promise<void> {
  const [emPropostas, emInstalacoes, emRegistros] = await Promise.all([
    prisma.proposta.count({ where: { vendedorId: id } }),
    prisma.instalacao.count({ where: { tecnicoResponsavelId: id } }),
    prisma.instalacaoRegistro.count({ where: { tecnicoId: id } }),
  ]);
  if (emPropostas + emInstalacoes + emRegistros > 0) {
    throw new Error(CANNOT_DELETE_USED_IN_RECORDS);
  }
  await prisma.usuario.delete({ where: { id } });
}

export async function setUsuarioAtivo(
  id: string,
  ativo: boolean,
): Promise<void> {
  await prisma.usuario.update({ where: { id }, data: { ativo } });
}

/**
 * Opções do `Select` de um papel: **disponíveis ∪ os ids informados**.
 *
 * `incluirIds` carrega os usuários já vinculados àquele agregado, mesmo
 * indisponíveis. Sem eles, abrir uma proposta cujo vendedor foi inativado (ou
 * perdeu o papel) mostraria o campo em branco, e salvar qualquer outra
 * alteração apagaria o vínculo em silêncio. Indisponível aparece rotulado, para
 * não ser escolhido por engano em um vínculo novo.
 */
export async function listUsuarioOptions(
  papel: PapelUsuario,
  incluirIds: string[] = [],
): Promise<UsuarioOption[]> {
  const ids = [...new Set(incluirIds.filter(Boolean))];
  const rows = await prisma.usuario.findMany({
    where: { OR: [{ ativo: true, [papel]: true }, { id: { in: ids } }] },
    select: {
      id: true,
      nome: true,
      ativo: true,
      ehVendedor: true,
      ehTecnico: true,
    },
    orderBy: { nome: "asc" },
  });
  return rows.map((u) => ({ value: u.id, label: rotuloOpcao(u, papel) }));
}

/**
 * Exige que `usuarioId` esteja DISPONÍVEL para `papel` — ativo e com o papel.
 *
 * Recebe o `tx` de quem chama para rodar DENTRO da mesma transação: a
 * verificação e a escrita precisam enxergar o mesmo estado. É a mesma razão
 * pela qual `nomeDoTecnico` lê o cadastro dentro da transação (ADR-0408): uma
 * garantia de integridade não pode depender do estado de um formulário nem de
 * uma leitura feita antes.
 *
 * Chamada APENAS para vínculo novo ou alterado — nunca para vínculo
 * preexistente inalterado. Ver os comentários nos services consumidores.
 */
export async function assertPapel(
  tx: Tx,
  usuarioId: string,
  papel: PapelUsuario,
): Promise<void> {
  const u = await tx.usuario.findUnique({
    where: { id: usuarioId },
    select: { nome: true, ativo: true, ehVendedor: true, ehTecnico: true },
  });
  if (!u) throw new Error(USUARIO_NAO_ENCONTRADO);
  if (!disponivelPara(u, papel)) throw new Error(semPapelMsg(papel));
}
```

- [ ] **Step 5: Rodar e ver passar**

```bash
npm run test:integration -- src/services/usuario.service.integration.test.ts
```

Esperado: PASS, 9 testes.

- [ ] **Step 6: Commit**

```bash
git add src/services/usuario.service.ts \
        src/services/usuario.service.integration.test.ts src/lib/messages.ts
git commit -m "feat(usuarios): service com filtro por papel, exclusao unificada e assertPapel"
```

**Resultado esperado:** camada de IO do cadastro pronta e provada contra o
PostgreSQL real.

---

## Task 10 — Select de Vendedor em Propostas

**Files:**
- Modify: `src/services/proposta.service.ts` (linhas 140-150 e o bloco de imports)
- Modify: `src/app/propostas/[id]/page.tsx`
- Modify: `BACKLOG.md`

**Interfaces:**
- Consumes: `listUsuarioOptions` (Task 9)
- Produces: `getPropostaFormOptions(vendedorIdVinculado?: string | null)`

**Dependências:** Task 9.

- [ ] **Step 1: Substituir `getPropostaFormOptions`**

Acrescentar ao bloco de imports do arquivo:

```ts
import { listUsuarioOptions } from "./usuario.service";
```

Trocar a função inteira:

```ts
/**
 * Opções do Select de Vendedor do workspace. Cliente usa autocomplete.
 *
 * `vendedorIdVinculado` é o vendedor JÁ gravado na proposta que está sendo
 * aberta. Ele entra na lista mesmo indisponível (inativo, ou sem o papel),
 * rotulado — sem isso, abrir uma proposta cujo vendedor foi inativado mostraria
 * o campo em branco e salvar qualquer outra alteração apagaria o vínculo em
 * silêncio. Era o débito registrado no BACKLOG, fechado nesta Sprint (ADR-0410).
 *
 * Na criação não há vínculo prévio: o parâmetro fica ausente.
 */
export async function getPropostaFormOptions(
  vendedorIdVinculado?: string | null,
): Promise<{ vendedores: SelectOption[] }> {
  const vendedores = await listUsuarioOptions(
    "ehVendedor",
    vendedorIdVinculado ? [vendedorIdVinculado] : [],
  );
  return { vendedores };
}
```

`SelectOption` já é `{ value: string; label: string }` — mesma forma de
`UsuarioOption`, sem conversão.

- [ ] **Step 2: Passar o vínculo na rota de edição**

Em `src/app/propostas/[id]/page.tsx`, o `Promise.all` atual pede as opções sem
saber o vendedor. Trocar por sequencial, porque a segunda chamada depende da
primeira:

```tsx
  const { id } = await params;
  const data = await getWorkspace(id);
  if (!data) notFound();

  // As opções dependem do vendedor já vinculado, então esta chamada vem depois.
  const { vendedores } = await getPropostaFormOptions(data.vendedorId);
```

O `return` com `key={data.updatedAt.toISOString()}` fica como está.

`src/app/propostas/nova/page.tsx` **não muda**: `getPropostaFormOptions()` sem
argumento continua correto (não há vínculo prévio).

- [ ] **Step 3: Fechar o débito no `BACKLOG.md`**

Marcar o item "**Vendedor inativo desaparece do cabeçalho da Proposta**" como
concluído, com a nota: *"Fechado na Sprint 4.2 (ADR-0410): `listUsuarioOptions`
une disponíveis ∪ vinculado, e o vinculado indisponível aparece rotulado."*

- [ ] **Step 4: Gate**

```bash
npm run typecheck
```

Esperado: os erros restantes vêm **apenas** de arquivos que ainda importam
`vendedor.service`/`tecnico.service` (Tasks 11-14). Nenhum erro pode vir de
`proposta.service.ts` nem de `src/app/propostas/`.

- [ ] **Step 5: Commit**

```bash
git add src/services/proposta.service.ts src/app/propostas BACKLOG.md
git commit -m "feat(propostas): select de vendedor por papel, com o vinculado sempre presente"
```

**Resultado esperado:** Select de Vendedor filtra por papel e nunca abre em
branco. Débito do BACKLOG fechado.

---

## Task 11 — Select de Técnico em Instalações

**Files:**
- Modify: `src/services/instalacao.service.ts` (imports e `listTecnicoOptionsDaInstalacao`)
- Modify: `src/app/instalacoes/nova/page.tsx`, `src/app/instalacoes/[id]/page.tsx`
- Create: `src/features/usuarios/usuario-select-field.tsx`
- Remove: `src/features/instalacoes/tecnico-select-field.tsx`
- Modify: `src/features/instalacoes/index.ts`, `nova-instalacao-form.tsx`,
  `instalacao-workspace.tsx`, `registro-dialog.tsx`

**Interfaces:**
- Consumes: `listUsuarioOptions`, `UsuarioOption` (Task 9)
- Produces: `listUsuarioOptionsDaInstalacao(instalacaoId: string): Promise<UsuarioOption[]>`;
  componente `UsuarioSelectField({ name, label, options, placeholder?, opcional?, disabled? })`

**Dependências:** Task 9.

- [ ] **Step 1: Repontar o service**

Em `src/services/instalacao.service.ts`, trocar o import de `./tecnico.service`
por:

```ts
import { listUsuarioOptions, type UsuarioOption } from "./usuario.service";
```

Renomear a função de opções — a lógica de coleta dos ids é **preservada**, é ela
que evita o campo em branco em instalação com técnico indisponível:

```ts
/**
 * Opções do Select de responsável desta instalação: usuários com papel de
 * técnico, mais TODOS os já vinculados a este agregado — o responsável atual e
 * o técnico de cada registro da cronologia —, ainda que indisponíveis.
 */
export async function listUsuarioOptionsDaInstalacao(
  instalacaoId: string,
): Promise<UsuarioOption[]> {
  const i = await prisma.instalacao.findUnique({
    where: { id: instalacaoId },
    select: {
      tecnicoResponsavelId: true,
      registros: { select: { tecnicoId: true } },
    },
  });
  if (!i) return listUsuarioOptions("ehTecnico");

  return listUsuarioOptions("ehTecnico", [
    ...(i.tecnicoResponsavelId ? [i.tecnicoResponsavelId] : []),
    ...i.registros.map((r) => r.tecnicoId),
  ]);
}
```

Trocar as ocorrências restantes do tipo `TecnicoOption` por `UsuarioOption` no
arquivo.

- [ ] **Step 2: Mover o componente de Select**

Criar `src/features/usuarios/usuario-select-field.tsx` com o conteúdo de
`src/features/instalacoes/tecnico-select-field.tsx`, aplicando:

- renomear a função para `UsuarioSelectField`;
- trocar `import type { TecnicoOption } from "@/services/tecnico.service"` por
  `import type { UsuarioOption } from "@/services/usuario.service"`;
- trocar o tipo da prop `options` para `UsuarioOption[]`;
- substituir o placeholder fixo `"Selecione o técnico"` por uma prop
  `placeholder?: string` com default `"Selecione"`, para o componente servir aos
  dois papéis;
- atualizar o comentário de cabeçalho para citar o ADR-0410 e as **duas** causas
  de indisponibilidade (inativo, sem o papel).

A sentinela `NENHUM = "__none__"` e todo o resto do corpo ficam idênticos.

Apagar `src/features/instalacoes/tecnico-select-field.tsx`.

- [ ] **Step 3: Atualizar os consumidores**

Em `nova-instalacao-form.tsx`, `instalacao-workspace.tsx` e `registro-dialog.tsx`:
trocar o import de `TecnicoSelectField` por
`import { UsuarioSelectField } from "@/features/usuarios"`, renomear o uso e
passar `placeholder="Selecione o técnico"`. Remover o export de
`TecnicoSelectField` de `src/features/instalacoes/index.ts`.

As props `tecnicos` das telas **mantêm o nome** — descrevem o papel naquele
contexto, exatamente como as colunas de FK. Só o tipo muda para `UsuarioOption[]`.

- [ ] **Step 4: Atualizar as rotas**

```tsx
// src/app/instalacoes/nova/page.tsx
import { listUsuarioOptions } from "@/services/usuario.service";
// ...
  // Criação não tem vínculo prévio: só os disponíveis.
  const tecnicos = await listUsuarioOptions("ehTecnico");
```

```tsx
// src/app/instalacoes/[id]/page.tsx
import {
  getInstalacao,
  listUsuarioOptionsDaInstalacao,
} from "@/services/instalacao.service";
// ...
  const [instalacao, tecnicos] = await Promise.all([
    getInstalacao(id),
    listUsuarioOptionsDaInstalacao(id),
  ]);
```

- [ ] **Step 5: Gate**

```bash
npm run typecheck
```

Esperado: nenhum erro em `instalacao.service.ts`, em `src/features/instalacoes/`
nem em `src/app/instalacoes/`. Erros restantes só nos arquivos das Tasks 12-14.

- [ ] **Step 6: Commit**

```bash
git rm src/features/instalacoes/tecnico-select-field.tsx
git add src/services/instalacao.service.ts src/app/instalacoes \
        src/features/usuarios/usuario-select-field.tsx src/features/instalacoes
git commit -m "feat(instalacoes): select de tecnico por papel, componente compartilhado"
```

**Resultado esperado:** os dois módulos consomem a mesma função de opções e o
mesmo componente de Select, cada um com seu papel.

---

## Task 12 — Guardas de papel nos três services

**Files:**
- Modify: `src/services/proposta.service.ts` (`criarPropostaCompleta`, `salvarProposta`, `duplicarProposta`)
- Modify: `src/services/instalacao.service.ts` (`criarInstalacao`, `atualizarInstalacao`)
- Modify: `src/services/instalacao-registro.service.ts` (`nomeDoTecnico`, `criarRegistro`, `atualizarRegistro`)

**Interfaces:**
- Consumes: `assertPapel(tx, usuarioId, papel)`, `semPapelMsg(papel)`,
  `USUARIO_NAO_ENCONTRADO` (Task 9)
- Produces: o comportamento que a Task 13 testa

**Dependências:** Tasks 9, 10, 11.

> **A REGRA (spec §5.2).** Vínculo **novo ou alterado** exige `ativo && ehPapel`.
> Vínculo **preexistente inalterado** é aceito sempre, sem verificação. Remover
> o vínculo (`→ null`) é aceito sempre.
>
> É isso que faz o §3 (histórico não quebra) coexistir com o §10 (papel é
> exigido). A forma é a mesma que `atualizarRegistro` já usa para o snapshot:
> comparar o persistido com o recebido, **dentro da transação**, e agir só na
> mudança.

- [ ] **Step 1: Proposta — criação**

Em `criarPropostaCompleta` (linha ~246), dentro do `prisma.$transaction`,
**antes** do `tx.proposta.create`:

```ts
    // Vínculo NOVO: exige papel de vendedor disponível. Nulo é permitido — a
    // proposta pode nascer sem vendedor (fluxo workspace-first).
    if (payload.vendedorId) {
      await assertPapel(tx, payload.vendedorId, "ehVendedor");
    }
```

- [ ] **Step 2: Proposta — atualização (`salvarProposta`)**

A função de edição chama-se **`salvarProposta(propostaId, payload)`** — não
`atualizarProposta`. Ela já abre a transação com um `findUniqueOrThrow` da
proposta (linhas ~361-368). **Aproveitar aquele `select`**, acrescentando uma
linha, em vez de fazer uma segunda consulta:

```ts
    const p = await tx.proposta.findUniqueOrThrow({
      where: { id: propostaId },
      select: {
        status: true,
        currentRevisionId: true,
        currentRevision: { select: { revisionNumber: true } },
        vendedorId: true, // ← acrescentado: o vínculo vigente, para comparar
      },
    });
```

Depois das duas checagens que já existem (`status === "CANCELADA"` e
`!p.currentRevisionId`), acrescentar a guarda:

```ts
    // A REGRA (ADR-0410): o papel é exigido apenas quando o vínculo MUDA.
    //
    // Uma proposta cujo vendedor foi inativado, ou que perdeu o papel depois,
    // continua salvável — corrigir o desconto de uma proposta antiga não pode
    // falhar por causa de uma mudança de cadastro posterior. Trocar o vendedor,
    // sim: aí é escolha nova, e escolha nova respeita a regra vigente.
    //
    // `p.vendedorId` foi lido DENTRO desta transação, junto do resto: a
    // comparação e a escrita enxergam o mesmo estado.
    if (payload.vendedorId && payload.vendedorId !== p.vendedorId) {
      await assertPapel(tx, payload.vendedorId, "ehVendedor");
    }
```

- [ ] **Step 3: Proposta — duplicação NÃO passa pela guarda**

Em `duplicarProposta`, **não** acrescentar `assertPapel`. Documentar com um
comentário sobre a linha `vendedorId: orig.vendedorId` do `tx.proposta.create`:

```ts
        // Vínculo COPIADO, não escolhido: não passa pela guarda de papel
        // (ADR-0410). Duplicar uma proposta antiga nunca pode falhar porque o
        // vendedor dela foi inativado ou perdeu o papel depois.
        vendedorId: orig.vendedorId,
```

- [ ] **Step 4: Instalação — criação e atualização**

Em `criarInstalacao`, dentro da transação, junto da leitura do cliente:

```ts
    // Vínculo NOVO: exige papel de técnico disponível. Nulo é permitido — a
    // instalação pode nascer sem responsável (é o caso da #1045 real).
    if (input.tecnicoResponsavelId) {
      await assertPapel(tx, input.tecnicoResponsavelId, "ehTecnico");
    }
```

Em `atualizarInstalacao`, a função já lê `atual` para comparar o status.
Acrescentar `tecnicoResponsavelId: true` àquele `select` e, depois da checagem
de existência:

```ts
    // Mesma regra da Proposta: papel exigido só quando o responsável MUDA.
    // Reagendar uma instalação cujo técnico foi inativado continua funcionando.
    if (
      input.tecnicoResponsavelId &&
      input.tecnicoResponsavelId !== atual.tecnicoResponsavelId
    ) {
      await assertPapel(tx, input.tecnicoResponsavelId, "ehTecnico");
    }
```

- [ ] **Step 5: Cronologia — papel obrigatório, sem alterar a regra do snapshot**

Em `src/services/instalacao-registro.service.ts`, trocar `nomeDoTecnico` para
ler de `usuarios` **e** exigir o papel na mesma leitura. Uma consulta só: o nome
e a verificação vêm do mesmo registro persistido, no mesmo instante.

```ts
import { LABEL_PAPEL } from "@/features/usuarios/opcoes";
// ...

/** Substitui `TECNICO_NAO_ENCONTRADO`. Reexportado abaixo por compatibilidade. */
export const USUARIO_NAO_ENCONTRADO = "Usuário não encontrado.";
export const SEM_PAPEL_TECNICO = `O usuário selecionado não tem o papel de ${LABEL_PAPEL.ehTecnico}.`;

/**
 * Nome do Usuário PERSISTIDO, lido dentro da transação, com o papel de técnico
 * exigido na MESMA leitura.
 *
 * O nome NUNCA vem do navegador — é a regra do snapshot de endereço (ADR-0400)
 * e do snapshot do responsável (ADR-0408). O papel entra aqui, e não em uma
 * consulta separada, porque as duas respostas precisam vir do mesmo estado.
 *
 * Diferente de Proposta e Instalação, aqui o responsável é OBRIGATÓRIO: um
 * acontecimento da cronologia sem quem o executou não é um fato registrável.
 */
async function nomeDoTecnico(tx: Tx, usuarioId: string): Promise<string> {
  const u = await tx.usuario.findUnique({
    where: { id: usuarioId },
    select: { nome: true, ativo: true, ehTecnico: true },
  });
  if (!u) throw new Error(USUARIO_NAO_ENCONTRADO);
  if (!u.ativo || !u.ehTecnico) throw new Error(SEM_PAPEL_TECNICO);
  return u.nome;
}
```

Remover a constante `TECNICO_NAO_ENCONTRADO` e ajustar quem a importa
(`registro-actions.ts`, se referenciar).

**Nada mais muda neste arquivo.** `criarRegistro` já chama `nomeDoTecnico`, e
`atualizarRegistro` já só chama quando `trocouTecnico` — que é exatamente a
regra de "vínculo alterado". A regra do snapshot do ADR-0408 fica intacta: o
`undefined` continua sendo o que impede o Prisma de tocar em `responsavelNome`.

- [ ] **Step 6: Gate**

```bash
npm run typecheck && npm run test:integration
```

Esperado: typecheck sem erros nos três services; a suíte de integração existente
(`instalacao-registro.integration.test.ts`) pode falhar aqui porque ainda cria
`prisma.tecnico` — **isso é resolvido na Task 13**. Registrar quais testes
falham e por quê antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add src/services/proposta.service.ts src/services/instalacao.service.ts \
        src/services/instalacao-registro.service.ts
git commit -m "feat(usuarios): guarda de papel em vinculo novo ou alterado nos tres services"
```

**Resultado esperado:** escolher alguém sem o papel é recusado no service.
Vínculos históricos continuam salváveis.

---

## Task 13 — Testes de integração: papel, histórico e cronologia

**Files:**
- Modify: `src/services/instalacao-registro.integration.test.ts`
- Modify: `src/services/usuario.service.integration.test.ts`

**Interfaces:**
- Consumes: tudo das Tasks 9 e 12

**Dependências:** Task 12.

> Fecha os casos 2, 3, 4, 5, 6, 8 e 9 da spec §10.2. Os casos 1, 7 e 10 já
> passaram na Task 9.

- [ ] **Step 1: Repontar o teste de cronologia existente para `usuario`**

Em `src/services/instalacao-registro.integration.test.ts`, trocar as três
ocorrências de `prisma.tecnico` por `prisma.usuario`, acrescentando os papéis:

```ts
  const tecnico = await prisma.usuario.create({
    data: { nome: `${MARCA} Tecnico`, ehTecnico: true },
    select: { id: true },
  });
```

```ts
  if (tecnicoId) await prisma.usuario.deleteMany({ where: { id: tecnicoId } });
```

```ts
    await prisma.usuario.update({
      // ... (o teste de renomeação já existente)
    });
```

- [ ] **Step 2: Escrever os casos novos que faltam**

Acrescentar ao fim de `instalacao-registro.integration.test.ts`. Declarar no
topo do arquivo, junto das outras `let`:

```ts
let semPapelId: string;
```

e criar o usuário no `beforeAll` existente:

```ts
  const semPapel = await prisma.usuario.create({
    data: { nome: `${MARCA} Sem Papel`, ehVendedor: true, ehTecnico: false },
    select: { id: true },
  });
  semPapelId = semPapel.id;
```

acrescentando a limpeza no `afterAll`:

```ts
  if (semPapelId) await prisma.usuario.deleteMany({ where: { id: semPapelId } });
```

Os casos:

```ts
describe("papel de técnico na cronologia (ADR-0410)", () => {
  it("recusa criar registro com usuário sem o papel de técnico", async () => {
    await expect(
      criarRegistro(instalacaoA, { ...entrada("Tentativa."), tecnicoId: semPapelId }),
    ).rejects.toThrow(SEM_PAPEL_TECNICO);
  });

  it("recusa criar registro com usuário inativo", async () => {
    const inativo = await prisma.usuario.create({
      data: { nome: `${MARCA} Inativo`, ativo: false, ehTecnico: true },
      select: { id: true },
    });
    await expect(
      criarRegistro(instalacaoA, { ...entrada("Tentativa."), tecnicoId: inativo.id }),
    ).rejects.toThrow(SEM_PAPEL_TECNICO);
    await prisma.usuario.delete({ where: { id: inativo.id } });
  });

  it("aceita um usuário com os DOIS papéis", async () => {
    const ambos = await prisma.usuario.create({
      data: { nome: `${MARCA} Ambos`, ehVendedor: true, ehTecnico: true },
      select: { id: true },
    });
    const { id } = await criarRegistro(instalacaoA, {
      ...entrada("Feito por quem também vende."),
      tecnicoId: ambos.id,
    });
    const r = await prisma.instalacaoRegistro.findUniqueOrThrow({
      where: { id },
      select: { tecnicoId: true, responsavelNome: true },
    });
    expect(r.tecnicoId).toBe(ambos.id);
    expect(r.responsavelNome).toBe(`${MARCA} Ambos`);

    await prisma.instalacaoRegistro.delete({ where: { id } });
    await prisma.usuario.delete({ where: { id: ambos.id } });
  });
});

describe("integridade histórica da cronologia (ADR-0408 preservado)", () => {
  it("renomear o Usuário NÃO altera o snapshot de registro existente", async () => {
    const antes = await prisma.instalacaoRegistro.findUniqueOrThrow({
      where: { id: registroA },
      select: { responsavelNome: true },
    });

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { nome: `${MARCA} Renomeado` },
    });

    const depois = await prisma.instalacaoRegistro.findUniqueOrThrow({
      where: { id: registroA },
      select: { responsavelNome: true },
    });
    expect(depois.responsavelNome).toBe(antes.responsavelNome);

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { nome: `${MARCA} Tecnico` },
    });
  });

  it("inativar o Usuário NÃO apaga nem altera o vínculo do registro", async () => {
    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { ativo: false },
    });

    const r = await prisma.instalacaoRegistro.findUniqueOrThrow({
      where: { id: registroA },
      select: { tecnicoId: true, responsavelNome: true },
    });
    expect(r.tecnicoId).toBe(tecnicoId);
    expect(r.responsavelNome).toBe(`${MARCA} Tecnico`);

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { ativo: true },
    });
  });

  it("editar só o relatório NÃO reescreve o snapshot, mesmo após renomear", async () => {
    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { nome: `${MARCA} Outro Nome` },
    });

    await atualizarRegistro(instalacaoA, registroA, {
      ...entrada("Relatorio corrigido, mesmo tecnico."),
      tecnicoId,
    });

    const r = await prisma.instalacaoRegistro.findUniqueOrThrow({
      where: { id: registroA },
      select: { responsavelNome: true, relatorio: true },
    });
    expect(r.responsavelNome).toBe(`${MARCA} Tecnico`); // preservado
    expect(r.relatorio).toBe("Relatorio corrigido, mesmo tecnico.");

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { nome: `${MARCA} Tecnico` },
    });
  });
});
```

Acrescentar `SEM_PAPEL_TECNICO` ao import do service no topo do arquivo.

- [ ] **Step 3: Escrever os casos de papel em Proposta e Instalação**

Acrescentar a `src/services/usuario.service.integration.test.ts`:

```ts
describe("guarda de papel em Proposta (ADR-0410)", () => {
  it("recusa vincular quem não tem papel de vendedor", async () => {
    await expect(
      criarPropostaCompleta({
        clienteId, vendedorId: tecnicoId, modelo: "COMERCIAL", validadeDias: 5,
        obsInternas: null, obsProposta: null, secoes: [],
      }),
    ).rejects.toThrow(semPapelMsg("ehVendedor"));
  });

  it("recusa vincular quem está inativo", async () => {
    await expect(
      criarPropostaCompleta({
        clienteId, vendedorId: inativoId, modelo: "COMERCIAL", validadeDias: 5,
        obsInternas: null, obsProposta: null, secoes: [],
      }),
    ).rejects.toThrow(semPapelMsg("ehVendedor"));
  });

  // O caso 3 da spec: a guarda não pode quebrar histórico.
  it("permite salvar uma proposta cujo vendedor perdeu o papel, sem trocá-lo", async () => {
    const p = await criarPropostaCompleta({
      clienteId, vendedorId: ambosId, modelo: "COMERCIAL", validadeDias: 5,
      obsInternas: null, obsProposta: null, secoes: [],
    });

    // O vendedor perde o papel DEPOIS de vinculado.
    await updateUsuario(ambosId, {
      ativo: true, nome: `${MARCA} Ambos`, ehVendedor: false, ehTecnico: true,
    });

    // Salvar outra alteração, mantendo o MESMO vendedor, continua funcionando.
    await expect(
      salvarProposta(p.id, {
        clienteId, vendedorId: ambosId, modelo: "COMERCIAL", validadeDias: 9,
        obsInternas: null, obsProposta: null, secoes: [],
      }),
    ).resolves.not.toThrow();

    const lido = await prisma.proposta.findUniqueOrThrow({
      where: { id: p.id },
      select: { vendedorId: true, validadeDias: true },
    });
    expect(lido.vendedorId).toBe(ambosId); // vínculo intacto
    expect(lido.validadeDias).toBe(9);

    await prisma.proposta.delete({ where: { id: p.id } });
    await updateUsuario(ambosId, {
      ativo: true, nome: `${MARCA} Ambos`, ehVendedor: true, ehTecnico: true,
    });
  });
});

describe("guarda de papel em Instalação (ADR-0410)", () => {
  it("vincula um usuário com papel de técnico", async () => {
    const i = await criarInstalacao({
      clienteId, propostaId: null, tecnicoResponsavelId: tecnicoId,
      status: "A_AGENDAR", dataPrevista: null, dataAgendada: null,
      periodo: "", observacoes: "",
    });
    const lido = await prisma.instalacao.findUniqueOrThrow({
      where: { id: i.id },
      select: { tecnicoResponsavelId: true },
    });
    expect(lido.tecnicoResponsavelId).toBe(tecnicoId);
    await prisma.instalacaoAuditoria.deleteMany({ where: { instalacaoId: i.id } });
    await prisma.instalacao.delete({ where: { id: i.id } });
  });

  it("recusa vincular quem não tem papel de técnico", async () => {
    await expect(
      criarInstalacao({
        clienteId, propostaId: null, tecnicoResponsavelId: vendedorId,
        status: "A_AGENDAR", dataPrevista: null, dataAgendada: null,
        periodo: "", observacoes: "",
      }),
    ).rejects.toThrow(semPapelMsg("ehTecnico"));
  });
});
```

Ajustar os imports do arquivo:

```ts
import { criarInstalacao } from "./instalacao.service";
import { criarPropostaCompleta, salvarProposta } from "./proposta.service";
import { semPapelMsg } from "./usuario.service";
```

E acrescentar ao `afterAll` a limpeza das propostas e instalações criadas
(`deleteMany` por `clienteId`, na ordem instalações → auditorias → propostas →
cliente, antes dos usuários — as FKs são `Restrict`).

- [ ] **Step 4: Rodar a suíte de integração inteira**

```bash
npm run test:integration
```

Esperado: **todos verdes**, nos dois arquivos.

- [ ] **Step 5: Commit**

```bash
git add src/services/usuario.service.integration.test.ts \
        src/services/instalacao-registro.integration.test.ts
git commit -m "test(integration): papel obrigatorio, historico preservado e cronologia intacta"
```

**Resultado esperado:** os 10 casos da spec §10.2 provados contra o PostgreSQL
real.

---

## Task 14 — Feature `usuarios/`, rotas, e remoção dos cadastros antigos

**Files:**
- Create: `src/features/usuarios/actions.ts`, `usuario-form.tsx`,
  `usuarios-list.tsx`, `index.ts`, `README.md`
- Create: `src/app/usuarios/page.tsx`, `novo/page.tsx`, `[id]/page.tsx`
- Remove: `src/features/vendedores/` (6 arquivos), `src/features/tecnicos/`
  (7 arquivos), `src/services/vendedor.service.ts`, `src/services/tecnico.service.ts`,
  `src/app/vendedores/` (3), `src/app/tecnicos/` (3)

**Interfaces:**
- Consumes: `usuarioSchema` (Task 8), o service inteiro (Task 9),
  `UsuarioSelectField` (Task 11)
- Produces: `UsuariosList`, `UsuarioForm`, e os exports do barrel

**Dependências:** Tasks 8, 9, 11.

- [ ] **Step 1: `actions.ts`**

Cópia literal de `src/features/vendedores/actions.ts` com as cinco funções
(`list`, `create`, `update`, `delete`, `toggleAtivo`), trocando: import do
`usuario.service`, `vendedorSchema` → `usuarioSchema`, `revalidatePath("/vendedores")`
→ `revalidatePath("/usuarios")`, e os nomes das ações para `*UsuarioAction` /
`listUsuariosAction`. Manter o comentário do `deleteUsuarioAction` que existe em
`tecnicos/actions.ts`:

```ts
    // A mensagem do bloqueio chega ao usuário como está — é ela que orienta
    // a inativar em vez de excluir.
```

- [ ] **Step 2: `usuario-form.tsx`**

Molde de `vendedor-form.tsx`, com a seção de papéis:

```tsx
      <FormSection title="Dados do usuário">
        <TextField name="nome" label="Nome" autoFocus />
        <MaskedField
          name="telefone"
          label="Telefone"
          inputMode="numeric"
          format={formatPhone}
        />
        <TextField name="email" label="E-mail" type="email" />
      </FormSection>

      <FormSection title="Papéis">
        {/* Independentes: a mesma pessoa pode ser as duas coisas, uma só, ou
            nenhuma (ADR-0410). Sem papel, não aparece em select nenhum. */}
        <SwitchField
          name="ehVendedor"
          label="Vendedor"
          description="Aparece como opção de Vendedor nas Propostas."
        />
        <SwitchField
          name="ehTecnico"
          label="Técnico"
          description="Aparece como opção de Técnico nas Instalações e na cronologia."
        />
        <SwitchField
          name="ativo"
          label="Ativo"
          description="Usuários inativos ficam ocultos por padrão e não aparecem como opção em novos vínculos."
        />
      </FormSection>
```

Títulos: `"Editar usuário"` / `"Novo usuário"`; toasts `"Usuário atualizado."` /
`"Usuário criado."`; navegação para `/usuarios`.

- [ ] **Step 3: `usuarios-list.tsx`**

Molde de `vendedores-list.tsx`, com as colunas de papel:

```tsx
import { UserCog } from "lucide-react";
// ...

/** Marca de papel — mesma leitura visual de `StatusBadge`, sem cor de estado. */
function Papel({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <span aria-label="sim">✓</span>
  ) : (
    <span aria-label="não" className="text-muted-foreground">—</span>
  );
}

const columns: CrudColumn<UsuarioListItem>[] = [
  { key: "nome", header: "Nome", cell: (u) => <span className="font-medium">{u.nome}</span> },
  {
    key: "ehVendedor",
    header: "Vendedor",
    getSortValue: (u) => (u.ehVendedor ? 1 : 0),
    cell: (u) => <Papel ativo={u.ehVendedor} />,
  },
  {
    key: "ehTecnico",
    header: "Técnico",
    getSortValue: (u) => (u.ehTecnico ? 1 : 0),
    cell: (u) => <Papel ativo={u.ehTecnico} />,
  },
  { key: "telefone", header: "Telefone", cell: (u) => u.telefone || "—" },
  { key: "email", header: "E-mail", cell: (u) => u.email || "—" },
  {
    key: "ativo",
    header: "Status",
    getSortValue: (u) => (u.ativo ? 1 : 0),
    cell: (u) => <StatusBadge ativo={u.ativo} />,
  },
];
```

Props do `CrudListView`: `title="Usuários"`,
`description="Cadastro de pessoas que atuam como vendedores e técnicos."`,
`searchPlaceholder="Buscar por nome, telefone ou e-mail..."`,
`emptyIcon={UserCog}`, `emptyTitle="Nenhum usuário encontrado"`,
`emptyDescription="Cadastre o primeiro usuário para começar."`,
`entityLabel="usuário"`, rotas `/usuarios` e `/usuarios/${id}`.

```tsx
      // A normalização de acento vem de `useCrudList`, que consome a fonte
      // única `@/utils/busca` (ADR-0402): "Joao" encontra "João".
      searchAccessor={(u) => [u.nome, u.telefone, u.email].filter(Boolean).join(" ")}
      initialSortKey="nome"
```

- [ ] **Step 4: `index.ts` e `README.md`**

```ts
export { UsuariosList } from "./usuarios-list";
export { UsuarioForm } from "./usuario-form";
export { UsuarioSelectField } from "./usuario-select-field";
export {
  usuarioSchema,
  usuarioDefaults,
  type UsuarioFormValues,
} from "./schema";
export {
  disponivelPara,
  rotuloOpcao,
  LABEL_PAPEL,
  type PapelUsuario,
  type UsuarioComPapeis,
} from "./opcoes";
```

`README.md`: molde do de `tecnicos/`, explicando papéis independentes, a regra
do select, o que a feature substitui e o que **não** é (autenticação).

- [ ] **Step 5: As três rotas**

Cópias diretas de `src/app/vendedores/*`, trocando os imports para
`@/features/usuarios` e `@/services/usuario.service`, e os `metadata.title` para
`"Usuários"` / `"Novo usuário"` / `"Editar usuário"`. Manter
`export const dynamic = "force-dynamic"` nas três.

```tsx
// src/app/usuarios/novo/page.tsx — o único com defaults
import { UsuarioForm } from "@/features/usuarios";
import { usuarioDefaults } from "@/features/usuarios";
// ...
  return <UsuarioForm defaultValues={usuarioDefaults} />;
```

- [ ] **Step 6: Remover o antigo**

```bash
git rm -r src/features/vendedores src/features/tecnicos \
          src/app/vendedores src/app/tecnicos \
          src/services/vendedor.service.ts src/services/tecnico.service.ts
```

- [ ] **Step 7: Gate**

```bash
npm run lint && npm run typecheck && npm run build && npm run test
```

Esperado: **os quatro limpos**. Este é o ponto em que a aplicação volta a
compilar por inteiro. O único teste que ainda deve falhar é
`src/lib/navigation.test.ts` — o menu é a Task 15. Se qualquer outro falhar,
parar e investigar.

- [ ] **Step 8: Commit**

```bash
git add src/features/usuarios src/app/usuarios
git commit -m "feat(usuarios): cadastro completo, rotas /usuarios e remocao de Vendedores/Tecnicos"
```

**Resultado esperado:** um cadastro no lugar de dois. Nenhuma referência a
`vendedor.service` ou `tecnico.service` resta em `src/`.

---

## Task 15 — Menu

**Files:**
- Modify: `src/lib/navigation.ts`
- Test: `src/lib/navigation.test.ts`

**Dependências:** Task 14.

- [ ] **Step 1: Atualizar o teste primeiro**

```ts
const ORDEM_ESPERADA = [
  "Dashboard",
  "Clientes",
  "Produtos",
  "Propostas",
  "Instalações",
  "Usuários",
  "Configurações",
];

describe("mainNavigation", () => {
  it("mantém exatamente a ordem definida na Sprint 4.2", () => {
    expect(mainNavigation.map((i) => i.title)).toEqual(ORDEM_ESPERADA);
  });

  it("tem exatamente sete itens — Vendedores e Técnicos viraram Usuários", () => {
    expect(mainNavigation).toHaveLength(7);
  });

  it("preserva as rotas de cada item", () => {
    expect(
      Object.fromEntries(mainNavigation.map((i) => [i.title, i.href])),
    ).toEqual({
      Dashboard: "/dashboard",
      Clientes: "/clientes",
      Produtos: "/produtos",
      Propostas: "/propostas",
      Instalações: "/instalacoes",
      Usuários: "/usuarios",
      Configurações: "/configuracoes",
    });
  });

  it("não expõe mais as rotas dos cadastros removidos", () => {
    const hrefs = mainNavigation.map((i) => i.href);
    expect(hrefs).not.toContain("/vendedores");
    expect(hrefs).not.toContain("/tecnicos");
  });

  it("todo item tem ícone", () => {
    for (const item of mainNavigation) {
      expect(item.icon, `"${item.title}" sem ícone`).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/lib/navigation.test.ts
```

Esperado: FAIL — ainda são 8 itens, com Vendedores e Técnicos.

- [ ] **Step 3: Implementar**

```ts
import {
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

import type { NavItem } from "@/types";

/**
 * Fonte única da navegação principal.
 *
 * A ordem é deliberada (Sprint 4.0.3, revista na 4.2) e travada por teste: o
 * Dashboard abre, depois vêm os cadastros que alimentam uma proposta (Cliente e
 * Produto), então o fluxo comercial (Propostas) e o operacional (Instalações),
 * depois o cadastro das pessoas que aparecem nos dois (Usuários) e por fim
 * Configurações.
 *
 * `Usuários` substitui `Vendedores` e `Técnicos`, que eram a mesma pessoa em
 * dois cadastros (ADR-0410). `UserCog` distingue de `Users`, que é Clientes.
 *
 * A home da aplicação (`/`) continua abrindo Propostas.
 */
export const mainNavigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Produtos", href: "/produtos", icon: Package },
  { title: "Propostas", href: "/propostas", icon: FileText },
  { title: "Instalações", href: "/instalacoes", icon: Wrench },
  { title: "Usuários", href: "/usuarios", icon: UserCog },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];
```

**Sem redirects** de `/vendedores` e `/tecnicos` — decisão registrada no
ADR-0410. Nenhum arquivo é criado em `src/app/vendedores` ou `src/app/tecnicos`.

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run src/lib/navigation.test.ts && npm run test
```

Esperado: PASS nos dois — a suíte de unidade inteira verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation.ts src/lib/navigation.test.ts
git commit -m "feat(menu): Usuarios substitui Vendedores e Tecnicos, sem redirects"
```

**Resultado esperado:** sete itens de menu, ordem travada por teste.

---

## Task 16 — Dashboard: remover "Custos acumulados"

**Files:**
- Modify: `src/features/dashboard/dashboard.ts`
- Modify: `src/features/dashboard/dashboard-view.tsx`
- Modify: `src/features/dashboard/dashboard.test.ts`
- Modify: `src/services/dashboard.service.ts`

**Dependências:** Task 15 (independente das anteriores, mas commitada depois
para manter o gate limpo).

> **Escopo exato.** Sai o card, o campo do DTO e a consulta que o alimentava.
> **Nada mais.** `InstalacaoCusto`, `CategoriaCustoInstalacao`,
> `features/instalacoes/custos.ts`, `custos-editor.tsx`, `resumo-custos.tsx`, o
> cálculo por instalação, os registros e o histórico ficam **integralmente
> intactos**. É a apresentação no Dashboard que sai, não o custo.

- [ ] **Step 1: Ajustar o teste primeiro**

Em `src/features/dashboard/dashboard.test.ts`:

- remover `custosAcumulados: 0` de `FONTE_VAZIA` e da fonte usada na linha ~189;
- apagar os três casos que hoje asseguram a soma (`repassa a soma dos custos
  acumulados`, o de arredondamento `0.1 + 0.2`, e o de fonte vazia);
- acrescentar o caso que trava a remoção:

```ts
  it("não expõe custos acumulados — saiu do Dashboard na Sprint 4.2", () => {
    // Apenas a APRESENTAÇÃO saiu. O custo por instalação segue em
    // `features/instalacoes/custos.ts`, intocado (ADR-0410).
    expect(montarDashboard(FONTE_VAZIA)).not.toHaveProperty("custosAcumulados");
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/features/dashboard/dashboard.test.ts
```

Esperado: FAIL — `custosAcumulados` ainda está no DTO, e o `FONTE_VAZIA` sem o
campo não satisfaz `FonteDashboard`.

- [ ] **Step 3: Implementar nas três camadas**

`src/features/dashboard/dashboard.ts`:
- remover `custosAcumulados: number` de `DashboardDTO` **e** de `FonteDashboard`;
- remover a linha `custosAcumulados: Math.round(...)` de `montarDashboard`.

`src/features/dashboard/dashboard-view.tsx`:
- remover o bloco `<Grupo titulo="Custos"> … </Grupo>` inteiro;
- remover `formatCurrency` do import de `@/utils` (fica só `formatDate`);
- rebalancear o grupo Comercial, que ficava com 2 cards numa fileira de 4:

```tsx
      <Grupo titulo="Comercial">
        {/* Dois indicadores: a fileira é de 2, não de 4. Com o grupo de Custos
            removido (Sprint 4.2), uma fileira de 4 deixaria metade vazia. */}
        <div className="grid gap-4 sm:grid-cols-2">
```

O grupo `Instalações` permanece em `sm:grid-cols-2 lg:grid-cols-5`. Nenhum
gráfico, indicador ou métrica nova.

`src/services/dashboard.service.ts`:
- remover `prisma.instalacaoCusto.aggregate(...)` do `Promise.all` e a variável
  `custos` da desestruturação — passam a ser **três** consultas;
- remover `custosAcumulados: toNumber(custos._sum.valor)` do `montarDashboard`;
- remover o helper `toNumber` (fica sem uso) e ajustar o comentário do topo, que
  diz "Quatro consultas em paralelo".

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run src/features/dashboard/dashboard.test.ts && npm run typecheck
```

Esperado: PASS e typecheck limpo.

- [ ] **Step 5: Confirmar que nada de custos foi tocado**

```bash
git diff --name-only HEAD | grep -i custo
```

Esperado: **saída vazia**. Se aparecer `features/instalacoes/custos.ts`,
`custos-editor.tsx` ou `resumo-custos.tsx`, algo saiu do escopo — reverter.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard src/services/dashboard.service.ts
git commit -m "feat(dashboard): remove custos acumulados da apresentacao e rebalanceia os cards"
```

**Resultado esperado:** Dashboard com dois grupos equilibrados, três consultas
em vez de quatro, e todo o domínio de custos intacto.

---

## Task 17 — Cleanup E2E

**Files:**
- Modify: `e2e/support/limpeza.ts`

**Dependências:** Task 14.

> **Mudança de dependência, não só de nome.** `tecnicos` era apagado por último
> por causa dos dois `Restrict` das instalações. `usuarios` ganha um **terceiro**
> referenciador que não existia antes — `propostas.vendedorId` — e a partir da
> M2 ele também é `Restrict`. A posição final continua correta, mas o motivo
> mudou e precisa estar escrito.

- [ ] **Step 1: Trocar marcador, contagem e consulta**

```ts
/** Usuário criado por teste: `E2E Usuario {rótulo} {timestamp}`. */
const MARCADOR_USUARIO = "E2E %";
```

Em `ContagemResiduos`, trocar `tecnicos: number` por `usuarios: number`. Em
`contar()`, trocar a última subconsulta:

```sql
       (SELECT count(*) FROM usuarios WHERE nome LIKE $3) AS usuarios
```

e o mapeamento `tecnicos: Number(r.tecnicos)` → `usuarios: Number(r.usuarios)`.

- [ ] **Step 2: Trocar o `DELETE` e documentar o motivo novo**

```ts
  // ── Usuários ────────────────────────────────────────────────────────────
  // Por ÚLTIMO: TRÊS relações apontam para `usuarios`, todas Restrict —
  // `Proposta.vendedorId` (novo na Sprint 4.2), `Instalacao.tecnicoResponsavelId`
  // e `InstalacaoRegistro.tecnicoId`. Instalações E propostas precisam ter saído
  // antes. A ordem acima já garante isso; este comentário existe para que
  // ninguém a reordene sem perceber a dependência nova.
  await client.query(`DELETE FROM usuarios WHERE nome LIKE $1`, [MARCADOR_USUARIO]);
```

Atualizar também o bloco de comentário da função `apagar`, que hoje lista
`Tecnico → Restrict ⇒ técnicos por último`.

- [ ] **Step 3: Gate**

```bash
npm run typecheck && npx tsc --noEmit -p tsconfig.json
```

Esperado: sem erros. `e2e/` está no tsconfig do projeto.

- [ ] **Step 4: Commit**

```bash
git add e2e/support/limpeza.ts
git commit -m "test(e2e): cleanup varre usuarios, com a dependencia nova de propostas"
```

**Resultado esperado:** o teardown varre usuários E2E e prova a limpeza pela
recontagem. Vendedores criados por teste, que antes ficariam como resíduo
permanente, passam a ser cobertos.

---

## Task 18 — E2E do cadastro e dos dois fluxos

**Files:**
- Create: `e2e/usuarios.spec.ts`
- Remove: `e2e/tecnicos.spec.ts`
- Modify: `e2e/instalacoes.spec.ts`, `e2e/dashboard.spec.ts`, `e2e/smoke.spec.ts`

**Dependências:** Tasks 14, 15, 17.

- [ ] **Step 1: Criar `e2e/usuarios.spec.ts`**

Base: `e2e/tecnicos.spec.ts`. O helper ganha os papéis — é ele que os outros
specs também vão usar como referência:

```ts
import { expect, test, type Page } from "@playwright/test";

/**
 * Cadastro de Usuários (Sprint 4.2, ADR-0410).
 *
 * Todo dado nasce com o prefixo `E2E ` — o marcador que o `globalTeardown`
 * varre (ADR-0403). Nenhum teste depende de dado preexistente no banco.
 */

interface Papeis {
  vendedor?: boolean;
  tecnico?: boolean;
}

/** Cria um usuário e devolve o nome, que é a chave de busca nos testes. */
async function criarUsuario(
  page: Page,
  rotulo: string,
  papeis: Papeis = {},
): Promise<string> {
  const nome = `E2E Usuario ${rotulo} ${Date.now()}`;
  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome").fill(nome);
  if (papeis.vendedor) await page.getByRole("switch", { name: "Vendedor" }).click();
  if (papeis.tecnico) await page.getByRole("switch", { name: "Técnico" }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  return nome;
}

async function buscar(page: Page, nome: string) {
  await page.goto("/usuarios");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(nome);
}

test("cria, edita e exclui um usuário", async ({ page }) => {
  const nome = await criarUsuario(page, "Basico", { vendedor: true });
  await buscar(page, nome);
  await expect(page.getByText(nome, { exact: true })).toBeVisible();

  await page.getByText(nome, { exact: true }).click();
  await expect(page).toHaveURL(/\/usuarios\/(?!novo$)[^/]+$/);
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
});

test("marca apenas Vendedor", async ({ page }) => {
  const nome = await criarUsuario(page, "So Vendedor", { vendedor: true });
  await buscar(page, nome);
  const linha = page.getByRole("row", { name: new RegExp(nome) });
  await expect(linha).toBeVisible();
  // A coluna Vendedor marca ✓ e a de Técnico marca —.
  await expect(linha.getByLabel("sim")).toHaveCount(1);
});

test("marca apenas Técnico", async ({ page }) => {
  const nome = await criarUsuario(page, "So Tecnico", { tecnico: true });
  await buscar(page, nome);
  await expect(page.getByRole("row", { name: new RegExp(nome) }).getByLabel("sim"))
    .toHaveCount(1);
});

test("marca os dois papéis na mesma pessoa", async ({ page }) => {
  const nome = await criarUsuario(page, "Ambos", { vendedor: true, tecnico: true });
  await buscar(page, nome);
  // Duas marcas ✓: Vendedor e Técnico. É o caso que motivou a Sprint.
  await expect(page.getByRole("row", { name: new RegExp(nome) }).getByLabel("sim"))
    .toHaveCount(2);
});

test("busca ignora acento e caixa", async ({ page }) => {
  const sufixo = Date.now();
  const nome = `E2E Usuario João Conceição ${sufixo}`;
  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome").fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);

  await page.getByRole("searchbox", { name: "Buscar" }).fill("joao conceicao");
  await expect(page.getByText(nome, { exact: true })).toBeVisible();
});

test("inativa e reativa", async ({ page }) => {
  const nome = await criarUsuario(page, "Inativar", { vendedor: true });
  await buscar(page, nome);
  await page.getByRole("row", { name: new RegExp(nome) })
    .getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Inativar" }).click();
  await page.getByRole("button", { name: "Inativar" }).click();

  await page.getByRole("switch", { name: /inativos/i }).click();
  await page.getByRole("searchbox", { name: "Buscar" }).fill(nome);
  await expect(page.getByText(nome, { exact: true })).toBeVisible();
});

test("vendedor aparece no fluxo de proposta; quem não é vendedor, não", async ({ page }) => {
  const vendedor = await criarUsuario(page, "No Fluxo Proposta", { vendedor: true });
  const tecnico = await criarUsuario(page, "Fora Do Fluxo Proposta", { tecnico: true });

  await page.goto("/propostas/nova");
  await page.getByLabel("Vendedor").click();
  await expect(page.getByRole("option", { name: vendedor, exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: tecnico, exact: true })).toHaveCount(0);
});

test("técnico aparece no fluxo de instalação; quem não é técnico, não", async ({ page }) => {
  const tecnico = await criarUsuario(page, "No Fluxo Instalacao", { tecnico: true });
  const vendedor = await criarUsuario(page, "Fora Do Fluxo Instalacao", { vendedor: true });

  const cliente = `E2E Usuario Cliente Instalacao ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome").fill(cliente);
  await page.getByRole("button", { name: "Salvar" }).click();

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente").fill(cliente);
  await page.getByRole("option", { name: new RegExp(cliente) }).click();
  await page.getByLabel("Responsável atual").click();
  await expect(page.getByRole("option", { name: tecnico, exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: vendedor, exact: true })).toHaveCount(0);
});

test("usuário com os dois papéis aparece nos dois fluxos", async ({ page }) => {
  const nome = await criarUsuario(page, "Nos Dois", { vendedor: true, tecnico: true });

  await page.goto("/propostas/nova");
  await page.getByLabel("Vendedor").click();
  await expect(page.getByRole("option", { name: nome, exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  const cliente = `E2E Usuario Cliente Dois ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome").fill(cliente);
  await page.getByRole("button", { name: "Salvar" }).click();

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente").fill(cliente);
  await page.getByRole("option", { name: new RegExp(cliente) }).click();
  await page.getByLabel("Responsável atual").click();
  await expect(page.getByRole("option", { name: nome, exact: true })).toBeVisible();
});

test("exclusão bloqueada depois de usado, com orientação para inativar", async ({ page }) => {
  const tecnico = await criarUsuario(page, "Usado", { tecnico: true });

  const cliente = `E2E Usuario Usado Cliente ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome").fill(cliente);
  await page.getByRole("button", { name: "Salvar" }).click();

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente").fill(cliente);
  await page.getByRole("option", { name: new RegExp(cliente) }).click();
  await page.getByLabel("Responsável atual").click();
  await page.getByRole("option", { name: tecnico, exact: true }).click();
  await page.getByRole("button", { name: "Salvar" }).click();

  await buscar(page, tecnico);
  await page.getByRole("row", { name: new RegExp(tecnico) })
    .getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText(/Utilize a opção Inativar/)).toBeVisible();

  await buscar(page, tecnico);
  await expect(page.getByText(tecnico, { exact: true })).toBeVisible();
});
```

> **Nota para o executor:** os seletores acima seguem os que já funcionam em
> `tecnicos.spec.ts` e `instalacoes.spec.ts`. Se algum divergir (por exemplo, o
> `SwitchField` expor `role="switch"` com outro nome acessível), ajustar pelo
> que o `npx playwright test --ui` mostrar — **não** trocar por seletor de CSS
> nem por `nth()`.

- [ ] **Step 2: Ajustar os helpers dos outros specs**

Em `e2e/instalacoes.spec.ts` e `e2e/dashboard.spec.ts`, o helper `criarTecnico`
passa a criar um Usuário com o papel de técnico:

```ts
/** Cria um Usuário com papel de Técnico (Sprint 4.2, ADR-0410). */
async function criarTecnico(page: Page, rotulo: string): Promise<string> {
  const nome = `E2E Usuario Tecnico ${rotulo} ${Date.now()}`;
  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome").fill(nome);
  await page.getByRole("switch", { name: "Técnico" }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  return nome;
}
```

Trocar as navegações diretas a `/tecnicos` por `/usuarios` nos dois arquivos
(em `instalacoes.spec.ts` são as linhas ~463, ~511, ~518 e os comentários que
dizem "navega para /tecnicos").

- [ ] **Step 3: Ajustar o smoke**

Em `e2e/smoke.spec.ts`:
- no teste `"abre Produtos e Vendedores"`: renomear para
  `"abre Produtos e Usuários"`, trocar o link e a URL para `/usuarios` e o
  heading para `"Usuários"`;
- na lista de itens do menu (~linha 179): trocar `"Vendedores"` e `"Técnicos"`
  por `"Usuários"` — a lista passa a ter 7;
- no mapa de rotas (~linhas 187-188): trocar os dois pares por
  `["Usuários", "/usuarios"]`.

- [ ] **Step 4: Remover o spec antigo**

```bash
git rm e2e/tecnicos.spec.ts
```

- [ ] **Step 5: Rodar a suíte E2E inteira**

Antes, matar qualquer `node` órfão que segure a porta do dev server.

```bash
npm run test:e2e
```

Esperado: **todos verdes**, e o `globalTeardown` reportando limpeza sem resíduo.

- [ ] **Step 6: Commit**

```bash
git add e2e/usuarios.spec.ts e2e/instalacoes.spec.ts e2e/dashboard.spec.ts e2e/smoke.spec.ts
git commit -m "test(e2e): cadastro de usuarios, papeis e presenca nos dois fluxos"
```

**Resultado esperado:** os seis cenários mínimos da spec §10.3 cobertos, mais o
caso negativo (quem não tem o papel não aparece).

---

## Task 19 — Seed e validate-crud

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `scripts/db/validate-crud.ts`

**Dependências:** Task 14.

- [ ] **Step 1: `prisma/seed.ts`**

Renomear a constante `VENDEDORES` para `USUARIOS`, acrescentando os papéis:

```ts
/** Usuários de exemplo. Ambos vendedores — o seed não cria técnicos. */
const USUARIOS = [
  { nome: "Carlos Gomes", telefone: "(11) 99756-7108",
    email: "carlos.gomes@outmat.com.br", ehVendedor: true, ehTecnico: false },
  { nome: "Vinicius Garcia", telefone: "(11) 99206-1917",
    email: "vinicius.garcia@outmat.com.br", ehVendedor: true, ehTecnico: true },
];
```

> `Vinicius Garcia` nasce com os **dois** papéis: é o estado que a M4 produz no
> banco real, e o seed deve reproduzir um banco equivalente.

Trocar `prisma.vendedor.count()` → `prisma.usuario.count()`,
`prisma.vendedor.createMany({ data: VENDEDORES })` →
`prisma.usuario.createMany({ data: USUARIOS })`, e
`prisma.vendedor.findMany` → `prisma.usuario.findMany` (a variável
`vendedoresList` pode manter o nome — descreve o papel na proposta que ela
alimenta, mas renomear para `usuariosList` é mais claro; escolher um e ser
consistente). Ajustar a mensagem final do log para `"usuários"`.

- [ ] **Step 2: `scripts/db/validate-crud.ts`**

```ts
import { createUsuario, removeUsuario } from "@/services/usuario.service";
// ...
  await prisma.usuario.deleteMany({ where: { nome: "Usuario Teste CRUD" } });
// ...
  // --- USUÁRIOS ------------------------------------------------------------
  console.log("\nUsuários:");
  const usuarioId = await createUsuario({
    ativo: true,
    nome: "Usuario Teste CRUD",
    ehVendedor: true,
    ehTecnico: true,
  });
  check("create", Boolean(usuarioId));
  await removeUsuario(usuarioId);
  check("excluir usuário sem uso é permitido", true);
```

- [ ] **Step 3: Gate**

```bash
npm run typecheck && npm run db:validate
```

Esperado: typecheck limpo e todos os `check` verdes.

> **Não rodar `npm run db:seed`** no banco de desenvolvimento: ele criaria
> duplicatas dos usuários reais. O seed é validado por typecheck; sua execução
> só faz sentido em banco vazio.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts scripts/db/validate-crud.ts
git commit -m "chore(db): seed e validate-crud passam a usar Usuario"
```

**Resultado esperado:** as duas ferramentas de banco alinhadas ao cadastro novo.

---

## Task 20 — M4: consolidação humana, específica desta base

**Files:**
- Create: `prisma/migrations/20260826030000_usuarios_consolidacao_outmat/migration.sql`

**Dependências:** Tasks 6, 18, 19. **Deliberadamente a última migration**, depois
de a aplicação estar funcionando e as três suítes verdes — se algo desse errado
antes daqui, a consolidação não teria acontecido e o rollback seria trivial.

> ### O que esta migration precisa garantir
>
> Você pediu guardas suficientes para que a M4 permaneça **decisão humana
> específica desta base**, nunca heurística genérica por nome. O desenho abaixo
> entrega isso por uma separação estrita:
>
> **Os ids são o SELETOR. Os nomes são apenas ASSERÇÃO.**
>
> Nenhuma linha é escolhida por nome. As duas pessoas são endereçadas pelos ids
> literais que a auditoria de 2026-08-26 registrou — um cuid e um uuid, valores
> globalmente únicos que **não existem em nenhum outro banco**. Os nomes
> aparecem só dentro de `IF ... RAISE EXCEPTION`, para verificar que a premissa
> auditada continua válida.
>
> Em uma restauração com conteúdo diferente, os ids não existem, a G1 devolve
> `RETURN` e **nada acontece**. Dois registros chamados "Vinicius" e "Vinicius
> Garcia" em outro banco, com ids diferentes, **jamais** seriam fundidos: a
> migration nem chega a olhar os nomes deles.
>
> **Duas semânticas de guarda, deliberadamente diferentes:**
>
> | Guarda | Situação | Reação |
> |---|---|---|
> | G1 | ids ausentes → outro banco | `RETURN` silencioso (com `NOTICE`) |
> | G2–G6 | ids presentes, estado inesperado | `RAISE EXCEPTION` — aborta tudo |
>
> Banco diferente não é erro; banco igual em estado inesperado é.

- [ ] **Step 1: Reconferir os ids contra o banco antes de escrever**

```bash
PGPASSWORD='Exposec-2010' "/c/Program Files/PostgreSQL/18/bin/psql.exe" \
  -U postgres -h localhost -p 5432 -d db_outsystem -c "
SELECT id, nome, ativo, \"ehVendedor\", \"ehTecnico\" FROM usuarios ORDER BY nome;"
```

Esperado exatamente:

```
cmrf506fv00085sooe4qbu9dw | Carlos Gomes    | t | t | f
2169f741-dad5-4034-af76-59f2c2f4a44a | Vinicius | t | f | t
cmrf51tt400095soowvrqfkl2 | Vinicius Garcia | t | t | f
```

Se qualquer id divergir, **pare** — a M1 não preservou os ids e a M4 não pode
ser escrita contra valores diferentes dos auditados.

- [ ] **Step 2: Escrever a migration**

```sql
-- Sprint 4.2 — consolidação de "Vinicius" em "Vinicius Garcia" (ADR-0410).
--
-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ ESTA MIGRATION É UMA DECISÃO HUMANA SOBRE DUAS PESSOAS ESPECÍFICAS.       ║
-- ║ NÃO é uma regra, NÃO é uma heurística, NÃO é generalizável.               ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
--
-- APROVADA em 2026-08-26 pelo dono do produto, contra esta auditoria:
--
--   usuarios (3 linhas, criadas pela M1 a partir dos cadastros antigos)
--     cmrf506fv00085sooe4qbu9dw  Carlos Gomes     ehVendedor
--     cmrf51tt400095soowvrqfkl2  Vinicius Garcia  ehVendedor  (ex-Vendedor)
--     2169f741-...-59f2c2f4a44a  Vinicius         ehTecnico   (ex-Técnico)
--
--   vínculos do absorvido: 0 propostas, 0 instalações, 3 registros
--
-- POR QUE ISTO NÃO ESTÁ NA M1. "Vinicius" e "Vinicius Garcia" são chaves
-- DISTINTAS por qualquer normalização defensável. Fundi-las exigiria casamento
-- por prefixo — que também fundiria "Carlos" com "Carlos Gomes". Essa é a
-- heurística obscura que a decisão do projeto proíbe (ADR-0408, mantido pelo
-- ADR-0410). As migrations estruturais (M1-M3) não contêm uma única linha de
-- lógica baseada em nome; toda consolidação vive aqui, isolada e assinada.
--
-- ┌─ COMO ESTA MIGRATION É SEGURA EM OUTRO BANCO ─────────────────────────────┐
-- │                                                                           │
-- │  OS IDS SÃO O SELETOR. OS NOMES SÃO APENAS ASSERÇÃO.                      │
-- │                                                                           │
-- │  Nenhuma linha é escolhida por nome. As duas pessoas são endereçadas       │
-- │  pelos ids literais abaixo — um cuid e um uuid, globalmente únicos, que    │
-- │  não existem em nenhum outro banco. Os nomes aparecem SOMENTE dentro de    │
-- │  verificações, para confirmar que a premissa auditada segue válida.        │
-- │                                                                           │
-- │  Restauração com conteúdo diferente → os ids não existem → G1 retorna e    │
-- │  NADA acontece. Dois registros chamados "Vinicius" e "Vinicius Garcia"     │
-- │  em outro banco, com outros ids, JAMAIS seriam fundidos: esta migration    │
-- │  nem chega a ler o nome deles.                                            │
-- │                                                                           │
-- │  Duas semânticas de guarda:                                               │
-- │    G1      ids ausentes (outro banco)      → RETURN silencioso            │
-- │    G2..G6  ids presentes, estado estranho  → RAISE EXCEPTION, aborta tudo │
-- └───────────────────────────────────────────────────────────────────────────┘
--
-- O QUE NÃO É TOCADO: instalacao_registros."responsavelNome". Os 3 registros
-- continuam dizendo "Vinicius", que é o que a cronologia sempre afirmou. É
-- justamente essa preservação que torna a fusão segura: o VÍNCULO passa a
-- apontar para a identidade correta, e o SNAPSHOT preserva o fato histórico
-- (ADR-0408). A coluna não aparece em nenhum SET deste arquivo.

DO $$
DECLARE
  -- SELETORES. Valores literais da base Outmat, auditados em 2026-08-26.
  ID_ABSORVIDO    CONSTANT text := '2169f741-dad5-4034-af76-59f2c2f4a44a';
  ID_SOBREVIVENTE CONSTANT text := 'cmrf51tt400095soowvrqfkl2';

  -- ASSERÇÕES. Nunca usadas para selecionar — só para verificar a premissa.
  NOME_ABSORVIDO    CONSTANT text := 'Vinicius';
  NOME_SOBREVIVENTE CONSTANT text := 'Vinicius Garcia';
  REGISTROS_ESPERADOS CONSTANT int := 3;

  n int;
  v_nome text;
  v_ativo boolean;
  v_vend boolean;
  v_tec boolean;
BEGIN
  -- ── G1: os dois ids existem? Se não, é OUTRO BANCO. Nada a consolidar. ────
  SELECT count(*) INTO n
    FROM "usuarios" WHERE "id" IN (ID_ABSORVIDO, ID_SOBREVIVENTE);
  IF n <> 2 THEN
    RAISE NOTICE '[consolidacao] ids da base Outmat nao encontrados (% de 2) — nada a consolidar, migration encerrada sem alteracao', n;
    RETURN;
  END IF;

  -- ── G2: o ABSORVIDO ainda é quem a auditoria descreveu? ──────────────────
  SELECT "nome", "ativo", "ehVendedor", "ehTecnico"
    INTO v_nome, v_ativo, v_vend, v_tec
    FROM "usuarios" WHERE "id" = ID_ABSORVIDO;

  IF v_nome <> NOME_ABSORVIDO THEN
    RAISE EXCEPTION
      '[consolidacao] usuario absorvido mudou de nome (esperado "%", encontrado "%") — a premissa auditada nao vale mais, migration abortada, nada foi alterado',
      NOME_ABSORVIDO, v_nome;
  END IF;
  IF v_tec <> true OR v_vend <> false THEN
    RAISE EXCEPTION
      '[consolidacao] usuario absorvido tem papeis inesperados (ehVendedor=%, ehTecnico=%) — migration abortada, nada foi alterado',
      v_vend, v_tec;
  END IF;

  -- ── G3: o SOBREVIVENTE ainda é quem a auditoria descreveu? ───────────────
  SELECT "nome", "ativo", "ehVendedor", "ehTecnico"
    INTO v_nome, v_ativo, v_vend, v_tec
    FROM "usuarios" WHERE "id" = ID_SOBREVIVENTE;

  IF v_nome <> NOME_SOBREVIVENTE THEN
    RAISE EXCEPTION
      '[consolidacao] usuario sobrevivente mudou de nome (esperado "%", encontrado "%") — migration abortada, nada foi alterado',
      NOME_SOBREVIVENTE, v_nome;
  END IF;
  IF v_vend <> true THEN
    RAISE EXCEPTION
      '[consolidacao] usuario sobrevivente perdeu o papel de vendedor — migration abortada, nada foi alterado';
  END IF;
  IF v_ativo <> true THEN
    RAISE EXCEPTION
      '[consolidacao] usuario sobrevivente esta inativo — fundir para dentro de um cadastro inativo esconderia a pessoa dos dois fluxos; migration abortada, nada foi alterado';
  END IF;

  -- ── G4: os vínculos batem exatamente com os auditados? ───────────────────
  SELECT count(*) INTO n FROM "propostas" WHERE "vendedorId" = ID_ABSORVIDO;
  IF n <> 0 THEN
    RAISE EXCEPTION
      '[consolidacao] absorvido tem % proposta(s), a auditoria registrou 0 — migration abortada, nada foi alterado', n;
  END IF;

  SELECT count(*) INTO n FROM "instalacoes" WHERE "tecnicoResponsavelId" = ID_ABSORVIDO;
  IF n <> 0 THEN
    RAISE EXCEPTION
      '[consolidacao] absorvido e responsavel por % instalacao(oes), a auditoria registrou 0 — migration abortada, nada foi alterado', n;
  END IF;

  SELECT count(*) INTO n FROM "instalacao_registros" WHERE "tecnicoId" = ID_ABSORVIDO;
  IF n <> REGISTROS_ESPERADOS THEN
    RAISE EXCEPTION
      '[consolidacao] absorvido tem % registro(s) na cronologia, a auditoria registrou % — migration abortada, nada foi alterado',
      n, REGISTROS_ESPERADOS;
  END IF;

  -- O sobrevivente não pode ter registros próprios: senão a contagem da G6,
  -- depois do repontamento, deixaria de ser exata.
  SELECT count(*) INTO n FROM "instalacao_registros" WHERE "tecnicoId" = ID_SOBREVIVENTE;
  IF n <> 0 THEN
    RAISE EXCEPTION
      '[consolidacao] sobrevivente ja tem % registro(s) proprio(s), a auditoria registrou 0 — migration abortada, nada foi alterado', n;
  END IF;

  -- ═══ AÇÕES ═══════════════════════════════════════════════════════════════

  -- 1. O sobrevivente acumula o papel de técnico. `ehVendedor` não é tocado.
  UPDATE "usuarios"
     SET "ehTecnico" = true, "updatedAt" = now()
   WHERE "id" = ID_SOBREVIVENTE;

  -- 2. Reponta APENAS o vínculo dos registros.
  --    "responsavelNome" NÃO APARECE NESTE SET, de propósito: os 3 registros
  --    continuam dizendo "Vinicius". O vínculo passa a apontar para a
  --    identidade correta; o snapshot preserva o fato (ADR-0408).
  UPDATE "instalacao_registros"
     SET "tecnicoId" = ID_SOBREVIVENTE
   WHERE "tecnicoId" = ID_ABSORVIDO;

  -- ── G5: nenhuma referência pode restar antes do DELETE ───────────────────
  SELECT (SELECT count(*) FROM "propostas"            WHERE "vendedorId"           = ID_ABSORVIDO)
       + (SELECT count(*) FROM "instalacoes"          WHERE "tecnicoResponsavelId" = ID_ABSORVIDO)
       + (SELECT count(*) FROM "instalacao_registros" WHERE "tecnicoId"            = ID_ABSORVIDO)
    INTO n;
  IF n <> 0 THEN
    RAISE EXCEPTION
      '[consolidacao] ainda restam % referencia(s) ao usuario absorvido — migration abortada, nada foi alterado', n;
  END IF;

  -- ── G6: os snapshots históricos continuam intactos ───────────────────────
  SELECT count(*) INTO n
    FROM "instalacao_registros"
   WHERE "tecnicoId" = ID_SOBREVIVENTE
     AND "responsavelNome" = NOME_ABSORVIDO;
  IF n <> REGISTROS_ESPERADOS THEN
    RAISE EXCEPTION
      '[consolidacao] esperados % registros com responsavelNome "%", encontrados % — o snapshot historico foi alterado, migration abortada, nada foi alterado',
      REGISTROS_ESPERADOS, NOME_ABSORVIDO, n;
  END IF;

  -- 3. Só agora o absorvido sai. As três FKs são Restrict: se a G5 tivesse
  --    falhado em enxergar algo, o banco recusaria este DELETE de qualquer jeito.
  DELETE FROM "usuarios" WHERE "id" = ID_ABSORVIDO;

  RAISE NOTICE '[consolidacao] "%" absorvido em "%": % registro(s) repontado(s), snapshots preservados',
    NOME_ABSORVIDO, NOME_SOBREVIVENTE, REGISTROS_ESPERADOS;
END $$;
```

- [ ] **Step 3: Provar que a migration não tem lógica por nome nas estruturais**

```bash
grep -nEi "lower|ilike| like |btrim|regexp_replace|similar" \
  prisma/migrations/20260826000000_usuarios_estrutura/migration.sql \
  prisma/migrations/20260826010000_usuarios_vinculos/migration.sql \
  prisma/migrations/20260826020000_usuarios_drop_legado/migration.sql
```

Esperado: **apenas** a linha do `btrim("nome") = ''` da guarda G3 da M1 — que
verifica valor vazio, não casa nomes entre si. Nenhum `lower`, `LIKE`,
`regexp_replace` ou `similar`.

- [ ] **Step 4: Aplicar**

```bash
npm run db:migrate:deploy
```

Esperado: a migration aplica e o PostgreSQL emite o `NOTICE` final
`[consolidacao] "Vinicius" absorvido em "Vinicius Garcia": 3 registro(s)
repontado(s), snapshots preservados`.

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations/20260826030000_usuarios_consolidacao_outmat
git commit -m "feat(db): M4 consolida Vinicius em Vinicius Garcia (decisao humana, guardas por id)"
```

**Resultado esperado:** dois usuários no banco; `Vinicius Garcia` com os dois
papéis; os 3 registros repontados com `responsavelNome` inalterado.

---

## Task 21 — Auditoria PÓS-migration

**Files:**
- Modify: `PROJECT_HISTORY.md`

**Dependências:** Task 20.

- [ ] **Step 1: Rodar o mesmo script da Task 2**

```bash
npx tsx scripts/db/audit-usuarios.ts > /tmp/audit-pos.json
cat /tmp/audit-pos.json
```

**Esperado:**

```
cadastros: vendedores=null, tecnicos=null, usuarios=2
listas.usuarios:
  { nome: "Carlos Gomes",    ativo: true, ehVendedor: true, ehTecnico: false }
  { nome: "Vinicius Garcia", ativo: true, ehVendedor: true, ehTecnico: true  }
vinculos: propostasComVendedor=2, instalacoesComTecnico=0, registros=3
cronologia: 3 linhas, todas com
            tecnicoId       = cmrf51tt400095soowvrqfkl2   (Vinicius Garcia)
            responsavelNome = "Vinicius"                  ← PRESERVADO
```

- [ ] **Step 2: Provar que nenhum vínculo foi perdido**

```bash
diff <(jq .vinculos /tmp/audit-pre.json) <(jq .vinculos /tmp/audit-pos.json) \
  && echo "VINCULOS PRESERVADOS: 2 + 0 + 3"
```

Esperado: `VINCULOS PRESERVADOS: 2 + 0 + 3`. As contagens têm de ser
**idênticas** às da auditoria pré.

```bash
diff <(jq -r '.cronologia[].responsavelNome' /tmp/audit-pre.json) \
     <(jq -r '.cronologia[].responsavelNome' /tmp/audit-pos.json) \
  && echo "SNAPSHOTS HISTORICOS IDENTICOS"
```

Esperado: `SNAPSHOTS HISTORICOS IDENTICOS`. O `tecnicoId` **mudou** (é a fusão
aprovada); o `responsavelNome` **não pode** ter mudado.

- [ ] **Step 3: Registrar no `PROJECT_HISTORY.md`**

Colar o JSON pós na seção reservada e acrescentar a tabela comparativa:

| Item | Pré | Pós | Observação |
|---|---|---|---|
| Cadastros | 2 vendedores + 1 técnico | 2 usuários | fusão aprovada do Vinicius |
| Propostas com vendedor | 2 | 2 | idêntico |
| Instalações com técnico | 0 | 0 | idêntico |
| Registros na cronologia | 3 | 3 | idêntico |
| `responsavelNome` | "Vinicius" ×3 | "Vinicius" ×3 | **preservado** |
| `tecnicoId` dos registros | Vinicius (técnico) | Vinicius Garcia | repontado pela M4 |

- [ ] **Step 4: Commit**

```bash
git add PROJECT_HISTORY.md
git commit -m "docs(historico): auditoria pos-migration — vinculos e snapshots preservados"
```

**Resultado esperado:** prova documentada de que nenhum vínculo foi perdido e de
que o histórico da cronologia não foi reescrito.

---

## Task 22 — Documentação final

**Files:**
- Modify: `ARCHITECTURE.md`, `CHANGELOG.md`, `BACKLOG.md`,
  `docs/CHECKLIST_RELEASE.md`, `README.md`, `PROJECT_CONTEXT.md`

**Dependências:** Task 21.

- [ ] **Step 1: `ARCHITECTURE.md`**

Substituir as menções a Vendedores/Técnicos como cadastros separados por
Usuários com papéis. Atualizar: o mapa de features, a lista de services, a
tabela de rotas e o diagrama/lista de models. Acrescentar o par
`usuario.service.ts` ↔ `features/usuarios/opcoes.ts` à lista de módulos puros,
junto de `dashboard` e `proposta-pdf`.

- [ ] **Step 2: `CHANGELOG.md`**

Nova seção no topo:

```markdown
## [1.5.0] — 2026-08-26 — Sprint 4.2: Usuário único com papéis operacionais

### Adicionado
- Cadastro de **Usuários** (`/usuarios`) com papéis independentes de Vendedor e
  Técnico. A mesma pessoa pode exercer os dois (ADR-0410).
- Guarda de papel nos services: escolher alguém sem o papel é recusado em
  Proposta, Instalação e cronologia — apenas em vínculo novo ou alterado.
- Suíte de integração do cadastro (`usuario.service.integration.test.ts`).

### Alterado
- Selects de Vendedor e Técnico passam a filtrar por `ativo && papel`, e sempre
  incluem quem já está vinculado, rotulado `(inativo)` ou `(sem papel de …)`.
- Menu: `Usuários` substitui `Vendedores` e `Técnicos` — sete itens.
- `propostas.vendedorId` passa de `ON DELETE SET NULL` para `RESTRICT`,
  alinhando as três FKs.
- Dashboard: "Custos extras acumulados" saiu da apresentação e os cards de
  Comercial foram rebalanceados.

### Removido
- Cadastros de **Vendedores** e **Técnicos** (models, tabelas, services,
  features e rotas). Sem redirects — ver ADR-0410.

### Migração
- `usuarios_estrutura` (M1), `usuarios_vinculos` (M2), `usuarios_drop_legado`
  (M3) e `usuarios_consolidacao_outmat` (M4). Vínculos preservados: 2 propostas,
  0 instalações, 3 registros. Snapshots da cronologia inalterados.

### Corrigido
- Vendedor inativo desaparecia do cabeçalho da Proposta (débito do BACKLOG).
```

- [ ] **Step 3: `BACKLOG.md`**

Confirmar que o item do vendedor inativo está fechado (Task 10). Se **R3 tiver
sido recusado**, acrescentar item novo: *"`propostas.vendedorId` continua
`ON DELETE SET NULL` enquanto as outras duas FKs são `RESTRICT` — apagar um
usuário fora do service zeraria o vínculo em silêncio."*

- [ ] **Step 4: `docs/CHECKLIST_RELEASE.md`**

Acrescentar às Observações:

```markdown
- **Auditoria pré/pós de migração de dados.** Introduzida na Sprint 4.2
  (ADR-0410). Quando uma Sprint migra dados entre estruturas, as contagens de
  vínculo antes e depois vão para o `PROJECT_HISTORY.md`. Migration não é
  reexecutável em suíte de teste: a prova é a guarda dentro da própria migration
  somada à comparação documentada.
```

- [ ] **Step 5: `README.md` e `PROJECT_CONTEXT.md`**

Trocar as menções aos dois cadastros pela descrição do cadastro único. Não criar
documento novo — o ADR-0410 e a spec já cobrem o raciocínio.

- [ ] **Step 6: Commit**

```bash
git add ARCHITECTURE.md CHANGELOG.md BACKLOG.md docs/CHECKLIST_RELEASE.md \
        README.md PROJECT_CONTEXT.md
git commit -m "docs: atualiza arquitetura, changelog e checklist para a Sprint 4.2"
```

**Resultado esperado:** documentação coerente com o código, sem redundância.

---

## Task 23 — VERSION 1.5.0 e gate oficial

**Files:**
- Modify: `VERSION`, `package.json`
- Modify: `PROJECT_HISTORY.md` (evidências do gate)

**Dependências:** Task 22.

- [ ] **Step 1: Subir a versão**

```bash
echo "1.5.0" > VERSION
```

Em `package.json`, trocar `"version": "1.4.0"` por `"version": "1.5.0"`. Não
rodar `npm version` — mexeria em tags e no `package-lock.json`.

- [ ] **Step 2: Rodar o gate obrigatório inteiro, na ordem**

Antes: matar qualquer processo `node` órfão e confirmar o PostgreSQL rodando.

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run test:integration
npm run test:e2e
```

Esperado: **os seis limpos**. Item 5 e item 6 do checklist exigem banco
disponível.

- [ ] **Step 3: Itens 7 a 10 do checklist**

Com o servidor de desenvolvimento no ar:

```bash
curl -s http://localhost:3000/api/health
```

Esperado: `200` com `{ "status": "ok" }`.

Abrir `/dev/diagnostics` e confirmar status `ok`, Prisma conectado e tempos
normais. Registrar os números.

- [ ] **Step 4: Conferência visual do Dashboard e do cadastro**

Gate manual, sem teste automatizado que o cubra:
- `/dashboard` — dois grupos, sem o card de Custos, cards alinhados sem buraco;
- `/usuarios` — colunas Vendedor e Técnico legíveis, busca funcionando;
- `/propostas/[id]` de uma proposta real — o Select mostra o vendedor vinculado;
- `/instalacoes/1045` — a cronologia mostra "Vinicius" nos três registros
  (snapshot) enquanto o cadastro se chama "Vinicius Garcia". **Esta é a
  verificação visual mais importante da Sprint.**

- [ ] **Step 5: Registrar as evidências**

No `PROJECT_HISTORY.md`, preencher a tabela do gate com os resultados
(contagens de teste por suíte, tempos do diagnostics, confirmação dos gates
manuais).

- [ ] **Step 6: Commit de fechamento**

```bash
git add VERSION package.json PROJECT_HISTORY.md
git commit -m "chore(release): 1.5.0 — Sprint 4.2 Usuario unico com papeis operacionais"
```

- [ ] **Step 7: Registrar o hash**

```bash
git log --oneline -1
```

Acrescentar o hash ao `PROJECT_HISTORY.md` (item 14 do checklist) em um commit
de ajuste, ou emendar antes de publicar.

**Resultado esperado:** Sprint 4.2 fechada em 1.5.0, com as três suítes verdes e
as evidências registradas.

---

## Self-review do plano

**Cobertura da spec** — cada seção tem task:

| Spec | Task |
|---|---|
| §3 modelagem | 3, 4 |
| §3.1 telefone/email, sem índice composto | 3 |
| §3.2 nomes de coluna preservados | 3, 4, 5 |
| §3.3 ativo × papéis | 7, 8 |
| §3.4 exclusão pelos três vínculos | 9 |
| §4.1 `listUsuarioOptions` | 9, 10, 11 |
| §4.2 rótulo e precedência | 7 |
| §4.3 chamadores | 10, 11 |
| §5 guarda de papel | 12, 13 |
| §5.4 snapshot da cronologia | 12, 13 |
| §6 migração M1–M4 | 4, 5, 6, 20 |
| §6.6 auditoria pré/pós | 2, 21 |
| §7 feature e rotas | 8, 14 |
| §8 menu, sem redirects | 15 |
| §9 Dashboard | 16 |
| §10.1 unidade | 7, 8, 15, 16 |
| §10.2 integração (10 casos) | 9, 13 |
| §10.3 E2E | 18 |
| §10.4 cleanup | 17 |
| §11 seed e validate-crud | 19 |
| §12 compatibilidade | Global Constraints + 16 Step 5 |
| §13 versão e documentação | 1, 22, 23 |

**Consistência de tipos** — `PapelUsuario`, `UsuarioComPapeis`, `UsuarioOption`,
`UsuarioListItem`, `UsuarioFormDTO`, `UsuarioInput` são definidos nas Tasks 7 e 9
e usados com os mesmos nomes nas Tasks 10, 11, 12, 13 e 14. `assertPapel(tx, id,
papel)` tem a mesma assinatura na Task 9 (definição) e na Task 12 (uso).
`rotuloOpcao` e `disponivelPara` idem.

**Lacuna consciente:** a spec §10.2 lista "preservação dos vínculos após
migração" como caso de integração. Não virou teste automatizado — uma migration
não é reexecutável em suíte. Coberto pelas guardas das Tasks 4, 5, 20 e pela
comparação documentada das Tasks 2 e 21, e declarado como tal na Task 22 Step 4.
