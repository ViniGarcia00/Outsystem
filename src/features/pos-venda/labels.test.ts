import { describe, expect, it } from "vitest";

import {
  CATEGORIAS_CUSTO,
  CATEGORIAS_CUSTO_OS,
  CATEGORIAS_CUSTO_TROCA,
  CATEGORIA_CUSTO_LABEL,
  DESTINATARIO_LABEL,
  DESTINATARIO_ORDER,
  ORIGEM_OS_LABEL,
  STATUS_OS_BADGE,
  STATUS_OS_LABEL,
  STATUS_OS_ORDER,
  STATUS_TROCA_BADGE,
  STATUS_TROCA_LABEL,
  STATUS_TROCA_ORDER,
  exigeDestinatarioNome,
  origemDe,
  rotuloOrigem,
} from "./labels";

/**
 * Rótulos do Pós-venda (Sprint 4.6).
 *
 * Os textos são requisito de produto (spec §11 e §34), não detalhe estético —
 * por isso são afirmados literalmente. Um rótulo trocado por engano passaria
 * despercebido em qualquer outro teste.
 */

describe("status da Troca Antecipada", () => {
  it("tem exatamente os sete estados da spec, nesta ordem", () => {
    expect(STATUS_TROCA_ORDER).toEqual([
      "ABERTA",
      "ENVIO_PENDENTE",
      "DEVOLUCAO_PENDENTE",
      "EM_ANALISE",
      "VALOR_PENDENTE",
      "FINALIZADA",
      "CANCELADA",
    ]);
  });

  it("usa os rótulos aprovados", () => {
    expect(STATUS_TROCA_LABEL).toEqual({
      ABERTA: "Aberta",
      ENVIO_PENDENTE: "Envio pendente",
      DEVOLUCAO_PENDENTE: "Devolução pendente",
      EM_ANALISE: "Em análise",
      VALOR_PENDENTE: "Valor pendente",
      FINALIZADA: "Finalizada",
      CANCELADA: "Cancelada",
    });
  });

  it("todo status tem rótulo e cor", () => {
    for (const s of STATUS_TROCA_ORDER) {
      expect(STATUS_TROCA_LABEL[s], s).toBeTruthy();
      expect(STATUS_TROCA_BADGE[s], s).toBeTruthy();
    }
  });

  /** ADR-0159: verde = ok, vermelho = fim. */
  it("segue o padrão semântico de cor do projeto", () => {
    expect(STATUS_TROCA_BADGE.FINALIZADA).toBe("success");
    expect(STATUS_TROCA_BADGE.CANCELADA).toBe("danger");
  });
});

describe("status da Ordem de Serviço", () => {
  it("tem exatamente os sete estados da spec, nesta ordem", () => {
    expect(STATUS_OS_ORDER).toEqual([
      "ABERTA",
      "AGUARDANDO_ANALISE",
      "EM_ANALISE",
      "EM_MANUTENCAO",
      "AGUARDANDO_PECA",
      "FINALIZADA",
      "CANCELADA",
    ]);
  });

  it("usa os rótulos aprovados", () => {
    expect(STATUS_OS_LABEL).toEqual({
      ABERTA: "Aberta",
      AGUARDANDO_ANALISE: "Aguardando análise",
      EM_ANALISE: "Em análise",
      EM_MANUTENCAO: "Em manutenção",
      AGUARDANDO_PECA: "Aguardando peça",
      FINALIZADA: "Finalizada",
      CANCELADA: "Cancelada",
    });
  });

  it("todo status tem rótulo e cor", () => {
    for (const s of STATUS_OS_ORDER) {
      expect(STATUS_OS_LABEL[s], s).toBeTruthy();
      expect(STATUS_OS_BADGE[s], s).toBeTruthy();
    }
  });

  it("segue o padrão semântico de cor do projeto", () => {
    expect(STATUS_OS_BADGE.FINALIZADA).toBe("success");
    expect(STATUS_OS_BADGE.CANCELADA).toBe("danger");
  });

  /**
   * Os dois conjuntos SÃO diferentes. Se alguém um dia colar um por cima do
   * outro "para simplificar", este teste avisa: a Troca fala de devolução, a OS
   * fala de conserto.
   */
  it("não é o mesmo conjunto da Troca", () => {
    expect(STATUS_OS_ORDER).not.toEqual(STATUS_TROCA_ORDER);
  });
});

