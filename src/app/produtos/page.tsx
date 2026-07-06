import { Package } from "lucide-react";
import type { Metadata } from "next";

import { AppPage, PageEmpty, PageHeader } from "@/components/app";

export const metadata: Metadata = { title: "Produtos" };

export default function ProdutosPage() {
  return (
    <AppPage>
      <PageHeader title="Produtos" description="Catálogo de produtos." />
      <PageEmpty
        icon={Package}
        title="Nenhum produto ainda"
        description="O catálogo de produtos será implementado nas próximas Sprints."
      />
    </AppPage>
  );
}
