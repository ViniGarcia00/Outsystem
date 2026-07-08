import { renderToBuffer } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { PresentationDocument } from "./presentation-document";

/**
 * Renderiza o PDF Apresentação em um buffer (Node). Mesmo padrão do PDF
 * Comercial (`../render`), reutilizando o mesmo DTO.
 */
export async function renderPresentationPdf(
  dto: PropostaPdfDTO,
): Promise<Buffer> {
  return renderToBuffer(<PresentationDocument dto={dto} />);
}
