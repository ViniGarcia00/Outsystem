import { describe, expect, it } from "vitest";

import {
  disponivelAtivo,
  disponivelPara,
  rotuloOpcao,
  rotuloOpcaoAtivo,
} from "./opcoes";

const base = { nome: "João", ativo: true, ehVendedor: true, ehTecnico: false };

describe("disponivelPara", () => {
  it("é disponível quando ativo e com o papel", () => {
    expect(disponivelPara(base, "ehVendedor")).toBe(true);
  });

  it("não é disponível quando inativo, mesmo com o papel", () => {
    expect(disponivelPara({ ...base, ativo: false }, "ehVendedor")).toBe(false);
  });

  it("não é disponível quando ativo mas sem o papel", () => {
    expect(disponivelPara(base, "ehTecnico")).toBe(false);
  });

  it("avalia cada papel de forma independente", () => {
    const ambos = { ...base, ehTecnico: true };
    expect(disponivelPara(ambos, "ehVendedor")).toBe(true);
    expect(disponivelPara(ambos, "ehTecnico")).toBe(true);
  });
});

describe("rotuloOpcao", () => {
  it("mostra só o nome quando disponível", () => {
    expect(rotuloOpcao(base, "ehVendedor")).toBe("João");
  });

  it("marca (inativo) quando a pessoa está inativa", () => {
    expect(rotuloOpcao({ ...base, ativo: false }, "ehVendedor")).toBe(
      "João (inativo)",
    );
  });

  it("marca (sem papel de técnico) quando ativo mas sem o papel", () => {
    expect(rotuloOpcao(base, "ehTecnico")).toBe("João (sem papel de técnico)");
  });

  it("marca (sem papel de vendedor) no papel de vendedor", () => {
    const tecnico = { ...base, ehVendedor: false, ehTecnico: true };
    expect(rotuloOpcao(tecnico, "ehVendedor")).toBe(
      "João (sem papel de vendedor)",
    );
  });

  // A precedência importa: um só sufixo, nunca dois. Inativo é a condição mais
  // forte — a pessoa não está disponível para nada — e é o rótulo que o usuário
  // do sistema já conhece do cadastro de Técnicos (ADR-0408).
  it("usa (inativo) quando inativo E sem o papel", () => {
    const inativoSemPapel = { ...base, ativo: false, ehVendedor: false };
    expect(rotuloOpcao(inativoSemPapel, "ehVendedor")).toBe("João (inativo)");
  });
});

/**
 * Vínculo SEM exigência de papel (Sprint 4.6, ADR-0422).
 *
 * A Troca Antecipada aceita **qualquer usuário ativo** — acompanhar envio,
 * devolução, frete e cobrança é trabalho frequentemente administrativo. Estas
 * duas funções são o par de `disponivelPara`/`rotuloOpcao` com um eixo a menos.
 */
describe("disponivelAtivo", () => {
  it("é disponível quando ativo, com papel", () => {
    expect(disponivelAtivo(base)).toBe(true);
  });

  /** O ponto da função: papel não entra na conta. */
  it("é disponível quando ativo e SEM papel nenhum", () => {
    const semPapel = { ...base, ehVendedor: false, ehTecnico: false };
    expect(disponivelAtivo(semPapel)).toBe(true);
  });

  it("não é disponível quando inativo, mesmo com papel", () => {
    expect(disponivelAtivo({ ...base, ativo: false })).toBe(false);
  });

  /**
   * A diferença com `disponivelPara` é o que justifica as duas existirem: o
   * mesmo usuário administrativo é recusado no papel de técnico e aceito na
   * Troca.
   */
  it("diverge de disponivelPara exatamente no eixo do papel", () => {
    const administrativo = { ...base, ehVendedor: true, ehTecnico: false };
    expect(disponivelPara(administrativo, "ehTecnico")).toBe(false);
    expect(disponivelAtivo(administrativo)).toBe(true);
  });
});

describe("rotuloOpcaoAtivo", () => {
  it("mostra só o nome quando ativo", () => {
    expect(rotuloOpcaoAtivo(base)).toBe("João");
  });

  it("mostra o nome mesmo sem papel nenhum", () => {
    const semPapel = { ...base, ehVendedor: false, ehTecnico: false };
    expect(rotuloOpcaoAtivo(semPapel)).toBe("João");
  });

  it("marca (inativo) quando inativo", () => {
    expect(rotuloOpcaoAtivo({ ...base, ativo: false })).toBe("João (inativo)");
  });

  /**
   * Nunca "(sem papel de …)" aqui: seria informação sobre um requisito que este
   * vínculo não tem. Só existe uma forma de ficar indisponível — inativado.
   */
  it("nunca fala de papel", () => {
    const semPapel = { ...base, ehVendedor: false, ehTecnico: false };
    expect(rotuloOpcaoAtivo(semPapel)).not.toContain("papel");
    expect(rotuloOpcaoAtivo({ ...semPapel, ativo: false })).not.toContain(
      "papel",
    );
  });
});
