import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClienteForm } from "@/features/clientes";
import { getClienteForEdit } from "@/services/cliente.service";

export const metadata: Metadata = { title: "Editar cliente" };

export const dynamic = "force-dynamic";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await getClienteForEdit(id);
  if (!cliente) notFound();

  return <ClienteForm clienteId={id} defaultValues={cliente} />;
}
