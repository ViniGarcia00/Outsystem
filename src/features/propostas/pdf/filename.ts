/**
 * Nome de download padronizado dos PDFs da proposta (Sprint 2.10.3).
 *
 *   PDF Apresentação → "OM Proposta Comercial - {Primeiro Nome} {Nº} Rev.{Rev}.pdf"
 *   PDF Detalhado    → "OM Proposta Detalhada - {Primeiro Nome} {Nº} Rev.{Rev}.pdf"
 *   PDF Contratual   → "Anexo Contrato - {Primeiro Nome} {Nº} Rev.{Rev}.pdf"
 *
 * Regras: apenas o PRIMEIRO nome do cliente; caracteres inválidos para nomes de
 * arquivo no Windows removidos; sem depender de banco (função pura).
 */

export type TipoPdf = "comercial" | "detalhada" | "contratual";

const PREFIXO: Record<TipoPdf, string> = {
  comercial: "OM Proposta Comercial",
  detalhada: "OM Proposta Detalhada",
  contratual: "Anexo Contrato",
};

/** Caracteres proibidos em nomes de arquivo no Windows (\ / : * ? " < > |) e de
 *  controle. Acentos e espaços internos são mantidos (válidos no Windows). */
const INVALIDOS = /[\\/:*?"<>|\x00-\x1F]/g;

function sanitizar(s: string): string {
  return s.replace(INVALIDOS, "").trim();
}

/** Primeiro nome do cliente, já higienizado; fallback "Cliente" se vazio. */
function primeiroNome(nome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  return sanitizar(primeiro) || "Cliente";
}

type DadosNome = {
  cliente: { nome: string };
  numero: number;
  revisao: number | null;
};

/** Monta o nome do arquivo (com extensão .pdf) para o tipo de documento. */
export function nomeArquivoPdf(tipo: TipoPdf, dto: DadosNome): string {
  const nome = primeiroNome(dto.cliente.nome);
  const rev = dto.revisao ?? 0;
  return `${PREFIXO[tipo]} - ${nome} ${dto.numero} Rev.${rev}.pdf`;
}

/**
 * Valor de `Content-Disposition` para o nome dado. Fornece o `filename` ASCII
 * (fallback) e o `filename*` em UTF-8 (RFC 5987) para preservar acentos.
 */
export function contentDispositionPdf(nome: string): string {
  const ascii = nome.replace(/[^\x20-\x7E]/g, "").replace(/"/g, "");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}
