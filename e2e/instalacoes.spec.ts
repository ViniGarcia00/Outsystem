import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke de Instalações (Sprint 4.0.1; atualizado na 4.0.3).
 *
 * Cada cenário cria os próprios dados, com identificador único — nenhuma
 * dependência do catálogo, de clientes ou de instalações preexistentes, seguindo
 * a correção feita no smoke de Propostas na Release 1.1.0.
 *
 * Os dados criados aqui são varridos pelo `globalTeardown` (ADR-0403) através do
 * marcador `E2E ` no nome do cliente — instalações, registros e custos caem
 * junto, por pertencerem a ele.
 *
 * O campo "Nome do projeto" saiu na Sprint 4.0.3 (ADR-0404). Os cenários passaram
 * a localizar a instalação pelo **cliente** e pelo **número**, que é o que a
 * listagem realmente oferece.
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
  responsavel?: string,
): Promise<string> {
  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();
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

  // Sprint 4.0.3: o campo "Nome do projeto" foi removido do formulário.
  await expect(page.getByLabel("Nome do projeto")).toHaveCount(0);

  // Sprint 4.0.3: o endereço aparece UMA vez. Antes havia, abaixo dos campos,
  // um resumo em linha repetindo o mesmo conteúdo.
  await expect(
    page.getByText("Avenida Goiás, 1860 · Barcelona · São Caetano do Sul"),
  ).toHaveCount(0);

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

  // A instalação é encontrada pela busca da listagem — agora por cliente, já
  // que o projeto não existe mais. A coluna "Projeto" também sumiu.
  await page.goto("/instalacoes");
  await expect(
    page.getByRole("columnheader", { name: "Projeto" }),
  ).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Buscar" }).fill(clienteNome);
  await expect(page.getByText(clienteNome, { exact: true })).toBeVisible();

  // O workspace continua sem o campo removido.
  await page.goto(instalacaoPath);
  await expect(page.getByLabel("Nome do projeto")).toHaveCount(0);
});

