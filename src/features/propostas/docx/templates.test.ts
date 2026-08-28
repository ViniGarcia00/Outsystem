import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  TEMPLATES_CONTRATO,
  TEMPLATE_CONTRATO_PADRAO,
  TEMPLATE_CONTRATO_VIGENTE,
  ehVersaoConhecida,
  resolverVersaoTemplate,
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

describe("resolverVersaoTemplate", () => {
  it("devolve a versão quando ela é conhecida", () => {
    expect(resolverVersaoTemplate("rev3")).toBe("rev3");
    expect(resolverVersaoTemplate("rev4")).toBe("rev4");
  });

  it("cai no padrão histórico para nulo, vazio ou desconhecido", () => {
    for (const v of [null, undefined, "", "rev99", "REV4", " rev4 "]) {
      expect(resolverVersaoTemplate(v)).toBe(TEMPLATE_CONTRATO_PADRAO);
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
