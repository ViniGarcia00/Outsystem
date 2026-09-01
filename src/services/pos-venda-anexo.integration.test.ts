import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ANEXO_LIMITE_EXCEDIDO,
  ANEXO_MAXIMO_ATINGIDO,
  ANEXO_NAO_ENCONTRADO,
  ANEXO_TIPO_RECUSADO,
  ANEXO_VAZIO,
  MAX_BYTES,
  MAX_POR_REGISTRO,
  pastaRelativaDoAgregado,
} from "@/features/pos-venda/anexos";
import { prisma } from "@/infrastructure/database";
import { resolveWithin, storagePaths } from "@/infrastructure/storage";

import {
  REGISTRO_POS_VENDA_NAO_ENCONTRADO,
  criarAnexoPosVenda,
  excluirAnexoPosVenda,
  lerAnexoPosVenda,
  listarAnexosPosVenda,
} from "./pos-venda-anexo.service";
import { criarOrdemServico } from "./pos-venda-os.service";
import { criarRegistroOS } from "./pos-venda-os-registro.service";
import { criarTroca } from "./pos-venda-troca.service";
import {
  criarRegistroTroca,
  excluirRegistroTroca,
} from "./pos-venda-troca-registro.service";

/**
 * Anexos do Pós-venda contra o PostgreSQL e o FILESYSTEM reais (Sprint 4.6).
 *
 * O que só este arquivo prova:
 *
 * - a resolução pelo **agregado completo** — um anexo da Troca A não é
 *   alcançável pelo id da Troca B, e o par cruzado devolve exatamente o mesmo
 *   "não encontrado" de um id inexistente (ADR-0409);
 * - a **assimetria do invariante** (ADR-0414): o arquivo existe em disco depois
 *   do upload, e some depois da exclusão da linha;
 * - que Troca e OS não se enxergam: o mesmo `registroId` não vaza de um
 *   submódulo para o outro.
 *
 * Cada teste limpa o que criou, e o `afterAll` remove as pastas físicas dos
 * agregados — resíduo zero em banco E em disco.
 */

const MARCA = `E2E PosVenda Anexo ${Date.now()}`;

const PNG_1x1 = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000001" +
    "1f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd4" +
    "0000000049454e44ae426082",
  "hex",
);

const arquivo = (
  nome: string,
  tipo: string,
  conteudo: Buffer | Uint8Array = PNG_1x1,
): File => new File([new Uint8Array(conteudo)], nome, { type: tipo });

let clienteId: string;
let tecnicoId: string;

let trocaA: string;
let trocaB: string;
let registroTrocaA: string;
let registroTrocaB: string;
let osId: string;
let registroOS: string;

const absoluto = (relativo: string) =>
  resolveWithin(storagePaths.upload, relativo);

