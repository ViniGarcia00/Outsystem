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

let seqInstalacao = 0;

/**
 * Monta uma instalação para o cliente e devolve o caminho do workspace.
 *
 * Desde a Sprint 4.3 (ADR-0413) salvar **volta para a listagem**, não para o
 * workspace. O helper preenche um APELIDO único e usa o link dele na tabela
 * para chegar ao workspace — o apelido sugerido é o nome do cliente, e dois
 * cenários criam duas instalações para o MESMO cliente, o que tornaria o link
 * ambíguo se dependêssemos da sugestão.
 */
async function criarInstalacao(
  page: Page,
  clienteNome: string,
  responsavel?: string,
  // Desde a Sprint 4.5 a tabela não tem coluna Cliente, então quem precisa
  // achar a LINHA passa o próprio apelido — é o texto que a identifica.
  apelidoDesejado?: string,
): Promise<string> {
  const apelido =
    apelidoDesejado ?? `E2E Obra ${Date.now()}-${++seqInstalacao}`;

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();
  await page.getByLabel("Apelido", { exact: true }).fill(apelido);
  if (responsavel) {
    await escolherTecnico(page, "Responsável atual", responsavel);
  }
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page).toHaveURL(/\/instalacoes$/);
  await page
    .getByRole("link", { name: `Abrir instalação ${apelido}` })
    .click();
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

  // Sprint 4.3 (ADR-0413): criar volta para a LISTAGEM; o workspace se abre
  // pelo link do apelido, que aqui é o nome do cliente sugerido.
  await expect(page).toHaveURL(/\/instalacoes$/);
  await page
    .getByRole("link", { name: `Abrir instalação ${clienteNome}` })
    .click();
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
  // A coluna Cliente saiu na Sprint 4.5. O que prova o ponto deste trecho — a
  // busca ainda encontra a instalação pelo nome do cliente — é o LINK do
  // apelido, que aqui carrega o nome sugerido do cliente. Não a célula: o nome
  // acessível dela vem do `aria-label` do link ("Abrir instalação ..."), não
  // do texto visível.
  await expect(
    page.getByRole("link", { name: `Abrir instalação ${clienteNome}` }),
  ).toBeVisible();

  // O workspace continua sem o campo removido.
  await page.goto(instalacaoPath);
  await expect(page.getByLabel("Nome do projeto")).toHaveCount(0);
});

