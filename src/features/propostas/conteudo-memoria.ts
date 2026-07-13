"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ItemDTO, SecaoDTO } from "@/services/proposta-conteudo.service";
import { fail, ok } from "@/types";

import type { ConteudoActions, Direcao, ProdutoRef } from "./conteudo-handlers";

/** Contador de ids temporários (só para a montagem/edição em memória). */
let tempSeq = 0;
const novoId = () => `tmp-${tempSeq++}`;

/** Move um item da lista e renumera `ordem` (0,1,2…). */
function moverNaLista<T extends { id: string; ordem: number }>(
  lista: T[],
  id: string,
  direcao: Direcao,
): T[] {
  const idx = lista.findIndex((x) => x.id === id);
  const swap = direcao === "UP" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= lista.length) return lista;
  const novo = [...lista];
  [novo[idx], novo[swap]] = [novo[swap], novo[idx]];
  return novo.map((x, i) => ({ ...x, ordem: i }));
}

/**
 * Reordena `idOrigem` para a posição de `idDestino` na mesma lista e renumera
 * `ordem` (0,1,2…). Semântica de arraste (Drag & Drop): remove da posição atual
 * e insere no índice do destino. Pura e testável.
 */
export function reordenarNaLista<T extends { id: string; ordem: number }>(
  lista: T[],
  idOrigem: string,
  idDestino: string,
): T[] {
  const from = lista.findIndex((x) => x.id === idOrigem);
  const to = lista.findIndex((x) => x.id === idDestino);
  if (from < 0 || to < 0 || from === to) return lista;
  const novo = [...lista];
  const [movido] = novo.splice(from, 1);
  novo.splice(to, 0, movido);
  return novo.map((x, i) => ({ ...x, ordem: i }));
}

/** Monta um item em memória (snapshot do produto; valores usados na proposta). */
function criarItem(
  produto: ProdutoRef,
  quantidade: number,
  valorProduto: number,
  valorServico: number,
  ordem: number,
): ItemDTO {
  return {
    id: novoId(),
    tipo: "PRODUTO",
    produtoId: produto.id,
    codigo: produto.codigo,
    descricao: produto.descricao,
    unidade: produto.unidade,
    valorProduto,
    valorServico,
    quantidade,
    ordem,
  };
}

/**
 * Edição de conteúdo (seções + itens) 100% em memória. `onMutate` é chamado a
 * cada alteração (usado para marcar "alterações não salvas"). A persistência é
 * feita de uma vez pelo workspace ("Criar Proposta" / "Salvar Alterações").
 */
export function useConteudoMemoria(
  inicial: SecaoDTO[],
  onMutate: () => void,
): { secoes: SecaoDTO[]; actions: ConteudoActions } {
  const [secoes, setSecoes] = useState<SecaoDTO[]>(inicial);
  // Espelho do estado atual — permite checagens síncronas nas ações (ex.:
  // duplicidade) sem recriar o objeto `actions`. Atualizado após o commit.
  const secoesRef = useRef(secoes);
  useEffect(() => {
    secoesRef.current = secoes;
  }, [secoes]);

  /** Mensagem quando o produto já existe na seção (regra de não-duplicidade). */
  const PRODUTO_DUPLICADO =
    "Este produto já foi adicionado nesta seção. A mesma referência pode ser usada em outras seções.";

  const actions: ConteudoActions = useMemo(() => {
    const mut = (updater: (prev: SecaoDTO[]) => SecaoDTO[]) => {
      setSecoes(updater);
      onMutate();
    };
    return {
      adicionarSecao: async (nome) => {
        mut((prev) => [
          ...prev,
          { id: novoId(), nome: nome.trim(), ordem: prev.length, itens: [] },
        ]);
        return ok(undefined);
      },
      renomearSecao: async (secaoId, nome) => {
        mut((prev) =>
          prev.map((s) => (s.id === secaoId ? { ...s, nome: nome.trim() } : s)),
        );
        return ok(undefined);
      },
      removerSecao: async (secaoId) => {
        mut((prev) =>
          prev
            .filter((s) => s.id !== secaoId)
            .map((s, i) => ({ ...s, ordem: i })),
        );
        return ok(undefined);
      },
      moverSecao: async (secaoId, direcao) => {
        mut((prev) => moverNaLista(prev, secaoId, direcao));
        return ok(undefined);
      },
      adicionarItem: async (
        secaoId,
        produto,
        quantidade,
        valorProduto,
        valorServico,
      ) => {
        // Não permite o mesmo produto duas vezes na MESMA seção.
        const secao = secoesRef.current.find((s) => s.id === secaoId);
        if (secao?.itens.some((it) => it.produtoId === produto.id)) {
          return fail(PRODUTO_DUPLICADO);
        }
        mut((prev) =>
          prev.map((s) =>
            s.id === secaoId
              ? {
                  ...s,
                  itens: [
                    ...s.itens,
                    criarItem(
                      produto,
                      quantidade,
                      valorProduto,
                      valorServico,
                      s.itens.length,
                    ),
                  ],
                }
              : s,
          ),
        );
        return ok(undefined);
      },
      adicionarItemAvulso: async (
        produto,
        quantidade,
        valorProduto,
        valorServico,
      ) => {
        // Simplificada usa uma seção única implícita; checa a duplicidade nela.
        const secaoAlvo = secoesRef.current[0];
        if (secaoAlvo?.itens.some((it) => it.produtoId === produto.id)) {
          return fail(PRODUTO_DUPLICADO);
        }
        mut((prev) => {
          const base: SecaoDTO[] =
            prev.length > 0
              ? prev
              : [{ id: novoId(), nome: "Produtos", ordem: 0, itens: [] }];
          return base.map((s, i) =>
            i === 0
              ? {
                  ...s,
                  itens: [
                    ...s.itens,
                    criarItem(
                      produto,
                      quantidade,
                      valorProduto,
                      valorServico,
                      s.itens.length,
                    ),
                  ],
                }
              : s,
          );
        });
        return ok(undefined);
      },
      atualizarQuantidade: async (itemId, quantidade) => {
        mut((prev) =>
          prev.map((s) => ({
            ...s,
            itens: s.itens.map((it) =>
              it.id === itemId ? { ...it, quantidade } : it,
            ),
          })),
        );
        return ok(undefined);
      },
      atualizarValorProduto: async (itemId, valor) => {
        mut((prev) =>
          prev.map((s) => ({
            ...s,
            itens: s.itens.map((it) =>
              it.id === itemId ? { ...it, valorProduto: valor } : it,
            ),
          })),
        );
        return ok(undefined);
      },
      atualizarValorServico: async (itemId, valor) => {
        mut((prev) =>
          prev.map((s) => ({
            ...s,
            itens: s.itens.map((it) =>
              it.id === itemId ? { ...it, valorServico: valor } : it,
            ),
          })),
        );
        return ok(undefined);
      },
      removerItem: async (itemId) => {
        mut((prev) =>
          prev.map((s) => ({
            ...s,
            itens: s.itens
              .filter((it) => it.id !== itemId)
              .map((it, i) => ({ ...it, ordem: i })),
          })),
        );
        return ok(undefined);
      },
      reordenarItens: async (idOrigem, idDestino) => {
        mut((prev) =>
          prev.map((s) =>
            s.itens.some((it) => it.id === idOrigem) &&
            s.itens.some((it) => it.id === idDestino)
              ? { ...s, itens: reordenarNaLista(s.itens, idOrigem, idDestino) }
              : s,
          ),
        );
        return ok(undefined);
      },
    };
  }, [onMutate]);

  return { secoes, actions };
}
