"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, MoreHorizontal, Pencil, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { CrudLayout } from "@/components/app";
import { SortableHeader } from "@/components/tables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CancelarPosVendaDialog } from "@/features/pos-venda/cancelar-dialog";
import {
  STATUS_TROCA_BADGE,
  STATUS_TROCA_LABEL,
  STATUS_TROCA_ORDER,
  type StatusTroca,
} from "@/features/pos-venda/labels";
import type { TrocaListItem } from "@/features/pos-venda/tipos";
import { useCrudList } from "@/hooks";
import { formatCurrency, formatDateTime } from "@/utils";

import { cancelarTrocaAction, listTrocasAction } from "./actions";

/**
 * Listagem de Trocas Antecipadas (Sprint 4.6, spec §17).
 *
 * Segue o molde de `instalacoes-list.tsx` (CrudLayout + useCrudList), não o de
 * `CrudListView`: aquele é para cadastros com o par `ativo`/`toggleAtivoAction`,
 * e Troca tem **status**.
 *
 * Colunas: Número, Cliente, Referência, Status, Responsável, Retorno, Custo,
 * Última atualização.
 *
 * `Retorno` mostra `devolvido/esperado` SOMANDO todos os itens; `Custo` é o
 * acumulado DESTA troca. Os dois vêm derivados do service — nenhuma soma
 * acontece aqui.
 */

/**
 * Busca instantânea (spec §18): número, cliente, referência, responsável,
 * status e o `textoBusca` do service — que carrega relato inicial, produtos do
 * cadastro e descrições manuais.
 *
 * A normalização de acento vem de `useCrudList`, que consome a fonte única
 * `@/utils/busca` (ADR-0402). Nenhuma normalização nova foi criada.
 */
const searchAccessor = (t: TrocaListItem) =>
  [
    String(t.numero),
    t.clienteNome,
    t.referencia,
    t.responsavelNome ?? "",
    STATUS_TROCA_LABEL[t.status],
    t.textoBusca,
  ].join(" ");

interface RowAction {
  id: string;
  label: string;
}

