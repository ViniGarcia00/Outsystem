import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/infrastructure/database";

import {
  APROVAR_EXIGE_EMITIDA,
  DESFAZER_EXIGE_APROVADA,
  PROPOSTA_CANCELADA_APROVAR,
  aprovarProposta,
  cancelarProposta,
  criarPropostaCompleta,
  desfazerAprovacao,
  duplicarProposta,
  emitirProposta,
  salvarProposta,
  type NovaPropostaPayload,
} from "./proposta.service";

/**
 * Aprovação de Proposta (Sprint 4.3, T4/T5 — ADR-0412).
 *
 * Por que INTEGRAÇÃO: a aprovação escreve em DUAS tabelas na mesma transação
 * (`proposta_revisoes.aprovadaEm` e `propostas.status`) e as guardas são
 * condições sobre o estado persistido. Com Prisma mockado o teste provaria que o
 * mock foi chamado — o que seria verdade também numa implementação que gravasse
 * só uma das duas, ou que aprovasse um rascunho.
 *
 * Dados marcados com `E2E ` — o mesmo marcador do `globalTeardown`.
 */

const MARCA = `E2E Aprovacao ${Date.now()}`;

let clienteId: string;
let produtoId: string;
const propostasCriadas: string[] = [];

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

/** Proposta emitida — o único ponto de partida válido para aprovar. */
async function propostaEmitida(): Promise<string> {
  const id = await novaProposta();
  await emitirProposta(id);
  return id;
}

async function estado(id: string) {
  return prisma.proposta.findUniqueOrThrow({
    where: { id },
    select: {
      status: true,
      currentRevisionId: true,
      currentRevision: {
        select: { id: true, revisionNumber: true, emittedAt: true, aprovadaEm: true },
      },
    },
  });
}

/** Conteúdo comparável de uma revisão — para provar imutabilidade (T5). */
async function conteudoDaRevisao(revisaoId: string) {
  const secoes = await prisma.propostaSecao.findMany({
    where: { revisaoId },
    orderBy: { ordem: "asc" },
    select: {
      nome: true,
      ordem: true,
      itens: {
        orderBy: { ordem: "asc" },
        select: {
          codigo: true,
          descricao: true,
          unidade: true,
          valorProduto: true,
          valorServico: true,
          quantidade: true,
          ordem: true,
        },
      },
    },
  });
  // Decimal do Prisma não é comparável por igualdade estrutural — normaliza.
  return secoes.map((s) => ({
    nome: s.nome,
    ordem: s.ordem,
    itens: s.itens.map((i) => ({
      ...i,
      valorProduto: i.valorProduto.toString(),
      valorServico: i.valorServico.toString(),
      quantidade: i.quantidade.toString(),
    })),
  }));
}

