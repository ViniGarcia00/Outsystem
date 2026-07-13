import {
  contentDispositionPdf,
  nomeArquivoPdf,
} from "@/features/propostas/pdf/filename";
import { renderPresentationPdf } from "@/features/propostas/pdf/presentation";
import { getPropostaPdfData } from "@/services/proposta-pdf.service";

/**
 * PDF Apresentação da proposta — documento comercial institucional (premium),
 * gerado SOB DEMANDA. Reutiliza exatamente o mesmo carregamento de dados do PDF
 * Comercial (`getPropostaPdfData`); a única diferença é o layout. Runtime Node
 * (o @react-pdf/renderer usa APIs de Node) e sem cache.
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
  // Simplificada não dispõe de PDF Apresentação (Sprint 2.9.4) — só o Comercial.
  if (dto.simplificada) {
    return new Response(
      "PDF Apresentação indisponível para propostas no modelo Simplificada.",
      { status: 400 },
    );
  }

  const buffer = await renderPresentationPdf(dto);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionPdf(
        nomeArquivoPdf("comercial", dto),
      ),
      "Cache-Control": "no-store",
    },
  });
}
