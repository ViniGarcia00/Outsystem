import { describe, expect, it } from "vitest";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { calcularResumoFinanceiro } from "../totais";
import {
  CONTRATO_SEM_PARCELA_FINAL,
  CONTRATO_SEM_PRAZO,
  INSTRUCAO_FORMA_PAGAMENTO,
  montarContratoTemplateDTO,
  validarGeracaoContrato,
} from "./contrato.mapper";

/**
 * DTO mínimo — só os campos que o contrato lê. O resto do PropostaPdfDTO é
 * irrelevante aqui, daí o cast: montar o DTO inteiro só ruído ao teste.
 */
function dto(over: Record<string, unknown> = {}): PropostaPdfDTO {
  return {
    numero: 1042,
    nomeProjeto: null,
    revisao: 2,
    data: new Date("2026-07-17T12:00:00Z"),
    validadeDias: 5,
    simplificada: false,
    empresa: { nome: "Outmat" },
    cliente: {
      tipoPessoa: "PJ",
      nome: "ACME COMÉRCIO LTDA",
      documento: "12.345.678/0001-90",
      endereco: "Rua X, 123 · Sala 2 · Centro · Curitiba/PR · CEP 80000-000",
    },
    resumo: { totalGeral: 12345.67 },
    formaPagamento: "50% de entrada, 50% na conclusão",
    ...over,
  } as unknown as PropostaPdfDTO;
}

describe("montarContratoTemplateDTO", () => {
  it("preenche a qualificação de PJ", () => {
    const t = montarContratoTemplateDTO(dto());
    expect(t.clienteNome).toBe("ACME COMÉRCIO LTDA");
    expect(t.clienteDocumento).toBe("12.345.678/0001-90");
  });

  it("preenche a qualificação de PF", () => {
    const t = montarContratoTemplateDTO(
      dto({
        cliente: {
          tipoPessoa: "PF",
          nome: "João da Silva",
          documento: "123.456.789-00",
          endereco: "Rua Y, 9 · Centro · Curitiba/PR",
        },
      }),
    );
    expect(t.clienteNome).toBe("João da Silva");
    expect(t.clienteDocumento).toBe("123.456.789-00");
  });

  it("troca o separador · do endereço por vírgula", () => {
    expect(montarContratoTemplateDTO(dto()).clienteEndereco).toBe(
      "Rua X, 123, Sala 2, Centro, Curitiba/PR, CEP 80000-000",
    );
  });

  it("usa resumo.totalGeral como valor oficial, sem o prefixo R$", () => {
    const t = montarContratoTemplateDTO(dto());
    expect(t.valorTotal).toBe("12.345,67");
    expect(t.valorTotal).not.toContain("R$");
  });

  it("gera o extenso sem parênteses (o template já os tem)", () => {
    const t = montarContratoTemplateDTO(dto());
    expect(t.valorTotalExtenso).toBe(
      "doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos",
    );
    expect(t.valorTotalExtenso).not.toContain("(");
  });

  it("formata a data por extenso, sem cidade", () => {
    expect(montarContratoTemplateDTO(dto()).data).toBe("17 de julho de 2026");
  });

  it("data no fuso de São Paulo, não em UTC nem no fuso do servidor", () => {
    // 02:00 UTC = 23:00 do dia 16 em São Paulo (UTC-3). O contrato deve datar
    // "16 de julho" — o dia que era no Brasil. Em UTC sairia "17 de julho".
    expect(
      montarContratoTemplateDTO(dto({ data: new Date("2026-07-17T02:00:00Z") })).data,
    ).toBe("16 de julho de 2026");

    // E 21:00 do dia 16 em UTC ainda é dia 16 lá (18:00) — o fuso só desloca
    // as horas da virada, não datas do meio do dia.
    expect(
      montarContratoTemplateDTO(dto({ data: new Date("2026-07-16T21:00:00Z") })).data,
    ).toBe("16 de julho de 2026");
  });

  it("mantém a instrução do template quando a forma de pagamento está vazia", () => {
    expect(
      montarContratoTemplateDTO(dto({ formaPagamento: null })).formaPagamento,
    ).toBe(INSTRUCAO_FORMA_PAGAMENTO);
    expect(
      montarContratoTemplateDTO(dto({ formaPagamento: "   " })).formaPagamento,
    ).toBe(INSTRUCAO_FORMA_PAGAMENTO);
  });

  it("usa a forma de pagamento da proposta quando preenchida", () => {
    expect(montarContratoTemplateDTO(dto()).formaPagamento).toBe(
      "50% de entrada, 50% na conclusão",
    );
  });

  it("nunca devolve undefined — campos ausentes viram string vazia", () => {
    const t = montarContratoTemplateDTO(
      dto({
        cliente: { tipoPessoa: "PF", nome: "", documento: null, endereco: null },
        empresa: { nome: "" },
      }),
    );
    for (const [chave, valor] of Object.entries(t)) {
      expect(valor, `${chave} não pode ser undefined`).toBeTypeOf("string");
    }
    expect(t.clienteDocumento).toBe("");
    expect(t.clienteEndereco).toBe("");
  });
});

