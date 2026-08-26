import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/infrastructure/database";
import { CANNOT_DELETE_USED_IN_RECORDS } from "@/lib/messages";

import {
  createUsuario,
  listUsuarioOptions,
  removeUsuario,
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
