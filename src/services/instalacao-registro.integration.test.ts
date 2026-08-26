import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/infrastructure/database";

import {
  atualizarRegistro,
  criarRegistro,
  excluirRegistro,
  REGISTRO_COM_CUSTOS,
  REGISTRO_NAO_ENCONTRADO,
  SEM_PAPEL_TECNICO,
  type RegistroInput,
} from "./instalacao-registro.service";

/**
 * Integridade do agregado Instalação → Registro (Sprint 4.1.1).
 *
 * A regra: **toda operação sobre um registro da cronologia só vale se o
 * registro pertencer à Instalação informada.** Sem isso, uma chamada com
 * `instalacaoId` de A e `registroId` de B alteraria ou apagaria o registro de
 * B — a Instalação A funcionaria como chave para o histórico da B.
 *
 * Por que INTEGRAÇÃO e não teste de unidade: a garantia é uma condição de
 * consulta (`id` **e** `instalacaoId`). Com um Prisma mockado, o teste provaria
 * apenas que o mock foi chamado com certos argumentos — exatamente o que já
 * seria verdade na versão vulnerável. Só o banco real distingue as duas
 * implementações.
 *
 * Por que não E2E: a interface nunca produz o par cruzado. O defeito só é
 * alcançável chamando o service (ou a Server Action) com argumentos forjados,
 * e é no service que a garantia precisa morar.
 *
 * Os dados nascem marcados com `E2E ` — o mesmo marcador que o `globalTeardown`
 * do Playwright varre —, então um teste interrompido no meio não deixa rastro
 * permanente mesmo que o `afterAll` não rode.
 */

const MARCA = `E2E Integridade ${Date.now()}`;

let clienteId: string;
let tecnicoId: string;
let semPapelId: string;
let instalacaoA: string;
let instalacaoB: string;
let registroA: string;
let registroB: string;

const RELATORIO_A = "Relatorio original da instalacao A.";
const RELATORIO_B = "Relatorio original da instalacao B.";

/** Entrada válida de registro, com o técnico do cenário. */
const entrada = (relatorio: string, custos: RegistroInput["custos"] = []): RegistroInput => ({
  tipo: "VISITA_CLIENTE",
  aconteceuEm: new Date("2026-08-15T10:00:00.000Z"),
  tecnicoId,
  relatorio,
  custos,
});

beforeAll(async () => {
  const cliente = await prisma.cliente.create({
    data: { nome: `${MARCA} Cliente`, tipoPessoa: "PF" },
    select: { id: true },
  });
  clienteId = cliente.id;

  // Usuario com papel de TÉCNICO (Sprint 4.2, ADR-0410). O papel é
  // obrigatório na cronologia — sem ele, `criarRegistro` recusa.
  const tecnico = await prisma.usuario.create({
    data: { nome: `${MARCA} Tecnico`, ehTecnico: true },
    select: { id: true },
  });
  tecnicoId = tecnico.id;

  // Usuário SEM o papel de técnico, para os casos negativos.
  const semPapel = await prisma.usuario.create({
    data: { nome: `${MARCA} Sem Papel`, ehVendedor: true, ehTecnico: false },
    select: { id: true },
  });
  semPapelId = semPapel.id;

  const [a, b] = await Promise.all([
    prisma.instalacao.create({ data: { clienteId }, select: { id: true } }),
    prisma.instalacao.create({ data: { clienteId }, select: { id: true } }),
  ]);
  instalacaoA = a.id;
  instalacaoB = b.id;

  registroA = (await criarRegistro(instalacaoA, entrada(RELATORIO_A))).id;
  registroB = (await criarRegistro(instalacaoB, entrada(RELATORIO_B))).id;
});

afterAll(async () => {
  const instalacoes = [instalacaoA, instalacaoB].filter(Boolean);
  const registros = await prisma.instalacaoRegistro.findMany({
    where: { instalacaoId: { in: instalacoes } },
    select: { id: true },
  });
  await prisma.instalacaoCusto.deleteMany({
    where: { registroId: { in: registros.map((r) => r.id) } },
  });
  await prisma.instalacaoRegistro.deleteMany({
    where: { instalacaoId: { in: instalacoes } },
  });
  await prisma.instalacaoAuditoria.deleteMany({
    where: { instalacaoId: { in: instalacoes } },
  });
  await prisma.instalacao.deleteMany({ where: { id: { in: instalacoes } } });
  if (tecnicoId) await prisma.usuario.deleteMany({ where: { id: tecnicoId } });
  if (semPapelId) await prisma.usuario.deleteMany({ where: { id: semPapelId } });
  if (clienteId) await prisma.cliente.deleteMany({ where: { id: clienteId } });
  await prisma.$disconnect();
});

