import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  DEVOLVIDA_MAIOR_QUE_ESPERADA,
  ITEM_SEM_IDENTIFICACAO,
  QUANTIDADE_INVALIDA,
} from "@/features/pos-venda/itens";
import { prisma } from "@/infrastructure/database";

import {
  DESTINATARIO_NOME_OBRIGATORIO,
  ITEM_NAO_ENCONTRADO,
  TROCA_COM_PENDENCIA,
  TROCA_NAO_ENCONTRADA,
  atualizarTroca,
  cancelarTroca,
  criarTroca,
  filtrarTrocas,
  finalizarTroca,
  getTroca,
  listTrocas,
  listTrocasVinculaveis,
  pendenciasDaTroca,
  salvarItensTroca,
  type NovaTrocaInput,
} from "./pos-venda-troca.service";
import {
  REGISTRO_COM_CUSTOS,
  REGISTRO_TROCA_NAO_ENCONTRADO,
  USUARIO_INATIVO,
  atualizarRegistroTroca,
  criarRegistroTroca,
  excluirRegistroTroca,
  listarRegistrosTroca,
} from "./pos-venda-troca-registro.service";

/**
 * Troca Antecipada contra o PostgreSQL REAL (Sprint 4.6).
 *
 * Por que INTEGRAÇÃO e não unidade: quase tudo aqui é uma **condição de
 * consulta** — o pertencimento do item e do registro ao agregado, a
 * reconciliação por id, a sequência de numeração. Com um Prisma mockado o teste
 * provaria apenas que o mock foi chamado com certos argumentos, o que já seria
 * verdade numa versão vulnerável. Só o banco real distingue as implementações.
 *
 * Por que não E2E: a interface nunca produz o par cruzado (item da troca A com
 * o id da troca B). O defeito só é alcançável chamando o service, e é no
 * service que a garantia precisa morar (ADR-0409).
 *
 * Os dados nascem marcados com `E2E ` — o mesmo marcador que o `globalTeardown`
 * do Playwright varre —, então um teste interrompido no meio não deixa rastro
 * permanente mesmo que o `afterAll` não rode.
 */

const MARCA = `E2E PosVenda Troca ${Date.now()}`;

let clienteId: string;
let outroClienteId: string;
let tecnicoId: string;
/**
 * Usuário ATIVO e **sem papel de técnico** — o perfil administrativo que a
 * Troca precisa aceitar (ADR-0422): quem cuida de envio, frete e cobrança.
 */
let administrativoId: string;
/** Usuário INATIVO — a única recusa que a Troca ainda faz. */
let inativoId: string;
let produtoId: string;

const base = (overrides: Partial<NovaTrocaInput> = {}): NovaTrocaInput => ({
  clienteId,
  referencia: "Fechadura entrada social",
  responsavelId: null,
  relatoInicial: "Cliente relatou trava intermitente.",
  status: "ABERTA",
  destinatarioTipo: "CLIENTE",
  destinatarioNome: "",
  ...overrides,
});

/** Ids criados no arquivo, para o `afterAll` varrer sem depender de marcador. */
const trocasCriadas: string[] = [];

async function novaTroca(
  overrides: Partial<NovaTrocaInput> = {},
): Promise<string> {
  const { id } = await criarTroca(base(overrides));
  trocasCriadas.push(id);
  return id;
}

beforeAll(async () => {
  const [cliente, outroCliente, tecnico, administrativo, inativo, produto] =
    await Promise.all([
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
      data: {
        nome: `${MARCA} Administrativo`,
        ehVendedor: true,
        ehTecnico: false,
      },
      select: { id: true },
    }),
    prisma.usuario.create({
      data: { nome: `${MARCA} Inativo`, ativo: false, ehTecnico: true },
      select: { id: true },
    }),
    prisma.produto.create({
      data: {
        codigo: `E2E-PV-${Date.now()}`,
        descricao: "Fechadura eletrônica de teste",
        valorProduto: 100,
        valorServico: 0,
      },
      select: { id: true },
    }),
  ]);
  clienteId = cliente.id;
  outroClienteId = outroCliente.id;
  tecnicoId = tecnico.id;
  administrativoId = administrativo.id;
  inativoId = inativo.id;
  produtoId = produto.id;
});

