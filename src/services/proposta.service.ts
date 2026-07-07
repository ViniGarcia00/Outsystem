import { prisma } from "@/infrastructure/database";

/**
 * Serviço de Propostas (refino do fluxo — pré-2.3).
 *
 * Regras (ver DECISIONS.md):
 * - Numeração sequencial imediata (autoincrement, inicia em 1001).
 * - Cabeçalho (cliente/vendedor/modelo/validade/obs) NÃO é versionado; o conteúdo
 *   vive na revisão atual (ADR-0206). Rev.0 criada com a proposta.
 * - Ciclo: RASCUNHO --Gerar PDF--> EMITIDA --1ª edição--> (fork) RASCUNHO …
 *   A criação de revisão é 100% automática (nunca manual).
 * - `ensureEditableRevision` é o ponto ÚNICO que garante uma revisão editável:
 *   se a proposta está EMITIDA, cria automaticamente a Rev.N+1 (copiando o
 *   conteúdo), volta o status para RASCUNHO e devolve o `idMap` (id antigo → novo).
 * - Cliente é opcional apenas enquanto o rascunho é montado; a emissão exige.
 * - Toda mutação grava PropostaAuditoria na MESMA transação.
 */

export type StatusProposta = "RASCUNHO" | "EMITIDA" | "CANCELADA";
export type ModeloProposta = "COMERCIAL" | "SIMPLIFICADA";
export type MotivoCancelamento =
  | "CLIENTE_DESISTIU"
  | "CONCORRENCIA"
  | "PROJETO_CANCELADO"
  | "ERRO_PROPOSTA"
  | "PROPOSTA_SUBSTITUIDA"
  | "OUTRO";

export interface PropostaListItem {
  id: string;
  proposalNumber: number;
  revisaoAtual: number | null;
  clienteNome: string | null;
  vendedorNome: string | null;
  modelo: ModeloProposta;
  status: StatusProposta;
  validadeDias: number;
  updatedAt: Date;
}

export interface SelectOption {
  value: string;
  label: string;
}

const trimOrNull = (v?: string | null): string | null =>
  v && v.trim() ? v.trim() : null;

const clienteDisplay = (c: {
  tipoPessoa: "PF" | "PJ";
  nome: string | null;
  empresa: string | null;
}) =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

/** Client transacional do Prisma. */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function listPropostas(): Promise<PropostaListItem[]> {
  const rows = await prisma.proposta.findMany({
    select: {
      id: true,
      proposalNumber: true,
      modelo: true,
      status: true,
      validadeDias: true,
      updatedAt: true,
      currentRevision: { select: { revisionNumber: true } },
      cliente: { select: { tipoPessoa: true, nome: true, empresa: true } },
      vendedor: { select: { nome: true } },
    },
    orderBy: { proposalNumber: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    proposalNumber: r.proposalNumber,
    revisaoAtual: r.currentRevision?.revisionNumber ?? null,
    clienteNome: r.cliente ? clienteDisplay(r.cliente) : null,
    vendedorNome: r.vendedor?.nome ?? null,
    modelo: r.modelo,
    status: r.status,
    validadeDias: r.validadeDias,
    updatedAt: r.updatedAt,
  }));
}

/** Opções (vendedores ativos) para o Select do workspace. Cliente usa autocomplete. */
export async function getPropostaFormOptions(): Promise<{
  vendedores: SelectOption[];
}> {
  const vendedores = await prisma.vendedor.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
  return { vendedores: vendedores.map((v) => ({ value: v.id, label: v.nome })) };
}

// ---------------------------------------------------------------------------
// Revisão editável (fork automático) + cópia profunda com mapa de ids
// ---------------------------------------------------------------------------

export interface IdMap {
  secoes: Map<string, string>;
  itens: Map<string, string>;
}

export interface EditableRevision {
  revisaoId: string;
  revisionNumber: number;
  /** true quando a chamada criou automaticamente uma nova revisão (pós-emissão). */
  forked: boolean;
  /** Tradução id-antigo → id-novo quando houve fork (vazio caso contrário). */
  idMap: IdMap;
}

