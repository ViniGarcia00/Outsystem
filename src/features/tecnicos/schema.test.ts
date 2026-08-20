import { describe, expect, it } from "vitest";

import { tecnicoDefaults, tecnicoSchema } from "./schema";

const base = { ativo: true, nome: "Carlos" };

describe("tecnicoSchema", () => {
  it("aceita o mínimo: nome e ativo", () => {
    expect(tecnicoSchema.safeParse(base).success).toBe(true);
  });

  it("exige o nome", () => {
    expect(tecnicoSchema.safeParse({ ...base, nome: "" }).success).toBe(false);
  });

  it("REJEITA nome só com espaços", () => {
    expect(tecnicoSchema.safeParse({ ...base, nome: "   " }).success).toBe(false);
  });

  it("apara espaços das pontas", () => {
    const r = tecnicoSchema.safeParse({ ...base, nome: "  Carlos  " });
    expect(r.success && r.data.nome).toBe("Carlos");
  });

  it("REJEITA nome acima de 200 caracteres", () => {
    const r = tecnicoSchema.safeParse({ ...base, nome: "a".repeat(201) });
    expect(r.success).toBe(false);
  });

  it("aceita técnico inativo", () => {
    const r = tecnicoSchema.safeParse({ ...base, ativo: false });
    expect(r.success && r.data.ativo).toBe(false);
  });

  it("NÃO declara telefone, e-mail ou cargo — a V1 tem dois campos", () => {
    // Se alguém acrescentar campos ao schema por engano, este teste falha:
    // valores extras precisam ser descartados no parse.
    const r = tecnicoSchema.safeParse({
      ...base,
      telefone: "11999999999",
      email: "a@b.com",
      cargo: "Instalador",
    });
    expect(r.success).toBe(true);
    expect(r.success && Object.keys(r.data).sort()).toEqual(["ativo", "nome"]);
  });

  it("os defaults nascem ativos e com nome vazio", () => {
    expect(tecnicoDefaults).toEqual({ ativo: true, nome: "" });
  });
});