afterAll(async () => {
  const trocas = await prisma.trocaAntecipada.findMany({
    where: { clienteId: { in: [clienteId, outroClienteId].filter(Boolean) } },
    select: { id: true },
  });
  const ids = trocas.map((t) => t.id);
  const registros = await prisma.trocaAntecipadaRegistro.findMany({
    where: { trocaAntecipadaId: { in: ids } },
    select: { id: true },
  });
  const registroIds = registros.map((r) => r.id);

  await prisma.trocaAntecipadaRegistroAnexo.deleteMany({
    where: { registroId: { in: registroIds } },
  });
  await prisma.trocaAntecipadaRegistroCusto.deleteMany({
    where: { registroId: { in: registroIds } },
  });
  await prisma.trocaAntecipadaRegistro.deleteMany({
    where: { trocaAntecipadaId: { in: ids } },
  });
  await prisma.trocaAntecipadaItem.deleteMany({
    where: { trocaAntecipadaId: { in: ids } },
  });
  await prisma.trocaAntecipadaAuditoria.deleteMany({
    where: { trocaAntecipadaId: { in: ids } },
  });
  await prisma.trocaAntecipada.deleteMany({ where: { id: { in: ids } } });

  if (produtoId) await prisma.produto.deleteMany({ where: { id: produtoId } });
  await prisma.usuario.deleteMany({
    where: {
      id: { in: [tecnicoId, administrativoId, inativoId].filter(Boolean) },
    },
  });
  await prisma.cliente.deleteMany({
    where: { id: { in: [clienteId, outroClienteId].filter(Boolean) } },
  });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------

describe("criação e numeração", () => {
  it("cria com numeração própria e sequencial, nunca o id", async () => {
    const a = await criarTroca(base());
    const b = await criarTroca(base());
    trocasCriadas.push(a.id, b.id);

    expect(a.numero).toBeGreaterThanOrEqual(1001);
    expect(b.numero).toBe(a.numero + 1);
    // O número NÃO é o id, e o id não aparece nele.
    expect(String(a.numero)).not.toBe(a.id);
  });

  it("recusa cliente inexistente", async () => {
    await expect(
      criarTroca(base({ clienteId: "cliente_que_nao_existe" })),
    ).rejects.toThrow();
  });

  it("grava auditoria de CRIACAO na mesma transação", async () => {
    const id = await novaTroca();
    const auditorias = await prisma.trocaAntecipadaAuditoria.findMany({
      where: { trocaAntecipadaId: id },
    });
    expect(auditorias).toHaveLength(1);
    expect(auditorias[0].evento).toBe("CRIACAO");
  });

  /**
   * A regra do destinatário é validada no Zod E aqui. A do service é a que
   * vale: a action é fronteira pública, e integridade não pode depender de quem
   * chamou.
   */
  it("recusa INSTALADOR sem nome, mesmo chamando o service direto", async () => {
    await expect(
      criarTroca(
        base({ destinatarioTipo: "INSTALADOR", destinatarioNome: "  " }),
      ),
    ).rejects.toThrow(DESTINATARIO_NOME_OBRIGATORIO);
  });

  it("aceita INSTALADOR com nome", async () => {
    const id = await novaTroca({
      destinatarioTipo: "INSTALADOR",
      destinatarioNome: "Instalador Marcos",
    });
    const troca = await getTroca(id);
    expect(troca?.destinatarioTipo).toBe("INSTALADOR");
    expect(troca?.destinatarioNome).toBe("Instalador Marcos");
  });

  /**
   * Trocar de INSTALADOR para CLIENTE LIMPA o nome. Deixá-lo pendurado faria
   * qualquer leitura futura que esquecesse de checar o tipo exibir um nome de
   * instalador numa troca cujo destinatário é o cliente — e alguém sempre
   * esquece.
   */
  it("voltar para CLIENTE limpa o nome do destinatário", async () => {
    const id = await novaTroca({
      destinatarioTipo: "OUTRO",
      destinatarioNome: "Portaria do edifício",
    });
    await atualizarTroca(id, {
      referencia: "Fechadura entrada social",
      responsavelId: null,
      relatoInicial: "",
      status: "ABERTA",
      destinatarioTipo: "CLIENTE",
      destinatarioNome: "Portaria do edifício",
      diagnosticoConclusao: "",
    });
    const troca = await getTroca(id);
    expect(troca?.destinatarioNome).toBeNull();
  });
});

/**
 * Responsável da Troca — **qualquer usuário ATIVO** (ADR-0422).
 *
 * Acompanhar uma troca é trabalho de envio, devolução, frete e cobrança:
 * frequentemente administrativo. Exigir `ehTecnico` aqui limitaria o cadastro
 * sem razão de negócio. A Ordem de Serviço, essa sim, continua exigindo técnico
 * — e o teste disso vive em `pos-venda-os.integration.test.ts`.
 */
describe("responsável da Troca — usuário ativo, sem exigência de papel", () => {
  const cabecalho = (responsavelId: string | null) => ({
    referencia: "Referência editada",
    responsavelId,
    relatoInicial: "",
    status: "DEVOLUCAO_PENDENTE" as const,
    destinatarioTipo: "CLIENTE" as const,
    destinatarioNome: "",
    diagnosticoConclusao: "",
  });

  it("aceita usuário ativo COM papel de técnico", async () => {
    const id = await novaTroca({ responsavelId: tecnicoId });
    expect((await getTroca(id))?.responsavelId).toBe(tecnicoId);
  });

  /** O caso que a Sprint 4.6 abriu: administrativo acompanhando a devolução. */
  it("aceita usuário ativo SEM papel de técnico", async () => {
    const id = await novaTroca({ responsavelId: administrativoId });
    expect((await getTroca(id))?.responsavelId).toBe(administrativoId);
  });

  it("aceita usuário ativo sem papel nenhum na EDIÇÃO", async () => {
    const id = await novaTroca();
    await expect(
      atualizarTroca(id, cabecalho(administrativoId)),
    ).resolves.toBeUndefined();
    expect((await getTroca(id))?.responsavelId).toBe(administrativoId);
  });

  /** A única recusa que sobrou: vínculo NOVO com usuário inativo. */
  it("recusa usuário INATIVO na criação", async () => {
    await expect(criarTroca(base({ responsavelId: inativoId }))).rejects.toThrow(
      USUARIO_INATIVO,
    );
  });

  it("recusa usuário INATIVO na edição", async () => {
    const id = await novaTroca();
    await expect(atualizarTroca(id, cabecalho(inativoId))).rejects.toThrow(
      USUARIO_INATIVO,
    );
  });

  it("recusa usuário inexistente", async () => {
    await expect(
      criarTroca(base({ responsavelId: "usuario_que_nao_existe" })),
    ).rejects.toThrow();
  });

  it("aceita troca sem responsável — o campo é opcional", async () => {
    const id = await novaTroca({ responsavelId: null });
    expect((await getTroca(id))?.responsavelId).toBeNull();
  });

  /**
   * A checagem roda só quando o responsável MUDA. Editar uma troca cujo
   * responsável foi inativado DEPOIS continua funcionando, e o vínculo antigo é
   * preservado em vez de zerado em silêncio — é o que impede uma correção de
   * referência de apagar o histórico.
   */
  it("não recusa quando o responsável NÃO muda, mesmo inativado depois", async () => {
    const id = await novaTroca({ responsavelId: administrativoId });
    await prisma.usuario.update({
      where: { id: administrativoId },
      data: { ativo: false },
    });
    try {
      await expect(
        atualizarTroca(id, cabecalho(administrativoId)),
      ).resolves.toBeUndefined();
      expect((await getTroca(id))?.responsavelId).toBe(administrativoId);
    } finally {
      await prisma.usuario.update({
        where: { id: administrativoId },
        data: { ativo: true },
      });
    }
  });
});

describe("edição e auditoria de status", () => {
  it("registra MUDANCA_STATUS quando o status muda, ALTERACAO quando não", async () => {
    const id = await novaTroca();

    await atualizarTroca(id, {
      referencia: "Fechadura entrada social",
      responsavelId: null,
      relatoInicial: "",
      status: "DEVOLUCAO_PENDENTE",
      destinatarioTipo: "CLIENTE",
      destinatarioNome: "",
      diagnosticoConclusao: "",
    });
    await atualizarTroca(id, {
      referencia: "Fechadura entrada social — revisada",
      responsavelId: null,
      relatoInicial: "",
      status: "DEVOLUCAO_PENDENTE",
      destinatarioTipo: "CLIENTE",
      destinatarioNome: "",
      diagnosticoConclusao: "Peça com trinca na carcaça.",
    });

    const eventos = (
      await prisma.trocaAntecipadaAuditoria.findMany({
        where: { trocaAntecipadaId: id },
        orderBy: { createdAt: "asc" },
      })
    ).map((a) => a.evento);
    expect(eventos).toEqual(["CRIACAO", "MUDANCA_STATUS", "ALTERACAO"]);

    const troca = await getTroca(id);
    expect(troca?.status).toBe("DEVOLUCAO_PENDENTE");
    expect(troca?.diagnosticoConclusao).toBe("Peça com trinca na carcaça.");
  });

  it("recusa edição de troca inexistente", async () => {
    await expect(
      atualizarTroca("nao_existe", {
        referencia: "x",
        responsavelId: null,
        relatoInicial: "",
        status: "ABERTA",
        destinatarioTipo: "CLIENTE",
        destinatarioNome: "",
        diagnosticoConclusao: "",
      }),
    ).rejects.toThrow(TROCA_NAO_ENCONTRADA);
  });
});

describe("produtos da troca", () => {
  it("aceita produto do cadastro, preservando o produtoId REAL", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      },
    ]);

    const troca = await getTroca(id);
    expect(troca?.itens).toHaveLength(1);
    expect(troca?.itens[0].produtoId).toBe(produtoId);
    // O código e a descrição vêm do CADASTRO ATUAL, não de snapshot.
    expect(troca?.itens[0].produtoCodigo).toMatch(/^E2E-PV-/);
  });

  it("aceita produto manual", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId: null,
        descricaoManual: "Fechadura antiga do hall",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      },
    ]);
    const troca = await getTroca(id);
    expect(troca?.itens[0].produtoId).toBeNull();
    expect(troca?.itens[0].descricaoManual).toBe("Fechadura antiga do hall");
  });

  it("aceita múltiplos produtos diferentes", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
      {
        produtoId: null,
        descricaoManual: "Interruptor avulso sem etiqueta",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      },
    ]);
    expect((await getTroca(id))?.itens).toHaveLength(2);
  });

  it("recusa item sem produto e sem descrição", async () => {
    const id = await novaTroca();
    await expect(
      salvarItensTroca(id, [
        {
          produtoId: null,
          descricaoManual: "   ",
          quantidadeEnviada: 1,
          quantidadeEsperadaRetorno: 1,
          quantidadeDevolvida: 0,
        },
      ]),
    ).rejects.toThrow(ITEM_SEM_IDENTIFICACAO);
  });

  it("recusa devolvida MAIOR que a esperada", async () => {
    const id = await novaTroca();
    await expect(
      salvarItensTroca(id, [
        {
          produtoId,
          descricaoManual: "",
          quantidadeEnviada: 7,
          quantidadeEsperadaRetorno: 7,
          quantidadeDevolvida: 8,
        },
      ]),
    ).rejects.toThrow(DEVOLVIDA_MAIOR_QUE_ESPERADA);
  });

  it("recusa quantidade fracionada e negativa", async () => {
    const id = await novaTroca();
    for (const patch of [
      { quantidadeEnviada: 1.5 },
      { quantidadeEsperadaRetorno: -1 },
    ]) {
      await expect(
        salvarItensTroca(id, [
          {
            produtoId,
            descricaoManual: "",
            quantidadeEnviada: 1,
            quantidadeEsperadaRetorno: 1,
            quantidadeDevolvida: 0,
            ...patch,
          },
        ]),
      ).rejects.toThrow(QUANTIDADE_INVALIDA);
    }
  });

  /**
   * A validação roda ANTES de qualquer escrita: uma grade com uma linha
   * inválida não pode gravar as outras e recusar só a última.
   */
  it("linha inválida no fim NÃO grava as anteriores", async () => {
    const id = await novaTroca();
    await expect(
      salvarItensTroca(id, [
        {
          produtoId,
          descricaoManual: "",
          quantidadeEnviada: 1,
          quantidadeEsperadaRetorno: 1,
          quantidadeDevolvida: 0,
        },
        {
          produtoId: null,
          descricaoManual: "",
          quantidadeEnviada: 1,
          quantidadeEsperadaRetorno: 1,
          quantidadeDevolvida: 0,
        },
      ]),
    ).rejects.toThrow(ITEM_SEM_IDENTIFICACAO);

    expect((await getTroca(id))?.itens).toHaveLength(0);
  });

  it("reconcilia por id: atualiza, cria e remove sem recriar tudo", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 0,
      },
      {
        produtoId: null,
        descricaoManual: "Item que será removido",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      },
    ]);

    const antes = (await getTroca(id))!.itens;
    const idPreservado = antes[0].id;

    await salvarItensTroca(id, [
      {
        id: idPreservado,
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
      {
        produtoId: null,
        descricaoManual: "Item novo",
        quantidadeEnviada: 2,
        quantidadeEsperadaRetorno: 2,
        quantidadeDevolvida: 0,
      },
    ]);

    const depois = (await getTroca(id))!.itens;
    expect(depois).toHaveLength(2);
    // O id sobreviveu — não foi delete-and-recreate.
    expect(depois[0].id).toBe(idPreservado);
    expect(depois[0].quantidadeDevolvida).toBe(5);
    expect(depois[1].descricaoManual).toBe("Item novo");
    // E o removido saiu de verdade.
    expect(depois.map((i) => i.descricaoManual)).not.toContain(
      "Item que será removido",
    );
  });

  /**
   * INVARIANTE DO AGREGADO (ADR-0409): um id de item de OUTRA troca não
   * atualiza nem apaga nada — devolve a MESMA mensagem de um id inexistente.
   * Vazar a diferença revelaria a existência de um agregado vizinho.
   */
  it("recusa item de OUTRA troca, com a mesma mensagem de inexistente", async () => {
    const trocaA = await novaTroca();
    const trocaB = await novaTroca();

    await salvarItensTroca(trocaB, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 3,
        quantidadeEsperadaRetorno: 3,
        quantidadeDevolvida: 3,
      },
    ]);
    const itemDeB = (await getTroca(trocaB))!.itens[0].id;

    await expect(
      salvarItensTroca(trocaA, [
        {
          id: itemDeB,
          produtoId,
          descricaoManual: "",
          quantidadeEnviada: 99,
          quantidadeEsperadaRetorno: 99,
          quantidadeDevolvida: 0,
        },
      ]),
    ).rejects.toThrow(ITEM_NAO_ENCONTRADO);

    await expect(
      salvarItensTroca(trocaA, [
        {
          id: "item_inexistente",
          produtoId,
          descricaoManual: "",
          quantidadeEnviada: 1,
          quantidadeEsperadaRetorno: 1,
          quantidadeDevolvida: 0,
        },
      ]),
    ).rejects.toThrow(ITEM_NAO_ENCONTRADO);

    // O item de B ficou INTACTO: a tentativa cruzada não teve efeito colateral.
    const b = await getTroca(trocaB);
    expect(b!.itens).toHaveLength(1);
    expect(b!.itens[0].quantidadeEsperadaRetorno).toBe(3);
    expect(b!.itens[0].quantidadeDevolvida).toBe(3);
  });
});

