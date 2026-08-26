# Sprint 4.2 — Usuário único com papéis operacionais

> Design apresentado em 2026-08-26. Versão de entrada: **1.4.0**. Versão de
> saída proposta: **1.5.0**.
>
> Substitui parcialmente o ADR-0408 nas partes "Vendedor continua não sendo
> reutilizado" e "Técnico não é Usuário". Não inicia autenticação, login,
> permissão ou agenda — o `Usuario` desta Sprint **não é um principal de
> autenticação** (§2.5).

---

## 1. Objetivo

Substituir os cadastros separados de **Vendedores** e **Técnicos** por um
cadastro único de **Usuários** com papéis independentes, e simplificar o
Dashboard.

1. criar `Usuario` (`nome`, `ativo`, `ehVendedor`, `ehTecnico`, `telefone`,
   `email`);
2. migrar `Vendedor` e `Tecnico` para `Usuario` sem perda de dado e sem quebrar
   vínculo;
3. repontar `Proposta.vendedorId`, `Instalacao.tecnicoResponsavelId` e
   `InstalacaoRegistro.tecnicoId` para `usuarios`;
4. filtrar todo select de Vendedor por `ativo && ehVendedor`, e todo select de
   Técnico por `ativo && ehTecnico`;
5. preservar o histórico: nem a inativação, nem a remoção de papel, nem a
   renomeação podem alterar registros antigos;
6. remover `vendedores` e `tecnicos` do banco, do menu e das rotas;
7. remover "Custos acumulados" do Dashboard — **apenas** da apresentação.

---

## 2. Auditoria — o que foi apurado antes do design

### 2.1. Os dois models

| Model | Campos | Vínculos de entrada |
|---|---|---|
| `Vendedor` → `vendedores` | `id, ativo, nome, telefone?, email?, createdAt, updatedAt` | `Proposta.vendedorId` — nullable, sem `onDelete` explícito |
| `Tecnico` → `tecnicos` | `id, ativo, nome, createdAt, updatedAt` | `Instalacao.tecnicoResponsavelId` — nullable, `Restrict`<br>`InstalacaoRegistro.tecnicoId` — **NOT NULL**, `Restrict` |

`InstalacaoRegistro.responsavelNome` (NOT NULL) é o snapshot histórico do nome,
derivado no service dentro da transação. Não é vínculo — é conteúdo.

### 2.2. Dados reais em `db_outsystem`, consultados em 2026-08-26

**Vendedores — 2 linhas**

| nome | ativo | telefone | email |
|---|---|---|---|
| Carlos Gomes | ✓ | (11) 99756-7108 | carlos.gomes@outmat.com.br |
| Vinicius Garcia | ✓ | (11) 99206-1917 | vinicius.garcia@outmat.com.br |

**Técnicos — 1 linha**

| nome | ativo |
|---|---|
| Vinicius | ✓ |

**Vínculos — 5 no total, nenhum órfão**

| Origem | Qtde | Detalhe |
|---|---|---|
| `propostas.vendedorId` | 2 | #1001 (RASCUNHO) e #1002 (EMITIDA) → Carlos Gomes. #1016 sem vendedor. |
| `instalacoes.tecnicoResponsavelId` | **0** | Instalação #1045 está sem responsável atual. |
| `instalacao_registros.tecnicoId` | 3 | Todos → Vinicius; `responsavelNome` = `"Vinicius"` nos três. |

**Chave normalizada cruzada** (`lower(regexp_replace(btrim(nome), '\s+',' ','g'))`
— a mesma do ADR-0408, que deliberadamente **não** remove acento):

```
carlos gomes     → VENDEDOR "Carlos Gomes"
vinicius         → TECNICO  "Vinicius"
vinicius garcia  → VENDEDOR "Vinicius Garcia"
```

**Zero colisões automáticas.** Uma migration dirigida por dados produz **3**
usuários, não 2. A consolidação de "Vinicius" com "Vinicius Garcia" é decisão
humana e está tratada em §6.5.

### 2.3. Superfície de código — 38 arquivos

**Services.** `vendedor.service.ts` e `tecnico.service.ts` (CRUD completo);
`proposta.service.ts` (`getPropostaFormOptions`, gravação de `vendedorId` em
criar/atualizar/duplicar); `proposta-conteudo.service.ts`,
`proposta-pdf.service.ts` e `proposta-pdf.mapper.ts` (leem `vendedor.nome`);
`instalacao.service.ts` (`listTecnicoOptionsDaInstalacao`);
`instalacao-registro.service.ts` (`nomeDoTecnico`, regra do snapshot);
`dashboard.service.ts` (`tecnicoResponsavel.nome` + `instalacaoCusto.aggregate`).

