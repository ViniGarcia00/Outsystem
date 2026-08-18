import { z } from "zod";

import { requiredText } from "@/lib/validation";

import { dataHoraDeInput, ehDataHoraDeInputValida } from "./datas";

/**
 * Schemas do registro da cronologia (Sprint 4.0.2).
 *
 * Responsável é TEXTO LIVRE e OBRIGATÓRIO (ADR-0400/0401): não existe cadastro,
 * então a validação é apenas "não vazio".
 *
 * A data-hora permanece como texto do `<input type="datetime-local">` — a
 * conversão para `Date` é da Server Action, pelo mesmo motivo da 4.0.1:
 * transformar aqui faria o tipo de entrada divergir do de saída, e o React Hook
 * Form manipula o de entrada.
 */

const TIPOS = [
  "VISITA_CLIENTE",
  "ATUALIZACAO_INTERNA",
  "MATERIAL_COMPRADO",
  "ALTERACAO_ESCOPO",
  "PENDENCIA",
  "CONCLUSAO",
  "OUTRO",
] as const;

const CATEGORIAS = [
  "MATERIAL",
  "MAO_DE_OBRA",
  "DESLOCAMENTO",
  "TERCEIROS",
  "FRETE",
  "OUTROS",
] as const;

export const custoSchema = z.object({
  categoria: z.enum(CATEGORIAS),
  descricao: z.string().trim().max(200, "Máximo de 200 caracteres."),
  /** Estritamente maior que zero: custo zerado não é custo. */
  valor: z
    .number({ message: "Informe um valor válido." })
    .positive("O valor deve ser maior que zero."),
});

export const registroSchema = z.object({
  tipo: z.enum(TIPOS),
  aconteceuEm: z
    .string()
    .trim()
    .refine(ehDataHoraDeInputValida, "Informe a data e a hora do acontecimento.")
    // Fatos históricos são permitidos; fatos futuros, não — ainda não ocorreram.
    .refine((v) => {
      const d = dataHoraDeInput(v);
      return d !== null && d.getTime() <= Date.now();
    }, "O acontecimento não pode estar no futuro."),
  responsavel: requiredText("Responsável", 120),
  relatorio: requiredText("Relatório", 5000),
  custos: z.array(custoSchema),
});

export type CustoValues = z.infer<typeof custoSchema>;
export type RegistroValues = z.infer<typeof registroSchema>;
