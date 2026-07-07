import { onlyDigits } from "../format/document";

/**
 * Validação de CPF e CNPJ (dígitos verificadores).
 * Aceita valor com ou sem máscara.
 */

/** Valida um CPF (11 dígitos) pelos dígitos verificadores. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  const digits = cpf.split("").map(Number);

  const calc = (count: number): number => {
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += digits[i] * (count + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calc(9) === digits[9] && calc(10) === digits[10];
}

/** Valida um CNPJ (14 dígitos) pelos dígitos verificadores. */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // todos iguais

  const digits = cnpj.split("").map(Number);

  const calc = (count: number): number => {
    const weights =
      count === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += digits[i] * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return calc(12) === digits[12] && calc(13) === digits[13];
}

/**
 * Valida um documento como CPF (11 dígitos) OU CNPJ (14 dígitos),
 * de acordo com a quantidade de dígitos informada.
 */
export function isValidCpfCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}
