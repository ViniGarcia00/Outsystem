import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  TEMPLATE_CONTRATO_VIGENTE,
  resolverVersaoTemplateContrato,
} from "@/features/propostas/docx/templates";
import { prisma } from "@/infrastructure/database";

import {
  criarPropostaCompleta,
  duplicarProposta,
  emitirProposta,
  cancelarProposta,
  salvarProposta,
  type NovaPropostaPayload,
} from "./proposta.service";

/**
 * Ciclo de revisão da Proposta — CARACTERIZAÇÃO (Sprint 4.3, T2).
 *
 * Estes testes foram escritos **antes** da troca do gatilho do fork e passam
 * contra as duas versões de propósito. Eles não descrevem comportamento novo:
 * fixam o comportamento **atual** para que a refatoração da T2 —
 * `status === "EMITIDA"` → `currentRevision.emittedAt != null` — seja provada
 * neutra. Escrever um teste vermelho aqui exigiria inventar um comportamento
 * que ainda não existe (ADR-0412).
 *
 * O que eles travam é a equivalência que autoriza a troca: em **todo estado
 * alcançável**, "a revisão atual está congelada" e "o status é EMITIDA" são a
 * mesma coisa. Quando `APROVADA` entrar (T4), a equivalência se rompe — e é
 * exatamente por isso que o gatilho precisa ser o congelamento, não o status.
 *
 * Por que INTEGRAÇÃO e não unidade: o fork é uma transação que cria linha, move
 * `currentRevisionId` e apaga seções em cascata. Com Prisma mockado o teste
 * provaria que o mock foi chamado, o que seria verdade também na versão que
 * sobrescreve a revisão congelada — o defeito que a T2 previne.
 *
 * Dados marcados com `E2E ` — o mesmo marcador que o `globalTeardown` do
 * Playwright varre —, então um teste interrompido no meio não deixa rastro.
 */

const MARCA = `E2E Revisao ${Date.now()}`;

let clienteId: string;
let produtoId: string;
const propostasCriadas: string[] = [];

/** Payload mínimo válido: uma seção, um item — o bastante para emitir. */
function payload(nomeSecao = "Sala", quantidade = 1): NovaPropostaPayload {
  return {
    clienteId,
    vendedorId: null,
    modelo: "COMERCIAL",
    validadeDias: 5,
    obsInternas: null,
    obsProposta: null,
    secoes: [{ nome: nomeSecao, itens: [{ produtoId, quantidade }] }],
  };
}

async function novaProposta(): Promise<string> {
  const { id } = await criarPropostaCompleta(payload());
  propostasCriadas.push(id);
  return id;
}

/** Estado que os testes inspecionam: status + revisão atual. */
async function estado(id: string) {
  return prisma.proposta.findUniqueOrThrow({
    where: { id },
    select: {
      status: true,
      currentRevisionId: true,
      currentRevision: {
        select: { id: true, revisionNumber: true, emittedAt: true },
      },
    },
  });
}

beforeAll(async () => {
  const cliente = await prisma.cliente.create({
    data: { nome: `${MARCA} Cliente`, tipoPessoa: "PF" },
    select: { id: true },
  });
  clienteId = cliente.id;

  const produto = await prisma.produto.create({
    data: {
      codigo: `E2E-REV-${Date.now()}`,
      descricao: `${MARCA} Produto`,
      unidade: "UN",
      valorProduto: 100,
      valorServico: 50,
    },
    select: { id: true },
  });
  produtoId = produto.id;
});

afterAll(async () => {
  // Ordem obrigatória: PropostaItem.produtoId é RESTRICT, então as propostas
  // (que levam revisões, seções e itens em cascata) saem antes do produto.
  if (propostasCriadas.length) {
    await prisma.proposta.deleteMany({ where: { id: { in: propostasCriadas } } });
  }
  if (produtoId) await prisma.produto.deleteMany({ where: { id: produtoId } });
  if (clienteId) await prisma.cliente.deleteMany({ where: { id: clienteId } });
});

