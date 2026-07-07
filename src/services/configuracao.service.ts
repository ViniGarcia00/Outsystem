import { prisma } from "@/infrastructure/database";

/**
 * Serviço da Configuração do Sistema (singleton — id fixo "singleton").
 * Orquestra o acesso ao banco; a UI nunca toca no Prisma diretamente.
 */

const SINGLETON_ID = "singleton";

/** Campos textuais editáveis da configuração. */
export interface ConfiguracaoInput {
  nomeEmpresa?: string;
  razaoSocial?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  site?: string;
  logo?: string;
  corPrimaria?: string;
  corSecundaria?: string;
  textoQuemSomos?: string;
  textoFinalProposta?: string;
}

/** Valores da configuração prontos para o formulário (strings). */
export type ConfiguracaoValues = Record<keyof ConfiguracaoInput, string>;

const FIELDS: (keyof ConfiguracaoInput)[] = [
  "nomeEmpresa",
  "razaoSocial",
  "cnpj",
  "inscricaoEstadual",
  "cep",
  "endereco",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "estado",
  "telefone",
  "whatsapp",
  "email",
  "site",
  "logo",
  "corPrimaria",
  "corSecundaria",
  "textoQuemSomos",
  "textoFinalProposta",
];

/** "" / espaços → null (banco), evitando gravar strings vazias. */
function normalize(input: ConfiguracaoInput): Record<string, string | null> {
  const data: Record<string, string | null> = {};
  for (const field of FIELDS) {
    const value = input[field];
    data[field] = value && value.trim() ? value.trim() : null;
  }
  return data;
}

/** null (banco) → "" (formulário). */
function toValues(record: Record<string, unknown>): ConfiguracaoValues {
  const values = {} as ConfiguracaoValues;
  for (const field of FIELDS) {
    values[field] = (record[field] as string | null) ?? "";
  }
  return values;
}

/** Retorna a configuração, criando o singleton vazio se ainda não existir. */
export async function getConfiguracao(): Promise<ConfiguracaoValues> {
  const config = await prisma.configuracaoSistema.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
  return toValues(config);
}

/** Salva (upsert) a configuração do sistema. */
export async function saveConfiguracao(
  input: ConfiguracaoInput,
): Promise<void> {
  const data = normalize(input);
  await prisma.configuracaoSistema.upsert({
    where: { id: SINGLETON_ID },
    update: data,
    create: { id: SINGLETON_ID, ...data },
  });
}
