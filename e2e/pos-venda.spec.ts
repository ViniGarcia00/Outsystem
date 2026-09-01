import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Smoke do módulo Pós-venda (Sprint 4.6).
 *
 * Cada cenário cria os próprios dados, com identificador único — nenhuma
 * dependência do catálogo, de clientes ou de processos preexistentes.
 *
 * O que é criado aqui é varrido pelo `globalTeardown` (ADR-0403) através do
 * marcador `E2E ` no nome do cliente: trocas, ordens de serviço, itens,
 * registros, custos e anexos caem junto, por pertencerem a ele — inclusive as
 * pastas físicas sob `pos-venda/`.
 *
 * Os dois casos do briefing viram cenário literalmente: a **fechadura**
 * (1 enviada, 1 esperada, retorno completo) e os **interruptores** (7 enviados,
 * 7 esperados, retorno em duas etapas).
 */

// ---------------------------------------------------------------------------
// Helpers de cadastro
// ---------------------------------------------------------------------------

async function criarCliente(page: Page, rotulo: string): Promise<string> {
  const nome = `E2E ${rotulo} ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  return nome;
}

/**
 * Cria um Usuário com o papel de TÉCNICO. O Pós-venda **não criou papel novo**
 * (spec §6): o responsável usa `ehTecnico`, como as Instalações.
 */
async function criarTecnico(page: Page, rotulo: string): Promise<string> {
  const nome = `E2E Usuario PosVenda ${rotulo} ${Date.now()}`;
  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("switch", { name: "Técnico" }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  return nome;
}

/**
 * Cria um Usuário ATIVO **sem** o papel de técnico — o perfil administrativo.
 *
 * Marca apenas Vendedor para provar que não é a ausência de papéis que faz a
 * Troca aceitá-lo, e sim a ausência de exigência de papel (ADR-0422).
 */
async function criarAdministrativo(page: Page, rotulo: string): Promise<string> {
  const nome = `E2E Usuario PosVenda Adm ${rotulo} ${Date.now()}`;
  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByRole("switch", { name: "Vendedor" }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  return nome;
}

let seqProduto = 0;

async function criarProduto(page: Page, rotulo: string): Promise<string> {
  const sku = `E2E-PV-${rotulo}-${Date.now()}-${++seqProduto}`;
  await page.goto("/produtos/novo");
  await page.getByLabel("SKU", { exact: true }).fill(sku);
  await page
    .getByLabel("Descrição", { exact: true })
    .fill(`Produto de pós-venda (${rotulo})`);
  // CurrencyField recebe os dígitos como centavos: 150000 → R$ 1.500,00.
  await page.getByLabel("Valor do produto").fill("150000");
  await page.getByLabel("Valor do serviço (pode ser zero)").fill("0");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/produtos$/);
  return sku;
}

/**
 * Escolhe um responsável num `Select` já visível.
 *
 * `escopo` restringe a busca do CAMPO (ex.: o diálogo do registro). As OPÇÕES do
 * Radix são renderizadas em portal, na raiz do documento, e por isso são sempre
 * procuradas a partir da `page`.
 */
async function escolherResponsavel(
  page: Page,
  nome: string,
  escopo: Page | Locator = page,
): Promise<void> {
  await escopo.getByLabel("Responsável", { exact: true }).click();
  await page.getByRole("option", { name: nome, exact: true }).click();
}

// ---------------------------------------------------------------------------
// Helpers do módulo
// ---------------------------------------------------------------------------

interface DadosTroca {
  cliente: string;
  referencia: string;
  responsavel?: string;
  relato?: string;
  destinatario?: { tipo: "Instalador" | "Outro"; nome: string };
}

/** Cria a troca e devolve o caminho do workspace (a criação já abre nele). */
async function criarTroca(page: Page, dados: DadosTroca): Promise<string> {
  await page.goto("/pos-venda/trocas-antecipadas/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(dados.cliente);
  await page.getByRole("option", { name: dados.cliente }).click();
  await page.getByLabel("Referência", { exact: true }).fill(dados.referencia);

  if (dados.responsavel) {
    await escolherResponsavel(page, dados.responsavel);
  }
  if (dados.destinatario) {
    await page.getByLabel("Enviado para").click();
    await page
      .getByRole("option", { name: dados.destinatario.tipo, exact: true })
      .click();
    await page
      .getByLabel("Nome do destinatário")
      .fill(dados.destinatario.nome);
  }
  if (dados.relato) {
    await page.getByLabel("O que o cliente relatou").fill(dados.relato);
  }

  await page.getByRole("button", { name: "Salvar" }).click();

  // Criar a troca abre o WORKSPACE (spec §21) — a troca nasce incompleta, e
  // mandar o usuário para a tabela seria pedir que ele reencontre a linha.
  await expect(page).toHaveURL(
    /\/pos-venda\/trocas-antecipadas\/(?!nova$)[^/]+$/,
  );
  return new URL(page.url()).pathname;
}

/** Adiciona um produto à grade, do cadastro ou manual. */
async function adicionarProduto(
  page: Page,
  origem: { sku: string } | { manual: string },
): Promise<void> {
  await page.getByRole("button", { name: "Adicionar produto" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  if ("manual" in origem) {
    await dialog.getByLabel("Origem").click();
    await page
      .getByRole("option", { name: "Outro / Produto não cadastrado" })
      .click();
    await dialog.getByLabel("Descrição", { exact: true }).fill(origem.manual);
  } else {
    await dialog.getByLabel("Produto", { exact: true }).fill(origem.sku);
    // `exact` NÃO: o nome acessível da opção junta o rótulo (SKU) e o
    // sub-rótulo (descrição). Como o SKU é único, a busca devolve exatamente
    // uma opção — o teste não depende da ordem nem do conteúdo do catálogo.
    await page.getByRole("option", { name: origem.sku }).click();
  }

  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Preenche as três quantidades da linha `indice` (1-based) e salva. */
async function lancarQuantidades(
  page: Page,
  indice: number,
  q: { enviado: number; esperado: number; devolvido: number },
): Promise<void> {
  await page.getByLabel(`Enviado ${indice}`).fill(String(q.enviado));
  await page
    .getByLabel(`Esperado retorno ${indice}`)
    .fill(String(q.esperado));
  await page.getByLabel(`Devolvido ${indice}`).fill(String(q.devolvido));
  await page.getByRole("button", { name: "Salvar produtos" }).click();
  await expect(page.getByText("Produtos da troca salvos.")).toBeVisible();
}

interface DadosRegistro {
  dataHora: string;
  responsavel: string;
  relato: string;
  custos?: { categoria: string; valor: string }[];
}

/** Abre o diálogo, preenche o acontecimento e salva. Serve Troca e OS. */
async function criarRegistro(page: Page, dados: DadosRegistro): Promise<void> {
  await page.getByRole("button", { name: "Novo registro" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Data e hora").fill(dados.dataHora);
  await escolherResponsavel(page, dados.responsavel, dialog);
  await dialog.getByLabel("Relato").fill(dados.relato);

  for (const custo of dados.custos ?? []) {
    await dialog.getByRole("button", { name: "Adicionar custo" }).click();
    const linha = dialog.getByTestId("linha-custo").last();
    await linha.getByLabel("Categoria").click();
    await page
      .getByRole("option", { name: custo.categoria, exact: true })
      .click();
    await linha.getByLabel("Valor").fill(custo.valor);
  }

  await dialog.getByRole("button", { name: "Salvar" }).click();
  // O diálogo fechar é o sinal de conclusão — o texto do próprio diálogo não
  // serve como asserção (lição da 4.0.1).
  await expect(dialog).toBeHidden();
}

/** Muda o status no cabeçalho e salva. Serve Troca e OS. */
async function mudarStatus(page: Page, status: string): Promise<void> {
  await page.getByLabel("Status").click();
  await page.getByRole("option", { name: status, exact: true }).click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText(/atualizada\./)).toBeVisible();
}

const PNG_1x1 = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000001" +
    "1f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd4" +
    "0000000049454e44ae426082",
  "hex",
);

const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ---------------------------------------------------------------------------
// §57 — Troca completa: FECHADURA
// ---------------------------------------------------------------------------

test("Pós-venda: hub mostra só os dois submódulos que existem", async ({
  page,
}) => {
  await page.goto("/pos-venda");
  await expect(
    page.getByRole("heading", { level: 1, name: "Pós-venda" }),
  ).toBeVisible();

  // As duas opções, e NADA de "em breve" (spec §2).
  await expect(
    page.getByRole("link", { name: /Trocas Antecipadas/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ordens de Serviço/ }),
  ).toBeVisible();
  await expect(page.getByText(/em breve/i)).toHaveCount(0);

  // O item do menu principal leva ao hub, não a um submódulo.
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Pós-venda", exact: true }).click();
  await expect(page).toHaveURL(/\/pos-venda$/);
});

test("Troca: fechadura — ciclo completo até a finalização", async ({ page }) => {
  const cliente = await criarCliente(page, "PV Fechadura Cliente");
  const tecnico = await criarTecnico(page, "Fechadura");
  const sku = await criarProduto(page, "FEC");

  // 1-3. Pós-venda → Trocas Antecipadas → Nova troca.
  await page.goto("/pos-venda");
  await page.getByRole("link", { name: /Trocas Antecipadas/ }).click();
  await expect(page).toHaveURL(/\/pos-venda\/trocas-antecipadas$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Trocas Antecipadas" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova troca" }).click();
  await expect(page).toHaveURL(/\/pos-venda\/trocas-antecipadas\/nova$/);

  // 4-8. Cliente, referência, responsável, relato, salvar.
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await page
    .getByLabel("Referência", { exact: true })
    .fill("Fechadura entrada social");
  await escolherResponsavel(page, tecnico);
  await page
    .getByLabel("O que o cliente relatou")
    .fill("Fechadura trava de forma intermitente pelo aplicativo.");
  await page.getByRole("button", { name: "Salvar" }).click();

  // 9. O workspace abre.
  await expect(page).toHaveURL(
    /\/pos-venda\/trocas-antecipadas\/(?!nova$)[^/]+$/,
  );
  const trocaPath = new URL(page.url()).pathname;
  const numero = await page
    .getByRole("heading", { level: 1 })
    .innerText()
    .then((t) => t.replace(/\D/g, ""));

  // 10-13. Fechadura do cadastro: enviada 1, esperada 1, devolvida 0.
  await adicionarProduto(page, { sku });
  await lancarQuantidades(page, 1, { enviado: 1, esperado: 1, devolvido: 0 });
  // Pendente é DERIVADO — não existe coluna no banco.
  await expect(page.getByTestId("pendente")).toHaveText("1");

  // 14-15. Timeline com custo de motoboy.
  await criarRegistro(page, {
    dataHora: "2026-08-20T09:00",
    responsavel: tecnico,
    relato: "Fechadura substituta enviada por motoboy ao cliente.",
    custos: [{ categoria: "Motoboy", valor: "8500" }],
  });
  await expect(page.getByTestId("custo-acumulado")).toHaveText("R$ 85,00");

  // 16. Anexo — PDF pela rota real do módulo.
  await page.locator('input[type="file"]').setInputFiles({
    name: "Laudo do cliente.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("conteudo-pdf-de-teste"),
  });
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);
  await expect(page.getByTestId("anexo-item")).toContainText(
    "Laudo do cliente.pdf",
  );

  // 17. Status "Devolução pendente".
  await mudarStatus(page, "Devolução pendente");

  // 18-19. Reload prova a persistência de tudo.
  await page.goto(trocaPath);
  await expect(page.getByRole("combobox", { name: "Status" })).toContainText(
    "Devolução pendente",
  );
  await expect(page.getByLabel("Enviado 1")).toHaveValue("1");
  await expect(page.getByLabel("Devolvido 1")).toHaveValue("0");
  await expect(page.getByTestId("registro-card")).toHaveCount(1);
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);
  await expect(page.getByTestId("custo-acumulado")).toHaveText("R$ 85,00");

  // 20. A fechadura defeituosa retorna.
  await lancarQuantidades(page, 1, { enviado: 1, esperado: 1, devolvido: 1 });
  await expect(page.getByTestId("pendente")).toHaveText("0");

  // 21. Finalizar — sem pendência, é confirmação simples.
  await page.getByRole("button", { name: "Finalizar troca" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Nenhuma pendência a enumerar.
  await expect(page.getByTestId("pendencias-finalizacao")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Finalizar troca" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/finalizada\./)).toBeVisible();

  // 22-25. Listagem: Finalizada, retorno 1/1 e o custo.
  await page.goto("/pos-venda/trocas-antecipadas");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(numero);
  const linha = page.getByRole("row").filter({ hasText: "Fechadura entrada social" });
  await expect(linha).toContainText("Finalizada");
  await expect(linha.getByTestId("retorno")).toHaveText("1/1");
  await expect(linha).toContainText("R$ 85,00");
});

// ---------------------------------------------------------------------------
// §58 — Troca com INTERRUPTORES (7/7), com a confirmação forte pelo caminho
// ---------------------------------------------------------------------------

test("Troca: interruptores 7/7 — retorno parcial, confirmação forte e retorno completo", async ({
  page,
}) => {
  const cliente = await criarCliente(page, "PV Interruptores Cliente");
  const tecnico = await criarTecnico(page, "Interruptores");
  const sku = await criarProduto(page, "INT");

  const trocaPath = await criarTroca(page, {
    cliente,
    referencia: "7 interruptores sala/cozinha",
    responsavel: tecnico,
    relato: "Sete interruptores com falha de acionamento.",
    // Enviado ao INSTALADOR: o nome passa a ser exigido (spec §8).
    destinatario: { tipo: "Instalador", nome: "Instalador Marcos" },
  });

  await adicionarProduto(page, { sku });

  // Retorno PARCIAL: 5 dos 7 voltaram.
  await lancarQuantidades(page, 1, { enviado: 7, esperado: 7, devolvido: 5 });
  await expect(page.getByTestId("pendente")).toHaveText("2");

  await criarRegistro(page, {
    dataHora: "2026-08-21T14:00",
    responsavel: tecnico,
    relato: "Instalador devolveu 5 dos 7 interruptores.",
    custos: [{ categoria: "Frete", valor: "6000" }],
  });

  /**
   * A CONFIRMAÇÃO FORTE (spec §12). O diálogo ENUMERA a pendência — um "tem
   * certeza?" genérico não é confirmação forte, é um clique a mais.
   */
  await page.getByRole("button", { name: "Finalizar troca" }).first().click();
  const dialog = page.getByRole("dialog");
  const pendencias = page.getByTestId("pendencias-finalizacao");
  await expect(pendencias).toBeVisible();
  await expect(pendencias).toContainText("5/7");
  await expect(pendencias).toContainText("faltam 2");
  await expect(
    dialog.getByRole("button", { name: "Finalizar mesmo assim" }),
  ).toBeVisible();

  // Mas NÃO finalizamos: voltamos e registramos o retorno completo.
  await dialog.getByRole("button", { name: "Voltar" }).click();
  await expect(dialog).toBeHidden();

  await lancarQuantidades(page, 1, { enviado: 7, esperado: 7, devolvido: 7 });
  await expect(page.getByTestId("pendente")).toHaveText("0");

  // Em análise: a troca fechou o retorno e a peça vai para diagnóstico.
  await mudarStatus(page, "Em análise");

  await page.goto(trocaPath);
  await expect(page.getByRole("combobox", { name: "Status" })).toContainText(
    "Em análise",
  );
  // O destinatário sobreviveu ao round-trip.
  await expect(page.getByLabel("Nome do destinatário")).toHaveValue(
    "Instalador Marcos",
  );

  await page.goto("/pos-venda/trocas-antecipadas");
  await page.getByRole("searchbox", { name: "Buscar" }).fill("interruptores");
  const linha = page
    .getByRole("row")
    .filter({ hasText: "7 interruptores sala/cozinha" });
  await expect(linha.getByTestId("retorno")).toHaveText("7/7");
  await expect(linha).toContainText("R$ 60,00");
});

// ---------------------------------------------------------------------------
// §59 — Produto MANUAL
// ---------------------------------------------------------------------------

test("Troca: produto não cadastrado persiste e é encontrado pela busca", async ({
  page,
}) => {
  const cliente = await criarCliente(page, "PV Manual Cliente");
  const descricaoManual = "Fechadura antiga do hall sem etiqueta";

  const trocaPath = await criarTroca(page, {
    cliente,
    referencia: "Fechadura apartamento 31",
  });

  await adicionarProduto(page, { manual: descricaoManual });
  await lancarQuantidades(page, 1, { enviado: 1, esperado: 1, devolvido: 0 });

  // Persistiu.
  await page.goto(trocaPath);
  await expect(page.getByTestId("linha-item")).toContainText(descricaoManual);

  // E a busca da listagem encontra pelo texto manual (spec §18) — inclusive
  // sem acento e em caixa alta, pela fonte única `@/utils/busca` (ADR-0402).
  await page.goto("/pos-venda/trocas-antecipadas");
  const linha = page
    .getByRole("row")
    .filter({ hasText: "Fechadura apartamento 31" });

  for (const termo of ["sem etiqueta", "ANTIGA", "apartamento 31"]) {
    await page.getByRole("searchbox", { name: "Buscar" }).fill(termo);
    await expect(linha).toBeVisible();
  }
});

// ---------------------------------------------------------------------------
// §60 — OS MANUAL (cenário OBRIGATÓRIO)
// ---------------------------------------------------------------------------

test("OS: criação manual completa até a finalização", async ({ page }) => {
  const cliente = await criarCliente(page, "PV OS Cliente");
  const tecnico = await criarTecnico(page, "OS Manual");
  const sku = await criarProduto(page, "OSM");

  // 1-3. Pós-venda → Ordens de Serviço → Nova OS.
  await page.goto("/pos-venda");
  await page.getByRole("link", { name: /Ordens de Serviço/ }).click();
  await expect(page).toHaveURL(/\/pos-venda\/ordens-de-servico$/);
  await page.getByRole("button", { name: "Nova ordem de serviço" }).click();
  await expect(page).toHaveURL(/\/pos-venda\/ordens-de-servico\/nova$/);

  // 4-7. Cliente, referência, responsável, relato.
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await page
    .getByLabel("Referência", { exact: true })
    .fill("Fechadura entrada social");
  await escolherResponsavel(page, tecnico);
  await page
    .getByLabel("O que foi relatado")
    .fill("Fechadura devolvida pelo cliente para análise.");

  /**
   * O campo de vínculo com Troca NÃO aparece: este cliente não tem troca
   * nenhuma. É o que prova que a OS funciona completamente sem Troca — o fluxo
   * obrigatório desta Sprint (spec §24).
   */
  await expect(
    page.getByLabel("Troca antecipada relacionada"),
  ).toHaveCount(0);

  // 8-10. Um produto do cadastro e um item manual adicional.
  await adicionarProduto(page, { sku });
  await page.getByLabel("Quantidade 1").fill("2");
  await adicionarProduto(page, { manual: "Espelho da fechadura, avulso" });

  // 11. Salvar abre o workspace.
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(
    /\/pos-venda\/ordens-de-servico\/(?!nova$)[^/]+$/,
  );
  const osPath = new URL(page.url()).pathname;
  const numero = await page
    .getByRole("heading", { level: 1 })
    .innerText()
    .then((t) => t.replace(/\D/g, ""));

  // Origem DIRETA — derivada da ausência de vínculo (ADR-0419).
  await expect(page.getByTestId("origem-os")).toContainText("Direta");
  await expect(page.getByTestId("item-os")).toHaveCount(2);

  // 12-13. Timeline com custo de peça.
  await criarRegistro(page, {
    dataHora: "2026-08-22T10:30",
    responsavel: tecnico,
    relato: "Equipamento recebido na bancada e aberto para análise.",
    custos: [{ categoria: "Peça", valor: "32000" }],
  });
  await expect(page.getByTestId("custo-acumulado")).toHaveText("R$ 320,00");

  // 14. Anexo — XLSX pela rota da OS.
  await page.locator('input[type="file"]').setInputFiles({
    name: "Planilha de medição.xlsx",
    mimeType: MIME_XLSX,
    buffer: Buffer.from("conteudo-xlsx-de-teste"),
  });
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);

  // 15. Status "Em análise".
  await mudarStatus(page, "Em análise");
  await page.goto(osPath);

  /**
   * A GUARDA TÉCNICA (ADR-0420): finalizar sem diagnóstico nem solução é
   * recusado, e a mensagem diz exatamente o que falta. Este passo é o que
   * documenta a regra na interface.
   */
  await page
    .getByRole("button", { name: "Finalizar ordem de serviço" })
    .first()
    .click();
  await expect(
    page.getByText(/registre a conclusão técnica geral/i),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Status" })).toContainText(
    "Em análise",
  );

  // 16-17. Diagnóstico e solução POR PRODUTO — basta um item preenchido.
  await page
    .getByLabel("Diagnóstico 1")
    .fill("Falha mecânica do mecanismo interno.");
  await page
    .getByLabel("Solução 1")
    .fill("Substituição do conjunto e testes de acionamento.");
  await page.getByRole("button", { name: "Salvar produtos" }).click();
  await expect(
    page.getByText("Produtos da ordem de serviço salvos."),
  ).toBeVisible();

  // 18. Agora finaliza.
  await page.goto(osPath);
  await page
    .getByRole("button", { name: "Finalizar ordem de serviço" })
    .first()
    .click();
  await expect(page.getByText(/finalizada\./)).toBeVisible();

  // 19-23. Listagem: Finalizada, custo, produtos, e a persistência do reload.
  await page.goto("/pos-venda/ordens-de-servico");
  await page.getByRole("searchbox", { name: "Buscar" }).fill(numero);
  const linha = page.getByRole("row").filter({ hasText: `${numero}` });
  await expect(linha).toContainText("Finalizada");
  await expect(linha).toContainText("R$ 320,00");
  await expect(linha).toContainText("Direta");

  await page.goto(osPath);
  await expect(page.getByRole("combobox", { name: "Status" })).toContainText(
    "Finalizada",
  );
  await expect(page.getByTestId("item-os")).toHaveCount(2);
  await expect(page.getByLabel("Diagnóstico 1")).toHaveValue(
    "Falha mecânica do mecanismo interno.",
  );
  await expect(page.getByTestId("registro-card")).toHaveCount(1);
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// §61 — OS com origem escolhida MANUALMENTE
// ---------------------------------------------------------------------------

test("OS: vínculo manual com uma troca do mesmo cliente", async ({ page }) => {
  const cliente = await criarCliente(page, "PV Vinculo Cliente");
  const trocaPath = await criarTroca(page, {
    cliente,
    referencia: "Fechadura para vincular",
  });
  const trocaNumero = await page
    .getByRole("heading", { level: 1 })
    .innerText()
    .then((t) => t.replace(/\D/g, ""));

  await page.goto("/pos-venda/ordens-de-servico/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();

  // O campo de vínculo só aparece DEPOIS do cliente, e só quando ele tem troca
  // disponível — uma tela que sempre o exibisse sugeriria que a OS depende de
  // uma troca, e não depende.
  const seletorTroca = page.getByLabel("Troca antecipada relacionada");
  await expect(seletorTroca).toBeVisible();
  await seletorTroca.click();
  await page
    .getByRole("option", { name: new RegExp(`Troca ${trocaNumero}`) })
    .click();

  await page.getByLabel("Referência", { exact: true }).fill("Análise da fechadura");
  await adicionarProduto(page, { manual: "Fechadura devolvida pelo cliente" });
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page).toHaveURL(
    /\/pos-venda\/ordens-de-servico\/(?!nova$)[^/]+$/,
  );

  // Origem = Troca X, com link (spec §41).
  const origem = page.getByTestId("origem-os");
  await expect(origem).toContainText(`Troca ${trocaNumero}`);
  await origem.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`${trocaPath}$`));

  // E o link é BIDIRECIONAL: a troca mostra a OS.
  await expect(page.getByText(/Ordem de serviço vinculada/)).toBeVisible();

  // A listagem também traz a origem como link.
  await page.goto("/pos-venda/ordens-de-servico");
  await page.getByRole("searchbox", { name: "Buscar" }).fill("Análise da fechadura");
  await expect(
    page.getByRole("link", { name: `Troca ${trocaNumero}` }),
  ).toBeVisible();

  // A busca da OS encontra pelo NÚMERO DA TROCA relacionada (spec §39).
  await page.getByRole("searchbox", { name: "Buscar" }).fill(`Troca ${trocaNumero}`);
  await expect(
    page.getByRole("row").filter({ hasText: "Análise da fechadura" }),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// §62 — Botão "Criar Ordem de Serviço" e o SNAPSHOT
// ---------------------------------------------------------------------------

test("Troca → OS: pré-preenchimento e snapshot que NÃO sincroniza", async ({
  page,
}) => {
  const cliente = await criarCliente(page, "PV Snapshot Cliente");
  const tecnico = await criarTecnico(page, "Snapshot");
  const sku = await criarProduto(page, "SNP");

  const trocaPath = await criarTroca(page, {
    cliente,
    referencia: "7 interruptores para análise",
    responsavel: tecnico,
  });
  const trocaNumero = await page
    .getByRole("heading", { level: 1 })
    .innerText()
    .then((t) => t.replace(/\D/g, ""));

  await adicionarProduto(page, { sku });

  /**
   * Nada devolvido ainda ⇒ a OS NÃO é criada, e a mensagem diz o que fazer
   * antes de tentar de novo (spec §27).
   */
  await lancarQuantidades(page, 1, { enviado: 7, esperado: 7, devolvido: 0 });
  await page.getByRole("button", { name: "Criar Ordem de Serviço" }).click();
  await expect(page.getByText(/Nenhum produto desta Troca foi devolvido/)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${trocaPath}$`));

  // 5 dos 7 voltaram. Agora sim.
  await lancarQuantidades(page, 1, { enviado: 7, esperado: 7, devolvido: 5 });
  await page.getByRole("button", { name: "Criar Ordem de Serviço" }).click();

  await expect(page).toHaveURL(
    /\/pos-venda\/ordens-de-servico\/(?!nova$)[^/]+$/,
  );
  const osPath = new URL(page.url()).pathname;

  // Pré-preenchido: cliente, vínculo, contexto na referência e o produto.
  await expect(page.getByLabel("Cliente", { exact: true })).toHaveValue(cliente);
  await expect(page.getByTestId("origem-os")).toContainText(`Troca ${trocaNumero}`);
  await expect(page.getByLabel("Referência", { exact: true })).toHaveValue(
    new RegExp(`Troca ${trocaNumero}`),
  );
  await expect(page.getByTestId("item-os")).toHaveCount(1);
  await expect(page.getByTestId("item-os")).toContainText(sku);
  // A quantidade é a DEVOLVIDA daquele instante.
  await expect(page.getByLabel("Quantidade 1")).toHaveValue("5");

  /**
   * ── O PONTO DO CENÁRIO ────────────────────────────────────────────────────
   * A troca evolui para 7/7/7. A OS **continua 5** — é snapshot, não espelho
   * (ADR-0419). Não existe código de sincronização para desligar.
   */
  await page.goto(trocaPath);
  await lancarQuantidades(page, 1, { enviado: 7, esperado: 7, devolvido: 7 });
  await expect(page.getByTestId("pendente")).toHaveText("0");

  await page.goto(osPath);
  await expect(page.getByLabel("Quantidade 1")).toHaveValue("5");

  // E a troca não pode gerar uma SEGUNDA OS (cardinalidade zero-ou-uma).
  await page.goto(trocaPath);
  await expect(page.getByText(/Ordem de serviço vinculada/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Criar Ordem de Serviço" }),
  ).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// §63 — Anexos: cabeçalhos, download e exclusão
// ---------------------------------------------------------------------------

test("Anexos: DOCX na troca e imagem na OS — download, cabeçalhos e exclusão", async ({
  page,
}) => {
  const cliente = await criarCliente(page, "PV Anexo Cliente");
  const tecnico = await criarTecnico(page, "Anexo");

  // ── TROCA: documento Word ────────────────────────────────────────────────
  const trocaPath = await criarTroca(page, {
    cliente,
    referencia: "Fechadura com laudo anexado",
  });
  await criarRegistro(page, {
    dataHora: "2026-08-20T09:00",
    responsavel: tecnico,
    relato: "Laudo recebido do instalador.",
  });

  const card = page.getByTestId("registro-card");
  await expect(card.getByText("Nenhum anexo.")).toBeVisible();

  const DOCX = Buffer.from("conteudo-docx-de-teste");
  await page.locator('input[type="file"]').setInputFiles({
    name: "Relatório de Análise.docx",
    mimeType: MIME_DOCX,
    buffer: DOCX,
  });

  const anexo = page.getByTestId("anexo-item");
  await expect(anexo).toHaveCount(1);
  await expect(anexo).toContainText("Relatório de Análise.docx");

  const href = await anexo.getByRole("link").getAttribute("href");
  expect(href).toMatch(
    /^\/pos-venda\/trocas-antecipadas\/[^/]+\/registros\/[^/]+\/anexos\/[^/]+$/,
  );

  const baixado = await page.request.get(href!);
  expect(baixado.status()).toBe(200);
  // Content-Type DERIVADO da allowlist, não ecoado da linha.
  expect(baixado.headers()["content-type"]).toBe(MIME_DOCX);
  // Documento BAIXA (imagem é que abre inline), com o nome original e acento.
  expect(baixado.headers()["content-disposition"]).toBe(
    `attachment; filename*=UTF-8''${encodeURIComponent("Relatório de Análise.docx")}`,
  );
  expect(baixado.headers()["x-content-type-options"]).toBe("nosniff");
  expect(Buffer.from(await baixado.body())).toEqual(DOCX);

  // Tipo fora da allowlist é recusado pelo SERVIDOR.
  await page.locator('input[type="file"]').setInputFiles({
    name: "script.html",
    mimeType: "text/html",
    buffer: Buffer.from("<script>alert(1)</script>"),
  });
  await expect(page.getByText(/Formato não aceito/)).toBeVisible();
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);

  // Exclusão: a rota deixa de servir o arquivo.
  await page
    .getByRole("button", { name: "Excluir anexo Relatório de Análise.docx" })
    .click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("anexo-item")).toHaveCount(0);
  expect((await page.request.get(href!)).status()).toBe(404);

  // A URL não mudou em momento nenhum: anexo é operação da timeline.
  await expect(page).toHaveURL(new RegExp(`${trocaPath}$`));

  // ── OS: imagem, que abre INLINE ──────────────────────────────────────────
  await page.goto("/pos-venda/ordens-de-servico/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await page.getByLabel("Referência", { exact: true }).fill("Análise com foto");
  await adicionarProduto(page, { manual: "Fechadura devolvida" });
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(
    /\/pos-venda\/ordens-de-servico\/(?!nova$)[^/]+$/,
  );

  await criarRegistro(page, {
    dataHora: "2026-08-23T11:00",
    responsavel: tecnico,
    relato: "Registro fotográfico da bancada.",
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "foto da bancada.png",
    mimeType: "image/png",
    buffer: PNG_1x1,
  });
  await expect(page.getByTestId("anexo-item")).toHaveCount(1);

  const hrefOS = await page
    .getByTestId("anexo-item")
    .getByRole("link")
    .getAttribute("href");
  expect(hrefOS).toMatch(
    /^\/pos-venda\/ordens-de-servico\/[^/]+\/registros\/[^/]+\/anexos\/[^/]+$/,
  );

  const imagem = await page.request.get(hrefOS!);
  expect(imagem.status()).toBe(200);
  expect(imagem.headers()["content-type"]).toBe("image/png");
  // Imagem abre no navegador; documento baixa.
  expect(imagem.headers()["content-disposition"]).toContain("inline");
  expect(imagem.headers()["x-content-type-options"]).toBe("nosniff");
  expect(Buffer.from(await imagem.body())).toEqual(PNG_1x1);

  // Excluir o REGISTRO leva o anexo junto.
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("registro-card")).toHaveCount(0);
  expect((await page.request.get(hrefOS!)).status()).toBe(404);
});

