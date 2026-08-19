# Sprint 4.0.3 — Refinamentos de Homologação + Dashboard + Correções em Propostas

> Design aprovado em 2026-08-19. Branch `sprint-4.0`. Versão de entrada: **1.2.0**.
>
> Ciclo curto de refinamento, aberto após a homologação de uso real do módulo de
> Instalações (1.2.0). Antecede **Pedido de Venda** e **Ordem de Serviço**, que
> continuam sem design e sem plano e **não** são iniciados aqui.

---

## 1. Objetivo

Sete frentes, todas nascidas de uso real:

1. reordenar a navegação principal;
2. fazer os testes automatizados apagarem os próprios dados;
3. corrigir a busca sensível a acentos;
4. transformar `/dashboard` de placeholder em visão útil;
5. remover a repetição dos dados do Cliente na tela de Instalação;
6. remover `Instalacao.nomeProjeto`;
7. dar acesso claro ao workspace da Instalação pela listagem;

mais duas correções/entregas no módulo de Propostas:

8. corrigir a duplicação de Proposta, que não copia os serviços;
9. criar o **PDF Geral de Produtos**, quinto documento da Proposta.

---

## 2. Auditoria — o que foi apurado antes do design

Esta seção registra as evidências levantadas. Duas delas mudaram o desenho.

### 2.1. A busca sem acento não é um problema de `useCrudList`

`src/hooks/use-crud-list.ts` **já** normaliza acentos, e as cinco listagens
(Clientes, Produtos, Propostas, Instalações, Vendedores) passam por ele:

```ts
value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
```

O defeito está nos **autocompletes server-side**, que usam Prisma
`contains + mode: "insensitive"`. Isso vira `ILIKE` no PostgreSQL — insensível a
caixa, **sensível a acento**. Medido no banco de desenvolvimento real:

```
SELECT count(*) FROM clientes WHERE nome ILIKE '%thai%';   -- 0
SELECT count(*) FROM clientes WHERE nome ILIKE '%thaí%';   -- 1  (Thaís Sales de Sousa)
```

Atinge `searchClientes`, `searchProdutos` (`cliente.service.ts`,
`produto.service.ts`) e `searchPropostas` (`instalacao.service.ts`). É por isso
que "Thaís" não aparece ao digitar "Thais" no autocomplete de Cliente da Proposta
e da Instalação.

**Consequência para o design:** centralizar a normalização resolve a organização
do código, mas **não** resolve o defeito relatado. A correção obrigatoriamente
alcança os três services.

### 2.2. `unaccent` está descartada

```
SELECT extname FROM pg_extension;  -- apenas plpgsql
SELECT rolname, rolsuper FROM pg_roles;  -- postgres=t, outmat=f
```

A extensão não está instalada e `CREATE EXTENSION unaccent` exige superusuário.
O ADR-0101 determina que a aplicação use o usuário dedicado **`outmat`**, que não
é superusuário. Introduzir a extensão criaria uma dependência de privilégio
elevado no deploy do Windows Server. **Não entra nesta Sprint.**

### 2.3. Volume de dados

| Tabela | Linhas |
|---|---|
| clientes | 91 |
| produtos | 49 |
| propostas | 28 |
| instalações | 45 |
| proposta_servicos | 2 |
| instalacao_registros | 24 |
| instalacao_custos | 28 |

Volume de sistema interno. Filtrar em memória no service é viável e não introduz
consulta pesada por tecla digitada (o autocomplete tem debounce de 250 ms e
mínimo de 3 caracteres).

### 2.4. Resíduo E2E acumulado no banco de desenvolvimento

| Tabela | Resíduo E2E | Total |
|---|---|---|
| clientes (`nome LIKE 'E2E %'`) | 88 | 91 |
| produtos (`codigo LIKE 'E2E-%'`) | 27 | 49 |
| propostas (cliente E2E) | 25 | 28 |
| instalações | 44 | 45 |

