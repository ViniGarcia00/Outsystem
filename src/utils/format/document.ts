/** Remove tudo que não for dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formata um CPF ou CNPJ a partir de dígitos (aceita valor parcial).
 * - Até 11 dígitos  -> CPF  (000.000.000-00)
 * - 12 a 14 dígitos -> CNPJ (00.000.000/0000-00)
 *
 * @example formatCpfCnpj("12345678909")    // "123.456.789-09"
 * @example formatCpfCnpj("12345678000199") // "12.345.678/0001-99"
 */
export function formatCpfCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
