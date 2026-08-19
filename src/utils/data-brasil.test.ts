import { describe, expect, it } from "vitest";

import { FUSO_BRASIL, OFFSET_BRASIL, inicioDoDiaBrasil } from "./data-brasil";

/** Dia/mês/ano lidos NO FUSO BRASILEIRO — não no fuso do runtime do teste. */
function diaBrasil(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: FUSO_BRASIL,
  }).format(d);
}

describe("constantes", () => {
  it("fixa o fuso oficial do domínio", () => {
    expect(FUSO_BRASIL).toBe("America/Sao_Paulo");
    expect(OFFSET_BRASIL).toBe("-03:00");
  });
});

describe("inicioDoDiaBrasil", () => {
  it("devolve sempre 00:00 no fuso brasileiro", () => {
    const inicio = inicioDoDiaBrasil(new Date("2026-08-19T15:37:00-03:00"));
    const hora = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: FUSO_BRASIL,
    }).format(inicio);
    expect(hora).toBe("00:00");
  });

  it("um instante logo APÓS a meia-noite de São Paulo já é o dia novo", () => {
    // 00:05 de 19/08 no Brasil.
    const inicio = inicioDoDiaBrasil(new Date("2026-08-19T00:05:00-03:00"));
    expect(diaBrasil(inicio)).toBe("2026-08-19");
  });

  it("um instante logo ANTES da meia-noite ainda é o dia anterior", () => {
    // 23:55 de 18/08 no Brasil.
    const inicio = inicioDoDiaBrasil(new Date("2026-08-18T23:55:00-03:00"));
    expect(diaBrasil(inicio)).toBe("2026-08-18");
  });

  it("usa o dia BRASILEIRO, não o de UTC", () => {
    // 01:00 UTC de 20/08 ainda é 22:00 de 19/08 em São Paulo. Usar a data do
    // servidor faria uma instalação agendada para 19/08 sumir antes da hora.
    const inicio = inicioDoDiaBrasil(new Date("2026-08-20T01:00:00Z"));
    expect(diaBrasil(inicio)).toBe("2026-08-19");
  });

  it("é comparável com datas agendadas do mesmo dia", () => {
    // Datas de instalação são ancoradas ao MEIO-DIA brasileiro (ver
    // features/instalacoes/datas.ts), então hoje sempre passa no `>=`.
    const hoje = new Date("2026-08-19T12:00:00-03:00");
    expect(hoje.getTime()).toBeGreaterThanOrEqual(
      inicioDoDiaBrasil(new Date("2026-08-19T15:37:00-03:00")).getTime(),
    );
  });
});
