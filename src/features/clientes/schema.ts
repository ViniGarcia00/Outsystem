import { z } from "zod";

import {
  optionalCpfCnpj,
  optionalEmail,
  optionalText,
} from "@/lib/validation";

/**
 * Schema (Zod) do Cliente — fonte única de validação (RHF + Server Action).
 * Regras condicionais: `nome` obrigatório para PF; `empresa` obrigatória para PJ.
 * `cpfCnpj` é opcional, mas validado (dígitos) e único quando informado.
 */
export const tipoPessoaEnum = z.enum(["PF", "PJ"]);

export const clienteSchema = z
  .object({
    ativo: z.boolean(),
    tipoPessoa: tipoPessoaEnum,
    nome: optionalText(200),
    empresa: optionalText(200),
    cpfCnpj: optionalCpfCnpj,
    rg: optionalText(30),
    inscricaoEstadual: optionalText(30),
    cep: optionalText(12),
    endereco: optionalText(200),
    numero: optionalText(20),
    complemento: optionalText(120),
    bairro: optionalText(120),
    cidade: optionalText(120),
    estado: optionalText(60),
    telefone: optionalText(30),
    email: optionalEmail,
    observacoes: optionalText(5000),
  })
  .superRefine((data, ctx) => {
    if (data.tipoPessoa === "PF" && !data.nome?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["nome"],
        message: "Nome é obrigatório para Pessoa Física.",
      });
    }
    if (data.tipoPessoa === "PJ" && !data.empresa?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["empresa"],
        message: "Empresa é obrigatória para Pessoa Jurídica.",
      });
    }
  });

export type ClienteFormValues = z.infer<typeof clienteSchema>;

/** Valores iniciais de um novo cliente. */
export const clienteDefaults: ClienteFormValues = {
  ativo: true,
  tipoPessoa: "PF",
  nome: "",
  empresa: "",
  cpfCnpj: "",
  rg: "",
  inscricaoEstadual: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  telefone: "",
  email: "",
  observacoes: "",
};
