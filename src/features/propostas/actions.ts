"use server";

import { revalidatePath } from "next/cache";

import {
  searchClientes,
  type ClienteSuggestion,
} from "@/services/cliente.service";
import {
  cancelarProposta,
  criarProposta,
  duplicarProposta,
  emitirProposta,
  listPropostas,
  updateCabecalho,
  type PropostaListItem,
} from "@/services/proposta.service";
import { fail, ok, type ActionResult } from "@/types";

import { cabecalhoPatchSchema, cancelarSchema } from "./schema";

export async function listPropostasAction(): Promise<PropostaListItem[]> {
  return listPropostas();
}

/** Autocomplete de clientes na proposta (Nome/Razão Social/CPF/CNPJ). */
export async function searchClientesAction(
  query: string,
): Promise<ClienteSuggestion[]> {
  return searchClientes(query);
}

/** Cria a proposta completa já numerada (RASCUNHO, Rev.0) e devolve o id. */
export async function criarPropostaAction(): Promise<
  ActionResult<{ id: string }>
> {
  try {
    const { id } = await criarProposta();
    revalidatePath("/propostas");
    return ok({ id });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao criar.");
  }
}

/** Auto-save do cabeçalho (patch parcial por campo). */
export async function salvarCabecalhoAction(
  id: string,
  patch: unknown,
): Promise<ActionResult> {
  const parsed = cabecalhoPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await updateCabecalho(id, parsed.data);
    revalidatePath("/propostas");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

/** "Gerar PDF": emite e congela a revisão atual. */
export async function emitirPropostaAction(id: string): Promise<ActionResult> {
  try {
    await emitirProposta(id);
    revalidatePath("/propostas");
    return ok(undefined);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Falha ao gerar o PDF.",
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
