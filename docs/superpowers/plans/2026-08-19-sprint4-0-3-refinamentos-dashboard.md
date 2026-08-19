# Plano de implementação — Sprint 4.0.3

> Design: `docs/superpowers/specs/2026-08-19-sprint4-0-3-refinamentos-dashboard-design.md`
> Branch: `sprint-4.0` · Versão de entrada: **1.2.0** (não alterada até o fechamento)

**Ordem de execução:** A → B → C → D → E → F → G → H. A vem primeiro porque
`normalizarBusca` é dependência de F. B vem em seguida para que toda execução de
E2E a partir dali já limpe o próprio rastro. C, D, E e F são independentes entre
si.

**Regra transversal:** nenhuma tarefa altera cálculo financeiro, Contrato,
template DOCX, os quatro documentos existentes, `force-dynamic`, dependências ou
`Proposta.nomeProjeto`.

---

## Grupo A — Infraestrutura compartilhada (busca)

### A1 · Criar o módulo de normalização de busca

**Arquivos**
- `src/utils/busca.ts` (novo)
- `src/utils/index.ts` (editar)

**Alteração exata**

Criar `busca.ts` com dois exports puros:

```ts
/** Minúsculas, Unicode NFD, sem diacríticos. "" → "". */
export function normalizarBusca(valor: string): string

/** true quando `texto` contém `query`, ambos normalizados. Query vazia → true. */
export function contemBusca(texto: string, query: string): boolean
```

`normalizarBusca` = `valor.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")` —
mesma expressão hoje embutida em `use-crud-list.ts`, agora com dono. Números,
pontuação e demais caracteres passam intactos. Cabeçalho documentando que esta é
a **fonte única** de normalização de busca do sistema e que `.normalize()` não
deve ser reescrito em componente nem em service.

Acrescentar ao barrel: `export { normalizarBusca, contemBusca } from "./busca";`

**Testes** — `src/utils/busca.test.ts` (novo)
`Thaís`/`Thais`, `João`/`Joao`, `São Caetano`/`Sao Caetano`,
`AUTOMAÇÃO`/`automacao`; string vazia dos dois lados; case-insensitive isolado do
acento; dígitos e pontuação preservados (`"CM10-A"`); `contemBusca` com query
vazia; `contemBusca` por substring no meio do texto.

**Conclusão** — `npm run test` verde; `npm run typecheck` limpo; `busca.ts` não
importa nada de `features/`, `services/` ou `infrastructure/`.

---

### A2 · `useCrudList` passa a consumir a fonte única

**Arquivos** — `src/hooks/use-crud-list.ts`

**Alteração exata** — apagar a função local `normalize` e importar
`normalizarBusca` de `@/utils`. Trocar as três chamadas: as duas de `compare`
(linha do `localeCompare`) e a do `filtered`. Nenhuma mudança de comportamento —
é a mesma expressão.

**Testes** — cobertos por A1 (mesma função) e pelo E2E de busca em G2. Nenhum
teste novo: a troca é de procedência, não de comportamento.

**Conclusão** — `grep -rn "\.normalize(\"NFD\")" src` retorna **apenas**
`src/utils/busca.ts`; listagens de Clientes, Produtos, Propostas, Instalações e
Vendedores continuam buscando igual.

---

### A3 · Autocomplete de Clientes — acento resolvido no service

**Arquivos** — `src/services/cliente.service.ts`

**Alteração exata** — reescrever `searchClientes`:

- carregar **todos** os clientes `ativo: true` com o `SUGGESTION_SELECT` atual
  (`id, tipoPessoa, nome, empresa, cpfCnpj`), `orderBy: { createdAt: "desc" }`.
  **Sem `take`** — um `take` deixaria registros válidos fora do conjunto
  considerado;
- filtrar em memória: `contemBusca` sobre `nome`, `empresa` e `cpfCnpj`;
- manter o caminho por dígitos — com o conjunto completo em memória ele vira um
  predicado do mesmo filtro (`cpfCnpj` sem máscara contém `digits`), o que
  **elimina a segunda consulta** e o `take: 200` que ela usava;
- `slice(0, 10)` no fim; `CLIENTE_SEARCH_MIN_CHARS` inalterado;
- comentário explicando por que o filtro é em memória (ILIKE é sensível a acento;
  `unaccent` exigiria superusuário, contra o ADR-0101) e apontando o item de
  BACKLOG para volume maior.

**Testes** — provado em tela por G2 (E2E). O service toca o banco e não entra no
Vitest, coerente com o padrão do projeto.

**Conclusão** — buscar `Thais` no autocomplete de Cliente encontra
`Thaís Sales de Sousa`; buscar por CPF com e sem máscara continua funcionando;
nenhum `contains`/`mode: "insensitive"` sobra na função.

---

### A4 · Autocomplete de Produtos — mesma correção

**Arquivos** — `src/services/produto.service.ts`

**Alteração exata** — `searchProdutos`: carregar todos os produtos `ativo: true`
com o select atual (`id, codigo, descricao, unidade, valorProduto, valorServico`),
`orderBy: { codigo: "asc" }`, sem `take`; filtrar com `contemBusca` sobre `codigo`
e `descricao`; `slice(0, 10)`. `PRODUTO_SEARCH_MIN_CHARS` inalterado.

