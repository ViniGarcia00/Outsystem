import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageContainer, PageHeader } from "@/components/shared";

export const metadata: Metadata = { title: "Propostas" };

export default function PropostasPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Propostas"
        description="Gestão de propostas comerciais e simplificadas."
      />
      <EmptyState
        icon={FileText}
        title="Nenhuma proposta ainda"
        description="A criação e gestão de propostas serão implementadas nas próximas Sprints."
      />
    </PageContainer>
  );
}
