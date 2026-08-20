# Sprint 4.1 — Cadastro de Técnicos e vínculo do responsável das Instalações

> Design aprovado em 2026-08-20. Branch `sprint-4.0`. Versão de entrada: **1.3.0**.
>
> Substitui parcialmente o ADR-0400 na parte "responsável é texto livre". Não
> inicia **Pedido de Venda** nem **Ordem de Serviço**, que continuam sem design e
> sem plano.

---

## 1. Objetivo

Trocar o responsável de Instalações — hoje texto digitado à mão em dois lugares —
por um cadastro próprio:

1. criar o cadastro **Técnicos** (`nome`, `ativo`), no molde de Vendedores;
2. migrar `Instalacao.responsavelAtual` (texto) para `tecnicoResponsavelId` (FK);
3. migrar `InstalacaoRegistro.responsavel` (texto) para `tecnicoId` (FK) **mais**
   `responsavelNome` (snapshot histórico);
4. preservar integralmente os nomes já gravados, sem perda e sem correspondência
   inventada;
5. refletir o vínculo na listagem de Instalações e no Dashboard.

**Técnico não é Vendedor e não é Usuário.** Nenhuma autenticação, nenhum
`usuarioId`, nenhum campo além de `nome` e `ativo`.

---

## 2. Auditoria — o que foi apurado antes do design

### 2.1. Vendedores é o molde, e está completo

`Vendedor{id, ativo, nome, telefone, email, createdAt, updatedAt}` com
`@@index([ativo])`, servido por `src/services/vendedor.service.ts` (list / get /
create / update / remove / setAtivo) e `src/features/vendedores/` (`schema.ts`,
`actions.ts`, `vendedor-form.tsx` via `CrudFormShell`, `vendedores-list.tsx` via
`CrudListView`), com três rotas em `src/app/vendedores/`.

Técnicos reproduz essa estrutura inteira, com dois campos a menos.

### 2.2. A regra de exclusão × inativação é uniforme e comprovada

Cliente, Produto e Vendedor seguem o mesmo desenho: `remove*()` conta o uso e
lança a mensagem única de `src/lib/messages.ts`.

```ts
// vendedor.service.ts
const usadoEmPropostas = await prisma.proposta.count({ where: { vendedorId: id } });
if (usadoEmPropostas > 0) throw new Error(CANNOT_DELETE_USED_IN_PROPOSTAS);
```

> "Este registro já foi utilizado em propostas e não pode ser excluído. Utilize a
> opção Inativar."

Técnico segue o mesmo padrão, com contagem em **duas** relações e mensagem
própria — o texto atual fala em "propostas", e Técnico nunca é usado em uma.

### 2.3. Como o Vendedor é escolhido na Proposta

Radix `Select` alimentado no servidor, não autocomplete:

```ts
// proposta.service.ts — getPropostaFormOptions()
prisma.vendedor.findMany({ where: { ativo: true }, select: { id, nome }, orderBy: { nome: "asc" } })
```

Na tela, `proposta-cabecalho.tsx` usa a sentinela `VENDEDOR_NENHUM = "__none__"`
porque o `Select` do shadcn não aceita `value` vazio.

É este o padrão pedido para Técnico, com **uma divergência deliberada**
documentada em §5.2.

### 2.4. Busca sem acento já tem fonte única

`src/utils/busca.ts` (`normalizarBusca` / `contemBusca`) é a fonte única desde a
Sprint 4.0.3 (ADR-0402). `useCrudList` a consome, então a listagem de Técnicos
ganha busca sem acento sem nenhum código novo: basta fornecer o `searchAccessor`.

Normalização em memória, não no banco: `unaccent` exigiria `CREATE EXTENSION` com
superusuário, e o ADR-0101 determina que a aplicação use o usuário dedicado
`outmat`.

### 2.5. Onde o responsável aparece hoje

