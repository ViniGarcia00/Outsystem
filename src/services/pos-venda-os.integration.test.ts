import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ITEM_SEM_IDENTIFICACAO,
  NENHUM_ITEM_DEVOLVIDO,
  QUANTIDADE_OS_INVALIDA,
} from "@/features/pos-venda/itens";
import { prisma } from "@/infrastructure/database";

import {
  ITEM_NAO_ENCONTRADO,
  OS_NAO_ENCONTRADA,
  OS_SEM_INFORMACAO_TECNICA,
  TROCA_DE_OUTRO_CLIENTE,
  TROCA_JA_TEM_OS,
  TROCA_NAO_ENCONTRADA,
  atualizarOrdemServico,
  cancelarOrdemServico,
  criarOSDaTroca,
  criarOrdemServico,
  filtrarOrdensServico,
  finalizarOrdemServico,
  getOrdemServico,
  listOrdensServico,
  salvarItensOS,
  type NovaOSInput,
} from "./pos-venda-os.service";
import {
  REGISTRO_COM_CUSTOS,
  REGISTRO_OS_NAO_ENCONTRADO,
  atualizarRegistroOS,
  criarRegistroOS,
  excluirRegistroOS,
  listarRegistrosOS,
} from "./pos-venda-os-registro.service";
import {
  criarTroca,
  getTroca,
  salvarItensTroca,
  type NovaTrocaInput,
} from "./pos-venda-troca.service";

/**
 * Ordem de Serviço de pós-venda contra o PostgreSQL REAL (Sprint 4.6).
 *
 * O teste que dá nome ao arquivo é o do **snapshot** (ADR-0419): a Troca 7/7/5
 * gera uma OS de 5, e quando a Troca vira 7/7/7 a OS continua 5. É a garantia
 * mais fácil de perder numa refatoração futura — "sincronizar" parece uma
 * melhoria até alguém perceber que a OS passou a mentir sobre o que analisou.
 *
 * Também aqui: a OS funciona SEM Troca (o fluxo obrigatório), a cardinalidade
 * zero-ou-uma, e a guarda de informação técnica na finalização (ADR-0420).
 */

const MARCA = `E2E PosVenda OS ${Date.now()}`;

let clienteId: string;
let outroClienteId: string;
let tecnicoId: string;
let semPapelId: string;
let produtoId: string;

const itemBase = {
  produtoId: null as string | null,
  descricaoManual: "Fechadura devolvida",
  quantidade: 1,
  diagnosticoItem: "",
  solucaoItem: "",
};

const baseOS = (overrides: Partial<NovaOSInput> = {}): NovaOSInput => ({
  clienteId,
  trocaAntecipadaId: null,
  referencia: "Fechadura entrada social",
  responsavelId: null,
  relatoInicial: "Produto devolvido para análise.",
  status: "ABERTA",
  itens: [{ ...itemBase }],
  ...overrides,
});

const baseTroca = (
  overrides: Partial<NovaTrocaInput> = {},
): NovaTrocaInput => ({
  clienteId,
  referencia: "Fechadura entrada social",
  responsavelId: null,
  relatoInicial: "",
  status: "DEVOLUCAO_PENDENTE",
  destinatarioTipo: "CLIENTE",
  destinatarioNome: "",
  ...overrides,
});

async function novaOS(overrides: Partial<NovaOSInput> = {}): Promise<string> {
  return (await criarOrdemServico(baseOS(overrides))).id;
}

