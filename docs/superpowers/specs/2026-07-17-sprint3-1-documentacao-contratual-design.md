# Sprint 3.1 — Documentação Contratual (design)

Data: 2026-07-17
Status: aprovado (aguardando plano de implementação)

## Objetivo

Separar os documentos comerciais da proposta em quatro artefatos distintos, encerrando
o módulo Comercial:

- PDF Detalhado (existente, inalterado)
- PDF Apresentação (existente, inalterado)
- Contrato (.docx, **novo**)
- Anexo Contratual (PDF, **renomeação** do PDF Contratual existente)

## Contexto (estado atual)

Levantamento do código antes do design:

1. **O "PDF Contratual" existente já é o Anexo Contratual.** Em
   `src/features/propostas/pdf/proposta-pdf-document.tsx` a variante `"contratual"`
   já se intitula "ANEXO CONTRATUAL", já lista produtos/quantidades sem preço por
   item, e já traz Som Ambiente, Wi-Fi Premium, desconto, frete e total. O download
   já se chama `Anexo Contrato - {Nome} {Nº} Rev.{N}.pdf`. Nenhuma mudança de
   conteúdo é necessária — apenas o rótulo do botão.

2. **Não existe contrato jurídico no sistema.** Zero ocorrências de "cláusula",
   "contratante" ou "foro" no código. Não há template .docx no repositório nem
   dependência de .docx no `package.json`. O contrato é construção nova.

3. **Não existe "valor por extenso"** (zero ocorrências de `extenso`/`porExtenso`).

4. **Arquitetura de documentos vigente:** loader único (`getPropostaPdfData`) →
   mapper puro (`montarPropostaPdfDTO`) → renderer (`@react-pdf/renderer`) →
   route handler (`runtime = "nodejs"`, `force-dynamic`, `no-store`, sem persistir
   arquivo). O contrato segue este mesmo padrão.

## Decisões

### D1 — docxtemplater para preencher o template

O contrato é gerado com **`docxtemplater` + `pizzip`** (ambos MIT), a partir do
.docx oficial da Outmat marcado com tags.

Alternativas descartadas:

- **Biblioteca `docx` (reconstruir programaticamente):** viola "preservar toda a
  formatação do modelo" — o layout seria recriado por aproximação, e todo ajuste
  de estilo viraria código, impedindo o jurídico de editar o documento sem dev.
- **`pizzip` + regex sobre `document.xml`:** o Word fragmenta `{clienteNome}` em
  múltiplos *runs* XML; o regex falha **silenciosamente** e o campo fica vazio sem
  erro. É exatamente o problema que o docxtemplater resolve.

Não há loop `{#produtos}`: o contrato remete ao Anexo I (o Anexo Contratual em PDF)
para o escopo, evitando duplicar a lista em dois documentos que podem divergir.

### D2 — `extenso` para valor por extenso

Biblioteca `extenso` (MIT), modo `currency`. Escrever do zero seriam ~80 linhas com
casos difíceis (cem/cento, centavos, valores quebrados) num documento jurídico.

### D3 — Marcação do template é programática, feita uma vez (REVISADO em 2026-07-17)

**Revisão após inspeção do template real.** A versão original de D3 dizia que o
usuário marcaria o template no Word, porque mexer no XML arriscaria a formatação.
Essa avaliação de risco valia para placeholders **fragmentados entre runs**.
Verificação no template entregue: **todos os 12 placeholders estão intactos dentro
de um único `<w:t>`** — nenhum fragmentado. Trocar o texto dentro de um `<w:t>` não
toca em fonte, margem, cabeçalho, rodapé, espaçamento, numeração nem estilo.

Portanto a conversão `[PLACEHOLDER]` → `{tag}` é feita programaticamente, **uma
única vez**, gerando o template marcado que é commitado no repositório. A prova
exigida: diff estrutural do `document.xml` demonstrando que **apenas texto dentro de
`<w:t>` mudou** — todo o restante do XML byte a byte idêntico.

O template vive em `public/templates/contrato/contrato-outmat.docx` (o arquivo
chegou como `contrato-outmat.docx.docx`, extensão dupla; é renomeado).

### D3.1 — Marcação é SELETIVA (crítico)

O template usa `[MAIÚSCULAS ENTRE COLCHETES]`, não `{tag}`. A saída óbvia seria
configurar o docxtemplater com delimitadores `[` `]`. **Isso está proibido**, porque
`[Nº]` aparece **5 vezes com 5 significados diferentes**:

