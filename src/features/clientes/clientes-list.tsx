"use client";

import { Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { CrudListView, StatusBadge, type CrudColumn } from "@/components/app";
import type { ClienteListItem } from "@/services/cliente.service";

import {
  deleteClienteAction,
  listClientesAction,
  toggleClienteAtivoAction,
} from "./actions";

/**
 * Nome exibido conforme o tipo de pessoa:
 * PJ → Empresa (fallback Nome); PF → Nome (fallback Empresa).
 */
const displayName = (c: ClienteListItem) =>
  (c.tipoPessoa === "PJ" ? c.empresa || c.nome : c.nome || c.empresa) || "—";

const columns: CrudColumn<ClienteListItem>[] = [
  {
    key: "nome",
    header: "Nome / Empresa",
    getSortValue: displayName,
    cell: (c) => (
      <div className="flex flex-col">
        <span className="font-medium">{displayName(c)}</span>
        <span className="text-xs text-muted-foreground">
          {c.tipoPessoa === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
        </span>
      </div>
    ),
  },
  {
    key: "cpfCnpj",
    header: "CPF / CNPJ",
    cell: (c) => c.cpfCnpj || "—",
  },
  {
    key: "cidade",
    header: "Cidade / UF",
    getSortValue: (c) => c.cidade ?? "",
    cell: (c) => [c.cidade, c.estado].filter(Boolean).join(" / ") || "—",
  },
  {
    key: "telefone",
    header: "Telefone",
    cell: (c) => c.telefone || "—",
  },
  {
    key: "ativo",
    header: "Status",
    getSortValue: (c) => (c.ativo ? 1 : 0),
    cell: (c) => <StatusBadge ativo={c.ativo} />,
  },
];

export function ClientesList({
  initialRows,
}: {
  initialRows: ClienteListItem[];
}) {
  const router = useRouter();

  return (
    <CrudListView<ClienteListItem>
      title="Clientes"
      description="Cadastro de clientes."
      searchPlaceholder="Buscar por nome, empresa, documento, cidade..."
      emptyIcon={Users}
      emptyTitle="Nenhum cliente encontrado"
      emptyDescription="Cadastre o primeiro cliente para começar."
      initialRows={initialRows}
      columns={columns}
      searchAccessor={(c) =>
        [c.nome, c.empresa, c.cpfCnpj, c.cidade, c.estado, c.telefone, c.email]
          .filter(Boolean)
          .join(" ")
      }
      initialSortKey="nome"
      getId={(c) => c.id}
      getAtivo={(c) => c.ativo}
      getRowLabel={displayName}
      entityLabel="cliente"
      onNew={() => router.push("/clientes/novo")}
      onEdit={(id) => router.push(`/clientes/${id}`)}
      listAction={listClientesAction}
      deleteAction={deleteClienteAction}
      toggleAtivoAction={toggleClienteAtivoAction}
    />
  );
}