beforeAll(async () => {
  const [cliente, outroCliente, tecnico, semPapel, produto] = await Promise.all([
    prisma.cliente.create({
      data: { nome: `${MARCA} Cliente`, tipoPessoa: "PF" },
      select: { id: true },
    }),
    prisma.cliente.create({
      data: { nome: `${MARCA} Outro Cliente`, tipoPessoa: "PF" },
      select: { id: true },
    }),
    prisma.usuario.create({
      data: { nome: `${MARCA} Tecnico`, ehTecnico: true },
      select: { id: true },
    }),
    prisma.usuario.create({
      data: { nome: `${MARCA} Sem Papel`, ehVendedor: true },
      select: { id: true },
    }),
    prisma.produto.create({
      data: {
        codigo: `E2E-OS-${Date.now()}`,
        descricao: "Interruptor de teste",
        valorProduto: 50,
        valorServico: 0,
      },
      select: { id: true },
    }),
  ]);
  clienteId = cliente.id;
  outroClienteId = outroCliente.id;
  tecnicoId = tecnico.id;
  semPapelId = semPapel.id;
  produtoId = produto.id;
});

afterAll(async () => {
  const clientes = [clienteId, outroClienteId].filter(Boolean);

  const oss = await prisma.ordemServicoPosVenda.findMany({
    where: { clienteId: { in: clientes } },
    select: { id: true },
  });
  const osIds = oss.map((o) => o.id);
  const osRegistros = await prisma.ordemServicoPosVendaRegistro.findMany({
    where: { ordemServicoId: { in: osIds } },
    select: { id: true },
  });
  await prisma.ordemServicoPosVendaRegistroAnexo.deleteMany({
    where: { registroId: { in: osRegistros.map((r) => r.id) } },
  });
  await prisma.ordemServicoPosVendaRegistroCusto.deleteMany({
    where: { registroId: { in: osRegistros.map((r) => r.id) } },
  });
  await prisma.ordemServicoPosVendaRegistro.deleteMany({
    where: { ordemServicoId: { in: osIds } },
  });
  await prisma.ordemServicoPosVendaItem.deleteMany({
    where: { ordemServicoId: { in: osIds } },
  });
  await prisma.ordemServicoPosVendaAuditoria.deleteMany({
    where: { ordemServicoId: { in: osIds } },
  });
  // A OS sai ANTES da Troca: a FK `trocaAntecipadaId` é RESTRICT.
  await prisma.ordemServicoPosVenda.deleteMany({ where: { id: { in: osIds } } });

  const trocas = await prisma.trocaAntecipada.findMany({
    where: { clienteId: { in: clientes } },
    select: { id: true },
  });
  const trocaIds = trocas.map((t) => t.id);
  const trocaRegistros = await prisma.trocaAntecipadaRegistro.findMany({
    where: { trocaAntecipadaId: { in: trocaIds } },
    select: { id: true },
  });
  await prisma.trocaAntecipadaRegistroAnexo.deleteMany({
    where: { registroId: { in: trocaRegistros.map((r) => r.id) } },
  });
  await prisma.trocaAntecipadaRegistroCusto.deleteMany({
    where: { registroId: { in: trocaRegistros.map((r) => r.id) } },
  });
  await prisma.trocaAntecipadaRegistro.deleteMany({
    where: { trocaAntecipadaId: { in: trocaIds } },
  });
  await prisma.trocaAntecipadaItem.deleteMany({
    where: { trocaAntecipadaId: { in: trocaIds } },
  });
  await prisma.trocaAntecipadaAuditoria.deleteMany({
    where: { trocaAntecipadaId: { in: trocaIds } },
  });
  await prisma.trocaAntecipada.deleteMany({ where: { id: { in: trocaIds } } });

  if (produtoId) await prisma.produto.deleteMany({ where: { id: produtoId } });
  await prisma.usuario.deleteMany({
    where: { id: { in: [tecnicoId, semPapelId].filter(Boolean) } },
  });
  await prisma.cliente.deleteMany({ where: { id: { in: clientes } } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------

describe("criação manual — o fluxo obrigatório (spec §24)", () => {
  it("cria OS DIRETA, sem nenhuma troca envolvida", async () => {
    const id = await novaOS();
    const os = await getOrdemServico(id);

    expect(os?.trocaAntecipadaId).toBeNull();
    // Origem DERIVADA, nunca lida de coluna (ADR-0419).
    expect(os?.origem).toBe("DIRETA");
    expect(os?.trocaNumero).toBeNull();
    expect(os?.itens).toHaveLength(1);
  });

  it("numera com sequência própria, independente da Troca", async () => {
    const a = await criarOrdemServico(baseOS());
    const b = await criarOrdemServico(baseOS());
    expect(a.numero).toBeGreaterThanOrEqual(1001);
    expect(b.numero).toBe(a.numero + 1);
  });

  it("aceita produto do cadastro e produto manual na mesma OS", async () => {
    const id = await novaOS({
      itens: [
        {
          produtoId,
          descricaoManual: "",
          quantidade: 7,
          diagnosticoItem: "",
          solucaoItem: "",
        },
        { ...itemBase, descricaoManual: "Fechadura antiga do hall" },
      ],
    });
    const os = await getOrdemServico(id);
    expect(os?.itens).toHaveLength(2);
    expect(os?.itens[0].produtoId).toBe(produtoId);
    expect(os?.itens[0].produtoCodigo).toMatch(/^E2E-OS-/);
    expect(os?.itens[1].produtoId).toBeNull();
    expect(os?.itens[1].descricaoManual).toBe("Fechadura antiga do hall");
  });

  it("recusa item sem produto e sem descrição", async () => {
    await expect(
      criarOrdemServico(
        baseOS({ itens: [{ ...itemBase, descricaoManual: "   " }] }),
      ),
    ).rejects.toThrow(ITEM_SEM_IDENTIFICACAO);
  });

  it("recusa quantidade zero — item de OS com zero não é item", async () => {
    await expect(
      criarOrdemServico(baseOS({ itens: [{ ...itemBase, quantidade: 0 }] })),
    ).rejects.toThrow(QUANTIDADE_OS_INVALIDA);
  });

  it("recusa cliente inexistente", async () => {
    await expect(
      criarOrdemServico(baseOS({ clienteId: "nao_existe" })),
    ).rejects.toThrow();
  });

  it("recusa responsável sem papel de técnico", async () => {
    await expect(
      criarOrdemServico(baseOS({ responsavelId: semPapelId })),
    ).rejects.toThrow(/papel/i);
  });

  it("grava auditoria de CRIACAO", async () => {
    const id = await novaOS();
    const auditorias = await prisma.ordemServicoPosVendaAuditoria.findMany({
      where: { ordemServicoId: id },
    });
    expect(auditorias.map((a) => a.evento)).toEqual(["CRIACAO"]);
  });
});

describe("vínculo opcional com a Troca (spec §25, §26)", () => {
  it("persiste o vínculo e deriva a origem", async () => {
    const troca = await criarTroca(baseTroca());
    const id = await novaOS({ trocaAntecipadaId: troca.id });

    const os = await getOrdemServico(id);
    expect(os?.trocaAntecipadaId).toBe(troca.id);
    expect(os?.origem).toBe("TROCA_ANTECIPADA");
    expect(os?.trocaNumero).toBe(troca.numero);

    // O vínculo é registrado nos DOIS lados.
    const naOS = await prisma.ordemServicoPosVendaAuditoria.findFirst({
      where: { ordemServicoId: id, evento: "VINCULO" },
    });
    const naTroca = await prisma.trocaAntecipadaAuditoria.findFirst({
      where: { trocaAntecipadaId: troca.id, evento: "VINCULO" },
    });
    expect(naOS).not.toBeNull();
    expect(naTroca).not.toBeNull();
  });

  it("recusa vínculo com troca inexistente", async () => {
    await expect(
      criarOrdemServico(baseOS({ trocaAntecipadaId: "troca_que_nao_existe" })),
    ).rejects.toThrow(TROCA_NAO_ENCONTRADA);
  });

  it("recusa troca de OUTRO cliente", async () => {
    const daOutra = await criarTroca(baseTroca({ clienteId: outroClienteId }));
    await expect(
      criarOrdemServico(baseOS({ trocaAntecipadaId: daOutra.id })),
    ).rejects.toThrow(TROCA_DE_OUTRO_CLIENTE);
  });

  /**
   * CARDINALIDADE zero-ou-uma (ADR-0419). A garantia final é o `@unique` do
   * banco; a checagem no service existe para produzir uma mensagem legível.
   */
  it("recusa uma SEGUNDA OS para a mesma troca", async () => {
    const troca = await criarTroca(baseTroca());
    await novaOS({ trocaAntecipadaId: troca.id });

    await expect(
      criarOrdemServico(baseOS({ trocaAntecipadaId: troca.id })),
    ).rejects.toThrow(TROCA_JA_TEM_OS);
  });

  /** A Troca enxerga a OS de volta — o link é bidirecional. */
  it("a troca passa a mostrar a OS vinculada", async () => {
    const troca = await criarTroca(baseTroca());
    const osId = await novaOS({ trocaAntecipadaId: troca.id });
    const os = await getOrdemServico(osId);

    const t = await getTroca(troca.id);
    expect(t?.ordemServico).toEqual({ id: osId, numero: os!.numero });
  });
});

describe("criação a partir da Troca (spec §27)", () => {
  it("copia cliente, vínculo, produtoId real e a quantidade DEVOLVIDA", async () => {
    const troca = await criarTroca(baseTroca({ responsavelId: tecnicoId }));
    await salvarItensTroca(troca.id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
      {
        produtoId: null,
        descricaoManual: "Fechadura antiga do hall",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 1,
      },
      {
        produtoId: null,
        descricaoManual: "Peça que ainda não voltou",
        quantidadeEnviada: 3,
        quantidadeEsperadaRetorno: 3,
        quantidadeDevolvida: 0,
      },
    ]);

    const criada = await criarOSDaTroca(troca.id);
    const os = await getOrdemServico(criada.id);

    expect(os?.clienteId).toBe(clienteId);
    expect(os?.trocaAntecipadaId).toBe(troca.id);
    expect(os?.origem).toBe("TROCA_ANTECIPADA");
    // A referência carrega o contexto de origem.
    expect(os?.referencia).toContain(`Troca ${troca.numero}`);
    // O responsável disponível é herdado.
    expect(os?.responsavelId).toBe(tecnicoId);

    // Só os DEVOLVIDOS entram — o item com devolvida 0 fica de fora.
    expect(os?.itens).toHaveLength(2);
    expect(os?.itens[0].produtoId).toBe(produtoId);
    expect(os?.itens[0].quantidade).toBe(5);
    expect(os?.itens[1].produtoId).toBeNull();
    expect(os?.itens[1].descricaoManual).toBe("Fechadura antiga do hall");
    expect(os?.itens[1].quantidade).toBe(1);
    expect(
      os?.itens.map((i) => i.descricaoManual),
    ).not.toContain("Peça que ainda não voltou");
  });

  it("recusa quando NENHUM produto foi devolvido, com mensagem clara", async () => {
    const troca = await criarTroca(baseTroca());
    await salvarItensTroca(troca.id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 0,
      },
    ]);

    await expect(criarOSDaTroca(troca.id)).rejects.toThrow(
      NENHUM_ITEM_DEVOLVIDO,
    );
    // E não criou OS nenhuma.
    expect((await getTroca(troca.id))?.ordemServico).toBeNull();
  });

  it("recusa troca sem itens", async () => {
    const troca = await criarTroca(baseTroca());
    await expect(criarOSDaTroca(troca.id)).rejects.toThrow(
      NENHUM_ITEM_DEVOLVIDO,
    );
  });

  it("recusa troca que já tem OS", async () => {
    const troca = await criarTroca(baseTroca());
    await salvarItensTroca(troca.id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 1,
      },
    ]);
    await criarOSDaTroca(troca.id);
    await expect(criarOSDaTroca(troca.id)).rejects.toThrow(TROCA_JA_TEM_OS);
  });

  /**
   * O responsável da Troca só é herdado se AINDA estiver disponível. Um vínculo
   * novo exige o papel (ADR-0410), e herdar em silêncio um responsável
   * inativado criaria justamente o vínculo que a regra proíbe.
   */
  it("não herda responsável indisponível — a OS nasce sem ele", async () => {
    const troca = await criarTroca(baseTroca({ responsavelId: tecnicoId }));
    await salvarItensTroca(troca.id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 1,
      },
    ]);

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { ativo: false },
    });
    try {
      const criada = await criarOSDaTroca(troca.id);
      expect((await getOrdemServico(criada.id))?.responsavelId).toBeNull();
    } finally {
      await prisma.usuario.update({
        where: { id: tecnicoId },
        data: { ativo: true },
      });
    }
  });

  /** Custos NUNCA são copiados nem somados (spec §36). */
  it("não copia custos da troca", async () => {
    const troca = await criarTroca(baseTroca());
    await salvarItensTroca(troca.id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 1,
      },
    ]);
    // Custo lançado NA TROCA.
    const { criarRegistroTroca } = await import(
      "./pos-venda-troca-registro.service"
    );
    await criarRegistroTroca(troca.id, {
      dataHora: new Date("2026-08-18T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Envio via motoboy.",
      custos: [{ categoria: "MOTOBOY", descricao: "", valor: 85 }],
    });

    const criada = await criarOSDaTroca(troca.id);
    const os = await getOrdemServico(criada.id);

    // A OS nasce SEM timeline e SEM custo. O histórico da troca fica na troca.
    expect(os?.registros).toHaveLength(0);
    const linha = (await listOrdensServico()).find((o) => o.id === criada.id)!;
    expect(linha.custoTotal).toBe(0);
  });
});

