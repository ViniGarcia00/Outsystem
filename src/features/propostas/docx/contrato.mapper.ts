import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

import { valorPorExtenso } from "./extenso";

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
  };
}
