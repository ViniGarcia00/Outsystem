import type { Metadata } from "next";

import { NovaInstalacaoForm } from "@/features/instalacoes";
import { listTecnicoOptions } from "@/services/tecnico.service";

export const metadata: Metadata = { title: "Nova instalação" };

export const dynamic = "force-dynamic";

export default async function NovaInstalacaoPage() {
  // Criação não tem vínculo prévio: só os ativos.
  const tecnicos = await listTecnicoOptions();
  return <NovaInstalacaoForm tecnicos={tecnicos} />;
}
