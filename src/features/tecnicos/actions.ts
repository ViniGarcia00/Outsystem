"use server";

import { revalidatePath } from "next/cache";

import {
  createTecnico,
  listTecnicos,
  removeTecnico,
  setTecnicoAtivo,
  updateTecnico,
  type TecnicoListItem,
} from "@/services/tecnico.service";
import { fail, ok, type ActionResult } from "@/types";

import { tecnicoSchema } from "./schema";

export async function listTecnicosAction(
  showInactive: boolean,
): Promise<TecnicoListItem[]> {
  return listTecnicos(showInactive);
}

export async function createTecnicoAction(
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = tecnicoSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const id = await createTecnico(parsed.data);
    revalidatePath("/tecnicos");
    return ok({ id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function updateTecnicoAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = tecnicoSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await updateTecnico(id, parsed.data);
    revalidatePath("/tecnicos");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function deleteTecnicoAction(id: string): Promise<ActionResult> {
  try {
    await removeTecnico(id);
    revalidatePath("/tecnicos");
    return ok(undefined);
  } catch (error) {
    // A mensagem do bloqueio chega ao usuário como está — é ela que orienta
    // a inativar em vez de excluir.
    return fail(error instanceof Error ? error.message : "Falha ao excluir.");
  }
}

export async function toggleTecnicoAtivoAction(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    await setTecnicoAtivo(id, ativo);
    revalidatePath("/tecnicos");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao atualizar.");
  }
}