| Lugar | Arquivo |
|---|---|
| Coluna + busca da listagem | `features/instalacoes/instalacoes-list.tsx` |
| Campo do workspace | `features/instalacoes/instalacao-workspace.tsx` |
| Campo da criação | `features/instalacoes/nova-instalacao-form.tsx` |
| Campo do registro | `features/instalacoes/registro-dialog.tsx` |
| Card da timeline | `features/instalacoes/registro-card.tsx` |
| Próximas Instalações | `features/dashboard/dashboard-view.tsx` |
| DTOs e escrita | `services/instalacao.service.ts`, `services/instalacao-registro.service.ts`, `services/dashboard.service.ts` |
| Validação | `features/instalacoes/schema.ts`, `features/instalacoes/registro-schema.ts` |

### 2.6. Os dados reais — auditoria linha a linha

Executada em 2026-08-20 contra `db_outsystem` (script temporário, removido após a
leitura). Confirmado pelo dono do produto que **este é o único banco**.

```
instalacoes:          1 linha
  nº 1045 | responsavelAtual = NULL | EM_ANDAMENTO

instalacao_registros: 3 linhas
  inst 1045 | "Vinicius"
  inst 1045 | "Vinicius"
  inst 1045 | "Vinicius"

nomes distintos (chave normalizada: minúsculas, sem acento, espaços colapsados): 1
  vinicius -> ["Vinicius"]  (3 usos)
```

**Nenhum valor ambíguo, duvidoso ou inconsistente.** Nenhuma variação de caixa ou
de espaçamento. Nada a reportar antes de migrar, e nada a descartar.

Ainda assim o backfill é **dirigido pelos dados**, não escrito para este conteúdo
(§4.3): a mesma migration precisa estar correta em qualquer ambiente restaurado
de backup.

### 2.7. O cleanup E2E varre por marcador e prova o resultado

`e2e/support/limpeza.ts` apaga por `LIKE` em ordem explícita de dependência,
dentro de uma transação, e **reconta** ao final — se sobrar qualquer marcador, o
`globalTeardown` lança e derruba a execução (ADR-0403).

`Restrict` obriga ordem: hoje instalações saem antes de propostas, e itens antes
de produtos. Técnicos entra na mesma lógica e sai **por último**.

### 2.8. A decisão que está sendo revertida

O ADR-0400 é explícito, e antecipou exatamente este pedido:

> **Responsável é TEXTO LIVRE — decisão deliberada, não provisória.** […] O nome
> digitado é snapshot histórico do fato […] Converter o primeiro em FK
> **reescreveria o histórico** — por isso ele permanece texto.

O que torna a reversão legítima é manter as **duas** coisas: `tecnicoId` para o
vínculo estrutural e `responsavelNome` para o texto histórico. O princípio do
ADR-0400 — *não reescrever silenciosamente o histórico operacional* — é preservado
integralmente; o que muda é a forma de garanti-lo.

---

## 3. Modelo de dados

```prisma
/// Técnico — pessoa que executa ou acompanha o trabalho na Instalação.
///
/// NÃO é Vendedor (ADR-0408): um instalador não vende, e reaproveitar aquele
/// cadastro poluiria o autocomplete da Proposta e distorceria a regra de
/// exclusão "já foi usado em uma proposta".
///
/// NÃO é Usuário: não há login, permissão ou agenda. Quando houver autenticação,
/// "registrado por" será campo novo e aditivo, separado deste vínculo.
model Tecnico {
  id    String  @id @default(cuid())
  ativo Boolean @default(true)
  nome  String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  instalacoes Instalacao[]
  registros   InstalacaoRegistro[]

  @@index([ativo])
  @@map("tecnicos")
}
```

