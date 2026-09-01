import { describe, expect, it } from "vitest";

import { dataHoraParaInput } from "@/features/instalacoes/datas";

import {
  cancelarPosVendaSchema,
  custoPosVendaSchema,
  registroPosVendaSchema,
} from "./registro-schema";
import { CATEGORIAS_CUSTO } from "./labels";

/**
 * Schema do registro de timeline do Pós-venda (Sprint 4.6).
 *
 * O MESMO schema serve Troca e OS — um registro dos dois tem a mesma forma.
 */

const base = {
  dataHora: "2026-08-20T10:00",
  responsavelId: "usr_1",
  relato: "Produto enviado via motoboy.",
  custos: [],
};

const caminhos = (r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[] }[] };
}) => (r.success ? [] : (r.error?.issues ?? []).map((i) => i.path.join(".")));

describe("registroPosVendaSchema", () => {
  it("aceita um registro sem custo", () => {
    expect(registroPosVendaSchema.safeParse(base).success).toBe(true);
  });

  it("exige responsável — fato sem quem o executou não é registrável", () => {
    expect(
      caminhos(
        registroPosVendaSchema.safeParse({ ...base, responsavelId: "" }),
      ),
    ).toContain("responsavelId");
  });

  it("exige relato", () => {
    expect(
      caminhos(registroPosVendaSchema.safeParse({ ...base, relato: "  " })),
    ).toContain("relato");
  });

  it("recusa data-hora em formato inválido", () => {
    for (const dataHora of ["", "20/08/2026", "2026-08-20"]) {
      expect(
        registroPosVendaSchema.safeParse({ ...base, dataHora }).success,
      ).toBe(false);
    }
  });

  /** Fatos históricos são permitidos — a troca começa antes de ser cadastrada. */
  it("aceita fato no passado", () => {
    expect(
      registroPosVendaSchema.safeParse({ ...base, dataHora: "2020-01-05T08:30" })
        .success,
    ).toBe(true);
  });

  /** Fato futuro, não: ainda não ocorreu. */
  it("recusa fato no futuro", () => {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const r = registroPosVendaSchema.safeParse({
      ...base,
      dataHora: dataHoraParaInput(amanha),
    });
    expect(r.success).toBe(false);
    expect(caminhos(r)).toContain("dataHora");
  });

  it("aceita custos válidos", () => {
    expect(
      registroPosVendaSchema.safeParse({
        ...base,
        custos: [
          { categoria: "MOTOBOY", descricao: "Entrega ao cliente", valor: 85 },
          { categoria: "SEDEX", descricao: "", valor: 42 },
        ],
      }).success,
    ).toBe(true);
  });
});

describe("custoPosVendaSchema", () => {
  it("aceita toda categoria da enum", () => {
    for (const categoria of CATEGORIAS_CUSTO) {
      expect(
        custoPosVendaSchema.safeParse({ categoria, descricao: "", valor: 10 })
          .success,
        categoria,
      ).toBe(true);
    }
  });

  it("recusa categoria fora da enum", () => {
    expect(
      custoPosVendaSchema.safeParse({
        categoria: "COMBUSTIVEL",
        descricao: "",
        valor: 10,
      }).success,
    ).toBe(false);
  });

  it("recusa valor zero — custo zerado não é custo", () => {
    expect(
      custoPosVendaSchema.safeParse({
        categoria: "FRETE",
        descricao: "",
        valor: 0,
      }).success,
    ).toBe(false);
  });

  it("recusa valor negativo", () => {
    expect(
      custoPosVendaSchema.safeParse({
        categoria: "FRETE",
        descricao: "",
        valor: -1,
      }).success,
    ).toBe(false);
  });

  it("aceita descrição vazia — o campo é opcional", () => {
    expect(
      custoPosVendaSchema.safeParse({
        categoria: "VISITA",
        descricao: "",
        valor: 150,
      }).success,
    ).toBe(true);
  });

  /**
   * A separação envio/reparo é da INTERFACE (ADR-0418), não do schema: recusar
   * `PECA` numa Troca no servidor não protegeria nada — seria só um custo
   * classificado de forma estranha, e a enum do banco já garante que o valor
   * existe. Este teste documenta que a permissividade é deliberada.
   */
  it("não separa categorias de Troca e OS — isso é decisão da interface", () => {
    expect(
      custoPosVendaSchema.safeParse({
        categoria: "PECA",
        descricao: "",
        valor: 10,
      }).success,
    ).toBe(true);
    expect(
      custoPosVendaSchema.safeParse({
        categoria: "MOTOBOY",
        descricao: "",
        valor: 10,
      }).success,
    ).toBe(true);
  });
});

describe("cancelarPosVendaSchema", () => {
  it("aceita motivo vazio — é opcional", () => {
    expect(cancelarPosVendaSchema.safeParse({ motivo: "" }).success).toBe(true);
  });

  it("aceita motivo preenchido", () => {
    expect(
      cancelarPosVendaSchema.safeParse({
        motivo: "Cliente desistiu da substituição.",
      }).success,
    ).toBe(true);
  });

  it("recusa motivo acima de 500 caracteres", () => {
    expect(
      cancelarPosVendaSchema.safeParse({ motivo: "x".repeat(501) }).success,
    ).toBe(false);
  });
});
