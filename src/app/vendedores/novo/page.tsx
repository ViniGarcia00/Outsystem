import type { Metadata } from "next";

import { VendedorForm, vendedorDefaults } from "@/features/vendedores";

export const metadata: Metadata = { title: "Novo vendedor" };

export default function NovoVendedorPage() {
  return <VendedorForm defaultValues={vendedorDefaults} />;
}