// ---------------------------------------------------------------------------
// Cancelamento e filtros
// ---------------------------------------------------------------------------

test("Pós-venda: cancelar preserva o histórico e o filtro de status encontra", async ({
  page,
}) => {
  const cliente = await criarCliente(page, "PV Cancelar Cliente");
  const tecnico = await criarTecnico(page, "Cancelar");

  const trocaPath = await criarTroca(page, {
    cliente,
    referencia: "Troca que será cancelada",
  });
  await adicionarProduto(page, { manual: "Peça que não voltou" });
  await lancarQuantidades(page, 1, { enviado: 1, esperado: 1, devolvido: 0 });
  await criarRegistro(page, {
    dataHora: "2026-08-20T09:00",
    responsavel: tecnico,
    relato: "Envio feito antes de o cliente desistir.",
    custos: [{ categoria: "Sedex", valor: "4200" }],
  });

  await page.getByRole("button", { name: "Cancelar troca" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Motivo").fill("Cliente desistiu da substituição.");
  await dialog.getByRole("button", { name: "Cancelar troca" }).click();
  await expect(dialog).toBeHidden();

  // NADA foi apagado (spec §42).
  await page.goto(trocaPath);
  await expect(page.getByRole("combobox", { name: "Status" })).toContainText(
    "Cancelada",
  );
  await expect(page.getByTestId("linha-item")).toHaveCount(1);
  await expect(page.getByTestId("registro-card")).toHaveCount(1);
  await expect(page.getByTestId("custo-acumulado")).toHaveText("R$ 42,00");

  // Continua na listagem, e o filtro de status a encontra (spec §19).
  await page.goto("/pos-venda/trocas-antecipadas");
  await page.getByLabel("Filtrar por status").click();
  await page.getByRole("option", { name: "Cancelada", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Buscar" })
    .fill("Troca que será cancelada");
  await expect(
    page.getByRole("row").filter({ hasText: "Troca que será cancelada" }),
  ).toContainText("Cancelada");

  // E o filtro exclui de verdade: em "Aberta" ela não aparece.
  await page.getByLabel("Filtrar por status").click();
  await page.getByRole("option", { name: "Aberta", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Troca que será cancelada" }),
  ).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Responsável da Troca — qualquer usuário ATIVO (ADR-0422)
// ---------------------------------------------------------------------------

/**
 * A Troca é acompanhada por quem cuida de envio, devolução, frete e cobrança —
 * frequentemente administrativo. Exigir `ehTecnico` ali limitaria o cadastro sem
 * razão de negócio.
 *
 * A **Ordem de Serviço continua exigindo técnico**, e o cenário prova as duas
 * pontas no mesmo teste: o mesmo usuário administrativo aparece no Select da
 * Troca e **não** aparece no da OS.
 */
test("Troca: responsável pode ser usuário ativo NÃO técnico; a OS continua exigindo técnico", async ({
  page,
}) => {
  const cliente = await criarCliente(page, "PV Responsavel Cliente");
  const administrativo = await criarAdministrativo(page, "Responsavel");

  // --- 1) A Troca aceita o administrativo, da criação ao round-trip ---
  await page.goto("/pos-venda/trocas-antecipadas/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(cliente);
  await page.getByRole("option", { name: cliente }).click();
  await page
    .getByLabel("Referência", { exact: true })
    .fill("Devolução acompanhada pela administração");
  await escolherResponsavel(page, administrativo);
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page).toHaveURL(
    /\/pos-venda\/trocas-antecipadas\/(?!nova$)[^/]+$/,
  );
  const trocaPath = new URL(page.url()).pathname;

  await page.goto(trocaPath);
  await expect(
    page.getByRole("combobox", { name: "Responsável" }),
  ).toContainText(administrativo);

  // --- 2) A timeline da Troca também aceita (spec: postagem, frete, cobrança) ---
  await criarRegistro(page, {
    dataHora: "2026-08-20T09:00",
    responsavel: administrativo,
    relato: "Postagem feita no correio e cliente avisado da devolução.",
    custos: [{ categoria: "Sedex", valor: "4200" }],
  });
  await expect(page.getByTestId("registro-card")).toContainText(
    `Responsável: ${administrativo}`,
  );
  await expect(page.getByTestId("custo-acumulado")).toHaveText("R$ 42,00");

  // --- 3) A OS NÃO oferece o administrativo: lá o trabalho é técnico ---
  await page.goto("/pos-venda/ordens-de-servico/nova");
  await page.getByLabel("Responsável", { exact: true }).click();
  await expect(
    page.getByRole("option", { name: administrativo, exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
});
