import { fileURLToPath } from "node:url";

import { configDefaults, defineConfig } from "vitest/config";

/**
 * Configuração do Vitest. Resolve o alias `@/*` → `src/*` (mesmo mapeamento do
 * tsconfig) para que os testes possam importar como a aplicação. Os testes
 * end-to-end (`e2e/`) rodam pelo Playwright (`npm run test:e2e`), não pelo Vitest.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
