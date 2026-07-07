"use server";

import { revalidatePath } from "next/cache";

import {
  createCliente,
  listClientes,
  removeCliente,
  setClienteAtivo,
  updateCliente,
  type ClienteListItem,
} from "@/services/cliente.service";
import { fail, ok, type ActionResult } from "@/types";

import { clienteSchema } from "./schema";

/** Lista clientes (usada para recarregar após mudanças e alternar inativos). */
export async function listClientesAction(
  showInactive: boolean,
): Promise<ClienteListItem[]> {
  return listClientes(showInactive);
}

export async function createClienteAction(
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clienteSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const id = await createCliente(parsed.data);
    revalidatePath("/clientes");
    return ok({ id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function updateClienteAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = clienteSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await updateCliente(id, parsed.data);
    revalidatePath("/clientes");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function deleteClienteAction(id: string): Promise<ActionResult> {
  try {
    await removeCliente(id);
    revalidatePath("/clientes");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao excluir.");
  }
}

export async function toggleClienteAtivoAction(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    await setClienteAtivo(id, ativo);
    revalidatePath("/clientes");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao atualizar.");
  }
}
