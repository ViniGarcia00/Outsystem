"use client";

import { Autocomplete } from "@/components/forms";
// Type-only: NÃO importar valores do service (server) neste client component.
import type { ProdutoSuggestion } from "@/services/produto.service";

import { searchProdutosAction } from "./actions";

interface ProdutoAutocompleteProps {
  /** Chamado ao escolher um produto (com dados para snapshot/pré-preenchimento). */
  onSelect: (produto: ProdutoSuggestion | null) => void;
  label?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/** Busca (autocomplete) de Produto por Código/Descrição — mesma UX do Cliente. */
export function ProdutoAutocomplete({
  onSelect,
  label = "Produto",
  autoFocus = false,
  disabled = false,
}: ProdutoAutocompleteProps) {
  return (
    <Autocomplete<ProdutoSuggestion>
      value={null}
      search={searchProdutosAction}
      // Lista mais limpa: código em destaque e descrição no estilo antes usado
      // para o valor (sublabel). O valor não é exibido no autocomplete.
      getLabel={(p) => p.codigo}
      getSublabel={(p) => p.descricao}
      onSelect={onSelect}
      label={label}
      placeholder="Digite código ou descrição..."
      autoFocus={autoFocus}
      disabled={disabled}
    />
  );
}