const emptyIdMap = (): IdMap => ({ secoes: new Map(), itens: new Map() });

/** Cópia profunda de seções + itens de uma revisão para outra; devolve o idMap. */
async function copiarConteudo(
  tx: Tx,
  origemId: string,
  destinoId: string,
): Promise<IdMap> {
  const idMap = emptyIdMap();
  const secoes = await tx.propostaSecao.findMany({
    where: { revisaoId: origemId },
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
  });
  for (const s of secoes) {
    const nova = await tx.propostaSecao.create({
      data: { revisaoId: destinoId, nome: s.nome, ordem: s.ordem },
      select: { id: true },
    });
    idMap.secoes.set(s.id, nova.id);
    for (const item of s.itens) {
      const { id: oldItemId, ...dados } = item;
      const novo = await tx.propostaItem.create({
        data: { secaoId: nova.id, ...dados },
        select: { id: true },
      });
      idMap.itens.set(oldItemId, novo.id);
    }
  }
  return idMap;
}

/**
 * Garante uma revisão editável para a proposta. Ponto único do fork automático:
 * - CANCELADA → erro.
 * - RASCUNHO  → devolve a revisão atual (sem fork).
 * - EMITIDA   → cria Rev.N+1 (copia conteúdo), torna-a atual, status → RASCUNHO,
 *               audita NOVA_REVISAO (automática) + MUDANCA_STATUS, devolve idMap.
 */
export async function ensureEditableRevision(
  tx: Tx,
  propostaId: string,
): Promise<EditableRevision> {
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

  if (p.status !== "EMITIDA") {
    return {
      revisaoId: p.currentRevisionId,
      revisionNumber: p.currentRevision?.revisionNumber ?? 0,
      forked: false,
      idMap: emptyIdMap(),
    };
  }

  // EMITIDA → fork automático na 1ª edição.
  const novoNumero = (p.currentRevision?.revisionNumber ?? 0) + 1;
  const nova = await tx.propostaRevisao.create({
    data: { propostaId, revisionNumber: novoNumero },
    select: { id: true },
  });
  const idMap = await copiarConteudo(tx, p.currentRevisionId, nova.id);
  await tx.proposta.update({
    where: { id: propostaId },
    data: { currentRevisionId: nova.id, status: "RASCUNHO" },
  });
  await tx.propostaAuditoria.create({
    data: {
      propostaId,
      evento: "NOVA_REVISAO",
      revisionNumber: novoNumero,
      observacao: "Revisão criada automaticamente (edição de proposta emitida)",
    },
  });
  await tx.propostaAuditoria.create({
    data: {
      propostaId,
      evento: "MUDANCA_STATUS",
      revisionNumber: novoNumero,
      observacao: "EMITIDA → RASCUNHO",
    },
  });
  return { revisaoId: nova.id, revisionNumber: novoNumero, forked: true, idMap };
}

// ---------------------------------------------------------------------------
// Escrita (sempre com auditoria na mesma transação)
// ---------------------------------------------------------------------------

/** Item/seção montados no cliente antes da confirmação da criação. */
export interface NovaPropostaSecao {
  nome: string;
  itens: { produtoId: string; quantidade: number }[];
}

export interface NovaPropostaPayload {
  clienteId: string | null;
  vendedorId: string | null;
  modelo: ModeloProposta;
  validadeDias: number;
  obsInternas: string | null;
  obsProposta: string | null;
  secoes: NovaPropostaSecao[];
}

/**
 * Confirma a criação da proposta ("Criar Proposta"). Só aqui a proposta passa a
 * existir: consome o próximo número, cria Rev.0, grava cabeçalho + seções +
 * produtos (snapshot autoritativo do produto pelo servidor) e inicia a
 * auditoria — tudo em UMA transação. Antes disso nada é persistido.
 */
