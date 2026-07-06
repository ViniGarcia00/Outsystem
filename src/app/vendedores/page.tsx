import { UserSquare } from "lucide-react";
import type { Metadata } from "next";

import { AppPage, PageEmpty, PageHeader } from "@/components/app";

export const metadata: Metadata = { title: "Vendedores" };

export default function VendedoresPage() {
  return (
    <AppPage>
      <PageHeader title="Vendedores" description="Cadastro de vendedores." />
      <PageEmpty
        icon={UserSquare}
        title="Nenhum vendedor ainda"
        description="O cadastro de vendedores será implementado nas próximas Sprints."
      />
    </AppPage>
  );
}
