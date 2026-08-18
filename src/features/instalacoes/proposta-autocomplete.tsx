"use client";

import { Autocomplete } from "@/components/forms";
// Type-only: NÃO importar valores do service (server) neste client component.
import type { PropostaSuggestion } from "@/services/instalacao.service";

import { searchPropostasAction } from "./actions";

interface PropostaAutocompleteProps {
  value: string | null;
  initialLabel?: string | null;
  onSelect: (proposta: { id: string; label: string } | null) => void;
  disabled?: boolean;
}

/**
 * Vínculo OPCIONAL com uma Proposta (Sprint 4.0.1).
 * Associar NÃO importa itens, não sincroniza e não recalcula nada.
 */
export function PropostaAutocomplete({
  value,
  initialLabel,
  onSelect,
  disabled = false,
}: PropostaAutocompleteProps) {
  return (
    <Autocomplete<PropostaSuggestion>
      value={value}
      initialLabel={initialLabel}
      search={searchPropostasAction}
      getLabel={(p) => p.label}
      getSublabel={(p) => p.sublabel}
      onSelect={(p) => onSelect(p ? { id: p.id, label: p.label } : null)}
      label="Proposta relacionada"
      placeholder="Número, cliente ou projeto (opcional)"
      minChars={2}
      disabled={disabled}
    />
  );
}
