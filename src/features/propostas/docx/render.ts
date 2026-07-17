import { readFileSync } from "node:fs";
import path from "node:path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import type { ContratoTemplateDTO } from "./contrato.mapper";

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
const TEMPLATE = path.join(
  process.cwd(),
  "public",
  "templates",
  "contrato",
  "contrato-outmat.docx",
);

export function renderContratoDocx(dto: ContratoTemplateDTO): Buffer {
  const zip = new PizZip(readFileSync(TEMPLATE));

  const doc = new Docxtemplater(zip, {
    // Sem loops no template — o escopo vai no Anexo I (PDF), não no contrato.
    paragraphLoop: false,
    // A forma de pagamento é texto livre e pode ter quebras de linha.
    linebreaks: true,
  });

  doc.render(dto);

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
