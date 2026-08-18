import {
  snapshotEndereco,
  type EnderecoInstalacao,
} from "@/features/instalacoes/endereco";
// Importar módulos PUROS de features é o padrão vigente — `proposta.service.ts`
// faz o mesmo com `features/propostas/totais`.
import type { StatusInstalacao } from "@/features/instalacoes/labels";
import { prisma } from "@/infrastructure/database";

import {
  INCLUDE_CUSTOS,
  mapRegistro,
  ORDEM_TIMELINE,
  type RegistroDTO,
} from "./instalacao-registro.service";

/**
 * Serviço de Instalações (Sprint 4.0.1).
 *
 * - A numeração vem da sequência do PostgreSQL (nunca do `id`).
 * - Toda escrita grava `InstalacaoAuditoria` na MESMA transação, como faz
 *   `proposta.service.ts`.
 * - O endereço é SNAPSHOT do Cliente PERSISTIDO, derivado aqui dentro — nunca
 *   recebido do chamador (ADR-0400).
 * - Responsável é texto livre — não há entidade nem FK (ADR-0400).
 */

export type { StatusInstalacao };

export interface InstalacaoListItem {
  id: string;
  numero: number;
  clienteNome: string;
  nomeProjeto: string;
  dataAgendada: Date | null;
  responsavelAtual: string | null;
  status: StatusInstalacao;
  enderecoResumo: string;
  updatedAt: Date;
}

export interface InstalacaoDetalhe extends EnderecoInstalacao {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  propostaId: string | null;
  propostaLabel: string | null;
  nomeProjeto: string;
  responsavelAtual: string | null;
  status: StatusInstalacao;
  dataPrevista: Date | null;
  dataAgendada: Date | null;
  periodo: string | null;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Cronologia operacional, já ordenada pelo service (Sprint 4.0.2). */
  registros: RegistroDTO[];
}

export interface PropostaSuggestion {
  id: string;
  label: string;
  sublabel: string;
}

/**
 * Campos que o chamador informa. **Endereço NÃO está aqui, de propósito**: ele é
 * derivado do Cliente persistido, dentro do service.
 */
export interface InstalacaoInput {
  nomeProjeto: string;
  propostaId: string | null;
  responsavelAtual: string;
  status: StatusInstalacao;
  dataPrevista: Date | null;
  dataAgendada: Date | null;
  periodo: string;
  observacoes: string;
}

export interface NovaInstalacaoInput extends InstalacaoInput {
  clienteId: string;
}

export const CLIENTE_NAO_ENCONTRADO = "Cliente não encontrado.";
export const INSTALACAO_NAO_ENCONTRADA = "Instalação não encontrada.";

const trimOrNull = (v?: string | null): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

/** Nome do cliente para exibição — PJ mostra a razão social. */
const nomeCliente = (c: {
  tipoPessoa: string;
  nome: string | null;
  empresa: string | null;
}): string =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

/** Resumo curto do endereço para a listagem: "Cidade/UF" ou o bairro. */
const resumoEndereco = (i: {
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
}): string => {
  const cidadeUf = [i.cidade, i.estado].filter(Boolean).join("/");
  return cidadeUf || i.bairro || "—";
};

const CLIENTE_SELECT = {
  tipoPessoa: true,
  nome: true,
  empresa: true,
} as const;

/** Campos de endereço lidos do Cliente para formar o snapshot. */
const ENDERECO_SELECT = {
  cep: true,
  endereco: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  estado: true,
} as const;

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export async function listInstalacoes(): Promise<InstalacaoListItem[]> {
  const rows = await prisma.instalacao.findMany({
    select: {
      id: true,
      numero: true,
      nomeProjeto: true,
      dataAgendada: true,
      responsavelAtual: true,
      status: true,
      cidade: true,
      estado: true,
      bairro: true,
      updatedAt: true,
      cliente: { select: CLIENTE_SELECT },
    },
    orderBy: { numero: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    numero: r.numero,
    clienteNome: nomeCliente(r.cliente),
    nomeProjeto: r.nomeProjeto,
    dataAgendada: r.dataAgendada,
    responsavelAtual: r.responsavelAtual,
    status: r.status as StatusInstalacao,
    enderecoResumo: resumoEndereco(r),
    updatedAt: r.updatedAt,
  }));
}

export async function getInstalacao(
  id: string,
): Promise<InstalacaoDetalhe | null> {
  const i = await prisma.instalacao.findUnique({
    where: { id },
    include: {
      cliente: { select: CLIENTE_SELECT },
      proposta: { select: { proposalNumber: true } },
      registros: { orderBy: ORDEM_TIMELINE, include: INCLUDE_CUSTOS },
    },
  });
  if (!i) return null;

  return {
    id: i.id,
    numero: i.numero,
    clienteId: i.clienteId,
    clienteNome: nomeCliente(i.cliente),
    propostaId: i.propostaId,
    propostaLabel: i.proposta ? `Proposta ${i.proposta.proposalNumber}` : null,
    nomeProjeto: i.nomeProjeto,
    responsavelAtual: i.responsavelAtual,
    status: i.status as StatusInstalacao,
    dataPrevista: i.dataPrevista,
    dataAgendada: i.dataAgendada,
    periodo: i.periodo,
    observacoes: i.observacoes,
    cep: i.cep,
    enderecoLogradouro: i.enderecoLogradouro,
    enderecoNumero: i.enderecoNumero,
    complemento: i.complemento,
    bairro: i.bairro,
    cidade: i.cidade,
    estado: i.estado,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    registros: i.registros.map(mapRegistro),
  };
}

