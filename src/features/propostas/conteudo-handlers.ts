import type { ActionResult } from "@/types";

import {
  adicionarItemAction,
  adicionarItemAvulsoAction,
  adicionarSecaoAction,
  atualizarQuantidadeAction,
  atualizarValorUnitarioAction,
  moverItemAction,
  moverSecaoAction,
  removerItemAction,
  removerSecaoAction,
  renomearSecaoAction,
} from "./conteudo-actions";

export type Direcao = "UP" | "DOWN";

/**
 * Operações de conteúdo (seções + itens) usadas pelo editor. Abstrai a origem:
 * - `serverConteudoActions`: proposta já persistida (Server Actions + auto-save);
 * - implementação em memória: workspace de criação (`NovaPropostaWorkspace`),
 *   antes de a proposta existir no banco.
 * Assim o mesmo editor (`ConteudoEditor`/`SecaoCard`) serve aos dois fluxos.
 */
export interface ConteudoActions {
  adicionarSecao(nome: string): Promise<ActionResult>;
  renomearSecao(secaoId: string, nome: string): Promise<ActionResult>;
  removerSecao(secaoId: string): Promise<ActionResult>;
  moverSecao(secaoId: string, direcao: Direcao): Promise<ActionResult>;
  adicionarItem(
    secaoId: string,
    produtoId: string,
    quantidade: number,
    valorUnitario?: number,
  ): Promise<ActionResult>;
  /** Simplificada: adiciona direto na proposta (seção implícita). */
  adicionarItemAvulso(
    produtoId: string,
    quantidade: number,
    valorUnitario?: number,
  ): Promise<ActionResult>;
  atualizarQuantidade(
    itemId: string,
    quantidade: number,
  ): Promise<ActionResult>;
  atualizarValorUnitario(itemId: string, valor: number): Promise<ActionResult>;
  removerItem(itemId: string): Promise<ActionResult>;
  moverItem(itemId: string, direcao: Direcao): Promise<ActionResult>;
}

/** Handlers ligados às Server Actions de uma proposta persistida. */
export function serverConteudoActions(propostaId: string): ConteudoActions {
  return {
    adicionarSecao: (nome) => adicionarSecaoAction(propostaId, nome),
    renomearSecao: (secaoId, nome) => renomearSecaoAction(secaoId, nome),
    removerSecao: (secaoId) => removerSecaoAction(secaoId),
    moverSecao: (secaoId, direcao) => moverSecaoAction(secaoId, direcao),
    adicionarItem: (secaoId, produtoId, quantidade, valorUnitario) =>
      adicionarItemAction(secaoId, produtoId, quantidade, valorUnitario),
    adicionarItemAvulso: (produtoId, quantidade, valorUnitario) =>
      adicionarItemAvulsoAction(propostaId, produtoId, quantidade, valorUnitario),
    atualizarQuantidade: (itemId, quantidade) =>
      atualizarQuantidadeAction(itemId, quantidade),
    atualizarValorUnitario: (itemId, valor) =>
      atualizarValorUnitarioAction(itemId, valor),
    removerItem: (itemId) => removerItemAction(itemId),
    moverItem: (itemId, direcao) => moverItemAction(itemId, direcao),
  };
}
