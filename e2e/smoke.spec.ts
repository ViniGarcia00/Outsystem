import { expect, test } from "@playwright/test";

/**
 * Smoke Tests (Sprint 1.5) — fluxos mínimos de navegação e CRUD básico.
 * Execução serial (workers: 1) — alguns testes escrevem no banco.
 *
 * Requer a aplicação com o banco configurado (ver README → Desenvolvimento).
 * Rodar: `npm run test:e2e` (o Playwright sobe o servidor automaticamente).
 */

const nav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Navegação principal" });

test("home redireciona para o dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
});

test("abre a Configuração do Sistema", async ({ page }) => {
  await page.goto("/dashboard");
  await nav(page).getByRole("link", { name: "Configurações" }).click();
  await expect(page).toHaveURL(/\/configuracoes$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Configuração do Sistema" }),
  ).toBeVisible();
  // O campo "Nome da empresa" deve estar presente e associado ao label.
  await expect(page.getByLabel("Nome da empresa")).toBeVisible();
});

test("abre Produtos e Vendedores", async ({ page }) => {
  await page.goto("/produtos");
  await expect(page.getByRole("heading", { level: 1, name: "Produtos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo" })).toBeVisible();

  await nav(page).getByRole("link", { name: "Vendedores" }).click();
  await expect(page).toHaveURL(/\/vendedores$/);
  await expect(page.getByRole("heading", { level: 1, name: "Vendedores" })).toBeVisible();
});

test("Clientes: criar e editar (CRUD básico)", async ({ page }) => {
  const nome = `E2E Cliente ${Date.now()}`;
  const nomeEditado = `${nome} (editado)`;

  // Abrir listagem de Clientes.
  await page.goto("/clientes");
  await expect(page.getByRole("heading", { level: 1, name: "Clientes" })).toBeVisible();

  // Criar.
  await page.getByRole("button", { name: "Novo" }).click();
  await expect(page).toHaveURL(/\/clientes\/novo$/);
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();

  // Volta para a listagem e o registro aparece (busca instantânea).
  await expect(page).toHaveURL(/\/clientes$/);
  await page.getByRole("searchbox", { name: "Buscar" }).fill(nome);
  await expect(page.getByText(nome, { exact: true })).toBeVisible();

  // Editar via ações da linha.
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page).toHaveURL(/\/clientes\/.+$/);
  await page.getByLabel("Nome", { exact: true }).fill(nomeEditado);
  await page.getByRole("button", { name: "Salvar" }).click();

  // De volta à listagem, o nome editado é encontrado.
  await expect(page).toHaveURL(/\/clientes$/);
  await page.getByRole("searchbox", { name: "Buscar" }).fill(nomeEditado);
  await expect(page.getByText(nomeEditado, { exact: true })).toBeVisible();
});

test("navegação principal entre os módulos", async ({ page }) => {
  await page.goto("/dashboard");
  for (const [name, path] of [
    ["Clientes", "/clientes"],
    ["Produtos", "/produtos"],
    ["Vendedores", "/vendedores"],
    ["Configurações", "/configuracoes"],
    ["Dashboard", "/dashboard"],
  ] as const) {
    await nav(page).getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test("Propostas: abrir listagem e criar proposta", async ({ page }) => {
  await page.goto("/propostas");
  await expect(
    page.getByRole("heading", { level: 1, name: "Propostas" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nova proposta" }).click();
  await expect(page).toHaveURL(/\/propostas\/nova$/);

  // Seleciona o primeiro cliente disponível (do seed).
  await page.getByLabel("Cliente").click();
  await page.getByRole("option").first().click();

  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page).toHaveURL(/\/propostas$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Propostas" }),
  ).toBeVisible();
});
