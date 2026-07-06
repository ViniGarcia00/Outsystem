const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

/** Entrada aceita para formatação de data. */
export type DateInput = Date | string | number;

/**
 * Formata uma data no padrão brasileiro (dd/mm/aaaa por padrão).
 * Entradas inválidas retornam string vazia.
 *
 * @example formatDate("2026-07-06") // "06/07/2026"
 */
export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_OPTIONS,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

/**
 * Formata data e hora no padrão brasileiro (dd/mm/aaaa HH:mm).
 */
export function formatDateTime(value: DateInput): string {
  return formatDate(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
