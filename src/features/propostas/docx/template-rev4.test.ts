import { readFileSync } from "node:fs";
import path from "node:path";

import PizZip from "pizzip";
import { describe, expect, it } from "vitest";

import type { ContratoTemplateDTO } from "./contrato.mapper";
import { renderContratoDocx } from "./render";
import { TEMPLATES_CONTRATO, type VersaoTemplateContrato } from "./templates";

/**
 * Integridade dos templates por VERSÃO (Sprint 4.4, ADR-0415/0416).
 *
 * Substitui a abordagem por CONTAGEM FIXA de placeholders da Sprint 3.1: um
 * teste que afirma "existem 2 [Nº]" quebra a cada revisão do jurídico sem
 * detectar nada de útil. Aqui as asserções são SEMÂNTICAS — a tag existe, está
 * inteira, e o texto crítico é o que foi aprovado.
 */

const DIR = path.join(process.cwd(), "public", "templates", "contrato");

function documentXml(versao: VersaoTemplateContrato): string {
  const arquivo = new PizZip(
    readFileSync(path.join(DIR, TEMPLATES_CONTRATO[versao].arquivo)),
  ).file("word/document.xml");
  if (!arquivo) throw new Error(`word/document.xml ausente em ${versao}`);
  return arquivo.asText();
}

const conta = (s: string, sub: string) => s.split(sub).length - 1;

const VERSOES = Object.keys(TEMPLATES_CONTRATO) as VersaoTemplateContrato[];

/**
 * Vale para TODA versão, presente e futura: se o jurídico entregar uma rev5, ela
 * herda estas garantias só por entrar no catálogo.
 */
