"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

import { DataTable } from "@/components/tables";
import { cn } from "@/lib/utils";

import { PagePagination, type PagePaginationProps } from "./page-pagination";
import { TableSkeleton } from "./table-skeleton";

interface PageTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  /** Conteúdo exibido quando não há dados (ex.: `<PageEmpty />`). */
  empty?: ReactNode;
  /** Mensagem simples de vazio dentro da tabela (usada se `empty` ausente). */
  emptyMessage?: string;
  pagination?: PagePaginationProps;
  className?: string;
  /** Classe extra por linha (repassada ao DataTable). */
  rowClassName?: (row: TData) => string | undefined;
}

/**
 * Área de tabela padrão: tabela (TanStack via `DataTable`), estado de
 * carregamento, estado vazio rico e paginação — tudo com o mesmo visual.
 */
export function PageTable<TData, TValue>({
  columns,
  data,
  loading = false,
  empty,
  emptyMessage,
  pagination,
  className,
  rowClassName,
}: PageTableProps<TData, TValue>) {
  const isEmpty = !loading && data.length === 0;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {loading ? (
        <TableSkeleton columns={columns.length} />
      ) : isEmpty && empty ? (
        empty
      ) : (
        <DataTable
          columns={columns}
          data={data}
          emptyMessage={emptyMessage}
          rowClassName={rowClassName}
        />
      )}

      {pagination && !isEmpty && <PagePagination {...pagination} />}
    </div>
  );
}