describe("revisão em RASCUNHO — não congelada", () => {
  it("nasce com Rev.0 e emittedAt nulo", async () => {
    const id = await novaProposta();
    const e = await estado(id);

    expect(e.status).toBe("RASCUNHO");
    expect(e.currentRevision?.revisionNumber).toBe(0);
    expect(e.currentRevision?.emittedAt).toBeNull();
  });

  it("salvar NÃO cria revisão nova — edita a mesma, in-place", async () => {
    const id = await novaProposta();
    const antes = await estado(id);

    const r = await salvarProposta(id, payload("Cozinha"));

    expect(r.forked).toBe(false);
    expect(r.revisaoAtual).toBe(0);

    const depois = await estado(id);
    expect(depois.currentRevisionId).toBe(antes.currentRevisionId);
    expect(depois.status).toBe("RASCUNHO");

    // Editar in-place é o comportamento CERTO aqui: a revisão não está
    // congelada. É o mesmo `deleteMany` que seria um defeito sobre uma revisão
    // emitida ou aprovada.
    const secoes = await prisma.propostaSecao.findMany({
      where: { revisaoId: antes.currentRevisionId! },
      select: { nome: true },
    });
    expect(secoes.map((s) => s.nome)).toEqual(["Cozinha"]);
  });
});

describe("revisão EMITIDA — congelada", () => {
  it("emitir carimba emittedAt na revisão e emitidaAt na proposta", async () => {
    const id = await novaProposta();
    await emitirProposta(id);

    const e = await estado(id);
    expect(e.status).toBe("EMITIDA");
    expect(e.currentRevision?.emittedAt).toBeInstanceOf(Date);

    const p = await prisma.proposta.findUniqueOrThrow({
      where: { id },
      select: { emitidaAt: true },
    });
    expect(p.emitidaAt).toBeInstanceOf(Date);
  });

  it("salvar FORKA: cria Rev.1, torna-a atual e volta a RASCUNHO", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    const antes = await estado(id);

    const r = await salvarProposta(id, payload("Cozinha"));

    expect(r.forked).toBe(true);
    expect(r.revisaoAtual).toBe(1);
    expect(r.status).toBe("RASCUNHO");

    const depois = await estado(id);
    expect(depois.status).toBe("RASCUNHO");
    expect(depois.currentRevisionId).not.toBe(antes.currentRevisionId);
    expect(depois.currentRevision?.revisionNumber).toBe(1);
    expect(depois.currentRevision?.emittedAt).toBeNull();
  });

  it("a revisão emitida sobrevive à edição, com emittedAt e conteúdo intactos", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    const antes = await estado(id);
    const revEmitidaId = antes.currentRevisionId!;

    await salvarProposta(id, payload("Cozinha"));

    const rev = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: revEmitidaId },
      select: {
        emittedAt: true,
        secoes: { select: { nome: true } },
      },
    });
    expect(rev.emittedAt).toEqual(antes.currentRevision?.emittedAt);
    expect(rev.secoes.map((s) => s.nome)).toEqual(["Sala"]);
  });

  it("registra NOVA_REVISAO e MUDANCA_STATUS na mesma operação", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    await salvarProposta(id, payload("Cozinha"));

    const eventos = await prisma.propostaAuditoria.findMany({
      where: { propostaId: id },
      select: { evento: true },
    });
    expect(eventos.map((e) => e.evento)).toEqual(
      expect.arrayContaining(["NOVA_REVISAO", "MUDANCA_STATUS"]),
    );
  });
});

describe("proposta CANCELADA", () => {
  it("recusa o salvamento", async () => {
    const id = await novaProposta();
    await cancelarProposta(id, "CLIENTE_DESISTIU");

    await expect(salvarProposta(id, payload("Cozinha"))).rejects.toThrow(
      /cancelada/i,
    );
  });
});

/**
 * A equivalência que autoriza a troca do gatilho (T2).
 *
 * Enquanto só existem RASCUNHO, EMITIDA e CANCELADA, "revisão atual congelada"
 * e "status EMITIDA" apontam para o mesmo conjunto de propostas. Trocar a
 * condição é, portanto, neutro — e este bloco é a prova.
 *
 * O bloco também documenta por que a troca é NECESSÁRIA: assim que `APROVADA`
 * existir (T4), uma proposta aprovada terá `emittedAt != null` com status
 * diferente de `EMITIDA`, e a condição antiga deixaria de proteger a revisão.
 */
