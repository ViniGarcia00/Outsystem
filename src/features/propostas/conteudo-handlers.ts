import type { ProdutoSuggestion } from "@/services/produto.service";
import type { ActionResult } from "@/types";

export type Direcao = "UP" | "DOWN";

/** Produto escolhido no autocomplete (dados para o snapshot em memória). */
export type ProdutoRef = ProdutoSuggestion;

/**
 * Operações de conteúdo (seções + itens) do editor. Ambos os workspaces
 * (criação e edição de proposta existente) editam **em memória** e persistem em
 * um único "Salvar"/"Criar". Estas operações mutam apenas o rascunho local; a
 * implementação é fornecida pelo hook `useConteudoMemoria`.
 */
export interface ConteudoActions {
  adicionarSecao(nome: string): Promise<ActionResult>;
  renomearSecao(secaoId: string, nome: string): Promise<ActionResult>;
  removerSecao(secaoId: string): Promise<ActionResult>;
  moverSecao(secaoId: string, direcao: Direcao): Promise<ActionResult>;
  adicionarItem(
    secaoId: string,
    produto: ProdutoRef,
    quantidade: number,
    valorProduto: number,
    valorServico: number,
  ): Promise<ActionResult>;
  /** Simplificada: adiciona direto na proposta (seção implícita). */
  adicionarItemAvulso(
    produto: ProdutoRef,
    quantidade: number,
    valorProduto: number,
    valorServico: number,
  ): Promise<ActionResult>;
  atualizarQuantidade(
    itemId: string,
    quantidade: number,
  ): Promise<ActionResult>;
  atualizarValorProduto(itemId: string, valor: number): Promise<ActionResult>;
  atualizarValorServico(itemId: string, valor: number): Promise<ActionResult>;
  removerItem(itemId: string): Promise<ActionResult>;
  /**
   * Reordena itens por Drag & Drop: move o item `idOrigem` para a posição do
   * item `idDestino` dentro da MESMA seção e renumera `ordem`. Substitui o antigo
   * `moverItem` (mover para cima/baixo). A persistência segue igual — só ao
   * salvar a proposta.
   */
  reordenarItens(idOrigem: string, idDestino: string): Promise<ActionResult>;
}
