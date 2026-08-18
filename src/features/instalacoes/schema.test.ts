import { describe, expect, it } from "vitest";

import { cabecalhoInstalacaoSchema, novaInstalacaoSchema } from "./schema";

const base = {
  clienteId: "ckl0000000000000000000000",
  nomeProjeto: "Apartamento 81 — Edifício Horizon",
  propostaId: null,
  responsavelAtual: "",
  status: "A_AGENDAR" as const,
  // Datas chegam do <input type="date"> como texto ("" quando não informadas).
  dataPrevista: "",
  dataAgendada: "",
  periodo: "",
  observacoes: "",
};

describe("novaInstalacaoSchema", () => {
  it("aceita o mínimo obrigatório: cliente e nome do projeto", () => {
    expect(novaInstalacaoSchema.safeParse(base).success).toBe(true);
  });

  it("exige cliente", () => {
    expect(
      novaInstalacaoSchema.safeParse({ ...base, clienteId: "" }).success,
    ).toBe(false);
  });

  it("exige nome do projeto", () => {
    expect(
      novaInstalacaoSchema.safeParse({ ...base, nomeProjeto: "   " }).success,
    ).toBe(false);
  });

  it("aceita responsável atual vazio (é opcional)", () => {
    expect(
      novaInstalacaoSchema.safeParse({ ...base, responsavelAtual: "" }).success,
    ).toBe(true);
  });

  it("aceita responsável atual como texto livre", () => {
    const r = novaInstalacaoSchema.safeParse({
      ...base,
      responsavelAtual: "Carlos",
    });
    expect(r.success && r.data.responsavelAtual).toBe("Carlos");
  });

  it("aceita proposta relacionada nula", () => {
    expect(
      novaInstalacaoSchema.safeParse({ ...base, propostaId: null }).success,
    ).toBe(true);
  });

  it("converte a data do input em Date preservando o dia", () => {
    const r = novaInstalacaoSchema.safeParse({
      ...base,
      dataAgendada: "2026-08-18",
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data.dataAgendada).toBeInstanceOf(Date);
  });

  it("data vazia vira null", () => {
    const r = novaInstalacaoSchema.safeParse({ ...base, dataPrevista: "" });
    expect(r.success && r.data.dataPrevista).toBeNull();
  });

  it("recusa data em formato inválido", () => {
    expect(
      novaInstalacaoSchema.safeParse({ ...base, dataAgendada: "18/08/2026" })
        .success,
    ).toBe(false);
  });

  it("IGNORA endereço vindo do cliente — o snapshot é do servidor", () => {
    const r = novaInstalacaoSchema.safeParse({
      ...base,
      cidade: "Cidade Forjada",
      cep: "00000-000",
      enderecoLogradouro: "Rua Inventada",
    });
    expect(r.success).toBe(true);
    // O schema não declara campos de endereço, então eles não sobrevivem ao
    // parse e jamais chegam ao service.
    expect(r.success && "cidade" in r.data).toBe(false);
    expect(r.success && "cep" in r.data).toBe(false);
    expect(r.success && "enderecoLogradouro" in r.data).toBe(false);
  });
});

describe("cabecalhoInstalacaoSchema", () => {
  it("aceita alteração de status", () => {
    expect(
      cabecalhoInstalacaoSchema.safeParse({ ...base, status: "AGENDADA" })
        .success,
    ).toBe(true);
  });

  it("aceita CONCLUIDA — concluir é mudar o status", () => {
    expect(
      cabecalhoInstalacaoSchema.safeParse({ ...base, status: "CONCLUIDA" })
        .success,
    ).toBe(true);
  });

  it("recusa status desconhecido", () => {
    expect(
      cabecalhoInstalacaoSchema.safeParse({ ...base, status: "INVENTADO" })
        .success,
    ).toBe(false);
  });

  it("não expõe endereço nem cliente para edição", () => {
    const r = cabecalhoInstalacaoSchema.safeParse({
      ...base,
      cidade: "Curitiba",
      clienteId: "outro-cliente",
    });
    expect(r.success).toBe(true);
    expect(r.success && "cidade" in r.data).toBe(false);
    expect(r.success && "clienteId" in r.data).toBe(false);
  });
});
