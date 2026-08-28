import { readFileSync } from "node:fs";
import path from "node:path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import type { ContratoTemplateDTO } from "./contrato.mapper";
import { resolverVersaoTemplate, templateDe } from "./templates";

/**
 * Renderiza o Contrato (.docx) preenchendo o template oficial marcado
 * (Sprint 3.1).
 *
 * SEM regra de negócio: abre o template, troca placeholder por valor, devolve o
 * buffer. Nada de calcular, formatar moeda/data, converter extenso ou decidir —
 * isso tudo é do `ContratoMapper`, que entrega o DTO pronto.
 *
 * Só os placeholders são substituídos: fonte, margens, cabeçalho, rodapé,
 * espaçamentos, numeração e estilos vêm do template e não são tocados.
 *
 * O template é lido do disco a cada chamada — igual aos PNGs do PDF
 * Apresentação —, então trocar o arquivo basta, sem redeploy de código.
 */
const DIR_TEMPLATES = path.join(
  process.cwd(),
  "public",
  "templates",
  "contrato",
);

/**
 * Renderiza o contrato **na versão do template com que a revisão foi
 * congelada** (ADR-0415), não na versão vigente. É isso que impede um contrato
 * antigo de mudar de texto jurídico quando o template é trocado.
 *
 * `versao` nula/desconhecida cai no padrão histórico (`rev3`) — revisões
 * emitidas antes da Sprint 4.4 não têm carimbo.
 */
export function renderContratoDocx(
  dto: ContratoTemplateDTO,
  versao?: string | null,
): Buffer {
  const template = templateDe(resolverVersaoTemplate(versao));
  const zip = new PizZip(readFileSync(path.join(DIR_TEMPLATES, template.arquivo)));

  const doc = new Docxtemplater(zip, {
    // Sem loops no template — o escopo vai no Anexo I (PDF), não no contrato.
    paragraphLoop: false,
    // A forma de pagamento é texto livre e pode ter quebras de linha.
    linebreaks: true,
  });

  doc.render(dto);

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