/**
 * O valor do contrato tem de ser byte a byte o do Anexo Contratual — ambos
 * citam o mesmo negócio. Estes testes rodam a fonte oficial de verdade
 * (`calcularResumoFinanceiro`) em vez de cravar um número à mão, provando a
 * cadeia Proposta → calcularResumoFinanceiro → mapper → DTO.
 */
describe("fonte oficial do valor (contrato == anexo)", () => {
  const ITENS = [
    { quantidade: 2, valorProduto: 1000, valorServico: 250 },
    { quantidade: 1, valorProduto: 3000, valorServico: 500 },
  ];
  const SERVICOS = [{ valorTotal: 4000 }, { valorTotal: 2500 }];

  it("proposta completa: usa totalGeral com serviços, desconto e frete", () => {
    const resumo = calcularResumoFinanceiro(
      ITENS,
      SERVICOS,
      false,
      { tipo: "PERCENTUAL", valor: 10 },
      350,
    );
    const t = montarContratoTemplateDTO(dto({ resumo, simplificada: false }));

    // Automação 6000 (produtos 5000 + serviços 1000) + Complementares 6500
    // = 12500; -10% = 11250; +350 de frete = 11600.
    expect(resumo.totalGeral).toBe(11600);
    expect(t.valorTotal).toBe("11.600,00");
    expect(t.valorTotalExtenso).toBe("onze mil e seiscentos reais");
  });

  it("proposta simplificada: serviços complementares não entram no total", () => {
    const resumo = calcularResumoFinanceiro(
      ITENS,
      SERVICOS,
      true,
      { tipo: "VALOR", valor: 0 },
      0,
    );
    const t = montarContratoTemplateDTO(dto({ resumo, simplificada: true }));

    // Simplificada: só produtos (2×1000 + 3000 = 5000). Os serviços da
    // Automação e os Complementares (6500) ficam de fora.
    expect(resumo.subtotalServicos).toBe(0);
    expect(resumo.totalGeral).toBe(5000);
    expect(t.valorTotal).toBe("5.000,00");
    expect(t.valorTotalExtenso).toBe("cinco mil reais");
  });

  it("o mapper não recalcula: espelha o totalGeral que recebe", () => {
    const resumo = calcularResumoFinanceiro(
      ITENS,
      SERVICOS,
      false,
      { tipo: "VALOR", valor: 1250 },
      0,
    );
    // 12500 - 1250 = 11250.
    expect(montarContratoTemplateDTO(dto({ resumo })).valorTotal).toBe("11.250,00");
  });
});

/**
 * Variáveis do contrato Rev. 4 (Sprint 4.4, ADR-0416).
 *
 * As três têm em comum o mesmo tipo de erro possível: devolver a unidade ou o
 * símbolo que o template JÁ escreve, e imprimir duas vezes.
 */
