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

  /**
   * Limpeza dos dados criados pelos testes (Sprint 4.0.3, ADR-0403).
   *
   * Estratégia ÚNICA do projeto: uma varredura por marcador (`E2E %` para
   * cliente, `E2E-%` para produto) depois da suíte inteira, em ordem explícita
   * de dependência. O `globalTeardown` roda **mesmo quando há testes falhando**,
   * que é o requisito de resiliência.
   *
   * Preferido a `afterEach`/fixture por cenário porque os testes encadeiam
   * entidades entre passos (cliente → proposta → instalação → registro → custo):
   * uma varredura por marcador é verificável de forma completa, enquanto o
   * teardown por cenário depende de cada teste lembrar tudo o que criou.
   *
   * A rotina se recusa a rodar fora de ambiente local (ver `support/limpeza.ts`)
   * e falha a execução se sobrar qualquer resíduo.
   */
  globalTeardown: "./e2e/support/global-teardown.ts",
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