/** Estado atual do registro, direto do banco. */
const lerRegistro = (id: string) =>
  prisma.instalacaoRegistro.findUnique({
    where: { id },
    include: { custos: true },
  });

describe("atualizarRegistro — pertencimento ao agregado", () => {
  it("edita quando o registro pertence à instalação informada", async () => {
    await atualizarRegistro(instalacaoA, registroA, entrada("Relatorio corrigido."));

    const r = await lerRegistro(registroA);
    expect(r?.relatorio).toBe("Relatorio corrigido.");
  });

  it("RECUSA editar um registro de OUTRA instalação", async () => {
    await expect(
      atualizarRegistro(instalacaoA, registroB, entrada("Invasao.")),
    ).rejects.toThrow(REGISTRO_NAO_ENCONTRADO);
  });

  it("o registro da outra instalação fica INTACTO após a tentativa", async () => {
    await atualizarRegistro(instalacaoA, registroB, entrada("Invasao.")).catch(
      () => undefined,
    );

    const r = await lerRegistro(registroB);
    expect(r?.relatorio).toBe(RELATORIO_B);
  });

  it("RECUSA editar um registro inexistente", async () => {
    await expect(
      atualizarRegistro(instalacaoA, "clnaoexisteaaaaaaaaaaaaaa", entrada("x")),
    ).rejects.toThrow(REGISTRO_NAO_ENCONTRADO);
  });

  it("a tentativa cruzada NÃO apaga os custos do registro alvo", async () => {
    // A edição substitui os custos por delete-and-recreate. Se a guarda de
    // pertencimento rodasse DEPOIS do delete, os custos de B sumiriam mesmo com
    // a operação recusada — este teste é o que trava essa ordem.
    const comCusto = await criarRegistro(
      instalacaoB,
      entrada("Registro de B com custo.", [
        { categoria: "MATERIAL", descricao: "Peca", valor: 340 },
      ]),
    );

    await atualizarRegistro(instalacaoA, comCusto.id, entrada("Invasao.")).catch(
      () => undefined,
    );

    const r = await lerRegistro(comCusto.id);
    expect(r?.custos).toHaveLength(1);
    expect(Number(r?.custos[0].valor)).toBe(340);
  });
});

describe("excluirRegistro — pertencimento ao agregado", () => {
  it("RECUSA excluir um registro de OUTRA instalação, e ele continua existindo", async () => {
    const alvo = await criarRegistro(instalacaoB, entrada("Nao pode sumir."));

    await expect(
      excluirRegistro(instalacaoA, alvo.id),
    ).rejects.toThrow(REGISTRO_NAO_ENCONTRADO);

    expect(await lerRegistro(alvo.id)).not.toBeNull();
  });

  it("RECUSA excluir um registro inexistente", async () => {
    await expect(
      excluirRegistro(instalacaoA, "clnaoexisteaaaaaaaaaaaaaa"),
    ).rejects.toThrow(REGISTRO_NAO_ENCONTRADO);
  });

  it("exclui quando o registro pertence à instalação e não tem custos", async () => {
    const alvo = await criarRegistro(instalacaoA, entrada("Pode sumir."));

    await excluirRegistro(instalacaoA, alvo.id);

    expect(await lerRegistro(alvo.id)).toBeNull();
  });

  it("mantém o bloqueio por custos lançados (regra do ADR-0401)", async () => {
    const alvo = await criarRegistro(
      instalacaoA,
      entrada("Tem custo.", [
        { categoria: "FRETE", descricao: "", valor: 35 },
      ]),
    );

    await expect(excluirRegistro(instalacaoA, alvo.id)).rejects.toThrow(
      REGISTRO_COM_CUSTOS,
    );
    expect(await lerRegistro(alvo.id)).not.toBeNull();
  });
});

describe("regra de snapshot do Técnico — preservada pela correção", () => {
  it("editar só o relatório NÃO reescreve responsavelNome", async () => {
    const alvo = await criarRegistro(instalacaoA, entrada("Antes do rename."));
    const antes = await lerRegistro(alvo.id);

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { nome: `${MARCA} Tecnico Renomeado` },
    });

    await atualizarRegistro(instalacaoA, alvo.id, entrada("Depois do rename."));

    const depois = await lerRegistro(alvo.id);
    expect(depois?.relatorio).toBe("Depois do rename.");
    expect(depois?.responsavelNome).toBe(antes?.responsavelNome);
  });
});

