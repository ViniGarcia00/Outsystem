import { Users } from "lucide-react";
import type { Metadata } from "next";

import { AppPage, PageEmpty, PageHeader } from "@/components/app";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <AppPage>
      <PageHeader title="Clientes" description="Cadastro de clientes." />
      <PageEmpty
        icon={Users}
        title="Nenhum cliente ainda"
        description="O cadastro de clientes será implementado nas próximas Sprints."
      />
    </AppPage>
  );
}
