import { describe, expect, it } from "vitest";

import { snapshotEndereco } from "./endereco";

describe("snapshotEndereco", () => {
  it("mapeia os campos do Cliente para os da Instalação", () => {
    expect(
      snapshotEndereco({
        cep: "09530-320",
        endereco: "Avenida Goiás",
        numero: "1860",
        complemento: "Conjunto 74",
        bairro: "Barcelona",
        cidade: "São Caetano do Sul",
        estado: "SP",
      }),
    ).toEqual({
      cep: "09530-320",
      enderecoLogradouro: "Avenida Goiás",
      enderecoNumero: "1860",
      complemento: "Conjunto 74",
      bairro: "Barcelona",
      cidade: "São Caetano do Sul",
      estado: "SP",
    });
  });

  it("converte vazio e espaços em nulo", () => {
    expect(
      snapshotEndereco({
        cep: "",
        endereco: "   ",
        numero: null,
        complemento: undefined,
        bairro: "Centro",
        cidade: null,
        estado: null,
      }),
    ).toEqual({
      cep: null,
      enderecoLogradouro: null,
      enderecoNumero: null,
      complemento: null,
      bairro: "Centro",
      cidade: null,
      estado: null,
    });
  });

  it("cliente sem nenhum endereço gera snapshot todo nulo", () => {
    expect(
      snapshotEndereco({
        cep: null,
        endereco: null,
        numero: null,
        complemento: null,
        bairro: null,
        cidade: null,
        estado: null,
      }),
    ).toEqual({
      cep: null,
      enderecoLogradouro: null,
      enderecoNumero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      estado: null,
    });
  });

  it("apara espaços das pontas sem alterar o conteúdo", () => {
    const s = snapshotEndereco({
      endereco: "  Rua das Flores  ",
      cidade: " Curitiba ",
    });
    expect(s.enderecoLogradouro).toBe("Rua das Flores");
    expect(s.cidade).toBe("Curitiba");
  });
});
