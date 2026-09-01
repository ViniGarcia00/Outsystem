import { describe, expect, it } from "vitest";

import {
  ACCEPT_ANEXO,
  ANEXO_LIMITE_EXCEDIDO,
  ANEXO_TIPO_RECUSADO,
  ANEXO_VAZIO,
  MAX_BYTES,
  MAX_POR_REGISTRO,
  MIME_ACEITOS,
  caminhoRelativoDe,
  extensaoDe,
  nomeFisico,
  pastaRelativaDoAgregado,
  pastaRelativaDoRegistro,
  validarArquivo,
} from "./anexos";
import { MIME_ACEITOS as MIME_LIB } from "@/lib/anexos";
import { MIME_ACEITOS as MIME_INSTALACOES } from "@/features/instalacoes/anexos";

/**
 * Anexos do Pós-venda (Sprint 4.6).
 *
 * O que este arquivo prova, e que nenhum outro prova: os caminhos físicos deste
 * módulo são construídos com segmentos VALIDADOS, ficam sob a raiz `pos-venda/`
 * e **não colidem** com os das Instalações.
 *
 * A allowlist em si é testada em `features/instalacoes/anexos.test.ts` desde a
 * Sprint 4.3 — aqui o que se afirma é que ela é a MESMA (ADR-0421), não uma
 * segunda cópia.
 */

const TROCA = "ckt1a2b3c4d5e6f7g8h9i0j1";
const OS = "cko1a2b3c4d5e6f7g8h9i0j1";
const REGISTRO = "ckr1a2b3c4d5e6f7g8h9i0j1";

describe("fonte única da allowlist (ADR-0421)", () => {
  /**
   * O teste que impede a regressão que o ADR-0421 existe para evitar: três
   * módulos, UM objeto. Se alguém reintroduzir uma cópia local em qualquer
   * ponta, as referências deixam de ser idênticas e isto falha.
   */
  it("Pós-venda, Instalações e lib compartilham o MESMO objeto", () => {
    expect(MIME_ACEITOS).toBe(MIME_LIB);
    expect(MIME_INSTALACOES).toBe(MIME_LIB);
  });

  it("aceita os nove formatos homologados", () => {
    expect(Object.keys(MIME_ACEITOS).sort()).toEqual(
      [
        "application/msword",
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/webp",
      ].sort(),
    );
  });

  it("mantém os limites da spec: 10 MB por arquivo, 10 por registro", () => {
    expect(MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_POR_REGISTRO).toBe(10);
  });

  it("o accept cobre MIMEs e extensões", () => {
    expect(ACCEPT_ANEXO).toContain("application/pdf");
    expect(ACCEPT_ANEXO).toContain(".xlsx");
    expect(ACCEPT_ANEXO).toContain(".jpeg");
  });
});

describe("validarArquivo", () => {
  it("aceita um PDF dentro do limite", () => {
    expect(
      validarArquivo({ mime: "application/pdf", tamanho: 1024 }),
    ).toBeNull();
  });

  it("recusa formato fora da allowlist", () => {
    expect(validarArquivo({ mime: "application/zip", tamanho: 10 })).toBe(
      ANEXO_TIPO_RECUSADO,
    );
    expect(validarArquivo({ mime: "image/svg+xml", tamanho: 10 })).toBe(
      ANEXO_TIPO_RECUSADO,
    );
  });

  it("recusa arquivo vazio", () => {
    expect(validarArquivo({ mime: "image/png", tamanho: 0 })).toBe(ANEXO_VAZIO);
  });

  it("recusa acima de 10 MB", () => {
    expect(
      validarArquivo({ mime: "image/png", tamanho: MAX_BYTES + 1 }),
    ).toBe(ANEXO_LIMITE_EXCEDIDO);
  });

  /** Grande E de formato errado: "formato não aceito" é o que resolve. */
  it("o tipo é checado antes do tamanho", () => {
    expect(
      validarArquivo({ mime: "application/zip", tamanho: MAX_BYTES * 5 }),
    ).toBe(ANEXO_TIPO_RECUSADO);
  });
});

