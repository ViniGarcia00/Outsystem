import type { Metadata } from "next";

import { OrdensServicoList } from "@/features/pos-venda";
import { listOrdensServico } from "@/services/pos-venda-os.service";

export const metadata: Metadata = { title: "Ordens de Serviço" };

export const dynamic = "force-dynamic";

export default async function OrdensServicoPage() {
  const ordens = await listOrdensServico();
  return <OrdensServicoList initialRows={ordens} />;
}