```prisma
model Instalacao {
  // REMOVIDO: responsavelAtual String?

  /// Responsável ATUAL — estado corrente, não fato histórico. Renomear o
  /// Técnico DEVE refletir aqui; por isso não há snapshot textual (ADR-0408).
  tecnicoResponsavelId String?
  tecnicoResponsavel   Tecnico? @relation(fields: [tecnicoResponsavelId], references: [id], onDelete: Restrict)

  @@index([tecnicoResponsavelId])
}

model InstalacaoRegistro {
  // REMOVIDO: responsavel String

  tecnicoId String
  tecnico   Tecnico @relation(fields: [tecnicoId], references: [id], onDelete: Restrict)

  /// Snapshot do nome do Técnico no momento em que ELE foi atribuído a este
  /// registro. Derivado NO SERVICE, a partir do Tecnico persistido — nunca
  /// recebido do navegador (mesma regra do endereço, ADR-0400).
  responsavelNome String

  @@index([tecnicoId])
}
```

Nenhum `onDelete: Cascade` parte de `Tecnico`. Excluir um Técnico usado é
impedido no banco (`Restrict`) **e** no service (§6.1) — a checagem dupla é
deliberada: a do service produz a mensagem que orienta a inativar; a do banco
protege qualquer outro caminho de escrita.

`Tecnico.nome` **não** é `@unique`, como em Vendedor e Cliente. Homônimos são
possíveis no mundo real; a deduplicação acontece no backfill (§4.3), que é onde
existe risco de duplicata acidental.

---

## 4. Migration

Diretório novo: `prisma/migrations/20260820000000_tecnicos/`. **Nenhuma migration
antiga é editada.**

### 4.1. Princípio

O arquivo é escrito na ordem *criar → preencher → provar → travar → remover*. Os
`DROP COLUMN` são as **últimas** instruções, e só são alcançadas se o vínculo de
toda linha tiver sido provado. Prisma executa cada arquivo de migration em uma
transação: qualquer `RAISE EXCEPTION` reverte tudo, inclusive a criação da tabela.

O cabeçalho do arquivo transcreve a auditoria de §2.6, como fez a migration
`20260819000000_remove_nome_projeto_instalacao`.

### 4.2. Passos

1. `CREATE TABLE "tecnicos"` + `CREATE INDEX` em `ativo`;
2. `ALTER TABLE` acrescentando as três colunas novas — **todas nullable**;
3. backfill dos Técnicos (§4.3);
4. `UPDATE` vinculando registros e instalações (§4.4);
5. guarda: `RAISE EXCEPTION` se sobrar linha sem vínculo (§4.5);
6. `SET NOT NULL`, `ADD CONSTRAINT ... FOREIGN KEY ... ON DELETE RESTRICT`,
   `CREATE INDEX` nas duas FKs;
7. `DROP COLUMN "instalacao_registros"."responsavel"` e
   `DROP COLUMN "instalacoes"."responsavelAtual"`.

### 4.3. Backfill — dirigido pelos dados

Um Técnico por **nome distinto** encontrado na união dos dois campos de texto.

Chave de agrupamento: `lower(regexp_replace(btrim(nome), '\s+', ' ', 'g'))` —
minúsculas, sem espaço sobrando, espaços internos colapsados. Agrupa
`"carlos"`, `"Carlos"` e `"Carlos "` no mesmo Técnico.

**A chave NÃO remove acento, de propósito.** `"Joao"` e `"João"` podem ser a
mesma pessoa ou não; o §7 do pedido proíbe inventar correspondência ambígua.
Ambos viram Técnicos distintos, visíveis no cadastro, onde uma pessoa decide se
os funde — decisão de negócio, não de migration.

O nome gravado no Técnico é a grafia da ocorrência escolhida por
`DISTINCT ON (chave) ... ORDER BY chave, nome`, isto é, determinística.

`id` vem de `gen_random_uuid()::text`: `cuid()` é gerado pelo Prisma no cliente e
não existe como default no banco. `gen_random_uuid()` é nativo do PostgreSQL
desde a 13 (o ambiente roda 18) — sem extensão e sem superusuário, coerente com o
ADR-0101. O `id` nunca é exibido.

### 4.4. Vínculo — o texto original é preservado

