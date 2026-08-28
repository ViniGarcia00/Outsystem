import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  TEMPLATES_CONTRATO,
  TEMPLATE_CONTRATO_PADRAO,
  TEMPLATE_CONTRATO_VIGENTE,
  ehVersaoConhecida,
  resolverVersaoTemplateContrato,
  templateDe,
  type VersaoTemplateContrato,
} from "./templates";

/**
 * Catálogo de versões do template de contrato (Sprint 4.4, ADR-0415).
 *
 * O que estes testes protegem não é o mapa em si — é a promessa do ADR: nenhuma
 * versão some, o fallback histórico é estável, e o arquivo declarado existe de
 * verdade no repositório.
 */

const DIR = path.join(process.cwd(), "public", "templates", "contrato");

describe("catálogo de templates", () => {
  it("conhece rev3 e rev4", () => {
    expect(Object.keys(TEMPLATES_CONTRATO).sort()).toEqual(["rev3", "rev4"]);
  });

  /**
   * "Templates antigos nunca são apagados" (ADR-0415). Uma versão que suma do
   * catálogo faz contratos já emitidos caírem no fallback e mudarem de texto —
   * exatamente o defeito que a Sprint veio corrigir.
   */
  it("rev3 permanece no catálogo — versões nunca são removidas", () => {
    expect(TEMPLATES_CONTRATO.rev3).toBeDefined();
  });

  it.each(Object.entries(TEMPLATES_CONTRATO))(
    "o arquivo declarado por %s existe no repositório",
    (_versao, meta) => {
      expect(existsSync(path.join(DIR, meta.arquivo))).toBe(true);
    },
  );

  it.each(Object.entries(TEMPLATES_CONTRATO))(
    "%s declara uma data de vigência ISO",
    (_versao, meta) => {
      expect(meta.vigenteDe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    },
  );

  it("cada versão tem arquivo próprio — nenhuma sobrescreve outra", () => {
    const arquivos = Object.values(TEMPLATES_CONTRATO).map((t) => t.arquivo);
    expect(new Set(arquivos).size).toBe(arquivos.length);
  });

  it("rev4 acrescenta tags à rev3, sem remover nenhuma", () => {
    for (const tag of TEMPLATES_CONTRATO.rev3.tags) {
      expect(TEMPLATES_CONTRATO.rev4.tags).toContain(tag);
    }
    expect(TEMPLATES_CONTRATO.rev4.tags.length).toBeGreaterThan(
      TEMPLATES_CONTRATO.rev3.tags.length,
    );
  });

  it("só a rev4 exige os campos contratuais novos", () => {
    expect(TEMPLATES_CONTRATO.rev3.exigeCamposContratuais).toBe(false);
    expect(TEMPLATES_CONTRATO.rev4.exigeCamposContratuais).toBe(true);
  });
});

describe("versão vigente e padrão", () => {
  it("a vigente é uma versão do catálogo", () => {
    expect(TEMPLATES_CONTRATO[TEMPLATE_CONTRATO_VIGENTE]).toBeDefined();
  });

  /**
   * O padrão é o que revisões SEM carimbo assumem. Mudá-lo reescreveria o texto
   * de todo contrato histórico de uma vez — por isso é travado aqui.
   */
  it("o padrão histórico é rev3 e não muda", () => {
    expect(TEMPLATE_CONTRATO_PADRAO).toBe("rev3");
  });
});

/**
 * A regra corrigida na T15.1 (ADR-0415). A ausência de carimbo tem DOIS
 * significados, e trata-los como um so fazia um rascunho pre-visualizar a rev3
 * e emitir a rev4 -- dois textos juridicos na mesma sessao.
 */
describe("resolverVersaoTemplateContrato", () => {
  const EMITIDA = new Date("2026-07-20T12:00:00Z");

  it("1. carimbada rev3 + emitida -> rev3", () => {
    expect(
      resolverVersaoTemplateContrato({
        templateContratoVersao: "rev3",
        emittedAt: EMITIDA,
      }),
    ).toBe("rev3");
  });

  it("2. carimbada rev4 + emitida -> rev4", () => {
    expect(
      resolverVersaoTemplateContrato({
        templateContratoVersao: "rev4",
        emittedAt: EMITIDA,
      }),
    ).toBe("rev4");
  });

  it("3. SEM carimbo + emitida -> rev3 (historica, anterior a coluna)", () => {
    expect(
      resolverVersaoTemplateContrato({
        templateContratoVersao: null,
        emittedAt: EMITIDA,
      }),
    ).toBe("rev3");
  });

  it("4. SEM carimbo + NAO emitida -> a VIGENTE (rascunho)", () => {
    expect(
      resolverVersaoTemplateContrato({
        templateContratoVersao: null,
        emittedAt: null,
      }),
    ).toBe(TEMPLATE_CONTRATO_VIGENTE);
  });

  it("o carimbo manda mesmo em revisao nao emitida", () => {
    expect(
      resolverVersaoTemplateContrato({
        templateContratoVersao: "rev3",
        emittedAt: null,
      }),
    ).toBe("rev3");
  });

  it("versao desconhecida cai na mesma regra do nulo", () => {
    for (const v of ["", "rev99", "REV4", " rev4 ", undefined]) {
      expect(
        resolverVersaoTemplateContrato({ templateContratoVersao: v, emittedAt: EMITIDA }),
      ).toBe(TEMPLATE_CONTRATO_PADRAO);
      expect(
        resolverVersaoTemplateContrato({ templateContratoVersao: v, emittedAt: null }),
      ).toBe(TEMPLATE_CONTRATO_VIGENTE);
    }
  });

  /**
   * O ponto da correcao: rascunho e revisao historica NAO podem resolver igual.
   * Se um dia os dois voltarem a coincidir, este teste falha.
   */
  it("rascunho e historica resolvem DIFERENTE enquanto a vigente nao for rev3", () => {
    const rascunho = resolverVersaoTemplateContrato({
      templateContratoVersao: null,
      emittedAt: null,
    });
    const historica = resolverVersaoTemplateContrato({
      templateContratoVersao: null,
      emittedAt: EMITIDA,
    });
    expect(historica).toBe("rev3");
    expect(rascunho).toBe(TEMPLATE_CONTRATO_VIGENTE);
    if (TEMPLATE_CONTRATO_VIGENTE !== "rev3") {
      expect(rascunho).not.toBe(historica);
    }
  });
});

describe("ehVersaoConhecida", () => {
  it("aceita só o que está no catálogo", () => {
    expect(ehVersaoConhecida("rev3")).toBe(true);
    expect(ehVersaoConhecida("rev4")).toBe(true);
    for (const v of ["rev5", "", null, undefined, 4, {}]) {
      expect(ehVersaoConhecida(v)).toBe(false);
    }
  });
});

describe("templateDe", () => {
  it("devolve os metadados da versão", () => {
    const v: VersaoTemplateContrato = "rev4";
    expect(templateDe(v).arquivo).toBe("contrato-outmat.rev4.docx");
    expect(templateDe(v).vigenteDe).toBe("2026-08-28");
  });
});
