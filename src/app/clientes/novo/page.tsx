import type { Metadata } from "next";

import { ClienteForm, clienteDefaults } from "@/features/clientes";

export const metadata: Metadata = { title: "Novo cliente" };

export default function NovoClientePage() {
  return <ClienteForm defaultValues={clienteDefaults} />;
}