```sql
UPDATE instalacao_registros r
   SET "tecnicoId" = t.id,
       "responsavelNome" = r.responsavel   -- ← texto ORIGINAL da linha
  FROM tecnicos t
 WHERE chave(t.nome) = chave(r.responsavel);
```

`responsavelNome` recebe o texto **daquela linha**, não o nome canônico do
Técnico. Se três registros diziam `"Carlos"`, `"carlos"` e `"Carlos "`, os três
apontam para o mesmo Técnico e **cada um mantém a própria grafia**. É a leitura
mais fiel possível do histórico.

`instalacoes` recebe apenas o `tecnicoResponsavelId` — não há snapshot ali (§3).

### 4.5. Guarda

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM instalacao_registros WHERE "tecnicoId" IS NULL) THEN
    RAISE EXCEPTION '[tecnicos] backfill incompleto em instalacao_registros — migration abortada, nada foi alterado';
  END IF;
  IF EXISTS (SELECT 1 FROM instalacoes
              WHERE "responsavelAtual" IS NOT NULL AND "tecnicoResponsavelId" IS NULL) THEN
    RAISE EXCEPTION '[tecnicos] backfill incompleto em instalacoes — migration abortada, nada foi alterado';
  END IF;
END $$;
```

Abortar é o comportamento correto: em um ambiente com nome que a chave não
resolve, é preferível a migration falhar e alguém olhar, a ela inventar um
mapeamento. A transação garante que o banco fica exatamente como estava.

---

## 5. Interface

### 5.1. Seleção de Técnico — Radix `Select`, como o Vendedor da Proposta

Opções carregadas no servidor (`where: { ativo: true }`, `orderBy: nome`) e
passadas como prop para o componente cliente — o padrão de
`getPropostaFormOptions()`.

| Campo | Obrigatório | Sentinela "Nenhum" |
|---|---|---|
| Instalação · Responsável atual | não | sim (`__none__`) |
| Registro · Responsável | sim | não |

Sem autocomplete: o cadastro é pequeno, o `Select` mostra todos os ativos de
uma vez, é navegável por teclado e já é o padrão do projeto para escolher pessoa.

### 5.2. Técnico inativo já vinculado — divergência deliberada

A lista de opções de uma tela é **técnicos ativos ∪ técnicos já vinculados àquele
agregado**, mesmo inativos, rotulados `Nome (inativo)`.

Sem isso, abrir uma Instalação cujo técnico foi inativado mostraria o campo em
branco, e salvar qualquer outra alteração apagaria silenciosamente o vínculo.

O workspace da Proposta tem hoje esse mesmo defeito latente com Vendedor
(`getPropostaFormOptions` filtra `ativo: true` sem unir o vendedor vinculado).
**Não é corrigido nesta Sprint** — está fora do escopo aprovado. Vai para o
BACKLOG.

Uma única consulta serve a página inteira do workspace: ativos ∪ o responsável da
instalação ∪ os técnicos de todos os registros dela. `/instalacoes/nova` recebe
apenas os ativos, porque não há vínculo prévio.

### 5.3. Cadastro

| Rota | Conteúdo |
|---|---|
| `/tecnicos` | `CrudListView` — colunas **Nome** e **Status**, ações padrão, "Mostrar inativos" |
| `/tecnicos/novo` | `CrudFormShell` — `TextField nome` + `SwitchField ativo` |
| `/tecnicos/[id]` | idem, em modo edição |

Busca via `useCrudList` → `contemBusca`: `"Joao"` encontra `"João"`.

### 5.4. Menu

```
Dashboard · Clientes · Produtos · Propostas · Instalações · Vendedores · Técnicos · Configurações
```

Ícone `HardHat` (lucide-react), distinto do `UserSquare` de Vendedores e do
`Wrench` de Instalações. A ordem é travada por teste, como já ocorre hoje.

### 5.5. Listagem de Instalações e Dashboard

A coluna **Responsável** passa a exibir `tecnicoResponsavel.nome`; a busca da
listagem continua encontrando por ele, sem acento. **Nenhum filtro dedicado por
Técnico** — decisão do dono do produto; a busca cobre a necessidade.

Dashboard · Próximas Instalações exibe o mesmo nome. Nenhum indicador novo por
técnico.

---

## 6. Regras de domínio

### 6.1. Exclusão × inativação

Técnico **nunca usado** pode ser excluído — é o padrão comprovado de Cliente,
Produto e Vendedor (§2.2). "Usado" significa referenciado por
`Instalacao.tecnicoResponsavelId` **ou** por `InstalacaoRegistro.tecnicoId`.

Mensagem nova em `src/lib/messages.ts`, porque a existente fala em propostas:

```ts
export const CANNOT_DELETE_USED_IN_INSTALACOES =
  "Este técnico já foi utilizado em instalações e não pode ser excluído. Utilize a opção Inativar.";