O resíduo **domina** as listagens de Clientes e Produtos em desenvolvimento.

### 2.5. `nomeProjeto` existe em dois models — só um sai

| Campo | Origem | Destino |
|---|---|---|
| `Proposta.nomeProjeto` | ADR-0227, migration `20260707090000_nome_projeto` | **PERMANECE.** Alimenta a capa do PDF Apresentação (`pdf/presentation/pages.tsx`), o cabeçalho da Proposta e o `PropostaPdfDTO`. |
| `Instalacao.nomeProjeto` | migration `20260818000000_instalacoes` | **REMOVIDO** nesta Sprint. |

Conteúdo atual de `instalacoes.nomeProjeto`, verificado linha a linha:

```
1001..1044   "Apartamento E2E 1787…", "Projeto Snapshot 1787…",
             "Projeto Cancelar 1787…", "Projeto Cronologia 1787…",
             "Projeto Edicao 1787…"        → resíduo de E2E
1045         "134324"                      → preenchimento de homologação
```

**Não há dado real a preservar.** O `DROP COLUMN` é seguro. Evidência registrada
aqui conforme exigido.

Atenção: `instalacao.service.ts` linhas 334/342/353 citam `nomeProjeto`, mas são
`Proposta.nomeProjeto` dentro de `searchPropostas` — **não** tocar.

### 2.6. A repetição do endereço na Instalação

`src/features/instalacoes/endereco-snapshot.tsx` renderiza os sete campos
read-only e, logo abaixo, `{enderecoEmLinha(e)}` — o mesmo conteúdo em uma linha
de texto. É essa a duplicação relatada.

`enderecoEmLinha` não tem outro consumidor (`resumoEndereco`, usado na listagem,
mora no service). Removida a linha, a função fica órfã.

### 2.7. Causa do bug da duplicação de Propostas

`proposta.service.ts::duplicarProposta` seleciona e copia apenas:

```
proposalNumber (só para a auditoria), clienteId, vendedorId,
modelo, validadeDias, obsProposta, currentRevisionId
+ seções e itens, via copiarConteudo()
```

Não copia — nenhum deles está no `select`:

```
PropostaServico[]      ← o bug relatado (Som Ambiente / Wi-Fi Premium)
nomeProjeto
tipoDesconto, valorDesconto
frete
formaPagamento, previsaoInstalacao
obsComerciais, obsTecnicas
```

Os itens de tipo `SERVICO` **já** são copiados (`copiarConteudo` inclui `tipo`),
assim como o `valorServico` de cada linha. O que se perde é exclusivamente a
entidade `PropostaServico`, ligada à Proposta e não à Revisão.

### 2.8. O DTO do PDF não carrega a identidade do produto

`PropostaPdfDTO.secoes[].itens[]` traz `codigo`, `descricao`, `unidade`,
`quantidade` e valores — mas **não** `produtoId` nem `tipo`. O agrupamento por
identidade estável exige estender o DTO.

`FontePropostaPdf.servicos?` já é opcional "para compatibilidade com
chamadores/testes anteriores" — há precedente para extensão aditiva opcional.

### 2.9. Todos os documentos atuais emitem a Proposta

`gerarPdf`, `gerarApresentacao`, `gerarContrato` e `gerarAnexoContratual` passam
por `emitirEAbrir`, que chama `emitirPropostaAction` (RASCUNHO → EMITIDA) antes de
abrir. O novo documento **não** segue esse padrão — ver §9.

### 2.10. Acesso ao workspace da Instalação

Já existe "Abrir" no menu `⋮` da linha, mas nada na tabela sinaliza que a linha é
navegável. `next/link` renderiza um `<a>` real (verificado em
`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`),
então atende teclado, foco visível e Ctrl/Cmd+clique sem nenhuma gambiarra.

---

## 3. Riscos e mitigações

