import type { Metadata } from "next";

import { TrocasList } from "@/features/pos-venda";
import { listTrocas } from "@/services/pos-venda-troca.service";

export const metadata: Metadata = { title: "Trocas Antecipadas" };

export const dynamic = "force-dynamic";

export default async function TrocasAntecipadasPage() {
  const trocas = await listTrocas();
  return <TrocasList initialRows={trocas} />;
}