```

Técnico inativo continua aparecendo no histórico antigo (§5.2) e não é oferecido
como opção nova.

### 6.2. Snapshot do registro — a regra exata

`responsavelNome` significa:

> o nome do responsável **no momento em que aquele responsável foi atribuído ao
> registro**

e **não** "o nome que o Técnico tinha na última vez que qualquer campo do
registro foi editado".

| Operação | `tecnicoId` | `responsavelNome` |
|---|---|---|
| Criação | o selecionado | nome atual do Técnico, lido do banco na transação |
| Edição **sem** trocar o técnico | inalterado | **preservado**, mesmo que o cadastro tenha sido renomeado |
| Edição **trocando** o técnico | o novo | nome atual do **novo** Técnico, lido do banco na transação |

Implementação: `atualizarRegistro` lê o `tecnicoId` vigente dentro da transação e
compara com o recebido. Só quando divergem é que busca o nome e reescreve o
snapshot.

```ts
const atual = await tx.instalacaoRegistro.findUnique({
  where: { id }, select: { tecnicoId: true },
});
const trocouTecnico = atual.tecnicoId !== input.tecnicoId;
const responsavelNome = trocouTecnico
  ? await nomeDoTecnico(tx, input.tecnicoId)   // relê do banco
  : undefined;                                  // ausente = Prisma não toca na coluna