beforeAll(async () => {
  const cliente = await prisma.cliente.create({
    data: { nome: `${MARCA} Cliente`, tipoPessoa: "PF" },
    select: { id: true },
  });
  clienteId = cliente.id;

  const produto = await prisma.produto.create({
    data: {
      codigo: `E2E-APR-${Date.now()}`,
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
  if (propostasCriadas.length) {
    await prisma.proposta.deleteMany({ where: { id: { in: propostasCriadas } } });
  }
  if (produtoId) await prisma.produto.deleteMany({ where: { id: produtoId } });
  if (clienteId) await prisma.cliente.deleteMany({ where: { id: clienteId } });
});

describe("aprovarProposta", () => {
  it("grava aprovadaEm na REVISÃO e projeta APROVADA na proposta", async () => {
    const id = await propostaEmitida();
    const antes = await estado(id);

    await aprovarProposta(id);

    const depois = await estado(id);
    expect(depois.status).toBe("APROVADA");
    expect(depois.currentRevision?.aprovadaEm).toBeInstanceOf(Date);
    // A revisão é a MESMA — aprovar não forka nem move o ponteiro.
    expect(depois.currentRevisionId).toBe(antes.currentRevisionId);
    // E continua congelada: aprovar não desfaz a emissão.
    expect(depois.currentRevision?.emittedAt).toEqual(
      antes.currentRevision?.emittedAt,
    );
  });

  it("recusa proposta em RASCUNHO — o cliente só aprova o que recebeu", async () => {
    const id = await novaProposta();
    await expect(aprovarProposta(id)).rejects.toThrow(APROVAR_EXIGE_EMITIDA);

    const e = await estado(id);
    expect(e.status).toBe("RASCUNHO");
    expect(e.currentRevision?.aprovadaEm).toBeNull();
  });

  it("recusa proposta CANCELADA", async () => {
    const id = await propostaEmitida();
    await cancelarProposta(id, "CLIENTE_DESISTIU");

    await expect(aprovarProposta(id)).rejects.toThrow(
      PROPOSTA_CANCELADA_APROVAR,
    );
  });

  it("recusa aprovar duas vezes", async () => {
    const id = await propostaEmitida();
    await aprovarProposta(id);

    await expect(aprovarProposta(id)).rejects.toThrow(APROVAR_EXIGE_EMITIDA);
  });

  it("audita MUDANCA_STATUS na mesma transação", async () => {
    const id = await propostaEmitida();
    await aprovarProposta(id);

    const trilha = await prisma.propostaAuditoria.findMany({
      where: { propostaId: id, evento: "MUDANCA_STATUS" },
      select: { observacao: true },
    });
    expect(trilha.map((t) => t.observacao)).toContain("EMITIDA → APROVADA");
  });
});

describe("desfazerAprovacao", () => {
  it("limpa aprovadaEm da revisão atual e volta a EMITIDA", async () => {
    const id = await propostaEmitida();
    const antes = await estado(id);
    await aprovarProposta(id);

    await desfazerAprovacao(id);

    const depois = await estado(id);
    expect(depois.status).toBe("EMITIDA");
    expect(depois.currentRevision?.aprovadaEm).toBeNull();
    // A emissão sobrevive — desfazer a aprovação não desfaz o documento.
    expect(depois.currentRevision?.emittedAt).toEqual(
      antes.currentRevision?.emittedAt,
    );
    expect(depois.currentRevisionId).toBe(antes.currentRevisionId);
  });

  it("recusa proposta apenas EMITIDA", async () => {
    const id = await propostaEmitida();
    await expect(desfazerAprovacao(id)).rejects.toThrow(DESFAZER_EXIGE_APROVADA);
  });

  it("recusa proposta em RASCUNHO", async () => {
    const id = await novaProposta();
    await expect(desfazerAprovacao(id)).rejects.toThrow(DESFAZER_EXIGE_APROVADA);
  });

  it("audita MUDANCA_STATUS na mesma transação", async () => {
    const id = await propostaEmitida();
    await aprovarProposta(id);
    await desfazerAprovacao(id);

    const trilha = await prisma.propostaAuditoria.findMany({
      where: { propostaId: id, evento: "MUDANCA_STATUS" },
      select: { observacao: true },
    });
    expect(trilha.map((t) => t.observacao)).toContain("APROVADA → EMITIDA");
  });

  it("permite aprovar de novo depois de desfazer", async () => {
    const id = await propostaEmitida();
    await aprovarProposta(id);
    await desfazerAprovacao(id);
    await aprovarProposta(id);

    const e = await estado(id);
    expect(e.status).toBe("APROVADA");
    expect(e.currentRevision?.aprovadaEm).toBeInstanceOf(Date);
  });
});

describe("interação com as demais operações", () => {
  it("emitir uma proposta APROVADA é recusado", async () => {
    const id = await propostaEmitida();
    await aprovarProposta(id);

    await expect(emitirProposta(id)).rejects.toThrow();

    const e = await estado(id);
    expect(e.status).toBe("APROVADA");
  });

  it("cancelar uma proposta APROVADA continua permitido", async () => {
    const id = await propostaEmitida();
    await aprovarProposta(id);

    await cancelarProposta(id, "CLIENTE_DESISTIU");

    const e = await estado(id);
    expect(e.status).toBe("CANCELADA");
    // O fato histórico da revisão NÃO é apagado pelo cancelamento.
    expect(e.currentRevision?.aprovadaEm).toBeInstanceOf(Date);
  });

  it("duplicar uma APROVADA gera RASCUNHO com aprovadaEm nulo", async () => {
    const id = await propostaEmitida();
    await aprovarProposta(id);

    const nova = await duplicarProposta(id);
    propostasCriadas.push(nova.id);

    const e = await estado(nova.id);
    expect(e.status).toBe("RASCUNHO");
    expect(e.currentRevision?.revisionNumber).toBe(0);
    expect(e.currentRevision?.aprovadaEm).toBeNull();
    expect(e.currentRevision?.emittedAt).toBeNull();
  });
});

/**
 * T5 — TESTE DE SEGURANÇA DA SPRINT.
 *
 * Prova que uma revisão aprovada NUNCA é alterada in-place. Não basta afirmar
 * que a revisão antiga ainda existe: o conteúdo é capturado antes da edição e
 * comparado campo a campo depois — seções, ordem, e por item código, descrição,
 * unidade, valores e quantidade.
 *
 * DISCRIMINÂNCIA: revertendo o gatilho da T2 para `p.status === "EMITIDA"`,
 * este bloco falha (a proposta aprovada não entraria no fork e o `deleteMany`
 * sobrescreveria a revisão aprovada). Restaurado, passa. Evidência registrada no
 * PROJECT_HISTORY.md.
 */
describe("SEGURANÇA — revisão aprovada nunca é alterada in-place", () => {
  it("editar proposta aprovada cria Rev.N+1 e preserva a Rev.N por inteiro", async () => {
    const id = await propostaEmitida();
    await aprovarProposta(id);

    const antes = await estado(id);
    const revAprovadaId = antes.currentRevisionId!;
    const conteudoAntes = await conteudoDaRevisao(revAprovadaId);
    const emittedAtAntes = antes.currentRevision!.emittedAt;
    const aprovadaEmAntes = antes.currentRevision!.aprovadaEm;

    // Sanidade: a captura tem de ter conteúdo, senão a comparação é vazia.
    expect(conteudoAntes).toHaveLength(1);
    expect(conteudoAntes[0].itens).toHaveLength(1);
    expect(aprovadaEmAntes).toBeInstanceOf(Date);

    // A edição: outra seção, outra quantidade.
    const r = await salvarProposta(id, payload("Cozinha", 7));

    // --- forkou ---
    expect(r.forked).toBe(true);
    expect(r.revisaoAtual).toBe(1);
    expect(r.status).toBe("RASCUNHO");

    // --- Rev.N: intacta ---
    const revAprovada = await prisma.propostaRevisao.findUniqueOrThrow({
      where: { id: revAprovadaId },
      select: { emittedAt: true, aprovadaEm: true },
    });
    expect(revAprovada.emittedAt).toEqual(emittedAtAntes);
    expect(revAprovada.aprovadaEm).toEqual(aprovadaEmAntes);
    expect(await conteudoDaRevisao(revAprovadaId)).toEqual(conteudoAntes);

    // --- Rev.N+1: nova, limpa, com o conteúdo novo ---
    const depois = await estado(id);
    expect(depois.status).toBe("RASCUNHO");
    expect(depois.currentRevisionId).not.toBe(revAprovadaId);
    expect(depois.currentRevision?.emittedAt).toBeNull();
    expect(depois.currentRevision?.aprovadaEm).toBeNull();

    const conteudoNovo = await conteudoDaRevisao(depois.currentRevisionId!);
    expect(conteudoNovo[0].nome).toBe("Cozinha");
    expect(conteudoNovo[0].itens[0].quantidade).toBe("7");
  });

  it("a trilha registra APROVADA → RASCUNHO, não EMITIDA → RASCUNHO", async () => {
    const id = await propostaEmitida();
    await aprovarProposta(id);
    await salvarProposta(id, payload("Cozinha"));

    const trilha = await prisma.propostaAuditoria.findMany({
      where: { propostaId: id, evento: "MUDANCA_STATUS" },
      select: { observacao: true },
    });
    expect(trilha.map((t) => t.observacao)).toContain("APROVADA → RASCUNHO");
  });
});
