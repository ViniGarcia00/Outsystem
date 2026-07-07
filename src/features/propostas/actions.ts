"use server";

import { revalidatePath } from "next/cache";

import {
  searchClientes,
  type ClienteSuggestion,
} from "@/services/cliente.service";
import {
  searchProdutos,
  type ProdutoSuggestion,
} from "@/services/produto.service";
import {
  cancelarProposta,
  criarPropostaCompleta,
  duplicarProposta,
  emitirProposta,
  listPropostas,
  salvarProposta,
  type PropostaListItem,
} from "@/services/proposta.service";
import { fail, ok, type ActionResult } from "@/types";

import { cancelarSchema, novaPropostaSchema, salvarPropostaSchema } from "./schema";

export async function listPropostasAction(): Promise<PropostaListItem[]> {
  return listPropostas();
}

/** Autocomplete de clientes na proposta (Nome/Razão Social/CPF/CNPJ). */
export async function searchClientesAction(
  query: string,
): Promise<ClienteSuggestion[]> {
  return searchClientes(query);
}

/** Autocomplete de produtos na proposta (Código/Descrição). */
export async function searchProdutosAction(
  query: string,
): Promise<ProdutoSuggestion[]> {
  return searchProdutos(query);
}

/**
 * Confirma a criação da proposta (montagem em memória → transação única).
 * Só aqui a proposta passa a existir e consome um número.
 */
export async function criarPropostaAction(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = novaPropostaSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const { id } = await criarPropostaCompleta(parsed.data);
    revalidatePath("/propostas");
    return ok({ id });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Falha ao criar a proposta.",
    );
  }
}

/**
 * "Salvar Alterações": persiste TODAS as alterações da proposta existente numa
 * única transação (revisão automática no salvamento, se emitida).
 */
export async function salvarPropostaAction(
  id: string,
  payload: unknown,
): Promise<ActionResult<{ revisaoAtual: number; forked: boolean }>> {
  const parsed = salvarPropostaSchema.safeParse(payload);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const r = await salvarProposta(id, parsed.data);
    revalidatePath("/propostas");
    return ok({ revisaoAtual: r.revisaoAtual, forked: r.forked });
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
