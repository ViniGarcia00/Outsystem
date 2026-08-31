import { apelidoExibido } from "@/features/instalacoes/apelido";
import {
  snapshotEndereco,
  type EnderecoInstalacao,
} from "@/features/instalacoes/endereco";
// Importar módulos PUROS de features é o padrão vigente — `proposta.service.ts`
// faz o mesmo com `features/propostas/totais`.
import type { StatusInstalacao } from "@/features/instalacoes/labels";
import { prisma } from "@/infrastructure/database";
import { contemBusca } from "@/utils";

import {
  INCLUDE_CUSTOS,
  mapRegistro,
  ORDEM_TIMELINE,
  type RegistroDTO,
} from "./instalacao-registro.service";
import {
  assertPapel,
  listUsuarioOptions,
  type UsuarioOption,
} from "./usuario.service";

/**
 * Serviço de Instalações (Sprint 4.0.1).
 *
 * - A numeração vem da sequência do PostgreSQL (nunca do `id`).
 * - Toda escrita grava `InstalacaoAuditoria` na MESMA transação, como faz
 *   `proposta.service.ts`.
 * - O endereço é SNAPSHOT do Cliente PERSISTIDO, derivado aqui dentro — nunca
 *   recebido do chamador (ADR-0400).
 * - Responsável é VÍNCULO com Tecnico (ADR-0408). O nome nunca é gravado aqui:
 *   "responsável atual" é estado corrente e acompanha o cadastro.
 */

export type { StatusInstalacao };

export interface InstalacaoListItem {
  id: string;
  numero: number;
  /** Identificação principal da obra na listagem (ADR-0413). */
  apelido: string;
  clienteNome: string;
  dataAgendada: Date | null;
  /** Nome do Técnico responsável no momento da leitura (não é snapshot). */
  responsavelNome: string | null;
  status: StatusInstalacao;
  enderecoResumo: string;
  updatedAt: Date;
}

export interface InstalacaoDetalhe extends EnderecoInstalacao {
  id: string;
  numero: number;
  /** Identificação operacional, editável (ADR-0413). */
  apelido: string;
  clienteId: string;
  clienteNome: string;
  propostaId: string | null;
  propostaLabel: string | null;
  tecnicoResponsavelId: string | null;
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
  /** Identificação operacional da obra (ADR-0413). Obrigatória. */
  apelido: string;
  propostaId: string | null;
  tecnicoResponsavelId: string | null;
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
      dataAgendada: true,
      apelido: true,
      tecnicoResponsavel: { select: { nome: true } },
      status: true,
      cidade: true,
      estado: true,
      bairro: true,
      updatedAt: true,
      cliente: { select: CLIENTE_SELECT },
    },
    orderBy: { numero: "desc" },
  });

  return rows.map((r) => {
    const cliente = nomeCliente(r.cliente);
    return {
      id: r.id,
      numero: r.numero,
      /**
       * Fallback de EXIBIÇÃO (Sprint 4.5): apelido → cliente → número. A coluna
       * é nullable e o backfill preencheu tudo, mas desde que a coluna Cliente
       * saiu da tabela esta é a única identificação da linha — não pode sair
       * vazia nem como "—".
       *
       * Nada disto é gravado. `getInstalacao`, que alimenta o input editável do
       * workspace, segue sem o fallback ampliado de propósito.
       */
      apelido: apelidoExibido(r.apelido, cliente, r.numero),
      clienteNome: cliente,
      dataAgendada: r.dataAgendada,
      responsavelNome: r.tecnicoResponsavel?.nome ?? null,
      status: r.status as StatusInstalacao,
      enderecoResumo: resumoEndereco(r),
      updatedAt: r.updatedAt,
    };
  });
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
    apelido: i.apelido ?? nomeCliente(i.cliente),
    clienteId: i.clienteId,
    clienteNome: nomeCliente(i.cliente),
    propostaId: i.propostaId,
    propostaLabel: i.proposta ? `Proposta ${i.proposta.proposalNumber}` : null,
    tecnicoResponsavelId: i.tecnicoResponsavelId,
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
    apelido: input.apelido.trim(),
    propostaId: input.propostaId,
    tecnicoResponsavelId: input.tecnicoResponsavelId,
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

    // Vínculo NOVO: exige papel de técnico disponível (ADR-0410). Nulo é
    // permitido — a instalação pode nascer sem responsável definido.
    if (input.tecnicoResponsavelId) {
      await assertPapel(tx, input.tecnicoResponsavelId, "ehTecnico");
    }

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
      select: { status: true, tecnicoResponsavelId: true },
    });
    if (!atual) throw new Error(INSTALACAO_NAO_ENCONTRADA);

    // Mesma regra da Proposta (ADR-0410): papel exigido só quando o
    // responsável MUDA. Reagendar uma instalação cujo técnico foi inativado, ou
    // que perdeu o papel, continua funcionando — o vínculo antigo é preservado.
    if (
      input.tecnicoResponsavelId &&
      input.tecnicoResponsavelId !== atual.tecnicoResponsavelId
    ) {
      await assertPapel(tx, input.tecnicoResponsavelId, "ehTecnico");
    }

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

