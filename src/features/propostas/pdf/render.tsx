import { renderToBuffer } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { PropostaPdfDocument } from "./proposta-pdf-document";

/**
 * Renderiza o documento comercial em um buffer PDF (Node). Ponto único de
 * renderização usado pelo Route Handler.
 */
export async function renderPropostaPdf(dto: PropostaPdfDTO): Promise<Buffer> {
  return renderToBuffer(<PropostaPdfDocument dto={dto} />);
}
