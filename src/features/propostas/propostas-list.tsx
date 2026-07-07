"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  Copy,
  FileText,
  GitBranch,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { CrudLayout } from "@/components/app";
import { ConfirmDialog } from "@/components/shared";
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
import type {
  PropostaListItem,
  StatusProposta,
} from "@/services/proposta.service";
import { formatDateTime } from "@/utils";

import {
  cancelarPropostaAction,
  criarRevisaoAction,
  duplicarPropostaAction,
  listPropostasAction,
} from "./actions";
import { CancelarDialog } from "./cancelar-dialog";
import { MODELO_LABEL, STATUS_BADGE_VARIANT, STATUS_LABEL } from "./labels";
import type { CancelarFormValues } from "./schema";

const STATUS_ORDER: StatusProposta[] = [
  "RASCUNHO",
  "EMITIDA",
  "APROVADA",
  "REPROVADA",
  "CANCELADA",
];

const searchAccessor = (p: PropostaListItem) =>
  [
    String(p.proposalNumber),
    p.clienteNome,
    p.vendedorNome ?? "",
    STATUS_LABEL[p.status],
    MODELO_LABEL[p.modelo],
  ].join(" ");

interface RowAction {
  id: string;
  label: string;
}

export function PropostasList({
  initialRows,
}: {
  initialRows: PropostaListItem[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PropostaListItem[]>(initialRows);
  const [statusFilter, setStatusFilter] = useState<"TODOS" | StatusProposta>(
    "TODOS",
  );
  const [pendingRevisao, setPendingRevisao] = useState<RowAction | null>(null);
  const [cancelTarget, setCancelTarget] = useState<RowAction | null>(null);
  const [busy, startBusy] = useTransition();

  const rowsByStatus = useMemo(
    () =>
      statusFilter === "TODOS"
        ? rows
        : rows.filter((r) => r.status === statusFilter),
    [rows, statusFilter],
  );

  const list = useCrudList<PropostaListItem>({
    rows: rowsByStatus,
    searchAccessor,
    initialSort: { key: "proposalNumber", dir: "desc" },
  });

  const refresh = () =>
    startBusy(async () => setRows(await listPropostasAction()));

  const handleDuplicar = async (p: PropostaListItem) => {
    const result = await duplicarPropostaAction(p.id);
    if (result.success) {
      toast.success(`Proposta ${p.proposalNumber} duplicada.`);
      router.push(`/propostas/${result.data.id}`);
    } else {
      toast.error(result.error);
    }
  };

  const confirmNovaRevisao = async () => {
    if (!pendingRevisao) return;
    const result = await criarRevisaoAction(pendingRevisao.id);
    if (result.success) {
      toast.success(`${pendingRevisao.label}: nova revisão criada.`);
      refresh();
    } else {
      toast.error(result.error);
    }
    setPendingRevisao(null);
  };

  const confirmCancelar = async (values: CancelarFormValues) => {
    if (!cancelTarget) return;
    const result = await cancelarPropostaAction(cancelTarget.id, values);
    if (result.success) {
      toast.success(`${cancelTarget.label} cancelada.`);
      setCancelTarget(null);
      refresh();
    } else {
      toast.error(result.error);
    }
  };

  const columns = useMemo<ColumnDef<PropostaListItem>[]>(() => {
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
        id: "proposalNumber",
        header: () => sortHeader("proposalNumber", "Número"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.proposalNumber}</span>
        ),
      },
      {
        id: "revisaoAtual",
        header: () => (
          <span className="text-sm font-medium text-muted-foreground">
            Revisão
          </span>
        ),
        cell: ({ row }) => `Rev.${row.original.revisaoAtual ?? 0}`,
      },
      {
        id: "clienteNome",
        header: () => sortHeader("clienteNome", "Cliente"),
        cell: ({ row }) => row.original.clienteNome,
      },
      {
        id: "vendedorNome",
        header: () => (
          <span className="text-sm font-medium text-muted-foreground">
            Vendedor
          </span>
        ),
        cell: ({ row }) => row.original.vendedorNome ?? "—",
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
        header: () => sortHeader("updatedAt", "Última alteração"),
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        id: "acoes",
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => {
          const p = row.original;
          const label = `Proposta ${p.proposalNumber}`;
          const cancelada = p.status === "CANCELADA";
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
                    onClick={() => router.push(`/propostas/${p.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                    {cancelada ? "Visualizar" : "Editar"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={cancelada}
                    onClick={() => setPendingRevisao({ id: p.id, label })}
                  >
                    <GitBranch className="h-4 w-4" />
                    Nova revisão
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicar(p)}>
                    <Copy className="h-4 w-4" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={cancelada}
                    onClick={() => setCancelTarget({ id: p.id, label })}
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
      onValueChange={(v) => setStatusFilter(v as "TODOS" | StatusProposta)}
    >
      <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por status">
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
      <CrudLayout<PropostaListItem, unknown>
        title="Propostas"
        description="Propostas comerciais."
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Buscar por número, cliente, vendedor, status..."
        onNew={() => router.push("/propostas/nova")}
        newLabel="Nova proposta"
        columns={columns}
        data={list.pageRows}
        loading={busy}
        filters={statusFilterNode}
        emptyIcon={FileText}
        emptyTitle="Nenhuma proposta encontrada"
        emptyDescription="Crie a primeira proposta para começar."
        pagination={{
          page: list.page,
          pageCount: list.pageCount,
          onPageChange: list.setPage,
          totalLabel: `${list.total} proposta${list.total === 1 ? "" : "s"}`,
        }}
      />

      <ConfirmDialog
        open={pendingRevisao !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevisao(null);
        }}
        title="Criar nova revisão?"
        description={
          pendingRevisao
            ? `${pendingRevisao.label}: será criada uma nova revisão (a atual passa a ser somente leitura).`
            : undefined
        }
        confirmLabel="Criar revisão"
        onConfirm={confirmNovaRevisao}
      />

      <CancelarDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        propostaLabel={cancelTarget?.label ?? ""}
        submitting={busy}
        onConfirm={confirmCancelar}
      />
    </>
  );
}
