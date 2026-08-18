# Sprint 3.1 (b) — Documentação Contratual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

> ## Auditoria pós-implementação (Release 1.1.0 — 2026-08-18)
>
> Os checkboxes foram auditados **item a item** contra código, commits e testes.
> Marcado `[x]` só onde há evidência concreta. **A implementação divergiu deste
> plano em nomenclatura** — o plano ficou como foi escrito; as divergências estão
> anotadas abaixo e junto de cada passo afetado.
>
> | O plano previa | O que foi entregue |
> |---|---|
> | `docx/contrato-tags.ts` | `docx/contrato.mapper.ts` |
> | `montarContratoTags()` | `montarContratoTemplateDTO()` |
> | `interface ContratoTags` | `interface ContratoTemplateDTO` |
> | testes de render dentro de `template.test.ts` | arquivo separado `render.test.ts` |
> | `nomeArquivoDocumento(tipo, dto)` + `type TipoDocumento` | `nomeArquivoContrato(dto)`, sem `TipoDocumento` |
> | Task 6 sem testes | `route.test.ts` com 11 testes (**entregue a mais**) |
> | `src/types/extenso.d.ts` (condicional) | não foi necessário |
>
> **Entregue fora do plano:** o tratamento do **realce amarelo** dos campos
> automáticos (`1a6e6c8`), achado na homologação visual — nova invariante no
> script de marcação e 8 testes em `template.test.ts`.
>
> **Suíte ao final da auditoria:** 105 testes, 10 arquivos, todos verdes.
>
> **Convenção usada aqui:** passos "rodar o teste para verificar que **falha**"
> ficam `[ ]` — a fase vermelha do TDD não deixa artefato no repositório e marcá-los
> seria inferência. Isso **não** significa que o passo foi pulado.
>
> **Nota de nomenclatura:** o título ganhou o sufixo "(b)" para distinguir do ciclo
> homônimo do PDF Apresentação (ADR-0301). Este plano é o da Documentação
> Contratual, ADR-0330.

**Goal:** Gerar o Contrato em .docx a partir do template oficial da Outmat e renomear o PDF Contratual existente para "Anexo Contratual", encerrando o módulo Comercial.

**Architecture:** O template oficial é marcado **uma única vez** por um script (`[PLACEHOLDER]` → `{tag}`), de forma **seletiva** — placeholders ambíguos ficam literais para preenchimento manual no Word. Em runtime, a rota reusa o loader já existente (`getPropostaPdfData`), converte o `PropostaPdfDTO` em tags (função pura) e o docxtemplater preenche o template. Os PDFs existentes não são tocados.

**Tech Stack:** Next.js 16.2.10 (Route Handlers), TypeScript, Vitest 4, docxtemplater 3 + pizzip 3, extenso 2.

**Spec:** `docs/superpowers/specs/2026-07-17-sprint3-1-documentacao-contratual-design.md` (commit `f2b0e79`)

## Global Constraints

- **Proibido alterar** fonte, margens, cabeçalho, rodapé, espaçamentos, numeração, estilos ou estrutura do template. O sistema só substitui placeholders.
- **Proibido alterar** os PDFs existentes, o fluxo das propostas e o cálculo de valores. `proposta-pdf.service.ts`, `proposta-pdf.mapper.ts` e os documentos react-pdf **não são tocados**.
- **Fonte oficial do valor:** `calcularResumoFinanceiro().totalGeral`, consumido via `dto.resumo.totalGeral`. Nenhum outro cálculo é permitido. Contrato e Anexo Contratual devem apresentar valor idêntico.
- **Marcação seletiva (D3.1):** `[Nº]` aparece 5× com 5 significados. **Apenas** o do Anexo II (precedido por `"Proposta Comercial nº "`) vira tag. Os outros 4 (prazos 3.1 ×2, aceite 5.5, multa 9.2), mais `[VALOR]` e `[se houver]`, **permanecem literais**.
- **Nunca emitir `undefined`** num documento jurídico: todo campo ausente vira string vazia. Exceção: `{formaPagamento}` (fallback = bloco de instrução do template).
- Testes são colocados junto ao código (`*.test.ts`), rodados por `npm test` (Vitest). Alias `@/*` → `src/*`.
- Ao final: `npm run build`, `npm run typecheck` e `npm run lint` sem erros.

---

## File Structure

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `scripts/marcar-template-contrato.mjs` | Marcação seletiva do template (uso único, versionado para auditoria) |
| `public/templates/contrato/contrato-outmat.docx` | Template marcado (saída do script, commitado) |
| `src/features/propostas/docx/extenso.ts` | `valorPorExtenso` |
| `src/features/propostas/docx/extenso.test.ts` | Testes |
| `src/features/propostas/docx/contrato-tags.ts` | `montarContratoTags(dto)` — puro |
| `src/features/propostas/docx/contrato-tags.test.ts` | Testes |
| `src/features/propostas/docx/render.ts` | `renderContratoDocx(tags)` |
| `src/features/propostas/docx/template.test.ts` | Integridade do template marcado (CI) |
| `src/features/propostas/pdf/filename.test.ts` | Regressão dos nomes de download |
| `src/app/propostas/[id]/contrato/route.ts` | Route handler |

**Modificar:**

| Arquivo | Mudança |
|---|---|
| `src/features/propostas/pdf/filename.ts` | Generalizar extensão + `Content-Disposition` |
| `src/features/propostas/proposta-workspace.tsx` | Rótulos e botão novo |
| `package.json` | + docxtemplater, pizzip, extenso |
| `DECISIONS.md` | + ADR-0330 |

**Renomear:** `public/templates/contrato/contrato-outmat.docx.docx` → `contrato-outmat.oficial.docx` — some a extensão dupla e o oficial fica versionado como entrada do script (fonte da verdade, permite reexecutar e auditar a marcação).

---

## Task 1: Preparação do template (marcação seletiva)

Converte o template oficial em template marcado. **Roda uma vez**; a saída é commitada. O script fica versionado para auditoria e para o dia em que o jurídico enviar um template novo.

