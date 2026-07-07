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

/** Payload de confirmação da criação (montagem em memória → transação). */
export const novaPropostaSchema = z.object({
  // Cliente é OBRIGATÓRIO para criar a proposta (item de homologação).
  clienteId: z.string().min(1, "Selecione o cliente."),
  vendedorId: z.string().nullable(),
  modelo: modeloEnum,
  validadeDias: z
    .number()
    .int("Use um número inteiro de dias.")
    .min(1, "Mínimo de 1 dia.")
    .max(3650, "Máximo de 3650 dias."),
  obsInternas: z.string().max(5000).nullable(),
  obsProposta: z.string().max(5000).nullable(),
  secoes: z.array(
    z.object({
      nome: z.string().trim().min(1, "Informe o nome da seção."),
      itens: z.array(
        z.object({
          produtoId: z.string().min(1),
          quantidade: z.number().positive(),
          valorUnitario: z.number().nonnegative().optional(),
        }),
      ),
    }),
  ),
});

export type NovaPropostaValues = z.infer<typeof novaPropostaSchema>;

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
