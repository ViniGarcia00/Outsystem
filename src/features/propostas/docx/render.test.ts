import { readFileSync } from "node:fs";
import path from "node:path";

import PizZip from "pizzip";
import { describe, expect, it } from "vitest";

import type { ContratoTemplateDTO } from "./contrato.mapper";
import { INSTRUCAO_FORMA_PAGAMENTO } from "./contrato.mapper";
import { renderContratoDocx } from "./render";

/**
 * Renderização do contrato. O renderer não tem regra de negócio: recebe o
 * ContratoTemplateDTO pronto e só troca placeholder por valor.
 */

const DTO: ContratoTemplateDTO = {
  clienteNome: "ACME COMÉRCIO LTDA",
  clienteDocumento: "12.345.678/0001-90",
  clienteEndereco: "Rua X, 123, Centro, Curitiba/PR, CEP 80000-000",
  propostaNumero: "1042",
  valorTotal: "12.345,67",
  valorTotalExtenso:
    "doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos",
  formaPagamento: "50% de entrada\n50% na conclusão",
  data: "17 de julho de 2026",
  empresaNome: "Outmat",
};

/** Texto corrido do .docx, concatenando os <w:t>. */
function textoDe(buffer: Buffer): string {
  const arquivo = new PizZip(buffer).file("word/document.xml");
  if (!arquivo) throw new Error("word/document.xml não encontrado no .docx gerado");
  return [...arquivo.asText().matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join("");
}

const conta = (s: string, sub: string) => s.split(sub).length - 1;

describe("renderContratoDocx", () => {
  it("gera um .docx válido (zip com word/document.xml)", () => {
    const buffer = renderContratoDocx(DTO);
    expect(buffer.length).toBeGreaterThan(0);
    expect(new PizZip(buffer).file("word/document.xml")).toBeTruthy();
  });

  it("preenche todos os campos do DTO", () => {
    const texto = textoDe(renderContratoDocx(DTO));
    expect(texto).toContain("ACME COMÉRCIO LTDA");
    expect(texto).toContain("12.345.678/0001-90");
    expect(texto).toContain("Rua X, 123, Centro, Curitiba/PR, CEP 80000-000");
    expect(texto).toContain("17 de julho de 2026");
  });

  it("não deixa nenhuma tag {..} por resolver nem escreve 'undefined'", () => {
    const texto = textoDe(renderContratoDocx(DTO));
    expect(texto).not.toMatch(/[{}]/);
    expect(texto).not.toContain("undefined");
  });

  it("não duplica o R$ da cláusula 2.1", () => {
    const texto = textoDe(renderContratoDocx(DTO));
    expect(texto).toContain("valor total de R$ 12.345,67");
    expect(texto).not.toContain("R$ R$");
  });

  it("põe o extenso dentro dos parênteses que o template já tem", () => {
    expect(textoDe(renderContratoDocx(DTO))).toContain(
      "(doze mil trezentos e quarenta e cinco reais e sessenta e sete centavos)",
    );
  });

  /**
   * "Nenhum placeholder restante" vale só para as tags {..}. Os [..] manuais
   * SÃO o resultado esperado (spec D3.1): prazo de conclusão, prazo de aceite e
   * parcela final são preenchidos no Word. Apagá-los seria o bug, não a correção.
   *
   * Eram 4. A Release 1.5.1 fixou o prazo de início (3.1) e a multa de rescisão
   * (9.2) como termo contratual, então sobraram 2.
   */
  it("preserva os campos de preenchimento manual", () => {
    const texto = textoDe(renderContratoDocx(DTO));
    expect(conta(texto, "[Nº]")).toBe(2);
    expect(texto).toContain("[VALOR]");
    expect(texto).toContain("[se houver]");
  });

  it("usa exclusivamente o DTO — trocar um campo muda só aquele texto", () => {
    const outro = textoDe(renderContratoDocx({ ...DTO, clienteNome: "OUTRO CLIENTE" }));
    expect(outro).toContain("OUTRO CLIENTE");
    expect(outro).not.toContain("ACME COMÉRCIO LTDA");
    // O resto do contrato não se move.
    expect(outro).toContain("valor total de R$ 12.345,67");
  });

  it("reexibe a instrução do template quando a forma de pagamento vem vazia", () => {
    const texto = textoDe(
      renderContratoDocx({ ...DTO, formaPagamento: INSTRUCAO_FORMA_PAGAMENTO }),
    );
    expect(texto).toContain("[DESCREVA AQUI A FORMA DE PAGAMENTO");
  });
});

/**
 * Termos fixados na Release 1.5.1, conferidos no documento ENTREGUE.
 *
 * `textoDe` concatena os `<w:t>`, então estas asserções provam mais do que a
 * presença do número: provam que os runs se juntam na frase certa. A multa
 * ocupa três runs ("… multa de " + "20% (vinte por cento)" + " sobre o saldo…")
 * e um "%" sobrando ou faltando na emenda apareceria aqui — não no teste do
 * template, que olha o XML cru.
 */
describe("contrato entregue — termos fixados (Release 1.5.1)", () => {
  const texto = () => textoDe(renderContratoDocx(DTO));

  it("9.2 — multa de rescisão de 20% sobre o saldo do contrato", () => {
    expect(texto()).toContain(
      "multa de 20% (vinte por cento) sobre o saldo do contrato",
    );
  });

  it("9.2 — não sobrou o '%' do antigo [Nº]%", () => {
    expect(texto()).not.toContain("(vinte por cento)%");
  });

  it("8.1 — multa de inadimplência PERMANECE em 2%", () => {
    expect(texto()).toContain("multa de 2% sobre o valor em aberto");
  });

  it("3.1 — início em até 10 (dez) dias úteis da autorização formal", () => {
    expect(texto()).toContain(
      "terão início em até 10 (dez) dias úteis contados da autorização " +
        "formal do CONTRATANTE",
    );
  });

  it("3.1 — declara que o início não depende de data previamente fixada", () => {
    expect(texto()).toContain(
      "O início dos serviços não depende de data previamente fixada",
    );
  });

  it("3.1 — define autorização formal sem contradizer a cláusula 2.2", () => {
    expect(texto()).toContain(
      "assim entendida a confirmação do pagamento previsto na Cláusula 2.2 " +
        "acompanhada da disponibilização do local em condições de execução",
    );
  });

  it("3.1 — o prazo de CONCLUSÃO continua manual", () => {
    expect(texto()).toContain("no prazo estimado de [Nº] dias úteis");
  });
});

describe("fallback da forma de pagamento", () => {
  it("INSTRUCAO_FORMA_PAGAMENTO é idêntica ao texto do template oficial", () => {
    // Se a proposta não tem forma de pagamento, o contrato deve reexibir a
    // instrução ORIGINAL do template (spec D5.3) — não uma paráfrase.
    const arquivo = new PizZip(
      readFileSync(
        path.join(
          process.cwd(),
          "public",
          "templates",
          "contrato",
          "contrato-outmat.oficial.docx",
        ),
      ),
    ).file("word/document.xml");
    if (!arquivo) throw new Error("template oficial ilegível");

    const runs = [...arquivo.asText().matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(
      (m) => m[1],
    );
    const instrucao = runs.find((r) =>
      r.startsWith("[DESCREVA AQUI A FORMA DE PAGAMENTO"),
    );
    expect(instrucao).toBeDefined();
    expect(INSTRUCAO_FORMA_PAGAMENTO).toBe(instrucao);
  });
});