beforeAll(async () => {
  const [cliente, tecnico] = await Promise.all([
    prisma.cliente.create({
      data: { nome: `${MARCA} Cliente`, tipoPessoa: "PF" },
      select: { id: true },
    }),
    prisma.usuario.create({
      data: { nome: `${MARCA} Tecnico`, ehTecnico: true },
      select: { id: true },
    }),
  ]);
  clienteId = cliente.id;
  tecnicoId = tecnico.id;

  const troca = (referencia: string) =>
    criarTroca({
      clienteId,
      referencia,
      responsavelId: null,
      relatoInicial: "",
      status: "ABERTA",
      destinatarioTipo: "CLIENTE",
      destinatarioNome: "",
    });

  trocaA = (await troca("Troca A")).id;
  trocaB = (await troca("Troca B")).id;

  const registro = (trocaId: string) =>
    criarRegistroTroca(trocaId, {
      dataHora: new Date("2026-08-20T10:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Registro com anexos.",
      custos: [],
    });

  registroTrocaA = (await registro(trocaA)).id;
  registroTrocaB = (await registro(trocaB)).id;

  osId = (
    await criarOrdemServico({
      clienteId,
      trocaAntecipadaId: null,
      referencia: "OS com anexos",
      responsavelId: null,
      relatoInicial: "",
      status: "ABERTA",
      itens: [
        {
          produtoId: null,
          descricaoManual: "Fechadura devolvida",
          quantidade: 1,
          diagnosticoItem: "",
          solucaoItem: "",
        },
      ],
    })
  ).id;

  registroOS = (
    await criarRegistroOS(osId, {
      dataHora: new Date("2026-08-22T10:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Registro da OS com anexos.",
      custos: [],
    })
  ).id;
});

afterAll(async () => {
  const trocaIds = [trocaA, trocaB].filter(Boolean);

  const osRegistros = await prisma.ordemServicoPosVendaRegistro.findMany({
    where: { ordemServicoId: osId },
    select: { id: true },
  });
  await prisma.ordemServicoPosVendaRegistroAnexo.deleteMany({
    where: { registroId: { in: osRegistros.map((r) => r.id) } },
  });
  await prisma.ordemServicoPosVendaRegistro.deleteMany({
    where: { ordemServicoId: osId },
  });
  await prisma.ordemServicoPosVendaItem.deleteMany({
    where: { ordemServicoId: osId },
  });
  await prisma.ordemServicoPosVendaAuditoria.deleteMany({
    where: { ordemServicoId: osId },
  });
  if (osId) {
    await prisma.ordemServicoPosVenda.deleteMany({ where: { id: osId } });
  }

  const trocaRegistros = await prisma.trocaAntecipadaRegistro.findMany({
    where: { trocaAntecipadaId: { in: trocaIds } },
    select: { id: true },
  });
  await prisma.trocaAntecipadaRegistroAnexo.deleteMany({
    where: { registroId: { in: trocaRegistros.map((r) => r.id) } },
  });
  await prisma.trocaAntecipadaRegistro.deleteMany({
    where: { trocaAntecipadaId: { in: trocaIds } },
  });
  await prisma.trocaAntecipadaAuditoria.deleteMany({
    where: { trocaAntecipadaId: { in: trocaIds } },
  });
  await prisma.trocaAntecipada.deleteMany({ where: { id: { in: trocaIds } } });

  await prisma.usuario.deleteMany({ where: { id: tecnicoId } });
  await prisma.cliente.deleteMany({ where: { id: clienteId } });

  // Resíduo de FILESYSTEM: as pastas dos agregados saem inteiras. `resolveWithin`
  // impede que este `rm -r` escape da raiz de uploads, mesmo com id adulterado.
  for (const [agregado, id] of [
    ["TROCA", trocaA],
    ["TROCA", trocaB],
    ["OS", osId],
  ] as const) {
    if (!id) continue;
    await rm(absoluto(pastaRelativaDoAgregado(agregado, id)), {
      recursive: true,
      force: true,
    });
  }

  await prisma.$disconnect();
});

/** Anexa, roda o corpo e apaga — evita vazar anexo entre testes. */
async function comAnexo(
  agregado: "TROCA" | "OS",
  agregadoId: string,
  registroId: string,
  file: File,
  corpo: (anexoId: string) => Promise<void>,
): Promise<void> {
  const anexo = await criarAnexoPosVenda(agregado, agregadoId, registroId, file);
  try {
    await corpo(anexo.id);
  } finally {
    await excluirAnexoPosVenda(agregado, agregadoId, registroId, anexo.id).catch(
      () => {},
    );
  }
}

// ---------------------------------------------------------------------------

describe("upload", () => {
  it("grava o arquivo em disco e a linha no banco", async () => {
    const anexo = await criarAnexoPosVenda(
      "TROCA",
      trocaA,
      registroTrocaA,
      arquivo("foto da peça.png", "image/png"),
    );

    // Nome ORIGINAL preservado como metadado, com acento.
    expect(anexo.nomeOriginal).toBe("foto da peça.png");
    expect(anexo.mimeType).toBe("image/png");
    expect(anexo.tamanho).toBe(PNG_1x1.byteLength);

    const linha = await prisma.trocaAntecipadaRegistroAnexo.findUnique({
      where: { id: anexo.id },
    });
    // O nome FÍSICO é gerado no servidor e a extensão vem do MIME validado —
    // o nome enviado pelo navegador não participa.
    expect(linha!.nomeArmazenado).toMatch(/^[0-9a-f]{32}\.png$/);
    expect(linha!.nomeArmazenado).not.toContain("foto");
    // Caminho RELATIVO, POSIX, sob a raiz do módulo.
    expect(linha!.caminhoRelativo).toMatch(
      new RegExp(`^pos-venda/trocas/${trocaA}/registros/${registroTrocaA}/`),
    );
    expect(linha!.caminhoRelativo).not.toContain("\\");
    // E o arquivo existe DE VERDADE.
    expect(existsSync(absoluto(linha!.caminhoRelativo))).toBe(true);

    await excluirAnexoPosVenda("TROCA", trocaA, registroTrocaA, anexo.id);
  });

  it("recusa formato fora da allowlist", async () => {
    for (const [nome, tipo] of [
      ["script.html", "text/html"],
      ["fotos.zip", "application/zip"],
      ["mapa.svg", "image/svg+xml"],
    ]) {
      await expect(
        criarAnexoPosVenda(
          "TROCA",
          trocaA,
          registroTrocaA,
          arquivo(nome, tipo),
        ),
      ).rejects.toThrow(ANEXO_TIPO_RECUSADO);
    }
    expect(await listarAnexosPosVenda("TROCA", trocaA, registroTrocaA)).toEqual(
      [],
    );
  });

  it("recusa arquivo vazio e acima de 10 MB", async () => {
    await expect(
      criarAnexoPosVenda(
        "TROCA",
        trocaA,
        registroTrocaA,
        arquivo("vazio.png", "image/png", Buffer.alloc(0)),
      ),
    ).rejects.toThrow(ANEXO_VAZIO);

    await expect(
      criarAnexoPosVenda(
        "TROCA",
        trocaA,
        registroTrocaA,
        arquivo("grande.png", "image/png", Buffer.alloc(MAX_BYTES + 1)),
      ),
    ).rejects.toThrow(ANEXO_LIMITE_EXCEDIDO);
  });

  it("recusa o 11º anexo do registro", async () => {
    const criados: string[] = [];
    try {
      for (let i = 0; i < MAX_POR_REGISTRO; i++) {
        const a = await criarAnexoPosVenda(
          "TROCA",
          trocaA,
          registroTrocaA,
          arquivo(`foto-${i}.png`, "image/png"),
        );
        criados.push(a.id);
      }
      expect(
        await listarAnexosPosVenda("TROCA", trocaA, registroTrocaA),
      ).toHaveLength(MAX_POR_REGISTRO);

      await expect(
        criarAnexoPosVenda(
          "TROCA",
          trocaA,
          registroTrocaA,
          arquivo("decimo-primeiro.png", "image/png"),
        ),
      ).rejects.toThrow(ANEXO_MAXIMO_ATINGIDO);
    } finally {
      for (const id of criados) {
        await excluirAnexoPosVenda("TROCA", trocaA, registroTrocaA, id).catch(
          () => {},
        );
      }
    }
  });

  it("recusa upload em registro que não é do agregado informado", async () => {
    await expect(
      criarAnexoPosVenda(
        "TROCA",
        trocaA,
        registroTrocaB, // registro da troca B, agregado da troca A
        arquivo("cruzado.png", "image/png"),
      ),
    ).rejects.toThrow(REGISTRO_POS_VENDA_NAO_ENCONTRADO);
  });

  it("aceita os formatos Office da allowlist", async () => {
    const casos = [
      [
        "Relatório.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      [
        "Planilha.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      ["Laudo.pdf", "application/pdf"],
    ] as const;

    for (const [nome, tipo] of casos) {
      await comAnexo(
        "OS",
        osId,
        registroOS,
        arquivo(nome, tipo, Buffer.from("conteudo", "utf8")),
        async (anexoId) => {
          const lido = await lerAnexoPosVenda("OS", osId, registroOS, anexoId);
          expect(lido?.mimeType).toBe(tipo);
          expect(lido?.nomeOriginal).toBe(nome);
        },
      );
    }
  });
});

describe("download", () => {
  it("devolve o conteúdo exato gravado", async () => {
    await comAnexo(
      "TROCA",
      trocaA,
      registroTrocaA,
      arquivo("peça.png", "image/png"),
      async (anexoId) => {
        const lido = await lerAnexoPosVenda(
          "TROCA",
          trocaA,
          registroTrocaA,
          anexoId,
        );
        expect(lido).not.toBeNull();
        expect(Buffer.from(lido!.data)).toEqual(PNG_1x1);
        expect(lido!.nomeOriginal).toBe("peça.png");
      },
    );
  });

  /**
   * A GARANTIA DO AGREGADO (ADR-0409). Pares cruzados discriminantes: o mesmo
   * anexo, alcançado por combinações erradas, devolve `null` — e `null` é
   * exatamente o que um id inexistente devolve. Não vazar a diferença é parte
   * da garantia.
   */
  it("não alcança o anexo por par cruzado", async () => {
    await comAnexo(
      "TROCA",
      trocaA,
      registroTrocaA,
      arquivo("de-A.png", "image/png"),
      async (anexoId) => {
        // Combinação certa funciona.
        expect(
          await lerAnexoPosVenda("TROCA", trocaA, registroTrocaA, anexoId),
        ).not.toBeNull();

        // Troca errada.
        expect(
          await lerAnexoPosVenda("TROCA", trocaB, registroTrocaA, anexoId),
        ).toBeNull();
        // Registro errado (da outra troca).
        expect(
          await lerAnexoPosVenda("TROCA", trocaA, registroTrocaB, anexoId),
        ).toBeNull();
        // Os dois errados.
        expect(
          await lerAnexoPosVenda("TROCA", trocaB, registroTrocaB, anexoId),
        ).toBeNull();
        // Id inexistente devolve a MESMA coisa.
        expect(
          await lerAnexoPosVenda(
            "TROCA",
            trocaA,
            registroTrocaA,
            "anexo_que_nao_existe",
          ),
        ).toBeNull();
      },
    );
  });

  /**
   * Troca e OS não se enxergam. O anexo de uma OS não é alcançável pelo caminho
   * da Troca nem com todos os ids certos — são tabelas diferentes.
   */
  it("um anexo da OS não é alcançável pelo agregado TROCA", async () => {
    await comAnexo(
      "OS",
      osId,
      registroOS,
      arquivo("da-os.png", "image/png"),
      async (anexoId) => {
        expect(
          await lerAnexoPosVenda("OS", osId, registroOS, anexoId),
        ).not.toBeNull();
        expect(
          await lerAnexoPosVenda("TROCA", osId, registroOS, anexoId),
        ).toBeNull();
      },
    );
  });
});

describe("exclusão", () => {
  it("apaga a LINHA e depois o ARQUIVO", async () => {
    const anexo = await criarAnexoPosVenda(
      "TROCA",
      trocaA,
      registroTrocaA,
      arquivo("some.png", "image/png"),
    );
    const linha = await prisma.trocaAntecipadaRegistroAnexo.findUnique({
      where: { id: anexo.id },
      select: { caminhoRelativo: true },
    });
    const caminho = absoluto(linha!.caminhoRelativo);
    expect(existsSync(caminho)).toBe(true);

    await excluirAnexoPosVenda("TROCA", trocaA, registroTrocaA, anexo.id);

    expect(
      await prisma.trocaAntecipadaRegistroAnexo.findUnique({
        where: { id: anexo.id },
      }),
    ).toBeNull();
    expect(existsSync(caminho)).toBe(false);
    expect(
      await lerAnexoPosVenda("TROCA", trocaA, registroTrocaA, anexo.id),
    ).toBeNull();
  });

  it("recusa exclusão por par cruzado, sem efeito colateral", async () => {
    await comAnexo(
      "TROCA",
      trocaA,
      registroTrocaA,
      arquivo("protegido.png", "image/png"),
      async (anexoId) => {
        await expect(
          excluirAnexoPosVenda("TROCA", trocaB, registroTrocaA, anexoId),
        ).rejects.toThrow(ANEXO_NAO_ENCONTRADO);
        await expect(
          excluirAnexoPosVenda("TROCA", trocaA, registroTrocaB, anexoId),
        ).rejects.toThrow(ANEXO_NAO_ENCONTRADO);

        // O anexo continua lá, íntegro.
        expect(
          await lerAnexoPosVenda("TROCA", trocaA, registroTrocaA, anexoId),
        ).not.toBeNull();
      },
    );
  });

  it("recusa anexo inexistente com a mesma mensagem", async () => {
    await expect(
      excluirAnexoPosVenda("TROCA", trocaA, registroTrocaA, "nao_existe"),
    ).rejects.toThrow(ANEXO_NAO_ENCONTRADO);
  });

  /**
   * Excluir o REGISTRO leva os anexos junto: as linhas por `ON DELETE CASCADE`,
   * a pasta física pelo `removerPastaDoRegistro` depois do commit.
   */
  it("excluir o registro apaga linhas e pasta dos anexos", async () => {
    const { id: registroId } = await criarRegistroTroca(trocaA, {
      dataHora: new Date("2026-08-21T10:00:00.000Z"),
      responsavelId: tecnicoId,
      relato: "Registro temporário.",
      custos: [],
    });
    const anexo = await criarAnexoPosVenda(
      "TROCA",
      trocaA,
      registroId,
      arquivo("some-junto.png", "image/png"),
    );
    const linha = await prisma.trocaAntecipadaRegistroAnexo.findUnique({
      where: { id: anexo.id },
      select: { caminhoRelativo: true },
    });
    const caminho = absoluto(linha!.caminhoRelativo);
    expect(existsSync(caminho)).toBe(true);

    await excluirRegistroTroca(trocaA, registroId);

    expect(
      await prisma.trocaAntecipadaRegistroAnexo.findUnique({
        where: { id: anexo.id },
      }),
    ).toBeNull();
    expect(existsSync(caminho)).toBe(false);
  });
});

describe("listagem", () => {
  it("lista do mais antigo para o mais novo, só do agregado certo", async () => {
    const a = await criarAnexoPosVenda(
      "TROCA",
      trocaA,
      registroTrocaA,
      arquivo("primeiro.png", "image/png"),
    );
    const b = await criarAnexoPosVenda(
      "TROCA",
      trocaA,
      registroTrocaA,
      arquivo("segundo.png", "image/png"),
    );
    try {
      const lista = await listarAnexosPosVenda("TROCA", trocaA, registroTrocaA);
      expect(lista.map((x) => x.nomeOriginal)).toEqual([
        "primeiro.png",
        "segundo.png",
      ]);

      // Outro agregado não enxerga nada disso.
      expect(
        await listarAnexosPosVenda("TROCA", trocaB, registroTrocaA),
      ).toEqual([]);
      expect(await listarAnexosPosVenda("OS", osId, registroOS)).toEqual([]);
    } finally {
      for (const id of [a.id, b.id]) {
        await excluirAnexoPosVenda("TROCA", trocaA, registroTrocaA, id).catch(
          () => {},
        );
      }
    }
  });
});
