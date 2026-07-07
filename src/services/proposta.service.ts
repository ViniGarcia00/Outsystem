import { prisma } from "@/infrastructure/database";

/**
 * Serviço de Propostas (fundação — Sprint 2.1).
 *
 * Regras (ver DECISIONS.md ADR-0201..0205):
 * - Numeração sequencial (sequência do Postgres, inicia em 1001).
 * - Cabeçalho (cliente/vendedor/modelo) NÃO é versionado; revisões versionam o
 *   conteúdo (próximas Sprints). Rev.0 criada com a proposta.
 * - Cancelamento apenas por `cancelarProposta` (nunca excluir).
 * - Transições de status controladas; datas de status imutáveis (1ª vez).
 * - Toda mutação grava PropostaAuditoria na MESMA transação.
 */

export type StatusProposta =
  | "RASCUNHO"
  | "EMITIDA"
  | "APROVADA"
  | "REPROVADA"
  | "CANCELADA";
export type ModeloProposta = "COMERCIAL" | "SIMPLIFICADA";
export type MotivoCancelamento =
  | "CLIENTE_DESISTIU"
  | "CONCORRENCIA"
  | "PROJETO_CANCELADO"
  | "ERRO_PROPOSTA"
  | "PROPOSTA_SUBSTITUIDA"
  | "OUTRO";

/** Transições de status permitidas (ADR-0204). */
const TRANSICOES: Record<StatusProposta, StatusProposta[]> = {
  RASCUNHO: ["EMITIDA", "CANCELADA"],
  EMITIDA: ["APROVADA", "REPROVADA", "CANCELADA"],
  APROVADA: ["CANCELADA"],
  REPROVADA: ["CANCELADA"],
  CANCELADA: [],
};

export interface PropostaListItem {
  id: string;
  proposalNumber: number;
  revisaoAtual: number | null;
  clienteNome: string;
  vendedorNome: string | null;
  modelo: ModeloProposta;
  status: StatusProposta;
  validadeDias: number;
  updatedAt: Date;
}

export interface PropostaFormDTO {
  proposalNumber: number;
  revisaoAtual: number | null;
  status: StatusProposta;
  clienteId: string;
  vendedorId: string;
  modelo: ModeloProposta;
  validadeDias: number;
  obsInternas: string;
  obsProposta: string;
  /** true quando cancelada → somente leitura. */
  readOnly: boolean;
  clienteNome: string;
  motivoCancelamento: MotivoCancelamento | null;
  obsCancelamento: string;
}

export interface PropostaInput {
  clienteId: string;
  vendedorId?: string;
  modelo: ModeloProposta;
  validadeDias: number;
  obsInternas?: string;
  obsProposta?: string;
  /** Usado apenas no update (no create é sempre RASCUNHO). */
  status: StatusProposta;
}

const trimOrNull = (v?: string): string | null =>
  v && v.trim() ? v.trim() : null;

const clienteDisplay = (c: {
  tipoPessoa: "PF" | "PJ";
  nome: string | null;
  empresa: string | null;
}) =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

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
    clienteNome: clienteDisplay(r.cliente),
    vendedorNome: r.vendedor?.nome ?? null,
    modelo: r.modelo,
    status: r.status,
    validadeDias: r.validadeDias,
    updatedAt: r.updatedAt,
  }));
}

export interface SelectOption {
  value: string;
  label: string;
}

