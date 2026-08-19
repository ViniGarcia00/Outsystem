import { describe, expect, it } from "vitest";

import {
  contentDisposition,
  contentDispositionPdf,
  nomeArquivoContrato,
  nomeArquivoPdf,
} from "./filename";

const DADOS = { cliente: { nome: "João da Silva" }, numero: 1042, revisao: 2 };

/**
 * Os nomes dos 3 PDFs foram padronizados na Sprint 2.10.3 e não podem mudar —
 * a Sprint 3.1 só acrescenta o contrato ao lado deles.
 */
describe("nomes de download dos PDFs (regressão)", () => {
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

describe("nome de download do contrato", () => {
  it("usa nome completo, número da proposta e revisão, com extensão .docx", () => {
    expect(nomeArquivoContrato(DADOS)).toBe(
      "Contrato - Proposta 1042 - João da Silva Rev.2.docx",
    );
  });

  it("distingue revisões — contratos de revisões diferentes não colidem", () => {
    const rev1 = nomeArquivoContrato({ ...DADOS, revisao: 1 });
    const rev2 = nomeArquivoContrato({ ...DADOS, revisao: 2 });
    expect(rev1).not.toBe(rev2);
    expect(rev1).toContain("Rev.1");
  });

  it("trata revisão nula como Rev.0", () => {
    expect(nomeArquivoContrato({ ...DADOS, revisao: null })).toBe(
      "Contrato - Proposta 1042 - João da Silva Rev.0.docx",
    );
  });

  it("remove caracteres proibidos em Windows, Linux e macOS", () => {
    expect(
      nomeArquivoContrato({
        cliente: { nome: 'Jo/ão\\da:Silva*?"<>|' },
        numero: 7,
        revisao: 0,
      }),
    ).toBe("Contrato - Proposta 7 - JoãodaSilva Rev.0.docx");
  });

  it("colapsa espaços duplicados e remove caracteres de controle", () => {
    expect(
      nomeArquivoContrato({
        cliente: { nome: "  João  da   Silva  " },
        numero: 7,
        revisao: 0,
      }),
    ).toBe("Contrato - Proposta 7 - João da Silva Rev.0.docx");
  });

  it("cai para 'Cliente' quando o nome fica vazio após sanitizar", () => {
    expect(
      nomeArquivoContrato({ cliente: { nome: '///???' }, numero: 7, revisao: 0 }),
    ).toBe("Contrato - Proposta 7 - Cliente Rev.0.docx");
  });
});

describe("nomeArquivoPdf — Geral de Produtos (Sprint 4.0.3)", () => {
  it("usa o prefixo próprio e o primeiro nome, como os demais PDFs", () => {
    expect(
      nomeArquivoPdf("produtos", {
        cliente: { nome: "Thaís Sales de Sousa" },
        numero: 1050,
        revisao: 2,
      }),
    ).toBe("Geral de Produtos - Thaís 1050 Rev.2.pdf");
  });

  it("revisão nula vira Rev.0", () => {
    expect(
      nomeArquivoPdf("produtos", {
        cliente: { nome: "João" },
        numero: 1001,
        revisao: null,
      }),
    ).toBe("Geral de Produtos - João 1001 Rev.0.pdf");
  });

  it("remove caracteres inválidos do Windows", () => {
    expect(
      nomeArquivoPdf("produtos", {
        cliente: { nome: 'Ma/ria*Sil<va' },
        numero: 9,
        revisao: 0,
      }),
    ).toBe("Geral de Produtos - MariaSilva 9 Rev.0.pdf");
  });

  it("não se confunde com o PDF Detalhado", () => {
    const base = { cliente: { nome: "João" }, numero: 1001, revisao: 0 };
    expect(nomeArquivoPdf("produtos", base)).not.toBe(
      nomeArquivoPdf("detalhada", base),
    );
  });
});

describe("contentDisposition", () => {
  it("baixa o contrato como attachment, preservando acentos via RFC 5987", () => {
    const cd = contentDisposition(
      "Contrato - Proposta 1042 - João da Silva Rev.2.docx",
      "attachment",
    );
    expect(cd).toContain("attachment;");
    expect(cd).toContain("filename*=UTF-8''");
    // O fallback ASCII não pode carregar acentos.
    expect(cd).toMatch(/filename="[\x20-\x7E]*"/);
  });

  it("usa inline por padrão", () => {
    expect(contentDisposition("x.pdf")).toContain("inline;");
  });
});