/**
 * Busca de proposta para o vínculo opcional. Nunca importa itens.
 *
 * `nomeProjeto` aqui é **`Proposta.nomeProjeto`** (ADR-0227) — nada a ver com o
 * campo homônimo que a Instalação tinha e que saiu na Sprint 4.0.3.
 *
 * **Filtro textual em memória (Sprint 4.0.3, ADR-0402):** o `ILIKE` gerado pelo
 * Prisma é sensível a acento e escondia clientes como "Thaís". O número exato da
 * proposta continua resolvido no banco — é igualdade, não texto. Sem `take` na
 * consulta: um limite antes do filtro esconderia propostas válidas além do corte.
 */
export async function searchPropostas(
  query: string,
): Promise<PropostaSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const numero = Number.parseInt(q, 10);
  const todas = await prisma.proposta.findMany({
    select: {
      id: true,
      proposalNumber: true,
      nomeProjeto: true,
      cliente: { select: CLIENTE_SELECT },
    },
    orderBy: { proposalNumber: "desc" },
  });

  const rows = todas
    .filter((p) => {
      if (Number.isFinite(numero) && p.proposalNumber === numero) return true;
      if (contemBusca(p.nomeProjeto ?? "", q)) return true;
      return p.cliente ? contemBusca(nomeCliente(p.cliente), q) : false;
    })
    .slice(0, 10);

  return rows.map((p) => ({
    id: p.id,
    label: `Proposta ${p.proposalNumber}`,
    sublabel:
      [p.cliente ? nomeCliente(p.cliente) : null, p.nomeProjeto]
        .filter(Boolean)
        .join(" · ") || "—",
  }));
}

// ---------------------------------------------------------------------------
// Opções de Técnico
// ---------------------------------------------------------------------------

/**
 * Opções do `Select` de responsável para UMA instalação: usuários **disponíveis
 * para o papel de técnico** (`ativo && ehTecnico`, ADR-0410) **mais** os já
 * vinculados a ela — o responsável atual e o de cada registro da cronologia —,
 * ainda que indisponíveis.
 *
 * Sem os vinculados, abrir uma instalação cujo técnico foi inativado (ou que
 * perdeu o papel) mostraria o campo em branco, e salvar qualquer outra
 * alteração apagaria o vínculo em silêncio. Uma consulta só serve a página
 * inteira do workspace.
 */
export async function listUsuarioOptionsDaInstalacao(
  instalacaoId: string,
): Promise<UsuarioOption[]> {
  const i = await prisma.instalacao.findUnique({
    where: { id: instalacaoId },
    select: {
      tecnicoResponsavelId: true,
      registros: { select: { tecnicoId: true } },
    },
  });
  if (!i) return listUsuarioOptions("ehTecnico");

  return listUsuarioOptions("ehTecnico", [
    ...(i.tecnicoResponsavelId ? [i.tecnicoResponsavelId] : []),
    ...i.registros.map((r) => r.tecnicoId),
  ]);
}
