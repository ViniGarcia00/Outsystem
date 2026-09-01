import { MIMES_INLINE, MIME_ACEITOS } from "@/lib/anexos";
import { lerAnexoPosVenda } from "@/services/pos-venda-anexo.service";

/**
 * Download de anexo do registro — ordem de serviço (Sprint 4.6).
 *
 * O anexo é resolvido pelo AGREGADO COMPLETO — processo, registro e anexo. A
 * rota não decide isso: repassa os três ids e o service devolve `null` tanto
 * para inexistente quanto para "não pertence", que é a mesma resposta 404 aqui.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ id: string; registroId: string; anexoId: string }> },
) {
  const { id, registroId, anexoId } = await params;

  const anexo = await lerAnexoPosVenda("OS", id, registroId, anexoId);
  if (!anexo) return new Response("Anexo não encontrado.", { status: 404 });

  /**
   * `Content-Type` DERIVADO da allowlist, nunca ecoando o valor guardado.
   * Mesmo princípio da extensão física: o tipo que sai é sempre um dos que o
   * sistema aceita, independentemente do que houver na linha.
   */
  const tipo =
    anexo.mimeType in MIME_ACEITOS ? anexo.mimeType : "application/octet-stream";

  // Imagem abre no navegador; o resto baixa. Só tipos da allowlist chegam aqui,
  // então `inline` nunca serve algo que o navegador executaria como documento.
  const disposicao = MIMES_INLINE.has(tipo) ? "inline" : "attachment";
  // `filename*=UTF-8''` preserva acentos; o `encodeURIComponent` também
  // neutraliza qualquer caractere que pudesse quebrar o cabeçalho.
  const nome = encodeURIComponent(anexo.nomeOriginal);

  return new Response(new Uint8Array(anexo.data), {
    status: 200,
    headers: {
      "Content-Type": tipo,
      "Content-Length": String(anexo.data.byteLength),
      "Content-Disposition": `${disposicao}; filename*=UTF-8''${nome}`,
      // Impede o navegador de adivinhar um tipo diferente do declarado.
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