describe("retorno e finalização", () => {
  it("fechadura: 1/1/0 tem pendência; 1/1/1 não tem", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      },
    ]);
    expect(await pendenciasDaTroca(id)).toHaveLength(1);

    const item = (await getTroca(id))!.itens[0];
    await salvarItensTroca(id, [
      {
        id: item.id,
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 1,
      },
    ]);
    expect(await pendenciasDaTroca(id)).toHaveLength(0);
  });

  it("interruptores: 7/7/5 lista a pendência de 2", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
    ]);
    const pendencias = await pendenciasDaTroca(id);
    expect(pendencias).toHaveLength(1);
    expect(pendencias[0]).toMatchObject({
      esperado: 7,
      devolvido: 5,
      pendente: 2,
    });
  });

  /**
   * A CONFIRMAÇÃO FORTE (spec §12). Sem `confirmarPendencia`, o service recusa
   * — e essa recusa é a regra funcionando, não um bug.
   */
  it("recusa finalizar COM pendência sem confirmação explícita", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
    ]);
    await expect(finalizarTroca(id, false)).rejects.toThrow(TROCA_COM_PENDENCIA);
    expect((await getTroca(id))?.status).toBe("ABERTA");
  });

  /** Mas NUNCA bloqueia de forma absoluta: perda, acordo e cobrança existem. */
  it("finaliza COM pendência quando confirmado", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
    ]);
    await finalizarTroca(id, true);

    const troca = await getTroca(id);
    expect(troca?.status).toBe("FINALIZADA");
    expect(troca?.finalizadaEm).toBeInstanceOf(Date);

    const auditoria = await prisma.trocaAntecipadaAuditoria.findFirst({
      where: { trocaAntecipadaId: id, evento: "FINALIZACAO" },
    });
    expect(auditoria?.observacao).toMatch(/COM pendência/);
  });

  it("finaliza SEM confirmação quando o retorno é completo", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 7,
      },
    ]);
    await expect(finalizarTroca(id, false)).resolves.toBeUndefined();
    expect((await getTroca(id))?.status).toBe("FINALIZADA");
  });

  /** Troca sem itens: nada esperado, logo nada pendente. */
  it("finaliza troca sem itens sem exigir confirmação", async () => {
    const id = await novaTroca();
    await expect(finalizarTroca(id, false)).resolves.toBeUndefined();
  });

  /** `finalizadaEm` é carimbado na PRIMEIRA vez e nunca reescrito. */
  it("refinalizar não reescreve finalizadaEm", async () => {
    const id = await novaTroca();
    await finalizarTroca(id, false);
    const primeira = (await getTroca(id))!.finalizadaEm!;

    await finalizarTroca(id, false);
    expect((await getTroca(id))!.finalizadaEm!.getTime()).toBe(
      primeira.getTime(),
    );
  });
});

