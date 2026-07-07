import { prisma } from "@/infrastructure/database";

/**
 * Serviço de Propostas (refino do fluxo — pré-2.3).
 *
 * Regras (ver DECISIONS.md):
 * - Numeração sequencial imediata (autoincrement, inicia em 1001).
 * - Cabeçalho (cliente/vendedor/modelo/validade/obs) NÃO é versionado; o conteúdo
 *   vive na revisão atual (ADR-0206). Rev.0 criada com a proposta.
 * - Edição em memória + persistência única: `criarPropostaCompleta` (nova) e
 *   `salvarProposta` (existente). Nada é gravado durante a digitação.
 * - Ciclo: RASCUNHO --Gerar PDF--> EMITIDA --Salvar Alterações--> (fork) RASCUNHO.
 *   A revisão automática acontece dentro de `salvarProposta`: se a proposta
 *   estava EMITIDA, cria a Rev.N+1 e volta o status a RASCUNHO.
 * - Cliente é opcional apenas enquanto o rascunho é montado; a emissão exige.
 * - Cada operação de escrita grava PropostaAuditoria na MESMA transação.
 */

export type StatusProposta = "RASCUNHO" | "EMITIDA" | "CANCELADA";
export type ModeloProposta = "COMERCIAL" | "SIMPLIFICADA";
export type TipoDesconto = "VALOR" | "PERCENTUAL";
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
// Cópia profunda de conteúdo (usada na duplicação)
// ---------------------------------------------------------------------------

/** Copia seções + itens de uma revisão para outra (preserva ordem e snapshot). */
async function copiarConteudo(tx: Tx, origemId: string, destinoId: string) {
  const secoes = await tx.propostaSecao.findMany({
    where: { revisaoId: origemId },
    orderBy: { ordem: "asc" },
    select: {
      nome: true,
      ordem: true,
      itens: {
        orderBy: { ordem: "asc" },
        select: {
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
    for (const item of s.itens) {
      await tx.propostaItem.create({ data: { secaoId: nova.id, ...item } });
    }
  }
}

// ---------------------------------------------------------------------------
// Escrita (sempre com auditoria na mesma transação)
// ---------------------------------------------------------------------------

/** Item/seção montados no cliente antes da confirmação da criação. */
export interface NovaPropostaSecao {
  nome: string;
  itens: {
    produtoId: string;
    quantidade: number;
    /** Editáveis na proposta; default vem do cadastro do produto. */
    valorProduto?: number;
    valorServico?: number;
  }[];
}

export interface NovaPropostaPayload {
  clienteId: string | null;
  vendedorId: string | null;
  modelo: ModeloProposta;
  validadeDias: number;
  obsInternas: string | null;
  obsProposta: string | null;
  descontoTipo?: TipoDesconto;
  descontoValor?: number;
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
        tipoDesconto: payload.descontoTipo ?? "VALOR",
        valorDesconto: payload.descontoValor ?? 0,
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
            // Snapshot com o valor usado na proposta (editável na montagem).
            valorProduto: linha.valorProduto ?? prod.valorProduto,
            valorServico: linha.valorServico ?? prod.valorServico,
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

/**
 * Salva TODAS as alterações de uma proposta existente em UMA transação
 * ("Salvar Alterações"). A revisão automática acontece **aqui**: se a proposta
 * estava EMITIDA, cria a Rev.N+1 e volta o status a RASCUNHO. Grava o cabeçalho
 * e SUBSTITUI o conteúdo da revisão editável pelo estado enviado. Auditoria
 * consolidada. Nada é persistido durante a digitação.
 */
export async function salvarProposta(
  propostaId: string,
  payload: NovaPropostaPayload,
): Promise<{ revisaoAtual: number; status: StatusProposta; forked: boolean }> {
  return prisma.$transaction(async (tx) => {
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

    let revisaoId = p.currentRevisionId;
    let revisionNumber = p.currentRevision?.revisionNumber ?? 0;
    let forked = false;

    // Revisão automática: só no salvamento, e apenas se estava emitida.
    if (p.status === "EMITIDA") {
      revisionNumber += 1;
      const nova = await tx.propostaRevisao.create({
        data: { propostaId, revisionNumber },
        select: { id: true },
      });
      revisaoId = nova.id;
      forked = true;
      await tx.proposta.update({
        where: { id: propostaId },
        data: { currentRevisionId: nova.id, status: "RASCUNHO" },
      });
      await tx.propostaAuditoria.create({
        data: {
          propostaId,
          evento: "NOVA_REVISAO",
          revisionNumber,
          observacao:
            "Revisão criada automaticamente ao salvar (proposta emitida)",
        },
      });
      await tx.propostaAuditoria.create({
        data: {
          propostaId,
          evento: "MUDANCA_STATUS",
          revisionNumber,
          observacao: "EMITIDA → RASCUNHO",
        },
      });
    }

    // Cabeçalho.
    await tx.proposta.update({
      where: { id: propostaId },
      data: {
        clienteId: payload.clienteId,
        vendedorId: payload.vendedorId,
        modelo: payload.modelo,
        validadeDias: payload.validadeDias,
        obsInternas: trimOrNull(payload.obsInternas),
        obsProposta: trimOrNull(payload.obsProposta),
        tipoDesconto: payload.descontoTipo ?? "VALOR",
        valorDesconto: payload.descontoValor ?? 0,
        updatedAt: new Date(),
      },
    });

    // Conteúdo: substitui a revisão editável pelo estado enviado
    // (delete escopado à revisão; itens caem por cascade).
    await tx.propostaSecao.deleteMany({ where: { revisaoId } });
    for (let si = 0; si < payload.secoes.length; si++) {
      const s = payload.secoes[si];
      const secao = await tx.propostaSecao.create({
        data: { revisaoId, nome: s.nome.trim(), ordem: si },
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
            valorProduto: linha.valorProduto ?? prod.valorProduto,
            valorServico: linha.valorServico ?? prod.valorServico,
            quantidade: linha.quantidade,
            ordem: ii,
          },
        });
      }
    }

    await tx.propostaAuditoria.create({
      data: {
        propostaId,
        evento: "ALTERACAO",
        revisionNumber,
        observacao: "Alterações salvas",
      },
    });

    return {
      revisaoAtual: revisionNumber,
      status: forked ? "RASCUNHO" : p.status,
      forked,
    };
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
