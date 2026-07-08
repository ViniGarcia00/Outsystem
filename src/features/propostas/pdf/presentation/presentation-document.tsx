import { Document } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { registrarFontes } from "../fonts";
import {
  PaginaBeneficios,
  PaginaCapa,
  PaginaCases,
  PaginaInvestimento,
  PaginaInvestimentoTotal,
  PaginaItens,
  PaginaObrigado,
  PaginaPagamento,
  PaginaProcesso,
  PaginaQuemSomos,
  PaginaServicoComplementar,
  PaginaServicos,
} from "./pages";
import type { Templates } from "./templates";

/**
 * Documento comercial institucional (PDF Apresentação) — 13 slides oficiais em
 * 16:9 (landscape), cada um usando o respectivo template como plano de fundo.
 * Consome exatamente o mesmo {@link PropostaPdfDTO} do PDF Comercial (nenhuma
 * consulta/regra paralela).
 *
 * Slides CONDICIONAIS (Sprint 2.9.3):
 * - 09 Projeto Som Ambiente  → só quando existe serviço SOM;
 * - 10 Projeto Wi-Fi Premium → só quando existe serviço WIFI;
 * - 11 Investimento Total    → só quando existe ≥1 Serviço Complementar.
 * O slide 08 (Investimento da Automação) é SEMPRE renderizado e NUNCA inclui
 * Som/Wi-Fi. Contagens: Automação=10; +Som=12; +Wi-Fi=12; +ambos=13.
 */
export function PresentationDocument({
  dto,
  templates,
}: {
  dto: PropostaPdfDTO;
  templates: Templates;
}) {
  registrarFontes();

  const som = dto.servicos.find((s) => s.tipo === "SOM");
  const wifi = dto.servicos.find((s) => s.tipo === "WIFI");
  const temServicos = dto.servicos.length > 0;

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
      <PaginaItens dto={dto} bg={templates["page-06-automation-project"]} />
      <PaginaServicos bg={templates["page-07-automation-services"]} />
      <PaginaInvestimento dto={dto} bg={templates["page-08-automation-investment"]} />
      {som && (
        <PaginaServicoComplementar
          servico={som}
          bg={templates["page-09-sound-project"]}
        />
      )}
      {wifi && (
        <PaginaServicoComplementar
          servico={wifi}
          bg={templates["page-10-wifi-premium"]}
        />
      )}
      {temServicos && (
        <PaginaInvestimentoTotal
          dto={dto}
          bg={templates["page-11-total-investment"]}
        />
      )}
      <PaginaPagamento dto={dto} bg={templates["page-12-payment"]} />
      <PaginaObrigado bg={templates["page-13-thank-you"]} />
    </Document>
  );
}
