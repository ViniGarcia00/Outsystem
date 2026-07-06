import { z } from "zod";

/**
 * Validação e tipagem das variáveis de ambiente (fail-fast).
 *
 * Toda a aplicação lê a configuração a partir daqui — NUNCA de `process.env`
 * diretamente. Caminhos de arquivo são sempre configuráveis (ver storage/paths).
 *
 * Este módulo é de uso exclusivo do servidor.
 */

/** Caminho opcional: string vazia em `.env` é tratada como "não informado". */
const optionalPath = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),

  // Storage — todos configuráveis; nenhum caminho fixo no código.
  STORAGE_PATH: z
    .string()
    .trim()
    .min(1)
    .default("./storage"),
  PDF_PATH: optionalPath,
  UPLOAD_PATH: optionalPath,
  BACKUP_PATH: optionalPath,
  LOG_PATH: optionalPath,

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configuração de ambiente inválida. Verifique o arquivo .env:\n${issues}`,
    );
  }

  return parsed.data;
}

/** Configuração de ambiente validada e tipada. */
export const env = loadEnv();
