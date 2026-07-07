import { z } from "zod";

/**
 * Schemas (Zod) do módulo de Propostas.
 * O cabeçalho é auto-salvo por campo (patch parcial); não há formulário/submit.
 */
export const modeloEnum = z.enum(["COMERCIAL", "SIMPLIFICADA"]);

/** Patch parcial do cabeçalho (auto-save por campo). */
export const cabecalhoPatchSchema = z
  .object({
    clienteId: z.string().nullable(),
    vendedorId: z.string().nullable(),
    modelo: modeloEnum,
    validadeDias: z
      .number({ message: "Informe a validade em dias." })
      .int("Use um número inteiro de dias.")
      .min(1, "Mínimo de 1 dia.")
      .max(3650, "Máximo de 3650 dias."),
    obsInternas: z.string().max(5000).nullable(),
    obsProposta: z.string().max(5000).nullable(),
  })
  .partial();

export type CabecalhoPatchValues = z.infer<typeof cabecalhoPatchSchema>;

/** Cancelamento — motivo obrigatório; obs obrigatória quando "Outro". */
export const motivoEnum = z.enum([
  "CLIENTE_DESISTIU",
  "CONCORRENCIA",
  "PROJETO_CANCELADO",
  "ERRO_PROPOSTA",
  "PROPOSTA_SUBSTITUIDA",
  "OUTRO",
]);

export const cancelarSchema = z
  .object({
    motivo: motivoEnum,
    obs: z.string().optional(),
  })
  .refine((d) => d.motivo !== "OUTRO" || Boolean(d.obs && d.obs.trim()), {
    path: ["obs"],
    message: 'Observação é obrigatória quando o motivo é "Outro".',
  });

export type CancelarFormValues = z.infer<typeof cancelarSchema>;