| # | Risco | Mitigação |
|---|---|---|
| R1 | Remover `nomeProjeto` do model errado quebra o PDF Apresentação | Duas ocorrências distintas mapeadas em §2.5. Toda edição em `proposta*` é proibida nesta frente. Teste do mapper do PDF trava a regressão. |
| R2 | Cleanup E2E apagar dado real | Marcador explícito (`E2E %` / `E2E-%`), três guardas de ambiente, `throw` em qualquer falha, recontagem final. Nunca `TRUNCATE`, nunca `DELETE` sem `WHERE`. |
| R3 | Cleanup rodar em produção | Guarda de `NODE_ENV`, guarda de host (`localhost`/`127.0.0.1`) e chave de opt-in. O módulo vive em `e2e/`, fora de `src/`, e não é importado por nenhum código de aplicação. |
| R4 | Ordem de exclusão violar FK | `Instalacao.propostaId` e `PropostaItem.produtoId` são `Restrict` — a ordem é explícita, sem depender de cascade nesses dois pontos. |
| R5 | Busca em memória degradar com volume | Só os campos de busca são selecionados; volume atual é de dezenas de linhas. Item registrado no `BACKLOG.md` para estratégia escalável quando necessário. |
| R6 | Alterar a busca quebrar caminhos especiais | `proposalNumber` exato e CPF/CNPJ por dígitos são preservados explicitamente e cobertos por teste. |
| R7 | Duplicação ampliada compartilhar registro com a original | `PropostaServico` é **criado** na proposta nova, nunca reapontado. Teste de independência: alterar a duplicada e verificar a original. |
| R8 | O novo PDF emitir a proposta por engano | Não passa por `emitirEAbrir`. É lista de conferência interna. |
| R9 | Estender o `PropostaPdfDTO` quebrar os quatro documentos atuais | Extensão **opcional** e aditiva, no padrão de `servicos?`. Os mappers existentes não leem o campo novo. |
| R10 | Dashboard consultar Prisma em componente | Service faz IO, módulo puro faz a forma, Server Component só renderiza. |

---

## 4. Infraestrutura compartilhada — normalização de busca

### 4.1. Módulo

Novo `src/utils/busca.ts`, puro, exportado pelo barrel `src/utils/index.ts`:

```ts
/** minúsculas, Unicode NFD, sem diacríticos. "" → "". */
export function normalizarBusca(valor: string): string;

/** true quando `texto` contém `query`, ambos normalizados. Query vazia → true. */
export function contemBusca(texto: string, query: string): boolean;
```

`useCrudList` remove seu `normalize` local e importa o compartilhado. O
comportamento das listagens não muda — passa a ter fonte única. As cinco telas
herdam sem alteração própria.

### 4.2. Autocompletes server-side

Estratégia aprovada, **sem limite arbitrário**:

```
buscar todos os registros que a busca precisa considerar
→ selecionar somente os campos usados pela busca e pela sugestão
→ normalizar em memória
→ filtrar
→ ordenar (ordem já existente de cada busca)
→ slice(0, 10)
```

Um `take: 300` deixaria um registro válido fora do conjunto considerado — por
exemplo, "Thaís" na posição 301 de 500 clientes ativos continuaria invisível.
O limite fica **apenas** na quantidade de sugestões devolvidas.

Por service:

| Service | Conjunto carregado | Campos | Caminho especial preservado |
|---|---|---|---|
| `searchClientes` | `ativo: true` | `id, tipoPessoa, nome, empresa, cpfCnpj` (o `SUGGESTION_SELECT` atual) | CPF/CNPJ por dígitos — agora um predicado sobre o mesmo conjunto, o que dispensa a segunda consulta |
| `searchProdutos` | `ativo: true` | `id, codigo, descricao, unidade, valorProduto, valorServico` | — |
| `searchPropostas` | todas | `id, proposalNumber, nomeProjeto, cliente{tipoPessoa,nome,empresa}` | `proposalNumber` exato |

Mínimos de caracteres (`CLIENTE_SEARCH_MIN_CHARS`, `PRODUTO_SEARCH_MIN_CHARS`, o
`>= 2` de propostas) e as ordenações atuais permanecem.

