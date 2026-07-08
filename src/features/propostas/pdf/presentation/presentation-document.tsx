import { Document } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { registrarFontes } from "../fonts";
import {
  PaginaBeneficios,
  PaginaCapa,
  PaginaCases,
  PaginaInvestimento,
  PaginaItens,
  PaginaObrigado,
  PaginaPagamento,
  PaginaProcesso,
  PaginaQuemSomos,
  PaginaServicos,
} from "./pages";
import type { Templates } from "./templates";

/**
 * Documento comercial institucional (PDF Apresentação) — 10 páginas em 16:9
 * (landscape), cada uma usando o respectivo template como plano de fundo.
 * Consome exatamente o mesmo {@link PropostaPdfDTO} do PDF Comercial (nenhuma
 * consulta/regra paralela). Páginas dinâmicas: 1, 6, 8, 9; fixas: 2,3,4,5,7,10.
 */
export function PresentationDocument({
  dto,
  templates,
}: {
  dto: PropostaPdfDTO;
  templates: Templates;
}) {
  registrarFontes();

  return (
    <Document
      title={`Apresentação — Proposta ${dto.numero}`}
      author={dto.empresa.nome}
    >
      <PaginaCapa dto={dto} bg={templates["page-01-cover"]} />
      <PaginaQuemSomos bg={templates["page-02-about"]} />
      <PaginaBeneficios bg={templates["page-03-benefits"]} />
      <PaginaCases bg={templates["page-04-projects"]} />
      <PaginaProcesso bg={templates["page-05-process"]} />
      <PaginaItens dto={dto} bg={templates["page-06-project"]} />
      <PaginaServicos bg={templates["page-07-services"]} />
      <PaginaInvestimento dto={dto} bg={templates["page-08-investment"]} />
      <PaginaPagamento dto={dto} bg={templates["page-09-payment"]} />
      <PaginaObrigado bg={templates["page-10-thanks"]} />
    </Document>
  );
}