export function TrocasList({
  initialRows,
}: {
  initialRows: TrocaListItem[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<TrocaListItem[]>(initialRows);
  const [statusFilter, setStatusFilter] = useState<"TODOS" | StatusTroca>(
    "TODOS",
  );
  const [cancelTarget, setCancelTarget] = useState<RowAction | null>(null);
  const [busy, startBusy] = useTransition();

  const rowsByStatus = useMemo(
    () =>
      statusFilter === "TODOS"
        ? rows
        : rows.filter((r) => r.status === statusFilter),
    [rows, statusFilter],
  );

  const list = useCrudList<TrocaListItem>({
    rows: rowsByStatus,
    searchAccessor,
    initialSort: { key: "numero", dir: "desc" },
  });

  const refresh = () => startBusy(async () => setRows(await listTrocasAction()));

  const confirmCancelar = async (motivo: string) => {
    if (!cancelTarget) return;
    const result = await cancelarTrocaAction(cancelTarget.id, motivo);
    if (result.success) {
      toast.success(`${cancelTarget.label} cancelada.`);
      setCancelTarget(null);
      refresh();
    } else {
      toast.error(result.error);
    }
  };

  const columns = useMemo<ColumnDef<TrocaListItem>[]>(() => {
    const sortHeader = (key: string, label: string) => (
      <SortableHeader
        label={label}
        active={list.sort.key === key}
        direction={list.sort.dir}
        onClick={() => list.toggleSort(key)}
      />
    );

    return [
      {
        id: "numero",
        header: () => sortHeader("numero", "Número"),
        // `next/link` renderiza um <a> de verdade: navegável por Tab, com foco
        // visível e Ctrl/Cmd+clique abrindo em nova aba. Nada disso funcionaria
        // com onClick na <tr>.
        cell: ({ row }) => (
          <Link
            href={`/pos-venda/trocas-antecipadas/${row.original.id}`}
            aria-label={`Abrir troca ${row.original.numero}`}
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {row.original.numero}
          </Link>
        ),
      },
      {
        id: "clienteNome",
        header: () => sortHeader("clienteNome", "Cliente"),
        cell: ({ row }) => row.original.clienteNome,
      },
      {
        id: "referencia",
        // A REFERÊNCIA é o texto principal de identificação operacional
        // (spec §7) — "Fechadura entrada social" diz o que "1001" não diz. Por
        // isso é link também: obrigar a mirar no número tornaria esta a única
        // coluna reconhecível e não clicável da linha.
        header: () => sortHeader("referencia", "Referência"),
        cell: ({ row }) => (
          <Link
            href={`/pos-venda/trocas-antecipadas/${row.original.id}`}
            aria-label={`Abrir troca ${row.original.referencia}`}
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {row.original.referencia}
          </Link>
        ),
      },
      {
        id: "status",
        header: () => sortHeader("status", "Status"),
        cell: ({ row }) => (
          <Badge variant={STATUS_TROCA_BADGE[row.original.status]}>
            {STATUS_TROCA_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        id: "responsavelNome",
        header: () => sortHeader("responsavelNome", "Responsável"),
        cell: ({ row }) => row.original.responsavelNome || "—",
      },
      {
        id: "devolvido",
        // Ordena por DEVOLVIDO, não pelo texto "5/7": ordenar a string colocaria
        // "10/10" antes de "5/7", que não é o que ninguém espera.
        header: () => sortHeader("devolvido", "Retorno"),
        cell: ({ row }) => (
          <span className="tabular-nums" data-testid="retorno">
            {row.original.devolvido}/{row.original.esperado}
          </span>
        ),
      },
      {
        id: "custoTotal",
        header: () => sortHeader("custoTotal", "Custo"),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCurrency(row.original.custoTotal)}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: () => sortHeader("updatedAt", "Última Atualização"),
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        id: "acoes",
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => {
          const t = row.original;
          const label = `Troca ${t.numero}`;
          const encerrada =
            t.status === "CANCELADA" || t.status === "FINALIZADA";
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Ações">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/pos-venda/trocas-antecipadas/${t.id}`)
                    }
                  >
                    <Pencil className="h-4 w-4" />
                    {encerrada ? "Visualizar" : "Abrir"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={t.status === "CANCELADA"}
                    onClick={() => setCancelTarget({ id: t.id, label })}
                  >
                    <Ban className="h-4 w-4" />
                    Cancelar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputa ao mudar a ordenação
  }, [list.sort]);

  const statusFilterNode = (
    <Select
      value={statusFilter}
      onValueChange={(v) => setStatusFilter(v as "TODOS" | StatusTroca)}
    >
      <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por status">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODOS">Todos os status</SelectItem>
        {STATUS_TROCA_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_TROCA_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <CrudLayout<TrocaListItem, unknown>
        title="Trocas Antecipadas"
        description="Controle de envio antecipado e devolução de produtos."
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Buscar por número, cliente, referência, produto..."
        onNew={() => router.push("/pos-venda/trocas-antecipadas/nova")}
        newLabel="Nova troca"
        columns={columns}
        data={list.pageRows}
        loading={busy}
        filters={statusFilterNode}
        emptyIcon={RefreshCcw}
        emptyTitle="Nenhuma troca antecipada encontrada"
        emptyDescription="Registre a primeira troca antecipada para começar."
        pagination={{
          page: list.page,
          pageCount: list.pageCount,
          onPageChange: list.setPage,
          totalLabel: `${list.total} troca${list.total === 1 ? "" : "s"}`,
        }}
      />

      <CancelarPosVendaDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        titulo={`Cancelar ${cancelTarget?.label ?? ""}`}
        rotuloAcao="Cancelar troca"
        submitting={busy}
        onConfirm={confirmCancelar}
      />
    </>
  );
}
