import { describe, expect, it } from "vitest";

import type { ConfiguracaoValues } from "./configuracao.service";
import { montarPropostaPdfDTO, type FontePropostaPdf } from "./proposta-pdf.mapper";

const CONFIG_VAZIA: ConfiguracaoValues = {
  nomeEmpresa: "",
  razaoSocial: "",
  cnpj: "",
  inscricaoEstadual: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  telefone: "",
  whatsapp: "",
  email: "",
  site: "",
  logo: "",
  corPrimaria: "",
  corSecundaria: "",
  textoQuemSomos: "",
  textoFinalProposta: "",
};

function fonteBase(over: Partial<FontePropostaPdf> = {}): FontePropostaPdf {
  return {
    proposalNumber: 1042,
    modelo: "COMERCIAL",
    validadeDias: 15,
    createdAt: new Date("2026-07-07T12:00:00Z"),
    emitidaAt: null,
    tipoDesconto: "VALOR",
    valorDesconto: 0,
    frete: 0,
    formaPagamento: null,
    previsaoInstalacao: null,
    obsProposta: null,
    obsComerciais: null,
    obsTecnicas: null,
    cliente: {
      tipoPessoa: "PF",
      nome: "João da Silva",
      empresa: null,
      cpfCnpj: "529.982.247-25",
      telefone: "(11) 99999-0000",
      email: "joao@exemplo.com",
      endereco: "Rua A",
      numero: "100",
      complemento: "Apto 2",
      bairro: "Centro",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01000-000",
    },
    vendedor: { nome: "Maria Consultora" },
    currentRevision: {
      revisionNumber: 0,
      emittedAt: null,
      secoes: [
        {
          nome: "Sala",
          itens: [
            {
              codigo: "P1",
              descricao: "Produto 1",
              unidade: "UN",
              quantidade: 2,
              valorProduto: 100,
              valorServico: 30,
            },
          ],
        },
      ],
    },
    ...over,
  };
}

describe("montarPropostaPdfDTO", () => {
  it("calcula totais reutilizando o helper (Completa: produto + serviço)", () => {
    const dto = montarPropostaPdfDTO(fonteBase(), CONFIG_VAZIA);
    // 2 × 100 = 200 produtos; 2 × 30 = 60 serviços; subtotal 260.
    expect(dto.totais.totalProdutos).toBe(200);
    expect(dto.totais.totalServicos).toBe(60);
    expect(dto.totais.subtotal).toBe(260);
    expect(dto.totais.totalProposta).toBe(260);
    expect(dto.secoes[0].itens[0].totalLinha).toBe(260);
  });

  it("na Simplificada o subtotal ignora o serviço", () => {
    const dto = montarPropostaPdfDTO(
      fonteBase({ modelo: "SIMPLIFICADA" }),
      CONFIG_VAZIA,
    );
    expect(dto.simplificada).toBe(true);
    expect(dto.totais.subtotal).toBe(200); // só produtos
    expect(dto.totais.totalProposta).toBe(200);
  });

  it("aplica desconto e frete no total (Subtotal − Desconto + Frete)", () => {
    const dto = montarPropostaPdfDTO(
      fonteBase({ tipoDesconto: "VALOR", valorDesconto: 50, frete: 25 }),
      CONFIG_VAZIA,
    );
    expect(dto.totais.descontoAplicado).toBe(50);
    expect(dto.totais.frete).toBe(25);
    expect(dto.totais.totalProposta).toBe(235); // 260 − 50 + 25
  });

  it("monta o endereço do cliente em linha única", () => {
    const dto = montarPropostaPdfDTO(fonteBase(), CONFIG_VAZIA);
    expect(dto.cliente.nome).toBe("João da Silva");
    expect(dto.cliente.endereco).toContain("Rua A, 100");
    expect(dto.cliente.endereco).toContain("São Paulo/SP");
    expect(dto.cliente.endereco).toContain("CEP 01000-000");
  });

  it("usa fallback de empresa e cores quando a Config está vazia", () => {
    const dto = montarPropostaPdfDTO(fonteBase(), CONFIG_VAZIA);
    expect(dto.empresa.nome).toBe("Outmat");
    expect(dto.empresa.corPrimaria).toBe("#14324B");
    expect(dto.empresa.logo).toBeNull();
  });

  it("respeita cores válidas da Config e ignora hex inválido", () => {
    const dto = montarPropostaPdfDTO(fonteBase(), {
      ...CONFIG_VAZIA,
      corPrimaria: "#0A84FF",
      corSecundaria: "azul",
    });
    expect(dto.empresa.corPrimaria).toBe("#0A84FF");
    expect(dto.empresa.corSecundaria).toBe("#6B7280"); // fallback
  });
});