export async function criarPropostaCompleta(
  payload: NovaPropostaPayload,
): Promise<{ id: string; proposalNumber: number }> {
  return prisma.$transaction(async (tx) => {
    const proposta = await tx.proposta.create({
      data: {
        clienteId: payload.clienteId,
        vendedorId: payload.vendedorId,
        modelo: payload.modelo,
        validadeDias: payload.validadeDias,
        obsInternas: trimOrNull(payload.obsInternas),
        obsProposta: trimOrNull(payload.obsProposta),
        status: "RASCUNHO",
      },
      select: { id: true, proposalNumber: true },
    });
    const revisao = await tx.propostaRevisao.create({
      data: { propostaId: proposta.id, revisionNumber: 0 },
      select: { id: true },
    });
    await tx.proposta.update({
      where: { id: proposta.id },
      data: { currentRevisionId: revisao.id },
    });

    for (let si = 0; si < payload.secoes.length; si++) {
      const s = payload.secoes[si];
      const secao = await tx.propostaSecao.create({
        data: { revisaoId: revisao.id, nome: s.nome.trim(), ordem: si },
        select: { id: true },
      });
      for (let ii = 0; ii < s.itens.length; ii++) {
        const linha = s.itens[ii];
        const prod = await tx.produto.findUniqueOrThrow({
          where: { id: linha.produtoId },
          select: {
            codigo: true,
            descricao: true,
            unidade: true,
            valorProduto: true,
            valorServico: true,
          },
        });
        await tx.propostaItem.create({
          data: {
            secaoId: secao.id,
            tipo: "PRODUTO",
            produtoId: linha.produtoId,
            codigo: prod.codigo,
            descricao: prod.descricao,
            unidade: prod.unidade,
            valorProduto: prod.valorProduto,
            valorServico: prod.valorServico,
            quantidade: linha.quantidade,
            ordem: ii,
          },
        });
      }
    }

    const totalSecoes = payload.secoes.length;
    const totalItens = payload.secoes.reduce((n, s) => n + s.itens.length, 0);
    await tx.propostaAuditoria.create({
      data: {
        propostaId: proposta.id,
        evento: "CRIACAO",
        revisionNumber: 0,
        observacao: totalSecoes
          ? `Criada com ${totalSecoes} seção(ões) e ${totalItens} item(ns)`
          : null,
      },
    });
    return proposta;
  });
}

/** Campos editáveis do cabeçalho (auto-save por campo/bloco). */
export interface CabecalhoPatch {
  clienteId?: string | null;
  vendedorId?: string | null;
  modelo?: ModeloProposta;
  validadeDias?: number;
  obsInternas?: string | null;
  obsProposta?: string | null;
}

const CAMPO_LABEL: Record<keyof CabecalhoPatch, string> = {
  clienteId: "cliente",
  vendedorId: "vendedor",
  modelo: "modelo",
  validadeDias: "validade",
  obsInternas: "observações internas",
  obsProposta: "observações da proposta",
};

/** Auto-save do cabeçalho. Forka se a proposta estiver emitida. */
export async function updateCabecalho(
  id: string,
  patch: CabecalhoPatch,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const ctx = await ensureEditableRevision(tx, id);
    await tx.proposta.update({
      where: { id },
      data: {
        ...("clienteId" in patch
          ? { clienteId: patch.clienteId || null }
          : {}),
        ...("vendedorId" in patch
          ? { vendedorId: trimOrNull(patch.vendedorId) }
          : {}),
        ...("modelo" in patch ? { modelo: patch.modelo } : {}),
        ...("validadeDias" in patch ? { validadeDias: patch.validadeDias } : {}),
        ...("obsInternas" in patch
          ? { obsInternas: trimOrNull(patch.obsInternas) }
          : {}),
        ...("obsProposta" in patch
          ? { obsProposta: trimOrNull(patch.obsProposta) }
          : {}),
        updatedAt: new Date(),
      },
    });
    const campos = (Object.keys(patch) as (keyof CabecalhoPatch)[])
      .map((k) => CAMPO_LABEL[k])
      .join(", ");
    await tx.propostaAuditoria.create({
      data: {
        propostaId: id,
        evento: "ALTERACAO",
        revisionNumber: ctx.revisionNumber,
        observacao: `Cabeçalho atualizado: ${campos}`,
      },
    });
  });
}

