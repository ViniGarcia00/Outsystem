"use server";

import { revalidatePath } from "next/cache";

import {
  createUsuario,
  listUsuarios,
  removeUsuario,
  setUsuarioAtivo,
  updateUsuario,
  type UsuarioListItem,
} from "@/services/usuario.service";
import { fail, ok, type ActionResult } from "@/types";

import { usuarioSchema } from "./schema";

export async function listUsuariosAction(
  showInactive: boolean,
): Promise<UsuarioListItem[]> {
  return listUsuarios(showInactive);
}

export async function createUsuarioAction(
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = usuarioSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const id = await createUsuario(parsed.data);
    revalidatePath("/usuarios");
    return ok({ id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function updateUsuarioAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = usuarioSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await updateUsuario(id, parsed.data);
    revalidatePath("/usuarios");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function deleteUsuarioAction(id: string): Promise<ActionResult> {
  try {
    await removeUsuario(id);
    revalidatePath("/usuarios");
    return ok(undefined);
  } catch (error) {
    // A mensagem do bloqueio chega ao usuário como está — é ela que orienta
    // a inativar em vez de excluir.
    return fail(error instanceof Error ? error.message : "Falha ao excluir.");
  }
}

export async function toggleUsuarioAtivoAction(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    await setUsuarioAtivo(id, ativo);
    revalidatePath("/usuarios");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao atualizar.");
  }
}
