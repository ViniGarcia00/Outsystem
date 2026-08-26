import type { Metadata } from "next";

import { NovaInstalacaoForm } from "@/features/instalacoes";
import { listUsuarioOptions } from "@/services/usuario.service";

export const metadata: Metadata = { title: "Nova instalação" };

export const dynamic = "force-dynamic";

export default async function NovaInstalacaoPage() {
  // Criação não tem vínculo prévio: só os ativos.
  const tecnicos = await listUsuarioOptions("ehTecnico");
  return <NovaInstalacaoForm tecnicos={tecnicos} />;
}