describe("papel de técnico na cronologia (ADR-0410)", () => {
  it("recusa criar registro com usuário sem o papel de técnico", async () => {
    await expect(
      criarRegistro(instalacaoA, {
        ...entrada("Tentativa sem papel."),
        tecnicoId: semPapelId,
      }),
    ).rejects.toThrow(SEM_PAPEL_TECNICO);
  });

  it("recusa criar registro com usuário inativo", async () => {
    const inativo = await prisma.usuario.create({
      data: { nome: `${MARCA} Inativo`, ativo: false, ehTecnico: true },
      select: { id: true },
    });
    await expect(
      criarRegistro(instalacaoA, {
        ...entrada("Tentativa com inativo."),
        tecnicoId: inativo.id,
      }),
    ).rejects.toThrow(SEM_PAPEL_TECNICO);
    await prisma.usuario.delete({ where: { id: inativo.id } });
  });

  it("recusa trocar o responsável por quem não tem o papel", async () => {
    const alvo = await criarRegistro(instalacaoA, entrada("Troca invalida."));
    await expect(
      atualizarRegistro(instalacaoA, alvo.id, {
        ...entrada("Troca invalida."),
        tecnicoId: semPapelId,
      }),
    ).rejects.toThrow(SEM_PAPEL_TECNICO);

    // O vínculo original permanece — a transação inteira foi revertida.
    const r = await lerRegistro(alvo.id);
    expect(r?.tecnicoId).toBe(tecnicoId);
  });

  it("aceita um usuário com os DOIS papéis", async () => {
    const ambos = await prisma.usuario.create({
      data: { nome: `${MARCA} Ambos`, ehVendedor: true, ehTecnico: true },
      select: { id: true },
    });
    const { id } = await criarRegistro(instalacaoA, {
      ...entrada("Feito por quem tambem vende."),
      tecnicoId: ambos.id,
    });

    const r = await lerRegistro(id);
    expect(r?.tecnicoId).toBe(ambos.id);
    expect(r?.responsavelNome).toBe(`${MARCA} Ambos`);

    await prisma.instalacaoRegistro.delete({ where: { id } });
    await prisma.usuario.delete({ where: { id: ambos.id } });
  });
});

describe("integridade histórica da cronologia (ADR-0408 preservado pelo 0410)", () => {
  it("renomear o Usuário NÃO altera o snapshot de registro existente", async () => {
    const alvo = await criarRegistro(instalacaoA, entrada("Fato consumado."));
    const antes = await lerRegistro(alvo.id);

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { nome: `${MARCA} Outro Nome Completamente` },
    });

    const depois = await lerRegistro(alvo.id);
    expect(depois?.responsavelNome).toBe(antes?.responsavelNome);
    expect(depois?.tecnicoId).toBe(tecnicoId);
  });

  it("inativar o Usuário NÃO apaga nem altera o vínculo do registro", async () => {
    const alvo = await criarRegistro(instalacaoA, entrada("Antes de inativar."));
    const antes = await lerRegistro(alvo.id);

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { ativo: false },
    });

    const depois = await lerRegistro(alvo.id);
    expect(depois?.tecnicoId).toBe(tecnicoId);
    expect(depois?.responsavelNome).toBe(antes?.responsavelNome);

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { ativo: true },
    });
  });

  it("desmarcar o papel NÃO apaga nem altera o vínculo do registro", async () => {
    const alvo = await criarRegistro(instalacaoA, entrada("Antes de perder papel."));
    const antes = await lerRegistro(alvo.id);

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { ehTecnico: false },
    });

    const depois = await lerRegistro(alvo.id);
    expect(depois?.tecnicoId).toBe(tecnicoId);
    expect(depois?.responsavelNome).toBe(antes?.responsavelNome);

    await prisma.usuario.update({
      where: { id: tecnicoId },
      data: { ehTecnico: true },
    });
  });

  it("trocar o responsável REESCREVE o snapshot, com o nome atual do novo", async () => {
    const bruno = await prisma.usuario.create({
      data: { nome: `${MARCA} Bruno`, ehTecnico: true },
      select: { id: true },
    });
    const alvo = await criarRegistro(instalacaoA, entrada("Era do tecnico A."));

    await atualizarRegistro(instalacaoA, alvo.id, {
      ...entrada("Agora e do Bruno."),
      tecnicoId: bruno.id,
    });

    const r = await lerRegistro(alvo.id);
    expect(r?.tecnicoId).toBe(bruno.id);
    expect(r?.responsavelNome).toBe(`${MARCA} Bruno`);

    await prisma.instalacaoRegistro.delete({ where: { id: alvo.id } });
    await prisma.usuario.delete({ where: { id: bruno.id } });
  });
});