test("Instalações: apelido — sugestão, preservação e busca (Sprint 4.3)", async ({
  page,
}) => {
  const clienteA = await criarCliente(page, "Apelido Alfa");
  const clienteB = await criarCliente(page, "Apelido Bravo");
  const apelido = page.getByLabel("Apelido", { exact: true });

  await page.goto("/instalacoes/nova");

  // 1) Campo nasce vazio e a seleção do Cliente o SUGERE.
  await expect(apelido).toHaveValue("");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteA);
  await page.getByRole("option", { name: clienteA }).click();
  await expect(apelido).toHaveValue(clienteA);

  // 2) Enquanto não foi personalizado, trocar o Cliente re-sugere.
  await page.getByLabel("Cliente", { exact: true }).fill(clienteB);
  await page.getByRole("option", { name: clienteB }).click();
  await expect(apelido).toHaveValue(clienteB);
  await expect(page.getByText(/Apelido mantido/)).toHaveCount(0);

  // 3) Personalizado: trocar o Cliente NÃO sobrescreve, e a sugestão
  //    descartada é mostrada em vez de aplicada em silêncio.
  const personalizado = "Casa Alphaville";
  await apelido.fill(personalizado);
  await page.getByLabel("Cliente", { exact: true }).fill(clienteA);
  await page.getByRole("option", { name: clienteA }).click();
  await expect(apelido).toHaveValue(personalizado);
  await expect(page.getByText(/Apelido mantido/)).toBeVisible();
  await expect(page.getByText(clienteA, { exact: false }).first()).toBeVisible();

  // 4) Esvaziar devolve o campo ao estado "não personalizado": a próxima
  //    seleção volta a sugerir. É o terceiro estado do ADR-0413.
  await apelido.fill("");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteB);
  await page.getByRole("option", { name: clienteB }).click();
  await expect(apelido).toHaveValue(clienteB);

  // Salva com um apelido próprio, com acento — para provar a busca depois.
  const apelidoFinal = "Cobertura Jardim Paulistão";
  await apelido.fill(apelidoFinal);
  await page.getByRole("button", { name: "Salvar" }).click();
  // Criar volta para a listagem (ADR-0413, T14) — já é onde o passo 5 precisa
  // estar, então não há navegação extra aqui.
  await expect(page).toHaveURL(/\/instalacoes$/);

  // 5) A listagem mostra o apelido como identificação principal, e ele é link.
  await expect(
    page.getByRole("columnheader", { name: "Apelido" }),
  ).toBeVisible();
  const linkApelido = page.getByRole("link", {
    name: `Abrir instalação ${apelidoFinal}`,
  });
  await expect(linkApelido).toBeVisible();

  // 6) Busca encontra pelo apelido...
  await page.getByRole("searchbox", { name: "Buscar" }).fill("Cobertura");
  await expect(linkApelido).toBeVisible();

  // 7) ...e continua insensível a acento (fonte única @/utils/busca, ADR-0402).
  await page.getByRole("searchbox", { name: "Buscar" }).fill("paulistao");
  await expect(linkApelido).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar" }).fill("PAULISTÃO");
  await expect(linkApelido).toBeVisible();

  // 8) O apelido é editável no workspace — é rótulo, não snapshot.
  await linkApelido.click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  await expect(apelido).toHaveValue(apelidoFinal);
  await apelido.fill("Cobertura Jardim Paulistão — Fase 2");
  await page.getByRole("button", { name: "Salvar Alterações" }).click();
  await expect(page.getByText("Instalação atualizada.")).toBeVisible();

  // Navegação explícita: para onde o botão leva depois de salvar é assunto da
  // T14 (ADR-0413), e este cenário não deve afirmar nada sobre isso.
  await page.goto("/instalacoes");
  await expect(
    page.getByRole("link", {
      name: "Abrir instalação Cobertura Jardim Paulistão — Fase 2",
    }),
  ).toBeVisible();
});

/**
 * Redirects ao salvar (Sprint 4.3, T14 — ADR-0413).
 *
 * O cenário prova as três regras pela URL FINAL, nunca pelo toast: o toast é
 * evidência de que a ação respondeu, não de para onde a aplicação foi. A regra
 * NEGATIVA da cronologia é o motivo real deste teste existir — é a que se perde
 * primeiro numa refatoração futura, porque "salvar volta para a lista" parece
 * uma regra geral do módulo, e não é.
 */
test("Instalações: salvar dados gerais volta à tabela; salvar registro NÃO (Sprint 4.3)", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Redirect Cliente");
  const tecnico = await criarTecnico(page, "Redirect");
  const apelido = `E2E Obra Redirect ${Date.now()}`;

  // --- 1) CRIAR instalação → volta para a tabela ---
  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();
  await page.getByLabel("Apelido", { exact: true }).fill(apelido);
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page).toHaveURL(/\/instalacoes$/);
  const linkObra = page.getByRole("link", { name: `Abrir instalação ${apelido}` });
  await expect(linkObra).toBeVisible();

  // O toast traz a ação "Abrir", que devolve o atalho para o workspace.
  const acaoAbrir = page.getByRole("button", { name: "Abrir" });
  await expect(acaoAbrir).toBeVisible();
  await acaoAbrir.click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  const instalacaoPath = new URL(page.url()).pathname;

  // --- 2) SALVAR DADOS GERAIS → volta para a tabela ---
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: "Agendada" }).click();
  await page.getByRole("button", { name: "Salvar Alterações" }).click();
  await expect(page).toHaveURL(/\/instalacoes$/);

  // --- 3) CRIAR REGISTRO → permanece no workspace ---
  await page.goto(instalacaoPath);
  await criarRegistro(page, {
    tipo: "Visita ao cliente",
    aconteceuEm: "2026-08-20T10:00",
    responsavel: tecnico,
    relatorio: "Visita inicial para levantamento.",
  });
  // A asserção que importa: a URL NÃO mudou.
  await expect(page).toHaveURL(instalacaoPath);
  await expect(page).not.toHaveURL(/\/instalacoes$/);
  await expect(page.getByTestId("registro-card")).toHaveCount(1);

  // --- 4) EDITAR REGISTRO → permanece no workspace ---
  await page.getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Relatório").fill("Relatório revisado após a visita.");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();

  await expect(page).toHaveURL(instalacaoPath);
  await expect(page).not.toHaveURL(/\/instalacoes$/);
  await expect(page.getByTestId("registro-card")).toContainText(
    "Relatório revisado após a visita.",
  );

  // --- 5) Cancelar instalação NÃO foi alterado: continua no workspace ---
  await page.getByRole("button", { name: "Cancelar instalação" }).click();
  const cancelDialog = page.getByRole("dialog");
  await cancelDialog.getByLabel("Motivo").fill("Cancelamento de teste E2E.");
  await cancelDialog.getByRole("button", { name: "Cancelar instalação" }).click();
  await expect(cancelDialog).toBeHidden();
  await expect(page).toHaveURL(instalacaoPath);
});

