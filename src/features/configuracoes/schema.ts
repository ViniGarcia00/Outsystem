import { z } from "zod";

import { optionalEmail, optionalText } from "@/lib/validation";

/**
 * Schema (Zod) da Configuração do Sistema — fonte única de validação para o
 * formulário (React Hook Form) e para a Server Action.
 * Todos os campos são opcionais; `email` é validado quando informado.
 */
export const configuracaoSchema = z.object({
  nomeEmpresa: optionalText(200),
  razaoSocial: optionalText(200),
  cnpj: optionalText(20),
  cep: optionalText(12),
  endereco: optionalText(200),
  numero: optionalText(20),
  complemento: optionalText(120),
  bairro: optionalText(120),
  cidade: optionalText(120),
  estado: optionalText(60),
  telefone: optionalText(30),
  whatsapp: optionalText(30),
  email: optionalEmail,
  site: optionalText(200),
  logo: optionalText(500),
  corPrimaria: optionalText(30),
  corSecundaria: optionalText(30),
  textoQuemSomos: optionalText(5000),
  textoFinalProposta: optionalText(5000),
});

export type ConfiguracaoFormValues = z.infer<typeof configuracaoSchema>;
