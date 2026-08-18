"use server";

import { revalidatePath } from "next/cache";

import { getClienteEnderecoSnapshot } from "@/services/cliente.service";
import {
  atualizarInstalacao,
  cancelarInstalacao,
  criarInstalacao,
  listInstalacoes,
  searchPropostas,
  type InstalacaoListItem,
  type PropostaSuggestion,
} from "@/services/instalacao.service";
import { fail, ok, type ActionResult } from "@/types";

import { dataDeInput } from "./datas";
import { snapshotEndereco, type EnderecoInstalacao } from "./endereco";
import { cabecalhoInstalacaoSchema, novaInstalacaoSchema } from "./schema";

/**
 * Converte as datas do formulário (texto do `<input type="date">`) em `Date`.
 * O fuso é fixo em `America/Sao_Paulo` — ver `datas.ts`.
 */
function comDatas<T extends { dataPrevista: string; dataAgendada: string }>(
  values: T,
) {
  return {
    ...values,
    dataPrevista: dataDeInput(values.dataPrevista),
    dataAgendada: dataDeInput(values.dataAgendada),
  };
}

export async function listInstalacoesAction(): Promise<InstalacaoListItem[]> {
  return listInstalacoes();
}

export async function searchPropostasAction(
  query: string,
): Promise<PropostaSuggestion[]> {
  return searchPropostas(query);
}

/**
 * Endereço do Cliente para **PRÉ-VISUALIZAÇÃO na tela**, nada além disso.
 *
 * O que é gravado NÃO vem daqui: `criarInstalacao` lê o Cliente do banco e
 * deriva o snapshot por conta própria (ADR-0400). Esta action existe apenas para
 * o usuário conferir, antes de salvar, qual endereço será copiado. Se ela
 * devolvesse algo diferente do que o service grava, o service continuaria certo.
 */
export async function enderecoDoClienteAction(
  clienteId: string,
): Promise<EnderecoInstalacao | null> {
  const cliente = await getClienteEnderecoSnapshot(clienteId);
  return cliente ? snapshotEndereco(cliente) : null;
}

export async function criarInstalacaoAction(
  values: unknown,
): Promise<ActionResult<{ id: string; numero: number }>> {
  const parsed = novaInstalacaoSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const criada = await criarInstalacao(comDatas(parsed.data));
    revalidatePath("/instalacoes");
    return ok(criada);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function atualizarInstalacaoAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = cabecalhoInstalacaoSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await atualizarInstalacao(id, comDatas(parsed.data));
    revalidatePath("/instalacoes");
    revalidatePath(`/instalacoes/${id}`);
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function cancelarInstalacaoAction(
  id: string,
  motivo: string,
): Promise<ActionResult> {
  try {
    await cancelarInstalacao(id, motivo);
    revalidatePath("/instalacoes");
    revalidatePath(`/instalacoes/${id}`);
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao cancelar.");
  }
}