/**
 * Anexos do registro (Sprint 4.3, T23 — ADR-0414).
 *
 * O `input[type=file]` é escondido de propósito (o gatilho é o botão), e
 * `setInputFiles` opera nele mesmo assim — é a forma de exercitar o upload real
 * pela mesma rota que o navegador usa.
 *
 * O conteúdo é um PNG 1×1 válido: um buffer aleatório passaria pela allowlist,
 * que confia no MIME declarado, mas não seria um arquivo de verdade em disco.
 */
const PNG_1x1_E2E = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000001" +
    "1f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd4" +
    "0000000049454e44ae426082",
  "hex",
);

test("Instalações: anexos do registro — upload, download e exclusão (Sprint 4.3)", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Anexo Cliente");
  const tecnico = await criarTecnico(page, "Anexo");
  const instalacaoPath = await criarInstalacao(page, clienteNome, tecnico);

  await criarRegistro(page, {
    tipo: "Visita ao cliente",
    aconteceuEm: "2026-08-20T10:00",
    responsavel: tecnico,
    relatorio: "Visita com registro fotográfico.",
  });

  const card = page.getByTestId("registro-card");
  await expect(card.getByText("Nenhum anexo.")).toBeVisible();

  const input = page.locator('input[type="file"]');

  // --- upload ---
  await input.setInputFiles({
    name: "foto da sala.png",
    mimeType: "image/png",
    buffer: PNG_1x1_E2E,
  });

  const anexo = page.getByTestId("anexo-item");
  await expect(anexo).toHaveCount(1);
  await expect(anexo).toContainText("foto da sala.png");
  // O tamanho vem do módulo puro; o PNG 1×1 tem menos de 1 KB.
  await expect(anexo).toContainText("KB");

  // --- download: mesma rota que o link aponta ---
  const href = await anexo.getByRole("link").getAttribute("href");
  expect(href).toMatch(
    /^\/instalacoes\/[^/]+\/registros\/[^/]+\/anexos\/[^/]+$/,
  );
  const baixado = await page.request.get(href!);
  expect(baixado.status()).toBe(200);
  expect(baixado.headers()["content-type"]).toBe("image/png");
  expect(baixado.headers()["x-content-type-options"]).toBe("nosniff");
  expect(Buffer.from(await baixado.body())).toEqual(PNG_1x1_E2E);

  // --- documento Office: upload e download ponta a ponta (Sprint 4.5) ---
  //
  // O DOCX é o caso que interessa aqui e não no service: prova que o formato
  // atravessa o navegador, o Route Handler e volta com o cabeçalho certo. O
  // conteúdo é irrelevante — o sistema não abre o arquivo, só o guarda.
  const DOCX = Buffer.from("conteudo-docx-de-teste", "utf8");
  await input.setInputFiles({
    name: "Relatório de Visita.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: DOCX,
  });

  await expect(page.getByTestId("anexo-item")).toHaveCount(2);
  const itemDocx = page
    .getByTestId("anexo-item")
    .filter({ hasText: "Relatório de Visita.docx" });
  await expect(itemDocx).toHaveCount(1);

  const hrefDocx = await itemDocx.getByRole("link").getAttribute("href");
  const docxBaixado = await page.request.get(hrefDocx!);
  expect(docxBaixado.status()).toBe(200);
  // Content-Type derivado da allowlist, não ecoado da linha.
  expect(docxBaixado.headers()["content-type"]).toBe(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  // Documento BAIXA (imagem é que abre inline), com o nome original e acento.
  expect(docxBaixado.headers()["content-disposition"]).toBe(
    `attachment; filename*=UTF-8''${encodeURIComponent("Relatório de Visita.docx")}`,
  );
  expect(docxBaixado.headers()["x-content-type-options"]).toBe("nosniff");
  expect(Buffer.from(await docxBaixado.body())).toEqual(DOCX);

  // Sai da contagem para não interferir nos passos seguintes.
  await page
    .getByRole("button", { name: "Excluir anexo Relatório de Visita.docx" })
    .click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);

  // --- tipo fora da allowlist é recusado pelo SERVIDOR ---
  await input.setInputFiles({
    name: "script.html",
    mimeType: "text/html",
    buffer: Buffer.from("<script>alert(1)</script>"),
  });
  await expect(page.getByText(/Formato não aceito/)).toBeVisible();
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);

  // --- ZIP também é recusado, pelo MIME e não pela extensão do nome ---
  await input.setInputFiles({
    name: "fotos.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("conteudo-zip-de-teste"),
  });
  await expect(page.getByText(/Formato não aceito/)).toBeVisible();
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);

  // --- excluir o anexo ---
  await page
    .getByRole("button", { name: "Excluir anexo foto da sala.png" })
    .click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("anexo-item")).toHaveCount(0);
  await expect(card.getByText("Nenhum anexo.")).toBeVisible();
  // A rota deixa de servir o arquivo removido.
  expect((await page.request.get(href!)).status()).toBe(404);

  // --- excluir o REGISTRO leva os anexos junto ---
  await input.setInputFiles({
    name: "outra.png",
    mimeType: "image/png",
    buffer: PNG_1x1_E2E,
  });
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);
  const href2 = await page
    .getByTestId("anexo-item")
    .getByRole("link")
    .getAttribute("href");

  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("registro-card")).toHaveCount(0);
  expect((await page.request.get(href2!)).status()).toBe(404);

  // A URL não mudou em nenhum momento: anexo é operação da cronologia.
  await expect(page).toHaveURL(instalacaoPath);
});

