import { describe, expect, it } from "vitest";

import { cabecalhoOSSchema, itemOSSchema, novaOSSchema } from "./schema";

/**
 * Schemas da Ordem de Serviço de pós-venda (Sprint 4.6).
 *
 * As decisões que este arquivo trava:
 *
 * 1. a OS funciona SEM Troca — `trocaAntecipadaId` nulo é caminho normal;
 * 2. a criação exige ao menos um produto;
 * 3. quantidade é inteiro > 0 (zero não é item), ao contrário da Troca;
 * 4. diagnóstico e solução são opcionais na EXECUÇÃO — a exigência é da
 *    finalização, e mora no service (ADR-0420).
 */

const itemBase = {
  id: null,
  produtoId: "prod_1",
  descricaoManual: "",
  quantidade: 1,
  diagnosticoItem: "",
  solucaoItem: "",
};

const novaBase = {
  clienteId: "cli_1",
  trocaAntecipadaId: null,
  referencia: "Fechadura entrada social",
  responsavelId: null,
  relatoInicial: "",
  status: "ABERTA" as const,
  itens: [itemBase],
};

const cabecalhoBase = {
  referencia: "Fechadura entrada social",
  responsavelId: null,
  relatoInicial: "",
  status: "EM_ANALISE" as const,
  diagnosticoConclusao: "",
};

const caminhos = (r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[] }[] };
}) => (r.success ? [] : (r.error?.issues ?? []).map((i) => i.path.join(".")));

describe("novaOSSchema", () => {
  /** O ponto central do módulo: a OS existe sem Troca. */
  it("aceita OS DIRETA, sem vínculo com troca", () => {
    const r = novaOSSchema.safeParse(novaBase);
    expect(r.success).toBe(true);
    expect(r.data?.trocaAntecipadaId).toBeNull();
  });

  it("aceita OS com vínculo opcional a uma troca", () => {
    expect(
      novaOSSchema.safeParse({ ...novaBase, trocaAntecipadaId: "troca_1" })
        .success,
    ).toBe(true);
  });

  it("exige cliente e referência", () => {
    expect(
      caminhos(novaOSSchema.safeParse({ ...novaBase, clienteId: "" })),
    ).toContain("clienteId");
    expect(
      caminhos(novaOSSchema.safeParse({ ...novaBase, referencia: " " })),
    ).toContain("referencia");
  });

  /**
   * Uma OS de pós-venda nasce porque ALGO chegou para análise. Sem produto ela
   * não descreve trabalho nenhum.
   */
  it("exige pelo menos um produto na criação", () => {
    const r = novaOSSchema.safeParse({ ...novaBase, itens: [] });
    expect(r.success).toBe(false);
    expect(caminhos(r)).toContain("itens");
  });

  it("aceita vários produtos", () => {
    expect(
      novaOSSchema.safeParse({
        ...novaBase,
        itens: [
          itemBase,
          {
            ...itemBase,
            produtoId: null,
            descricaoManual: "Fechadura antiga do hall",
            quantidade: 2,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("recusa status fora do enum", () => {
    expect(
      novaOSSchema.safeParse({ ...novaBase, status: "PARADA" }).success,
    ).toBe(false);
  });
});

describe("cabecalhoOSSchema", () => {
  it("aceita o cabeçalho com diagnóstico geral opcional", () => {
    expect(cabecalhoOSSchema.safeParse(cabecalhoBase).success).toBe(true);
    expect(
      cabecalhoOSSchema.safeParse({
        ...cabecalhoBase,
        diagnosticoConclusao: "Falha mecânica do mecanismo interno.",
      }).success,
    ).toBe(true);
  });

  /**
   * O vínculo com a Troca é fato histórico, não campo editável (ADR-0419):
   * torná-lo mutável faria o snapshot dos itens deixar de corresponder à troca
   * apontada. O schema nem o declara — e o Zod o descarta.
   */
  it("descarta cliente e vínculo enviados na edição", () => {
    const r = cabecalhoOSSchema.safeParse({
      ...cabecalhoBase,
      clienteId: "outro",
      trocaAntecipadaId: "outra_troca",
    });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty("clienteId");
    expect(r.data).not.toHaveProperty("trocaAntecipadaId");
  });
});

describe("itemOSSchema", () => {
  it("aceita produto do cadastro e produto manual", () => {
    expect(itemOSSchema.safeParse(itemBase).success).toBe(true);
    expect(
      itemOSSchema.safeParse({
        ...itemBase,
        produtoId: null,
        descricaoManual: "Fechadura antiga do hall",
      }).success,
    ).toBe(true);
  });

  it("recusa item sem produto e sem descrição (regra XOR)", () => {
    const r = itemOSSchema.safeParse({
      ...itemBase,
      produtoId: null,
      descricaoManual: "   ",
    });
    expect(r.success).toBe(false);
    expect(caminhos(r)).toContain("descricaoManual");
  });

  /** Diferente da Troca: zero é um estado real lá, aqui não é item. */
  it("recusa quantidade zero", () => {
    const r = itemOSSchema.safeParse({ ...itemBase, quantidade: 0 });
    expect(r.success).toBe(false);
    expect(caminhos(r)).toContain("quantidade");
  });

  it.each([-1, 1.5])("recusa quantidade %s", (quantidade) => {
    expect(itemOSSchema.safeParse({ ...itemBase, quantidade }).success).toBe(
      false,
    );
  });

  /**
   * Durante a execução, o produto é cadastrado ANTES de ser analisado. Exigir
   * diagnóstico aqui inverteria a ordem em que o trabalho acontece; a exigência
   * é da finalização (ADR-0420) e mora no service.
   */
  it("aceita item sem diagnóstico nem solução", () => {
    expect(
      itemOSSchema.safeParse({
        ...itemBase,
        diagnosticoItem: "",
        solucaoItem: "",
      }).success,
    ).toBe(true);
  });

  it("aceita diagnóstico e solução preenchidos", () => {
    expect(
      itemOSSchema.safeParse({
        ...itemBase,
        diagnosticoItem: "Falha mecânica do mecanismo interno.",
        solucaoItem: "Substituição do conjunto e testes.",
      }).success,
    ).toBe(true);
  });
});
