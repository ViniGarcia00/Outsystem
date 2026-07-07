"use client";

import { Package } from "lucide-react";
import { useRouter } from "next/navigation";

import { CrudListView, StatusBadge, type CrudColumn } from "@/components/app";
import type { ProdutoListItem } from "@/services/produto.service";
import { formatCurrency } from "@/utils";

import {
  deleteProdutoAction,
  listProdutosAction,
  toggleProdutoAtivoAction,
} from "./actions";

const columns: CrudColumn<ProdutoListItem>[] = [
  {
    key: "codigo",
    header: "Código",
    cell: (p) => <span className="font-medium">{p.codigo}</span>,
  },
  {
    key: "descricao",
    header: "Descrição",
    cell: (p) => p.descricao,
  },
  {
    key: "unidade",
    header: "Un.",
    cell: (p) => p.unidade,
  },
  {
    key: "valorProduto",
    header: "Valor produto",
    cell: (p) => formatCurrency(p.valorProduto),
  },
  {
    key: "valorServico",
    header: "Valor serviço",
    cell: (p) => formatCurrency(p.valorServico),
  },
  {
    key: "ativo",
    header: "Status",
    getSortValue: (p) => (p.ativo ? 1 : 0),
    cell: (p) => <StatusBadge ativo={p.ativo} />,
  },
];

export function ProdutosList({
  initialRows,
}: {
  initialRows: ProdutoListItem[];
}) {
  const router = useRouter();

  return (
    <CrudListView<ProdutoListItem>
      title="Produtos"
      description="Cadastro de produtos e serviços."
      searchPlaceholder="Buscar por código ou descrição..."
      emptyIcon={Package}
      emptyTitle="Nenhum produto encontrado"
      emptyDescription="Cadastre o primeiro produto para começar."
      initialRows={initialRows}
      columns={columns}
      searchAccessor={(p) => `${p.codigo} ${p.descricao}`}
      initialSortKey="codigo"
      getId={(p) => p.id}
      getAtivo={(p) => p.ativo}
      getRowLabel={(p) => p.codigo}
      entityLabel="produto"
      onNew={() => router.push("/produtos/novo")}
      onEdit={(id) => router.push(`/produtos/${id}`)}
      listAction={listProdutosAction}
      deleteAction={deleteProdutoAction}
      toggleAtivoAction={toggleProdutoAtivoAction}
    />
  );
}
