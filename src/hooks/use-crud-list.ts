"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string | null;
  dir: SortDirection;
}

interface UseCrudListOptions<T> {
  /** Registros já carregados (o filtro Mostrar Inativos é resolvido no fetch). */
  rows: T[];
  /** Texto pesquisável do registro (concatene os campos relevantes). */
  searchAccessor: (row: T) => string;
  /** Valor de ordenação de uma coluna. Padrão: `row[key]`. */
  getSortValue?: (row: T, key: string) => unknown;
  /** Registros por página. Padrão: 20. */
  pageSize?: number;
  /** Ordenação inicial. */
  initialSort?: SortState;
  /** Busca inicial (ex.: restaurada da navegação anterior). Padrão: "". */
  initialSearch?: string;
  /** Página inicial (ex.: restaurada da navegação anterior). Padrão: 1. */
  initialPage?: number;
}

/** Normaliza texto p/ busca: minúsculas e sem acentos (busca por qualquer parte). */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean")
    return a === b ? 0 : a ? 1 : -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

  return normalize(String(a)).localeCompare(normalize(String(b)), "pt-BR");
}

/**
 * Estado de listagem client-side padrão do sistema: busca instantânea
 * (substring, sem acento), ordenação por coluna e paginação (20/pág).
 *
 * Não busca nem persiste dados — recebe `rows` prontos e devolve a página atual
 * já filtrada e ordenada, além dos controles para a UI.
 */
export function useCrudList<T>({
  rows,
  searchAccessor,
  getSortValue,
  pageSize = 20,
  initialSort = { key: null, dir: "asc" },
  initialSearch = "",
  initialPage = 1,
}: UseCrudListOptions<T>) {
  const [search, setSearchRaw] = useState(initialSearch);
  const [sort, setSort] = useState<SortState>(initialSort);
  const [page, setPage] = useState(initialPage);

  const setSearch = (value: string) => {
    setSearchRaw(value);
    setPage(1); // toda nova busca volta para a primeira página
  };

  const toggleSort = (key: string) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return rows;
    return rows.filter((row) => normalize(searchAccessor(row)).includes(query));
  }, [rows, search, searchAccessor]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const key = sort.key;
    const read = getSortValue
      ? (row: T) => getSortValue(row, key)
      : (row: T) => (row as Record<string, unknown>)[key];

    const copy = [...filtered];
    copy.sort((a, b) => {
      const result = compare(read(a), read(b));
      return sort.dir === "asc" ? result : -result;
    });
    return copy;
  }, [filtered, sort, getSortValue]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  return {
    // busca
    search,
    setSearch,
    // ordenação
    sort,
    toggleSort,
    setSort,
    // paginação
    page: safePage,
    setPage,
    pageCount,
    pageSize,
    // resultados
    pageRows,
    total,
  };
}
