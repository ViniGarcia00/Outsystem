import { describe, expect, it } from "vitest";

import {
  totaisPorCategoria,
  totalDaInstalacao,
  totalDoRegistro,
  type CategoriaCustoInstalacao,
} from "./custos";

const custo = (
  valor: number,
  categoria: CategoriaCustoInstalacao = "MATERIAL",
) => ({ categoria, valor });

describe("totalDoRegistro", () => {
  it("registro SEM custos soma zero", () => {
    expect(totalDoRegistro([])).toBe(0);
  });

  it("registro com UM custo devolve o próprio valor", () => {
    expect(totalDoRegistro([custo(80)])).toBe(80);
  });

  it("registro com VÁRIOS custos soma todos", () => {
    expect(totalDoRegistro([custo(340), custo(35, "FRETE")])).toBe(375);
  });

  it("soma valores quebrados sem erro de ponto flutuante", () => {
    expect(totalDoRegistro([custo(0.1), custo(0.2)])).toBe(0.3);
  });
});

describe("totalDaInstalacao", () => {
  it("soma os custos de todos os registros", () => {
    // Cenário de homologação da spec: 80 + (340 + 35) + 0 = 455.
    expect(
      totalDaInstalacao([
        { custos: [custo(80, "DESLOCAMENTO")] },
        { custos: [custo(340), custo(35, "FRETE")] },
        { custos: [] },
      ]),
    ).toBe(455);
  });

  it("instalação sem registros soma zero", () => {
    expect(totalDaInstalacao([])).toBe(0);
  });

  it("instalação só com registros sem custo soma zero", () => {
    expect(totalDaInstalacao([{ custos: [] }, { custos: [] }])).toBe(0);
  });
});

describe("totaisPorCategoria", () => {
  it("agrupa por categoria somando entre registros", () => {
    const t = totaisPorCategoria([
      { custos: [custo(230), custo(80, "DESLOCAMENTO")] },
      { custos: [custo(75), custo(80, "DESLOCAMENTO")] },
    ]);
    expect(t.MATERIAL).toBe(305);
    expect(t.DESLOCAMENTO).toBe(160);
  });

  it("categorias sem lançamento ficam zeradas", () => {
    const t = totaisPorCategoria([{ custos: [custo(100)] }]);
    expect(t.FRETE).toBe(0);
    expect(t.TERCEIROS).toBe(0);
    expect(t.MAO_DE_OBRA).toBe(0);
    expect(t.OUTROS).toBe(0);
  });

  it("a soma das categorias bate com o total da instalação", () => {
    const registros = [
      { custos: [custo(230), custo(80, "DESLOCAMENTO")] },
      { custos: [custo(75), custo(150, "MAO_DE_OBRA")] },
    ];
    const soma = Object.values(totaisPorCategoria(registros)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(soma).toBe(totalDaInstalacao(registros));
  });
});
