/**
 * Nome de download padronizado dos documentos da proposta (Sprint 2.10.3;
 * contrato acrescentado na Sprint 3.1).
 *
 *   PDF Apresentação → "OM Proposta Comercial - {Primeiro Nome} {Nº} Rev.{Rev}.pdf"
 *   PDF Detalhado    → "OM Proposta Detalhada - {Primeiro Nome} {Nº} Rev.{Rev}.pdf"
 *   Anexo Contratual → "Anexo Contrato - {Primeiro Nome} {Nº} Rev.{Rev}.pdf"
 *   Contrato         → "Contrato - Proposta {Nº} - {Nome Completo} Rev.{Rev}.docx"
 *
 * O contrato foge do padrão dos PDFs de propósito: é o documento que vai para
 * assinatura, então leva o nome completo do cliente e diz "Proposta {Nº}" por
 * extenso. A revisão entra em todos — contratos de revisões diferentes não
 * podem colidir na pasta de Downloads.
 *
 * Sem depender de banco (funções puras).
 */

export type TipoPdf = "comercial" | "detalhada" | "contratual";

const PREFIXO: Record<TipoPdf, string> = {
  comercial: "OM Proposta Comercial",
  detalhada: "OM Proposta Detalhada",
  contratual: "Anexo Contrato",
};

/** Caracteres proibidos em nomes de arquivo no Windows (\ / : * ? " < > |) e de
 *  controle. Acentos são mantidos (válidos nos três sistemas). */
const INVALIDOS = /[\\/:*?"<>|\x00-\x1F]/g;

/** Remove o proibido e colapsa espaços — inclusive os que sobram do que saiu. */
function sanitizar(s: string): string {
  return s.replace(INVALIDOS, "").replace(/\s+/g, " ").trim();
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

/** Nome do Contrato (.docx) — nome completo do cliente (Sprint 3.1). */
export function nomeArquivoContrato(dto: DadosNome): string {
  const nome = sanitizar(dto.cliente.nome) || "Cliente";
  const rev = dto.revisao ?? 0;
  return `Contrato - Proposta ${dto.numero} - ${nome} Rev.${rev}.docx`;
}

/**
 * Valor de `Content-Disposition` para o nome dado. Fornece o `filename` ASCII
 * (fallback) e o `filename*` em UTF-8 (RFC 5987) para preservar acentos.
 *
 * PDFs usam `inline` (abrem na aba). O contrato usa `attachment`: o .docx não
 * renderiza no navegador e o objetivo é abri-lo no Word para editar.
 */
export function contentDisposition(
  nome: string,
  disposicao: "inline" | "attachment" = "inline",
): string {
  const ascii = nome.replace(/[^\x20-\x7E]/g, "").replace(/"/g, "");
  return `${disposicao}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

/** @deprecated Use `contentDisposition`. Mantido para as rotas de PDF. */
export function contentDispositionPdf(nome: string): string {
  return contentDisposition(nome, "inline");
}
