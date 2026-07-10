import type { TipoDesconto } from "@/services/proposta.service";

/**
 * Cálculo dos totais da proposta — fonte ÚNICA da lógica (evita duplicação).
 * Tudo é derivado dos itens + desconto em tempo real; **os totais nunca são
 * persistidos** (só o desconto — tipo/valor — é persistido). Preparado para as
 * próximas Sprints (Frete, PDF) estenderem sem reescrever os cálculos de base.
 */

/** Item mínimo para os cálculos (estrutural — serve ao ItemDTO). */
export interface ItemCalculavel {
  quantidade: number;
  valorProduto: number;
  valorServico: number;
}

/** Desconto da proposta (modelagem separada tipo/valor). */
export interface Desconto {
  tipo: TipoDesconto;
  valor: number;
}

export const DESCONTO_ZERO: Desconto = { tipo: "VALOR", valor: 0 };

/** Total de produto da linha = Quantidade × Valor Produto. */
export const totalProdutoLinha = (item: ItemCalculavel): number =>
  item.quantidade * item.valorProduto;

/** Total de serviço da linha = Quantidade × Valor Serviço. */
export const totalServicoLinha = (item: ItemCalculavel): number =>
  item.quantidade * item.valorServico;

/** Total da linha = Total Produto + Total Serviço. */
export const totalLinha = (item: ItemCalculavel): number =>
  totalProdutoLinha(item) + totalServicoLinha(item);

/**
 * Valor de desconto efetivamente aplicado sobre um subtotal.
 * - PERCENTUAL: subtotal × (valor% clampado em 0–100).
 * - VALOR: valor (≥ 0), nunca ultrapassando o subtotal.
 */
export function aplicarDesconto(subtotal: number, desconto: Desconto): number {
  if (desconto.tipo === "PERCENTUAL") {
    const pct = Math.min(Math.max(desconto.valor, 0), 100);
    return subtotal * (pct / 100);
  }
  const valor = Math.max(desconto.valor, 0);
  return Math.min(valor, subtotal);
}

export interface TotaisProposta {
  /** Soma de todos os Total Produto. */
  totalProdutos: number;
  /** Soma de todos os Total Serviço. */
  totalServicos: number;
  /** Subtotal exibido (Simplificada = só produtos). */
  subtotal: number;
  /** Desconto efetivamente aplicado (após clamps). */
  descontoAplicado: number;
  /** Frete aplicado (≥ 0). */
  frete: number;
  /** Total da Proposta = Subtotal − Desconto + Frete (nunca negativo). */
  totalProposta: number;
}

/**
 * Consolida os totais a partir dos itens + desconto + frete (tempo real).
 * Fluxo: (Total Produtos + Total Serviços) = Subtotal → aplica Desconto →
 * adiciona Frete → Total da Proposta (nunca negativo). No modelo Simplificada, o
 * subtotal considera apenas os produtos (os valores de serviço seguem existindo
 * internamente — só a apresentação muda).
 */
export function calcularTotais(
  itens: ReadonlyArray<ItemCalculavel>,
  simplificada: boolean,
  desconto: Desconto,
  frete: number,
): TotaisProposta {
  let totalProdutos = 0;
  let totalServicos = 0;
  for (const item of itens) {
    totalProdutos += totalProdutoLinha(item);
    totalServicos += totalServicoLinha(item);
  }
  const subtotal = simplificada ? totalProdutos : totalProdutos + totalServicos;
  const descontoAplicado = aplicarDesconto(subtotal, desconto);
  const freteAplicado = Math.max(frete, 0);
  return {
    totalProdutos,
    totalServicos,
    subtotal,
    descontoAplicado,
    frete: freteAplicado,
    totalProposta: Math.max(0, subtotal - descontoAplicado + freteAplicado),
  };
}

// ---------------------------------------------------------------------------
// Resumo Financeiro (Sprint 2.9.4) — Automação + Serviços Complementares
// ---------------------------------------------------------------------------
//
// Camada sobre `calcularTotais` que consolida a proposta INTEIRA:
//   Subtotal Automação (produtos + serviços)  +  Subtotal Serviços (Som + Wi-Fi)
//   = Total  →  Desconto (INCIDE SOBRE O TOTAL)  →  Frete  →  Total Geral.
// Difere do PDF Comercial: lá o desconto incide só sobre a Automação
// (`calcularTotais`, intocado). Aqui o desconto é sobre o Total combinado
// (decisão do usuário — vale para tela, listagem e PDF Apresentação).

/** Serviço mínimo para o cálculo (estrutural — serve ao ServicoDTO). */
export interface ServicoCalculavel {
  valorTotal: number;
}

/**
 * Soma de todos os `valorTotal` dos Serviços Complementares (Som e/ou Wi-Fi).
 * Fonte ÚNICA; 0 quando não há serviços.
 */
export function calcularInvestimentoComplementar(
  servicos: ReadonlyArray<ServicoCalculavel>,
): number {
  return servicos.reduce((soma, s) => soma + s.valorTotal, 0);
}

export interface ResumoFinanceiro {
  /** Σ Total Produto (Automação). */
  produtos: number;
  /** Σ Total Serviço (Automação). */
  servicos: number;
  /** Subtotal da Automação (produtos + serviços; só produtos na Simplificada). */
  subtotalAutomacao: number;
  /** Subtotal dos Serviços Complementares (Som + Wi-Fi); 0 na Simplificada. */
  subtotalServicos: number;
  /** Total = Subtotal Automação + Subtotal Serviços (bruto, antes de desconto/frete). */
  total: number;
  /** Desconto efetivamente aplicado — INCIDE SOBRE O `total` combinado. */
  descontoAplicado: number;
  /** Frete aplicado (≥ 0). */
  frete: number;
  /** Total Geral = Total − Desconto + Frete (nunca negativo). */
  totalGeral: number;
}

/**
 * Consolida o Resumo Financeiro da proposta inteira. O desconto incide sobre o
 * **Total combinado** (Automação + Serviços). Na Simplificada os Serviços
 * Complementares não entram (subtotalServicos = 0) e o Subtotal da Automação
 * considera apenas os produtos (regra da `calcularTotais`).
 */
export function calcularResumoFinanceiro(
  itens: ReadonlyArray<ItemCalculavel>,
  servicos: ReadonlyArray<ServicoCalculavel>,
  simplificada: boolean,
  desconto: Desconto,
  frete: number,
): ResumoFinanceiro {
  const base = calcularTotais(itens, simplificada, DESCONTO_ZERO, 0);
  const subtotalServicos = simplificada
    ? 0
    : calcularInvestimentoComplementar(servicos);
  const total = base.subtotal + subtotalServicos;
  const descontoAplicado = aplicarDesconto(total, desconto);
  const freteAplicado = Math.max(frete, 0);
  return {
    produtos: base.totalProdutos,
    servicos: base.totalServicos,
    subtotalAutomacao: base.subtotal,
    subtotalServicos,
    total,
    descontoAplicado,
    frete: freteAplicado,
    totalGeral: Math.max(0, total - descontoAplicado + freteAplicado),
  };
}