`BACKLOG.md` recebe o item da estratégia server-side escalável (índice funcional
sobre expressão normalizada, coluna sombra ou `unaccent` com privilégio
resolvido), para quando o volume justificar.

---

## 5. Cleanup E2E

### 5.1. Regra

Todo teste automatizado que criar dado persistente limpa o próprio dado ao final.
Nenhum resíduo `E2E-*` sobrevive a uma execução normal da suíte.

### 5.2. Estratégia única: `globalTeardown`

Módulo **test-only** `e2e/support/limpeza.ts`, fora de `src/`, usando `pg`
diretamente. Não é endpoint, não é Server Action, não é importado por nenhum
código de aplicação, e nenhuma regra de exclusão da aplicação produtiva é
afrouxada para acomodá-lo.

Escolhido em vez de `afterEach`/fixture por teste porque os cenários encadeiam
entidades entre passos (cliente → proposta → instalação → registro → custo) e uma
varredura por marcador, em ordem de dependência, é verificável de forma completa —
enquanto o teardown por cenário depende de cada teste lembrar tudo o que criou.
O `globalTeardown` do Playwright roda **uma vez, depois da suíte, inclusive quando
há testes falhando**, que é o requisito de resiliência a falha.

### 5.3. Guardas — `throw` se qualquer uma falhar

```
NODE_ENV !== "production"
host da DATABASE_URL ∈ { localhost, 127.0.0.1 }
E2E_CLEANUP !== "0"
```

### 5.4. Marcadores

| Entidade | Marcador |
|---|---|
| Cliente | `nome LIKE 'E2E %'` |
| Produto | `codigo LIKE 'E2E-%'` |
| Proposta | pertence a cliente E2E |
| Instalação | pertence a cliente E2E |
| Revisão · Seção · Item · Serviço · Auditoria | pertencem a proposta E2E |
| Registro · Custo · Auditoria de instalação | pertencem a instalação E2E |

### 5.5. Ordem de exclusão

Explícita, sem confiar em cascade onde há `Restrict`:

```
instalacao_custos
instalacao_registros
instalacao_auditorias
instalacoes                 ← antes de propostas (Instalacao.propostaId é Restrict)
proposta_itens              ← antes de produtos  (PropostaItem.produtoId é Restrict)
proposta_secoes
proposta_revisoes
proposta_servicos
proposta_auditorias
propostas
produtos
clientes
```

`propostas.currentRevisionId` aponta para `proposta_revisoes`; o vínculo é zerado
antes de apagar as revisões.

### 5.6. Verificação automatizada

Depois de apagar, o teardown **reconta** os marcadores e lança se sobrar qualquer
linha. Um `globalTeardown` que falha derruba a execução — é o único lugar onde a
asserção pode rodar, já que nenhum teste executa depois dela. Atende ao requisito
de "checagem automatizada de que um identificador E2E não permanece no banco após
a suíte".

### 5.7. Backup — uma única vez

`pg_dump` é operação de **implantação desta mudança**, não de rotina:

1. gerar o backup de segurança;
2. conferir que o arquivo foi criado e tem tamanho coerente;
3. rodar a rotina contra o resíduo histórico;
4. validar que só o que estava marcado como E2E saiu (contagens antes/depois);
5. a partir daí, a operação normal é só o `globalTeardown`.

O `globalTeardown` **nunca** executa `pg_dump`. Nada de backup acumulando a cada
execução do Playwright.

---

## 6. Instalações

### 6.1. Remoção de `Instalacao.nomeProjeto`

Removido de: `prisma/schema.prisma`, migration própria (`DROP COLUMN`), schema
Zod, `InstalacaoListItem`/`InstalacaoDetalhe`/`InstalacaoInput`, `select`/`map`/
`toData` do service, coluna e `searchAccessor` da listagem, placeholder da busca,
campo do formulário de criação, campo do workspace, `schema.test.ts` e helpers do
E2E. Migration nova; nenhuma migration aplicada é editada.

