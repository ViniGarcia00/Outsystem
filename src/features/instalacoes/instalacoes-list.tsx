"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, MoreHorizontal, Pencil, Wrench } from "lucide-react";
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
import { useCrudList } from "@/hooks";
import type { InstalacaoListItem } from "@/services/instalacao.service";
import { formatDate, formatDateTime } from "@/utils";

import { cancelarInstalacaoAction, listInstalacoesAction } from "./actions";
import { CancelarInstalacaoDialog } from "./cancelar-instalacao-dialog";
import {
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  STATUS_ORDER,
  type StatusInstalacao,
} from "./labels";

/**
 * Listagem de Instalações (Sprint 4.0.1).
 *
 * Segue o molde de `propostas-list.tsx` (CrudLayout + useCrudList), não o de
 * `CrudListView`: aquele é para cadastros com o par `ativo`/`toggleAtivoAction`,
 * e Instalação tem **status**.
 */

/**
 * Busca instantânea: número, cliente, endereço, responsável e status.
 *
 * O antigo campo "Projeto" saiu na Sprint 4.0.3 (ADR-0404) e não deixou
 * referência aqui. A normalização de acento vem de `useCrudList`, que consome a
 * fonte única `@/utils/busca`.
 *
 * O responsável agora é o NOME do Técnico vinculado (ADR-0408) — a busca
 * continua encontrando por ele, sem acento.
 */
const searchAccessor = (i: InstalacaoListItem) =>
  [
    String(i.numero),
    i.clienteNome,
    i.enderecoResumo,
    i.responsavelNome ?? "",
    STATUS_LABEL[i.status],
  ].join(" ");

interface RowAction {
  id: string;
  label: string;
}

export function InstalacoesList({
  initialRows,
}: {
  initialRows: InstalacaoListItem[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<InstalacaoListItem[]>(initialRows);
  const [statusFilter, setStatusFilter] = useState<"TODOS" | StatusInstalacao>(
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

  const list = useCrudList<InstalacaoListItem>({
    rows: rowsByStatus,
    searchAccessor,
    initialSort: { key: "numero", dir: "desc" },
  });

  const refresh = () =>
    startBusy(async () => setRows(await listInstalacoesAction()));

  const confirmCancelar = async (motivo: string) => {
    if (!cancelTarget) return;
    const result = await cancelarInstalacaoAction(cancelTarget.id, motivo);
    if (result.success) {
      toast.success(`${cancelTarget.label} cancelada.`);
      setCancelTarget(null);
      refresh();
    } else {
      toast.error(result.error);
    }
  };

  const columns = useMemo<ColumnDef<InstalacaoListItem>[]>(() => {
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
        // O número é a porta de entrada do workspace (Sprint 4.0.3, ADR-0404).
        // `next/link` renderiza um <a> de verdade: navegável por Tab, com foco
        // visível e Ctrl/Cmd+clique abrindo em nova aba. Nada disso funcionaria
        // com onClick na <tr>, que é o motivo de não fazermos assim.
        header: () => sortHeader("numero", "Número"),
        cell: ({ row }) => (
          <Link
            href={`/instalacoes/${row.original.id}`}
            aria-label={`Abrir instalação ${row.original.numero}`}
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
        id: "enderecoResumo",
        header: () => (
          <span className="text-sm font-medium text-muted-foreground">
            Endereço
          </span>
        ),
        cell: ({ row }) => row.original.enderecoResumo,
      },
      {
        id: "dataAgendada",
        header: () => sortHeader("dataAgendada", "Data"),
        cell: ({ row }) =>
          row.original.dataAgendada
            ? formatDate(row.original.dataAgendada)
            : "—",
      },
      {
        id: "responsavelNome",
        header: () => sortHeader("responsavelNome", "Responsável"),
        cell: ({ row }) => row.original.responsavelNome || "—",
      },
      {
        id: "status",
        header: () => sortHeader("status", "Status"),
        cell: ({ row }) => (
          <Badge variant={STATUS_BADGE_VARIANT[row.original.status]}>
            {STATUS_LABEL[row.original.status]}
          </Badge>
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
          const i = row.original;
          const label = `Instalação ${i.numero}`;
          const cancelada = i.status === "CANCELADA";
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
                    onClick={() => router.push(`/instalacoes/${i.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                    {cancelada ? "Visualizar" : "Abrir"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={cancelada}
                    onClick={() => setCancelTarget({ id: i.id, label })}
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
      onValueChange={(v) => setStatusFilter(v as "TODOS" | StatusInstalacao)}
    >
      <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por status">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODOS">Todos os status</SelectItem>
        {STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <CrudLayout<InstalacaoListItem, unknown>
        title="Instalações"
        description="Acompanhamento operacional das instalações."
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Buscar por número, cliente, endereço, responsável..."
        onNew={() => router.push("/instalacoes/nova")}
        newLabel="Nova instalação"
        columns={columns}
        data={list.pageRows}
        loading={busy}
        filters={statusFilterNode}
        emptyIcon={Wrench}
        emptyTitle="Nenhuma instalação encontrada"
        emptyDescription="Cadastre a primeira instalação para começar."
        pagination={{
          page: list.page,
          pageCount: list.pageCount,
          onPageChange: list.setPage,
          totalLabel: `${list.total} instalaç${list.total === 1 ? "ão" : "ões"}`,
        }}
      />

      <CancelarInstalacaoDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        instalacaoLabel={cancelTarget?.label ?? ""}
        submitting={busy}
        onConfirm={confirmCancelar}
      />
    </>
  );
}
