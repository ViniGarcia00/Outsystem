import { z } from "zod";

import { isValidCpfCnpj } from "@/utils";

/**
 * Helpers de validação (Zod) compartilhados pelos formulários.
 * Fonte única de verdade — usados no cliente (React Hook Form) e no servidor
 * (Server Actions), garantindo a mesma regra nas duas pontas.
 */

/** Texto obrigatório com limite de tamanho. */
export function requiredText(label: string, max = 255) {
  return z
    .string()
    .trim()
    .min(1, `${label} é obrigatório.`)
    .max(max, `Máximo de ${max} caracteres.`);
}

/** Texto opcional (aceita vazio) com limite de tamanho. */
export function optionalText(max = 255) {
  return z.string().trim().max(max, `Máximo de ${max} caracteres.`).optional();
}

/** E-mail opcional — aceita vazio ou um e-mail válido. */
export const optionalEmail = z
  .union([z.literal(""), z.string().trim().email("E-mail inválido.")])
  .optional();

/** CPF/CNPJ opcional — quando informado, valida os dígitos verificadores. */
export const optionalCpfCnpj = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || isValidCpfCnpj(value), "CPF/CNPJ inválido.");

/** Valor monetário (reais) — número não negativo. */
export const money = z
  .number({ message: "Informe um valor válido." })
  .min(0, "O valor não pode ser negativo.");