**Testes** — coberto indiretamente pelos cenários de proposta do smoke, que
selecionam produto por SKU no autocomplete.

**Conclusão** — buscar por descrição com acento digitando sem acento encontra o
produto; os smokes de Propostas continuam verdes.

---

### A5 · Autocomplete de Propostas — mesma correção, caminho do número preservado

**Arquivos** — `src/services/instalacao.service.ts`

**Alteração exata** — `searchPropostas`: manter o ramo de `proposalNumber` exato
como está. Substituir o `OR` textual por: carregar todas as propostas com
`select { id, proposalNumber, nomeProjeto, cliente { tipoPessoa, nome, empresa } }`,
`orderBy: { proposalNumber: "desc" }`, sem `take`; filtrar com `contemBusca` sobre
`nomeProjeto` e o nome de exibição do cliente; unir com o resultado do número
exato, deduplicar por `id`, `slice(0, 10)`. Mínimo de 2 caracteres inalterado.

> `nomeProjeto` aqui é **`Proposta.nomeProjeto`** — permanece. Não confundir com
> o campo da Instalação, removido em C1.

**Testes** — coberto pelo E2E de Instalações (vínculo opcional de proposta).

**Conclusão** — busca de proposta por número e por cliente com acento funciona;
`Proposta.nomeProjeto` intacto.

---

### A6 · Registrar o débito de escala no BACKLOG

**Arquivos** — `BACKLOG.md`

**Alteração exata** — item novo em "Dados / Operação": busca server-side
escalável. Contexto (ILIKE é sensível a acento; filtro em memória é adequado a
dezenas/centenas de registros; `unaccent` bloqueada pelo ADR-0101). Aceite
(índice funcional sobre expressão normalizada, coluna sombra normalizada, ou
`unaccent` com o privilégio resolvido no bootstrap) e o gatilho (milhares de
clientes ou produtos ativos).

**Conclusão** — item registrado com contexto, aceite e gatilho.

---

## Grupo B — Cleanup E2E

### B1 · Módulo test-only de limpeza

**Arquivos** — `e2e/support/limpeza.ts` (novo)

**Alteração exata**

Módulo com `pg` direto, fora de `src/`, sem importar nada da aplicação.

*Guardas* — função `validarAmbiente()` que lança com mensagem explícita se:
`process.env.NODE_ENV === "production"`; o host da `DATABASE_URL` não for
`localhost` nem `127.0.0.1`; `process.env.E2E_CLEANUP === "0"`. A `DATABASE_URL`
é lida via `dotenv/config` — o `globalTeardown` roda em processo Node próprio e
não herda o carregamento de env do Next.

*Marcadores* — constantes `MARCADOR_CLIENTE = 'E2E %'` e
`MARCADOR_PRODUTO = 'E2E-%'`.

*Exclusão* — uma transação, ordem explícita, cada `DELETE` com `WHERE` derivado
dos marcadores. Nunca `TRUNCATE`, nunca `DELETE` sem `WHERE`:

```
UPDATE propostas SET "currentRevisionId" = NULL   (propostas E2E)
DELETE instalacao_custos → instalacao_registros → instalacao_auditorias
DELETE instalacoes                 (antes de propostas: propostaId é Restrict)
DELETE proposta_itens              (antes de produtos: produtoId é Restrict)
DELETE proposta_secoes → proposta_revisoes
DELETE proposta_servicos → proposta_auditorias → propostas
DELETE produtos  WHERE codigo LIKE 'E2E-%'
DELETE clientes  WHERE nome   LIKE 'E2E %'
```

*Verificação* — `contarResiduos()` executa as mesmas contagens depois do commit e
`limparResiduosE2E()` **lança** se qualquer uma for maior que zero. Exportar
também `contarResiduos` para uso na conferência manual de B3.

**Testes** — o próprio módulo é a asserção (a verificação embutida). Exercitado
de ponta a ponta em G6.

**Conclusão** — `limparResiduosE2E()` roda contra o banco de dev e devolve as
contagens removidas; forçar `E2E_CLEANUP=0`, `NODE_ENV=production` ou um host
remoto faz a função lançar antes de qualquer `DELETE`.

---

### B2 · Ligar o teardown ao Playwright

**Arquivos**
- `e2e/support/global-teardown.ts` (novo)
- `playwright.config.ts` (editar)

**Alteração exata** — `global-teardown.ts` importa `dotenv/config`, chama
`limparResiduosE2E()` e imprime o resumo do que foi removido. Erro **propaga**
(sem `try/catch` silencioso): teardown que falha derruba a execução, que é a
garantia de que o resíduo não passa despercebido.

`playwright.config.ts` ganha `globalTeardown: "./e2e/support/global-teardown.ts"`,
com comentário explicando a escolha: roda uma vez depois da suíte inteira,
**inclusive com testes falhando**, e uma varredura por marcador em ordem de
dependência é verificável de forma completa — diferente do teardown por cenário,
que depende de cada teste lembrar tudo o que criou.

**Testes** — G6.

**Conclusão** — `npm run test:e2e` termina e o banco não tem resíduo `E2E`; forçar
a falha de um teste ainda assim executa o teardown.

---

### B3 · Implantação: backup e limpeza do resíduo histórico