describe("nomeFisico", () => {
  /**
   * A garantia central do ADR-0414: a extensão vem do MIME validado, nunca do
   * nome enviado pelo navegador. `planilha.xlsx.exe` grava `.xlsx`.
   */
  it("deriva a extensão do MIME, não do nome enviado", () => {
    expect(nomeFisico("abc123", "image/jpeg")).toBe("abc123.jpg");
    expect(
      nomeFisico(
        "abc123",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe("abc123.xlsx");
  });

  it("lança para MIME fora da allowlist", () => {
    expect(() => nomeFisico("abc123", "text/html")).toThrow(
      ANEXO_TIPO_RECUSADO,
    );
  });

  it("extensaoDe devolve null fora da allowlist", () => {
    expect(extensaoDe("application/zip")).toBeNull();
    expect(extensaoDe("application/pdf")).toBe("pdf");
  });
});

describe("caminhoRelativoDe", () => {
  it("particiona a Troca sob pos-venda/trocas", () => {
    expect(caminhoRelativoDe("TROCA", TROCA, REGISTRO, "abc.pdf")).toBe(
      `pos-venda/trocas/${TROCA}/registros/${REGISTRO}/abc.pdf`,
    );
  });

  it("particiona a OS sob pos-venda/ordens-servico", () => {
    expect(caminhoRelativoDe("OS", OS, REGISTRO, "abc.xlsx")).toBe(
      `pos-venda/ordens-servico/${OS}/registros/${REGISTRO}/abc.xlsx`,
    );
  });

  /**
   * Troca e OS podem ter ids diferentes mas o caminho não pode depender disso:
   * a pasta do submódulo é o que os separa. Se os dois prefixos se fundissem,
   * um id de Troca colidiria com um de OS.
   */
  it("Troca e OS nunca produzem o mesmo caminho para o mesmo id", () => {
    const mesmoId = TROCA;
    expect(caminhoRelativoDe("TROCA", mesmoId, REGISTRO, "a.pdf")).not.toBe(
      caminhoRelativoDe("OS", mesmoId, REGISTRO, "a.pdf"),
    );
  });

  it("não colide com a raiz das Instalações", () => {
    const caminho = caminhoRelativoDe("TROCA", TROCA, REGISTRO, "a.pdf");
    expect(caminho.startsWith("pos-venda/")).toBe(true);
    expect(caminho.startsWith("instalacoes/")).toBe(false);
  });

  it("usa separador POSIX — caminho absoluto nunca é persistido", () => {
    const caminho = caminhoRelativoDe("OS", OS, REGISTRO, "a.pdf");
    expect(caminho).not.toContain("\\");
    expect(caminho.startsWith("/")).toBe(false);
    expect(caminho).not.toMatch(/^[A-Za-z]:/);
  });
});

describe("caminho: recusa de segmento perigoso", () => {
  /**
   * `resolveWithin` é a guarda FINAL nos services. Isto aqui falha antes, e
   * alto — um id adulterado nunca chega a virar caminho.
   */
  it.each([
    ["..", "travessia"],
    ["../..", "travessia composta"],
    ["a/b", "barra"],
    ["a\\b", "contrabarra"],
    ["", "vazio"],
    [".oculto", "não começa por alfanumérico"],
    ["id..x", "contém .. no meio"],
  ])("recusa o id %j (%s)", (id) => {
    expect(() => caminhoRelativoDe("TROCA", id, REGISTRO, "a.pdf")).toThrow(
      /Segmento de caminho inválido/,
    );
  });

  it("recusa nome de arquivo perigoso", () => {
    expect(() =>
      caminhoRelativoDe("TROCA", TROCA, REGISTRO, "../../etc/passwd"),
    ).toThrow(/Segmento de caminho inválido/);
  });

  it("recusa registroId perigoso", () => {
    expect(() => caminhoRelativoDe("OS", OS, "..", "a.pdf")).toThrow(
      /Segmento de caminho inválido/,
    );
  });
});

describe("pastas", () => {
  it("a pasta do registro é o prefixo do caminho do arquivo", () => {
    const pasta = pastaRelativaDoRegistro("TROCA", TROCA, REGISTRO);
    const arquivo = caminhoRelativoDe("TROCA", TROCA, REGISTRO, "a.pdf");
    expect(arquivo).toBe(`${pasta}/a.pdf`);
  });

  it("a pasta do agregado é o prefixo da pasta do registro", () => {
    const agregado = pastaRelativaDoAgregado("OS", OS);
    const registro = pastaRelativaDoRegistro("OS", OS, REGISTRO);
    expect(registro.startsWith(`${agregado}/`)).toBe(true);
  });

  it("as pastas de agregado também recusam id perigoso", () => {
    expect(() => pastaRelativaDoAgregado("TROCA", "..")).toThrow(
      /Segmento de caminho inválido/,
    );
    expect(() => pastaRelativaDoRegistro("OS", OS, "a/b")).toThrow(
      /Segmento de caminho inválido/,
    );
  });
});
