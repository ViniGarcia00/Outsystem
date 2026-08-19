/**
 * Datas operacionais da Instalação (Sprint 4.0.1).
 *
 * As constantes de fuso vêm de `@/utils` (ADR-0405) — só as constantes; as
 * conversões continuam aqui, inalteradas. Declarar o fuso brasileiro em dois
 * lugares deixaria uma eventual mudança passar despercebida em um deles, que é
 * a mesma razão pela qual `labels.ts` não duplica tipos.
 *
 * O projeto não tinha campo de data em formulário até aqui, então estes
 * helpers definem a conversão nos dois sentidos entre `<input type="date">`
 * ("YYYY-MM-DD") e `Date`.
 *
 * **Fuso fixo `America/Sao_Paulo`, nunca o do servidor ou do navegador.** Uma
 * data escolhida como 18/08 precisa continuar 18/08 na leitura — parsear
 * "2026-08-18" como meia-noite UTC a exibiria como 17/08 no Brasil. Por isso a
 * data é ancorada ao MEIO-DIA do fuso brasileiro: qualquer conversão razoável
 * mantém o mesmo dia. O Brasil não adota horário de verão desde 2019, então o
 * deslocamento -03:00 é estável.
 *
 * Módulo PURO — testado sem banco.
 */

import { FUSO_BRASIL, OFFSET_BRASIL } from "@/utils";

const formatador = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: FUSO_BRASIL,
});

/** "YYYY-MM-DD" (ou "") → `Date` ancorada ao meio-dia de São Paulo, ou `null`. */
export function dataDeInput(valor: string): Date | null {
  const v = valor.trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T12:00:00${OFFSET_BRASIL}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `Date` → "YYYY-MM-DD" no fuso de São Paulo, para `<input type="date">`. */
export function dataParaInput(data: Date | null | undefined): string {
  if (!data) return "";
  const d = data instanceof Date ? data : new Date(data);
  return Number.isNaN(d.getTime()) ? "" : formatador.format(d);
}

/** Aceita o formato de `<input type="date">` ou vazio. */
export function ehDataDeInputValida(valor: string): boolean {
  const v = valor.trim();
  return v === "" || dataDeInput(v) !== null;
}

// ---------------------------------------------------------------------------
// Data-hora (Sprint 4.0.2) — `aconteceuEm` da cronologia
// ---------------------------------------------------------------------------
//
// Mesma infraestrutura da data pura acima: mesmo fuso fixo, mesma filosofia.
// UMA diferença deliberada: a data pura é ancorada ao meio-dia para o dia não
// virar na conversão; aqui a hora é informação real do fato e é preservada como
// foi digitada.

/** "YYYY-MM-DD HH:mm" no fuso de São Paulo (sv-SE usa esse formato). */
const formatadorDataHora = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: FUSO_BRASIL,
});

const formatadorExibicao = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: FUSO_BRASIL,
});

/** "YYYY-MM-DDTHH:mm" → `Date` no fuso de São Paulo, ou `null`. */
export function dataHoraDeInput(valor: string): Date | null {
  const v = valor.trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00${OFFSET_BRASIL}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `Date` → "YYYY-MM-DDTHH:mm" para `<input type="datetime-local">`. */
export function dataHoraParaInput(data: Date | null | undefined): string {
  if (!data) return "";
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return "";
  // sv-SE produz "YYYY-MM-DD HH:mm"; o input exige "T" no lugar do espaço.
  return formatadorDataHora.format(d).replace(" ", "T");
}

/** `aconteceuEm` é OBRIGATÓRIO: vazio é inválido. */
export function ehDataHoraDeInputValida(valor: string): boolean {
  return dataHoraDeInput(valor) !== null;
}

/**
 * "18/08/2026 16:40" no fuso de São Paulo.
 *
 * Não usar o `formatDateTime` de `@/utils`: ele não fixa timezone (usa a do
 * runtime) e é compartilhado com Propostas — alterá-lo mudaria aquele módulo.
 */
export function dataHoraParaExibicao(data: Date): string {
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return "";
  return formatadorExibicao.format(d).replace(", ", " ");
}
