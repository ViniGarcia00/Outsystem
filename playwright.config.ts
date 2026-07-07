import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração do Playwright — Smoke Tests (Sprint 1.5).
 *
 * Objetivo: validar os fluxos mínimos de navegação e CRUD básico contra a
 * aplicação real (que usa o PostgreSQL nativo). Não são testes complexos.
 *
 * O `webServer` sobe a aplicação automaticamente (`npm run dev`) e aguarda a
 * porta 3000. Requer o banco configurado (ver README → Desenvolvimento).
 */
export default defineConfig({
  testDir: "./e2e",
  // Smoke tests escrevem no banco (criar/editar) — execução serial evita corridas.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    locale: "pt-BR",
    // Folga para a primeira compilação de cada rota no dev server.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
