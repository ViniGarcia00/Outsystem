import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";

import { AppPage, PageEmpty, PageHeader } from "@/components/app";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <AppPage>
      <PageHeader title="Dashboard" description="Visão geral do sistema." />
      <PageEmpty
        icon={LayoutDashboard}
        title="Dashboard em construção"
        description="Os indicadores e métricas serão implementados nas próximas Sprints."
      />
    </AppPage>
  );
}
