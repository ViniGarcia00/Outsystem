import { describe, expect, it } from "vitest";

import { cabecalhoInstalacaoSchema, novaInstalacaoSchema } from "./schema";

const base = {
  clienteId: "ckl0000000000000000000000",
  propostaId: null,
  tecnicoResponsavelId: null,
  status: "A_AGENDAR" as const,
  // Datas chegam do <input type="date"> como texto ("" quando não informadas).
  dataPrevista: "",
  dataAgendada: "",
  periodo: "",
  observacoes: "",
};

describe("novaInstalacaoSchema", () => {
  it("aceita o mínimo obrigatório: apenas o cliente", () => {
    // O nome do projeto era obrigatório até a Sprint 4.0.2; saiu na 4.0.3
    // (ADR-0404). Cliente é o único campo exigido na criação.
    expect(novaInstalacaoSchema.safeParse(base).success).toBe(true);
  });

  it("exige cliente", () => {
    expect(
      novaInstalacaoSchema.safeParse({ ...base, clienteId: "" }).success,
    ).toBe(false);
  });

  it("NÃO declara nome do projeto — o campo saiu na Sprint 4.0.3", () => {
    // Se alguém reintroduzir o campo no schema por engano, este teste falha:
    // um valor enviado precisa ser descartado no parse, como o endereço.
    const r = novaInstalacaoSchema.safeParse({
      ...base,
      nomeProjeto: "Apartamento 81",
    });
    expect(r.success).toBe(true);
    expect(r.success && "nomeProjeto" in r.data).toBe(false);
  });

  it("aceita instalação sem técnico responsável", () => {
    const r = novaInstalacaoSchema.safeParse({ ...base, tecnicoResponsavelId: null });
    expect(r.success && r.data.tecnicoResponsavelId).toBeNull();
  });

  it("aceita instalação com técnico responsável", () => {
    const r = novaInstalacaoSchema.safeParse({
      ...base,
      tecnicoResponsavelId: "ckl0000000000000000000001",
    });
    expect(r.success && r.data.tecnicoResponsavelId).toBe("ckl0000000000000000000001");
  });

  it("NÃO declara mais responsavelAtual — virou vínculo com Técnico (ADR-0408)", () => {
    const r = novaInstalacaoSchema.safeParse({ ...base, responsavelAtual: "Carlos" });
    expect(r.success).toBe(true);
    expect(r.success && "responsavelAtual" in r.data).toBe(false);
  });

  it("aceita proposta relacionada nula", () => {
    expect(
      novaInstalacaoSchema.safeParse({ ...base, propostaId: null }).success,
    ).toBe(true);
  });

  it("aceita a data do input e a mantém como texto", () => {
    // O schema VALIDA o formato; a conversão para Date é da Server Action
    // (ver `datas.ts`). Transformar aqui faria o tipo de entrada divergir do de
    // saída, e o React Hook Form manipula o de entrada.
    const r = novaInstalacaoSchema.safeParse({
      ...base,
      dataAgendada: "2026-08-18",
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data.dataAgendada).toBe("2026-08-18");
  });

  it("aceita data vazia", () => {
    const r = novaInstalacaoSchema.safeParse({ ...base, dataPrevista: "" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.dataPrevista).toBe("");
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
