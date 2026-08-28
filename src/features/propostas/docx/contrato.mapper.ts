import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { valorPorExtenso } from "./extenso";
import { templateDe, type VersaoTemplateContrato } from "./templates";

/**
 * Mapper do Contrato (.docx) — Sprint 3.1.
 *
 * Toda a regra de negócio do contrato vive AQUI. O renderer só abre o template
 * e troca placeholder por valor: não calcula, não formata, não decide.
 *
 *   Proposta → calcularResumoFinanceiro() → este mapper → ContratoTemplateDTO
 *            → renderer → Contrato.docx
 *
 * O valor NÃO é recalculado: `dto.resumo` já vem de `calcularResumoFinanceiro`
 * (ver `montarPropostaPdfDTO`), a mesma fonte que alimenta o Anexo Contratual.
 * É isso que garante que os dois documentos citem o mesmo valor.
 *
 * As chaves deste DTO são as tags do template — o docxtemplater casa uma na
 * outra. Renomear um campo aqui exige remarcar o `.docx`
 * (`scripts/marcar-template-contrato.mjs`), senão a tag deixa de resolver.
 */
export interface ContratoTemplateDTO {
  /** Razão social (PJ) ou nome (PF) — já resolvido pelo DTO da proposta. */
  clienteNome: string;
  /** CPF ou CNPJ formatado. */
  clienteDocumento: string;
  /** Endereço em linha única, pontuado para a qualificação das partes. */
  clienteEndereco: string;
  propostaNumero: string;
  /** Valor SEM "R$" — a cláusula 2.1 do template já traz o símbolo. */
  valorTotal: string;
  /** Extenso SEM parênteses — o template já os traz. */
  valorTotalExtenso: string;
  formaPagamento: string;
  /** Data SEM cidade — o fecho do template já traz "São Caetano do Sul, ". */
  data: string;
  empresaNome: string;

  // --- Rev. 4 (ADR-0416) ---------------------------------------------------
  // Ignoradas ao renderizar a rev3, que não tem estas tags — o docxtemplater
  // simplesmente não as encontra no documento.

  /**
   * SÓ o número de dias úteis. A cláusula 3.1 já escreve "dias úteis" ao lado
   * da tag: devolver "30 dias úteis" imprimiria a unidade duas vezes.
   */
  prazoExecucao: string;
  /** Valor SEM "R$" — o Anexo II já traz o símbolo, como a cláusula 2.1. */
  valorParcelaFinal: string;
  /** Observações do Anexo II. String VAZIA quando não há — nunca "null". */
  observacoes: string;
}

/**
 * Bloco de instrução da cláusula 2.2 do template oficial. É o fallback quando a
 * proposta não tem forma de pagamento: melhor manter a orientação visível do
 * que enviar um contrato com a cláusula em branco (spec D5.3).
 *
 * `template.test.ts` confere que este texto é idêntico ao do template oficial.
 */
export const INSTRUCAO_FORMA_PAGAMENTO =
  "[DESCREVA AQUI A FORMA DE PAGAMENTO: entrada, número de parcelas, valores, " +
  "datas, meio de pagamento (PIX, cartão de crédito, boleto, transferência) e " +
  "demais condições. Exemplos: 50% de entrada na assinatura e 50% na conclusão " +
  "mediante Termo de Aceite; ou 6x no cartão de crédito como condição para " +
  "iniciar; ou pagamento à vista via PIX na assinatura.]";

/** Valor sem símbolo de moeda: a cláusula 2.1 já traz "R$ " antes da tag. */
const valorFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Data por extenso sem cidade: o fecho já traz "São Caetano do Sul, ".
 * O fuso é fixo — o do servidor poderia virar o dia e datar o contrato errado.
 */
const dataFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const texto = (v: string | null | undefined): string => v?.trim() ?? "";

export function montarContratoTemplateDTO(dto: PropostaPdfDTO): ContratoTemplateDTO {
  const total = Number.isFinite(dto.resumo.totalGeral) ? dto.resumo.totalGeral : 0;
  const formaPagamento = texto(dto.formaPagamento);

  return {
    clienteNome: texto(dto.cliente.nome),
    clienteDocumento: texto(dto.cliente.documento),
    // O mapper dos PDFs junta o endereço com " · "; num contrato a vírgula é a
    // pontuação esperada na qualificação das partes (spec D6.1).
    clienteEndereco: texto(dto.cliente.endereco).split(" · ").join(", "),
    propostaNumero: String(dto.numero),
    valorTotal: valorFormatter.format(total),
    valorTotalExtenso: valorPorExtenso(total),
    formaPagamento: formaPagamento || INSTRUCAO_FORMA_PAGAMENTO,
    data: dataFormatter.format(dto.data),
    empresaNome: texto(dto.empresa.nome),

    // Rev. 4. Ausentes viram string vazia; para a rev4 isso não chega a
    // acontecer, porque a guarda abaixo barra a geração antes.
    prazoExecucao:
      dto.prazoExecucaoDiasUteis == null ? "" : String(dto.prazoExecucaoDiasUteis),
    valorParcelaFinal:
      dto.valorParcelaFinal == null
        ? ""
        : valorFormatter.format(dto.valorParcelaFinal),
    observacoes: texto(dto.observacoesAceite),
  };
}

/** Falta de informação que impede gerar o contrato, com o campo nomeado. */
export const CONTRATO_SEM_PRAZO =
  "Informe o prazo de execução (dias úteis) no bloco Finalização antes de gerar o contrato.";
export const CONTRATO_SEM_PARCELA_FINAL =
  "Informe a parcela final no bloco Finalização antes de gerar o contrato.";

/**
 * Guarda de geração do contrato (ADR-0416).
 *
 * Sem `prazoExecucaoDiasUteis` a cláusula 3.1 sairia "*concluídos no prazo
 * estimado de  dias úteis*"; sem `valorParcelaFinal`, o Anexo II sairia
 * "*parcela final de R$ .*". Um documento assim não pode sair do sistema —
 * então a geração é **bloqueada**, e a mensagem diz qual campo falta.
 *
 * **Condicionada à VERSÃO do template.** Contratos `rev3` não sofrem a guarda:
 * aquele texto não tem as tags novas, e uma revisão histórica não pode parar de
 * regenerar porque campos criados depois dela estão vazios.
 *
 * Devolve a mensagem, ou `null` quando pode gerar.
 */
export function validarGeracaoContrato(
  dto: PropostaPdfDTO,
  versao: VersaoTemplateContrato,
): string | null {
  if (!templateDe(versao).exigeCamposContratuais) {
    return null;
  }
  if (dto.prazoExecucaoDiasUteis == null) return CONTRATO_SEM_PRAZO;
  if (dto.valorParcelaFinal == null) return CONTRATO_SEM_PARCELA_FINAL;
  return null;
}
