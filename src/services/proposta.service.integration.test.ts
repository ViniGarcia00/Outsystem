import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/infrastructure/database";

import {
  criarPropostaCompleta,
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
