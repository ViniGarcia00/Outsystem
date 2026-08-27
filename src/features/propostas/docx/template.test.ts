import { readFileSync } from "node:fs";
import path from "node:path";

import PizZip from "pizzip";
import { describe, expect, it } from "vitest";

/**
 * Integridade do template marcado (Sprint 3.1). Protege a regra D3.1: só o
 * `[Nº]` do Anexo II é automático; os outros são preenchidos à mão no Word.
 *
 * Release 1.5.1: dois dos `[Nº]` deixaram de ser preenchíveis e viraram termo
 * contratual fixo — prazo de início (3.1) e multa de rescisão (9.2). Sobraram 2
 * manuais: prazo de conclusão (3.1) e prazo de aceite (5.5).
 */

const CAMINHO = path.join(
  process.cwd(),
  "public",
  "templates",
  "contrato",
  "contrato-outmat.docx",
);

function documentXml(): string {
  const arquivo = new PizZip(readFileSync(CAMINHO)).file("word/document.xml");
  if (!arquivo) throw new Error(`word/document.xml não encontrado em ${CAMINHO}`);
  return arquivo.asText();
}

const conta = (s: string, sub: string) => s.split(sub).length - 1;

/**
 * O run que contém a tag/placeholder/termo tem realce?
 *
 * Vive em escopo de módulo porque serve a dois grupos: o realce dos campos
 * automáticos (Sprint 3.1) e os termos fixados na 1.5.1, que também precisam
 * sair sem amarelo.
 */
function runComHighlight(alvo: string): boolean {
  const xml = documentXml();
  const runs = [...xml.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)];
  const run = runs.find((m) => m[1].includes(alvo));
  if (!run) throw new Error(`run com "${alvo}" não encontrado`);
  return /<w:highlight\s+w:val=/.test(run[1]);
}

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

  it("mantém os 2 [Nº] manuais literais (prazo de conclusão e aceite)", () => {
    expect(conta(documentXml(), "[Nº]")).toBe(2);
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

/**
 * Realce (highlight amarelo): o template oficial realça os placeholders como
 * "preencha aqui". Os campos que o SISTEMA preenche têm de sair SEM realce
 * (senão o contrato vai para assinatura com nome/CPF/valor pintados de amarelo);
 * os MANUAIS mantêm o amarelo, sinalizando o que falta preencher no Word.
 */
describe("realce dos campos", () => {
  it.each([
    "{clienteNome}",
    "{clienteDocumento}",
    "{valorTotal}",
    "{data}",
    "{formaPagamento}",
  ])("campo automático %s sai SEM realce", (tag) => {
    expect(runComHighlight(tag)).toBe(false);
  });

  it.each(["[Nº]", "[VALOR]", "[se houver]"])(
    "placeholder manual %s mantém o realce",
    (ph) => {
      expect(runComHighlight(ph)).toBe(true);
    },
  );
});

/**
 * Termos fixados na Release 1.5.1. Os dois deixaram de ser preenchíveis no Word
 * e viraram cláusula — por isso saem SEM realce e SEM o negrito/azul de "dado
 * variável", exatamente como o documento já escreve "2%" e "3 (três) meses".
 *
 * A guarda da 8.1 é deliberada: a decisão foi fixar 20% APENAS na multa de
 * rescisão (9.2). Arrastar a multa de inadimplência junto seria mudança de
 * natureza diferente — 2% é o teto do art. 52 §1º do CDC para relação de
 * consumo. O teste falha se alguém alterar a 8.1 por engano.
 */
describe("termos contratuais fixados (Release 1.5.1)", () => {
  it("9.2 — multa de rescisão fixada em 20% (vinte por cento)", () => {
    expect(documentXml()).toContain("20% (vinte por cento)");
  });

  it("9.2 — o percentual sai SEM realce", () => {
    expect(runComHighlight("20% (vinte por cento)")).toBe(false);
  });

  it("9.2 — a base de cálculo continua o saldo do contrato", () => {
    expect(documentXml()).toContain(" sobre o saldo do contrato");
  });

  it("8.1 — multa de inadimplência PERMANECE em 2%", () => {
    expect(documentXml()).toContain("multa de 2% sobre o valor em aberto");
  });

  it("3.1 — início não depende de data previamente fixada", () => {
    expect(documentXml()).toContain(
      "O início dos serviços não depende de data previamente fixada",
    );
  });

  it("3.1 — contado da autorização formal do CONTRATANTE", () => {
    expect(documentXml()).toContain(
      " dias úteis contados da autorização formal do CONTRATANTE",
    );
  });

  it("3.1 — prazo de início fixado em 10 (dez), sem realce", () => {
    expect(documentXml()).toContain("10 (dez)");
    expect(runComHighlight("10 (dez)")).toBe(false);
  });
});
