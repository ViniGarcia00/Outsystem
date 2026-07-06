import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { AppPage, PageEmpty, PageHeader } from "@/components/app";

export const metadata: Metadata = { title: "Propostas" };

export default function PropostasPage() {
  return (
    <AppPage>
      <PageHeader
        title="Propostas"
        description="Gestão de propostas comerciais e simplificadas."
      />
      <PageEmpty
        icon={FileText}
        title="Nenhuma proposta ainda"
        description="A criação e gestão de propostas serão implementadas nas próximas Sprints."
      />
    </AppPage>
  );
}