**Arquivos** — nenhum arquivo de código. Operação única, registrada no
`PROJECT_HISTORY.md`.

**Alteração exata** — na ordem:

1. `pg_dump` do `db_outsystem` para fora do repositório, com data no nome;
2. conferir que o arquivo existe e tem tamanho coerente;
3. registrar as contagens **antes** (clientes 91/88 E2E, produtos 49/27,
   propostas 28/25, instalações 45/44);
4. executar `limparResiduosE2E()` uma vez;
5. registrar as contagens **depois** e confirmar que sobraram os 3 clientes
   reais, os 22 produtos do catálogo Outmat, as 3 propostas reais e a instalação
   1045.

`pg_dump` é operação **desta implantação**, não de rotina — o `globalTeardown`
nunca o executa, e nenhum backup se acumula a cada execução do Playwright.

**Testes** — a conferência de contagens antes/depois é a própria prova.

**Conclusão** — backup criado e verificado; só dado marcado como E2E removido;
números antes/depois registrados no relatório da Sprint.

---

## Grupo C — Instalações

### C1 · Remover `Instalacao.nomeProjeto` do domínio

**Arquivos**
- `src/features/instalacoes/schema.ts` · `schema.test.ts`
- `src/services/instalacao.service.ts`
- `src/features/instalacoes/nova-instalacao-form.tsx`
- `src/features/instalacoes/instalacao-workspace.tsx`
- `src/features/instalacoes/instalacoes-list.tsx`

**Alteração exata**

- `schema.ts`: remover `nomeProjeto: requiredText("Nome do projeto", 200)` de
  `camposComuns`. `requiredText` continua importado (usado por `clienteId`).
- `schema.test.ts`: remover `nomeProjeto` do `base` e apagar o caso "exige nome do
  projeto"; renomear o caso do mínimo obrigatório para "aceita o mínimo
  obrigatório: cliente".
- `instalacao.service.ts`: remover `nomeProjeto` de `InstalacaoListItem` (l.34),
  `InstalacaoDetalhe` (l.49), `InstalacaoInput` (l.73), do `select` de
  `listInstalacoes` (l.139), do map (l.156), do retorno de `getInstalacao`
  (l.185) e de `toData` (l.212). **Não tocar** nas linhas 334/342/353 —
  `Proposta.nomeProjeto` dentro de `searchPropostas`.
- `nova-instalacao-form.tsx`: remover `nomeProjeto: ""` do `defaultValues` e o
  `<TextField name="nomeProjeto" …>`.
- `instalacao-workspace.tsx`: remover `nomeProjeto: data.nomeProjeto` do
  `defaultValues` e o `<TextField name="nomeProjeto" …>`.
- `instalacoes-list.tsx`: remover a coluna `nomeProjeto`, tirar `i.nomeProjeto`
  do `searchAccessor` e ajustar o `searchPlaceholder` para
  `"Buscar por número, cliente, endereço, responsável..."`. O `searchAccessor`
  fica: número · cliente · endereço · responsável · rótulo de status.

**Testes** — `schema.test.ts` ajustado prova que a criação é válida sem o campo e
que o schema não o declara. Cobertura de tela em G3.

**Conclusão** — `grep -rn "nomeProjeto" src/features/instalacoes src/services/instalacao.service.ts`
retorna **apenas** as três ocorrências de `searchPropostas`; `npm run typecheck`
limpo.

---

### C2 · Migration e schema Prisma

**Arquivos**
- `prisma/schema.prisma`
- `prisma/migrations/20260819000000_remove_nome_projeto_instalacao/migration.sql` (novo)

**Alteração exata** — remover a linha `nomeProjeto String` do model `Instalacao`
(l.505). Nova migration:

```sql
-- Sprint 4.0.3 — remove Instalacao.nomeProjeto (ADR-0404).
-- Conteúdo verificado antes do DROP: 44 de 45 linhas eram resíduo E2E
-- ("Apartamento E2E …", "Projeto Snapshot …", "Projeto Cancelar …",
-- "Projeto Cronologia …", "Projeto Edicao …") e a 45ª continha "134324",
-- preenchimento de homologação. Nenhum dado real a preservar.
-- Proposta.nomeProjeto (ADR-0227) NÃO é afetado.
ALTER TABLE "instalacoes" DROP COLUMN "nomeProjeto";
```

Nenhuma migration já aplicada é editada. Aplicar com `npm run db:migrate:deploy`
e regenerar o client (`npm run db:generate`).

**Testes** — `npm run typecheck` falharia se sobrasse alguma referência ao campo
no client gerado.

**Conclusão** — coluna ausente do banco; `npx prisma migrate status` sem
pendência; aplicação sobe e a listagem de Instalações renderiza.

---

### C3 · Remover a repetição do endereço

**Arquivos**
- `src/features/instalacoes/endereco-snapshot.tsx`
- `src/features/instalacoes/endereco.ts`
- `src/features/instalacoes/endereco.test.ts`

**Alteração exata** — em `endereco-snapshot.tsx`, apagar o parágrafo
`{enderecoEmLinha(e)}` (l.63-65) e o import de `enderecoEmLinha`. Permanecem os
sete campos read-only e a nota. Com isso a função fica sem consumidor: remover
`enderecoEmLinha` de `endereco.ts` e seu `describe` de `endereco.test.ts`.

