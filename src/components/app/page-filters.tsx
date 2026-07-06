"use client";

import type { ReactNode } from "react";

import { SearchInput } from "@/components/shared";
import { cn } from "@/lib/utils";

interface PageFiltersProps {
  /** Valor da busca (controlado pela tela). */
  searchValue?: string;
  /** Habilita o campo de busca quando fornecido. */
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Filtros adicionais (selects, toggles, etc.). */
  children?: ReactNode;
  /** Ações à direita (ex.: `<PageActions />`). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Barra de filtros padrão de uma tela: busca à esquerda, filtros adicionais e
 * ações à direita. Estrutura responsiva única para todas as listagens.
 */
export function PageFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
  actions,
  className,
}: PageFiltersProps) {
  const showSearch = onSearchChange !== undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {showSearch && (
          <SearchInput
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder ?? "Buscar..."}
            containerClassName="w-full sm:max-w-xs"
          />
        )}
        {children}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
