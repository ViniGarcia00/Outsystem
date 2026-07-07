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

test("home redireciona para Propostas", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/propostas$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Propostas" }),
  ).toBeVisible();
});

test("abre a Configuração do Sistema", async ({ page }) => {
  await page.goto("/propostas");
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
  await page.goto("/propostas");
  for (const [name, path] of [
    ["Clientes", "/clientes"],
    ["Produtos", "/produtos"],
    ["Vendedores", "/vendedores"],
    ["Configurações", "/configuracoes"],
    ["Propostas", "/propostas"],
  ] as const) {
    await nav(page).getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test("Propostas: criação diferida, emitir e revisão automática", async ({
  page,
}) => {
  // Garante um cliente pesquisável (nome único) para o autocomplete.
  const clienteNome = `E2E Proposta Cliente ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(clienteNome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  await page.goto("/propostas");
  await expect(
    page.getByRole("heading", { level: 1, name: "Propostas" }),
  ).toBeVisible();

  // "Nova proposta" abre o workspace de montagem em memória (nada é criado).
  await page.getByRole("button", { name: "Nova proposta" }).click();
  await expect(page).toHaveURL(/\/propostas\/nova$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Nova proposta" }),
  ).toBeVisible();

  // Monta cabeçalho (cliente), seção e produto — tudo em memória.
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();

  await page.getByPlaceholder("Nome da nova seção (ex.: Sala)").fill("Sala E2E");
  await page.getByRole("button", { name: "Adicionar seção" }).click();
  await expect(page.getByRole("heading", { name: "Sala E2E" })).toBeVisible();

  await page.getByRole("button", { name: "Adicionar produto" }).click();
  await page.getByLabel("Produto", { exact: true }).fill("RTR");
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Total" }),
  ).toBeVisible();

  // "Criar Proposta" persiste tudo e abre o workspace definitivo.
  await page.getByRole("button", { name: "Criar Proposta" }).click();
  await expect(page).toHaveURL(/\/propostas\/(?!nova$)[^/]+$/);
  await expect(page.getByRole("heading", { name: "Conteúdo" })).toBeVisible();

  // "Gerar PDF" emite a proposta (RASCUNHO → EMITIDA).
  await page.getByRole("button", { name: "Gerar PDF" }).click();
  await expect(page.getByText("Emitida", { exact: true })).toBeVisible();

  // 1ª alteração pós-emissão cria automaticamente a Rev.1 e volta a Rascunho.
  await page
    .getByPlaceholder("Nome da nova seção (ex.: Sala)")
    .fill("Cozinha E2E");
  await page.getByRole("button", { name: "Adicionar seção" }).click();
  await expect(
    page.getByRole("heading", { name: "Cozinha E2E" }),
  ).toBeVisible();
  await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Rev\.1/ }),
  ).toBeVisible();
});

test("Propostas: modelo Simplificada (produtos sem seções)", async ({
  page,
}) => {
  const clienteNome = `E2E Simplificada Cliente ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(clienteNome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  await page.goto("/propostas/nova");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nova proposta" }),
  ).toBeVisible();

  // Modelo Simplificada → sem seções.
  await page.getByLabel("Modelo da proposta").click();
  await page.getByRole("option", { name: "Simplificada" }).click();
  await expect(
    page.getByPlaceholder("Nome da nova seção (ex.: Sala)"),
  ).toHaveCount(0);

  // Cliente (obrigatório para criar).
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();

  // Produto direto na proposta (sem card de seção).
  await page.getByRole("button", { name: "Adicionar produto" }).click();
  await page.getByLabel("Produto", { exact: true }).fill("RTR");
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: "Total" })).toBeVisible();

  // Cria e abre o workspace definitivo.
  await page.getByRole("button", { name: "Criar Proposta" }).click();
  await expect(page).toHaveURL(/\/propostas\/(?!nova$)[^/]+$/);
  await expect(page.getByRole("heading", { name: "Conteúdo" })).toBeVisible();
});
