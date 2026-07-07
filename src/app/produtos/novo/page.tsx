import type { Metadata } from "next";

import { ProdutoForm, produtoDefaults } from "@/features/produtos";

export const metadata: Metadata = { title: "Novo produto" };

export default function NovoProdutoPage() {
  return <ProdutoForm defaultValues={produtoDefaults} />;
}