/** Emite a proposta ("Gerar PDF"): valida, congela a revisão e muda o status. */
export async function emitirProposta(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const p = await tx.proposta.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        clienteId: true,
        emitidaAt: true,
        currentRevisionId: true,
        currentRevision: { select: { revisionNumber: true } },
      },
    });
    if (p.status === "CANCELADA") {
      throw new Error("Proposta cancelada não pode ser emitida.");
    }
    if (p.status === "EMITIDA") {
      throw new Error("Proposta já está emitida.");
    }
    if (!p.clienteId) {
      throw new Error("Informe o cliente antes de emitir a proposta.");
    }
    if (!p.currentRevisionId) {
      throw new Error("Revisão atual não encontrada.");
    }
    const itens = await tx.propostaItem.count({
      where: { secao: { revisaoId: p.currentRevisionId } },
    });
    if (itens === 0) {
      throw new Error("Adicione ao menos um item antes de emitir a proposta.");
    }

    const now = new Date();
    await tx.proposta.update({
      where: { id },
      data: { status: "EMITIDA", ...(p.emitidaAt ? {} : { emitidaAt: now }) },
    });
    await tx.propostaRevisao.update({
      where: { id: p.currentRevisionId },
      data: { emittedAt: now },
    });
    await tx.propostaAuditoria.create({
      data: {
        propostaId: id,
        evento: "EMISSAO",
        revisionNumber: p.currentRevision?.revisionNumber ?? null,
        observacao: `Revisão ${p.currentRevision?.revisionNumber ?? 0} emitida`,
      },
    });
  });
}

export async function duplicarProposta(
  id: string,
): Promise<{ id: string; proposalNumber: number }> {
  return prisma.$transaction(async (tx) => {
    const orig = await tx.proposta.findUniqueOrThrow({
      where: { id },
      select: {
        proposalNumber: true,
        clienteId: true,
        vendedorId: true,
        modelo: true,
        validadeDias: true,
        obsProposta: true,
        currentRevisionId: true,
      },
    });

    const nova = await tx.proposta.create({
      data: {
        clienteId: orig.clienteId,
        vendedorId: orig.vendedorId,
        modelo: orig.modelo,
        validadeDias: orig.validadeDias,
        obsProposta: orig.obsProposta, // NÃO copia obsInternas (ADR-0203)
        status: "RASCUNHO",
      },
      select: { id: true, proposalNumber: true },
    });

    const rev = await tx.propostaRevisao.create({
      data: { propostaId: nova.id, revisionNumber: 0 },
      select: { id: true },
    });
    if (orig.currentRevisionId) {
      await copiarConteudo(tx, orig.currentRevisionId, rev.id);
    }
    await tx.proposta.update({
      where: { id: nova.id },
      data: { currentRevisionId: rev.id },
    });
    await tx.propostaAuditoria.create({
      data: {
        propostaId: nova.id,
        evento: "DUPLICACAO",
        revisionNumber: 0,
        observacao: `Duplicada da proposta ${orig.proposalNumber}`,
      },
    });

    return nova;
  });
}

export async function cancelarProposta(
  id: string,
  motivo: MotivoCancelamento,
  obs?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const p = await tx.proposta.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        currentRevision: { select: { revisionNumber: true } },
      },
    });
    if (p.status === "CANCELADA") {
      throw new Error("Proposta já está cancelada.");
    }
    if (motivo === "OUTRO" && !(obs && obs.trim())) {
      throw new Error('Observação é obrigatória quando o motivo é "Outro".');
    }

    await tx.proposta.update({
      where: { id },
      data: {
        status: "CANCELADA",
        canceladaAt: new Date(),
        motivoCancelamento: motivo,
        obsCancelamento: trimOrNull(obs),
      },
    });
    await tx.propostaAuditoria.create({
      data: {
        propostaId: id,
        evento: "CANCELAMENTO",
        revisionNumber: p.currentRevision?.revisionNumber ?? null,
        observacao: obs?.trim() || motivo,
      },
    });
  });
}