**Files:**
- Rename: `public/templates/contrato/contrato-outmat.docx.docx` → `contrato-outmat.oficial.docx` (entrada, commitada)
- Create: `scripts/marcar-template-contrato.mjs`
- Create: `public/templates/contrato/contrato-outmat.docx` (saída do script, commitada)
- Create: `src/features/propostas/docx/template.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada.
- Produces: `public/templates/contrato/contrato-outmat.docx` contendo exatamente as tags `{clienteNome}`, `{clienteDocumento}`, `{clienteEndereco}`, `{propostaNumero}`, `{valorTotal}`, `{valorTotalExtenso}`, `{formaPagamento}`, `{data}`, `{empresaNome}` — e mantendo literais 4× `[Nº]`, 1× `[VALOR]`, 1× `[se houver]`.

- [x] **Step 1: Instalar dependências e renomear a entrada**

```bash
npm i docxtemplater@^3.69.0 pizzip@^3.2.0 extenso@^2.1.0
mv public/templates/contrato/contrato-outmat.docx.docx public/templates/contrato/contrato-outmat.oficial.docx
```

O oficial vira `.oficial.docx` (entrada do script, fonte da verdade) e o marcado ocupa o nome `contrato-outmat.docx` (lido em runtime). Assim a extensão dupla some e a marcação continua reproduzível.

- [x] **Step 2: Escrever o script de marcação**

Criar `scripts/marcar-template-contrato.mjs`:

```js
/**
 * Marcação SELETIVA do template oficial do contrato (Sprint 3.1).
 *
 * Entrada:  public/templates/contrato/contrato-outmat.oficial.docx  (oficial, [PLACEHOLDERS])
 * Saída:    public/templates/contrato/contrato-outmat.docx         (marcado, {tags})
 *
 * Uso único — a saída é commitada. Reexecutar só se o jurídico enviar um
 * template novo.
 *
 * REGRA CRÍTICA (spec D3.1): `[Nº]` aparece 5× com 5 significados diferentes
 * (prazo de início, prazo de conclusão, prazo de aceite, multa %, nº da
 * proposta). Só o do Anexo II — precedido por "Proposta Comercial nº " — é
 * automático. Marcar todos com delimitadores `[ ]` produziria "multa de 1042%".
 *
 * SEGURANÇA: só o texto dentro de <w:t> é tocado. O script aborta se qualquer
 * outra parte do XML mudar, ou se as contagens divergirem do esperado.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";

const DIR = path.join(process.cwd(), "public", "templates", "contrato");
const ENTRADA = path.join(DIR, "contrato-outmat.oficial.docx");
const SAIDA = path.join(DIR, "contrato-outmat.docx");

/** Placeholders únicos → tag. [texto exato no template, tag, ocorrências esperadas] */
const SIMPLES = [
  ["[NOME COMPLETO DO CLIENTE]", "{clienteNome}", 1],
  ["[CPF/CNPJ]", "{clienteDocumento}", 1],
  ["[ENDEREÇO DO CLIENTE]", "{clienteEndereco}", 1],
  ["[Nº DA PROPOSTA]", "{propostaNumero}", 1],
  ["[VALOR TOTAL]", "{valorTotal}", 1],
  ["[VALOR POR EXTENSO]", "{valorTotalExtenso}", 1],
  ["[DATA]", "{data}", 2],
  ["[OUTMAT]", "{empresaNome}", 1],
  ["[NOME DO CLIENTE]", "{clienteNome}", 1],
];

/** Remove o texto de dentro dos <w:t>, deixando só a estrutura do XML. */
const soEstrutura = (s) => s.replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/g, "$1$3");
const conta = (s, sub) => s.split(sub).length - 1;

const zip = new PizZip(readFileSync(ENTRADA));
const antes = zip.file("word/document.xml").asText();
let xml = antes;

// Pré-condições: o template é o que esperamos.
if (conta(xml, "[Nº]") !== 5) {
  throw new Error(`Esperava 5 "[Nº]", achei ${conta(xml, "[Nº]")}. Template mudou?`);
}
for (const [ph, , n] of SIMPLES) {
  if (conta(xml, ph) !== n) {
    throw new Error(`Esperava ${n}× "${ph}", achei ${conta(xml, ph)}.`);
  }
}

// 1) Substitui SOMENTE dentro de <w:t>. Nunca toca em formatação.
xml = xml.replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/g, (_m, open, txt, close) => {
  let t = txt;
  for (const [ph, tag] of SIMPLES) t = t.split(ph).join(tag);
  // O bloco de instrução da forma de pagamento (cláusula 2.2) é longo e
  // variável; casa pelo prefixo e é trocado por inteiro.
  if (t.startsWith("[DESCREVA AQUI A FORMA DE PAGAMENTO")) t = "{formaPagamento}";
  return open + t + close;
});

// 2) O ÚNICO [Nº] automático: o do Anexo II, precedido por "Proposta Comercial nº ".
//    Sem flag /g — substitui só a primeira ocorrência que casar. A da cláusula
//    1.2 já virou {propostaNumero} no passo 1, então não casa aqui.
const antesNumero = xml;
xml = xml.replace(
  /(Proposta Comercial nº\s*<\/w:t>[\s\S]{0,200}?<w:t[^>]*>)\[Nº\]/,
  "$1{propostaNumero}",
);
if (xml === antesNumero) throw new Error("Não achei o [Nº] do Anexo II.");

// Pós-condições.
if (conta(xml, "[Nº]") !== 4) {
  throw new Error(`Deviam sobrar 4 "[Nº]" manuais, sobraram ${conta(xml, "[Nº]")}.`);
}
if (conta(xml, "[VALOR]") !== 1) throw new Error("[VALOR] do Anexo II sumiu.");
if (conta(xml, "[se houver]") !== 1) throw new Error("[se houver] sumiu.");
if (conta(xml, "{formaPagamento}") !== 1) throw new Error("{formaPagamento} não foi marcado.");
if (soEstrutura(antes) !== soEstrutura(xml)) {
  throw new Error("O XML mudou fora de <w:t> — formatação em risco. Abortado.");
}

zip.file("word/document.xml", xml);
writeFileSync(SAIDA, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));

console.log("Template marcado:", SAIDA);
console.log("  4× [Nº] manuais, [VALOR] e [se houver] preservados literais");
console.log("  XML fora de <w:t>: idêntico");
```

- [x] **Step 3: Rodar o script**

```bash
node scripts/marcar-template-contrato.mjs
```

Esperado:
```
Template marcado: ...\public\templates\contrato\contrato-outmat.docx
  4× [Nº] manuais, [VALOR] e [se houver] preservados literais
  XML fora de <w:t>: idêntico
```

Se lançar erro, **pare** — o template mudou e o mapeamento precisa ser revisto. Não contorne o erro.

- [x] **Step 4: Escrever o teste de integridade do template**

Este teste roda no CI e protege contra o bug "multa de 1042%" caso alguém regenere o template.

Criar `src/features/propostas/docx/template.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";

import PizZip from "pizzip";
import { describe, expect, it } from "vitest";

/**
 * Integridade do template marcado (Sprint 3.1). Protege a regra D3.1: só o
 * `[Nº]` do Anexo II é automático; os outros 4 são preenchidos à mão no Word.
 */

const CAMINHO = path.join(
  process.cwd(),
  "public",
  "templates",
  "contrato",
  "contrato-outmat.docx",
);

function documentXml(): string {
  return new PizZip(readFileSync(CAMINHO)).file("word/document.xml").asText();
}

const conta = (s: string, sub: string) => s.split(sub).length - 1;

