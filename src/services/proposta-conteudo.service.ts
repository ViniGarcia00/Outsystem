import { prisma } from "@/infrastructure/database";

import {
  ensureEditableRevision,
  type ModeloProposta,
  type StatusProposta,
} from "./proposta.service";

/**
 * Serviço do CONTEÚDO da proposta (seções + itens) — vive dentro da revisão
 * atual (ADR-0206). Toda operação passa por `ensureEditableRevision`: se a
 * proposta estiver EMITIDA, uma nova revisão é criada automaticamente (fork) e o
 * alvo (seção/item) é retraduzido pelo `idMap`. Grava auditoria `ALTERACAO` +
 * toca `updatedAt` na mesma transação. Ordenação contígua (0,1,2…) sem buracos.
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
  /** true apenas quando CANCELADA (read-only). EMITIDA é editável (edição forka). */
  readOnly: boolean;
  // Cabeçalho editável inline
  clienteId: string | null;
  clienteNome: string | null;
  vendedorId: string | null;
  vendedorNome: string | null;
  modelo: ModeloProposta;
  validadeDias: number;
  obsInternas: string;
  obsProposta: string;
  // Datas
  emitidaAt: Date | null; // 1ª emissão da proposta (referência)
  revisaoEmitidaAt: Date | null; // emissão da revisão exibida
  updatedAt: Date; // alimenta o indicador de auto-save
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
      obsInternas: true,
      obsProposta: true,
      emitidaAt: true,
      updatedAt: true,
      clienteId: true,
      vendedorId: true,
      cliente: { select: { tipoPessoa: true, nome: true, empresa: true } },
      vendedor: { select: { nome: true } },
      currentRevision: {
        select: {
          revisionNumber: true,
          emittedAt: true,
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
    clienteId: p.clienteId,
    clienteNome: p.cliente ? clienteDisplay(p.cliente) : null,
    vendedorId: p.vendedorId,
    vendedorNome: p.vendedor?.nome ?? null,
    modelo: p.modelo,
    validadeDias: p.validadeDias,
    obsInternas: p.obsInternas ?? "",
    obsProposta: p.obsProposta ?? "",
    emitidaAt: p.emitidaAt,
    revisaoEmitidaAt: p.currentRevision?.emittedAt ?? null,
    updatedAt: p.updatedAt,
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
// Helpers de contexto/validação (revisão editável + fork automático + idMap)
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
  const ctx = await ensureEditableRevision(tx, propostaId);
  return {
    propostaId,
    revisaoId: ctx.revisaoId,
    revisionNumber: ctx.revisionNumber,
  };
}

async function contextoSecao(tx: Tx, secaoId: string) {
  const s = await tx.propostaSecao.findUniqueOrThrow({
    where: { id: secaoId },
    select: { revisaoId: true, revisao: { select: { propostaId: true } } },
  });
  const propostaId = s.revisao.propostaId;
  const ctx = await ensureEditableRevision(tx, propostaId);

  let secaoIdEfetivo = secaoId;
  if (ctx.forked) {
    const mapeado = ctx.idMap.secoes.get(secaoId);
    if (!mapeado) throw new Error("Seção não pertence à revisão editável.");
    secaoIdEfetivo = mapeado;
  } else if (s.revisaoId !== ctx.revisaoId) {
    throw new Error("Apenas a revisão atual pode ser editada.");
  }

  return {
    propostaId,
    revisaoId: ctx.revisaoId,
    revisionNumber: ctx.revisionNumber,
    secaoId: secaoIdEfetivo,
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
          revisao: { select: { propostaId: true } },
        },
      },
    },
  });
  const propostaId = it.secao.revisao.propostaId;
  const ctx = await ensureEditableRevision(tx, propostaId);

  let itemIdEfetivo = itemId;
  let secaoIdEfetivo = it.secaoId;
  if (ctx.forked) {
    const item = ctx.idMap.itens.get(itemId);
    const secao = ctx.idMap.secoes.get(it.secaoId);
    if (!item || !secao) {
      throw new Error("Item não pertence à revisão editável.");
    }
    itemIdEfetivo = item;
    secaoIdEfetivo = secao;
  } else if (it.secao.revisaoId !== ctx.revisaoId) {
    throw new Error("Apenas a revisão atual pode ser editada.");
  }

  return {
    propostaId,
    revisaoId: ctx.revisaoId,
    revisionNumber: ctx.revisionNumber,
    secaoId: secaoIdEfetivo,
    itemId: itemIdEfetivo,
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
      where: { id: ctx.secaoId },
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
      where: { id: ctx.secaoId },
      select: { nome: true },
    });
    await tx.propostaSecao.delete({ where: { id: ctx.secaoId } });
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
    const idx = secoes.findIndex((s) => s.id === ctx.secaoId);
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
    const ordem = await tx.propostaItem.count({
      where: { secaoId: ctx.secaoId },
    });
    await tx.propostaItem.create({
      data: {
        secaoId: ctx.secaoId,
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
      where: { id: ctx.itemId },
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
    await tx.propostaItem.delete({ where: { id: ctx.itemId } });
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
    const idx = itens.findIndex((i) => i.id === ctx.itemId);
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
