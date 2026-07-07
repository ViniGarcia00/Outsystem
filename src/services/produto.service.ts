import { prisma } from "@/infrastructure/database";

/**
 * Serviço de Produtos.
 *
 * Sprint 1: `Produto` NÃO possui relação com `Proposta` (ver DECISIONS.md /
 * ADR-0104). Portanto a exclusão é sempre permitida. Quando a Sprint de
 * Propostas criar o vínculo, a checagem de uso será adicionada aqui.
 */

const toNumber = (value: { toString(): string }): number =>
  Number(value.toString());

export interface ProdutoListItem {
  id: string;
  ativo: boolean;
  codigo: string;
  descricao: string;
  valorProduto: number;
  valorServico: number;
}

export interface ProdutoFormDTO {
  ativo: boolean;
  codigo: string;
  descricao: string;
  valorProduto: number;
  valorServico: number;
}

export interface ProdutoInput {
  ativo: boolean;
  codigo: string;
  descricao: string;
  valorProduto: number;
  valorServico: number;
}

function toData(input: ProdutoInput) {
  return {
    ativo: input.ativo,
    // Sempre em MAIÚSCULO → unicidade case-insensitive (ABC001 == abc001).
    codigo: input.codigo.trim().toUpperCase(),
    descricao: input.descricao.trim(),
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
  // Sprint 1: sem relação com propostas — exclusão sempre permitida.
  await prisma.produto.delete({ where: { id } });
}

export async function setProdutoAtivo(
  id: string,
  ativo: boolean,
): Promise<void> {
  await prisma.produto.update({ where: { id }, data: { ativo } });
}
