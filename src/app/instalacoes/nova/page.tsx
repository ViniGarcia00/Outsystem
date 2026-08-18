import type { Metadata } from "next";

import { NovaInstalacaoForm } from "@/features/instalacoes";

export const metadata: Metadata = { title: "Nova instalação" };

export const dynamic = "force-dynamic";

export default function NovaInstalacaoPage() {
  return <NovaInstalacaoForm />;
}
