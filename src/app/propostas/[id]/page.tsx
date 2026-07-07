import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PropostaWorkspace } from "@/features/propostas";
import { getWorkspace } from "@/services/proposta-conteudo.service";
import { getPropostaFormOptions } from "@/services/proposta.service";

export const metadata: Metadata = { title: "Proposta" };

export const dynamic = "force-dynamic";

export default async function PropostaWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, { vendedores }] = await Promise.all([
    getWorkspace(id),
    getPropostaFormOptions(),
  ]);
  if (!data) notFound();

  // A `key` por updatedAt remonta o workspace após "Salvar Alterações",
  // reinicializando o estado em memória a partir do DTO fresco.
  return (
    <PropostaWorkspace
      key={data.updatedAt.toISOString()}
      data={data}
      vendedores={vendedores}
    />
  );
}
