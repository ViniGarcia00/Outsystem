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

### D3 — Marcação do template é manual (fora do código)

O .docx oficial é fornecido pelo usuário e **marcado por ele no Word**, seguindo o
contrato de tags de D5. Inserir tags programaticamente mexeria no XML à mão,
arriscando justamente a formatação que se quer preservar.

O template vive em `public/templates/contrato/contrato-outmat.docx`, seguindo a
convenção já usada por `public/templates/presentation/`.

### D4 — Botões seguem o padrão de emissão atual

Em RASCUNHO, "Emitir Contrato" chama `emitirPropostaAction` (emite a proposta,
congela a revisão) e então baixa o .docx — idêntico aos outros três botões, via o
`emitirEAbrir` já existente. Em EMITIDA, apenas baixa. Sem exceção de comportamento
para o usuário aprender.

### D5 — Contrato de tags

| Tag | Preenchimento | Fonte |
|---|---|---|
| `{clienteNome}` | Razão social (PJ) ou nome (PF) | `cliente.empresa` se `tipoPessoa = PJ`, senão `cliente.nome` |
| `{clienteDocumento}` | CPF ou CNPJ formatado | `cliente.cpfCnpj` |
| `{clienteDocumentoLabel}` | "CPF" ou "CNPJ" | derivado de `cliente.tipoPessoa` |
| `{clienteRgIe}` | RG (PF) ou Inscrição Estadual (PJ) | `cliente.rg` / `cliente.inscricaoEstadual` |
| `{clienteEndereco}` | Endereço completo, separado por vírgulas | campos granulares de `Cliente` |
| `{propostaNumero}` | Número da proposta | `proposta.proposalNumber` |
| `{valorTotal}` | `R$ 12.345,67` | **`resumo.totalGeral`** (ver nota abaixo) |
| `{valorTotalExtenso}` | "doze mil, trezentos e quarenta e cinco reais e sessenta e sete centavos" | `extenso(resumo.totalGeral)` |
| `{formaPagamento}` | Campo livre da proposta | `proposta.formaPagamento` |
| `{dataExtenso}` | "Curitiba, 17 de julho de 2026" | `config.cidade` + data de emissão |
| `{empresaRazaoSocial}` | Razão social da Outmat | `config.razaoSocial` |
| `{empresaCnpj}` | CNPJ da Outmat | `config.cnpj` |
| `{empresaIe}` | Inscrição Estadual | `config.inscricaoEstadual` |
| `{empresaEndereco}` | Endereço completo | campos de `ConfiguracaoSistema` |

**Regra:** todo campo ausente vira string vazia, nunca `undefined` — o docxtemplater
renderiza `undefined` literalmente no documento.

**Nota sobre `{valorTotal}` (crítico).** O projeto tem dois calculadores que
**divergem** (`src/features/propostas/totais.ts`):

- `calcularTotais` → desconto incide **só sobre a Automação**
- `calcularResumoFinanceiro` → desconto incide sobre o **Total combinado**
  (Automação + Som + Wi-Fi)

O contrato usa **`calcularResumoFinanceiro().totalGeral`** — a mesma fonte que o
Anexo Contratual (`dto.resumo.totalGeral`). Isso é obrigatório: contrato e anexo
citam o mesmo negócio e não podem divergir em centavos. Um teste do mapper trava
essa escolha.

**Nota sobre `{dataExtenso}`.** A cidade vem de `config.cidade`; a data é a de
emissão da proposta (`proposta.emitidaAt`), não `new Date()` — reemitir o contrato
de uma proposta antiga deve reproduzir a data original.

### D6 — Refatoração do loader (sem mudança de comportamento)

O contrato precisa de dados que o `PropostaPdfDTO` descarta:

- **CONTRATADA:** `ConfiguracaoSistema` tem `razaoSocial`, `cnpj`,
  `inscricaoEstadual` e endereço completo, mas `PdfEmpresa` só expõe
  nome/site/telefone/email/logo/cores/textoFinal.
- **Endereço do cliente:** o mapper dos PDFs achata tudo com `·`
  (`"Rua X, 123 · Centro · Curitiba/PR"`), inadequado para qualificação das partes.

Como a sprint proíbe alterar os PDFs existentes, o DTO **não** é inchado. Em vez
disso, extrai-se o fetch cru para `carregarPropostaEConfig()`, consumido tanto por
`getPropostaPdfData` (comportamento idêntico) quanto pelo novo
`getContratoDocxData`. Evita duplicar a query do Prisma.

## Arquitetura

```
GET /propostas/[id]/contrato
  → getContratoDocxData(id)        IO: Prisma + Configuração
  → montarContratoTags(p, config)  puro → Record<string,string>
  → renderContratoDocx(tags)       docxtemplater + template oficial
  → Response .docx (attachment)
```

### Arquivos

**Novos:**

| Arquivo | Responsabilidade |
|---|---|
| `public/templates/contrato/contrato-outmat.docx` | Template oficial marcado (fornecido) |
| `src/app/propostas/[id]/contrato/route.ts` | Route handler (espelha `contratual/route.ts`) |
| `src/services/contrato-docx.mapper.ts` | `montarContratoTags` — puro, testável |
| `src/services/contrato-docx.mapper.test.ts` | Testes do mapper |
| `src/features/propostas/docx/render.ts` | `renderContratoDocx` — docxtemplater |
| `src/features/propostas/docx/extenso.ts` | Wrapper de `valorPorExtenso` |

**Alterados:**

| Arquivo | Mudança |
|---|---|
| `src/features/propostas/proposta-workspace.tsx` | Rótulo → "Emitir Anexo Contratual"; botão "Emitir Contrato" novo |
| `src/features/propostas/pdf/filename.ts` | Generalizar extensão e `Content-Disposition` |
| `src/services/proposta-pdf.service.ts` | Extrair `carregarPropostaEConfig` |
| `package.json` | + `docxtemplater`, `pizzip`, `extenso` |
| `DECISIONS.md` | + ADR-0330 |

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

- `montarContratoTags`: PF vs PJ (documento/label/RG-IE), campos ausentes → string
  vazia (nunca `undefined`), endereço montado, forma de pagamento vazia.
- **`{valorTotal}` == `resumo.totalGeral`** com desconto + frete presentes — trava a
  escolha do calculador (D5) e garante que contrato e Anexo não divirjam.
- `{dataExtenso}` usa `emitidaAt`, não a data corrente.
- `valorPorExtenso`: inteiro, com centavos, zero, valores de cem/cento.
- `filename.ts`: **os três nomes de PDF atuais não mudaram** (regressão da
  generalização); contrato gera `.docx` com `attachment`.

Teste manual: gerar contrato de proposta PF e PJ, abrir no Word, conferir que a
formatação do template está intacta e todos os campos preenchidos.

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
- [ ] Template do contrato preservado (verificado no Word)
- [ ] Campos variáveis preenchidos automaticamente
- [ ] Nomes de download dos 3 PDFs existentes inalterados
- [ ] Build sem erros
- [ ] TypeScript sem erros
- [ ] ESLint zerado

## Fora do escopo

- Assinatura eletrônica e controle de assinatura
- Geração automática do Pedido
- Alterações na Ordem de Serviço
- Alterações nos PDFs existentes, no fluxo das propostas ou no cálculo de valores

## Dependência externa (bloqueante)

O `.docx` oficial da Outmat, marcado com as tags de D5, precisa estar em
`public/templates/contrato/contrato-outmat.docx` antes da implementação do renderer.
Sem ele, o mapper e os testes podem avançar, mas o render e o teste manual não.
