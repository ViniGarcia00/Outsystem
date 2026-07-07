import { z } from "zod";

import { optionalEmail, optionalText, requiredText } from "@/lib/validation";

/**
 * Schema (Zod) do Vendedor — fonte única de validação (RHF + Server Action).
 * `nome` obrigatório; `telefone` e `email` opcionais (email validado quando
 * informado).
 */
export const vendedorSchema = z.object({
  ativo: z.boolean(),
  nome: requiredText("Nome", 200),
  telefone: optionalText(30),
  email: optionalEmail,
});

export type VendedorFormValues = z.infer<typeof vendedorSchema>;

export const vendedorDefaults: VendedorFormValues = {
  ativo: true,
  nome: "",
  telefone: "",
  email: "",
};
