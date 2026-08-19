import { renderToBuffer } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import type { ProdutoConsolidado } from "./consolidado";
import { ProdutosPdfDocument } from "./produtos-pdf-document";
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

/**
 * Renderiza o **PDF Geral de Produtos** (Sprint 4.0.3, ADR-0407). Recebe a lista
 * já consolidada pela função pura — o renderer não agrupa nem soma.
 */
export async function renderProdutosPdf(
  dto: PropostaPdfDTO,
  produtos: ProdutoConsolidado[],
): Promise<Buffer> {
  return renderToBuffer(<ProdutosPdfDocument dto={dto} produtos={produtos} />);
}
