import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ANEXO_LIMITE_EXCEDIDO,
  ANEXO_MAXIMO_ATINGIDO,
  ANEXO_NAO_ENCONTRADO,
  ANEXO_TIPO_RECUSADO,
  MAX_POR_REGISTRO,
} from "@/features/instalacoes/anexos";
import { prisma } from "@/infrastructure/database";
import { resolveWithin, storagePaths } from "@/infrastructure/storage";

import { cancelarInstalacao, criarInstalacao } from "./instalacao.service";
import {
  REGISTRO_COM_CUSTOS,
  criarRegistro,
  excluirRegistro,
} from "./instalacao-registro.service";
import {
  criarAnexo,
  excluirAnexo,
  lerAnexo,
  listarAnexos,
} from "./instalacao-anexo.service";
import { createUsuario } from "./usuario.service";

/**
 * Anexos do registro (Sprint 4.3, T18 — ADR-0414).
 *
 * Por que INTEGRAÇÃO: a garantia central é uma CONDIÇÃO DE CONSULTA — o anexo
 * só é alcançável pelo agregado completo (`anexoId` + `registroId` +
 * `instalacaoId`). Com Prisma mockado o teste provaria apenas que o mock foi
 * chamado, o que seria verdade também numa versão que resolvesse só por
 * `anexoId`. É a mesma lacuna que originou o ADR-0409.
 *
 * O bloco de PARES CRUZADOS é verificado como DISCRIMINANTE: removida a
 * condição do agregado, ele falha; restaurada, passa. Evidência no
 * PROJECT_HISTORY.md.
 *
 * Este arquivo escreve em DISCO, sob `storagePaths.upload`. Tudo o que cria é
 * apagado no `afterAll`; o que escapar cai na varredura do `globalTeardown`.
 */

const MARCA = `E2E Anexo ${Date.now()}`;

let clienteId: string;
let tecnicoId: string;
let instalacaoA: string;
let instalacaoB: string;
let registroA: string;
let registroB: string;

const PNG_1x1 = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
    "01f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd4" +
    "0000000049454e44ae426082",
  "hex",
);

function arquivo(
  nome = "foto.jpg",
  tipo = "image/jpeg",
  conteudo: Buffer = PNG_1x1,
): File {
  return new File([new Uint8Array(conteudo)], nome, { type: tipo });
}

/** Caminho absoluto do anexo, pela mesma resolução que o service usa. */
function absoluto(caminhoRelativo: string): string {
  return resolveWithin(storagePaths.upload, caminhoRelativo);
}

async function novoRegistro(instalacaoId: string): Promise<string> {
  const { id } = await criarRegistro(instalacaoId, {
    tipo: "VISITA_CLIENTE",
    aconteceuEm: new Date("2026-08-20T10:00:00Z"),
    tecnicoId,
    relatorio: `${MARCA} relatório`,
    custos: [],
  });
  return id;
}

beforeAll(async () => {
  const cliente = await prisma.cliente.create({
    data: { nome: `${MARCA} Cliente`, tipoPessoa: "PF" },
    select: { id: true },
  });
  clienteId = cliente.id;

  tecnicoId = await createUsuario({
    ativo: true,
    nome: `${MARCA} Tecnico`,
    ehVendedor: false,
    ehTecnico: true,
  });

  const base = {
    clienteId,
    propostaId: null,
    tecnicoResponsavelId: null,
    status: "A_AGENDAR" as const,
    dataPrevista: null,
    dataAgendada: null,
    periodo: "",
    observacoes: "",
  };
  instalacaoA = (await criarInstalacao({ ...base, apelido: `${MARCA} Obra A` })).id;
  instalacaoB = (await criarInstalacao({ ...base, apelido: `${MARCA} Obra B` })).id;

  registroA = await novoRegistro(instalacaoA);
  registroB = await novoRegistro(instalacaoB);
});

