import type { Metadata } from "next";

import { ProdutosList } from "@/features/produtos";
import { listProdutos } from "@/services/produto.service";

export const metadata: Metadata = { title: "Produtos" };

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const produtos = await listProdutos(false);
  return <ProdutosList initialRows={produtos} />;
}
