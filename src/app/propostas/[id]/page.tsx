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
  const data = await getWorkspace(id);
  if (!data) notFound();

  // As opções dependem do vendedor JÁ vinculado — ele precisa aparecer no
  // Select mesmo inativo ou sem o papel, senão o campo abriria em branco e
  // salvar apagaria o vínculo em silêncio (ADR-0410). Por isso esta chamada vem
  // depois de `getWorkspace`, e não em paralelo.
  const { vendedores } = await getPropostaFormOptions(data.vendedorId);

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
