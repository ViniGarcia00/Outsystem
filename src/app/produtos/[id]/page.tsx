import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProdutoForm } from "@/features/produtos";
import { getProdutoForEdit } from "@/services/produto.service";

export const metadata: Metadata = { title: "Editar produto" };

export const dynamic = "force-dynamic";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const produto = await getProdutoForEdit(id);
  if (!produto) notFound();

  return <ProdutoForm produtoId={id} defaultValues={produto} />;
}
