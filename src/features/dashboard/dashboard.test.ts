import { describe, expect, it } from "vitest";

import {
  MAX_PROXIMAS,
  montarDashboard,
  selecionarProximas,
  type FonteDashboard,
  type ProximaInstalacao,
} from "./dashboard";

/** Meio-dia do fuso brasileiro — mesma âncora usada por `dataDeInput`. */
const dia = (iso: string): Date => new Date(`${iso}T12:00:00-03:00`);
const INICIO_DE_HOJE = new Date("2026-08-19T00:00:00-03:00");

function proxima(
  numero: number,
  data: string,
  extra: Partial<ProximaInstalacao> = {},
): ProximaInstalacao {
  return {
    id: `i${numero}`,
    numero,
    clienteNome: `Cliente ${numero}`,
    dataAgendada: dia(data),
    status: "AGENDADA",
    responsavelNome: "Carlos",
    ...extra,
  };
}

const FONTE_VAZIA: FonteDashboard = {
  propostasPorStatus: [],
  instalacoesPorStatus: [],
  candidatasProximas: [],
  inicioDeHoje: INICIO_DE_HOJE,
};

describe("montarDashboard — contagens", () => {
  it("conta propostas em Rascunho e Emitidas", () => {
    const dto = montarDashboard({
      ...FONTE_VAZIA,
      propostasPorStatus: [
        { status: "RASCUNHO", total: 7 },
        { status: "EMITIDA", total: 3 },
        { status: "CANCELADA", total: 99 },
      ],
    });
    expect(dto.propostas).toEqual({ rascunho: 7, emitidas: 3 });
  });

  it("conta instalações por status", () => {
    const dto = montarDashboard({
      ...FONTE_VAZIA,
      instalacoesPorStatus: [
        { status: "A_AGENDAR", total: 2 },
        { status: "AGENDADA", total: 4 },
        { status: "AGUARDANDO_MATERIAL", total: 1 },
        { status: "EM_ANDAMENTO", total: 3 },
        { status: "CONCLUIDA", total: 8 },
      ],
    });
    expect(dto.instalacoes).toEqual({
      A_AGENDAR: 2,
      AGENDADA: 4,
      AGUARDANDO_MATERIAL: 1,
      EM_ANDAMENTO: 3,
      CONCLUIDA: 8,
    });
  });

  it("zera o status ausente em vez de omiti-lo", () => {
    // Um status sem nenhuma instalação não aparece no groupBy do banco. O card
    // precisa mostrar 0, não sumir da tela.
    const dto = montarDashboard({
      ...FONTE_VAZIA,
      instalacoesPorStatus: [{ status: "AGENDADA", total: 1 }],
    });
    expect(dto.instalacoes.A_AGENDAR).toBe(0);
    expect(dto.instalacoes.CONCLUIDA).toBe(0);
    expect(Object.keys(dto.instalacoes)).toHaveLength(5);
  });

  it("não expõe Adiada nem Cancelada como card", () => {
    const dto = montarDashboard(FONTE_VAZIA);
    expect(dto.instalacoes).not.toHaveProperty("ADIADA");
    expect(dto.instalacoes).not.toHaveProperty("CANCELADA");
  });
});

describe("montarDashboard — custos saíram do Dashboard (Sprint 4.2)", () => {
  it("não expõe custos acumulados no DTO", () => {
    // Apenas a APRESENTAÇÃO saiu. O custo por instalação segue intacto em
    // `features/instalacoes/custos.ts`, com categorias, registros e histórico
    // preservados (ADR-0410). O que sumiu foi o card do painel.
    expect(montarDashboard(FONTE_VAZIA)).not.toHaveProperty("custosAcumulados");
  });
});

