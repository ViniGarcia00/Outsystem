import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PropostaWorkspace } from "@/features/propostas";
import { getWorkspace } from "@/services/proposta-conteudo.service";
import { listProdutos } from "@/services/produto.service";

export const metadata: Metadata = { title: "Proposta" };

export const dynamic = "force-dynamic";

export default async function PropostaWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, produtosList] = await Promise.all([
    getWorkspace(id),
    listProdutos(false),
  ]);
  if (!data) notFound();

  const produtos = produtosList.map((p) => ({
    value: p.id,
    label: `${p.codigo} — ${p.descricao}`,
  }));

  return <PropostaWorkspace data={data} produtos={produtos} />;
}
