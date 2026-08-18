import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke de Instalações (Sprint 4.0.1).
 *
 * Cada cenário cria os próprios dados, com identificador único — nenhuma
 * dependência do catálogo, de clientes ou de instalações preexistentes, seguindo
 * a correção feita no smoke de Propostas na Release 1.1.0.
 */

/** Cria um cliente exclusivo do cenário e devolve o nome. */
async function criarCliente(
  page: Page,
  rotulo: string,
  endereco?: { logradouro?: string; numero?: string; bairro?: string; cidade?: string },
): Promise<string> {
  const nome = `E2E ${rotulo} ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  if (endereco?.logradouro) {
    await page.getByLabel("Endereço").fill(endereco.logradouro);
  }
  if (endereco?.numero) await page.getByLabel("Número").fill(endereco.numero);
  if (endereco?.bairro) await page.getByLabel("Bairro").fill(endereco.bairro);
  if (endereco?.cidade) await page.getByLabel("Cidade").fill(endereco.cidade);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  return nome;
}

/** Monta uma instalação para o cliente e devolve o caminho da instalação. */
async function criarInstalacao(
  page: Page,
  clienteNome: string,
  projeto: string,
  responsavel?: string,
): Promise<string> {
  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();
  await page.getByLabel("Nome do projeto").fill(projeto);
  if (responsavel) {
    await page.getByLabel("Responsável atual").fill(responsavel);
  }
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  return new URL(page.url()).pathname;
}

test("Instalações: criar, conferir snapshot, mudar status e concluir", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Instalacao Cliente", {
    logradouro: "Avenida Goiás",
    numero: "1860",
    bairro: "Barcelona",
    cidade: "São Caetano do Sul",
  });
  const projeto = `Apartamento E2E ${Date.now()}`;

  await page.goto("/instalacoes");
  await expect(
    page.getByRole("heading", { level: 1, name: "Instalações" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova instalação" }).click();
  await expect(page).toHaveURL(/\/instalacoes\/nova$/);

  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();

  // O endereço do cliente é copiado para a instalação e fica somente leitura.
  await expect(page.getByLabel("Logradouro")).toHaveValue("Avenida Goiás");
  await expect(page.getByLabel("Cidade")).toHaveValue("São Caetano do Sul");
  await expect(page.getByLabel("Logradouro")).toBeDisabled();

  await page.getByLabel("Nome do projeto").fill(projeto);
  await page.getByLabel("Responsável atual").fill("Carlos");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  const instalacaoPath = new URL(page.url()).pathname;

  // Round-trip: responsável é texto livre e o endereço persistiu.
  await expect(page.getByLabel("Responsável atual")).toHaveValue("Carlos");
  await expect(page.getByLabel("Cidade")).toHaveValue("São Caetano do Sul");

  // O status é lido pelo trigger do Select (role combobox): o <option> nativo
  // que o Radix mantém oculto para compatibilidade de formulário também casaria
  // com getByText, mas está hidden.
  const statusAtual = page.getByRole("combobox", { name: "Status" });

  // Alterar o status. Esperar o toast garante que o save terminou antes do
  // recarregamento — sem isso o goto corre contra a Server Action.
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Agendada" }).click();
  await page.getByRole("button", { name: "Salvar Alterações" }).click();
  await expect(page.getByText("Instalação atualizada.")).toBeVisible();
  await page.goto(instalacaoPath);
  await expect(statusAtual).toContainText("Agendada");

  // Concluir é escolher o status Concluída.
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Concluída" }).click();
  await page.getByRole("button", { name: "Salvar Alterações" }).click();
  await expect(page.getByText("Instalação atualizada.")).toBeVisible();
  await page.goto(instalacaoPath);
  await expect(statusAtual).toContainText("Concluída");

  // A instalação é encontrada pela busca da listagem.
  await page.goto("/instalacoes");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(projeto);
  await expect(page.getByText(projeto, { exact: true })).toBeVisible();
});

test("Instalações: o snapshot NÃO acompanha alteração no cadastro do cliente", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Snapshot Cliente", {
    cidade: "Curitiba",
  });
  const projeto = `Projeto Snapshot ${Date.now()}`;

  const instalacaoPath = await criarInstalacao(page, clienteNome, projeto);
  await expect(page.getByLabel("Cidade")).toHaveValue("Curitiba");

  // Muda a cidade NO CADASTRO DO CLIENTE.
  await page.goto("/clientes");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(clienteNome);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page).toHaveURL(/\/clientes\/.+$/);
  await page.getByLabel("Cidade").fill("Florianópolis");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  // A instalação preserva o endereço do momento da criação.
  await page.goto(instalacaoPath);
  await expect(page.getByLabel("Cidade")).toHaveValue("Curitiba");
});

test("Instalações: cancelar preserva a instalação no histórico", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Cancelar Cliente");
  const projeto = `Projeto Cancelar ${Date.now()}`;

  await criarInstalacao(page, clienteNome, projeto);

  await page.getByRole("button", { name: "Cancelar instalação" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar instalação" }).click();
  // O diálogo fechar é o sinal inequívoco de que a ação concluiu. Não usar o
  // toast: o próprio texto do diálogo contém "marcada como Cancelada.".
  await expect(dialog).toBeHidden();

  // Continua existindo na listagem, agora como Cancelada.
  await page.goto("/instalacoes");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(projeto);
  const linha = page.getByRole("row").filter({ hasText: projeto });
  await expect(linha).toBeVisible();
  await expect(linha).toContainText("Cancelada");
});