| Ocorrência | Significado | Sistema sabe? |
|---|---|---|
| Cláusula 3.1 | dias úteis para **início** | ❌ |
| Cláusula 3.1 | dias úteis para **conclusão** | ❌ |
| Cláusula 5.5 | dias úteis para **aceite** | ❌ |
| Cláusula 9.2 | **multa %** na rescisão | ❌ |
| Anexo II | **número da proposta** | ✅ |

Com delimitadores `[ ]`, os cinco receberiam o mesmo valor — o contrato sairia com
"multa de 1042%". Inaceitável num documento assinado.

**Regra:** apenas os placeholders que o sistema preenche viram `{tag}`. Os demais
permanecem literais `[...]`, para preenchimento manual no Word — coerente com o
escopo ("alterações de cláusulas realizadas posteriormente pelo usuário"). O
docxtemplater roda com os delimitadores padrão `{ }` e nunca enxerga os literais.

**Permanecem literais (manuais):** os 4 `[Nº]` de prazos/multa, `[VALOR]` (parcela
final do Anexo II — dado que o sistema não possui) e `[se houver]` (observações).

### D4 — Botões seguem o padrão de emissão atual

Em RASCUNHO, "Emitir Contrato" chama `emitirPropostaAction` (emite a proposta,
congela a revisão) e então baixa o .docx — idêntico aos outros três botões, via o
`emitirEAbrir` já existente. Em EMITIDA, apenas baixa. Sem exceção de comportamento
para o usuário aprender.

### D5 — Contrato de tags (REVISADO em 2026-07-17, derivado do template real)

O template é a autoridade. Mapeamento `[PLACEHOLDER]` → `{tag}`:

| Placeholder no template | Tag | Fonte | Onde |
|---|---|---|---|
| `[NOME COMPLETO DO CLIENTE]` | `{clienteNome}` | `cliente.empresa` se PJ, senão `cliente.nome` | Partes |
| `[CPF/CNPJ]` | `{clienteDocumento}` | `cliente.cpfCnpj` formatado | Partes |
| `[ENDEREÇO DO CLIENTE]` | `{clienteEndereco}` | campos granulares, separados por vírgula | Partes |
| `[Nº DA PROPOSTA]` | `{propostaNumero}` | `proposta.proposalNumber` | Cl. 1.2 |
| `[VALOR TOTAL]` | `{valorTotal}` | `resumo.totalGeral`, **sem "R$"** | Cl. 2.1 |
| `[VALOR POR EXTENSO]` | `{valorTotalExtenso}` | `extenso(resumo.totalGeral)` | Cl. 2.1 |
| `[DESCREVA AQUI A FORMA DE PAGAMENTO: …]` | `{formaPagamento}` | `proposta.formaPagamento` (ver D5.3) | Cl. 2.2 |
| `[DATA]` (2×) | `{data}` | `proposta.emitidaAt`, **só a data** | Fecho + Anexo II |
| `[NOME DO CLIENTE]` | `{clienteNome}` | mesmo da qualificação | Anexo II |
| `[Nº]` (**apenas o do Anexo II**) | `{propostaNumero}` | `proposta.proposalNumber` | Anexo II |
| `[OUTMAT]` | `{empresaNome}` | `config.nomeEmpresa` | Anexo II |

**Regra:** todo campo ausente vira string vazia, nunca `undefined` — o docxtemplater
renderiza `undefined` literalmente no documento. Exceção: `{formaPagamento}` (D5.3).

`{clienteDocumentoLabel}` e `{clienteRgIe}` — previstos na versão original — **não
existem**: o template já traz "inscrito(a) no CPF/CNPJ sob o nº" como texto fixo, e
não há placeholder para RG/IE.

#### D5.1 — Tags eliminadas pelo template

