import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/infrastructure/database";

import {
  atualizarInstalacao,
  criarInstalacao,
  getInstalacao,
  listInstalacoes,
  type NovaInstalacaoInput,
} from "./instalacao.service";

/**
 * Apelido da Instalação (Sprint 4.3, ADR-0413).
 *
 * Por que INTEGRAÇÃO: o apelido atravessa `toData()`, que é o ponto único de
 * escrita compartilhado por criação e edição. Um campo esquecido ali some em
 * silêncio — o typecheck NÃO pega, porque `parsed.data` chega ao service como
 * objeto não-literal e o excess property checking do TypeScript não se aplica.
 * Só a leitura de volta do banco distingue "gravou" de "descartou".
 *
 * O bloco final é regressão do ADR-0400: o apelido entra pelo formulário, o
 * endereço continua derivado do Cliente PERSISTIDO. Os dois convivem sem que um
 * relaxe a regra do outro.
 *
 * Dados marcados com `E2E ` — o mesmo marcador do `globalTeardown`.
 */

const MARCA = `E2E Apelido ${Date.now()}`;

let clienteId: string;
let clientePjId: string;
const instalacoesCriadas: string[] = [];
/** Clientes criados dentro de um caso, além dos dois do `beforeAll`. */
const clientesExtras: string[] = [];

function input(apelido: string, extra: Partial<NovaInstalacaoInput> = {}): NovaInstalacaoInput {
  return {
    clienteId,
    apelido,
    propostaId: null,
    tecnicoResponsavelId: null,
    status: "A_AGENDAR",
    dataPrevista: null,
    dataAgendada: null,
    periodo: "",
    observacoes: "",
    ...extra,
  };
}

async function novaInstalacao(apelido: string, extra?: Partial<NovaInstalacaoInput>) {
  const criada = await criarInstalacao(input(apelido, extra));
  instalacoesCriadas.push(criada.id);
  return criada;
}

beforeAll(async () => {
  const cliente = await prisma.cliente.create({
    data: {
      nome: `${MARCA} Cliente`,
      tipoPessoa: "PF",
      cep: "09530-320",
      endereco: "Rua Eng. Cajado de Lemos",
      numero: "290",
      bairro: "Cerâmica",
      cidade: "São Caetano do Sul",
      estado: "SP",
    },
    select: { id: true },
  });
  clienteId = cliente.id;

  const pj = await prisma.cliente.create({
    data: {
      nome: null,
      empresa: `${MARCA} Construtora LTDA`,
      tipoPessoa: "PJ",
    },
    select: { id: true },
  });
  clientePjId = pj.id;
});

afterAll(async () => {
  if (instalacoesCriadas.length) {
    await prisma.instalacaoAuditoria.deleteMany({
      where: { instalacaoId: { in: instalacoesCriadas } },
    });
    await prisma.instalacao.deleteMany({
      where: { id: { in: instalacoesCriadas } },
    });
  }
  await prisma.cliente.deleteMany({
    where: { id: { in: [clienteId, clientePjId, ...clientesExtras].filter(Boolean) } },
  });
});

describe("apelido na criação", () => {
  it("persiste o apelido informado", async () => {
    const { id } = await novaInstalacao("Casa Alphaville");

    const gravada = await prisma.instalacao.findUniqueOrThrow({
      where: { id },
      select: { apelido: true },
    });
    expect(gravada.apelido).toBe("Casa Alphaville");
  });

  it("apara espaços antes de gravar", async () => {
    const { id } = await novaInstalacao("  Apartamento Moema  ");

    const gravada = await prisma.instalacao.findUniqueOrThrow({
      where: { id },
      select: { apelido: true },
    });
    expect(gravada.apelido).toBe("Apartamento Moema");
  });

  it("o mesmo cliente aceita várias instalações com apelidos diferentes", async () => {
    const a = await novaInstalacao("Obra Um");
    const b = await novaInstalacao("Obra Dois");

    const linhas = await prisma.instalacao.findMany({
      where: { id: { in: [a.id, b.id] } },
      select: { apelido: true, clienteId: true },
      orderBy: { apelido: "asc" },
    });
    expect(linhas.map((l) => l.apelido)).toEqual(["Obra Dois", "Obra Um"]);
    expect(new Set(linhas.map((l) => l.clienteId)).size).toBe(1);
  });

  it("apelidos iguais em clientes diferentes são permitidos — não há unicidade", async () => {
    const a = await novaInstalacao("Casa");
    const criada = await criarInstalacao(
      input("Casa", { clienteId: clientePjId }),
    );
    instalacoesCriadas.push(criada.id);

    expect(a.id).not.toBe(criada.id);
    const linhas = await prisma.instalacao.findMany({
      where: { id: { in: [a.id, criada.id] } },
      select: { apelido: true },
    });
    expect(linhas.every((l) => l.apelido === "Casa")).toBe(true);
  });
});

