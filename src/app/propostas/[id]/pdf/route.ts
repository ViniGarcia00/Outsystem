import { renderPropostaPdf } from "@/features/propostas/pdf";
import { getPropostaPdfData } from "@/services/proposta-pdf.service";

/**
 * Documento comercial (PDF) da proposta — gerado SOB DEMANDA (sem armazenar).
 * Renderiza a `currentRevision` (para EMITIDA = revisão congelada). Runtime
 * Node (o @react-pdf/renderer usa APIs de Node) e sem cache.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dto = await getPropostaPdfData(id);
  if (!dto) {
    return new Response("Proposta não encontrada.", { status: 404 });
  }

  const buffer = await renderPropostaPdf(dto);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="proposta-${dto.numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
