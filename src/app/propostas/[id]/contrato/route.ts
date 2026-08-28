import {
  montarContratoTemplateDTO,
  validarGeracaoContrato,
} from "@/features/propostas/docx/contrato.mapper";
import { renderContratoDocx } from "@/features/propostas/docx/render";
import {
  contentDisposition,
  nomeArquivoContrato,
} from "@/features/propostas/pdf/filename";
import { getPropostaPdfData } from "@/services/proposta-pdf.service";

/**
 * Contrato (.docx) da proposta (Sprint 3.1) — documento jurídico gerado SOB
 * DEMANDA a partir do template oficial da Outmat. Diferente dos PDFs, é
 * EDITÁVEL: o usuário ajusta prazos, multa e cláusulas no Word antes de enviar.
 *
 * Sem regra de negócio: localiza a proposta, delega ao `ContratoMapper` e ao
 * renderer, devolve o arquivo. Reusa o mesmo loader dos PDFs
 * (`getPropostaPdfData`), então o valor do contrato é `resumo.totalGeral` —
 * idêntico ao do Anexo Contratual.
 *
 * Runtime Node (leitura de arquivo do template) e sem cache.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dto = await getPropostaPdfData(id);
  if (!dto) {
    return new Response("Proposta não encontrada.", { status: 404 });
  }

  // Guarda de geração (ADR-0416): o contrato Rev. 4 exige prazo de execução e
  // parcela final. Sem eles o documento sairia com "de  dias úteis" e "R$ .".
  // Contratos rev3 não sofrem a guarda — ver validarGeracaoContrato.
  const faltando = validarGeracaoContrato(dto, dto.templateContratoVersao);
  if (faltando) {
    return new Response(faltando, { status: 400 });
  }

  let buffer: Buffer;
  try {
    // A versão vem da REVISÃO, não do vigente (ADR-0415): um contrato emitido
    // na rev3 continua saindo na rev3 depois de a rev4 entrar em vigor.
    buffer = renderContratoDocx(
      montarContratoTemplateDTO(dto),
      dto.templateContratoVersao,
    );
  } catch (erro) {
    // Template ausente/corrompido ou tag por resolver. O detalhe vai para o log
    // do servidor; o usuário recebe uma mensagem sem entranhas do sistema.
    console.error(`Falha ao gerar o contrato da proposta ${id}`, erro);
    return new Response("Não foi possível gerar o contrato.", { status: 500 });
  }

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE,
      "Content-Disposition": contentDisposition(
        nomeArquivoContrato(dto),
        "attachment",
      ),
      "Cache-Control": "no-store",
    },
  });
}
