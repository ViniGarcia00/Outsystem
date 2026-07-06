"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PagePaginationProps {
  /** Página atual (1-based). */
  page: number;
  /** Total de páginas. */
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Texto opcional à esquerda (ex.: "120 registros"). */
  totalLabel?: string;
  className?: string;
}

/**
 * Controle de paginação presentacional (sem lógica de dados). A tela é
 * responsável por informar `page`, `pageCount` e reagir a `onPageChange`.
 */
export function PagePagination({
  page,
  pageCount,
  onPageChange,
  totalLabel,
  className,
}: PagePaginationProps) {
  const total = Math.max(pageCount, 1);
  const canPrev = page > 1;
  const canNext = page < total;

  return (
    <div
      className={cn(
        "flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        {totalLabel ?? `Página ${page} de ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Próximo
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