/**
 * ── O TESTE CRÍTICO DO SNAPSHOT (spec §56, ADR-0419) ────────────────────────
 *
 * Troca 7 / 7 / 5 → OS recebe 5. Depois a Troca vira 7 / 7 / 7. A OS continua
 * 5.
 *
 * Não existe código de sincronização — nem desligado, nem atrás de flag. É isso
 * que torna a garantia real: não há o que alguém possa religar por engano.
 */
describe("snapshot Troca → OS NÃO sincroniza", () => {
  it("a OS mantém a quantidade do momento da criação", async () => {
    const troca = await criarTroca(baseTroca());
    await salvarItensTroca(troca.id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
    ]);

    const criada = await criarOSDaTroca(troca.id);
    expect((await getOrdemServico(criada.id))?.itens[0].quantidade).toBe(5);

    // A troca EVOLUI: os 2 restantes voltaram.
    const itemDaTroca = (await getTroca(troca.id))!.itens[0];
    await salvarItensTroca(troca.id, [
      {
        id: itemDaTroca.id,
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 7,
      },
    ]);
    expect((await getTroca(troca.id))!.itens[0].quantidadeDevolvida).toBe(7);

    // A OS continua 5. Este é o ponto inteiro do teste.
    expect((await getOrdemServico(criada.id))?.itens[0].quantidade).toBe(5);
  });

  it("editar a OS não altera a troca de origem", async () => {
    const troca = await criarTroca(baseTroca());
    await salvarItensTroca(troca.id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
    ]);
    const criada = await criarOSDaTroca(troca.id);

    const itemDaOS = (await getOrdemServico(criada.id))!.itens[0];
    await salvarItensOS(criada.id, [
      {
        id: itemDaOS.id,
        produtoId,
        descricaoManual: "",
        quantidade: 2,
        diagnosticoItem: "Só 2 tinham defeito real.",
        solucaoItem: "",
      },
    ]);

    // A troca não se mexeu.
    const t = await getTroca(troca.id);
    expect(t!.itens[0].quantidadeDevolvida).toBe(5);
  });
});

