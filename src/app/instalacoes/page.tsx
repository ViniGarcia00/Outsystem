import type { Metadata } from "next";

import { InstalacoesList } from "@/features/instalacoes";
import { listInstalacoes } from "@/services/instalacao.service";

export const metadata: Metadata = { title: "Instalações" };

export const dynamic = "force-dynamic";

export default async function InstalacoesPage() {
  const instalacoes = await listInstalacoes();
  return <InstalacoesList initialRows={instalacoes} />;
}
