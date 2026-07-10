import {
  calcularResumoFinanceiro,
  calcularTotais,
  totalProdutoLinha,
  totalServicoLinha,
  totalLinha,
  type Desconto,
  type ResumoFinanceiro,
  type TotaisProposta,
} from "@/features/propostas/totais";

import type { ConfiguracaoValues } from "./configuracao.service";
import type { ModeloProposta, TipoDesconto } from "./proposta.service";

/**
 * Montagem PURA do DTO do documento comercial (PDF) — sem banco, testável.
 * Reutiliza integralmente a lógica financeira (`totais.ts`) e as regras da
 * Simplificada; nenhum cálculo é duplicado. Contrato estável entre dados e
 * apresentação; os blocos do PDF são funções puras sobre este DTO.
 */

/** Valor numérico do Prisma (Decimal) — só precisamos de `toString`. */
type Numerico = { toString(): string };
const toNumber = (v: Numerico): number => Number(v.toString());

/** Dados institucionais exibidos no rodapé + branding. */
export interface PdfEmpresa {
  nome: string;
  site: string | null;
  telefone: string | null;
  email: string | null;
  /** Caminho/URL do logo (Config). Pode ser nulo → fallback textual. */
  logo: string | null;
  /** Cores de acento (hex validado; fallback aplicado). */
  corPrimaria: string;
  corSecundaria: string;
  /** Texto institucional de fechamento (opcional). */
  textoFinal: string | null;
}

export interface PdfCliente {
  nome: string;
  telefone: string | null;
  email: string | null;
  documento: string | null;
  /** Endereço da obra = endereço do cliente, montado em linha única. */
  endereco: string | null;
}

export interface PdfItem {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorProduto: number;
  valorServico: number;
  totalProduto: number;
  totalServico: number;
  totalLinha: number;
}

export interface PdfSecao {
  nome: string;
  itens: PdfItem[];
}

/**
 * Serviço complementar para o PDF Apresentação (Sprint 2.9.3). Só o necessário
 * para o slide: tipo, descrição e o `valorTotal` JÁ calculado (produtos +
 * serviços) — nada é recalculado no PDF. O PDF Comercial ignora este campo.
 */
export interface PdfServico {
  tipo: "SOM" | "WIFI";
  descricao: string | null;
  valorTotal: number;
}

export interface PropostaPdfDTO {
  numero: number;
  /** Nome do projeto (campo da Proposta). Usado pelo PDF Apresentação. */
  nomeProjeto: string | null;
  revisao: number | null;
  /** Data de referência: emissão da revisão → emissão da proposta → criação. */
  data: Date;
  validadeDias: number;
  /** true = modelo Simplificada (oculta serviço/total serviços/previsão). */
  simplificada: boolean;
  empresa: PdfEmpresa;
  cliente: PdfCliente;
  /** Vendedor responsável (Consultor). */
  consultor: string | null;
  secoes: PdfSecao[];
  totais: TotaisProposta;
  /**
   * Serviços complementares (Sprint 2.9.3) — Som/Wi-Fi, na ordem de exibição.
   * Usados APENAS pelo PDF Apresentação; o PDF Comercial não os consome.
   */
  servicos: PdfServico[];
  /**
   * Resumo financeiro consolidado (Sprint 2.9.4) — Automação + Serviços, com o
   * Desconto incidindo sobre o Total combinado. Alimenta os slides de
   * Investimento do PDF Apresentação (08 = Subtotal da Automação; 11 = Total
   * Geral com o detalhamento). NÃO altera `totais` (usado pelo PDF Comercial).
   */
  resumo: ResumoFinanceiro;
  /** Modelagem do desconto (para anotar % na linha, quando aplicável). */
  desconto: Desconto;
  formaPagamento: string | null;
  previsaoInstalacao: string | null;
  /** Observações da proposta (campo do cabeçalho). */
  obsProposta: string | null;
  obsComerciais: string | null;
  obsTecnicas: string | null;
}

// Fonte de dados — formato desacoplado do Prisma (aceita o resultado do select).

