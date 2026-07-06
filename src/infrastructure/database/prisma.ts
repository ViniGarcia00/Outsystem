import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/infrastructure/configuration/env";

/**
 * Instância singleton do Prisma Client.
 *
 * O Prisma 7 utiliza driver adapters — a conexão com o PostgreSQL é feita
 * pelo adapter `PrismaPg`, configurado a partir do `DATABASE_URL` validado.
 *
 * Em desenvolvimento, o HMR do Next.js recria os módulos a cada alteração;
 * sem o cache global abaixo, cada recarga abriria um novo pool de conexões
 * e esgotaria o PostgreSQL. Em produção, uma única instância é criada.
 *
 * Regra de arquitetura: componentes e páginas NUNCA importam este client
 * diretamente — o acesso a dados passa sempre pela camada de `services`.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