describe("cancelamento (spec §42)", () => {
  it("cancela preservando itens, timeline e custos", async () => {
    const id = await novaTroca();
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      },
    ]);
    await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-20T13:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Produto enviado via motoboy.",
      custos: [{ categoria: "MOTOBOY", descricao: "Entrega", valor: 85 }],
    });

    await cancelarTroca(id, "Cliente desistiu.");

    const troca = await getTroca(id);
    expect(troca?.status).toBe("CANCELADA");
    expect(troca?.canceladaEm).toBeInstanceOf(Date);
    // NADA foi apagado.
    expect(troca?.itens).toHaveLength(1);
    expect(troca?.registros).toHaveLength(1);
    expect(troca?.registros[0].custos).toHaveLength(1);

    const auditoria = await prisma.trocaAntecipadaAuditoria.findFirst({
      where: { trocaAntecipadaId: id, evento: "CANCELAMENTO" },
    });
    expect(auditoria?.observacao).toBe("Cliente desistiu.");
  });

  it("recancelar não reescreve canceladaEm", async () => {
    const id = await novaTroca();
    await cancelarTroca(id, "");
    const primeira = (await getTroca(id))!.canceladaEm!;
    await cancelarTroca(id, "de novo");
    expect((await getTroca(id))!.canceladaEm!.getTime()).toBe(
      primeira.getTime(),
    );
  });

  it("recusa finalizar uma troca cancelada", async () => {
    const id = await novaTroca();
    await cancelarTroca(id, "");
    await expect(finalizarTroca(id, true)).rejects.toThrow(/cancelada/i);
  });
});

