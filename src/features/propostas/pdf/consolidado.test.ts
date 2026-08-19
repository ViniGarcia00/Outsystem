import { describe, expect, it } from "vitest";

import type { PdfItem, PdfSecao } from "@/services/proposta-pdf.mapper";

import { consolidarProdutos } from "./consolidado";

function item(
  codigo: string,
  quantidade: number,
  extra: Partial<PdfItem> = {},
): PdfItem {
  return {
    produtoId: `prod-${codigo}`,
    tipo: "PRODUTO",
    codigo,
    descricao: `Produto ${codigo}`,
    unidade: "UN",
    quantidade,
    valorProduto: 100,
    valorServico: 25,
    totalProduto: 100 * quantidade,
    totalServico: 25 * quantidade,
    totalLinha: 125 * quantidade,
    ...extra,
  };
}

const secao = (nome: string, itens: PdfItem[]): PdfSecao => ({ nome, itens });
const dto = (...secoes: PdfSecao[]) => ({ secoes });

describe("consolidarProdutos — agrupamento", () => {
  it("um produto, uma linha", () => {
    const r = consolidarProdutos(dto(secao("Sala", [item("INT-04", 2)])));
    expect(r).toEqual([
      {
        codigo: "INT-04",
        descricao: "Produto INT-04",
        unidade: "UN",
        quantidade: 2,
      },
    ]);
  });

  it("mesmo produto em DUAS seções vira uma linha somada", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [item("INT-04", 2)]),
        secao("Suíte", [item("INT-04", 4)]),
      ),
    );
    expect(r).toHaveLength(1);
    expect(r[0].quantidade).toBe(6);
  });

  it("mesmo produto repetido várias vezes soma tudo", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [item("INT-04", 2), item("INT-04", 1)]),
        secao("Suíte", [item("INT-04", 4)]),
        secao("Cozinha", [item("INT-04", 3)]),
      ),
    );
    expect(r).toHaveLength(1);
    expect(r[0].quantidade).toBe(10);
  });

  it("vários produtos, o exemplo da especificação", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [item("INT-04", 2), item("TOM-01", 3)]),
        secao("Suíte", [item("INT-04", 4)]),
        secao("Cozinha", [item("TOM-01", 2)]),
      ),
    );
    expect(r.map((p) => [p.codigo, p.quantidade])).toEqual([
      ["INT-04", 6],
      ["TOM-01", 5],
    ]);
  });

  it("soma quantidades fracionárias sem erro de ponto flutuante", () => {
    // Cabo, metros, litros — a coluna é Decimal(12,3).
    const r = consolidarProdutos(
      dto(secao("Sala", [item("CAB-01", 0.1), item("CAB-01", 0.2)])),
    );
    expect(r[0].quantidade).toBe(0.3);
  });
});

describe("consolidarProdutos — identidade", () => {
  it("agrupa por produtoId mesmo com SKU divergente no snapshot", () => {
    // O SKU do item é snapshot; se o cadastro mudou, duas linhas do MESMO
    // produto teriam códigos diferentes. produtoId é a identidade estável.
    const r = consolidarProdutos(
      dto(
        secao("Sala", [item("INT-04", 2, { produtoId: "p1" })]),
        secao("Suíte", [item("INT-04-NOVO", 4, { produtoId: "p1" })]),
      ),
    );
    expect(r).toHaveLength(1);
    expect(r[0].quantidade).toBe(6);
    // Rótulos vêm da primeira ocorrência.
    expect(r[0].codigo).toBe("INT-04");
  });

  it("sem produtoId, o fallback agrupa pelo SKU normalizado", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [item("int-04", 2, { produtoId: null })]),
        secao("Suíte", [item("INT-04", 4, { produtoId: null })]),
      ),
    );
    expect(r).toHaveLength(1);
    expect(r[0].quantidade).toBe(6);
  });

  it("produtos DIFERENTES com descrições parecidas não se misturam", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [
          item("INT-04", 2, {
            produtoId: "p1",
            descricao: "Interruptor Inteligente 4 teclas",
          }),
          item("INT-06", 3, {
            produtoId: "p2",
            descricao: "Interruptor Inteligente 4 teclas branco",
          }),
        ]),
      ),
    );
    expect(r).toHaveLength(2);
    expect(r.map((p) => p.quantidade)).toEqual([2, 3]);
  });

  it("SKUs iguais e produtoId diferentes NÃO se fundem", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [
          item("DUP", 2, { produtoId: "p1" }),
          item("DUP", 3, { produtoId: "p2" }),
        ]),
      ),
    );
    expect(r).toHaveLength(2);
  });
});