interface FonteCliente {
  tipoPessoa: "PF" | "PJ";
  nome: string | null;
  empresa: string | null;
  cpfCnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

interface FonteItem {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: Numerico;
  valorProduto: Numerico;
  valorServico: Numerico;
}

export interface FontePropostaPdf {
  proposalNumber: number;
  nomeProjeto: string | null;
  modelo: ModeloProposta;
  validadeDias: number;
  createdAt: Date;
  emitidaAt: Date | null;
  tipoDesconto: TipoDesconto;
  valorDesconto: Numerico;
  frete: Numerico;
  formaPagamento: string | null;
  previsaoInstalacao: string | null;
  obsProposta: string | null;
  obsComerciais: string | null;
  obsTecnicas: string | null;
  cliente: FonteCliente | null;
  vendedor: { nome: string } | null;
  /**
   * Serviços complementares (Sprint 2.9.3). Opcional para compatibilidade com
   * chamadores/testes anteriores; ausência = sem serviços.
   */
  servicos?: { tipo: "SOM" | "WIFI"; descricao: string | null; valorTotal: Numerico }[];
  currentRevision: {
    revisionNumber: number;
    emittedAt: Date | null;
    secoes: { nome: string; itens: FonteItem[] }[];
  } | null;
}

const nn = (v: string | null | undefined): string | null =>
  v && v.trim() ? v.trim() : null;

/** Cor hex válida (#RGB ou #RRGGBB); caso contrário, usa o fallback. */
function corOuFallback(valor: string, fallback: string): string {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(valor.trim())
    ? valor.trim()
    : fallback;
}

const clienteDisplay = (c: FonteCliente) =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

/** Monta o endereço do cliente em uma única linha (partes ausentes omitidas). */
function montarEndereco(c: FonteCliente): string | null {
  const logradouro = [nn(c.endereco), nn(c.numero)].filter(Boolean).join(", ");
  const cidadeUf = [nn(c.cidade), nn(c.estado)].filter(Boolean).join("/");
  const partes = [
    logradouro || null,
    nn(c.complemento),
    nn(c.bairro),
    cidadeUf || null,
    nn(c.cep) ? `CEP ${nn(c.cep)}` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

/** Montagem PURA do DTO (testável sem banco). */
export function montarPropostaPdfDTO(
  p: FontePropostaPdf,
  config: ConfiguracaoValues,
): PropostaPdfDTO {
  const simplificada = p.modelo === "SIMPLIFICADA";

  const secoes: PdfSecao[] = (p.currentRevision?.secoes ?? []).map((s) => ({
    nome: s.nome,
    itens: s.itens.map((i) => {
      const calc = {
        quantidade: toNumber(i.quantidade),
        valorProduto: toNumber(i.valorProduto),
        valorServico: toNumber(i.valorServico),
      };
      return {
        codigo: i.codigo,
        descricao: i.descricao,
        unidade: i.unidade,
        quantidade: calc.quantidade,
        valorProduto: calc.valorProduto,
        valorServico: calc.valorServico,
        totalProduto: totalProdutoLinha(calc),
        totalServico: totalServicoLinha(calc),
        totalLinha: totalLinha(calc),
      };
    }),
  }));

  const desconto: Desconto = {
    tipo: p.tipoDesconto,
    valor: toNumber(p.valorDesconto),
  };
  const frete = toNumber(p.frete);
  const itensCalc = secoes.flatMap((s) => s.itens);
  const totais = calcularTotais(itensCalc, simplificada, desconto, frete);

  // Serviços complementares (Sprint 2.9.3/2.9.4) — na ordem recebida; `valorTotal`
  // já vem calculado (não recalculado aqui). O Resumo Financeiro (Automação +
  // Serviços, desconto sobre o Total) vem da fonte única `calcularResumoFinanceiro`.
  const servicos: PdfServico[] = (p.servicos ?? []).map((s) => ({
    tipo: s.tipo,
    descricao: nn(s.descricao),
    valorTotal: toNumber(s.valorTotal),
  }));
  const resumo = calcularResumoFinanceiro(
    itensCalc,
    servicos,
    simplificada,
    desconto,
    frete,
  );

  const empresa: PdfEmpresa = {
    nome: nn(config.nomeEmpresa) || nn(config.razaoSocial) || "Outmat",
    site: nn(config.site),
    telefone: nn(config.telefone) || nn(config.whatsapp),
    email: nn(config.email),
    logo: nn(config.logo),
    corPrimaria: corOuFallback(config.corPrimaria, "#14324B"),
    corSecundaria: corOuFallback(config.corSecundaria, "#6B7280"),
    textoFinal: nn(config.textoFinalProposta),
  };

  const cliente: PdfCliente = p.cliente
    ? {
        nome: clienteDisplay(p.cliente),
        telefone: nn(p.cliente.telefone),
        email: nn(p.cliente.email),
        documento: nn(p.cliente.cpfCnpj),
        endereco: montarEndereco(p.cliente),
      }
    : { nome: "—", telefone: null, email: null, documento: null, endereco: null };

  return {
    numero: p.proposalNumber,
    nomeProjeto: nn(p.nomeProjeto),
    revisao: p.currentRevision?.revisionNumber ?? null,
    data: p.currentRevision?.emittedAt ?? p.emitidaAt ?? p.createdAt,
    validadeDias: p.validadeDias,
    simplificada,
    empresa,
    cliente,
    consultor: nn(p.vendedor?.nome ?? null),
    secoes,
    totais,
    servicos,
    resumo,
    desconto,
    formaPagamento: nn(p.formaPagamento),
    previsaoInstalacao: nn(p.previsaoInstalacao),
    obsProposta: nn(p.obsProposta),
    obsComerciais: nn(p.obsComerciais),
    obsTecnicas: nn(p.obsTecnicas),
  };
}