`snapshotEndereco` e a regra server-side não são tocados.

**Testes** — `endereco.test.ts` mantém integralmente a cobertura de
`snapshotEndereco`. G3 prova que os campos continuam preenchidos e desabilitados.

**Conclusão** — a tela mostra o endereço **uma** vez; `npm run lint` sem aviso de
import ou export não usado; `npm run test` verde.

---

### C4 · Número da Instalação como link

**Arquivos** — `src/features/instalacoes/instalacoes-list.tsx`

**Alteração exata** — importar `Link` de `next/link` e trocar a célula da coluna
`numero`:

```tsx
cell: ({ row }) => (
  <Link
    href={`/instalacoes/${row.original.id}`}
    className="font-medium text-primary underline-offset-4 hover:underline
               focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none rounded-sm"
    aria-label={`Abrir instalação ${row.original.numero}`}
  >
    {row.original.numero}
  </Link>
),
```

`next/link` renderiza um `<a>` real: teclado, foco visível e Ctrl/Cmd+clique
funcionam sem código extra. O `⋮ → Abrir` permanece. Nenhum `onClick` na `<tr>`.

**Testes** — G3 clica no número e confere a URL do workspace.

**Conclusão** — o número é visualmente clicável, navegável por Tab com foco
visível, e Ctrl+clique abre em nova aba.

---

## Grupo D — Dashboard

### D1 · Helper de início do dia no fuso brasileiro

**Arquivos** — `src/features/instalacoes/datas.ts` · `datas.test.ts`

**Alteração exata** — acrescentar, junto dos demais conversores de fuso:

```ts
/** Início do dia (00:00) em São Paulo, para comparar com datas agendadas. */
export function inicioDoDiaEmSaoPaulo(agora: Date = new Date()): Date
```

Reaproveita o `formatador` `en-CA` existente para obter "YYYY-MM-DD" no fuso e
ancora em `T00:00:00-03:00`. Fica em `datas.ts` porque é o dono documentado das
conversões de fuso do projeto — duplicar a lógica no Dashboard seria pior.

**Testes** — `datas.test.ts`: uma data logo após a meia-noite de São Paulo e uma
logo antes devolvem dias diferentes; o retorno é sempre 00:00 no fuso brasileiro.

**Conclusão** — `npm run test` verde; nenhum comportamento existente de `datas.ts`
alterado.

---

### D2 · Módulo puro do Dashboard

**Arquivos** — `src/features/dashboard/dashboard.ts` (novo)

**Alteração exata** — tipos e função pura, sem Prisma e sem IO:

```ts
export interface DashboardDTO {
  propostas: { rascunho: number; emitidas: number };
  instalacoes: Record<
    "A_AGENDAR" | "AGENDADA" | "AGUARDANDO_MATERIAL" | "EM_ANDAMENTO" | "CONCLUIDA",
    number
  >;
  custosAcumulados: number;
  proximas: ProximaInstalacao[];   // no máximo 5
}

export interface ProximaInstalacao {
  id: string; numero: number; clienteNome: string;
  dataAgendada: Date; status: StatusInstalacao; responsavelAtual: string | null;
}

export function montarDashboard(fonte: FonteDashboard): DashboardDTO
```

`montarDashboard` recebe as contagens agrupadas, a soma dos custos e as
candidatas a próximas instalações; devolve o DTO com os status ausentes zerados,
as próximas **filtradas** (`dataAgendada >= inicioDoDia`, fora de `CONCLUIDA` e
`CANCELADA`), **ordenadas** por `dataAgendada` crescente e cortadas em 5.
`ProximaInstalacao` **não** tem `nomeProjeto`.

**Testes** — `src/features/dashboard/dashboard.test.ts` (novo): contagens por
status com status ausente = 0; soma dos custos; próximas ordenadas
crescentemente mesmo com entrada fora de ordem; corte em 5 quando há 7;
`CONCLUIDA` e `CANCELADA` excluídas; instalação de ontem excluída e a de hoje
incluída; estado vazio (`proximas: []`, contagens zeradas, custo 0).

**Conclusão** — `npm run test` verde; o módulo não importa Prisma nem `services/`.

---

### D3 · Service do Dashboard

**Arquivos** — `src/services/dashboard.service.ts` (novo)

**Alteração exata** — `getDashboard(): Promise<DashboardDTO>`. Quatro consultas em
`Promise.all`, nenhuma redundante:

- `prisma.proposta.groupBy({ by: ["status"], _count: true })`;
- `prisma.instalacao.groupBy({ by: ["status"], _count: true })`;
- `prisma.instalacaoCusto.aggregate({ _sum: { valor: true } })`;
- `prisma.instalacao.findMany` das candidatas — `dataAgendada: { gte: inicioDoDia }`,
  `status: { notIn: ["CONCLUIDA", "CANCELADA"] }`, `orderBy: { dataAgendada: "asc" }`,
  `take: 5`, com `id, numero, dataAgendada, status, responsavelAtual` e
  `cliente { tipoPessoa, nome, empresa }`.

`Decimal` do `_sum` é convertido a `number` **na borda do service** (padrão do
projeto). O nome de exibição do cliente usa o mesmo `nomeCliente` de
`instalacao.service.ts` (PJ mostra razão social). O resultado é entregue a
`montarDashboard`, que é quem decide forma, filtro e ordem.

