/**
 * Cálculo dos totais da proposta — fonte ÚNICA da lógica (evita duplicação).
 * Tudo é derivado dos itens em tempo real; **nada é persistido** no banco nem
 * faz parte do snapshot. Preparado para as próximas Sprints (Desconto, Frete,
 * PDF) estenderem o resultado sem reescrever os cálculos de base.
 */

/** Item mínimo para os cálculos (estrutural — serve ao ItemDTO). */
export interface ItemCalculavel {
  quantidade: number;
  valorProduto: number;
  valorServico: number;
}

/** Total de produto da linha = Quantidade × Valor Produto. */
export const totalProdutoLinha = (item: ItemCalculavel): number =>
  item.quantidade * item.valorProduto;

/** Total de serviço da linha = Quantidade × Valor Serviço. */
export const totalServicoLinha = (item: ItemCalculavel): number =>
  item.quantidade * item.valorServico;

/** Total da linha = Total Produto + Total Serviço. */
export const totalLinha = (item: ItemCalculavel): number =>
  totalProdutoLinha(item) + totalServicoLinha(item);

export interface TotaisProposta {
  /** Soma de todos os Total Produto. */
  totalProdutos: number;
  /** Soma de todos os Total Serviço. */
  totalServicos: number;
  /** Total Produtos + Total Serviços. */
  subtotal: number;
}

/** Consolida os totais a partir dos itens (tempo real; sem persistência). */
export function calcularTotais(
  itens: ReadonlyArray<ItemCalculavel>,
): TotaisProposta {
  let totalProdutos = 0;
  let totalServicos = 0;
  for (const item of itens) {
    totalProdutos += totalProdutoLinha(item);
    totalServicos += totalServicoLinha(item);
  }
  return {
    totalProdutos,
    totalServicos,
    subtotal: totalProdutos + totalServicos,
  };
}