`searchAccessor` da Instalação passa a ser: **número · cliente · endereço ·
responsável · status**.

### 6.2. Repetição do endereço

`EnderecoSnapshot` perde a linha `{enderecoEmLinha(e)}`. Permanecem os sete campos
read-only e a nota explicativa. `enderecoEmLinha` fica sem consumidor e é removida
junto com seu bloco de teste — consequência direta da mudança aprovada.

A regra server-side do snapshot **não muda**:

```
clienteId → service lê o Cliente persistido → service cria o snapshot
```

`criarInstalacao` continua derivando o endereço sozinho; os schemas Zod continuam
sem declarar campos de endereço; `atualizarInstalacao` continua sem tocá-lo.

### 6.3. Acesso ao workspace pela tabela

O número da Instalação vira `<Link href={/instalacoes/${id}}>` do `next/link`,
com estilo visual de link e foco visível. O `⋮ → Abrir` permanece.

---

## 7. Dashboard

### 7.1. Arquitetura

```
dashboard.service.ts        IO (Prisma)
  → módulo puro em features/dashboard/    forma, ordem, totais
    → DashboardDTO
      → Server Component
```

Mesmo par service/mapper de `proposta-pdf`. Nenhum componente importa Prisma. O
módulo puro é testável sem banco — é onde os testes exigidos incidem.

### 7.2. Indicadores

**Comercial:** Propostas em Rascunho · Propostas Emitidas.

**Instalações:** A Agendar · Agendadas · Aguardando Material · Em Andamento ·
Concluídas.

**Custos:** custos extras acumulados das Instalações.

Rótulos vêm de `features/instalacoes/labels.ts` e `features/propostas/labels.ts` —
a tela não escreve status à mão.

### 7.3. Próximas Instalações

Máximo 5. Critérios: `dataAgendada >= hoje` (início do dia, fuso
`America/Sao_Paulo`, via `features/instalacoes/datas.ts`), status diferente de
`CONCLUIDA` e de `CANCELADA`, ordem crescente por `dataAgendada`. Colunas: data,
número, cliente, status, responsável. **Não** depende de `nomeProjeto`.

Sem instalações futuras, estado vazio com `PageEmpty`.

### 7.4. Fora de escopo

Gráficos, charts, comparativo mensal, metas, funil, receita, margem, widgets
configuráveis, filtros avançados, tempo real, drag and drop, dashboard por
usuário. Nenhum dado fictício: tudo vem do banco.

O Dashboard não conhece o PDF Geral de Produtos, e vice-versa. Services separados.

---

## 8. Propostas — duplicação

`duplicarProposta` passa a copiar o conteúdo comercial aplicável:

**Copiado:** `clienteId`, `vendedorId`, `modelo`, `validadeDias`, `obsProposta`,
seções e itens (já funcionava), **`PropostaServico[]`**, `nomeProjeto`,
`tipoDesconto`, `valorDesconto`, `frete`, `formaPagamento`, `previsaoInstalacao`,
`obsComerciais`, `obsTecnicas`.

**Nunca copiado:** `obsInternas` (ADR-0203), `proposalNumber`, `status`, datas de
status, cancelamento, auditoria.

Cada `PropostaServico` é **criado** na proposta nova com `tipo`, `descricao`,
`valorProdutos`, `valorServicos`, `valorTotal` e `ordem`. Nenhum `id` da origem é
reaproveitado; nenhum registro mutável é compartilhado. `SIMPLIFICADA` força
conjunto vazio, como já fazem `criarPropostaCompleta` e `salvarProposta`.

O cálculo financeiro não é tocado: `calcularResumoFinanceiro().totalGeral`
continua sendo a fonte oficial e nenhum total é recalculado aqui.

---

## 9. Propostas — PDF Geral de Produtos

### 9.1. Propósito