describe("consolidarProdutos — exclusões", () => {
  it("itens de SERVIÇO não aparecem", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [
          item("INT-04", 2),
          item("SRV-01", 9, { tipo: "SERVICO", produtoId: null }),
        ]),
      ),
    );
    expect(r.map((p) => p.codigo)).toEqual(["INT-04"]);
  });

  it("item sem `tipo` é tratado como PRODUTO (compatibilidade)", () => {
    const r = consolidarProdutos(
      dto(secao("Sala", [item("INT-04", 2, { tipo: undefined })])),
    );
    expect(r).toHaveLength(1);
  });

  it("Som e Wi-Fi não entram — o documento nem lê dto.servicos", () => {
    // Serviços complementares vivem em `dto.servicos`, fora de `secoes`. A
    // assinatura só aceita `secoes`, então não há como vazarem; este teste
    // trava a decisão contra uma futura ampliação distraída.
    const entrada = {
      secoes: [secao("Sala", [item("INT-04", 2)])],
      servicos: [
        { tipo: "SOM" as const, descricao: "Som Ambiente", valorTotal: 5000 },
        { tipo: "WIFI" as const, descricao: "Wi-Fi Premium", valorTotal: 3000 },
      ],
    };
    const r = consolidarProdutos(entrada);
    expect(r).toHaveLength(1);
    expect(JSON.stringify(r)).not.toMatch(/SOM|WIFI|Som|Wi-Fi/);
  });

  it("nenhum valor financeiro aparece no resultado", () => {
    const r = consolidarProdutos(dto(secao("Sala", [item("INT-04", 2)])));
    expect(Object.keys(r[0])).toEqual([
      "codigo",
      "descricao",
      "unidade",
      "quantidade",
    ]);
  });
});

describe("consolidarProdutos — ordenação e bordas", () => {
  it("ordena por SKU, independentemente da ordem de entrada", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [item("TOM-01", 1), item("ABC-99", 1)]),
        secao("Suíte", [item("INT-04", 1)]),
      ),
    );
    expect(r.map((p) => p.codigo)).toEqual(["ABC-99", "INT-04", "TOM-01"]);
  });

  it("ordem de entrada diferente produz resultado idêntico", () => {
    const a = consolidarProdutos(
      dto(
        secao("Sala", [item("INT-04", 2), item("TOM-01", 3)]),
        secao("Suíte", [item("INT-04", 4)]),
      ),
    );
    const b = consolidarProdutos(
      dto(
        secao("Cozinha", [item("TOM-01", 3)]),
        secao("Suíte", [item("INT-04", 4)]),
        secao("Sala", [item("INT-04", 2)]),
      ),
    );
    expect(a).toEqual(b);
  });

  it("desempata por descrição quando o SKU é o mesmo", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [
          item("DUP", 1, { produtoId: "p2", descricao: "Zebra" }),
          item("DUP", 1, { produtoId: "p1", descricao: "Alfa" }),
        ]),
      ),
    );
    expect(r.map((p) => p.descricao)).toEqual(["Alfa", "Zebra"]);
  });

  it("proposta sem produtos devolve lista vazia", () => {
    expect(consolidarProdutos(dto())).toEqual([]);
    expect(consolidarProdutos(dto(secao("Sala", [])))).toEqual([]);
  });

  it("proposta só com serviços devolve lista vazia", () => {
    const r = consolidarProdutos(
      dto(
        secao("Sala", [item("SRV-01", 3, { tipo: "SERVICO", produtoId: null })]),
      ),
    );
    expect(r).toEqual([]);
  });
});
