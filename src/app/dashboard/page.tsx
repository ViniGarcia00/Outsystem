import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageContainer, PageHeader } from "@/components/shared";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader title="Dashboard" description="Visão geral do sistema." />
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard em construção"
        description="Os indicadores e métricas serão implementados nas próximas Sprints."
      />
    </PageContainer>
  );
}
