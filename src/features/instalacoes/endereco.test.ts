import { describe, expect, it } from "vitest";

import { enderecoEmLinha, snapshotEndereco } from "./endereco";

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

describe("enderecoEmLinha", () => {
  const completo = {
    cep: "09530-320",
    enderecoLogradouro: "Avenida Goiás",
    enderecoNumero: "1860",
    complemento: "Conjunto 74",
    bairro: "Barcelona",
    cidade: "São Caetano do Sul",
    estado: "SP",
  };

  it("monta a linha completa", () => {
    expect(enderecoEmLinha(completo)).toBe(
      "Avenida Goiás, 1860 · Conjunto 74 · Barcelona · São Caetano do Sul/SP · CEP 09530-320",
    );
  });

  it("omite as partes ausentes sem deixar separador solto", () => {
    expect(
      enderecoEmLinha({
        ...completo,
        complemento: null,
        bairro: null,
        cep: null,
      }),
    ).toBe("Avenida Goiás, 1860 · São Caetano do Sul/SP");
  });

  it("devolve travessão quando não há endereço nenhum", () => {
    expect(
      enderecoEmLinha({
        cep: null,
        enderecoLogradouro: null,
        enderecoNumero: null,
        complemento: null,
        bairro: null,
        cidade: null,
        estado: null,
      }),
    ).toBe("—");
  });

  it("aceita cidade sem UF", () => {
    expect(
      enderecoEmLinha({
        cep: null,
        enderecoLogradouro: "Rua X",
        enderecoNumero: null,
        complemento: null,
        bairro: null,
        cidade: "Curitiba",
        estado: null,
      }),
    ).toBe("Rua X · Curitiba");
  });

  it("aceita logradouro sem número", () => {
    expect(
      enderecoEmLinha({
        cep: null,
        enderecoLogradouro: "Rodovia BR-116, km 12",
        enderecoNumero: null,
        complemento: null,
        bairro: null,
        cidade: null,
        estado: null,
      }),
    ).toBe("Rodovia BR-116, km 12");
  });
});