describe("congelamento e status são equivalentes nos estados de hoje", () => {
  it("RASCUNHO ⟺ revisão atual não congelada", async () => {
    const id = await novaProposta();
    const e = await estado(id);

    expect(e.status === "EMITIDA").toBe(false);
    expect(e.currentRevision?.emittedAt != null).toBe(false);
  });

  it("EMITIDA ⟺ revisão atual congelada", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    const e = await estado(id);

    expect(e.status === "EMITIDA").toBe(true);
    expect(e.currentRevision?.emittedAt != null).toBe(true);
  });

  it("depois do fork, os dois voltam a ser falsos juntos", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    await salvarProposta(id, payload("Cozinha"));
    const e = await estado(id);

    expect(e.status === "EMITIDA").toBe(false);
    expect(e.currentRevision?.emittedAt != null).toBe(false);
  });
});

/**
 * Campos contratuais do contrato Rev. 4 (Sprint 4.4, T8 — ADR-0416).
 *
 * Persistência, duplicação e o comportamento no fork. O último bloco é o que
 * mais importa: ele **documenta a dívida** registrada no ADR-0415, em vez de
 * deixar a surpresa para quem for mexer depois.
 */
describe("campos contratuais da Rev. 4", () => {
  const comContratuais = (over: Partial<NovaPropostaPayload> = {}) => ({
    ...payload(),
    prazoExecucaoDiasUteis: 30,
    valorParcelaFinal: 12345.67,
    observacoesAceite: "Entrega parcial acordada.",
    ...over,
  });

  const lerContratuais = (id: string) =>
    prisma.proposta.findUniqueOrThrow({
      where: { id },
      select: {
        prazoExecucaoDiasUteis: true,
        valorParcelaFinal: true,
        observacoesAceite: true,
      },
    });

  it("a criação persiste os três", async () => {
    const { id } = await criarPropostaCompleta(comContratuais());
    propostasCriadas.push(id);

    const p = await lerContratuais(id);
    expect(p.prazoExecucaoDiasUteis).toBe(30);
    expect(Number(p.valorParcelaFinal!.toString())).toBe(12345.67);
    expect(p.observacoesAceite).toBe("Entrega parcial acordada.");
  });

  it("a proposta existe sem eles — são opcionais no cadastro", async () => {
    const id = await novaProposta();

    const p = await lerContratuais(id);
    expect(p.prazoExecucaoDiasUteis).toBeNull();
    expect(p.valorParcelaFinal).toBeNull();
    expect(p.observacoesAceite).toBeNull();
  });

  it("salvar atualiza os três", async () => {
    const id = await novaProposta();

    await salvarProposta(id, comContratuais({ prazoExecucaoDiasUteis: 45 }));

    const p = await lerContratuais(id);
    expect(p.prazoExecucaoDiasUteis).toBe(45);
    expect(Number(p.valorParcelaFinal!.toString())).toBe(12345.67);
  });

  it("o valor é Decimal — 0,1 + 0,2 não vira 0,30000000000000004", async () => {
    const { id } = await criarPropostaCompleta(
      comContratuais({ valorParcelaFinal: 0.3 }),
    );
    propostasCriadas.push(id);

    const p = await lerContratuais(id);
    expect(p.valorParcelaFinal!.toString()).toBe("0.3");
  });

  it("duplicar COPIA os três — são condições comerciais, como formaPagamento", async () => {
    const { id } = await criarPropostaCompleta(comContratuais());
    propostasCriadas.push(id);

    const nova = await duplicarProposta(id);
    propostasCriadas.push(nova.id);

    const p = await lerContratuais(nova.id);
    expect(p.prazoExecucaoDiasUteis).toBe(30);
    expect(Number(p.valorParcelaFinal!.toString())).toBe(12345.67);
    expect(p.observacoesAceite).toBe("Entrega parcial acordada.");
  });

  it("alterar um deles numa revisão congelada FORKA, como qualquer edição", async () => {
    const { id } = await criarPropostaCompleta(comContratuais());
    propostasCriadas.push(id);
    await emitirProposta(id);
    const antes = await estado(id);

    const r = await salvarProposta(id, comContratuais({ prazoExecucaoDiasUteis: 60 }));

    expect(r.forked).toBe(true);
    expect(r.status).toBe("RASCUNHO");
    const depois = await estado(id);
    expect(depois.currentRevisionId).not.toBe(antes.currentRevisionId);
  });

  /**
   * ⚠️ DÍVIDA TÉCNICA DOCUMENTADA (ADR-0415), não um defeito desta Sprint.
   *
   * Estes campos vivem na `Proposta`, não na `PropostaRevisao` — como
   * `formaPagamento`, desconto e frete desde sempre. O fork cria a revisão nova,
   * mas o cabeçalho é **sobrescrito**: a revisão emitida NÃO preserva o valor da
   * época.
   *
   * Não gera documento errado hoje, porque só se gera contrato da revisão
   * ATUAL. O teste existe para que a limitação fique **pinada e visível** — se
   * alguém um dia mover os campos para a revisão, ele falha e obriga a revisitar
   * a decisão conscientemente.
   */
  it("o valor NÃO é histórico por revisão — a revisão emitida não guarda o antigo", async () => {
    const { id } = await criarPropostaCompleta(
      comContratuais({ prazoExecucaoDiasUteis: 30 }),
    );
    propostasCriadas.push(id);
    await emitirProposta(id);
    const revEmitidaId = (await estado(id)).currentRevisionId!;

    await salvarProposta(id, comContratuais({ prazoExecucaoDiasUteis: 60 }));

    // O conteúdo da revisão emitida continua intacto...
    const rev = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: revEmitidaId },
      select: { emittedAt: true, templateContratoVersao: true },
    });
    expect(rev.emittedAt).toBeInstanceOf(Date);
    expect(rev.templateContratoVersao).toBe(TEMPLATE_CONTRATO_VIGENTE);

    // ...mas o campo de cabeçalho foi sobrescrito. É a dívida do ADR-0415.
    expect((await lerContratuais(id)).prazoExecucaoDiasUteis).toBe(60);
  });
});