**Features.** `vendedores/` e `tecnicos/` completos (schema, actions, form, list,
index, README); `propostas/` (cabeçalho, dois workspaces, list, schema);
`instalacoes/` (`tecnico-select-field.tsx`, schema, registro-schema, workspaces);
`dashboard/` (módulo puro, view, teste).

**Rotas.** Seis: `/vendedores`, `/vendedores/novo`, `/vendedores/[id]`,
`/tecnicos`, `/tecnicos/novo`, `/tecnicos/[id]`.

**Infra e testes.** `lib/navigation.ts` + `navigation.test.ts` (a ordem do menu é
travada por teste); `lib/messages.ts` (duas constantes); `prisma/seed.ts`;
`scripts/db/validate-crud.ts`; `e2e/support/limpeza.ts`; quatro specs E2E.

### 2.4. Três confirmações que dispensam trabalho

- **Nenhum autocomplete.** Vendedor e Técnico usam `Select` alimentado no
  servidor. Autocomplete existe só para cliente, produto e proposta. Não há
  busca server-side de pessoa a reescrever.
- **A busca já é única.** `CrudListView`/`useCrudList` consomem `contemBusca` de
  `utils/busca.ts` (ADR-0402), que já é case- e accent-insensitive. Nenhuma
  lógica de normalização nova entra nesta Sprint.
- **`responsavelNome` não é tocado pela migração.** É texto puro em
  `instalacao_registros`, sem FK. A regra do ADR-0408 continua valendo sem
  alteração de coluna.

### 2.5. O ADR-0408 proíbe explicitamente esta mudança

Dois bullets daquele ADR precisam de supersede argumentado, não de omissão:

> **`Vendedor` continua não sendo reutilizado** […] um instalador ou técnico não
> é vendedor, e usar o mesmo cadastro poluiria o autocomplete da Proposta com
> nomes que nunca deveriam aparecer ali, além de distorcer a regra de exclusão
> "já foi usado em uma proposta".

> **Técnico não é Usuário.** Não há login, permissão, agenda ou qualquer vínculo
> com autenticação.

O primeiro argumento era correto **para um cadastro sem papéis**. Reutilizar
`Vendedor` como estava realmente poluiria o select de Técnico e vice-versa. O
que muda é que a identidade passa a carregar papéis explícitos: o select filtra
por `ehVendedor`/`ehTecnico`, então nenhum nome aparece onde não deve, e a regra
de exclusão passa a contar os **três** vínculos, o que a torna significativa para
qualquer combinação de papéis. O ADR-0410 responde ponto a ponto.

O segundo bullet **continua valendo e precisa ser reafirmado**: este `Usuario`
não tem login, senha, permissão nem agenda. É a pessoa que executa trabalho
operacional, não quem opera o sistema. Quando houver autenticação, "registrado
por" continua sendo campo novo e aditivo, distinto de `vendedorId` e
`tecnicoId` — exatamente como o ADR-0408 antecipou. O nome `Usuario` foi
escolhido pelo dono do produto; o risco de colisão semântica com o futuro
principal de autenticação fica registrado aqui e no ADR-0410.

---

## 3. Modelagem alvo

```prisma
model Usuario {
  id         String   @id @default(cuid())
  ativo      Boolean  @default(true)
  nome       String
  ehVendedor Boolean  @default(false)
  ehTecnico  Boolean  @default(false)
  telefone   String?
  email      String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  propostasComoVendedor Proposta[]           @relation("PropostaVendedor")
  instalacoes           Instalacao[]         @relation("InstalacaoTecnico")
  registros             InstalacaoRegistro[] @relation("RegistroTecnico")

  @@index([ativo])
  @@map("usuarios")
}
```

### 3.1. Decisões de campo

**`telefone` e `email` permanecem.** O requisito pede "pelo menos" nome, ativo e
os dois papéis. Os dois vendedores reais têm telefone e e-mail preenchidos;
descartá-los seria perda de dado sem contrapartida. Ficam nulos para quem veio
de `Tecnico`.

**Sem índice composto por papel.** `@@index([ativo, ehVendedor])` seria correto
em tese e inútil em três linhas. Segue apenas `@@index([ativo])`, no padrão de
Cliente, Produto, Vendedor e Técnico. Entra quando o volume justificar.

**Relações nomeadas obrigatórias.** `Usuario` tem três relações consigo; o
Prisma exige `@relation("nome")` explícito em todas quando há mais de uma entre
os mesmos dois models. Os nomes acima são internos ao schema e não aparecem em
nenhum lugar do código de aplicação.

### 3.2. Nomes de coluna preservados

`Proposta.vendedorId`, `Instalacao.tecnicoResponsavelId` e
`InstalacaoRegistro.tecnicoId` **mantêm os nomes atuais**. Uma coluna de FK
nomeia o *papel naquele vínculo*, não a tabela de origem: "o usuário que atua
como vendedor nesta proposta" continua sendo `vendedorId`.

