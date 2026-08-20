import { z } from "zod";

import { requiredText } from "@/lib/validation";

/**
 * Schema (Zod) do Técnico — fonte única de validação (RHF + Server Action).
 *
 * V1 tem DOIS campos, por decisão (ADR-0408): telefone, e-mail, cargo, comissão,
 * custo/hora, login e agenda ficam de fora. O `.object()` sem passthrough é o que
 * garante que um campo enviado a mais seja descartado no parse.
 */
export const tecnicoSchema = z.object({
  ativo: z.boolean(),
  nome: requiredText("Nome", 200),
});

export type TecnicoFormValues = z.infer<typeof tecnicoSchema>;

export const tecnicoDefaults: TecnicoFormValues = {
  ativo: true,
  nome: "",
};
