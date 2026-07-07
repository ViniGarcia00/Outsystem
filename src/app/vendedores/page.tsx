import type { Metadata } from "next";

import { VendedoresList } from "@/features/vendedores";
import { listVendedores } from "@/services/vendedor.service";

export const metadata: Metadata = { title: "Vendedores" };

export const dynamic = "force-dynamic";

export default async function VendedoresPage() {
  const vendedores = await listVendedores(false);
  return <VendedoresList initialRows={vendedores} />;
}
