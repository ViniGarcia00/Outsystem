import { renderToBuffer } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { PropostaPdfDocument, type VariantePdf } from "./proposta-pdf-document";

/**
 * Renderiza o documento comercial em um buffer PDF (Node). Ponto único de
 * renderização usado pelos Route Handlers. `variante` seleciona o layout:
 * "detalhado" (com todos os valores) ou "contratual" (sem preços por item —
 * anexo ao contrato). Sprint 2.10.2.
 */
export async function renderPropostaPdf(
  dto: PropostaPdfDTO,
  variante: VariantePdf = "detalhado",
): Promise<Buffer> {
  return renderToBuffer(<PropostaPdfDocument dto={dto} variante={variante} />);
}
