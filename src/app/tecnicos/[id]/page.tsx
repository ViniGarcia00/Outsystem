import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TecnicoForm } from "@/features/tecnicos";
import { getTecnicoForEdit } from "@/services/tecnico.service";

export const metadata: Metadata = { title: "Editar técnico" };

export const dynamic = "force-dynamic";

export default async function EditarTecnicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tecnico = await getTecnicoForEdit(id);
  if (!tecnico) notFound();

  return <TecnicoForm tecnicoId={id} defaultValues={tecnico} />;
}