A consequência prática é grande e é o motivo da escolha: ficam intocados o DTO
do PDF (`consultor`), os schemas Zod de proposta e instalação, as props dos
componentes, o mapper e os workspaces. Nenhuma mudança de contrato — item 11 do
pedido.

Os campos de **relação** do Prisma seguem a mesma lógica: `Proposta.vendedor`,
`Instalacao.tecnicoResponsavel`, `InstalacaoRegistro.tecnico`. Só o *tipo* muda,
de `Vendedor?`/`Tecnico?` para `Usuario?`. `proposta-pdf.mapper.ts` continua
lendo `p.vendedor?.nome` sem uma linha alterada.

### 3.3. `ativo` e papéis são dois eixos independentes

- `ativo` responde "esta pessoa ainda trabalha aqui";
- `ehVendedor` / `ehTecnico` respondem "o que ela faz".

Um usuário está **disponível para um vínculo novo naquele papel** quando
`ativo === true && ehPapel === true`. Há duas formas de ficar indisponível —
inativado, ou papel desmarcado — e o efeito operacional é idêntico: some da
lista de escolhas novas. O que difere é só o rótulo (§4.2).

Nenhuma das duas mexe em vínculo já gravado. Nunca, em lugar nenhum.

### 3.4. Exclusão

`removeUsuario` conta os **três** vínculos e usa uma mensagem única:

```ts
const [emPropostas, emInstalacoes, emRegistros] = await Promise.all([
  prisma.proposta.count({ where: { vendedorId: id } }),
  prisma.instalacao.count({ where: { tecnicoResponsavelId: id } }),
  prisma.instalacaoRegistro.count({ where: { tecnicoId: id } }),
]);
if (emPropostas + emInstalacoes + emRegistros > 0)
  throw new Error(CANNOT_DELETE_USED_IN_RECORDS);
```

> "Este usuário já foi utilizado em propostas ou instalações e não pode ser
> excluído. Utilize a opção Inativar."

`CANNOT_DELETE_USED_IN_PROPOSTAS` e `CANNOT_DELETE_USED_IN_INSTALACOES` ficam
sem uso e são removidos de `lib/messages.ts`.

---

## 4. Regra dos selects

### 4.1. Função única

```ts
export type PapelUsuario = "ehVendedor" | "ehTecnico";

export async function listUsuarioOptions(
  papel: PapelUsuario,
  incluirIds: string[] = [],
): Promise<UsuarioOption[]>
```

```ts
where: { OR: [{ ativo: true, [papel]: true }, { id: { in: ids } }] }
orderBy: { nome: "asc" }
```

Substitui `getPropostaFormOptions` (que hoje filtra só `ativo: true`) e
`listTecnicoOptions`. `incluirIds` carrega os usuários já vinculados àquele
agregado, mesmo indisponíveis — sem eles, abrir uma proposta cujo vendedor foi
inativado mostra o campo em branco, e salvar qualquer outra alteração apaga o
vínculo em silêncio.

