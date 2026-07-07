"use client";

import { Autocomplete } from "@/components/forms";
// Type-only: NÃO importar valores do service (server) neste client component.
import type { ClienteSuggestion } from "@/services/cliente.service";

import { searchClientesAction } from "./actions";

interface ClienteAutocompleteProps {
  value: string | null;
  initialLabel?: string | null;
  onSelect: (cliente: { id: string; label: string } | null) => void;
  label?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/** Busca (autocomplete) de Cliente por Nome/Razão Social/CPF/CNPJ. */
export function ClienteAutocomplete({
  value,
  initialLabel,
  onSelect,
  label = "Cliente",
  autoFocus = false,
  disabled = false,
}: ClienteAutocompleteProps) {
  return (
    <Autocomplete<ClienteSuggestion>
      value={value}
      initialLabel={initialLabel}
      search={searchClientesAction}
      getLabel={(c) => c.label}
      getSublabel={(c) => c.sublabel}
      onSelect={(c) => onSelect(c ? { id: c.id, label: c.label } : null)}
      label={label}
      placeholder="Digite nome, razão social, CPF ou CNPJ..."
      autoFocus={autoFocus}
      disabled={disabled}
    />
  );
}
