import { describe, expect, it } from "vitest";

import { contemBusca, normalizarBusca } from "./busca";

describe("normalizarBusca", () => {
  // Os quatro pares exigidos pela Sprint 4.0.3. "Thaís" é um cliente real do
  // banco: era ele que não aparecia ao digitar "Thais" no autocomplete.
  it.each([
    ["Thaís", "Thais"],
    ["João", "Joao"],
    ["São Caetano", "Sao Caetano"],
    ["AUTOMAÇÃO", "automacao"],
  ])("equipara %s e %s", (comAcento, semAcento) => {
    expect(normalizarBusca(comAcento)).toBe(normalizarBusca(semAcento));
  });

  it("converte para minúsculas independentemente do acento", () => {
    expect(normalizarBusca("THAÍS")).toBe("thais");
    expect(normalizarBusca("thaís")).toBe("thais");
    expect(normalizarBusca("ThAíS")).toBe("thais");
  });

  it("cobre os diacríticos do português", () => {
    expect(normalizarBusca("ãáàâçéêíõóôúü")).toBe("aaaaceeiooouu");
  });

  it("trata string vazia", () => {
    expect(normalizarBusca("")).toBe("");
  });

  it("preserva números, pontuação e demais caracteres", () => {
    expect(normalizarBusca("CM10-A")).toBe("cm10-a");
    expect(normalizarBusca("529.982.247-25")).toBe("529.982.247-25");
    expect(normalizarBusca("R$ 1.500,00")).toBe("r$ 1.500,00");
  });

  it("não colapsa espaços — a busca é por substring literal", () => {
    expect(normalizarBusca("São  Caetano")).toBe("sao  caetano");
  });
});

describe("contemBusca", () => {
  it("encontra o texto com acento pela consulta sem acento", () => {
    expect(contemBusca("Thaís Sales de Sousa", "thais")).toBe(true);
  });

  it("encontra o texto sem acento pela consulta com acento", () => {
    expect(contemBusca("Joao da Silva", "João")).toBe(true);
  });

  it("busca por qualquer parte do texto, não só pelo começo", () => {
    expect(contemBusca("Thaís Sales de Sousa", "sales")).toBe(true);
    expect(contemBusca("Thaís Sales de Sousa", "sousa")).toBe(true);
  });

  it("continua insensível a caixa", () => {
    expect(contemBusca("Thaís Sales de Sousa", "SALES")).toBe(true);
  });

  it("query vazia casa com tudo — é o estado sem filtro", () => {
    expect(contemBusca("Qualquer coisa", "")).toBe(true);
    expect(contemBusca("Qualquer coisa", "   ")).toBe(true);
  });

  it("ignora espaços em volta da consulta", () => {
    expect(contemBusca("Automação Residencial", "  automacao  ")).toBe(true);
  });

  it("recusa o que não casa", () => {
    expect(contemBusca("Thaís Sales de Sousa", "carlos")).toBe(false);
  });

  it("não confunde descrições parecidas", () => {
    expect(contemBusca("Interruptor 4 teclas", "interruptor 6")).toBe(false);
  });
});
