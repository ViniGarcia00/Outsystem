import { criarAnexo } from "@/services/instalacao-anexo.service";
import { logger } from "@/infrastructure/logging";

/**
 * Upload de anexo do registro (Sprint 4.3, ADR-0414).
 *
 * **Route Handler, não Server Action, por decisão.** O limite padrão de corpo
 * de Server Action é 1 MB e uma foto de celular não passa. Subir
 * `serverActions.bodySizeLimit` afetaria TODA Server Action do sistema para
 * resolver um caso pontual — `next.config.ts` continua vazio.
 *
 * O spike da T15 provou 8 MB entrando por aqui, em dev e em build, com sha256
 * conferido nas duas pontas.
 *
 * Sem regra de negócio: orquestra e traduz erro, como as rotas de documento da
 * Proposta (ADR-0330). Validação, allowlist, limites, nome físico e caminho são
 * todos do service.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; registroId: string }> },
) {
  const { id, registroId } = await params;

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch (falha) {
    logger.warn("Anexo: corpo multipart inválido", { falha });
    return Response.json({ erro: "Envio inválido." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ erro: "Selecione um arquivo." }, { status: 400 });
  }

  try {
    const anexo = await criarAnexo(id, registroId, file);
    return Response.json(anexo, { status: 201 });
  } catch (erro) {
    // As mensagens do service são escritas para o usuário (formato recusado,
    // limite excedido, máximo por registro) e chegam como estão. 400 porque
    // todas descrevem algo errado no ENVIO, não no servidor.
    const mensagem =
      erro instanceof Error ? erro.message : "Falha ao anexar o arquivo.";
    logger.warn("Anexo: upload recusado", { instalacaoId: id, registroId, mensagem });
    return Response.json({ erro: mensagem }, { status: 400 });
  }
}