describe("template do contrato", () => {
  const TAGS = [
    "{clienteNome}",
    "{clienteDocumento}",
    "{clienteEndereco}",
    "{propostaNumero}",
    "{valorTotal}",
    "{valorTotalExtenso}",
    "{formaPagamento}",
    "{data}",
    "{empresaNome}",
  ];

  it.each(TAGS)("contém a tag %s", (tag) => {
    expect(documentXml()).toContain(tag);
  });

  it("mantém os 4 [Nº] manuais literais (prazos, aceite e multa)", () => {
    expect(conta(documentXml(), "[Nº]")).toBe(4);
  });

  it("mantém [VALOR] (parcela final do Anexo II) literal", () => {
    expect(conta(documentXml(), "[VALOR]")).toBe(1);
  });

  it("mantém [se houver] (observações) literal", () => {
    expect(conta(documentXml(), "[se houver]")).toBe(1);
  });

  it("não deixou placeholder de cliente/valor por marcar", () => {
    const xml = documentXml();
    expect(xml).not.toContain("[NOME COMPLETO DO CLIENTE]");
    expect(xml).not.toContain("[VALOR TOTAL]");
    expect(xml).not.toContain("[DATA]");
  });
});
```

- [x] **Step 5: Rodar o teste**

```bash
npm test -- src/features/propostas/docx/template.test.ts
```

Esperado: PASS (13 testes).

> **Auditoria:** hoje são **21 testes** neste arquivo — os 13 previstos mais 8 do
> tratamento do realce, acrescentados em `1a6e6c8`.

- [x] **Step 6: Remover o template de entrada e commitar**

> **Auditoria:** o **título deste passo contradiz o próprio corpo** — o título diz
> "remover o template de entrada", o corpo manda commitar os dois. A implementação
> seguiu o corpo: `contrato-outmat.oficial.docx` e `contrato-outmat.docx` estão
> ambos versionados, o que é o correto (sem a entrada, a marcação não é
> reproduzível nem auditável). Passo cumprido; o título é que está errado.

Commitar **os dois**: o oficial (entrada, fonte da verdade) e o marcado (usado em
runtime). Versionar a entrada é o que torna o script reexecutável e auditável — sem
ela, ninguém consegue reproduzir ou conferir a marcação depois.

```bash
git add scripts/marcar-template-contrato.mjs \
        public/templates/contrato/contrato-outmat.oficial.docx \
        public/templates/contrato/contrato-outmat.docx \
        src/features/propostas/docx/template.test.ts \
        package.json package-lock.json
git commit -m "feat(contrato): marca template oficial com tags (marcação seletiva)"
```

---

## Task 2: Valor por extenso

**Files:**
- Create: `src/features/propostas/docx/extenso.ts`
- Create: `src/features/propostas/docx/extenso.test.ts`

**Interfaces:**
- Consumes: pacote `extenso`.
- Produces: `valorPorExtenso(valor: number): string` — sem "R$", sem parênteses (o template já os fornece).

- [x] **Step 1: Escrever o teste falhando**

Criar `src/features/propostas/docx/extenso.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { valorPorExtenso } from "./extenso";

describe("valorPorExtenso", () => {
  it("converte valor com centavos", () => {
    expect(valorPorExtenso(12345.67)).toBe(
      "doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos",
    );
  });

  it("converte valor inteiro", () => {
    expect(valorPorExtenso(1000)).toBe("mil reais");
  });

  it("trata o caso cem/cento", () => {
    expect(valorPorExtenso(100)).toBe("cem reais");
  });

  it("arredonda para 2 casas antes de converter", () => {
    expect(valorPorExtenso(12345.6789)).toBe(
      "doze mil trezentos e quarenta e cinco reais e sessenta e oito centavos",
    );
  });

  it("devolve string vazia para valores inválidos", () => {
    expect(valorPorExtenso(Number.NaN)).toBe("");
    expect(valorPorExtenso(Number.POSITIVE_INFINITY)).toBe("");
  });
});
```

- [ ] **Step 2: Rodar o teste para verificar que falha**
      <br>*Auditoria: não verificável retroativamente — a fase vermelha do TDD não
      deixa artefato no repositório. Desmarcado por rigor, não por omissão.*

```bash
npm test -- src/features/propostas/docx/extenso.test.ts
```

Esperado: FAIL — `Failed to resolve import "./extenso"`.

- [x] **Step 3: Implementar**

Criar `src/features/propostas/docx/extenso.ts`:

```ts
import extenso from "extenso";

/**
 * Valor monetário por extenso para o contrato (Sprint 3.1).
 *
 * Devolve só o texto — sem "R$" e sem parênteses: a cláusula 2.1 do template já
 * traz "o valor total de R$ {valorTotal} ({valorTotalExtenso})".
 *
 * O valor é fixado em 2 casas antes da conversão para evitar que a
 * representação binária do float vire centavos errados.
 */
export function valorPorExtenso(valor: number): string {
  if (!Number.isFinite(valor)) return "";
  const comVirgula = valor.toFixed(2).replace(".", ",");
  return extenso(comVirgula, { mode: "currency" });
}
```

- [x] **Step 4: Rodar o teste para verificar que passa**

```bash
npm test -- src/features/propostas/docx/extenso.test.ts
```

Esperado: PASS (5 testes).

Se o TypeScript reclamar que `extenso` não tem tipos, criar `src/types/extenso.d.ts`:

```ts
declare module "extenso" {
  interface ExtensoOptions {
    mode?: "number" | "currency";
    number?: { gender?: "m" | "f"; scale?: "short" | "long" };
    locale?: "br" | "pt";
  }
  export default function extenso(value: string | number, options?: ExtensoOptions): string;
}
```

- [x] **Step 5: Commit**

```bash
git add src/features/propostas/docx/extenso.ts src/features/propostas/docx/extenso.test.ts src/types/extenso.d.ts
git commit -m "feat(contrato): valor por extenso"
```

---

## Task 3: Mapper de tags

O coração da sprint. Função pura `PropostaPdfDTO` → tags.

**Files:**
- Create: `src/features/propostas/docx/contrato-tags.ts`
- Create: `src/features/propostas/docx/contrato-tags.test.ts`

**Interfaces:**
- Consumes: `PropostaPdfDTO` de `@/services/proposta-pdf.mapper`; `valorPorExtenso` da Task 2.
- Produces:
  - `interface ContratoTags` com as 9 chaves string.
  - `montarContratoTags(dto: PropostaPdfDTO): ContratoTags`
  - `const INSTRUCAO_FORMA_PAGAMENTO: string` (fallback da cláusula 2.2).

- [x] **Step 1: Escrever o teste falhando**

Criar `src/features/propostas/docx/contrato-tags.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { INSTRUCAO_FORMA_PAGAMENTO, montarContratoTags } from "./contrato-tags";

/**
 * DTO mínimo — só os campos que o contrato lê. O resto do PropostaPdfDTO é
 * irrelevante aqui, daí o cast: montar o DTO inteiro só ruído ao teste.
 */
function dto(over: Record<string, unknown> = {}): PropostaPdfDTO {
  return {
    numero: 1042,
    nomeProjeto: null,
    revisao: 2,
    data: new Date("2026-07-17T12:00:00Z"),
    validadeDias: 5,
    simplificada: false,
    empresa: { nome: "Outmat" },
    cliente: {
      tipoPessoa: "PJ",
      nome: "ACME COMÉRCIO LTDA",
      documento: "12.345.678/0001-90",
      endereco: "Rua X, 123 · Sala 2 · Centro · Curitiba/PR · CEP 80000-000",
    },
    resumo: { totalGeral: 12345.67 },
    formaPagamento: "50% de entrada, 50% na conclusão",
    ...over,
  } as unknown as PropostaPdfDTO;
}

