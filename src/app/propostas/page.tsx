import type { Metadata } from "next";

import { PropostasList } from "@/features/propostas";
import { listPropostas } from "@/services/proposta.service";

export const metadata: Metadata = { title: "Propostas" };

export const dynamic = "force-dynamic";

export default async function PropostasPage() {
  const propostas = await listPropostas();
  return <PropostasList initialRows={propostas} />;
}