/**
 * Versionamento do template de contrato (Sprint 4.4, T5 — ADR-0415).
 *
 * O defeito que isto previne: o contrato era gerado com o arquivo que
 * estivesse no disco, então trocar o template reescrevia o texto jurídico de
 * qualquer contrato regenerado depois. A garantia é que a versão fica presa à
 * revisão no instante em que ela congela.
 *
 * Por que INTEGRAÇÃO: o carimbo acontece dentro da transação de
 * `emitirProposta`, junto do `emittedAt`, e o que se quer provar é o estado
 * PERSISTIDO depois do fork — nenhuma das duas coisas um mock alcança.
 */
describe("versão do template de contrato", () => {
  it("revisão nunca emitida não tem versão carimbada", async () => {
    const id = await novaProposta();
    const e = await estado(id);

    const rev = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: e.currentRevisionId! },
      select: { templateContratoVersao: true, emittedAt: true },
    });
    expect(rev.emittedAt).toBeNull();
    expect(rev.templateContratoVersao).toBeNull();
  });

  it("emitir carimba a versão VIGENTE, junto do emittedAt", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    const e = await estado(id);

    const rev = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: e.currentRevisionId! },
      select: { templateContratoVersao: true, emittedAt: true },
    });
    expect(rev.emittedAt).toBeInstanceOf(Date);
    expect(rev.templateContratoVersao).toBe(TEMPLATE_CONTRATO_VIGENTE);
  });

  /**
   * O coração do ADR-0415. Depois do fork, a revisão emitida tem de continuar
   * apontando para a MESMA versão de template — senão regenerar o contrato dela
   * mudaria o texto jurídico.
   */
  it("o fork preserva a versão da revisão anterior e a nova nasce sem carimbo", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    const antes = await estado(id);
    const revEmitidaId = antes.currentRevisionId!;

    const versaoAntes = (
      await prisma.propostaRevisao.findUniqueOrThrow({
        where: { id: revEmitidaId },
        select: { templateContratoVersao: true },
      })
    ).templateContratoVersao;
    expect(versaoAntes).toBe(TEMPLATE_CONTRATO_VIGENTE);

    await salvarProposta(id, payload("Cozinha"));

    // A revisão emitida: intacta.
    const revAntiga = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: revEmitidaId },
      select: { templateContratoVersao: true, emittedAt: true },
    });
    expect(revAntiga.templateContratoVersao).toBe(versaoAntes);
    expect(revAntiga.emittedAt).toBeInstanceOf(Date);

    // A revisão nova: sem carimbo, porque ainda não foi emitida.
    const depois = await estado(id);
    expect(depois.currentRevisionId).not.toBe(revEmitidaId);
    const revNova = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: depois.currentRevisionId! },
      select: { templateContratoVersao: true, emittedAt: true },
    });
    expect(revNova.emittedAt).toBeNull();
    expect(revNova.templateContratoVersao).toBeNull();
  });

  it("emitir a revisão nova carimba de novo, sem tocar na anterior", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    const rev0 = (await estado(id)).currentRevisionId!;

    await salvarProposta(id, payload("Cozinha"));
    await emitirProposta(id);
    const rev1 = (await estado(id)).currentRevisionId!;

    const linhas = await prisma.propostaRevisao.findMany({
      where: { id: { in: [rev0, rev1] } },
      select: { id: true, revisionNumber: true, templateContratoVersao: true },
      orderBy: { revisionNumber: "asc" },
    });
    expect(linhas).toHaveLength(2);
    expect(linhas[0].templateContratoVersao).toBe(TEMPLATE_CONTRATO_VIGENTE);
    expect(linhas[1].templateContratoVersao).toBe(TEMPLATE_CONTRATO_VIGENTE);
  });

  /**
   * As 11 revisões que já existiam quando a coluna foi criada ficaram nulas, e o
   * renderer resolve isso como `rev3`. O teste prova a ponta do meio: uma
   * revisão nula continua nula, e a resolução acontece na leitura.
   */
  it("revisão histórica sem carimbo resolve para o padrão rev3", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    const e = await estado(id);

    // Simula a revisão antiga, anterior à Sprint 4.4.
    await prisma.propostaRevisao.update({
      where: { id: e.currentRevisionId! },
      data: { templateContratoVersao: null },
    });

    const rev = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: e.currentRevisionId! },
      select: { templateContratoVersao: true },
    });
    expect(rev.templateContratoVersao).toBeNull();
    // Emitida sem carimbo = histórica -> rev3. Um rascunho (emittedAt nulo)
    // resolveria para a VIGENTE, e é essa distinção que a T15.1 corrigiu.
    expect(
      resolverVersaoTemplateContrato({
        templateContratoVersao: rev.templateContratoVersao,
        emittedAt: new Date(),
      }),
    ).toBe("rev3");
  });

  it("duplicar gera Rev.0 sem carimbo — a cópia ainda não foi emitida", async () => {
    const id = await novaProposta();
    await emitirProposta(id);

    const nova = await duplicarProposta(id);
    propostasCriadas.push(nova.id);

    const e = await estado(nova.id);
    const rev = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: e.currentRevisionId! },
      select: { templateContratoVersao: true, emittedAt: true },
    });
    expect(rev.emittedAt).toBeNull();
    expect(rev.templateContratoVersao).toBeNull();
  });
});