describe("montarContratoTags", () => {
  it("preenche a qualificação de PJ", () => {
    const t = montarContratoTags(dto());
    expect(t.clienteNome).toBe("ACME COMÉRCIO LTDA");
    expect(t.clienteDocumento).toBe("12.345.678/0001-90");
  });

  it("preenche a qualificação de PF", () => {
    const t = montarContratoTags(
      dto({
        cliente: {
          tipoPessoa: "PF",
          nome: "João da Silva",
          documento: "123.456.789-00",
          endereco: "Rua Y, 9 · Centro · Curitiba/PR",
        },
      }),
    );
    expect(t.clienteNome).toBe("João da Silva");
    expect(t.clienteDocumento).toBe("123.456.789-00");
  });

  it("troca o separador · do endereço por vírgula", () => {
    expect(montarContratoTags(dto()).clienteEndereco).toBe(
      "Rua X, 123, Sala 2, Centro, Curitiba/PR, CEP 80000-000",
    );
  });

  it("usa resumo.totalGeral como valor oficial, sem R$", () => {
    const t = montarContratoTags(dto());
    expect(t.valorTotal).toBe("12.345,67");
    expect(t.valorTotal).not.toContain("R$");
  });

  it("gera o extenso sem parênteses (o template já os tem)", () => {
    const t = montarContratoTags(dto());
    expect(t.valorTotalExtenso).toBe(
      "doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos",
    );
    expect(t.valorTotalExtenso).not.toContain("(");
  });

  it("formata a data por extenso, sem cidade e no fuso de São Paulo", () => {
    expect(montarContratoTags(dto()).data).toBe("17 de julho de 2026");
    // Sem timeZone fixo, 02:00 UTC viraria "16 de julho".
    expect(
      montarContratoTags(dto({ data: new Date("2026-07-17T02:00:00Z") })).data,
    ).toBe("17 de julho de 2026");
  });

  it("mantém a instrução do template quando a forma de pagamento está vazia", () => {
    expect(montarContratoTags(dto({ formaPagamento: null })).formaPagamento).toBe(
      INSTRUCAO_FORMA_PAGAMENTO,
    );
    expect(montarContratoTags(dto({ formaPagamento: "   " })).formaPagamento).toBe(
      INSTRUCAO_FORMA_PAGAMENTO,
    );
  });

  it("usa a forma de pagamento da proposta quando preenchida", () => {
    expect(montarContratoTags(dto()).formaPagamento).toBe(
      "50% de entrada, 50% na conclusão",
    );
  });

  it("nunca devolve undefined — campos ausentes viram string vazia", () => {
    const t = montarContratoTags(
      dto({
        cliente: { tipoPessoa: "PF", nome: "", documento: null, endereco: null },
        empresa: { nome: "" },
      }),
    );
    for (const [chave, valor] of Object.entries(t)) {
      expect(valor, `${chave} não pode ser undefined`).toBeTypeOf("string");
    }
    expect(t.clienteDocumento).toBe("");
    expect(t.clienteEndereco).toBe("");
  });
});
```

- [ ] **Step 2: Rodar o teste para verificar que falha**
      <br>*Auditoria: não verificável retroativamente — a fase vermelha do TDD não
      deixa artefato no repositório. Desmarcado por rigor, não por omissão.*

```bash
npm test -- src/features/propostas/docx/contrato-tags.test.ts
```

Esperado: FAIL — `Failed to resolve import "./contrato-tags"`.

- [x] **Step 3: Implementar**

Criar `src/features/propostas/docx/contrato-tags.ts`:

```ts
import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { valorPorExtenso } from "./extenso";

/**
 * Tags do contrato (.docx) — Sprint 3.1. Função pura: DTO → texto do template.
 *
 * O template oficial é a autoridade. Cada campo aqui corresponde a um
 * placeholder marcado por `scripts/marcar-template-contrato.mjs`.
 *
 * REGRA: nenhum valor pode ser `undefined` — o docxtemplater escreveria
 * "undefined" no contrato. Campos ausentes viram string vazia.
 */
export interface ContratoTags {
  clienteNome: string;
  clienteDocumento: string;
  clienteEndereco: string;
  propostaNumero: string;
  valorTotal: string;
  valorTotalExtenso: string;
  formaPagamento: string;
  data: string;
  empresaNome: string;
}

/**
 * Bloco de instrução da cláusula 2.2 do template oficial. É o fallback quando a
 * proposta não tem forma de pagamento: melhor manter a orientação visível do
 * que enviar um contrato com a cláusula em branco (spec D5.3).
 *
 * Deve ser idêntico ao texto do template — o teste de render confere.
 */
export const INSTRUCAO_FORMA_PAGAMENTO =
  "[DESCREVA AQUI A FORMA DE PAGAMENTO: entrada, número de parcelas, valores, " +
  "datas, meio de pagamento (PIX, cartão de crédito, boleto, transferência) e " +
  "demais condições. Exemplos: 50% de entrada na assinatura e 50% na conclusão " +
  "mediante Termo de Aceite; ou 6x no cartão de crédito como condição para " +
  "iniciar; ou pagamento à vista via PIX na assinatura.]";

/** Valor sem símbolo de moeda: a cláusula 2.1 já traz "R$ " antes da tag. */
const valorFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Data por extenso sem cidade: o fecho já traz "São Caetano do Sul, ". */
const dataFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const texto = (v: string | null | undefined): string => v?.trim() ?? "";

export function montarContratoTags(dto: PropostaPdfDTO): ContratoTags {
  const total = Number.isFinite(dto.resumo.totalGeral) ? dto.resumo.totalGeral : 0;
  const formaPagamento = texto(dto.formaPagamento);

  return {
    clienteNome: texto(dto.cliente.nome),
    clienteDocumento: texto(dto.cliente.documento),
    // O mapper dos PDFs junta o endereço com " · "; num contrato a vírgula é a
    // pontuação esperada na qualificação das partes (spec D6.1).
    clienteEndereco: texto(dto.cliente.endereco).split(" · ").join(", "),
    propostaNumero: String(dto.numero),
    valorTotal: valorFormatter.format(total),
    valorTotalExtenso: valorPorExtenso(total),
    formaPagamento: formaPagamento || INSTRUCAO_FORMA_PAGAMENTO,
    data: dataFormatter.format(dto.data),
    empresaNome: texto(dto.empresa.nome),
  };
}
```

- [x] **Step 4: Rodar o teste para verificar que passa**

```bash
npm test -- src/features/propostas/docx/contrato-tags.test.ts
```

Esperado: PASS (9 testes).

> **Auditoria:** entregue como `contrato.mapper.test.ts` com **13 testes** — os 9
> previstos mais 4 do bloco "fonte oficial do valor (contrato == anexo)", que
> travam a regra do ADR-0330 de que o mapper **não recalcula**, apenas espelha
> `resumo.totalGeral`.

- [x] **Step 5: Commit**

```bash
git add src/features/propostas/docx/contrato-tags.ts src/features/propostas/docx/contrato-tags.test.ts
git commit -m "feat(contrato): mapper de tags do contrato (DTO → template)"
```

> **Auditoria:** commit real `707785c` — *"feat(contrato): ContratoMapper e
> ContratoTemplateDTO"*, com os arquivos sob os nomes finais.

---

## Task 4: Nome de download do .docx

`filename.ts` hoje crava `.pdf` e `inline`. Generaliza sem mudar os nomes existentes.

**Files:**
- Modify: `src/features/propostas/pdf/filename.ts`
- Create: `src/features/propostas/pdf/filename.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type TipoDocumento = "comercial" | "detalhada" | "contratual" | "contrato"`
  - `nomeArquivoDocumento(tipo: TipoDocumento, dto: DadosNome): string` (inclui a extensão certa)
  - `contentDisposition(nome: string, disposicao?: "inline" | "attachment"): string`
  - `nomeArquivoPdf` e `contentDispositionPdf` continuam exportados e com o mesmo comportamento (as 3 rotas de PDF não mudam).

- [x] **Step 1: Escrever o teste falhando**

Criar `src/features/propostas/pdf/filename.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  contentDisposition,
  contentDispositionPdf,
  nomeArquivoDocumento,
  nomeArquivoPdf,
} from "./filename";

