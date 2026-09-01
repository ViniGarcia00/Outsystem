import { describe, expect, it } from "vitest";

import {
  DEVOLVIDA_MAIOR_QUE_ESPERADA,
  QUANTIDADE_INVALIDA,
  QUANTIDADE_OS_INVALIDA,
  descricaoDoItem,
  ehInteiro,
  itemIdentificado,
  itensParaOS,
  pendenteDoItem,
  retornoDaTroca,
  rotuloRetorno,
  temPendencia,
  validarQuantidadeOS,
  validarQuantidadesTroca,
} from "./itens";

/**
 * Regras puras dos itens do Pós-venda (Sprint 4.6).
 *
 * Os dois casos do briefing viram teste literalmente: a **fechadura** (1 / 1 /
 * 0) e os **interruptores** (7 / 7 / 5 → 7 / 7 / 7). Não é decoração — são as
 * duas formas do processo, e é neles que a aritmética do retorno precisa estar
 * certa.
 */

const item = (esperada: number, devolvida: number) => ({
  quantidadeEsperadaRetorno: esperada,
  quantidadeDevolvida: devolvida,
});

describe("pendenteDoItem", () => {
  it("fechadura: 1 esperada, 0 devolvida -> 1 pendente", () => {
    expect(pendenteDoItem(item(1, 0))).toBe(1);
  });

  it("interruptores: 7 esperadas, 5 devolvidas -> 2 pendentes", () => {
    expect(pendenteDoItem(item(7, 5))).toBe(2);
  });

  it("retorno completo zera a pendência", () => {
    expect(pendenteDoItem(item(7, 7))).toBe(0);
  });

  it("nada esperado, nada pendente", () => {
    expect(pendenteDoItem(item(0, 0))).toBe(0);
  });

  /**
   * O service recusa `devolvida > esperada`, mas dado antigo, importação futura
   * ou uma `esperada` REDUZIDA depois da devolução produziriam negativo. "Faltam
   * -2 peças" não é informação que sirva a alguém.
   */
  it("nunca devolve negativo, mesmo com devolvida acima da esperada", () => {
    expect(pendenteDoItem(item(5, 7))).toBe(0);
  });
});

describe("retornoDaTroca", () => {
  it("soma as quantidades de vários itens", () => {
    const r = retornoDaTroca([item(1, 0), item(7, 5), item(2, 2)]);
    expect(r).toEqual({ devolvido: 7, esperado: 10, pendente: 3 });
  });

  it("troca sem itens tem retorno 0/0 e nada pendente", () => {
    expect(retornoDaTroca([])).toEqual({
      devolvido: 0,
      esperado: 0,
      pendente: 0,
    });
  });

  /**
   * A pendência TOTAL é `esperado - devolvido` sobre as somas, não a soma das
   * pendências por item. As duas divergem quando um item tem devolvida acima da
   * esperada: item(5,7) + item(3,0) daria 3 por item, e 1 pelo total. O total é
   * o número que a Troca deve ao mundo — é o que a listagem mostra.
   */
  it("o total nunca é negativo", () => {
    expect(retornoDaTroca([item(5, 7), item(3, 0)]).pendente).toBe(1);
  });
});

describe("rotuloRetorno", () => {
  it.each([
    [[item(1, 0)], "0/1"],
    [[item(7, 5)], "5/7"],
    [[item(7, 7)], "7/7"],
    [[item(1, 1), item(7, 6)], "7/8"],
    [[], "0/0"],
  ])("%o -> %s", (itens, esperado) => {
    expect(rotuloRetorno(itens)).toBe(esperado);
  });
});