A qualificação da **CONTRATADA está hardcoded** no template ("JVL INDÚSTRIA E
COMÉRCIO DE ELETROELETRÔNICOS LTDA, CNPJ 37.830.388/0001-68, com sede na Rua Eng.
Cajado de Lemos, 290, Cerâmica, São Caetano do Sul/SP, CEP 09530-320"). Portanto
`{empresaRazaoSocial}`, `{empresaCnpj}`, `{empresaIe}` e `{empresaEndereco}` — da
versão original de D5 — **não existem**: não há placeholder onde encaixá-las, e a
regra obrigatória proíbe alterar o que não é placeholder.

**Consequência importante:** a `ConfiguracaoSistema` é usada apenas para
`{empresaNome}` no Anexo II. O `PdfEmpresa` **não precisa ser estendido**, e a
premissa central de D6 cai (ver D6 revisado).

Nota factual: a razão social contratual é **JVL**, entidade distinta da marca
"Outmat". Como está fixa no template, o sistema não interfere.

#### D5.2 — Dois ajustes que o template impõe

- **`{valorTotal}` sem "R$".** A cláusula 2.1 já traz `"o valor total de R$ [VALOR
  TOTAL] ([VALOR POR EXTENSO])"`. A tag emite `12.345,67`, não `R$ 12.345,67` —
  senão sai "R$ R$ 12.345,67". Pelo mesmo motivo `{valorTotalExtenso}` não leva
  parênteses: o template já os tem.
- **`{data}` sem cidade.** O fecho já traz `"São Caetano do Sul, [DATA]."` — cidade
  fixa. A tag emite `"17 de julho de 2026"`. A versão original previa `"Curitiba, 17
  de julho de 2026"`, o que duplicaria a cidade **e** citaria a cidade errada.
  Fonte: `proposta.emitidaAt`, nunca `new Date()` — reemitir o contrato de uma
  proposta antiga deve reproduzir a data original.

#### D5.3 — Forma de pagamento: substituição condicional

O template traz um **bloco de instrução** em 2.2 ("[DESCREVA AQUI A FORMA DE
PAGAMENTO: entrada, número de parcelas… Exemplos: 50% de entrada…]").

- `proposta.formaPagamento` **preenchida** → o bloco inteiro é substituído por ela.
- `proposta.formaPagamento` **vazia** → o bloco de instrução **permanece**, servindo
  de guia para quem preencher no Word.

A instrução é o *fallback* da tag, não string vazia — o único campo com esse
comportamento. Deixar a cláusula 2.2 em branco num contrato enviado é pior do que
deixar a instrução visível.

#### D5.4 — Fonte do valor (crítico)

O projeto tem dois calculadores que **divergem** (`src/features/propostas/totais.ts`):

- `calcularTotais` → desconto incide **só sobre a Automação**
- `calcularResumoFinanceiro` → desconto incide sobre o **Total combinado**
  (Automação + Som + Wi-Fi)

O contrato usa **`calcularResumoFinanceiro().totalGeral`** — a mesma fonte que o
Anexo Contratual (`dto.resumo.totalGeral`). Fonte oficial fixada pela sprint.
Contrato e Anexo citam o mesmo negócio e não podem divergir em centavos. Um teste
do mapper trava essa escolha.

### D6 — Sem refatoração de loader: o contrato consome o `PropostaPdfDTO` (REVISADO)

**A versão original de D6 foi descartada.** Ela extraía `carregarPropostaEConfig()`
do `proposta-pdf.service.ts` para dar ao contrato acesso aos dados crus, partindo da
premissa de que o `PropostaPdfDTO` descartava o que o contrato precisa. Após D5.1
(CONTRATADA hardcoded) essa premissa caiu. Auditoria do DTO:

| Tag | Já existe no DTO? |
|---|---|
| `{empresaNome}` | ✅ `empresa.nome` (`nomeEmpresa \|\| razaoSocial \|\| "Outmat"`) |
| `{clienteNome}` | ✅ `cliente.nome` — `clienteDisplay()` já resolve PF/PJ |
| `{clienteDocumento}` | ✅ `cliente.documento` |
| `{propostaNumero}` | ✅ `numero` |
| `{valorTotal}` / `{valorTotalExtenso}` | ✅ `resumo.totalGeral` |
| `{formaPagamento}` | ✅ `formaPagamento` |
| `{data}` | ✅ `data` |
| `{clienteEndereco}` | ⚠️ existe, separado por `·` |

Uma única lacuna — o separador do endereço. Não justifica refatorar o service dos
PDFs. **O contrato chama `getPropostaPdfData(id)` e mapeia `PropostaPdfDTO` → tags.**

Ganhos: `proposta-pdf.service.ts` e o `PropostaPdfDTO` ficam **intactos** (risco zero
aos PDFs existentes, alinhado à regra "não alterar os PDFs existentes"), e some um
arquivo do escopo.

Nota: `dto.data` = `currentRevision.emittedAt ?? emitidaAt ?? createdAt` — melhor que
o `emitidaAt` cru previsto em D5.2, pois respeita a data de emissão da **revisão**
vigente. É o valor usado em `{data}`.

#### D6.1 — Endereço

`{clienteEndereco}` = `dto.cliente.endereco` com `" · "` trocado por `", "`. O
`montarEndereco` já monta `"Rua X, 123 · Sala 2 · Centro · Curitiba/PR · CEP 80000-320"`;
a troca produz `"Rua X, 123, Sala 2, Centro, Curitiba/PR, CEP 80000-320"`, adequado
à qualificação das partes ("residente/com sede em [ENDEREÇO DO CLIENTE]").

O acoplamento ao separador do mapper é coberto por teste — se `montarEndereco` mudar
o separador, o teste do contrato falha em vez de emitir "·" num documento jurídico.

## Arquitetura

```
GET /propostas/[id]/contrato
  → getPropostaPdfData(id)        IO já existente, reusado sem alteração
  → montarContratoTags(dto)       puro: DTO → Record<string,string>
  → renderContratoDocx(tags)      docxtemplater + template marcado
  → Response .docx (attachment)
```

### Preparação do template (uma vez, fora do runtime)

Passo prévio, não faz parte do fluxo de request:

```
contrato-outmat.docx.docx  (oficial, [PLACEHOLDERS])
  → script de marcação seletiva (D3/D3.1)
  → verificação: diff estrutural (só <w:t> mudou)
  → public/templates/contrato/contrato-outmat.docx  (marcado, {tags}) → commitado
```

### Arquivos

**Novos:**

| Arquivo | Responsabilidade |
|---|---|
| `public/templates/contrato/contrato-outmat.docx` | Template marcado (gerado na preparação, commitado) |
| `src/app/propostas/[id]/contrato/route.ts` | Route handler (espelha `contratual/route.ts`) |
| `src/features/propostas/docx/contrato-tags.ts` | `montarContratoTags(dto)` — puro, testável |
| `src/features/propostas/docx/contrato-tags.test.ts` | Testes do mapper de tags |
| `src/features/propostas/docx/render.ts` | `renderContratoDocx` — docxtemplater |
| `src/features/propostas/docx/extenso.ts` | Wrapper de `valorPorExtenso` |
| `scripts/marcar-template-contrato.mjs` | Preparação do template (uso único, versionado para auditoria) |

**Alterados:**

| Arquivo | Mudança |
|---|---|
| `src/features/propostas/proposta-workspace.tsx` | Rótulo → "Emitir Anexo Contratual"; botão "Emitir Contrato" novo |
| `src/features/propostas/pdf/filename.ts` | Generalizar extensão e `Content-Disposition` |
| `package.json` | + `docxtemplater`, `pizzip`, `extenso` |
| `DECISIONS.md` | + ADR-0330 |

`proposta-pdf.service.ts`, `proposta-pdf.mapper.ts` e os documentos react-pdf **não
são tocados** (D6).

### Naming e download

`filename.ts` hoje é PDF-only: `nomeArquivoPdf` crava `.pdf` e
`contentDispositionPdf` crava `inline`. Generaliza-se para aceitar extensão e
disposição, **mantendo os três nomes atuais byte a byte**.

O contrato baixa como `Contrato - {Primeiro Nome} {Nº} Rev.{N}.docx`, com
`Content-Disposition: attachment` (o .docx não renderiza no navegador; o objetivo é
abrir no Word para editar).

Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## Testes

Seguindo o padrão de `proposta-pdf.mapper.test.ts` (mapper puro, sem banco):

**`montarContratoTags`:**
- PF vs PJ (`{clienteNome}` = nome vs razão social; `{clienteDocumento}`).
- Campos ausentes → string vazia, **nunca `undefined`** (senão o docxtemplater
  escreve "undefined" no contrato).
- `{clienteEndereco}`: separador `·` convertido em `, ` (D6.1) — trava o acoplamento
  ao `montarEndereco`.
- **`{valorTotal}` == `resumo.totalGeral`** com desconto + frete presentes — trava a
  fonte oficial (D5.4) e garante que contrato e Anexo não divirjam.
- **`{valorTotal}` não contém "R$"** e `{valorTotalExtenso}` não contém parênteses
  (D5.2) — o template já os fornece.
- `{data}` usa `dto.data`, não a data corrente.
- `{formaPagamento}`: preenchida → texto da proposta; vazia → bloco de instrução
  preservado (D5.3).

**`valorPorExtenso`:** inteiro, com centavos, zero, casos cem/cento.

**`filename.ts`:** os três nomes de PDF atuais **inalterados** (regressão da
generalização); contrato gera `.docx` com `attachment`.

**Template marcado (teste de integridade, roda no CI):**
- Todas as `{tags}` de D5 estão presentes no template.
- Os **4 `[Nº]` manuais, `[VALOR]` e `[se houver]` continuam literais** — nenhum
  virou tag (D3.1). Esta é a proteção contra o bug "multa de 1042%".
- `renderContratoDocx` com dados de exemplo não lança e não emite `undefined`.

**Teste manual (obrigatório):** gerar contrato de proposta PF e PJ, abrir no Word,
conferir contra o template oficial que fonte, margens, cabeçalho, rodapé,
espaçamentos, numeração e estilos estão idênticos, e que todos os campos foram
preenchidos.

## ADR

**ADR-0330 — Contrato em .docx via docxtemplater.** Registra por que .docx entrou
ao lado do `@react-pdf/renderer` (ADR-0223). Não contradiz o ADR-0223: aquele
decidia sobre geração de PDF, e o docxtemplater é puro JS/WASM, mantendo a mesma
motivação de não trazer Chromium. O contrato é .docx porque precisa ser **editável
antes do envio** (forma de pagamento, cláusulas, prazos, ajustes jurídicos) — um
requisito que nenhum PDF atende.

## Critérios de aceite

- [ ] Botão "PDF Contratual" removido
- [ ] Botão "Emitir Contrato" criado, gera .docx
- [ ] Botão "Emitir Anexo Contratual" criado, gera o PDF existente
- [ ] Template do contrato preservado — fonte, margens, cabeçalho, rodapé,
      espaçamentos, numeração, estilos e estrutura idênticos (conferido no Word)
- [ ] Campos variáveis preenchidos automaticamente
- [ ] **Os 4 `[Nº]` manuais, `[VALOR]` e `[se houver]` permanecem literais** (D3.1)
- [ ] **`{valorTotal}` == `resumo.totalGeral`; Contrato e Anexo com valor idêntico**
- [ ] Nomes de download dos 3 PDFs existentes inalterados
- [ ] Build sem erros
- [ ] TypeScript sem erros
- [ ] ESLint zerado

## Fora do escopo

- Assinatura eletrônica e controle de assinatura
- Geração automática do Pedido
- Alterações na Ordem de Serviço
- Alterações nos PDFs existentes, no fluxo das propostas ou no cálculo de valores

## Dependência externa — RESOLVIDA

O `.docx` oficial foi entregue em 2026-07-17 (`contrato-outmat.docx.docx`, extensão
dupla, a renomear). Veio **não marcado**, no formato oficial com `[PLACEHOLDERS]` —
a marcação passa a ser tarefa da implementação (D3), não um bloqueio.

Verificações já realizadas sobre ele:
- 12 placeholders distintos, **todos intactos** num único `<w:t>` (nenhum fragmentado
  entre runs) → marcação programática é segura (D3).
- `[Nº]` ambíguo em 5 pontos → exige marcação seletiva (D3.1).
- CONTRATADA, cidade do fecho e "R$" da cláusula 2.1 são texto fixo → reduzem o
  contrato de tags (D5.1, D5.2).
- Contém um **Anexo II — Termo de Aceite de Entrega**, com `[VALOR]` (parcela final)
  e `[se houver]` (observações), ambos manuais. O Termo de Aceite está fora do escopo
  da sprint; o sistema apenas preserva seu texto e preenche `{clienteNome}`,
  `{propostaNumero}`, `{empresaNome}` e `{data}` nele.

## Histórico de revisões

- **2026-07-17 (inicial):** design aprovado antes da entrega do template; D3/D5/D6
  baseados em premissas.
- **2026-07-17 (revisão pós-template):** inspeção do `.docx` real corrigiu D3
  (marcação programática, pois nada está fragmentado), acrescentou D3.1 (marcação
  seletiva — `[Nº]` ambíguo em 5 pontos), reescreveu D5 conforme os placeholders
  reais (4 tags de empresa eliminadas; `{valorTotal}` sem "R$"; `{data}` sem cidade;
  forma de pagamento condicional) e descartou D6 (o `PropostaPdfDTO` já supre tudo
  menos o separador do endereço → zero alteração no service dos PDFs).
