import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Testes de INTEGRAÇÃO da camada de service (`*.integration.test.ts`).
 *
 * Falam com o PostgreSQL de verdade, sem mock: a regra sob teste é uma
 * condição de consulta, e um Prisma mockado provaria apenas que o mock foi
 * chamado. Cada teste cria os próprios dados, marcados com `E2E `, e os apaga
 * no `afterAll` — o mesmo marcador que o `globalTeardown` do Playwright varre,
 * então um teste interrompido no meio não deixa rastro permanente.
 *
 * Separados de `vitest.config.ts` de propósito: `npm run test` continua sendo a
 * suíte PURA (sem banco, sem IO), rápida e executável em qualquer máquina.
 * Rode estes com `npm run test:integration`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.integration.test.ts"],
    // O service valida `DATABASE_URL` no import (fail-fast), então o `.env`
    // precisa estar carregado ANTES do grafo de módulos ser resolvido.
    setupFiles: ["dotenv/config"],
    // Escritas no mesmo banco — execução serial evita corrida entre arquivos.
    fileParallelism: false,
  },
});
