"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared";
import { SortableHeader } from "@/components/tables/sortable-header";
import { Checkbox } from "@/components/ui/checkbox";
import { useCrudList, type SortDirection } from "@/hooks/use-crud-list";
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
  /** Opcional: habilita a ação "Clonar" por linha (ex.: Produtos). */
  onClone?: (id: string) => void;

  listAction: (showInactive: boolean) => Promise<T[]>;
  deleteAction: (id: string) => Promise<ActionResult>;
  toggleAtivoAction: (id: string, ativo: boolean) => Promise<ActionResult>;

  /**
   * Opcional: quando fornecido, a posição da listagem (busca, ordenação, página,
   * "Mostrar inativos") é preservada em sessionStorage sob esta chave — o usuário
   * volta ao mesmo ponto após editar. Também habilita o destaque temporário do
   * item recém-editado (chave `crudlist:<persistKey>:highlight`).
   */
  persistKey?: string;
}

type PendingAction =
  | { type: "delete"; id: string; label: string }
  | { type: "inactivate"; id: string; label: string };

interface PersistedListState {
  search: string;
  sortKey: string | null;
  sortDir: SortDirection;
  page: number;
  showInactive: boolean;
}

/** useLayoutEffect no cliente (restaura antes da pintura → sem "flash"); no
 *  servidor cai para useEffect (evita o aviso de SSR). */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function lerEstado(persistKey?: string): PersistedListState | null {
  if (!persistKey || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`crudlist:${persistKey}`);
    return raw ? (JSON.parse(raw) as PersistedListState) : null;
  } catch {
    return null;
  }
}

function salvarEstado(persistKey: string, estado: PersistedListState): void {
  try {
    sessionStorage.setItem(`crudlist:${persistKey}`, JSON.stringify(estado));
  } catch {
    /* sessionStorage indisponível — ignora silenciosamente */
  }
}

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
  onClone,
  listAction,
  deleteAction,
  toggleAtivoAction,
  persistKey,
}: CrudListViewProps<T>) {
  const [rows, setRows] = useState<T[]>(initialRows);
  const [showInactive, setShowInactive] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [highlightId, setHighlightId] = useState<string | null>(null);

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

  // ── Task 5 — restaura a posição da listagem ao voltar da edição. Roda uma
  // única vez, antes da pintura (sem "flash"). `setSearch` zera a página, então
  // `setPage` vem por último para prevalecer.
  const restauradoRef = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (restauradoRef.current) return;
    restauradoRef.current = true;
    const estado = lerEstado(persistKey);
    if (!estado) return;
    list.setSearch(estado.search);
    list.setSort({ key: estado.sortKey, dir: estado.sortDir });
    list.setPage(estado.page);
    if (estado.showInactive) {
      setShowInactive(true);
      refresh(true); // initialRows só traz ativos — recarrega incluindo inativos
    }
  }, [persistKey]);

  // Persiste a posição a cada mudança (somente com persistKey).
  useEffect(() => {
    if (!persistKey || !restauradoRef.current) return;
    salvarEstado(persistKey, {
      search: list.search,
      sortKey: list.sort.key,
      sortDir: list.sort.dir,
      page: list.page,
      showInactive,
    });
  }, [persistKey, list.search, list.sort, list.page, showInactive]);

  // ── Task 6 — destaque temporário do item recém-editado (uma única vez).
  useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;
    const key = `crudlist:${persistKey}:highlight`;
    const id = sessionStorage.getItem(key);
    if (!id) return;
    sessionStorage.removeItem(key);
    // Leitura de fonte externa (sessionStorage) na montagem — precisa ser efeito.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightId(id);
    const timer = setTimeout(() => setHighlightId(null), 3200);
    return () => clearTimeout(timer);
  }, [persistKey]);

  const rowClassName = useCallback(
    (row: T) =>
      highlightId && getId(row) === highlightId
        ? "animate-row-highlight"
        : undefined,
    [highlightId, getId],
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
            onClone={onClone ? () => onClone(getId(row.original)) : undefined}
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
        rowClassName={rowClassName}
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