const DADOS = { cliente: { nome: "João da Silva" }, numero: 1042, revisao: 2 };

describe("nomes de download (regressão — não podem mudar)", () => {
  it("mantém o nome do PDF Apresentação", () => {
    expect(nomeArquivoPdf("comercial", DADOS)).toBe(
      "OM Proposta Comercial - João 1042 Rev.2.pdf",
    );
  });

  it("mantém o nome do PDF Detalhado", () => {
    expect(nomeArquivoPdf("detalhada", DADOS)).toBe(
      "OM Proposta Detalhada - João 1042 Rev.2.pdf",
    );
  });

  it("mantém o nome do Anexo Contratual", () => {
    expect(nomeArquivoPdf("contratual", DADOS)).toBe(
      "Anexo Contrato - João 1042 Rev.2.pdf",
    );
  });

  it("mantém o Content-Disposition inline dos PDFs", () => {
    expect(contentDispositionPdf("Anexo Contrato - João 1042 Rev.2.pdf")).toContain(
      "inline;",
    );
  });
});

describe("contrato .docx", () => {
  it("usa a extensão .docx", () => {
    expect(nomeArquivoDocumento("contrato", DADOS)).toBe(
      "Contrato - João 1042 Rev.2.docx",
    );
  });

  it("baixa como attachment", () => {
    const cd = contentDisposition("Contrato - João 1042 Rev.2.docx", "attachment");
    expect(cd).toContain("attachment;");
    expect(cd).toContain("filename*=UTF-8''");
  });

  it("usa só o primeiro nome e trata revisão nula", () => {
    expect(
      nomeArquivoDocumento("contrato", {
        cliente: { nome: "Maria Aparecida Souza" },
        numero: 7,
        revisao: null,
      }),
    ).toBe("Contrato - Maria 7 Rev.0.docx");
  });

  it("remove caracteres inválidos no Windows", () => {
    expect(
      nomeArquivoDocumento("contrato", {
        cliente: { nome: 'Jo:ão*?"<>|' },
        numero: 1,
        revisao: 0,
      }),
    ).toBe("Contrato - João 1 Rev.0.docx");
  });
});
```

- [ ] **Step 2: Rodar o teste para verificar que falha**
      <br>*Auditoria: não verificável retroativamente — a fase vermelha do TDD não
      deixa artefato no repositório. Desmarcado por rigor, não por omissão.*

```bash
npm test -- src/features/propostas/pdf/filename.test.ts
```

Esperado: FAIL — `nomeArquivoDocumento` / `contentDisposition` não exportados.

- [x] **Step 3: Implementar**

Substituir o conteúdo de `src/features/propostas/pdf/filename.ts` por:

```ts
/**
 * Nome de download padronizado dos documentos da proposta (Sprint 2.10.3;
 * generalizado para .docx na Sprint 3.1).
 *
 *   PDF Apresentação  → "OM Proposta Comercial - {Primeiro Nome} {Nº} Rev.{Rev}.pdf"
 *   PDF Detalhado     → "OM Proposta Detalhada - {Primeiro Nome} {Nº} Rev.{Rev}.pdf"
 *   Anexo Contratual  → "Anexo Contrato - {Primeiro Nome} {Nº} Rev.{Rev}.pdf"
 *   Contrato          → "Contrato - {Primeiro Nome} {Nº} Rev.{Rev}.docx"
 *
 * Regras: apenas o PRIMEIRO nome do cliente; caracteres inválidos para nomes de
 * arquivo no Windows removidos; sem depender de banco (função pura).
 */

export type TipoPdf = "comercial" | "detalhada" | "contratual";
export type TipoDocumento = TipoPdf | "contrato";

const PREFIXO: Record<TipoDocumento, string> = {
  comercial: "OM Proposta Comercial",
  detalhada: "OM Proposta Detalhada",
  contratual: "Anexo Contrato",
  contrato: "Contrato",
};

/** O contrato é o único documento em Word; os demais são PDF. */
const EXTENSAO: Record<TipoDocumento, string> = {
  comercial: "pdf",
  detalhada: "pdf",
  contratual: "pdf",
  contrato: "docx",
};

/** Caracteres proibidos em nomes de arquivo no Windows (\ / : * ? " < > |) e de
 *  controle. Acentos e espaços internos são mantidos (válidos no Windows). */
