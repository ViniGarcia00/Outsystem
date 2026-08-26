import { z } from "zod";

import { optionalEmail, optionalText, requiredText } from "@/lib/validation";

/**
 * Schema (Zod) do Usuário — fonte única de validação (RHF + Server Action).
 *
 * Os papéis são INDEPENDENTES e sem validação cruzada: um usuário com os dois
 * desmarcados é válido, e é o cadastro criado antes de a função ser decidida.
 * Proibir isso tornaria impossível cadastrar alguém antes de saber o papel; a
 * consequência de não ter papel já é suficiente — a pessoa não aparece em
 * select nenhum (ADR-0410).
 *
 * O `.object()` sem passthrough é o que garante que um campo enviado a mais
 * seja descartado no parse.
 */
export const usuarioSchema = z.object({
  ativo: z.boolean(),
  nome: requiredText("Nome", 200),
  ehVendedor: z.boolean(),
  ehTecnico: z.boolean(),
  telefone: optionalText(30),
  email: optionalEmail,
});

export type UsuarioFormValues = z.infer<typeof usuarioSchema>;

export const usuarioDefaults: UsuarioFormValues = {
  ativo: true,
  nome: "",
  ehVendedor: false,
  ehTecnico: false,
  telefone: "",
  email: "",
};
