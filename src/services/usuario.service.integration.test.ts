import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/infrastructure/database";
import { CANNOT_DELETE_USED_IN_RECORDS } from "@/lib/messages";

import { criarInstalacao } from "./instalacao.service";
import {
  criarPropostaCompleta,
  salvarProposta,
  type NovaPropostaPayload,
} from "./proposta.service";
import {
  createUsuario,
  listUsuarioOptions,
  removeUsuario,
  semPapelMsg,
  updateUsuario,
} from "./usuario.service";

/**
 * Cadastro único de Usuários (Sprint 4.2, ADR-0410).
 *
 * Por que INTEGRAÇÃO e não unidade: `listUsuarioOptions` é uma condição de
 * consulta (`OR` entre papel-ativo e a lista de ids) e `removeUsuario` conta
 * três relações. Com Prisma mockado o teste provaria apenas que o mock foi
 * chamado com certos argumentos — o que já seria verdade numa implementação
 * errada. Só o banco real distingue.
 *
 * Dados marcados com `E2E ` — o mesmo marcador que o `globalTeardown` do
 * Playwright varre —, então um teste interrompido no meio não deixa rastro
 * permanente mesmo que o `afterAll` não rode.
 */

const MARCA = `E2E Usuario ${Date.now()}`;

let vendedorId: string;
let tecnicoId: string;
let ambosId: string;
let inativoId: string;
let clienteId: string;
let propostaId: string;

beforeAll(async () => {
  vendedorId = await createUsuario({
    ativo: true,
    nome: `${MARCA} Vendedor`,
    ehVendedor: true,
    ehTecnico: false,
  });
  tecnicoId = await createUsuario({
    ativo: true,
    nome: `${MARCA} Tecnico`,
    ehVendedor: false,
    ehTecnico: true,
  });
  ambosId = await createUsuario({
    ativo: true,
    nome: `${MARCA} Ambos`,
    ehVendedor: true,
    ehTecnico: true,
  });
  inativoId = await createUsuario({
    ativo: false,
    nome: `${MARCA} Inativo`,
    ehVendedor: true,
    ehTecnico: false,
  });

  const cliente = await prisma.cliente.create({
    data: { nome: `${MARCA} Cliente`, tipoPessoa: "PF" },
    select: { id: true },
  });
  clienteId = cliente.id;
});

afterAll(async () => {
  // Ordem obrigatória: as três FKs para `usuarios` são Restrict (R3), então a
  // proposta sai antes do usuário que ela referencia.
  if (propostaId) {
    await prisma.proposta.deleteMany({ where: { id: propostaId } });
  }
  if (clienteId) await prisma.cliente.deleteMany({ where: { id: clienteId } });
  await prisma.usuario.deleteMany({ where: { nome: { startsWith: MARCA } } });
});

describe("vínculo com proposta", () => {
  it("vincula um usuário com papel de vendedor a uma proposta", async () => {
    const p = await prisma.proposta.create({
      data: { clienteId, vendedorId },
      select: { id: true, vendedorId: true },
    });
    propostaId = p.id;
    expect(p.vendedorId).toBe(vendedorId);

    const lido = await prisma.proposta.findUnique({
      where: { id: propostaId },
      select: { vendedor: { select: { nome: true, ehVendedor: true } } },
    });
    expect(lido?.vendedor?.ehVendedor).toBe(true);
  });
});

describe("listUsuarioOptions", () => {
  it("traz só ativos com o papel pedido", async () => {
    const ids = (await listUsuarioOptions("ehVendedor")).map((o) => o.value);
    expect(ids).toContain(vendedorId);
    expect(ids).toContain(ambosId);
    expect(ids).not.toContain(tecnicoId);
    expect(ids).not.toContain(inativoId);
  });

  it("filtra o outro papel de forma independente", async () => {
    const ids = (await listUsuarioOptions("ehTecnico")).map((o) => o.value);
    expect(ids).toContain(tecnicoId);
    expect(ids).toContain(ambosId);
    expect(ids).not.toContain(vendedorId);
  });

  it("inclui o vinculado mesmo inativo, rotulado", async () => {
    const opcoes = await listUsuarioOptions("ehVendedor", [inativoId]);
    const achado = opcoes.find((o) => o.value === inativoId);
    expect(achado?.label).toBe(`${MARCA} Inativo (inativo)`);
  });

  it("inclui o vinculado que não tem o papel, com rótulo próprio", async () => {
    const opcoes = await listUsuarioOptions("ehVendedor", [tecnicoId]);
    const achado = opcoes.find((o) => o.value === tecnicoId);
    expect(achado?.label).toBe(`${MARCA} Tecnico (sem papel de vendedor)`);
  });

  it("ignora ids vazios ou repetidos em incluirIds", async () => {
    const opcoes = await listUsuarioOptions("ehVendedor", [
      inativoId,
      inativoId,
      "",
    ]);
    expect(opcoes.filter((o) => o.value === inativoId)).toHaveLength(1);
  });

  it("volta a oferecer quem recebeu o papel", async () => {
    await updateUsuario(tecnicoId, {
      ativo: true,
      nome: `${MARCA} Tecnico`,
      ehVendedor: true,
      ehTecnico: true,
    });
    const ids = (await listUsuarioOptions("ehVendedor")).map((o) => o.value);
    expect(ids).toContain(tecnicoId);

    // Devolve ao estado do beforeAll para não afetar os testes seguintes.
    await updateUsuario(tecnicoId, {
      ativo: true,
      nome: `${MARCA} Tecnico`,
      ehVendedor: false,
      ehTecnico: true,
    });
  });
});

