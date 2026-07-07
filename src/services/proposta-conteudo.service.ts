import { prisma } from "@/infrastructure/database";

import type {
  ModeloProposta,
  StatusProposta,
} from "./proposta.service";

/**
 * Leitura do CONTEÚDO da proposta (seções + itens) da revisão atual, para o
 * workspace. As mutações não ficam mais aqui: ambos os workspaces editam em
 * memória e persistem de uma vez (`criarPropostaCompleta` / `salvarProposta`).
 */

type TipoItemProposta = "PRODUTO" | "SERVICO";

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
  updatedAt: Date;
  secoes: SecaoDTO[];
}

const clienteDisplay = (c: {
  tipoPessoa: "PF" | "PJ";
  nome: string | null;
  empresa: string | null;
}) =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

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