describe("apelido na edição", () => {
  it("é editável depois da criação — é rótulo, não snapshot", async () => {
    const { id } = await novaInstalacao("Casa Alphaville");

    await atualizarInstalacao(id, {
      apelido: "Casa Alphaville — Fase 2",
      propostaId: null,
      tecnicoResponsavelId: null,
      status: "AGENDADA",
      dataPrevista: null,
      dataAgendada: null,
      periodo: "",
      observacoes: "",
    });

    const gravada = await prisma.instalacao.findUniqueOrThrow({
      where: { id },
      select: { apelido: true, status: true },
    });
    expect(gravada.apelido).toBe("Casa Alphaville — Fase 2");
    expect(gravada.status).toBe("AGENDADA");
  });
});

describe("apelido nas leituras", () => {
  it("listInstalacoes devolve o apelido", async () => {
    const { id } = await novaInstalacao("Cobertura Itaim");

    const linha = (await listInstalacoes()).find((i) => i.id === id);
    expect(linha?.apelido).toBe("Cobertura Itaim");
  });

  it("getInstalacao devolve o apelido", async () => {
    const { id } = await novaInstalacao("Sítio Ibiúna");

    const detalhe = await getInstalacao(id);
    expect(detalhe?.apelido).toBe("Sítio Ibiúna");
  });
});

/**
 * Fallback de EXIBIÇÃO do apelido (Sprint 4.5, ADR-0417).
 *
 * Por que INTEGRAÇÃO: a coluna `apelido` é nullable no banco e o formulário
 * NUNCA produz nulo — só uma escrita direta chega a esse estado. A regra
 * existe justamente para as linhas que a UI não consegue criar, então é contra
 * o banco que ela precisa ser provada. A semântica pura já está coberta em
 * `features/instalacoes/apelido.test.ts`.
 *
 * O par com `getInstalacao` é o ponto do bloco: as duas leituras divergem DE
 * PROPÓSITO. Listagem preenche a lacuna; detalhe não, porque alimenta o input
 * editável do workspace e o fallback viraria gravação silenciosa no próximo
 * "Salvar".
 */
