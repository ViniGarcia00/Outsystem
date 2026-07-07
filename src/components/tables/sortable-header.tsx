"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { memo } from "react";

import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}

/**
 * Cabeçalho de coluna clicável para ordenação (client-side).
 * Mostra a direção atual quando a coluna está ativa.
 */
function SortableHeaderBase({
  label,
  active,
  direction,
  onClick,
}: SortableHeaderProps) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ordenar por ${label}`}
      className={cn(
        "-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-medium transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

export const SortableHeader = memo(SortableHeaderBase);
