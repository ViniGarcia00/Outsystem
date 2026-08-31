import { describe, expect, it } from "vitest";

import { apelidoExibido } from "./apelido";

/**
 * Fallback de EXIBIÇÃO do apelido (Sprint 4.5).
 *
 * A coluna Cliente saiu da tabela, então a coluna Apelido virou o único lugar
 * onde o usuário reconhece de quem é a obra. Uma linha sem apelido não pode
 * mostrar "—" enquanto houver cliente ou número para mostrar.
 *
 * Isto é APRESENTAÇÃO. Nada aqui é gravado: quem alimenta o input editável do
 * workspace é `getInstalacao`, que continua sem este fallback de propósito —
 * caso contrário um apelido vazio viraria o nome do cliente no próximo
 * "Salvar", sem o usuário ter pedido.
 */
describe("apelidoExibido", () => {
  it("mostra o apelido quando ele tem valor", () => {
    expect(apelidoExibido("Casa Alphaville", "João da Silva", 1046)).toBe(
      "Casa Alphaville",
    );
  });

  it("preserva acento e espaços internos do apelido", () => {
    expect(apelidoExibido("Cobertura Jardim Paulistão", "ACME", 7)).toBe(
      "Cobertura Jardim Paulistão",
    );
  });

  it("apara o apelido antes de exibir", () => {
    expect(apelidoExibido("  Casa Alphaville  ", "ACME", 7)).toBe(
      "Casa Alphaville",
    );
  });

  it("cai para o cliente quando o apelido é nulo", () => {
    expect(apelidoExibido(null, "João da Silva", 1046)).toBe("João da Silva");
  });

  it("cai para o cliente quando o apelido é string vazia", () => {
    expect(apelidoExibido("", "João da Silva", 1046)).toBe("João da Silva");
  });

  it("cai para o cliente quando o apelido é só espaço", () => {
    expect(apelidoExibido("   ", "João da Silva", 1046)).toBe("João da Silva");
  });

  it("cai para o número quando não há apelido nem cliente", () => {
    expect(apelidoExibido(null, "", 1046)).toBe("1046");
    expect(apelidoExibido("  ", "   ", 1046)).toBe("1046");
  });

  /**
   * `nomeCliente` devolve "—" quando o cliente não tem nem nome nem empresa.
   * Esse travessão é ausência de dado, não um nome — deixá-lo passar traria de
   * volta exatamente o "—" que a regra proíbe na coluna.
   */
  it("trata o travessão de ausência do cliente como ausência", () => {
    expect(apelidoExibido(null, "—", 1046)).toBe("1046");
  });

  it("nunca devolve vazio nem travessão", () => {
    for (const apelido of [null, "", "   "]) {
      for (const cliente of ["", "   ", "—"]) {
        const exibido = apelidoExibido(apelido, cliente, 99);
        expect(exibido).toBe("99");
        expect(exibido).not.toBe("—");
      }
    }
  });
});