O Dashboard não importa nada do PDF Geral de Produtos, e vice-versa.

**Testes** — a lógica testável está em D2. O service é IO fino, coberto por G4.

**Conclusão** — `getDashboard()` responde com dados reais do banco; nenhum dado
fictício; nenhum componente importa Prisma.

---

### D4 · Tela do Dashboard

**Arquivos**
- `src/app/dashboard/page.tsx` (reescrever)
- `src/features/dashboard/dashboard-view.tsx` (novo)
- `src/features/dashboard/index.ts` (novo) · `README.md` (atualizar)

**Alteração exata** — `page.tsx` vira Server Component: chama `getDashboard()` e
passa o DTO para `DashboardView`. Mantém `metadata` e a moldura `AppPage` +
`PageHeader`.

`DashboardView` renderiza, com os componentes já existentes (`Card`, `Badge`,
`PageEmpty`, `PageContent`):

- **Comercial** — Propostas em Rascunho · Emitidas;
- **Instalações** — A Agendar · Agendadas · Aguardando Material · Em Andamento ·
  Concluídas;
- **Custos** — custos extras acumulados, via `formatCurrency`;
- **Próximas Instalações** — tabela simples com data (`formatDate`), número,
  cliente, status (`Badge` com `STATUS_BADGE_VARIANT`) e responsável; número
  como `<Link>` para `/instalacoes/[id]`, no mesmo padrão de C4. Sem próximas,
  `PageEmpty` com texto adequado.

Rótulos de status vêm de `features/instalacoes/labels.ts` e
`features/propostas/labels.ts` — nenhum texto de status escrito à mão. Sem
gráficos, sem filtros, sem tempo real.

**Testes** — G4.

**Conclusão** — `/dashboard` mostra números reais; estado vazio aparece quando não
há próximas; claro/escuro e responsividade preservados; nenhum import de Prisma
em componente.

---

## Grupo E — Propostas · duplicação

### E1 · `duplicarProposta` copia o conteúdo comercial aplicável

**Arquivos** — `src/services/proposta.service.ts`

**Alteração exata** — em `duplicarProposta`:

- ampliar o `select` da origem com `nomeProjeto`, `tipoDesconto`,
  `valorDesconto`, `frete`, `formaPagamento`, `previsaoInstalacao`,
  `obsComerciais`, `obsTecnicas` e
  `servicos: { orderBy: { ordem: "asc" }, select: { tipo, descricao, valorProdutos, valorServicos, valorTotal, ordem } }`;
- repassar esses campos ao `tx.proposta.create`. `obsInternas` continua **fora**
  (ADR-0203) — o comentário existente na linha permanece e ganha a menção de que
  a ampliação foi deliberada;
- depois de criar a revisão e copiar o conteúdo, criar os serviços na proposta
  nova, um `tx.propostaServico.create` por item, com `propostaId` da **nova**
  proposta. Nenhum `id` de origem é reaproveitado; nenhum registro é reapontado;
- `modelo === "SIMPLIFICADA"` força conjunto vazio, como já fazem
  `criarPropostaCompleta` e `salvarProposta`;
- `valorTotal` é copiado como está (já é derivado e persistido pela regra da
  Sprint 2.9.1) — nada é recalculado aqui.

Tudo continua na mesma transação, com a auditoria `DUPLICACAO` inalterada.
`proposalNumber`, `status`, datas de status, cancelamento e auditoria da origem
seguem fora da cópia.

**Testes** — G5 (E2E), que é onde a independência entre original e duplicada pode
ser provada de ponta a ponta.

**Conclusão** — duplicar uma proposta com Som e Wi-Fi produz uma proposta nova com
os dois serviços e os mesmos valores; `obsInternas` continua vazia na duplicada;
alterar a duplicada não altera a original; Simplificada duplicada não ganha
serviços.

---

## Grupo F — Propostas · PDF Geral de Produtos

### F1 · Estender o DTO com a identidade do produto

**Arquivos**
- `src/services/proposta-pdf.mapper.ts`
- `src/services/proposta-pdf.service.ts`

**Alteração exata** — `FonteItem` e `PdfItem` ganham `produtoId?: string | null` e
`tipo?: "PRODUTO" | "SERVICO"`, **opcionais**, no mesmo padrão aditivo de
`FontePropostaPdf.servicos?`. O mapper repassa os dois campos ao montar `PdfItem`.
O loader `getPropostaPdfData` acrescenta `produtoId: true` e `tipo: true` ao
`select` dos itens.

Os quatro mappers/renderers existentes não leem os campos novos — o
comportamento de PDF Detalhado, Apresentação, Contrato e Anexo Contratual não
muda.

**Testes** — `proposta-pdf.mapper.test.ts` e `contrato.mapper.test.ts` seguem
verdes sem edição (os campos são opcionais). Acrescentar um caso ao teste do
mapper provando que `produtoId` e `tipo` chegam ao `PdfItem` quando informados e
ficam `undefined` quando ausentes.

**Conclusão** — `npm run test` verde; `npm run typecheck` limpo; nenhum
`.test.ts` existente precisou de ajuste para compilar.

---

### F2 · Função pura de consolidação

**Arquivos** — `src/features/propostas/pdf/consolidado.ts` (novo)

