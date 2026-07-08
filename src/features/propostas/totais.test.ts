import { describe, expect, it } from "vitest";

import {
  calcularInvestimento,
  calcularInvestimentoComplementar,
  calcularTotais,
  DESCONTO_ZERO,
  type ItemCalculavel,
  type ServicoCalculavel,
} from "./totais";

/**
 * Sprint 2.9.2 — Investimento Geral (Automação + Serviços Complementares).
 * Cobre os quatro cenários de homologação e garante que a camada de
 * investimento é ADITIVA (não altera o Total da Proposta usado por PDF/lista).
 */

// Automação: 1 item de R$ 10.000 (produtos) → Total da Proposta = 10.000
// (sem desconto/frete). Serve de base para os quatro cenários.
const AUTOMACAO_ITENS: ItemCalculavel[] = [
  { quantidade: 1, valorProduto: 10000, valorServico: 0 },
];

const som: ServicoCalculavel = { valorTotal: 2500 }; // Som Ambiente
const wifi: ServicoCalculavel = { valorTotal: 1800 }; // Wi-Fi Premium

function automacaoTotal(itens: ItemCalculavel[]): number {
  return calcularTotais(itens, false, DESCONTO_ZERO, 0).totalProposta;
}

describe("calcularInvestimentoComplementar", () => {
  it("soma vazia = 0", () => {
    expect(calcularInvestimentoComplementar([])).toBe(0);
  });

  it("soma TODOS os valorTotal existentes (Som + Wi-Fi), nunca apenas um", () => {
    expect(calcularInvestimentoComplementar([som, wifi])).toBe(4300);
  });

  // Escalabilidade (homologação 2.9.2, item 6): a regra ITERA a coleção e não
  // depende do tipo — o próprio `ServicoCalculavel` nem carrega `tipo`, então é
  // impossível haver `if (SOM)`/`if (WIFI)`. Funciona para N serviços futuros.
  it("escala para qualquer quantidade (2, 5, 10 serviços) sem alteração", () => {
    const gerar = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ valorTotal: (i + 1) * 100 }));
    expect(calcularInvestimentoComplementar(gerar(2))).toBe(300); // 100+200
    expect(calcularInvestimentoComplementar(gerar(5))).toBe(1500); // 100..500
    expect(calcularInvestimentoComplementar(gerar(10))).toBe(5500); // 100..1000
  });
});

describe("calcularInvestimento — cenários de homologação", () => {
  const automacao = automacaoTotal(AUTOMACAO_ITENS); // 10.000

  it("Cenário 1: Automação apenas → Serviços = 0, Total = Automação", () => {
    const inv = calcularInvestimento(automacao, []);
    expect(inv.automacao).toBe(10000);
    expect(inv.complementar).toBe(0);
    expect(inv.total).toBe(10000);
  });

  it("Cenário 2: Automação + Som → Total = Automação + Som", () => {
    const inv = calcularInvestimento(automacao, [som]);
    expect(inv.complementar).toBe(2500);
    expect(inv.total).toBe(12500);
  });

  it("Cenário 3: Automação + Wi-Fi → Total = Automação + Wi-Fi", () => {
    const inv = calcularInvestimento(automacao, [wifi]);
    expect(inv.complementar).toBe(1800);
    expect(inv.total).toBe(11800);
  });

  it("Cenário 4: Automação + Som + Wi-Fi → Total = Automação + Som + Wi-Fi", () => {
    const inv = calcularInvestimento(automacao, [som, wifi]);
    expect(inv.complementar).toBe(4300);
    expect(inv.total).toBe(14300);
  });
});

describe("camada de investimento é ADITIVA (não toca o Total da Proposta/PDF)", () => {
  it("calcularTotais ignora os serviços — Total da Proposta é só Automação", () => {
    const semServicos = calcularTotais(AUTOMACAO_ITENS, false, DESCONTO_ZERO, 0);
    // Mesmo havendo serviços, o Total da Proposta (fonte do PDF/lista) não muda.
    const inv = calcularInvestimento(semServicos.totalProposta, [som, wifi]);
    expect(semServicos.totalProposta).toBe(10000);
    expect(inv.automacao).toBe(semServicos.totalProposta);
    expect(inv.total).toBeGreaterThan(semServicos.totalProposta);
  });

  it("Automação já reflete desconto e frete antes de somar os serviços", () => {
    // Subtotal 10.000, desconto R$ 1.000, frete R$ 500 → Automação = 9.500.
    const t = calcularTotais(
      AUTOMACAO_ITENS,
      false,
      { tipo: "VALOR", valor: 1000 },
      500,
    );
    expect(t.totalProposta).toBe(9500);
    const inv = calcularInvestimento(t.totalProposta, [som]);
    expect(inv.total).toBe(12000); // 9.500 + 2.500
  });
});
