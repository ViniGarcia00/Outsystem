# Sprint 2.7 — Documento Comercial (PDF) da Proposta

> Spec aprovada (arquitetura + refinamentos de layout). Base para a implementação.

## Objetivo

Gerar o **documento comercial oficial** da Outmat a partir da proposta — pronto
para envio ao cliente, com aparência **premium** (não uma impressão de tela).

## Decisões travadas

| Tema | Decisão |
|---|---|
| Biblioteca | `@react-pdf/renderer` (puro JS/WASM, sem Chromium — ideal Windows Server 2019) |
| Endereço da obra | Reusa o endereço do **Cliente** (sem migração) |
| Geração | **Sob demanda** via Route Handler, sem armazenar arquivo |
| Tipografia | Fonte **Inter** (TTF em `public/fonts/`, pesos 400/500/600/700) |
| Branding | Cores da **Config** (`corPrimaria`/`corSecundaria`) como acento, com fallback |

## Princípio

Reutilizar **dados e regras** (`totais.ts`, `formatCurrency`/`formatDate`, DTOs,
regras da Simplificada). **Não** reutilizar componentes de tela (shadcn). O PDF
tem sua própria biblioteca de blocos.

## Arquitetura

```
src/services/proposta-pdf.service.ts     # getPropostaPdfData(id): PropostaPdfDTO (reuso de totais.ts)
src/features/propostas/pdf/
  proposta-pdf-document.tsx              # <Document><Page> — composição
  theme.ts                               # tokens: cores (Config), espaçamentos, margens A4, fontFamily
  fonts.ts                               # Font.register (Inter, public/fonts) — idempotente
  format.ts                              # helpers de exibição do PDF (reuso de utils)
  blocks/
    pdf-cabecalho.tsx                    # logo + "PROPOSTA COMERCIAL" + nº + data (fixed; compacto após pág.1)
    pdf-cliente.tsx                      # bloco elegante (não-tabela): nome/telefone/e-mail/endereço + validade
    pdf-conteudo-tabela.tsx              # seções → tabela; cabeçalho fixed; Descrição dominante, Código discreto
    pdf-rodape-financeiro.tsx            # Total Produtos/Serviços/Subtotal/Desconto/Frete + TOTAL destacado
    pdf-informacoes-comerciais.tsx       # bloco 1: forma de pagamento + previsão (Completa)
    pdf-observacoes.tsx                  # bloco 2: obs comerciais + obs técnicas
    pdf-assinaturas.tsx                  # Cliente + Consultor Responsável (linhas para assinatura física)
    pdf-rodape-documento.tsx             # fixed: site/telefone/e-mail + "Página X de Y"
  primitives/                            # pdf-rule, pdf-secao-titulo, pdf-linha-total, pdf-label-valor
src/app/propostas/[id]/pdf/route.ts      # GET → renderToBuffer → application/pdf (runtime nodejs, force-dynamic)
```

`PropostaPdfDTO` é o **contrato estável** entre dados e apresentação; blocos são
funções puras (props → PDF), sem acesso a banco.

## Refinamentos de layout (aprovados)

1. **Cabeçalho limpo:** apenas Logo + "PROPOSTA COMERCIAL" + Nº + Data. Sem
   CNPJ/endereço/telefone no topo (vão para o rodapé).
2. **Cliente:** bloco elegante (NÃO tabela) — Nome, Telefone, E-mail, Endereço,
   com hierarquia visual; Validade em destaque.
3. **Tabela:** **Descrição** ocupa a maior largura; **Código** discreto (só
   referência). Completa: Código·Descrição·Qtd·UN·V.Produto·V.Serviço·Total.
   Simplificada: Código·Descrição·Qtd·UN·Valor Unitário·Total (sem serviço).
4. **Rodapé financeiro:** **TOTAL DA PROPOSTA** é o elemento de maior destaque
   (faixa/realce + valor grande). Ordem: Total Produtos → Total Serviços (só
   Completa) → Subtotal → Desconto → Frete → TOTAL.
5. **Informações Comerciais** e **Observações** em **dois blocos separados**.
6. **Assinaturas:** duas áreas (Cliente / Consultor Responsável) com linha para
   assinatura física. Sem assinatura digital.
7. **Rodapé do documento:** dados institucionais (site/telefone/e-mail) +
   "Página X de Y".
8. **Evolução futura** (só arquitetura, não implementar): fotos de produtos,
   novos templates, Projeto de Som/Wi-Fi entram como **blocos** plugáveis na
   mesma composição, sem reescrever o documento.

## Regras respeitadas (Simplificada)

Oculta **Valor Serviço**, **Total Serviços** e **Previsão de Instalação**.
Completa exibe tudo. Regras vindas do helper/serviço — sem duplicação.

## Paginação e impressão

- `<Page size="A4">`, margens ~40pt, faixas de topo/rodapé reservadas via
  padding para não colidir com elementos `fixed`.
- Cabeçalho do documento e **cabeçalho da tabela** repetidos por página.
- `wrap={false}` em linhas de item e nos blocos que não podem quebrar
  (financeiro, assinaturas); `minPresenceAhead` para evitar títulos órfãos.
- "Página X de Y" via `render={({pageNumber,totalPages})}`.
- **Validação obrigatória:** testar proposta com muitas linhas (repetição de
  cabeçalho, quebras, totais, observações, assinaturas). Se `fixed` causar
  sobreposição/paginação instável, migrar para a abordagem mais robusta da
  biblioteca. Estabilidade em propostas pequenas e grandes.

## Fluxo de geração

`GET /propostas/[id]/pdf` → `getPropostaPdfData(id)` → `renderToBuffer(<Document/>)`
→ `application/pdf` inline. Botão no workspace abre o PDF (nova aba). Emissão
(`emitirProposta`) permanece separada; o PDF renderiza a `currentRevision` (para
EMITIDA = revisão congelada).

## Riscos / atenção

- Resolução do caminho da fonte em `next start` (usar `process.cwd()/public/fonts`).
- Quebra de blocos entre páginas (mitigado por `wrap`/`minPresenceAhead`).
- Config incompleta (sem logo/cores) → fallback textual/monocromático.
- Runtime `nodejs` obrigatório para @react-pdf.

## Teste

- Unitário: `getPropostaPdfData` confere totais (via `totais.ts`) e campos do DTO.
- Smoke: `GET /propostas/[id]/pdf` → 200 + `application/pdf` + corpo não-vazio.
