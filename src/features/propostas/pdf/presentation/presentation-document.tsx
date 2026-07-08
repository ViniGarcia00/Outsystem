import { Document } from "@react-pdf/renderer";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { registrarFontes } from "../fonts";
import { criarTema } from "../theme";
import {
  PaginaCapa,
  PaginaCases,
  PaginaComoTrabalhamos,
  PaginaInvestimento,
  PaginaItens,
  PaginaObrigado,
  PaginaPagamento,
  PaginaPorQueAutomatizar,
  PaginaQuemSomos,
  PaginaServicos,
} from "./pages";

/**
 * Documento comercial institucional (PDF Apresentação) — versão premium para
 * envio ao cliente. Consome exatamente o mesmo {@link PropostaPdfDTO} do PDF
 * Comercial (mesma carga de dados/cálculos; nenhuma consulta ou regra paralela).
 *
 * Estrutura fixa de **10 páginas** (dinâmicas 1, 6, 8, 9; fixas 2, 3, 4, 5, 7,
 * 10). O layout premium de cada página será detalhado na Sprint 3.1.
 */
export function PresentationDocument({ dto }: { dto: PropostaPdfDTO }) {
  registrarFontes();
  const tema = criarTema(dto.empresa.corPrimaria, dto.empresa.corSecundaria);

  return (
    <Document
      title={`Apresentação — Proposta ${dto.numero}`}
      author={dto.empresa.nome}
    >
      <PaginaCapa dto={dto} tema={tema} />
      <PaginaQuemSomos dto={dto} tema={tema} />
      <PaginaPorQueAutomatizar dto={dto} tema={tema} />
      <PaginaCases dto={dto} tema={tema} />
      <PaginaComoTrabalhamos dto={dto} tema={tema} />
      <PaginaItens dto={dto} tema={tema} />
      <PaginaServicos dto={dto} tema={tema} />
      <PaginaInvestimento dto={dto} tema={tema} />
      <PaginaPagamento dto={dto} tema={tema} />
      <PaginaObrigado dto={dto} tema={tema} />
    </Document>
  );
}
