import { describe, expect, it } from "vitest";

import { usuarioDefaults, usuarioSchema } from "./schema";

const valido = {
  ativo: true,
  nome: "Vinicius Garcia",
  ehVendedor: true,
  ehTecnico: true,
  telefone: "",
  email: "",
};

describe("usuarioSchema", () => {
  it("aceita um usuário com os dois papéis", () => {
    expect(usuarioSchema.safeParse(valido).success).toBe(true);
  });

  it("aceita um usuário sem papel nenhum", () => {
    // É o cadastro criado antes de a função ser decidida. Ele simplesmente não
    // aparece em select nenhum — proibir tornaria impossível cadastrar antes.
    const semPapel = { ...valido, ehVendedor: false, ehTecnico: false };
    expect(usuarioSchema.safeParse(semPapel).success).toBe(true);
  });

  it("exige nome", () => {
    expect(usuarioSchema.safeParse({ ...valido, nome: "   " }).success).toBe(
      false,
    );
  });

  it("limita o nome a 200 caracteres", () => {
    expect(
      usuarioSchema.safeParse({ ...valido, nome: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("recusa e-mail inválido quando informado", () => {
    expect(
      usuarioSchema.safeParse({ ...valido, email: "nao-e-email" }).success,
    ).toBe(false);
  });

  it("aceita e-mail vazio", () => {
    expect(usuarioSchema.safeParse({ ...valido, email: "" }).success).toBe(true);
  });

  it("descarta campo enviado a mais", () => {
    const r = usuarioSchema.safeParse({ ...valido, ehAdmin: true });
    expect(r.success).toBe(true);
    expect(r.success && "ehAdmin" in r.data).toBe(false);
  });

  it("nasce ativo, sem papel e com contatos vazios", () => {
    expect(usuarioDefaults).toEqual({
      ativo: true,
      nome: "",
      ehVendedor: false,
      ehTecnico: false,
      telefone: "",
      email: "",
    });
  });
});
