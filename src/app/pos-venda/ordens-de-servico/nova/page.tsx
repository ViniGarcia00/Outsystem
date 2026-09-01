import type { Metadata } from "next";

import { NovaOSForm } from "@/features/pos-venda";
import { listUsuarioOptions } from "@/services/usuario.service";

export const metadata: Metadata = { title: "Nova ordem de serviço" };

export const dynamic = "force-dynamic";

export default async function NovaOrdemServicoPage() {
  const responsaveis = await listUsuarioOptions("ehTecnico");
  return <NovaOSForm responsaveis={responsaveis} />;
}
