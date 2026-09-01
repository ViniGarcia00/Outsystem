import type { Metadata } from "next";

import { PosVendaHub } from "@/features/pos-venda";

export const metadata: Metadata = { title: "Pós-venda" };

export default function PosVendaPage() {
  return <PosVendaHub />;
}
