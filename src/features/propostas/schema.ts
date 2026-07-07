import { z } from "zod";

import { optionalText } from "@/lib/validation";

/**
 * Schema (Zod) do formulário de Proposta — fonte única (RHF + Server Action).
 * Sem produtos/serviços nesta Sprint.
 */
export const modeloEnum = z.enum(["COMERCIAL", "SIMPLIFICADA"]);
export const statusEnum = z.enum([
  "RASCUNHO",
  "EMITIDA",
  "APROVADA",
  "REPROVADA",
  "CANCELADA",
]);

export const propostaSchema = z.object({
  clienteId: z.string().min(1, "Selecione um cliente."),
  vendedorId: z.string().optional(),
  modelo: modeloEnum,
  validadeDias: z
    .number({ message: "Informe a validade em dias." })
    .int("Use um número inteiro de dias.")
    .min(1, "Mínimo de 1 dia.")
    .max(3650, "Máximo de 3650 dias."),
  obsInternas: optionalText(5000),
  obsProposta: optionalText(5000),
  status: statusEnum,
});

export type PropostaFormValues = z.infer<typeof propostaSchema>;

export const propostaDefaults: PropostaFormValues = {
  clienteId: "",
  vendedorId: "",
  modelo: "COMERCIAL",
  validadeDias: 5,
  obsInternas: "",
  obsProposta: "",
  status: "RASCUNHO",
};

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
