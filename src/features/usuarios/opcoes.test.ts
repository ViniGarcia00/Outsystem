import { describe, expect, it } from "vitest";

import { disponivelPara, rotuloOpcao } from "./opcoes";

const base = { nome: "João", ativo: true, ehVendedor: true, ehTecnico: false };

describe("disponivelPara", () => {
  it("é disponível quando ativo e com o papel", () => {
    expect(disponivelPara(base, "ehVendedor")).toBe(true);
  });

  it("não é disponível quando inativo, mesmo com o papel", () => {
    expect(disponivelPara({ ...base, ativo: false }, "ehVendedor")).toBe(false);
  });

  it("não é disponível quando ativo mas sem o papel", () => {
    expect(disponivelPara(base, "ehTecnico")).toBe(false);
  });

  it("avalia cada papel de forma independente", () => {
    const ambos = { ...base, ehTecnico: true };
    expect(disponivelPara(ambos, "ehVendedor")).toBe(true);
    expect(disponivelPara(ambos, "ehTecnico")).toBe(true);
  });
});

describe("rotuloOpcao", () => {
  it("mostra só o nome quando disponível", () => {
    expect(rotuloOpcao(base, "ehVendedor")).toBe("João");
  });

  it("marca (inativo) quando a pessoa está inativa", () => {
    expect(rotuloOpcao({ ...base, ativo: false }, "ehVendedor")).toBe(
      "João (inativo)",
    );
  });

  it("marca (sem papel de técnico) quando ativo mas sem o papel", () => {
    expect(rotuloOpcao(base, "ehTecnico")).toBe("João (sem papel de técnico)");
  });

  it("marca (sem papel de vendedor) no papel de vendedor", () => {
    const tecnico = { ...base, ehVendedor: false, ehTecnico: true };
    expect(rotuloOpcao(tecnico, "ehVendedor")).toBe(
      "João (sem papel de vendedor)",
    );
  });

  // A precedência importa: um só sufixo, nunca dois. Inativo é a condição mais
  // forte — a pessoa não está disponível para nada — e é o rótulo que o usuário
  // do sistema já conhece do cadastro de Técnicos (ADR-0408).
  it("usa (inativo) quando inativo E sem o papel", () => {
    const inativoSemPapel = { ...base, ativo: false, ehVendedor: false };
    expect(rotuloOpcao(inativoSemPapel, "ehVendedor")).toBe("João (inativo)");
  });
});