describe("selecionarProximas", () => {
  it("ordena crescentemente mesmo recebendo fora de ordem", () => {
    const ordenadas = selecionarProximas(
      [
        proxima(1003, "2026-08-25"),
        proxima(1001, "2026-08-20"),
        proxima(1002, "2026-08-22"),
      ],
      INICIO_DE_HOJE,
    );
    expect(ordenadas.map((i) => i.numero)).toEqual([1001, 1002, 1003]);
  });

  it("desempata pelo número quando a data é a mesma", () => {
    // Sem desempate a ordem oscilaria entre execuções.
    const ordenadas = selecionarProximas(
      [proxima(1009, "2026-08-20"), proxima(1004, "2026-08-20")],
      INICIO_DE_HOJE,
    );
    expect(ordenadas.map((i) => i.numero)).toEqual([1004, 1009]);
  });

  it(`corta em ${MAX_PROXIMAS}`, () => {
    const sete = Array.from({ length: 7 }, (_, n) =>
      proxima(1001 + n, `2026-08-${String(20 + n).padStart(2, "0")}`),
    );
    const ordenadas = selecionarProximas(sete, INICIO_DE_HOJE);
    expect(ordenadas).toHaveLength(MAX_PROXIMAS);
    expect(ordenadas.map((i) => i.numero)).toEqual([
      1001, 1002, 1003, 1004, 1005,
    ]);
  });

  it("exclui Concluída e Cancelada", () => {
    const ordenadas = selecionarProximas(
      [
        proxima(1001, "2026-08-20", { status: "CONCLUIDA" }),
        proxima(1002, "2026-08-21", { status: "CANCELADA" }),
        proxima(1003, "2026-08-22", { status: "EM_ANDAMENTO" }),
      ],
      INICIO_DE_HOJE,
    );
    expect(ordenadas.map((i) => i.numero)).toEqual([1003]);
  });

  it("exclui data passada e mantém a de hoje", () => {
    const ordenadas = selecionarProximas(
      [proxima(1001, "2026-08-18"), proxima(1002, "2026-08-19")],
      INICIO_DE_HOJE,
    );
    expect(ordenadas.map((i) => i.numero)).toEqual([1002]);
  });

  it("a instalação de hoje continua próxima ao longo do dia", () => {
    // O corte é o INÍCIO do dia, não o instante atual: às 15h uma instalação
    // agendada para hoje de manhã ainda precisa aparecer.
    const ordenadas = selecionarProximas(
      [proxima(1001, "2026-08-19")],
      INICIO_DE_HOJE,
    );
    expect(ordenadas).toHaveLength(1);
  });

  it("sem candidatas, devolve lista vazia", () => {
    expect(selecionarProximas([], INICIO_DE_HOJE)).toEqual([]);
  });
});

describe("montarDashboard — estado vazio", () => {
  it("banco sem nada devolve tudo zerado e sem próximas", () => {
    expect(montarDashboard(FONTE_VAZIA)).toEqual({
      propostas: { rascunho: 0, emitidas: 0 },
      instalacoes: {
        A_AGENDAR: 0,
        AGENDADA: 0,
        AGUARDANDO_MATERIAL: 0,
        EM_ANDAMENTO: 0,
        CONCLUIDA: 0,
      },
      proximas: [],
    });
  });

  it("preserva os campos exibidos de cada próxima instalação", () => {
    const dto = montarDashboard({
      ...FONTE_VAZIA,
      candidatasProximas: [
        proxima(1008, "2026-08-22", {
          clienteNome: "João da Silva",
          responsavelNome: "Carlos",
        }),
      ],
    });
    expect(dto.proximas[0]).toMatchObject({
      numero: 1008,
      clienteNome: "João da Silva",
      status: "AGENDADA",
      responsavelNome: "Carlos",
    });
    // Não depende de nomeProjeto — o campo saiu na Sprint 4.0.3.
    expect(dto.proximas[0]).not.toHaveProperty("nomeProjeto");
    // O nome vem do cadastro de Técnicos (ADR-0408); o DTO só transporta.
    expect(dto.proximas[0]).not.toHaveProperty("responsavelAtual");
  });
});
