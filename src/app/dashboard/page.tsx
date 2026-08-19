import type { Metadata } from "next";

import { AppPage, PageHeader } from "@/components/app";
import { DashboardView } from "@/features/dashboard";
import { getDashboard } from "@/services/dashboard.service";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard V1 (Sprint 4.0.3, ADR-0405).
 *
 * Server Component: busca pelo service e entrega o DTO pronto à view. Nenhum
 * componente importa Prisma — regra de ouro do ARCHITECTURE.md.
 */
export default async function DashboardPage() {
  const dados = await getDashboard();

  return (
    <AppPage>
      <PageHeader
        title="Dashboard"
        description="Situação comercial e operacional do momento."
      />
      <DashboardView dados={dados} />
    </AppPage>
  );
}
