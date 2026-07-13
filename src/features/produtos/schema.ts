import { z } from "zod";

import { money, requiredText } from "@/lib/validation";

/**
 * Schema (Zod) do Produto — fonte única de validação (RHF + Server Action).
 * `codigo` e `descricao` obrigatórios; `codigo` é único (validado no banco).
 * `valorProduto` e `valorServico` são monetários ≥ 0 (`valorServico` pode ser 0).
 */
export const produtoSchema = z.object({
  ativo: z.boolean(),
  codigo: requiredText("SKU", 60),
  descricao: requiredText("Descrição", 300),
  unidade: requiredText("Unidade", 10),
  valorProduto: money,
  valorServico: money,
});

export type ProdutoFormValues = z.infer<typeof produtoSchema>;

export const produtoDefaults: ProdutoFormValues = {
  ativo: true,
  codigo: "",
  descricao: "",
  unidade: "UN",
  valorProduto: 0,
  valorServico: 0,
};
