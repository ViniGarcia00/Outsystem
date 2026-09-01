import { describe, expect, it } from "vitest";

import { totaisPorCategoria, totalAcumulado, totalDoRegistro } from "./custos";
import { CATEGORIAS_CUSTO, type CategoriaCustoPosVenda } from "./labels";

/**
 * Custos do Pós-venda (Sprint 4.6) — módulo puro, sem banco.
 *
 * Os valores vêm dos exemplos da spec §14: motoboy R$ 85,00, sedex R$ 42,00,
 * frete R$ 60,00, visita R$ 150,00, outro R$ 30,00.
 */

const custo = (categoria: CategoriaCustoPosVenda, valor: number) => ({
  categoria,
  valor,
});

describe("totalDoRegistro", () => {
  it("soma os custos de um acontecimento", () => {
    expect(
      totalDoRegistro([custo("MOTOBOY", 85), custo("SEDEX", 42)]),
    ).toBe(127);
  });

  it("registro sem custo vale zero", () => {
    expect(totalDoRegistro([])).toBe(0);
  });

  /**
   * O erro de ponto flutuante ACUMULA quando se somam N linhas independentes
   * (0.1 + 0.2 = 0.30000000000000004). O arredondamento a 2 casas é um
   * endurecimento da função de cálculo, não substituto do `Decimal(12,2)` do
   * banco.
   */
  it("normaliza a duas casas", () => {
    expect(totalDoRegistro([custo("FRETE", 0.1), custo("OUTROS", 0.2)])).toBe(
      0.3,
    );
  });
});

describe("totalAcumulado", () => {
  it("soma os registros de UM agregado", () => {
    const registros = [
      { custos: [custo("MOTOBOY", 85)] },
      { custos: [custo("SEDEX", 42), custo("FRETE", 60)] },
      { custos: [] },
    ];
    expect(totalAcumulado(registros)).toBe(187);
  });

  it("agregado sem registro vale zero", () => {
    expect(totalAcumulado([])).toBe(0);
  });

  it("acumula centavos sem drift", () => {
    const registros = Array.from({ length: 10 }, () => ({
      custos: [custo("OUTROS", 0.1)],
    }));
    expect(totalAcumulado(registros)).toBe(1);
  });
});

describe("totaisPorCategoria", () => {
  it("agrupa por categoria e zera as sem lançamento", () => {
    const totais = totaisPorCategoria([
      { custos: [custo("MOTOBOY", 85), custo("FRETE", 60)] },
      { custos: [custo("MOTOBOY", 15)] },
    ]);
    expect(totais.MOTOBOY).toBe(100);
    expect(totais.FRETE).toBe(60);
    expect(totais.PECA).toBe(0);
    expect(totais.VISITA).toBe(0);
  });

  it("devolve todas as categorias da enum, sempre", () => {
    const totais = totaisPorCategoria([]);
    expect(Object.keys(totais).sort()).toEqual([...CATEGORIAS_CUSTO].sort());
  });

  /**
   * A enum é uma só para os dois submódulos (ADR-0418). Uma OS que só tem custo
   * de peça devolve `MOTOBOY: 0` — a UI filtra por `> 0`, então a categoria do
   * outro processo nunca aparece na tela.
   */
  it("categoria do outro processo fica zerada, não some do mapa", () => {
    const totais = totaisPorCategoria([{ custos: [custo("PECA", 320)] }]);
    expect(totais.PECA).toBe(320);
    expect(totais.MOTOBOY).toBe(0);
  });
});
