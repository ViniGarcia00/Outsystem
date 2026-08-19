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

/**
 * Cartão do Resumo Financeiro. As asserções são escopadas a ele porque rótulos
 * como "Produtos" e "Serviços" também existem na navegação lateral e nos títulos
 * de seção — sem escopo, o strict mode do Playwright acusa ambiguidade.
 */
const resumoFinanceiro = (page: import("@playwright/test").Page) =>
  page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: "Resumo Financeiro" }) })
    .last();

/** Desempata SKUs criados no mesmo milissegundo. */
let seqProduto = 0;

/**
 * Cria, pelos fluxos normais da aplicação, um produto exclusivo do cenário e
 * devolve o SKU.
 *
 * **Por que existe:** o smoke não pode depender de nenhum produto preexistente.
 * Os cenários usavam SKUs fixos do catálogo fictício do `prisma/seed.ts`, e
 * passaram a falhar quando o banco de desenvolvimento virou o catálogo real
 * restaurado (`backup/db_outsystem.backup`). Trocar por outro SKU fixo só moveria
 * o acoplamento; cada cenário passa a ser dono dos dados de que precisa — o mesmo
 * princípio já aplicado aos clientes (nome único por `Date.now()`).
 *
 * O prefixo `E2E-` mais o carimbo de tempo tornam o SKU inequivocamente de teste
 * e sem colisão com dado real. O SKU é único no banco (índice + checagem no
 * backend), então nomes repetidos seriam rejeitados pela própria aplicação.
 */
async function criarProdutoDeTeste(
  page: import("@playwright/test").Page,
  rotulo: string,
): Promise<string> {
  const sku = `E2E-${rotulo}-${Date.now()}-${++seqProduto}`;

  await page.goto("/produtos/novo");
  await page.getByLabel("SKU", { exact: true }).fill(sku);
  await page
    .getByLabel("Descrição", { exact: true })
    .fill(`Produto de teste E2E (${rotulo})`);
  // CurrencyField recebe os dígitos como centavos: 150000 → R$ 1.500,00.
  await page.getByLabel("Valor do produto").fill("150000");
  await page.getByLabel("Valor do serviço (pode ser zero)").fill("25000");
  await page.getByRole("button", { name: "Salvar" }).click();

  // Salvou de fato: o formulário redireciona para a listagem.
  await expect(page).toHaveURL(/\/produtos$/);
  return sku;
}

/**
 * Escolhe no autocomplete o produto de SKU exato. Como o SKU é único, a busca
 * (`contains`, mínimo de 3 caracteres) devolve exatamente uma opção — o teste
 * não depende da ordem nem do conteúdo do catálogo.
 */