describe.each(VERSOES)("template %s — garantias comuns", (versao) => {
  it("contém todas as tags que o catálogo declara", () => {
    const xml = documentXml(versao);
    for (const tag of TEMPLATES_CONTRATO[versao].tags) {
      expect(xml).toContain(`{${tag}}`);
    }
  });

  it("não contém tag que o catálogo não declare", () => {
    const encontradas = new Set(
      [...documentXml(versao).matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(
        (m) => m[1],
      ),
    );
    for (const t of encontradas) {
      expect(TEMPLATES_CONTRATO[versao].tags).toContain(t);
    }
  });

  /**
   * A garantia que o diff de texto NÃO mostra e que quebra o docxtemplater: uma
   * tag partida entre dois `<w:r>` nunca é substituída, e o contrato sai com
   * `{clienteNome}` literal no lugar do nome.
   */
  it("toda tag está INTEIRA dentro de um único <w:t>", () => {
    const xml = documentXml(versao);
    const noXml = [...xml.matchAll(/\{[a-zA-Z][a-zA-Z0-9]*\}/g)].length;
    const emT = [
      ...[...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((m) => m[1])
        .join(" ")
        .matchAll(/\{[a-zA-Z][a-zA-Z0-9]*\}/g),
    ].length;

    expect(emT).toBe(noXml);
    expect(noXml).toBeGreaterThan(0);
  });

  it("as chaves estão balanceadas — sinal de tag partida", () => {
    const xml = documentXml(versao);
    expect(conta(xml, "{")).toBe(conta(xml, "}"));
  });
});

/**
 * A Rev. 4 eliminou o ÚLTIMO placeholder manual. Nenhum campo do contrato é
 * preenchido no Word — e nenhum realce amarelo sobra sinalizando o contrário.
 */
describe("template rev4 — nenhum preenchimento manual", () => {
  it.each(["[Nº]", "[VALOR]", "[se houver]"])(
    "não contém o placeholder manual %s",
    (ph) => {
      expect(conta(documentXml("rev4"), ph)).toBe(0);
    },
  );

  it("não sobrou nenhum realce amarelo", () => {
    expect(conta(documentXml("rev4"), "<w:highlight ")).toBe(0);
  });

  it("as três tags novas usam o estilo homologado de dado variável", () => {
    const xml = documentXml("rev4");
    const runs = [...xml.matchAll(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g)].map((m) => m[0]);
    for (const tag of ["{prazoExecucao}", "{valorParcelaFinal}", "{observacoes}"]) {
      const run = runs.find((r) => r.includes(tag));
      expect(run, `run de ${tag}`).toBeDefined();
      expect(run).toContain('<w:color w:val="3C77FF"/>');
      expect(run).toContain("<w:b/>");
      expect(run).not.toContain("<w:highlight ");
    }
  });
});

/**
 * Texto jurídico crítico. Aqui o teste é literal de propósito: estas frases são
 * decisão comercial registrada em ADR, e mudá-las tem de ser um ato deliberado
 * que quebra o build — nunca um efeito colateral.
 */
describe("template rev4 — cláusulas críticas", () => {
  it("9.2 — multa de rescisão em 20% sobre o saldo do contrato", () => {
    const xml = documentXml("rev4");
    expect(xml).toContain("20% (vinte por cento)");
    expect(xml).toContain(" sobre o saldo do contrato");
  });

  it("8.1 — multa de inadimplência PERMANECE em 2%", () => {
    expect(documentXml("rev4")).toContain("multa de 2% sobre o valor em aberto");
  });

  it("3.1 — início contado da autorização formal, sem data fixa", () => {
    const xml = documentXml("rev4");
    expect(xml).toContain("O início dos serviços não depende de data previamente fixada");
    expect(xml).toContain("em até 10 (dez) dias úteis contados da autorização formal");
    expect(xml).toContain("comunicação de liberação do local prevista na Cláusula 5.6");
  });

  it.each(["5.3.1.", "5.5.1.", "5.6.", "5.7.", "5.7.1.", "9.3.", "9.4."])(
    "contém a cláusula %s introduzida na Rev. 4",
    (clausula) => {
      expect(documentXml("rev4")).toContain(clausula);
    },
  );

  it("5.7 — visita improdutiva custa R$ 300,00 por técnico", () => {
    expect(documentXml("rev4")).toContain(
      "R$ 300,00 (trezentos reais) por técnico deslocado",
    );
  });
});

// ---------------------------------------------------------------------------
// Renderização por versão — o documento ENTREGUE
// ---------------------------------------------------------------------------

const DTO: ContratoTemplateDTO = {
  clienteNome: "ACME COMÉRCIO LTDA",
  clienteDocumento: "12.345.678/0001-90",
  clienteEndereco: "Rua X, 123, Centro, Curitiba/PR, CEP 80000-000",
  propostaNumero: "1042",
  valorTotal: "12.345,67",
  valorTotalExtenso:
    "doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos",
  formaPagamento: "50% de entrada\n50% na conclusão",
  data: "28 de agosto de 2026",
  empresaNome: "Outmat",
  prazoExecucao: "30",
  valorParcelaFinal: "3.000,00",
  observacoes: "Entrega parcial acordada.",
};

/** Texto corrido do .docx gerado. */
function textoDe(buffer: Buffer): string {
  const arquivo = new PizZip(buffer).file("word/document.xml");
  if (!arquivo) throw new Error("word/document.xml ausente no .docx gerado");
  return [...arquivo.asText().matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join("");
}

describe.each(VERSOES)("contrato %s entregue", (versao) => {
  const texto = () => textoDe(renderContratoDocx(DTO, versao));

  it("não deixa nenhuma tag {..} por resolver", () => {
    expect(texto()).not.toMatch(/[{}]/);
  });

  it("não escreve 'undefined' nem 'null'", () => {
    const t = texto();
    expect(t).not.toContain("undefined");
    expect(t).not.toContain("null");
  });

  it("preenche os campos comuns", () => {
    const t = texto();
    expect(t).toContain("ACME COMÉRCIO LTDA");
    expect(t).toContain("valor total de R$ 12.345,67");
    expect(t).not.toContain("R$ R$");
  });
});

describe("contrato rev4 entregue — variáveis novas", () => {
  const texto = (over: Partial<ContratoTemplateDTO> = {}) =>
    textoDe(renderContratoDocx({ ...DTO, ...over }, "rev4"));

  /**
   * `textoDe` concatena os `<w:t>`, então estas asserções provam a EMENDA entre
   * runs — uma unidade duplicada ou um "R$" a mais apareceria aqui, e não no
   * teste do template, que olha o XML cru.
   */
  it("3.1 — o prazo emenda com 'dias úteis' do template, sem duplicar", () => {
    expect(texto()).toContain("no prazo estimado de 30 dias úteis");
  });

  it("Anexo II — a parcela emenda com o 'R$' do template, sem duplicar", () => {
    const t = texto();
    expect(t).toContain("parcela final de R$ 3.000,00");
    expect(t).not.toContain("R$ R$");
  });

  it("Anexo II — as observações entram no lugar do antigo [se houver]", () => {
    expect(texto()).toContain("Observações: Entrega parcial acordada.");
  });

  it("observações vazias não deixam lixo — só o rótulo", () => {
    expect(texto({ observacoes: "" })).toContain("Observações: ");
  });

  it("nenhum placeholder manual chega ao documento entregue", () => {
    const t = texto();
    for (const ph of ["[Nº]", "[VALOR]", "[se houver]"]) {
      expect(t).not.toContain(ph);
    }
  });
});

/**
 * A garantia central do ADR-0415, provada no documento gerado: as duas versões
 * produzem textos jurídicos DIFERENTES a partir do mesmo DTO. É isso que torna
 * o carimbo por revisão necessário — e não apenas uma boa ideia.
 */
describe("as duas versões produzem contratos diferentes", () => {
  it("só a rev4 traz as cláusulas novas", () => {
    const rev3 = textoDe(renderContratoDocx(DTO, "rev3"));
    const rev4 = textoDe(renderContratoDocx(DTO, "rev4"));

    expect(rev4).toContain("Consideram-se atendidas as condições de execução");
    expect(rev3).not.toContain("Consideram-se atendidas as condições de execução");
  });

  it("a rev3 continua com os placeholders manuais dela", () => {
    const rev3 = textoDe(renderContratoDocx(DTO, "rev3"));
    expect(rev3).toContain("[Nº]");
    expect(rev3).toContain("[VALOR]");
  });

  /**
   * O renderer NÃO resolve mais versão — ele recebe uma concreta e escolhe o
   * arquivo. A decisão rev3 x rev4 (carimbo, histórico, rascunho) é testada em
   * `templates.test.ts`, no `resolverVersaoTemplateContrato`.
   */
  it("cada versão abre o arquivo declarado no catálogo", () => {
    expect(textoDe(renderContratoDocx(DTO, "rev3"))).not.toBe(
      textoDe(renderContratoDocx(DTO, "rev4")),
    );
  });
});
