"use client";

import { UserSquare } from "lucide-react";
import { useRouter } from "next/navigation";

import { CrudListView, StatusBadge, type CrudColumn } from "@/components/app";
import type { VendedorListItem } from "@/services/vendedor.service";

import {
  deleteVendedorAction,
  listVendedoresAction,
  toggleVendedorAtivoAction,
} from "./actions";

const columns: CrudColumn<VendedorListItem>[] = [
  {
    key: "nome",
    header: "Nome",
    cell: (v) => <span className="font-medium">{v.nome}</span>,
  },
  {
    key: "telefone",
    header: "Telefone",
    cell: (v) => v.telefone || "—",
  },
  {
    key: "email",
    header: "E-mail",
    cell: (v) => v.email || "—",
  },
  {
    key: "ativo",
    header: "Status",
    getSortValue: (v) => (v.ativo ? 1 : 0),
    cell: (v) => <StatusBadge ativo={v.ativo} />,
  },
];

export function VendedoresList({
  initialRows,
}: {
  initialRows: VendedorListItem[];
}) {
  const router = useRouter();

  return (
    <CrudListView<VendedorListItem>
      title="Vendedores"
      description="Cadastro de vendedores."
      searchPlaceholder="Buscar por nome, telefone ou e-mail..."
      emptyIcon={UserSquare}
      emptyTitle="Nenhum vendedor encontrado"
      emptyDescription="Cadastre o primeiro vendedor para começar."
      initialRows={initialRows}
      columns={columns}
      searchAccessor={(v) =>
        [v.nome, v.telefone, v.email].filter(Boolean).join(" ")
      }
      initialSortKey="nome"
      getId={(v) => v.id}
      getAtivo={(v) => v.ativo}
      getRowLabel={(v) => v.nome}
      entityLabel="vendedor"
      onNew={() => router.push("/vendedores/novo")}
      onEdit={(id) => router.push(`/vendedores/${id}`)}
      listAction={listVendedoresAction}
      deleteAction={deleteVendedorAction}
      toggleAtivoAction={toggleVendedorAtivoAction}
    />
  );
}