afterAll(async () => {
  // Anexos saem por cascade com os registros; os arquivos físicos são varridos
  // pela remoção das pastas das duas instalações.
  const { rm } = await import("node:fs/promises");
  for (const id of [instalacaoA, instalacaoB].filter(Boolean)) {
    try {
      await rm(resolveWithin(storagePaths.upload, "instalacoes", id), {
        recursive: true,
        force: true,
      });
    } catch {
      // Pasta pode nem existir — limpeza best-effort, como no service.
    }
  }
  await prisma.instalacaoRegistro.deleteMany({
    where: { instalacaoId: { in: [instalacaoA, instalacaoB].filter(Boolean) } },
  });
  await prisma.instalacaoAuditoria.deleteMany({
    where: { instalacaoId: { in: [instalacaoA, instalacaoB].filter(Boolean) } },
  });
  await prisma.instalacao.deleteMany({
    where: { id: { in: [instalacaoA, instalacaoB].filter(Boolean) } },
  });
  if (tecnicoId) await prisma.usuario.deleteMany({ where: { id: tecnicoId } });
  if (clienteId) await prisma.cliente.deleteMany({ where: { id: clienteId } });
});

describe("criarAnexo", () => {
  it("grava a linha e o arquivo, com caminho RELATIVO", async () => {
    const dto = await criarAnexo(instalacaoA, registroA, arquivo("Foto Sala.jpg"));

    const linha = await prisma.instalacaoRegistroAnexo.findUniqueOrThrow({
      where: { id: dto.id },
    });

    expect(linha.nomeOriginal).toBe("Foto Sala.jpg");
    expect(linha.mimeType).toBe("image/jpeg");
    expect(linha.tamanho).toBe(PNG_1x1.length);

    // Caminho relativo, POSIX, particionado — nunca absoluto.
    expect(linha.caminhoRelativo).toBe(
      `instalacoes/${instalacaoA}/registros/${registroA}/${linha.nomeArmazenado}`,
    );
    expect(linha.caminhoRelativo).not.toMatch(/^[A-Za-z]:/);
    expect(linha.caminhoRelativo).not.toContain("\\");
    expect(linha.caminhoRelativo.startsWith("/")).toBe(false);

    // O arquivo existe e o conteúdo bate.
    expect(existsSync(absoluto(linha.caminhoRelativo))).toBe(true);
    expect(await readFile(absoluto(linha.caminhoRelativo))).toEqual(PNG_1x1);
  });

  it("o nome físico é gerado no servidor e não deriva do nome enviado", async () => {
    const dto = await criarAnexo(
      instalacaoA,
      registroA,
      arquivo("relatorio.jpg.exe", "application/pdf"),
    );
    const linha = await prisma.instalacaoRegistroAnexo.findUniqueOrThrow({
      where: { id: dto.id },
    });

    expect(linha.nomeOriginal).toBe("relatorio.jpg.exe");
    // Extensão vem da allowlist do MIME, não do nome.
    expect(linha.nomeArmazenado).toMatch(/^[a-z0-9]+\.pdf$/);
    expect(linha.nomeArmazenado).not.toContain("exe");
  });

  it("recusa tipo fora da allowlist e não deixa arquivo em disco", async () => {
    const antes = await prisma.instalacaoRegistroAnexo.count({
      where: { registroId: registroA },
    });

    await expect(
      criarAnexo(instalacaoA, registroA, arquivo("script.html", "text/html")),
    ).rejects.toThrow(ANEXO_TIPO_RECUSADO);

    expect(
      await prisma.instalacaoRegistroAnexo.count({ where: { registroId: registroA } }),
    ).toBe(antes);
  });

  it("recusa arquivo acima de 10 MB", async () => {
    const grande = Buffer.alloc(10 * 1024 * 1024 + 1, 1);
    await expect(
      criarAnexo(instalacaoA, registroA, arquivo("grande.png", "image/png", grande)),
    ).rejects.toThrow(ANEXO_LIMITE_EXCEDIDO);
  });

  it("recusa o 11º anexo do registro", async () => {
    const reg = await novoRegistro(instalacaoA);
    for (let i = 0; i < MAX_POR_REGISTRO; i++) {
      await criarAnexo(instalacaoA, reg, arquivo(`f${i}.png`, "image/png"));
    }

    await expect(
      criarAnexo(instalacaoA, reg, arquivo("excedente.png", "image/png")),
    ).rejects.toThrow(ANEXO_MAXIMO_ATINGIDO);

    expect(
      await prisma.instalacaoRegistroAnexo.count({ where: { registroId: reg } }),
    ).toBe(MAX_POR_REGISTRO);
  });
});