/** Opções (clientes/vendedores ativos) para os selects do formulário. */
export async function getPropostaFormOptions(): Promise<{
  clientes: SelectOption[];
  vendedores: SelectOption[];
}> {
  const [clientes, vendedores] = await Promise.all([
    prisma.cliente.findMany({
      where: { ativo: true },
      select: { id: true, tipoPessoa: true, nome: true, empresa: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendedor.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return {
    clientes: clientes.map((c) => ({ value: c.id, label: clienteDisplay(c) })),
    vendedores: vendedores.map((v) => ({ value: v.id, label: v.nome })),
  };
}

export async function getPropostaForEdit(
  id: string,
): Promise<PropostaFormDTO | null> {
  const p = await prisma.proposta.findUnique({
    where: { id },
    select: {
      proposalNumber: true,
      status: true,
      clienteId: true,
      vendedorId: true,
      modelo: true,
      validadeDias: true,
      obsInternas: true,
      obsProposta: true,
      motivoCancelamento: true,
      obsCancelamento: true,
      currentRevision: { select: { revisionNumber: true } },
      cliente: { select: { tipoPessoa: true, nome: true, empresa: true } },
    },
  });
  if (!p) return null;

  return {
    proposalNumber: p.proposalNumber,
    revisaoAtual: p.currentRevision?.revisionNumber ?? null,
    status: p.status,
    clienteId: p.clienteId,
    vendedorId: p.vendedorId ?? "",
    modelo: p.modelo,
    validadeDias: p.validadeDias,
    obsInternas: p.obsInternas ?? "",
    obsProposta: p.obsProposta ?? "",
    readOnly: p.status === "CANCELADA",
    clienteNome: clienteDisplay(p.cliente),
    motivoCancelamento: p.motivoCancelamento,
    obsCancelamento: p.obsCancelamento ?? "",
  };
}

// ---------------------------------------------------------------------------
// Escrita (sempre com auditoria na mesma transação)
// ---------------------------------------------------------------------------

export async function createProposta(
  input: PropostaInput,
): Promise<{ id: string; proposalNumber: number }> {
  return prisma.$transaction(async (tx) => {
    const proposta = await tx.proposta.create({
      data: {
        clienteId: input.clienteId,
        vendedorId: trimOrNull(input.vendedorId),
        modelo: input.modelo,
        validadeDias: input.validadeDias,
        obsInternas: trimOrNull(input.obsInternas),
        obsProposta: trimOrNull(input.obsProposta),
        status: "RASCUNHO", // nasce sempre Rascunho
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
    await tx.propostaAuditoria.create({
      data: { propostaId: proposta.id, evento: "CRIACAO", revisionNumber: 0 },
    });

    return proposta;
  });
}

export async function updateProposta(
  id: string,
  input: PropostaInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.proposta.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        emitidaAt: true,
        aprovadaAt: true,
        reprovadaAt: true,
        currentRevision: { select: { revisionNumber: true } },
      },
    });

    if (current.status === "CANCELADA") {
      throw new Error("Proposta cancelada não pode ser editada.");
    }
    if (input.status === "CANCELADA") {
      throw new Error("Use a ação Cancelar para cancelar a proposta.");
    }

    const statusMudou = input.status !== current.status;
    if (statusMudou && !TRANSICOES[current.status].includes(input.status)) {
      throw new Error(
        `Transição de status inválida: ${current.status} → ${input.status}.`,
      );
    }

    const now = new Date();

    await tx.proposta.update({
      where: { id },
      data: {
        clienteId: input.clienteId,
        vendedorId: trimOrNull(input.vendedorId),
        modelo: input.modelo,
        validadeDias: input.validadeDias,
        obsInternas: trimOrNull(input.obsInternas),
        obsProposta: trimOrNull(input.obsProposta),
        status: input.status,
        // Datas de status: carimbadas apenas na 1ª transição (imutáveis).
        ...(statusMudou && input.status === "EMITIDA" && !current.emitidaAt
          ? { emitidaAt: now }
          : {}),
        ...(statusMudou && input.status === "APROVADA" && !current.aprovadaAt
          ? { aprovadaAt: now }
          : {}),
        ...(statusMudou && input.status === "REPROVADA" && !current.reprovadaAt
          ? { reprovadaAt: now }
          : {}),
      },
    });

    await tx.propostaAuditoria.create({
      data: {
        propostaId: id,
        evento: statusMudou ? "MUDANCA_STATUS" : "ALTERACAO",
        revisionNumber: current.currentRevision?.revisionNumber ?? null,
        observacao: statusMudou ? `${current.status} → ${input.status}` : null,
      },
    });
  });
}

export async function criarRevisao(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const p = await tx.proposta.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        currentRevision: { select: { revisionNumber: true } },
      },
    });
    if (p.status === "CANCELADA") {
      throw new Error("Proposta cancelada não permite nova revisão.");
    }

    const novo = (p.currentRevision?.revisionNumber ?? -1) + 1;
    const rev = await tx.propostaRevisao.create({
      data: { propostaId: id, revisionNumber: novo },
      select: { id: true },
    });
    await tx.proposta.update({
      where: { id },
      data: { currentRevisionId: rev.id },
    });
    await tx.propostaAuditoria.create({
      data: { propostaId: id, evento: "NOVA_REVISAO", revisionNumber: novo },
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
