import { expect, test, type Locator, type Page } from "@playwright/test";

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

/**
 * Cria um Usuário com o papel de TÉCNICO e devolve o nome (Sprint 4.2,
 * ADR-0410). Sem o papel marcado, ele não apareceria no Select de responsável.
 */
async function criarTecnico(page: Page, rotulo: string): Promise<string> {
  const nome = `E2E Usuario Tecnico ${rotulo} ${Date.now()}`;
  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("switch", { name: "Técnico" }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  return nome;
}

/**
 * Escolhe um técnico em um `Select` de responsável já visível na tela.
 *
 * `escopo` restringe a BUSCA DO CAMPO (ex.: o diálogo do registro). As OPÇÕES
 * do Radix são renderizadas em portal, na raiz do documento, e por isso são
 * sempre procuradas a partir da `page`.
 */
async function escolherTecnico(
  page: Page,
  campo: "Responsável atual" | "Responsável",
  nome: string,
  escopo: Page | Locator = page,
): Promise<void> {
  await escopo.getByLabel(campo, { exact: true }).click();
  await page.getByRole("option", { name: nome, exact: true }).click();
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
    await escolherTecnico(page, "Responsável atual", responsavel);
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
  const tecnico = await criarTecnico(page, "Round Trip");

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

  await escolherTecnico(page, "Responsável atual", tecnico);
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  const instalacaoPath = new URL(page.url()).pathname;

  // Round-trip: responsável foi persistido e o endereço também.
  await expect(
    page.getByRole("combobox", { name: "Responsável atual" }),
  ).toContainText(tecnico);
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
  // `getByRole("cell")` em vez de `getByText`: desde a Sprint 4.3 o apelido é
  // sugerido a partir do cliente, então o mesmo texto aparece na coluna Apelido
  // (dentro de um link) e na coluna Cliente. O locator antigo virou ambíguo — é
  // consequência da feature, não regressão. A célula é o alvo certo aqui.
  await expect(
    page.getByRole("cell", { name: clienteNome, exact: true }),
  ).toBeVisible();

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
  await escolherTecnico(page, "Responsável", dados.responsavel, dialog);
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
  const carlos = await criarTecnico(page, "Cronologia Carlos");
  const bruno = await criarTecnico(page, "Cronologia Bruno");
  const vinicius = await criarTecnico(page, "Cronologia Vinicius");

  // Criar os técnicos navega para /usuarios — volta ao workspace da instalação.
  await page.goto(instalacaoPath);

  // 3. Visita ao cliente, com um custo de deslocamento.
  await criarRegistro(page, {
    tipo: "Visita ao cliente",
    aconteceuEm: "2026-08-15T10:00",
    responsavel: carlos,
    relatorio: "Realizada vistoria inicial. Cliente pediu mudanca de dois pontos.",
    custos: [{ categoria: "Deslocamento", valor: "8000" }],
  });

  // 4. Material comprado, com DOIS custos.
  await criarRegistro(page, {
    tipo: "Material comprado",
    aconteceuEm: "2026-08-16T15:20",
    responsavel: bruno,
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
    responsavel: vinicius,
    relatorio: "Confirmada a inclusao dos dois novos pontos.",
  });

  await page.goto(instalacaoPath);

  // 6. Os três acontecimentos estão na timeline.
  const cards = page.getByTestId("registro-card");
  await expect(cards).toHaveCount(3);

  // 7. Os três responsáveis aparecem.
  await expect(page.getByText(`Responsável: ${carlos}`)).toBeVisible();
  await expect(page.getByText(`Responsável: ${bruno}`)).toBeVisible();
  await expect(page.getByText(`Responsável: ${vinicius}`)).toBeVisible();

  // 8. Total acumulado: 80 + (340 + 35) + 0 = 455.
  await expect(page.getByText("R$ 455,00")).toBeVisible();

  // 9-10. Fato RETROATIVO criado por último aparece POR ÚLTIMO na timeline.
  await criarRegistro(page, {
    tipo: "Atualização interna",
    aconteceuEm: "2026-08-05T08:30",
    responsavel: carlos,
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
  const carlos = await criarTecnico(page, "Edicao Carlos");
  const bruno = await criarTecnico(page, "Edicao Bruno");

  // Criar os técnicos navega para /usuarios — volta ao workspace da instalação.
  await page.goto(instalacaoPath);

  await criarRegistro(page, {
    tipo: "Visita ao cliente",
    aconteceuEm: "2026-08-15T10:00",
    responsavel: carlos,
    relatorio: "Relatorio original.",
    custos: [{ categoria: "Deslocamento", valor: "8000" }],
  });
  await criarRegistro(page, {
    tipo: "Material comprado",
    aconteceuEm: "2026-08-16T15:20",
    responsavel: bruno,
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
  await dialog.getByLabel("Relatório").fill(`Relatorio corrigido pelo ${carlos}.`);
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();

  await page.goto(instalacaoPath);
  await expect(page.getByText(`Relatorio corrigido pelo ${carlos}.`)).toBeVisible();

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

// ---------------------------------------------------------------------------
// Vínculo com Técnico (Sprint 4.1)
// ---------------------------------------------------------------------------

test("Instalações: técnico inativado some das opções novas mas continua no vínculo existente", async ({
  page,
}) => {
  const cliente = await criarCliente(page, "Inativo Cliente");
  const tecnico = await criarTecnico(page, "Sera Inativado");

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await escolherTecnico(page, "Responsável atual", tecnico);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  const instalacaoPath = new URL(page.url()).pathname;

  // Inativa o técnico DEPOIS de vinculado.
  await page.goto("/usuarios");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(tecnico);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Inativar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Inativar" }).click();

  // 1) A instalação EXISTENTE continua exibindo o técnico, rotulado.
  await page.goto(instalacaoPath);
  await expect(
    page.getByRole("combobox", { name: "Responsável atual" }),
  ).toContainText(tecnico);
  await expect(
    page.getByRole("combobox", { name: "Responsável atual" }),
  ).toContainText("(inativo)");

  // 2) Em uma instalação NOVA, ele não é oferecido.
  await page.goto("/instalacoes/nova");
  await page.getByLabel("Responsável atual").click();
  await expect(page.getByRole("option", { name: tecnico, exact: true })).toHaveCount(0);
});

test("Instalações: renomear o técnico NÃO reescreve a cronologia; trocar o responsável, sim", async ({
  page,
}) => {
  const cliente = await criarCliente(page, "Snapshot Nome Cliente");
  const carlos = await criarTecnico(page, "Carlos");
  const bruno = await criarTecnico(page, "Bruno");

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await escolherTecnico(page, "Responsável atual", carlos);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  const instalacaoPath = new URL(page.url()).pathname;

  // 1. Registro criado com o técnico "Carlos".
  await criarRegistro(page, {
    tipo: "Visita ao cliente",
    aconteceuEm: "2026-08-15T10:00",
    responsavel: carlos,
    relatorio: "Relatorio original.",
  });
  await page.goto(instalacaoPath);
  await expect(page.getByText(`Responsável: ${carlos}`)).toBeVisible();

  // 2. Cadastro renomeado.
  const carlosRenomeado = `${carlos} Almeida`;
  await page.goto("/usuarios");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(carlos);
  await page.getByRole("button", { name: "Ações" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(carlos);
  await page.getByLabel("Nome", { exact: true }).fill(carlosRenomeado);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);

  // 3. Edita SÓ o relatório do registro.
  await page.goto(instalacaoPath);
  await page.getByTestId("registro-card").getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Relatório").fill("Relatorio corrigido, mesmo responsavel.");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();

  // 4. O card mantém o nome ANTIGO — o snapshot não foi reescrito.
  await page.goto(instalacaoPath);
  await expect(page.getByText("Relatorio corrigido, mesmo responsavel.")).toBeVisible();
  await expect(page.getByText(`Responsável: ${carlos}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Responsável: ${carlosRenomeado}`)).toHaveCount(0);

  // ...enquanto o cabeçalho, que é estado CORRENTE, já mostra o nome novo.
  await expect(
    page.getByRole("combobox", { name: "Responsável atual" }),
  ).toContainText(carlosRenomeado);

  // 5. Edita de novo, TROCANDO o responsável.
  await page.getByTestId("registro-card").getByRole("button", { name: "Editar" }).click();
  const dialog2 = page.getByRole("dialog");
  await escolherTecnico(page, "Responsável", bruno, dialog2);
  await dialog2.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog2).toBeHidden();

  // 6. Agora sim o snapshot mudou — foi alteração explícita do fato.
  await page.goto(instalacaoPath);
  await expect(page.getByText(`Responsável: ${bruno}`)).toBeVisible();
  await expect(page.getByText(`Responsável: ${carlos}`, { exact: true })).toHaveCount(0);
});

test("Instalações: operar na cronologia de uma instalação não toca a outra", async ({
  page,
}) => {
  // Rede de regressão, no nível da interface, para a invariante do agregado
  // (Sprint 4.1.1): editar ou excluir um registro exige que ele PERTENÇA à
  // instalação informada.
  //
  // O par cruzado (`instalacaoId` de A + `registroId` de B) NÃO é alcançável
  // pelo navegador — a tela sempre manda o par certo. Quem cobre o caminho
  // forjado é o teste de integração do service
  // (`src/services/instalacao-registro.integration.test.ts`), que é onde a
  // garantia mora. Aqui provamos o lado observável: mexer em A não altera B.
  const cliente = await criarCliente(page, "Isolamento Cliente");
  const tecnico = await criarTecnico(page, "Isolamento");

  const instalacaoA = await criarInstalacao(page, cliente);
  await criarRegistro(page, {
    tipo: "Visita ao cliente",
    aconteceuEm: "2026-08-15T10:00",
    responsavel: tecnico,
    relatorio: "Registro da instalacao A.",
  });

  const instalacaoB = await criarInstalacao(page, cliente);
  await criarRegistro(page, {
    tipo: "Material comprado",
    aconteceuEm: "2026-08-16T15:20",
    responsavel: tecnico,
    relatorio: "Registro da instalacao B, com custo.",
    custos: [{ categoria: "Material", valor: "34000" }],
  });

  // Cada workspace enxerga APENAS a própria cronologia.
  await page.goto(instalacaoA);
  await expect(page.getByTestId("registro-card")).toHaveCount(1);
  await expect(page.getByText("Registro da instalacao A.")).toBeVisible();
  await expect(page.getByText("Registro da instalacao B, com custo.")).toHaveCount(0);

  // Edita e depois exclui o registro de A.
  await page.getByTestId("registro-card").getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Relatório").fill("Registro de A, corrigido.");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();

  await page.goto(instalacaoA);
  await expect(page.getByText("Registro de A, corrigido.")).toBeVisible();

  await page.getByTestId("registro-card").getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await page.goto(instalacaoA);
  await expect(page.getByTestId("registro-card")).toHaveCount(0);

  // B permanece intacta: registro, relatório e custo.
  await page.goto(instalacaoB);
  await expect(page.getByTestId("registro-card")).toHaveCount(1);
  await expect(page.getByText("Registro da instalacao B, com custo.")).toBeVisible();
  await expect(page.getByTestId("registro-card")).toContainText("R$ 340,00");

  // E o bloqueio por custos continua valendo em B.
  await page.getByTestId("registro-card").getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText(/não pode ser excluído/i)).toBeVisible();
  await page.goto(instalacaoB);
  await expect(page.getByTestId("registro-card")).toHaveCount(1);
});
