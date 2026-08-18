import { describe, expect, it } from "vitest";

import { registroSchema } from "./registro-schema";

const base = {
  tipo: "VISITA_CLIENTE" as const,
  aconteceuEm: "2026-08-18T10:00",
  responsavel: "Carlos",
  relatorio: "Realizada vistoria inicial.",
  custos: [],
};

describe("registroSchema", () => {
  it("aceita registro sem custos", () => {
    expect(registroSchema.safeParse(base).success).toBe(true);
  });

  it("aceita registro com um custo", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [{ categoria: "DESLOCAMENTO", descricao: "", valor: 80 }],
    });
    expect(r.success).toBe(true);
  });

  it("aceita registro com vários custos de categorias diferentes", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [
        { categoria: "MATERIAL", descricao: "2 módulos", valor: 340 },
        { categoria: "FRETE", descricao: "", valor: 35 },
      ],
    });
    expect(r.success && r.data.custos).toHaveLength(2);
  });

  it("REJEITA custo com valor zero", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [{ categoria: "MATERIAL", descricao: "", valor: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("REJEITA custo com valor negativo", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [{ categoria: "MATERIAL", descricao: "", valor: -10 }],
    });
    expect(r.success).toBe(false);
  });

  it("REJEITA responsável vazio", () => {
    expect(
      registroSchema.safeParse({ ...base, responsavel: "   " }).success,
    ).toBe(false);
  });

  it("REJEITA relatório vazio", () => {
    expect(registroSchema.safeParse({ ...base, relatorio: "   " }).success).toBe(
      false,
    );
  });

  it("REJEITA aconteceuEm vazio — é obrigatório", () => {
    expect(registroSchema.safeParse({ ...base, aconteceuEm: "" }).success).toBe(
      false,
    );
  });

  it("PERMITE acontecimento histórico (data no passado)", () => {
    expect(
      registroSchema.safeParse({ ...base, aconteceuEm: "2020-01-05T08:30" })
        .success,
    ).toBe(true);
  });

  it("REJEITA acontecimento no futuro", () => {
    const amanha = new Date(Date.now() + 48 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    expect(
      registroSchema.safeParse({ ...base, aconteceuEm: amanha }).success,
    ).toBe(false);
  });

  it("aceita descrição de custo vazia (é opcional)", () => {
    const r = registroSchema.safeParse({
      ...base,
      custos: [{ categoria: "OUTROS", descricao: "", valor: 12.5 }],
    });
    expect(r.success).toBe(true);
  });

  it("recusa tipo desconhecido", () => {
    expect(
      registroSchema.safeParse({ ...base, tipo: "INVENTADO" }).success,
    ).toBe(false);
  });
});
