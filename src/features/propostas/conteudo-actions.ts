"use server";

import { revalidatePath } from "next/cache";

import {
  adicionarItem,
  adicionarItemAvulso,
  adicionarSecao,
  atualizarQuantidade,
  atualizarValorUnitario,
  moverItem,
  moverSecao,
  removerItem,
  removerSecao,
  renomearSecao,
} from "@/services/proposta-conteudo.service";
import { fail, ok, type ActionResult } from "@/types";

type Direcao = "UP" | "DOWN";

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    revalidatePath("/propostas");
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha na operação.");
  }
}

// Seções
export async function adicionarSecaoAction(propostaId: string, nome: string) {
  return run(() => adicionarSecao(propostaId, nome));
}

export async function renomearSecaoAction(secaoId: string, nome: string) {
  return run(() => renomearSecao(secaoId, nome));
}

export async function removerSecaoAction(secaoId: string) {
  return run(() => removerSecao(secaoId));
}

export async function moverSecaoAction(secaoId: string, direcao: Direcao) {
  return run(() => moverSecao(secaoId, direcao));
}

// Itens (produtos)
export async function adicionarItemAction(
  secaoId: string,
  produtoId: string,
  quantidade: number,
  valorUnitario?: number,
) {
  return run(() => adicionarItem(secaoId, produtoId, quantidade, valorUnitario));
}

/** Modelo Simplificada: adiciona o produto direto na proposta (seção implícita). */
export async function adicionarItemAvulsoAction(
  propostaId: string,
  produtoId: string,
  quantidade: number,
  valorUnitario?: number,
) {
  return run(() =>
    adicionarItemAvulso(propostaId, produtoId, quantidade, valorUnitario),
  );
}

export async function atualizarQuantidadeAction(
  itemId: string,
  quantidade: number,
) {
  return run(() => atualizarQuantidade(itemId, quantidade));
}

export async function atualizarValorUnitarioAction(
  itemId: string,
  valor: number,
) {
  return run(() => atualizarValorUnitario(itemId, valor));
}

export async function removerItemAction(itemId: string) {
  return run(() => removerItem(itemId));
}

export async function moverItemAction(itemId: string, direcao: Direcao) {
  return run(() => moverItem(itemId, direcao));
}
