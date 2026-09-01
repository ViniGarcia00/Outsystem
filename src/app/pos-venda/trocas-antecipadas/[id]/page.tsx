import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrocaWorkspace } from "@/features/pos-venda";
import {
  getTroca,
  listUsuarioOptionsDaTroca,
} from "@/services/pos-venda-troca.service";

export const metadata: Metadata = { title: "Troca antecipada" };

export const dynamic = "force-dynamic";

export default async function TrocaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [troca, responsaveis] = await Promise.all([
    getTroca(id),
    listUsuarioOptionsDaTroca(id),
  ]);
  if (!troca) notFound();

  return <TrocaWorkspace data={troca} responsaveis={responsaveis} />;
}