test("Instalações: o número da listagem é um link que abre o workspace", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Link Cliente");
  const instalacaoPath = await criarInstalacao(page, clienteNome);
  const numero = await page
    .getByRole("heading", { level: 1 })
    .innerText()
    .then((t) => t.replace(/\D/g, ""));

  await page.goto("/instalacoes");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(clienteNome);

  // Elemento semântico de link — não uma <tr> com onClick (ADR-0404).
  const link = page.getByRole("link", { name: `Abrir instalação ${numero}` });
  await expect(link).toBeVisible();

  // Navegável por teclado: o link recebe foco.
  await link.focus();
  await expect(link).toBeFocused();

  await link.click();
  await expect(page).toHaveURL(new RegExp(`${instalacaoPath}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: `Instalação ${numero}` }),
  ).toBeVisible();
});

test("Instalações: o snapshot NÃO acompanha alteração no cadastro do cliente", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Snapshot Cliente", {
    cidade: "Curitiba",
  });

  const instalacaoPath = await criarInstalacao(page, clienteNome);
  await expect(page.getByLabel("Cidade")).toHaveValue("Curitiba");

  // Muda a cidade NO CADASTRO DO CLIENTE.
  await page.goto("/clientes");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(clienteNome);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page).toHaveURL(/\/clientes\/.+$/);
  // Esperar o valor carregado antes de digitar: `toHaveURL` passa assim que a
  // URL muda, e o formulário ainda pode remontar com os `defaultValues` do
  // Server Component, descartando o que foi digitado antes da hidratação.
  await expect(page.getByLabel("Cidade")).toHaveValue("Curitiba");
  await page.getByLabel("Cidade").fill("Florianópolis");
  await expect(page.getByLabel("Cidade")).toHaveValue("Florianópolis");
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

  await criarInstalacao(page, clienteNome);

  await page.getByRole("button", { name: "Cancelar instalação" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar instalação" }).click();
  // O diálogo fechar é o sinal inequívoco de que a ação concluiu. Não usar o
  // toast: o próprio texto do diálogo contém "marcada como Cancelada.".
  await expect(dialog).toBeHidden();

  // Continua existindo na listagem, agora como Cancelada.
  await page.goto("/instalacoes");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(clienteNome);
  const linha = page.getByRole("row").filter({ hasText: clienteNome });
  await expect(linha).toBeVisible();
  await expect(linha).toContainText("Cancelada");
});

// ---------------------------------------------------------------------------
// Cronologia e custos (Sprint 4.0.2)
// ---------------------------------------------------------------------------

/** Abre o diálogo, preenche o acontecimento e salva. */
async function criarRegistro(
  page: Page,
  dados: {
    tipo: string;
    aconteceuEm: string;
    responsavel: string;
    relatorio: string;
    custos?: { categoria: string; valor: string }[];
  },
): Promise<void> {
  await page.getByRole("button", { name: "Novo registro" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Tipo").click();
  await page.getByRole("option", { name: dados.tipo, exact: true }).click();
  await dialog.getByLabel("Data e hora").fill(dados.aconteceuEm);
  await dialog.getByLabel("Responsável").fill(dados.responsavel);
  await dialog.getByLabel("Relatório").fill(dados.relatorio);

  for (const custo of dados.custos ?? []) {
    await dialog.getByRole("button", { name: "Adicionar custo" }).click();
    const linha = dialog.getByTestId("linha-custo").last();
    await linha.getByLabel("Categoria").click();
    await page.getByRole("option", { name: custo.categoria, exact: true }).click();
    await linha.getByLabel("Valor").fill(custo.valor);
  }

  await dialog.getByRole("button", { name: "Salvar" }).click();
  // O diálogo fechar é o sinal de conclusão — o texto do próprio diálogo não
  // serve como asserção (lição da 4.0.1).
  await expect(dialog).toBeHidden();
}

test("Instalações: cronologia completa — registros, custos, ordem e exclusão", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Cronologia Cliente");
  const instalacaoPath = await criarInstalacao(page, clienteNome);

  // 3. Visita ao cliente, com um custo de deslocamento.
  await criarRegistro(page, {
    tipo: "Visita ao cliente",
    aconteceuEm: "2026-08-15T10:00",
    responsavel: "Carlos",
    relatorio: "Realizada vistoria inicial. Cliente pediu mudanca de dois pontos.",
    custos: [{ categoria: "Deslocamento", valor: "8000" }],
  });

  // 4. Material comprado, com DOIS custos.
  await criarRegistro(page, {
    tipo: "Material comprado",
    aconteceuEm: "2026-08-16T15:20",
    responsavel: "Bruno",
    relatorio: "Comprados dois modulos adicionais para a alteracao pedida.",
    custos: [
      { categoria: "Material", valor: "34000" },
      { categoria: "Frete", valor: "3500" },
    ],
  });

  // 5. Alteração de escopo, SEM custo.
  await criarRegistro(page, {
    tipo: "Alteração de escopo",
    aconteceuEm: "2026-08-17T09:00",
    responsavel: "Vinicius",
    relatorio: "Confirmada a inclusao dos dois novos pontos.",
  });

  await page.goto(instalacaoPath);

  // 6. Os três acontecimentos estão na timeline.
  const cards = page.getByTestId("registro-card");
  await expect(cards).toHaveCount(3);

  // 7. Os três responsáveis aparecem.
  await expect(page.getByText("Responsável: Carlos")).toBeVisible();
  await expect(page.getByText("Responsável: Bruno")).toBeVisible();
  await expect(page.getByText("Responsável: Vinicius")).toBeVisible();

  // 8. Total acumulado: 80 + (340 + 35) + 0 = 455.
  await expect(page.getByText("R$ 455,00")).toBeVisible();

  // 9-10. Fato RETROATIVO criado por último aparece POR ÚLTIMO na timeline.
  await criarRegistro(page, {
    tipo: "Atualização interna",
    aconteceuEm: "2026-08-05T08:30",
    responsavel: "Carlos",
    relatorio: "Vistoria antiga, cadastrada depois.",
  });
  await page.goto(instalacaoPath);

  const cards4 = page.getByTestId("registro-card");
  await expect(cards4).toHaveCount(4);
  await expect(cards4.first()).toContainText("Alteração de escopo");
  await expect(cards4.last()).toContainText("Vistoria antiga");
  // A ordem é por aconteceuEm, não por criação: o registro mais novo no banco
  // é o mais antigo no mundo real e por isso fica no fim.

  // 11. Excluir registro COM custo é bloqueado.
  const comCusto = cards4.filter({ hasText: "Material comprado" });
  await comCusto.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText(/não pode ser excluído/i)).toBeVisible();
  await page.goto(instalacaoPath);
  await expect(
    page.getByTestId("registro-card").filter({ hasText: "Material comprado" }),
  ).toHaveCount(1);

  // 12. Excluir registro SEM custo funciona.
  await page
    .getByTestId("registro-card")
    .filter({ hasText: "Vistoria antiga" })
    .getByRole("button", { name: "Excluir" })
    .click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await page.goto(instalacaoPath);
  await expect(page.getByTestId("registro-card")).toHaveCount(3);
});

test("Instalações: edição de registro substitui os custos, não duplica", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Edicao Cliente");
  const instalacaoPath = await criarInstalacao(page, clienteNome);

  await criarRegistro(page, {
    tipo: "Visita ao cliente",
    aconteceuEm: "2026-08-15T10:00",
    responsavel: "Carlos",
    relatorio: "Relatorio original.",
    custos: [{ categoria: "Deslocamento", valor: "8000" }],
  });
  await criarRegistro(page, {
    tipo: "Material comprado",
    aconteceuEm: "2026-08-16T15:20",
    responsavel: "Bruno",
    relatorio: "Compra de modulos.",
    custos: [
      { categoria: "Material", valor: "34000" },
      { categoria: "Frete", valor: "3500" },
    ],
  });

  await page.goto(instalacaoPath);
  await expect(page.getByText("R$ 455,00")).toBeVisible();

  // 13. Editar o RELATÓRIO.
  const visita = page.getByTestId("registro-card").filter({ hasText: "Visita ao cliente" });
  await visita.getByRole("button", { name: "Editar" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Relatório").fill("Relatorio corrigido pelo Carlos.");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();

  await page.goto(instalacaoPath);
  await expect(page.getByText("Relatorio corrigido pelo Carlos.")).toBeVisible();

  // 14. Editar os CUSTOS: 340 vira 300. Total 455 -> 415.
  // Se a edição fizesse append em vez de substituir, o total SUBIRIA para 795.
  const material = page
    .getByTestId("registro-card")
    .filter({ hasText: "Material comprado" });
  await material.getByRole("button", { name: "Editar" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByTestId("linha-custo").first().getByLabel("Valor").fill("30000");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();

  await page.goto(instalacaoPath);
  await expect(page.getByText("R$ 415,00")).toBeVisible();
  await expect(page.getByText("R$ 795,00")).toHaveCount(0);
  // O registro continua com DOIS custos (300 + 35), não quatro: substituição,
  // não duplicação. O total do registro é a prova numérica direta.
  await expect(
    page
      .getByTestId("registro-card")
      .filter({ hasText: "Material comprado" }),
  ).toContainText("R$ 335,00");
});