// ---------------------------------------------------------------------------
// Escrita (sempre em transação, com auditoria)
// ---------------------------------------------------------------------------

/** Campos de escrita comuns a criação e edição. Nunca inclui endereço. */
function toData(input: InstalacaoInput) {
  return {
    nomeProjeto: input.nomeProjeto.trim(),
    propostaId: input.propostaId,
    responsavelAtual: trimOrNull(input.responsavelAtual),
    status: input.status,
    dataPrevista: input.dataPrevista,
    dataAgendada: input.dataAgendada,
    periodo: trimOrNull(input.periodo),
    observacoes: trimOrNull(input.observacoes),
  };
}

/**
 * Cria a instalação e **deriva o endereço do Cliente persistido**.
 *
 * O endereço NÃO vem do chamador. O service lê o Cliente dentro da mesma
 * transação e copia os campos — é isso que garante que o snapshot seja fiel ao
 * cadastro, independentemente de quem chamou: tela, action, teste, importação
 * ou integração futura. Uma regra de integridade não pode depender do estado de
 * um formulário no navegador.
 */
export async function criarInstalacao(
  input: NovaInstalacaoInput,
): Promise<{ id: string; numero: number }> {
  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({
      where: { id: input.clienteId },
      select: ENDERECO_SELECT,
    });
    if (!cliente) throw new Error(CLIENTE_NAO_ENCONTRADO);

    const criada = await tx.instalacao.create({
      data: {
        clienteId: input.clienteId,
        ...toData(input),
        ...snapshotEndereco(cliente),
      },
      select: { id: true, numero: true },
    });

    await tx.instalacaoAuditoria.create({
      data: {
        instalacaoId: criada.id,
        evento: "CRIACAO",
        observacao: `Instalação ${criada.numero} criada`,
      },
    });

    return criada;
  });
}

/**
 * Atualiza o cabeçalho. **Não toca no endereço nem no cliente** — o snapshot é
 * imutável depois da criação (ADR-0400).
 */
export async function atualizarInstalacao(
  id: string,
  input: InstalacaoInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.instalacao.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!atual) throw new Error(INSTALACAO_NAO_ENCONTRADA);

    await tx.instalacao.update({ where: { id }, data: toData(input) });

    // Mudança de status é evento próprio — é o que a spec exige rastrear.
    const mudouStatus = atual.status !== input.status;
    await tx.instalacaoAuditoria.create({
      data: {
        instalacaoId: id,
        evento: mudouStatus ? "MUDANCA_STATUS" : "ALTERACAO",
        observacao: mudouStatus ? `${atual.status} → ${input.status}` : null,
      },
    });
  });
}

/** Cancela preservando o registro — instalação nunca some do histórico. */
export async function cancelarInstalacao(
  id: string,
  motivo: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const atual = await tx.instalacao.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!atual) throw new Error(INSTALACAO_NAO_ENCONTRADA);

    await tx.instalacao.update({
      where: { id },
      data: { status: "CANCELADA" },
    });
    await tx.instalacaoAuditoria.create({
      data: {
        instalacaoId: id,
        evento: "CANCELAMENTO",
        observacao: trimOrNull(motivo),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Busca de proposta (vínculo opcional)
// ---------------------------------------------------------------------------

/** Busca de proposta para o vínculo opcional. Nunca importa itens. */
export async function searchPropostas(
  query: string,
): Promise<PropostaSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const numero = Number.parseInt(q, 10);
  const rows = await prisma.proposta.findMany({
    where: {
      OR: [
        ...(Number.isFinite(numero) ? [{ proposalNumber: numero }] : []),
        { nomeProjeto: { contains: q, mode: "insensitive" as const } },
        { cliente: { nome: { contains: q, mode: "insensitive" as const } } },
        { cliente: { empresa: { contains: q, mode: "insensitive" as const } } },
      ],
    },
    select: {
      id: true,
      proposalNumber: true,
      nomeProjeto: true,
      cliente: { select: CLIENTE_SELECT },
    },
    orderBy: { proposalNumber: "desc" },
    take: 10,
  });

  return rows.map((p) => ({
    id: p.id,
    label: `Proposta ${p.proposalNumber}`,
    sublabel:
      [p.cliente ? nomeCliente(p.cliente) : null, p.nomeProjeto]
        .filter(Boolean)
        .join(" · ") || "—",
  }));
}
