import { describe, expect, it } from "vitest";

import { formatCurrency } from "./currency";
import { formatDate, formatDateTime } from "./date";
import { formatCpfCnpj, onlyDigits } from "./document";
import { formatPhone } from "./phone";

describe("formatCurrency", () => {
  it("formata número como Real brasileiro", () => {
    expect(formatCurrency(1234.5)).toBe("R$ 1.234,50");
  });

  it("trata valores inválidos como zero", () => {
    expect(formatCurrency(Number.NaN)).toBe("R$ 0,00");
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe("R$ 0,00");
  });
});

describe("formatDate", () => {
  it("formata data ISO no padrão dd/mm/aaaa", () => {
    expect(formatDate("2026-07-06T12:00:00.000Z")).toBe("06/07/2026");
  });

  it("retorna string vazia para data inválida", () => {
    expect(formatDate("data-invalida")).toBe("");
  });

  it("formata data e hora", () => {
    const value = formatDateTime("2026-07-06T09:05:00.000Z");
    expect(value).toContain("06/07/2026");
  });
});

describe("onlyDigits", () => {
  it("remove caracteres não numéricos", () => {
    expect(onlyDigits("123.456-78/ab")).toBe("12345678");
  });
});

describe("formatCpfCnpj", () => {
  it("formata CPF completo", () => {
    expect(formatCpfCnpj("12345678909")).toBe("123.456.789-09");
  });

  it("formata CNPJ completo", () => {
    expect(formatCpfCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("formata progressivamente valores parciais", () => {
    expect(formatCpfCnpj("123456")).toBe("123.456");
  });
});

describe("formatPhone", () => {
  it("formata celular (11 dígitos)", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formata fixo (10 dígitos)", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });
});