**Isto fecha o débito registrado no `BACKLOG.md`** ("Vendedor inativo desaparece
do cabeçalho da Proposta", prioridade média). Não é escopo acrescentado por
conveniência: o débito existe porque o select de Vendedor não fazia a união que
o de Técnico já fazia, e esta Sprint funde os dois selects em um. Corrigi-lo é
consequência mecânica da unificação; deixá-lo aberto exigiria escrever a versão
defeituosa de propósito.

### 4.2. Rótulo — módulo puro

A causa da indisponibilidade é distinguida no rótulo:

```
Carlos Gomes                        ← disponível
João (inativo)                      ← ativo === false
Marcos (sem papel de vendedor)      ← ativo, mas ehVendedor === false
```

`"(inativo)"` é exatamente o rótulo que `listTecnicoOptions` já produz — o
padrão existente é preservado, e o segundo caso, que não existia antes, ganha
texto próprio em vez de ser mentido como "inativo".

**Precedência:** quando as duas condições valem ao mesmo tempo (inativo **e**
sem o papel), o rótulo é `"(inativo)"`. Um só sufixo, nunca dois: inativo é a
condição mais forte — a pessoa não está disponível para nada — e é o rótulo que
o usuário do sistema já conhece.

A regra vive em `features/usuarios/opcoes.ts`, módulo **puro** (sem Prisma, sem
IO, sem React), testado na suíte de unidade:

```ts
export function rotuloOpcao(
  u: { nome: string; ativo: boolean; ehVendedor: boolean; ehTecnico: boolean },
  papel: PapelUsuario,
): string
```

O service faz o IO e chama o módulo puro — mesmo par que `dashboard.service` /
`features/dashboard/dashboard.ts` e `proposta-pdf.service` / `mapper`.

### 4.3. Chamadores

| Local | Chamada |
|---|---|
| `/propostas/nova` | `listUsuarioOptions("ehVendedor")` — não há proposta ainda |
| `/propostas/[id]` | `listUsuarioOptions("ehVendedor", [vendedorId])` |
| `/instalacoes/nova` | `listUsuarioOptions("ehTecnico")` |
| `/instalacoes/[id]` | `listUsuarioOptions("ehTecnico", [tecnicoResponsavelId, ...registros.tecnicoId])` — a lógica de coleta de `listTecnicoOptionsDaInstalacao` é preservada |

---

## 5. Guarda de papel no service

### 5.1. Por que existe

O item 10 do pedido exige provar que "usuário sem papel vendedor não pode ser
escolhido/vinculado onde a regra exigir vendedor". Hoje não há regra: o service
grava `vendedorId` sem verificar nada, e a única barreira é a lista do select.

Uma guarda ingênua ("`vendedorId` sempre precisa apontar para alguém com
`ehVendedor`") quebraria §3 do pedido: uma proposta antiga cujo vendedor perdeu
o papel falharia ao salvar qualquer edição.

### 5.2. A regra

Vale a mesma forma já usada em `atualizarRegistro` para o snapshot — comparar o
persistido com o recebido e agir **só na mudança**:

```
vínculo NOVO ou ALTERADO        → exige ativo && ehPapel; senão, erro
vínculo PREEXISTENTE inalterado → aceito sempre, sem verificação
vínculo removido (→ null)       → aceito sempre
```

É isso que faz §3 e §10 coexistirem. Escolher um não-vendedor é recusado no
**service**, não só na tela; manter o vendedor que já estava lá nunca é
recusado.

### 5.3. Onde se aplica

| Service | Campo | Papel | Obrigatório? |
|---|---|---|---|
| `proposta.service` — criar / atualizar / duplicar | `vendedorId` | `ehVendedor` | não (nullable) |
| `instalacao.service` — criar / atualizar | `tecnicoResponsavelId` | `ehTecnico` | não (nullable) |
| `instalacao-registro.service` — criar | `tecnicoId` | `ehTecnico` | **sim** |
| `instalacao-registro.service` — atualizar | `tecnicoId` | `ehTecnico` | sim, verificado só se mudou |

Na **duplicação** de proposta o `vendedorId` é copiado do original: é vínculo
preexistente, não escolha nova, e por isso não passa pela guarda. Duplicar uma
proposta antiga nunca pode falhar por causa de um papel removido depois.

### 5.4. Cronologia — o que **não** muda

A regra do snapshot do ADR-0408 fica intacta, palavra por palavra:

```
1. registro criado com o Usuário "Carlos"      → responsavelNome = "Carlos"
2. cadastro renomeado para "Carlos Almeida"
3. edita SÓ o relatório                        → responsavelNome = "Carlos"   ← preservado
4. edita e troca o responsável para "Bruno"    → responsavelNome = "Bruno"    ← reescrito
```

`nomeDoTecnico(tx, id)` passa a ler de `usuarios` em vez de `tecnicos`. É a
única alteração no arquivo. `undefined` continua sendo o mecanismo que impede o
Prisma de tocar na coluna quando o técnico não mudou.

Renomear um Usuário **não altera retroativamente** nenhum nome histórico.
Inativá-lo ou desmarcar o papel Técnico também não — nem o snapshot, nem o
vínculo.

---

## 6. Migração

Quatro etapas, no molde comprovado da migração de Técnicos: aditiva → backfill
com guarda → drop → decisão humana isolada.

### 6.1. M1 — `usuarios_estrutura` (aditiva)

- `CREATE TABLE usuarios` + `@@index([ativo])`;
- `ALTER TABLE propostas ADD COLUMN "usuarioVendedorId" TEXT` (nullable);
- `ALTER TABLE instalacoes ADD COLUMN "usuarioTecnicoId" TEXT` (nullable);
- `ALTER TABLE instalacao_registros ADD COLUMN "usuarioTecnicoId" TEXT` (nullable);
- três FKs `ON DELETE RESTRICT` + índices.

Nenhum dado existente é lido, alterado ou removido.

### 6.2. M2 — `usuarios_backfill` (dirigida pelos dados, zero nome hardcoded)

1. **Um `Usuario` por vendedor**, com `ehVendedor = true`, preservando `nome`,
   `ativo`, `telefone`, `email`, `createdAt`. `gen_random_uuid()::text` gera o
   id (nativo desde o PostgreSQL 13, sem extensão nem superusuário — respeita o
   ADR-0101; `cuid()` não serve, é gerado pelo cliente Prisma).
2. **Um `Usuario` por técnico** cuja chave normalizada **não** coincida com a de
   nenhum usuário já criado, com `ehTecnico = true`. Chave coincidente apenas
   liga `ehTecnico = true` no registro existente.
3. **Backfill** das três colunas novas a partir das antigas, via join pelo id do
   cadastro de origem — nunca por nome.
4. **Guarda.** `RAISE EXCEPTION` dentro da transação da migration se:
   - alguma `propostas."vendedorId" IS NOT NULL` ficar com `"usuarioVendedorId" IS NULL`;
   - alguma `instalacoes."tecnicoResponsavelId" IS NOT NULL` ficar com `"usuarioTecnicoId" IS NULL`;
   - alguma linha de `instalacao_registros` ficar com `"usuarioTecnicoId" IS NULL`;
   - `count(usuarios)` divergir de
     `count(vendedores) + count(tecnicos cuja chave normalizada não coincide com a de nenhum vendedor)`;
   - algum `Usuario` ficar com `ehVendedor = false` **e** `ehTecnico = false`
     (todo usuário criado pela migração vem de um cadastro que tinha papel).

   Abortar é o comportamento correto: em um banco cujo conteúdo a chave não
   resolva, é preferível a migration falhar e alguém olhar, a ela inventar um
   mapeamento. O Prisma roda cada migration em transação, então a exceção
   reverte tudo.
5. `ALTER TABLE instalacao_registros ALTER COLUMN "usuarioTecnicoId" SET NOT NULL`.

A chave de normalização é a do ADR-0408 — `lower` + `btrim` + espaços internos
colapsados, **sem remover acento**, pelo mesmo motivo de lá: "João" e "Joao"
podem ou não ser a mesma pessoa, e inventar essa correspondência é decisão de
negócio disfarçada de detalhe de migration.

### 6.3. M3 — `usuarios_drop_legado`

Só depois de a guarda ter passado:

- `DROP COLUMN` de `propostas."vendedorId"`, `instalacoes."tecnicoResponsavelId"`,
  `instalacao_registros."tecnicoId"`;
- `RENAME COLUMN` das três novas para exatamente aqueles nomes;
- `DROP TABLE vendedores`, `DROP TABLE tecnicos`.

Manter a coluna antiga viva até aqui é o que permite à guarda da M2 comparar
origem e destino lado a lado. É a prova de "nenhum vínculo perdido".

**`instalacao_registros.responsavelNome` permanece.** Não confundir: é o
snapshot histórico, e é justamente o que impede que renomear um Usuário
reescreva a cronologia.

### 6.4. Ordem de deploy

M1–M3 vão juntas no mesmo release, com o commit que troca a aplicação para
`Usuario`. O escalonamento existe para tornar cada passo **verificável**, não
para rodar a aplicação entre eles.

### 6.5. M4 — `usuarios_consolidacao_outmat` (decisão humana, aprovada em 2026-08-26)

Separada de propósito: M1–M3 são estruturais e corretas em qualquer banco
restaurado de backup; M4 é uma decisão sobre **estas pessoas específicas**.

Sem M4, o resultado seria três usuários:

```
Carlos Gomes      [x] Vendedor  [ ] Técnico
Vinicius Garcia   [x] Vendedor  [ ] Técnico
Vinicius          [ ] Vendedor  [x] Técnico
```

Fundir "Vinicius" em "Vinicius Garcia" é casamento por prefixo, que também
fundiria "Carlos" com "Carlos Gomes". Por isso **não entra na M2**: seria
exatamente a heurística obscura que a decisão proíbe.

**Aprovado em 2026-08-26:** fundir, com "Vinicius Garcia" como sobrevivente
(nome completo, telefone e e-mail preenchidos).

A M4 então:

1. marca `ehTecnico = true` no usuário "Vinicius Garcia";
2. reponta os 3 registros da cronologia de "Vinicius" para "Vinicius Garcia";
3. **`responsavelNome` continua `"Vinicius"` nos três** — o histórico diz o que
   sempre disse. Esta é a razão de a fusão ser segura: o vínculo aponta para a
   identidade certa, e o snapshot preserva o que a timeline afirmava;
4. guarda: aborta se sobrar qualquer referência ao usuário absorvido;
5. `DELETE` do usuário "Vinicius".

O par é declarado como lista `VALUES` no cabeçalho da migration, com data e
justificativa, e é **no-op seguro** se as chaves não existirem — um banco
restaurado de outro backup não é corrompido.

Resultado final:

```
Carlos Gomes      [x] Vendedor  [ ] Técnico
Vinicius Garcia   [x] Vendedor  [x] Técnico
```

### 6.6. Verificação pré/pós

Uma migration não é reexecutável em suíte de teste, então a prova de
integridade é um script de auditoria (`scripts/db/audit-usuarios.ts`) rodado
antes e depois, capturando:

- contagem de `vendedores`, `tecnicos`, `usuarios`;
- contagem dos 5 vínculos, por origem;
- lista de nomes;
- os 3 pares `(tecnicoId, responsavelNome)` da cronologia.

As duas saídas ficam registradas no `PROJECT_HISTORY.md`. **Esperado após M4:**
2 usuários, 2 propostas vinculadas, 0 instalações com responsável, 3 registros
vinculados a "Vinicius Garcia" com `responsavelNome = "Vinicius"`.

---

## 7. Feature `usuarios/`

Estrutura idêntica a `vendedores/`, com os dois checkboxes a mais:

```
src/features/usuarios/
  schema.ts        usuarioSchema, usuarioDefaults, UsuarioFormValues
  schema.test.ts
  opcoes.ts        rotuloOpcao — módulo puro (§4.2)
  opcoes.test.ts
  actions.ts       list/create/update/delete/toggleAtivo
  usuario-form.tsx via CrudFormShell
  usuarios-list.tsx via CrudListView
  usuario-select-field.tsx   (substitui instalacoes/tecnico-select-field.tsx)
  index.ts
  README.md
```

```ts
export const usuarioSchema = z.object({
  ativo: z.boolean(),
  nome: requiredText("Nome", 200),
  ehVendedor: z.boolean(),
  ehTecnico: z.boolean(),
  telefone: optionalText(30),
  email: optionalEmail,
});
```

**Sem validação cruzada entre papéis.** Um usuário com os dois desmarcados é
válido: é a pessoa cadastrada que ainda não recebeu função, e proibir isso
tornaria impossível criar o cadastro antes de decidir o papel. Ela simplesmente
não aparece em select nenhum.

**Colunas da listagem:** Nome, Vendedor, Técnico, Telefone, E-mail, Status. Os
papéis como marca visual (✓ / —), no padrão de `StatusBadge`.

**Busca:** `searchAccessor={(u) => [u.nome, u.telefone, u.email].filter(Boolean).join(" ")}`
— idêntico a `vendedores-list.tsx`, servido pelo `contemBusca` compartilhado.
Sem filtro por papel na listagem: não foi pedido.

**Rotas:** `/usuarios`, `/usuarios/novo`, `/usuarios/[id]`.

**Removidos:** `features/vendedores/`, `features/tecnicos/`,
`features/instalacoes/tecnico-select-field.tsx`, `services/vendedor.service.ts`,
`services/tecnico.service.ts`, `app/vendedores/`, `app/tecnicos/`.

---

## 8. Menu

```
Dashboard · Clientes · Produtos · Propostas · Instalações · Usuários · Configurações
```

Sete itens. `Usuários` → `/usuarios`, ícone `UserCog` (verificado disponível no
lucide-react instalado; `Users` já é de Clientes e `UserSquare`/`HardHat` saem
com os cadastros antigos). `navigation.test.ts` é reescrito: sete itens, nova
ordem, novo mapa de rotas.

### 8.1. Redirects de `/vendedores` e `/tecnicos` — não implementar

Aplicação interna, sem SEO, sem link externo, sem API pública. Os únicos
consumidores dessas URLs são o menu — reescrito — e os specs E2E, também
reescritos. Um redirect manteria vivos por tempo indeterminado os dois nomes
que a Sprint existe para eliminar, com arquivos e testes a manter. Um bookmark
antigo devolve 404 e a pessoa usa o menu. Decisão registrada no ADR-0410.

---

## 9. Dashboard

**Remoção de "Custos acumulados"** em três camadas, para não deixar consulta
órfã ao banco:

- `features/dashboard/dashboard-view.tsx` — sai o `<Grupo titulo="Custos">`;
- `features/dashboard/dashboard.ts` — sai `custosAcumulados` de `DashboardDTO`,
  de `FonteDashboard` e do `montarDashboard`;
- `services/dashboard.service.ts` — sai o `prisma.instalacaoCusto.aggregate` e o
  helper `toNumber` se ficar sem uso. Passam a ser **três** consultas paralelas.

**Nada mais é removido.** `InstalacaoCusto`, `CategoriaCustoInstalacao`,
`features/instalacoes/custos.ts`, `custos-editor.tsx`, `resumo-custos.tsx`, o
cálculo por instalação, os registros e o histórico ficam **integralmente
intactos**. É a apresentação no Dashboard que sai, não o custo.

**Rebalanceamento.** Os dois grupos semânticos são preservados; só o grid de
`Comercial` muda, de `sm:grid-cols-2 lg:grid-cols-4` (2 cards numa fileira de 4,
visivelmente vazia) para `sm:grid-cols-2`, de modo que os dois cards preencham a
linha. `Instalações` segue em `lg:grid-cols-5`. Nenhum gráfico, indicador ou
métrica nova.

`dashboard.test.ts` perde os quatro casos de `custosAcumulados`; os demais
(contagens, próximas, ordenação, vazio) ficam.

---

## 10. Testes — ADR-0409, as três suítes

### 10.1. Unidade — `npm run test`

| Arquivo | Cobre |
|---|---|
| `features/usuarios/schema.test.ts` | nome obrigatório e limite; papéis booleanos independentes; defaults; campo extra descartado no parse |
| `features/usuarios/opcoes.test.ts` | rótulo limpo quando disponível; `(inativo)`; `(sem papel de vendedor)`; `(sem papel de técnico)`; precedência quando inativo **e** sem papel |
| `lib/navigation.test.ts` | sete itens, nova ordem, novo mapa de rotas |
| `features/dashboard/dashboard.test.ts` | remoção dos casos de `custosAcumulados` |

### 10.2. Integração — `npm run test:integration`

Novo `src/services/usuario.service.integration.test.ts`, mais casos acrescidos a
`instalacao-registro.integration.test.ts`. Dados marcados com `E2E `, varridos
pelo mesmo `globalTeardown`.

| # | Caso | Prova |
|---|---|---|
| 1 | Usuário `ehVendedor` vinculado a proposta | vínculo grava e lê |
| 2 | Usuário sem `ehVendedor` recusado em vínculo **novo** de proposta | guarda §5.2 |
| 3 | Proposta cujo vendedor perdeu o papel continua salvável sem trocar o vendedor | §3 do pedido — a guarda não quebra histórico |
| 4 | Usuário `ehTecnico` vinculado a instalação e a registro | vínculo grava e lê |
| 5 | Usuário sem `ehTecnico` recusado ao criar registro (papel obrigatório) | guarda §5.3 |
| 6 | Usuário com **os dois** papéis serve proposta e instalação ao mesmo tempo | a identidade única funciona nos dois fluxos |
| 7 | `removeUsuario` bloqueado por cada um dos três vínculos, isoladamente | §3.4 |
| 8 | Renomear o Usuário **não** altera `responsavelNome` de registro existente | integridade da cronologia |
| 9 | Editar só o relatório **não** reescreve o snapshot; trocar o técnico reescreve | ADR-0408 preservado |
| 10 | `listUsuarioOptions` devolve ativos-com-papel ∪ `incluirIds`, e exclui inativo não vinculado | §4.1 |

**Sobre "preservação dos vínculos após migração" (item 10 do pedido).** Uma
migration não é reexecutável dentro de uma suíte. A prova é a guarda da M2/M4
(que aborta a transação inteira) somada à auditoria pré/pós de §6.6. Os casos 6
e 8 acima cobrem os invariantes do **estado pós-migração**, que é o que um teste
pode legitimamente afirmar.

### 10.3. E2E — `npm run test:e2e`

**Novo** `e2e/usuarios.spec.ts`, adaptado de `tecnicos.spec.ts`:

- criar usuário; editar; inativar/reativar;
- marcar apenas Vendedor; marcar apenas Técnico; marcar **ambos**;
- busca accent-insensitive (o caso "João Conceição" já existente);
- exclusão bloqueada após uso, com a mensagem orientando a inativar;
- vendedor aparecendo no select do fluxo de proposta;
- técnico aparecendo no select do fluxo de instalação;
- usuário sem o papel **não** aparecendo no select correspondente.

**Ajustados:** `instalacoes.spec.ts` e `dashboard.spec.ts` — o helper
`criarTecnico` passa a criar um Usuário com `ehTecnico` marcado, via
`/usuarios/novo`; `smoke.spec.ts` — lista de itens do menu e rotas.

### 10.4. Cleanup E2E — `e2e/support/limpeza.ts`

`tecnicos` → `usuarios` em `ContagemResiduos`, no marcador (`E2E %`, inalterado)
e no `DELETE`.

**Mudança de ordem, obrigatória.** Técnicos era apagado por último por causa dos
dois `Restrict` de instalações. `usuarios` ganha um terceiro referenciador —
`propostas.vendedorId` — que não existia antes. O `DELETE FROM usuarios` fica
depois de instalações **e** de propostas. A ordem atual já apaga propostas antes
dos cadastros base, então a posição final continua correta; o comentário do
arquivo precisa registrar o motivo novo. A recontagem do fim prova o resultado.

Efeito colateral positivo: vendedores criados por teste passam a ser varridos —
hoje nenhum é criado, e se algum fosse, ficaria como resíduo permanente.

---

## 11. Seed e validação

- `prisma/seed.ts` — `VENDEDORES` vira `USUARIOS`, com `ehVendedor: true` nos
  dois nomes atuais. A contagem final do log passa a reportar usuários.
- `scripts/db/validate-crud.ts` — `createVendedor`/`removeVendedor` viram
  `createUsuario`/`removeUsuario`; o registro de teste passa a ser
  `"Usuario Teste CRUD"`.

---

## 12. Compatibilidade preservada

Sem exceção, e verificado arquivo a arquivo na auditoria:

- Clean Architecture + Feature-First — a feature nova segue o molde exato;
- componentes nunca importam Prisma — `usuarios-list.tsx` e `usuario-form.tsx`
  consomem Server Actions, como todos os outros;
- paths por env — nada tocado;
- número comercial nunca usa DB id — `proposalNumber` e `Instalacao.numero`
  intocados; a M2 usa `gen_random_uuid()` só para chave primária, nunca exibida;
- Seção continua Seção — `PropostaSecao` fora do escopo;
- documentos usam o DTO/resumo financeiro oficial — `proposta-pdf.mapper.ts`
  não muda uma linha, porque o campo de relação continua se chamando `vendedor`
  (§3.2);
- nenhuma mudança de contrato;
- Next.js e dependências intocados.

---

## 13. Versão e documentação

**Versão de saída: 1.5.0.** `1.4.1` seria patch, e patch é correção; isto é um
cadastro novo, dois removidos, migração de schema com `DROP TABLE`, mudança de
menu e comportamento novo de service. O precedente é do próprio projeto: a
Sprint 4.1 introduziu **um** cadastro (Técnicos) e fechou como 1.4.0, minor.
Esta Sprint introduz um e remove dois. `2.0.0` não se aplica — neste histórico o
major marca encerramento de módulo (Propostas em 1.0.0), e não há consumidor
externo a quebrar.

**ADR-0410 — Usuário único com papéis operacionais.** Próximo número livre
(o último é o ADR-0409). Registra: por que Vendedor e Técnico separados foram
substituídos; supersede parcial e argumentado do ADR-0408 (§2.5); `Usuario` como
identidade única **sem semântica de autenticação**; papéis independentes;
`ativo` × papel como eixos separados; a regra de filtro dos selects; a guarda de
papel só em vínculo novo ou alterado; a preservação do histórico
(`responsavelNome` intacto, vínculos antigos nunca reescritos); a estratégia de
migração em quatro etapas com a consolidação humana isolada na M4; e a decisão
de não implementar redirects.

**Atualizar:** `ARCHITECTURE.md`, `DECISIONS.md`, `PROJECT_HISTORY.md`,
`CHANGELOG.md`, `BACKLOG.md` (fechar o débito do vendedor inativo),
`docs/CHECKLIST_RELEASE.md`, `VERSION`, `package.json`. Sem documento novo além
do ADR.

---

## 14. Plano da Sprint 4.2

| Fase | Conteúdo | Gate |
|---|---|---|
| 0 | ADR-0410 + esta spec | aprovação do dono do produto |
| 1 | `scripts/db/audit-usuarios.ts` + auditoria **pré** (antes de qualquer migration); schema Prisma; M1, M2, M3 | guarda da M2 passa; contagens conferem |
| 2 | `usuario.service.ts`; `opcoes.ts` + teste; `messages.ts` | unidade + integração verdes |
| 3 | Feature `usuarios/` + rotas; remoção de `vendedores/` e `tecnicos/` | build |
| 4 | Guardas de papel nos três services; `nomeDoTecnico` lê de `usuarios` | integração verde |
| 5 | Menu + `navigation.test.ts`; Dashboard (remoção em três camadas + rebalanceamento) | unidade verde |
| 6 | Integração (10 casos); E2E (`usuarios.spec.ts` + ajustes); `limpeza.ts` | as três suítes |
| 7 | `seed.ts`; `validate-crud.ts` | `db:seed` e `db:validate` OK |
| 8 | **M4** executada; auditoria **pós**; comparação registrada | 2 usuários, 5 vínculos, 3 snapshots intactos |
| 9 | Documentação, `VERSION`, `package.json`, commit | gate do `CHECKLIST_RELEASE.md` completo |

TDD por fase, conforme o padrão vigente do projeto.

---

## 15. Riscos aceitos

| # | Risco | Mitigação |
|---|---|---|
| 1 | `Usuario` colide semanticamente com o futuro principal de autenticação | Registrado no ADR-0410: este model não tem login. "Registrado por" continua sendo campo novo e aditivo (ADR-0408) |
| 2 | ADR-0408 proíbe explicitamente esta mudança | Supersede parcial argumentado ponto a ponto (§2.5) |
| 3 | Fusão Vinicius / Vinicius Garcia é decisão humana, não derivável dos dados | Isolada na M4, aprovada em 2026-08-26, com guarda e no-op seguro em outros bancos |
| 4 | Três relações de `Usuario` consigo exigem `@relation` nomeado | Mecânico; o typecheck e o `prisma generate` acusam |
| 5 | `Instalacao.tecnicoResponsavelId` está NULL em produção | A guarda da M2 só exige vínculo onde havia vínculo (`IS NOT NULL` no lado de origem) |
| 6 | Escopo cresce ao fechar o débito do BACKLOG | Inevitável: o débito é a ausência da união que o select unificado passa a fazer |
