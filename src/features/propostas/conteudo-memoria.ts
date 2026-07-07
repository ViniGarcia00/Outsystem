"use client";

import { useMemo, useState } from "react";

import type { ItemDTO, SecaoDTO } from "@/services/proposta-conteudo.service";
import { ok } from "@/types";

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
      moverItem: async (itemId, direcao) => {
        mut((prev) =>
          prev.map((s) =>
            s.itens.some((it) => it.id === itemId)
              ? { ...s, itens: moverNaLista(s.itens, itemId, direcao) }
              : s,
          ),
        );
        return ok(undefined);
      },
    };
  }, [onMutate]);

  return { secoes, actions };
}
