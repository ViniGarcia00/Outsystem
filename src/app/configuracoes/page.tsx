import { Settings } from "lucide-react";
import type { Metadata } from "next";

import { AppPage, PageEmpty, PageHeader } from "@/components/app";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <AppPage>
      <PageHeader
        title="Configurações"
        description="Configurações gerais do sistema (registro único)."
      />
      <PageEmpty
        icon={Settings}
        title="Configurações em construção"
        description="A tela de configuração do sistema será implementada nas próximas Sprints."
      />
    </AppPage>
  );
}
