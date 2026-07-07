"use server";

import { revalidatePath } from "next/cache";

import { saveConfiguracao } from "@/services/configuracao.service";
import { saveLogoFile } from "@/services/logo.service";
import { fail, ok, type ActionResult } from "@/types";

import { configuracaoSchema } from "./schema";

/**
 * Server Action: salva a Configuração do Sistema (singleton).
 * Valida no servidor (mesmo schema do formulário) e devolve `ActionResult`.
 */
export async function saveConfiguracaoAction(
  values: unknown,
): Promise<ActionResult> {
  const parsed = configuracaoSchema.safeParse(values);
  if (!parsed.success) {
    return fail("Dados inválidos. Verifique os campos destacados.");
  }

  try {
    await saveConfiguracao(parsed.data);
    revalidatePath("/configuracoes");
    return ok(undefined);
  } catch (error) {
    return fail(
      error instanceof Error
        ? `Não foi possível salvar a configuração: ${error.message}`
        : "Não foi possível salvar a configuração.",
    );
  }
}

/**
 * Server Action: recebe o logotipo por upload, grava no armazenamento e
 * persiste o nome do arquivo em `Config.logo`. Retorna o nome gravado.
 */
export async function uploadLogoAction(
  formData: FormData,
): Promise<ActionResult<{ logo: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Selecione um arquivo de imagem.");
  }
  try {
    const logo = await saveLogoFile(file);
    revalidatePath("/configuracoes");
    return ok({ logo });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Falha ao enviar o logotipo.",
    );
  }
}