describe("removeUsuario", () => {
  it("exclui um usuário nunca usado", async () => {
    const id = await createUsuario({
      ativo: true,
      nome: `${MARCA} Descartavel`,
      ehVendedor: true,
      ehTecnico: false,
    });
    await removeUsuario(id);
    expect(await prisma.usuario.findUnique({ where: { id } })).toBeNull();
  });

  it("bloqueia a exclusão de quem está em uma proposta", async () => {
    await expect(removeUsuario(vendedorId)).rejects.toThrow(
      CANNOT_DELETE_USED_IN_RECORDS,
    );
  });
});

/** Apaga uma proposta criada pelo teste, respeitando o vínculo da revisão atual. */
async function apagarProposta(id: string) {
  await prisma.proposta.update({
    where: { id },
    data: { currentRevisionId: null },
  });
  await prisma.proposta.delete({ where: { id } });
}

/** Payload mínimo válido de proposta, com o vendedor do cenário. */
const payloadProposta = (
  vendedor: string | null,
  validadeDias = 5,
): NovaPropostaPayload => ({
  clienteId,
  vendedorId: vendedor,
  modelo: "COMERCIAL",
  validadeDias,
  obsInternas: null,
  obsProposta: null,
  secoes: [],
});

describe("guarda de papel em Proposta (ADR-0410)", () => {
  it("recusa vincular quem não tem papel de vendedor", async () => {
    await expect(
      criarPropostaCompleta(payloadProposta(tecnicoId)),
    ).rejects.toThrow(semPapelMsg("ehVendedor"));
  });

  it("recusa vincular quem está inativo", async () => {
    await expect(
      criarPropostaCompleta(payloadProposta(inativoId)),
    ).rejects.toThrow(semPapelMsg("ehVendedor"));
  });

  it("aceita nascer sem vendedor (fluxo workspace-first)", async () => {
    const p = await criarPropostaCompleta(payloadProposta(null));
    const lido = await prisma.proposta.findUniqueOrThrow({
      where: { id: p.id },
      select: { vendedorId: true },
    });
    expect(lido.vendedorId).toBeNull();
    await apagarProposta(p.id);
  });

  // O caso central do §3: a guarda não pode quebrar histórico.
  it("permite salvar uma proposta cujo vendedor perdeu o papel, sem trocá-lo", async () => {
    const p = await criarPropostaCompleta(payloadProposta(ambosId));

    // O vendedor perde o papel DEPOIS de vinculado.
    await updateUsuario(ambosId, {
      ativo: true,
      nome: `${MARCA} Ambos`,
      ehVendedor: false,
      ehTecnico: true,
    });

    // Salvar outra alteração, mantendo o MESMO vendedor, continua funcionando.
    await expect(
      salvarProposta(p.id, payloadProposta(ambosId, 9)),
    ).resolves.toBeTruthy();

    const lido = await prisma.proposta.findUniqueOrThrow({
      where: { id: p.id },
      select: { vendedorId: true, validadeDias: true },
    });
    expect(lido.vendedorId).toBe(ambosId); // vínculo intacto
    expect(lido.validadeDias).toBe(9);

    // Mas TROCAR para outro indisponível continua recusado.
    await expect(
      salvarProposta(p.id, payloadProposta(inativoId, 9)),
    ).rejects.toThrow(semPapelMsg("ehVendedor"));

    await apagarProposta(p.id);
    await updateUsuario(ambosId, {
      ativo: true,
      nome: `${MARCA} Ambos`,
      ehVendedor: true,
      ehTecnico: true,
    });
  });
});

describe("guarda de papel em Instalação (ADR-0410)", () => {
  it("vincula um usuário com papel de técnico", async () => {
    const i = await criarInstalacao({
      clienteId,
      propostaId: null,
      tecnicoResponsavelId: tecnicoId,
      status: "A_AGENDAR",
      dataPrevista: null,
      dataAgendada: null,
      periodo: "",
      observacoes: "",
    });
    const lido = await prisma.instalacao.findUniqueOrThrow({
      where: { id: i.id },
      select: { tecnicoResponsavelId: true },
    });
    expect(lido.tecnicoResponsavelId).toBe(tecnicoId);

    await prisma.instalacaoAuditoria.deleteMany({
      where: { instalacaoId: i.id },
    });
    await prisma.instalacao.delete({ where: { id: i.id } });
  });

  it("recusa vincular quem não tem papel de técnico", async () => {
    await expect(
      criarInstalacao({
        clienteId,
        propostaId: null,
        tecnicoResponsavelId: vendedorId,
        status: "A_AGENDAR",
        dataPrevista: null,
        dataAgendada: null,
        periodo: "",
        observacoes: "",
      }),
    ).rejects.toThrow(semPapelMsg("ehTecnico"));
  });
});