**Alteração exata**

```ts
export interface ProdutoConsolidado {
  codigo: string; descricao: string; unidade: string; quantidade: number;
}

export function consolidarProdutos(dto: PropostaPdfDTO): ProdutoConsolidado[]
```

Regras, documentadas no cabeçalho do módulo:

- percorre `dto.secoes[].itens[]` e **descarta** os de `tipo === "SERVICO"`;
- **nunca** lê `dto.servicos` (Som/Wi-Fi), `dto.totais`, `dto.resumo`,
  `dto.desconto` nem qualquer valor financeiro;
- chave de agrupamento: `produtoId` quando existir; senão
  `"codigo:" + normalizarBusca(codigo)`. Nunca só a descrição — produtos com
  descrições parecidas não podem se fundir;
- `codigo`, `descricao` e `unidade` vêm da **primeira** ocorrência do grupo
  (snapshot do item);
- quantidade = soma das quantidades estruturais, arredondada a 3 casas (mesma
  precisão de `PropostaItem.quantidade`, `Decimal(12,3)`);
- ordena por `codigo` com `localeCompare(…, "pt-BR")`, desempate por `descricao`;
- proposta sem produtos devolve `[]`.

**Testes** — `src/features/propostas/pdf/consolidado.test.ts` (novo), os dez casos
exigidos: um produto; mesmo produto em duas Seções; mesmo produto repetido várias
vezes; vários produtos; ordem de entrada diferente com resultado idêntico;
quantidade total correta; descrições semelhantes não se misturam; itens `SERVICO`
fora; Som/Wi-Fi fora; proposta sem produtos → `[]`. Mais um caso do fallback:
itens sem `produtoId` agrupam pelo SKU normalizado.

**Conclusão** — `npm run test` verde; o módulo é puro (não importa Prisma,
`services/` nem React).

---

### F3 · Renderer do documento

**Arquivos** — `src/features/propostas/pdf/produtos-pdf-document.tsx` (novo) ·
`src/features/propostas/pdf/render.tsx` · `index.ts`

**Alteração exata** — documento A4 retrato reusando `theme.ts`, `fonts.ts`,
`primitives.tsx` e o bloco `pdf-cabecalho`. Título **GERAL DE PRODUTOS**,
identificação da proposta (número e revisão) e uma tabela única, sem separação por
Seção: **SKU · Produto · Un. · Qtd.** Sem coluna de preço, sem rodapé financeiro,
sem assinaturas. Lista vazia renderiza uma linha de estado vazio.

`render.tsx` ganha `renderProdutosPdf(consolidados, dto)`; `index.ts` exporta.

**Testes** — cobertos por F2 (conteúdo) e G7 (resposta HTTP).

**Conclusão** — o PDF abre com uma linha por produto e a quantidade somada;
nenhum valor financeiro aparece no documento.

---

### F4 · Nome do arquivo

**Arquivos** — `src/features/propostas/pdf/filename.ts` · `filename.test.ts`

**Alteração exata** — `TipoPdf` ganha `"produtos"`; `PREFIXO.produtos =
"Geral de Produtos"`. Nada mais muda — o padrão
`{Prefixo} - {Primeiro Nome} {Nº} Rev.{N}.pdf` é o vigente para todos os PDFs, e
o formato com nome completo continua exclusivo do Contrato .docx. Atualizar o
comentário-cabeçalho com a quinta linha.

**Testes** — `filename.test.ts`: `nomeArquivoPdf("produtos", …)` produz
`Geral de Produtos - Thaís 1050 Rev.2.pdf`; revisão `null` vira `Rev.0`;
caracteres inválidos do Windows são removidos.

**Conclusão** — `npm run test` verde; os nomes dos quatro documentos existentes
inalterados.

---

### F5 · Route Handler

**Arquivos** — `src/app/propostas/[id]/produtos/route.ts` (novo)

**Alteração exata** — mesma forma de `[id]/pdf/route.ts`: `runtime = "nodejs"`,
`dynamic = "force-dynamic"`; `GET` resolve `params`, chama `getPropostaPdfData(id)`,
404 se não existir, aplica `consolidarProdutos(dto)`, renderiza e responde com
`Content-Type: application/pdf`, `Content-Disposition` inline via
`contentDispositionPdf(nomeArquivoPdf("produtos", dto))` e `Cache-Control: no-store`.

**Nenhuma consulta Prisma no Route Handler** — o loader é o mesmo dos outros
documentos.

**Testes** — G7.

**Conclusão** — `GET /propostas/{id}/produtos` responde 200 com PDF não vazio; id
inexistente responde 404.

---

### F6 · Botão no workspace

**Arquivos** — `src/features/propostas/proposta-workspace.tsx`

**Alteração exata** — acrescentar `abrirProdutos()` (`window.open` do novo
endereço) e um botão **"PDF Geral de Produtos"**, na mesma barra de ações.

**Não passa por `emitirEAbrir`.** É lista de conferência interna: fica disponível
em RASCUNHO e em EMITIDA, com um único rótulo, e não altera o status da proposta.
Desabilitado apenas quando não há item (`temItens`), com `title` explicando.
Comentário no código registrando por que este documento foge do padrão dos
outros quatro.

