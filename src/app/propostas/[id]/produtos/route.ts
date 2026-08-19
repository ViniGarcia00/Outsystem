import { consolidarProdutos, renderProdutosPdf } from "@/features/propostas/pdf";
import {
  contentDispositionPdf,
  nomeArquivoPdf,
} from "@/features/propostas/pdf/filename";
import { getPropostaPdfData } from "@/services/proposta-pdf.service";

/**
 * PDF Geral de Produtos (Sprint 4.0.3, ADR-0407) — quinto documento da Proposta.
 *
 * Lista quantitativa de material: uma linha por produto, com as ocorrências de
 * todas as Seções somadas. Sem preço e sem total — a finalidade é separação e
 * conferência, não negociação.
 *
 * Mesma arquitetura dos outros quatro documentos, com o **mesmo loader**:
 *
 *   getPropostaPdfData → PropostaPdfDTO → consolidarProdutos → renderer
 *
 * Nenhuma consulta Prisma paralela aqui. Diferente dos demais, gerar este
 * documento **não emite a proposta**: é uso interno e operacional, disponível em
 * RASCUNHO e EMITIDA — emitir por engano ao conferir material seria um defeito
 * de negócio, não uma conveniência.
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

  const buffer = await renderProdutosPdf(dto, consolidarProdutos(dto));
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionPdf(
        nomeArquivoPdf("produtos", dto),
      ),
      "Cache-Control": "no-store",
    },
  });
}
