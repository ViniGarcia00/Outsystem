import { formatCurrency, formatDate } from "@/utils";

/**
 * Formatação de exibição do PDF. Moeda e data reutilizam os utilitários da
 * aplicação (fonte única). Quantidade admite frações (Decimal(12,3)) e não
 * mostra casas decimais desnecessárias.
 */

export { formatCurrency, formatDate };

const quantidadeFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function formatQuantidade(value: number): string {
  return quantidadeFormatter.format(Number.isFinite(value) ? value : 0);
}

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Percentual sem casas desnecessárias (ex.: 10, 7,5). */
export function formatPercent(value: number): string {
  return percentFormatter.format(Number.isFinite(value) ? value : 0);
}
