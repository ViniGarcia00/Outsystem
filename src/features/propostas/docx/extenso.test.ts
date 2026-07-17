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