describe("produtos da OS", () => {
  it("reconcilia por id, preservando o item existente", async () => {
    const id = await novaOS();
    const antes = (await getOrdemServico(id))!.itens[0];

    await salvarItensOS(id, [
      {
        id: antes.id,
        produtoId: null,
        descricaoManual: "Fechadura devolvida",
        quantidade: 1,
        diagnosticoItem: "Falha mecânica do mecanismo interno.",
        solucaoItem: "Substituição do conjunto e testes.",
      },
      {
        produtoId,
        descricaoManual: "",
        quantidade: 3,
        diagnosticoItem: "",
        solucaoItem: "",
      },
    ]);

    const depois = (await getOrdemServico(id))!.itens;
    expect(depois).toHaveLength(2);
    expect(depois[0].id).toBe(antes.id);
    expect(depois[0].diagnosticoItem).toBe(
      "Falha mecânica do mecanismo interno.",
    );
    expect(depois[0].solucaoItem).toBe("Substituição do conjunto e testes.");
  });

  it("remove item ausente da grade", async () => {
    const id = await novaOS();
    await salvarItensOS(id, []);
    expect((await getOrdemServico(id))!.itens).toHaveLength(0);
  });

  /** Invariante do agregado (ADR-0409), do mesmo jeito da Troca. */
  it("recusa item de OUTRA OS, com a mesma mensagem de inexistente", async () => {
    const osA = await novaOS();
    const osB = await novaOS();
    const itemDeB = (await getOrdemServico(osB))!.itens[0].id;

    await expect(
      salvarItensOS(osA, [
        {
          id: itemDeB,
          produtoId: null,
          descricaoManual: "INVASÃO",
          quantidade: 99,
          diagnosticoItem: "",
          solucaoItem: "",
        },
      ]),
    ).rejects.toThrow(ITEM_NAO_ENCONTRADO);

    // O item de B ficou intacto.
    const b = await getOrdemServico(osB);
    expect(b!.itens).toHaveLength(1);
    expect(b!.itens[0].quantidade).toBe(1);
  });

  it("recusa salvar itens de OS inexistente", async () => {
    await expect(salvarItensOS("nao_existe", [])).rejects.toThrow(
      OS_NAO_ENCONTRADA,
    );
  });
});

