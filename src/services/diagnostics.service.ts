import { env } from "@/infrastructure/configuration/env";
import { prisma } from "@/infrastructure/database";

/**
 * Diagnóstico de infraestrutura (uso em DESENVOLVIMENTO).
 * Mede a saúde da conexão com o banco sem depender de logs/ferramentas externas.
 */

export interface Diagnostics {
  environment: string;
  prismaStatus: "ok" | "error";
  /** Tempo da 1ª consulta (inclui estabelecer a conexão do pool), em ms. */
  connectionMs: number | null;
  /** Tempo de uma consulta simples com o pool já aquecido, em ms. */
  queryMs: number | null;
  /** Tempo total do diagnóstico (resposta da aplicação), em ms. */
  totalMs: number;
  postgresVersion: string | null;
  error?: string;
}

export async function getDiagnostics(): Promise<Diagnostics> {
  const environment = env.NODE_ENV;
  const started = performance.now();

  try {
    // 1ª consulta: estabelece a conexão do pool + executa.
    const t0 = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const connectionMs = Math.round(performance.now() - t0);

    // 2ª consulta: pool aquecido → tempo "puro" de consulta.
    const t1 = performance.now();
    const rows =
      await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
    const queryMs = Math.round(performance.now() - t1);

    return {
      environment,
      prismaStatus: "ok",
      connectionMs,
      queryMs,
      totalMs: Math.round(performance.now() - started),
      postgresVersion: rows[0]?.version ?? null,
    };
  } catch (error) {
    return {
      environment,
      prismaStatus: "error",
      connectionMs: null,
      queryMs: null,
      totalMs: Math.round(performance.now() - started),
      postgresVersion: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
