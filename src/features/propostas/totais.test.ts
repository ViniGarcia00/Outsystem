import { describe, expect, it } from "vitest";

import {
  calcularInvestimentoComplementar,
  calcularResumoFinanceiro,
  calcularTotais,
  DESCONTO_ZERO,
  type ItemCalculavel,
  type ServicoCalculavel,
} from "./totais";

/**
 * Resumo Financeiro (Sprint 2.9.4) — Automação + Serviços Complementares, com o
 * **Desconto incidindo sobre o Total combinado**. Cobre os cenários de
 * homologação e a diferença em relação ao `calcularTotais` (PDF Comercial, cujo
 * desconto incide só sobre a Automação).
 */

// Automação: 1 item de R$ 10.000 (produtos). Serviços: Som 2.500 + Wi-Fi 1.800.
const AUTOMACAO_ITENS: ItemCalculavel[] = [
  { quantidade: 1, valorProduto: 10000, valorServico: 0 },
];
const som: ServicoCalculavel = { valorTotal: 2500 };
const wifi: ServicoCalculavel = { valorTotal: 1800 };

describe("calcularInvestimentoComplementar", () => {
  it("soma vazia = 0", () => {
    expect(calcularInvestimentoComplementar([])).toBe(0);
  });

  it("soma TODOS os valorTotal existentes (Som + Wi-Fi), nunca apenas um", () => {
    expect(calcularInvestimentoComplementar([som, wifi])).toBe(4300);
  });

  it("escala para qualquer quantidade (2, 5, 10 serviços) sem alteração", () => {
    const gerar = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ valorTotal: (i + 1) * 100 }));
    expect(calcularInvestimentoComplementar(gerar(2))).toBe(300);
    expect(calcularInvestimentoComplementar(gerar(5))).toBe(1500);
    expect(calcularInvestimentoComplementar(gerar(10))).toBe(5500);
  });
});

describe("calcularResumoFinanceiro — cenários", () => {
  it("Cenário 1: Automação apenas → Total Geral = Automação", () => {
    const r = calcularResumoFinanceiro(AUTOMACAO_ITENS, [], false, DESCONTO_ZERO, 0);
    expect(r.subtotalAutomacao).toBe(10000);
    expect(r.subtotalServicos).toBe(0);
    expect(r.total).toBe(10000);
    expect(r.totalGeral).toBe(10000);
  });

  it("Cenário 4: Automação + Som + Wi-Fi (sem desconto) → Total Geral = 14.300", () => {
    const r = calcularResumoFinanceiro(AUTOMACAO_ITENS, [som, wifi], false, DESCONTO_ZERO, 0);
    expect(r.subtotalServicos).toBe(4300);
    expect(r.total).toBe(14300);
    expect(r.totalGeral).toBe(14300);
  });

  it("Desconto PERCENTUAL incide sobre o TOTAL combinado (10% de 14.300 = 1.430)", () => {
    const r = calcularResumoFinanceiro(
      AUTOMACAO_ITENS,
      [som, wifi],
      false,
      { tipo: "PERCENTUAL", valor: 10 },
      0,
    );
    expect(r.total).toBe(14300);
    expect(r.descontoAplicado).toBe(1430);
    expect(r.totalGeral).toBe(12870); // 14.300 − 1.430
  });

  it("Desconto em VALOR + Frete: Total − Desconto + Frete", () => {
    const r = calcularResumoFinanceiro(
      AUTOMACAO_ITENS,
      [som, wifi],
      false,
      { tipo: "VALOR", valor: 1000 },
      500,
    );
    expect(r.descontoAplicado).toBe(1000);
    expect(r.frete).toBe(500);
    expect(r.totalGeral).toBe(13800); // 14.300 − 1.000 + 500
  });

  it("Simplificada: Serviços Complementares não entram (subtotalServicos = 0)", () => {
    const r = calcularResumoFinanceiro(AUTOMACAO_ITENS, [som, wifi], true, DESCONTO_ZERO, 0);
    expect(r.subtotalServicos).toBe(0);
    expect(r.total).toBe(10000);
    expect(r.totalGeral).toBe(10000);
  });
});

describe("difere do PDF Comercial (calcularTotais: desconto só na Automação)", () => {
  it("percentual: Comercial desconta 10% de 10.000; Resumo desconta 10% de 14.300", () => {
    const desconto = { tipo: "PERCENTUAL" as const, valor: 10 };
    const comercial = calcularTotais(AUTOMACAO_ITENS, false, desconto, 0);
    const resumo = calcularResumoFinanceiro(AUTOMACAO_ITENS, [som, wifi], false, desconto, 0);
    expect(comercial.descontoAplicado).toBe(1000); // 10% de 10.000 (só Automação)
    expect(resumo.descontoAplicado).toBe(1430); // 10% de 14.300 (Total combinado)
    expect(comercial.totalProposta).toBe(9000); // PDF Comercial inalterado
  });
});