async function adicionarProduto(
  page: import("@playwright/test").Page,
  sku: string,
): Promise<void> {
  await page.getByRole("button", { name: "Adicionar produto" }).click();
  await page.getByLabel("Produto", { exact: true }).fill(sku);
  await page.getByRole("option", { name: sku }).click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
}

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
  // Inscrição Estadual (novo) e UF em lista.
  await expect(page.getByLabel("Inscrição Estadual")).toBeVisible();
  await expect(page.getByLabel("UF")).toBeVisible();
  // Logotipo agora é por upload (sem campo de URL).
  await expect(page.getByLabel("Enviar logotipo")).toBeVisible();
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
  // UF virou lista; PF exibe RG (documento secundário opcional).
  await expect(page.getByLabel("UF")).toBeVisible();
  await expect(page.getByLabel("RG")).toBeVisible();
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
  // Esperar o valor carregado antes de digitar: `toHaveURL` passa assim que a
  // URL muda, e o formulário ainda pode remontar com os `defaultValues` do
  // Server Component, descartando o que foi digitado antes da hidratação.
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(nome);
  await page.getByLabel("Nome", { exact: true }).fill(nomeEditado);
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(
    nomeEditado,
  );
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

  // Produto próprio do cenário — nada preexistente no catálogo.
  const sku = await criarProdutoDeTeste(page, "PROPOSTA");

  await page.goto("/propostas");
  await expect(
    page.getByRole("heading", { level: 1, name: "Propostas" }),
  ).toBeVisible();
  // Coluna "Valor" na listagem.
  await expect(
    page.getByRole("columnheader", { name: "Valor" }),
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

  // Nome do Projeto (pertence à Proposta; persistido).
  await expect(page.getByLabel("Nome do Projeto")).toBeVisible();
  await page.getByLabel("Nome do Projeto").fill("Projeto E2E");

  await page.getByPlaceholder("Nome da nova seção (ex.: Sala)").fill("Sala E2E");
  await page.getByRole("button", { name: "Adicionar seção" }).click();
  await expect(page.getByRole("heading", { name: "Sala E2E" })).toBeVisible();

  await adicionarProduto(page, sku);
  await expect(
    page.getByRole("columnheader", { name: "Total", exact: true }),
  ).toBeVisible();
  // Valor Serviço agora é uma coluna própria (item carrega produto + serviço).
  await expect(
    page.getByRole("columnheader", { name: "Valor Serviço" }),
  ).toBeVisible();

  // Não permite o mesmo produto duas vezes na MESMA seção.
  await adicionarProduto(page, sku);
  await expect(page.getByText(/já foi adicionado/i)).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();

  // Resumo Financeiro (Sprint 2.9.4 — substituiu o antigo rodapé de totais).
  // No modelo Completa o grupo Automação traz Produtos, Serviços e Subtotal; o
  // fechamento é o Total Geral. Sem serviços complementares adicionados, as
  // linhas Som/Wi-Fi não aparecem.
  const resumo = resumoFinanceiro(page);
  await expect(
    page.getByRole("heading", { name: "Resumo Financeiro" }),
  ).toBeVisible();
  await expect(resumo.getByText("Automação", { exact: true })).toBeVisible();
  await expect(resumo.getByText("Produtos", { exact: true })).toBeVisible();
  await expect(resumo.getByText("Serviços", { exact: true })).toBeVisible();
  await expect(resumo.getByText("Subtotal", { exact: true })).toBeVisible();
  await expect(resumo.getByText("Total Geral", { exact: true })).toBeVisible();
  await expect(
    resumo.getByText("Projeto Som Ambiente", { exact: true }),
  ).toHaveCount(0);
  await expect(
    resumo.getByText("Projeto Wi-Fi Premium", { exact: true }),
  ).toHaveCount(0);

  // Desconto inteligente: "10%" é interpretado como percentual e formatado.
  const desconto = page.getByLabel("Desconto");
  await desconto.fill("10%");
  await desconto.blur();
  await expect(desconto).toHaveValue("10%");

  // Frete: padrão R$ 0,00; ao alterar, o Total da Proposta (derivado) recalcula.
  // (o formatador BRL usa espaço não-quebrável — regex tolerante ao espaço)
  await expect(page.getByText("Frete", { exact: true })).toBeVisible();
  const frete = page.getByLabel("Frete");
  // Frete inicia vazio (não preenche R$ 0,00 automaticamente).
  await expect(frete).toHaveValue("");
  await frete.fill("10000");
  await expect(frete).toHaveValue(/R\$\s*100,00/);

  // Finalização (ADR-0222): informações comerciais finais (texto livre).
  // No modelo Completa a "Previsão de instalação" é exibida.
  await expect(
    page.getByText("Informações Comerciais", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Forma de pagamento").fill("PIX à vista");
  await page.getByLabel("Previsão de instalação").fill("2 dias úteis");
  // Observações comerciais/técnicas saíram da tela na Sprint 2.9.4 (os campos
  // continuam no banco). Travado aqui para que a volta seja uma decisão, não um
  // acidente.
  await expect(page.getByLabel("Observações comerciais")).toHaveCount(0);
  await expect(page.getByLabel("Observações técnicas")).toHaveCount(0);

  // "Criar Proposta" persiste tudo e abre o workspace definitivo.
  await page.getByRole("button", { name: "Criar Proposta" }).click();
  await expect(page).toHaveURL(/\/propostas\/(?!nova$)[^/]+$/);
  await expect(page.getByRole("heading", { name: "Conteúdo" })).toBeVisible();
  const propostaPath = new URL(page.url()).pathname;
  // Nome do Projeto persistiu (round-trip).
  await expect(page.getByLabel("Nome do Projeto")).toHaveValue("Projeto E2E");

  // Persistência da finalização (round-trip pós-criação).
  await expect(page.getByLabel("Forma de pagamento")).toHaveValue(
    "PIX à vista",
  );
  await expect(page.getByLabel("Previsão de instalação")).toHaveValue(
    "2 dias úteis",
  );

  // Proposta existente: edição fica pendente até "Salvar Alterações".
  await page
    .getByPlaceholder("Nome da nova seção (ex.: Sala)")
    .fill("Extra E2E");
  await page.getByRole("button", { name: "Adicionar seção" }).click();
  await page.getByRole("button", { name: "Salvar Alterações" }).click();
  await expect(page.getByRole("heading", { name: "Extra E2E" })).toBeVisible();

  // Documento comercial (PDF): o endpoint responde application/pdf não-vazio.
  const pdfResp = await page.request.get(`${propostaPath}/pdf`);
  expect(pdfResp.status()).toBe(200);
  expect(pdfResp.headers()["content-type"]).toContain("application/pdf");
  expect((await pdfResp.body()).byteLength).toBeGreaterThan(1000);

  // PDF Apresentação (novo endpoint — Sprint 3.0) responde application/pdf.
  const apresResp = await page.request.get(`${propostaPath}/presentation`);
  expect(apresResp.status()).toBe(200);
  expect(apresResp.headers()["content-type"]).toContain("application/pdf");
  expect((await apresResp.body()).byteLength).toBeGreaterThan(1000);
  // Botão "Gerar PDF Apresentação" presente ao lado do PDF Comercial.
  await expect(
    page.getByRole("button", { name: "Gerar PDF Apresentação" }),
  ).toBeVisible();

  // "Gerar PDF Detalhado" emite a proposta (RASCUNHO → EMITIDA).
  await page
    .getByRole("button", { name: "Gerar PDF Detalhado", exact: true })
    .click();
  await expect(page.getByText("Emitida", { exact: true })).toBeVisible();
  // Após emitir, o botão "Abrir PDF Detalhado" fica disponível.
  await expect(
    page.getByRole("button", { name: "Abrir PDF Detalhado" }),
  ).toBeVisible();

  // Alteração pós-emissão + Salvar cria automaticamente a Rev.1 e volta a Rascunho.
  await page
    .getByPlaceholder("Nome da nova seção (ex.: Sala)")
    .fill("Cozinha E2E");
  await page.getByRole("button", { name: "Adicionar seção" }).click();
  await page.getByRole("button", { name: "Salvar Alterações" }).click();
  await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Rev\.1/ })).toBeVisible();
});

