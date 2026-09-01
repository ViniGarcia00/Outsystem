import { describe, expect, it } from "vitest";

import {
  cabecalhoTrocaSchema,
  itemTrocaSchema,
  novaTrocaSchema,
} from "./schema";

/**
 * Schemas da Troca Antecipada (Sprint 4.6).
 *
 * O que interessa provar aqui não é "o Zod funciona", e sim as três decisões de
 * produto que o schema carrega:
 *
 * 1. destinatário INSTALADOR/OUTRO exige nome; CLIENTE não;
 * 2. quantidades são inteiros >= 0, e devolvida nunca excede a esperada;
 * 3. um item precisa de produto do cadastro OU descrição manual.
 */

const novaBase = {
  clienteId: "cli_1",
  referencia: "Fechadura entrada social",
  responsavelId: null,
  relatoInicial: "Cliente relatou trava intermitente.",
  status: "ABERTA" as const,
  destinatarioTipo: "CLIENTE" as const,
  destinatarioNome: "",
};

const cabecalhoBase = {
  referencia: "Fechadura entrada social",
  responsavelId: null,
  relatoInicial: "",
  status: "DEVOLUCAO_PENDENTE" as const,
  destinatarioTipo: "CLIENTE" as const,
  destinatarioNome: "",
  diagnosticoConclusao: "",
};

const itemBase = {
  id: null,
  produtoId: "prod_1",
  descricaoManual: "",
  quantidadeEnviada: 1,
  quantidadeEsperadaRetorno: 1,
  quantidadeDevolvida: 0,
};

/** Caminhos dos erros, para afirmar EM QUE CAMPO a mensagem aparece. */
const caminhos = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => i.path.join("."));

describe("novaTrocaSchema", () => {
  it("aceita o mínimo do fluxo de criação (spec §21)", () => {
    expect(novaTrocaSchema.safeParse(novaBase).success).toBe(true);
  });

  it("exige cliente", () => {
    const r = novaTrocaSchema.safeParse({ ...novaBase, clienteId: "" });
    expect(r.success).toBe(false);
    expect(caminhos(r)).toContain("clienteId");
  });

  it("exige referência — é a identificação da linha na listagem", () => {
    const r = novaTrocaSchema.safeParse({ ...novaBase, referencia: "  " });
    expect(r.success).toBe(false);
    expect(caminhos(r)).toContain("referencia");
  });

  it("aceita responsável nulo: a troca pode nascer sem responsável", () => {
    expect(
      novaTrocaSchema.safeParse({ ...novaBase, responsavelId: null }).success,
    ).toBe(true);
  });

  it("aceita relato inicial vazio", () => {
    expect(
      novaTrocaSchema.safeParse({ ...novaBase, relatoInicial: "" }).success,
    ).toBe(true);
  });

  it("recusa status fora do enum", () => {
    expect(
      novaTrocaSchema.safeParse({ ...novaBase, status: "ARQUIVADA" }).success,
    ).toBe(false);
  });

  /**
   * `diagnosticoConclusao` NÃO faz parte da criação — ninguém conclui uma troca
   * no momento em que a abre. O Zod, ao não declarar o campo, o descarta.
   */
  it("descarta diagnóstico enviado na criação", () => {
    const r = novaTrocaSchema.safeParse({
      ...novaBase,
      diagnosticoConclusao: "não deveria chegar aqui",
    });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty("diagnosticoConclusao");
  });
});

describe("destinatário do envio (spec §8)", () => {
  it("CLIENTE dispensa o nome — a troca já aponta para ele", () => {
    expect(
      novaTrocaSchema.safeParse({
        ...novaBase,
        destinatarioTipo: "CLIENTE",
        destinatarioNome: "",
      }).success,
    ).toBe(true);
  });

  it.each(["INSTALADOR", "OUTRO"] as const)("%s exige o nome", (tipo) => {
    const r = novaTrocaSchema.safeParse({
      ...novaBase,
      destinatarioTipo: tipo,
      destinatarioNome: "",
    });
    expect(r.success).toBe(false);
    // O erro fica no CAMPO do nome: uma mensagem no topo deixaria o usuário
    // procurando o que preencher.
    expect(caminhos(r)).toContain("destinatarioNome");
  });

  it.each(["INSTALADOR", "OUTRO"] as const)("%s aceita com nome", (tipo) => {
    expect(
      novaTrocaSchema.safeParse({
        ...novaBase,
        destinatarioTipo: tipo,
        destinatarioNome: "Instalador Marcos",
      }).success,
    ).toBe(true);
  });

  it("nome só de espaços não conta como preenchido", () => {
    const r = novaTrocaSchema.safeParse({
      ...novaBase,
      destinatarioTipo: "INSTALADOR",
      destinatarioNome: "   ",
    });
    expect(r.success).toBe(false);
  });

  it("a mesma regra vale na edição do cabeçalho", () => {
    expect(
      cabecalhoTrocaSchema.safeParse({
        ...cabecalhoBase,
        destinatarioTipo: "OUTRO",
        destinatarioNome: "",
      }).success,
    ).toBe(false);
    expect(
      cabecalhoTrocaSchema.safeParse({
        ...cabecalhoBase,
        destinatarioTipo: "OUTRO",
        destinatarioNome: "Portaria do edifício",
      }).success,
    ).toBe(true);
  });
});

