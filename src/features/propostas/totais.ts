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
// Investimento Geral (Sprint 2.9.2) — Automação + Serviços Complementares
// ---------------------------------------------------------------------------
//
// Camada ADITIVA sobre `calcularTotais`: NÃO altera o Total da Proposta (que
// segue alimentando PDF e listagem — só a Automação). Os Serviços
// Complementares (Som + Wi-Fi) entram AQUI, no nível da proposta, sem desconto
// nem frete (valores próprios, `valorTotal = produtos + serviços`, Sprint 2.9.1).

/** Serviço mínimo para o cálculo do investimento (estrutural — serve ao ServicoDTO). */
export interface ServicoCalculavel {
  valorTotal: number;
}

/**
 * Investimento dos Serviços Complementares = **soma de todos os `valorTotal`
 * existentes** (Som e/ou Wi-Fi). Fonte ÚNICA; 0 quando não há serviços.
 */
export function calcularInvestimentoComplementar(
  servicos: ReadonlyArray<ServicoCalculavel>,
): number {
  return servicos.reduce((soma, s) => soma + s.valorTotal, 0);
}

export interface InvestimentoProposta {
  /** Investimento da Automação = Total da Proposta (conteúdo − desconto + frete). */
  automacao: number;
  /** Investimento dos Serviços Complementares = Σ valorTotal (0 se não houver). */
  complementar: number;
  /** Investimento Total = Automação + Serviços Complementares. */
  total: number;
}

/**
 * Consolida o Investimento Geral: Automação + Serviços Complementares. `automacao`
 * é o `totalProposta` já derivado por `calcularTotais` (não recalculado aqui),
 * garantindo lógica financeira em um só lugar e sem regra paralela.
 */
export function calcularInvestimento(
  automacao: number,
  servicos: ReadonlyArray<ServicoCalculavel>,
): InvestimentoProposta {
  const complementar = calcularInvestimentoComplementar(servicos);
  return { automacao, complementar, total: automacao + complementar };
}
