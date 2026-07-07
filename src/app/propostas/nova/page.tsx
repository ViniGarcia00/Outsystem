import type { Metadata } from "next";

import { NovaPropostaWorkspace } from "@/features/propostas";
import { getPropostaFormOptions } from "@/services/proposta.service";

export const metadata: Metadata = { title: "Nova proposta" };

export const dynamic = "force-dynamic";

export default async function NovaPropostaPage() {
  const { vendedores } = await getPropostaFormOptions();
  return <NovaPropostaWorkspace vendedores={vendedores} />;
}
