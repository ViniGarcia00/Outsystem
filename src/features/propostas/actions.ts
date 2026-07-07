"use server";

import { revalidatePath } from "next/cache";

import {
  searchClientes,
  type ClienteSuggestion,
} from "@/services/cliente.service";
import {
  cancelarProposta,
  criarRevisao,
  createProposta,
  duplicarProposta,
  listPropostas,
  updateProposta,
  type PropostaListItem,
} from "@/services/proposta.service";
import { fail, ok, type ActionResult } from "@/types";

import { cancelarSchema, propostaSchema } from "./schema";

export async function listPropostasAction(): Promise<PropostaListItem[]> {
  return listPropostas();
}

/** Autocomplete de clientes na proposta (Nome/Razão Social/CPF/CNPJ). */
export async function searchClientesAction(
  query: string,
): Promise<ClienteSuggestion[]> {
  return searchClientes(query);
}

export async function createPropostaAction(
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = propostaSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const { id } = await createProposta(parsed.data);
    revalidatePath("/propostas");
    return ok({ id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function updatePropostaAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = propostaSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await updateProposta(id, parsed.data);
    revalidatePath("/propostas");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function criarRevisaoAction(id: string): Promise<ActionResult> {
  try {
    await criarRevisao(id);
    revalidatePath("/propostas");
    return ok(undefined);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Falha ao criar revisão.",
    );
  }
}

export async function duplicarPropostaAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const nova = await duplicarProposta(id);
    revalidatePath("/propostas");
    return ok({ id: nova.id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao duplicar.");
  }
}

export async function cancelarPropostaAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = cancelarSchema.safeParse(values);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return fail(first);
  }
  try {
    await cancelarProposta(id, parsed.data.motivo, parsed.data.obs);
    revalidatePath("/propostas");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao cancelar.");
  }
}
