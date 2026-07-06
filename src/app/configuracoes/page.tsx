import { Settings } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageContainer, PageHeader } from "@/components/shared";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        description="Configurações gerais do sistema (registro único)."
      />
      <EmptyState
        icon={Settings}
        title="Configurações em construção"
        description="A tela de configuração do sistema será implementada nas próximas Sprints."
      />
    </PageContainer>
  );
}
