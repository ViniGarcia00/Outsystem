"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, ClipboardList, MoreHorizontal, Pencil } from "lucide-react";
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
  ORIGEM_OS_LABEL,
  STATUS_OS_BADGE,
  STATUS_OS_LABEL,
  STATUS_OS_ORDER,
  type StatusOS,
} from "@/features/pos-venda/labels";
import type { OSListItem } from "@/features/pos-venda/tipos";
import { useCrudList } from "@/hooks";
import { formatCurrency, formatDateTime } from "@/utils";

import { cancelarOrdemServicoAction, listOrdensServicoAction } from "./actions";

/**
 * Listagem de Ordens de Serviço de pós-venda (spec §38).
 *
 * Colunas: Número, Cliente, Referência, Origem, Status, Responsável, Produtos,
 * Custo, Última atualização.
 *
 * **Origem** é "Direta" ou "Troca 1001", com LINK quando há vínculo. Ela é
 * derivada de `trocaNumero` — não existe coluna `origem` no banco (ADR-0419).
 *
 * **Custo** é o acumulado DESTA OS. Nunca inclui custo da Troca vinculada: são
 * históricos independentes (spec §36).
 */

/**
 * Busca instantânea (spec §39): número, cliente, referência, responsável,
 * status e o `textoBusca` do service — que carrega relato, diagnóstico geral,
 * produtos, descrições manuais, diagnóstico/solução por item **e o número da
 * Troca vinculada**.
 */
const searchAccessor = (o: OSListItem) =>
  [
    String(o.numero),
    o.clienteNome,
    o.referencia,
    o.responsavelNome ?? "",
    STATUS_OS_LABEL[o.status],
    o.textoBusca,
  ].join(" ");

interface RowAction {
  id: string;
  label: string;
}

export function OrdensServicoList({
  initialRows,
}: {
  initialRows: OSListItem[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<OSListItem[]>(initialRows);
  const [statusFilter, setStatusFilter] = useState<"TODOS" | StatusOS>("TODOS");
  const [cancelTarget, setCancelTarget] = useState<RowAction | null>(null);
  const [busy, startBusy] = useTransition();

  const rowsByStatus = useMemo(
    () =>
      statusFilter === "TODOS"
        ? rows
        : rows.filter((r) => r.status === statusFilter),
    [rows, statusFilter],
  );

  const list = useCrudList<OSListItem>({
    rows: rowsByStatus,
    searchAccessor,
    initialSort: { key: "numero", dir: "desc" },
  });

  const refresh = () =>
    startBusy(async () => setRows(await listOrdensServicoAction()));

  const confirmCancelar = async (motivo: string) => {
    if (!cancelTarget) return;
    const result = await cancelarOrdemServicoAction(cancelTarget.id, motivo);
    if (result.success) {
      toast.success(`${cancelTarget.label} cancelada.`);
      setCancelTarget(null);
      refresh();
    } else {
      toast.error(result.error);
    }
  };

  const columns = useMemo<ColumnDef<OSListItem>[]>(() => {
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
        cell: ({ row }) => (
          <Link
            href={`/pos-venda/ordens-de-servico/${row.original.id}`}
            aria-label={`Abrir ordem de serviço ${row.original.numero}`}
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
        header: () => sortHeader("referencia", "Referência"),
        cell: ({ row }) => (
          <Link
            href={`/pos-venda/ordens-de-servico/${row.original.id}`}
            aria-label={`Abrir ordem de serviço ${row.original.referencia}`}
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {row.original.referencia}
          </Link>
        ),
      },
      {
        id: "trocaNumero",
        header: () => sortHeader("trocaNumero", "Origem"),
        // Com vínculo, a origem é um LINK para a troca: é o caminho de volta ao
        // processo que gerou esta OS, e sem ele o usuário teria de procurar o
        // número na outra listagem.
        cell: ({ row }) => {
          const { trocaId, trocaNumero } = row.original;
          if (!trocaId || trocaNumero === null) {
            return (
              <span className="text-muted-foreground">
                {ORIGEM_OS_LABEL.DIRETA}
              </span>
            );
          }
          return (
            <Link
              href={`/pos-venda/trocas-antecipadas/${trocaId}`}
              className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Troca {trocaNumero}
            </Link>
          );
        },
      },
      {
        id: "status",
        header: () => sortHeader("status", "Status"),
        cell: ({ row }) => (
          <Badge variant={STATUS_OS_BADGE[row.original.status]}>
            {STATUS_OS_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        id: "responsavelNome",
        header: () => sortHeader("responsavelNome", "Responsável"),
        cell: ({ row }) => row.original.responsavelNome || "—",
      },
      {
        id: "produtos",
        header: () => sortHeader("produtos", "Produtos"),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.produtos}</span>
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
          const o = row.original;
          const label = `OS ${o.numero}`;
          const encerrada =
            o.status === "CANCELADA" || o.status === "FINALIZADA";
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
                      router.push(`/pos-venda/ordens-de-servico/${o.id}`)
                    }
                  >
                    <Pencil className="h-4 w-4" />
                    {encerrada ? "Visualizar" : "Abrir"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={o.status === "CANCELADA"}
                    onClick={() => setCancelTarget({ id: o.id, label })}
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
      onValueChange={(v) => setStatusFilter(v as "TODOS" | StatusOS)}
    >
      <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por status">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODOS">Todos os status</SelectItem>
        {STATUS_OS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_OS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <CrudLayout<OSListItem, unknown>
        title="Ordens de Serviço"
        description="Análise, manutenção e reparo de produtos de pós-venda."
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Buscar por número, cliente, referência, produto, diagnóstico..."
        onNew={() => router.push("/pos-venda/ordens-de-servico/nova")}
        newLabel="Nova ordem de serviço"
        columns={columns}
        data={list.pageRows}
        loading={busy}
        filters={statusFilterNode}
        emptyIcon={ClipboardList}
        emptyTitle="Nenhuma ordem de serviço encontrada"
        emptyDescription="Abra a primeira ordem de serviço para começar."
        pagination={{
          page: list.page,
          pageCount: list.pageCount,
          onPageChange: list.setPage,
          totalLabel: `${list.total} ${
            list.total === 1 ? "ordem de serviço" : "ordens de serviço"
          }`,
        }}
      />

      <CancelarPosVendaDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        titulo={`Cancelar ${cancelTarget?.label ?? ""}`}
        rotuloAcao="Cancelar ordem de serviço"
        submitting={busy}
        onConfirm={confirmCancelar}
      />
    </>
  );
}
