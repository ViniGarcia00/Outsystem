import { expect, test, type Page } from "@playwright/test";

/**
 * Dashboard V1 (Sprint 4.0.3, ADR-0405).
 *
 * Prova que a tela lê o banco de verdade: cria uma instalação agendada para o
 * futuro e confirma que ela aparece em "Próximas Instalações" com os campos
 * exigidos. Os números exatos dos cards dependem do estado do banco e por isso
 * não são fixados aqui — a aritmética está travada nos unitários do módulo puro.
 *
 * Os dados criados são varridos pelo `globalTeardown` via o marcador `E2E `.
 */

/** Data futura no formato do `<input type="date">`. */
function daquiADias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function criarCliente(page: Page, rotulo: string): Promise<string> {
  const nome = `E2E ${rotulo} ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  return nome;
}

test("Dashboard: cards de Comercial, Instalações e Custos", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeVisible();

  // `exact` é obrigatório: "Instalações" também casaria com o título da seção
  // "Próximas Instalações", e o strict mode recusa o locator ambíguo.
  for (const grupo of ["Comercial", "Instalações", "Custos"]) {
    await expect(
      page.getByRole("heading", { name: grupo, exact: true }),
    ).toBeVisible();
  }

  for (const card of [
    "Propostas em Rascunho",
    "Propostas Emitidas",
    "A agendar",
    "Agendada",
    "Aguardando material",
    "Em andamento",
    "Concluída",
    "Custos extras acumulados",
  ]) {
    // `.first()`: rótulos como "Agendada" também aparecem como badge na seção
    // de próximas instalações, dependendo do estado do banco.
    await expect(page.getByText(card, { exact: true }).first()).toBeVisible();
  }

  // Custos formatados em R$ — nunca um número cru nem texto fictício.
  await expect(page.getByText(/^R\$\s/).first()).toBeVisible();

  // Escopo da V1: sem gráficos.
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("svg.recharts-surface")).toHaveCount(0);
});

test("Dashboard: instalação agendada aparece em Próximas Instalações", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Dashboard Cliente");

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();
  await page.getByLabel("Responsável atual").fill("Carlos");
  await page.getByLabel("Data agendada").fill(daquiADias(3));
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Agendada", exact: true }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);

  const numero = (
    await page.getByRole("heading", { level: 1 }).innerText()
  ).replace(/\D/g, "");

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Próximas Instalações" }),
  ).toBeVisible();

  // A linha traz data, número, cliente, status e responsável.
  const linha = page.getByRole("row").filter({ hasText: clienteNome });
  await expect(linha).toBeVisible();
  await expect(linha).toContainText("Agendada");
  await expect(linha).toContainText("Carlos");
  await expect(linha).toContainText(/\d{2}\/\d{2}\/\d{4}/);

  // O número é link para o workspace, mesmo padrão da listagem (ADR-0404).
  const link = linha.getByRole("link", { name: `Abrir instalação ${numero}` });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
});
