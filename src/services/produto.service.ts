import { CANNOT_DELETE_USED_IN_PROPOSTAS } from "@/lib/messages";
import { prisma } from "@/infrastructure/database";

/**
 * Serviço de Produtos.
 *
 * A partir da Sprint 2.2, `Produto` é referenciado por itens de proposta
 * (`PropostaItem.produtoId`). Regra ADR-0104 ativa: produto usado em qualquer
 * proposta NÃO pode ser excluído — apenas inativado.
 */

const toNumber = (value: { toString(): string }): number =>
  Number(value.toString());

export interface ProdutoListItem {
  id: string;
  ativo: boolean;
  codigo: string;
  descricao: string;
  unidade: string;
  valorProduto: number;
  valorServico: number;
}

/** Sugestão do autocomplete de produtos (proposta). */
export interface ProdutoSuggestion {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  valorProduto: number;
  valorServico: number;
}

/** Menor quantidade de caracteres para disparar a busca do autocomplete. */
export const PRODUTO_SEARCH_MIN_CHARS = 3;

/**
 * Busca produtos ativos por Código ou Descrição para o autocomplete da proposta.
 * Só pesquisa a partir de {@link PRODUTO_SEARCH_MIN_CHARS} caracteres.
 */
export async function searchProdutos(
  query: string,
): Promise<ProdutoSuggestion[]> {
  const q = query.trim();
  if (q.length < PRODUTO_SEARCH_MIN_CHARS) return [];
  const rows = await prisma.produto.findMany({
    where: {
      ativo: true,
      OR: [
        { codigo: { contains: q, mode: "insensitive" } },
        { descricao: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      codigo: true,
      descricao: true,
      unidade: true,
      valorProduto: true,
      valorServico: true,
    },
    orderBy: { codigo: "asc" },
    take: 10,
  });
  return rows.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    descricao: r.descricao,
    unidade: r.unidade,
    valorProduto: toNumber(r.valorProduto),
    valorServico: toNumber(r.valorServico),
  }));
}

export interface ProdutoFormDTO {
  ativo: boolean;
  codigo: string;
  descricao: string;
  unidade: string;
  valorProduto: number;
  valorServico: number;
}

export interface ProdutoInput {
  ativo: boolean;
  codigo: string;
  descricao: string;
  unidade: string;
  valorProduto: number;
  valorServico: number;
}

function toData(input: ProdutoInput) {
  return {
    ativo: input.ativo,
    // Sempre em MAIÚSCULO → unicidade case-insensitive (ABC001 == abc001).
    codigo: input.codigo.trim().toUpperCase(),
    descricao: input.descricao.trim(),
    unidade: input.unidade?.trim().toUpperCase() || "UN",
    valorProduto: input.valorProduto,
    valorServico: input.valorServico,
  };
}

function mapWriteError(error: unknown): Error {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return new Error("Já existe um produto com este código.");
  }
  return error instanceof Error ? error : new Error("Falha ao salvar o produto.");
}

export async function listProdutos(
  showInactive: boolean,
): Promise<ProdutoListItem[]> {
  const rows = await prisma.produto.findMany({
    where: showInactive ? {} : { ativo: true },
    select: {
      id: true,
      ativo: true,
      codigo: true,
      descricao: true,
      unidade: true,
      valorProduto: true,
      valorServico: true,
    },
    orderBy: { codigo: "asc" },
  });

  return rows.map((p) => ({
    ...p,
    valorProduto: toNumber(p.valorProduto),
    valorServico: toNumber(p.valorServico),
  }));
}

export async function getProdutoForEdit(
  id: string,
): Promise<ProdutoFormDTO | null> {
  const p = await prisma.produto.findUnique({ where: { id } });
  if (!p) return null;
  return {
    ativo: p.ativo,
    codigo: p.codigo,
    descricao: p.descricao,
    unidade: p.unidade,
    valorProduto: toNumber(p.valorProduto),
    valorServico: toNumber(p.valorServico),
  };
}

export async function createProduto(input: ProdutoInput): Promise<string> {
  try {
    const created = await prisma.produto.create({
      data: toData(input),
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function updateProduto(
  id: string,
  input: ProdutoInput,
): Promise<void> {
  try {
    await prisma.produto.update({ where: { id }, data: toData(input) });
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function removeProduto(id: string): Promise<void> {
  // ADR-0104 ativa: produto usado em proposta não pode ser excluído.
  const usadoEmPropostas = await prisma.propostaItem.count({
    where: { produtoId: id },
  });
  if (usadoEmPropostas > 0) {
    throw new Error(CANNOT_DELETE_USED_IN_PROPOSTAS);
  }
  await prisma.produto.delete({ where: { id } });
}

export async function setProdutoAtivo(
  id: string,
  ativo: boolean,
): Promise<void> {
  await prisma.produto.update({ where: { id }, data: { ativo } });
}
