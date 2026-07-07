import type { Metadata } from "next";

import { ConfiguracaoForm } from "@/features/configuracoes";
import { getConfiguracao } from "@/services/configuracao.service";

export const metadata: Metadata = { title: "Configurações" };

// Sempre refletir o estado atual do banco (registro único).
export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const config = await getConfiguracao();
  return <ConfiguracaoForm initial={config} />;
}