Lista quantitativa de produtos da Proposta, com todas as ocorrências do mesmo
produto somadas em uma linha, para separação e conferência de material.

```
Sala:    Produto A × 2
Suíte:   Produto A × 4
                      →   Produto A × 6
```

### 9.2. Função pura

`src/features/propostas/pdf/consolidado.ts`:

```ts
consolidarProdutos(dto: PropostaPdfDTO): ProdutoConsolidado[]
```

**Chave de agrupamento:** `produtoId` quando existir; caso contrário
`"codigo:" + normalizarBusca(codigo)`. Nunca só a descrição. O fallback cobre
itens legados ou sem vínculo estável e está documentado no módulo.

**Não entram:** itens `tipo === "SERVICO"`, os serviços complementares
(`dto.servicos` — Som e Wi-Fi), frete, desconto, custos de Instalação e qualquer
valor financeiro. O documento é quantitativo.

**Sem separação por Seção** — consolidar as Seções é justamente a finalidade.

**Ordenação:** SKU ascendente com `localeCompare("pt-BR")`, desempate por
descrição. Determinística e independente da ordem dos itens de entrada.

**Proposta sem produtos:** devolve lista vazia; o documento é gerado com a tabela
vazia e uma linha de estado vazio (comportamento definido, não erro).

### 9.3. Extensão do DTO

`PdfItem` e `FonteItem` ganham `produtoId?: string | null` e `tipo?: "PRODUTO" |
"SERVICO"`, **opcionais e aditivos**, no mesmo padrão de `servicos?`. O loader
`getPropostaPdfData` passa a selecioná-los. Os quatro mappers existentes não leem
os campos novos e não mudam de comportamento.

### 9.4. Arquitetura

```
Route Handler (runtime nodejs, force-dynamic, no-store)
  → getPropostaPdfData(id)        loader ÚNICO, o mesmo dos outros documentos
  → PropostaPdfDTO
  → consolidarProdutos()          função pura
  → renderer (@react-pdf/renderer)
  → Response
```

Nenhuma consulta Prisma paralela no Route Handler.

### 9.5. Rota, botão e download

| | |
|---|---|
| Rota | `GET /propostas/[id]/produtos` |
| Botão | **PDF Geral de Produtos** |
| Emite a proposta? | **Não.** Não passa por `emitirEAbrir`. Disponível em RASCUNHO e EMITIDA. |
| Habilitado quando | a proposta tem ao menos um item |
| Arquivo | `Geral de Produtos - {Primeiro Nome} {Nº} Rev.{N}.pdf` |
| Disposição | `inline`, como os demais PDFs |

O nome segue o padrão de `pdf/filename.ts` (`{Prefixo} - {Primeiro Nome} {Nº}
Rev.{N}.pdf`), que é o vigente para todos os PDFs; o formato com nome completo é
exclusivo do Contrato .docx.

O rótulo não colide com "Gerar PDF Detalhado" nem com "Abrir PDF Detalhado".

---

## 10. Menu

```
Dashboard
Clientes
Produtos
Propostas
Instalações
Vendedores
Configurações
```

Um único array em `src/lib/navigation.ts`. Ícones, permissões, responsividade e
tema preservados. Nenhum grupo ou submenu novo.

---

## 11. Testes

### Unidade (Vitest)

- `normalizarBusca` / `contemBusca`: `Thaís`↔`Thais`, `João`↔`Joao`,
  `São Caetano`↔`Sao Caetano`, `AUTOMAÇÃO`↔`automacao`, string vazia, números
  e demais caracteres preservados, case-insensitive.
- `mainNavigation`: ordem exata dos sete itens.
- Instalação: `novaInstalacaoSchema` aceita criação sem `nomeProjeto`; o schema
  não declara o campo; endereço continua descartado no parse.
- Dashboard (módulo puro): contagens por status, soma dos custos, próximas
  instalações ordenadas, corte em 5, exclusão de Concluída/Cancelada, estado vazio.
