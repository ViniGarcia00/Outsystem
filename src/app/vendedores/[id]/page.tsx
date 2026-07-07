import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VendedorForm } from "@/features/vendedores";
import { getVendedorForEdit } from "@/services/vendedor.service";

export const metadata: Metadata = { title: "Editar vendedor" };

export const dynamic = "force-dynamic";

export default async function EditarVendedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendedor = await getVendedorForEdit(id);
  if (!vendedor) notFound();

  return <VendedorForm vendedorId={id} defaultValues={vendedor} />;
}
