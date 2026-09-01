import { logger } from "@/infrastructure/logging";
import { criarAnexoPosVenda } from "@/services/pos-venda-anexo.service";

/**
 * Upload de anexo do registro — ordem de serviço (Sprint 4.6).
 *
 * **Route Handler, não Server Action, por decisão (ADR-0414).** O limite padrão
 * de corpo de Server Action é 1 MB e uma foto de celular não passa. Subir
 * `serverActions.bodySizeLimit` afetaria TODA Server Action do sistema para
 * resolver um caso pontual — `next.config.ts` continua vazio.
 *
 * Sem regra de negócio: orquestra e traduz erro. Validação, allowlist, limites,
 * nome físico e caminho são todos do service, compartilhados com a outra ponta
 * do módulo.
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
    logger.warn("Anexo pós-venda: corpo multipart inválido", { falha });
    return Response.json({ erro: "Envio inválido." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ erro: "Selecione um arquivo." }, { status: 400 });
  }

  try {
    const anexo = await criarAnexoPosVenda("OS", id, registroId, file);
    return Response.json(anexo, { status: 201 });
  } catch (erro) {
    // As mensagens do service são escritas para o usuário (formato recusado,
    // limite excedido, máximo por registro) e chegam como estão. 400 porque
    // todas descrevem algo errado no ENVIO, não no servidor.
    const mensagem =
      erro instanceof Error ? erro.message : "Falha ao anexar o arquivo.";
    logger.warn("Anexo pós-venda: upload recusado", {
      agregado: "OS",
      osId: id,
      registroId,
      mensagem,
    });
    return Response.json({ erro: mensagem }, { status: 400 });
  }
}
