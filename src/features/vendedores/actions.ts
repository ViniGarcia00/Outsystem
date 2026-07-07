"use server";

import { revalidatePath } from "next/cache";

import {
  createVendedor,
  listVendedores,
  removeVendedor,
  setVendedorAtivo,
  updateVendedor,
  type VendedorListItem,
} from "@/services/vendedor.service";
import { fail, ok, type ActionResult } from "@/types";

import { vendedorSchema } from "./schema";

export async function listVendedoresAction(
  showInactive: boolean,
): Promise<VendedorListItem[]> {
  return listVendedores(showInactive);
}

export async function createVendedorAction(
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = vendedorSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const id = await createVendedor(parsed.data);
    revalidatePath("/vendedores");
    return ok({ id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function updateVendedorAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = vendedorSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await updateVendedor(id, parsed.data);
    revalidatePath("/vendedores");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function deleteVendedorAction(id: string): Promise<ActionResult> {
  try {
    await removeVendedor(id);
    revalidatePath("/vendedores");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao excluir.");
  }
}

export async function toggleVendedorAtivoAction(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    await setVendedorAtivo(id, ativo);
    revalidatePath("/vendedores");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao atualizar.");
  }
}
