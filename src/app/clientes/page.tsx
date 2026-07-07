import type { Metadata } from "next";

import { ClientesList } from "@/features/clientes";
import { listClientes } from "@/services/cliente.service";

export const metadata: Metadata = { title: "Clientes" };

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clientes = await listClientes(false);
  return <ClientesList initialRows={clientes} />;
}