describe("listarAnexos e lerAnexo", () => {
  it("lista apenas os anexos do registro pedido", async () => {
    const reg = await novoRegistro(instalacaoA);
    await criarAnexo(instalacaoA, reg, arquivo("a.png", "image/png"));
    await criarAnexo(instalacaoA, reg, arquivo("b.png", "image/png"));

    const lista = await listarAnexos(instalacaoA, reg);
    expect(lista.map((a) => a.nomeOriginal).sort()).toEqual(["a.png", "b.png"]);
  });

  it("lê o conteúdo pelo agregado correto", async () => {
    const dto = await criarAnexo(instalacaoA, registroA, arquivo("leitura.png", "image/png"));
    const lido = await lerAnexo(instalacaoA, registroA, dto.id);

    expect(lido).not.toBeNull();
    expect(lido!.mimeType).toBe("image/png");
    expect(lido!.nomeOriginal).toBe("leitura.png");
    expect(lido!.data).toEqual(PNG_1x1);
  });
});

describe("excluirAnexo", () => {
  it("apaga a linha e o arquivo", async () => {
    const dto = await criarAnexo(instalacaoA, registroA, arquivo("sai.png", "image/png"));
    const linha = await prisma.instalacaoRegistroAnexo.findUniqueOrThrow({
      where: { id: dto.id },
    });
    const caminho = absoluto(linha.caminhoRelativo);
    expect(existsSync(caminho)).toBe(true);

    await excluirAnexo(instalacaoA, registroA, dto.id);

    expect(
      await prisma.instalacaoRegistroAnexo.findUnique({ where: { id: dto.id } }),
    ).toBeNull();
    expect(existsSync(caminho)).toBe(false);
  });

  it("recusa anexo inexistente", async () => {
    await expect(
      excluirAnexo(instalacaoA, registroA, "cmxxxxxxxxxxxxxxxxxxxxxxx"),
    ).rejects.toThrow(ANEXO_NAO_ENCONTRADO);
  });
});

/**
 * Ciclo de exclusão (T21).
 *
 * O bloqueio por custos (ADR-0401) é ANTERIOR e continua valendo: ele existe
 * por razão financeira, que não se aplica a arquivo. Anexo não vira um segundo
 * bloqueio — quando a exclusão é permitida, as linhas caem por cascade e a
 * pasta física some depois do commit.
 */
describe("exclusão do registro leva os anexos", () => {
  it("registro SEM custos: linhas caem por cascade e a pasta some", async () => {
    const reg = await novoRegistro(instalacaoA);
    const a1 = await criarAnexo(instalacaoA, reg, arquivo("x1.png", "image/png"));
    const a2 = await criarAnexo(instalacaoA, reg, arquivo("x2.png", "image/png"));

    const linhas = await prisma.instalacaoRegistroAnexo.findMany({
      where: { id: { in: [a1.id, a2.id] } },
      select: { caminhoRelativo: true },
    });
    expect(linhas).toHaveLength(2);
    const pasta = resolveWithin(
      storagePaths.upload,
      "instalacoes",
      instalacaoA,
      "registros",
      reg,
    );
    expect(existsSync(pasta)).toBe(true);

    await excluirRegistro(instalacaoA, reg);

    expect(
      await prisma.instalacaoRegistroAnexo.count({ where: { registroId: reg } }),
    ).toBe(0);
    expect(existsSync(pasta)).toBe(false);
    for (const l of linhas) expect(existsSync(absoluto(l.caminhoRelativo))).toBe(false);
  });

  it("registro COM custos: exclusão bloqueada e os anexos permanecem", async () => {
    const { id: reg } = await criarRegistro(instalacaoA, {
      tipo: "MATERIAL_COMPRADO",
      aconteceuEm: new Date("2026-08-21T09:00:00Z"),
      tecnicoId,
      relatorio: `${MARCA} com custo`,
      custos: [{ categoria: "MATERIAL", descricao: "Cabo", valor: 150 }],
    });
    const anexo = await criarAnexo(instalacaoA, reg, arquivo("nota.pdf", "application/pdf"));
    const linha = await prisma.instalacaoRegistroAnexo.findUniqueOrThrow({
      where: { id: anexo.id },
      select: { caminhoRelativo: true },
    });

    await expect(excluirRegistro(instalacaoA, reg)).rejects.toThrow(
      REGISTRO_COM_CUSTOS,
    );

    // O bloqueio não pode ter efeito colateral nenhum sobre os anexos.
    expect(
      await prisma.instalacaoRegistroAnexo.count({ where: { registroId: reg } }),
    ).toBe(1);
    expect(existsSync(absoluto(linha.caminhoRelativo))).toBe(true);
  });

  it("cancelar a instalação NÃO remove anexos", async () => {
    const reg = await novoRegistro(instalacaoA);
    const anexo = await criarAnexo(instalacaoA, reg, arquivo("preserva.png", "image/png"));
    const linha = await prisma.instalacaoRegistroAnexo.findUniqueOrThrow({
      where: { id: anexo.id },
      select: { caminhoRelativo: true },
    });

    await cancelarInstalacao(instalacaoA, `${MARCA} motivo`);

    expect(
      await prisma.instalacaoRegistroAnexo.findUnique({ where: { id: anexo.id } }),
    ).not.toBeNull();
    expect(existsSync(absoluto(linha.caminhoRelativo))).toBe(true);

    // Devolve a instalação ao estado anterior para não contaminar os demais casos.
    await prisma.instalacao.update({
      where: { id: instalacaoA },
      data: { status: "A_AGENDAR" },
    });
  });
});