describe("finalização com guarda técnica (ADR-0420)", () => {
  /**
   * A regra que a spec §33 deixou em aberto e esta Sprint resolveu: finalizar
   * sem nada registrado deixaria exatamente o buraco que o módulo veio fechar.
   */
  it("recusa finalizar sem NENHUMA informação técnica", async () => {
    const id = await novaOS();
    await expect(finalizarOrdemServico(id)).rejects.toThrow(
      OS_SEM_INFORMACAO_TECNICA,
    );
    expect((await getOrdemServico(id))?.status).toBe("ABERTA");
  });

  it("aceita com a conclusão GERAL preenchida", async () => {
    const id = await novaOS();
    await atualizarOrdemServico(id, {
      referencia: "Fechadura entrada social",
      responsavelId: null,
      relatoInicial: "",
      status: "EM_ANALISE",
      diagnosticoConclusao: "Falha mecânica do mecanismo interno.",
    });
    await expect(finalizarOrdemServico(id)).resolves.toBeUndefined();

    const os = await getOrdemServico(id);
    expect(os?.status).toBe("FINALIZADA");
    expect(os?.finalizadaEm).toBeInstanceOf(Date);
  });

  it("aceita com o DIAGNÓSTICO de um item, mesmo sem conclusão geral", async () => {
    const id = await novaOS();
    const item = (await getOrdemServico(id))!.itens[0];
    await salvarItensOS(id, [
      {
        id: item.id,
        produtoId: null,
        descricaoManual: "Fechadura devolvida",
        quantidade: 1,
        diagnosticoItem: "Falha mecânica do mecanismo interno.",
        solucaoItem: "",
      },
    ]);
    await expect(finalizarOrdemServico(id)).resolves.toBeUndefined();
  });

  it("aceita com a SOLUÇÃO de um item, mesmo sem diagnóstico", async () => {
    const id = await novaOS();
    const item = (await getOrdemServico(id))!.itens[0];
    await salvarItensOS(id, [
      {
        id: item.id,
        produtoId: null,
        descricaoManual: "Fechadura devolvida",
        quantidade: 1,
        diagnosticoItem: "",
        solucaoItem: "Substituição do conjunto e testes.",
      },
    ]);
    await expect(finalizarOrdemServico(id)).resolves.toBeUndefined();
  });

  it("texto só com espaços NÃO conta como informação técnica", async () => {
    const id = await novaOS();
    await atualizarOrdemServico(id, {
      referencia: "Fechadura entrada social",
      responsavelId: null,
      relatoInicial: "",
      status: "EM_ANALISE",
      diagnosticoConclusao: "   ",
    });
    await expect(finalizarOrdemServico(id)).rejects.toThrow(
      OS_SEM_INFORMACAO_TECNICA,
    );
  });

  it("refinalizar não reescreve finalizadaEm", async () => {
    const id = await novaOS();
    await atualizarOrdemServico(id, {
      referencia: "x",
      responsavelId: null,
      relatoInicial: "",
      status: "EM_ANALISE",
      diagnosticoConclusao: "Conclusão.",
    });
    await finalizarOrdemServico(id);
    const primeira = (await getOrdemServico(id))!.finalizadaEm!;
    await finalizarOrdemServico(id);
    expect((await getOrdemServico(id))!.finalizadaEm!.getTime()).toBe(
      primeira.getTime(),
    );
  });

  it("recusa finalizar OS cancelada", async () => {
    const id = await novaOS();
    await cancelarOrdemServico(id, "");
    await expect(finalizarOrdemServico(id)).rejects.toThrow(/cancelada/i);
  });
});

