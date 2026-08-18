import { describe, expect, it } from "vitest";

import {
  dataDeInput,
  dataHoraDeInput,
  dataHoraParaExibicao,
  dataHoraParaInput,
  dataParaInput,
  ehDataDeInputValida,
  ehDataHoraDeInputValida,
} from "./datas";

describe("dataDeInput", () => {
  it("converte YYYY-MM-DD numa data do dia escolhido", () => {
    const d = dataDeInput("2026-08-18");
    expect(d).toBeInstanceOf(Date);
    expect(dataParaInput(d)).toBe("2026-08-18");
  });

  it("devolve null para vazio", () => {
    expect(dataDeInput("")).toBeNull();
    expect(dataDeInput("   ")).toBeNull();
  });

  it("devolve null para formato inválido", () => {
    expect(dataDeInput("18/08/2026")).toBeNull();
    expect(dataDeInput("2026-8-18")).toBeNull();
    expect(dataDeInput("qualquer coisa")).toBeNull();
  });

  it("devolve null para data inexistente", () => {
    expect(dataDeInput("2026-02-31")).not.toBeNull(); // JS normaliza 31/02
    expect(dataDeInput("2026-13-01")).toBeNull();
  });

  it("ancora ao meio-dia — a data não vira o dia no fuso brasileiro", () => {
    const d = dataDeInput("2026-01-01");
    // Se fosse meia-noite UTC, em São Paulo seria 31/12 do ano anterior.
    expect(dataParaInput(d)).toBe("2026-01-01");
  });
});

describe("dataParaInput", () => {
  it("formata no fuso de São Paulo, não no do servidor", () => {
    // 02:00 UTC de 19/08 é 23:00 de 18/08 em São Paulo.
    expect(dataParaInput(new Date("2026-08-19T02:00:00Z"))).toBe("2026-08-18");
  });

  it("devolve vazio para null e undefined", () => {
    expect(dataParaInput(null)).toBe("");
    expect(dataParaInput(undefined)).toBe("");
  });

  it("devolve vazio para data inválida", () => {
    expect(dataParaInput(new Date("nada"))).toBe("");
  });

  it("faz ida e volta sem perder o dia", () => {
    for (const dia of ["2026-01-01", "2026-06-15", "2026-12-31"]) {
      expect(dataParaInput(dataDeInput(dia))).toBe(dia);
    }
  });
});

describe("ehDataDeInputValida", () => {
  it("aceita vazio", () => {
    expect(ehDataDeInputValida("")).toBe(true);
  });

  it("aceita data no formato do input", () => {
    expect(ehDataDeInputValida("2026-08-18")).toBe(true);
  });

  it("recusa formato inválido", () => {
    expect(ehDataDeInputValida("18/08/2026")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Data-hora (Sprint 4.0.2) — `aconteceuEm` da cronologia
// ---------------------------------------------------------------------------

describe("dataHoraDeInput", () => {
  it("converte YYYY-MM-DDTHH:mm preservando a hora", () => {
    const d = dataHoraDeInput("2026-08-18T16:40");
    expect(d).toBeInstanceOf(Date);
    expect(dataHoraParaInput(d)).toBe("2026-08-18T16:40");
  });

  it("NÃO ancora ao meio-dia — a hora do fato é preservada", () => {
    // A data pura é ancorada ao meio-dia; a data-hora não pode ser.
    expect(dataHoraParaInput(dataHoraDeInput("2026-08-18T00:05"))).toBe(
      "2026-08-18T00:05",
    );
    expect(dataHoraParaInput(dataHoraDeInput("2026-08-18T23:55"))).toBe(
      "2026-08-18T23:55",
    );
  });

  it("devolve null para vazio e formato inválido", () => {
    expect(dataHoraDeInput("")).toBeNull();
    expect(dataHoraDeInput("18/08/2026 16:40")).toBeNull();
    expect(dataHoraDeInput("2026-08-18")).toBeNull();
  });
});

describe("dataHoraParaInput", () => {
  it("formata no fuso de São Paulo, não no do servidor", () => {
    // 01:00 UTC de 19/08 é 22:00 de 18/08 em São Paulo.
    expect(dataHoraParaInput(new Date("2026-08-19T01:00:00Z"))).toBe(
      "2026-08-18T22:00",
    );
  });

  it("devolve vazio para null e data inválida", () => {
    expect(dataHoraParaInput(null)).toBe("");
    expect(dataHoraParaInput(new Date("nada"))).toBe("");
  });
});

describe("dataHoraParaExibicao", () => {
  it("formata dd/mm/aaaa HH:mm no fuso de São Paulo", () => {
    expect(dataHoraParaExibicao(dataHoraDeInput("2026-08-18T16:40")!)).toBe(
      "18/08/2026 16:40",
    );
  });

  it("não depende do fuso do runtime", () => {
    expect(dataHoraParaExibicao(new Date("2026-08-19T01:00:00Z"))).toBe(
      "18/08/2026 22:00",
    );
  });
});

describe("ehDataHoraDeInputValida", () => {
  it("recusa vazio — aconteceuEm é obrigatório", () => {
    expect(ehDataHoraDeInputValida("")).toBe(false);
  });

  it("aceita o formato do input", () => {
    expect(ehDataHoraDeInputValida("2026-08-18T16:40")).toBe(true);
  });

  it("recusa formato inválido", () => {
    expect(ehDataHoraDeInputValida("2026-08-18")).toBe(false);
  });
});