test("Instalações: registro com custos continua bloqueado, e o anexo sobrevive (Sprint 4.3)", async ({
  page,
}) => {
  const clienteNome = await criarCliente(page, "Anexo Custo Cliente");
  const tecnico = await criarTecnico(page, "AnexoCusto");
  await criarInstalacao(page, clienteNome, tecnico);

  await criarRegistro(page, {
    tipo: "Material comprado",
    aconteceuEm: "2026-08-21T09:00",
    responsavel: tecnico,
    relatorio: "Compra de cabo.",
    custos: [{ categoria: "Material", valor: "15000" }],
  });

  await page.locator('input[type="file"]').setInputFiles({
    name: "nota.png",
    mimeType: "image/png",
    buffer: PNG_1x1_E2E,
  });
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);

  // O bloqueio de custos (ADR-0401) é anterior aos anexos e continua valendo.
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText(/possui custos lançados/)).toBeVisible();

  // E não teve efeito colateral nenhum: registro e anexo seguem lá.
  await expect(page.getByTestId("registro-card")).toHaveCount(1);
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);
});

/**
 * Tabela de Instalações (Sprint 4.5, T5 — ADR-0417).
 *
 * A ordem das colunas e a ausência da coluna Cliente são afirmadas pelos
 * CABEÇALHOS, não por índice de célula: é o que o usuário vê, e não quebra
 * quando uma coluna de ação muda de lugar.
 *
 * O par que dá sentido ao teste é o último bloco: a coluna Cliente saiu da
 * APRESENTAÇÃO, mas o cliente continua alcançável pela BUSCA. As duas coisas
 * são independentes, e é fácil remover a segunda junto com a primeira por
 * descuido.
 */
