import { onlyDigits } from "./document";

/**
 * Formata um telefone brasileiro a partir de dígitos (aceita valor parcial).
 * - Até 10 dígitos -> fixo    ((00) 0000-0000)
 * - 11 dígitos     -> celular ((00) 00000-0000)
 *
 * @example formatPhone("11987654321") // "(11) 98765-4321"
 * @example formatPhone("1133334444")  // "(11) 3333-4444"
 */
export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}
