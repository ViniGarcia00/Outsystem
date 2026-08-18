# Sprint 4.0 — Módulo de Instalações (design técnico)

Data: 2026-08-18
Status: **aprovado**. Sprint 4.0.1 **concluída** (gate verde, ADR-0400).
Plano da 4.0.2 escrito; implementação da 4.0.2 não iniciada.
Branch: `sprint-4.0` (criada de `sprint-3.1`; ver "Estratégia Git" ao final).

Spec funcional: fornecida pelo usuário em 2026-08-18 (§1–§52). Este documento
resolve as decisões técnicas que a spec deixou em aberto (§36, §37, §19, §34) e
confronta cada uma com o padrão já existente no repositório.

> **Revisão de 2026-08-18.** O usuário corrigiu duas decisões desta spec:
> **(a)** nenhuma entidade `ResponsavelOperacional` é criada — responsável passa
> a ser texto livre (D1); **(b)** o fatiamento cai de três para dois ciclos.
> Uma terceira correção veio da auditoria: a listagem segue o molde de
> `propostas-list.tsx`, não `CrudListView` (D9).

---

## Contexto — auditoria do código atual

Levantamento feito antes de decidir. Tudo abaixo foi verificado no repositório.

| Assunto | Padrão vigente | Onde |
|---|---|---|
| Numeração comercial | Sequência nativa do Postgres, `@default(autoincrement())` + `ALTER SEQUENCE … RESTART WITH 1001`; `id` (cuid) fica como chave interna | ADR-0201, `20260707000000_propostas_foundation` |
| Escrita com trilha | `prisma.$transaction` gravando a auditoria **na mesma transação** | `proposta.service.ts:249,335` |
| Totais | **Derivados em tempo real, não persistidos** | ADR-0219 |
| Exceção ao acima | `PropostaServico.valorTotal` é persistido, por decisão explícita da 2.9.1 | `schema.prisma` |
| Monetário | `Decimal @db.Decimal(12, 2)`; conversão para número só na borda, via `toNumber` | `proposta-pdf.mapper.ts:24` |
| Exclusão × inativação | `ativo` em todo cadastro; exclusão bloqueada quando o registro já foi usado | ADR-0104, `vendedor.service.ts` |
| Server Actions | `"use server"` → valida com Zod → chama service → `revalidatePath` → `ActionResult` | `features/*/actions.ts` |
| Listagens | `CrudLayout` + `CrudListView` + `useCrudList`, com busca/ordenação/paginação no cliente | `components/app/` |
| Formulários | `CrudFormShell` + campos ligados ao RHF, `FormDirtyGuard` | `components/app/`, `components/forms/` |
| Autocomplete | `Autocomplete<T>` genérico + wrapper por domínio chamando uma action de busca | `cliente-autocomplete.tsx`, `produto-autocomplete.tsx` |
| Endereço em linha | `montarEndereco` monta a partir dos campos granulares do Cliente | `proposta-pdf.mapper.ts:195` |
| Cálculo isolado | Módulo puro, testado sem banco | `features/propostas/totais.ts` + `totais.test.ts` |
| Migrations | SQL escrito à mão, com cabeçalho comentado explicando a Sprint | `20260708000000_servicos_complementares` |
| E2E | Cada cenário cria os próprios dados com identificador único; sem depender do catálogo | `e2e/smoke.spec.ts` (corrigido na 1.1.0) |

Três constatações que impactam o desenho:

1. **`Vendedor` está semanticamente amarrado ao comercial.** Só é referenciado por
   `Proposta.vendedorId`, e sua regra de exclusão é literalmente "já foi usado em
   uma proposta". Não é o lugar de um instalador — e não será reutilizado (D1).
2. **Não existe entidade de pessoa transversal** no sistema, e a 4.0 **não cria
   uma** (D1). Responsável é texto livre.
3. **Há dois moldes de listagem, não um.** `CrudListView` serve cadastros com o
   par `ativo`/`toggleAtivoAction`; entidades com **status** usam `CrudLayout` +
   `useCrudList` com colunas TanStack, como `propostas-list.tsx`. Instalação cai
   no segundo caso.