```

Exemplo canônico, que vira teste (§7):

```
1. registro criado com o Técnico "Carlos"        → responsavelNome = "Carlos"
2. cadastro renomeado para "Carlos Almeida"
3. edita SÓ o relatório do registro              → responsavelNome = "Carlos"      ← preservado
4. edita e troca o responsável para "Bruno"      → responsavelNome = "Bruno"       ← reescrito
```

O nome nunca vem do navegador. `nomeDoTecnico` lê o `Tecnico` persistido dentro
da transação — é a mesma regra de `snapshotEndereco`, e pelo mesmo motivo: uma
garantia de integridade não pode depender do estado de um formulário.

### 6.3. Exibição

| Lugar | Fonte | Porquê |
|---|---|---|
| Card da timeline | `registro.responsavelNome` | fato histórico |
| Cabeçalho da Instalação | `tecnicoResponsavel.nome` | estado corrente |
| Listagem / Dashboard | `tecnicoResponsavel.nome` | estado corrente |

---

## 7. Testes

### Unidade (Vitest)

- `tecnicoSchema`: nome obrigatório, `trim`, limite de tamanho, `ativo` booleano;
- `registroSchema`: `tecnicoId` obrigatório (vazio reprova); `responsavel` não
  existe mais como campo de entrada;
- `cabecalhoInstalacaoSchema` / `novaInstalacaoSchema`: `tecnicoResponsavelId`
  aceita `null`;
- módulo puro do Dashboard com o campo renomeado.

### E2E (Playwright) — `e2e/tecnicos.spec.ts`

1. criar Técnico;
2. editar Técnico;
3. inativar Técnico e vê-lo sumir da listagem padrão / voltar com "Mostrar inativos";
4. busca sem acento (`"Joao"` encontra `"João Almeida"`);
5. exclusão bloqueada com a mensagem de inativar, quando já usado.

### E2E — extensões de `e2e/instalacoes.spec.ts`

6. Técnico ativo aparece como opção em nova Instalação;
7. Técnico inativo **não** aparece como opção nova;
8. Instalação existente continua exibindo o Técnico que foi inativado depois;
9. criar Instalação com Técnico responsável;
10. criar registro de cronologia com Técnico;
11. reabrir a Instalação e confirmar o responsável;
12. **snapshot — o cenário canônico do §6.2, em seis passos:** criar registro com
    `Carlos`; renomear o cadastro para `Carlos Almeida`; editar **só o relatório**;
    conferir que o card ainda diz `Carlos` e que o cabeçalho da Instalação já diz
    `Carlos Almeida`; editar de novo trocando o responsável; conferir que o card
    passou a exibir o nome do novo Técnico.

### E2E — `e2e/dashboard.spec.ts`

13. Próximas Instalações exibe o nome do Técnico.

### Cleanup

14. `e2e/support/limpeza.ts` ganha o marcador `E2E %` sobre `tecnicos.nome`,
    entra em `ContagemResiduos` e é apagado **por último** — o `Restrict` exige
    que instalações e registros saiam antes. A recontagem final prova que não
    sobrou Técnico de teste.

Os testes E2E continuam autossuficientes: cada cenário cria o próprio Técnico com
nome `E2E Tecnico {timestamp}`.

---

## 8. O que não pode quebrar

- nenhum nome de responsável existente é perdido — os 3 registros continuam
  legíveis, com a mesma grafia;
- a cronologia continua sem gravar `InstalacaoAuditoria` (ADR-0401);
- o snapshot de endereço da Instalação continua imutável (ADR-0400);
- Instalação e Proposta continuam sendo **canceladas, nunca excluídas**;
- a ordenação da timeline (`aconteceuEm` → `createdAt` → `id`) não muda;
- o autocomplete de Vendedor da Proposta não é tocado;
- a numeração comercial de Instalação não é tocada.

---

## 9. Fora de escopo

Pedido de Venda · Ordem de Serviço · autenticação e `usuarioId` · telefone,
e-mail, cargo, comissão, custo/hora, permissões ou agenda do Técnico · múltiplos
técnicos por instalação · filtro dedicado por Técnico na listagem · correção do
Vendedor inativo no workspace da Proposta (vai para o BACKLOG) · qualquer
indicador por técnico no Dashboard.

---

## 10. VERSION

Entra em `1.3.0`. **Não é alterada no início da Sprint**; a auditoria SemVer é
feita no fechamento.

Expectativa: **1.4.0** (MINOR). O cadastro de Técnicos é funcionalidade nova e
visível ao usuário, e nada é removido da API pública nem quebra comportamento —
mesmo critério que o CHANGELOG aplicou à 1.3.0 (Dashboard e PDF Geral de
Produtos) e à 1.2.0 (módulo novo aditivo).

O `DROP COLUMN` das duas colunas de texto **não** torna a mudança MAJOR: são
detalhes internos de persistência, migrados sem perda, não interface pública.

---

## 11. ADR previsto

**ADR-0408 — Responsável das Instalações passa a ser Técnico cadastrado**
(supersede parcial do ADR-0400).

Precisa deixar registrado:

- o que muda: `texto livre` → `vínculo com Técnico + snapshot`;
- o que **não** muda: o princípio de não reescrever silenciosamente o histórico
  operacional, agora garantido por `responsavelNome` em vez de por texto digitado;
- por que Instalação não tem snapshot e registro tem;
- a regra exata de reescrita do snapshot (§6.2) e o motivo de ela não disparar em
  edição comum;
- por que `Vendedor` continua não sendo reutilizado;
- por que Técnico não é Usuário, e que "registrado por" será campo novo e aditivo
  quando houver autenticação;
- a estratégia de backfill e a recusa deliberada de casar nomes por acento.
