"use server";

import { revalidatePath } from "next/cache";

import {
  atualizarRegistro,
  criarRegistro,
  excluirRegistro,
} from "@/services/instalacao-registro.service";
import { fail, ok, type ActionResult } from "@/types";

import { dataHoraDeInput } from "./datas";
import { registroSchema, type RegistroValues } from "./registro-schema";

/**
 * Server Actions da cronologia (Sprint 4.0.2).
 *
 * A conversão da data-hora acontece aqui, não no schema: transformar no Zod
 * faria o tipo de entrada divergir do de saída, e o React Hook Form manipula o
 * de entrada.
 *
 * O `instalacaoId` NÃO serve só para `revalidatePath`: ele é repassado ao
 * service, que condiciona a busca do registro àquela instalação. A action é uma
 * fronteira pública — a integridade do agregado é garantida no service.
 */

/** Converte a data-hora do formulário; o schema já garantiu o formato. */
function paraInput(values: RegistroValues) {
  const aconteceuEm = dataHoraDeInput(values.aconteceuEm);
  if (!aconteceuEm) throw new Error("Data do acontecimento inválida.");
  return { ...values, aconteceuEm };
}

export async function criarRegistroAction(
  instalacaoId: string,
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = registroSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    const criado = await criarRegistro(instalacaoId, paraInput(parsed.data));
    revalidatePath(`/instalacoes/${instalacaoId}`);
    return ok(criado);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function atualizarRegistroAction(
  instalacaoId: string,
  registroId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = registroSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }
  try {
    await atualizarRegistro(instalacaoId, registroId, paraInput(parsed.data));
    revalidatePath(`/instalacoes/${instalacaoId}`);
    return ok(undefined);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Falha ao salvar.");
  }
}

export async function excluirRegistroAction(
  instalacaoId: string,
  registroId: string,
): Promise<ActionResult> {
  try {
    await excluirRegistro(instalacaoId, registroId);
    revalidatePath(`/instalacoes/${instalacaoId}`);
    return ok(undefined);
  } catch (error) {
    // A mensagem do bloqueio (REGISTRO_COM_CUSTOS) chega ao usuário como está.
    return fail(error instanceof Error ? error.message : "Falha ao excluir.");
  }
}