test("Instalações: tabela sem coluna Cliente, Número antes do Apelido (Sprint 4.5)", async ({
  page,
}) => {
  // Cliente com ACENTO e apelido DIFERENTE do nome do cliente: as duas coisas
  // juntas é que tornam o teste discriminante. Se o apelido repetisse o nome
  // do cliente, buscar por cliente passaria mesmo com o cliente fora da busca.
  const clienteNome = await criarCliente(page, "Tabela Construção");
  const apelido = `E2E Obra Tabela ${Date.now()}`;

  await page.goto("/instalacoes/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();
  await page.getByLabel("Apelido", { exact: true }).fill(apelido);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/instalacoes$/);

  await page.getByRole("searchbox", { name: "Buscar" }).fill(apelido);

  // A coluna Cliente não existe mais.
  await expect(
    page.getByRole("columnheader", { name: "Cliente" }),
  ).toHaveCount(0);

  // E a ordem é exatamente esta.
  const cabecalhos = await page
    .getByRole("columnheader")
    .allInnerTexts()
    .then((textos) => textos.map((t) => t.trim()).filter(Boolean));

  // "Ações" fecha a lista: é a coluna sem rótulo visível, com texto sr-only.
  expect(cabecalhos).toEqual([
    "Número",
    "Apelido",
    "Endereço",
    "Data",
    "Responsável",
    "Status",
    "Última Atualização",
    "Ações",
  ]);

  const link = page.getByRole("link", { name: `Abrir instalação ${apelido}` });
  await expect(link).toBeVisible();

  // O nome do cliente NÃO aparece mais em célula nenhuma da linha.
  await expect(
    page.getByRole("cell", { name: clienteNome, exact: true }),
  ).toHaveCount(0);

  // Mas a BUSCA continua encontrando a instalação pelo nome do cliente — é o
  // acesso de quem não lembra o apelido. Coluna e busca são independentes.
  await page.getByRole("searchbox", { name: "Buscar" }).fill(clienteNome);
  await expect(link).toBeVisible();

  // ...inclusive sem acento e em caixa alta (fonte única @/utils/busca).
  await page.getByRole("searchbox", { name: "Buscar" }).fill("Construcao");
  await expect(link).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar" }).fill("CONSTRUÇÃO");
  await expect(link).toBeVisible();

  // O cliente segue no workspace: saiu da tabela, não da entidade.
  await link.click();
  await expect(page).toHaveURL(/\/instalacoes\/(?!nova$)[^/]+$/);
  await expect(page.getByText(clienteNome).first()).toBeVisible();
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
  // Apelido explícito: sem a coluna Cliente (Sprint 4.5), é ele que identifica
  // a linha na tabela.
  const apelido = `E2E Obra Cancelar ${Date.now()}`;

  await criarInstalacao(page, clienteNome, undefined, apelido);

  await page.getByRole("button", { name: "Cancelar instalação" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar instalação" }).click();
  // O diálogo fechar é o sinal inequívoco de que a ação concluiu. Não usar o
  // toast: o próprio texto do diálogo contém "marcada como Cancelada.".
  await expect(dialog).toBeHidden();

  // Continua existindo na listagem, agora como Cancelada.
  await page.goto("/instalacoes");
  // A busca continua sendo pelo CLIENTE — é a garantia que sobreviveu à
  // remoção da coluna. A linha, essa, é localizada pelo apelido.
  await page.getByRole("searchbox", { name: "Buscar" }).fill(clienteNome);
  const linha = page.getByRole("row").filter({ hasText: apelido });
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
  await expect(page).toHaveURL(/\/instalacoes$/);
  await page.getByRole("link", { name: `Abrir instalação ${cliente}` }).click();
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
  await expect(page).toHaveURL(/\/instalacoes$/);
  await page.getByRole("link", { name: `Abrir instalação ${cliente}` }).click();
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
