"use client";

import { UserCog } from "lucide-react";
import { useRouter } from "next/navigation";

import { CrudListView, StatusBadge, type CrudColumn } from "@/components/app";
import type { UsuarioListItem } from "@/services/usuario.service";

import {
  deleteUsuarioAction,
  listUsuariosAction,
  toggleUsuarioAtivoAction,
} from "./actions";

/**
 * Marca de papel. Deliberadamente NÃO usa `StatusBadge`: papel não é estado de
 * atividade, e dar a ele a mesma cor faria a tabela sugerir que "sem o papel" é
 * o mesmo que "inativo" — justamente a confusão que o ADR-0410 evita.
 */
function Papel({ marcado }: { marcado: boolean }) {
  return marcado ? (
    <span aria-label="sim">✓</span>
  ) : (
    <span aria-label="não" className="text-muted-foreground">
      —
    </span>
  );
}

const columns: CrudColumn<UsuarioListItem>[] = [
  {
    key: "nome",
    header: "Nome",
    cell: (u) => <span className="font-medium">{u.nome}</span>,
  },
  {
    key: "ehVendedor",
    header: "Vendedor",
    getSortValue: (u) => (u.ehVendedor ? 1 : 0),
    cell: (u) => <Papel marcado={u.ehVendedor} />,
  },
  {
    key: "ehTecnico",
    header: "Técnico",
    getSortValue: (u) => (u.ehTecnico ? 1 : 0),
    cell: (u) => <Papel marcado={u.ehTecnico} />,
  },
  {
    key: "telefone",
    header: "Telefone",
    cell: (u) => u.telefone || "—",
  },
  {
    key: "email",
    header: "E-mail",
    cell: (u) => u.email || "—",
  },
  {
    key: "ativo",
    header: "Status",
    getSortValue: (u) => (u.ativo ? 1 : 0),
    cell: (u) => <StatusBadge ativo={u.ativo} />,
  },
];

export function UsuariosList({
  initialRows,
}: {
  initialRows: UsuarioListItem[];
}) {
  const router = useRouter();

  return (
    <CrudListView<UsuarioListItem>
      title="Usuários"
      description="Cadastro de pessoas que atuam como vendedores e técnicos."
      searchPlaceholder="Buscar por nome, telefone ou e-mail..."
      emptyIcon={UserCog}
      emptyTitle="Nenhum usuário encontrado"
      emptyDescription="Cadastre o primeiro usuário para começar."
      initialRows={initialRows}
      columns={columns}
      // A normalização de acento vem de `useCrudList`, que consome a fonte
      // única `@/utils/busca` (ADR-0402): "Joao" encontra "João".
      searchAccessor={(u) =>
        [u.nome, u.telefone, u.email].filter(Boolean).join(" ")
      }
      initialSortKey="nome"
      getId={(u) => u.id}
      getAtivo={(u) => u.ativo}
      getRowLabel={(u) => u.nome}
      entityLabel="usuário"
      onNew={() => router.push("/usuarios/novo")}
      onEdit={(id) => router.push(`/usuarios/${id}`)}
      listAction={listUsuariosAction}
      deleteAction={deleteUsuarioAction}
      toggleAtivoAction={toggleUsuarioAtivoAction}
    />
  );
}
