import { UserSquare } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageContainer, PageHeader } from "@/components/shared";

export const metadata: Metadata = { title: "Vendedores" };

export default function VendedoresPage() {
  return (
    <PageContainer>
      <PageHeader title="Vendedores" description="Cadastro de vendedores." />
      <EmptyState
        icon={UserSquare}
        title="Nenhum vendedor ainda"
        description="O cadastro de vendedores será implementado nas próximas Sprints."
      />
    </PageContainer>
  );
}
