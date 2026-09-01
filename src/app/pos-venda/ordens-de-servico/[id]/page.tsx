import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrdemServicoWorkspace } from "@/features/pos-venda";
import {
  getOrdemServico,
  listUsuarioOptionsDaOS,
} from "@/services/pos-venda-os.service";

export const metadata: Metadata = { title: "Ordem de serviço" };

export const dynamic = "force-dynamic";

export default async function OrdemServicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [os, responsaveis] = await Promise.all([
    getOrdemServico(id),
    listUsuarioOptionsDaOS(id),
  ]);
  if (!os) notFound();

  return <OrdemServicoWorkspace data={os} responsaveis={responsaveis} />;
}