const INVALIDOS = /[\\/:*?"<>|\x00-\x1F]/g;

function sanitizar(s: string): string {
  return s.replace(INVALIDOS, "").trim();
}

/** Primeiro nome do cliente, já higienizado; fallback "Cliente" se vazio. */
function primeiroNome(nome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  return sanitizar(primeiro) || "Cliente";
}

type DadosNome = {
  cliente: { nome: string };
  numero: number;
  revisao: number | null;
};

/** Monta o nome do arquivo (com extensão) para o tipo de documento. */
export function nomeArquivoDocumento(tipo: TipoDocumento, dto: DadosNome): string {
  const nome = primeiroNome(dto.cliente.nome);
  const rev = dto.revisao ?? 0;
  return `${PREFIXO[tipo]} - ${nome} ${dto.numero} Rev.${rev}.${EXTENSAO[tipo]}`;
}

/** @deprecated Use `nomeArquivoDocumento`. Mantido para as rotas de PDF. */
export function nomeArquivoPdf(tipo: TipoPdf, dto: DadosNome): string {
  return nomeArquivoDocumento(tipo, dto);
}

/**
 * Valor de `Content-Disposition` para o nome dado. Fornece o `filename` ASCII
 * (fallback) e o `filename*` em UTF-8 (RFC 5987) para preservar acentos.
 *
 * PDFs usam `inline` (abrem na aba). O contrato usa `attachment`: o .docx não
 * renderiza no navegador e o objetivo é abri-lo no Word para editar.
 */
export function contentDisposition(
  nome: string,
  disposicao: "inline" | "attachment" = "inline",
): string {
  const ascii = nome.replace(/[^\x20-\x7E]/g, "").replace(/"/g, "");
  return `${disposicao}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

/** @deprecated Use `contentDisposition`. Mantido para as rotas de PDF. */
export function contentDispositionPdf(nome: string): string {
  return contentDisposition(nome, "inline");
}
```

- [x] **Step 4: Rodar os testes**

```bash
npm test -- src/features/propostas/pdf/filename.test.ts
```

Esperado: PASS (8 testes).

- [x] **Step 5: Verificar que as rotas de PDF continuam compilando**

```bash
npm run typecheck
```

Esperado: sem erros. As 3 rotas de PDF importam `nomeArquivoPdf`/`contentDispositionPdf`, que continuam existindo.

- [x] **Step 6: Commit**

```bash
git add src/features/propostas/pdf/filename.ts src/features/propostas/pdf/filename.test.ts
git commit -m "feat(contrato): generaliza nome de download para .docx/attachment"
```

---

## Task 5: Renderer do .docx

**Files:**
- Create: `src/features/propostas/docx/render.ts`
- Modify: `src/features/propostas/docx/template.test.ts` (acrescenta o teste de render)

**Interfaces:**
- Consumes: `ContratoTags` (Task 3); pacotes `docxtemplater` e `pizzip`.
- Produces: `renderContratoDocx(tags: ContratoTags): Buffer`

- [x] **Step 1: Escrever o teste falhando**

Acrescentar ao final de `src/features/propostas/docx/template.test.ts`.

O `render` é importado dinamicamente (`await import`) de propósito: no Step 2 o
módulo ainda não existe, e um import estático quebraria a coleta do arquivo
inteiro — derrubando também os testes de template da Task 1, que devem continuar
passando.

```ts
import { INSTRUCAO_FORMA_PAGAMENTO } from "./contrato-tags";

describe("fallback da forma de pagamento", () => {
  it("INSTRUCAO_FORMA_PAGAMENTO é idêntica ao texto do template oficial", () => {
    // Se a proposta não tem forma de pagamento, o contrato deve reexibir a
    // instrução ORIGINAL do template (spec D5.3) — não uma paráfrase.
    const oficial = new PizZip(
      readFileSync(path.join(process.cwd(), "public", "templates", "contrato", "contrato-outmat.oficial.docx")),
    )
      .file("word/document.xml")
      .asText();
    const runs = [...oficial.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    const instrucao = runs.find((r) => r.startsWith("[DESCREVA AQUI A FORMA DE PAGAMENTO"));
    expect(instrucao).toBeDefined();
    expect(INSTRUCAO_FORMA_PAGAMENTO).toBe(instrucao);
  });
});

describe("renderContratoDocx", () => {
  const TAGS = {
    clienteNome: "ACME COMÉRCIO LTDA",
    clienteDocumento: "12.345.678/0001-90",
    clienteEndereco: "Rua X, 123, Centro, Curitiba/PR, CEP 80000-000",
    propostaNumero: "1042",
    valorTotal: "12.345,67",
    valorTotalExtenso: "doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos",
    formaPagamento: "50% de entrada\n50% na conclusão",
    data: "17 de julho de 2026",
    empresaNome: "Outmat",
  };

  function textoDe(buffer: Buffer): string {
    const xml = new PizZip(buffer).file("word/document.xml").asText();
    return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
  }

  it("preenche as tags e não deixa 'undefined' no documento", async () => {
    const { renderContratoDocx } = await import("./render");
    const texto = textoDe(renderContratoDocx(TAGS));
    expect(texto).toContain("ACME COMÉRCIO LTDA");
    expect(texto).toContain("12.345.678/0001-90");
    expect(texto).toContain("17 de julho de 2026");
    expect(texto).not.toContain("undefined");
  });

  it("não duplica o R$ da cláusula 2.1", async () => {
    const { renderContratoDocx } = await import("./render");
    const texto = textoDe(renderContratoDocx(TAGS));
    expect(texto).toContain("valor total de R$ 12.345,67");
    expect(texto).not.toContain("R$ R$");
  });

  it("preserva os [Nº] manuais no documento gerado", async () => {
    const { renderContratoDocx } = await import("./render");
    expect(conta(textoDe(renderContratoDocx(TAGS)), "[Nº]")).toBe(4);
  });

  it("não deixa tag por resolver", async () => {
    const { renderContratoDocx } = await import("./render");
    const texto = textoDe(renderContratoDocx(TAGS));
    expect(texto).not.toMatch(/[{}]/);
  });
});
```

- [ ] **Step 2: Rodar o teste para verificar que falha**
      <br>*Auditoria: não verificável retroativamente — a fase vermelha do TDD não
      deixa artefato no repositório. Desmarcado por rigor, não por omissão.*

```bash
npm test -- src/features/propostas/docx/template.test.ts
```

Esperado: FAIL — `Failed to resolve import "./render"`.

- [x] **Step 3: Implementar**

Criar `src/features/propostas/docx/render.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import type { ContratoTags } from "./contrato-tags";

/**
 * Renderiza o Contrato (.docx) preenchendo o template oficial marcado
 * (Sprint 3.1). O template é lido do disco a cada chamada — igual aos PNGs do
 * PDF Apresentação —, então trocar o arquivo basta, sem redeploy de código.
 *
 * Só os placeholders são substituídos: fonte, margens, cabeçalho, rodapé,
 * espaçamentos, numeração e estilos vêm do template e não são tocados.
 */
const TEMPLATE = path.join(
  process.cwd(),
  "public",
  "templates",
  "contrato",
  "contrato-outmat.docx",
);

export function renderContratoDocx(tags: ContratoTags): Buffer {
  const zip = new PizZip(readFileSync(TEMPLATE));

  const doc = new Docxtemplater(zip, {
    // Sem loops no template — o escopo vai no Anexo I (PDF), não no contrato.
    paragraphLoop: false,
    // A forma de pagamento é texto livre e pode ter quebras de linha.
    linebreaks: true,
  });

  doc.render(tags);

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
```

- [x] **Step 4: Rodar os testes**

```bash
npm test -- src/features/propostas/docx/template.test.ts
```

Esperado: PASS (18 testes — 13 da Task 1, 1 do fallback, 4 do render).

> **Auditoria:** os testes de render foram para um arquivo **separado**,
> `render.test.ts` (9 testes: 8 de render + 1 do fallback), e `template.test.ts`
> ficou com 21 (13 de tags/literais + 8 de realce). Total 30, contra os 18
> previstos. A divergência é de organização, não de cobertura.

- [x] **Step 5: Commit**

```bash
git add src/features/propostas/docx/render.ts src/features/propostas/docx/template.test.ts
git commit -m "feat(contrato): renderer do .docx via docxtemplater"
```

---

## Task 6: Route handler

**Files:**
- Create: `src/app/propostas/[id]/contrato/route.ts`

**Interfaces:**
- Consumes: `getPropostaPdfData` de `@/services/proposta-pdf.service`; `montarContratoTags` (Task 3); `renderContratoDocx` (Task 5); `nomeArquivoDocumento`/`contentDisposition` (Task 4).
- Produces: `GET /propostas/[id]/contrato` → 200 com o .docx, ou 404.

- [x] **Step 1: Implementar a rota**

Espelha `src/app/propostas/[id]/contratual/route.ts`. Criar `src/app/propostas/[id]/contrato/route.ts`:

```ts
import {
  contentDisposition,
  nomeArquivoDocumento,
} from "@/features/propostas/pdf/filename";
import { montarContratoTags } from "@/features/propostas/docx/contrato-tags";
import { renderContratoDocx } from "@/features/propostas/docx/render";
import { getPropostaPdfData } from "@/services/proposta-pdf.service";

/**
 * Contrato (.docx) da proposta (Sprint 3.1) — documento jurídico gerado SOB
 * DEMANDA a partir do template oficial da Outmat. Diferente dos PDFs, é
 * EDITÁVEL: o usuário ajusta prazos, multa e cláusulas no Word antes de enviar.
 *
 * Reusa o mesmo loader dos PDFs (`getPropostaPdfData`), então o valor do
 * contrato é `resumo.totalGeral` — idêntico ao do Anexo Contratual.
 *
 * Runtime Node (leitura de arquivo do template) e sem cache.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dto = await getPropostaPdfData(id);
  if (!dto) {
    return new Response("Proposta não encontrada.", { status: 404 });
  }

  const buffer = renderContratoDocx(montarContratoTags(dto));
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE,
      "Content-Disposition": contentDisposition(
        nomeArquivoDocumento("contrato", dto),
        "attachment",
      ),
      "Cache-Control": "no-store",
    },
  });
}
```

- [x] **Step 2: Verificar tipos**

```bash
npm run typecheck
```

Esperado: sem erros.

- [x] **Step 3: Commit**

```bash
git add src/app/propostas/[id]/contrato/route.ts
git commit -m "feat(contrato): rota GET /propostas/[id]/contrato"
```

---

## Task 7: Botões

**Files:**
- Modify: `src/features/propostas/proposta-workspace.tsx` (handlers ~L193-215; botões ~L435-457)

**Interfaces:**
- Consumes: rota da Task 6.
- Produces: nada (folha da árvore).

- [x] **Step 1: Renomear os handlers do contratual e acrescentar o do contrato**

Em `src/features/propostas/proposta-workspace.tsx`, substituir:

```tsx
  // PDF Contratual (anexo ao contrato) — sem preços por item (Sprint 2.10.2).
  const abrirContratual = () => {
    window.open(`/propostas/${data.id}/contratual`, "_blank", "noopener");
  };
```

por:

```tsx
  // Anexo Contratual (Anexo I do contrato) — sem preços por item (Sprint 2.10.2).
  const abrirAnexoContratual = () => {
    window.open(`/propostas/${data.id}/contratual`, "_blank", "noopener");
  };

  // Contrato (.docx) — documento jurídico editável no Word (Sprint 3.1).
  const abrirContrato = () => {
    window.open(`/propostas/${data.id}/contrato`, "_blank", "noopener");
  };
```

- [x] **Step 2: Atualizar os atalhos de emissão**

Substituir:

```tsx
  const gerarContratual = () => emitirEAbrir(abrirContratual);
```

por:

```tsx
  const gerarAnexoContratual = () => emitirEAbrir(abrirAnexoContratual);
  const gerarContrato = () => emitirEAbrir(abrirContrato);
```

Atualizar também o comentário de `emitirEAbrir` logo acima (linha ~198-199):

```tsx
  // Emite a proposta (mesma lógica/método) e abre o documento solicitado.
  // Reutilizado por "PDF Detalhado", "PDF Apresentação", "Emitir Contrato" e
  // "Emitir Anexo Contratual".
```

- [x] **Step 3: Trocar os botões**

Substituir **integralmente** as linhas 435-457 (os dois blocos "Gerar PDF Contratual" / "Abrir PDF Contratual") pelos quatro blocos abaixo.

Este é o texto exato a **remover**:

```tsx
        {data.status === "RASCUNHO" && (
          <Button
            variant="outline"
            onClick={gerarContratual}
            disabled={!podeEmitir || saving}
            title={
              dirty
                ? "Salve as alterações antes de gerar o PDF."
                : podeEmitir
                  ? undefined
                  : "Informe o cliente e adicione ao menos um item para emitir."
            }
          >
            <FileDown className="h-4 w-4" />
            Gerar PDF Contratual
          </Button>
        )}
        {data.status === "EMITIDA" && (
          <Button variant="outline" onClick={abrirContratual}>
            <FileDown className="h-4 w-4" />
            Abrir PDF Contratual
          </Button>
        )}
```

E este é o texto exato a **inserir** no lugar (mesma estrutura, mesmo ícone, mesmas props — muda rótulo, handler e a mensagem do `title`, que agora fala em "documento" por servir a .docx e PDF):

```tsx
        {data.status === "RASCUNHO" && (
          <Button
            variant="outline"
            onClick={gerarContrato}
            disabled={!podeEmitir || saving}
            title={
              dirty
                ? "Salve as alterações antes de emitir o contrato."
                : podeEmitir
                  ? undefined
                  : "Informe o cliente e adicione ao menos um item para emitir."
            }
          >
            <FileDown className="h-4 w-4" />
            Emitir Contrato
          </Button>
        )}
        {data.status === "EMITIDA" && (
          <Button variant="outline" onClick={abrirContrato}>
            <FileDown className="h-4 w-4" />
            Emitir Contrato
          </Button>
        )}
        {data.status === "RASCUNHO" && (
          <Button
            variant="outline"
            onClick={gerarAnexoContratual}
            disabled={!podeEmitir || saving}
            title={
              dirty
                ? "Salve as alterações antes de emitir o anexo."
                : podeEmitir
                  ? undefined
                  : "Informe o cliente e adicione ao menos um item para emitir."
            }
          >
            <FileDown className="h-4 w-4" />
            Emitir Anexo Contratual
          </Button>
        )}
        {data.status === "EMITIDA" && (
          <Button variant="outline" onClick={abrirAnexoContratual}>
            <FileDown className="h-4 w-4" />
            Emitir Anexo Contratual
          </Button>
        )}
```

**Ordem final da barra:** Salvar → PDF Detalhado → PDF Apresentação → **Emitir Contrato** → **Emitir Anexo Contratual** → Cancelar. Como o bloco novo ocupa a posição do antigo, a ordem sai correta sem mover mais nada.

O rótulo é o mesmo em RASCUNHO e EMITIDA ("Emitir Contrato"), conforme os critérios de aceite exigem literalmente. A diferença de comportamento continua: em RASCUNHO emite a proposta antes de baixar; em EMITIDA só baixa. Nenhum outro botão muda.

- [ ] **Step 4: Verificar que não sobrou referência ao nome antigo**

```bash
grep -rn "gerarContratual\|abrirContratual\|PDF Contratual" src/
```

Esperado: nenhuma saída.

> **Auditoria:** o comando retorna **6 ocorrências**, todas em **comentários** que
> descrevem o documento pelo nome histórico da Sprint 2.10.2 —
> `contratual/route.ts`, `pdf-cabecalho.tsx`, `pdf-cliente.tsx`,
> `pdf-conteudo-tabela.tsx`, `pdf-rodape-financeiro.tsx` e
> `proposta-pdf.mapper.ts`. **Nenhum identificador vivo** (`gerarContratual`,
> `abrirContratual`) sobrou — a intenção do passo foi cumprida, a verificação
> literal não. Desmarcado por honestidade. Renomear comentários é alteração de
> código e ficou fora do ciclo de reconciliação documental.

- [x] **Step 5: Typecheck e lint**

```bash
npm run typecheck && npm run lint
```

Esperado: sem erros.

- [x] **Step 6: Commit**

```bash
git add src/features/propostas/proposta-workspace.tsx
git commit -m "feat(contrato): botões Emitir Contrato e Emitir Anexo Contratual"
```

---

## Task 8: ADR e verificação final

**Files:**
- Modify: `DECISIONS.md`

- [x] **Step 1: Registrar o ADR-0330**

Acrescentar ao final de `DECISIONS.md` (a numeração 03xx é a da Sprint 3.x; o último é ADR-0321):

```markdown
### ADR-0330 — Contrato em .docx via docxtemplater (Sprint 3.1)

**Contexto.** O ADR-0223 fixou `@react-pdf/renderer` para geração de documentos e
descartou Puppeteer. O contrato, porém, precisa ser **editável antes do envio**
(forma de pagamento, prazos, multa, cláusulas, ajustes jurídicos) — requisito que
nenhum PDF atende.

**Decisão.** O Contrato é gerado em .docx com `docxtemplater` + `pizzip` (MIT), a
partir do template oficial da Outmat marcado com tags. Não contradiz o ADR-0223:
aquele decidia sobre PDF, e o docxtemplater é puro JS/WASM — mesma motivação de não
trazer Chromium. Valor por extenso via `extenso` (MIT).

**Alternativas descartadas.** (a) Biblioteca `docx`, reconstruindo o documento
programaticamente: violaria a preservação da formatação oficial e obrigaria o
jurídico a pedir dev para cada ajuste de estilo. (b) `pizzip` + regex sobre
`document.xml`: o Word fragmenta tags entre *runs* e o regex falharia
silenciosamente — é o problema que o docxtemplater resolve.

**Marcação seletiva (consequência importante).** O template usa
`[MAIÚSCULAS ENTRE COLCHETES]`. Usar `[` `]` como delimitadores do docxtemplater
está **proibido**: `[Nº]` aparece 5× com 5 significados (prazo de início, prazo de
conclusão, prazo de aceite, multa %, nº da proposta) e todos receberiam o mesmo
valor — "multa de 1042%". Só os placeholders que o sistema preenche viram `{tag}`
(`scripts/marcar-template-contrato.mjs`); os demais permanecem literais para
preenchimento no Word. `src/features/propostas/docx/template.test.ts` trava isso.

**Fonte do valor.** `calcularResumoFinanceiro().totalGeral` — a mesma do Anexo
Contratual. Contrato e Anexo citam o mesmo negócio e não podem divergir.

**Não alterado.** `proposta-pdf.service.ts`, `proposta-pdf.mapper.ts` e os
documentos react-pdf. O contrato consome o `PropostaPdfDTO` existente.
```

- [x] **Step 2: Suíte completa**

```bash
npm test
```

Esperado: todos os testes passam, incluindo os pré-existentes (`totais.test.ts`, `proposta-pdf.mapper.test.ts`, `conteudo-memoria.test.ts`, `format.test.ts`).

- [x] **Step 3: Build, typecheck e lint**

```bash
npm run typecheck && npm run lint && npm run build
```

Esperado: os três sem erros.

- [ ] **Step 4: Teste manual (obrigatório — não pode ser pulado)** — **PENDENTE**

> **Auditoria (2026-08-18): GATE MANUAL PENDENTE.** Não há evidência no
> repositório de que a comparação lado a lado com o template oficial tenha sido
> feita para uma proposta **PF** e uma **PJ**.
>
> **Evidência parcial que existe:**
> - `1a6e6c8`: *"A homologação visual pegou: … saíam pintados de amarelo"* e
>   *"Verificado no endpoint real (proposta 1002): valores limpos, manuais
>   amarelos."* → inspeção visual **do realce**, corrigida e travada por teste.
> - ADR-0330: *"Verificado em runtime: proposta real → contrato 'R$ 15.000,00' ==
>   cadeia do Resumo Financeiro na tela (18.085,50 − 3.085,50)."* → **valor
>   conferido** (item 5 e item 11 abaixo).
>
> **Sem evidência:** os itens 1, 2, 3, 4, 6, 7, 8, 9, 10 e 12, e o par PF + PJ.
>
> O ADR-0330 classifica esta homologação como **obrigatória antes do merge**.

O teste automatizado confere texto, não formatação. A preservação visual só é
verificável abrindo o arquivo.

```bash
npm run dev
```

Para uma proposta **PJ** e uma **PF** (ambas com desconto e frete), abrir
`/propostas/{id}` e clicar em **Emitir Contrato**. No .docx baixado, conferir:

1. Abre no Word sem aviso de arquivo corrompido.
2. Comparar lado a lado com o template oficial: **fonte, margens, cabeçalho
   ("OUTMAT | Contrato de Prestação de Serviços"), rodapé ("Página X de Y"),
   espaçamentos, numeração das cláusulas e estilos idênticos**.
3. Qualificação das partes preenchida (nome, CPF/CNPJ, endereço com vírgulas).
4. Cláusula 1.2 com o número da proposta.
5. Cláusula 2.1: `"o valor total de R$ 12.345,67 (doze mil ... centavos)"` — um
   único "R$", extenso entre os parênteses do template.
6. Cláusula 2.2 com a forma de pagamento da proposta (ou, se vazia na proposta, o
   bloco de instrução preservado).
7. **Cláusulas 3.1, 5.5 e 9.2 ainda com `[Nº]` literal** — preenchimento manual.
8. Fecho: `"São Caetano do Sul, 17 de julho de 2026."` — cidade não duplicada.
9. Anexo II: cliente e nº da proposta preenchidos, `[VALOR]` e `[se houver]`
   literais.
10. Nenhum "undefined" e nenhuma `{tag}` visível.
11. **Emitir Anexo Contratual** gera o PDF de antes, e seu **Total da Proposta é
    exatamente o valor da cláusula 2.1 do contrato**.
12. Os outros dois PDFs abrem normalmente, com os nomes de download inalterados.

- [x] **Step 5: Commit**

```bash
git add DECISIONS.md
git commit -m "docs(contrato): ADR-0330 — contrato em .docx via docxtemplater"
```

---

## Critérios de aceite (conferir ao final)

- [x] Botão "PDF Contratual" removido (Task 7)
      — `proposta-workspace.tsx` não tem mais o rótulo; smoke E2E cobre com
      `toHaveCount(0)`.
- [x] Botão "Emitir Contrato" criado, gera .docx (Tasks 5-7)
      — rota `/contrato` responde com o Content-Type de .docx; 11 testes em
      `route.test.ts` + smoke E2E.
- [x] Botão "Emitir Anexo Contratual" criado, gera o PDF existente (Task 7)
      — rota `/contratual` inalterada; smoke confere `application/pdf`.
- [ ] Template preservado — fonte, margens, cabeçalho, rodapé, espaçamentos,
      numeração, estilos e estrutura (Task 1 Step 3 + Task 8 Step 4.2)
      — **PARCIAL.** A prova **estrutural** existe e é forte: o script aborta se
      algo fora de `<w:t>`/realce mudar. A conferência **visual** no Word (Task 8
      Step 4.2) **não tem evidência** → gate manual pendente.
- [x] Campos variáveis preenchidos automaticamente (Task 3)
      — 13 testes do mapper + 9 do renderer; nenhum `undefined` no documento.
- [x] Os 4 `[Nº]` manuais, `[VALOR]` e `[se houver]` permanecem literais (Task 1)
      — travado por `template.test.ts` e conferido no documento renderizado.
- [x] `{valorTotal}` == `resumo.totalGeral`; Contrato e Anexo com valor idêntico
      (Task 3 + Task 8 Step 4.11)
      — travado por teste que roda a fonte oficial de verdade; conferido em
      runtime no ADR-0330 (R$ 15.000,00 == 18.085,50 − 3.085,50).
- [x] Nomes de download dos 3 PDFs existentes inalterados (Task 4)
      — 4 testes de regressão em `filename.test.ts`.
- [x] Build, TypeScript e ESLint sem erros (Task 8 Step 3)
      — verificado no gate da Release 1.1.0 (2026-08-18).

---

## Resultado da auditoria (Release 1.1.0 — 2026-08-18)

| Situação | Qtd |
|---|---|
| Concluídos com evidência | 43 |
| Desmarcados — fase vermelha do TDD, sem artefato | 4 |
| Desmarcado — verificação literal não bate (comentários) | 1 |
| Desmarcado — **gate manual pendente** (teste no Word) | 1 |
| Desmarcado — depende do gate manual (preservação visual) | 1 |
| **Total** | **50** |

O único bloqueio real de release é a **homologação visual do .docx no Word**.