describe("temPendencia", () => {
  it("acusa pendência quando QUALQUER item ainda deve retorno", () => {
    expect(temPendencia([item(1, 1), item(7, 5)])).toBe(true);
  });

  it("não acusa quando tudo voltou", () => {
    expect(temPendencia([item(1, 1), item(7, 7)])).toBe(false);
  });

  /**
   * Finalizar uma Troca SEM itens é legítimo: o substituto foi enviado, o
   * defeituoso ficou com o cliente por acordo, e ninguém chegou a cadastrar
   * item. Não há nada esperado, logo não há confirmação forte a exigir.
   */
  it("troca sem itens não tem pendência", () => {
    expect(temPendencia([])).toBe(false);
  });
});

describe("itemIdentificado (regra XOR)", () => {
  it("aceita item com produto do cadastro", () => {
    expect(
      itemIdentificado({ produtoId: "prod_1", descricaoManual: null }),
    ).toBe(true);
  });

  it("aceita item só com descrição manual", () => {
    expect(
      itemIdentificado({ produtoId: null, descricaoManual: "Fechadura antiga" }),
    ).toBe(true);
  });

  it("recusa item sem produto e sem descrição", () => {
    expect(itemIdentificado({ produtoId: null, descricaoManual: null })).toBe(
      false,
    );
  });

  it("recusa descrição composta só de espaços", () => {
    expect(itemIdentificado({ produtoId: null, descricaoManual: "   " })).toBe(
      false,
    );
    expect(itemIdentificado({ produtoId: "   ", descricaoManual: "" })).toBe(
      false,
    );
  });

  it("aceita os dois preenchidos — a regra proíbe VAZIO, não coexistência", () => {
    expect(
      itemIdentificado({ produtoId: "prod_1", descricaoManual: "sem etiqueta" }),
    ).toBe(true);
  });
});

describe("descricaoDoItem", () => {
  it("mostra código e descrição do cadastro", () => {
    expect(
      descricaoDoItem({
        produtoCodigo: "FEC-01",
        produtoDescricao: "Fechadura eletrônica",
      }),
    ).toBe("FEC-01 — Fechadura eletrônica");
  });

  it("mostra a descrição manual quando não há produto", () => {
    expect(descricaoDoItem({ descricaoManual: "Fechadura antiga do hall" })).toBe(
      "Fechadura antiga do hall",
    );
  });

  it("preserva os dois: apagar o que o usuário digitou seria pior", () => {
    expect(
      descricaoDoItem({
        produtoCodigo: "FEC-01",
        produtoDescricao: "Fechadura eletrônica",
        descricaoManual: "sem etiqueta",
      }),
    ).toBe("FEC-01 — Fechadura eletrônica (sem etiqueta)");
  });

  it("cai no travessão quando não há nada", () => {
    expect(descricaoDoItem({})).toBe("—");
  });
});

