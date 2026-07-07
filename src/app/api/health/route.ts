import { readFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "@/infrastructure/database";

/**
 * Endpoint operacional de verificação de saúde.
 * Checa a aplicação e a conexão com o PostgreSQL. Não é cacheado.
 *
 * GET /api/health  ->  200 { status: "ok" } | 503 { status: "error" }
 */
export const dynamic = "force-dynamic";

function readVersion(): string {
  try {
    return readFileSync(join(process.cwd(), "VERSION"), "utf8").trim();
  } catch {
    return "unknown";
  }
}

export async function GET() {
  const version = readVersion();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      version,
      database: "up",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        version,
        database: "down",
        message: error instanceof Error ? error.message : "erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
