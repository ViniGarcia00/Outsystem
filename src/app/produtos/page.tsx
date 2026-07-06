import { Package } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageContainer, PageHeader } from "@/components/shared";

export const metadata: Metadata = { title: "Produtos" };

export default function ProdutosPage() {
  return (
    <PageContainer>
      <PageHeader title="Produtos" description="Catálogo de produtos." />
      <EmptyState
        icon={Package}
        title="Nenhum produto ainda"
        description="O catálogo de produtos será implementado nas próximas Sprints."
      />
    </PageContainer>
  );
}
