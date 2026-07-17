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
  const arquivo = new PizZip(readFileSync(CAMINHO)).file("word/document.xml");
  if (!arquivo) throw new Error(`word/document.xml não encontrado em ${CAMINHO}`);
  return arquivo.asText();
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
