"use client";

import { HardHat } from "lucide-react";
import { useRouter } from "next/navigation";

import { CrudListView, StatusBadge, type CrudColumn } from "@/components/app";
import type { TecnicoListItem } from "@/services/tecnico.service";

import {
  deleteTecnicoAction,
  listTecnicosAction,
  toggleTecnicoAtivoAction,
} from "./actions";

const columns: CrudColumn<TecnicoListItem>[] = [
  {
    key: "nome",
    header: "Nome",
    cell: (t) => <span className="font-medium">{t.nome}</span>,
  },
  {
    key: "ativo",
    header: "Status",
    getSortValue: (t) => (t.ativo ? 1 : 0),
    cell: (t) => <StatusBadge ativo={t.ativo} />,
  },
];

export function TecnicosList({
  initialRows,
}: {
  initialRows: TecnicoListItem[];
}) {
  const router = useRouter();

  return (
    <CrudListView<TecnicoListItem>
      title="Técnicos"
      description="Cadastro de técnicos das instalações."
      searchPlaceholder="Buscar por nome..."
      emptyIcon={HardHat}
      emptyTitle="Nenhum técnico encontrado"
      emptyDescription="Cadastre o primeiro técnico para começar."
      initialRows={initialRows}
      columns={columns}
      // A normalização de acento vem de `useCrudList`, que consome a fonte
      // única `@/utils/busca` (ADR-0402): "Joao" encontra "João".
      searchAccessor={(t) => t.nome}
      initialSortKey="nome"
      getId={(t) => t.id}
      getAtivo={(t) => t.ativo}
      getRowLabel={(t) => t.nome}
      entityLabel="técnico"
      onNew={() => router.push("/tecnicos/novo")}
      onEdit={(id) => router.push(`/tecnicos/${id}`)}
      listAction={listTecnicosAction}
      deleteAction={deleteTecnicoAction}
      toggleAtivoAction={toggleTecnicoAtivoAction}
    />
  );
}
