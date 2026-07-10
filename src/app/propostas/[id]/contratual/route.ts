import { renderPropostaPdf } from "@/features/propostas/pdf";
import { getPropostaPdfData } from "@/services/proposta-pdf.service";

/**
 * PDF Contratual da proposta (Sprint 2.10.2) — anexo ao contrato, gerado SOB
 * DEMANDA. Mesma base do PDF Detalhado (variante "contratual"): mostra tudo o
 * que será entregue SEM preço por item — o cliente vê apenas o Total da
 * Proposta. Runtime Node (o @react-pdf/renderer usa APIs de Node) e sem cache.
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

  const buffer = await renderPropostaPdf(dto, "contratual");
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contrato-${dto.numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
