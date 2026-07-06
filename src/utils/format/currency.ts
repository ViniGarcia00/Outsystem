const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Formata um número como moeda brasileira (Real).
 * Valores inválidos (NaN/Infinity) são tratados como 0.
 *
 * @example formatCurrency(1234.5) // "R$ 1.234,50"
 */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}