/**
 * Estrutura da aprovação (T3) — só a migration, ainda sem service.
 *
 * O service de aprovar/desfazer chega na T4. Aqui a escrita é direta pelo
 * Prisma de propósito: o que está sob teste é a **migration**, não a regra.
 */
describe("estrutura de aprovação (migration)", () => {
  it("revisão nasce com aprovadaEm nulo", async () => {
    const id = await novaProposta();
    const e = await estado(id);

    const rev = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: e.currentRevisionId! },
      select: { aprovadaEm: true },
    });
    expect(rev.aprovadaEm).toBeNull();
  });

  it("o enum aceita APROVADA e a coluna aceita data", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    const e = await estado(id);

    const agora = new Date();
    await prisma.propostaRevisao.update({
      where: { id: e.currentRevisionId! },
      data: { aprovadaEm: agora },
    });
    await prisma.proposta.update({
      where: { id },
      data: { status: "APROVADA" },
    });

    const depois = await estado(id);
    expect(depois.status).toBe("APROVADA");

    const rev = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: e.currentRevisionId! },
      select: { aprovadaEm: true },
    });
    expect(rev.aprovadaEm).toEqual(agora);
  });

  it("aprovadaEm é limpável — é o que 'Desfazer aprovação' fará na T4", async () => {
    const id = await novaProposta();
    await emitirProposta(id);
    const e = await estado(id);

    await prisma.propostaRevisao.update({
      where: { id: e.currentRevisionId! },
      data: { aprovadaEm: new Date() },
    });
    await prisma.propostaRevisao.update({
      where: { id: e.currentRevisionId! },
      data: { aprovadaEm: null },
    });

    const rev = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: e.currentRevisionId! },
      select: { aprovadaEm: true },
    });
    expect(rev.aprovadaEm).toBeNull();
  });
});
