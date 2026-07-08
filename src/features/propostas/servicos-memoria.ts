"use client";

import { useMemo, useState } from "react";

import type { ServicoDTO, TipoServico } from "@/services/proposta-conteudo.service";

/**
 * Edição dos Serviços Complementares (Sprint 2.9.1) 100% em memória, no mesmo
 * padrão de `useConteudoMemoria`: cada alteração chama `onMutate` (marca
 * "alterações não salvas") e a persistência é feita de uma vez pelo workspace
 * ("Salvar Alterações"). Nada é gravado durante a digitação.
 *
 * `tipo` é a identidade estável (no máximo um SOM e um WIFI por proposta).
 * `valorTotal` é derivado localmente (produtos + serviços) apenas para exibição;
 * o servidor recalcula e grava o valor autoritativo.
 */

/** Patch parcial de um serviço (campos editáveis). */
export type ServicoPatch = Partial<
  Pick<ServicoDTO, "descricao" | "valorProdutos" | "valorServicos">
>;

export interface ServicosActions {
  adicionar: (tipo: TipoServico) => void;
  atualizar: (tipo: TipoServico, patch: ServicoPatch) => void;
  remover: (tipo: TipoServico) => void;
}

const total = (produtos: number, servicos: number) => produtos + servicos;

export function useServicosMemoria(
  inicial: ServicoDTO[],
  onMutate: () => void,
): { servicos: ServicoDTO[]; actions: ServicosActions } {
  const [servicos, setServicos] = useState<ServicoDTO[]>(inicial);

  const actions: ServicosActions = useMemo(() => {
    const mut = (updater: (prev: ServicoDTO[]) => ServicoDTO[]) => {
      setServicos(updater);
      onMutate();
    };
    return {
      adicionar: (tipo) => {
        mut((prev) =>
          // Nunca duplica um tipo (regra: no máximo um SOM e um WIFI).
          prev.some((s) => s.tipo === tipo)
            ? prev
            : [
                ...prev,
                {
                  id: `tmp-servico-${tipo}`,
                  tipo,
                  descricao: "",
                  valorProdutos: 0,
                  valorServicos: 0,
                  valorTotal: 0,
                  ordem: prev.length,
                },
              ],
        );
      },
      atualizar: (tipo, patch) => {
        mut((prev) =>
          prev.map((s) => {
            if (s.tipo !== tipo) return s;
            const merged = { ...s, ...patch };
            return {
              ...merged,
              valorTotal: total(merged.valorProdutos, merged.valorServicos),
            };
          }),
        );
      },
      remover: (tipo) => {
        mut((prev) =>
          prev
            .filter((s) => s.tipo !== tipo)
            .map((s, i) => ({ ...s, ordem: i })),
        );
      },
    };
  }, [onMutate]);

  return { servicos, actions };
}