describe("timeline e custos", () => {
  it("grava registro com custos numa transação, e ordena por dataHora desc", async () => {
    const id = await novaTroca();

    await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-15T10:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Cliente relatou o problema.",
      custos: [],
    });
    await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-18T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Produto enviado via motoboy.",
      custos: [
        { categoria: "MOTOBOY", descricao: "Entrega ao cliente", valor: 85 },
        { categoria: "SEDEX", descricao: "", valor: 42 },
      ],
    });
    // Fato RETROATIVO cadastrado por último — deve aparecer por ÚLTIMO.
    await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-10T08:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Primeiro contato, ainda por telefone.",
      custos: [],
    });

    const registros = await listarRegistrosTroca(id);
    expect(registros).toHaveLength(3);
    expect(registros[0].relato).toMatch(/motoboy/);
    expect(registros[2].relato).toMatch(/Primeiro contato/);

    // O snapshot do nome é derivado NO SERVICE, do usuário persistido.
    expect(registros[0].responsavelNome).toContain("Tecnico");

    const custos = registros[0].custos;
    expect(custos).toHaveLength(2);
    expect(custos.reduce((s, c) => s + c.valor, 0)).toBe(127);
    // Decimal, nunca float: o valor volta como número exato.
    expect(custos[0].valor).toBe(85);
  });

  /**
   * Timeline da Troca — **usuário ATIVO, sem exigência de papel** (ADR-0422).
   *
   * Um acontecimento aqui é tipicamente administrativo: "enviado por motoboy",
   * "postado", "cliente cobrado pela devolução", "frete R$ 60". Exigir técnico
   * para registrar isso não descreveria o trabalho real.
   */
  it("aceita responsável ativo SEM papel de técnico no registro", async () => {
    const id = await novaTroca();
    const { id: registroId } = await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-15T10:00:00.000Z"),
      responsavelId: administrativoId,
      relato: "Postagem feita no correio pela administração.",
      custos: [{ categoria: "SEDEX", descricao: "", valor: 42 }],
    });

    const registros = await listarRegistrosTroca(id);
    expect(registros[0].id).toBe(registroId);
    expect(registros[0].responsavelId).toBe(administrativoId);
    // O snapshot do nome continua sendo derivado do usuário PERSISTIDO.
    expect(registros[0].responsavelNome).toContain("Administrativo");
  });

  it("aceita trocar o responsável do registro para um administrativo", async () => {
    const id = await novaTroca();
    const { id: registroId } = await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-15T10:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Original.",
      custos: [],
    });

    await atualizarRegistroTroca(id, registroId, {
      dataHora: new Date("2026-08-15T10:00:00.000Z"),
      responsavelId: administrativoId,
      relato: "Original.",
      custos: [],
    });

    const registros = await listarRegistrosTroca(id);
    expect(registros[0].responsavelId).toBe(administrativoId);
    // Trocar o responsável REESCREVE o snapshot — o fato operacional mudou.
    expect(registros[0].responsavelNome).toContain("Administrativo");
  });

  /** A única recusa da timeline da Troca: usuário inativo. */
  it("recusa responsável INATIVO no registro", async () => {
    const id = await novaTroca();
    await expect(
      criarRegistroTroca(id, {
        dataHora: new Date("2026-08-15T10:00:00.000Z"),
        responsavelId: inativoId,
        relato: "x",
        custos: [],
      }),
    ).rejects.toThrow(USUARIO_INATIVO);
  });

  it("edição SUBSTITUI os custos, não duplica", async () => {
    const id = await novaTroca();
    const { id: registroId } = await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-18T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Envio.",
      custos: [
        { categoria: "MOTOBOY", descricao: "", valor: 85 },
        { categoria: "SEDEX", descricao: "", valor: 42 },
      ],
    });

    await atualizarRegistroTroca(id, registroId, {
      dataHora: new Date("2026-08-18T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Envio corrigido.",
      custos: [{ categoria: "MOTOBOY", descricao: "", valor: 60 }],
    });

    const registros = await listarRegistrosTroca(id);
    expect(registros[0].custos).toHaveLength(1);
    expect(registros[0].custos[0].valor).toBe(60);
    expect(registros[0].relato).toBe("Envio corrigido.");
  });

  /**
   * ADR-0408: `responsavelNome` é o nome de quem constava quando ELE foi
   * atribuído. Corrigir o relato de um fato antigo não pode reescrever isso.
   */
  it("editar o relato NÃO reescreve o snapshot do responsável", async () => {
    const id = await novaTroca();
    const { id: registroId } = await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-18T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Original.",
      custos: [],
    });

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { nome: `${MARCA} Tecnico RENOMEADO` },
    });
    try {
      await atualizarRegistroTroca(id, registroId, {
        dataHora: new Date("2026-08-18T09:00:00.000Z"),
        responsavelId: tecnicoId,
        relato: "Corrigido.",
        custos: [],
      });
      const registros = await listarRegistrosTroca(id);
      expect(registros[0].responsavelNome).toBe(`${MARCA} Tecnico`);
      expect(registros[0].responsavelNome).not.toContain("RENOMEADO");
    } finally {
      await prisma.usuario.update({
        where: { id: tecnicoId },
        data: { nome: `${MARCA} Tecnico` },
      });
    }
  });

  /** Registro com custo é bloqueado (ADR-0401); sem custo, sai. */
  it("bloqueia exclusão de registro COM custo e permite SEM custo", async () => {
    const id = await novaTroca();
    const comCusto = await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-18T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Com custo.",
      custos: [{ categoria: "FRETE", descricao: "", valor: 60 }],
    });
    const semCusto = await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-19T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Sem custo.",
      custos: [],
    });

    await expect(excluirRegistroTroca(id, comCusto.id)).rejects.toThrow(
      REGISTRO_COM_CUSTOS,
    );
    await expect(
      excluirRegistroTroca(id, semCusto.id),
    ).resolves.toBeUndefined();
    expect(await listarRegistrosTroca(id)).toHaveLength(1);
  });

  /** Pertencimento ao agregado, do mesmo jeito dos itens. */
  it("recusa registro de OUTRA troca, com a mesma mensagem de inexistente", async () => {
    const trocaA = await novaTroca();
    const trocaB = await novaTroca();
    const registroB = await criarRegistroTroca(trocaB, {
      dataHora: new Date("2026-08-18T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Histórico da troca B.",
      custos: [],
    });

    await expect(
      atualizarRegistroTroca(trocaA, registroB.id, {
        dataHora: new Date("2026-08-18T09:00:00.000Z"),
        responsavelId: tecnicoId,
        relato: "INVASÃO",
        custos: [],
      }),
    ).rejects.toThrow(REGISTRO_TROCA_NAO_ENCONTRADO);

    await expect(excluirRegistroTroca(trocaA, registroB.id)).rejects.toThrow(
      REGISTRO_TROCA_NAO_ENCONTRADO,
    );

    // O registro de B ficou intacto.
    const b = await listarRegistrosTroca(trocaB);
    expect(b).toHaveLength(1);
    expect(b[0].relato).toBe("Histórico da troca B.");
  });

  /** Timeline NÃO gera auditoria (ADR-0401) — são mecanismos separados. */
  it("criar registro não gera entrada de auditoria", async () => {
    const id = await novaTroca();
    await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-18T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Só um registro.",
      custos: [],
    });
    const auditorias = await prisma.trocaAntecipadaAuditoria.findMany({
      where: { trocaAntecipadaId: id },
    });
    expect(auditorias.map((a) => a.evento)).toEqual(["CRIACAO"]);
  });
});