test("Propostas: Contrato (.docx) e Anexo Contratual (Sprint 3.1)", async ({
  page,
}) => {
  // Cliente pesquisável e uma proposta com um item, para haver o que emitir.
  const clienteNome = `E2E Contrato Cliente ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(clienteNome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  // Produto próprio do cenário — nada preexistente no catálogo.
  const sku = await criarProdutoDeTeste(page, "CONTRATO");

  await page.goto("/propostas/nova");
  await page.getByLabel("Cliente", { exact: true }).fill(clienteNome);
  await page.getByRole("option", { name: clienteNome }).click();
  await page.getByPlaceholder("Nome da nova seção (ex.: Sala)").fill("Sala E2E");
  await page.getByRole("button", { name: "Adicionar seção" }).click();
  await adicionarProduto(page, sku);
  await page.getByLabel("Forma de pagamento").fill("PIX à vista");
  await page.getByRole("button", { name: "Criar Proposta" }).click();
  await expect(page).toHaveURL(/\/propostas\/(?!nova$)[^/]+$/);
  const propostaPath = new URL(page.url()).pathname;

  // Os dois botões novos aparecem; o antigo "PDF Contratual" foi removido.
  await expect(
    page.getByRole("button", { name: "Emitir Contrato", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Emitir Anexo Contratual" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /PDF Contratual/ }),
  ).toHaveCount(0);

  // Anexo Contratual: mesmo endpoint /contratual de antes, ainda PDF.
  const anexo = await page.request.get(`${propostaPath}/contratual`);
  expect(anexo.status()).toBe(200);
  expect(anexo.headers()["content-type"]).toContain("application/pdf");
  expect((await anexo.body()).byteLength).toBeGreaterThan(1000);

  // Contrato: endpoint /contrato novo, devolve .docx como anexo para download.
  const contrato = await page.request.get(`${propostaPath}/contrato`);
  expect(contrato.status()).toBe(200);
  expect(contrato.headers()["content-type"]).toContain(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  expect(contrato.headers()["content-disposition"]).toContain("attachment;");
  expect(contrato.headers()["content-disposition"]).toContain(".docx");
  expect((await contrato.body()).byteLength).toBeGreaterThan(1000);

  // "Emitir Contrato" a partir de RASCUNHO emite a proposta (padrão dos demais).
  await page.getByRole("button", { name: "Emitir Contrato", exact: true }).click();
  await expect(page.getByText("Emitida", { exact: true })).toBeVisible();
});

test("Propostas: modelo Simplificada (produtos sem seções)", async ({
  page,
}) => {
  const clienteNome = `E2E Simplificada Cliente ${Date.now()}`;
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome", { exact: true }).fill(clienteNome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  // Produto próprio do cenário — nada preexistente no catálogo.
  const sku = await criarProdutoDeTeste(page, "SIMPLIFICADA");

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
  await adicionarProduto(page, sku);
  await expect(
    page.getByRole("columnheader", { name: "Total", exact: true }),
  ).toBeVisible();
  // Resumo Financeiro na Simplificada: o grupo Automação mostra apenas Produtos
  // e Subtotal — a linha "Serviços" é omitida —, e fecha no Total Geral.
  const resumo = resumoFinanceiro(page);
  await expect(
    page.getByRole("heading", { name: "Resumo Financeiro" }),
  ).toBeVisible();
  await expect(resumo.getByText("Produtos", { exact: true })).toBeVisible();
  await expect(resumo.getByText("Subtotal", { exact: true })).toBeVisible();
  await expect(resumo.getByText("Total Geral", { exact: true })).toBeVisible();
  await expect(resumo.getByText("Serviços", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("columnheader", { name: "Valor Serviço" }),
  ).toHaveCount(0);
  // Frete presente também na Simplificada, iniciando vazio.
  await expect(page.getByLabel("Frete")).toHaveValue("");

  // Finalização: "Forma de pagamento" presente; "Previsão de instalação"
  // fica OCULTA no modelo Simplificada (regra apenas de apresentação).
  await expect(page.getByLabel("Forma de pagamento")).toBeVisible();
  await expect(page.getByLabel("Previsão de instalação")).toHaveCount(0);

  // Cria e abre o workspace definitivo.
  await page.getByRole("button", { name: "Criar Proposta" }).click();
  await expect(page).toHaveURL(/\/propostas\/(?!nova$)[^/]+$/);
  await expect(page.getByRole("heading", { name: "Conteúdo" })).toBeVisible();
});