---

## Decisões

### D1 — Responsável é **texto livre**, tratado como snapshot histórico

**Decisão aprovada em 2026-08-18 (corrige a versão anterior deste design).**

**Nenhuma entidade de responsável é criada nesta Sprint.** Sem model, sem
migration de responsáveis, sem CRUD, sem menu, sem tela, sem FK, sem ADR de
entidade transversal. `Vendedor` também **não** é reutilizado.

```prisma
Instalacao.responsavelAtual  String?   // texto livre, OPCIONAL
InstalacaoRegistro.responsavel String  // texto livre, OBRIGATÓRIO
```

Exemplos de conteúdo: `Carlos`, `Bruno`, `Vinicius`. Digitado à mão.

**O ponto conceitual que precisa ficar registrado:** o nome é um **snapshot
histórico do fato**, não um campo provisório à espera de virar chave
estrangeira. Quando existir autenticação, o sistema passará a distinguir duas
coisas hoje inexistentes:

```
Responsável pelo acontecimento : Carlos      ← continua sendo este texto
Registrado no sistema por      : Vinicius    ← novo, virá do usuário autenticado
```

O primeiro **permanece texto**: quem executou a visita em 2026 continua sendo
aquele nome, independentemente de a pessoa sair da empresa, de o cadastro ser
renomeado ou de nunca vir a ter login. Substituí-lo por FK obrigatória depois
reescreveria o histórico. O segundo é um campo **novo e aditivo**, que entra por
migration quando houver login.

Consequências práticas nesta Sprint:

- a busca por responsável (§26) é busca em coluna de texto, não join;
- não há autocomplete de responsável — é `input` simples;
- não há validação de "responsável existe", porque não há cadastro;
- `InstalacaoRegistro.responsavel` é obrigatório e validado apenas como texto
  não-vazio (`trim().length > 0`).

**Sem autenticação, sem login, sem usuários** — a spec é explícita (§16).

### D2 — Numeração própria, pelo padrão do ADR-0201

Sequência nativa do Postgres, independente da de Propostas:

```sql
CREATE SEQUENCE instalacoes_numero_seq;
ALTER TABLE "instalacoes" ALTER COLUMN "numero" SET DEFAULT nextval('instalacoes_numero_seq');
ALTER SEQUENCE instalacoes_numero_seq OWNED BY "instalacoes"."numero";
ALTER SEQUENCE instalacoes_numero_seq RESTART WITH 1001;
```

Atende §7 sem lógica de aplicação: única, atômica sob concorrência, nunca
reutilizada, não volta após cancelamento. O `id` (cuid) permanece como chave
interna e **nunca** é exibido.

**Nome do campo: `numero`, não `installationNumber`.** A convenção do projeto é
domínio em português (ARCHITECTURE §6); `proposalNumber` é um resquício da Sprint
2.1, não o padrão a propagar.

### D3 — Endereço é snapshot **granular**, garantido **no servidor**

**Corrigido em 2026-08-18.** A versão anterior deste design deixava a tela formar
o snapshot e ainda permitia editar o endereço na instalação, justificando com
"uma obra raramente é o endereço cadastral do cliente". **Isso não é regra de
negócio aprovada e foi descartado.**

`Instalacao` copia do Cliente, no momento da criação, os mesmos campos granulares
que o Cliente possui:

```
cep · enderecoLogradouro · enderecoNumero · complemento · bairro · cidade · estado
```

Por que granular e não um `endereco String` já formatado: casa com o formato do
`Cliente`, então a cópia é campo a campo, sem parsing, e permite reaproveitar a
formatação em linha já existente em vez de inventar outra.

**Atenção a uma colisão de nome:** `Instalacao.numero` é o número comercial da
instalação. O número do logradouro vira **`enderecoNumero`** e o logradouro vira
**`enderecoLogradouro`**, para que nenhum dos dois seja ambíguo no código. No
`Cliente` os campos se chamam `endereco` e `numero`; o mapeamento é explícito.

