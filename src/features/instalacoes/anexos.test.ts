import { describe, expect, it } from "vitest";

import {
  ACCEPT_ANEXO,
  ANEXO_LIMITE_EXCEDIDO,
  ANEXO_TIPO_RECUSADO,
  ANEXO_VAZIO,
  EXTENSOES_ACEITAS,
  MAX_BYTES,
  MAX_POR_REGISTRO,
  MIME_ACEITOS,
  caminhoRelativoDe,
  extensaoDe,
  formatarTamanho,
  nomeFisico,
  sanitizarNomeOriginal,
  validarArquivo,
} from "./anexos";

/**
 * Regras puras dos anexos (Sprint 4.3, ADR-0414).
 *
 * Módulo sem IO: allowlist, limites, nome físico e caminho relativo. O que
 * depende do banco ou do disco é do service (T18) e tem suíte própria.
 */

describe("allowlist de tipos", () => {
  /**
   * A lista é EXAUSTIVA de propósito. Ampliar formatos é decisão de produto —
   * o teste falhar ao adicionar um tipo novo é o comportamento desejado.
   *
   * Sprint 4.5: Word e Excel entraram ao lado de JPG, PNG, WebP e PDF.
   */
  it("aceita exatamente imagens, PDF, Word e Excel", () => {
    expect(Object.keys(MIME_ACEITOS).sort()).toEqual([
      "application/msword",
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("mapeia cada MIME para a extensão física esperada", () => {
    expect(extensaoDe("image/jpeg")).toBe("jpg");
    expect(extensaoDe("image/png")).toBe("png");
    expect(extensaoDe("image/webp")).toBe("webp");
    expect(extensaoDe("application/pdf")).toBe("pdf");
    expect(extensaoDe("application/msword")).toBe("doc");
    expect(
      extensaoDe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("docx");
    expect(extensaoDe("application/vnd.ms-excel")).toBe("xls");
    expect(
      extensaoDe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe("xlsx");
  });

  it("recusa SVG — é HTML executável, fora de propósito", () => {
    expect(extensaoDe("image/svg+xml")).toBeNull();
  });

  it("recusa executável e arquivo compactado", () => {
    for (const mime of [
      "application/x-msdownload",
      "application/vnd.microsoft.portable-executable",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-7z-compressed",
      "application/x-rar-compressed",
    ]) {
      expect(extensaoDe(mime)).toBeNull();
    }
  });

  it("recusa tipos genéricos usados para burlar allowlist", () => {
    for (const mime of [
      "application/octet-stream",
      "text/html",
      "application/x-msdownload",
      "",
    ]) {
      expect(extensaoDe(mime)).toBeNull();
    }
  });

  /**
   * Vizinhos plausíveis dos formatos aceitos. Estão aqui porque a allowlist
   * cresceu: `text/csv` e os `.odt`/`.ods` seriam a próxima suposição de quem
   * lesse "Excel e Word" sem ler o mapa.
   */
  it("recusa formatos próximos que NÃO foram aprovados", () => {
    for (const mime of [
      "text/csv",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/rtf",
      "application/vnd.ms-powerpoint",
      "image/gif",
      "image/avif",
    ]) {
      expect(extensaoDe(mime)).toBeNull();
    }
  });

  /**
   * O `accept` soma MIMEs e extensões. Só MIME não basta: o file picker do
   * Windows filtra os formatos Office de forma mais confiável pela extensão, e
   * `.doc`/`.xls` são exatamente onde isso aparece.
   */
  it("o `accept` do input é derivado da allowlist, não escrito à mão", () => {
    expect(ACCEPT_ANEXO).toBe(
      [...Object.keys(MIME_ACEITOS), ...EXTENSOES_ACEITAS].join(","),
    );
  });

  it("o `accept` cobre as nove extensões aprovadas, com `.jpeg` ao lado de `.jpg`", () => {
    expect([...EXTENSOES_ACEITAS]).toEqual([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
    ]);
  });

  /**
   * A divergência que este teste impede: alguém adiciona um MIME e esquece a
   * extensão (ou o contrário), e o picker passa a mostrar formatos que o
   * servidor recusa — ou a esconder formatos que ele aceita.
   */
  it("toda extensão da allowlist de MIME aparece no `accept`", () => {
    for (const ext of Object.values(MIME_ACEITOS)) {
      expect(EXTENSOES_ACEITAS).toContain(`.${ext}`);
    }
  });
});

describe("nomeFisico", () => {
  /**
   * A garantia central do ADR-0414: a extensão vem da ALLOWLIST DE MIME, nunca
   * do nome que o navegador enviou. É o que impede `foto.jpg.exe` de virar um
   * arquivo executável em disco.
   */
  it("usa a extensão da allowlist, ignorando o nome enviado", () => {
    expect(nomeFisico("abc123", "image/jpeg")).toBe("abc123.jpg");
    expect(nomeFisico("abc123", "application/pdf")).toBe("abc123.pdf");
    expect(nomeFisico("abc123", "image/webp")).toBe("abc123.webp");
    expect(nomeFisico("abc123", "image/png")).toBe("abc123.png");
    expect(nomeFisico("abc123", "application/msword")).toBe("abc123.doc");
    expect(
      nomeFisico(
        "abc123",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("abc123.docx");
    expect(nomeFisico("abc123", "application/vnd.ms-excel")).toBe("abc123.xls");
    expect(
      nomeFisico(
        "abc123",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe("abc123.xlsx");
  });

  /**
   * A garantia vale para os formatos novos exatamente como valia para os
   * antigos: o `.exe` no fim do nome enviado não vira extensão física.
   */
  it("um nome como `planilha.xlsx.exe` não produz `.exe`", () => {
    const fisico = nomeFisico(
      "abc123",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(fisico).toBe("abc123.xlsx");
    expect(fisico.endsWith(".exe")).toBe(false);
  });

  it("lança para MIME fora da allowlist — não inventa extensão", () => {
    expect(() => nomeFisico("abc123", "application/x-msdownload")).toThrow();
  });
});

describe("caminhoRelativoDe", () => {
  const caminho = caminhoRelativoDe("inst1", "reg1", "abc.jpg");

  it("particiona por instalação e registro", () => {
    expect(caminho).toBe("instalacoes/inst1/registros/reg1/abc.jpg");
  });

  it("usa separadores POSIX mesmo no Windows", () => {
    expect(caminho).not.toContain("\\");
  });

  it("nunca começa com barra — é relativo à raiz de uploads", () => {
    expect(caminho.startsWith("/")).toBe(false);
  });

  it("nunca contém travessia", () => {
    expect(caminho).not.toContain("..");
  });

  /**
   * Os ids vêm de `cuid()`, gerados no servidor. A guarda existe para o caso de
   * alguém, no futuro, passar entrada externa por engano — falhar alto é melhor
   * que montar um caminho fora da raiz e depender só do `resolveWithin`.
   */
  it("recusa segmento com travessia ou separador", () => {
    expect(() => caminhoRelativoDe("../etc", "reg1", "abc.jpg")).toThrow();
    expect(() => caminhoRelativoDe("inst1", "..", "abc.jpg")).toThrow();
    expect(() => caminhoRelativoDe("inst1", "reg1", "../abc.jpg")).toThrow();
    expect(() => caminhoRelativoDe("inst/1", "reg1", "abc.jpg")).toThrow();
    expect(() => caminhoRelativoDe("inst1", "reg\\1", "abc.jpg")).toThrow();
    expect(() => caminhoRelativoDe("", "reg1", "abc.jpg")).toThrow();
  });
});

describe("validarArquivo", () => {
  it("aceita um arquivo dentro das regras", () => {
    expect(validarArquivo({ mime: "image/jpeg", tamanho: 1024 })).toBeNull();
  });

  it("aceita todos os nove MIMEs da allowlist", () => {
    for (const mime of Object.keys(MIME_ACEITOS)) {
      expect(validarArquivo({ mime, tamanho: 1024 })).toBeNull();
    }
  });

  it("recusa SVG, executável e ZIP mesmo dentro do limite de tamanho", () => {
    for (const mime of [
      "image/svg+xml",
      "application/x-msdownload",
      "application/zip",
    ]) {
      expect(validarArquivo({ mime, tamanho: 1024 })).toBe(ANEXO_TIPO_RECUSADO);
    }
  });

  it("recusa tipo fora da allowlist", () => {
    expect(validarArquivo({ mime: "text/html", tamanho: 10 })).toBe(
      ANEXO_TIPO_RECUSADO,
    );
  });

  it("recusa arquivo vazio", () => {
    expect(validarArquivo({ mime: "image/png", tamanho: 0 })).toBe(ANEXO_VAZIO);
  });

  it("aceita exatamente no limite e recusa um byte acima", () => {
    expect(
      validarArquivo({ mime: "image/png", tamanho: MAX_BYTES }),
    ).toBeNull();
    expect(validarArquivo({ mime: "image/png", tamanho: MAX_BYTES + 1 })).toBe(
      ANEXO_LIMITE_EXCEDIDO,
    );
  });

  it("o limite é 10 MB e o teto por registro é 10", () => {
    expect(MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_POR_REGISTRO).toBe(10);
  });

  it("checa o tipo ANTES do tamanho — a mensagem mais útil vem primeiro", () => {
    expect(
      validarArquivo({ mime: "text/html", tamanho: MAX_BYTES + 1 }),
    ).toBe(ANEXO_TIPO_RECUSADO);
  });
});

describe("sanitizarNomeOriginal", () => {
  it("apara espaços", () => {
    expect(sanitizarNomeOriginal("  foto.jpg  ")).toBe("foto.jpg");
  });

  it("preserva acentos e espaços internos — é texto de exibição", () => {
    expect(sanitizarNomeOriginal("Instalação — sala 2.jpg")).toBe(
      "Instalação — sala 2.jpg",
    );
  });

  /**
   * Quebra de linha num nome de arquivo poderia sujar o `Content-Disposition`.
   * O download já codifica com `filename*=UTF-8''`, mas remover caracteres de
   * controle na entrada é a defesa que não depende do consumidor lembrar.
   */
  it("remove caracteres de controle", () => {
    expect(sanitizarNomeOriginal("foto\r\n.jpg")).toBe("foto.jpg");
    expect(sanitizarNomeOriginal("foto\u0007.jpg")).toBe("foto.jpg");
  });

  it("corta em 255 caracteres", () => {
    expect(sanitizarNomeOriginal("a".repeat(300))).toHaveLength(255);
  });

  it("devolve um nome padrão quando sobra vazio", () => {
    expect(sanitizarNomeOriginal("   ")).toBe("arquivo");
    expect(sanitizarNomeOriginal("")).toBe("arquivo");
  });
});

describe("formatarTamanho", () => {
  it("mostra KB abaixo de 1 MB e MB acima", () => {
    expect(formatarTamanho(512)).toBe("0,5 KB");
    expect(formatarTamanho(1024)).toBe("1 KB");
    expect(formatarTamanho(1024 * 1024)).toBe("1 MB");
    expect(formatarTamanho(1024 * 1024 * 2.5)).toBe("2,5 MB");
  });
});
