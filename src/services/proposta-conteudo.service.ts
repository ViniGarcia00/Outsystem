import { prisma } from "@/infrastructure/database";

import type {
  ModeloProposta,
  StatusProposta,
} from "./proposta.service";

/**
 * Serviço do CONTEÚDO da proposta (seções + itens) — vive dentro da revisão
 * atual (ADR-0206). Sprint 2.2: apenas PRODUTOS. Toda operação valida que a
 * proposta não está cancelada e que a seção/item pertence à revisão atual, e
 * grava auditoria `ALTERACAO` + toca `updatedAt` na mesma transação.
 * Ordenação contígua (0,1,2…) sem buracos (ADR-0208).
 */

type TipoItemProposta = "PRODUTO" | "SERVICO";
type Direcao = "UP" | "DOWN";

const toNumber = (v: { toString(): string }): number => Number(v.toString());

export interface ItemDTO {
  id: string;
  tipo: TipoItemProposta;
  produtoId: string | null;
  codigo: string;
  descricao: string;
  unidade: string;
  valorProduto: number;
  valorServico: number;
  quantidade: number;
  ordem: number;
}

export interface SecaoDTO {
  id: string;
  nome: string;
  ordem: number;
  itens: ItemDTO[];
}

export interface WorkspaceDTO {
  id: string;
  proposalNumber: number;
  revisaoAtual: number | null;
  status: StatusProposta;
  readOnly: boolean;
  clienteNome: string;
  vendedorNome: string | null;
  modelo: ModeloProposta;
  validadeDias: number;
  emitidaAt: Date | null;
  obsProposta: string;
  secoes: SecaoDTO[];
}

