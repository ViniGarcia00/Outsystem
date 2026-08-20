import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InstalacaoWorkspace } from "@/features/instalacoes";
import {
  getInstalacao,
  listTecnicoOptionsDaInstalacao,
} from "@/services/instalacao.service";

export const metadata: Metadata = { title: "Instalação" };

export const dynamic = "force-dynamic";

export default async function InstalacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [instalacao, tecnicos] = await Promise.all([
    getInstalacao(id),
    listTecnicoOptionsDaInstalacao(id),
  ]);
  if (!instalacao) notFound();

  return <InstalacaoWorkspace data={instalacao} tecnicos={tecnicos} />;
}
