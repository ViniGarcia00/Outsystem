import { renderToBuffer } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { PresentationDocument } from "./presentation-document";
import { carregarTemplates } from "./templates";

/**
 * Renderiza o PDF Apresentação em um buffer (Node). Carrega os templates
 * gráficos (planos de fundo) e reutiliza o mesmo DTO do PDF Comercial.
 */
export async function renderPresentationPdf(
  dto: PropostaPdfDTO,
): Promise<Buffer> {
  const templates = carregarTemplates();
  return renderToBuffer(
    <PresentationDocument dto={dto} templates={templates} />,
  );
}
