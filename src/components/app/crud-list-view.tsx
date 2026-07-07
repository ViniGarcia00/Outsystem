"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { useCallback, useMemo, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared";
import { SortableHeader } from "@/components/tables/sortable-header";
import { Checkbox } from "@/components/ui/checkbox";
import { useCrudList } from "@/hooks/use-crud-list";
import type { ActionResult } from "@/types";

import { CrudLayout } from "./crud-layout";
import { RowActions } from "./row-actions";

/** Descritor de coluna de listagem (o CrudListView adiciona ordenação + ações). */
export interface CrudColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Coluna ordenável? Padrão: true. */
  sortable?: boolean;
  /** Valor usado na ordenação (padrão: `row[key]`). */
  getSortValue?: (row: T) => unknown;
  className?: string;
}

interface CrudListViewProps<T> {
  title: string;
  description?: string;
  searchPlaceholder?: string;
  newLabel?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;

  initialRows: T[];
  columns: CrudColumn<T>[];
  searchAccessor: (row: T) => string;
  initialSortKey?: string;

  getId: (row: T) => string;
  getAtivo: (row: T) => boolean;
  getRowLabel: (row: T) => string;
  /** Rótulo singular do cadastro (ex.: "cliente"). */
  entityLabel: string;

  onNew: () => void;
  onEdit: (id: string) => void;

  listAction: (showInactive: boolean) => Promise<T[]>;
  deleteAction: (id: string) => Promise<ActionResult>;
  toggleAtivoAction: (id: string, ativo: boolean) => Promise<ActionResult>;
}

type PendingAction =
  | { type: "delete"; id: string; label: string }
  | { type: "inactivate"; id: string; label: string };

/**
 * Listagem CRUD padrão (client-side): busca instantânea, ordenação por coluna,
 * paginação de 20/pág, filtro "Mostrar inativos", ações por linha
 * (Editar/Inativar/Excluir) com confirmação e feedback via toast.
 *
 * Usa o `CrudLayout` — mesma moldura visual em todas as telas. Não acessa o
 * banco diretamente: recebe `initialRows` e chama as Server Actions fornecidas.
 */
export function CrudListView<T>({
  title,
  description,
  searchPlaceholder,
  newLabel,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  initialRows,
  columns,
  searchAccessor,
  initialSortKey,
  getId,
  getAtivo,
  getRowLabel,
  entityLabel,
  onNew,
  onEdit,
  listAction,
  deleteAction,
  toggleAtivoAction,
}: CrudListViewProps<T>) {
  const [rows, setRows] = useState<T[]>(initialRows);
  const [showInactive, setShowInactive] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const sortAccessors = useMemo(() => {
    const map: Record<string, (row: T) => unknown> = {};
    for (const col of columns) {
      if (col.getSortValue) map[col.key] = col.getSortValue;
    }
    return map;
  }, [columns]);

  const getSortValue = useCallback(
    (row: T, key: string) => {
      const accessor = sortAccessors[key];
      return accessor
        ? accessor(row)
        : (row as Record<string, unknown>)[key];
    },
    [sortAccessors],
  );

  const list = useCrudList<T>({
    rows,
    searchAccessor,
    getSortValue,
    initialSort: initialSortKey
      ? { key: initialSortKey, dir: "asc" }
      : undefined,
  });

  const refresh = useCallback(
    (inactive: boolean) => {
      startRefresh(async () => {
        const next = await listAction(inactive);
        setRows(next);
      });
    },
    [listAction],
  );

  const handleToggleInactive = (checked: boolean) => {
    setShowInactive(checked);
    refresh(checked);
  };

  const handleDelete = (row: T) => {
    setPending({ type: "delete", id: getId(row), label: getRowLabel(row) });
  };

  const handleToggleAtivo = async (row: T) => {
    const id = getId(row);
    const ativo = getAtivo(row);

    // Inativar exige confirmação; reativar é direto.
    if (ativo) {
      setPending({ type: "inactivate", id, label: getRowLabel(row) });
      return;
    }

    const result = await toggleAtivoAction(id, true);
    if (result.success) {
      toast.success(`${getRowLabel(row)} reativado.`);
      refresh(showInactive);
    } else {
      toast.error(result.error);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;

    if (pending.type === "delete") {
      const result = await deleteAction(pending.id);
      if (result.success) {
        toast.success(`${pending.label} excluído.`);
        refresh(showInactive);
      } else {
        toast.error(result.error);
      }
    } else {
      const result = await toggleAtivoAction(pending.id, false);
      if (result.success) {
        toast.success(`${pending.label} inativado.`);
        refresh(showInactive);
      } else {
        toast.error(result.error);
      }
    }
    setPending(null);
  };

  const columnDefs = useMemo<ColumnDef<T>[]>(() => {
    const dataColumns: ColumnDef<T>[] = columns.map((col) => ({
      id: col.key,
      header: () =>
        col.sortable === false ? (
          <span className="text-sm font-medium text-muted-foreground">
            {col.header}
          </span>
        ) : (
          <SortableHeader
            label={col.header}
            active={list.sort.key === col.key}
            direction={list.sort.dir}
            onClick={() => list.toggleSort(col.key)}
          />
        ),
      cell: ({ row }) => col.cell(row.original),
    }));

    const actionsColumn: ColumnDef<T> = {
      id: "acoes",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            ativo={getAtivo(row.original)}
            onEdit={() => onEdit(getId(row.original))}
            onDelete={() => handleDelete(row.original)}
            onToggleAtivo={() => handleToggleAtivo(row.original)}
          />
        </div>
      ),
    };

    return [...dataColumns, actionsColumn];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers estáveis o suficiente; recomputa ao mudar colunas/ordenação/inativos
  }, [columns, list.sort, showInactive]);

  const inactiveFilter = (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
      <Checkbox
        aria-label="Mostrar inativos"
        checked={showInactive}
        onCheckedChange={(checked) => handleToggleInactive(checked === true)}
      />
      Mostrar inativos
    </label>
  );

  const totalLabel = `${list.total} registro${list.total === 1 ? "" : "s"}`;

  return (
    <>
      <CrudLayout<T, unknown>
        title={title}
        description={description}
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={searchPlaceholder}
        onNew={onNew}
        newLabel={newLabel}
        columns={columnDefs}
        data={list.pageRows}
        loading={isRefreshing}
        filters={inactiveFilter}
        emptyIcon={emptyIcon}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        pagination={{
          page: list.page,
          pageCount: list.pageCount,
          onPageChange: list.setPage,
          totalLabel,
        }}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={
          pending?.type === "delete"
            ? `Excluir ${entityLabel}?`
            : `Inativar ${entityLabel}?`
        }
        description={
          pending?.type === "delete"
            ? `"${pending.label}" será excluído definitivamente. Esta ação não pode ser desfeita.`
            : pending
              ? `"${pending.label}" deixará de aparecer nas listagens padrão. Você pode reexibi-lo com "Mostrar inativos".`
              : undefined
        }
        confirmLabel={pending?.type === "delete" ? "Excluir" : "Inativar"}
        variant={pending?.type === "delete" ? "destructive" : "default"}
        onConfirm={confirmPending}
      />
    </>
  );
}