describe("listagem, busca e vínculo", () => {
  it("a listagem deriva retorno e custo acumulado", async () => {
    const id = await novaTroca({ referencia: `${MARCA} Listagem` });
    await salvarItensTroca(id, [
      {
        produtoId,
        descricaoManual: "",
        quantidadeEnviada: 7,
        quantidadeEsperadaRetorno: 7,
        quantidadeDevolvida: 5,
      },
      {
        produtoId: null,
        descricaoManual: "Item extra",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 1,
      },
    ]);
    await criarRegistroTroca(id, {
      dataHora: new Date("2026-08-18T09:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Envio.",
      custos: [
        { categoria: "MOTOBOY", descricao: "", valor: 85 },
        { categoria: "FRETE", descricao: "", valor: 60 },
      ],
    });

    const linha = (await listTrocas()).find((t) => t.id === id)!;
    // Soma dos DOIS itens.
    expect(linha.devolvido).toBe(6);
    expect(linha.esperado).toBe(8);
    expect(linha.custoTotal).toBe(145);
  });

  it("busca por número, referência, relato, produto e descrição manual", async () => {
    const id = await novaTroca({
      referencia: `${MARCA} Fechadura Instalação`,
      relatoInicial: "Trava intermitente relatada pelo sindico.",
    });
    await salvarItensTroca(id, [
      {
        produtoId: null,
        descricaoManual: "Interruptor sem etiqueta",
        quantidadeEnviada: 1,
        quantidadeEsperadaRetorno: 1,
        quantidadeDevolvida: 0,
      },
    ]);

    const rows = await listTrocas();
    const alvo = rows.find((t) => t.id === id)!;

    const encontra = (q: string) =>
      filtrarTrocas(rows, q).some((t) => t.id === id);

    expect(encontra(String(alvo.numero))).toBe(true);
    expect(encontra("Fechadura")).toBe(true);
    expect(encontra("intermitente")).toBe(true);
    expect(encontra("etiqueta")).toBe(true);
    expect(encontra(`${MARCA} Cliente`)).toBe(true);

    // Insensível a acento E a caixa — fonte única `@/utils/busca` (ADR-0402).
    expect(encontra("instalacao")).toBe(true);
    expect(encontra("INSTALAÇÃO")).toBe(true);
  });

  it("listTrocasVinculaveis traz só trocas DO cliente e sem OS", async () => {
    const doCliente = await novaTroca({ referencia: `${MARCA} Vinculavel` });
    const deOutro = await novaTroca({
      clienteId: outroClienteId,
      referencia: `${MARCA} De outro cliente`,
    });

    const opcoes = await listTrocasVinculaveis(clienteId);
    expect(opcoes.map((o) => o.id)).toContain(doCliente);
    expect(opcoes.map((o) => o.id)).not.toContain(deOutro);
  });

  it("cliente sem id devolve lista vazia, sem consultar o banco", async () => {
    expect(await listTrocasVinculaveis("")).toEqual([]);
  });
});
