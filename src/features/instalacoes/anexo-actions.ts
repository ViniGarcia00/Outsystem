"use server";

import { revalidatePath } from "next/cache";

import { excluirAnexo } from "@/services/instalacao-anexo.service";
import { fail, ok, type ActionResult } from "@/types";

/**
 * Exclusão de anexo (Sprint 4.3, ADR-0414).
 *
 * Continua Server Action, ao contrário do upload: só apaga uma linha e dispara
 * um `unlink` — não há corpo grande, então o limite de 1 MB que forçou o Route
 * Handler no upload não se aplica aqui.
 *
 * Os três ids são repassados ao service, que resolve pelo agregado completo. A
 * action é fronteira pública: quem garante o pertencimento é o service.
 */
export async function excluirAnexoAction(
  instalacaoId: string,
  registroId: string,
  anexoId: string,
): Promise<ActionResult> {
  try {
    await excluirAnexo(instalacaoId, registroId, anexoId);
    revalidatePath(`/instalacoes/${instalacaoId}`);
    return ok(undefined);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Falha ao excluir o anexo.",
    );
  }
}
