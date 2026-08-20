import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke de Técnicos (Sprint 4.1, ADR-0408).
 *
 * Cada cenário cria os próprios dados, com identificador único. Os técnicos
 * criados aqui são varridos pelo `globalTeardown` através do marcador `E2E `
 * no nome (ADR-0403).
 */

/** Cria um técnico e volta para a listagem. Devolve o nome usado. */
async function criarTecnico(page: Page, rotulo: string): Promise<string> {
  const nome = `E2E Tecnico ${rotulo} ${Date.now()}`;
  await page.goto("/tecnicos/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/tecnicos$/);
  return nome;
}

test("Técnicos: criar e editar", async ({ page }) => {
  await page.goto("/tecnicos");
  await expect(
    page.getByRole("heading", { level: 1, name: "Técnicos" }),
  ).toBeVisible();

  const nome = await criarTecnico(page, "Basico");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(nome);
  await expect(page.getByText(nome, { exact: true })).toBeVisible();

  // Editar: o sufixo prova que a gravação aconteceu.
  const editado = `${nome} Editado`;
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page).toHaveURL(/\/tecnicos\/(?!novo$)[^/]+$/);
  // Esperar o valor carregado antes de digitar: o formulário pode remontar com
  // os defaultValues do Server Component (lição da 4.0.1).
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(nome);
  await page.getByLabel("Nome", { exact: true }).fill(editado);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/tecnicos$/);

  await page.getByRole("searchbox", { name: "Buscar" }).fill(editado);
  await expect(page.getByText(editado, { exact: true })).toBeVisible();
});

test("Técnicos: inativar some da listagem padrão e volta com Mostrar inativos", async ({
  page,
}) => {
  const nome = await criarTecnico(page, "Inativar");

  await page.getByRole("searchbox", { name: "Buscar" }).fill(nome);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Inativar" }).click();
  // O botão de confirmação repete a AÇÃO, não diz "Confirmar": o CrudListView
  // passa confirmLabel={type === "delete" ? "Excluir" : "Inativar"}. O
  // "Confirmar" que aparece nos testes da Cronologia é o default do
  // ConfirmDialog, usado só lá.
  await page.getByRole("dialog").getByRole("button", { name: "Inativar" }).click();

  await expect(page.getByText(nome, { exact: true })).toHaveCount(0);

  await page.getByRole("checkbox", { name: /inativos/i }).check();
  await expect(page.getByText(nome, { exact: true })).toBeVisible();
});

test("Técnicos: busca ignora acento", async ({ page }) => {
  const sufixo = Date.now();
  const nome = `E2E Tecnico João Conceição ${sufixo}`;
  await page.goto("/tecnicos/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/tecnicos$/);

  // Buscas SEM acento encontram o nome COM acento (fonte única, ADR-0402).
  for (const termo of ["Joao", "conceicao", `joao conceicao ${sufixo}`]) {
    await page.getByRole("searchbox", { name: "Buscar" }).fill(termo);
    await expect(page.getByText(nome, { exact: true })).toBeVisible();
  }
});

test("Técnicos: excluir é bloqueado depois de usado em instalação", async ({
  page,
}) => {
  const tecnico = await criarTecnico(page, "Usado");

  // Cliente próprio do cenário — a instalação precisa de um.
  const cliente = `E2E Tecnico Usado Cliente ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(cliente);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await page.getByLabel("Responsável atual").click();
  await page.getByRole("option", { name: tecnico, exact: true }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);

  // Agora a exclusão precisa ser recusada, com a mensagem que orienta a inativar.
  await page.goto("/tecnicos");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(tecnico);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();

  await expect(page.getByText(/não pode ser excluído/i)).toBeVisible();
  await expect(page.getByText(/Inativar/i).first()).toBeVisible();

  // E continua existindo.
  await page.goto("/tecnicos");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(tecnico);
  await expect(page.getByText(tecnico, { exact: true })).toBeVisible();
});