- `consolidarProdutos`: um produto; mesmo produto em duas Seções; mesmo produto
  repetido várias vezes; vários produtos; ordem de entrada diferente com mesmo
  resultado; quantidade total correta; descrições parecidas não se misturam;
  itens `SERVICO` fora; Som/Wi-Fi fora; proposta sem produtos.
- `nomeArquivoPdf("produtos", …)`.
- Regressão: mappers dos quatro documentos existentes seguem verdes; o
  `contrato.mapper.test.ts` continua travando `resumo.totalGeral`.

### E2E (Playwright)

- Ordem dos sete itens da navegação na tela.
- Busca sem acento em tela real: cliente com acento é encontrado digitando a
  forma sem acento no autocomplete.
- Instalações: criação sem `nomeProjeto`; endereço continua snapshot; listagem
  não mostra a coluna Projeto; busca funciona sem o campo; o número é link e abre
  o workspace correto; cronologia e custos intactos.
- Propostas: duplicar proposta com Som e Wi-Fi; a duplicada tem os serviços com os
  mesmos valores; alterar a duplicada não altera a original; `obsInternas` não é
  copiada.
- PDF Geral de Produtos: proposta com o mesmo produto em duas Seções; endpoint
  200, `Content-Type` PDF, nome do arquivo correto, corpo não vazio. Sem OCR e sem
  ferramenta frágil — a validação de conteúdo fica nos unitários da função pura.
- Cleanup: nenhum resíduo E2E após a suíte (verificado pelo próprio teardown).

---

## 12. O que não pode quebrar

**Instalações 1.2.0:** cronologia, custos, categorias, responsáveis manuais,
`aconteceuEm`, ordenação da timeline, `Decimal(12,2)`, total derivado, edição
transacional, exclusão bloqueada com custos, snapshot de endereço no service,
auditoria estrutural e status.

**Comercial:** cálculo financeiro, numeração, revisões, emissão, cancelamento,
auditoria, descontos, frete, serviços complementares, os quatro documentos
existentes, o template DOCX e o Contrato. A normalização de acentos afeta a busca
de Propostas **por design** — e apenas isso.

---

## 13. Fora de escopo

Pedido de Venda · Ordem de Serviço · login · usuários · responsáveis operacionais
como entidade · alteração de cálculo financeiro · alteração do Contrato ou do
template DOCX · alteração dos PDFs existentes · atualização de dependências ou do
Next.js · remoção do `force-dynamic` · caminhos fixos · Prisma em componente ·
Seção tratada como Ambiente · `id` de banco como numeração comercial ·
refatoração oportunista.

---

## 14. VERSION

Entrada: **1.2.0**. Não é alterada no início da Sprint.

A decisão é tomada no fechamento e justificada por escrito. A leitura do
histórico aponta **MINOR (1.3.0)**: a 1.2.0 foi MINOR por entregar módulo novo
aditivo, e esta Sprint entrega duas funcionalidades novas visíveis ao usuário —
o Dashboard e um quinto documento da Proposta —, o que ultrapassa o critério de
patch de refinamento. A análise formal é apresentada antes de gravar o número.

---

## 15. ADRs previstos

| ADR | Assunto |
|---|---|
| ADR-0402 | Normalização de busca compartilhada; acento resolvido em memória no service, sem `unaccent`; sem limite arbitrário no conjunto considerado |
| ADR-0403 | Cleanup E2E por `globalTeardown` test-only, com guardas de ambiente e verificação de resíduo |
| ADR-0404 | Remoção de `Instalacao.nomeProjeto` e da repetição do endereço; acesso ao workspace por link semântico |
| ADR-0405 | Dashboard V1 — service + módulo puro + DTO, sem gráficos |
| ADR-0406 | Duplicação de Proposta passa a copiar o conteúdo comercial aplicável, incluindo `PropostaServico` |
| ADR-0407 | PDF Geral de Produtos — quinto documento, quantitativo, agrupado por identidade estável, sem emitir a proposta |