#### D3.1 — A garantia é do service, não da tela (crítico)

```
Cliente selecionado
        ↓
Service consulta o Cliente PERSISTIDO
        ↓
Copia os campos de endereço
        ↓
Instalacao recebe o snapshot
```

**`criarInstalacao` não aceita campos de endereço do chamador.** O service recebe
apenas `clienteId`, lê o Cliente do banco na **mesma transação** e deriva o
snapshot com `snapshotEndereco`. Qualquer endereço que viesse no payload seria
ignorado — e por isso ele simplesmente não existe na assinatura.

Consequência que importa: a regra vale para **qualquer** chamador — tela, Server
Action, teste, importação futura, integração futura. Uma regra de integridade não
pode depender do estado de um formulário no navegador.

`atualizarInstalacao` **não toca** nos campos de endereço. Depois de criada, a
instalação guarda o endereço daquele momento, e nada além de uma futura
especificação explícita muda isso.

#### D3.2 — Sem endereço alternativo nesta Sprint

Fora do escopo da 4.0.1, por decisão de produto:

- múltiplos endereços;
- "endereço da obra" alternativo;
- seletor "usar outro endereço";
- entidade de endereço;
- edição do endereço na instalação;
- qualquer caminho que produza divergência silenciosa entre Cliente e snapshot
  no momento da criação.

Na interface, os campos de endereço são **somente leitura**: preenchidos ao
escolher o cliente, para o usuário conferir o que será gravado, e desabilitados.
Se a Outmat identificar necessidade real de instalar em local diferente do
cadastro, isso vira refinamento próprio.

O snapshot atende §8: alterar o cadastro do Cliente **não** muda o endereço de
instalações antigas.

### D4 — Totais de custo são derivados, nunca persistidos

Segue o ADR-0219. Não existe `Instalacao.custoExtraTotal` nem
`InstalacaoRegistro.total` no banco — §20 e §31 pedem exatamente isso.

Uma única fonte de cálculo, módulo puro e testado sem banco, espelhando
`features/propostas/totais.ts`:

```
src/features/instalacoes/custos.ts
  totalDoRegistro(custos)        → number
  totalDaInstalacao(registros)   → number
  totaisPorCategoria(registros)  → Record<CategoriaCustoInstalacao, number>
```

A UI só apresenta o resultado (§41). Monetário em `Decimal @db.Decimal(12, 2)`;
`Number` nunca é usado para armazenar valor (§23).

> Divergência consciente com `PropostaServico.valorTotal`, que é persistido: lá a
> decisão foi da Sprint 2.9.1 e vale para aquele caso. Aqui o total é a soma de
> N linhas que mudam de forma independente — persistir criaria uma segunda
> verdade a manter sincronizada.

### D5 — Cronologia e auditoria são coisas separadas (§33)

- **`InstalacaoRegistro`** — conteúdo **operacional**: o que aconteceu, quem fez,
  o relatório, os custos. É o que o usuário lê.
- **`InstalacaoAuditoria`** — trilha **técnica**: criação, mudança de status,
  cancelamento. Espelha `PropostaAuditoria`, gravada na **mesma transação** da
  escrita, exatamente como `proposta.service.ts` faz.