describe("destinatário", () => {
  it("tem os três tipos, nesta ordem", () => {
    expect(DESTINATARIO_ORDER).toEqual(["CLIENTE", "INSTALADOR", "OUTRO"]);
    expect(DESTINATARIO_LABEL).toEqual({
      CLIENTE: "Cliente",
      INSTALADOR: "Instalador",
      OUTRO: "Outro",
    });
  });

  it("só CLIENTE dispensa o nome — os outros não têm de onde tirá-lo", () => {
    expect(exigeDestinatarioNome("CLIENTE")).toBe(false);
    expect(exigeDestinatarioNome("INSTALADOR")).toBe(true);
    expect(exigeDestinatarioNome("OUTRO")).toBe(true);
  });
});

describe("origem da OS (derivada, ADR-0419)", () => {
  it("sem vínculo é DIRETA", () => {
    expect(origemDe(null)).toBe("DIRETA");
  });

  it("com vínculo é TROCA_ANTECIPADA", () => {
    expect(origemDe("troca_1")).toBe("TROCA_ANTECIPADA");
  });

  /**
   * String vazia é `falsy` e cai em DIRETA de propósito: um id vazio não é um
   * vínculo, e tratá-lo como tal produziria um link para lugar nenhum.
   */
  it("id vazio não é vínculo", () => {
    expect(origemDe("")).toBe("DIRETA");
  });

  it("o rótulo da listagem traz o NÚMERO da Troca, não o id", () => {
    expect(rotuloOrigem(null)).toBe("Direta");
    expect(rotuloOrigem(1001)).toBe("Troca 1001");
  });

  it("expõe os dois rótulos de origem", () => {
    expect(ORIGEM_OS_LABEL).toEqual({
      DIRETA: "Direta",
      TROCA_ANTECIPADA: "Troca antecipada",
    });
  });
});

describe("categorias de custo", () => {
  it("toda categoria da enum tem rótulo", () => {
    for (const c of CATEGORIAS_CUSTO) {
      expect(CATEGORIA_CUSTO_LABEL[c], c).toBeTruthy();
    }
    expect(Object.keys(CATEGORIA_CUSTO_LABEL).sort()).toEqual(
      [...CATEGORIAS_CUSTO].sort(),
    );
  });

  /**
   * A Troca oferece custos de ENVIO; a OS, de REPARO (ADR-0418). São as duas
   * listas que substituem duas enums no banco — se elas se fundirem, a Troca
   * passa a oferecer "Peça" e a separação some sem ninguém notar.
   */
  it("a Troca oferece as categorias de envio da spec §14", () => {
    expect(CATEGORIAS_CUSTO_TROCA).toEqual([
      "MOTOBOY",
      "SEDEX",
      "FRETE",
      "VISITA",
      "OUTROS",
    ]);
  });

  it("a OS oferece as categorias de reparo da spec §36", () => {
    expect(CATEGORIAS_CUSTO_OS).toEqual([
      "PECA",
      "FRETE",
      "TERCEIRIZACAO",
      "MATERIAL",
      "OUTROS",
    ]);
  });

  it("as duas listas são subconjuntos da enum canônica", () => {
    for (const c of [...CATEGORIAS_CUSTO_TROCA, ...CATEGORIAS_CUSTO_OS]) {
      expect(CATEGORIAS_CUSTO, c).toContain(c);
    }
  });

  it("as listas são diferentes — a separação por processo é o ponto", () => {
    expect(CATEGORIAS_CUSTO_TROCA).not.toEqual(CATEGORIAS_CUSTO_OS);
    expect(CATEGORIAS_CUSTO_TROCA).not.toContain("PECA");
    expect(CATEGORIAS_CUSTO_OS).not.toContain("MOTOBOY");
  });

  it("as duas juntas cobrem a enum inteira — nenhum valor fica inalcançável", () => {
    const oferecidas = new Set([
      ...CATEGORIAS_CUSTO_TROCA,
      ...CATEGORIAS_CUSTO_OS,
    ]);
    expect([...oferecidas].sort()).toEqual([...CATEGORIAS_CUSTO].sort());
  });
});