describe("cancelamento", () => {
  it("cancela preservando itens, timeline e custos", async () => {
    const id = await novaOS();
    await criarRegistroOS(id, {
      dataHora: new Date("2026-08-22T10:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Peça recebida para análise.",
      custos: [{ categoria: "PECA", descricao: "Conjunto novo", valor: 320 }],
    });

    await cancelarOrdemServico(id, "Cliente optou por descartar.");

    const os = await getOrdemServico(id);
    expect(os?.status).toBe("CANCELADA");
    expect(os?.canceladaEm).toBeInstanceOf(Date);
    expect(os?.itens).toHaveLength(1);
    expect(os?.registros).toHaveLength(1);
    expect(os?.registros[0].custos).toHaveLength(1);
  });
});

describe("timeline e custos da OS", () => {
  it("grava registro com custos e ordena por dataHora desc", async () => {
    const id = await novaOS();
    await criarRegistroOS(id, {
      dataHora: new Date("2026-08-22T10:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Produto recebido.",
      custos: [],
    });
    await criarRegistroOS(id, {
      dataHora: new Date("2026-08-24T15:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Peça substituída.",
      custos: [
        { categoria: "PECA", descricao: "Conjunto", valor: 320 },
        { categoria: "TERCEIRIZACAO", descricao: "", valor: 80 },
      ],
    });

    const registros = await listarRegistrosOS(id);
    expect(registros).toHaveLength(2);
    expect(registros[0].relato).toBe("Peça substituída.");
    expect(registros[0].custos.reduce((s, c) => s + c.valor, 0)).toBe(400);

    const linha = (await listOrdensServico()).find((o) => o.id === id)!;
    expect(linha.custoTotal).toBe(400);
  });

  it("edição substitui os custos, não duplica", async () => {
    const id = await novaOS();
    const { id: registroId } = await criarRegistroOS(id, {
      dataHora: new Date("2026-08-24T15:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Reparo.",
      custos: [
        { categoria: "PECA", descricao: "", valor: 320 },
        { categoria: "FRETE", descricao: "", valor: 40 },
      ],
    });
    await atualizarRegistroOS(id, registroId, {
      dataHora: new Date("2026-08-24T15:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Reparo corrigido.",
      custos: [{ categoria: "PECA", descricao: "", valor: 300 }],
    });

    const registros = await listarRegistrosOS(id);
    expect(registros[0].custos).toHaveLength(1);
    expect(registros[0].custos[0].valor).toBe(300);
  });

  it("bloqueia exclusão de registro COM custo", async () => {
    const id = await novaOS();
    const { id: registroId } = await criarRegistroOS(id, {
      dataHora: new Date("2026-08-24T15:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Com custo.",
      custos: [{ categoria: "PECA", descricao: "", valor: 320 }],
    });
    await expect(excluirRegistroOS(id, registroId)).rejects.toThrow(
      REGISTRO_COM_CUSTOS,
    );
  });

  it("recusa registro de OUTRA OS, com a mesma mensagem de inexistente", async () => {
    const osA = await novaOS();
    const osB = await novaOS();
    const registroB = await criarRegistroOS(osB, {
      dataHora: new Date("2026-08-24T15:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Histórico da OS B.",
      custos: [],
    });

    await expect(
      atualizarRegistroOS(osA, registroB.id, {
        dataHora: new Date("2026-08-24T15:00:00.000Z"),
        responsavelId: tecnicoId,
        relato: "INVASÃO",
        custos: [],
      }),
    ).rejects.toThrow(REGISTRO_OS_NAO_ENCONTRADO);
    await expect(excluirRegistroOS(osA, registroB.id)).rejects.toThrow(
      REGISTRO_OS_NAO_ENCONTRADO,
    );

    const b = await listarRegistrosOS(osB);
    expect(b[0].relato).toBe("Histórico da OS B.");
  });
});

describe("listagem e busca da OS (spec §38, §39)", () => {
  it("expõe origem, contagem de produtos e custo da PRÓPRIA OS", async () => {
    const troca = await criarTroca(baseTroca());
    const id = await novaOS({
      trocaAntecipadaId: troca.id,
      referencia: `${MARCA} Listagem`,
      itens: [
        { ...itemBase },
        { ...itemBase, descricaoManual: "Segundo produto" },
      ],
    });

    const linha = (await listOrdensServico()).find((o) => o.id === id)!;
    expect(linha.trocaNumero).toBe(troca.numero);
    expect(linha.trocaId).toBe(troca.id);
    expect(linha.produtos).toBe(2);
    expect(linha.custoTotal).toBe(0);
  });

  it("busca por número, referência, produto, diagnóstico e número da troca", async () => {
    const troca = await criarTroca(baseTroca());
    const id = await novaOS({
      trocaAntecipadaId: troca.id,
      referencia: `${MARCA} Manutenção Fechadura`,
      relatoInicial: "Peça chegou com carcaça trincada.",
      itens: [
        {
          produtoId,
          descricaoManual: "",
          quantidade: 1,
          diagnosticoItem: "Bobina queimada por surto.",
          solucaoItem: "",
        },
      ],
    });

    const rows = await listOrdensServico();
    const alvo = rows.find((o) => o.id === id)!;
    const encontra = (q: string) =>
      filtrarOrdensServico(rows, q).some((o) => o.id === id);

    expect(encontra(String(alvo.numero))).toBe(true);
    expect(encontra("Fechadura")).toBe(true);
    expect(encontra("trincada")).toBe(true);
    expect(encontra("Bobina")).toBe(true);
    expect(encontra("E2E-OS-")).toBe(true);
    expect(encontra(`${MARCA} Cliente`)).toBe(true);
    // O NÚMERO da troca relacionada também encontra (spec §39).
    expect(encontra(`Troca ${troca.numero}`)).toBe(true);

    // Sem acento e em caixa alta.
    expect(encontra("manutencao")).toBe(true);
    expect(encontra("MANUTENÇÃO")).toBe(true);
  });
});
