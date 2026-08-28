import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke de Usuários (Sprint 4.2, ADR-0410).
 *
 * Substitui `tecnicos.spec.ts`. Cada cenário cria os próprios dados, com
 * identificador único; tudo nasce com o prefixo `E2E `, o marcador que o
 * `globalTeardown` varre (ADR-0403).
 *
 * O que estes testes provam, e que nenhuma outra suíte alcança: os papéis
 * chegam ao banco pela TELA e mudam o que cada Select oferece nos dois fluxos.
 */

interface Papeis {
  vendedor?: boolean;
  tecnico?: boolean;
}

/** Cria um usuário com os papéis pedidos e volta à listagem. Devolve o nome. */
async function criarUsuario(
  page: Page,
  rotulo: string,
  papeis: Papeis = {},
): Promise<string> {
  const nome = `E2E Usuario ${rotulo} ${Date.now()}`;
  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  if (papeis.vendedor) {
    await page.getByRole("switch", { name: "Vendedor" }).click();
  }
  if (papeis.tecnico) {
    await page.getByRole("switch", { name: "Técnico" }).click();
  }
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  return nome;
}

/** Cliente próprio do cenário — a instalação precisa de um. */
async function criarCliente(page: Page, rotulo: string): Promise<string> {
  const nome = `E2E Usuario ${rotulo} Cliente ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  return nome;
}

/** Abre o formulário de edição do usuário buscado na listagem. */
async function abrirEdicao(page: Page, nome: string) {
  await page.goto("/usuarios");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(nome);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page).toHaveURL(/\/usuarios\/(?!novo$)[^/]+$/);
  // Esperar o valor carregado antes de asserir: o formulário pode remontar com
  // os defaultValues do Server Component (lição da 4.0.1).
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(nome);
}

test("Usuários: criar e editar", async ({ page }) => {
  await page.goto("/usuarios");
  await expect(
    page.getByRole("heading", { level: 1, name: "Usuários" }),
  ).toBeVisible();

  const nome = await criarUsuario(page, "Basico", { vendedor: true });
  await page.getByRole("searchbox", { name: "Buscar" }).fill(nome);
  await expect(page.getByText(nome, { exact: true })).toBeVisible();

  const editado = `${nome} Editado`;
  await abrirEdicao(page, nome);
  await page.getByLabel("Nome", { exact: true }).fill(editado);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);

  await page.getByRole("searchbox", { name: "Buscar" }).fill(editado);
  await expect(page.getByText(editado, { exact: true })).toBeVisible();
});

test("Usuários: marcar apenas Vendedor", async ({ page }) => {
  const nome = await criarUsuario(page, "So Vendedor", { vendedor: true });

  await abrirEdicao(page, nome);
  await expect(page.getByRole("switch", { name: "Vendedor" })).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Técnico" }),
  ).not.toBeChecked();
});

test("Usuários: marcar apenas Técnico", async ({ page }) => {
  const nome = await criarUsuario(page, "So Tecnico", { tecnico: true });

  await abrirEdicao(page, nome);
  await expect(page.getByRole("switch", { name: "Técnico" })).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Vendedor" }),
  ).not.toBeChecked();
});

test("Usuários: a mesma pessoa com os DOIS papéis", async ({ page }) => {
  // É o caso que motivou a Sprint: antes exigia dois cadastros separados.
  const nome = await criarUsuario(page, "Ambos", {
    vendedor: true,
    tecnico: true,
  });

  await abrirEdicao(page, nome);
  await expect(page.getByRole("switch", { name: "Vendedor" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "Técnico" })).toBeChecked();
});

test("Usuários: sem papel nenhum é válido e não aparece em select", async ({
  page,
}) => {
  const nome = await criarUsuario(page, "Sem Papel");

  await abrirEdicao(page, nome);
  await expect(
    page.getByRole("switch", { name: "Vendedor" }),
  ).not.toBeChecked();
  await expect(page.getByRole("switch", { name: "Técnico" })).not.toBeChecked();

  await page.goto("/propostas/nova");
  await page.getByLabel("Vendedor").click();
  await expect(
    page.getByRole("option", { name: nome, exact: true }),
  ).toHaveCount(0);
});

test("Usuários: inativar some da listagem padrão e volta com Mostrar inativos", async ({
  page,
}) => {
  const nome = await criarUsuario(page, "Inativar", { vendedor: true });

  await page.getByRole("searchbox", { name: "Buscar" }).fill(nome);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Inativar" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Inativar" })
    .click();

  await expect(page.getByText(nome, { exact: true })).toHaveCount(0);

  await page.getByRole("checkbox", { name: /inativos/i }).check();
  await expect(page.getByText(nome, { exact: true })).toBeVisible();
});

test("Usuários: busca ignora acento", async ({ page }) => {
  const sufixo = Date.now();
  const nome = `E2E Usuario João Conceição ${sufixo}`;
  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);

  // Buscas SEM acento encontram o nome COM acento (fonte única, ADR-0402).
  for (const termo of ["Joao", "conceicao", `joao conceicao ${sufixo}`]) {
    await page.getByRole("searchbox", { name: "Buscar" }).fill(termo);
    await expect(page.getByText(nome, { exact: true })).toBeVisible();
  }
});

test("Propostas: só quem tem o papel de Vendedor aparece no Select", async ({
  page,
}) => {
  const vendedor = await criarUsuario(page, "Vende", { vendedor: true });
  const tecnico = await criarUsuario(page, "Nao Vende", { tecnico: true });

  await page.goto("/propostas/nova");
  await page.getByLabel("Vendedor").click();
  await expect(
    page.getByRole("option", { name: vendedor, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: tecnico, exact: true }),
  ).toHaveCount(0);
});

test("Instalações: só quem tem o papel de Técnico aparece no Select", async ({
  page,
}) => {
  const tecnico = await criarUsuario(page, "Instala", { tecnico: true });
  const vendedor = await criarUsuario(page, "Nao Instala", { vendedor: true });
  const cliente = await criarCliente(page, "Instala");

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await page.getByLabel("Responsável atual").click();
  await expect(
    page.getByRole("option", { name: tecnico, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: vendedor, exact: true }),
  ).toHaveCount(0);
});

test("Usuários: quem tem os dois papéis aparece nos DOIS fluxos", async ({
  page,
}) => {
  const nome = await criarUsuario(page, "Nos Dois", {
    vendedor: true,
    tecnico: true,
  });
  const cliente = await criarCliente(page, "Nos Dois");

  await page.goto("/propostas/nova");
  await page.getByLabel("Vendedor").click();
  await expect(
    page.getByRole("option", { name: nome, exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await page.getByLabel("Responsável atual").click();
  await expect(
    page.getByRole("option", { name: nome, exact: true }),
  ).toBeVisible();
});

test("Usuários: excluir é bloqueado depois de usado em instalação", async ({
  page,
}) => {
  const tecnico = await criarUsuario(page, "Usado", { tecnico: true });
  const cliente = await criarCliente(page, "Usado");

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await page.getByLabel("Responsável atual").click();
  await page.getByRole("option", { name: tecnico, exact: true }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  // Sprint 4.3 (ADR-0413): criar volta para a listagem. O que este teste
  // precisa é que a instalação EXISTA e vincule o técnico — não abrir o
  // workspace. A presença da linha é a prova suficiente.
  await expect(page).toHaveURL(/\/instalacoes$/);
  await expect(
    page.getByRole("link", { name: `Abrir instalação ${cliente}` }),
  ).toBeVisible();

  // A exclusão precisa ser recusada, com a mensagem que orienta a inativar.
  await page.goto("/usuarios");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(tecnico);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir" })
    .click();

  await expect(page.getByText(/não pode ser excluído/i)).toBeVisible();
  await expect(page.getByText(/Inativar/i).first()).toBeVisible();

  // E continua existindo.
  await page.goto("/usuarios");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(tecnico);
  await expect(page.getByText(tecnico, { exact: true })).toBeVisible();
});