describe("cabecalhoTrocaSchema", () => {
  it("aceita o cabeçalho completo, com diagnóstico opcional", () => {
    expect(cabecalhoTrocaSchema.safeParse(cabecalhoBase).success).toBe(true);
    expect(
      cabecalhoTrocaSchema.safeParse({
        ...cabecalhoBase,
        diagnosticoConclusao: "Peça devolvida com trinca na carcaça.",
      }).success,
    ).toBe(true);
  });

  /** Cliente é definido na criação e não muda depois — o schema nem o declara. */
  it("descarta o cliente enviado na edição", () => {
    const r = cabecalhoTrocaSchema.safeParse({
      ...cabecalhoBase,
      clienteId: "outro_cliente",
    });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty("clienteId");
  });

  it("aceita os status terminais — cancelar e finalizar passam por aqui", () => {
    for (const status of ["FINALIZADA", "CANCELADA"] as const) {
      expect(
        cabecalhoTrocaSchema.safeParse({ ...cabecalhoBase, status }).success,
      ).toBe(true);
    }
  });
});

describe("itemTrocaSchema", () => {
  it("aceita item do cadastro", () => {
    expect(itemTrocaSchema.safeParse(itemBase).success).toBe(true);
  });

  it("aceita item manual", () => {
    expect(
      itemTrocaSchema.safeParse({
        ...itemBase,
        produtoId: null,
        descricaoManual: "Fechadura antiga do hall",
      }).success,
    ).toBe(true);
  });

  it("recusa item sem produto e sem descrição (regra XOR)", () => {
    const r = itemTrocaSchema.safeParse({
      ...itemBase,
      produtoId: null,
      descricaoManual: "",
    });
    expect(r.success).toBe(false);
    expect(caminhos(r)).toContain("descricaoManual");
  });

  it("aceita o caso dos interruptores com retorno parcial", () => {
    expect(
      itemTrocaSchema.safeParse({
        ...itemBase,
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      }).success,
    ).toBe(true);
  });

  it("recusa devolvida acima da esperada, no campo devolvida", () => {
    const r = itemTrocaSchema.safeParse({
      ...itemBase,
      quantidadeEsperadaRetorno: 7,
      quantidadeDevolvida: 8,
    });
    expect(r.success).toBe(false);
    expect(caminhos(r)).toContain("quantidadeDevolvida");
  });

  it.each([
    ["quantidadeEnviada", 1.5],
    ["quantidadeEsperadaRetorno", -1],
    ["quantidadeDevolvida", 0.5],
  ])("recusa %s = %s", (campo, valor) => {
    const r = itemTrocaSchema.safeParse({ ...itemBase, [campo]: valor });
    expect(r.success).toBe(false);
    expect(caminhos(r)).toContain(campo);
  });

  it("aceita zeros — nada enviado, nada esperado, nada devolvido", () => {
    expect(
      itemTrocaSchema.safeParse({
        ...itemBase,
        quantidadeEnviada: 0,
        quantidadeEsperadaRetorno: 0,
        quantidadeDevolvida: 0,
      }).success,
    ).toBe(true);
  });

  /** `id` presente = linha existente; ausente/nulo = linha nova. */
  it("aceita id nulo (linha nova) e id preenchido (linha existente)", () => {
    expect(itemTrocaSchema.safeParse({ ...itemBase, id: null }).success).toBe(
      true,
    );
    expect(
      itemTrocaSchema.safeParse({ ...itemBase, id: "item_1" }).success,
    ).toBe(true);
  });
});