**Testes** — G7 confere o botão em RASCUNHO e que a proposta continua RASCUNHO
depois de usá-lo.

**Conclusão** — o botão aparece nos dois status, o rótulo não se confunde com
"PDF Detalhado", e clicar nele **não** emite a proposta.

---

## Grupo G — Testes

Os unitários vivem junto de suas tarefas (A1, C1, D1, D2, F1, F2, F4). Este grupo
reúne o que é transversal ou de tela.

### G1 · Ordem do menu

**Arquivos** — `src/lib/navigation.ts` · `src/lib/navigation.test.ts` (novo)

**Alteração exata** — reordenar `mainNavigation` para
`Dashboard · Clientes · Produtos · Propostas · Instalações · Vendedores ·
Configurações`, preservando `href` e `icon` de cada item. Atualizar o comentário
do arquivo (o Dashboard deixa de ser placeholder). Teste unitário compara
`mainNavigation.map(i => i.title)` com o array exato dos sete e confere que os
sete `href` continuam os mesmos.

**Conclusão** — teste verde; sidebar e mobile mostram a ordem nova; nenhum
grupo/submenu criado.

---

### G2 · E2E — menu e busca sem acento

**Arquivos** — `e2e/smoke.spec.ts`

**Alteração exata**
- No teste de navegação, afirmar a **ordem** dos sete links dentro do
  `<nav>` (via `allTextContents()`), além dos cliques já existentes.
- Cenário novo: criar cliente `E2E Acentuação Thaís {Date.now()}`; abrir
  `/propostas/nova`; digitar a forma **sem acento** (`Acentuacao Thais`) no
  autocomplete de Cliente; confirmar que a opção aparece e é selecionável.
  Também confirmar na listagem `/clientes` que buscar sem acento encontra o
  registro (prova da fonte compartilhada em tela).

**Conclusão** — os dois cenários passam; o cliente criado é limpo pelo teardown.

---

### G3 · E2E — Instalações após as mudanças

**Arquivos** — `e2e/instalacoes.spec.ts`

**Alteração exata**
- Remover `page.getByLabel("Nome do projeto").fill(...)` dos helpers
  `criarInstalacao` e do cenário principal; trocar o parâmetro `projeto` por um
  rótulo derivado do cliente. As buscas que hoje usam `projeto` passam a usar o
  **nome do cliente** ou o **número da instalação**.
- Afirmar que o campo sumiu: `getByLabel("Nome do projeto")` → `toHaveCount(0)`
  no formulário e no workspace; `columnheader` "Projeto" → `toHaveCount(0)` na
  listagem.
- Afirmar que o endereço aparece **uma única vez**: os campos read-only
  continuam preenchidos e desabilitados, e o texto corrido do endereço em linha
  não existe mais.
- Cenário novo do link: na listagem, clicar no número da instalação leva a
  `/instalacoes/{id}`; o elemento é `role="link"`.
- Os cenários de cronologia e custos (4.0.2) permanecem **sem alteração de
  asserção** — só perdem o preenchimento do campo removido.

**Conclusão** — a suíte de Instalações passa; cronologia, custos, timeline,
snapshot e cancelamento continuam provados.

---

### G4 · E2E — Dashboard

**Arquivos** — `e2e/dashboard.spec.ts` (novo)

**Alteração exata** — abrir `/dashboard` e conferir: o título; os cards
comerciais e de instalações presentes com valores numéricos (não texto
fictício); o card de custos acumulados formatado em R$; a seção "Próximas
Instalações" presente. Cenário que cria cliente + instalação agendada para data
futura e confirma que ela aparece na seção, com data, número, cliente, status e
responsável.

**Conclusão** — passa com o banco real; nenhum valor inventado na tela.

---

### G5 · E2E — duplicação de Proposta com serviços

**Arquivos** — `e2e/smoke.spec.ts`

**Alteração exata** — cenário completo:

1. cliente e produto próprios do cenário;
2. proposta com uma seção e um produto;
3. adicionar **Som Ambiente** com valores;
4. adicionar **Wi-Fi Premium** com valores;
5. preencher `obsInternas` com um marcador;
6. criar/salvar a proposta e guardar a URL da original;
7. duplicar pela listagem;
8. abrir a duplicada e confirmar que **os dois serviços existem com os mesmos
   valores** e que `obsInternas` está **vazia**;
9. alterar um valor de serviço na duplicada e salvar;
10. reabrir a **original** e confirmar que o valor dela **não mudou**.

**Conclusão** — passa; a independência entre original e duplicada fica provada
por leitura da original após alterar a cópia.

---

### G6 · Prova do cleanup

**Arquivos** — `e2e/support/global-teardown.ts` (já criado em B2)

**Alteração exata** — nenhuma além de B1/B2. A prova é operacional: rodar
`npm run test:e2e` completo, conferir no banco que as contagens de marcadores
`E2E` voltam a zero, e rodar uma vez com um teste forçado a falhar para
confirmar que o teardown ainda executa. A verificação embutida (recontagem +
`throw`) é a checagem automatizada permanente.

**Conclusão** — depois da suíte, `clientes LIKE 'E2E %'` = 0 e
`produtos LIKE 'E2E-%'` = 0; falha de teste não impede o teardown.

---

### G7 · E2E — PDF Geral de Produtos

