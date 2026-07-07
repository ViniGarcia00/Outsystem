"use server";

import { revalidatePath } from "next/cache";

import {
  createProduto,
  listProdutos,
  removeProduto,
  setProdutoAtivo,
  updateProduto,
  type ProdutoListItem,
} from "@/services/produto.service";
import { fail, ok, type ActionResult } from "@/types";

import { produtoSchema } from "./schema";

export async function listProdutosAction(
  showInactive: boolean,
): Promise<ProdutoListItem[]> {
  return listProdutos(showInactive);
}

export async function createProdutoAction(
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = produtoSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const id = await createProduto(parsed.data);
    revalidatePath("/produtos");
    return ok({ id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function updateProdutoAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = produtoSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await updateProduto(id, parsed.data);
    revalidatePath("/produtos");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function deleteProdutoAction(id: string): Promise<ActionResult> {
  try {
    await removeProduto(id);
    revalidatePath("/produtos");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao excluir.");
  }
}

export async function toggleProdutoAtivoAction(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    await setProdutoAtivo(id, ativo);
    revalidatePath("/produtos");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao atualizar.");
  }
}