É o que satisfaz §12 ("toda alteração de status relevante deve ficar
identificável") sem transformar a cronologia num log de sistema. Uma mudança de
status **não** cria registro de cronologia automaticamente.

### D6 — `aconteceuEm` × `createdAt` (§43, §44)

```prisma
/// Quando o fato ocorreu no mundo real. Informado pelo usuário.
aconteceuEm DateTime
/// Quando o registro entrou no sistema. Automático.
createdAt   DateTime @default(now())
```

- A cronologia ordena por **`aconteceuEm` desc**, com **`createdAt` desc** como
  desempate — a ordenação fica inequívoca mesmo com dois fatos no mesmo minuto
  (§14 exige isso explicitamente).
- **Datas anteriores à criação da instalação são permitidas** (§44). Não há
  validação de piso. Há validação de teto: `aconteceuEm` não pode ser futuro
  além do dia corrente — um fato ainda não aconteceu.
- Timezone fixa `America/Sao_Paulo` na formatação, como no Contrato (ADR-0330).
  O banco guarda `timestamptz`; a lógica nunca depende do fuso do navegador.

### D7 — Política de edição e exclusão (§19, §34 — decisão exigida)

Sem versionamento, sem soft-delete novo. A regra reaproveita o princípio já
existente no projeto ("não exclui o que virou fato"):

| Alvo | Editar | Excluir |
|---|---|---|
| `InstalacaoRegistro` | **Sim**, livremente | **Só se não tiver custos.** Com custos, a exclusão é bloqueada com mensagem orientando editar |
| `InstalacaoCusto` | Sim (dentro da edição do registro) | Sim, junto da edição do registro |
| `Instalacao` | Sim | **Só se não tiver nenhum registro.** Com registros, só **cancelar** |

Motivo do corte no custo: custo é fato financeiro e alimenta o total acumulado —
é a informação cuja perda silenciosa dói (§34). Registro sem custo é texto, e
texto recém-digitado errado precisa poder sumir.

Cancelar preserva tudo (§12, §34). A instalação cancelada continua na listagem,
sob o filtro correspondente.

### D8 — Registro + custos são atômicos (§40)

Criar e editar registro rodam em `prisma.$transaction`. Na edição, os custos usam
**delete-and-recreate** — o mesmo padrão de `PropostaServico` em `salvarProposta`
(Sprint 2.9.1). Ou grava tudo, ou nada.

### D9 — Interface: reutilizar onde encaixa, componente próprio onde não

Seguindo §38 ("reutilizar padrões, não encaixar artificialmente"):

| Tela | Abordagem |
|---|---|
| `/instalacoes` (listagem) | **`CrudLayout` + `useCrudList`**, no molde de `propostas-list.tsx` |
| `/instalacoes/nova` | **`CrudFormShell`** — é um formulário de cabeçalho comum |
| `/instalacoes/[id]` (workspace) | **Componente próprio.** A cronologia domina a tela; `CrudFormShell` atrapalharia. Reaproveita `PageHeader`, `Section` e os campos de formulário |
| Novo registro (4.0.2) | **Dialog**, no molde do `adicionar-item-dialog.tsx` da Proposta |

**Correção em relação à versão anterior deste design:** a listagem **não** usa
`CrudListView`. Aquele componente é feito para cadastros com o par
`ativo`/`toggleAtivoAction` (Clientes, Produtos, Vendedores) e exige essas props.
Instalação tem **status**, não `ativo` — exatamente o caso de Propostas, que por
isso usa `CrudLayout` + `useCrudList` com colunas TanStack e um `Select` de
filtro. Instalações segue esse precedente, não o dos cadastros.

Filtro por status: `Select` passado ao `CrudLayout`, como em `propostas-list.tsx`.
Sem mecanismo genérico de filtros (§27).

Os "destaques operacionais" de §28 (atrasadas, hoje, próximas) ficam **fora da
V1** — §28 avisa para não virar módulo de agenda, e §5 proíbe antecipar. Entram
como item de backlog.

### D10 — Proposta relacionada é só um vínculo (§9)

`propostaId String?` com `onDelete: Restrict`. Autocomplete de proposta novo
(`ProposaAutocomplete`), espelhando `ClienteAutocomplete`. **Não importa itens,
não sincroniza, não recalcula nada.** Nenhuma regra de Proposta é duplicada e
nenhum arquivo do módulo Comercial é tocado.

### D11 — Nada de FK para Pedido de Venda (§10)

Não existe campo, coluna ou enum antecipando Pedido de Venda ou Ordem de Serviço.
Quando existirem, entram por migration aditiva.

---

## Modelo de dados proposto

Nenhuma entidade de responsável existe (D1) — os dois campos de responsável são
`String`.

```prisma
enum StatusInstalacao {
  A_AGENDAR
  AGENDADA
  AGUARDANDO_MATERIAL
  EM_ANDAMENTO
  ADIADA
  CONCLUIDA
  CANCELADA
}

enum TipoRegistroInstalacao {
  VISITA_CLIENTE
  ATUALIZACAO_INTERNA
  MATERIAL_COMPRADO
  ALTERACAO_ESCOPO
  PENDENCIA
  CONCLUSAO
  OUTRO
}

enum CategoriaCustoInstalacao {
  MATERIAL
  MAO_DE_OBRA
  DESLOCAMENTO
  TERCEIROS
  FRETE
  OUTROS
}

enum EventoInstalacao {
  CRIACAO
  ALTERACAO
  MUDANCA_STATUS
  CANCELAMENTO
}

model Instalacao {
  id     String @id @default(cuid())
  numero Int    @unique @default(autoincrement())   // sequência própria, 1001+

  clienteId String
  cliente   Cliente @relation(fields: [clienteId], references: [id])

  propostaId String?
  proposta   Proposta? @relation(fields: [propostaId], references: [id], onDelete: Restrict)

  /// Texto livre (D1). Snapshot histórico — nunca vira FK.
  responsavelAtual String?

  nomeProjeto String
  status      StatusInstalacao @default(A_AGENDAR)

  // Snapshot do endereço do Cliente (D3). Preserva o contexto histórico.
  cep                String?
  enderecoLogradouro String?
  enderecoNumero     String?
  complemento        String?
  bairro             String?
  cidade             String?
  estado             String?

  dataPrevista DateTime?
  dataAgendada DateTime?
  periodo      String?
  observacoes  String?   @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  registros  InstalacaoRegistro[]
  auditorias InstalacaoAuditoria[]

  @@index([clienteId])
  @@index([status])
  @@map("instalacoes")
}

model InstalacaoRegistro {
  id String @id @default(cuid())

  instalacaoId String
  instalacao   Instalacao @relation(fields: [instalacaoId], references: [id], onDelete: Cascade)

  tipo TipoRegistroInstalacao

  /// Quando o fato ocorreu (D6). Pode ser anterior à criação da instalação.
  aconteceuEm DateTime

  /// Texto livre OBRIGATÓRIO (D1). Snapshot histórico — nunca vira FK.
  responsavel String

  relatorio String @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  custos InstalacaoCusto[]

  @@index([instalacaoId, aconteceuEm])
  @@map("instalacao_registros")
}

model InstalacaoCusto {
  id String @id @default(cuid())

  registroId String
  registro   InstalacaoRegistro @relation(fields: [registroId], references: [id], onDelete: Cascade)

  categoria CategoriaCustoInstalacao
  descricao String?
  valor     Decimal @db.Decimal(12, 2)

  createdAt DateTime @default(now())

  @@index([registroId])
  @@map("instalacao_custos")
}

model InstalacaoAuditoria {
  id String @id @default(cuid())

  instalacaoId String
  instalacao   Instalacao @relation(fields: [instalacaoId], references: [id], onDelete: Cascade)

  evento     EventoInstalacao
  observacao String?          @db.Text

  createdAt DateTime @default(now())

  @@index([instalacaoId])
  @@map("instalacao_auditorias")
}
```

`Cliente`, `Proposta` e `Vendedor` ganham apenas o lado inverso da relação —
nenhum campo existente é alterado, nenhuma regra do Comercial é tocada.

---

## Estrutura de arquivos proposta

**Sprint 4.0.1 — Fundação**

```
prisma/migrations/2026XXXXXXXXXX_instalacoes/migration.sql

src/features/instalacoes/
  actions.ts · schema.ts · index.ts
  labels.ts                         rótulos e cores de status
  endereco.ts · endereco.test.ts    snapshot + formatação (puro, testado)
  instalacoes-list.tsx              listagem (CrudLayout + useCrudList)
  nova-instalacao-form.tsx          criação (CrudFormShell)
  instalacao-workspace.tsx          workspace base (cabeçalho + status)
  proposta-autocomplete.tsx
  cancelar-instalacao-dialog.tsx

src/services/instalacao.service.ts

src/app/instalacoes/{page,nova/page,[id]/page}.tsx
src/lib/navigation.ts               + 1 item de menu
e2e/instalacoes.spec.ts             smoke próprio
```

**Sprint 4.0.2 — Cronologia e custos** (escopo preservado, plano não escrito)

```
prisma/migrations/2026XXXXXXXXXX_instalacao_cronologia/migration.sql

src/features/instalacoes/
  custos.ts · custos.test.ts        cálculo puro (fonte única, D4)
  cronologia.tsx · registro-card.tsx
  registro-dialog.tsx · custos-editor.tsx
  resumo-custos.tsx

src/services/instalacao-registro.service.ts
```

---

## Fatiamento (decidido em 2026-08-18)

Com o cadastro de responsável fora do escopo (D1), a Sprint tem **dois ciclos**,
cada um com gate próprio e software funcionando ao final:

### Sprint 4.0.1 — Fundação de Instalações

Models e enums da Instalação · migration · sequência comercial 1001+ · cadastro
manual · Cliente · snapshot do endereço · Proposta opcional · nome do projeto ·
responsável atual em texto livre · status · datas · observações · listagem ·
busca · filtros · workspace base · conclusão · cancelamento · testes.

### Sprint 4.0.2 — Cronologia e Custos

`InstalacaoRegistro` · tipos de registro · `aconteceuEm` · responsável manual
obrigatório · relatório · timeline · `InstalacaoCusto` · múltiplos custos por
registro · categorias · total por registro · total acumulado · regra de exclusão
(D7) · transação registro + custos · testes unitários · E2E completo do fluxo.

---

## Versionamento

Novo módulo, inteiramente **aditivo**: novos modelos, migration aditiva, novas
rotas. Nada existente muda de comportamento. **MINOR → 1.2.0**, fechado ao final
da **4.0.2**.

**`VERSION` não é alterada durante a 4.0.1.** É o mesmo tratamento que a Sprint
3.0 recebeu ("a versão só será incrementada quando o recurso estiver concluído"),
e o processo do projeto exige que o incremento venha junto do gate de release.

---

## ADRs previstos

| ADR | Assunto | Sprint |
|---|---|---|
| **ADR-0400** | Instalação independente de Pedido de Venda; numeração própria (D2); endereço e responsável por **snapshot**, sem entidade de responsável (D1, D3, D11) | 4.0.1 |
| **ADR-0401** | Cronologia operacional × auditoria técnica (D5); totais de custo derivados (D4); política de edição/exclusão (D7) | 4.0.2 |

> A versão anterior deste design previa um ADR-0400 sobre
> `ResponsavelOperacional`. Ele **não existe** — a entidade foi descartada.

---

## Fora do escopo (reafirmado)

Tudo o que a spec lista em §5, mais, por decisão deste design:

- **Destaques operacionais da listagem** (§28) — atrasadas/hoje/próximas. Vira
  backlog: implementar agora encaminha o módulo para agenda, que §5 proíbe.
- **Totais por categoria no topo** (§31) — a spec marca como opcional
  ("se simples de implementar sem aumentar escopo"). Fica **dentro** do escopo,
  porque sai de graça do mesmo módulo `custos.ts`; se atrapalhar, é o primeiro
  item a cair.
- Dashboard e indicadores (§32).
- Histórico de alterações de registro (§19).

---

## Critérios de aceite

Os 22 itens do §45 da spec, mais:

- [ ] Gate de `docs/CHECKLIST_RELEASE.md` integralmente verde
- [ ] Nenhum arquivo do módulo Comercial alterado
- [ ] Nenhum cálculo financeiro de Proposta tocado
- [ ] E2E cria os próprios dados, sem depender do catálogo
- [ ] `numero` nunca exibido a partir do `id`
- [ ] Nenhum total de custo persistido no banco
- [ ] Nenhuma entidade, tabela, tela ou FK de responsável (D1)

---

## Decisões acrescentadas para a Sprint 4.0.2

> Escritas em 2026-08-18, após a auditoria da base entregue pela 4.0.1.

### D12 — `datas.ts` é **estendido**, nunca duplicado

`aconteceuEm` é **data + hora** ("28/08/2026 16:40"), enquanto o `datas.ts` da
4.0.1 trata **data pura** (`<input type="date">`). A 4.0.2 **acrescenta helpers
de data-hora ao mesmo módulo**, compartilhando a constante `FUSO_BRASIL` e a
mesma filosofia. Nenhum segundo módulo de datas é criado.

| Existente (4.0.1, data pura) | Novo (4.0.2, data-hora) |
|---|---|
| `dataDeInput` | `dataHoraDeInput` |
| `dataParaInput` | `dataHoraParaInput` |
| `ehDataDeInputValida` | `ehDataHoraDeInputValida` |
| — | `dataHoraParaExibicao` |

Uma diferença de comportamento, deliberada: a data pura é **ancorada ao
meio-dia** para o dia não virar na conversão; a data-hora **não é ancorada** —
ali a hora é informação real do fato e precisa ser preservada como digitada.

**Por que `dataHoraParaExibicao` e não o `formatDateTime` do projeto:**
`src/utils/format/date.ts` **não fixa timezone** — usa o fuso do runtime. Serve
para `updatedAt`, mas não para `aconteceuEm`, cuja timezone é requisito. Alterar
o formatador compartilhado mudaria o comportamento de Propostas, o que está
proibido; então o fuso fixo vive em `datas.ts`, junto do resto da infraestrutura
de datas do módulo.

### D13 — Ordenação da timeline (revisado)

Três níveis, nesta ordem:

```
aconteceuEm DESC   ← o fato, não o cadastro
createdAt   DESC   ← desempate quando dois fatos compartilham o instante
id          DESC   ← desempate TÉCNICO final, para determinismo
```

Ordenar por `createdAt` colocaria no topo um registro criado hoje sobre um fato
de ontem — exatamente o caso que a spec exige tratar (§43, §44).

O terceiro nível existe porque, sem ele, dois registros com `aconteceuEm` **e**
`createdAt` idênticos sairiam em ordem indefinida do PostgreSQL: a mesma consulta
poderia devolver ordens diferentes entre execuções, e a timeline "tremeria" sem
nada ter mudado. O `id` (cuid) continua **sem significado comercial** — é
critério de determinismo, nunca exibido nem usado como numeração.

Fatos anteriores à criação da instalação são **permitidos** (§44): não há
validação de piso. Há validação de teto — `aconteceuEm` não pode estar no
futuro, porque um fato ainda não aconteceu.

### D14 — Cálculo de custos em módulo puro, espelhando `totais.ts`

```
src/features/instalacoes/custos.ts
  totalDoRegistro(custos)        → number
  totalDaInstalacao(registros)   → number
  totaisPorCategoria(registros)  → Record<CategoriaCustoInstalacao, number>
```

Nenhum total é persistido (ADR-0219).

**O arredondamento não substitui a persistência segura.** O valor mora no banco
como `Decimal @db.Decimal(12, 2)` — nunca `Float` — e a conversão para `number`
acontece só na borda, com o `toNumber` já usado no projeto. A cadeia é:

```
Banco        Decimal(12,2)
   ↓
Service      toNumber na borda
   ↓
custos.ts    soma + normalização em 2 casas
   ↓
UI           formatCurrency
```

O arredondamento endurece a *função de cálculo*; o `Decimal` garante o *dado*.
São proteções diferentes e ambas são obrigatórias.

**Divergência consciente de `totais.ts`:** aquele módulo soma `number` direto,
sem arredondar. Aqui a soma passa por arredondamento a 2 casas, porque um total
de custos agrega N linhas independentes e o erro de ponto flutuante acumula
(`0.1 + 0.2`). É um endurecimento local, não uma mudança no módulo do Comercial.

### D15 — Transação e edição

- **Criar:** registro + custos numa única `prisma.$transaction`. Falhou um
  custo, o registro não permanece.
- **Editar:** `deleteMany` dos custos seguido de recriação, dentro da mesma
  transação — o padrão já usado em `proposta.service.ts:480` para
  `PropostaServico`.

### D16 — Exclusão (confirmando D7)

| Situação | Comportamento |
|---|---|
| Registro **sem** custos | Excluir permitido |
| Registro **com** custos | **Bloqueado**, com mensagem orientando editar |

A checagem é do **service**, não da interface. O `onDelete: Cascade` do banco
apagaria os custos junto; é justamente o que a regra impede. A interface nunca
apaga custos em cascata só para viabilizar a exclusão do registro.

### D17 — Registro operacional **não** gera auditoria técnica

Criar, editar ou excluir um `InstalacaoRegistro` **não** escreve em
`InstalacaoAuditoria`. Espelhar cada acontecimento operacional numa entrada
textual de auditoria produziria um log redundante e embaralharia os dois
mecanismos, que a spec (§33) manda manter separados:

```
InstalacaoAuditoria  = mudança estrutural/técnica do agregado
InstalacaoRegistro   = histórico operacional escrito pelos responsáveis
```

A auditoria continua registrando o que a 4.0.1 já registra: criação, alteração
de cabeçalho, mudança de status e cancelamento da **instalação**.

Consequência assumida: a exclusão de um registro (só possível sem custos) não
deixa rastro. É o preço da separação limpa, e o dado descartável nesse caso é
texto recém-digitado. Fica no backlog, caso a operação peça rastro depois.

---

## Estratégia Git

**Situação.** A Release 1.1.0 está em `sprint-3.1` (`b4aeec4`) com a homologação
visual do Contrato **pendente**. `main` está 13 commits atrás e `origin/main`,
mais 3. O usuário pediu para não bloquear a 4.0 nessa homologação e para não
misturar as duas frentes.

**Estratégia escolhida: `git checkout -b sprint-4.0 sprint-3.1`.**

Cria uma referência nova. **Não** move `main`, **não** faz merge, **não**
reescreve histórico, **não** toca `sprint-3.1`. Operação totalmente reversível
(`git branch -D sprint-4.0`).

**Por que a partir de `sprint-3.1` e não de `main`.** `main` não contém a
implementação do Contrato, a reconciliação documental, o `VERSION` 1.1.0, as
dependências novas do `package.json` (docxtemplater, pizzip, extenso) nem a
correção do smoke E2E. A 4.0 precisa desse estado: §47 da spec manda os E2Es da
4.0 seguirem "a correção feita anteriormente no projeto", que só existe em
`sprint-3.1`. Sair de `main` significaria desenvolver sobre um código defasado e
gerar conflito garantido na integração.

**Alternativas descartadas:**

| Alternativa | Por que não |
|---|---|
| Mergear `sprint-3.1` em `main` e sair de `main` | Seria o **fechamento formal da 1.1.0**, que depende da homologação pendente. Antecipa o que o usuário pediu para preservar |
| Sair de `main` (`dd9bc5f`) | Código defasado; conflito garantido; contraria §47 |
| Rebase de `sprint-3.1` | Reescreve histórico de uma release em homologação. Destrutivo |
| Trabalhar na própria `sprint-3.1` | Mistura release e módulo novo; o commit da 1.1.0 deixa de ser marco limpo |

**Retomada da 1.1.0.** `sprint-3.1` continua em `b4aeec4`, pronta para receber o
commit de fechamento assim que a homologação PF/PJ ocorrer. Depois disso,
`main` recebe a 1.1.0 por fast-forward e `sprint-4.0` incorpora a `main`
atualizada por merge comum — sem conflito, já que 4.0 partiu exatamente daquele
ponto. Se a homologação exigir correção no Contrato, ela é feita em
`sprint-3.1` e chega à 4.0 nesse mesmo merge.