**Arquivos** — `e2e/smoke.spec.ts`

**Alteração exata** — cenário: proposta com **o mesmo produto em duas Seções**
(quantidades diferentes). Conferir que o botão "PDF Geral de Produtos" está
visível em RASCUNHO; `GET {propostaPath}/produtos` responde 200,
`Content-Type: application/pdf`, `Content-Disposition` com
`Geral de Produtos` e `.pdf`, corpo > 1000 bytes; e que a proposta **continua
RASCUNHO** depois (não emitiu). Sem OCR e sem extração de texto do PDF — a
correção da soma é provada pelos unitários de F2.

**Conclusão** — passa; o status da proposta não muda ao gerar o documento.

---

## Grupo H — Documentação e release

### H1 · ADRs

**Arquivos** — `DECISIONS.md`

**Alteração exata** — seis ADRs novos, no formato vigente (contexto, decisão,
consequências, alternativas descartadas):

| ADR | Assunto |
|---|---|
| ADR-0402 | Normalização de busca compartilhada; acento resolvido em memória no service; `unaccent` descartada por exigir superusuário (ADR-0101); sem limite arbitrário no conjunto considerado |
| ADR-0403 | Cleanup E2E por `globalTeardown` test-only, guardas de ambiente, ordem de dependência e verificação de resíduo; `pg_dump` só na implantação |
| ADR-0404 | Remoção de `Instalacao.nomeProjeto` (com a evidência dos dados), remoção da repetição do endereço e acesso ao workspace por link semântico |
| ADR-0405 | Dashboard V1 — service + módulo puro + DTO, sem gráficos |
| ADR-0406 | Duplicação de Proposta passa a copiar o conteúdo comercial aplicável, incluindo `PropostaServico`; `obsInternas` segue fora |
| ADR-0407 | PDF Geral de Produtos — quinto documento, quantitativo, agrupado por identidade estável, sem emitir a proposta |

**Conclusão** — numeração contínua a partir de ADR-0401; nenhum ADR anterior
renumerado.

---

### H2 · Documentação de referência

**Arquivos** — `ARCHITECTURE.md` · `PROJECT_CONTEXT.md` · `VISION.md` ·
`docs/BRIEFING-PROJETO.md` · `README.md` · `src/features/dashboard/README.md`

**Alteração exata**
- `ARCHITECTURE.md`: seção do Dashboard; quinto documento na tabela de §4.4;
  `utils/busca.ts` como fonte única de normalização; nota do cleanup E2E em §8;
  `Instalacao` sem `nomeProjeto`.
- `PROJECT_CONTEXT.md`: Dashboard sai de "planejado" para entregue; menciona a
  Sprint 4.0.3.
- `VISION.md` e `README.md`: atualizados no que esta Sprint alcança (o débito
  amplo registrado no BACKLOG permanece, sem ser ampliado aqui).
- `docs/BRIEFING-PROJETO.md`: cinco documentos, Dashboard entregue, resíduo E2E
  resolvido.
- `src/features/dashboard/README.md`: deixa de dizer "placeholder".

**Conclusão** — item 10 do `CHECKLIST_RELEASE.md` fecha para o escopo desta
Sprint.

---

### H3 · CHANGELOG, VERSION e histórico

**Arquivos** — `CHANGELOG.md` · `VERSION` · `package.json` · `PROJECT_HISTORY.md`

**Alteração exata** — seção nova no `CHANGELOG` (Keep a Changelog), agrupando
Adicionado / Corrigido / Removido / Regras.

**VERSION** — decidida **aqui**, no fechamento, com a justificativa escrita e
apresentada antes de gravar. A análise: a 1.2.0 foi MINOR por entregar módulo
novo aditivo; esta Sprint entrega duas funcionalidades novas visíveis ao usuário
(Dashboard e o quinto documento da Proposta), além de correções. Isso ultrapassa
o critério de patch e aponta **1.3.0**. `VERSION` e `package.json` mudam juntos.

`PROJECT_HISTORY.md` recebe o ciclo da Sprint 4.0.3 com resultados reais do gate,
os números antes/depois da limpeza do resíduo (B3) e o hash do commit.

**Conclusão** — CHANGELOG, VERSION e `package.json` coerentes entre si;
justificativa SemVer registrada.

---

### H4 · Gate e commit

**Arquivos** — nenhum (execução)

**Alteração exata** — na ordem do `CHECKLIST_RELEASE.md`:

```
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

mais `/api/health`, `/dev/diagnostics`, PostgreSQL, Prisma, documentação,
CHANGELOG, VERSION e commit. Resultados **reais** no relatório final — nenhum
item declarado sem saída de comando.

**Conclusão** — cinco comandos verdes, os treze itens do gate fechados, commit da
Sprint feito, hash registrado no `PROJECT_HISTORY.md` e working tree limpo.

---

## Fora de escopo desta Sprint

Pedido de Venda · Ordem de Serviço · login · usuários · responsáveis operacionais
como entidade · alteração de cálculo financeiro · alteração do Contrato ou do
template DOCX · alteração dos quatro PDFs existentes · atualização de
dependências ou do Next.js · remoção do `force-dynamic` · caminhos fixos ·
Prisma em componente · Seção tratada como Ambiente · `id` de banco como numeração
comercial · refatoração oportunista.