describe("variáveis da Rev. 4", () => {
  it("prazoExecucao é SÓ o número — o template já escreve 'dias úteis'", () => {
    const r = montarContratoTemplateDTO(dto({ prazoExecucaoDiasUteis: 30 }));
    expect(r.prazoExecucao).toBe("30");
    expect(r.prazoExecucao).not.toContain("dia");
  });

  it("valorParcelaFinal é formatado em pt-BR e SEM 'R$'", () => {
    const r = montarContratoTemplateDTO(dto({ valorParcelaFinal: 12345.67 }));
    expect(r.valorParcelaFinal).toBe("12.345,67");
    expect(r.valorParcelaFinal).not.toContain("R$");
  });

  it("valorParcelaFinal usa a MESMA formatação do valor total", () => {
    const r = montarContratoTemplateDTO(
      dto({ valorParcelaFinal: 12345.67, resumo: { totalGeral: 12345.67 } }),
    );
    expect(r.valorParcelaFinal).toBe(r.valorTotal);
  });

  it("observacoes é string VAZIA quando não há — nunca 'null'", () => {
    for (const v of [null, undefined, "   "]) {
      const r = montarContratoTemplateDTO(dto({ observacoesAceite: v }));
      expect(r.observacoes).toBe("");
    }
  });

  it("observacoes preserva o texto informado, aparado", () => {
    const r = montarContratoTemplateDTO(
      dto({ observacoesAceite: "  Entrega parcial acordada.  " }),
    );
    expect(r.observacoes).toBe("Entrega parcial acordada.");
  });

  it("campos ausentes não viram 'undefined' no documento", () => {
    const r = montarContratoTemplateDTO(dto());
    for (const v of [r.prazoExecucao, r.valorParcelaFinal, r.observacoes]) {
      expect(v).toBe("");
      expect(v).not.toContain("undefined");
    }
  });
});

/**
 * Guarda de geração (ADR-0416).
 *
 * Sem os dois campos o contrato Rev. 4 sairia com "de  dias úteis" e "R$ ." —
 * um documento assim não pode ir para assinatura. A guarda é CONDICIONADA à
 * versão: a rev3 não tem essas tags e não pode parar de regenerar por causa de
 * campos criados depois dela.
 */
describe("validarGeracaoContrato", () => {
  const completo = { prazoExecucaoDiasUteis: 30, valorParcelaFinal: 1000 };

  it("libera a rev4 quando os dois campos estão preenchidos", () => {
    expect(validarGeracaoContrato(dto(completo), "rev4")).toBeNull();
  });

  it("bloqueia a rev4 sem prazo, nomeando o campo", () => {
    const erro = validarGeracaoContrato(
      dto({ ...completo, prazoExecucaoDiasUteis: null }),
      "rev4",
    );
    expect(erro).toBe(CONTRATO_SEM_PRAZO);
    expect(erro).toContain("prazo de execução");
  });

  it("bloqueia a rev4 sem parcela final, nomeando o campo", () => {
    const erro = validarGeracaoContrato(
      dto({ ...completo, valorParcelaFinal: null }),
      "rev4",
    );
    expect(erro).toBe(CONTRATO_SEM_PARCELA_FINAL);
    expect(erro).toContain("parcela final");
  });

  it("parcela final ZERO é valor válido — só o ausente bloqueia", () => {
    expect(
      validarGeracaoContrato(dto({ ...completo, valorParcelaFinal: 0 }), "rev4"),
    ).toBeNull();
  });

  /**
   * O ponto mais importante: uma revisão histórica não pode parar de regenerar
   * o contrato porque campos criados depois dela estão vazios.
   */
  it("NÃO bloqueia a rev3, mesmo sem nenhum dos dois", () => {
    expect(validarGeracaoContrato(dto(), "rev3")).toBeNull();
  });

  /**
   * A guarda recebe a versão JÁ RESOLVIDA (ADR-0415): quem decide rev3 x rev4 é
   * `resolverVersaoTemplateContrato`, no mapper do PDF. Aqui só se testa o
   * efeito de cada versão — sem repetir a condição.
   */
  it("bloqueia por VERSÃO, não por estado da proposta", () => {
    expect(validarGeracaoContrato(dto(), "rev3")).toBeNull();
    expect(validarGeracaoContrato(dto(), "rev4")).toBe(CONTRATO_SEM_PRAZO);
  });
});