describe("ehInteiro", () => {
  it.each([
    [0, true],
    [7, true],
    [-3, true],
    [1.5, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
  ])("%s -> %s", (valor, esperado) => {
    expect(ehInteiro(valor)).toBe(esperado);
  });
});

describe("validarQuantidadesTroca", () => {
  it("aceita o caso da fechadura", () => {
    expect(
      validarQuantidadesTroca({
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      }),
    ).toBeNull();
  });

  it("aceita o retorno parcial dos interruptores", () => {
    expect(
      validarQuantidadesTroca({
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      }),
    ).toBeNull();
  });

  it("aceita zeros", () => {
    expect(
      validarQuantidadesTroca({
        quantidadeEnviada: 0,
        quantidadeEsperadaRetorno: 0,
        quantidadeDevolvida: 0,
      }),
    ).toBeNull();
  });

  it("recusa fração", () => {
    expect(
      validarQuantidadesTroca({
        quantidadeEnviada: 1.5,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      }),
    ).toBe(QUANTIDADE_INVALIDA);
  });

  it("recusa negativo", () => {
    expect(
      validarQuantidadesTroca({
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: -1,
        quantidadeDevolvida: 0,
      }),
    ).toBe(QUANTIDADE_INVALIDA);
  });

  it("recusa devolvida acima da esperada", () => {
    expect(
      validarQuantidadesTroca({
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 8,
      }),
    ).toBe(DEVOLVIDA_MAIOR_QUE_ESPERADA);
  });

  /**
   * Enviado e esperado são eixos INDEPENDENTES: enviar 1 substituto e esperar
   * 0 de volta é o caso em que o defeituoso fica com o cliente por acordo.
   */
  it("não compara devolvida com ENVIADA", () => {
    expect(
      validarQuantidadesTroca({
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 5,
        quantidadeDevolvida: 5,
      }),
    ).toBeNull();
  });

  it("a mensagem de tipo vem antes da de comparação", () => {
    expect(
      validarQuantidadesTroca({
        quantidadeEnviada: 0,
        quantidadeEsperadaRetorno: 1.5,
        quantidadeDevolvida: 9,
      }),
    ).toBe(QUANTIDADE_INVALIDA);
  });
});

describe("validarQuantidadeOS", () => {
  it("aceita inteiro positivo", () => {
    expect(validarQuantidadeOS(7)).toBeNull();
  });

  it("recusa zero — item de OS com quantidade zero não é item", () => {
    expect(validarQuantidadeOS(0)).toBe(QUANTIDADE_OS_INVALIDA);
  });

  it.each([-1, 1.5, Number.NaN])("recusa %s", (valor) => {
    expect(validarQuantidadeOS(valor)).toBe(QUANTIDADE_OS_INVALIDA);
  });
});

describe("itensParaOS (snapshot Troca -> OS)", () => {
  it("copia o produtoId real e usa a quantidade DEVOLVIDA", () => {
    expect(
      itensParaOS([
        {
          produtoId: "prod_fechadura",
          descricaoManual: null,
          quantidadeEsperadaRetorno: 1,
          quantidadeDevolvida: 1,
        },
      ]),
    ).toEqual([
      { produtoId: "prod_fechadura", descricaoManual: null, quantidade: 1 },
    ]);
  });

  it("interruptores 7/7/5 viram UM item de OS com quantidade 5", () => {
    expect(
      itensParaOS([
        {
          produtoId: "prod_interruptor",
          descricaoManual: null,
          quantidadeEsperadaRetorno: 7,
          quantidadeDevolvida: 5,
        },
      ]),
    ).toEqual([
      { produtoId: "prod_interruptor", descricaoManual: null, quantidade: 5 },
    ]);
  });

  it("item MANUAL leva a descrição", () => {
    expect(
      itensParaOS([
        {
          produtoId: null,
          descricaoManual: "Fechadura antiga sem cadastro",
          quantidadeEsperadaRetorno: 1,
          quantidadeDevolvida: 1,
        },
      ]),
    ).toEqual([
      {
        produtoId: null,
        descricaoManual: "Fechadura antiga sem cadastro",
        quantidade: 1,
      },
    ]);
  });

  it("item com devolvida = 0 NÃO é copiado", () => {
    expect(
      itensParaOS([
        {
          produtoId: "a",
          descricaoManual: null,
          quantidadeEsperadaRetorno: 3,
          quantidadeDevolvida: 0,
        },
        {
          produtoId: "b",
          descricaoManual: null,
          quantidadeEsperadaRetorno: 3,
          quantidadeDevolvida: 2,
        },
      ]),
    ).toEqual([{ produtoId: "b", descricaoManual: null, quantidade: 2 }]);
  });

  it("nenhum item devolvido devolve lista vazia (quem recusa é o service)", () => {
    expect(
      itensParaOS([
        {
          produtoId: "a",
          descricaoManual: null,
          quantidadeEsperadaRetorno: 3,
          quantidadeDevolvida: 0,
        },
      ]),
    ).toEqual([]);
  });

  it("não muta a entrada — o snapshot é uma cópia", () => {
    const original = [
      {
        produtoId: "a",
        descricaoManual: null,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
    ];
    const copia = itensParaOS(original);
    copia[0].quantidade = 99;
    expect(original[0].quantidadeDevolvida).toBe(5);
  });
});