describe("apelido vazio na listagem cai para o cliente", () => {
  /** Escreve direto no banco: é o único caminho para um apelido vazio. */
  async function comApelidoCru(valor: string | null, clienteDaVez = clienteId) {
    const { id } = await novaInstalacao("Placeholder", {
      clienteId: clienteDaVez,
    });
    await prisma.instalacao.update({
      where: { id },
      data: { apelido: valor },
    });
    return id;
  }

  const linhaDe = async (id: string) =>
    (await listInstalacoes()).find((i) => i.id === id);

  it("apelido nulo → nome do cliente", async () => {
    const id = await comApelidoCru(null);
    expect((await linhaDe(id))?.apelido).toBe(`${MARCA} Cliente`);
  });

  it("apelido vazio → nome do cliente", async () => {
    const id = await comApelidoCru("");
    expect((await linhaDe(id))?.apelido).toBe(`${MARCA} Cliente`);
  });

  it("apelido só com espaços → nome do cliente", async () => {
    const id = await comApelidoCru("   ");
    expect((await linhaDe(id))?.apelido).toBe(`${MARCA} Cliente`);
  });

  /** PJ exibe a razão social — a mesma semântica de `nomeCliente`. */
  it("cliente PJ cai para a razão social", async () => {
    const id = await comApelidoCru(null, clientePjId);
    expect((await linhaDe(id))?.apelido).toBe(`${MARCA} Construtora LTDA`);
  });

  it("cliente sem nome nem empresa → número da instalação", async () => {
    const anonimo = await prisma.cliente.create({
      data: { nome: null, empresa: null, tipoPessoa: "PF" },
      select: { id: true },
    });
    clientesExtras.push(anonimo.id);

    const id = await comApelidoCru(null, anonimo.id);
    const linha = await linhaDe(id);
    expect(linha?.apelido).toBe(String(linha?.numero));
    expect(linha?.apelido).not.toBe("—");
  });

  it("apelido preenchido continua ganhando do cliente", async () => {
    const id = await comApelidoCru("  Casa Alphaville  ");
    expect((await linhaDe(id))?.apelido).toBe("Casa Alphaville");
  });

  /**
   * A divergência deliberada entre as duas leituras. Se alguém "uniformizar"
   * isto no futuro, o apelido do cliente passa a ser gravado sem intenção.
   */
  it("getInstalacao NÃO aplica o fallback ampliado — o input editável fica vazio", async () => {
    const id = await comApelidoCru("   ");
    const detalhe = await getInstalacao(id);

    expect(detalhe?.apelido?.trim()).toBe("");
    expect(detalhe?.clienteNome).toBe(`${MARCA} Cliente`);

    // E o banco continua com o que estava lá: nada foi gravado por ler.
    const gravada = await prisma.instalacao.findUniqueOrThrow({
      where: { id },
      select: { apelido: true },
    });
    expect(gravada.apelido).toBe("   ");
  });

  it("o cliente continua no DTO mesmo sem coluna na tabela", async () => {
    const id = await comApelidoCru(null);
    expect((await linhaDe(id))?.clienteNome).toBe(`${MARCA} Cliente`);
  });
});

/**
 * Regressão do ADR-0400. O apelido chega pelo formulário; o endereço NÃO. Uma
 * Sprint que adiciona campo de entrada é justamente quando a regra do snapshot
 * corre risco de ser afrouxada por descuido.
 */
describe("o apelido não afrouxa a regra do endereço", () => {
  it("endereço continua derivado do Cliente persistido, não do chamador", async () => {
    const { id } = await novaInstalacao("Obra Endereco");

    const gravada = await prisma.instalacao.findUniqueOrThrow({
      where: { id },
      select: {
        apelido: true,
        cep: true,
        enderecoLogradouro: true,
        cidade: true,
        estado: true,
      },
    });
    expect(gravada.apelido).toBe("Obra Endereco");
    expect(gravada.cep).toBe("09530-320");
    expect(gravada.enderecoLogradouro).toBe("Rua Eng. Cajado de Lemos");
    expect(gravada.cidade).toBe("São Caetano do Sul");
    expect(gravada.estado).toBe("SP");
  });

  it("editar o apelido não reescreve o endereço", async () => {
    const { id } = await novaInstalacao("Obra Snapshot");

    await prisma.cliente.update({
      where: { id: clienteId },
      data: { cidade: "Outra Cidade" },
    });
    await atualizarInstalacao(id, {
      apelido: "Obra Snapshot Renomeada",
      propostaId: null,
      tecnicoResponsavelId: null,
      status: "A_AGENDAR",
      dataPrevista: null,
      dataAgendada: null,
      periodo: "",
      observacoes: "",
    });

    const gravada = await prisma.instalacao.findUniqueOrThrow({
      where: { id },
      select: { apelido: true, cidade: true },
    });
    expect(gravada.apelido).toBe("Obra Snapshot Renomeada");
    expect(gravada.cidade).toBe("São Caetano do Sul");

    // Restaura o cliente para não contaminar os outros casos deste arquivo.
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { cidade: "São Caetano do Sul" },
    });
  });
});
