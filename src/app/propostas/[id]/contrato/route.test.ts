import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PropostaPdfDTO } from "@/services/proposta-pdf.mapper";

/**
 * O handler não pode ter regra de negócio: ele localiza a proposta, delega ao
 * mapper e ao renderer, e devolve o arquivo. Por isso os dois são mockados —
 * o que se testa aqui é a orquestração e a resposta HTTP, não o conteúdo do
 * .docx (coberto em `contrato.mapper.test.ts` e `render.test.ts`).
 */
vi.mock("@/services/proposta-pdf.service", () => ({
  getPropostaPdfData: vi.fn(),
}));
vi.mock("@/features/propostas/docx/contrato.mapper", () => ({
  montarContratoTemplateDTO: vi.fn(() => ({ clienteNome: "irrelevante" })),
}));
vi.mock("@/features/propostas/docx/render", () => ({
  renderContratoDocx: vi.fn(() => Buffer.from("DOCX-FALSO")),
}));

import { montarContratoTemplateDTO } from "@/features/propostas/docx/contrato.mapper";
import { renderContratoDocx } from "@/features/propostas/docx/render";
import { getPropostaPdfData } from "@/services/proposta-pdf.service";

import { GET } from "./route";

const DTO = {
  numero: 1042,
  revisao: 2,
  // Versão com que ESTA revisão foi congelada (ADR-0415). Deliberadamente
  // diferente da vigente, para provar que a rota usa a da revisão.
  templateContratoVersao: "rev3",
  cliente: { nome: "João da Silva" },
} as unknown as PropostaPdfDTO;

const CONTENT_TYPE_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const chamar = (id = "proposta-1") =>
  GET(new Request("http://localhost/propostas/proposta-1/contrato"), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPropostaPdfData).mockResolvedValue(DTO);
  vi.mocked(renderContratoDocx).mockReturnValue(Buffer.from("DOCX-FALSO"));
});

describe("GET /propostas/[id]/contrato", () => {
  it("responde 200 quando a proposta existe", async () => {
    expect((await chamar()).status).toBe(200);
  });

  it("procura a proposta pelo id da rota", async () => {
    await chamar("abc-123");
    expect(getPropostaPdfData).toHaveBeenCalledWith("abc-123");
  });

  it("responde 404 quando a proposta não existe", async () => {
    vi.mocked(getPropostaPdfData).mockResolvedValue(null);
    const res = await chamar();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Proposta não encontrada.");
  });

  it("não chama mapper nem renderer quando a proposta não existe", async () => {
    vi.mocked(getPropostaPdfData).mockResolvedValue(null);
    await chamar();
    expect(montarContratoTemplateDTO).not.toHaveBeenCalled();
    expect(renderContratoDocx).not.toHaveBeenCalled();
  });

  it("devolve o Content-Type de .docx", async () => {
    expect((await chamar()).headers.get("Content-Type")).toBe(CONTENT_TYPE_DOCX);
  });

  it("devolve o arquivo como attachment com o nome padronizado", async () => {
    const cd = (await chamar()).headers.get("Content-Disposition") ?? "";
    expect(cd).toContain("attachment;");
    expect(cd).toContain(
      encodeURIComponent("Contrato - Proposta 1042 - João da Silva Rev.2.docx"),
    );
  });

  it("não cacheia — o contrato é gerado sob demanda", async () => {
    expect((await chamar()).headers.get("Cache-Control")).toBe("no-store");
  });

  it("devolve o buffer do renderer no corpo", async () => {
    const res = await chamar();
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("DOCX-FALSO");
  });
});

describe("delegação (sem regra de negócio no handler)", () => {
  it("chama o mapper uma única vez, com o DTO que veio do loader", async () => {
    await chamar();
    expect(montarContratoTemplateDTO).toHaveBeenCalledTimes(1);
    expect(montarContratoTemplateDTO).toHaveBeenCalledWith(DTO);
  });

  it("chama o renderer uma única vez, com a saída do mapper", async () => {
    await chamar();
    expect(renderContratoDocx).toHaveBeenCalledTimes(1);
    expect(renderContratoDocx).toHaveBeenCalledWith(
      { clienteNome: "irrelevante" },
      "rev3",
    );
  });

  /**
   * A rota repassa a versão da REVISÃO, não a vigente (ADR-0415). É o que
   * impede um contrato emitido na rev3 de mudar de texto jurídico depois que a
   * rev4 entra em vigor.
   */
  it("repassa a versão do template que veio da revisão", async () => {
    vi.mocked(getPropostaPdfData).mockResolvedValue({
      ...DTO,
      templateContratoVersao: "rev4",
    } as unknown as PropostaPdfDTO);

    await chamar();
    expect(renderContratoDocx).toHaveBeenCalledWith(expect.anything(), "rev4");
  });

  it("repassa null quando a revisão não tem carimbo — o renderer decide", async () => {
    vi.mocked(getPropostaPdfData).mockResolvedValue({
      ...DTO,
      templateContratoVersao: null,
    } as unknown as PropostaPdfDTO);

    await chamar();
    expect(renderContratoDocx).toHaveBeenCalledWith(expect.anything(), null);
  });
});

describe("tratamento de erros", () => {
  it("responde 500 quando o template não pode ser carregado", async () => {
    vi.mocked(renderContratoDocx).mockImplementation(() => {
      throw new Error("ENOENT: contrato-outmat.docx não encontrado");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await chamar();
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Não foi possível gerar o contrato.");
  });

  it("responde 500 quando a renderização falha", async () => {
    vi.mocked(renderContratoDocx).mockImplementation(() => {
      throw new Error("tag {clienteNome} não resolvida");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await chamar()).status).toBe(500);
  });

  it("registra a falha no log em vez de engoli-la silenciosamente", async () => {
    const erro = new Error("falha qualquer");
    vi.mocked(renderContratoDocx).mockImplementation(() => {
      throw erro;
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await chamar();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("contrato"), erro);
  });
});