const clienteDisplay = (c: {
  tipoPessoa: "PF" | "PJ";
  nome: string | null;
  empresa: string | null;
}) =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function getWorkspace(
  propostaId: string,
): Promise<WorkspaceDTO | null> {
  const p = await prisma.proposta.findUnique({
    where: { id: propostaId },
    select: {
      id: true,
      proposalNumber: true,
      status: true,
      modelo: true,
      validadeDias: true,
      emitidaAt: true,
      obsProposta: true,
      cliente: { select: { tipoPessoa: true, nome: true, empresa: true } },
      vendedor: { select: { nome: true } },
      currentRevision: {
        select: {
          revisionNumber: true,
          secoes: {
            orderBy: { ordem: "asc" },
            select: {
              id: true,
              nome: true,
              ordem: true,
              itens: {
                orderBy: { ordem: "asc" },
                select: {
                  id: true,
                  tipo: true,
                  produtoId: true,
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
          },
        },
      },
    },
  });
  if (!p) return null;

  return {
    id: p.id,
    proposalNumber: p.proposalNumber,
    revisaoAtual: p.currentRevision?.revisionNumber ?? null,
    status: p.status,
    readOnly: p.status === "CANCELADA",
    clienteNome: clienteDisplay(p.cliente),
    vendedorNome: p.vendedor?.nome ?? null,
    modelo: p.modelo,
    validadeDias: p.validadeDias,
    emitidaAt: p.emitidaAt,
    obsProposta: p.obsProposta ?? "",
    secoes: (p.currentRevision?.secoes ?? []).map((s) => ({
      id: s.id,
      nome: s.nome,
      ordem: s.ordem,
      itens: s.itens.map((i) => ({
        id: i.id,
        tipo: i.tipo,
        produtoId: i.produtoId,
        codigo: i.codigo,
        descricao: i.descricao,
        unidade: i.unidade,
        valorProduto: toNumber(i.valorProduto),
        valorServico: toNumber(i.valorServico),
        quantidade: toNumber(i.quantidade),
        ordem: i.ordem,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Helpers de contexto/validação (revisão atual + não cancelada)
// ---------------------------------------------------------------------------

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function auditar(
  tx: Tx,
  propostaId: string,
  revisionNumber: number | null,
  observacao: string,
) {
  await tx.proposta.update({
    where: { id: propostaId },
    data: { updatedAt: new Date() },
  });
  await tx.propostaAuditoria.create({
    data: { propostaId, evento: "ALTERACAO", revisionNumber, observacao },
  });
}

async function contextoProposta(tx: Tx, propostaId: string) {
  const p = await tx.proposta.findUniqueOrThrow({
    where: { id: propostaId },
    select: {
      status: true,
      currentRevisionId: true,
      currentRevision: { select: { revisionNumber: true } },
    },
  });
  if (p.status === "CANCELADA") {
    throw new Error("Proposta cancelada não pode ser editada.");
  }
  if (!p.currentRevisionId) {
    throw new Error("Revisão atual não encontrada.");
  }
  return {
    revisaoId: p.currentRevisionId,
    revisionNumber: p.currentRevision?.revisionNumber ?? null,
  };
}

async function contextoSecao(tx: Tx, secaoId: string) {
  const s = await tx.propostaSecao.findUniqueOrThrow({
    where: { id: secaoId },
    select: {
      revisaoId: true,
      revisao: {
        select: {
          revisionNumber: true,
          proposta: {
            select: { id: true, status: true, currentRevisionId: true },
          },
        },
      },
    },
  });
  const proposta = s.revisao.proposta;
  if (proposta.status === "CANCELADA") {
    throw new Error("Proposta cancelada não pode ser editada.");
  }
  if (s.revisaoId !== proposta.currentRevisionId) {
    throw new Error("Apenas a revisão atual pode ser editada.");
  }
  return {
    propostaId: proposta.id,
    revisaoId: s.revisaoId,
    revisionNumber: s.revisao.revisionNumber,
  };
}

async function contextoItem(tx: Tx, itemId: string) {
  const it = await tx.propostaItem.findUniqueOrThrow({
    where: { id: itemId },
    select: {
      secaoId: true,
      codigo: true,
      secao: {
        select: {
          revisaoId: true,
          revisao: {
            select: {
              revisionNumber: true,
              proposta: {
                select: { id: true, status: true, currentRevisionId: true },
              },
            },
          },
        },
      },
    },
  });
  const proposta = it.secao.revisao.proposta;
  if (proposta.status === "CANCELADA") {
    throw new Error("Proposta cancelada não pode ser editada.");
  }
  if (it.secao.revisaoId !== proposta.currentRevisionId) {
    throw new Error("Apenas a revisão atual pode ser editada.");
  }
  return {
    propostaId: proposta.id,
    secaoId: it.secaoId,
    revisionNumber: it.secao.revisao.revisionNumber,
    codigo: it.codigo,
  };
}

/** Renumera 0,1,2… mantendo a ordem atual (sem buracos). */
async function renumerarSecoes(tx: Tx, revisaoId: string) {
  const secoes = await tx.propostaSecao.findMany({
    where: { revisaoId },
    orderBy: { ordem: "asc" },
    select: { id: true },
  });
  for (let i = 0; i < secoes.length; i++) {
    await tx.propostaSecao.update({
      where: { id: secoes[i].id },
      data: { ordem: i },
    });
  }
}

async function renumerarItens(tx: Tx, secaoId: string) {
  const itens = await tx.propostaItem.findMany({
    where: { secaoId },
    orderBy: { ordem: "asc" },
    select: { id: true },
  });
  for (let i = 0; i < itens.length; i++) {
    await tx.propostaItem.update({
      where: { id: itens[i].id },
      data: { ordem: i },
    });
  }
}

// ---------------------------------------------------------------------------
// Seções
// ---------------------------------------------------------------------------

export async function adicionarSecao(propostaId: string, nome: string) {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error("Informe o nome da seção.");
  await prisma.$transaction(async (tx) => {
    const ctx = await contextoProposta(tx, propostaId);
    const ordem = await tx.propostaSecao.count({
      where: { revisaoId: ctx.revisaoId },
    });
    await tx.propostaSecao.create({
      data: { revisaoId: ctx.revisaoId, nome: nomeLimpo, ordem },
    });
    await auditar(
      tx,
      propostaId,
      ctx.revisionNumber,
      `Seção "${nomeLimpo}" adicionada`,
    );
  });
}

export async function renomearSecao(secaoId: string, nome: string) {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error("Informe o nome da seção.");
  await prisma.$transaction(async (tx) => {
    const ctx = await contextoSecao(tx, secaoId);
    await tx.propostaSecao.update({
      where: { id: secaoId },
      data: { nome: nomeLimpo },
    });
    await auditar(
      tx,
      ctx.propostaId,
      ctx.revisionNumber,
      `Seção renomeada para "${nomeLimpo}"`,
    );
  });
}

export async function removerSecao(secaoId: string) {
  await prisma.$transaction(async (tx) => {
    const ctx = await contextoSecao(tx, secaoId);
    const secao = await tx.propostaSecao.findUniqueOrThrow({
      where: { id: secaoId },
      select: { nome: true },
    });
    await tx.propostaSecao.delete({ where: { id: secaoId } });
    await renumerarSecoes(tx, ctx.revisaoId);
    await auditar(
      tx,
      ctx.propostaId,
      ctx.revisionNumber,
      `Seção "${secao.nome}" removida`,
    );
  });
}

export async function moverSecao(secaoId: string, direcao: Direcao) {
  await prisma.$transaction(async (tx) => {
    const ctx = await contextoSecao(tx, secaoId);
    const secoes = await tx.propostaSecao.findMany({
      where: { revisaoId: ctx.revisaoId },
      orderBy: { ordem: "asc" },
      select: { id: true, ordem: true },
    });
    const idx = secoes.findIndex((s) => s.id === secaoId);
    const swap = direcao === "UP" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= secoes.length) return; // limite — no-op
    await tx.propostaSecao.update({
      where: { id: secoes[idx].id },
      data: { ordem: secoes[swap].ordem },
    });
    await tx.propostaSecao.update({
      where: { id: secoes[swap].id },
      data: { ordem: secoes[idx].ordem },
    });
    await auditar(tx, ctx.propostaId, ctx.revisionNumber, "Seção reordenada");
  });
}

// ---------------------------------------------------------------------------
// Itens (produtos)
// ---------------------------------------------------------------------------

export async function adicionarItem(
  secaoId: string,
  produtoId: string,
  quantidade: number,
) {
  await prisma.$transaction(async (tx) => {
    const ctx = await contextoSecao(tx, secaoId);
    const prod = await tx.produto.findUniqueOrThrow({
      where: { id: produtoId },
      select: {
        codigo: true,
        descricao: true,
        unidade: true,
        valorProduto: true,
        valorServico: true,
      },
    });
    const ordem = await tx.propostaItem.count({ where: { secaoId } });
    await tx.propostaItem.create({
      data: {
        secaoId,
        tipo: "PRODUTO",
        produtoId,
        codigo: prod.codigo,
        descricao: prod.descricao,
        unidade: prod.unidade,
        valorProduto: prod.valorProduto,
        valorServico: prod.valorServico,
        quantidade,
        ordem,
      },
    });
    await auditar(
      tx,
      ctx.propostaId,
      ctx.revisionNumber,
      `Produto ${prod.codigo} adicionado`,
    );
  });
}

export async function atualizarQuantidade(itemId: string, quantidade: number) {
  await prisma.$transaction(async (tx) => {
    const ctx = await contextoItem(tx, itemId);
    await tx.propostaItem.update({
      where: { id: itemId },
      data: { quantidade },
    });
    await auditar(
      tx,
      ctx.propostaId,
      ctx.revisionNumber,
      `Quantidade do item ${ctx.codigo} alterada para ${quantidade}`,
    );
  });
}

export async function removerItem(itemId: string) {
  await prisma.$transaction(async (tx) => {
    const ctx = await contextoItem(tx, itemId);
    await tx.propostaItem.delete({ where: { id: itemId } });
    await renumerarItens(tx, ctx.secaoId);
    await auditar(
      tx,
      ctx.propostaId,
      ctx.revisionNumber,
      `Item ${ctx.codigo} removido`,
    );
  });
}

export async function moverItem(itemId: string, direcao: Direcao) {
  await prisma.$transaction(async (tx) => {
    const ctx = await contextoItem(tx, itemId);
    const itens = await tx.propostaItem.findMany({
      where: { secaoId: ctx.secaoId },
      orderBy: { ordem: "asc" },
      select: { id: true, ordem: true },
    });
    const idx = itens.findIndex((i) => i.id === itemId);
    const swap = direcao === "UP" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= itens.length) return;
    await tx.propostaItem.update({
      where: { id: itens[idx].id },
      data: { ordem: itens[swap].ordem },
    });
    await tx.propostaItem.update({
      where: { id: itens[swap].id },
      data: { ordem: itens[idx].ordem },
    });
    await auditar(tx, ctx.propostaId, ctx.revisionNumber, "Item reordenado");
  });
}