/**
 * PARES CRUZADOS — o coração da T18.
 *
 * Um anexo só é alcançável quando os TRÊS ids concordam. Não pertencer devolve
 * exatamente o mesmo "não encontrado" de um id inexistente: não vazar a
 * diferença é parte da garantia.
 *
 * DISCRIMINÂNCIA: removendo `registro: { id, instalacaoId }` da condição, este
 * bloco falha. Verificado e registrado.
 */
describe("SEGURANÇA — anexo só é alcançável pelo agregado completo", () => {
  let anexoDeA: string;

  beforeAll(async () => {
    const dto = await criarAnexo(
      instalacaoA,
      registroA,
      arquivo("privado.png", "image/png"),
    );
    anexoDeA = dto.id;
  });

  it("ler com o REGISTRO errado devolve nulo", async () => {
    expect(await lerAnexo(instalacaoA, registroB, anexoDeA)).toBeNull();
  });

  it("ler com a INSTALAÇÃO errada devolve nulo", async () => {
    expect(await lerAnexo(instalacaoB, registroA, anexoDeA)).toBeNull();
  });

  it("ler com registro E instalação errados devolve nulo", async () => {
    expect(await lerAnexo(instalacaoB, registroB, anexoDeA)).toBeNull();
  });

  it("ler com os três ids certos ENCONTRA — a guarda não é um 'sempre nulo'", async () => {
    expect(await lerAnexo(instalacaoA, registroA, anexoDeA)).not.toBeNull();
  });

  it("excluir com o REGISTRO errado é recusado, e o anexo sobrevive", async () => {
    await expect(
      excluirAnexo(instalacaoA, registroB, anexoDeA),
    ).rejects.toThrow(ANEXO_NAO_ENCONTRADO);
    expect(
      await prisma.instalacaoRegistroAnexo.findUnique({ where: { id: anexoDeA } }),
    ).not.toBeNull();
  });

  it("excluir com a INSTALAÇÃO errada é recusado, e o anexo sobrevive", async () => {
    await expect(
      excluirAnexo(instalacaoB, registroA, anexoDeA),
    ).rejects.toThrow(ANEXO_NAO_ENCONTRADO);
    expect(
      await prisma.instalacaoRegistroAnexo.findUnique({ where: { id: anexoDeA } }),
    ).not.toBeNull();
  });

  it("listar um registro pela instalação errada devolve vazio", async () => {
    expect(await listarAnexos(instalacaoB, registroA)).toEqual([]);
  });

  it("criar anexo em registro de OUTRA instalação é recusado", async () => {
    await expect(
      criarAnexo(instalacaoB, registroA, arquivo("invasor.png", "image/png")),
    ).rejects.toThrow();
  });
});
