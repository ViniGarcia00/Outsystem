import { Users } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageContainer, PageHeader } from "@/components/shared";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <PageContainer>
      <PageHeader title="Clientes" description="Cadastro de clientes." />
      <EmptyState
        icon={Users}
        title="Nenhum cliente ainda"
        description="O cadastro de clientes será implementado nas próximas Sprints."
      />
    </PageContainer>
  );
}
